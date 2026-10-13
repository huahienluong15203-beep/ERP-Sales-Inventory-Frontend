import React from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from '../common/Icons';

interface WarehouseDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  targetName: string;
  targetCode?: string;
  isWarehouse?: boolean;
  isLoading?: boolean;
}

export const WarehouseDeleteConfirmModal: React.FC<WarehouseDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  targetName,
  targetCode,
  isWarehouse = false,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hành động cần được xác nhận</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Bạn có chắc chắn muốn xóa {isWarehouse ? 'kho hàng' : 'vị trí lưu trữ'}:
          </p>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
            {targetCode && (
              <span className="inline-block px-2 py-0.5 mb-1.5 text-xs font-mono font-medium rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                {targetCode}
              </span>
            )}
            <div className="font-semibold text-slate-800 dark:text-slate-100">{targetName}</div>
          </div>

          {isWarehouse ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-semibold block">Lưu ý an toàn dữ liệu:</span>
              <span>
                Nếu kho này đã có dữ liệu tồn kho, vị trí hoặc phát sinh giao dịch xuất nhập, hệ thống sẽ tự động chuyển trạng thái sang <strong>Ngừng hoạt động</strong> để bảo toàn lịch sử sổ sách.
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vị trí sẽ bị xóa khỏi sơ đồ kho. Hãy đảm bảo không còn hàng hóa nào đang được gán tại vị trí này.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm shadow-rose-600/30"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Xác nhận xóa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
