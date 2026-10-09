import React from 'react';
import { Routes, Route, useLocation, Navigate } from './Router';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { UserImportPage } from '../pages/admin/UserImportPage';
import { AgencyManagementPage } from '../pages/customer/AgencyManagementPage';
import { ProductManagementPage } from '../pages/product/ProductManagementPage';
import { ProductImportPage } from '../pages/product/ProductImportPage';
import { PriceListPage } from '../pages/pricing/PriceListPage';
import { VolumeDiscountPage } from '../pages/pricing/VolumeDiscountPage';
import { CategoryManagementPage } from '../pages/category/CategoryManagementPage';
import { OrderCreatePage } from '../pages/order/OrderCreatePage';
import { OrderListPage } from '../pages/order/OrderListPage';
import { SupplierManagementPage } from '../pages/supplier/SupplierManagementPage';
import { SystemLogPage } from '../pages/system-log/SystemLogPage';
import { ModulePage } from '../pages/common/ModulePage';
import { ForbiddenPage } from '../pages/common/ForbiddenPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { CustomerOrderPortalPage } from '../pages/portal/CustomerOrderPortalPage';
import { GoodsReceiptManagementPage } from '../pages/inventory/GoodsReceiptManagementPage';
import { StockTransferManagementPage } from '../pages/inventory/StockTransferManagementPage';
import { StockLedgerPage } from '../pages/inventory/StockLedgerPage';
import { ALL_SYSTEM_MENUS } from '../services/menuConfig';

/**
 * Cây định tuyến toàn hệ thống ERP
 * - Chưa đăng nhập: Chuyển hướng về /login
 * - Đã đăng nhập: Mọi trang (kể cả 403 Forbidden và 404 NotFound) đều dùng chung MainLayout (S1-07)
 */
export const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading, currentRole } = useAuth();

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

  // 2b. S4-10: Cổng đại lý đặt hàng (B2B Customer Portal)
  // Sử dụng Layout portal riêng cho Đại lý (CustomerPortalLayout) thay vì MainLayout
  if (pathname === '/portal' || (pathname === '/' && currentRole === 'ROLE_CUSTOMER')) {
    return <CustomerOrderPortalPage />;
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
        {/* S2-01: Trang riêng nhập người dùng hàng loạt từ Excel (chỉ Quản trị viên) */}
        <Route
          path="/users/import"
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <UserImportPage />
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

        {/* Quản lý danh mục sản phẩm (Sprint 2: S2-05) */}
        <Route
          path="/products"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_SALES_MANAGER',
                'ROLE_ADMIN',
                'ROLE_SALES_REP',
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <ProductManagementPage />
            </ProtectedRoute>
          }
        />

        {/* S2-08: Trang riêng nhập danh mục sản phẩm từ Excel (chỉ Admin, Quản lý kinh doanh) */}
        <Route
          path="/products/import"
          element={
            <ProtectedRoute allowedRoles={['ROLE_SALES_MANAGER', 'ROLE_ADMIN']}>
              <ProductImportPage />
            </ProtectedRoute>
          }
        />

        {/* Quản lý danh mục nhà cung cấp (S2-09 / SCRUM-46 / Kho & Nguồn hàng) */}
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_ADMIN',
                'ROLE_WH_MANAGER',
                'ROLE_WAREHOUSE',
                'ROLE_SALES_MANAGER',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <SupplierManagementPage />
            </ProtectedRoute>
          }
        />

        {/* S5-04: Phiếu nhập kho từ nhà cung cấp (Kho & Kế toán) */}
        <Route
          path="/inventory/receipts"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <GoodsReceiptManagementPage />
            </ProtectedRoute>
          }
        />

        {/* S5-07: Phiếu chuyển kho nội bộ (Kho & Quản lý kho) */}
        <Route
          path="/inventory/transfers"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <StockTransferManagementPage />
            </ProtectedRoute>
          }
        />

        {/* S5-09: Sổ tồn kho & Cảnh báo tồn tối thiểu (Kho & Quản lý kho) */}
        <Route
          path="/inventory/ledger"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <StockLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route path="/inventory" element={<Navigate to="/inventory/receipts" replace />} />

        {/* Quản lý bảng giá sản phẩm (S2-10 / SCRUM-55 / EP-02) */}
        <Route
          path="/pricing"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_ACCOUNTANT',
                'ROLE_ADMIN',
                'ROLE_SALES_MANAGER',
                'ROLE_SALES_REP'
              ]}
            >
              <PriceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/price-lists"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_ACCOUNTANT',
                'ROLE_ADMIN',
                'ROLE_SALES_MANAGER',
                'ROLE_SALES_REP'
              ]}
            >
              <PriceListPage />
            </ProtectedRoute>
          }
        />

        {/* Lịch sử thay đổi giá đã gộp vào "Nhật ký hệ thống" (link cũ tự chuyển sang tab tương ứng) */}
        <Route path="/pricing/history" element={<Navigate to="/logs?tab=price" replace />} />

        {/* Chính sách chiết khấu theo sản lượng (Sprint 3: S3-01 / SCRUM-12 / SCRUM-77 / EP-02) */}
        <Route
          path="/pricing/discounts"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_SALES_MANAGER',
                'ROLE_ADMIN',
                'ROLE_SALES_REP',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <VolumeDiscountPage />
            </ProtectedRoute>
          }
        />


        {/* Đặt hàng đại lý (Sprint 3: S3-09 / SCRUM-14 / EP-04).
            Không có Kế toán: Backend /api/orders chỉ cho Admin, QL kinh doanh, NV kinh doanh tạo đơn */}
        <Route
          path="/orders/create"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_SALES_REP',
                'ROLE_SALES_MANAGER',
                'ROLE_ADMIN'
              ]}
            >
              <OrderCreatePage />
            </ProtectedRoute>
          }
        />
        {/* S4-07: Danh sách đơn hàng có bộ lọc đa chiều & tổng tiền (Quản lý kinh doanh, NVKD, Admin, Kế toán) */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_SALES_REP',
                'ROLE_SALES_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <OrderListPage />
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

        {/* Nhật ký hệ thống: gộp Nhật ký thao tác (S2-04) + Lịch sử thay đổi giá (S3-02), lọc theo loại ở tab */}
        <Route
          path="/logs"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_WH_MANAGER',
                'ROLE_SALES_MANAGER',
                'ROLE_SALES_REP'
              ]}
            >
              <SystemLogPage />
            </ProtectedRoute>
          }
        />
        <Route path="/audit-logs" element={<Navigate to="/logs?tab=audit" replace />} />
        <Route path="/admin/audit-logs" element={<Navigate to="/logs?tab=audit" replace />} />

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
            m.path !== '/customers' &&
            m.path !== '/products' &&
            m.path !== '/categories' &&
            m.path !== '/suppliers' &&
            m.path !== '/pricing' &&
            m.path !== '/price-lists' &&
            m.path !== '/pricing/history' &&
            m.path !== '/orders/create' &&
            m.path !== '/orders' &&
            m.path !== '/portal' &&
            m.path !== '/inventory/receipts' &&
            m.path !== '/audit-logs' &&
            m.path !== '/admin/audit-logs' &&
            m.path !== '/logs'
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
