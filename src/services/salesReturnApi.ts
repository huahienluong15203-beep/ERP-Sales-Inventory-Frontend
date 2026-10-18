import { authFetch, API_BASE_URL } from './api';

export interface ReturnableInvoiceLine {
  invoiceLineId: number;
  lineNo: number;
  productId: number;
  productSku: string;
  productName: string;
  unitName: string;
  conversionFactor: number;
  deliveredQuantity: number;
  previouslyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  pricePerUnit: number;
  hasBatchManagement: boolean;
  batchNumber?: string;
  manufactureDate?: string;
  expiredDate?: string;
}

export interface SalesReturnItemPayload {
  invoiceLineId: number;
  returnQuantity: number;
  batchNumber?: string;
  manufactureDate?: string;
  expiredDate?: string;
  isDamaged?: boolean;
  lineNotes?: string;
}

export interface CreateSalesReturnPayload {
  invoiceId: number;
  receivingWarehouseId: number;
  returnReason: string;
  reasonDescription?: string;
  returnDate?: string;
  notes?: string;
  items: SalesReturnItemPayload[];
}

export interface SalesReturnLineItem {
  id: number;
  lineNo: number;
  invoiceLineId: number;
  productId: number;
  productSku: string;
  productName: string;
  unitName: string;
  returnQuantity: number;
  pricePerUnit?: number;
  unitPrice?: number;
  lineAmount?: number;
  totalAmount?: number;
  batchNumber?: string;
  manufactureDate?: string;
  expiredDate?: string;
  isDamaged: boolean;
  restocked?: boolean;
  lineNotes?: string;
}

export interface SalesReturnItem {
  id: number;
  code: string;
  invoiceId: number;
  invoiceCode: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  receivingWarehouseId: number;
  receivingWarehouseCode?: string;
  receivingWarehouseName?: string;
  warehouseCode?: string;
  warehouseName?: string;
  status: 'PENDING_RECEIPT' | 'RECEIVED' | 'CANCELLED';
  returnReason: string;
  reasonDescription?: string;
  returnDate: string;
  notes?: string;
  totalQuantity: number;
  totalAmount: number;
  createdByUsername: string;
  createdAt: string;
  receivedByUsername?: string;
  receivedAt?: string;
  receiveNotes?: string;
  lines: SalesReturnLineItem[];
}

export interface SalesReturnFilterParams {
  customerId?: number;
  warehouseId?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

const SALES_RETURNS_URL = `${API_BASE_URL}/api/sales-returns`;

/**
 * Lấy danh sách phiếu trả hàng (phân trang + lọc)
 */
export async function fetchSalesReturns(params: SalesReturnFilterParams = {}) {
  const query = new URLSearchParams();
  if (params.customerId) query.append('customerId', String(params.customerId));
  if (params.warehouseId) query.append('warehouseId', String(params.warehouseId));
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.keyword?.trim()) query.append('keyword', params.keyword.trim());
  query.append('page', String(params.page || 0));
  query.append('size', String(params.size || 20));

  const res = await authFetch(`${SALES_RETURNS_URL}?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải danh sách phiếu trả hàng');
  }
  return await res.json();
}

/**
 * Lấy chi tiết phiếu trả hàng
 */
export async function fetchSalesReturnDetail(id: number): Promise<SalesReturnItem> {
  const res = await authFetch(`${SALES_RETURNS_URL}/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải chi tiết phiếu trả hàng');
  }
  return await res.json();
}

/**
 * Lấy danh sách các dòng hàng có thể trả từ hoá đơn gốc
 */
export async function fetchReturnableInvoiceLines(invoiceId: number): Promise<ReturnableInvoiceLine[]> {
  const res = await authFetch(`${SALES_RETURNS_URL}/invoice-lines/${invoiceId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải danh sách dòng hàng của hoá đơn');
  }
  return await res.json();
}

/**
 * Lập phiếu trả hàng mới
 */
export async function createSalesReturn(payload: CreateSalesReturnPayload): Promise<SalesReturnItem> {
  const res = await authFetch(SALES_RETURNS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể lập phiếu trả hàng');
  }
  return await res.json();
}

/**
 * Quản lý kho xác nhận nhận hàng và cộng tồn kho ngược lại (AC4)
 */
export async function confirmReceiveAndRestock(id: number, receiveNotes?: string): Promise<SalesReturnItem> {
  const res = await authFetch(`${SALES_RETURNS_URL}/${id}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: receiveNotes })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể xác nhận nhận hàng');
  }
  return await res.json();
}

/**
 * Huỷ phiếu trả hàng
 */
export async function cancelSalesReturn(id: number, cancelReason?: string): Promise<SalesReturnItem> {
  const res = await authFetch(`${SALES_RETURNS_URL}/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancelReason })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể huỷ phiếu trả hàng');
  }
  return await res.json();
}
