export type StockAdjustmentReason =
  | 'DAMAGED_GOODS'
  | 'LOST_GOODS'
  | 'EXPIRED_DISPOSAL'
  | 'OTHER';

export type StockAdjustmentStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface StockAdjustmentLine {
  id: number;
  lineNo: number;
  productId: number;
  productSku: string;
  productName: string;
  baseUnit: string;
  currentStock: number;
  adjustmentQuantity: number;
  costPrice: number;
  lossValue: number;
  hasBatchManagement: boolean;
  batchNumber?: string;
  productLotId?: number;
  lineNotes?: string;
}

export interface StockAdjustment {
  id: number;
  code: string;
  adjustmentDate: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  adjustmentReason: StockAdjustmentReason | string;
  adjustmentReasonLabel: string;
  reasonDescription?: string;
  status: StockAdjustmentStatus;
  statusLabel: string;
  totalQuantity: number;
  totalLossValue: number;
  rejectionReason?: string;
  notes?: string;
  createdById?: number;
  createdByName: string;
  approvedById?: number;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  lines: StockAdjustmentLine[];
}

export interface StockAdjustmentItemRequest {
  productId: number;
  adjustmentQuantity: number;
  batchNumber?: string;
  lineNotes?: string;
}

export interface StockAdjustmentCreateRequest {
  warehouseId: number;
  adjustmentReason: string;
  reasonDescription?: string;
  adjustmentDate?: string;
  notes?: string;
  items: StockAdjustmentItemRequest[];
}

export interface StockAdjustmentDecisionRequest {
  notes?: string;
}

export interface StockAdjustmentFilterParams {
  warehouseId?: number;
  status?: string;
  reason?: string;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  size?: number;
}
