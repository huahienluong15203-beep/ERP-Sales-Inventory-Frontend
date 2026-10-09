import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Building2,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  RefreshCw,
  Eye,
  Edit,
  Copy,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import {
  fetchOrders,
  fetchOrderTotals,
  cloneOrderToDraft,
  formatCurrencyVND,
  formatQuantity
} from '../../services/orderService';
import { fetchAgencies, fetchAgencyFormOptions } from '../../services/agencyApi';
import type { Agency, RegionOption, SalesRepOption } from '../../types/agency';
import type { OrderSummaryItem, OrderTotalsSummary, OrderFilterCriteria } from '../../types/order';
import { OrderDetailModal } from '../../components/order/OrderDetailModal';

// Danh sách tabs trạng thái nhanh
const STATUS_TABS = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL', badgeColor: 'bg-amber-100 text-amber-800' },
  { label: 'Đã duyệt', value: 'APPROVED', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { label: 'Đơn nháp', value: 'DRAFT', badgeColor: 'bg-gray-100 text-gray-700' },
  { label: 'Từ chối / Hủy', value: 'REJECTED,CANCELLED', badgeColor: 'bg-rose-100 text-rose-800' }
];

export const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentRole, showToast } = useAuth();
  const [cloningOrderId, setCloningOrderId] = useState<number | string | null>(null);

  // Xác định quyền hạn: Quản lý kinh doanh & Admin được xem toàn bộ và lọc theo NVKD
  const isManagerOrAdmin = useMemo(() => {
    const roles = user?.roles || [];
    return (
      currentRole === 'ROLE_SALES_MANAGER' ||
      currentRole === 'ROLE_ADMIN' ||
      roles.includes('ROLE_SALES_MANAGER') ||
      roles.includes('ROLE_ADMIN')
    );
  }, [user, currentRole]);

  const isSalesRep = currentRole === 'ROLE_SALES_REP';

  // State danh mục hỗ trợ lọc
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);

  // State bộ lọc (Filter Criteria)
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // Dữ liệu đơn hàng & tổng kết
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [totals, setTotals] = useState<OrderTotalsSummary>({ orderCount: 0, totalAmount: 0 });
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal xem chi tiết đơn
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // S4-09: Sao chép đơn cũ thành đơn mới cho khách quen trong vài giây
  const handleCloneOrder = async (orderId: number | string) => {
    try {
      setCloningOrderId(orderId);
      const res = await cloneOrderToDraft(orderId);
      showToast(
        'Đã sao chép đơn cũ (S4-09)',
        `Đã sao chép ${res.itemCount} dòng hàng từ đơn ${res.sourceCode}. Đơn giá và chiết khấu đã được tự động tính lại theo bảng giá hiện hành!`,
        'success'
      );
      navigate('/orders/create');
    } catch (err: unknown) {
      console.error('Lỗi sao chép đơn hàng:', err);
      showToast('Sao chép thất bại', err instanceof Error ? err.message : 'Không thể sao chép đơn hàng', 'error');
    } finally {
      setCloningOrderId(null);
    }
  };

  // Tải danh mục phục vụ bộ lọc (Đại lý, Khu vực, NVKD)
  useEffect(() => {
    fetchAgencies({ size: 100 })
      .then((res) => setAgencies(res.content || []))
      .catch((err) => console.warn('Lỗi tải danh sách đại lý:', err));

    fetchAgencyFormOptions()
      .then((opts) => {
        setRegions(opts.regions || []);
        setSalesReps(opts.salesReps || []);
      })
      .catch((err) => console.warn('Lỗi tải danh mục lọc khu vực & NVKD:', err));
  }, []);

  // Xử lý kiểm tra tính hợp lệ của khoảng ngày
  const dateError = useMemo(() => {
    if (fromDate && toDate) {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      if (d1 > d2) {
        return 'Ngày bắt đầu không được lớn hơn ngày kết thúc';
      }
      const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 366) {
        return 'Khoảng thời gian lọc tối đa là 1 năm (366 ngày)';
      }
    }
    return null;
  }, [fromDate, toDate]);

  // Tải dữ liệu danh sách đơn hàng & tổng tiền (S4-07)
  useEffect(() => {
    if (dateError) return;

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) {
        setLoading(true);
        setError(null);
      }
    }, 0);

    const criteria: OrderFilterCriteria = {
      page,
      size: pageSize,
      keyword: keyword.trim() || undefined,
      customerId: selectedAgencyId ? Number(selectedAgencyId) : undefined,
      salesRepId: selectedSalesRepId ? Number(selectedSalesRepId) : undefined,
      regionId: selectedRegionId ? Number(selectedRegionId) : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      statuses: selectedStatusTab ? selectedStatusTab.split(',') : undefined
    };

    Promise.all([
      fetchOrders(criteria),
      fetchOrderTotals(criteria)
    ])
      .then(([pageRes, totalsRes]) => {
        if (isSubscribed) {
          setOrders(pageRes.content || []);
          setTotalPages(pageRes.totalPages || 1);
          setTotalElements(pageRes.totalElements || 0);
          setTotals(totalsRes || { orderCount: 0, totalAmount: 0 });
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isSubscribed) {
          console.error('Lỗi khi tải dữ liệu đơn hàng:', err);
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng');
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [
    page,
    pageSize,
    keyword,
    selectedAgencyId,
    selectedSalesRepId,
    selectedRegionId,
    fromDate,
    toDate,
    selectedStatusTab,
    dateError,
    refreshKey
  ]);

  // Đặt lại toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSelectedStatusTab('');
    setSelectedAgencyId('');
    setSelectedSalesRepId('');
    setSelectedRegionId('');
    setFromDate('');
    setToDate('');
    setKeyword('');
    setPage(0);
  };

  // Nút chọn nhanh khoảng ngày
  const handleQuickDateSelect = (type: 'today' | '7days' | '30days' | 'thisMonth') => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    let fromDateObj = new Date();

    if (type === 'today') {
      fromDateObj = now;
    } else if (type === '7days') {
      fromDateObj.setDate(now.getDate() - 7);
    } else if (type === '30days') {
      fromDateObj.setDate(now.getDate() - 30);
    } else if (type === 'thisMonth') {
      fromDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setFromDate(fromDateObj.toISOString().slice(0, 10));
    setToDate(toStr);
    setPage(0);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} />
            <span>Đã duyệt</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={12} />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <FileText size={12} />
            <span>Đơn nháp</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={12} />
            <span>Từ chối</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <XCircle size={12} />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Trang - Nút tác vụ (đồng bộ giao diện hệ thống) */}
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          title="Làm mới danh sách đơn hàng"
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#F85606] hover:border-orange-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-2xs min-h-[42px]"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-[#F85606]' : ''} />
          <span>Làm mới</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/orders/create')}
          className="px-4 py-2.5 bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-2 transition-all cursor-pointer min-h-[42px]"
        >
          <Plus size={18} />
          <span>Tạo đơn hàng mới</span>
        </button>
      </div>

      {/* 2. S4-07 AC2: KHỐI THẺ THỐNG KÊ KẾT QUẢ ĐANG LỌC (LIVE AGGREGATED TOTALS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số đơn hàng */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng số đơn đang lọc
            </span>
            <div className="text-2xl font-black text-gray-900">
              {loading ? '...' : `${formatQuantity(totals.orderCount)} đơn`}
            </div>
            <p className="text-[11px] text-gray-400">Khớp với tất cả tiêu chí đang lọc</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#F85606] flex items-center justify-center shrink-0 border border-orange-100">
            <ShoppingCart size={22} />
          </div>
        </div>

        {/* Card 2: Tổng tiền toàn bộ kết quả lọc (Điểm nhấn S4-07) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 border border-orange-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#F85606] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={13} />
              <span>Tổng tiền đang lọc</span>
            </span>
            <div className="text-2xl font-black text-[#F85606] leading-tight">
              {loading ? '...' : formatCurrencyVND(totals.totalAmount)}
            </div>
            <p className="text-[11px] text-orange-700/80">Tổng phải thu từ toàn bộ kết quả lọc trong DB</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
            <span className="font-extrabold text-base">₫</span>
          </div>
        </div>

        {/* Card 3: Phân quyền & Phạm vi xem */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Phạm vi hiển thị
            </span>
            <div className="text-sm font-bold text-gray-800 flex items-center gap-1.5 pt-1">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>{isManagerOrAdmin ? 'Toàn bộ công ty' : 'Đại lý phụ trách'}</span>
            </div>
            <p className="text-[11px] text-gray-500">
              {isSalesRep ? `Chỉ hiển thị đại lý của ${user?.fullName || 'bạn'}` : 'Toàn quyền theo dõi doanh số'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Building2 size={22} />
          </div>
        </div>

        {/* Card 4: Số trang & Kết quả hiển thị */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Trang hiển thị
            </span>
            <div className="text-2xl font-black text-gray-900">
              {loading ? '...' : `Trang ${page + 1}/${Math.max(1, totalPages)}`}
            </div>
            <p className="text-[11px] text-gray-400">Hiển thị {orders.length} đơn trên trang này</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* 3. S4-07 AC1: BỘ LỌC ĐA CHIỀU (MULTI-CRITERIA FILTERS) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
        {/* Hàng 1: Tabs Trạng thái nhanh */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedStatusTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setSelectedStatusTab(tab.value);
                    setPage(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F85606] to-orange-600 text-white shadow-xs'
                      : 'bg-gray-100/80 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-gray-500 hover:text-[#F85606] flex items-center gap-1.5 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-orange-50"
          >
            <RotateCcw size={13} />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>

        {/* Hàng 2: Các ô nhập điều kiện lọc */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô 1: Từ khóa tìm kiếm */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Tìm kiếm</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(0);
                }}
                placeholder="Mã đơn, mã hoặc tên đại lý..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Ô 2: Chọn đại lý */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Đại lý</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={selectedAgencyId}
                onChange={(e) => {
                  setSelectedAgencyId(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition appearance-none cursor-pointer"
              >
                <option value="">Tất cả đại lý</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ô 3: Nhân viên kinh doanh (Chỉ hiện cho Quản lý / Admin) */}
          {isManagerOrAdmin ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">NVKD Phụ trách</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={selectedSalesRepId}
                  onChange={(e) => {
                    setSelectedSalesRepId(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition appearance-none cursor-pointer"
                >
                  <option value="">Tất cả nhân viên kinh doanh</option>
                  {salesReps.map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.fullName} ({sr.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">Phạm vi của bạn</label>
              <div className="px-3 py-2 rounded-xl bg-orange-50/70 border border-orange-200 text-xs text-[#F85606] font-semibold flex items-center gap-1.5 truncate">
                <User size={13} className="shrink-0" />
                <span className="truncate">{user?.fullName || 'NVKD'} (Đại lý phụ trách)</span>
              </div>
            </div>
          )}

          {/* Ô 4: Khu vực kinh doanh */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Khu vực</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition appearance-none cursor-pointer"
              >
                <option value="">Tất cả khu vực</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hàng 3: Khoảng thời gian (fromDate - toDate) & Nút chọn nhanh */}
        <div className="pt-2 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1">
              <Calendar size={13} className="text-[#F85606]" />
              <span>Khoảng ngày tạo:</span>
            </span>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:bg-white transition"
              title="Từ ngày"
            />
            <span className="text-gray-400 text-xs">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:bg-white transition"
              title="Đến ngày"
            />
          </div>

          {/* Các nút chọn nhanh thời gian */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-500 mr-1">Lọc nhanh:</span>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('today')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('7days')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('30days')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              30 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('thisMonth')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              Tháng này
            </button>
          </div>
        </div>

        {/* Thông báo lỗi khoảng ngày nếu có */}
        {dateError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* 4. S4-07 BẢNG DỮ LIỆU DANH SÁCH ĐƠN HÀNG (DATA TABLE) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        {/* Thông báo lỗi tải dữ liệu nếu có */}
        {error && (
          <div className="m-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/90 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Mã đơn hàng</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4">Đại lý</th>
                <th className="py-3 px-4">NVKD Phụ trách</th>
                <th className="py-3 px-4">Khu vực</th>
                <th className="py-3 px-4 text-center">Số mặt hàng</th>
                <th className="py-3 px-4 text-right">Tổng tiền (VNĐ)</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={26} className="animate-spin text-[#F85606]" />
                      <span className="text-xs font-semibold">Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 space-y-2">
                    <ShoppingCart size={36} className="mx-auto text-gray-300" />
                    <p className="text-sm font-bold text-gray-700">Không tìm thấy đơn hàng nào</p>
                    <p className="text-xs text-gray-500">
                      Vui lòng thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-orange-50/25 transition-colors">
                    {/* Mã đơn */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(o.id);
                          setIsDetailModalOpen(true);
                        }}
                        className="font-mono font-bold text-[#F85606] hover:underline cursor-pointer"
                        title="Xem chi tiết đơn"
                      >
                        {o.code}
                      </button>
                    </td>

                    {/* Ngày tạo */}
                    <td className="py-3 px-4 text-gray-600">
                      <div>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—'}</div>
                      <div className="text-[10px] text-gray-400">
                        {o.createdAt ? new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>

                    {/* Đại lý */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 leading-tight">{o.customerName}</div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">{o.customerCode}</div>
                    </td>

                    {/* NVKD Phụ trách */}
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {o.salesRepName || 'Chưa phân công'}
                    </td>

                    {/* Khu vực */}
                    <td className="py-3 px-4 text-gray-600">
                      {o.regionName ? (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">
                          {o.regionName}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Số mặt hàng */}
                    <td className="py-3 px-4 text-center font-semibold text-gray-800">
                      {o.lineCount} SKU
                    </td>

                    {/* Tổng tiền */}
                    <td className="py-3 px-4 text-right font-black text-[#F85606] text-sm">
                      {formatCurrencyVND(Number(o.totalAmount || 0))}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(o.status)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(o.id);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#F85606] hover:bg-orange-50 transition cursor-pointer"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye size={16} />
                        </button>

                        {/* S4-09: Sao chép đơn cũ thành đơn mới */}
                        <button
                          type="button"
                          onClick={() => handleCloneOrder(o.id)}
                          disabled={cloningOrderId === o.id}
                          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer"
                          title="Sao chép"
                        >
                          <Copy size={16} className={cloningOrderId === o.id ? 'animate-spin' : ''} />
                        </button>

                        {o.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/create?draftId=${o.id}`)}
                            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition cursor-pointer"
                            title="Sửa đơn nháp"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PHÂN TRANG (PAGINATION BAR) */}
        {!loading && totalElements > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60">
            <div className="text-xs text-gray-500">
              Hiển thị <strong>{page * pageSize + 1}</strong> -{' '}
              <strong>{Math.min((page + 1) * pageSize, totalElements)}</strong> trong tổng số{' '}
              <strong>{formatQuantity(totalElements)}</strong> đơn hàng
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
              </select>

              <div className="flex items-center gap-1 pl-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang trước"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg">
                  {page + 1} / {Math.max(1, totalPages)}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang sau"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. MODAL XEM CHI TIẾT ĐƠN HÀNG */}
      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={isDetailModalOpen}
        onCloneOrder={handleCloneOrder}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrderId(null);
        }}
      />
    </div>
  );
};
