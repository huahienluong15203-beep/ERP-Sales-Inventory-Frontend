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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Cập nhật Lô hàng</h3>
              <p className="text-xs text-gray-500 font-mono">
                Số lô: <strong>{lot.batchNumber}</strong> • SKU: {lot.productSku}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Tình trạng khóa */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Trạng thái kiểm soát lô:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                status === 'LOCKED' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {status === 'LOCKED' ? 'Đã khóa xuất kho' : 'Đang hoạt động bình thường'}
              </span>
            </label>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStatus('ACTIVE')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Unlock size={14} />
                <span>Hoạt động (Cho xuất)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('LOCKED')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'LOCKED'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Lock size={14} />
                <span>Khóa lô (Cấm xuất)</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              * Lô bị khóa sẽ bị ngăn chặn hoàn toàn trên mọi giao diện xuất kho.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ngày sản xuất */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Calendar size={13} className="text-gray-400" />
                <span>Ngày sản xuất</span>
              </label>
              <input
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Hạn sử dụng */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Calendar size={13} className="text-orange-500" />
                <span>Hạn sử dụng (HSD) *</span>
              </label>
              <input
                type="date"
                required
                value={expiredDate}
                onChange={(e) => setExpiredDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Ghi chú cập nhật
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Kiểm định chất lượng đạt chuẩn, gia hạn bảo quản..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-indigo-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
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
