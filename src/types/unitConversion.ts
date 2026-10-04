/**
 * Kiểu dữ liệu Phân hệ Đơn vị tính quy đổi của SKU (S2-07 / SCRUM-43)
 * Tuân thủ 3 Acceptance Criteria:
 * 1. Mỗi SKU khai báo được nhiều đơn vị (lon, lốc, thùng) kèm hệ số quy đổi về đơn vị cơ sở.
 * 2. Đơn hàng và phiếu kho nhập theo đơn vị nào cũng quy về đơn vị cơ sở khi ghi sổ.
 * 3. Đổi hệ số quy đổi không làm sai lệch các giao dịch đã ghi trước đó (Snapshot & Audit Log).
 */

export interface ProductUnitConversion {
  id: number;
  productId: number;
  sku: string;
  unitName: string;
  conversionFactor: number;
  isBaseUnit: boolean;
  formula: string;
  barcode?: string;
  isDefaultPurchase?: boolean;
  isDefaultSale?: boolean;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductUnitConversionPayload {
  unitName: string;
  conversionFactor: number;
  barcode?: string;
  isDefaultPurchase?: boolean;
  isDefaultSale?: boolean;
  description?: string;
}

export interface UpdateProductUnitConversionPayload {
  unitName?: string;
  conversionFactor: number;
  barcode?: string;
  isDefaultPurchase?: boolean;
  isDefaultSale?: boolean;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  changeReason?: string;
}

export interface UnitConversionCalculateRequest {
  productId?: number;
  sku?: string;
  unitName: string;
  quantity: number;
}

export interface UnitConversionSnapshot {
  transactionUnit: string;
  transactionQuantity: number;
  conversionFactor: number;
  baseUnit: string;
  baseQuantity: number;
}

export interface UnitConversionResult {
  productId: number;
  sku: string;
  productName: string;
  inputUnit: string;
  inputQuantity: number;
  conversionFactor: number;
  baseUnit: string;
  baseQuantity: number;
  formula: string;
  convertedAt?: string;
  snapshot?: UnitConversionSnapshot;
}
