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
import { PriceListCreatePage } from '../pages/pricing/PriceListCreatePage';
import { VolumeDiscountPage } from '../pages/pricing/VolumeDiscountPage';
import { CategoryManagementPage } from '../pages/category/CategoryManagementPage';
import { OrderCreatePage } from '../pages/order/OrderCreatePage';
import { OrderListPage } from '../pages/order/OrderListPage';
import { OrderDetailPage } from '../pages/order/OrderDetailPage';
import { SupplierManagementPage } from '../pages/supplier/SupplierManagementPage';
import { SystemLogPage } from '../pages/system-log/SystemLogPage';
import { ModulePage } from '../pages/common/ModulePage';
import { ForbiddenPage } from '../pages/common/ForbiddenPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { CustomerOrderPortalPage } from '../pages/portal/CustomerOrderPortalPage';
import { GoodsReceiptManagementPage } from '../pages/inventory/GoodsReceiptManagementPage';
import { GoodsReceiptCreatePage } from '../pages/inventory/GoodsReceiptCreatePage';
import { GoodsReceiptDetailPage } from '../pages/inventory/GoodsReceiptDetailPage';
import { StockTransferManagementPage } from '../pages/inventory/StockTransferManagementPage';
import { StockTransferCreatePage } from '../pages/inventory/StockTransferCreatePage';
import { TransferProductPickerPage } from '../pages/inventory/TransferProductPickerPage';
import { StockTransferDetailPage } from '../pages/inventory/StockTransferDetailPage';
import { StockLedgerPage } from '../pages/inventory/StockLedgerPage';
import { StockCardPage } from '../pages/inventory/StockCardPage';
import { StockTakeManagementPage } from '../pages/inventory/StockTakeManagementPage';
import { StockTakeCreatePage } from '../pages/inventory/StockTakeCreatePage';
import { StockTakeDetailPage } from '../pages/inventory/StockTakeDetailPage';
import { WarehouseManagementPage } from '../pages/inventory/WarehouseManagementPage';
import { PickingListManagementPage } from '../pages/inventory/PickingListManagementPage';
import { PickingListCreatePage } from '../pages/inventory/PickingListCreatePage';
import { PickingListDetailPage } from '../pages/inventory/PickingListDetailPage';
import { DeliveryTripManagementPage } from '../pages/inventory/DeliveryTripManagementPage';
import { DeliveryTripCreatePage } from '../pages/inventory/DeliveryTripCreatePage';
import { DeliveryTripDetailPage } from '../pages/inventory/DeliveryTripDetailPage';
import { DebtAdjustmentPage } from '../pages/payment/DebtAdjustmentPage';
import { ProductLotManagementPage } from '../pages/inventory/ProductLotManagementPage';
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

  // Cổng đại lý đặt hàng & Quản lý công nợ (B2B Customer Portal)
  // Khách hàng/đại lý (ROLE_CUSTOMER) không dùng giao diện Dashboard nội bộ, luôn vào thẳng cổng đặt hàng & công nợ
  if (currentRole === 'ROLE_CUSTOMER') {
    if (pathname !== '/portal' && pathname !== '/portal/debt') {
      return <Navigate to="/portal" replace />;
    }
    return <CustomerOrderPortalPage />;
  }

  if (pathname === '/portal' || pathname === '/portal/debt') {
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

        {/* S5-04: Lập phiếu nhập kho từ nhà cung cấp (Trang riêng) */}
        <Route
          path="/inventory/receipts/create"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN'
              ]}
            >
              <GoodsReceiptCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/goods-receipts/create"
          element={<Navigate to="/inventory/receipts/create" replace />}
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
        {/* S5-04: Chi tiết phiếu nhập kho trang riêng (có phân trang đầy đủ) */}
        <Route
          path="/inventory/receipts/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <GoodsReceiptDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/goods-receipts/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <GoodsReceiptDetailPage />
            </ProtectedRoute>
          }
        />

        {/* S5-07: Lập phiếu chuyển kho nội bộ (Trang riêng) */}
        <Route
          path="/inventory/transfers/create"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN'
              ]}
            >
              <StockTransferCreatePage />
            </ProtectedRoute>
          }
        />

        {/* S5-07: Chọn sản phẩm điều chuyển kho (Trang riêng toàn màn hình) */}
        <Route
          path="/inventory/transfers/create/products"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN'
              ]}
            >
              <TransferProductPickerPage />
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

        {/* S5-07: Chi tiết phiếu chuyển kho nội bộ (Trang riêng) */}
        <Route
          path="/inventory/transfers/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <StockTransferDetailPage />
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
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <StockLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/stock-ledger"
          element={<Navigate to="/inventory/ledger" replace />}
        />

        {/* S6-02: Thẻ kho chi tiết (Kho, Quản lý kho, Admin, Kế toán, QL kinh doanh) */}
        <Route
          path="/inventory/stock-card"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <StockCardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/card"
          element={<Navigate to="/inventory/stock-card" replace />}
        />

        {/* S5-08: Kiểm kê kho & ghi nhận chênh lệch */}
        <Route
          path="/inventory/stocktakes"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <StockTakeManagementPage />
            </ProtectedRoute>
          }
        />
        {/* S5-08: Tạo phiếu kiểm kê kho trang riêng */}
        <Route
          path="/inventory/stocktakes/create"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN'
              ]}
            >
              <StockTakeCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/stock-takes/create"
          element={<Navigate to="/inventory/stocktakes/create" replace />}
        />
        {/* S5-08: Chi tiết & thực hiện kiểm kê kho trang riêng */}
        <Route
          path="/inventory/stocktakes/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <StockTakeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/stock-takes/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT'
              ]}
            >
              <StockTakeDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Quản lý kho hàng & sơ đồ vị trí lưu trữ */}
        <Route
          path="/inventory/warehouses"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <WarehouseManagementPage />
            </ProtectedRoute>
          }
        />
        <Route path="/warehouses" element={<Navigate to="/inventory/warehouses" replace />} />

        {/* Theo dõi lô & hạn sử dụng, cảnh báo cận date */}
        <Route
          path="/inventory/lots"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <ProductLotManagementPage />
            </ProtectedRoute>
          }
        />

        {/* S6-03: Phiếu soạn hàng (Wave Picking) */}
        <Route
          path="/inventory/picking-lists"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <PickingListManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/picking-lists/create"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN'
              ]}
            >
              <PickingListCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/picking-lists/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <PickingListDetailPage />
            </ProtectedRoute>
          }
        />

        {/* S6-06: Phân tuyến giao hàng (Delivery Trips & Route Dispatch) */}
        <Route
          path="/inventory/delivery-trips"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WH_MANAGER',
                'ROLE_WAREHOUSE',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <DeliveryTripManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/delivery-trips/create"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WH_MANAGER',
                'ROLE_WAREHOUSE',
                'ROLE_ADMIN'
              ]}
            >
              <DeliveryTripCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/delivery-trips/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_WH_MANAGER',
                'ROLE_WAREHOUSE',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER'
              ]}
            >
              <DeliveryTripDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="/inventory" element={<Navigate to="/inventory/receipts" replace />} />

        {/* S2-10: Trang riêng Khai báo / Chỉnh sửa Bảng giá sản phẩm */}
        <Route
          path="/pricing/create"
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SALES_MANAGER']}>
              <PriceListCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/price-lists/create"
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SALES_MANAGER']}>
              <PriceListCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SALES_MANAGER']}>
              <PriceListCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/price-lists/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SALES_MANAGER']}>
              <PriceListCreatePage />
            </ProtectedRoute>
          }
        />

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
        {/* S4-06 / S4-07: Chi tiết đơn hàng trang riêng biệt */}
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_SALES_REP',
                'ROLE_SALES_MANAGER',
                'ROLE_ADMIN',
                'ROLE_ACCOUNTANT',
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER'
              ]}
            >
              <OrderDetailPage />
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
                'ROLE_ACCOUNTANT',
                'ROLE_WAREHOUSE',
                'ROLE_WH_MANAGER'
              ]}
            >
              <OrderListPage />
            </ProtectedRoute>
          }
        />

        {/* Chứng từ giảm trừ công nợ khi trả hàng */}
        <Route
          path="/payments/adjustments"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ROLE_ACCOUNTANT',
                'ROLE_SALES_MANAGER',
                'ROLE_ADMIN'
              ]}
            >
              <DebtAdjustmentPage />
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
