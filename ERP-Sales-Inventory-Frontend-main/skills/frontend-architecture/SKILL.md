---
name: frontend-architecture
description: Quy chuẩn kiến trúc dự án React 19 + TypeScript + Vite cho hệ thống ERP Sales & Inventory (cấu trúc thư mục, quản lý State, cấm dùng any).
---

# Frontend Architecture Skill

## 1. Cấu Trúc Thư Mục Chuẩn (React 19 + TypeScript + Vite)
Mọi mã nguồn giao diện trong `Frontend/src/` phải được tổ chức theo module chuyên biệt:

```text
src/
├── assets/           # Hình ảnh, icons SVG, font chữ tĩnh
├── components/       # Các UI Component dùng chung (Button, Modal, Input, Table, Badge)
│   ├── common/       # Header, Sidebar, Footer, LoadingSpinner
│   └── forms/        # Custom Form Controls
├── contexts/         # React Context (AuthContext, ThemeContext, CartContext)
├── hooks/            # Custom Hooks (useAuth, useDebounce, usePagination)
├── layouts/          # Khung giao diện (MainLayout có Sidebar + Navbar, AuthLayout)
├── pages/            # Các trang giao diện chính
│   ├── auth/         # LoginPage, ForgotPasswordPage
│   ├── dashboard/    # DashboardPage
│   ├── inventory/    # StockListPage, ImportStockPage, StockCheckPage
│   ├── sales/        # CreateOrderPage, OrderListPage
│   └── users/        # UserManagementPage
├── routes/           # Định tuyến (AppRoutes, ProtectedRoute)
├── services/         # Kết nối API (axiosClient, authService, productService, orderService)
├── types/            # TypeScript interfaces & types (User, Order, Product, ApiResponse)
├── utils/            # Hàm tiện ích (format tiền VNĐ, format ngày tháng DD/MM/YYYY)
├── App.tsx           # Component gốc bọc Provider và Router
└── main.tsx          # Điểm khởi chạy ứng dụng
```

---

## 2. Quy Tắc TypeScript Nghiêm Ngặt
1. **Cấm tuyệt đối kiểu `any`:** Mọi biến, props của Component, tham số hàm và dữ liệu trả về từ API đều phải được định kiểu tường minh bằng `interface` hoặc `type`.
2. **Khai báo types dùng chung:** Mọi model dữ liệu từ Backend phải có interface tương ứng trong `src/types/`:
```typescript
// src/types/user.ts
export type RoleName = 
  | 'ROLE_ADMIN' 
  | 'ROLE_SALES_REP' 
  | 'ROLE_SALES_MANAGER' 
  | 'ROLE_WAREHOUSE' 
  | 'ROLE_WH_MANAGER' 
  | 'ROLE_ACCOUNTANT' 
  | 'ROLE_CUSTOMER';

export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  roles: RoleName[];
  warehouse?: string;
  workLocation?: string;
}
```

---

## 3. Quy Tắc Tách Biệt Trách Nhiệm (Separation of Concerns)
- **Component UI:** Chỉ làm nhiệm vụ hiển thị (Presentational) và bắt tương tác của người dùng.
- **Không gọi Axios trực tiếp trong Component:**
  - Viết hàm gọi API trong `src/services/`.
  - Sử dụng Custom Hook hoặc React State để quản lý dữ liệu và trạng thái Loading/Error.
- **Format dữ liệu hiển thị:** Dùng hàm tiện ích trong `utils/` (ví dụ `formatCurrency(1500000)` -> `1.500.000 ₫`).
