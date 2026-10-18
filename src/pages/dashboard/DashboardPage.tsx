import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import {
  DollarSign,
  ShoppingCart,
  Boxes,
  Users,
  ChevronRight,
  TrendingUp,
  Package
} from '../../components/common/Icons';
import { productService } from '../../services/productService';
import { fetchAgencyStats } from '../../services/agencyApi';
import { authFetch, API_BASE_URL } from '../../services/api';
import { WarehouseMinStockDashboardAlert } from '../../components/inventory/WarehouseMinStockDashboardAlert';
import {
  fetchExecutiveDashboardOverview,
  fetchDailySales,
  fetchRegionSales,
  refreshDashboardCache
} from '../../services/executiveDashboardApi';
import type { ExecutiveDashboardOverview } from '../../types/dashboard';
import { ExecutiveKpiWidgets } from '../../components/dashboard/ExecutiveKpiWidgets';
import { ExecutiveDailySalesChart } from '../../components/dashboard/ExecutiveDailySalesChart';
import { ExecutiveRegionSalesChart } from '../../components/dashboard/ExecutiveRegionSalesChart';
import { ExecutiveOverdueAgenciesTable } from '../../components/dashboard/ExecutiveOverdueAgenciesTable';

interface RecentOrderItem {
  id: string | number;
  code: string;
  customer: string;
  step: string;
  percent: number;
  totalAmount: number;
  path: string;
}

