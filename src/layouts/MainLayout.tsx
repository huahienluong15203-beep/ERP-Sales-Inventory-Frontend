import { useState, useEffect } from 'react';
import type { FC, ReactNode, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link } from '../routes/Router';
import { ROLE_METADATA_MAP } from '../types/user';
import type { RoleName } from '../types/user';
import { Icons, DynamicIcon } from '../components/common/Icons';
import { changePasswordApi } from '../services/api';
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: FC<MainLayoutProps> = ({ children }) => {
  const { user, menus, currentRole, switchRole, logout, isLoading, clearMustChangePassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Trạng thái mở/đóng Sidebar trên Mobile (tối ưu hóa màn hình 360px)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Hộp xác nhận đăng xuất
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);



  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
      navigate('/login');
    }
  };

  // Đóng Mobile Drawer khi đổi route
  useEffect(() => {
    setIsMobileMenuOpen(false);
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

  // Đảm bảo vai trò hiển thị luôn là vai trò hợp lệ thuộc user.roles
  const effectiveRole =
    user?.roles && user.roles.length > 0 && !user.roles.includes(currentRole)
      ? user.roles[0]
      : currentRole;
  const currentRoleMeta = ROLE_METADATA_MAP[effectiveRole] || ROLE_METADATA_MAP['ROLE_ADMIN'];

  // Bắt buộc đổi mật khẩu lần đầu (S1-04 + S1-08)
  const isMustChangePassword = Boolean(user?.mustChangePassword);
  const [forceOldPassword, setForceOldPassword] = useState('');
  const [forceNewPassword, setForceNewPassword] = useState('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState('');
  const [forceShowOldPassword, setForceShowOldPassword] = useState(false);
  const [forceShowNewPassword, setForceShowNewPassword] = useState(false);
  const [forceShowConfirmPassword, setForceShowConfirmPassword] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const [forceSuccess, setForceSuccess] = useState<string | null>(null);
  const [forceSubmitting, setForceSubmitting] = useState(false);

  const handleForceChangePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForceError(null);
    setForceSuccess(null);

    if (!forceOldPassword) {
      setForceError('Vui lòng nhập mật khẩu hiện tại hoặc mật khẩu tạm thời!');
      return;
    }
    if (forceNewPassword.length < 8 || !/[a-zA-Z]/.test(forceNewPassword) || !/[0-9]/.test(forceNewPassword)) {
      setForceError('Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm cả chữ cái và chữ số!');
      return;
    }
    if (forceNewPassword !== forceConfirmPassword) {
      setForceError('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }
    if (forceNewPassword === forceOldPassword) {
      setForceError('Mật khẩu mới không được trùng với mật khẩu hiện tại/tạm thời!');
      return;
    }

    setForceSubmitting(true);
    try {
      const res = await changePasswordApi(forceOldPassword, forceNewPassword, forceConfirmPassword);
      if (res.success) {
        setForceSuccess('Đổi mật khẩu thành công! Chào mừng bạn đến với hệ thống ERP.');
        setTimeout(() => {
          clearMustChangePassword();
        }, 1000);
      } else {
        setForceError(res.message);
      }
    } catch {
      setForceError('Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại sau!');
    } finally {
      setForceSubmitting(false);
    }
  };

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

  // Lấy tiêu đề và mô tả của trang hiện tại cho Header
  const currentMenu = menus.find((m) => m.path === location.pathname);
  const pageTitle =
    location.pathname === '/forbidden'
      ? '403 Truy Cập Bị Từ Chối'
      : location.pathname === '/profile'
        ? 'Hồ Sơ Cá Nhân'
        : currentMenu?.title || 'Bảng Điều Khiển Bán Hàng & Kho';
  const pageSubtitle =
    location.pathname === '/profile'
      ? 'Thông tin cá nhân & thiết lập an toàn tài khoản'
      : currentMenu?.description || 'Tổng quan hoạt động bán hàng, tồn kho và phân tích hệ thống';

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

      {/* 2. SIDEBAR ĐIỀU HƯỚNG PHÂN QUYỀN  - NỀN TRẮNG & MENU PILL) */}
      <aside className={`erp-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {/* Header của Sidebar */}
        <div className="erp-sidebar-header">
          <div className="erp-logo-brand" onClick={() => navigate('/dashboard')} title="Về bảng điều khiển">
            <img src="/logo-cube.png" alt="ERP Logo" className="erp-logo-img" />
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

        {/* Khối Thẻ VAI TRÒ HỆ THỐNG  */}
        <div className="erp-sidebar-role-badge">
          <div className="erp-sidebar-role-title flex items-center justify-between">
            <span>VAI TRÒ HỆ THỐNG</span>

          </div>
          <div className="erp-sidebar-role-name flex items-center justify-between">
            {user?.roles && user.roles.length > 1 ? (
              <div className="relative flex items-center w-full">
                <select
                  value={effectiveRole}
                  onChange={(e) => switchRole(e.target.value as RoleName)}
                  style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                  className="w-full bg-transparent font-bold text-gray-800 text-xs cursor-pointer border-none outline-none focus:ring-0 p-0 pr-5 truncate"
                  title="Chuyển đổi vai trò làm việc"
                >
                  {user.roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_METADATA_MAP[r]?.label || r}
                    </option>
                  ))}
                </select>
                <Icons.ChevronDown size={14} className="absolute right-0 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span>{currentRoleMeta.label}</span>
              </div>
            )}
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
            onClick={() => setShowLogoutConfirm(true)}
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

      {/* 3. MODAL BẮT BUỘC ĐỔI MẬT KHẨU LẦN ĐẦU (S1-04 & S1-08) */}
      {isMustChangePassword && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
          style={{ animation: 'fadeIn 0.25s ease' }}
        >
          <div
            className="w-full max-w-[460px] bg-white rounded-3xl border border-slate-200 shadow-2xl p-7 relative"
            style={{ animation: 'scaleIn 0.25s ease' }}
          >
            {/* Header Modal */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 inline-flex items-center justify-center mb-3 shadow-inner">
                <Icons.Lock size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Đổi Mật Khẩu Lần Đầu Bắt Buộc
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Tài khoản <span className="font-semibold text-slate-700">@{user?.username}</span> được khởi tạo với mật khẩu tạm thời. Vì an toàn bảo mật, bạn bắt buộc phải tạo mật khẩu mới để tiếp tục.
              </p>
            </div>

            {/* Thông báo lỗi / thành công */}
            {forceError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <Icons.AlertCircle size={16} className="flex-shrink-0" />
                <span>{forceError}</span>
              </div>
            )}
            {forceSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center gap-2">
                <Icons.CheckCircle2 size={16} className="flex-shrink-0" />
                <span>{forceSuccess}</span>
              </div>
            )}

            <form onSubmit={handleForceChangePasswordSubmit} className="space-y-4">
              {/* Mật khẩu tạm / hiện tại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu tạm thời (Admin cấp) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={forceShowOldPassword ? 'text' : 'password'}
                    value={forceOldPassword}
                    onChange={(e) => setForceOldPassword(e.target.value)}
                    required
                    placeholder="Nhập mật khẩu tạm hiện tại"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setForceShowOldPassword(!forceShowOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {forceShowOldPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={forceShowNewPassword ? 'text' : 'password'}
                    value={forceNewPassword}
                    onChange={(e) => setForceNewPassword(e.target.value)}
                    required
                    placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setForceShowNewPassword(!forceShowNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {forceShowNewPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                  </button>
                </div>
                {/* Checklist tiêu chí mật khẩu */}
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${forceNewPassword.length >= 8 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <Icons.CheckCircle2 size={12} />
                    <span>Ít nhất 8 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${(/[a-zA-Z]/.test(forceNewPassword) && /[0-9]/.test(forceNewPassword)) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <Icons.CheckCircle2 size={12} />
                    <span>Chứa cả chữ và số</span>
                  </div>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={forceShowConfirmPassword ? 'text' : 'password'}
                    value={forceConfirmPassword}
                    onChange={(e) => setForceConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setForceShowConfirmPassword(!forceShowConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {forceShowConfirmPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={forceSubmitting}
                  className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {forceSubmitting ? (
                    <Icons.RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <span>Cập Nhật Mật Khẩu & Bắt Đầu</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium cursor-pointer"
                >
                  Đăng xuất tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. HỘP XÁC NHẬN ĐĂNG XUẤT */}
      <LogoutConfirmModal
        open={showLogoutConfirm}
        loading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />


    </div>
  );
};
