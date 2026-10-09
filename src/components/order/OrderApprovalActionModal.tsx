import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  FileText,
  X,
  Building2,
  DollarSign
} from 'lucide-react';
import type { ApprovalReason, PendingOrderResponse, OrderBackendResponse } from '../../types/order';
import { approveOrder, rejectOrder, returnOrderForEdit, formatCurrencyVND } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';

export type ApprovalActionType = 'APPROVE' | 'REJECT' | 'RETURN';

interface OrderApprovalActionModalProps {
  isOpen: boolean;
  order: PendingOrderResponse | OrderBackendResponse | null;
  actionType: ApprovalActionType;
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderApprovalActionModal: React.FC<OrderApprovalActionModalProps> = ({
  isOpen,
  order,
  actionType,
  onClose,
  onSuccess
}) => {
  const { showToast } = useAuth();
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const isReject = actionType === 'REJECT';
  const isReturn = actionType === 'RETURN';
  const isApprove = actionType === 'APPROVE';
  const isCommentRequired = isReject || isReturn;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order.id) {
      setValidationError('Không tìm thấy ID đơn hàng hợp lệ');
      return;
    }
    if (isCommentRequired && !comment.trim()) {
      setValidationError(
        isReject
          ? 'Bắt buộc nhập lý do từ chối đơn hàng!'
          : 'Bắt buộc nhập ý kiến hướng dẫn khi trả lại đơn để sửa!'
      );
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const targetId = order.id;
      if (isApprove) {
        await approveOrder(targetId, comment);
        showToast(
          'Duyệt đơn thành công',
          `Đã phê duyệt đơn hàng [${order.code || targetId}]. Đơn hàng chuyển sang giữ chỗ kho để xuất hàng.`,
          'success'
        );
      } else if (isReject) {
        await rejectOrder(targetId, comment);
        showToast(
          'Đã từ chối đơn hàng',
          `Đã từ chối đơn hàng [${order.code || targetId}]. Lý do: "${comment.trim()}".`,
          'info'
        );
      } else if (isReturn) {
        await returnOrderForEdit(targetId, comment);
        showToast(
          'Đã trả lại đơn hàng',
          `Đã trả đơn hàng [${order.code || targetId}] về trạng thái Đơn nháp để nhân viên chỉnh sửa.`,
          'info'
        );
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      showToast(
        'Thao tác thất bại',
        err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Lấy danh sách lý do vi phạm (từ PendingOrderResponse hoặc fallback)
  const reasons: ApprovalReason[] =
    'reasons' in order && Array.isArray((order as PendingOrderResponse).reasons)
      ? (order as PendingOrderResponse).reasons
      : [];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            isApprove
              ? 'bg-emerald-50/80 border-emerald-100 text-emerald-950'
              : isReject
              ? 'bg-rose-50/80 border-rose-100 text-rose-950'
              : 'bg-amber-50/80 border-amber-100 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                isApprove
                  ? 'bg-emerald-600 shadow-emerald-500/20'
                  : isReject
                  ? 'bg-rose-600 shadow-rose-500/20'
                  : 'bg-amber-600 shadow-amber-500/20'
              }`}
            >
              {isApprove && <CheckCircle2 size={20} />}
              {isReject && <XCircle size={20} />}
              {isReturn && <RotateCcw size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {isApprove && 'Phê Duyệt Đơn Hàng (S4-05)'}
                {isReject && 'Từ Chối Đơn Hàng (S4-05)'}
                {isReturn && 'Trả Lại Đơn Yêu Cầu Sửa (S4-05)'}
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

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Thông tin vắn tắt đơn hàng */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/90 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <Building2 size={13} className="text-gray-400" />
                <span>Đại lý:</span>
              </span>
              <strong className="text-gray-900 font-semibold truncate max-w-[220px]">
                {('customerName' in order && order.customerName) || 'Đại lý'}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <DollarSign size={13} className="text-[#F85606]" />
                <span>Tổng giá trị đơn:</span>
              </span>
              <strong className="text-sm font-bold font-mono text-[#F85606]">
                {formatCurrencyVND(Number(order.totalAmount || 0))}
              </strong>
            </div>

            {'lineCount' in order && (
              <div className="flex items-center justify-between text-gray-500">
                <span>Số dòng hàng:</span>
                <span className="font-semibold text-gray-700">{order.lineCount} dòng</span>
              </div>
            )}
          </div>

          {/* Danh sách lý do cần duyệt & Mức vi phạm (AC1) */}
          {reasons.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>Lý do cần duyệt & Mức vi phạm:</span>
              </div>
              <div className="space-y-1.5 pl-4">
                {reasons.map((r, idx) => (
                  <div key={idx} className="text-[11px] text-amber-950">
                    <span className="font-bold">• {r.label || r.code}: </span>
                    <span>{r.detail}</span>
                    {r.violationAmount ? (
                      <span className="font-mono font-bold text-rose-700 ml-1">
                        (Vi phạm: {formatCurrencyVND(r.violationAmount)})
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ô nhập ý kiến / lý do (AC2: Bắt buộc khi Từ chối hoặc Trả lại sửa) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText size={13} className="text-gray-500" />
                <span>
                  {isApprove && 'Ý kiến phê duyệt (Tùy chọn)'}
                  {isReject && (
                    <>
                      Lý do từ chối đơn hàng <span className="text-rose-600">*</span>
                    </>
                  )}
                  {isReturn && (
                    <>
                      Ý kiến hướng dẫn chỉnh sửa <span className="text-amber-600">*</span>
                    </>
                  )}
                </span>
              </span>
              {isCommentRequired && (
                <span className="text-[10px] text-rose-500 font-semibold">Bắt buộc nhập</span>
              )}
            </label>

            <textarea
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={
                isApprove
                  ? 'Ví dụ: Đã kiểm tra và đồng ý phê duyệt đơn ngoại lệ...'
                  : isReject
                  ? 'Ví dụ: Vượt hạn mức quá lớn và có nợ cũ chưa thanh toán, không đồng ý cấp thêm...'
                  : 'Ví dụ: Yêu cầu nhân viên kinh doanh chỉnh giá sản phẩm về tối thiểu giá sàn...'
              }
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

            <p className="text-[10px] text-gray-400 leading-tight">
              {isApprove && 'Ý kiến sẽ được ghi nhận vào Lịch sử duyệt (S4-05 AC4). Đơn sẽ chuyển sang trạng thái ĐÃ DUYỆT.'}
              {isReject && 'Ý kiến bắt buộc để NVKD nắm được lý do không duyệt. Đơn sẽ chuyển sang TỪ CHỐI.'}
              {isReturn && 'Ý kiến bắt buộc để NVKD biết cần sửa gì. Đơn sẽ trả về ĐƠN NHÁP để sửa lại.'}
            </p>
          </div>

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting || (isCommentRequired && !comment.trim())}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : isReject
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
              }`}
            >
              {submitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  {isApprove && <CheckCircle2 size={14} />}
                  {isReject && <XCircle size={14} />}
                  {isReturn && <RotateCcw size={14} />}
                  <span>
                    {isApprove && 'Xác Nhận Duyệt Đơn'}
                    {isReject && 'Xác Nhận Từ Chối'}
                    {isReturn && 'Xác Nhận Trả Lại Sửa'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
