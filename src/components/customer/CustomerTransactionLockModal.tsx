import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Agency } from '../../types/agency';
import { setCustomerTransactionLock } from '../../services/agencyApi';
import {
  Lock,
  Unlock,
  AlertTriangle,
  X,
  ShieldAlert,
  Building2,
  Clock,
  CheckCircle2
} from '../common/Icons';

interface CustomerTransactionLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onSuccess: () => void;
}

export const CustomerTransactionLockModal: React.FC<CustomerTransactionLockModalProps> = ({
  isOpen,
  onClose,
  agency,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Khi mở modal, reset state
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen, agency]);

  if (!isOpen || !agency) return null;

  const isCurrentlyLocked = Boolean(agency.transactionLocked);
  const targetLocked = !isCurrentlyLocked; // Nếu đang khóa thì hành động là mở khóa, ngược lại là khóa

  // Tính phần trăm nợ so với hạn mức tín dụng
  const debtRatio =
    agency.creditLimit > 0 ? Math.round((agency.totalDebt / agency.creditLimit) * 100) : 0;

  // Gợi ý lý do khóa nhanh
  const lockSuggestions = [
    'Nợ quá hạn trên 30 ngày chưa thanh toán đối soát',
    'Có dấu hiệu mất khả năng thanh toán công nợ',
    'Công nợ vượt quá hạn mức tín dụng tối đa cho phép',
    'Tạm khóa giao dịch theo yêu cầu kiểm toán kế toán'
  ];

  // Gợi ý lý do mở khóa nhanh
  const unlockSuggestions = [
    'Đại lý đã thanh toán toàn bộ công nợ quá hạn',
    'Đã đối soát xong công nợ và bổ sung bảo lãnh thanh toán',
    'Được Giám đốc phê duyệt gia hạn thời hạn thanh toán',
    'Đại lý cam kết thanh toán theo lộ trình mới'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError('Bắt buộc phải nhập lý do khi khóa hoặc mở giao dịch đại lý!');
      return;
    }

    if (cleanReason.length < 5) {
      setError('Lý do phải có ít nhất 5 ký tự để đảm bảo tính minh bạch kiểm toán!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await setCustomerTransactionLock({
        agencyId: agency.id,
        locked: targetLocked,
        reason: cleanReason
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError('Lỗi kết nối khi cập nhật trạng thái giao dịch.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className={`px-6 py-4.5 border-b flex items-center justify-between ${
            targetLocked
              ? 'bg-rose-50/70 border-rose-100'
              : 'bg-emerald-50/70 border-emerald-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${
                targetLocked
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {targetLocked ? <Lock size={22} /> : <Unlock size={22} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {targetLocked ? 'Khóa Giao Dịch Đại Lý' : 'Mở Khóa Giao Dịch Đại Lý'}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Mã: <span className="font-mono font-semibold text-gray-700">{agency.code}</span> — {agency.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Thẻ chỉ số tài chính & rủi ro công nợ */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-gray-700 pb-2 border-b border-gray-200/70">
              <span className="flex items-center gap-1.5 text-gray-800">
                <Building2 size={14} className="text-gray-500" />
                Hồ Sơ Tài Chính & Rủi Ro Công Nợ
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-medium">
                {agency.customerGroupName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-gray-500 block mb-0.5">Công nợ hiện tại:</span>
                <span className={`text-sm font-bold font-mono ${agency.totalDebt > 0 ? 'text-rose-600' : 'text-gray-800'}`}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(agency.totalDebt)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Hạn mức tín dụng:</span>
                <span className="text-sm font-bold font-mono text-gray-800">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(agency.creditLimit)}
                </span>
              </div>
            </div>

            {/* Thanh tỷ lệ sử dụng nợ */}
            <div>
              <div className="flex justify-between items-center text-[11px] text-gray-500 mb-1">
                <span>Tỷ lệ nợ / Hạn mức:</span>
                <span className={`font-bold ${debtRatio > 100 ? 'text-rose-600' : debtRatio > 80 ? 'text-amber-600' : 'text-gray-700'}`}>
                  {debtRatio}% {debtRatio > 100 && '(Vượt hạn mức)'}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    debtRatio > 100 ? 'bg-rose-500' : debtRatio > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(debtRatio, 100)}%` }}
                />
              </div>
            </div>

            {/* Thông tin khóa hiện tại nếu đang mở khóa */}
            {isCurrentlyLocked && agency.transactionLockReason && (
              <div className="p-2.5 bg-rose-50/70 border border-rose-200/70 rounded-lg text-rose-800 text-[11px] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-rose-600" />
                  Đang bị khóa giao dịch:
                </div>
                <p className="italic pl-4 text-rose-900">"{agency.transactionLockReason}"</p>
                {agency.transactionLockedAt && (
                  <p className="text-[10px] text-rose-700 pl-4 flex items-center gap-1">
                    <Clock size={11} /> Khóa từ: {agency.transactionLockedAt}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Hộp cảnh báo quy tắc nghiệp vụ SCRUM-19 */}
          {targetLocked ? (
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                QUY TẮC KIỂM SOÁT RỦI RO CÔNG NỢ
              </div>
              <ul className="list-disc pl-5 space-y-1 text-rose-800 text-[11.5px] leading-relaxed">
                <li>
                  <strong>Chặn tạo đơn mới:</strong> Đại lý bị khóa sẽ không thể tạo đơn hàng mới trên toàn bộ hệ thống, kể cả cổng đặt hàng B2B.
                </li>
                <li>
                  <strong>Bảo lưu đơn đang dở:</strong> Các đơn hàng dở dang trước đó vẫn tiếp tục được xử lý nhưng hệ thống sẽ hiển thị cảnh báo cho kho và kế toán.
                </li>
                <li>
                  <strong>Kiểm toán nội bộ:</strong> Hành động khóa và lý do sẽ được ghi vết vĩnh viễn vào Nhật ký kiểm toán (Audit Trail).
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                MỞ KHÓA GIAO DỊCH ĐẠI LÝ
              </div>
              <p className="text-emerald-800 text-[11.5px] leading-relaxed">
                Sau khi mở khóa, đại lý và nhân viên kinh doanh có thể tiếp tục tạo đơn hàng và giao dịch bình thường trên hệ thống. Bắt buộc nhập lý do mở khóa để phục vụ đối soát.
              </p>
            </div>
          )}

          {/* Ô nhập lý do */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Lý do {targetLocked ? 'khóa giao dịch' : 'mở khóa'} <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400">Tối thiểu 5 ký tự</span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                targetLocked
                  ? 'Nhập chi tiết lý do khóa (Ví dụ: Nợ quá hạn 45 ngày, có nguy cơ mất khả năng thanh toán...)'
                  : 'Nhập lý do mở khóa (Ví dụ: Đại lý đã thanh toán hết nợ cũ, được duyệt hạn mức mới...)'
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition-all placeholder:text-gray-400"
            />

            {/* Gợi ý lý do nhanh */}
            <div className="mt-2 space-y-1">
              <span className="text-[11px] text-gray-500 font-medium block">Gợi ý lý do nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                {(targetLocked ? lockSuggestions : unlockSuggestions).map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReason(tag)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-[#F85606] text-gray-600 border border-gray-200 transition-colors text-left"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                targetLocked
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : targetLocked ? (
                <>
                  <Lock size={14} />
                  <span>Xác Nhận Khóa Giao Dịch</span>
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  <span>Xác Nhận Mở Khóa Giao Dịch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
