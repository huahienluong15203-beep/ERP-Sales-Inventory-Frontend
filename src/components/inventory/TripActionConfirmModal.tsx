import React from 'react';
import { AlertTriangle, CheckCircle2, Truck, X, RefreshCw } from 'lucide-react';

interface TripActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  tripCode?: string;
  badgeText?: string;
  message: string;
  highlightDetail?: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'warning' | 'danger';
  loading?: boolean;
}

export const TripActionConfirmModal: React.FC<TripActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  tripCode,
  badgeText,
  message,
  highlightDetail,
  confirmLabel,
  confirmVariant = 'primary',
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in zoom-in-95 duration-150 relative">
        <button
          onClick={onClose}
          type="button"
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="p-6 text-center space-y-3 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center mx-auto shadow-inner">
            {confirmVariant === 'warning' ? (
              <AlertTriangle className="w-7 h-7 text-[#F85606]" />
            ) : (
              <Truck className="w-7 h-7 text-[#F85606]" />
            )}
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
              {title}
            </h3>
            {tripCode && (
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-orange-50 text-[#F85606] border border-orange-200">
                  {tripCode}
                </span>
                {badgeText && (
                  <span className="text-[11px] font-semibold text-gray-500">
                    • {badgeText}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-2 space-y-3 text-xs text-gray-600">
          {highlightDetail && (
            <div className="p-3.5 rounded-xl bg-orange-50/80 border border-orange-200 text-orange-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#F85606]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Lưu ý số điểm giao tồn đọng:</span>
              </div>
              <p className="text-gray-800 leading-relaxed font-medium pl-5.5">
                {highlightDetail}
              </p>
            </div>
          )}

          <p className="text-gray-700 text-center leading-relaxed font-medium text-xs sm:text-sm">
            {message}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="p-6 pt-5 flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 mt-4">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            Huỷ bỏ
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{loading ? 'Đang xử lý...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
