import React, { useState, useEffect } from 'react';
import type { Supplier, SupplierStatus } from '../../types/supplier';
import { changeSupplierStatus } from '../../services/supplierApi';
import { Icons } from '../common/Icons';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  targetStatus: SupplierStatus; // ACTIVE hoặc INACTIVE
  onSuccess: (updated: Supplier) => void;
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  supplier,
  targetStatus,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason('');
    setError(null);
  }, [isOpen, supplier, targetStatus]);

  if (!isOpen || !supplier) return null;

  const isDeactivating = targetStatus === 'INACTIVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeactivating && !reason.trim()) {
      setError('Bắt buộc phải nhập lý do khi ngừng giao dịch với nhà cung cấp (Quy chuẩn S2-09)!');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await changeSupplierStatus(supplier.id, {
        status: targetStatus,
        reason: isDeactivating ? reason.trim() : undefined
      });
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi đổi trạng thái');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4.5 border-b flex items-center justify-between ${
            isDeactivating
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
              : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDeactivating
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300'
              }`}
            >
              {isDeactivating ? <Icons.AlertTriangle size={22} /> : <Icons.CheckCircle2 size={22} />}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isDeactivating ? 'Ngừng giao dịch Nhà cung cấp' : 'Tiếp tục giao dịch Nhà cung cấp'}
              </h2>
              <p className="text-xs opacity-80">
                {supplier.code} • {supplier.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Icons.AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isDeactivating ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  ⚠️ Quy tắc nghiệp vụ kho (S2-09):
                </p>
                <p>
                  Nhà cung cấp đã từng phát sinh phiếu nhập kho sẽ không được phép xóa khỏi cơ sở dữ liệu để đảm bảo
                  tính toàn vẹn khi truy nguyên lô hàng lỗi. Bạn chỉ có thể chuyển sang trạng thái <strong>Ngừng giao dịch</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do ngừng giao dịch <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Nhà cung cấp vi phạm cam kết giao hàng / Đang đối soát công nợ..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Lý do này sẽ được lưu trữ và hiển thị khi tra cứu nguồn hàng của phiếu nhập.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Bạn có chắc chắn muốn mở lại trạng thái <strong>ĐANG GIAO DỊCH</strong> cho nhà cung cấp{' '}
                <strong>{supplier.name}</strong>?
              </p>
              {supplier.statusReason && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                  <strong>Lý do ngừng giao dịch trước đó:</strong> {supplier.statusReason}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Sau khi kích hoạt, nhà cung cấp này sẽ xuất hiện lại trong danh sách chọn nguồn hàng khi tạo Phiếu nhập kho mới.
              </p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
                isDeactivating
                  ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
              }`}
            >
              {submitting ? (
                <>
                  <Icons.RefreshCw size={14} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  {isDeactivating ? <Icons.AlertTriangle size={14} /> : <Icons.Check size={14} />}
                  <span>{isDeactivating ? 'Xác nhận ngừng giao dịch' : 'Mở lại giao dịch'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
