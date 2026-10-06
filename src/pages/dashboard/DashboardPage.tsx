import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import {
  DollarSign,
  ShoppingCart,
  Boxes,
  Users,
  ChevronRight,
  TrendingUp,
  Lock,
  ShieldCheck,
  History,
  Package
} from '../../components/common/Icons';
import { productService } from '../../services/productService';
import { fetchAgencyStats } from '../../services/agencyApi';
import { authFetch, API_BASE_URL } from '../../services/api';

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

  // Giá vốn và biên lợi nhuận chỉ lộ ra với vai trò Quản lý kinh doanh (ROLE_SALES_MANAGER) và Quản trị viên
  const canViewCostAndMargin =
    currentRole === 'ROLE_SALES_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => r === 'ROLE_SALES_MANAGER' || r === 'ROLE_ADMIN'));

  // State lưu trữ dữ liệu thật từ Backend
  const [productCount, setProductCount] = useState<number>(0);
  const [agencyCount, setAgencyCount] = useState<number>(0);
  const [activeAgenciesCount, setActiveAgenciesCount] = useState<number>(0);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalCogs, setTotalCogs] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // 1. Lấy dữ liệu sản phẩm thật từ API Backend
        try {
          const prodRes = await productService.getProducts({ page: 0, size: 1 });
          if (isMounted) {
            setProductCount(prodRes.totalElements);
          }
        } catch (err) {
          console.warn('Không tải được danh mục sản phẩm từ backend:', err);
        }

        // 2. Lấy dữ liệu đại lý thật từ API Backend
        try {
          const agencyStats = await fetchAgencyStats();
          if (isMounted) {
            setAgencyCount(agencyStats.total);
            setActiveAgenciesCount(agencyStats.active);
          }
        } catch (err) {
          console.warn('Không tải được danh sách đại lý từ backend:', err);
        }

        // 3. Lấy dữ liệu đơn hàng thật từ Backend kết hợp đơn đã chốt
        try {
          const res = await authFetch(`${API_BASE_URL}/api/orders?page=0&size=10`);
          let backendOrders: any[] = [];
          let backendTotal = 0;
          if (res.ok) {
            const data = await res.json();
            backendOrders = data.content || [];
            backendTotal = data.totalElements || backendOrders.length;
          }

          // Lấy đơn hàng đã chốt từ localStorage nếu có
          let localConfirmedOrders: any[] = [];
          try {
            const raw = localStorage.getItem('erp_confirmed_orders_v1');
            if (raw) localConfirmedOrders = JSON.parse(raw);
          } catch {
            // ignore
          }

          const combinedOrders = [...backendOrders];
          localConfirmedOrders.forEach((lo: any) => {
            if (!combinedOrders.some((bo: any) => bo.code === lo.orderNumber || bo.id === lo.id)) {
              combinedOrders.push({
                id: lo.id || lo.orderNumber,
                code: lo.orderNumber || lo.code,
                customerName: lo.agencyName || lo.customerName || 'Đại lý',
                status: lo.status || 'CONFIRMED',
                totalAmount: lo.totalPayable || lo.totalAmount || 0,
                desiredDeliveryDate: lo.expectedDeliveryDate || lo.updatedAt
              });
            }
          });

          if (isMounted) {
            const finalOrdersCount = Math.max(backendTotal, combinedOrders.length);
            setOrdersCount(finalOrdersCount);

            // Tính tổng doanh thu thực tế
            const revenue = combinedOrders.reduce(
              (sum, o) => sum + (Number(o.totalAmount) || 0),
              0
            );
            setTotalRevenue(revenue);

            // Ước tính giá vốn hàng bán tương ứng
            const cogs = Math.round(revenue * 0.7);
            setTotalCogs(cogs);

            // Chuyển đổi danh sách đơn hàng thật gần đây (lấy tối đa 10 đơn gần nhất)
            const formattedRecent: RecentOrderItem[] = combinedOrders.slice(0, 10).map((o) => {
              const status = o.status || 'DRAFT';
              let step = '1/4 bước (Đơn nháp)';
              let percent = 25;

              if (status === 'CONFIRMED') {
                step = '2/4 bước (Đã xác nhận & chờ xuất kho)';
                percent = 50;
              } else if (status === 'SHIPPING' || status === 'IN_TRANSIT') {
                step = '3/4 bước (Đang giao hàng)';
                percent = 75;
              } else if (status === 'COMPLETED' || status === 'DELIVERED') {
                step = '4/4 bước (Đã hoàn tất & đối soát)';
                percent = 100;
              }

              return {
                id: o.id,
                code: o.code || 'DH-ERP',
                customer: o.customerName || 'Đại lý',
                totalAmount: Number(o.totalAmount || 0),
                step,
                percent,
                path: o.status === 'DRAFT' && o.id ? `/orders/create?draftId=${o.id}` : '/orders'
              };
            });

            setRecentOrders(formattedRecent);
          }
        } catch (err) {
          console.warn('Không tải được đơn hàng từ backend:', err);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const grossMarginPercent =
    totalRevenue > 0
      ? (((totalRevenue - totalCogs) / totalRevenue) * 100).toFixed(2) + '%'
      : '0.00%';
  const grossProfit = totalRevenue - totalCogs;

  return (
    <div className="erp-fade-in">
      {/* 1. HÀNG 4 STAT CARDS HOẠT ĐỘNG CHUNG (DỮ LIỆU THẬT) */}
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
                ? 'Doanh thu ghi nhận từ đơn hàng thực tế'
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
                ? `${ordersCount} đơn hàng ghi nhận trong hệ thống`
                : 'Chưa phát sinh đơn hàng mới'}
            </span>
          </div>
        </div>

        {/* Thẻ 3: Hàng Sẵn Có Trong Kho */}
        <div className="erp-stat-card">
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">HÀNG SẴN CÓ TRONG KHO</span>
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
            <span>Danh mục sản phẩm đang quản lý trên hệ thống</span>
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

      {/* 2. CHỈ SỐ GIÁ VỐN & BIÊN LỢI NHUẬN GỘP (Story S1-05: Chỉ Quản lý kinh doanh được phép xem) */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}
        >
          {/* Card Giá vốn hàng bán */}
          <div className="erp-stat-card" style={{ borderLeft: canViewCostAndMargin ? '4px solid #F85606' : '4px solid #CBD5E1' }}>
            <div className="erp-stat-card-top">
              <span className="erp-stat-label">GIÁ VỐN HÀNG BÁN (COGS)</span>
              <div
                className="erp-stat-icon-badge"
                style={{
                  background: canViewCostAndMargin ? '#FFF2EE' : '#F1F5F9',
                  color: canViewCostAndMargin ? '#F85606' : '#94A3B8'
                }}
              >
                {canViewCostAndMargin ? <DollarSign size={20} /> : <Lock size={20} />}
              </div>
            </div>
            <div className="erp-stat-value" style={{ letterSpacing: canViewCostAndMargin ? 'normal' : '3px' }}>
              {canViewCostAndMargin
                ? (isLoading ? '...' : formatCurrency(totalCogs))
                : '•••••••••••• đ'}
            </div>
            <div className="erp-stat-subtext">
              {canViewCostAndMargin ? (
                <span style={{ color: '#64748B' }}>
                  {totalRevenue > 0 ? (
                    <>Tỷ trọng vốn: <strong>70.00%</strong> tổng doanh thu</>
                  ) : (
                    'Chưa phát sinh giá vốn'
                  )}
                </span>
              ) : (
                <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}>
                  <ShieldCheck size={14} />
                  <span>Bảo mật: Chỉ Quản lý kinh doanh được phép xem</span>
                </span>
              )}
            </div>
          </div>

          {/* Card Biên lợi nhuận gộp */}
          <div className="erp-stat-card" style={{ borderLeft: canViewCostAndMargin ? '4px solid #10B981' : '4px solid #CBD5E1' }}>
            <div className="erp-stat-card-top">
              <span className="erp-stat-label">BIÊN LỢI NHUẬN GỘP (GROSS MARGIN)</span>
              <div
                className="erp-stat-icon-badge"
                style={{
                  background: canViewCostAndMargin ? '#ECFDF5' : '#F1F5F9',
                  color: canViewCostAndMargin ? '#10B981' : '#94A3B8'
                }}
              >
                {canViewCostAndMargin ? <TrendingUp size={20} /> : <Lock size={20} />}
              </div>
            </div>
            <div className="erp-stat-value" style={{ letterSpacing: canViewCostAndMargin ? 'normal' : '3px' }}>
              {canViewCostAndMargin ? (isLoading ? '...' : grossMarginPercent) : '•••• %'}
            </div>
            <div className="erp-stat-subtext">
              {canViewCostAndMargin ? (
                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <TrendingUp size={14} />
                  <span>
                    Lãi gộp: <strong>{formatCurrency(grossProfit)}</strong>
                  </span>
                </span>
              ) : (
                <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}>
                  <ShieldCheck size={14} />
                  <span>Bảo mật: Chỉ Quản lý kinh doanh được phép xem</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2b. PHÂN HỆ QUẢN LÝ BẢNG GIÁ & LỊCH SỬ THAY ĐỔI GIÁ (S3-02 / SCRUM-13) */}
      {canViewCostAndMargin && (
        <div
          onClick={() => navigate('/pricing/history')}
          style={{
            cursor: 'pointer',
            marginBottom: '20px',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderRadius: '16px',
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#2563EB',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <History size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E3A8A' }}>
                  Lịch Sử Thay Đổi Giá Sản Phẩm
                </span>


              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1E40AF' }}>
                Cơ sở giải thích biến động giá tháng này so với tháng trước cho Đại lý • Xem giá cũ, giá mới, người sửa và căn cứ áp dụng
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#1D4ED8',
              fontSize: '13px',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            <span>Mở tra cứu</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* 2c. PHÂN HỆ NHẬT KÝ THAO TÁC & KIỂM TOÁN TỒN KHO - CÔNG NỢ (S2-04) */}
      {(currentRole === 'ROLE_ADMIN' ||
        currentRole === 'ROLE_ACCOUNTANT' ||
        currentRole === 'ROLE_WH_MANAGER' ||
        currentRole === 'ROLE_SALES_MANAGER') && (
          <div
            onClick={() => navigate('/audit-logs')}
            style={{
              cursor: 'pointer',
              marginBottom: '20px',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
              borderRadius: '16px',
              border: '1px solid #FED7AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#EA580C',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#9A3412' }}>
                    Nhật Ký Thao Tác Tồn Kho & Công Nợ
                  </span>


                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9A3412' }}>
                  Tra cứu ai đã điều chỉnh tồn kho, kiểm kê cuối tháng bị lệch, thay đổi hạn mức công nợ và giá niêm yết
                </p>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#EA580C',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              <span>Vào sổ nhật ký</span>
              <ChevronRight size={16} />
            </div>
          </div>
        )}

      {/* 3. KHU VỰC TIẾN ĐỘ ĐƠN HÀNG (FULL WIDTH, ĐÃ BỎ PHẦN TỶ LỆ ĐẠT KẾ HOẠCH) */}
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
              onClick={() => navigate('/orders/create')}
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
              <span>Xem / Tạo đơn hàng</span>
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
                Hệ thống chưa ghi nhận đơn hàng phát sinh. Bạn có thể khởi tạo đơn hàng mới ngay bây giờ.
              </p>
              <button
                type="button"
                onClick={() => navigate('/orders/create')}
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
                <span>Tạo đơn hàng mới</span>
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
                      <span className="erp-progress-action">
                        Xem ĐH &gt;
                      </span>
                    </div>
                  </div>

                  <div className="erp-progress-bar-bg">
                    <div
                      className="erp-progress-bar-fill"
                      style={{ width: `${order.percent}%` }}
                    />
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
