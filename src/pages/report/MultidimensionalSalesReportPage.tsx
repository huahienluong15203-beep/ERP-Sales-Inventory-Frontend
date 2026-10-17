import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Lock,
  ShieldCheck,
  Users,
  MapPin,
  Building2,
  Boxes,
  Package,
  ArrowUpDown,
  Search,
  DollarSign,
  ShoppingCart,
  Percent,
  Layers,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchSalesReport, downloadSalesReportExcel } from '../../services/salesReportApi';
import type {
  SalesReportResponse,
  SalesReportRow,
  SalesReportGroupBy,
  SalesReportCompare,
  SalesReportFilterParams
} from '../../types/salesReport';

export const MultidimensionalSalesReportPage: React.FC = () => {
  const { currentRole, showToast } = useAuth();
  const isSalesManager = currentRole === 'ROLE_SALES_MANAGER';

  // State bộ lọc
  const [groupBy, setGroupBy] = useState<SalesReportGroupBy>('REP');
  const [compare, setCompare] = useState<SalesReportCompare>('PREVIOUS');

  // Mặc định từ ngày 1 của tháng hiện tại đến ngày hiện tại
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);

  // State dữ liệu
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [data, setData] = useState<SalesReportResponse | null>(null);

  // Search & Sort cục bộ trên Data Grid
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<keyof SalesReportRow>('revenue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Format tiền tệ VND
  const formatVnd = (amount: number | null | undefined): string => {
    if (amount == null) return '0 đ';
    return Number(amount).toLocaleString('vi-VN') + ' đ';
  };

  // Format số nguyên
  const formatNumber = (num: number | null | undefined): string => {
    if (num == null) return '0';
    return Number(num).toLocaleString('vi-VN');
  };

  // Format ngày dd/MM/yyyy
  const formatDateVn = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Nạp dữ liệu báo cáo
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: SalesReportFilterParams = {
        groupBy,
        fromDate,
        toDate,
        compare
      };
      const res = await fetchSalesReport(params, isSalesManager);
      setData(res);
    } catch (err: any) {
      console.error('Lỗi khi nạp báo cáo doanh số:', err);
      showToast('Lỗi tải báo cáo', 'Không thể kết nối đến máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupBy, fromDate, toDate, compare, isSalesManager, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Phím tắt chọn nhanh khoảng thời gian
  const setQuickRange = (type: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR') => {
    const today = new Date();
    let f = '';
    let t = '';

    if (type === 'THIS_MONTH') {
      f = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      t = today.toISOString().slice(0, 10);
    } else if (type === 'LAST_MONTH') {
      const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      const prevMonthFirstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      f = prevMonthFirstDay.toISOString().slice(0, 10);
      t = prevMonthLastDay.toISOString().slice(0, 10);
    } else if (type === 'THIS_QUARTER') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      f = new Date(today.getFullYear(), currentQuarter * 3, 1).toISOString().slice(0, 10);
      t = today.toISOString().slice(0, 10);
    } else if (type === 'THIS_YEAR') {
      f = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
      t = today.toISOString().slice(0, 10);
    }

    setFromDate(f);
    setToDate(t);
  };

  // Xử lý xuất Excel (AC4)
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await downloadSalesReportExcel({
        groupBy,
        fromDate,
        toDate,
        compare
      });
      showToast('Xuất Excel thành công', 'Tệp báo cáo đã được tải xuống máy', 'success');
    } catch (err) {
      showToast('Lỗi xuất Excel', 'Vui lòng thử lại sau', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Danh sách các chiều nhóm (AC1)
  const GROUP_OPTIONS: { id: SalesReportGroupBy; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'REP', label: 'Nhân viên kinh doanh', icon: <Users size={16} />, desc: 'Hiệu quả bán hàng từng sale' },
    { id: 'REGION', label: 'Khu vực địa bàn', icon: <MapPin size={16} />, desc: 'Doanh số từng tỉnh thành / vùng miền' },
    { id: 'CUSTOMER', label: 'Đại lý / Khách hàng', icon: <Building2 size={16} />, desc: 'Doanh số và lợi nhuận theo đại lý' },
    { id: 'CATEGORY', label: 'Nhóm ngành hàng', icon: <Boxes size={16} />, desc: 'Cơ cấu danh mục sản phẩm' },
    { id: 'SKU', label: 'Sản phẩm (SKU)', icon: <Package size={16} />, desc: 'Chi tiết từng mặt hàng cụ thể' }
  ];

  // Tiêu đề cột nhóm động theo chiều
  const getDimensionColumnName = (grp: string) => {
    switch (grp) {
      case 'REP':
        return 'Nhân Viên Kinh Doanh';
      case 'REGION':
        return 'Khu Vực Địa Bàn';
      case 'CUSTOMER':
        return 'Đại Lý / Khách Hàng';
      case 'CATEGORY':
        return 'Nhóm Hàng';
      case 'SKU':
        return 'Sản Phẩm (Mã SKU & Tên)';
      default:
        return 'Đối Tượng';
    }
  };

  // Lọc và Sắp xếp Data Grid
  const filteredAndSortedRows = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];

    // Lọc theo từ khóa tìm kiếm
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q))
      );
    }

    // Sắp xếp
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA == null) valA = sortAsc ? Infinity : -Infinity;
      if (valB == null) valB = sortAsc ? Infinity : -Infinity;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [data?.rows, searchTerm, sortField, sortAsc]);

  // Đổi chiều sắp xếp
  const handleSort = (field: keyof SalesReportRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Mặc định sắp xếp giảm dần khi chọn cột số liệu
    }
  };

  // Tính tỷ trọng Top 5 cho mini chart trực quan
  const topRows = useMemo(() => {
    if (!data?.rows || data.rows.length === 0) return [];
    const sorted = [...data.rows].sort((a, b) => b.revenue - a.revenue);
    const top5 = sorted.slice(0, 5);
    const maxRev = top5[0]?.revenue || 1;
    return top5.map((r) => ({
      ...r,
      percentage: Math.round((r.revenue / (data.total?.revenue || 1)) * 100),
      barWidth: Math.max(8, Math.round((r.revenue / maxRev) * 100))
    }));
  }, [data]);

  const marginVisible = Boolean(data?.marginVisible);

  return (
    <div className="space-y-6 pb-12">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
              <BarChart3 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  Báo Cáo Doanh Số Đa Chiều
                </h1>
                {/* AC3 Badge: Phân quyền xem Biên lợi nhuận */}
                {marginVisible ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck size={13} />
                    <span>Quyền Quản Lý: Hiển thị Biên LN gộp</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Lock size={13} />
                    <span>Chế độ xem Doanh số & Sản lượng</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          {/* AC4: Nút xuất Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={14} className={exporting ? 'animate-bounce' : ''} />
            <span>{exporting ? 'Đang xuất tệp...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>

      {/* ================= BỘ LỌC ĐA CHIỀU (AC1, AC4) ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
        {/* Hàng 1: Chiều phân tích (Group By - AC1) */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {GROUP_OPTIONS.map((opt) => {
              const active = groupBy === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGroupBy(opt.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'bg-orange-50/70 border-orange-500 text-orange-950 ring-2 ring-orange-400/20 shadow-xs'
                      : 'bg-gray-50/50 hover:bg-gray-100/70 border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span className={active ? 'text-orange-600' : 'text-gray-500'}>
                      {opt.icon}
                    </span>
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hàng 2: Thời gian & So sánh kỳ (AC4) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-gray-100">
          {/* Chọn ngày từ - đến */}
          <div className="md:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
                Từ ngày
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
                Đến ngày
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Chọn nhanh mốc thời gian */}
          <div className="md:col-span-4 flex flex-col justify-end">
            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
              Mốc thời gian nhanh
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setQuickRange('THIS_MONTH')}
                className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 rounded-md transition cursor-pointer"
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('LAST_MONTH')}
                className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 rounded-md transition cursor-pointer"
              >
                Tháng trước
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('THIS_QUARTER')}
                className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 rounded-md transition cursor-pointer"
              >
                Quý này
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('THIS_YEAR')}
                className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 rounded-md transition cursor-pointer"
              >
                Năm nay
              </button>
            </div>
          </div>

          {/* Chế độ so sánh (AC4) */}
          <div className="md:col-span-3 flex flex-col justify-end">
            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
              So sánh kỳ đối ứng
            </label>
            <select
              value={compare}
              onChange={(e) => setCompare(e.target.value as SalesReportCompare)}
              className="w-full px-3 py-1.5 text-xs font-semibold text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white cursor-pointer"
            >
              <option value="PREVIOUS">Kỳ trước liền kề</option>
              <option value="LAST_YEAR">Cùng kỳ năm trước</option>
              <option value="NONE">Không so sánh</option>
            </select>
          </div>
        </div>

        {/* Thông tin kỳ so sánh đang được áp dụng */}
        {compare !== 'NONE' && data?.compareFromDate && data?.compareToDate && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50">
            <Info size={14} className="text-amber-600 shrink-0" />
            <span>
              Kỳ so sánh đối ứng: <b>{formatDateVn(data.compareFromDate)}</b> đến <b>{formatDateVn(data.compareToDate)}</b> (tính % tăng giảm doanh số và sản lượng)
            </span>
          </div>
        )}
      </div>

      {/* ================= THẺ CHỈ SỐ TỔNG HỢP (AC2, AC3) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng Doanh Số */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>TỔNG DOANH SỐ</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-gray-900">
            {formatVnd(data?.total?.revenue)}
          </div>
          {compare !== 'NONE' && (
            <div className="flex items-center gap-1.5 text-xs">
              {data?.total?.revenueChangePercent != null ? (
                data.total.revenueChangePercent >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600">
                    <TrendingUp size={13} />
                    <span>+{data.total.revenueChangePercent.toFixed(1)}%</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 font-bold text-rose-600">
                    <TrendingDown size={13} />
                    <span>{data.total.revenueChangePercent.toFixed(1)}%</span>
                  </span>
                )
              ) : (
                <span className="text-gray-400">Kỳ trước: 0 đ</span>
              )}
              <span className="text-gray-400 text-[11px]">so với kỳ trước</span>
            </div>
          )}
        </div>

        {/* Thẻ 2: Tổng Sản Lượng */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>TỔNG SẢN LƯỢNG TIÊU THỤ</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-gray-900">
            {formatNumber(data?.total?.quantity)} <span className="text-xs font-normal text-gray-500">ĐVT</span>
          </div>
          {compare !== 'NONE' && (
            <div className="text-xs text-gray-500">
              Kỳ trước: <span className="font-mono font-medium">{formatNumber(data?.total?.previousQuantity)}</span>
            </div>
          )}
        </div>

        {/* Thẻ 3: Tổng Đơn Hàng */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>TỔNG ĐƠN HÀNG PHÁT SINH</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-gray-900">
            {formatNumber(data?.total?.orderCount)} <span className="text-xs font-normal text-gray-500">đơn</span>
          </div>
          <div className="text-xs text-gray-500">
            Đơn hàng đã duyệt & giao thành công
          </div>
        </div>

        {/* Thẻ 4: Lợi Nhuận Gộp (AC2 & AC3: Chỉ Quản lý kinh doanh xem được) */}
        {marginVisible ? (
          <div className="bg-gradient-to-br from-emerald-50/60 to-white p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
              <span>LỢI NHUẬN GỘP & BIÊN LN</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Percent size={16} />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700">
              {formatVnd(data?.total?.grossMargin)}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, data?.total?.grossMarginPercent || 0))}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-800 font-mono">
                {data?.total?.grossMarginPercent ?? 0}%
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
              <span>BIÊN LỢI NHUẬN GỘP</span>
              <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center">
                <Lock size={16} />
              </div>
            </div>
            <div className="text-xs text-gray-400 font-medium">
              🔒 Dữ liệu giá vốn & biên lợi nhuận được bảo mật (Chỉ tài khoản <b>Quản lý kinh doanh</b> được cấp quyền xem).
            </div>
            <div className="text-[11px] text-gray-400">
              Quy tắc bảo mật nội bộ
            </div>
          </div>
        )}
      </div>

      {/* ================= BIỂU ĐỒ TOP 5 TRỰC QUAN ================= */}
      {topRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-500" />
              <span>Top 5 Doanh Số Cao Nhất Theo {getDimensionColumnName(groupBy)}</span>
            </h2>
            <span className="text-xs text-gray-400">Tỷ trọng đóng góp</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {topRows.map((item, idx) => (
              <div key={item.key || idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 font-bold text-gray-600 text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-gray-800">{item.name || item.code}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900">{formatVnd(item.revenue)}</span>
                    <span className="text-[11px] font-bold text-orange-600 w-10 text-right">{item.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.barWidth}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= DATA GRID BÁO CÁO ĐỘNG (AC1, AC2, AC3, AC4) ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Bảng Số Liệu Chi Tiết Theo {getDimensionColumnName(groupBy)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tổng hợp {filteredAndSortedRows.length} đối tượng có phát sinh doanh số
            </p>
          </div>

          {/* Ô tìm kiếm nhanh trong bảng */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Table Data Grid */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>{getDimensionColumnName(groupBy)}</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('revenue')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Doanh Số (đ)</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>

                  {/* Cột so sánh kỳ trước (AC4) */}
                  {compare !== 'NONE' && (
                    <>
                      <th className="py-3 px-3 text-right text-gray-500">Doanh Số Kỳ Trước</th>
                      <th
                        className="py-3 px-3 text-center cursor-pointer hover:bg-gray-100 transition"
                        onClick={() => handleSort('revenueChangePercent')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>% Tăng/Giảm</span>
                          <ArrowUpDown size={12} className="text-gray-400" />
                        </div>
                      </th>
                    </>
                  )}

                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sản Lượng</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>

                  <th className="py-3 px-3 text-center">Số Đơn</th>

                  {/* Cột Giá Vốn & Biên Lợi Nhuận Gộp (AC2 & AC3: Chỉ QL Kinh Doanh) */}
                  {marginVisible ? (
                    <>
                      <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/40">
                        Giá Vốn (đ)
                      </th>
                      <th
                        className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/40 cursor-pointer hover:bg-emerald-100/50 transition"
                        onClick={() => handleSort('grossMargin')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Lợi Nhuận Gộp</span>
                          <ArrowUpDown size={12} className="text-emerald-700" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-center text-emerald-800 bg-emerald-50/40 cursor-pointer hover:bg-emerald-100/50 transition"
                        onClick={() => handleSort('grossMarginPercent')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>% Biên Gộp</span>
                          <ArrowUpDown size={12} className="text-emerald-700" />
                        </div>
                      </th>
                    </>
                  ) : (
                    <th className="py-3 px-3 text-center text-gray-400 bg-gray-50/60 font-normal">
                      <div className="flex items-center justify-center gap-1">
                        <Lock size={12} />
                        <span>Biên LN (Bảo Mật)</span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={marginVisible ? (compare !== 'NONE' ? 10 : 8) : (compare !== 'NONE' ? 8 : 6)} className="py-12 text-center text-gray-400">
                      <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-orange-500" />
                      <span>Đang nạp dữ liệu báo cáo đa chiều...</span>
                    </td>
                  </tr>
                ) : filteredAndSortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={marginVisible ? (compare !== 'NONE' ? 10 : 8) : (compare !== 'NONE' ? 8 : 6)} className="py-10 text-center text-gray-400">
                      Không có phát sinh doanh số nào thỏa mãn bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRows.map((row, index) => (
                    <tr key={row.key || index} className="hover:bg-orange-50/30 transition">
                      {/* STT */}
                      <td className="py-2.5 px-3 text-center font-medium text-gray-500">
                        {index + 1}
                      </td>

                      {/* Tên & Mã phân nhóm */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-900">{row.name || 'Chưa xác định'}</div>
                        {row.code && (
                          <div className="font-mono text-[10px] text-gray-400">{row.code}</div>
                        )}
                      </td>

                      {/* Doanh số */}
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 font-mono">
                        {formatVnd(row.revenue)}
                      </td>

                      {/* Doanh số kỳ trước & % Tăng/Giảm (AC4) */}
                      {compare !== 'NONE' && (
                        <>
                          <td className="py-2.5 px-3 text-right text-gray-500 font-mono">
                            {formatVnd(row.previousRevenue)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.revenueChangePercent != null ? (
                              row.revenueChangePercent >= 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  +{row.revenueChangePercent.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {row.revenueChangePercent.toFixed(1)}%
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 text-[10px]">Mới</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Sản lượng */}
                      <td className="py-2.5 px-3 text-right font-medium text-gray-800 font-mono">
                        {formatNumber(row.quantity)}
                      </td>

                      {/* Số đơn */}
                      <td className="py-2.5 px-3 text-center font-medium text-gray-600">
                        {row.orderCount}
                      </td>

                      {/* Cột Biên Lợi Nhuận (AC2 & AC3) */}
                      {marginVisible ? (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600 bg-emerald-50/20">
                            {formatVnd(row.costOfGoods)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                            {formatVnd(row.grossMargin)}
                          </td>
                          <td className="py-2.5 px-3 text-center bg-emerald-50/20">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                              {row.grossMarginPercent ?? 0}%
                            </span>
                          </td>
                        </>
                      ) : (
                        <td className="py-2.5 px-3 text-center text-gray-400 bg-gray-50/40 text-[11px]">
                          🔒 Đã ẩn
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>

              {/* DÒNG TỔNG CỘNG (STICKY / FOOTER) */}
              {data?.total && (
                <tfoot className="bg-gray-100/90 font-bold border-t-2 border-gray-300 text-gray-900">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-center uppercase tracking-wide text-xs">
                      TỔNG CỘNG
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-orange-700 text-sm">
                      {formatVnd(data.total.revenue)}
                    </td>

                    {compare !== 'NONE' && (
                      <>
                        <td className="py-3 px-3 text-right font-mono text-gray-600">
                          {formatVnd(data.total.previousRevenue)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {data.total.revenueChangePercent != null ? (
                            data.total.revenueChangePercent >= 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                +{data.total.revenueChangePercent.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                                {data.total.revenueChangePercent.toFixed(1)}%
                              </span>
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                      </>
                    )}

                    <td className="py-3 px-3 text-right font-mono">
                      {formatNumber(data.total.quantity)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {data.total.orderCount}
                    </td>

                    {marginVisible ? (
                      <>
                        <td className="py-3 px-3 text-right font-mono text-gray-700 bg-emerald-100/40">
                          {formatVnd(data.total.costOfGoods)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm bg-emerald-100/40">
                          {formatVnd(data.total.grossMargin)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono bg-emerald-100/40">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-200 text-emerald-900">
                            {data.total.grossMarginPercent ?? 0}%
                          </span>
                        </td>
                      </>
                    ) : (
                      <td className="py-3 px-3 text-center text-gray-400 bg-gray-100 text-[11px] font-normal">
                        🔒 Bảo mật
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
