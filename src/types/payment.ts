export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER';

export type PaymentStatus = 'PENDING_SUBMISSION' | 'CONFIRMED' | 'REJECTED' | 'VOIDED';

export type AllocationType = 'FIFO' | 'SPECIFIC';

export interface InvoicePaymentAllocation {
  invoiceId: number;
  invoiceCode: string;
  orderCode?: string;
  allocatedAmount: number;
  invoiceTotal: number;
  remainingBefore: number;
  remainingAfter: number;
}

export interface PaymentReceipt {
  id: number | string;
  code: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  payerName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  collectorName: string;
  collectorUsername?: string;
  collectorId?: number;
  notes?: string;
  status: PaymentStatus;
  receiptImageUrl?: string;
  confirmedAt?: string;
  confirmedByUsername?: string;
  rejectedAt?: string;
  rejectedByUsername?: string;
  rejectionReason?: string;
  allocationType: AllocationType;
  allocations: InvoicePaymentAllocation[];
  createdAt: string;
}

export interface PaymentCollector {
  id: number;
  username: string;
  fullName: string;
  role: string;
  phone?: string;
}

export interface PaymentReceiptCreateRequest {
  customerId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  collectorName: string;
  collectorId?: number;
  payerName?: string;
  notes?: string;
  allocationType: AllocationType;
  specificAllocations?: {
    invoiceId: number;
    amount: number;
  }[];
}

export interface RouteCashCollectionRequest {
  customerId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  payerName?: string;
  notes?: string;
  receiptImageUrl?: string;
  receiptImageBase64?: string;
}

export interface PaymentRejectRequest {
  reason: string;
}

export interface PaymentReconciliationItem {
  id: number;
  code: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string;
  receiptImageUrl?: string;
  status: PaymentStatus;
  createdAt: string;
  confirmedAt?: string;
  confirmedByUsername?: string;
  rejectedAt?: string;
  rejectedByUsername?: string;
  rejectionReason?: string;
}

export interface PaymentReconciliationResponse {
  fromDate: string;
  toDate: string;
  collectorId?: number;
  collectorName?: string;
  collectorUsername?: string;
  totalCollectedAmount: number;
  pendingAmount: number;
  confirmedAmount: number;
  rejectedAmount: number;
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  rejectedCount: number;
  items: PaymentReconciliationItem[];
}

export interface PaymentFilterParams {
  customerId?: number | string;
  salesRepId?: number | string;
  paymentMethod?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface CustomerInvoiceDebtItem {
  id: number;
  code: string;
  invoiceDate: string;
  dueDate: string;
  orderCodes: string[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  isOverdue: boolean;
  overdueDays: number;
}

export type PaymentReceiptPageResponse = PageResponse<PaymentReceipt>;
