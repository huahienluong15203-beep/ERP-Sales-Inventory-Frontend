export type DebtAdjustmentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface DebtAdjustmentItem {
  id: number;
  productSku: string;
  productName: string;
  baseUnit: string;
  returnQuantity: number;
  originalSoldPrice: number; // Giá bán thực tế trên hoá đơn gốc (AC2)
  currentCatalogPrice: number | null; // Giá niêm yết hiện hành (null nếu SKU không còn trong bảng giá)
  adjustmentAmount: number; // returnQuantity * originalSoldPrice
}

export interface DebtAdjustment {
  id: number;
  adjustmentCode: string | null; // Số chứng từ (GG2026-000001), chỉ có sau khi duyệt
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
