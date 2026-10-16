import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { updateProductLot } from '../../services/productLotApi';
import type { ProductLotResponse, ProductLotUpdateRequest } from '../../types/productLot';

interface ProductLotUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lot: ProductLotResponse | null;
}

export const ProductLotUpdateModal: React.FC<ProductLotUpdateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lot
}) => {
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'LOCKED'>('ACTIVE');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lot && isOpen) {
      setManufactureDate(lot.manufactureDate || '');
      setExpiredDate(lot.expiredDate || '');
      setNotes(lot.notes || '');
      setStatus(lot.status || 'ACTIVE');
      setError(null);
    }
  }, [lot, isOpen]);

  if (!isOpen || !lot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!expiredDate) {
      setError('Vui lòng chọn hạn sử dụng');
      return;
    }
    if (manufactureDate && expiredDate && manufactureDate > expiredDate) {
      setError('Hạn sử dụng phải sau ngày sản xuất');
      return;
    }

    try {
      setSubmitting(true);
      const payload: ProductLotUpdateRequest = {
        manufactureDate: manufactureDate || null,
        expiredDate,
        notes: notes.trim() || null,
        status
      };

      await updateProductLot(lot.id, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cập nhật lô hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-orange-50/30">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Cập nhật Lô hàng</h3>
              <p className="text-xs sm:text-sm text-gray-500 font-mono mt-0.5">
                Số lô: <strong className="text-gray-900">{lot.batchNumber}</strong> • SKU: <strong className="text-gray-900">{lot.productSku}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Tình trạng khóa */}
          <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">Trạng thái kiểm soát lô:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                status === 'LOCKED' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {status === 'LOCKED' ? 'Đã khóa xuất kho' : 'Đang hoạt động bình thường'}
              </span>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => setStatus('ACTIVE')}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Unlock size={17} />
                <span>Hoạt động (Cho phép xuất kho)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('LOCKED')}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  status === 'LOCKED'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Lock size={17} />
                <span>Khóa lô (Tạm cấm xuất kho)</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 italic">
              * Lô bị khóa sẽ bị ngăn chặn hoàn toàn trên mọi giao diện tạo đơn và xuất kho.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Ngày sản xuất */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar size={16} className="text-gray-400" />
                <span>Ngày sản xuất</span>
              </label>
              <input
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
              />
            </div>

            {/* Hạn sử dụng */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar size={16} className="text-orange-500" />
                <span>Hạn sử dụng (HSD) *</span>
              </label>
              <input
                type="date"
                required
                value={expiredDate}
                onChange={(e) => setExpiredDate(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-800">
              Ghi chú cập nhật
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Kiểm định chất lượng đạt chuẩn, gia hạn bảo quản..."
              className="w-full px-4 py-3 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3.5 border-t border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition cursor-pointer shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
