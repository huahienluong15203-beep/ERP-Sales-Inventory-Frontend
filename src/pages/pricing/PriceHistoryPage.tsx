import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  PriceChangeRecord,
  PriceHistoryFilterParams,
  ProductPricingSummary,
  TimeRangeFilter,
  TrendFilter
} from '../../types/pricing';
import {
  fetchPriceHistory,
  fetchProductPricingSummaries,
  exportPriceHistoryToExcel,
  formatVND,
  formatDateTime,
  PRICE_TYPE_OPTIONS
} from '../../services/priceHistoryApi';
import { ProductPriceSummaryCards } from '../../components/pricing/ProductPriceSummaryCards';
import { PriceTrendTimeline } from '../../components/pricing/PriceTrendTimeline';
import { PriceHistoryDetailModal } from '../../components/pricing/PriceHistoryDetailModal';
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  TrendingUp,
  TrendingDown,
  Lock,
  ChevronLeft,
  ChevronRight,
  Info,
  Building2,
  SlidersHorizontal
} from '../../components/common/Icons';

export const PriceHistoryPage: React.FC = () => {
  // Dữ liệu bảng lịch sử
  const [records, setRecords] = useState<PriceChangeRecord[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [loading, setLoading] = useState(true);

  // Danh mục sản phẩm tổng hợp
  const [products, setProducts] = useState<ProductPricingSummary[]>([]);

  // Bộ lọc
  const [keyword, setKeyword] = useState('');
  const [selectedSku, setSelectedSku] = useState('ALL');
  const [selectedPriceType, setSelectedPriceType] = useState('ALL');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [trend, setTrend] = useState<TrendFilter>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal chi tiết
  const [selectedRecord, setSelectedRecord] = useState<PriceChangeRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tải danh mục sản phẩm 1 lần khi mount
  useEffect(() => {
    fetchProductPricingSummaries().then(setProducts).catch(console.error);
  }, []);

  // Tải dữ liệu lịch sử giá
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: PriceHistoryFilterParams = {
        keyword,
        productSku: selectedSku,
        priceType: selectedPriceType,
        timeRange,
        trend,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        size
      };
      const res = await fetchPriceHistory(params);
      setRecords(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Lỗi tải lịch sử giá:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedSku, selectedPriceType, timeRange, trend, startDate, endDate, page, size]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const increase = records.filter((r) => r.difference > 0).length;
    const decrease = records.filter((r) => r.difference < 0).length;
    return {
      total: totalElements,
      increase,
      decrease,
      productCount: products.length
    };
  }, [records, totalElements, products]);

  // Lọc sản phẩm đang xem trên timeline nếu người dùng chọn 1 sản phẩm
  const activeProductTimelineRecords = useMemo(() => {
    if (selectedSku === 'ALL') {
      // Mặc định lấy sản phẩm đầu tiên có biến động
      const firstSku = records[0]?.productSku;
      return firstSku ? records.filter((r) => r.productSku === firstSku) : [];
    }
    return records.filter((r) => r.productSku === selectedSku);
  }, [records, selectedSku]);

  const activeProductName = useMemo(() => {
    if (selectedSku !== 'ALL') {
      return products.find((p) => p.sku === selectedSku)?.name || selectedSku;
    }
    return activeProductTimelineRecords[0]?.productName || 'Sản phẩm tiêu biểu';
  }, [products, selectedSku, activeProductTimelineRecords]);

  const handleOpenDetail = (record: PriceChangeRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    exportPriceHistoryToExcel(records, 'Lich_Su_Thay_Doi_Gia_ERP_S3_02');
  };

  const handleResetFilter = () => {
    setKeyword('');
    setSelectedSku('ALL');
    setSelectedPriceType('ALL');
    setTimeRange('ALL');
    setTrend('ALL');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Trang & Tiêu đề phân hệ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              EP-02: Sản phẩm & Bảng giá
            </span>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              S3-02 / SCRUM-13
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Lock size={12} />
              Lịch sử bất biến (Không thể sửa/xóa)
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Lịch Sử Thay Đổi Giá Sản Phẩm
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Dành cho <strong>Quản lý kinh doanh</strong> tra cứu biến động giá cũ - giá mới, người phê duyệt và căn cứ pháp lý để đối thoại, giải thích minh bạch với Đại lý vì sao giá tháng này khác tháng trước.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition"
          >
            <FileSpreadsheet size={16} />
            <span>Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ KPI Thống Kê Tổng Quan */}
      <ProductPriceSummaryCards
        totalRecords={stats.total}
        increaseCount={stats.increase}
        decreaseCount={stats.decrease}
        selectedProductCount={stats.productCount}
      />

      {/* 3. Khung Bộ Lọc & Tìm Kiếm Đa Tiêu Chí */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <SlidersHorizontal size={18} className="text-blue-600 dark:text-blue-400" />
            <span>Bộ Lọc Tra Cứu Biến Động Giá</span>
          </div>

          {(keyword || selectedSku !== 'ALL' || selectedPriceType !== 'ALL' || timeRange !== 'ALL' || trend !== 'ALL' || startDate || endDate) && (
            <button
              onClick={handleResetFilter}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo SKU, tên SP, số QĐ, người sửa..."
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Chọn sản phẩm cụ thể */}
          <div>
            <select
              value={selectedSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
                setPage(0);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">-- Tất cả sản phẩm ({products.length} SKU) --</option>
              {products.map((p) => (
                <option key={p.id} value={p.sku}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn biểu giá */}
          <div>
            <select
              value={selectedPriceType}
              onChange={(e) => {
                setSelectedPriceType(e.target.value);
                setPage(0);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">-- Tất cả biểu giá --</option>
              {PRICE_TYPE_OPTIONS.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo khoảng thời gian */}
          <div>
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value as TimeRangeFilter);
                setPage(0);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">Toàn bộ thời gian</option>
              <option value="THIS_MONTH">Tháng này (Tháng 10/2026)</option>
              <option value="LAST_MONTH">Tháng trước (Tháng 09/2026)</option>
              <option value="LAST_3_MONTHS">3 tháng gần nhất</option>
              <option value="CUSTOM">Tùy chọn khoảng ngày...</option>
            </select>
          </div>
        </div>

        {/* Bộ lọc mở rộng (Khoảng ngày & Chiều hướng biến động) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Lọc chiều hướng: Tăng / Giảm */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Xu hướng giá:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setTrend('ALL');
                  setPage(0);
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  trend === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrend('INCREASE');
                  setPage(0);
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition ${
                  trend === 'INCREASE'
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : 'text-rose-600 hover:text-rose-700'
                }`}
              >
                <TrendingUp size={12} />
                <span>Chỉ tăng giá</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrend('DECREASE');
                  setPage(0);
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition ${
                  trend === 'DECREASE'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-emerald-600 hover:text-emerald-700'
                }`}
              >
                <TrendingDown size={12} />
                <span>Chỉ giảm giá</span>
              </button>
            </div>
          </div>

          {/* Nếu chọn CUSTOM ngày */}
          {timeRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
              />
              <span className="text-slate-500">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Trục Timeline Biến Động Giá (Trực quan hóa lộ trình các tháng) */}
      {activeProductTimelineRecords.length > 0 && (
        <PriceTrendTimeline
          records={activeProductTimelineRecords}
          productName={activeProductName}
          productSku={selectedSku !== 'ALL' ? selectedSku : activeProductTimelineRecords[0]?.productSku || ''}
          onSelectRecord={handleOpenDetail}
        />
      )}

      {/* 5. Bảng Danh Sách Lịch Sử Thay Đổi Giá (Bất biến) */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        {/* Tiêu đề bảng & ghi chú kiểm toán */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bảng Kê Nhật Ký Thay Đổi Giá
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {totalElements} bản ghi
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Lock size={12} className="text-amber-500" />
            <span>Dữ liệu chỉ đọc (Read-only) • Lịch sử không sửa và không xoá được</span>
          </div>
        </div>

        {/* Nội dung bảng */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Thời Điểm Áp Dụng</th>
                <th className="py-3.5 px-4">Sản Phẩm & SKU</th>
                <th className="py-3.5 px-4">Biểu Giá</th>
                <th className="py-3.5 px-4 text-right">Giá Cũ (Tháng trước)</th>
                <th className="py-3.5 px-4 text-right">Giá Mới (Tháng này)</th>
                <th className="py-3.5 px-4 text-center">Biến Động</th>
                <th className="py-3.5 px-4">Người Sửa Giá</th>
                <th className="py-3.5 px-4">Căn Cứ & Lý Do</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-blue-600" />
                      <span>Đang tải lịch sử giá...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Info size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-medium">Không tìm thấy bản ghi thay đổi giá phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isIncrease = r.difference > 0;
                  const isDecrease = r.difference < 0;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleOpenDetail(r)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition cursor-pointer group"
                    >
                      {/* Thời điểm áp dụng */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatDateTime(r.effectiveDate)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Mã: {r.id}
                        </span>
                      </td>

                      {/* Sản phẩm & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {r.productName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {r.productSku}
                          </span>
                          <span>•</span>
                          <span>{r.unit}</span>
                        </div>
                      </td>

                      {/* Biểu giá */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {r.priceTypeName}
                        </span>
                      </td>

                      {/* Giá cũ */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-medium text-slate-400 line-through">
                          {formatVND(r.oldPrice)}
                        </span>
                      </td>

                      {/* Giá mới */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-blue-700 dark:text-blue-400">
                          {formatVND(r.newPrice)}
                        </span>
                      </td>

                      {/* Biến động (+ / - %) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg ${
                            isIncrease
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                              : isDecrease
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isIncrease ? <TrendingUp size={13} /> : isDecrease ? <TrendingDown size={13} /> : null}
                          <span>
                            {isIncrease ? '+' : ''}{r.percentageChange.toFixed(2)}%
                          </span>
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isIncrease ? '+' : ''}{formatVND(r.difference)}
                        </div>
                      </td>

                      {/* Người sửa giá */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {r.modifierName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {r.modifierRole}
                        </div>
                      </td>

                      {/* Căn cứ & Lý do */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          {r.decisionCode}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5" title={r.reason}>
                          {r.reason}
                        </p>
                      </td>

                      {/* Thao tác (Chỉ Xem chi tiết để giải thích đại lý, KHÔNG CÓ SỬA/XOÁ) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                          title="Xem kịch bản đối thoại giải thích với đại lý"
                        >
                          <Eye size={14} />
                          <span>Chi tiết giải thích</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-800/30">
          <div>
            Hiển thị <strong>{records.length}</strong> / <strong>{totalElements}</strong> bản ghi lịch sử
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
              Trang {page + 1} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Trang kế tiếp"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Hướng dẫn nghiệp vụ giải thích đại lý */}
      <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
          <Building2 size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
            Cẩm nang Quản lý Kinh doanh: Hướng dẫn giải thích biến động giá với Đại lý (S3-02)
          </h4>
          <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
            Khi Đại lý thắc mắc <em>"Vì sao giá tháng này lại khác tháng trước?"</em>, Quản lý kinh doanh bấm vào nút <strong>"Chi tiết giải thích"</strong> của sản phẩm tương ứng để tra cứu nguyên nhân chính thức (chi phí nguyên vật liệu, điều chỉnh từ nhà máy sản xuất, chính sách khuyến mại mùa vụ...). Bạn có thể sao chép nhanh kịch bản giải thích hoặc xuất file Excel gửi kèm công văn số quyết định cho Đại lý.
          </p>
        </div>
      </div>

      {/* Modal chi tiết bản ghi & kịch bản giải thích đại lý */}
      <PriceHistoryDetailModal
        record={selectedRecord}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
      />
    </div>
  );
};
