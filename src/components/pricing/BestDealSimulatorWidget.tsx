import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../common/Icons';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import type { CustomerGroupType, CatalogProduct } from '../../types/pricing';
import type { BestDealSimulationOutput } from '../../types/discount';
import {
  simulateBestDeal,
  BEST_DEAL_RULE_STATEMENT,
  fetchDiscountProductOptions
} from '../../services/volumeDiscountApi';

interface BestDealSimulatorWidgetProps {
  initialSku?: string;
  onClose?: () => void;
}

export const BestDealSimulatorWidget: React.FC<BestDealSimulatorWidgetProps> = ({
  initialSku = '',
  onClose
}) => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [selectedSku, setSelectedSku] = useState<string>(initialSku);
  const [quantity, setQuantity] = useState<number>(60);
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupType>('DEALER_LEVEL_1');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [simulationResult, setSimulationResult] = useState<BestDealSimulationOutput | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);
  const requestSeq = useRef<number>(0);

  // Tải danh sách sản phẩm thật từ backend
  useEffect(() => {
    let cancelled = false;
    setIsLoadingProducts(true);
    fetchDiscountProductOptions()
      .then((list) => {
        if (cancelled) return;
        setProducts(list);
        setSelectedSku((prev) =>
          prev && list.some((p) => p.sku === prev) ? prev : list[0]?.sku || ''
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSimError(err instanceof Error ? err.message : 'Không tải được danh sách sản phẩm!');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Đồng bộ khi trang yêu cầu thử một SKU cụ thể
  useEffect(() => {
    if (initialSku) setSelectedSku(initialSku);
  }, [initialSku]);

  // Lấy thông tin sản phẩm đang chọn
  const currentProduct: CatalogProduct = products.find((p) => p.sku === selectedSku) || {
    sku: selectedSku,
    name: selectedSku,
    defaultCategory: '',
    unit: 'đơn vị',
    suggestedRetailPrice: 0
  };
  const displayUnitPrice = customPrice > 0 ? customPrice : simulationResult?.unitPrice || 0;

  // Chạy mô phỏng (đơn giá trống = tự tra cứu theo bảng giá của nhóm khách hàng)
  const handleSimulate = async () => {
    if (!selectedSku) return;
    const seq = ++requestSeq.current;
    setIsCalculating(true);
    setSimError(null);
    try {
      const result = await simulateBestDeal({
        productSku: selectedSku,
        quantity: Math.max(1, quantity),
        customerGroup,
        unitPrice: customPrice > 0 ? customPrice : undefined
      });
      if (seq === requestSeq.current) setSimulationResult(result);
    } catch (err: unknown) {
      if (seq === requestSeq.current) {
        setSimulationResult(null);
        setSimError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi mô phỏng chiết khấu!');
      }
    } finally {
      if (seq === requestSeq.current) setIsCalculating(false);
    }
  };

  // Tự động mô phỏng khi thay đổi tham số (trễ nhẹ để tránh gọi API liên tục khi gõ)
  useEffect(() => {
    if (!selectedSku) return;
    const timer = setTimeout(() => {
      handleSimulate();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSku, quantity, customerGroup, customPrice]);

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-200/90 bg-gradient-to-b from-orange-50/40 via-white to-white shadow-sm">
      {/* Header Banner */}
      <div className="border-b border-orange-100 bg-white/95 px-5 sm:px-6 py-4 backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F85606] text-white shadow-xs">
              <Icons.ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Mô phỏng quy tắc Chiết khấu tối ưu
                </h3>
                {isCalculating && (
                  <span className="inline-flex items-center text-xs text-[#F85606] animate-pulse font-medium">
                    (Đang tính toán...)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Tự động so sánh tất cả chính sách thỏa mãn để trao mức chiết khấu cao nhất cho khách hàng
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
            >
              <Icons.ShieldAlert size={20} className="rotate-45" />
            </button>
          )}
        </div>

        {/* Trích dẫn văn bản nghiệp vụ cốt lõi */}
        <div className="mt-3 flex items-start space-x-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
          <Icons.BookOpenCheck size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="leading-relaxed">
            <strong className="font-bold">Văn bản quy định kinh doanh: </strong>
            {BEST_DEAL_RULE_STATEMENT}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 sm:p-6">
        {/* Form nhập dữ liệu kiểm thử */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Chọn sản phẩm */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Sản phẩm kiểm thử
            </label>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 shadow-2xs transition-colors focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
            >
              {isLoadingProducts && products.length === 0 && (
                <option value="">Đang tải danh sách sản phẩm...</option>
              )}
              {!isLoadingProducts && products.length === 0 && (
                <option value="">-- Chưa có sản phẩm đang kinh doanh --</option>
              )}
              {products.map((prod) => (
                <option key={prod.sku} value={prod.sku}>
                  [{prod.sku}] {prod.name}
                  {prod.defaultCategory ? ` (${prod.defaultCategory})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Số lượng mua */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Số lượng mua ({currentProduct.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-12 text-sm font-bold text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs font-medium text-gray-400">
                {currentProduct.unit}
              </span>
            </div>
            {/* Quick buttons */}
            <div className="mt-1.5 flex gap-1.5">
              {[20, 50, 80, 120, 250].map((quickQty) => (
                <button
                  key={quickQty}
                  type="button"
                  onClick={() => setQuantity(quickQty)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${quantity === quickQty
                      ? 'bg-[#F85606] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-[#F85606]'
                    }`}
                >
                  {quickQty}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nhóm khách hàng */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Đối tượng đại lý / Khách hàng
            </label>
            <select
              value={customerGroup}
              onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
            >
              {Object.entries(CUSTOMER_GROUPS).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Giá niêm yết gốc */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Giá niêm yết gốc (VND/{currentProduct.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Tự tra theo bảng giá"
                value={customPrice > 0 ? customPrice : ''}
                onChange={(e) => setCustomPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs font-medium text-gray-400">
                đ
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              {customPrice > 0 ? 'Đơn giá nhập tay. ' : 'Để trống = tự lấy giá theo bảng giá nhóm KH. '}
              Tổng tiền gốc:{' '}
              <strong className="text-gray-900 font-mono font-bold">
                {(displayUnitPrice * quantity).toLocaleString('vi-VN')} đ
              </strong>
            </p>
          </div>
        </div>

        {simError && (
          <div className="mt-4 flex items-start space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <Icons.ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
            <span className="font-semibold">{simError}</span>
          </div>
        )}

        {/* Kết quả so sánh Best-Deal */}
        {simulationResult && (
          <div className="mt-6 space-y-4">
            {/* Thẻ vinh danh chính sách có lợi nhất */}
            {simulationResult.appliedBestDeal ? (
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-5 shadow-xs">
                <div className="absolute right-0 top-0 rounded-bl-xl bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                  ★ Chính sách có lợi nhất (Best Deal)
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Cột 1: Tên chính sách & Bậc */}
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        {simulationResult.appliedBestDeal.policy.code}
                      </span>
                      <h4 className="text-base font-bold text-gray-900">
                        {simulationResult.appliedBestDeal.policy.name}
                      </h4>
                    </div>

                    <p className="mt-1 text-xs text-gray-600">
                      {simulationResult.appliedBestDeal.policy.scopeType === 'SKU' ? (
                        <span className="font-semibold text-blue-700">
                          Áp dụng riêng cho SKU: {simulationResult.appliedBestDeal.policy.targetName}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700">
                          Áp dụng cho toàn bộ nhóm hàng: {simulationResult.appliedBestDeal.policy.targetName}
                        </span>
                      )}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-gray-700 shadow-2xs border border-emerald-200">
                        Bậc đạt được: Bậc {simulationResult.appliedBestDeal.matchedTier?.tierOrder} (Từ {simulationResult.appliedBestDeal.matchedTier?.minQuantity} {simulationResult.unit})
                      </span>
                      <span className="rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white shadow-2xs">
                        Mức giảm:{' '}
                        {simulationResult.appliedBestDeal.discountType === 'PERCENT'
                          ? `${simulationResult.appliedBestDeal.discountValue}%`
                          : `${simulationResult.appliedBestDeal.discountValue.toLocaleString('vi-VN')} đ/${simulationResult.unit}`}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-white/90 p-2.5 text-xs text-gray-700 shadow-2xs border border-emerald-200/80">
                      <span className="font-bold text-gray-900">Giải trình hệ thống: </span>
                      {simulationResult.explanation}
                    </div>
                  </div>

                  {/* Cột 2: Bảng số liệu tài chính sau chiết khấu */}
                  <div className="flex flex-col justify-center rounded-xl bg-white p-4 shadow-xs border border-emerald-100">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Đơn giá gốc:</span>
                        <span className="font-medium text-gray-500 line-through">
                          {simulationResult.unitPrice.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600">
                        <span>Đơn giá sau CK:</span>
                        <span className="text-sm font-mono">
                          {simulationResult.appliedBestDeal.finalUnitPrice.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="border-t border-gray-100 pt-2">
                        <div className="flex justify-between text-gray-500">
                          <span>Tổng tiền trước CK:</span>
                          <span className="font-mono">{simulationResult.totalOriginalAmount.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600">
                          <span>Số tiền giảm (Tiết kiệm):</span>
                          <span className="font-mono">-{simulationResult.appliedBestDeal.totalDiscountAmount.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-2">
                        <div className="flex justify-between font-extrabold text-gray-900">
                          <span>Tổng thanh toán:</span>
                          <span className="text-base text-[#F85606] font-mono">
                            {simulationResult.appliedBestDeal.finalTotalPrice.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                <p className="font-bold">Chưa có chính sách chiết khấu nào được áp dụng cho số lượng và cấu hình này.</p>
                <p className="mt-1">{simulationResult.explanation}</p>
              </div>
            )}

            {/* Bảng so sánh tất cả các chính sách cạnh tranh */}
            {simulationResult.candidatePolicies.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
                <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3 text-xs font-bold text-gray-700">
                  Chi tiết so sánh các chính sách ứng viên ({simulationResult.candidatePolicies.length} chính sách)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Chính sách</th>
                        <th className="px-3 py-3">Phạm vi</th>
                        <th className="px-3 py-3">Bậc thỏa mãn</th>
                        <th className="px-3 py-3">Mức chiết khấu</th>
                        <th className="px-3 py-3 text-right">Giảm / đơn vị</th>
                        <th className="px-4 py-3 text-right">Tổng tiền giảm (VND)</th>
                        <th className="px-4 py-3 text-center">Kết luận áp dụng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {simulationResult.candidatePolicies.map((cand, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${cand.isBestDeal
                              ? 'bg-emerald-50/60 font-semibold'
                              : 'hover:bg-orange-50/30'
                            }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">
                              {cand.policy.name}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {cand.policy.code}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${cand.policy.scopeType === 'SKU'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                            >
                              {cand.policy.scopeType === 'SKU' ? 'Theo SKU' : 'Theo Nhóm hàng'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {cand.matchedTier ? (
                              <span className="text-gray-700">
                                Bậc {cand.matchedTier.tierOrder} (≥ {cand.matchedTier.minQuantity})
                              </span>
                            ) : (
                              <span className="text-red-500">Chưa đủ SL tối thiểu</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {cand.isEligible ? (
                              <span className="font-bold text-gray-900">
                                {cand.discountType === 'PERCENT'
                                  ? `${cand.discountValue}%`
                                  : `${cand.discountValue.toLocaleString('vi-VN')} đ/đv`}
                              </span>
                            ) : (
                              <span className="text-gray-400">0%</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {cand.isEligible ? (
                              <span className="text-gray-700 font-mono">
                                -{cand.unitDiscountAmount.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono">0 đ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono">
                            {cand.isEligible ? (
                              <span className={cand.isBestDeal ? 'text-emerald-600' : 'text-gray-700'}>
                                -{cand.totalDiscountAmount.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-gray-400">0 đ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cand.isBestDeal ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                                <Icons.CheckSquare size={12} className="mr-1" />
                                Best Deal (Được chọn)
                              </span>
                            ) : cand.isEligible ? (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                Bị loại (Mức giảm thấp hơn)
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                                Không đạt điều kiện
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
