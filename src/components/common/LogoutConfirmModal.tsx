import React, { useEffect } from 'react';
import { LogOut, RefreshCw } from './Icons';

interface LogoutConfirmModalProps {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Hộp xác nhận trước khi đăng xuất (S1-02).
 * Bấm "Huỷ", bấm ra ngoài hoặc nhấn Esc để đóng.
 */
export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  open,
  loading = false,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
          <LogOut size={26} color="#F85606" />
        </div>

        <h3 id="logout-confirm-title" className="text-lg font-bold text-slate-900 mb-2">
          Xác nhận đăng xuất
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            autoFocus
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Đang đăng xuất...</span>
              </>
            ) : (
              <span>Đăng xuất</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
