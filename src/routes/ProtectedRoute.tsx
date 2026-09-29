import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RoleName } from '../types/user';
import { ForbiddenPage } from '../pages/common/ForbiddenPage';
import { useLocation } from './Router';

interface ProtectedRouteProps {
  allowedRoles?: RoleName[];
  children: ReactNode;
}

/**
 * Component bảo vệ tuyến đường dựa trên 7 vai trò (RBAC)
 * Tuân thủ quy chuẩn skills/role-based-routing/SKILL.md
 * Nếu không đủ quyền -> Hiển thị ngay ForbiddenPage trong giao diện dùng chung (S1-07)
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { currentRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="erp-loading-state">
        <div className="erp-spinner"></div>
        <p>Đang kiểm tra quyền truy cập hệ thống...</p>
      </div>
    );
  }

  // Nếu route có yêu cầu danh sách vai trò cho phép
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.includes(currentRole);
    if (!hasAccess) {
      // Hiển thị trực tiếp trang báo lỗi 403 bên trong MainLayout
      return <ForbiddenPage attemptedPath={location.pathname} requiredRoles={allowedRoles} />;
    }
  }

  return <>{children}</>;
};
