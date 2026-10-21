export type AgingBracket = 'ALL' | '0_30' | '31_60' | '61_90' | 'OVER_90';
export type TurnoverSpeed = 'FAST' | 'NORMAL' | 'SLOW' | 'STAGNANT';

export interface InventoryAgingItem {
  id: string | number;
  productId: number;
  productSku: string;
  productName: string;
  categoryName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  baseUnit: string;
  quantity: number;
  costPrice: number; // Giá vốn / Đơn giá
  totalValue: number; // Tổng giá trị tồn = quantity * costPrice
  averageAgingDays: number; // Số ngày lưu kho bình quân
  agingBracket: AgingBracket;
  turnoverSpeed: TurnoverSpeed;
  lastMovementDate?: string;
}

export interface InventoryAgingSummary {
  totalInventoryValue: number; // Tổng giá trị tồn kho (VNĐ)
  slowMovingCount: number; // Số SKU chậm luân chuyển (> 60 ngày)
  slowMovingRatio: number; // Tỷ lệ % hàng chậm luân chuyển
  stagnantValue: number; // Tiền vốn bị đọng (> 90 ngày)
  averageSystemDays: number; // Số ngày tồn kho bình quân toàn hệ thống
}

export interface InventoryAgingFilterParams {
  warehouseId?: string;
  categoryId?: string;
  agingBracket?: AgingBracket;
  keyword?: string;
}
