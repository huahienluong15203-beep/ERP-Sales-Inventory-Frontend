import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { CATALOG_PRODUCTS, CUSTOMER_GROUPS } from '../../types/pricing';
import type { CustomerGroupType } from '../../types/pricing';
import type { BestDealSimulationOutput } from '../../types/discount';
import { simulateBestDeal, BEST_DEAL_RULE_STATEMENT } from '../../services/volumeDiscountApi';

interface BestDealSimulatorWidgetProps {
  initialSku?: string;
  onClose?: () => void;
}

export const BestDealSimulatorWidget: React.FC<BestDealSimulatorWidgetProps> = ({
  initialSku = 'BIA-HN-330',
  onClose
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(initialSku);
  const [quantity, setQuantity] = useState<number>(60);
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupType>('DEALER_LEVEL_1');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [simulationResult, setSimulationResult] = useState<BestDealSimulationOutput | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Lấy thông tin sản phẩm đang chọn
  const currentProduct = CATALOG_PRODUCTS.find((p) => p.sku === selectedSku) || CATALOG_PRODUCTS[0];

  useEffect(() => {
    if (currentProduct) {
      setCustomPrice(currentProduct.suggestedRetailPrice);
    }
  }, [selectedSku]);

  // Chạy mô phỏng
  const handleSimulate = async () => {
    setIsCalculating(true);
    try {
      const result = await simulateBestDeal({
        productSku: selectedSku,
        quantity: Math.max(1, quantity),
        customerGroup,
        unitPrice: customPrice > 0 ? customPrice : undefined
      });
      setSimulationResult(result);
    } catch (err) {
      console.error('Lỗi mô phỏng chiết khấu:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Tự động mô phỏng khi thay đổi tham số
  useEffect(() => {
    handleSimulate();
  }, [selectedSku, quantity, customerGroup, customPrice]);

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-linear-to-b from-indigo-50/50 via-white to-white shadow-xl dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {/* Header Banner */}
      <div className="border-b border-indigo-100/80 bg-white/80 px-6 py-4 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Icons.ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mô phỏng quy tắc Chiết khấu tối ưu (Best-Deal Rule)
                </h3>
                {isCalculating && (
                  <span className="inline-flex items-center text-xs text-indigo-600 animate-pulse font-medium">
                    (Đang tính toán...)
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  SCRUM-12 / S3-01
                </span>

              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động so sánh tất cả chính sách thỏa mãn để trao mức chiết khấu cao nhất cho khách hàng
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Icons.ShieldAlert size={20} className="rotate-45" />
            </button>
          )}
        </div>

        {/* Trích dẫn văn bản nghiệp vụ cốt lõi */}
        <div className="mt-3 flex items-start space-x-2.5 rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Icons.BookOpenCheck size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            <strong className="font-semibold">Văn bản quy định kinh doanh: </strong>
            {BEST_DEAL_RULE_STATEMENT}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Form nhập dữ liệu kiểm thử */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Chọn sản phẩm */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Sản phẩm kiểm thử
            </label>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {CATALOG_PRODUCTS.map((prod) => (
                <option key={prod.sku} value={prod.sku}>
                  [{prod.sku}] {prod.name} ({prod.defaultCategory})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Số lượng mua */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Số lượng mua ({currentProduct.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-12 text-sm font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs font-medium text-slate-400">
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
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    quantity === quickQty
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {quickQty}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nhóm khách hàng */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Đối tượng đại lý / Khách hàng
            </label>
            <select
              value={customerGroup}
              onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Giá niêm yết gốc (VND/{currentProduct.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                value={customPrice}
                onChange={(e) => setCustomPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-semibold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs font-medium text-slate-400">
                đ
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Tổng tiền gốc:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {((customPrice || 0) * quantity).toLocaleString('vi-VN')} đ
              </strong>
            </p>
          </div>
        </div>

        {/* Kết quả so sánh Best-Deal */}
        {simulationResult && (
          <div className="mt-6 space-y-4">
            {/* Thẻ vinh danh chính sách có lợi nhất */}
            {simulationResult.appliedBestDeal ? (
              <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-500/80 dark:bg-emerald-950/20">
                <div className="absolute right-0 top-0 rounded-bl-xl bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                  ★ Chính sách có lợi nhất (Best Deal)
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Cột 1: Tên chính sách & Bậc */}
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                        {simulationResult.appliedBestDeal.policy.code}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {simulationResult.appliedBestDeal.policy.name}
                      </h4>
                    </div>

                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {simulationResult.appliedBestDeal.policy.scopeType === 'SKU' ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          Áp dụng riêng cho SKU: {simulationResult.appliedBestDeal.policy.targetName}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          Áp dụng cho toàn bộ nhóm hàng: {simulationResult.appliedBestDeal.policy.targetName}
                        </span>
                      )}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-200">
                        Bậc đạt được: Bậc {simulationResult.appliedBestDeal.matchedTier?.tierOrder} (Từ {simulationResult.appliedBestDeal.matchedTier?.minQuantity} {simulationResult.unit})
                      </span>
                      <span className="rounded-md bg-emerald-600 px-2.5 py-1 font-bold text-white shadow-2xs">
                        Mức giảm:{' '}
                        {simulationResult.appliedBestDeal.discountType === 'PERCENT'
                          ? `${simulationResult.appliedBestDeal.discountValue}%`
                          : `${simulationResult.appliedBestDeal.discountValue.toLocaleString('vi-VN')} đ/${simulationResult.unit}`}
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg bg-white/70 p-2.5 text-xs text-slate-600 shadow-2xs dark:bg-slate-800/80 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Giải trình hệ thống: </span>
                      {simulationResult.explanation}
                    </div>
                  </div>

                  {/* Cột 2: Bảng số liệu tài chính sau chiết khấu */}
                  <div className="flex flex-col justify-center rounded-xl bg-white p-4 shadow-xs dark:bg-slate-800">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Đơn giá gốc:</span>
                        <span className="font-medium text-slate-700 line-through dark:text-slate-300">
                          {simulationResult.unitPrice.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                        <span>Đơn giá sau CK:</span>
                        <span className="text-sm">
                          {simulationResult.appliedBestDeal.finalUnitPrice.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 dark:border-slate-700">
                        <div className="flex justify-between text-slate-500">
                          <span>Tổng tiền trước CK:</span>
                          <span>{simulationResult.totalOriginalAmount.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                          <span>Số tiền giảm (Tiết kiệm):</span>
                          <span>-{simulationResult.appliedBestDeal.totalDiscountAmount.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-2 dark:border-slate-700">
                        <div className="flex justify-between font-extrabold text-slate-900 dark:text-white">
                          <span>Tổng thanh toán:</span>
                          <span className="text-base text-indigo-600 dark:text-indigo-400">
                            {simulationResult.appliedBestDeal.finalTotalPrice.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <p className="font-semibold">Chưa có chính sách chiết khấu nào được áp dụng cho số lượng và cấu hình này.</p>
                <p className="mt-1">{simulationResult.explanation}</p>
              </div>
            )}

            {/* Bảng so sánh tất cả các chính sách cạnh tranh */}
            {simulationResult.candidatePolicies.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  Chi tiết so sánh các chính sách ứng viên ({simulationResult.candidatePolicies.length} chính sách)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {simulationResult.candidatePolicies.map((cand, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            cand.isBestDeal
                              ? 'bg-emerald-50/60 font-semibold dark:bg-emerald-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {cand.policy.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {cand.policy.code}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                cand.policy.scopeType === 'SKU'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                              }`}
                            >
                              {cand.policy.scopeType === 'SKU' ? 'Theo SKU' : 'Theo Nhóm hàng'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {cand.matchedTier ? (
                              <span className="text-slate-700 dark:text-slate-300">
                                Bậc {cand.matchedTier.tierOrder} (≥ {cand.matchedTier.minQuantity})
                              </span>
                            ) : (
                              <span className="text-red-500">Chưa đủ SL tối thiểu</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {cand.isEligible ? (
                              <span className="font-bold text-slate-900 dark:text-white">
                                {cand.discountType === 'PERCENT'
                                  ? `${cand.discountValue}%`
                                  : `${cand.discountValue.toLocaleString('vi-VN')} đ/đv`}
                              </span>
                            ) : (
                              <span className="text-slate-400">0%</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {cand.isEligible ? (
                              <span className="text-slate-700 dark:text-slate-300">
                                -{cand.unitDiscountAmount.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-slate-400">0 đ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {cand.isEligible ? (
                              <span className={cand.isBestDeal ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}>
                                -{cand.totalDiscountAmount.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-slate-400">0 đ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cand.isBestDeal ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                                <Icons.CheckSquare size={12} className="mr-1" />
                                Best Deal (Được chọn)
                              </span>
                            ) : cand.isEligible ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Bị loại (Mức giảm thấp hơn)
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
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
