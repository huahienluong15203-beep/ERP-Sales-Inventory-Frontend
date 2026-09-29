import React, { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link } from '../routes/Router';
import { ROLE_METADATA_MAP, RoleName } from '../types/user';
import { Icons, DynamicIcon } from '../components/common/Icons';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, menus, currentRole, switchRole, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Trạng thái mở/đóng Sidebar trên Mobile (tối ưu hóa màn hình 360px)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  // Trạng thái mở Dropdown chuyển nhanh vai trò
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState<boolean>(false);

  // Đóng Mobile Drawer khi đổi route
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsRoleDropdownOpen(false);
  }, [location.pathname]);

  // Ngăn cuộn trang body khi Drawer mobile mở trên màn hình 360px
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const currentRoleMeta = ROLE_METADATA_MAP[currentRole];

  // Gom nhóm menu theo Epic để giao diện chuyên nghiệp như hệ thống ERP chuẩn
  const groupedMenus: Record<string, typeof menus> = {};
  menus.forEach((item) => {
    const epic = item.epic || 'Hệ thống';
    if (!groupedMenus[epic]) {
      groupedMenus[epic] = [];
    }
    groupedMenus[epic].push(item);
  });

  const allRoles: RoleName[] = [
    'ROLE_ADMIN',
    'ROLE_SALES_REP',
    'ROLE_SALES_MANAGER',
    'ROLE_WAREHOUSE',
    'ROLE_WH_MANAGER',
    'ROLE_ACCOUNTANT',
    'ROLE_CUSTOMER'
  ];

  return (
    <div className="erp-app-shell">
      {/* 1. BACKDROP OVERLAY TRÊN MÀN HÌNH 360px (Bấm vào vùng mờ để đóng Drawer) */}
      {isMobileMenuOpen && (
        <div
          className="erp-mobile-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* 2. SIDEBAR ĐIỀU HƯỚNG PHÂN QUYỀN (Story S1-06) */}
      <aside className={`erp-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {/* Header của Sidebar */}
        <div className="erp-sidebar-header">
          <div className="erp-logo-brand" onClick={() => navigate('/dashboard')}>
            <div className="erp-logo-icon">
              <Icons.Warehouse size={22} className="text-brand" />
            </div>
            <div className="erp-logo-text">
              <span className="erp-brand-title">ERP SALES & WH</span>
              <span className="erp-brand-sub">Quản trị Bán hàng & Kho</span>
            </div>
          </div>
          {/* Nút đóng Sidebar trên Mobile 360px */}
          <button
            type="button"
            className="erp-mobile-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <Icons.X size={22} />
          </button>
        </div>

        {/* Danh sách Menu lọc theo quyền (Chỉ hiển thị menu thuộc quyền) */}
        <nav className="erp-sidebar-nav" aria-label="Menu điều hướng hệ thống">
          {isLoading ? (
            <div className="erp-menu-skeleton">
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
            </div>
          ) : menus.length === 0 ? (
            <div className="erp-empty-menu">
              <Icons.AlertTriangle size={24} />
              <p>Chưa có mục menu nào được cấp quyền.</p>
            </div>
          ) : (
            Object.entries(groupedMenus).map(([epicKey, items]) => (
              <div key={epicKey} className="erp-menu-group">
                <div className="erp-menu-group-title">
                  <span>{epicKey}</span>
                </div>
                <ul className="erp-menu-list">
                  {items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path} className="erp-menu-item">
                        <Link
                          to={item.path}
                          className={`erp-menu-link ${isActive ? 'active' : ''}`}
                          title={item.description}
                        >
                          <span className="erp-menu-icon">
                            <DynamicIcon name={item.icon} size={18} />
                          </span>
                          <span className="erp-menu-title">{item.title}</span>
                          {item.badge && (
                            <span className={`erp-menu-badge ${item.badge === '360px' ? 'badge-mobile' : ''}`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>

        {/* 3. PROFILE CARD THÔNG TIN NGƯỜI DÙNG Ở CHÂN SIDEBAR (Story S1-06 Tiêu chí 2) */}
        {/* "Hiển thị tên, vai trò và kho hoặc địa bàn đang làm việc" */}
        <div className="erp-sidebar-footer">
          <div className="erp-profile-card">
            <div className="erp-profile-top">
              <div className="erp-avatar">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="erp-profile-names">
                <span className="erp-user-fullname" title={user?.fullName}>
                  {user?.fullName || 'Đang tải...'}
                </span>
                <span
                  className="erp-user-role-badge"
                  style={{
                    backgroundColor: currentRoleMeta.badgeBg,
                    color: currentRoleMeta.badgeColor,
                    borderColor: currentRoleMeta.badgeColor + '40'
                  }}
                >
                  {currentRoleMeta.label}
                </span>
              </div>
            </div>

            {/* Kho hoặc địa bàn đang làm việc */}
            <div className="erp-profile-location">
              <div className="erp-location-row">
                <Icons.MapPin size={14} className="erp-loc-icon" />
                <span className="erp-loc-text" title={user?.warehouse || user?.workLocation}>
                  {user?.warehouse || user?.workLocation || 'Trụ sở điều hành'}
                </span>
              </div>
            </div>

            {/* Nút Đăng xuất */}
            <div className="erp-profile-actions">
              <button
                type="button"
                className="erp-profile-logout-btn"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                title="Đăng xuất khỏi hệ thống"
              >
                <Icons.LogOut size={13} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 4. KHU VỰC NỘI DUNG CHÍNH (MAIN CONTENT) */}
      <div className="erp-main-area">
        {/* Topbar điều hướng trên cùng */}
        <header className="erp-topbar">
          <div className="erp-topbar-left">
            {/* Nút Hamburger bật menu cho mobile (Touch-friendly 44px x 44px) */}
            <button
              type="button"
              className="erp-hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Mở menu điều hướng"
              id="btn-mobile-menu-toggle"
            >
              <Icons.Menu size={22} />
            </button>

            {/* Breadcrumb và tiêu đề phân hệ */}
            <div className="erp-topbar-breadcrumb">
              <span className="erp-bc-root">ERP</span>
              <span className="erp-bc-divider">/</span>
              <span className="erp-bc-current">
                {menus.find((m) => m.path === location.pathname)?.title ||
                  (location.pathname === '/forbidden' ? '403 Forbidden' : 'Tổng quan')}
              </span>
            </div>
          </div>

          <div className="erp-topbar-right">
            {/* DROPDOWN CHUYỂN NHANH VAI TRÒ (Hỗ trợ demo & chấm bài) */}
            <div className="erp-role-switcher-container">
              <button
                type="button"
                className="erp-role-selector-btn"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                id="btn-role-switcher"
                title="Bấm để đổi vai trò kiểm tra menu phân quyền"
              >
                <div
                  className="erp-role-dot"
                  style={{ backgroundColor: currentRoleMeta.badgeColor }}
                />
                <span className="erp-role-selector-label">{currentRoleMeta.label}</span>
                <Icons.ChevronDown size={14} className={`erp-chevron ${isRoleDropdownOpen ? 'rotate' : ''}`} />
              </button>

              {isRoleDropdownOpen && (
                <div className="erp-role-dropdown-menu">
                  <div className="erp-role-dropdown-header">
                    <span>Chọn 1 trong 7 vai trò để thử nghiệm:</span>
                  </div>
                  <div className="erp-role-options">
                    {allRoles.map((role) => {
                      const meta = ROLE_METADATA_MAP[role];
                      const isSelected = role === currentRole;
                      return (
                        <button
                          key={role}
                          type="button"
                          className={`erp-role-option-item ${isSelected ? 'selected' : ''}`}
                          onClick={async () => {
                            await switchRole(role);
                            setIsRoleDropdownOpen(false);
                          }}
                        >
                          <div className="erp-role-option-left">
                            <span
                              className="erp-role-pill"
                              style={{ backgroundColor: meta.badgeBg, color: meta.badgeColor }}
                            >
                              {meta.label}
                            </span>
                            <span className="erp-role-desc">{meta.description}</span>
                          </div>
                          {isSelected && <Icons.Check size={16} className="text-brand" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Huy hiệu kho / địa bàn trên Topbar */}
            <div className="erp-topbar-location-badge" title="Kho / Địa bàn làm việc hiện tại">
              <Icons.Warehouse size={15} />
              <span className="erp-tb-loc-text">{user?.warehouse || 'Toàn hệ thống'}</span>
            </div>

            {/* Nút Đăng xuất trên Topbar */}
            <button
              type="button"
              className="erp-topbar-logout-btn"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              title="Đăng xuất khỏi hệ thống"
              id="btn-topbar-logout"
            >
              <Icons.LogOut size={16} />
              <span className="erp-tb-logout-text">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Nội dung trang */}
        <main className="erp-page-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};
