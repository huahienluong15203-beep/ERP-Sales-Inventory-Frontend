import React, { useState } from 'react';
import {
  X,
  FileCheck,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import {
  approveDebtAdjustment,
  rejectDebtAdjustment
} from '../../services/debtAdjustmentApi';
import type { DebtAdjustment } from '../../types/debtAdjustment';

interface DebtAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: DebtAdjustment | null;
  onSuccess: (updated: DebtAdjustment) => void;
}

export const DebtAdjustmentModal: React.FC<DebtAdjustmentModalProps> = ({
  isOpen,
  onClose,
  adjustment,
  onSuccess
}) => {
  const { user, showToast } = useAuth();
  const [approvalNote, setApprovalNote] = useState<string>('Đồng ý giảm trừ công nợ theo đúng giá gốc');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !adjustment) return null;

  const isPending = adjustment.status === 'PENDING_APPROVAL';

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const updated = await approveDebtAdjustment(
        adjustment.id,
        approvalNote.trim(),
        user?.fullName || 'Kế toán công nợ'
      );
      showToast('Đã phê duyệt chứng từ và giảm trừ công nợ đại lý thành công!', 'success');
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi duyệt chứng từ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối chứng từ', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const updated = await rejectDebtAdjustment(adjustment.id, rejectReason.trim());
      showToast('Đã từ chối chứng từ điều chỉnh công nợ', 'info');
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi từ chối chứng từ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs text-white">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Duyệt Chứng từ Giảm trừ Công nợ khi Trả hàng
              </h2>
              <p className="text-xs text-blue-100">
                Mã chứng từ: <span className="font-mono font-bold text-white">{adjustment.adjustmentCode}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Thông tin liên kết chứng từ (AC1, AC4) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-gray-200">
            <div>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider block">Phiếu trả hàng gốc:</span>
              <span className="font-bold text-gray-900 font-mono text-sm block mt-0.5">
                {adjustment.returnOrderCode}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">Đã nhập lại kho</span>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider block">Hoá đơn bán hàng gốc:</span>
              <span className="font-bold text-indigo-700 font-mono text-sm block mt-0.5">
                {adjustment.originalInvoiceCode}
              </span>
              <span className="text-[11px] text-gray-500">Ngày lập: {adjustment.originalInvoiceDate}</span>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider block">Trạng thái chứng từ:</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                  adjustment.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : adjustment.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {adjustment.status === 'APPROVED' ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>Đã duyệt cấn trừ</span>
                  </>
                ) : adjustment.status === 'REJECTED' ? (
                  <>
                    <XCircle size={12} />
                    <span>Đã từ chối</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} />
                    <span>Chờ kế toán duyệt</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Thông tin Đại lý / Khách hàng */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/80 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-gray-500 block text-[11px]">Đại lý được giảm trừ:</span>
              <div className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                <User size={15} className="text-blue-600" />
                <span>{adjustment.customerName}</span>
                <span className="text-xs font-mono text-blue-700">({adjustment.customerCode})</span>
              </div>
              {adjustment.customerAddress && (
                <div className="text-gray-500 text-[11px]">{adjustment.customerAddress}</div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] text-gray-500 block">Lý do trả hàng:</span>
              <span className="text-xs font-semibold text-gray-800 max-w-xs block text-right">
                {adjustment.returnReason}
              </span>
            </div>
          </div>

          {/* Quy tắc nghiệp vụ (AC2 & AC4) */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong>Quy tắc hạch toán:</strong> Giảm trừ công nợ được tính <strong>chính xác theo giá bán ban đầu trên hoá đơn gốc</strong> (kể cả khi giá niêm yết hiện hành đã biến động). Hoá đơn gốc được bảo lưu lịch sử nguyên vẹn không bị sửa đổi.
            </div>
          </div>

          {/* Bảng chi tiết từng dòng hàng trả */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 font-bold text-gray-700 uppercase text-[11px]">
              Chi tiết các mặt hàng trả lại cấn trừ công nợ
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/70 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2">Sản phẩm</th>
                    <th className="px-3 py-2 text-center">SL trả lại</th>
                    <th className="px-3 py-2 text-right">Giá gốc lúc bán *</th>
                    <th className="px-3 py-2 text-right text-gray-400">Giá hiện hành</th>
                    <th className="px-3 py-2 text-right">Thành tiền giảm trừ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adjustment.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          SKU: {item.productSku} • ĐVT: {item.baseUnit}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-900">
                        {item.returnQuantity}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">
                        {formatCurrencyVND(item.originalSoldPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-400 line-through">
                        {formatCurrencyVND(item.currentCatalogPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-rose-700">
                        -{formatCurrencyVND(item.adjustmentAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tổng tiền giảm trừ */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 uppercase">
                Tổng số tiền giảm trừ công nợ:
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                -{formatCurrencyVND(adjustment.totalAdjustmentAmount)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 italic">
              Bằng chữ: <strong>{numberToVietnameseWords(adjustment.totalAdjustmentAmount)}</strong>
            </p>
          </div>

          {/* Form duyệt / từ chối */}
          {isPending && (
            <div className="space-y-3 pt-1 border-t border-gray-200">
              {!showRejectInput ? (
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 block">
                    Ghi chú phê duyệt của Kế toán công nợ:
                  </label>
                  <input
                    type="text"
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Nhập ghi chú phê duyệt giảm trừ công nợ..."
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <label className="font-bold text-rose-800 block">Lý do từ chối chứng từ *:</label>
                  <input
                    type="text"
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ví dụ: Chưa khớp số lượng kiểm đếm tại kho, sai hoá đơn gốc..."
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Lịch sử phê duyệt nếu đã duyệt */}
          {!isPending && adjustment.approvedAt && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-[11px]">
              <span className="text-gray-500">
                Thực hiện bởi: <strong>{adjustment.approvedBy}</strong> lúc {adjustment.approvedAt}
              </span>
              {adjustment.approvalNote && (
                <div className="text-gray-700 font-medium italic">"{adjustment.approvalNote}"</div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
          >
            Đóng
          </button>

          {isPending && (
            <div className="flex items-center gap-2">
              {!showRejectInput ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleApprove}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Phê duyệt giảm trừ công nợ</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleReject}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebtAdjustmentModal;
