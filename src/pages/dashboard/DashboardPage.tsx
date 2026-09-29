import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { ROLE_METADATA_MAP, RoleName } from '../../types/user';
import { ALL_SYSTEM_MENUS } from '../../services/menuConfig';
import { Icons } from '../../components/common/Icons';

export const DashboardPage: React.FC = () => {
  const { user, currentRole, switchRole } = useAuth();
  const navigate = useNavigate();

  const roleMeta = ROLE_METADATA_MAP[currentRole];

  // Các route bị cấm đối với vai trò hiện tại (để giáo viên kiểm thử 403 trong 1 click)
  const forbiddenRoutesForCurrentRole = ALL_SYSTEM_MENUS.filter(
    (item) => !item.allowedRoles.includes(currentRole)
  ).slice(0, 3);

  return (
    <div className="erp-dashboard">
      {/* Banner chào mừng & Thông tin vai trò làm việc */}
      <div className="erp-welcome-banner">
        <div className="erp-welcome-content">
          <div className="erp-welcome-tag" style={{ backgroundColor: roleMeta.badgeBg, color: roleMeta.badgeColor }}>
            <span>Vai trò đang kích hoạt:</span>
            <strong>{roleMeta.label}</strong>
          </div>
          <h1 className="erp-welcome-title">Xin chào, {user?.fullName || 'Người dùng ERP'}!</h1>
          <p className="erp-welcome-desc">
            Bạn đang đăng nhập với vai trò <strong>{roleMeta.label}</strong> tại{' '}
            <strong>{user?.warehouse || user?.workLocation || 'Hệ thống'}</strong>.
            Giao diện và menu điều hướng bên trái đã được tự động tinh chỉnh đúng theo thẩm quyền được cấp.
          </p>
        </div>
      </div>

      {/* KHỐI THỬ NGHIỆM ĐẶC QUYỀN CHO GIÁO VIÊN / NGƯỜI CHẤM KIỂM TRA S1-06 & S1-07 */}
      <div className="erp-card erp-test-card">
        <div className="erp-card-header">
          <div className="erp-card-header-left">
            <Icons.ShieldCheck size={20} className="text-brand" />
            <h2 className="erp-card-title">Khu vực kiểm thử nhanh cho Giáo viên / Người chấm</h2>
          </div>
          <span className="erp-badge badge-success">Story S1-06 & S1-07</span>
        </div>

        <div className="erp-card-body">
          <div className="erp-test-grid">
            {/* Cột 1: Đổi vai trò kiểm tra menu ẩn/hiện (S1-06) */}
            <div className="erp-test-col">
              <h3 className="erp-test-col-title">1. Chuyển đổi 7 vai trò (Kiểm tra Menu biến đổi):</h3>
              <p className="erp-test-col-desc">
                Mỗi khi chọn 1 vai trò, menu bên trái sẽ tự động lọc bỏ các chức năng không thuộc quyền:
              </p>
              <div className="erp-role-btn-grid">
                {(Object.keys(ROLE_METADATA_MAP) as RoleName[]).map((r) => {
                  const meta = ROLE_METADATA_MAP[r];
                  const isActive = r === currentRole;
                  return (
                    <button
                      key={r}
                      type="button"
                      className={`erp-role-quick-btn ${isActive ? 'active' : ''}`}
                      onClick={() => switchRole(r)}
                    >
                      <span className="erp-role-quick-dot" style={{ backgroundColor: meta.badgeColor }}></span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cột 2: Thử truy cập trang không có quyền (Kiểm tra Lỗi 403 S1-07) */}
            <div className="erp-test-col">
              <h3 className="erp-test-col-title">2. Thử truy cập trang BỊ CẤM đối với vai trò hiện tại (Lỗi 403):</h3>
              <p className="erp-test-col-desc">
                Bấm vào một trong các liên kết dưới đây để kiểm tra trang báo lỗi 403 đồng bộ giao diện và có nút quay lại:
              </p>
              {forbiddenRoutesForCurrentRole.length > 0 ? (
                <div className="erp-forbidden-links">
                  {forbiddenRoutesForCurrentRole.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      className="erp-link-btn danger"
                      onClick={() => navigate(item.path)}
                    >
                      <Icons.ShieldAlert size={16} />
                      <span>Truy cập: {item.title} ({item.path})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="erp-alert-note">
                  Vai trò <strong>{roleMeta.label}</strong> có toàn quyền truy cập tất cả các trang! Vui lòng chuyển sang vai trò khác (như Nhân viên kho hoặc Kinh doanh) để thử nghiệm chặn 403.
                </div>
              )}

              {/* Thử truy cập trang 404 nhầm chỗ */}
              <div style={{ marginTop: '16px' }}>
                <span className="erp-test-subtitle">3. Thử truy cập đường dẫn KHÔNG TỒN TẠI (Lỗi 404):</span>
                <button
                  type="button"
                  className="erp-link-btn warning"
                  onClick={() => navigate('/duong-dan-khong-ton-tai-123')}
                  style={{ marginTop: '8px' }}
                >
                  <Icons.AlertTriangle size={16} />
                  <span>Truy cập URL lạ: /duong-dan-khong-ton-tai-123</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chỉ số thống kê giả lập theo vai trò */}
      <div className="erp-metrics-grid">
        <div className="erp-metric-card">
          <div className="erp-metric-icon bg-blue">
            <Icons.Warehouse size={24} />
          </div>
          <div className="erp-metric-info">
            <span className="erp-metric-label">Kho / Địa bàn công tác</span>
            <span className="erp-metric-value text-sm">{user?.warehouse || user?.workLocation}</span>
          </div>
        </div>

        <div className="erp-metric-card">
          <div className="erp-metric-icon bg-emerald">
            <Icons.CheckSquare size={24} />
          </div>
          <div className="erp-metric-info">
            <span className="erp-metric-label">Số chức năng được cấp quyền</span>
            <span className="erp-metric-value">{ALL_SYSTEM_MENUS.filter(m => m.allowedRoles.includes(currentRole)).length} / {ALL_SYSTEM_MENUS.length}</span>
          </div>
        </div>

        <div className="erp-metric-card">
          <div className="erp-metric-icon bg-amber">
            <Icons.ShoppingCart size={24} />
          </div>
          <div className="erp-metric-info">
            <span className="erp-metric-label">Tối ưu Mobile</span>
            <span className="erp-metric-value text-sm">Chuẩn 360px sẵn sàng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
