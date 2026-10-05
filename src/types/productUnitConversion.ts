/**
 * Định nghĩa kiểu dữ liệu Đơn vị tính quy đổi (Product Unit Conversion)
 */

export interface ProductUnitConversion {
  id?: number | null;
  productId?: number;
  sku?: string;
  unitName: string;
  conversionFactor: number;
  isBaseUnit?: boolean;
  baseUnit?: boolean;
  formula?: string;
  barcode?: string;
  isDefaultPurchase?: boolean;
  isDefaultSale?: boolean;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
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
