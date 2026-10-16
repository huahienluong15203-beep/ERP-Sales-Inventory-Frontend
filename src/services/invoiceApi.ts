/**
 * S7-01: API Phát hành & Quản lý hóa đơn bán hàng
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  InvoiceSearchParams,
  InvoiceSummaryResponse,
  UninvoicedOrderResponse,
  InvoiceIssueRequest,
  InvoiceResponse
} from '../types/invoice';
import type { PageResponse } from '../types/payment';

/**
 * 1. Tìm kiếm và phân trang danh sách hoá đơn
 * GET /api/invoices
 */
export async function searchInvoices(
  params: InvoiceSearchParams = {}
): Promise<PageResponse<InvoiceSummaryResponse>> {
  const query = new URLSearchParams();
  if (params.customerId) query.append('customerId', String(params.customerId));
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.keyword?.trim()) query.append('keyword', params.keyword.trim());
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.size !== undefined) query.append('size', String(params.size));

  const res = await authFetch(`${API_BASE_URL}/api/invoices?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không thể tải danh sách hoá đơn');
  }
  return await res.json();
}

/**
 * 2. Lấy danh sách các đơn đã giao hàng (DELIVERED) chưa lập hoá đơn của đại lý trong kỳ
 * GET /api/invoices/uninvoiced-orders
 */
export async function fetchUninvoicedOrders(
  customerId: number,
  fromDate?: string,
  toDate?: string
): Promise<UninvoicedOrderResponse[]> {
  const query = new URLSearchParams();
  query.append('customerId', String(customerId));
  if (fromDate) query.append('fromDate', fromDate);
  if (toDate) query.append('toDate', toDate);

  const res = await authFetch(`${API_BASE_URL}/api/invoices/uninvoiced-orders?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không thể tải danh sách đơn chưa lập hoá đơn');
  }
  return await res.json();
}

/**
 * 3. Xem trước hoá đơn (preview) không lưu DB, không cấp số hoá đơn
 * POST /api/invoices/preview
 */
export async function previewInvoice(payload: InvoiceIssueRequest): Promise<InvoiceResponse> {
  const res = await authFetch(`${API_BASE_URL}/api/invoices/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không thể xem trước hoá đơn');
  }
  return await res.json();
}

/**
 * 4. Phát hành chính thức hoá đơn
 * POST /api/invoices
 * Tự sinh số hoá đơn liên tục không trùng HD2026-XXXXXX, khoá sửa/xoá theo AC2 & AC4
 */
export async function issueInvoice(payload: InvoiceIssueRequest): Promise<InvoiceResponse> {
  const res = await authFetch(`${API_BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không thể phát hành hoá đơn');
  }
  return await res.json();
}

/**
 * 5. Lấy chi tiết một hoá đơn theo ID
 * GET /api/invoices/{id}
 */
export async function fetchInvoiceById(id: number): Promise<InvoiceResponse> {
  const res = await authFetch(`${API_BASE_URL}/api/invoices/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không tìm thấy hoá đơn');
  }
  return await res.json();
}

/**
 * 6. Lấy mẫu in HTML A4 của hoá đơn (chuẩn Bộ Tài Chính)
 * GET /api/invoices/{id}/print
 */
export async function fetchInvoicePrintHtml(id: number, autoPrint = false): Promise<string> {
  const res = await authFetch(`${API_BASE_URL}/api/invoices/${id}/print?autoprint=${autoPrint}`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không thể tải mẫu in hoá đơn');
  }
  return await res.text();
}
