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
  formatDate,
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
  Info,
  SlidersHorizontal
} from '../../components/common/Icons';
import { useUrlPaging, useClampPage } from '../../hooks/useUrlParams';
import { Pagination } from '../../components/common/Pagination';

export const PriceHistoryPage: React.FC = () => {
  // Dữ liệu bảng lịch sử
  const [records, setRecords] = useState<PriceChangeRecord[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Danh mục sản phẩm tổng hợp
  const [products, setProducts] = useState<ProductPricingSummary[]>([]);

  // Bộ lọc + trang lưu trên URL, vd: /logs?tab=price&sku=BIA-HN&trend=UP&page=2
  const { params: urlParams, page, size, setPage, setSize, setFilters } = useUrlPaging({
    keyword: '',
    sku: 'ALL',
    priceType: 'ALL',
    timeRange: 'ALL',
    trend: 'ALL',
    from: '',
    to: ''
  });
  const keyword = urlParams.keyword;
  const selectedSku = urlParams.sku;
  const selectedPriceType = urlParams.priceType;
  const timeRange = urlParams.timeRange as TimeRangeFilter;
  const trend = urlParams.trend as TrendFilter;
  const startDate = urlParams.from;
  const endDate = urlParams.to;
  const setKeyword = (value: string) => setFilters({ keyword: value });
  const setSelectedSku = (value: string) => setFilters({ sku: value });
  const setSelectedPriceType = (value: string) => setFilters({ priceType: value });
  const setTimeRange = (value: TimeRangeFilter) => setFilters({ timeRange: value });
  const setTrend = (value: TrendFilter) => setFilters({ trend: value });
  const setStartDate = (value: string) => setFilters({ from: value });
  const setEndDate = (value: string) => setFilters({ to: value });

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

  // Đang ở trang vượt quá số trang -> tự lùi về trang cuối
  useClampPage(page, totalPages, setPage, loading);

  return (
    <div className="w-full min-w-0 space-y-6 animate-fadeIn pb-12">
      {/* 1. Nút hành động */}
      <div className="flex items-center justify-end gap-2.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-[#F85606] hover:border-orange-200 transition shadow-xs cursor-pointer min-h-[44px]"
            title="Làm mới lịch sử thay đổi giá"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-600' : ''} />
            <span>Làm mới</span>
          </button>

          <a
            href="/pricing/discounts"
            className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-white text-gray-700 border border-gray-200 hover:text-indigo-600 hover:border-indigo-200 hover:bg-gray-50 transition shadow-xs"
            title="Khai báo chính sách chiết khấu theo sản lượng"
          >
            <span className="text-indigo-600 font-bold">%</span>
            <span className="hidden sm:inline">Chiết khấu sản lượng</span>
          </a>

          <button
            onClick={handleExportExcel}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition cursor-pointer"
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
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <SlidersHorizontal size={18} className="text-blue-600" />
            <span>Bộ Lọc Tra Cứu Biến Động Giá</span>
          </div>

          {(keyword || selectedSku !== 'ALL' || selectedPriceType !== 'ALL' || timeRange !== 'ALL' || trend !== 'ALL' || startDate || endDate) && (
            <button
              onClick={handleResetFilter}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo SKU, tên SP, số QĐ, người sửa..."
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
            <span className="text-xs font-semibold text-gray-500">
              Xu hướng giá:
            </span>
            <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setTrend('ALL');
                  setPage(0);
                }}
                className={`px-3 py-1 rounded-lg transition ${trend === 'ALL'
                  ? 'bg-white text-gray-900 font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
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
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition ${trend === 'INCREASE'
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
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition ${trend === 'DECREASE'
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
              <span className="text-gray-500">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs"
              />
              <span className="text-gray-500">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs"
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Tiêu đề bảng & ghi chú kiểm toán */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">
              Bảng Kê Nhật Ký Thay Đổi Giá
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
              {totalElements} bản ghi
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <Lock size={15} className="shrink-0 text-amber-600" />
            <span>Chỉ xem — lịch sử giá không thể sửa hoặc xoá</span>
          </div>
        </div>

        {/* Nội dung bảng */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Thời Điểm Sửa & Áp Dụng</th>
                <th className="py-3.5 px-4">Sản Phẩm & SKU</th>
                <th className="py-3.5 px-4">Biểu Giá</th>
                <th className="py-3.5 px-4 text-right">Giá Cũ (Tháng trước)</th>
                <th className="py-3.5 px-4 text-right">Giá Mới (Tháng này)</th>
                <th className="py-3.5 px-4 text-center">Biến Động</th>
                <th className="py-3.5 px-4">Người Sửa Giá</th>
                <th className="py-3.5 px-4">Căn Cứ & Lý Do</th>
                <th className="py-3.5 px-4 text-center">Chỉ Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-blue-600" />
                      <span>Đang tải lịch sử giá...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <Info size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="font-medium">Không tìm thấy bản ghi thay đổi giá phù hợp</p>
                    <p className="text-xs text-gray-400 mt-1">
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
                      className="hover:bg-gray-50/80 transition cursor-pointer group"
                    >
                      {/* Thời điểm sửa & áp dụng */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900" title="Thời điểm thay đổi giá thực tế">
                          {formatDateTime(r.createdAt || r.effectiveDate)}
                        </div>
                        {r.effectiveDate && (
                          <div className="text-[11px] text-gray-500 font-medium">
                            Hiệu lực: {formatDate(r.effectiveDate)}
                          </div>
                        )}
                        <span className="text-[11px] text-gray-400 font-mono">
                          Mã: {r.id}
                        </span>
                      </td>

                      {/* Sản phẩm & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 line-clamp-1">
                          {r.productName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="font-mono font-semibold text-blue-600">
                            {r.productSku}
                          </span>
                          <span>•</span>
                          <span>{r.unit}</span>
                        </div>
                      </td>

                      {/* Biểu giá */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700">
                          {r.priceTypeName}
                        </span>
                      </td>

                      {/* Giá cũ */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-medium text-gray-400 line-through">
                          {formatVND(r.oldPrice)}
                        </span>
                      </td>

                      {/* Giá mới */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-blue-700">
                          {formatVND(r.newPrice)}
                        </span>
                      </td>

                      {/* Biến động (+ / - %) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg ${isIncrease
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isDecrease
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                          {isIncrease ? <TrendingUp size={13} /> : isDecrease ? <TrendingDown size={13} /> : null}
                          <span>
                            {isIncrease ? '+' : ''}{r.percentageChange.toFixed(2)}%
                          </span>
                        </span>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isIncrease ? '+' : ''}{formatVND(r.difference)}
                        </div>
                      </td>

                      {/* Người sửa giá */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {r.modifierName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {r.modifierRole}
                        </div>
                      </td>

                      {/* Căn cứ & Lý do */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-mono text-xs font-bold text-gray-700 block">
                          {r.decisionCode}
                        </span>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" title={r.reason}>
                          {r.reason}
                        </p>
                      </td>

                      {/* Chỉ xem chi tiết; không cung cấp thao tác sửa hoặc xoá lịch sử */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="Xem kịch bản đối thoại giải thích với đại lý"
                        >
                          <Eye size={14} />
                          <span>Xem chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang: ‹ 1 2 … n › */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
          itemLabel="bản ghi lịch sử"
          disabled={loading}
        />
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
