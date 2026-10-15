/**
 * S5-08: Kiểm kê kho và ghi nhận chênh lệch
 */

export type StockTakeStatus = 'DRAFT' | 'CLOSED' | 'CANCELLED';

export interface StockTakeLine {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  baseUnit: string;
  systemQuantity: number;
  countedQuantity: number | null;
  difference: number | null;
  note?: string | null;
}

export interface StockTake {
  id: number;
  code: string;
  status: StockTakeStatus;
  statusLabel: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  categoryId?: number | null;
  categoryName?: string | null;
  note?: string | null;
  createdByUsername: string;
  createdAt: string;
  closedByUsername?: string | null;
  closedAt?: string | null;
  closeReason?: string | null;
  lineCount: number;
  countedCount: number;
  differenceCount: number;
  totalSurplus: number;
  totalShortage: number;
  lines?: StockTakeLine[];
}

export interface StockTakeFilterParams {
  warehouseId?: number | string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

export interface StockTakeCreatePayload {
  warehouseId: number;
  categoryId?: number | null;
  categoryIds?: number[] | null;
  note?: string;
}

export interface StockTakeCountPayload {
  lines: {
    lineId: number;
    countedQuantity: number | null;
    note?: string;
  }[];
}

export interface StockTakePageResponse {
  content: StockTake[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
