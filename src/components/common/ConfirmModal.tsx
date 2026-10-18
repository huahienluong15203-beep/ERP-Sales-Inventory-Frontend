import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, RefreshCw, CheckCircle2 } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  const defaultConfirmLabel = confirmLabel || (isDanger ? 'Xác nhận xóa' : isSuccess ? 'Xác nhận nộp quỹ' : 'Xác nhận');

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isWarning
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : isSuccess
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}
            >
              {isDanger ? (
                <Trash2 size={24} />
              ) : isSuccess ? (
                <CheckCircle2 size={24} />
              ) : (
                <AlertTriangle size={24} />
              )}
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base font-bold text-gray-900">
                {title}
              </h3>
              <span className="text-[11px] text-gray-400 font-medium">Hệ thống ERP Quản trị Bán hàng & Kho</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="text-xs text-gray-600 leading-relaxed bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            autoFocus
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                : isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-[#F85606] hover:bg-[#E04D05] shadow-orange-500/20'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>{defaultConfirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
