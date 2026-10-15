export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface InvoiceItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceSummaryResponse {
  id: number;
  code: string;
  orderId?: number;
  orderCodes?: string[];
  customerId: number;
  customerCode?: string;
  customerName?: string;
  invoiceDate: string;
  dueDate?: string;
  subtotalAmount?: number;
  vatAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  status: InvoiceStatus;
  items?: InvoiceItem[];
  pdfUrl?: string;
  notes?: string;
}
