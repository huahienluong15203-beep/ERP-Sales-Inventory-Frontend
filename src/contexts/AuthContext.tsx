import { createContext, useContext, useState, useEffect, useCallback, useRef, type FC, type ReactNode } from 'react';
import type { RoleName, UserProfile, MenuItem } from '../types/user';
import {
  fetchUserNavigationContext,
  loginUser,
  logoutUser,
  getStoredToken,
  getStoredItem,
  setStoredItem,
  removeStoredItem,
  isRememberMeActive
} from '../services/api';
import { checkPathPermission } from '../services/menuConfig';
import { SessionExpiredModal } from '../components/common/SessionExpiredModal';
import { Icons } from '../components/common/Icons';

export type ToastType = 'success' | 'error' | 'info' | 'logout';

export interface ToastNotification {
  title: string;
  message?: string;
  type?: ToastType;
}

interface AuthContextType {
  user: UserProfile | null;
  menus: MenuItem[];
  currentRole: RoleName;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string; user?: UserProfile }>;
  logout: () => Promise<void>;
  switchRole: (role: RoleName) => Promise<void>;
  hasPermission: (path: string) => boolean;
  refreshContext: () => Promise<void>;
  updateUser: (updated: Partial<UserProfile>) => void;
  clearMustChangePassword: () => void;
  showToast: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  clearToast: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_ROLE_KEY = 'erp_active_role';
const STORAGE_TOKEN_KEY = 'accessToken';
const STORAGE_USER_KEY = 'erp_user_profile';

const ROLE_PRIORITY: RoleName[] = [
  'ROLE_ADMIN',
  'ROLE_SALES_MANAGER',
  'ROLE_WH_MANAGER',
  'ROLE_ACCOUNTANT',
  'ROLE_WAREHOUSE',
  'ROLE_SALES_REP',
  'ROLE_CUSTOMER'
];

