import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Agency } from '../../types/agency';
import { AlertTriangle, CheckCircle2, X, ShieldAlert } from '../common/Icons';

interface SuspendAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onConfirmSuspend: (agencyId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  onConfirmReactivate: (agencyId: string) => Promise<{ success: boolean; message: string }>;
}

export const SuspendAgencyModal: React.FC<SuspendAgencyModalProps> = ({
  isOpen,
  onClose,
  agency,
  onConfirmSuspend,
  onConfirmReactivate
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !agency) return null;

  const isSuspended = agency.status === 'SUSPENDED';

  const handleAction = async () => {
    setError(null);
    if (!isSuspended && !reason.trim()) {
      setError('Bắt buộc phải nhập lý do dừng giao dịch đại lý!');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (isSuspended) {
        res = await onConfirmReactivate(agency.id);
      } else {
        res = await onConfirmSuspend(agency.id, reason.trim());
      }

      if (res.success) {
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError('Lỗi kết nối khi cập nhật trạng thái.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isSuspended ? 'bg-emerald-50/60 border-emerald-100' : 'bg-amber-50/60 border-amber-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
                isSuspended ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {isSuspended ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isSuspended ? 'Mở Lại Hoạt Động Giao Dịch' : 'Xác Nhận Dừng Giao Dịch Đại Lý'}
              </h2>
              <p className="text-xs text-gray-500">Mã đại lý: [{agency.code}]</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Hộp thông tin đại lý & bảo vệ lịch sử giao dịch */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/70">
              <span className="text-gray-500">Tên đại lý:</span>
              <strong className="text-gray-900">{agency.name}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/70">
              <span className="text-gray-500">Mã số thuế:</span>
              <span className="font-mono font-bold text-gray-800">{agency.taxCode}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/70">
              <span className="text-gray-500">Số đơn / Giao dịch đã phát sinh:</span>
              <span className="font-bold text-orange-600">{agency.transactionCount} giao dịch</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Công nợ hiện tại:</span>
              <strong className="text-red-600 font-mono">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(agency.totalDebt)}
              </strong>
            </div>
          </div>

          {/* Cảnh báo quy tắc nghiệp vụ */}
          {!isSuspended ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5">QUY TẮC BẢO TOÀN DỮ LIỆU:</strong>
                  Đại lý đã phát sinh giao dịch sẽ <strong>không bao giờ bị xóa</strong> để bảo toàn chứng từ kế toán.
                  Khi chuyển sang <strong>Dừng giao dịch</strong>, đại lý sẽ bị chặn tạo đơn bán lẻ và đặt hàng mới, nhưng vẫn tra cứu được công nợ lịch sử.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Lý do dừng giao dịch <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Quá hạn thanh toán 30 ngày / Tạm ngừng đối soát theo yêu cầu Kế toán..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                Bạn có chắc chắn muốn mở lại hoạt động giao dịch cho đại lý này? Sau khi mở lại, nhân viên kinh doanh có thể tạo đơn hàng bình thường.
                {agency.suspendReason && (
                  <p className="mt-1 text-gray-500 italic">
                    Lý do đã dừng trước đây: "{agency.suspendReason}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleAction}
            disabled={submitting}
            className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              isSuspended
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            }`}
          >
            {submitting ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                {isSuspended ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{isSuspended ? 'Xác Nhận Mở Lại' : 'Dừng Giao Dịch Ngay'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
