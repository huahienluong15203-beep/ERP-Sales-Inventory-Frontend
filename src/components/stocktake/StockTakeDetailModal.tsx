import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Save,
  Search,
  Warehouse,
  User,
  Calendar,
  Sparkles,
  RefreshCw,
  FileText,
  ShieldCheck,
  Check,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import type { StockTake, StockTakeLine } from '../../types/stockTake';
import {
  fetchStockTakeDetail,
  updateStockTakeCounts,
  closeStockTake,
  cancelStockTake
} from '../../services/stockTakeApi';
import { useAuth } from '../../contexts/AuthContext';
import { StockTakeReasonModal } from './StockTakeReasonModal';

interface StockTakeDetailModalProps {
  isOpen: boolean;
  stockTakeId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
}

interface LocalLineState {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  baseUnit: string;
  systemQuantity: number;
  countedQuantity: number | null;
  difference: number | null;
  note: string;
}

/**
 * S5-08: Modal Chi tiết & Thực hiện Kiểm kê kho
 * - AC2: Nhập số đếm thực tế; hệ thống tính chênh lệch từng dòng
 * - AC3: Chốt kiểm kê điều chỉnh tồn về số thực đếm và bắt buộc nhập lý do
 * - AC4: Chỉ Quản lý kho (ROLE_WH_MANAGER) được chốt phiếu kiểm kê
 */
