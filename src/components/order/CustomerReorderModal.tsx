import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Package,
  ShoppingCart,
  RefreshCw,
  Plus,
  Minus,
  ShieldAlert
} from 'lucide-react';
import { formatCurrencyVND } from '../../services/orderService';
import { fetchPortalProducts, previewPortalReorder } from '../../services/portalApi';

export interface ReorderItemDraft {
  productId: string;
  sku: string;
  name: string;
  selectedUnit: string;
  conversionFactor: number;
  unitPrice: number;
  quantity: number;
  isSelected: boolean;
  availableUnits: Array<{ unitName: string; conversionFactor: number }>;
}

export interface RemovedDiscontinuedItem {
  sku: string;
  name: string;
  unitName: string;
  quantity: number;
  reason: string;
}

interface CustomerReorderModalProps {
  isOpen: boolean;
  orderId: number | string | null;
  /** Không còn dùng: Backend tự xác định đại lý theo tài khoản đăng nhập */
  agencyId?: number | string | null;
  onClose: () => void;
  onConfirmReorder: (items: ReorderItemDraft[]) => void;
}

/**
 * S5-02: Modal "Mua lại" đơn cũ cho Cổng đại lý B2B
 * Dữ liệu lấy từ Backend POST /api/portal/orders/{id}/reorder-preview: server loại hàng ngừng kinh doanh / không còn
 * giá kèm lý do và áp lại giá theo bảng giá hiện hành; giá trong giỏ chỉ để hiển thị, khi gửi đơn Backend tính lại.
 * - AC1: Chọn đặt lại toàn bộ hoặc một phần dòng hàng (checkbox từng dòng)
 * - AC2: Mặt hàng đã ngừng kinh doanh được tự động loại bỏ khỏi đơn mới kèm cảnh báo rõ ràng
 * - AC3: Đơn giá được tự động áp lại theo bảng giá hiện hành của nhóm đại lý
 */
