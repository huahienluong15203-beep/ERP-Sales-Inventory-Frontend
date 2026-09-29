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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_ROLE_KEY = 'erp_active_role';
const STORAGE_TOKEN_KEY = 'accessToken';

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<RoleName>(() => {
    const savedRole = localStorage.getItem(STORAGE_ROLE_KEY) as RoleName;
    const validRoles: RoleName[] = [
      'ROLE_ADMIN',
      'ROLE_SALES_REP',
      'ROLE_SALES_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ACCOUNTANT',
      'ROLE_CUSTOMER'
    ];
    return validRoles.includes(savedRole) ? savedRole : 'ROLE_ADMIN';
  });

  const [user, setUser] = useState<UserProfile | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem(STORAGE_TOKEN_KEY);
  });

  const loadUserContext = useCallback(async (role: RoleName) => {
    setIsLoading(true);
    try {
      const data = await fetchUserNavigationContext(role);
      setUser(data.user);
      setMenus(data.menus);
    } catch (err) {
      console.error('Lỗi khi tải ngữ cảnh phân quyền người dùng:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserContext(currentRole);
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
   * Kiểm tra quyền truy cập đường dẫn dựa trên vai trò hiện tại
   */
  const hasPermission = (path: string): boolean => {
    return checkPathPermission(path, currentRole);
  };

  const refreshContext = async () => {
    await loadUserContext(currentRole);
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
        refreshContext
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
