/**
 * Kiểu dữ liệu Phân hệ Quản lý Lô hàng & Hạn sử dụng
 */

export type LotStatus = 'ACTIVE' | 'LOCKED';
export type LotExpiryStatus = 'SAFE' | 'NEAR_EXPIRATION' | 'EXPIRED' | 'OUT_OF_STOCK';

export interface ProductLotResponse {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  productBaseUnit: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  batchNumber: string;
  manufactureDate?: string | null;
  expiredDate: string;
  quantity: number;
  supplierId?: number | null;
  supplierCode?: string | null;
  supplierName?: string | null;
  notes?: string | null;
  status: LotStatus;
  daysToExpiration: number;
  expiryStatus: LotExpiryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductLotStockResponse {
  productId: number;
  productSku: string;
  productName: string;
  baseUnit: string;
  hasBatchManagement: boolean;
  warehouseId?: number | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  totalStock: number;
  validStock: number;
  nearExpiryStock: number;
  expiredStock: number;
  lots: ProductLotResponse[];
}

export interface LotStockSummaryResponse {
  totalLots: number;
  totalQuantity: number;
  safeLots: number;
  safeQuantity: number;
  nearExpiryLots: number;
  nearExpiryQuantity: number;
  expiredLots: number;
  expiredQuantity: number;
  outOfStockLots: number;
  outOfStockQuantity: number;
  daysThresholdApplied: number;
}

export interface LotDispatchValidationRequest {
  productId: number;
  warehouseId: number;
  batchNumber: string;
  quantity: number;
  overrideExpired?: boolean;
  overrideReason?: string;
}

export interface LotDispatchValidationResponse {
  valid: boolean;
  expired: boolean;
  nearExpiry: boolean;
  locked: boolean;
  insufficientQuantity: boolean;
  overrideApplied: boolean;
  message: string;
  batchNumber: string;
  expiredDate?: string | null;
  daysToExpiration?: number | null;
  availableQuantity: number;
  requestedQuantity: number;
}

export interface ProductLotCreateRequest {
  productId: number;
  warehouseId: number;
  batchNumber: string;
  manufactureDate?: string | null;
  expiredDate: string;
  initialQuantity: number;
  supplierId?: number | null;
  notes?: string | null;
}

export interface ProductLotUpdateRequest {
  manufactureDate?: string | null;
  expiredDate?: string | null;
  notes?: string | null;
  status?: LotStatus;
}

export interface ProductLotFilterParams {
  warehouseId?: number | string;
  productId?: number | string;
  keyword?: string;
  status?: string;
  expiryStatus?: string;
  nearExpiryDays?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type ProductLotPageResponse = PageResponse<ProductLotResponse>;