export const CustomerReorderModal: React.FC<CustomerReorderModalProps> = ({
  isOpen,
  orderId,
  onClose,
  onConfirmReorder
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceOrderCode, setSourceOrderCode] = useState<string | null>(null);

  // Danh sách dòng hàng hợp lệ có thể đặt lại
  const [reorderItems, setReorderItems] = useState<ReorderItemDraft[]>([]);

  // Danh sách dòng hàng đã ngừng kinh doanh bị loại bỏ (AC2)
  const [removedItems, setRemovedItems] = useState<RemovedDiscontinuedItem[]>([]);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSourceOrderCode(null);
    setReorderItems([]);
    setRemovedItems([]);

    Promise.all([previewPortalReorder(orderId), fetchPortalProducts()])
      .then(([result, catalog]) => {
        if (!isMounted) return;
        setSourceOrderCode(result.sourceOrderCode || null);

        const previewLines = result.preview?.lines || [];
        const valid: ReorderItemDraft[] = result.keptLines.map((kept) => {
          const sku = kept.productSku.trim().toLowerCase();
          const unit = kept.unitName.trim().toLowerCase();
          const priced =
            previewLines.find(
              (l) => l.productSku.trim().toLowerCase() === sku && l.unitName.trim().toLowerCase() === unit
            ) || previewLines.find((l) => l.productSku.trim().toLowerCase() === sku);
          const catItem = catalog.find((c) => c.sku.trim().toLowerCase() === sku);
          const factor =
            priced?.conversionFactor ||
            catItem?.availableUnits.find((u) => u.unitName.trim().toLowerCase() === unit)?.conversionFactor ||
            1;
          return {
            productId: catItem?.id || String(priced?.productId ?? kept.productSku),
            sku: catItem?.sku || kept.productSku,
            name: catItem?.name || priced?.productName || kept.productSku,
            selectedUnit: kept.unitName,
            conversionFactor: factor,
            // AC3: giá 1 ĐVT theo bảng giá hiện hành do Backend tính
            unitPrice: priced ? priced.pricePerUnit : (catItem?.basePrice || 0) * factor,
            quantity: kept.quantity,
            isSelected: true, // Mặc định chọn tất cả, đại lý có thể bỏ chọn từng dòng (AC1)
            availableUnits: catItem?.availableUnits || [{ unitName: kept.unitName, conversionFactor: factor }]
          };
        });

        // AC2: Backend đã loại các dòng ngừng kinh doanh / không còn giá, kèm lý do
        const removed: RemovedDiscontinuedItem[] = result.removedLines.map((l) => ({
          sku: l.productSku,
          name: l.productName,
          unitName: l.unitName,
          quantity: l.quantity,
          reason: l.reason
        }));

        setReorderItems(valid);
        setRemovedItems(removed);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Lỗi lấy lại đơn hàng cũ:', err);
        setError(err instanceof Error && err.message ? err.message : 'Không thể tải đơn hàng cũ để mua lại');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  // Toggle chọn một dòng hàng
  const handleToggleSelectItem = (index: number) => {
    setReorderItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isSelected: !next[index].isSelected };
      return next;
    });
  };

  // Toggle chọn tất cả
  const handleToggleSelectAll = (checked: boolean) => {
    setReorderItems((prev) => prev.map((item) => ({ ...item, isSelected: checked })));
  };

  // Tăng/giảm số lượng
  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setReorderItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  };

  const selectedItems = reorderItems.filter((i) => i.isSelected);
  const totalReorderAmount = selectedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleConfirm = () => {
    onConfirmReorder(selectedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-orange-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F85606] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <span>Đặt Lại Đơn Hàng</span>
                {sourceOrderCode && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-orange-100 text-[#F85606]">
                    {sourceOrderCode}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                Lấy lại các dòng hàng định kỳ và tự động cập nhật bảng giá hiện hành (S5-02)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <RefreshCw size={30} className="animate-spin text-[#F85606] mx-auto" />
              <p className="text-xs font-semibold">Đang kiểm tra danh mục và bảng giá hiện hành...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* AC2: CẢNH BÁO MẶT HÀNG ĐÃ NGỪNG KINH DOANH ĐÃ BỊ TỰ ĐỘNG LOẠI BỎ */}
              {removedItems.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                    <span>
                      Cảnh báo: Đã loại bỏ {removedItems.length} mặt hàng không đặt lại được
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    Các sản phẩm dưới đây trong đơn cũ hiện đã ngừng bán hoặc không còn trong bảng giá áp dụng, hệ thống đã tự động loại bỏ để tránh lỗi đơn:
                  </p>
                  <div className="bg-white/80 rounded-xl border border-rose-200/80 divide-y divide-rose-100 text-xs">
                    {removedItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-gray-900">{item.name}</span>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                            <span className="font-mono text-gray-400">{item.sku}</span>
                            <span>•</span>
                            <span>Đã mua: {item.quantity} {item.unitName}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0">
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* THÔNG BÁO ÁP GIÁ HIỆN HÀNH (AC3) */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-blue-800">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Bảng giá hiện hành:</strong> Toàn bộ đơn giá của các mặt hàng dưới đây đã được cập nhật tự động theo bảng giá hiệu lực hiện tại của nhóm khách hàng đại lý.
                </div>
              </div>

              {/* AC1: DANH SÁCH DÒNG HÀNG ĐẶT LẠI (CHO PHÉP CHỌN TOÀN BỘ HOẶC MỘT PHẦN) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 pb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all-reorder"
                      checked={reorderItems.length > 0 && reorderItems.every((i) => i.isSelected)}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded text-[#F85606] focus:ring-orange-500"
                    />
                    <label htmlFor="select-all-reorder" className="cursor-pointer">
                      Chọn toàn bộ dòng hàng ({reorderItems.length} SKU)
                    </label>
                  </div>
                  <span className="text-gray-500">
                    Đã chọn: <strong className="text-[#F85606]">{selectedItems.length}</strong> / {reorderItems.length}
                  </span>
                </div>

                {reorderItems.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 space-y-1">
                    <Package size={32} className="mx-auto text-gray-300" />
                    <p className="text-xs font-semibold">Không còn mặt hàng nào trong đơn cũ đặt lại được.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                    {reorderItems.map((item, idx) => (
                      <div
                        key={`${item.sku}-${item.selectedUnit}`}
                        className={`p-3 transition flex items-center justify-between gap-3 ${
                          item.isSelected ? 'bg-orange-50/20' : 'bg-gray-50/40 opacity-60'
                        }`}
                      >
                        {/* Checkbox & Thông tin sản phẩm */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => handleToggleSelectItem(idx)}
                            className="w-4 h-4 rounded text-[#F85606] focus:ring-orange-500 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                              <span className="font-mono text-gray-400">{item.sku}</span>
                              <span>•</span>
                              <span className="font-semibold text-gray-700">{item.selectedUnit}</span>
                              <span>•</span>
                              <span className="font-mono font-bold text-[#F85606]">
                                {formatCurrencyVND(item.unitPrice)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bộ điều khiển số lượng */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                              disabled={!item.isSelected}
                              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center font-bold text-xs text-gray-800 font-mono">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                              disabled={!item.isSelected}
                              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="w-24 text-right font-black text-xs font-mono text-gray-900 hidden sm:block">
                            {formatCurrencyVND(item.quantity * item.unitPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Modal: Tổng tiền & Nút xác nhận đưa vào giỏ */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-gray-500 block">Tổng tiền dự kiến theo giá hiện hành:</span>
            <span className="text-base sm:text-lg font-black text-[#F85606] font-mono">
              {formatCurrencyVND(totalReorderAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-500 hover:from-orange-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
              id="confirm-reorder-btn"
            >
              <ShoppingCart size={15} />
              <span>Đưa {selectedItems.length} món vào giỏ hàng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
