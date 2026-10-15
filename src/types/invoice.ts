/**
 * S7-01: Phát hành hóa đơn bán hàng từ phiếu đã giao (Invoicing)
 * Phân hệ: Kế toán công nợ & Quản lý bán hàng
 */

export interface InvoiceLineResponse {
  lineNo: number;
  orderId: number;
  orderCode: string;
  orderLineId: number;
  productId: number;
  productSku: string;
  productName: string;
  unitName: string;
  quantity: number; // Số lượng thực giao
  baseUnit: string;
  baseQuantity: number;
  pricePerUnit: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
}

export interface InvoiceSummaryResponse {
  id: number;
  code: string; // VD: HD2026-000001
  invoiceDate: string; // YYYY-MM-DD
  status: string; // ISSUED
  customerId: number;
  customerCode: string;
  customerName: string;
  lineCount: number;
  totalAmount: number;
  issuedAt: string;
  issuedByUsername: string;
}

export interface InvoiceResponse {
  id: number | null; // null khi xem trước (preview)
  code: string | null; // null khi xem trước (preview)
  invoiceDate: string;
  status: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerTaxCode?: string;
  customerAddress?: string;
  periodFrom?: string;
  periodTo?: string;
  orderCodes: string[];
  lines: InvoiceLineResponse[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  note?: string;
  issuedAt?: string;
  issuedByUsername?: string;
}

export interface UninvoicedOrderResponse {
  orderId: number;
  orderCode: string;
  status: string;
  deliveredAt: string;
  lineCount: number;
  orderTotalAmount: number; // Tiền theo đơn đặt
  deliveredAmount: number; // Tiền theo số thực giao (AC1)
}

export interface InvoiceIssueRequest {
  customerId: number;
  orderIds?: number[];
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  invoiceDate?: string; // YYYY-MM-DD
  note?: string;
}

export interface InvoiceSearchParams {
  customerId?: number;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  size?: number;
}
