import React, { useState } from 'react';
import type { DiscountTier, DiscountType } from '../../types/pricing';

interface DiscountTierSetupProps {
  onSave?: (tiers: DiscountTier[]) => void;
}

export const DiscountTierSetup: React.FC<DiscountTierSetupProps> = ({ onSave }) => {
  // Sản phẩm đang cấu hình chiết khấu
  const [selectedProduct, setSelectedProduct] = useState({
    sku: 'SP-BIA-001',
    name: 'Bia Saigon Special 330ml (Thùng 24 lon)',
    basePrice: 315000,
    unit: 'Thùng'
  });

  // Danh sách các bậc chiết khấu
  const [tiers, setTiers] = useState<DiscountTier[]>([
    {
      id: 'tier-1',
      tierNumber: 1,
      minQuantity: 10,
      maxQuantity: 49,
      discountType: 'PERCENT',
      discountValue: 2,
      note: 'Áp dụng đơn hàng sỉ nhỏ'
    },
    {
      id: 'tier-2',
      tierNumber: 2,
      minQuantity: 50,
      maxQuantity: 199,
      discountType: 'PERCENT',
      discountValue: 5,
      note: 'Đơn hàng đại lý tiêu chuẩn'
    },
    {
      id: 'tier-3',
      tierNumber: 3,
      minQuantity: 200,
      maxQuantity: null, // Không giới hạn
      discountType: 'PERCENT',
      discountValue: 8.5,
      note: 'Đơn hàng sỉ số lượng lớn'
    }
  ]);

  // Bộ mô phỏng tính giá chiết khấu tức thì
  const [simulatedQty, setSimulatedQty] = useState<number>(60);
  const [tierError, setTierError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleAddTier = () => {
    setTierError(null);
    const lastTier = tiers[tiers.length - 1];
    let newMin = 1;

    if (lastTier) {
      if (lastTier.maxQuantity === null) {
        setTierError('Bậc cuối cùng hiện đang để Không giới hạn. Vui lòng đặt mức "Đến số lượng" trước khi thêm bậc mới.');
        return;
      }
      newMin = lastTier.maxQuantity + 1;
    }

    const newTier: DiscountTier = {
      id: `tier-${Date.now()}`,
      tierNumber: tiers.length + 1,
      minQuantity: newMin,
      maxQuantity: null,
      discountType: 'PERCENT',
      discountValue: 10,
      note: ''
    };

    setTiers([...tiers, newTier]);
  };

  const handleRemoveTier = (id: string) => {
    setTierError(null);
    const filtered = tiers.filter((t) => t.id !== id);
    // Cập nhật lại số thứ tự tierNumber
    const reordered = filtered.map((t, idx) => ({ ...t, tierNumber: idx + 1 }));
    setTiers(reordered);
  };

  const handleTierChange = (id: string, field: keyof DiscountTier, value: any) => {
    setTierError(null);
    setTiers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, [field]: value };
      })
    );
  };

  // Tính toán mô phỏng
  const getAppliedDiscount = (qty: number) => {
    // Sắp xếp theo minQuantity giảm dần để lấy bậc cao nhất thỏa mãn
    const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    const matched = sorted.find((t) => {
      if (qty < t.minQuantity) return false;
      if (t.maxQuantity !== null && qty > t.maxQuantity) return false;
      return true;
    });

    if (!matched) {
      return {
        tierNumber: 0,
        discountPercent: 0,
        discountAmountPerUnit: 0,
        finalUnitPrice: selectedProduct.basePrice,
        totalOriginal: qty * selectedProduct.basePrice,
        totalFinal: qty * selectedProduct.basePrice,
        savedAmount: 0
      };
    }

    let discountAmountPerUnit = 0;
    let discountPercent = 0;

    if (matched.discountType === 'PERCENT') {
      discountPercent = matched.discountValue;
      discountAmountPerUnit = (selectedProduct.basePrice * discountPercent) / 100;
    } else {
      discountAmountPerUnit = matched.discountValue;
      discountPercent = (discountAmountPerUnit / selectedProduct.basePrice) * 100;
    }

    const finalUnitPrice = Math.max(0, selectedProduct.basePrice - discountAmountPerUnit);
    const totalOriginal = qty * selectedProduct.basePrice;
    const totalFinal = qty * finalUnitPrice;
    const savedAmount = totalOriginal - totalFinal;

    return {
      tierNumber: matched.tierNumber,
      discountPercent,
      discountAmountPerUnit,
      finalUnitPrice,
      totalOriginal,
      totalFinal,
      savedAmount
    };
  };

  const simResult = getAppliedDiscount(simulatedQty);

  const handleSaveAll = () => {
    // Validate khoảng
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.minQuantity <= 0) {
        setTierError(`Bậc ${t.tierNumber}: Mức số lượng tối thiểu phải lớn hơn 0`);
        return;
      }
      if (t.maxQuantity !== null && t.maxQuantity < t.minQuantity) {
        setTierError(`Bậc ${t.tierNumber}: Mức số lượng tối đa phải lớn hơn hoặc bằng mức tối thiểu`);
        return;
      }
      if (t.discountValue < 0) {
        setTierError(`Bậc ${t.tierNumber}: Giá trị chiết khấu không được âm`);
        return;
      }
      if (t.discountType === 'PERCENT' && t.discountValue > 100) {
        setTierError(`Bậc ${t.tierNumber}: Chiết khấu phần trăm không được vượt quá 100%`);
        return;
      }
    }

    if (onSave) {
      onSave(tiers);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/50 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F85606]" />
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Giao Diện Thiết Lập Bậc Chiết Khấu</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cấu hình chính sách chiết khấu lũy tiến theo sản lượng đặt hàng (Volume-based Tiered Discounts)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF2EE] text-[#F85606] border border-[#FFD8CC]">
              {tiers.length} Bậc Cấu Hình
            </span>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Đã lưu thiết lập các bậc chiết khấu thành công!
        </div>
      )}

      {tierError && (
        <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {tierError}
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Lựa chọn sản phẩm hoặc phạm vi áp dụng */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFF2EE] flex items-center justify-center text-[#F85606] font-bold text-sm border border-[#FFD8CC]">
              SKU
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Sản phẩm áp dụng chính sách</div>
              <div className="text-sm font-bold text-gray-900">
                {selectedProduct.sku} - {selectedProduct.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-[11px] text-gray-500">Đơn giá áp dụng bảng giá</div>
              <div className="text-sm font-bold text-gray-900">{formatVND(selectedProduct.basePrice)} / {selectedProduct.unit}</div>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-0.5">Chọn mặt hàng khác</label>
              <select
                value={selectedProduct.sku}
                onChange={(e) => {
                  if (e.target.value === 'SP-BIA-001') {
                    setSelectedProduct({ sku: 'SP-BIA-001', name: 'Bia Saigon Special 330ml (Thùng 24 lon)', basePrice: 315000, unit: 'Thùng' });
                  } else {
                    setSelectedProduct({ sku: 'SP-BIA-002', name: 'Bia Heineken Silver 330ml (Thùng 24 lon)', basePrice: 395000, unit: 'Thùng' });
                  }
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:border-[#F85606]"
              >
                <option value="SP-BIA-001">SP-BIA-001 - Bia Saigon Special</option>
                <option value="SP-BIA-002">SP-BIA-002 - Bia Heineken Silver</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bảng thiết lập từng bậc */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Danh sách các bậc số lượng & Mức chiết khấu
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Khi số lượng đặt hàng nằm trong khoảng quy định, hệ thống sẽ tự động áp dụng mức giảm tương ứng
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddTier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF2EE] hover:bg-[#FFE3D9] text-[#F85606] border border-[#FFD8CC] text-xs font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Thêm Bậc Mới
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-16 text-center">Bậc</th>
                  <th className="px-3 py-3 min-w-[140px]">Từ số lượng ({selectedProduct.unit})</th>
                  <th className="px-3 py-3 min-w-[150px]">Đến số lượng ({selectedProduct.unit})</th>
                  <th className="px-3 py-3 min-w-[150px]">Loại chiết khấu</th>
                  <th className="px-3 py-3 min-w-[150px]">Mức giảm trừ</th>
                  <th className="px-3 py-3 min-w-[160px]">Đơn giá sau chiết khấu</th>
                  <th className="px-3 py-3 min-w-[180px]">Mô tả / Ghi chú</th>
                  <th className="px-3 py-3 w-12 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tiers.map((tier) => {
                  const isPercent = tier.discountType === 'PERCENT';
                  const calcReduction = isPercent
                    ? (selectedProduct.basePrice * tier.discountValue) / 100
                    : tier.discountValue;
                  const unitPriceAfterTier = Math.max(0, selectedProduct.basePrice - calcReduction);

                  return (
                    <tr key={tier.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 font-bold text-xs">
                          {tier.tierNumber}
                        </span>
                      </td>

                      {/* Từ số lượng */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">≥</span>
                          <input
                            type="number"
                            min="1"
                            value={tier.minQuantity}
                            onChange={(e) => handleTierChange(tier.id, 'minQuantity', Math.max(1, Number(e.target.value)))}
                            className="w-24 px-2.5 py-1 text-xs font-semibold text-gray-900 border border-gray-200 rounded focus:outline-none focus:border-[#F85606]"
                          />
                        </div>
                      </td>

                      {/* Đến số lượng */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Không GH"
                            disabled={tier.maxQuantity === null}
                            value={tier.maxQuantity !== null ? tier.maxQuantity : ''}
                            onChange={(e) =>
                              handleTierChange(
                                tier.id,
                                'maxQuantity',
                                e.target.value === '' ? null : Number(e.target.value)
                              )
                            }
                            className={`w-24 px-2.5 py-1 text-xs font-semibold border rounded focus:outline-none ${
                              tier.maxQuantity === null
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'border-gray-200 text-gray-900 focus:border-[#F85606]'
                            }`}
                          />
                          <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={tier.maxQuantity === null}
                              onChange={(e) =>
                                handleTierChange(tier.id, 'maxQuantity', e.target.checked ? null : tier.minQuantity + 50)
                              }
                              className="rounded text-[#F85606] focus:ring-[#F85606]"
                            />
                            <span>Vô cực</span>
                          </label>
                        </div>
                      </td>

                      {/* Loại chiết khấu */}
                      <td className="px-3 py-3">
                        <select
                          value={tier.discountType}
                          onChange={(e) => handleTierChange(tier.id, 'discountType', e.target.value as DiscountType)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-[#F85606]"
                        >
                          <option value="PERCENT">Phần trăm (%)</option>
                          <option value="AMOUNT">Số tiền (VNĐ/ĐVT)</option>
                        </select>
                      </td>

                      {/* Mức giảm */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={isPercent ? '0.5' : '1000'}
                            min="0"
                            max={isPercent ? '100' : undefined}
                            value={tier.discountValue}
                            onChange={(e) => handleTierChange(tier.id, 'discountValue', Number(e.target.value))}
                            className="w-24 px-2 py-1 text-xs font-bold text-gray-900 border border-gray-200 rounded text-right focus:outline-none focus:border-[#F85606]"
                          />
                          <span className="font-semibold text-gray-600 text-xs">
                            {isPercent ? '%' : '₫'}
                          </span>
                        </div>
                      </td>

                      {/* Đơn giá thực sau chiết khấu */}
                      <td className="px-3 py-3">
                        <div className="font-bold text-gray-900 text-xs">{formatVND(unitPriceAfterTier)}</div>
                        <div className="text-[11px] text-emerald-600">Tiết kiệm: {formatVND(calcReduction)}/{selectedProduct.unit}</div>
                      </td>

                      {/* Ghi chú */}
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={tier.note || ''}
                          placeholder="VD: Cửa hàng tiêu chuẩn..."
                          onChange={(e) => handleTierChange(tier.id, 'note', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-200 focus:border-[#F85606] rounded bg-transparent focus:outline-none"
                        />
                      </td>

                      {/* Nút xóa */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(tier.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                          title="Xóa bậc này"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bộ mô phỏng tính giá chiết khấu tức thì (Interactive Simulator) */}
        <div className="p-4 bg-orange-50/40 rounded-xl border border-orange-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#F85606]" />
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Mô phỏng thử nghiệm chiết khấu (Bán hàng thực tế)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Input số lượng thử */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nhập số lượng mua ({selectedProduct.unit}):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={simulatedQty}
                  onChange={(e) => setSimulatedQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm font-bold text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F85606] bg-white"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">
                  {selectedProduct.unit}
                </span>
              </div>
            </div>

            {/* Bậc áp dụng */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 uppercase font-semibold">Bậc thỏa mãn</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {simResult.tierNumber > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#F85606]">
                    Bậc {simResult.tierNumber} (Giảm {simResult.discountPercent.toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-gray-500 font-normal">Chưa đạt bậc tối thiểu</span>
                )}
              </div>
            </div>

            {/* Đơn giá thực tế */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 uppercase font-semibold">Đơn giá bán ra</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {formatVND(simResult.finalUnitPrice)} / {selectedProduct.unit}
              </div>
            </div>

            {/* Tổng thành tiền & Tiết kiệm */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 uppercase font-semibold">Tổng tiền thanh toán</div>
              <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                {formatVND(simResult.totalFinal)}
              </div>
              {simResult.savedAmount > 0 && (
                <div className="text-[11px] text-emerald-600 font-medium">
                  Đã tiết kiệm: {formatVND(simResult.savedAmount)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nút lưu cấu hình */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-95 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Lưu Thiết Lập Bậc Chiết Khấu
          </button>
        </div>
      </div>
    </div>
  );
};
