import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Agency } from '../../types/agency';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  Trash2
} from '../common/Icons';

interface DeleteAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  /** Gọi Backend xoá; trả về kết quả để modal hiện lỗi thật (vd đã phát sinh đơn hàng) */
  onConfirmDelete: (agency: Agency, reason: string) => Promise<{ success: boolean; message: string; code?: string }>;
  onOpenSuspend?: (agency: Agency) => void;
}

export const DeleteAgencyModal: React.FC<DeleteAgencyModalProps> = ({
  isOpen,
  onClose,
  agency,
  onConfirmDelete,
  onOpenSuspend
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Backend báo đại lý đã phát sinh đơn hàng -> chuyển sang màn "không thể xoá"
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setBlockedMessage(null);
    }
  }, [isOpen, agency?.id]);

  if (!isOpen || !agency) return null;

  const hasTransactions =
    Boolean(blockedMessage) || Boolean(agency.hasTransactions) || (agency.transactionCount ?? 0) > 0;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do xoá đại lý');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await onConfirmDelete(agency, reason.trim());
      if (res.success) {
        onClose();
      } else if (res.code === 'CUSTOMER_HAS_TRANSACTIONS') {
        setBlockedMessage(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể xoá đại lý');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`px-6 py-4.5 border-b flex items-center justify-between ${
            hasTransactions
              ? 'bg-amber-50/70 border-amber-100'
              : 'bg-rose-50/70 border-rose-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
                hasTransactions
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {hasTransactions ? <ShieldAlert size={22} /> : <Trash2 size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {hasTransactions ? 'Cảnh Báo Không Thể Xóa' : 'Xác Nhận Xóa Đại Lý'}
              </h2>
              <p className="text-xs text-gray-500 font-mono font-medium">
                [{agency.code}] — {agency.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung cảnh báo */}
        <div className="p-6 space-y-4 text-center">
          {hasTransactions ? (
            // Trường hợp 1: ĐÃ CÓ GIAO DỊCH -> Chặn xóa và cảnh báo rõ ràng
            <div className="space-y-3.5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <AlertTriangle size={32} />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Đã phát sinh giao dịch không thể xóa
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {blockedMessage || (
                    <>
                      Đại lý <strong className="text-gray-900">[{agency.code}] {agency.name}</strong> đã phát sinh{' '}
                      <strong className="text-orange-600">{agency.transactionCount} giao dịch / đơn hàng</strong> trong hệ thống.
                    </>
                  )}
                </p>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 text-left leading-relaxed flex items-start gap-2">
                <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Hệ thống bảo vệ dữ liệu nghiêm cấm xóa vĩnh viễn đại lý đã có chứng từ kế toán. Nếu không còn hợp tác, bạn có thể chọn <strong>Dừng hoạt động</strong>.
                </span>
              </div>
            </div>
          ) : (
            // Trường hợp 2: CHƯA CÓ GIAO DỊCH -> Cho phép xóa kèm cảnh báo xác nhận
            <div className="space-y-3.5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <Trash2 size={28} />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Bạn có chắc muốn xóa đại lý này?
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hồ sơ đại lý <strong className="text-gray-900">[{agency.code}] {agency.name}</strong>
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left">
                ⚠️ Chỉ xoá được đại lý <strong>chưa có đơn hàng nào</strong> (vd tạo nhầm). Hồ sơ, điểm giao và lịch sử phân công sẽ bị{' '}
                <strong>xóa vĩnh viễn</strong>; thao tác được ghi vào Nhật ký thao tác.
              </div>

              <div className="text-left">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lý do xoá <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError(null);
                  }}
                  maxLength={500}
                  rows={2}
                  placeholder="VD: Tạo nhầm hồ sơ, trùng với đại lý DL-001"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-200 outline-none resize-none"
                />
                {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          {hasTransactions ? (
            <>
              {onOpenSuspend && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSuspend(agency);
                  }}
                  className="px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
                >
                  Chuyển sang Dừng giao dịch
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Đã hiểu
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="px-4.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-rose-200 flex items-center gap-1.5"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Xác Nhận Xóa</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
