/**
 * S6-02: Định nghĩa kiểu dữ liệu Thẻ kho chi tiết (Stock Card)
 * - Quản lý mọi biến động nhập, xuất, chuyển kho, điều chỉnh kiểm kê theo thứ tự thời gian
 * - Tồn sau từng phát sinh và liên kết trực tiếp tới chứng từ gốc
 * - Tồn đầu kỳ, tổng nhập, tổng xuất, tồn cuối kỳ và tồn thực tế hiện tại
 */

export type StockMovementType =
  | 'RECEIPT'
  | 'SALES_DISPATCH'
  | 'DELIVERY_RETURN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'STOCKTAKE_ADJUST'
  | 'SALES_RETURN'
  | 'STOCK_ADJUSTMENT';

export type StockDocType =
  | 'GOODS_RECEIPT'
  | 'SALES_ORDER'
  | 'STOCK_TRANSFER'
  | 'STOCK_TAKE'
  | 'SALES_RETURN'
  | 'STOCK_ADJUSTMENT';

export interface StockCardRow {
  id: number;
  movementAt: string;          // ISO LocalDateTime: "2026-10-15T09:30:00"
  movementType: StockMovementType | string;
  movementTypeLabel: string;
  warehouseId?: number;
  warehouseCode?: string;
  warehouseName?: string;
  productId?: number;
  productSku?: string;
  productName?: string;
  baseUnit: string;
  quantityIn: number;          // >= 0 (theo ĐVT cơ sở)
  quantityOut: number;         // >= 0 (theo ĐVT cơ sở)
  balanceAfter: number;        // Tồn sau phát sinh
  docType?: StockDocType | string;
  docId?: number;
  docCode?: string;
  note?: string;
  actorUsername?: string;
}

export interface StockCardPageData {
  content: StockCardRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface StockCardResponse {
  warehouseId?: number | null;
  productId?: number | null;
  fromDate?: string | null;     // YYYY-MM-DD
  toDate?: string | null;       // YYYY-MM-DD
  openingBalance?: number | null;
  totalIn?: number | null;
  totalOut?: number | null;
  closingBalance?: number | null;
  currentPhysicalStock?: number | null;
  movements: StockCardPageData;
}

export interface StockCardFilterParams {
  warehouseId?: number | string;
  productId?: number | string;
  fromDate?: string;           // YYYY-MM-DD
  toDate?: string;             // YYYY-MM-DD
  type?: string;               // RECEIPT, SALES_DISPATCH, etc.
  sortDirection?: 'ASC' | 'DESC'; // Thứ tự sắp xếp theo thời gian
  page?: number;               // 0-indexed
  size?: number;               // default 50
}

/** Cấu hình nhãn & màu sắc trực quan cho từng loại nghiệp vụ phát sinh */
export interface MovementTypeConfig {
  code: StockMovementType;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotColor: string;
  direction: 'IN' | 'OUT' | 'ADJUST';
}

export const MOVEMENT_TYPES_MAP: Record<string, MovementTypeConfig> = {
  RECEIPT: {
    code: 'RECEIPT',
    label: 'Nhập kho',
    shortLabel: 'Nhập kho',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotColor: '#059669',
    direction: 'IN'
  },
  SALES_DISPATCH: {
    code: 'SALES_DISPATCH',
    label: 'Xuất bán',
    shortLabel: 'Xuất bán',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80',
    dotColor: '#ea580c',
    direction: 'OUT'
  },
  DELIVERY_RETURN: {
    code: 'DELIVERY_RETURN',
    label: 'Nhập hàng hoàn',
    shortLabel: 'Hàng hoàn',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
    dotColor: '#7c3aed',
    direction: 'IN'
  },
  TRANSFER_OUT: {
    code: 'TRANSFER_OUT',
    label: 'Xuất chuyển kho',
    shortLabel: 'Chuyển đi',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dotColor: '#d97706',
    direction: 'OUT'
  },
  TRANSFER_IN: {
    code: 'TRANSFER_IN',
    label: 'Nhận chuyển kho',
    shortLabel: 'Nhận chuyển',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    dotColor: '#0891b2',
    direction: 'IN'
  },
  STOCKTAKE_ADJUST: {
    code: 'STOCKTAKE_ADJUST',
    label: 'Điều chỉnh kiểm kê',
    shortLabel: 'Kiểm kê',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    dotColor: '#4f46e5',
    direction: 'ADJUST'
  },
  SALES_RETURN: {
    code: 'SALES_RETURN',
    label: 'Nhập hàng trả',
    shortLabel: 'Hàng trả',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
    dotColor: '#0d9488',
    direction: 'IN'
  },
  STOCK_ADJUSTMENT: {
    code: 'STOCK_ADJUSTMENT',
    label: 'Xuất hủy hao hụt',
    shortLabel: 'Xuất hủy',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dotColor: '#e11d48',
    direction: 'OUT'
  }
};

/** Cấu hình nhãn chứng từ gốc và đường dẫn chi tiết tương ứng */
export const DOC_TYPES_MAP: Record<string, { label: string; prefix: string; path: (id: number | string) => string }> = {
  GOODS_RECEIPT: {
    label: 'Phiếu nhập kho',
    prefix: 'PNK',
    path: (id) => `/inventory/receipts/${id}`
  },
  SALES_ORDER: {
    label: 'Đơn đặt hàng bán',
    prefix: 'SO',
    path: (id) => `/orders/${id}`
  },
  STOCK_TRANSFER: {
    label: 'Phiếu chuyển kho',
    prefix: 'CK',
    path: (id) => `/inventory/transfers?id=${id}`
  },
  STOCK_TAKE: {
    label: 'Phiếu kiểm kê',
    prefix: 'PKK',
    path: (id) => `/inventory/stocktakes/${id}`
  },
  SALES_RETURN: {
    label: 'Phiếu trả hàng bán',
    prefix: 'SR',
    path: (id) => `/sales-returns/${id}`
  },
  STOCK_ADJUSTMENT: {
    label: 'Phiếu điều chỉnh tồn kho',
    prefix: 'ADJ',
    path: (id) => `/inventory/stock-adjustments/${id}`
  }
};
