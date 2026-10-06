import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, RoleName } from '../../types/user';
import { ROLE_METADATA_MAP, getUserAvatarInitials } from '../../types/user';
import { Icons } from './Icons';
import { getAvatarFullUrl } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeMode } from '../../contexts/ThemeContext';

interface UserAvatarMenuProps {
  user: UserProfile | null;
  currentRole: RoleName;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const UserAvatarMenu: React.FC<UserAvatarMenuProps> = ({
  user,
  currentRole,
  onOpenProfile,
  onLogout
}) => {
  const { theme, actualTheme, setTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [isThemeSubmenuOpen, setIsThemeSubmenuOpen] = useState(false);
  const [isThemeLocked, setIsThemeLocked] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const themeItemRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đặt lại lỗi avatar khi URL thay đổi
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarThumbnailUrl, user?.avatarUrl]);

  // Hủy timeout khi unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsThemeSubmenuOpen(false);
        setIsThemeLocked(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsThemeSubmenuOpen(false);
        setIsThemeLocked(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleThemeMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsThemeSubmenuOpen(true);
  };

  const handleThemeMouseLeave = () => {
    if (isThemeLocked) return; // Nếu người dùng đã click để mở thì giữ nguyên, không đóng khi rê chuột ra ngoài
    closeTimeoutRef.current = setTimeout(() => {
      setIsThemeSubmenuOpen(false);
    }, 380); // Độ trễ 380ms giúp người dùng thong thả rê chuột sang, không bao giờ bị biến mất đột ngột
  };

  const handleToggleThemeClick = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsThemeSubmenuOpen((prev) => !prev);
    setIsThemeLocked((prev) => !prev);
  };

  const effectiveRole =
    user?.roles && user.roles.length > 0 && !user.roles.includes(currentRole)
      ? user.roles[0]
      : currentRole;
  const currentRoleMeta = ROLE_METADATA_MAP[effectiveRole as RoleName] || ROLE_METADATA_MAP['ROLE_ADMIN'];

