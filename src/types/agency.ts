/**
 * Định nghĩa kiểu dữ liệu Hồ sơ Đại lý / Khách hàng (SCRUM-85 / S3-03 / EP-03)
 * Phân hệ: Đại lý & Hạn mức nợ (customer, debt-limit)
 * Phục vụ: Kế toán công nợ (ROLE_ACCOUNTANT), Quản lý kinh doanh (ROLE_SALES_MANAGER), Admin
 */

export type AgencyStatus = 'ACTIVE' | 'SUSPENDED';

export type CustomerGroupId = 'TIER_1' | 'TIER_2' | 'RETAIL_SHOWROOM';

export interface PricingTier {
  id: string;
  code: string;
  name: string;
  discountPercent: number;
  description: string;
  badgeBg: string;
  badgeColor: string;
}

export interface CustomerGroupOption {
  id: CustomerGroupId;
  name: string;
  description: string;
  defaultPricingTier: PricingTier;
}

export interface RegionOption {
  id: string;
  code: string;
  name: string;
}

export interface SalesRepOption {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  regionId: string;
}

export interface Agency {
  id: string;
  code: string;               // Mã đại lý (Duy nhất, ví dụ: DL-HN-001)
  name: string;               // Tên đại lý
  taxCode: string;            // Mã số thuế (MST)
  customerGroup: CustomerGroupId; // Nhóm khách hàng
  customerGroupName: string;  // Tên nhóm hiển thị
  pricingTier: PricingTier;   // Bảng giá tự động áp dụng từ nhóm khách hàng
  regionId: string;           // Mã khu vực
  regionName: string;         // Tên khu vực (vd: Hà Nội, TP.HCM, Miền Tây...)
  assignedRepId: string;      // ID nhân viên kinh doanh phụ trách
  assignedRepName: string;    // Tên nhân viên kinh doanh phụ trách
  phone: string;
  email: string;
  address: string;
  status: AgencyStatus;       // 'ACTIVE' (Đang hoạt động) | 'SUSPENDED' (Dừng giao dịch)
  suspendReason?: string;     // Lý do khi dừng giao dịch
  suspendedAt?: string;       // Thời điểm dừng giao dịch
  hasTransactions: boolean;   // Đã phát sinh giao dịch -> Không thể xóa, chỉ dừng giao dịch
  transactionCount: number;   // Số lượng giao dịch / đơn hàng đã phát sinh
  totalDebt: number;          // Tổng công nợ hiện tại (VND)
  creditLimit: number;        // Hạn mức tín dụng / công nợ cho phép (VND)
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgencyPayload {
  code: string;
  name: string;
  taxCode: string;
  customerGroup: CustomerGroupId;
  regionId: string;
  assignedRepId: string;
  phone: string;
  email: string;
  address: string;
  creditLimit?: number;
}

export interface UpdateAgencyPayload {
  name: string;
  taxCode: string;
  customerGroup: CustomerGroupId;
  regionId: string;
  assignedRepId: string;
  phone: string;
  email: string;
  address: string;
  creditLimit?: number;
}

export interface SuspendAgencyPayload {
  agencyId: string;
  reason: string;
}

export interface AgencyFilterParams {
  keyword?: string;           // Tìm theo Mã, Tên, MST, SĐT
  customerGroup?: string;
  regionId?: string;
  status?: string;
  page?: number;
  size?: number;
}

export interface AgencyListResponse {
  content: Agency[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}
