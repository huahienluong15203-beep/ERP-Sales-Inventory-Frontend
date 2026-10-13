/**
 * S5-05: Định nghĩa kiểu dữ liệu Sổ tồn kho 3 cột
 * - Ba cột tách bạch: tồn thực tế, tồn đang giữ chỗ, tồn khả dụng = thực tế - giữ chỗ
 * - Lọc theo kho, nhóm hàng, trạng thái tồn; tìm nhanh theo mã / tên sản phẩm
 */

export type StockStatus = 'IN_STOCK' | 'FULLY_RESERVED' | 'OUT_OF_STOCK';

export interface StockLedgerRow {
  inventoryId: number;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  productId: number;
  sku: string;
  productName: string;
  productStatus: string;
  categoryId: number;
  categoryName: string;
  baseUnit: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  stockStatus: StockStatus;
  stockStatusLabel: string;
  updatedAt?: string;
}

export interface StockLedgerSummary {
  rowCount: number;
  totalPhysicalStock: number;
  totalReservedStock: number;
  totalAvailableStock: number;
  inStockCount: number;
  fullyReservedCount: number;
  outOfStockCount: number;
}

export interface WarehouseOptionResponse {
  id: number;
  code: string;
  name: string;
  address?: string;
  status: string;
}

export interface StockLedgerFilterParams {
  warehouseId?: number | string;
  categoryId?: number | string;
  stockStatus?: string;
  keyword?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export interface StockLedgerPageResponse {
  content: StockLedgerRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
