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
  deliveryPointCount?: number; // Số lượng điểm giao hàng đã khai báo (S3-04)
  createdAt: string;
  updatedAt: string;
  maxDebtDays?: number;         // Số ngày nợ tối đa cho phép (S3-05)
}

/**
 * Điểm giao hàng của đại lý (S3-04 / SCRUM-15)
 * Một đại lý có thể có nhiều điểm giao hàng (kho tổng, kho phụ, cửa hàng...).
 * Mỗi điểm có: tên điểm giao, địa chỉ, người nhận, số điện thoại, ghi chú đường đi, cờ mặc định.
 */
export interface DeliveryPoint {
  id: string;
  agencyId: string;           // ID của đại lý sở hữu
  name: string;               // Tên điểm giao (vd: "Kho Tổng Gia Lâm", "Kho KCN Sóng Thần")
  address: string;            // Địa chỉ chi tiết
  contactPerson: string;      // Tên người nhận hàng (thủ kho của khách)
  phone: string;              // Số điện thoại người nhận hàng
  routeNotes?: string;        // Ghi chú đường đi (vd: "Đường hẹp cấm xe trên 5 tấn, giao giờ hành chính")
  isDefault: boolean;         // Có phải điểm giao hàng mặc định không
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryPointPayload {
  agencyId: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  routeNotes?: string;
  isDefault?: boolean;
}

export interface UpdateDeliveryPointPayload {
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  routeNotes?: string;
  isDefault?: boolean;
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
/**
 * Nhật ký thay đổi hạn mức công nợ (S3-05 / SCRUM-16)
 */
export interface CreditLimitAuditLog {
  id: string;
  agencyId: string;
  oldCreditLimit: number;
  newCreditLimit: number;
  oldMaxDebtDays: number;
  newMaxDebtDays: number;
  reason: string;               // Bắt buộc nhập lý do
  updatedBy: string;             // Tên người thực hiện (vd: Kế toán Nguyễn Văn A)
  updatedByRole: string;         // Vai trò (ROLE_ACCOUNTANT / ROLE_SALES_MANAGER)
  updatedAt: string;
}

export interface UpdateCreditLimitPayload {
  agencyId: string;
  creditLimit: number;
  maxDebtDays: number;
  reason: string;
}

/**
 * Lịch sử phân công nhân viên phụ trách đại lý (S3-06 / SCRUM-17)
 */
export type AssignmentChangeType = 'CREATE' | 'ASSIGN' | 'TRANSFER';

export interface UserRef {
  id: string | number;
  fullName: string;
  username?: string;
}

export interface CustomerAssignmentHistory {
  id: string | number;
  changeType: AssignmentChangeType;
  fromSalesRep?: UserRef | null;
  toSalesRep?: UserRef | null;
  changedBy?: UserRef | null;
  reason?: string | null;
  changedAt: string;
}

export interface AssignSalesRepPayload {
  agencyId: string;
  salesRepId: string;
  reason?: string;
}

export interface TransferCustomersPayload {
  fromSalesRepId: string;
  toSalesRepId: string;
  regionId?: string;
  reason: string;
}