function getHighestPriorityRole(roles: RoleName[]): RoleName {
  if (!roles || roles.length === 0) return 'ROLE_ADMIN';
  const sorted = roles.slice().sort((a, b) => {
    const ia = ROLE_PRIORITY.indexOf(a);
    const ib = ROLE_PRIORITY.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return sorted[0];
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<RoleName>(() => {
    const savedRole = getStoredItem(STORAGE_ROLE_KEY) as RoleName;
    return ROLE_PRIORITY.includes(savedRole) ? savedRole : 'ROLE_ADMIN';
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = getStoredItem(STORAGE_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!getStoredToken();
  });
  const [sessionExpiredData, setSessionExpiredData] = useState<{ message: string } | null>(null);

  // Thông báo Toast toàn hệ thống
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimerRef = useRef<any>(null);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((title: string, message: string = '', type: ToastType = 'success', duration: number = 1800) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ title, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const loadUserContext = useCallback(async (role: RoleName, isSilent: boolean = false) => {
    const token = getStoredToken();
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (!isSilent) {
      setIsLoading(true);
    }
    try {
      const data = await fetchUserNavigationContext(role);
      if (data.user) {
        const availableRoles = (data.user.roles as RoleName[]) || [];
        // Nếu vai trò hiện tại đã bị gỡ/không còn trong danh sách roles của user, tự động chuyển về vai trò cao nhất
        let activeRole = role;
        if (availableRoles.length > 0 && !availableRoles.includes(role)) {
          activeRole = getHighestPriorityRole(availableRoles);
          setCurrentRole(activeRole);
          setStoredItem(STORAGE_ROLE_KEY, activeRole, isRememberMeActive());
          data.user.role = activeRole;
        }

        setUser((prev) => {
          const merged = { ...prev, ...data.user };
          setStoredItem(STORAGE_USER_KEY, JSON.stringify(merged), isRememberMeActive());
          return merged;
        });
      }
      setMenus(data.menus);
    } catch (err: any) {
      if (err?.message === 'SESSION_EXPIRED' || err?.message === 'NO_TOKEN' || err?.message?.includes('Phiên làm việc') || err?.message?.includes('khoá') || err?.message?.includes('401')) {
        setIsAuthenticated(false);
        setUser(null);
        removeStoredItem(STORAGE_TOKEN_KEY);
        removeStoredItem(STORAGE_USER_KEY);
        removeStoredItem(STORAGE_ROLE_KEY);
      } else {
        console.error('Lỗi khi tải ngữ cảnh phân quyền người dùng:', err);
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUserContext(currentRole);
  }, [currentRole, loadUserContext]);

  // Lắng nghe sự kiện đa tab và sự kiện phiên bị thu hồi do đăng nhập ở thiết bị/cửa sổ khác (Single Active Session)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_TOKEN_KEY) {
        if (!e.newValue) {
          setIsAuthenticated(false);
          setUser(null);
        } else {
          setIsAuthenticated(true);
          const savedUser = getStoredItem(STORAGE_USER_KEY);
          if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch {}
          }
          const savedRole = getStoredItem(STORAGE_ROLE_KEY) as RoleName;
          if (savedRole && ROLE_PRIORITY.includes(savedRole)) {
            setCurrentRole(savedRole);
          }
        }
      }
    };

    const handleSessionExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      const msg =
        customEvent.detail?.message ||
        'Phiên làm việc của bạn đã hết hạn do tài khoản đã được đăng nhập ở một thiết bị hoặc phiên làm việc khác.';
      setIsAuthenticated(false);
      setUser(null);
      setSessionExpiredData({ message: msg });
    };

    let lastFocusTime = Date.now();
    const handleFocus = () => {
      const now = Date.now();
      // Bỏ qua nếu thời gian giữa 2 lần focus dưới 60 giây (tránh gián đoạn, unmount UI khi mở hộp thoại chọn tệp)
      if (now - lastFocusTime < 60000) return;
      lastFocusTime = now;
      const token = getStoredToken();
      if (token) {
        loadUserContext(currentRole, true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('erp-session-expired', handleSessionExpired);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('erp-session-expired', handleSessionExpired);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentRole, loadUserContext]);

  /**
   * Đăng nhập người dùng (Story S1-01)
   */
  const login = async (
    username: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; message?: string; user?: UserProfile }> => {
    setIsLoading(true);
    try {
      const result = await loginUser(username, password, rememberMe);
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentRole(result.user.role);
        setStoredItem(STORAGE_ROLE_KEY, result.user.role, rememberMe);
        setStoredItem(STORAGE_USER_KEY, JSON.stringify(result.user), rememberMe);
        setUser(result.user);

        // HIỂN THỊ TOAST THÀNH CÔNG NGAY LẬP TỨC (0ms)
        const displayName = result.user.fullName || result.user.username || username;
        showToast(
          'Đăng nhập thành công!',
          `Chào mừng ${displayName} quay trở lại hệ thống.`
        );

        await loadUserContext(result.user.role);
        return { success: true, user: result.user };
      } else {
        return { success: false, message: result.message || 'Đăng nhập không thành công' };
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Đăng xuất người dùng (Story S1-02)
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setIsAuthenticated(false);
      setUser(null);
      removeStoredItem(STORAGE_USER_KEY);
      removeStoredItem(STORAGE_ROLE_KEY);
      removeStoredItem(STORAGE_TOKEN_KEY);

      // Hiển thị thông báo Toast đăng xuất với type = 'logout' (màu cam hổ phách ấm áp)
      showToast(
        'Đăng xuất thành công!',
        'Bạn đã đăng xuất an toàn khỏi hệ thống.',
        'logout'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Chuyển đổi vai trò người dùng (phục vụ kiểm thử và phân quyền thực tế)
   */
  const switchRole = async (newRole: RoleName) => {
    setCurrentRole(newRole);
    setStoredItem(STORAGE_ROLE_KEY, newRole, isRememberMeActive());
    await loadUserContext(newRole);
  };

  /**
   * Kiểm tra quyền truy cập đường dẫn dựa trên các vai trò người dùng được cấp
   */
  const hasPermission = (path: string): boolean => {
    const userRoles = user?.roles && user.roles.length > 0 ? user.roles : [currentRole];
    return checkPathPermission(path, userRoles);
  };

  const refreshContext = async () => {
    await loadUserContext(currentRole);
  };

  /**
   * Xóa cờ bắt buộc đổi mật khẩu khi user đã đổi mật khẩu thành công (S1-04)
   */
  const clearMustChangePassword = () => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, mustChangePassword: false };
      setStoredItem(STORAGE_USER_KEY, JSON.stringify(updated), isRememberMeActive());
      return updated;
    });
  };

  const updateUser = useCallback((updated: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updated };
      setStoredItem(STORAGE_USER_KEY, JSON.stringify(merged), isRememberMeActive());
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        menus,
        currentRole,
        isAuthenticated,
        isLoading,
        login,
        logout,
        switchRole,
        hasPermission,
        refreshContext,
        updateUser,
        clearMustChangePassword,
        showToast,
        clearToast
      }}
    >
      {children}

      {/* THÔNG BÁO TOAST NỔI TOÀN HỆ THỐNG - HIỂN THỊ TỨC THÌ, TỰ ĐỘNG BIẾN MẤT */}
      {toast && (() => {
        const isLogout = toast.type === 'logout';
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';

        // Gradient nền
        const bg = isLogout
          ? 'linear-gradient(135deg, #ffffff 0%, #FFF7ED 100%)' // Cam Amber ấm áp cho đăng xuất
          : isError
            ? 'linear-gradient(135deg, #ffffff 0%, #FEF2F2 100%)'
            : isInfo
              ? 'linear-gradient(135deg, #ffffff 0%, #EFF6FF 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #F0FDF4 100%)'; // Xanh lá mặc định (đăng nhập)

        // Viền
        const borderColor = isLogout
          ? '#FDBA74' // Orange-300
          : isError
            ? '#FCA5A5'
            : isInfo
              ? '#93C5FD'
              : '#86EFAC';

        // Bóng đổ
        const shadow = isLogout
          ? '0 10px 25px -5px rgba(249, 115, 22, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
          : isError
            ? '0 10px 25px -5px rgba(239, 68, 68, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
            : isInfo
              ? '0 10px 25px -5px rgba(59, 130, 246, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
              : '0 10px 25px -5px rgba(16, 185, 129, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.05)';

        // Icon Box
        const iconBg = isLogout
          ? '#FFEDD5' // Orange-100
          : isError
            ? '#FEE2E2'
            : isInfo
              ? '#DBEAFE'
              : '#DCFCE7';

        const iconColor = isLogout
          ? '#EA580C' // Orange-600
          : isError
            ? '#DC2626'
            : isInfo
              ? '#2563EB'
              : '#16A34A';

        // Màu tiêu đề
        const titleColor = isLogout
          ? '#9A3412' // Orange-800
          : isError
            ? '#991B1B'
            : isInfo
              ? '#1E40AF'
              : '#166534';

        // Thanh tiến trình
        const progressTrack = isLogout
          ? '#FFEDD5'
          : isError
            ? '#FEE2E2'
            : isInfo
              ? '#DBEAFE'
              : '#DCFCE7';

        const progressBg = isLogout
          ? 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)' // Gradient Cam sang trọng
          : isError
            ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
            : isInfo
              ? 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)'
              : 'linear-gradient(90deg, #10B981 0%, #059669 100%)';

        return (
          <div
            role="status"
            aria-live="polite"
            className="erp-login-toast"
            style={{
              position: 'fixed',
              top: '16px',
              right: '20px',
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              minWidth: '280px',
              maxWidth: '380px',
              borderRadius: '12px',
              background: bg,
              border: `1px solid ${borderColor}`,
              boxShadow: shadow,
              overflow: 'hidden',
              pointerEvents: 'auto'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px 8px 12px'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: iconBg,
                  color: iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isLogout ? (
                  <Icons.LogOut size={18} />
                ) : isError ? (
                  <Icons.AlertTriangle size={18} />
                ) : isInfo ? (
                  <Icons.Info size={18} />
                ) : (
                  <Icons.CheckCircle2 size={18} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    color: titleColor,
                    lineHeight: 1.3
                  }}
                >
                  {toast.title}
                </div>
                {toast.message ? (
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#4B5563',
                      marginTop: '2px',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {toast.message}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={clearToast}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="Đóng thông báo"
              >
                <Icons.X size={15} />
              </button>
            </div>
            {/* Thanh tiến trình thời gian tự động biến mất */}
            <div
              style={{
                height: '3px',
                width: '100%',
                background: progressTrack,
                overflow: 'hidden'
              }}
            >
              <div
                className="erp-toast-progress-bar"
                style={{
                  height: '100%',
                  background: progressBg
                }}
              />
            </div>
          </div>
        );
      })()}

      {sessionExpiredData && (
        <SessionExpiredModal
          message={sessionExpiredData.message}
          onConfirm={() => {
            setSessionExpiredData(null);
            window.location.href = '/login';
          }}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
