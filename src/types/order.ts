/**
 * Story S3-09 / SCRUM-14: Đặt hàng cho đại lý (Sales Order Creation)
 * Phân hệ: EP-04: Đặt hàng & Duyệt ngoại lệ (order, cart, approval)
 * Vai trò: Nhân viên kinh doanh (ROLE_SALES_REP), Quản lý kinh doanh (ROLE_SALES_MANAGER), Admin
 *
 * Tiêu chí nghiệm thu cốt lõi (Acceptance Criteria):
 * 1. Chọn đại lý, điểm giao hàng (S3-04), ngày giao mong muốn.
 * 2. Thêm dòng hàng bằng tìm kiếm theo mã SKU hoặc tên, chọn đơn vị tính (thùng/lon/lốc) và số lượng.
 * 3. Hiển thị tổng tiền hàng, chiết khấu sản lượng (S3-01), tổng phải thu ngay khi thêm dòng (real-time).
 * 4. Lưu nháp (Draft) được và mở lại tiếp tục gõ mà không mất dữ liệu.
 * 5. Tối ưu hóa tuyệt đối cho màn hình di động 360px khi sales đứng gõ tại cửa hàng đại lý.
 */

import type { CustomerGroupId } from './agency';

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

/**
 * Đơn vị tính có thể chọn cho dòng sản phẩm
 */
export interface OrderItemUnitOption {
  unitName: string;
  conversionFactor: number; // Hệ số nhân so với đơn vị tính cơ sở (vd: Thùng 24 lon => factor = 24)
  isBaseUnit: boolean;
  unitPrice: number;        // Đơn giá bán theo đơn vị này (đã nhân hệ số và tính theo bảng giá)
  floorPrice?: number;      // Giá sàn theo đơn vị này
  availableStock?: number;  // Tồn khả dụng theo đơn vị này (S4-03)
}

/**
 * Một dòng hàng trong đơn đặt hàng
 */
export interface OrderItem {
  id: string;               // ID duy nhất của dòng (UUID hoặc timestamp)
  productId: string | number;
  sku: string;              // Mã SKU (vd: BIA-HN-330)
  name: string;             // Tên sản phẩm
  category?: string;        // Nhóm ngành hàng
  baseUnit: string;         // Đơn vị tính cơ sở (vd: Lon, Chai, Gói)
  selectedUnit: string;     // Đơn vị tính khách đặt (vd: Thùng, Lốc, Lon)
  conversionFactor: number; // Hệ số quy đổi (vd: 24)
  quantity: number;         // Số lượng theo đơn vị tính đã chọn
  baseQuantity: number;     // Số lượng quy đổi ra ĐVT cơ sở (quantity * conversionFactor)
  unitPrice: number;        // Giá bán 1 đơn vị tính đã chọn (VND)
  rawAmount: number;        // Thành tiền trước chiết khấu = quantity * unitPrice
  discountPercent: number;  // % chiết khấu sản lượng áp dụng (Best-Deal)
  discountAmount: number;   // Số tiền chiết khấu (VND)
  finalAmount: number;      // Thành tiền sau chiết khấu = rawAmount - discountAmount
  appliedDiscountNote?: string; // Ghi chú chính sách chiết khấu đã hưởng
  availableUnits: OrderItemUnitOption[]; // Danh sách đơn vị tính hỗ trợ quy đổi
  // S4-01: Áp giá tự động & Sửa giá thủ công
  originalUnitPrice?: number; // Đơn giá gốc từ bảng giá hiệu lực
  floorPrice?: number;        // Giá sàn theo đơn vị tính đã chọn
  isCustomPrice?: boolean;    // Cờ đánh dấu đã sửa giá thủ công
  isBelowFloor?: boolean;     // Cờ đánh dấu bán dưới giá sàn
  // S4-03: Quản lý tồn khả dụng & Chặn đặt vượt tồn
  warehouseCode?: string;     // Mã kho phục vụ đại lý (vd: WH-MB01)
  warehouseName?: string;     // Tên kho phục vụ đại lý (vd: Kho Tổng Miền Bắc)
  physicalStock?: number;     // Tồn thực tế trong kho (theo ĐVT cơ sở)
  reservedStock?: number;     // Tồn đang giữ chỗ cho đơn khác (theo ĐVT cơ sở)
  availableStock?: number;    // Tồn khả dụng = physicalStock - reservedStock (theo ĐVT cơ sở)
  availableInSelectedUnit?: number; // Tồn khả dụng theo ĐVT đã chọn
  isOverStock?: boolean;      // Cờ đặt vượt tồn khả dụng
  maxAllowedQuantity?: number;// Số lượng tối đa còn đặt được theo ĐVT đã chọn
}

