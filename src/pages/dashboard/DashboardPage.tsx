import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import {
  DollarSign,
  ShoppingCart,
  Boxes,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from '../../components/common/Icons';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Danh sách các đơn hàng gần đây với thanh tiến độ (theo chuẩn App ETC)
  const recentOrders = [
    {
      code: 'DH-2026-001',
      customer: 'Công Ty CP Dược Phẩm An Khang',
      step: '3/4 bước (Đang giao hàng)',
      percent: 75,
      path: '/orders'
    },
    {
      code: 'DH-2026-002',
      customer: 'Đại Lý Phân Phối Minh Phát (B2B)',
      step: '4/4 bước (Đã hoàn tất & đối soát)',
      percent: 100,
      path: '/orders'
    },
    {
      code: 'DH-2026-003',
      customer: 'Hệ Thống Bán Buôn Miền Trung',
      step: '1/4 bước (Chờ duyệt xuất kho FEFO)',
      percent: 25,
      path: '/orders'
    },
    {
      code: 'DH-2026-004',
      customer: 'Chuỗi Cung Ứng Dược Đông Nam',
      step: '2/4 bước (Đang bốc xếp tại kho MB01)',
      percent: 50,
      path: '/orders'
    }
  ];

  return (
    <div className="erp-fade-in">
      {/* 1. HÀNG 4 STAT CARDS (CHUẨN APP ETC) */}
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
          <div className="erp-stat-value">6.500.000.000 đ</div>
          <div className="erp-stat-subtext" style={{ color: '#10B981' }}>
            <TrendingUp size={14} />
            <span>Thanh toán thực tế đã thu (+12.5%)</span>
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
          <div className="erp-stat-value">128</div>
          <div className="erp-stat-subtext">
            <span>14 đơn đang xử lý xuất kho</span>
          </div>
        </div>

        {/* Thẻ 3: Tồn Kho Khả Dụng */}
        <div className="erp-stat-card">
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">TỒN KHO KHẢ DỤNG</span>
            <div
              className="erp-stat-icon-badge"
              style={{ background: '#FEF3C7', color: '#D97706' }}
            >
              <Boxes size={22} />
            </div>
          </div>
          <div className="erp-stat-value">45.200 SKU</div>
          <div className="erp-stat-subtext" style={{ color: '#D97706' }}>
            <span>8 lô cận hạn cần xuất trước (FEFO)</span>
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
          <div className="erp-stat-value">54</div>
          <div className="erp-stat-subtext">
            <span>98.2% trong hạn mức công nợ</span>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH (TIẾN ĐỘ ĐƠN HÀNG & TỶ LỆ HOÀN THÀNH - CHUẨN APP ETC) */}
      <div className="erp-content-grid">
        {/* Cột Trái: Bảng Tiến Độ Đơn Hàng Gần Đây */}
        <div className="erp-card">
          <div className="erp-card-header">
            <div>
              <h2 className="erp-card-title">Tình Trạng Xử Lý Các Đơn Hàng Gần Đây</h2>
              <p className="erp-card-subtitle">
                Nhấn vào đơn hàng bất kỳ để theo dõi quy trình giao vận và hóa đơn (4 đơn mới nhất)
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#F85606',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Xem tất cả</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentOrders.map((order) => (
              <div
                key={order.code}
                className="erp-progress-item"
                onClick={() => navigate(order.path)}
                style={{ cursor: 'pointer' }}
              >
                <div className="erp-progress-top">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="erp-progress-code">{order.code}</span>
                    <span className="erp-progress-label">{order.customer}</span>
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

          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#4B5563'
            }}
          >
            <span>
              Người dùng hiện tại: <strong>{user?.fullName}</strong> (
              <em>{user?.warehouse || 'Trụ sở chính'}</em>)
            </span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>● Hệ Thống Đồng Bộ</span>
          </div>
        </div>

        {/* Cột Phải: Tỷ Lệ Hoàn Thành Chỉ Tiêu & Tồn Kho (Donut Chart Chuẩn App ETC) */}
        <div className="erp-card">
          <div className="erp-card-header">
            <div>
              <h2 className="erp-card-title">Tỷ Lệ Đạt Kế Hoạch</h2>
              <p className="erp-card-subtitle">Đánh giá tiến độ hoàn thành tháng 09/2026</p>
            </div>
          </div>

          <div className="erp-donut-container">
            {/* Donut Chart SVG Thanh Lịch */}
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg width="150" height="150" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#F3F4F6"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="url(#lazadaGradient)"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset="25.12" /* 90% */
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <defs>
                  <linearGradient id="lazadaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6A00" />
                    <stop offset="100%" stopColor="#EE4D2D" />
                  </linearGradient>
                </defs>
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#111827',
                    lineHeight: 1
                  }}
                >
                  92%
                </span>
                <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  Đạt Chỉ Tiêu
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#6B7280',
                marginTop: '12px',
                textAlign: 'center'
              }}
            >
              Đạt 118/128 đơn hàng kế hoạch đã đề ra
            </div>

            {/* Legend Danh Sách Đạt Yêu Cầu */}
            <div className="erp-donut-legend-list">
              <div
                className="erp-donut-legend-item"
                style={{ background: '#ECFDF5', color: '#065F46' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} />
                  <span>ĐẠT YÊU CẦU:</span>
                </div>
                <span>118 đơn</span>
              </div>

              <div
                className="erp-donut-legend-item"
                style={{ background: '#FFFBEB', color: '#92400E' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} />
                  <span>ĐANG CHỜ DUYỆT:</span>
                </div>
                <span>8 đơn</span>
              </div>

              <div
                className="erp-donut-legend-item"
                style={{ background: '#FEF2F2', color: '#B91C1C' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>CẦN XỬ LÝ GẤP:</span>
                </div>
                <span>2 đơn</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
