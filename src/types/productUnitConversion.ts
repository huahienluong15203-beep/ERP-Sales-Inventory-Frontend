/**
 * S2-07 / SCRUM-43 / SCRUM-77: Định nghĩa kiểu dữ liệu Đơn vị tính quy đổi (Product Unit Conversion)
 * Phân hệ: EP-02: Sản phẩm & Bảng giá
 *
 * Tiêu chí nghiệp vụ:
 * 1. Mỗi SKU khai báo được nhiều đơn vị: lon, lốc, thùng kèm hệ số quy đổi về đơn vị cơ sở.
 * 2. Đơn hàng và phiếu kho nhập theo đơn vị nào cũng quy về đơn vị cơ sở khi ghi sổ.
 * 3. Đổi hệ số quy đổi không làm sai lệch các giao dịch đã ghi trước đó.
 */

export interface ProductUnitConversion {
  id?: number;
  productId: number;
  sku: string;
  unitName: string;
  conversionFactor: number;
  isBaseUnit: boolean;
  formula?: string;
  barcode?: string;
  isDefaultPurchase?: boolean;
  isDefaultSale?: boolean;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductUnitConversionRequest {
  unitName: string;
  conversionFactor: number;
  barcode?: string;
  isDefaultPurchase?: boolean;
  isDefaultSale?: boolean;
  description?: string;
}

export interface UpdateProductUnitConversionRequest {
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
}
