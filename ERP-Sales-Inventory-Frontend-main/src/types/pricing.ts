export type PriceListType = 'RETAIL' | 'WHOLESALE_T1' | 'WHOLESALE_T2' | 'SPECIAL_PROMO';
export type PriceListStatus = 'ACTIVE' | 'DRAFT' | 'PAUSED';

export interface PriceListItem {
  id: string;
  sku: string;
  productName: string;
  baseUnit: string; // Đơn vị tính cơ sở (chai, lon, gói...)
  saleUnit: string; // Đơn vị tính bán hàng (thùng, lốc, két...)
  conversionRate: number; // 1 saleUnit = conversionRate baseUnit
  standardPrice: number; // Giá niêm yết chuẩn (VND)
  appliedPrice: number; // Giá bán áp dụng trong bảng giá này (VND)
  note?: string;
}

export interface PriceListFormData {
  code: string;
  name: string;
  type: PriceListType;
  effectiveFrom: string;
  effectiveTo: string;
  status: PriceListStatus;
  currency: string;
  description: string;
  items: PriceListItem[];
}

export type DiscountType = 'PERCENT' | 'AMOUNT';

export interface DiscountTier {
  id: string;
  tierNumber: number;
  minQuantity: number;
  maxQuantity: number | null; // null = Không giới hạn (từ minQuantity trở lên)
  discountType: DiscountType;
  discountValue: number; // % (0-100) hoặc số tiền VND/đơn vị
  note?: string;
}

export interface ProductDiscountConfig {
  productId: string;
  productName: string;
  sku: string;
  priceListId: string;
  priceListName: string;
  basePrice: number;
  saleUnit: string;
  tiers: DiscountTier[];
}

export interface PriceHistoryItem {
  id: string;
  changedAt: string; // Định dạng YYYY-MM-DD HH:mm (UTC+7)
  productSku: string;
  productName: string;
  priceListCode: string;
  priceListName: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number; // newPrice - oldPrice
  changePercent: number; // ((newPrice - oldPrice) / oldPrice) * 100
  changedBy: string;
  role: string;
  reason: string;
  referenceDoc?: string; // Số quyết định / Số công văn
  status: 'EFFECTIVE' | 'PENDING_APPROVAL' | 'EXPIRED';
}