export const StockTakeDetailModal: React.FC<StockTakeDetailModalProps> = ({
  isOpen,
  stockTakeId,
  onClose,
  onUpdated
}) => {
  const { currentRole, showToast } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [stockTake, setStockTake] = useState<StockTake | null>(null);
  const [lines, setLines] = useState<LocalLineState[]>([]);
  const [savingCounts, setSavingCounts] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Filters inside modal
  const [keyword, setKeyword] = useState<string>('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'DIFF' | 'SURPLUS' | 'SHORTAGE' | 'MATCH' | 'UNCOUNTED'
  >('ALL');

  // Reason Modal for Close / Cancel
  const [reasonModalMode, setReasonModalMode] = useState<'CLOSE' | 'CANCEL' | null>(null);

  // RBAC permission check (AC4)
  const isWhManager = currentRole === 'ROLE_WH_MANAGER' || currentRole === 'ROLE_ADMIN';
  const canEditCounts =
    stockTake?.status === 'DRAFT' &&
    (currentRole === 'ROLE_WAREHOUSE' || currentRole === 'ROLE_WH_MANAGER' || currentRole === 'ROLE_ADMIN');

  useEffect(() => {
    if (isOpen && stockTakeId) {
      loadDetail(stockTakeId);
    } else {
      setStockTake(null);
      setLines([]);
      setIsDirty(false);
      setKeyword('');
      setFilterType('ALL');
    }
  }, [isOpen, stockTakeId]);

  const loadDetail = async (id: number) => {
    try {
      setLoading(true);
      const data = await fetchStockTakeDetail(id);
      setStockTake(data);
      const mappedLines: LocalLineState[] = (data.lines || []).map((l: StockTakeLine) => ({
        id: l.id,
        productId: l.productId,
        sku: l.sku,
        productName: l.productName,
        baseUnit: l.baseUnit,
        systemQuantity: Number(l.systemQuantity),
        countedQuantity: l.countedQuantity !== null && l.countedQuantity !== undefined ? Number(l.countedQuantity) : null,
        difference: l.difference !== null && l.difference !== undefined ? Number(l.difference) : null,
        note: l.note || ''
      }));
      setLines(mappedLines);
      setIsDirty(false);
    } catch (err: unknown) {
      showToast('Lỗi', err instanceof Error ? err.message : 'Không thể tải chi tiết phiếu kiểm kê', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle local change for a line counted quantity (AC2)
  const handleCountChange = (lineId: number, rawVal: string) => {
    setIsDirty(true);
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;

        if (rawVal.trim() === '') {
          return {
            ...l,
            countedQuantity: null,
            difference: null
          };
        }

        const parsed = parseFloat(rawVal.replace(',', '.'));
        if (isNaN(parsed) || parsed < 0) {
          return l;
        }

        const diff = Number((parsed - l.systemQuantity).toFixed(4));
        return {
          ...l,
          countedQuantity: parsed,
          difference: diff
        };
      })
    );
  };

  // Handle line note change
  const handleNoteChange = (lineId: number, noteVal: string) => {
    setIsDirty(true);
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, note: noteVal } : l))
    );
  };

  // Quick action: fill all uncounted items with system quantity
  const handleFillAllWithSystemQty = () => {
    setIsDirty(true);
    setLines((prev) =>
      prev.map((l) => {
        if (l.countedQuantity === null || l.countedQuantity === undefined) {
          return {
            ...l,
            countedQuantity: l.systemQuantity,
            difference: 0
          };
        }
        return l;
      })
    );
    showToast('Đã điền nhanh', 'Tất cả các dòng chưa đếm đã được điền bằng số tồn sổ.', 'info');
  };

  // Save counts to server
  const handleSaveCounts = async () => {
    if (!stockTake) return;
    try {
      setSavingCounts(true);
      const payload = {
        lines: lines.map((l) => ({
          lineId: l.id,
          countedQuantity: l.countedQuantity,
          note: l.note.trim() || undefined
        }))
      };
      const updated = await updateStockTakeCounts(stockTake.id, payload);
      setStockTake(updated);
      setIsDirty(false);
      showToast('Thành công', 'Đã lưu kết quả đếm thực tế lên hệ thống.', 'success');
      onUpdated?.();
    } catch (err: unknown) {
      showToast('Lỗi lưu số đếm', err instanceof Error ? err.message : 'Có lỗi xảy ra', 'error');
    } finally {
      setSavingCounts(false);
    }
  };

  // Close stock take with reason (AC3 & AC4)
  const handleConfirmClose = async (reason: string) => {
    if (!stockTake) return;
    // Auto-save pending changes first if any
    if (isDirty) {
      const payload = {
        lines: lines.map((l) => ({
          lineId: l.id,
          countedQuantity: l.countedQuantity,
          note: l.note.trim() || undefined
        }))
      };
      await updateStockTakeCounts(stockTake.id, payload);
    }
    const closed = await closeStockTake(stockTake.id, reason);
    setStockTake(closed);
    setIsDirty(false);
    showToast(
      'Chốt kiểm kê thành công!',
      `Phiếu ${closed.code} đã hoàn tất điều chỉnh tồn kho theo số thực đếm.`,
      'success'
    );
    onUpdated?.();
    loadDetail(stockTake.id);
  };

  // Cancel stock take with reason
  const handleConfirmCancel = async (reason: string) => {
    if (!stockTake) return;
    const cancelled = await cancelStockTake(stockTake.id, reason);
    setStockTake(cancelled);
    setIsDirty(false);
    showToast('Đã huỷ phiếu kiểm kê', `Phiếu ${cancelled.code} đã được chuyển sang trạng thái đã huỷ.`, 'info');
    onUpdated?.();
    loadDetail(stockTake.id);
  };

  // Filtered lines for display
  const filteredLines = useMemo(() => {
    return lines.filter((l) => {
      // Keyword match
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const matchSku = l.sku.toLowerCase().includes(kw);
        const matchName = l.productName.toLowerCase().includes(kw);
        if (!matchSku && !matchName) return false;
      }

      // Tab filter
      if (filterType === 'DIFF') {
        return l.difference !== null && l.difference !== 0;
      }
      if (filterType === 'SURPLUS') {
        return l.difference !== null && l.difference > 0;
      }
      if (filterType === 'SHORTAGE') {
        return l.difference !== null && l.difference < 0;
      }
      if (filterType === 'MATCH') {
        return l.difference !== null && l.difference === 0;
      }
      if (filterType === 'UNCOUNTED') {
        return l.countedQuantity === null || l.countedQuantity === undefined;
      }
      return true;
    });
  }, [lines, keyword, filterType]);

  // Live KPI metrics computed from local lines
  const localMetrics = useMemo(() => {
    const totalLines = lines.length;
    let counted = 0;
    let diffCount = 0;
    let totalSurplus = 0;
    let totalShortage = 0;

    lines.forEach((l) => {
      if (l.countedQuantity !== null && l.countedQuantity !== undefined) {
        counted++;
        if (l.difference !== null && l.difference !== 0) {
          diffCount++;
          if (l.difference > 0) {
            totalSurplus += l.difference;
          } else {
            totalShortage += Math.abs(l.difference);
          }
        }
      }
    });

    return {
      totalLines,
      counted,
      uncounted: totalLines - counted,
      diffCount,
      totalSurplus: Number(totalSurplus.toFixed(2)),
      totalShortage: Number(totalShortage.toFixed(2))
    };
  }, [lines]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Phiếu kiểm kê: {stockTake?.code || 'Đang tải...'}
                </h3>
                {stockTake && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      stockTake.status === 'CLOSED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : stockTake.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                    }`}
                  >
                    {stockTake.status === 'CLOSED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : stockTake.status === 'CANCELLED' ? (
                      <Ban className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {stockTake.statusLabel || stockTake.status}
                  </span>
                )}
                {isDirty && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium border border-amber-300 dark:border-amber-700">
                    Chưa lưu thay đổi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kho: <strong className="text-slate-700 dark:text-slate-300">{stockTake?.warehouseName}</strong> ({stockTake?.warehouseCode})
                {stockTake?.categoryName && (
                  <> • Nhóm hàng: <strong className="text-slate-700 dark:text-slate-300">{stockTake.categoryName}</strong></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stockTakeId && loadDetail(stockTakeId)}
              disabled={loading || savingCounts}
              title="Tải lại dữ liệu từ máy chủ"
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Đang tải chi tiết phiếu kiểm kê...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Metadata & Status Notice Banner */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-y-2">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Người lập: <strong>{stockTake?.createdByUsername}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Ngày tạo: <strong>{stockTake?.createdAt ? new Date(stockTake.createdAt).toLocaleString('vi-VN') : '--'}</strong>
                </span>
                {stockTake?.note && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Ghi chú: <span className="italic">{stockTake.note}</span>
                  </span>
                )}
              </div>

              {stockTake?.status === 'CLOSED' && (
                <div className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Chốt bởi <strong>{stockTake.closedByUsername}</strong> lúc {stockTake.closedAt ? new Date(stockTake.closedAt).toLocaleString('vi-VN') : '--'}
                    {stockTake.closeReason && ` • Lý do: "${stockTake.closeReason}"`}
                  </span>
                </div>
              )}

              {stockTake?.status === 'CANCELLED' && (
                <div className="text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>
                    Phiếu đã huỷ • Lý do: &ldquo;{stockTake.closeReason || 'Không có lý do'}&rdquo;
                  </span>
                </div>
              )}
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Tổng số mặt hàng
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {localMetrics.totalLines} <span className="text-xs font-normal text-slate-400">SKU</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50">
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Tiến độ đếm thực tế
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {localMetrics.counted}
                  </span>
                  <span className="text-xs text-blue-500">/ {localMetrics.totalLines}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-blue-100 dark:bg-blue-900/50 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        localMetrics.totalLines > 0
                          ? Math.round((localMetrics.counted / localMetrics.totalLines) * 100)
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  Số dòng có chênh lệch
                </span>
                <span className="text-xl font-bold text-amber-900 dark:text-amber-100 mt-0.5 block">
                  {localMetrics.diffCount} <span className="text-xs font-normal text-amber-500">dòng</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tổng thừa (+)
                </span>
                <span className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-0.5 block">
                  +{localMetrics.totalSurplus.toLocaleString('vi-VN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Tổng thiếu (-)
                </span>
                <span className="text-xl font-bold text-rose-800 dark:text-rose-200 mt-0.5 block">
                  -{localMetrics.totalShortage.toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Filter toolbar inside modal */}
            <div className="px-6 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm theo SKU hoặc tên hàng..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Filter tags */}
                <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
                  <button
                    type="button"
                    onClick={() => setFilterType('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      filterType === 'ALL'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Tất cả ({lines.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('DIFF')}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      filterType === 'DIFF'
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                  >
                    Có lệch ({localMetrics.diffCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('SURPLUS')}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      filterType === 'SURPLUS'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    Thừa (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('SHORTAGE')}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      filterType === 'SHORTAGE'
                        ? 'bg-rose-600 text-white'
                        : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                  >
                    Thiếu (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('MATCH')}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      filterType === 'MATCH'
                        ? 'bg-slate-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Khớp (=)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('UNCOUNTED')}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      filterType === 'UNCOUNTED'
                        ? 'bg-indigo-600 text-white'
                        : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                    }`}
                  >
                    Chưa đếm ({localMetrics.uncounted})
                  </button>
                </div>
              </div>

              {/* Quick fill button */}
              {canEditCounts && (
                <button
                  type="button"
                  onClick={handleFillAllWithSystemQty}
                  className="px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 border border-primary-200 dark:border-primary-800 rounded-lg transition flex items-center gap-1.5"
                  title="Tự động điền số thực tế = số tồn sổ cho các dòng chưa nhập"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                  Điền nhanh = Tồn sổ
                </button>
              )}
            </div>

            {/* Lines Table */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-2 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Mặt hàng (SKU & Tên)</th>
                    <th className="py-2.5 px-2 w-20 text-center">ĐVT cơ sở</th>
                    <th className="py-2.5 px-3 w-28 text-right bg-slate-50/50 dark:bg-slate-800/30">
                      Tồn sổ (Snapshot)
                    </th>
                    <th className="py-2.5 px-3 w-36 text-right">
                      Số thực đếm <span className="text-rose-500">*</span>
                    </th>
                    <th className="py-2.5 px-3 w-32 text-center">Chênh lệch (AC2)</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Ghi chú dòng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {filteredLines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Không có mặt hàng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredLines.map((line, idx) => {
                      const isCounted = line.countedQuantity !== null && line.countedQuantity !== undefined;
                      const diff = line.difference;

                      return (
                        <tr
                          key={line.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            diff !== null && diff !== 0
                              ? diff > 0
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                                : 'bg-rose-50/20 dark:bg-rose-950/10'
                              : ''
                          }`}
                        >
                          <td className="py-2 px-2 text-center text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 block">
                              {line.sku}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 line-clamp-1">
                              {line.productName}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                              {line.baseUnit}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30">
                            {line.systemQuantity.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {canEditCounts ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={line.countedQuantity !== null && line.countedQuantity !== undefined ? line.countedQuantity : ''}
                                onChange={(e) => handleCountChange(line.id, e.target.value)}
                                placeholder="Nhập số..."
                                className={`w-28 px-2 py-1 text-right text-xs font-mono font-bold rounded-lg border focus:outline-none focus:ring-2 transition ${
                                  !isCounted
                                    ? 'border-dashed border-slate-300 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-950/20 focus:ring-primary-500'
                                    : diff === 0
                                    ? 'border-slate-300 dark:border-slate-700 focus:ring-primary-500 text-slate-900 dark:text-white'
                                    : diff !== null && diff > 0
                                    ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 focus:ring-emerald-500'
                                    : 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 focus:ring-rose-500'
                                }`}
                              />
                            ) : (
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {isCounted ? line.countedQuantity?.toLocaleString('vi-VN') : '--'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {!isCounted ? (
                              <span className="text-[11px] text-slate-400 italic">Chưa đếm</span>
                            ) : diff === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <Check className="w-3 h-3" /> Khớp (0)
                              </span>
                            ) : diff !== null && diff > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <TrendingUp className="w-3 h-3" /> +{diff.toLocaleString('vi-VN')} (Thừa)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <TrendingDown className="w-3 h-3" /> {diff?.toLocaleString('vi-VN')} (Thiếu)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {canEditCounts ? (
                              <input
                                type="text"
                                value={line.note}
                                onChange={(e) => handleNoteChange(line.id, e.target.value)}
                                placeholder="Ghi chú nguyên nhân lệch..."
                                maxLength={255}
                                className="w-full px-2 py-1 text-xs bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition rounded"
                              />
                            ) : (
                              <span className="text-slate-600 dark:text-slate-400 italic">
                                {line.note || '--'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              {/* Left buttons (Huỷ phiếu) */}
              <div>
                {stockTake?.status === 'DRAFT' && isWhManager && (
                  <button
                    type="button"
                    onClick={() => setReasonModalMode('CANCEL')}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Ban className="w-4 h-4" />
                    Huỷ phiếu kiểm kê
                  </button>
                )}
              </div>

              {/* Right buttons */}
              <div className="flex items-center gap-3">
                {stockTake?.status === 'DRAFT' && (
                  <>
                    {/* Nút Lưu số đếm */}
                    {canEditCounts && (
                      <button
                        type="button"
                        onClick={handleSaveCounts}
                        disabled={savingCounts || !isDirty}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 ${
                          isDirty
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {savingCounts ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Lưu số đếm
                      </button>
                    )}

                    {/* Nút Chốt kiểm kê (AC3 & AC4) */}
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => setReasonModalMode('CLOSE')}
                        disabled={!isWhManager || localMetrics.uncounted > 0}
                        className={`px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 ${
                          isWhManager && localMetrics.uncounted === 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Chốt kiểm kê & Cân bằng tồn
                      </button>

                      {/* Tooltip explain reason if disabled */}
                      {!isWhManager ? (
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-72 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-20">
                          <div className="flex items-start gap-1.5">
                            <Info className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>
                              <strong>Quyền hạn (AC4):</strong> Chỉ Quản lý kho (ROLE_WH_MANAGER) mới được chốt phiếu kiểm kê và điều chỉnh sổ tồn.
                            </span>
                          </div>
                        </div>
                      ) : localMetrics.uncounted > 0 ? (
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-20">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>
                              Còn <strong>{localMetrics.uncounted}</strong> dòng chưa đếm. Vui lòng nhập hết số thực đếm hoặc bấm &ldquo;Điền nhanh = Tồn sổ&rdquo; trước khi chốt.
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reason Modal (Chốt hoặc Huỷ) */}
      {reasonModalMode && stockTake && (
        <StockTakeReasonModal
          isOpen={true}
          mode={reasonModalMode}
          stockTakeCode={stockTake.code}
          hasDifference={localMetrics.diffCount > 0}
          differenceCount={localMetrics.diffCount}
          onClose={() => setReasonModalMode(null)}
          onSubmit={async (reason) => {
            if (reasonModalMode === 'CLOSE') {
              await handleConfirmClose(reason);
            } else {
              await handleConfirmCancel(reason);
            }
          }}
        />
      )}
    </div>
  );
};
