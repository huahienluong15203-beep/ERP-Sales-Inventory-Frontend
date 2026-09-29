import { Routes, Route, useLocation, Navigate } from './Router';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { ModulePage } from '../pages/common/ModulePage';
import { ForbiddenPage } from '../pages/common/ForbiddenPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ALL_SYSTEM_MENUS } from '../services/menuConfig';

/**
 * Cây định tuyến toàn hệ thống ERP
 * - Chưa đăng nhập: Chuyển hướng về /login (Quy chuẩn skills/role-based-routing/SKILL.md)
 * - Đã đăng nhập: Mọi trang (kể cả 403 Forbidden và 404 NotFound) đều dùng chung MainLayout (S1-07)
 */
export const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // 1. Tuyến đường trang Đăng nhập
  if (pathname === '/login') {
    return <LoginPage />;
  }

  // 2. Nếu chưa đăng nhập -> Chuyển hướng về /login
  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  // 2. Toàn bộ các trang nghiệp vụ bên trong dùng chung MainLayout
  return (
    <MainLayout>
      <Routes>
        {/* Trang chủ / Bàn làm việc */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Hồ sơ cá nhân (Mọi vai trò đều xem được) */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Trang 403 Forbidden trực tiếp */}
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Toàn bộ các phân hệ nghiệp vụ ERP (EP-01 đến EP-09) được bảo vệ bằng ProtectedRoute */}
        {ALL_SYSTEM_MENUS.filter(
          (m) => m.path !== '/dashboard' && m.path !== '/' && m.path !== '/profile'
        ).map((menuItem) => (
          <Route
            key={menuItem.path}
            path={menuItem.path}
            element={
              <ProtectedRoute allowedRoles={menuItem.allowedRoles}>
                <ModulePage
                  title={menuItem.title}
                  epic={menuItem.epic || 'ERP'}
                  description={menuItem.description || ''}
                  iconName={menuItem.icon}
                  allowedRoles={menuItem.allowedRoles}
                />
              </ProtectedRoute>
            }
          />
        ))}

        {/* Trang báo lỗi 404 cho các đường dẫn nhầm chỗ / không tồn tại */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
};
