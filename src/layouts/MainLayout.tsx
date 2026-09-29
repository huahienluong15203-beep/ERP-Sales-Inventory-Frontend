import { useState, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link } from '../routes/Router';
import { ROLE_METADATA_MAP } from '../types/user';
import type { RoleName } from '../types/user';
import { Icons, DynamicIcon } from '../components/common/Icons';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: FC<MainLayoutProps> = ({ children }) => {
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

  // Lấy 2 chữ cái đầu viết tắt cho Avatar (chuẩn App ETC)
  const getAvatarInitials = (name?: string, roleStr?: string): string => {
    if (!name) return 'EP';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    if (roleStr) {
      return roleStr.replace('ROLE_', '').slice(0, 2).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Gom nhóm menu theo Epic để giao diện chuyên nghiệp
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

  // Lấy tiêu đề và mô tả của trang hiện tại cho Header
  const currentMenu = menus.find((m) => m.path === location.pathname);
  const pageTitle =
    location.pathname === '/forbidden'
      ? '403 Truy Cập Bị Từ Chối'
      : location.pathname === '/profile'
        ? 'Hồ Sơ Cá Nhân'
        : currentMenu?.title || 'Bảng Điều Khiển Bán Hàng & Kho';
  const pageSubtitle =
    currentMenu?.description || 'Tổng quan hoạt động bán hàng, tồn kho và phân tích hệ thống';

  return (
    <div className="erp-app-shell">
      {/* 1. BACKDROP OVERLAY TRÊN MÀN HÌNH 360px (Bấm để đóng Drawer) */}
      {isMobileMenuOpen && (
        <div
          className="erp-mobile-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* 2. SIDEBAR ĐIỀU HƯỚNG PHÂN QUYỀN (CHUẨN APP ETC - NỀN TRẮNG & MENU PILL) */}
      <aside className={`erp-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {/* Header của Sidebar */}
        <div className="erp-sidebar-header">
          <div className="erp-logo-brand" onClick={() => navigate('/dashboard')}>
            <div className="erp-logo-icon">
              <img src="/logo-cube.png" alt="ERP Logo" style={{ width: '44px', height: 'auto', display: 'block' }} />
            </div>
            <div className="erp-logo-text">
              <span className="erp-brand-title">ERP SALES & INVENTORY</span>
              <span className="erp-brand-sub">Bán Hàng & Quản Trị Kho</span>
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

        {/* Khối Thẻ VAI TRÒ HỆ THỐNG (Chuẩn App ETC) */}
        <div className="erp-sidebar-role-badge">
          <div className="erp-sidebar-role-title">VAI TRÒ HỆ THỐNG</div>
          <div className="erp-sidebar-role-name">
            <span className="erp-role-dot-online" />
            <span>{currentRoleMeta.label}</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#6B7280',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Icons.MapPin size={12} color="#F85606" />
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '220px'
              }}
              title={user?.warehouse || user?.workLocation}
            >
              {user?.warehouse || user?.workLocation || 'Trụ sở chính'}
            </span>
          </div>
        </div>

        {/* Danh sách Menu lọc theo quyền (Story S1-06: Chỉ hiển thị menu thuộc quyền) */}
        <nav className="erp-sidebar-nav" aria-label="Menu điều hướng hệ thống">
          {isLoading ? (
            <div style={{ padding: '20px 10px' }}>
              <div
                style={{
                  height: '38px',
                  background: '#F3F4F6',
                  borderRadius: '9999px',
                  marginBottom: '10px'
                }}
              />
              <div
                style={{
                  height: '38px',
                  background: '#F3F4F6',
                  borderRadius: '9999px',
                  marginBottom: '10px'
                }}
              />
              <div style={{ height: '38px', background: '#F3F4F6', borderRadius: '9999px' }} />
            </div>
          ) : menus.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#9CA3AF' }}>
              <Icons.AlertTriangle size={24} />
              <p style={{ fontSize: '13px', marginTop: '6px' }}>
                Chưa có mục menu nào được cấp quyền.
              </p>
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
                            <span className="erp-menu-badge">{item.badge}</span>
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

        {/* Nút Đăng Xuất dạng Pill cố định góc dưới bên trái (như App ETC) */}
        <div className="erp-sidebar-footer">
          <button
            type="button"
            className="erp-sidebar-logout-btn"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            title="Đăng xuất khỏi hệ thống"
          >
            <Icons.LogOut size={16} />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </aside>

      {/* 3. KHU VỰC NỘI DUNG CHÍNH (MAIN AREA) */}
      <div className="erp-main-area">
        {/* Topbar điều hướng trên cùng (Chuẩn App ETC) */}
        <header className="erp-topbar">
          <div className="erp-topbar-left">
            {/* Nút Hamburger bật menu cho mobile (Touch target 44px x 44px) */}
            <button
              type="button"
              className="erp-hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Mở menu điều hướng"
              id="btn-mobile-menu-toggle"
            >
              <Icons.Menu size={22} />
            </button>

            {/* Tiêu đề trang + mô tả hoạt động bên dưới */}
            <div className="erp-page-title-box">
              <h1 className="erp-page-heading">{pageTitle}</h1>
              <span className="erp-page-subheading">{pageSubtitle}</span>
            </div>
          </div>





          {/* Khối User Profile Avatar ở Header (như App ETC) */}
          <div
            className="erp-header-user-block"
            onClick={() => navigate('/profile')}
            title="Xem hồ sơ cá nhân"
          >
            <div className="erp-header-avatar">
              {getAvatarInitials(user?.fullName, currentRole)}
            </div>
            <div className="erp-header-user-info">
              <span className="erp-header-fullname">
                {user?.fullName || 'Người Dùng'}
              </span>
              <span className="erp-header-username">
                {user?.username || 'user'}
              </span>
            </div>
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
