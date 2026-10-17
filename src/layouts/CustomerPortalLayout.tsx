import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  ShoppingCart,
  LogOut,
  ChevronDown,
  Layers,
  Clock,
  Sparkles,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../routes/Router';
import { ROLE_METADATA_MAP, getUserAvatarInitials, type RoleName } from '../types/user';
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';
import type { Agency, CreditStatusResponse } from '../types/agency';
import { getAvatarFullUrl } from '../services/api';
import { SearchSelect } from '../components/common/SearchSelect';
import { AgencyNotificationBell } from '../components/common/AgencyNotificationBell';
import { PaymentReminderPopupModal } from '../components/debt/PaymentReminderPopupModal';
import {
  fetchRecentNotifications,
  fetchUnreadNotificationCount
} from '../services/notificationApi';

interface CustomerPortalLayoutProps {
  children: ReactNode;
  agency?: Agency | null;
  creditStatus?: CreditStatusResponse | null;
  cartItemCount?: number;
  cartTotalAmount?: number;
  onOpenCart?: () => void;
  activeTab?: 'catalog' | 'history' | 'debt' | 'cart';
  onChangeTab?: (tab: 'catalog' | 'history' | 'debt' | 'cart') => void;
}

/**
 * S4-10: Layout portal riêng cho Đại lý phân phối B2B
 * - Giao diện thanh menu bên tay trái (Sidebar) đồng bộ hoàn toàn với phong cách Admin
 * - Hỗ trợ thu gọn/mở rộng sidebar và thanh điều hướng trên mobile
 * - Giữ nguyên toàn bộ trạng thái công nợ và giỏ hàng
 */
