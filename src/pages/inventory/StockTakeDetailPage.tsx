import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  Clock,
  Ban,
  Save,
  Search,
  Sparkles,
  RefreshCw,
  Printer,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Check,
  Warehouse,
  Layers,
  FileText,
  User
} from 'lucide-react';
import type { StockTake, StockTakeLine } from '../../types/stockTake';
import {
  fetchStockTakeDetail,
  updateStockTakeCounts,
  closeStockTake,
  cancelStockTake
} from '../../services/stockTakeApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';
import { StockTakeReasonModal } from '../../components/stocktake/StockTakeReasonModal';
import { formatQuantity } from '../../services/orderService';

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

export const StockTakeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, showToast } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [stockTake, setStockTake] = useState<StockTake | null>(null);
  const [lines, setLines] = useState<LocalLineState[]>([]);
  const [savingCounts, setSavingCounts] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Filters inside detail page
  const [keyword, setKeyword] = useState<string>('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'DIFF' | 'SURPLUS' | 'SHORTAGE' | 'MATCH' | 'UNCOUNTED'
  >('ALL');

  // Phân trang danh sách mặt hàng kiểm kê
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reason Modal for Close / Cancel
  const [reasonModalMode, setReasonModalMode] = useState<'CLOSE' | 'CANCEL' | null>(null);

  // RBAC permission check
  const isWhManager = currentRole === 'ROLE_WH_MANAGER' || currentRole === 'ROLE_ADMIN';
  const canEditCounts =
    stockTake?.status === 'DRAFT' &&
    (currentRole === 'ROLE_WAREHOUSE' || currentRole === 'ROLE_WH_MANAGER' || currentRole === 'ROLE_ADMIN');

  const loadDetail = useCallback(async (stockTakeId: number) => {
    try {
      setLoading(true);
      const data = await fetchStockTakeDetail(stockTakeId);
      setStockTake(data);
      let hasDefaulted = false;
      const mappedLines: LocalLineState[] = (data.lines || []).map((l: StockTakeLine) => {
        const sysQty = Number(l.systemQuantity);
        const hasSaved = l.countedQuantity !== null && l.countedQuantity !== undefined;
        const counted = hasSaved ? Number(l.countedQuantity) : sysQty;
        const diff = hasSaved && l.difference !== null && l.difference !== undefined
          ? Number(l.difference)
          : Number((counted - sysQty).toFixed(4));

        if (!hasSaved) {
          hasDefaulted = true;
        }

        return {
          id: l.id,
          productId: l.productId,
          sku: l.sku,
          productName: l.productName,
          baseUnit: l.baseUnit,
          systemQuantity: sysQty,
          countedQuantity: counted,
          difference: diff,
          note: l.note || ''
        };
      });

      setLines(mappedLines);
      if (hasDefaulted && data.status === 'DRAFT') {
        setIsDirty(true);
      } else {
        setIsDirty(false);
      }
    } catch (err: unknown) {
      showToast('Lỗi', err instanceof Error ? err.message : 'Không thể tải chi tiết phiếu kiểm kê', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (id) {
      loadDetail(Number(id));
    }
  }, [id, loadDetail]);

  // Handle local change for a line counted quantity
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
    } catch (err: unknown) {
      showToast('Lỗi lưu số đếm', err instanceof Error ? err.message : 'Có lỗi xảy ra', 'error');
    } finally {
      setSavingCounts(false);
    }
  };

  // Close stock take with reason
  const handleConfirmClose = async (reason: string) => {
    if (!stockTake) return;
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
      'success',
      5000
    );
    loadDetail(stockTake.id);
  };

  // Cancel stock take with reason
  const handleConfirmCancel = async (reason: string) => {
    if (!stockTake) return;
    const cancelled = await cancelStockTake(stockTake.id, reason);
    setStockTake(cancelled);
    setIsDirty(false);
    showToast('Đã hủy phiếu kiểm kê', `Phiếu ${cancelled.code} đã chuyển sang trạng thái đã hủy.`, 'info');
    loadDetail(stockTake.id);
  };

  // Filter & Search lines
  const filteredLines = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return lines.filter((l) => {
      // Filter by keyword
      if (kw) {
        const matchSku = l.sku.toLowerCase().includes(kw);
        const matchName = l.productName.toLowerCase().includes(kw);
        if (!matchSku && !matchName) return false;
      }

      // Filter by type
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

  // Statistics
  const stats = useMemo(() => {
    let diff = 0;
    let surplus = 0;
    let shortage = 0;
    let match = 0;
    let uncounted = 0;

    lines.forEach((l) => {
      if (l.countedQuantity === null || l.countedQuantity === undefined) {
        uncounted++;
      } else if (l.difference === 0) {
        match++;
      } else if (l.difference !== null && l.difference > 0) {
        diff++;
        surplus++;
      } else if (l.difference !== null && l.difference < 0) {
        diff++;
        shortage++;
      }
    });

    return { diff, surplus, shortage, match, uncounted };
  }, [lines]);

  // Tổng hợp dữ liệu phục vụ in ấn biên bản kiểm kê
  const printTotals = useMemo(() => {
    let totalSystemQty = 0;
    let totalCountedQty = 0;
    let totalDiffQty = 0;

    lines.forEach((l) => {
      totalSystemQty += l.systemQuantity || 0;
      if (l.countedQuantity !== null && l.countedQuantity !== undefined) {
        totalCountedQty += l.countedQuantity;
      }
      if (l.difference !== null && l.difference !== undefined) {
        totalDiffQty += l.difference;
      }
    });

    return {
      totalSystemQty: Number(totalSystemQty.toFixed(4)),
      totalCountedQty: Number(totalCountedQty.toFixed(4)),
      totalDiffQty: Number(totalDiffQty.toFixed(4)),
    };
  }, [lines]);

  // Phân trang
  const totalLines = filteredLines.length;
  const totalPages = Math.ceil(totalLines / pageSize) || 1;

  useEffect(() => {
    setPage(1);
  }, [keyword, filterType, pageSize]);

  const pagedLines = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLines.slice(start, start + pageSize);
  }, [filteredLines, page, pageSize]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center mx-auto animate-pulse">
          <RefreshCw size={24} className="animate-spin" />
        </div>
        <p className="text-sm font-bold text-gray-700">Đang tải thông tin chi tiết phiếu kiểm kê...</p>
      </div>
    );
  }

  if (!stockTake) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <ClipboardList size={32} />
        </div>
        <h2 className="text-lg font-black text-gray-900">Không tìm thấy phiếu kiểm kê</h2>
        <p className="text-xs text-gray-500">
          Phiếu kiểm kê kho yêu cầu không tồn tại trên hệ thống hoặc đã bị gỡ bỏ.
        </p>
        <button
          type="button"
          onClick={() => navigate('/inventory/stocktakes')}
          className="px-4 py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách phiếu kiểm kê</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto pb-24 print:pb-0 print:m-0 print:max-w-none print:space-y-0 animate-in fade-in duration-200">
      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & BREADCRUMBS (ẨN KHI IN) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/inventory/stocktakes')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="stocktake-detail-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách phiếu kiểm kê</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Kho bãi & Tồn kho / Kiểm kê kho / Phiếu {stockTake.code}
          </span>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => id && loadDetail(Number(id))}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="In phiếu kiểm kê"
          >
            <Printer size={15} />
            <span>In Phiếu</span>
          </button>

          {canEditCounts && (
            <button
              type="button"
              disabled={savingCounts}
              onClick={handleSaveCounts}
              className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95 ${
                isDirty
                  ? 'bg-[#F85606] hover:bg-orange-600 text-white shadow-orange-500/20'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Save size={15} />
              <span>{isDirty ? 'Lưu số đếm (*)' : 'Đã lưu số đếm'}</span>
            </button>
          )}

          {stockTake.status === 'DRAFT' && isWhManager && (
            <>
              <button
                type="button"
                onClick={() => setReasonModalMode('CANCEL')}
                className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Ban size={14} />
                <span>Hủy phiếu</span>
              </button>

              <button
                type="button"
                onClick={() => setReasonModalMode('CLOSE')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
              >
                <ShieldCheck size={16} />
                <span>Chốt Kiểm Kê (Ghi Tồn)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. KHỐI THÔNG TIN PHIẾU KIỂM KÊ (DUY NHẤT 1 CARD CÂN ĐỐI, GỌN GÀNG, KHÔNG LẶP LẠI, ẨN KHI IN) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 no-print space-y-4 bg-gradient-to-r from-orange-50/50 via-amber-50/15 to-white">
        {/* Hàng 1: Tiêu đề + Mã phiếu + Badge trạng thái + Thống kê 4 ô */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
              <ClipboardList size={26} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Phiếu Kiểm Kê: <span className="text-[#F85606] font-mono">{stockTake.code}</span>
                </h1>

                {stockTake.status === 'CLOSED' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={13} />
                    <span>ĐÃ HOÀN TẤT & ĐIỀU CHỈNH TỒN</span>
                  </span>
                ) : stockTake.status === 'CANCELLED' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <Ban size={13} />
                    <span>ĐÃ HỦY PHIẾU</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <Clock size={13} />
                    <span>ĐANG THỰC HIỆN KIỂM ĐẾM (NHÁP)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Thời điểm chốt số tồn sổ (Snapshot): <strong>{new Date(stockTake.createdAt).toLocaleString('vi-VN')}</strong>
              </p>
            </div>
          </div>

          {/* 4 Thẻ chỉ số kết quả kiểm đếm */}
          <div className="flex items-center gap-2 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            <div className="bg-white px-3.5 py-2 rounded-2xl border border-gray-200 text-center shadow-2xs min-w-[85px]">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Tổng số SKU</span>
              <span className="text-sm sm:text-base font-black text-gray-900 font-mono">
                {lines.length}
              </span>
            </div>
            <div className="bg-emerald-50/70 px-3.5 py-2 rounded-2xl border border-emerald-200 text-center shadow-2xs min-w-[85px]">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Khớp sổ (0)</span>
              <span className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                {stats.match}
              </span>
            </div>
            <div className="bg-blue-50/70 px-3.5 py-2 rounded-2xl border border-blue-200 text-center shadow-2xs min-w-[85px]">
              <span className="text-[10px] font-bold uppercase text-blue-700 block">Lệch thừa (+)</span>
              <span className="text-sm sm:text-base font-black text-blue-700 font-mono">
                +{stats.surplus}
              </span>
            </div>
            <div className="bg-rose-50/70 px-3.5 py-2 rounded-2xl border border-rose-200 text-center shadow-2xs min-w-[85px]">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">Lệch thiếu (-)</span>
              <span className="text-sm sm:text-base font-black text-rose-700 font-mono">
                -{stats.shortage}
              </span>
            </div>
          </div>
        </div>

        {/* Hàng 2: Chi tiết thông tin kho, phạm vi, người tạo, mục đích (tinh gọn, không lặp) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-[#F85606] shrink-0">
              <Warehouse size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Kho kiểm kê</span>
              <div className="font-bold text-gray-900 truncate" title={stockTake.warehouseName}>
                {stockTake.warehouseName}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Layers size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Phạm vi nhóm hàng</span>
              <div className="font-bold text-gray-900 truncate" title={stockTake.categoryName || 'Toàn bộ mặt hàng trong kho'}>
                {stockTake.categoryName || 'Toàn bộ mặt hàng trong kho'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Người lập phiếu</span>
              <div className="font-bold text-gray-900 truncate">
                {stockTake.createdByUsername || 'wh_staff'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gray-100 text-gray-600 shrink-0">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Mục đích kiểm kê</span>
              <div className="text-gray-700 italic truncate" title={stockTake.note || '---'}>
                {stockTake.note || '---'}
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin chốt nếu đã hoàn tất */}
        {stockTake.status === 'CLOSED' && stockTake.closeReason && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                Phiếu đã được chốt bởi <strong>{stockTake.closedByUsername}</strong> lúc{' '}
                {stockTake.closedAt ? new Date(stockTake.closedAt).toLocaleString('vi-VN') : ''}
              </span>
              <p className="text-emerald-800 italic mt-0.5">
                Lý do điều chỉnh tồn kho: &ldquo;{stockTake.closeReason}&rdquo;
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. KHỐI BẢNG MẶT HÀNG KIỂM KÊ (PHÂN TRANG ĐẦY ĐỦ, NHẬP SỐ ĐẾM CĂN GIỮA - ẨN KHI IN) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden space-y-0 no-print">
        {/* Header bảng & Bộ lọc & Nút điền nhanh */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[#F85606]" />
            <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">
              Danh Sách Mặt Hàng Kiểm Kê ({filteredLines.length} SKU)
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút điền nhanh bằng số tồn sổ */}
            {canEditCounts && stats.uncounted > 0 && (
              <button
                type="button"
                onClick={handleFillAllWithSystemQty}
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-xs inline-flex items-center gap-1 border border-orange-200 transition cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Điền nhanh bằng tồn sổ ({stats.uncounted})</span>
              </button>
            )}

            {/* Ô tìm kiếm SKU / tên hàng */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã SKU, tên hàng..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {/* Chọn số dòng / trang */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-xs font-semibold focus:outline-none"
            >
              <option value={10}>10 dòng/trang</option>
              <option value={20}>20 dòng/trang</option>
              <option value={50}>50 dòng/trang</option>
              <option value={100}>100 dòng/trang</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tất cả ({lines.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('DIFF')}
            className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'DIFF'
                ? 'bg-[#F85606] text-white shadow-2xs'
                : 'bg-white border border-orange-200 text-[#F85606] hover:bg-orange-50'
            }`}
          >
            Có chênh lệch ({stats.diff})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('SURPLUS')}
            className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'SURPLUS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'
            }`}
          >
            Lệch thừa (+) ({stats.surplus})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('SHORTAGE')}
            className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'SHORTAGE'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50'
            }`}
          >
            Lệch thiếu (-) ({stats.shortage})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('MATCH')}
            className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'MATCH'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            Khớp sổ ({stats.match})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('UNCOUNTED')}
            className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'UNCOUNTED'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-50'
            }`}
          >
            Chưa đếm ({stats.uncounted})
          </button>
        </div>

        {/* Bảng dữ liệu dòng hàng kiểm kê */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/90 font-bold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3 min-w-[240px]">Mặt hàng & Mã SKU</th>
                <th className="py-3 px-3 text-center min-w-[90px]">ĐVT</th>
                <th className="py-3 px-3 text-center min-w-[120px]">Tồn sổ (Snapshot)</th>
                <th className="py-3 px-3 text-center min-w-[140px]">Thực tế đếm</th>
                <th className="py-3 px-3 text-center min-w-[130px]">Chênh lệch</th>
                <th className="py-3 px-3 min-w-[180px]">Ghi chú dòng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedLines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Không tìm thấy mặt hàng nào phù hợp với bộ lọc hiện tại
                  </td>
                </tr>
              ) : (
                pagedLines.map((line, idx) => {
                  const lineIdx = (page - 1) * pageSize + idx + 1;
                  const hasDiff = line.difference !== null && line.difference !== 0;
                  const isSurplus = line.difference !== null && line.difference > 0;

                  return (
                    <tr
                      key={line.id}
                      className={`hover:bg-orange-50/20 transition-colors ${
                        hasDiff ? (isSurplus ? 'bg-blue-50/15' : 'bg-rose-50/15') : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {lineIdx}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{line.productName}</p>
                        <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200 mt-0.5 inline-block">
                          {line.sku}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          {line.baseUnit}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-gray-800 text-xs sm:text-sm">
                        {formatQuantity(line.systemQuantity)}
                      </td>

                      {/* Ô nhập số lượng thực đếm căn giữa */}
                      <td className="py-3 px-3">
                        <div className="flex justify-center">
                          {canEditCounts ? (
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={line.countedQuantity !== null ? line.countedQuantity : ''}
                              onChange={(e) => handleCountChange(line.id, e.target.value)}
                              placeholder="Nhập đếm..."
                              className="w-24 h-8 text-center text-xs font-mono font-black border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          ) : (
                            <span className="font-mono font-black text-sm text-gray-900">
                              {line.countedQuantity !== null ? formatQuantity(line.countedQuantity) : '---'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Chênh lệch */}
                      <td className="py-3 px-3 text-center font-mono font-black">
                        {line.difference === null ? (
                          <span className="text-gray-400 text-xs">--</span>
                        ) : line.difference === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs inline-flex items-center gap-1">
                            <Check size={11} strokeWidth={3} />
                            <span>Khớp (0)</span>
                          </span>
                        ) : isSurplus ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs inline-flex items-center gap-1">
                            <TrendingUp size={11} />
                            <span>+{formatQuantity(line.difference)}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs inline-flex items-center gap-1">
                            <TrendingDown size={11} />
                            <span>{formatQuantity(line.difference)}</span>
                          </span>
                        )}
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3 px-3">
                        {canEditCounts ? (
                          <input
                            type="text"
                            value={line.note}
                            onChange={(e) => handleNoteChange(line.id, e.target.value)}
                            placeholder="Ghi chú mặt hàng này..."
                            className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                          />
                        ) : (
                          <span className="text-gray-600 italic text-[11px]">{line.note || '---'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG ĐẦY ĐỦ */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-gray-500 font-medium text-center sm:text-left">
            Hiển thị từ{' '}
            <strong className="text-gray-900">
              {totalLines === 0 ? 0 : (page - 1) * pageSize + 1}
            </strong>{' '}
            đến{' '}
            <strong className="text-gray-900">
              {Math.min(page * pageSize, totalLines)}
            </strong>{' '}
            trên tổng số <strong className="text-[#F85606] font-mono">{totalLines}</strong> mặt hàng
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-gray-400">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          page === p
                            ? 'bg-[#F85606] text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-[#F85606]'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. BẢN IN CHỨNG TỪ BIÊN BẢN KIỂM KÊ KHO HÀNG CHUẨN KẾ TOÁN (CHỈ XUẤT HIỆN KHI BẤM IN) */}
      <div className="hidden print:block w-full bg-white text-black font-sans leading-normal">
        {/* Header Quốc hiệu / Đơn vị */}
        <div className="flex justify-between items-start pb-2 border-b border-black mb-3">
          <div>
            <p className="font-bold text-xs uppercase tracking-wider">CÔNG TY CỔ PHẦN THƯƠNG MẠI & PHÂN PHỐI ERP</p>
            <p className="text-[11px] text-gray-700">Bộ phận: Phòng Quản Lý Kho Vận & Chuỗi Cung Ứng</p>
            <p className="text-[11px] text-gray-700">Kho kiểm kê: {stockTake.warehouseName}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs font-bold">Mẫu số: 05-VT</p>
            <p className="text-[10px] italic text-gray-600">(Ban hành theo TT 200/2014/TT-BTC)</p>
            <p className="font-mono text-xs font-bold mt-0.5">Số phiếu: {stockTake.code}</p>
          </div>
        </div>

        {/* Tiêu đề chính giữa */}
        <div className="text-center my-3">
          <h1 className="text-base font-black uppercase tracking-wider">BIÊN BẢN KIỂM KÊ KHO HÀNG HÓA</h1>
          <p className="text-[11px] italic text-gray-600 mt-0.5">
            Thời điểm chụp chốt tồn sổ (Snapshot): {new Date(stockTake.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>

        {/* Khối thông tin chi tiết biên bản */}
        <div className="border border-black p-2.5 rounded text-[11px] mb-3 space-y-1">
          <div className="grid grid-cols-2 gap-x-4">
            <div><strong>- Địa điểm kiểm kê:</strong> {stockTake.warehouseName}</div>
            <div><strong>- Người lập phiếu:</strong> {stockTake.createdByUsername || 'wh_staff'}</div>
            <div>
              <strong>- Phạm vi kiểm kê:</strong>{' '}
              {stockTake.categoryName ? `Nhóm ngành: ${stockTake.categoryName}` : 'Toàn bộ mặt hàng trong kho (Tổng thể)'}
            </div>
            <div>
              <strong>- Trạng thái phiếu:</strong>{' '}
              {stockTake.status === 'CLOSED'
                ? 'Đã chốt & ghi nhận điều chỉnh tồn kho'
                : stockTake.status === 'CANCELLED'
                ? 'Đã hủy phiếu'
                : 'Đang thực hiện kiểm đếm thực tế (Nháp)'}
            </div>
          </div>
          {stockTake.note && (
            <div><strong>- Mục đích kiểm kê:</strong> {stockTake.note}</div>
          )}
          {stockTake.status === 'CLOSED' && stockTake.closeReason && (
            <div>
              <strong>- Lý do điều chỉnh sau chốt:</strong> {stockTake.closeReason} (Chốt bởi {stockTake.closedByUsername} lúc{' '}
              {stockTake.closedAt ? new Date(stockTake.closedAt).toLocaleString('vi-VN') : ''})
            </div>
          )}
        </div>

        {/* Tóm tắt số liệu */}
        <div className="flex justify-between items-center text-[11px] font-bold pb-1.5 px-1 border-b border-gray-400 mb-2">
          <span>Tổng số SKU kiểm kê: {lines.length}</span>
          <span>Khớp số sổ: {stats.match}</span>
          <span>Lệch thừa (+): {stats.surplus}</span>
          <span>Lệch thiếu (-): {stats.shortage}</span>
          {stats.uncounted > 0 && <span>Chưa đếm: {stats.uncounted}</span>}
        </div>

        {/* Bảng in toàn bộ mặt hàng không bị ngắt phân trang */}
        <table className="w-full border-collapse border-2 border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black text-center font-bold">
              <th className="border border-black py-1 px-1.5 w-7">STT</th>
              <th className="border border-black py-1 px-2 w-24 text-left">Mã SKU</th>
              <th className="border border-black py-1 px-2 text-left">Tên sản phẩm - Quy cách</th>
              <th className="border border-black py-1 px-1.5 w-14">ĐVT</th>
              <th className="border border-black py-1 px-2 w-20 text-right">Tồn sổ (HT)</th>
              <th className="border border-black py-1 px-2 w-20 text-right">Thực tế đếm</th>
              <th className="border border-black py-1 px-2 w-20 text-right">Chênh lệch</th>
              <th className="border border-black py-1 px-2 w-32 text-left">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const diff = line.difference;
              const hasDiff = diff !== null && diff !== 0;
              return (
                <tr key={line.id} className="border-b border-black print-avoid-break">
                  <td className="border border-black py-1 px-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black py-1 px-2 font-mono font-bold">{line.sku}</td>
                  <td className="border border-black py-1 px-2 font-medium">{line.productName}</td>
                  <td className="border border-black py-1 px-1 text-center">{line.baseUnit}</td>
                  <td className="border border-black py-1 px-2 text-right font-mono">
                    {formatQuantity(line.systemQuantity)}
                  </td>
                  <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                    {line.countedQuantity !== null && line.countedQuantity !== undefined
                      ? formatQuantity(line.countedQuantity)
                      : '.......'}
                  </td>
                  <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                    {diff === null
                      ? '---'
                      : diff === 0
                      ? '0'
                      : diff > 0
                      ? `+${formatQuantity(diff)}`
                      : formatQuantity(diff)}
                  </td>
                  <td className="border border-black py-1 px-2 text-[9px] italic">
                    {line.note || (hasDiff ? (diff && diff > 0 ? 'Thừa hàng' : 'Thiếu hàng') : '')}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Hàng tổng cộng chốt sổ kiểm kê */}
          <tfoot className="print-avoid-break bg-gray-100 font-bold border-t-2 border-b-2 border-black">
            <tr className="border-t-2 border-b-2 border-black font-bold">
              <td colSpan={4} className="border border-black py-1.5 px-3 text-right uppercase font-bold text-[10px]">
                Tổng cộng ({lines.length} mặt hàng):
              </td>
              <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                {formatQuantity(printTotals.totalSystemQty)}
              </td>
              <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                {formatQuantity(printTotals.totalCountedQty)}
              </td>
              <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                {printTotals.totalDiffQty === 0
                  ? '0'
                  : printTotals.totalDiffQty > 0
                  ? `+${formatQuantity(printTotals.totalDiffQty)}`
                  : formatQuantity(printTotals.totalDiffQty)}
              </td>
              <td className="border border-black py-1.5 px-2 text-[9px] font-semibold">
                {stats.diff > 0
                  ? `Lệch ${stats.diff} SKU`
                  : 'Khớp 100%'}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Gạch kết thúc danh sách kiểm kê (chốt sổ, không ghi thêm mặt hàng) */}
        <div className="w-full my-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-black border-y-2 border-black py-1 print-avoid-break">
          ═══ HẾT DANH SÁCH KIỂM KÊ (TỔNG CỘNG: {lines.length} MẶT HÀNG) ═══
        </div>

        {/* Dòng ghi chú chốt biên bản */}
        <div className="text-[10px] italic text-gray-800 mb-3 flex flex-wrap justify-between gap-1 print-avoid-break">
          <span>* Biên bản kết thúc kiểm kê lúc ..... giờ ..... cùng ngày với tổng số {lines.length} khoản mục hàng hóa.</span>
          <span>
            Tình trạng:{' '}
            <strong>
              {stats.diff === 0
                ? 'Toàn bộ số lượng khớp với sổ sách (0 chênh lệch)'
                : `Có ${stats.diff} mặt hàng phát hiện chênh lệch (tổng lệch: ${printTotals.totalDiffQty > 0 ? `+${formatQuantity(printTotals.totalDiffQty)}` : formatQuantity(printTotals.totalDiffQty)})`}
            </strong>
          </span>
        </div>

        {/* Khối chữ ký xác nhận 4 bên */}
        <div className="mt-6 pt-3 border-t border-gray-400 text-[11px] print-avoid-break">
          <div className="text-right italic mb-3">
            Ngày ...... tháng ...... năm 2026
          </div>
          <div className="grid grid-cols-4 text-center gap-2">
            <div>
              <p className="font-bold">Người lập phiếu</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold">{stockTake.createdByUsername || 'wh_staff'}</p>
            </div>
            <div>
              <p className="font-bold">Đại diện kiểm kê</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-400">..............................</p>
            </div>
            <div>
              <p className="font-bold">Kế toán kho</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-400">..............................</p>
            </div>
            <div>
              <p className="font-bold">Quản lý kho / Thủ kho</p>
              <p className="text-[10px] italic text-gray-600">(Ký, đóng dấu)</p>
              <div className="h-14"></div>
              <p className="font-semibold">
                {stockTake.closedByUsername || '..............................'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* REASON MODAL CHO CHỐT HOẶC HỦY PHIẾU (BẮT BUỘC LÝ DO) */}
      {reasonModalMode && stockTake && (
        <StockTakeReasonModal
          isOpen={true}
          mode={reasonModalMode}
          stockTakeCode={stockTake.code}
          hasDifference={stats.diff > 0}
          differenceCount={stats.diff}
          onClose={() => setReasonModalMode(null)}
          onSubmit={async (reason: string) => {
            if (reasonModalMode === 'CLOSE') {
              await handleConfirmClose(reason);
            } else if (reasonModalMode === 'CANCEL') {
              await handleConfirmCancel(reason);
            }
          }}
        />
      )}
    </div>
  );
};
