import React, { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ShoppingCart,
  Building2,
  LogOut,
  ChevronDown,
  Layers,
  Phone,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../routes/Router';
import { ROLE_METADATA_MAP, type RoleName } from '../types/user';
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';
import type { Agency, CreditStatusResponse } from '../types/agency';
import { formatCurrencyVND } from '../services/orderService';

interface CustomerPortalLayoutProps {
  children: ReactNode;
  agency?: Agency | null;
  creditStatus?: CreditStatusResponse | null;
  cartItemCount?: number;
  cartTotalAmount?: number;
  onOpenCart?: () => void;
  activeTab?: 'catalog' | 'history';
  onChangeTab?: (tab: 'catalog' | 'history') => void;
}

/**
 * S4-10: Layout portal riêng cho Đại lý phân phối B2B
 * - Tối ưu 100% cho giao diện điện thoại (chuẩn responsive >= 360px)
 * - Tách biệt trải nghiệm B2B đơn giản, nhanh chóng, đặt hàng thuận tiện lúc nửa đêm
 * - Thanh trạng thái công nợ và giỏ hàng nổi bật
 */
export const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({
  children,
  agency,
  creditStatus,
  cartItemCount = 0,
  cartTotalAmount = 0,
  onOpenCart,
  activeTab = 'catalog',
  onChangeTab
}) => {
  const { user, currentRole, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);

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

  const remainingCredit =
    creditStatus != null
      ? Math.max(0, creditStatus.availableCredit - cartTotalAmount)
      : Math.max(0, Number(agency?.creditLimit || 0) - Number(agency?.totalDebt || 0) - cartTotalAmount);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 antialiased pb-20 sm:pb-8">
      {/* 1. TOPBAR CỔNG ĐẠI LÝ B2B */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo & Nhãn Cổng Đại Lý */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#F85606] to-orange-500 flex items-center justify-center text-white font-black shadow-md shadow-orange-500/20 shrink-0">
                <Building2 size={20} className="sm:hidden" />
                <Sparkles size={22} className="hidden sm:block" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm sm:text-base text-gray-900 tracking-tight truncate">
                    B2B PORTAL
                  </span>
                  <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#F85606]">
                    Đại Lý
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 truncate font-medium">
                  {agency?.name || user?.fullName || 'Đại lý phân phối'}
                </p>
              </div>
            </div>

            {/* Chỉ số tài chính nhanh trên Topbar (Ẩn trên màn hình rất nhỏ < 640px) */}
            {agency && (
              <div className="hidden md:flex items-center gap-4 bg-orange-50/70 border border-orange-100/80 px-3.5 py-1.5 rounded-xl">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-gray-500">Hạn mức khả dụng</div>
                  <div className="text-xs font-black text-emerald-600 font-mono">
                    {formatCurrencyVND(remainingCredit)}
                  </div>
                </div>
                <div className="h-6 w-px bg-orange-200/60" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-gray-500">Nợ hiện tại</div>
                  <div className="text-xs font-black text-rose-600 font-mono">
                    {formatCurrencyVND(Number(creditStatus?.currentDebt ?? agency.totalDebt ?? 0))}
                  </div>
                </div>
              </div>
            )}

            {/* Hành động: Nút Giỏ Hàng & Tài Khoản */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Nút Giỏ Hàng */}
              {onOpenCart && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="relative p-2 sm:px-3 sm:py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95"
                  title="Xem giỏ hàng"
                  id="b2b-cart-btn"
                >
                  <ShoppingCart size={18} />
                  <span className="hidden sm:inline">Giỏ hàng</span>
                  {cartItemCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-white text-[#F85606] font-black text-[11px] shadow-xs">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              )}

              {/* Menu Tài khoản */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 transition cursor-pointer text-gray-700 text-xs font-semibold"
                  title="Tài khoản"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs">
                    {(user?.fullName || 'ĐL').substring(0, 2).toUpperCase()}
                  </div>
                  <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-xs divide-y divide-gray-100">
                    <div className="px-4 py-2.5">
                      <p className="font-bold text-gray-900 truncate">{user?.fullName || 'Đại lý B2B'}</p>
                      <p className="text-gray-500 text-[11px] font-mono mt-0.5 truncate">{user?.username}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                        {agency?.customerGroupName || 'Đại lý phân phối'}
                      </span>
                    </div>

                    {/* Chuyển vai trò nếu có nhiều quyền (phục vụ test) */}
                    {user?.roles && user.roles.length > 1 && (
                      <div className="px-3 py-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Đổi vai trò làm việc
                        </label>
                        <select
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
                        </select>
                      </div>
                    )}

                    <div className="py-1">
                      {currentRole !== 'ROLE_CUSTOMER' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            navigate('/dashboard');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                        >
                          <Layers size={14} />
                          <span>Về giao diện Quản trị ERP</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <LogOut size={14} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. SUB-BAR TRÊN MOBILE: THẺ CHỈ SỐ CÔNG NỢ NHANH (360px) */}
        {agency && (
          <div className="md:hidden border-t border-gray-100 bg-orange-50/50 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block">Hạn mức khả dụng:</span>
                <span className="font-black text-emerald-700 font-mono text-xs">
                  {formatCurrencyVND(remainingCredit)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-semibold block">Nợ hiện tại:</span>
                <span className="font-black text-rose-600 font-mono text-xs">
                  {formatCurrencyVND(Number(creditStatus?.currentDebt ?? agency.totalDebt ?? 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. TABS CHUYỂN ĐỔI: ĐẶT HÀNG / LỊCH SỬ ĐƠN HÀNG */}
        {onChangeTab && (
          <div className="border-t border-gray-100 bg-white px-3 sm:px-6">
            <div className="max-w-7xl mx-auto flex items-center gap-6">
              <button
                type="button"
                onClick={() => onChangeTab('catalog')}
                className={`py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'catalog'
                    ? 'border-[#F85606] text-[#F85606]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Sparkles size={15} />
                <span>Danh mục sản phẩm đặt hàng</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeTab('history')}
                className={`py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-[#F85606] text-[#F85606]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Clock size={15} />
                <span>Đơn hàng đã đặt của đại lý</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 4. NỘI DUNG CHÍNH */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {children}
      </main>

      {/* 5. FOOTER TRỢ GIÚP ĐẶT HÀNG NỬA ĐÊM */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-4 px-3 sm:px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 size={15} className="text-[#F85606]" />
            <span className="font-semibold">Cổng Đặt Hàng B2B 24/7 Dành Cho Đại Lý</span>
            <span>•</span>
            <span className="text-gray-400">Đơn tự động lưu & chuyển Chờ duyệt</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
            <Phone size={13} className="text-emerald-600" />
            <span>Hotline hỗ trợ đại lý: <strong className="text-gray-800">1900 6868</strong></span>
          </div>
        </div>
      </footer>

      {/* Modal xác nhận đăng xuất */}
      <LogoutConfirmModal
        open={showLogoutConfirm}
        loading={loggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};