export const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({
  children,
  agency,
  creditStatus: _creditStatus,
  cartItemCount = 0,
  cartTotalAmount: _cartTotalAmount,
  onOpenCart: _onOpenCart,
  activeTab = 'catalog',
  onChangeTab
}) => {
  const { user, currentRole, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [isReminderPopupOpen, setIsReminderPopupOpen] = useState<boolean>(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Đóng popover thông tin tài khoản khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountMenuOpen]);

  // Trạng thái Sidebar: thu gọn trên Desktop & mở Drawer trên Mobile (đồng bộ Admin)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    // S7-08: Tự động hiển thị popup nhắc hạn thanh toán cho đại lý nếu có khoản nợ sắp đến hạn hoặc quá hạn
    const checkPaymentReminders = async () => {
      const isDismissed = sessionStorage.getItem('dismissed_payment_reminder_popup');
      if (isDismissed) return;

      try {
        const unreadCount = await fetchUnreadNotificationCount();
        if (unreadCount > 0) {
          const items = await fetchRecentNotifications();
          const hasReminders = items.some(
            (n) => !n.isRead && (n.notificationType === 'PAYMENT_DUE_SOON' || n.notificationType === 'PAYMENT_OVERDUE')
          );
          if (hasReminders) {
            setIsReminderPopupOpen(true);
          }
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra nhắc nợ popup:', err);
      }
    };
    checkPaymentReminders();
  }, []);

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


  return (
    <div className="erp-app-shell">
      {/* 1. BACKDROP OVERLAY TRÊN MOBILE */}
      {isMobileMenuOpen && (
        <div
          className="erp-mobile-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* 2. THANH MENU NẰM VỀ PHÍA TAY TRÁI (SIDEBAR ĐỒNG BỘ GIAO DIỆN ADMIN) */}
      <aside className={`erp-sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Header của Sidebar */}
        <div className="erp-sidebar-header">
          <div
            className="erp-logo-brand"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <img src="/logo-cube.png" alt="ERP Logo" className="erp-logo-img" />
            {!isSidebarCollapsed && (
              <div className="erp-logo-text">
                <span className="erp-brand-title">B2B PORTAL</span>
                <span className="erp-brand-sub">Cổng Đại Lý Phân Phối</span>
              </div>
            )}
          </div>

          {/* Nút đóng Sidebar trên Mobile */}
          <button
            type="button"
            className="erp-mobile-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Điều Hướng Phía Bên Trái */}
        <nav className="erp-sidebar-nav" aria-label="Menu cổng đại lý">
          <ul className="erp-menu-list">
            <li className="erp-menu-group" aria-hidden={isSidebarCollapsed}>
              {isSidebarCollapsed ? <span className="erp-menu-group-divider" /> : 'Chức Năng Đại Lý'}
            </li>

            {/* Mục 1: Đặt hàng sản phẩm */}
            <li className="erp-menu-item">
              <button
                type="button"
                onClick={() => {
                  onChangeTab?.('catalog');
                  setIsMobileMenuOpen(false);
                }}
                className={`erp-menu-link w-full text-left cursor-pointer ${activeTab === 'catalog' ? 'active' : ''}`}
                title="Danh mục sản phẩm đặt hàng"
              >
                <span className="erp-menu-icon">
                  <Sparkles size={18} />
                </span>
                {!isSidebarCollapsed && (
                  <span className="erp-menu-title">Đặt hàng sản phẩm</span>
                )}
              </button>
            </li>

            {/* Mục 2: Giỏ hàng & Xác nhận đặt */}
            <li className="erp-menu-item">
              <button
                type="button"
                onClick={() => {
                  onChangeTab?.('cart');
                  setIsMobileMenuOpen(false);
                }}
                className={`erp-menu-link w-full text-left cursor-pointer ${activeTab === 'cart' ? 'active' : ''}`}
                title="Giỏ hàng và xác nhận đặt mua"
              >
                <span className="erp-menu-icon">
                  <ShoppingCart size={18} />
                </span>
                {!isSidebarCollapsed && (
                  <span className="erp-menu-title flex items-center justify-between flex-1">
                    <span>Giỏ hàng đặt mua</span>
                    {cartItemCount > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-orange-100 text-[#F85606]">
                        {cartItemCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>

            {/* Mục 2: Lịch sử đơn hàng */}
            <li className="erp-menu-item">
              <button
                type="button"
                onClick={() => {
                  onChangeTab?.('history');
                  setIsMobileMenuOpen(false);
                }}
                className={`erp-menu-link w-full text-left cursor-pointer ${activeTab === 'history' ? 'active' : ''}`}
                title="Lịch sử đơn hàng đã đặt"
              >
                <span className="erp-menu-icon">
                  <Clock size={18} />
                </span>
                {!isSidebarCollapsed && (
                  <span className="erp-menu-title">Lịch sử đơn hàng</span>
                )}
              </button>
            </li>

            {/* Mục 3: Sổ công nợ & Thanh toán */}
            <li className="erp-menu-item">
              <button
                type="button"
                onClick={() => {
                  onChangeTab?.('debt');
                  setIsMobileMenuOpen(false);
                }}
                className={`erp-menu-link w-full text-left cursor-pointer ${activeTab === 'debt' ? 'active' : ''}`}
                title="Sổ công nợ & Đối chiếu"
              >
                <span className="erp-menu-icon">
                  <Layers size={18} />
                </span>
                {!isSidebarCollapsed && (
                  <span className="erp-menu-title">Công nợ & Hoá đơn</span>
                )}
              </button>
            </li>

            {/* Tùy chọn quay lại ERP nếu là tài khoản quản trị/nhân viên nội bộ */}
            {currentRole !== 'ROLE_CUSTOMER' && (
              <>
                <li className="erp-menu-group" aria-hidden={isSidebarCollapsed}>
                  {isSidebarCollapsed ? <span className="erp-menu-group-divider" /> : 'Quản Trị ERP'}
                </li>
                <li className="erp-menu-item">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="erp-menu-link w-full text-left cursor-pointer"
                    title="Về Bàn làm việc nội bộ ERP"
                  >
                    <span className="erp-menu-icon">
                      <ArrowLeft size={18} />
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="erp-menu-title">Về Bàn làm việc ERP</span>
                    )}
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>

      {/* 3. KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI (MAIN AREA) */}
      <div className={`erp-main-area ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar chuẩn như hệ thống admin */}
        <header className="erp-topbar">
          <div className="erp-topbar-left flex items-center gap-3">
            {/* Nút Hamburger bật menu cho mobile */}
            <button
              type="button"
              className="erp-hamburger-btn md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Mở menu"
            >
              <Menu size={22} />
            </button>

            {/* Tiêu đề trang tương ứng với menu được chọn */}
            <div className="erp-page-title-box">
              <h1 className="erp-page-heading">
                {activeTab === 'catalog'
                  ? 'Danh Mục Sản Phẩm Đặt Hàng'
                  : activeTab === 'cart'
                  ? 'Giỏ Hàng & Xác Nhận Đơn Hàng'
                  : activeTab === 'history'
                  ? 'Đơn Hàng Đã Đặt Của Đại Lý'
                  : 'Sổ Công Nợ & Hạn Mức Thanh Toán'}
              </h1>
            </div>
          </div>

          {/* Khu vực bên phải: Chuông thông báo + Tài khoản */}
          <div className="erp-topbar-right flex items-center gap-2 sm:gap-3">

            {/* Chuông Thông Báo */}
            <AgencyNotificationBell
              onNavigateToDebt={() => {
                onChangeTab?.('debt');
              }}
            />

            {/* Menu Tài khoản */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                className="p-1 sm:px-2 sm:py-1.5 rounded-2xl border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 transition cursor-pointer text-gray-700 text-xs font-semibold shadow-xs"
                title="Tài khoản & Thiết lập"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-tr from-[#FF6A00] to-[#EE4D2D] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white">
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
                <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
              </button>

              {isAccountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-xs divide-y divide-gray-100 animate-in fade-in duration-100">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-tr from-[#FF6A00] to-[#EE4D2D] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-gray-100">
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
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{user?.fullName || 'Đại lý B2B'}</p>
                      <p className="text-gray-500 text-[11px] font-mono truncate">@{user?.username}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                        {agency?.customerGroupName || 'Đại lý phân phối'}
                      </span>
                    </div>
                  </div>

                  {/* Chuyển vai trò nếu có nhiều quyền */}
                  {user?.roles && user.roles.length > 1 && (
                    <div className="px-3 py-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        Đổi vai trò làm việc
                      </label>
                      <SearchSelect
                        value={currentRole}
                        onChange={(e) => {
                          switchRole(e.target.value as RoleName);
                          setIsAccountMenuOpen(false);
                        }}
                        className="w-full text-xs font-medium border border-gray-200 rounded-lg p-1.5 bg-gray-50"
                      >
                        {user.roles.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_METADATA_MAP[r]?.label || r}
                          </option>
                        ))}
                      </SearchSelect>
                    </div>
                  )}

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <LogOut size={14} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Nội dung chính của trang */}
        <main className="erp-page-content" id="main-content">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Modal xác nhận đăng xuất */}
      <LogoutConfirmModal
        open={showLogoutConfirm}
        loading={loggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* S7-08: Modal Popup Nhắc Hạn Thanh Toán Tự Động */}
      <PaymentReminderPopupModal
        isOpen={isReminderPopupOpen}
        onClose={() => {
          setIsReminderPopupOpen(false);
          sessionStorage.setItem('dismissed_payment_reminder_popup', 'true');
        }}
      />
    </div>
  );
};
