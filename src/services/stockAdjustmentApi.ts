import { authFetch, API_BASE_URL } from './api';
import type {
  StockAdjustment,
  StockAdjustmentCreateRequest,
  StockAdjustmentDecisionRequest,
  StockAdjustmentFilterParams
} from '../types/stockAdjustment';

const STOCK_ADJUSTMENTS_URL = `${API_BASE_URL}/api/stock-adjustments`;

/**
 * Tìm kiếm và phân trang danh sách phiếu điều chỉnh tồn kho
 */
export async function fetchStockAdjustments(params: StockAdjustmentFilterParams = {}) {
  const query = new URLSearchParams();
  if (params.warehouseId) query.append('warehouseId', String(params.warehouseId));
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.reason && params.reason !== 'ALL') query.append('reason', params.reason);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.keyword?.trim()) query.append('keyword', params.keyword.trim());
  query.append('page', String(params.page ?? 0));
  query.append('size', String(params.size ?? 20));

  const res = await authFetch(`${STOCK_ADJUSTMENTS_URL}?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải danh sách phiếu điều chỉnh tồn kho');
  }
  return await res.json();
}

/**
 * Xem chi tiết phiếu điều chỉnh tồn kho
 */
export async function fetchStockAdjustmentDetail(id: number | string): Promise<StockAdjustment> {
  const res = await authFetch(`${STOCK_ADJUSTMENTS_URL}/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải chi tiết phiếu điều chỉnh tồn kho');
  }
  return await res.json();
}

/**
 * Lập phiếu điều chỉnh tồn kho mới (Quản lý kho / Thủ kho)
 */
export async function createStockAdjustment(payload: StockAdjustmentCreateRequest): Promise<StockAdjustment> {
  const res = await authFetch(STOCK_ADJUSTMENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể lập phiếu điều chỉnh tồn kho');
  }
  return await res.json();
}

/**
 * Quản lý kho phê duyệt phiếu điều chỉnh tồn kho (AC3: người lập và người duyệt không được là một)
 */
export async function approveStockAdjustment(
  id: number | string,
  decision?: StockAdjustmentDecisionRequest
): Promise<StockAdjustment> {
  const res = await authFetch(`${STOCK_ADJUSTMENTS_URL}/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision || {})
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể phê duyệt phiếu điều chỉnh tồn kho');
  }
  return await res.json();
}

/**
 * Quản lý kho từ chối duyệt phiếu điều chỉnh tồn kho
 */
export async function rejectStockAdjustment(
  id: number | string,
  decision?: StockAdjustmentDecisionRequest
): Promise<StockAdjustment> {
  const res = await authFetch(`${STOCK_ADJUSTMENTS_URL}/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision || {})
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể từ chối duyệt phiếu điều chỉnh tồn kho');
  }
  return await res.json();
}

/**
 * Huỷ phiếu điều chỉnh tồn kho khi còn chờ duyệt
 */
export async function cancelStockAdjustment(
  id: number | string,
  cancelReason?: string
): Promise<StockAdjustment> {
  const res = await authFetch(`${STOCK_ADJUSTMENTS_URL}/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancelReason })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể huỷ phiếu điều chỉnh tồn kho');
  }
  return await res.json();
}
