import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Warehouse, Layers, FileText, AlertCircle } from 'lucide-react';
import type { StockTake } from '../../types/stockTake';
import type { WarehouseOption } from '../../types/inventory';
import type { CategoryWithCount } from '../../services/categoryApi';
import { fetchCategories } from '../../services/categoryApi';
import { createStockTake, fetchWarehousesList } from '../../services/stockTakeApi';
import { useAuth } from '../../contexts/AuthContext';

interface StockTakeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStockTake: StockTake) => void;
}

/**
 * S5-08: Modal Tạo phiếu kiểm kê kho
 * - AC1: Tạo phiếu kiểm kê theo kho hoặc theo nhóm hàng; hệ thống chụp chốt số tồn sổ tại thời điểm tạo.
 */
export const StockTakeCreateModal: React.FC<StockTakeCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
  const [note, setNote] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setErrorMsg('');
      setNote('');
      setSelectedCategoryId('');
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [whList, catList] = await Promise.all([
        fetchWarehousesList(),
        fetchCategories().catch(() => [])
      ]);
      setWarehouses(whList);
      if (whList.length > 0) {
        setSelectedWarehouseId(Number(whList[0].id));
      }
      setCategories(catList);
    } catch (err: unknown) {
      setErrorMsg('Không thể tải danh sách kho hoặc nhóm hàng.');
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      setErrorMsg('Vui lòng chọn kho kiểm kê.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const created = await createStockTake({
        warehouseId: Number(selectedWarehouseId),
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
        note: note.trim() || undefined
      });

      showToast(
        'Tạo phiếu kiểm kê thành công!',
        `Phiếu ${created.code} đã được tạo với ${created.lineCount} mặt hàng tồn sổ.`,
        'success'
      );
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo phiếu kiểm kê');
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tạo phiếu kiểm kê kho mới
              </h3>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Snapshot Info Callout */}
          <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200 text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Cơ chế chụp chốt số tồn sổ (Snapshot):</span>
            </div>
            <p className="pl-6 text-slate-600 dark:text-slate-300">
              Hệ thống sẽ ghi nhận số lượng tồn sổ của từng mặt hàng tại kho ngay lúc bạn bấm <strong>&ldquo;Tạo phiếu&rdquo;</strong>.
              Các biến động nhập/xuất phát sinh sau đó sẽ không làm thay đổi mốc số sổ đối chiếu của phiếu này.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Chọn Kho */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-primary-500" />
                Kho kiểm kê <span className="text-rose-500">*</span>
              </span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
              disabled={loadingData || submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  [{w.code}] {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Nhóm hàng (tùy chọn) */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                Phạm vi nhóm hàng (Tùy chọn)
              </span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingData || submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">-- Toàn bộ mặt hàng trong kho (Kiểm kê tổng thể) --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `[${c.code}] ` : ''}{c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nếu chọn một nhóm hàng, phiếu sẽ chỉ lấy các sản phẩm thuộc nhóm này (bao gồm cả các nhóm con).
            </p>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Ghi chú / Mục đích kiểm kê
              </span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Kiểm kê định kỳ cuối tháng, kiểm kê đột xuất nhóm đồ uống giải nhiệt..."
              maxLength={500}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
            />
            <div className="flex justify-end mt-1 text-xs text-slate-400">
              <span>{note.length}/500</span>
            </div>
          </div>

          {/* Footer actions */}
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
              disabled={submitting || loadingData || !selectedWarehouseId}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:from-orange-700 active:to-amber-700 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lập phiếu & chụp tồn...</span>
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" />
                  <span>Tạo phiếu kiểm kê</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
