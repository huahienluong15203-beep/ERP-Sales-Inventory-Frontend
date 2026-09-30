import { createContext, useContext, useState, useEffect, useCallback, type FC, type ReactNode } from 'react';
import type { RoleName, UserProfile, MenuItem } from '../types/user';
import { fetchUserNavigationContext, loginUser, logoutUser } from '../services/api';
import { checkPathPermission } from '../services/menuConfig';

interface AuthContextType {
  user: UserProfile | null;
  menus: MenuItem[];
  currentRole: RoleName;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string; user?: UserProfile }>;
  logout: () => Promise<void>;
  switchRole: (role: RoleName) => Promise<void>;
  hasPermission: (path: string) => boolean;
  refreshContext: () => Promise<void>;
  clearMustChangePassword: () => void;
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
    const savedRole = localStorage.getItem(STORAGE_ROLE_KEY) as RoleName;
    return ROLE_PRIORITY.includes(savedRole) ? savedRole : 'ROLE_ADMIN';
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_USER_KEY);
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
    return !!localStorage.getItem(STORAGE_TOKEN_KEY);
  });

  const loadUserContext = useCallback(async (role: RoleName) => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchUserNavigationContext(role);
      if (data.user) {
        const availableRoles = (data.user.roles as RoleName[]) || [];
        // Nếu vai trò hiện tại đã bị gỡ/không còn trong danh sách roles của user, tự động chuyển về vai trò cao nhất
        let activeRole = role;
        if (availableRoles.length > 0 && !availableRoles.includes(role)) {
          activeRole = getHighestPriorityRole(availableRoles);
          setCurrentRole(activeRole);
          localStorage.setItem(STORAGE_ROLE_KEY, activeRole);
          data.user.role = activeRole;
        }

        setUser((prev) => {
          const merged = { ...prev, ...data.user };
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(merged));
          return merged;
        });
      }
      setMenus(data.menus);
    } catch (err: any) {
      if (err?.message === 'SESSION_EXPIRED' || err?.message === 'NO_TOKEN' || err?.message?.includes('Phiên làm việc')) {
        setIsAuthenticated(false);
        setUser(null);
      } else {
        console.error('Lỗi khi tải ngữ cảnh phân quyền người dùng:', err);
      }
    } finally {
      setIsLoading(false);
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
          const savedUser = localStorage.getItem(STORAGE_USER_KEY);
          if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch {}
          }
          const savedRole = localStorage.getItem(STORAGE_ROLE_KEY) as RoleName;
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
        'Phiên làm việc của bạn đã hết hạn do tài khoản đã được đăng nhập ở một thiết bị hoặc phiên làm việc khác. Vui lòng đăng nhập lại!';
      setIsAuthenticated(false);
      setUser(null);
      alert(msg);
      window.location.href = '/login';
    };

    const handleFocus = () => {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (token) {
        loadUserContext(currentRole);
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
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string; user?: UserProfile }> => {
    setIsLoading(true);
    try {
      const result = await loginUser(username, password);
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentRole(result.user.role);
        localStorage.setItem(STORAGE_ROLE_KEY, result.user.role);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.user));
        setUser(result.user);
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
      localStorage.removeItem(STORAGE_USER_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Chuyển đổi vai trò người dùng (phục vụ kiểm thử và phân quyền thực tế)
   */
  const switchRole = async (newRole: RoleName) => {
    setCurrentRole(newRole);
    localStorage.setItem(STORAGE_ROLE_KEY, newRole);
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
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

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
        clearMustChangePassword
      }}
    >
      {children}
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
