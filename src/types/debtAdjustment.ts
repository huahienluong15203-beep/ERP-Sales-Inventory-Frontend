export type DebtAdjustmentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface DebtAdjustmentItem {
  id: number;
  productSku: string;
  productName: string;
  baseUnit: string;
  returnQuantity: number;
  originalSoldPrice: number; // Giá bán thực tế trên hoá đơn gốc (AC2)
  currentCatalogPrice: number; // Giá niêm yết hiện hành
  adjustmentAmount: number; // returnQuantity * originalSoldPrice
}

export interface DebtAdjustment {
  id: number;
  adjustmentCode: string; // VD: CT-DC-202610-01
  returnOrderCode: string; // Phiếu trả hàng đã xác nhận nhập kho (AC1)
  originalInvoiceId: number;
  originalInvoiceCode: string; // Hoá đơn gốc giữ nguyên (AC4)
  originalInvoiceDate: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  status: DebtAdjustmentStatus;
  items: DebtAdjustmentItem[];
  totalAdjustmentAmount: number; // Tổng tiền giảm trừ công nợ
  returnReason: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalNote?: string;
}

export interface DebtAdjustmentFilterParams {
  status?: string;
  customerId?: string;
  keyword?: string;
}
