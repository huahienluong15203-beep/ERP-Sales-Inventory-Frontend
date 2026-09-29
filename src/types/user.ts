/**
 * Định nghĩa kiểu dữ liệu người dùng, vai trò và phân quyền điều hướng (S1-06)
 * Tuân thủ quy chuẩn skills/frontend-architecture/SKILL.md (Cấm dùng any)
 */

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
  role: RoleName;
  roles: RoleName[];
  warehouse?: string;     // Kho làm việc (đối với nhân sự kho/admin)
  workLocation?: string;  // Địa bàn làm việc (đối với kinh doanh/đại lý)
  avatar?: string;
  mustChangePassword?: boolean;
}

export interface MenuItem {
  title: string;
  path: string;
  icon: string;
  epic?: string;
  description?: string;
  badge?: string;
  allowedRoles?: RoleName[];
}

export interface UserContextResponse {
  user: UserProfile;
  menus: MenuItem[];
}

/**
 * Thông tin mô tả và nhãn hiển thị tiếng Việt của 7 vai trò trong hệ thống ERP
 */
export interface RoleMetadata {
  name: RoleName;
  label: string;
  description: string;
  badgeColor: string;
  badgeBg: string;
  defaultPath: string;
  sampleLocation: string;
}

export const ROLE_METADATA_MAP: Record<RoleName, RoleMetadata> = {
  ROLE_ADMIN: {
    name: 'ROLE_ADMIN',
    label: 'Quản trị hệ thống',
    description: 'Toàn quyền cấu hình, tài khoản, phân quyền và dữ liệu ERP',
    badgeColor: '#047857',
    badgeBg: '#ecfdf5',
    defaultPath: '/dashboard',
    sampleLocation: 'Trụ sở chính & Toàn quốc'
  },
  ROLE_SALES_REP: {
    name: 'ROLE_SALES_REP',
    label: 'Nhân viên kinh doanh',
    description: 'Tạo đơn đặt hàng, tra cứu tồn kho khả dụng, theo dõi giao hàng',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    defaultPath: '/orders/create',
    sampleLocation: 'Địa bàn: Quận 1 & TP. Thủ Đức, HCM'
  },
  ROLE_SALES_MANAGER: {
    name: 'ROLE_SALES_MANAGER',
    label: 'Quản lý kinh doanh',
    description: 'Duyệt đơn ngoại lệ, xem báo cáo lãi gộp, quản lý hạn mức tín dụng',
    badgeColor: '#0d9488',
    badgeBg: '#f0fdfa',
    defaultPath: '/orders/approvals',
    sampleLocation: 'Chi nhánh Miền Nam - TP. Hồ Chí Minh'
  },
  ROLE_WAREHOUSE: {
    name: 'ROLE_WAREHOUSE',
    label: 'Nhân viên kho',
    description: 'Thực hiện xuất nhập kho FEFO, tra cứu lô hạn, kiểm kê thẻ kho',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    defaultPath: '/inventory',
    sampleLocation: 'Kho Tổng Miền Bắc (WH-MB01)'
  },
  ROLE_WH_MANAGER: {
    name: 'ROLE_WH_MANAGER',
    label: 'Quản lý kho',
    description: 'Quản trị cụm kho, duyệt phiếu điều chỉnh tồn (SoD), xuất kho FEFO',
    badgeColor: '#ea580c',
    badgeBg: '#fff7ed',
    defaultPath: '/inventory',
    sampleLocation: 'Cụm Kho Tổng Phía Bắc (WH-MB01 & MB02)'
  },
  ROLE_ACCOUNTANT: {
    name: 'ROLE_ACCOUNTANT',
    label: 'Kế toán công nợ',
    description: 'Lập hoá đơn VAT, ghi nhận thu tiền, quản lý sổ công nợ & tuổi nợ',
    badgeColor: '#0284c7',
    badgeBg: '#f0f9ff',
    defaultPath: '/debts',
    sampleLocation: 'Phòng Kế toán - Trụ sở chính'
  },
  ROLE_CUSTOMER: {
    name: 'ROLE_CUSTOMER',
    label: 'Đại lý phân phối (B2B)',
    description: 'Tự đặt hàng trực tuyến, theo dõi đơn giao và đối soát công nợ',
    badgeColor: '#16a34a',
    badgeBg: '#f0fdf4',
    defaultPath: '/orders/create',
    sampleLocation: 'Điểm nhận hàng: Kho Đại lý Cần Thơ'
  }
};
