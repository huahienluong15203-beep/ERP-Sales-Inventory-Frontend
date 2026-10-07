/**
 * S2-10 / SCRUM-55: Định nghĩa kiểu dữ liệu cho Quản lý Bảng giá (EP-02: Sản phẩm & Bảng giá)
 * S3-02 / SCRUM-13: Định nghĩa kiểu dữ liệu cho Lịch sử thay đổi giá & Kiểm toán (EP-02: Sản phẩm & Bảng giá)
 *
 * Quy tắc nghiệp vụ cốt lõi:
 * 1. Nhiều bảng giá song song theo nhóm khách hàng: Đại lý cấp 1, cấp 2, khách lẻ.
 * 2. Mỗi bảng giá có thời gian hiệu lực (ngày bắt đầu, ngày kết thúc tùy chọn).
 * 3. Mỗi dòng giá bao gồm Giá niêm yết và Mức giá sàn (Bán dưới sàn phải duyệt ngoại lệ).
 * 4. Bảng giá đã phát sinh đơn (hasOrders = true) thì không được sửa, chỉ tạo phiên bản mới (v2, v3...).
 * 5. Dữ liệu lịch sử thay đổi giá bất biến (Immutable Audit Trail), không thể sửa hay xoá.
 */

// ============================================================================
// S2-10 / SCRUM-55: BẢNG GIÁ & QUY TẮC GIÁ
// ============================================================================

export type CustomerGroupType = 'DEALER_LEVEL_1' | 'DEALER_LEVEL_2' | 'RETAIL';