export const DashboardPage: React.FC = () => {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();

  // Quyền truy cập Dashboard điều hành (S8-05): Quản lý kinh doanh, Quản lý kho, Admin, Kế toán
  const isExecutiveRole =
    currentRole === 'ROLE_SALES_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ACCOUNTANT' ||
    Boolean(
      user?.roles?.some((r) =>
        ['ROLE_SALES_MANAGER', 'ROLE_ADMIN', 'ROLE_WH_MANAGER', 'ROLE_ACCOUNTANT'].includes(r)
      )
    );

  // Quyền khởi tạo đơn hàng mới: Chỉ Admin, Quản lý kinh doanh và Nhân viên kinh doanh
  const canCreateOrder =
    currentRole === 'ROLE_SALES_REP' ||
    currentRole === 'ROLE_SALES_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(
      user?.roles?.some((r) =>
        ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN'].includes(r)
      )
    );

  // S8-05 Executive Dashboard States
  const [executiveOverview, setExecutiveOverview] = useState<ExecutiveDashboardOverview | null>(null);
  const [executiveLoading, setExecutiveLoading] = useState<boolean>(false);
  const [refreshingCache, setRefreshingCache] = useState<boolean>(false);
  const [chartMonth, setChartMonth] = useState<number>(new Date().getMonth() + 1);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [dailySalesLoading, setDailySalesLoading] = useState<boolean>(false);

  // Operational Dashboard States
  const [productCount, setProductCount] = useState<number>(0);
  const [agencyCount, setAgencyCount] = useState<number>(0);
  const [activeAgenciesCount, setActiveAgenciesCount] = useState<number>(0);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Tải dữ liệu Executive Dashboard (AC 4: Tải tổng hợp nhanh < 2 giây)
  const loadExecutiveData = useCallback(
    async (m?: number, y?: number, refresh: boolean = false) => {
      if (!isExecutiveRole) return;
      setExecutiveLoading(true);
      try {
        const data = await fetchExecutiveDashboardOverview(m ?? chartMonth, y ?? chartYear, 10, refresh);
        setExecutiveOverview(data);
      } catch (err) {
        console.warn('Lỗi tải dữ liệu Executive Dashboard:', err);
      } finally {
        setExecutiveLoading(false);
      }
    },
    [isExecutiveRole, chartMonth, chartYear]
  );

  useEffect(() => {
    loadExecutiveData();
  }, [loadExecutiveData]);

  // Bộ lọc tháng trên biểu đồ (AC 2 & TEST FE)
  const handleMonthChange = async (newMonth: number) => {
    setChartMonth(newMonth);
    setDailySalesLoading(true);
    try {
      const [daily, region] = await Promise.all([
        fetchDailySales(newMonth, chartYear),
        fetchRegionSales(newMonth, chartYear)
      ]);
      setExecutiveOverview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          dailySales: daily,
          regionSales: region
        };
      });
    } catch (err) {
      console.warn('Lỗi đổi tháng biểu đồ:', err);
    } finally {
      setDailySalesLoading(false);
    }
  };

  // Bộ lọc năm trên biểu đồ (AC 2 & TEST FE)
  const handleYearChange = async (newYear: number) => {
    setChartYear(newYear);
    setDailySalesLoading(true);
    try {
      const [daily, region] = await Promise.all([
        fetchDailySales(chartMonth, newYear),
        fetchRegionSales(chartMonth, newYear)
      ]);
      setExecutiveOverview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          dailySales: daily,
          regionSales: region
        };
      });
    } catch (err) {
      console.warn('Lỗi đổi năm biểu đồ:', err);
    } finally {
      setDailySalesLoading(false);
    }
  };

  // Làm mới bộ đệm Cache thủ công
  const handleRefreshCache = async () => {
    setRefreshingCache(true);
    try {
      await refreshDashboardCache();
      await loadExecutiveData(chartMonth, chartYear, true);
    } catch (err) {
      console.warn('Lỗi làm mới cache:', err);
    } finally {
      setRefreshingCache(false);
    }
  };

  // Tải dữ liệu hoạt động chung
  useEffect(() => {
    let isMounted = true;

    async function loadOperationalData() {
      setIsLoading(true);
      try {
        // 1. Lấy dữ liệu sản phẩm
        try {
          const prodRes = await productService.getProducts({ page: 0, size: 1 });
          if (isMounted) {
            setProductCount(prodRes.totalElements);
          }
        } catch (err) {
          console.warn('Không tải được danh mục sản phẩm từ backend:', err);
        }

        // 2. Lấy dữ liệu đại lý
        const canViewCustomers =
          currentRole === 'ROLE_ADMIN' ||
          currentRole === 'ROLE_SALES_MANAGER' ||
          currentRole === 'ROLE_ACCOUNTANT' ||
          currentRole === 'ROLE_SALES_REP' ||
          Boolean(
            user?.roles?.some((r) =>
              ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_ACCOUNTANT', 'ROLE_SALES_REP'].includes(r)
            )
          );

        if (canViewCustomers) {
          try {
            const agencyStats = await fetchAgencyStats();
            if (isMounted) {
              setAgencyCount(agencyStats.total);
              setActiveAgenciesCount(agencyStats.active);
            }
          } catch (err) {
            console.warn('Không tải được danh sách đại lý từ backend:', err);
          }
        }

        // 3. Lấy dữ liệu đơn hàng gần đây
        const canViewOrders =
          currentRole === 'ROLE_ADMIN' ||
          currentRole === 'ROLE_SALES_MANAGER' ||
          currentRole === 'ROLE_ACCOUNTANT' ||
          currentRole === 'ROLE_SALES_REP' ||
          currentRole === 'ROLE_WAREHOUSE' ||
          currentRole === 'ROLE_WH_MANAGER' ||
          Boolean(
            user?.roles?.some((r) =>
              [
                'ROLE_ADMIN',
                'ROLE_SALES_MANAGER',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_REP',
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER'
              ].includes(r)
            )
          );

        if (canViewOrders) {
          try {
            const res = await authFetch(`${API_BASE_URL}/api/orders?page=0&size=10`);
            let backendOrders: any[] = [];
            if (res.ok) {
              const data = await res.json();
              backendOrders = data.content || [];
            }

            let backendRevenue = 0;
            let backendOfficialOrdersCount = 0;
            let hasBackendTotals = false;

            try {
              const [revTotalsRes, officialTotalsRes] = await Promise.all([
                authFetch(`${API_BASE_URL}/api/orders/totals?status=DISPATCHED,DELIVERED,CLOSED`),
                authFetch(
                  `${API_BASE_URL}/api/orders/totals?status=PENDING_APPROVAL,APPROVED,PICKING,DISPATCHED,DELIVERED,CLOSED`
                )
              ]);

              if (revTotalsRes.ok) {
                const revData = await revTotalsRes.json();
                backendRevenue = Number(revData.totalAmount) || 0;
                hasBackendTotals = true;
              }

              if (officialTotalsRes.ok) {
                const officialData = await officialTotalsRes.json();
                backendOfficialOrdersCount = Number(officialData.orderCount) || 0;
              }
            } catch (errTotals) {
              console.warn('Fallback tính từ danh sách đơn:', errTotals);
            }

            const REVENUE_ELIGIBLE_STATUSES = ['DISPATCHED', 'DELIVERED', 'CLOSED', 'COMPLETED'];
            const OFFICIAL_ORDER_STATUSES = [
              'PENDING_APPROVAL',
              'APPROVED',
              'CONFIRMED',
              'PICKING',
              'PREPARING',
              'DISPATCHED',
              'DELIVERED',
              'CLOSED',
              'COMPLETED'
            ];

            let finalRevenue = hasBackendTotals
              ? backendRevenue
              : backendOrders
                  .filter((o: any) => REVENUE_ELIGIBLE_STATUSES.includes(String(o.status || '').toUpperCase()))
                  .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

            if (isMounted) {
              setTotalRevenue(finalRevenue);
              setOrdersCount(
                hasBackendTotals && backendOfficialOrdersCount > 0
                  ? backendOfficialOrdersCount
                  : backendOrders.filter((o: any) =>
                      OFFICIAL_ORDER_STATUSES.includes(String(o.status || '').toUpperCase())
                    ).length
              );

              const formattedRecent: RecentOrderItem[] = backendOrders.slice(0, 10).map((o) => {
                const status = String(o.status || 'DRAFT').toUpperCase();
                let step = '1/7 bước (Đơn nháp)';
                let percent = 14;

                if (status === 'PENDING_APPROVAL') {
                  step = '2/7 bước (Chờ quản lý duyệt)';
                  percent = 28;
                } else if (status === 'APPROVED' || status === 'CONFIRMED') {
                  step = '3/7 bước (Đã duyệt & giữ tồn)';
                  percent = 43;
                } else if (status === 'PICKING' || status === 'PREPARING') {
                  step = '4/7 bước (Đang soạn hàng theo FEFO)';
                  percent = 57;
                } else if (status === 'DISPATCHED' || status === 'SHIPPING' || status === 'IN_TRANSIT') {
                  step = '5/7 bước (Đã xuất kho)';
                  percent = 71;
                } else if (status === 'DELIVERED') {
                  step = '6/7 bước (Đại lý đã nhận)';
                  percent = 86;
                } else if (status === 'CLOSED' || status === 'COMPLETED') {
                  step = '7/7 bước (Đã đóng & hoàn tất)';
                  percent = 100;
                } else if (status === 'CANCELLED') {
                  step = 'Đã hủy đơn';
                  percent = 0;
                } else if (status === 'REJECTED') {
                  step = 'Bị từ chối duyệt';
                  percent = 0;
                }

                return {
                  id: o.id,
                  code: o.code || 'DH-ERP',
                  customer: o.customerName || 'Đại lý',
                  totalAmount: Number(o.totalAmount || 0),
                  step,
                  percent,
                  path:
                    status === 'DRAFT' && o.id && canCreateOrder
                      ? `/orders/create?draftId=${o.id}`
                      : o.id
                      ? `/orders/${o.id}`
                      : '/orders'
                };
              });

              setRecentOrders(formattedRecent);
            }
          } catch (err) {
            console.warn('Lỗi tải đơn hàng:', err);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadOperationalData();
    return () => {
      isMounted = false;
    };
  }, [currentRole, user, canCreateOrder]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="erp-fade-in space-y-4">
      {/* CẢNH BÁO TỒN KHO DƯỚI ĐỊNH MỨC CHO KHO & ADMIN */}
      <WarehouseMinStockDashboardAlert />

      {/* ================= S8-05 EXECUTIVE SALES & INVENTORY DASHBOARD ================= */}
      {isExecutiveRole && (
        <div className="space-y-4">
          {/* 1. THẺ CHỈ SỐ ĐIỀU HÀNH (AC 1 & AC 4 TẢI NHANH < 2 GIÂY) */}
          <ExecutiveKpiWidgets
            summary={executiveOverview?.summary || null}
            responseTimeMs={executiveOverview?.responseTimeMs}
            fromCache={executiveOverview?.fromCache}
            onRefreshCache={handleRefreshCache}
            refreshing={refreshingCache}
            loading={executiveLoading}
          />

          {/* 2. BIỂU ĐỒ DOANH SỐ THEO NGÀY (CHART.JS) & CƠ CẤU KHU VỰC (AC 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-7 flex flex-col">
              <ExecutiveDailySalesChart
                data={executiveOverview?.dailySales || null}
                selectedMonth={chartMonth}
                selectedYear={chartYear}
                onMonthChange={handleMonthChange}
                onYearChange={handleYearChange}
                onRefresh={handleRefreshCache}
                refreshing={refreshingCache}
                loading={dailySalesLoading || executiveLoading}
              />
            </div>

            <div className="lg:col-span-5 flex flex-col">
              <ExecutiveRegionSalesChart
                data={executiveOverview?.regionSales || null}
                loading={dailySalesLoading || executiveLoading}
              />
            </div>
          </div>

          {/* 3. BẢNG CẢNH BÁO ĐẠI LÝ QUÁ HẠN CÔNG NỢ (AC 3) */}
          <div className="mt-4">
            <ExecutiveOverdueAgenciesTable
              data={executiveOverview?.overdueAgencies || null}
              loading={executiveLoading}
            />
          </div>
        </div>
      )}

      {/* ================= OPERATIONAL & INVENTORY SUMMARY CARDS (Chỉ hiển thị khi không phải vai trò điều hành) ================= */}
      {!isExecutiveRole && (
        <div className="erp-stat-grid">
          {/* Thẻ 1: Tổng Doanh Thu */}
          <div className="erp-stat-card">
            <div className="erp-stat-card-top">
              <span className="erp-stat-label">TỔNG DOANH THU THÁNG</span>
              <div
                className="erp-stat-icon-badge"
                style={{ background: '#FFF2EE', color: '#F85606' }}
              >
                <DollarSign size={22} />
              </div>
            </div>
            <div className="erp-stat-value">
              {isLoading ? 'Đang tải...' : formatCurrency(totalRevenue)}
            </div>
            <div className="erp-stat-subtext" style={{ color: totalRevenue > 0 ? '#10B981' : '#64748B' }}>
              <TrendingUp size={14} />
              <span>
                {totalRevenue > 0
                  ? 'Ghi nhận từ đơn xuất kho & giao hàng'
                  : 'Chưa phát sinh doanh thu trong kỳ'}
              </span>
            </div>
          </div>

          {/* Thẻ 2: Đơn Hàng Trong Kỳ */}
          <div className="erp-stat-card">
            <div className="erp-stat-card-top">
              <span className="erp-stat-label">ĐƠN HÀNG TRONG KỲ</span>
              <div
                className="erp-stat-icon-badge"
                style={{ background: '#EFF6FF', color: '#2563EB' }}
              >
                <ShoppingCart size={22} />
              </div>
            </div>
            <div className="erp-stat-value">
              {isLoading ? '...' : ordersCount}
            </div>
            <div className="erp-stat-subtext">
              <span>
                {ordersCount > 0
                  ? `${ordersCount} đơn hàng chính thức phát sinh`
                  : 'Chưa phát sinh đơn hàng mới'}
              </span>
            </div>
          </div>

          {/* Thẻ 3: Danh Mục Sản Phẩm (Sửa đúng ngữ nghĩa tổng số mặt hàng) */}
          <div className="erp-stat-card">
            <div className="erp-stat-card-top">
              <span className="erp-stat-label">DANH MỤC SẢN PHẨM</span>
              <div
                className="erp-stat-icon-badge"
                style={{ background: '#FEF3C7', color: '#D97706' }}
              >
                <Boxes size={22} />
              </div>
            </div>
            <div className="erp-stat-value">
              {isLoading ? '...' : `${productCount.toLocaleString('vi-VN')} Sản phẩm`}
            </div>
            <div className="erp-stat-subtext" style={{ color: '#D97706' }}>
              <span>Tổng số mặt hàng đang quản lý trên hệ thống</span>
            </div>
          </div>

          {/* Thẻ 4: Đại Lý Phân Phối */}
          <div className="erp-stat-card">
            <div className="erp-stat-card-top">
              <span className="erp-stat-label">ĐẠI LÝ HOẠT ĐỘNG</span>
              <div
                className="erp-stat-icon-badge"
                style={{ background: '#ECFDF5', color: '#059669' }}
              >
                <Users size={22} />
              </div>
            </div>
            <div className="erp-stat-value">
              {isLoading ? '...' : activeAgenciesCount || agencyCount}
            </div>
            <div className="erp-stat-subtext">
              <span>
                {agencyCount > 0
                  ? `${activeAgenciesCount}/${agencyCount} đại lý đang hoạt động`
                  : 'Chưa có hồ sơ đại lý nào'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TIẾN ĐỘ CÁC ĐƠN HÀNG GẦN ĐÂY */}
      <div style={{ width: '100%', marginBottom: '24px' }}>
        <div className="erp-card" style={{ width: '100%' }}>
          <div className="erp-card-header">
            <div>
              <h2 className="erp-card-title">Tình Trạng Xử Lý Các Đơn Hàng Gần Đây</h2>
              <p className="erp-card-subtitle">
                Theo dõi tiến độ quy trình các đơn hàng thực tế ghi nhận trong hệ thống
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#F85606',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{canCreateOrder ? 'Xem / Tạo đơn hàng' : 'Xem danh sách đơn hàng'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#9CA3AF' }}>
              <span>Đang tải danh sách đơn hàng thực tế...</span>
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: '#FFF2EE',
                  color: '#F85606',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px'
                }}
              >
                <Package size={28} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1F2937', marginBottom: '6px' }}>
                Chưa có đơn hàng nào trong hệ thống
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280', maxWidth: '420px', margin: '0 auto 18px' }}>
                {canCreateOrder
                  ? 'Hệ thống chưa ghi nhận đơn hàng phát sinh. Bạn có thể khởi tạo đơn hàng mới ngay bây giờ.'
                  : 'Hệ thống chưa ghi nhận đơn hàng phát sinh trong kỳ hiện tại.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(canCreateOrder ? '/orders/create' : '/orders')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: '#F85606',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ShoppingCart size={15} />
                <span>{canCreateOrder ? 'Tạo đơn hàng mới' : 'Xem danh sách đơn hàng'}</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '380px',
                overflowY: 'auto',
                paddingRight: '6px'
              }}
            >
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="erp-progress-item"
                  onClick={() => navigate(order.path)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="erp-progress-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="erp-progress-code">{order.code}</span>
                      <span className="erp-progress-label">{order.customer}</span>
                      {order.totalAmount > 0 && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#F85606',
                            background: '#FFF2EE',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            marginLeft: '4px'
                          }}
                        >
                          {formatCurrency(order.totalAmount)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{order.step}</span>
                      <span className="erp-progress-action">Xem ĐH &gt;</span>
                    </div>
                  </div>

                  <div className="erp-progress-bar-bg">
                    <div className="erp-progress-bar-fill" style={{ width: `${order.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