/**
 * Dữ liệu đơn hàng / Đơn nháp
 */
export interface OrderDraft {
  id: string;                       // Mã đơn nháp (vd: DRAFT-20261005-XXXX)
  backendDraftId?: number;          // ID đơn nháp trên máy chủ Backend (nếu có)
  orderNumber?: string;             // Số hiệu đơn hàng khi đã chốt (vd: DH-20261005-001)
  status: OrderStatus;
  // Thông tin đại lý mua hàng
  agencyId: string;
  agencyCode: string;
  agencyName: string;
  agencyTaxCode?: string;
  agencyPhone?: string;
  agencyAddress?: string;
  customerGroup: CustomerGroupId;
  customerGroupName: string;
  pricingTierCode: string;
  pricingTierName: string;
  // Kiểm soát nợ & chặn tạo đơn (S3-07)
  isTransactionLocked?: boolean;
  transactionLockReason?: string;
  currentDebt?: number;
  creditLimit?: number;
  // Điểm giao hàng (S3-04)
  deliveryPointId: string;
  deliveryPointName: string;
  deliveryAddress: string;
  deliveryContactPerson?: string;
  deliveryPhone?: string;
  deliveryRouteNotes?: string;
  // Kế hoạch giao hàng
  expectedDeliveryDate: string;     // YYYY-MM-DD (>= ngày hiện tại)
  note?: string;                    // Ghi chú của sales rep
  // Danh sách dòng hàng
  items: OrderItem[];
  // Tổng kết tài chính (Real-time rollup)
  totalItemsCount: number;          // Số loại mặt hàng
  totalQuantity: number;            // Tổng số lượng kiện hàng
  subtotalAmount: number;           // Tổng tiền hàng trước giảm (VND)
  discountAmount: number;           // Tổng số tiền chiết khấu (VND)
  vatAmount?: number;               // Tiền thuế nếu có (0 nếu đã gồm VAT)
  totalPayable: number;             // Tổng số tiền phải thu (VND)
  // Quản trị & Nhân sự phụ trách
  salesRepId: string;
  salesRepName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bộ lọc danh sách đơn nháp
 */
export interface OrderDraftFilterParams {
  keyword?: string;
  agencyId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Payload khi tạo mới hoặc cập nhật đơn đặt hàng
 */
export interface SaveOrderPayload {
  id?: string;
  agencyId: string;
  deliveryPointId: string;
  expectedDeliveryDate: string;
  note?: string;
  items: {
    productId: string | number;
    sku: string;
    name: string;
    selectedUnit: string;
    conversionFactor: number;
    quantity: number;
    unitPrice: number;
  }[];
  isDraft: boolean; // true = Lưu nháp, false = Chốt đơn chính thức
}

/**
 * Backend API DTOs cho Story S3-09
 */
export interface OrderDraftBackendRequest {
  draftId?: number | null;
  customerId: number;
  deliveryAddressId?: number | null;
  desiredDeliveryDate?: string | null;
  note?: string | null;
  lines: Array<{
    productSku: string;
    unitName?: string | null;
    quantity: number;
    unitPrice?: number | null;
  }>;
}

export interface OrderLineBackendResponse {
  id?: number | null;
  lineNo: number;
  productId: number;
  productSku: string;
  productName: string;
  unitName: string;
  conversionFactor: number;
  quantity: number;
  baseUnit: string;
  baseQuantity: number;
  priceListCode?: string | null;
  unitPrice: number;
  pricePerUnit: number;
  floorPrice?: number;
  grossAmount: number;
  discountPolicyCode?: string | null;
  discountAmount: number;
  netAmount: number;
}

export interface OrderBackendResponse {
  id?: number | null;
  code?: string | null;
  status: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerGroup: string;
  customerGroupLabel: string;
  deliveryAddress?: {
    id: number;
    label: string;
    address: string;
    receiverName?: string;
    receiverPhone?: string;
  } | null;
  desiredDeliveryDate?: string | null;
  note?: string | null;
  lines: OrderLineBackendResponse[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  createdByUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  warnings?: string[];
}

export interface ProductOptionBackendResponse {
  productId: number;
  sku: string;
  name: string;
  baseUnit: string;
  units: Array<{
    unitName: string;
    conversionFactor: number;
  }>;
  priceAvailable: boolean;
  unitPrice?: number | null;
  floorPrice?: number | null;
  priceListCode?: string | null;
  message?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  physicalStock?: number | null;
  reservedStock?: number | null;
  availableStock?: number | null;
}
