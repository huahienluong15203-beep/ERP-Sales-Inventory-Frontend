import React from 'react';
import { Routes, Route, useLocation, Navigate } from './Router';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { AgencyManagementPage } from '../pages/customer/AgencyManagementPage';
import { ModulePage } from '../pages/common/ModulePage';
import { ForbiddenPage } from '../pages/common/ForbiddenPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { CategoryManagementPage } from '../pages/category/CategoryManagementPage';
import { ALL_SYSTEM_MENUS } from '../services/menuConfig';

/**
 * Cây định tuyến toàn hệ thống ERP
 * - Chưa đăng nhập: Chuyển hướng về /login
 * - Đã đăng nhập: Mọi trang (kể cả 403 Forbidden và 404 NotFound) đều dùng chung MainLayout (S1-07)
 */
export const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // 1. Tuyến đường trang Đăng nhập
  if (pathname === '/login') {
    return <LoginPage />;
  }

  // 1b. Tuyến đường trang Đặt lại mật khẩu (từ liên kết xác thực email)
  if (pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  // 2. Nếu chưa đăng nhập -> Chuyển hướng về /login
  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  // 3. Toàn bộ các trang nghiệp vụ bên trong dùng chung MainLayout
  return (
    <MainLayout>
      <Routes>
        {/* Trang chủ / Bàn làm việc */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Quản lý tài khoản (Sprint 1: S1-08 / S1-09 / S1-10 - Chỉ Quản trị viên) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Quản lý hồ sơ đại lý (Sprint 3: S3-03 / SCRUM-85 / EP-03) */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_ACCOUNTANT',
                'ROLE_ADMIN',
                'ROLE_SALES_MANAGER',
                'ROLE_SALES_REP'
              ]}
            >
              <AgencyManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Hồ sơ cá nhân (Mọi vai trò đều xem được) */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Quản lý nhóm hàng nhiều cấp & doanh số ngành hàng (Quản lý kinh doanh & Admin) */}
        <Route
          path="/categories"
          element={
            <ProtectedRoute allowedRoles={['ROLE_SALES_MANAGER', 'ROLE_ADMIN']}>
              <CategoryManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Trang 403 Forbidden trực tiếp */}
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Bất kỳ menu nào khác trong ALL_SYSTEM_MENUS nếu có */}
        {ALL_SYSTEM_MENUS.filter(
          (m) =>
            m.path !== '/dashboard' &&
            m.path !== '/' &&
            m.path !== '/profile' &&
            m.path !== '/users' &&
            m.path !== '/admin/users' &&
            m.path !== '/categories' &&
            m.path !== '/customers'
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
