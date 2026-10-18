import { authFetch, API_BASE_URL } from './api';
import type {
  InventoryAgingItem,
  InventoryAgingSummary,
  InventoryAgingFilterParams
} from '../types/inventoryAging';

const AGING_BASE_URL = `${API_BASE_URL}/api/inventory/aging-report`;

/**
 * Lấy dữ liệu báo cáo luân chuyển kho & tuổi hàng (Aging) từ Backend (S8-07)
 * 100% dữ liệu thực tế từ cơ sở dữ liệu PostgreSQL
 */
export async function fetchInventoryAgingReport(
  params: InventoryAgingFilterParams = {}
): Promise<{ items: InventoryAgingItem[]; summary: InventoryAgingSummary }> {
  const query = new URLSearchParams();
  if (params.warehouseId && params.warehouseId !== 'ALL') query.set('warehouseId', params.warehouseId);
  if (params.categoryId && params.categoryId !== 'ALL') query.set('categoryId', params.categoryId);
  if (params.agingBracket && params.agingBracket !== 'ALL') query.set('agingBracket', params.agingBracket);
  if (params.keyword && params.keyword.trim()) query.set('keyword', params.keyword.trim());

  const res = await authFetch(`${AGING_BASE_URL}?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải báo cáo luân chuyển kho & tuổi hàng');
  }
  return await res.json();
}
