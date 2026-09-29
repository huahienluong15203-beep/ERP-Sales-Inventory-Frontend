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
    <div className="min-h-screen bg-[#F5F6F8] flex flex-row w-full antialiased font-sans">
      {/* 1. BACKDROP OVERLAY TRÊN MÀN HÌNH 360px (Bấm để đóng Drawer) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* 2. SIDEBAR ĐIỀU HƯỚNG PHÂN QUYỀN (CHUẨN NỀN TRẮNG & MENU PILL) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[270px] bg-white border-r border-gray-200/80 flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:static lg:h-screen lg:sticky ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 shadow-none'
        }`}
      >
        {/* Header của Sidebar */}
        <div className="h-[68px] px-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div
            className="flex items-center gap-3 cursor-pointer select-none transition-opacity hover:opacity-85"
            onClick={() => navigate('/dashboard')}
            title="Về bảng điều khiển"
          >
            <img src="/logo-cube.png" alt="ERP Logo" className="w-10 h-10 object-contain shrink-0 bg-transparent block" />
            <div className="flex flex-col">
              <span className="font-extrabold text-[13.5px] tracking-wide text-gray-900 leading-tight">
                ERP SALES & INVENTORY
              </span>
              <span className="text-[10.5px] text-orange-600 font-semibold tracking-wide">
                Bán Hàng & Quản Trị Kho
              </span>
            </div>
          </div>
          {/* Nút đóng Sidebar trên Mobile 360px */}
          <button
            type="button"
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <Icons.X size={22} />
          </button>
        </div>

        {/* Khối Thẻ VAI TRÒ HỆ THỐNG */}
        <div className="p-3.5 mx-3 mt-3 rounded-xl bg-gray-50/80 border border-gray-100 shrink-0">
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-400 flex items-center justify-between mb-1.5">
            <span>VAI TRÒ HỆ THỐNG</span>
            {user?.roles && user.roles.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">
                {user.roles.length} vai trò
              </span>
            )}
          </div>
          <div className="flex items-center justify-between font-bold text-teal-700 text-xs">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs ring-2 ring-emerald-500/20 shrink-0" />
              {user?.roles && user.roles.length > 1 ? (
                <select
                  value={currentRole}
                  onChange={(e) => switchRole(e.target.value as RoleName)}
                  className="bg-transparent font-bold text-gray-800 text-xs cursor-pointer border-none outline-none focus:ring-0 p-0 max-w-[170px]"
                  title="Chuyển đổi vai trò làm việc"
                >
                  {user.roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_METADATA_MAP[r]?.label || r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="truncate">{currentRoleMeta.label}</span>
              )}
            </div>
            {user?.roles && user.roles.length > 1 && (
              <Icons.ChevronDown size={14} className="text-gray-400 pointer-events-none" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1.5 truncate">
            <Icons.MapPin size={12} className="text-orange-500 shrink-0" />
            <span className="truncate" title={user?.warehouse || user?.workLocation}>
              {user?.warehouse || user?.workLocation || 'Trụ sở chính'}
            </span>
          </div>
        </div>

        {/* Danh sách Menu lọc theo quyền */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4" aria-label="Menu điều hướng hệ thống">
          {isLoading ? (
            <div className="p-4 space-y-2.5">
              <div className="h-9 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-9 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-9 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ) : menus.length === 0 ? (
            <div className="text-center py-8 px-2 text-gray-400">
              <Icons.AlertTriangle size={24} className="mx-auto mb-2 text-amber-500" />
              <p className="text-xs">Chưa có mục menu nào được cấp quyền.</p>
            </div>
          ) : (
            Object.entries(groupedMenus).map(([epicKey, items]) => (
              <div key={epicKey} className="space-y-1">
                <div className="px-3 text-[10.5px] font-bold text-gray-400 tracking-wider uppercase">
                  <span>{epicKey}</span>
                </div>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/25'
                              : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/70 font-semibold'
                          }`}
                          title={item.description}
                        >
                          <span className="shrink-0">
                            <DynamicIcon name={item.icon} size={18} />
                          </span>
                          <span className="truncate flex-1">{item.title}</span>
                          {item.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/20 text-white">
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

        {/* Nút Đăng Xuất dạng Pill cố định góc dưới bên trái */}
        <div className="p-3.5 border-t border-gray-100 shrink-0">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-bold text-red-600 bg-red-50/70 hover:bg-red-100 border border-red-100 transition-colors"
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F6F8]">
        {/* Topbar điều hướng trên cùng */}
        <header className="h-[68px] bg-white border-b border-gray-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3.5">
            {/* Nút Hamburger bật menu cho mobile */}
            <button
              type="button"
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Mở menu điều hướng"
              id="btn-mobile-menu-toggle"
            >
              <Icons.Menu size={22} />
            </button>

            {/* Tiêu đề trang + mô tả hoạt động bên dưới */}
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight leading-tight">
                {pageTitle}
              </h1>
              <span className="text-[11.5px] text-gray-500 font-medium hidden sm:inline">
                {pageSubtitle}
              </span>
            </div>
          </div>

          {/* Khối User Profile Avatar ở Header */}
          <div
            className="flex items-center gap-3 py-1.5 px-3 rounded-full hover:bg-gray-50 transition cursor-pointer border border-transparent hover:border-gray-200"
            onClick={() => navigate('/profile')}
            title="Xem hồ sơ cá nhân"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs ring-2 ring-orange-100">
              {getAvatarInitials(user?.fullName, currentRole)}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-800 leading-tight">
                {user?.fullName || 'Người Dùng'}
              </span>
              <span className="text-[10.5px] text-gray-400 font-mono">
                {user?.username || 'user'}
              </span>
            </div>
          </div>
        </header>

        {/* Nội dung trang */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};
