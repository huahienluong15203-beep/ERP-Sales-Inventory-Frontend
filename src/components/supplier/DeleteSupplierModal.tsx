import React, { useState } from 'react';
import type { Supplier } from '../../types/supplier';
import { Icons } from '../common/Icons';

interface DeleteSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onConfirm: (supplier: Supplier) => Promise<void>;
}

export const DeleteSupplierModal: React.FC<DeleteSupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onConfirm
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !supplier) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(supplier);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể xóa đối tác cung ứng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-supplier-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon cảnh báo đỏ */}
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
          <Icons.Trash2 size={26} />
        </div>

        {/* Tiêu đề & Nội dung */}
        <h3 id="delete-supplier-title" className="text-lg font-bold text-gray-900 mb-2">
          Xác nhận xóa đối tác
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Bạn có chắc chắn muốn xóa đối tác{' '}
          <strong className="text-gray-900">{supplier.name}</strong> (
          <span className="font-mono text-orange-600 font-semibold">{supplier.code}</span>) khỏi hệ thống?
        </p>

        {/* Cảnh báo quy tắc nghiệp vụ */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 flex items-start gap-2.5 mb-5">
          <Icons.AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block text-amber-800">Quy tắc nghiệp vụ:</span>
            <span className="text-amber-700 block text-[11.5px] leading-relaxed">
              Chỉ xóa được đối tác chưa phát sinh phiếu nhập kho. Nếu đã có giao dịch, hệ thống sẽ yêu cầu chuyển sang{' '}
              <strong>Ngừng giao dịch</strong> để bảo toàn lịch sử dữ liệu.
            </span>
          </div>
        </div>

        {/* Hiển thị lỗi nếu không xóa được */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-left flex items-start gap-2">
            <Icons.AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-colors disabled:opacity-60 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
          >
            {submitting ? (
              <>
                <Icons.RefreshCw size={16} className="animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Icons.Trash2 size={16} />
                <span>Xác nhận xóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
