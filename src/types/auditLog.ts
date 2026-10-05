/**
 * TypeScript types cho Nhật ký thao tác hệ thống (Audit Log - S2-04)
 * "Là Quản trị hệ thống, tôi muốn xem nhật ký thao tác trên tồn kho và công nợ,
 * để truy được ai đã điều chỉnh tồn khi cuối tháng kiểm kê bị lệch."
 */

export type AuditModuleKey = 'INVENTORY' | 'DEBT_LIMIT' | 'PRICING' | 'INVOICE' | 'CUSTOMER';

export interface AuditModuleOption {
  value: AuditModuleKey;
  label: string;
  badgeBg: string;
  badgeColor: string;
  iconName: string;
  description: string;
}

export interface AuditLogItem {
  id: number;
  module: AuditModuleKey;
  moduleLabel: string;
  action: string;               // VD: ADJUST_STOCK, UPDATE_DEBT_LIMIT, CHANGE_PRICE...
  actionLabel?: string;          // Nhãn hiển thị tiếng Việt
  targetType: string;           // PRODUCT, INVENTORY, CUSTOMER, PRICE_LIST, INVOICE
  targetId?: number;
  targetCode: string;           // Mã SKU (SP-BIA-001), Mã ĐL (DL-001), Mã Phiếu (PKK-2026-09)
  targetName?: string;          // Tên sản phẩm / Tên đại lý
  actorId?: number;
  actorUsername: string;        // wh_staff, wh_manager, accountant, sales_manager, admin
  actorFullName: string;        // Tên hiển thị người dùng
  actorRole?: string;           // Thủ kho, Quản lý kho, Kế toán, Quản trị viên
  actorAvatarUrl?: string;      // S2-03: Ảnh đại diện người dùng
  actorAvatarThumbnailUrl?: string;
  oldValue: string;             // Giá trị trước điều chỉnh
  newValue: string;             // Giá trị sau điều chỉnh
  deltaFormatted?: string;      // Chênh lệch (+/-) có định dạng
  deltaType?: 'increase' | 'decrease' | 'neutral';
  reason: string;               // Lý do điều chỉnh (Kiểm kê cuối tháng lệch, vỡ nát, tăng hạn mức...)
  ipAddress?: string;           // IP client
  userAgent?: string;
  httpMethod?: string;
  requestUri?: string;
  createdAt: string;            // ISO String
}

export interface AuditLogFilterParams {
  keyword?: string;             // Tìm theo SKU, Mã đối tượng, Tên, Người sửa, Lý do
  module?: AuditModuleKey | 'ALL';
  targetType?: string;
  actorId?: number | 'ALL';
  actorUsername?: string;
  action?: string;
  startDate?: string;           // YYYY-MM-DD
  endDate?: string;             // YYYY-MM-DD
  quickTimeRange?: 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS';
  page?: number;
  size?: number;
}

export interface AuditLogPageResponse {
  content: AuditLogItem[];
  logs?: AuditLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditStatsSummary {
  totalCount: number;
  inventoryCount: number;
  debtCount: number;
  pricingCount: number;
  invoiceCount: number;
  actorCount: number;
}