  const getThemeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return 'Sáng';
      case 'dark':
        return 'Tối';
      case 'system':
        return 'Theo hệ thống';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Khối User Profile Avatar ở Header */}
      <button
        type="button"
        className={`erp-header-user-block flex items-center gap-2.5 px-3 py-1.5 rounded-2xl cursor-pointer transition-all border select-none ${
          isOpen
            ? isDark
              ? 'bg-[#202024] border-[#2c2c30] shadow-sm text-white'
              : 'bg-orange-50/90 border-orange-200 shadow-xs text-gray-900'
            : isDark
              ? 'border-transparent text-gray-200 hover:bg-[#202024]'
              : 'border-transparent text-gray-800 hover:bg-gray-100/80'
        }`}
        onClick={() => {
          setIsOpen(!isOpen);
          setIsThemeSubmenuOpen(false);
          setIsThemeLocked(false);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Tài khoản & Thiết lập"
      >
        <div className={`erp-header-avatar w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-tr from-[#FF6A00] to-[#EE4D2D] text-white flex items-center justify-center font-bold text-sm shadow-xs border-2 ${
          isDark ? 'border-[#27272a]' : 'border-white'
        }`}>
          {(user?.avatarThumbnailUrl || user?.avatarUrl) && !avatarError ? (
            <img
              src={getAvatarFullUrl(user.avatarThumbnailUrl || user.avatarUrl)}
              alt={user?.fullName || user?.username || 'Avatar'}
              onError={() => setAvatarError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            getUserAvatarInitials(user?.fullName || user?.username, currentRole)
          )}
        </div>

        <div className="erp-header-user-info hidden sm:flex flex-col text-left">
          <span className={`erp-header-fullname text-xs font-bold max-w-[130px] truncate leading-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {user?.fullName || 'Người Dùng'}
          </span>
          <span className={`erp-header-username text-[11px] max-w-[130px] truncate leading-tight ${
            isDark ? 'text-zinc-400' : 'text-gray-500'
          }`}>
            {user?.username || 'user'}
          </span>
        </div>

        <Icons.ChevronDown
          size={14}
          className={`transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#F85606]' : isDark ? 'text-zinc-400' : 'text-gray-400'
          }`}
        />
      </button>

      {/* Menu chính khi bấm vào ảnh đại diện */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl p-2 z-[999] animate-in fade-in zoom-in-95 duration-150 border ${
            isDark
              ? 'bg-[#18181b] border-[#27272a] text-zinc-100'
              : 'bg-white border-gray-100 text-gray-800'
          }`}
          style={{ transformOrigin: 'top right' }}
        >
          {/* Thông tin vắn tắt người dùng */}
          <div className={`px-3 py-2.5 mb-1.5 rounded-xl border ${
            isDark
              ? 'bg-[#202024] border-[#2c2c30]'
              : 'bg-orange-50/50 border-orange-100/70'
          }`}>
            <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {user?.fullName || 'Quản Trị Viên'}
            </p>
            <p className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              {user?.email || (user?.username ? `@${user.username}` : 'user@erp.com')}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isDark
                  ? 'bg-orange-950/80 text-orange-400 border border-orange-900/50'
                  : 'bg-orange-100 text-[#F85606] border border-orange-200/60'
              }`}>
                {currentRoleMeta.label}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {/* Tùy chọn 1: Hồ sơ cá nhân */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsThemeSubmenuOpen(false);
                setIsThemeLocked(false);
                onOpenProfile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                isDark
                  ? 'text-zinc-200 hover:bg-[#27272a] hover:text-white'
                  : 'text-gray-700 hover:bg-orange-50/70 hover:text-[#F85606]'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                <Icons.User size={16} />
              </span>
              <div className="flex-1">
                <span className="block leading-tight font-medium">Hồ sơ cá nhân</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-gray-400'
                }`}>
                  Xem & chỉnh sửa thông tin
                </span>
              </div>
            </button>

            {/* Tùy chọn 2: Chủ đề (Theme) với submenu nối liền không có khe hở chết */}
            <div
              ref={themeItemRef}
              className="relative"
              onMouseEnter={handleThemeMouseEnter}
              onMouseLeave={handleThemeMouseLeave}
            >
              <button
                type="button"
                onClick={handleToggleThemeClick}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isThemeSubmenuOpen
                    ? isDark
                      ? 'bg-[#27272a] text-orange-400'
                      : 'bg-orange-50 text-[#F85606]'
                    : isDark
                      ? 'text-zinc-200 hover:bg-[#27272a]'
                      : 'text-gray-700 hover:bg-orange-50/70'
                }`}
                title="Bấm hoặc rê chuột để chọn Sáng / Tối"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {/* Icon Theme hình tròn chia đôi sáng/tối */}
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 1 0 20Z" fill="currentColor" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block leading-tight font-medium">Chủ đề</span>
                    <span className={`block text-[10px] leading-tight mt-0.5 ${
                      isDark ? 'text-zinc-400' : 'text-gray-400'
                    }`}>
                      {getThemeLabel(theme)}
                    </span>
                  </div>
                </div>

                <Icons.ChevronRight
                  size={15}
                  className={`transition-transform duration-200 ${
                    isThemeSubmenuOpen ? 'translate-x-0.5 text-[#F85606]' : isDark ? 'text-zinc-400' : 'text-gray-400'
                  }`}
                />
              </button>

              {/* Bảng chọn Theme: Flyout sang trái trên desktop hoặc xổ xuống trên mobile (Chuẩn Ảnh 2) */}
              {isThemeSubmenuOpen && (
                <div
                  className="sm:absolute sm:right-full sm:top-0 sm:pr-2 w-full sm:w-60 z-[1000] mt-1 sm:mt-0"
                  onMouseEnter={handleThemeMouseEnter}
                  onMouseLeave={handleThemeMouseLeave}
                >
                  <div
                    className={`w-full rounded-2xl shadow-2xl p-2 border ${
                      isDark
                        ? 'bg-[#18181b] border-[#27272a] text-zinc-100'
                        : 'bg-white border-gray-100 text-gray-800'
                    }`}
                  >
                    <div className={`px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-zinc-400' : 'text-gray-400'
                    }`}>
                      Chọn giao diện
                    </div>

                    <div className="space-y-1">
                      {/* 1. Giao diện Sáng (Light) */}
                      <button
                        type="button"
                        onClick={() => {
                          setTheme('light');
                          setIsThemeSubmenuOpen(false);
                          setIsThemeLocked(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left cursor-pointer ${
                          theme === 'light'
                            ? isDark
                              ? 'bg-[#27272a] text-orange-400 font-semibold'
                              : 'bg-orange-50 text-[#F85606] font-semibold'
                            : isDark
                              ? 'hover:bg-[#242428] text-zinc-300'
                              : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {/* Radio button */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          theme === 'light' ? 'border-[#F85606]' : isDark ? 'border-zinc-500' : 'border-gray-300'
                        }`}>
                          {theme === 'light' && <div className="w-2 h-2 rounded-full bg-[#F85606]" />}
                        </div>

                        {/* Mockup Preview Sáng (Chuẩn Ảnh 2) */}
                        <div className="w-11 h-7 rounded-md border border-slate-300 bg-white p-1 flex flex-col justify-between shadow-2xs shrink-0">
                          <div className="h-1 w-3.5 bg-blue-500 rounded-full" />
                          <div className="flex gap-1 items-start flex-1 mt-0.5">
                            <div className="w-1.5 h-3 bg-slate-200 rounded-xs" />
                            <div className="flex-1 space-y-0.5">
                              <div className="h-0.5 w-full bg-slate-300 rounded-xs" />
                              <div className="h-0.5 w-2/3 bg-slate-200 rounded-xs" />
                            </div>
                          </div>
                        </div>

                        <span className="text-xs">Sáng</span>
                      </button>

                      {/* 2. Giao diện Tối (Dark) */}
                      <button
                        type="button"
                        onClick={() => {
                          setTheme('dark');
                          setIsThemeSubmenuOpen(false);
                          setIsThemeLocked(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left cursor-pointer ${
                          theme === 'dark'
                            ? isDark
                              ? 'bg-[#27272a] text-orange-400 font-semibold'
                              : 'bg-orange-50 text-[#F85606] font-semibold'
                            : isDark
                              ? 'hover:bg-[#242428] text-zinc-300'
                              : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {/* Radio button */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          theme === 'dark' ? 'border-[#F85606]' : isDark ? 'border-zinc-500' : 'border-gray-300'
                        }`}>
                          {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-[#F85606]" />}
                        </div>

                        {/* Mockup Preview Tối Thuần Túy Không Xanh (Chuẩn Ảnh 2) */}
                        <div className="w-11 h-7 rounded-md border border-zinc-700 bg-[#121214] p-1 flex flex-col justify-between shadow-2xs shrink-0">
                          <div className="h-1 w-3.5 bg-blue-400 rounded-full" />
                          <div className="flex gap-1 items-start flex-1 mt-0.5">
                            <div className="w-1.5 h-3 bg-zinc-700 rounded-xs" />
                            <div className="flex-1 space-y-0.5">
                              <div className="h-0.5 w-full bg-zinc-600 rounded-xs" />
                              <div className="h-0.5 w-2/3 bg-zinc-700 rounded-xs" />
                            </div>
                          </div>
                        </div>

                        <span className="text-xs">Tối</span>
                      </button>

                      {/* 3. Theo hệ thống (Match browser) */}
                      <button
                        type="button"
                        onClick={() => {
                          setTheme('system');
                          setIsThemeSubmenuOpen(false);
                          setIsThemeLocked(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left cursor-pointer ${
                          theme === 'system'
                            ? isDark
                              ? 'bg-[#27272a] text-orange-400 font-semibold'
                              : 'bg-orange-50 text-[#F85606] font-semibold'
                            : isDark
                              ? 'hover:bg-[#242428] text-zinc-300'
                              : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {/* Radio button */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          theme === 'system' ? 'border-[#F85606]' : isDark ? 'border-zinc-500' : 'border-gray-300'
                        }`}>
                          {theme === 'system' && <div className="w-2 h-2 rounded-full bg-[#F85606]" />}
                        </div>

                        {/* Mockup Preview Nửa Tối / Nửa Sáng (Chuẩn Ảnh 2) */}
                        <div className="w-11 h-7 rounded-md border border-zinc-500 flex overflow-hidden shadow-2xs shrink-0">
                          <div className="w-1/2 h-full bg-[#121214] p-0.5 flex flex-col justify-between border-r border-zinc-700">
                            <div className="h-1 w-2.5 bg-blue-400 rounded-full" />
                            <div className="space-y-0.5 mt-0.5">
                              <div className="h-0.5 w-full bg-zinc-600 rounded-xs" />
                              <div className="h-0.5 w-2/3 bg-zinc-700 rounded-xs" />
                            </div>
                          </div>
                          <div className="w-1/2 h-full bg-white p-0.5 flex flex-col justify-between">
                            <div className="h-1 w-2.5 bg-blue-500 rounded-full" />
                            <div className="space-y-0.5 mt-0.5">
                              <div className="h-0.5 w-full bg-slate-300 rounded-xs" />
                              <div className="h-0.5 w-2/3 bg-slate-200 rounded-xs" />
                            </div>
                          </div>
                        </div>

                        <span className="text-xs">Theo hệ thống</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Đường phân cách */}
            <div className={`my-1 border-t ${isDark ? 'border-[#27272a]' : 'border-gray-100'}`} />

            {/* Tùy chọn 3: Đăng xuất */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsThemeSubmenuOpen(false);
                setIsThemeLocked(false);
                onLogout();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                isDark
                  ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                  : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-rose-950/60 text-rose-400' : 'bg-rose-50 text-rose-600'
              }`}>
                <Icons.LogOut size={16} />
              </span>
              <div className="flex-1">
                <span className="block leading-tight font-medium">Đăng xuất</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${
                  isDark ? 'text-rose-400/80' : 'text-rose-400'
                }`}>
                  Thoát phiên làm việc an toàn
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
