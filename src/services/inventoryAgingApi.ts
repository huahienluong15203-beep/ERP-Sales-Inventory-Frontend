import { authFetch, API_BASE_URL } from './api';
import type {
  InventoryAgingReportResponse,
  InventoryAgingFilterParams
} from '../types/inventoryAging';

const AGING_BASE_URL = `${API_BASE_URL}/api/inventory/aging-report`;

/**
 * Lấy dữ liệu báo cáo luân chuyển kho & tuổi hàng (Aging) từ Backend (S8-07)
 * Hỗ trợ phân trang Server-side (page, size) và bộ nhớ đệm
 */
export async function fetchInventoryAgingReport(
  params: InventoryAgingFilterParams = {}
): Promise<InventoryAgingReportResponse> {
  const query = new URLSearchParams();
  if (params.warehouseId && params.warehouseId !== 'ALL') query.set('warehouseId', params.warehouseId);
  if (params.categoryId && params.categoryId !== 'ALL') query.set('categoryId', params.categoryId);
  if (params.agingBracket && params.agingBracket !== 'ALL') query.set('agingBracket', params.agingBracket);
  if (params.keyword && params.keyword.trim()) query.set('keyword', params.keyword.trim());
  if (params.page !== undefined && params.page !== null) query.set('page', params.page.toString());
  if (params.size !== undefined && params.size !== null) query.set('size', params.size.toString());

  const res = await authFetch(`${AGING_BASE_URL}?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải báo cáo luân chuyển kho & tuổi hàng');
  }
  return await res.json();
}

/**
 * Tải trực tiếp file Excel từ Backend (S8-07 /export) với Apache POI định dạng chuẩn
 */
export async function downloadInventoryAgingExcel(
  params: InventoryAgingFilterParams = {}
): Promise<Blob> {
  const query = new URLSearchParams();
  if (params.warehouseId && params.warehouseId !== 'ALL') query.set('warehouseId', params.warehouseId);
  if (params.categoryId && params.categoryId !== 'ALL') query.set('categoryId', params.categoryId);
  if (params.agingBracket && params.agingBracket !== 'ALL') query.set('agingBracket', params.agingBracket);
  if (params.keyword && params.keyword.trim()) query.set('keyword', params.keyword.trim());

  const res = await authFetch(`${AGING_BASE_URL}/export?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể xuất file Excel báo cáo luân chuyển kho');
  }
  return await res.blob();
}
