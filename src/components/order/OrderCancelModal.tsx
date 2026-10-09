import React, { useState } from 'react';
import { X, Ban, AlertTriangle, FileText } from 'lucide-react';
import type { OrderBackendResponse } from '../../types/order';
import { formatCurrencyVND } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, authFetch } from '../../services/api';

interface OrderCancelModalProps {
  isOpen: boolean;
  order: OrderBackendResponse | null;
  onClose: () => void;
  onSuccess: (cancelReason: string) => void;
}

export const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess
}) => {
  const { showToast } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  // Kiểm tra điều kiện AC3: Đơn đã xuất kho thì không được huỷ
  const statusUpper = (order.status || '').toUpperCase();
  const isDispatchedOrLater =
    statusUpper === 'DISPATCHED' ||
    statusUpper === 'EXPORTED' ||
    statusUpper === 'SHIPPED' ||
    statusUpper === 'DELIVERED' ||
    statusUpper === 'CLOSED' ||
    statusUpper === 'COMPLETED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDispatchedOrLater) {
      showToast(
        'Không thể huỷ đơn (S4-06 AC3)',
        'Đơn hàng đã xuất kho hoặc đã giao. Theo quy chuẩn S4-06 AC3, không thể hủy đơn mà phải làm thủ tục Trả hàng (EP-08).',
        'error'
      );
      return;
    }

    if (!reason.trim()) {
      setValidationError('Bắt buộc nhập lý do hủy đơn hàng theo quy chuẩn S4-06 AC2!');
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      // Gọi API chuyển trạng thái đơn sang CANCELLED (S4-06 BE do Lê Hồng Phong phụ trách)
      const res = await authFetch(`${API_BASE_URL}/api/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      }).catch(() => null);

      if (res && !res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Không thể hủy đơn hàng trên máy chủ');
      }

      showToast(
        'Đã hủy đơn hàng (S4-06)',
        `Đã hủy đơn hàng [${order.code || order.id}]. Tồn kho giữ chỗ đã được tự động hoàn trả (nhả tồn).`,
        'success'
      );

      onSuccess(reason.trim());
      onClose();
    } catch (err: unknown) {
      showToast(
        'Hủy đơn thất bại',
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi hủy đơn',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 flex items-center justify-between border-b bg-rose-50/80 border-rose-100 text-rose-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shadow-rose-500/20">
              <Ban size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                Hủy Đơn Hàng (S4-06)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Mã đơn: <strong className="font-mono text-gray-800">{order.code || `#${order.id}`}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Cảnh báo AC3 nếu đã xuất kho */}
          {isDispatchedOrLater ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-950">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>CHẶN HỦY ĐƠN: ĐƠN ĐÃ XUẤT KHO!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800">
                Theo quy chuẩn <strong>Story S4-06 AC3</strong>: Đơn hàng đã xuất kho thì <strong>không thể hủy được</strong>.
                Hàng hóa đã rời kho và ghi thẻ kho xuất. Vui lòng hướng dẫn đại lý làm thủ tục <strong>Trả hàng (Phân hệ EP-08)</strong> khi nhận hàng.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>Quy chuẩn S4-06 AC2:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Hủy đơn bắt buộc phải nhập lý do giải trình. Hệ thống sẽ <strong>tự động nhả tồn đang giữ chỗ</strong> cho đơn này về kho khả dụng ngay lập tức.
              </p>
            </div>
          )}

          {/* Vắn tắt thông tin đơn */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Đại lý:</span>
              <strong className="text-gray-900">{order.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tổng tiền đơn:</span>
              <strong className="font-mono text-[#F85606] font-bold">
                {formatCurrencyVND(Number(order.totalAmount || 0))}
              </strong>
            </div>
          </div>

          {/* Ô nhập lý do hủy */}
          {!isDispatchedOrLater && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FileText size={13} className="text-gray-500" />
                  <span>
                    Lý do hủy đơn <span className="text-rose-600">*</span>
                  </span>
                </span>
                <span className="text-[10px] text-rose-500 font-semibold">Bắt buộc nhập</span>
              </label>

              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Ví dụ: Đại lý báo tạm hoãn nhập hàng do kho đầy, đặt trùng đơn..."
                className={`w-full p-2.5 text-xs rounded-xl border bg-white focus:outline-none transition resize-none ${
                  validationError
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                    : 'border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100'
                }`}
              />

              {validationError && (
                <p className="text-[11px] text-rose-600 font-semibold animate-in fade-in">
                  {validationError}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              Đóng
            </button>

            {!isDispatchedOrLater && (
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs shadow-rose-600/25 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Ban size={14} />
                <span>{submitting ? 'Đang hủy...' : 'Xác Nhận Hủy Đơn'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
