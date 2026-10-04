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
      setError('Bắt buộc phải nhập lý do khi ngừng giao dịch với nhà cung cấp!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4.5 border-b flex items-center justify-between ${
            isDeactivating
              ? 'bg-amber-50/70 border-amber-100 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDeactivating
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-600'
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
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <Icons.AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isDeactivating ? (
            <div className="space-y-3">
              <div className="p-3 bg-orange-50/60 border border-orange-200/80 rounded-xl text-xs text-gray-700 space-y-1">
                <p className="font-semibold text-orange-900">
                  ⚠️ Lưu ý kiểm soát nguồn hàng:
                </p>
                <p>
                  Nhà cung cấp đã có phiếu nhập kho sẽ không được xóa khỏi hệ thống để đảm bảo tính toàn vẹn khi truy nguyên lô hàng lỗi. Bạn chỉ có thể chuyển sang trạng thái <strong>Ngừng giao dịch</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lý do ngừng giao dịch <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Nhà cung cấp vi phạm cam kết chất lượng / Đang đối soát công nợ cuối năm..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Lý do này sẽ được lưu trữ và hiển thị khi tra cứu nguồn hàng của phiếu nhập.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-700">
                Bạn có chắc chắn muốn mở lại trạng thái <strong>ĐANG GIAO DỊCH</strong> cho nhà cung cấp{' '}
                <strong>{supplier.name}</strong>?
              </p>
              {supplier.statusReason && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <strong>Lý do ngừng giao dịch trước đó:</strong> {supplier.statusReason}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Sau khi kích hoạt, nhà cung cấp này sẽ sẵn sàng để gắn vào các phiếu nhập kho mới.
              </p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 min-h-[40px] ${
                isDeactivating
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
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