export interface CustomerGroupInfo {
  key: CustomerGroupType;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const CUSTOMER_GROUPS: Record<CustomerGroupType, CustomerGroupInfo> = {
  DEALER_LEVEL_1: {
    key: 'DEALER_LEVEL_1',
    label: 'Đại lý cấp 1 (Tổng thầu / NPP Lớn)',
    shortLabel: 'Đại lý Cấp 1',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    description: 'Chính sách chiết khấu cao nhất cho nhà phân phối độc quyền, sản lượng lớn'
  },
  DEALER_LEVEL_2: {
    key: 'DEALER_LEVEL_2',
    label: 'Đại lý cấp 2 (Bán buôn khu vực)',
    shortLabel: 'Đại lý Cấp 2',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    description: 'Áp dụng cho các đại lý bán buôn vệ tinh tại các tỉnh và thành phố'
  },
  RETAIL: {
    key: 'RETAIL',
    label: 'Khách lẻ / Showroom',
    shortLabel: 'Khách lẻ',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    description: 'Giá bán lẻ niêm yết trực tiếp tại điểm bán hoặc khách tiêu dùng cá nhân'
  }
};

export type PriceListStatus = 'ACTIVE' | 'INACTIVE';

export interface PriceListItem {
  id?: number;
  productSku: string;
  productName: string;
  price: number;
  floorPrice: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceListItemRequest {
  productSku: string;
  productName?: string;
  price: number;
  floorPrice: number;
}

export interface PriceList {
  id: number;
  code: string;
  name: string;
  customerGroup: CustomerGroupType;
  customerGroupLabel?: string;
  startDate: string;
  endDate?: string | null;
  status: PriceListStatus;
  hasOrders: boolean;
  version: number;
  note?: string | null;
  itemsCount: number;
  items?: PriceListItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceListRequest {
  code: string;
  name: string;
  customerGroup: CustomerGroupType;
  startDate: string;
  endDate?: string | null;
  note?: string | null;
  items?: PriceListItemRequest[];
}

export interface PriceLookupResponse {
  priceListId: number;
  priceListCode: string;
  priceListName: string;
  customerGroup: CustomerGroupType;
  customerGroupLabel: string;
  effectiveDate: string;
  productSku: string;
  productName: string;
  price: number;
  floorPrice: number;
}

export interface CatalogProduct {
  sku: string;
  name: string;
  defaultCategory: string;
  unit: string;
  suggestedRetailPrice: number;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  { sku: 'BIA-HN-330', name: 'Bia Hà Nội Lon 330ml (Thùng 24 lon)', defaultCategory: 'Đồ uống có cồn', unit: 'Thùng', suggestedRetailPrice: 260000 },
  { sku: 'BIA-SG-330', name: 'Bia Sài Gòn Special Lon 330ml', defaultCategory: 'Đồ uống có cồn', unit: 'Thùng', suggestedRetailPrice: 320000 },
  { sku: 'BIA-TB-330', name: 'Bia Trúc Bạch Chai Cao Cấp 330ml', defaultCategory: 'Đồ uống có cồn', unit: 'Thùng', suggestedRetailPrice: 480000 },
  { sku: 'COCA-320', name: 'Nước ngọt Coca-Cola Lon 320ml', defaultCategory: 'Nước giải khát', unit: 'Thùng', suggestedRetailPrice: 195000 },
  { sku: 'LAVIE-500', name: 'Nước khoáng thiên nhiên Lavie 500ml', defaultCategory: 'Nước giải khát', unit: 'Thùng', suggestedRetailPrice: 110000 },
  { sku: 'REDBULL-250', name: 'Nước tăng lực Red Bull 250ml (Thái Lan)', defaultCategory: 'Nước giải khát', unit: 'Thùng', suggestedRetailPrice: 270000 },
  { sku: 'TH-TRUE-1L', name: 'Sữa tươi tiệt trùng TH True Milk 1L', defaultCategory: 'Thực phẩm dinh dưỡng', unit: 'Thùng', suggestedRetailPrice: 380000 },
  { sku: 'NEPTUNE-1L', name: 'Dầu ăn thượng hạng Neptune Gold 1L', defaultCategory: 'Gia vị thực phẩm', unit: 'Thùng', suggestedRetailPrice: 520000 },
  { sku: 'GAO-ST25-5K', name: 'Gạo ST25 Ông Cua Túi 5kg', defaultCategory: 'Lương thực', unit: 'Túi', suggestedRetailPrice: 180000 },
  { sku: 'CAFE-G7-3IN1', name: 'Cà phê hòa tan G7 Trung Nguyên 3in1 (Hộp 18 gói)', defaultCategory: 'Cà phê & Trà', unit: 'Hộp', suggestedRetailPrice: 58000 }
];

// ============================================================================
// S3-02 / SCRUM-13: LỊCH SỬ THAY ĐỔI GIÁ & KIỂM TOÁN BẤT BIẾN
// ============================================================================

export type PriceType =
  | 'RETAIL_STANDARD'    // Giá bán lẻ niêm yết chuẩn
  | 'WHOLESALE_TIER1'    // Giá đại lý cấp 1 (Tổng thầu / NPP lớn)
  | 'WHOLESALE_TIER2'    // Giá đại lý cấp 2 (Bán buôn khu vực)
  | 'DISTRIBUTOR';       // Giá nhà phân phối độc quyền

export interface PriceTypeOption {
  id: PriceType;
  name: string;
  badgeBg: string;
  badgeColor: string;
  description: string;
}

export interface PriceChangeRecord {
  id: number | string;
  productId: number;
  productSku: string;
  productName: string;
  category: string;
  unit: string;                     // Quy cách / Đơn vị tính (Thùng 24 lon, Lốc 6 chai, Lon...)
  priceType: PriceType;
  priceTypeName: string;            // Tên biểu giá (vd: Giá Đại Lý Cấp 1)
  oldPrice: number;                 // Giá cũ (VND)
  newPrice: number;                 // Giá mới (VND)
  difference: number;              // Chênh lệch (VND) = newPrice - oldPrice
  percentageChange: number;         // Tỷ lệ % thay đổi = ((newPrice - oldPrice) / oldPrice) * 100
  effectiveDate: string;            // Thời điểm áp dụng (ISO datetime string)
  modifierId: number;               // ID người thực hiện
  modifierName: string;             // Họ tên người thực hiện sửa giá
  modifierUsername: string;         // Username (vd: sales_manager, admin)
  modifierRole: string;             // Vai trò (vd: Quản lý kinh doanh, Quản trị viên)
  decisionCode: string;             // Số quyết định / Mã biểu giá tham chiếu (vd: QD-GIA-2026/10)
  reason: string;                   // Lý do điều chỉnh giá
  explanationForAgency: string;     // Kịch bản/Nội dung đối thoại giải thích chi tiết cho Đại lý
  notes?: string;                   // Ghi chú nghiệp vụ bổ sung
  isImmutable: boolean;             // Luôn true (Lịch sử không sửa và không xoá được)
  createdAt: string;                // Thời điểm ghi nhận vào hệ thống
  ipAddress?: string;               // Địa chỉ IP ghi nhận thao tác
}

export interface ProductPricingSummary {
  id: number;
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  packaging: string;
  currentStandardPrice: number;
  currentTier1Price: number;
  currentTier2Price: number;
  lastPriceChangeDate: string;
  changeDirection: 'UP' | 'DOWN' | 'UNCHANGED';
  lastChangePercent: number;
  totalChangeCount: number;
}

export type TimeRangeFilter = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'CUSTOM';
export type TrendFilter = 'ALL' | 'INCREASE' | 'DECREASE';

export interface PriceHistoryFilterParams {
  keyword?: string;
  productSku?: string;
  priceType?: string;
  timeRange?: TimeRangeFilter;
  startDate?: string;
  endDate?: string;
  trend?: TrendFilter;
  page?: number;
  size?: number;
}

export interface PriceHistoryResponse {
  content: PriceChangeRecord[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// S3-01 / SCRUM-12 / SCRUM-77: Re-export Volume Discount Types
export * from './discount';

