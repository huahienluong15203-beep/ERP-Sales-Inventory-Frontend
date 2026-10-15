export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER';

export type PaymentStatus = 'PENDING_SUBMISSION' | 'CONFIRMED' | 'REJECTED';

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
  allocationType: AllocationType;
  allocations: InvoicePaymentAllocation[];
  createdAt: string;
}

export interface PaymentReceiptCreateRequest {
  customerId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  collectorName: string;
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
  notes?: string;
  receiptImageBase64?: string;
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
