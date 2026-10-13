import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Ban } from 'lucide-react';

interface StockTakeReasonModalProps {
  isOpen: boolean;
  mode: 'CLOSE' | 'CANCEL';
  stockTakeCode: string;
  hasDifference?: boolean;
  differenceCount?: number;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

/**
 * S5-08: Modal nhập lý do khi Chốt hoặc Huỷ phiếu kiểm kê
 * - Chốt kiểm kê: bắt buộc nhập lý do điều chỉnh số tồn kho
 * - Huỷ phiếu: bắt buộc nhập lý do huỷ
 */
export const StockTakeReasonModal: React.FC<StockTakeReasonModalProps> = ({
  isOpen,
  mode,
  stockTakeCode,
  hasDifference = false,
  differenceCount = 0,
  onClose,
  onSubmit
}) => {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const isClose = mode === 'CLOSE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setErrorMsg('Vui lòng nhập lý do (bắt buộc).');
      return;
    }
    if (cleanReason.length < 5) {
      setErrorMsg('Lý do phải có ít nhất 5 ký tự.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await onSubmit(cleanReason);
      setReason('');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi thực hiện thao tác.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isClose
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isClose ? <CheckCircle2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isClose ? 'Xác nhận chốt kiểm kê' : 'Huỷ phiếu kiểm kê'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mã phiếu: <span className="font-semibold text-slate-800 dark:text-slate-200">{stockTakeCode}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isClose && (
            <div
              className={`p-4 rounded-xl text-sm border ${
                hasDifference
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    {hasDifference
                      ? `Phát hiện ${differenceCount} mặt hàng có chênh lệch!`
                      : 'Toàn bộ số đếm khớp hoàn toàn với số tồn sổ.'}
                  </p>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Khi chốt phiếu, hệ thống sẽ <strong>tự động điều chỉnh số lượng tồn kho</strong> về đúng số thực
                    đếm và ghi nhận lịch sử vào thẻ kho. Hành động này không thể hoàn tác.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isClose && (
            <div className="p-4 rounded-xl text-sm bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="font-semibold">Lưu ý khi huỷ phiếu kiểm kê:</p>
                  <p className="text-xs opacity-90 leading-relaxed mt-1">
                    Phiếu sẽ bị huỷ bỏ, toàn bộ kết quả kiểm đếm sẽ không được áp dụng vào tồn kho.
                  </p>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {isClose ? 'Lý do điều chỉnh tồn kho' : 'Lý do huỷ phiếu'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isClose
                  ? 'Ví dụ: Kiểm kê định kỳ tháng 10/2026, ghi nhận hao hụt do va đập và hao hụt lưu kho...'
                  : 'Ví dụ: Lập nhầm kho, đã kiểm kê trên phiếu khác...'
              }
              maxLength={500}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-sm resize-none"
              autoFocus
            />
            <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
              <span>Bắt buộc phải nhập để phục vụ kiểm toán nội bộ</span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition flex items-center gap-2 ${
                isClose
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-400'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-400'
              }`}
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isClose ? 'Chốt kiểm kê ngay' : 'Xác nhận huỷ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
