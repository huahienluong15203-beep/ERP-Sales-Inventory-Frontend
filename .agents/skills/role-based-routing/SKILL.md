---
name: role-based-routing
description: Hướng dẫn xây dựng phân quyền điều hướng giao diện (Protected Routes) dựa trên 7 vai trò người dùng và API user-context trong ERP.
---

# Role-Based Routing Skill

## 1. Mục Đích & Nguyên Lý Hoạt Động
- Người dùng chưa đăng nhập khi truy cập bất kỳ trang nội bộ nào sẽ bị chuyển hướng (redirect) về `/login`.
- Người dùng đã đăng nhập chỉ được truy cập vào các trang phù hợp với quyền hạn (`roles`):
  - Ví dụ: Nhân viên kho (`ROLE_WAREHOUSE`) cố tình gõ URL `/admin/users` hoặc `/reports/sales` sẽ bị chặn và hiển thị trang `403 Forbidden` (Không có quyền truy cập).
- Tích hợp trực tiếp với API Backend: `GET /api/v1/navigation/user-context` để sinh menu động ở Sidebar.

---

## 2. Xây Dựng Component ProtectedRoute Chuẩn

```tsx
// src/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleName } from '../types/user';

interface ProtectedRouteProps {
  allowedRoles?: RoleName[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-spinner">Đang tải dữ liệu...</div>;
  }

  // 1. Chưa đăng nhập -> Đá về Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Kiểm tra quyền hạn nếu có quy định allowedRoles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = user.roles.some((role) => allowedRoles.includes(role));
    if (!hasPermission) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  // 3. Đủ điều kiện -> Render các trang con bên trong
  return <Outlet />;
};
```

---

## 3. Cấu Hình Cây Định Tuyến (AppRoutes)

```tsx
// src/routes/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import StockListPage from '../pages/inventory/StockListPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import ForbiddenPage from '../pages/common/ForbiddenPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Protected Routes nằm trong MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Mọi vai trò đã đăng nhập đều vào được */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Chỉ Thủ kho & Quản lý kho */}
          <Route element={<ProtectedRoute allowedRoles={['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN']} />}>
            <Route path="/inventory/stock" element={<StockListPage />} />
          </Route>

          {/* Chỉ Admin hệ thống */}
          <Route element={<ProtectedRoute allowedRoles={['ROLE_ADMIN']} />}>
            <Route path="/admin/users" element={<UserManagementPage />} />
          </Route>
        </Route>
      </Route>

      {/* Mặc định chuyển hướng về /dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
```
