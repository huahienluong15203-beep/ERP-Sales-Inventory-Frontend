/**
 * S5-05: Service API Sổ tồn kho 3 cột (tồn thực tế, đang giữ chỗ, khả dụng)
 * - Ba cột tách bạch theo ĐVT cơ sở
 * - Lọc theo kho, nhóm hàng, trạng thái tồn; tìm nhanh theo mã / tên sản phẩm
 * - Tổng hợp sổ tồn: tổng dòng, tổng 3 cột, số lượng dòng theo trạng thái
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  StockLedgerSummary,
  WarehouseOptionResponse,
  StockLedgerFilterParams,
  StockLedgerPageResponse
} from '../types/stockLedger';

const BASE_URL = `${API_BASE_URL}/api/inventory`;

/**
 * Lấy danh sách sổ tồn kho 3 cột có phân trang và bộ lọc (S5-05)
 */
export async function fetchStockLedger(
  params?: StockLedgerFilterParams
): Promise<StockLedgerPageResponse> {
  const query = new URLSearchParams();
  if (params?.warehouseId !== undefined && params.warehouseId !== '' && params.warehouseId !== 'ALL') {
    query.set('warehouseId', String(params.warehouseId));
  }
  if (params?.categoryId !== undefined && params.categoryId !== '' && params.categoryId !== 'ALL') {
    query.set('categoryId', String(params.categoryId));
  }
  if (params?.stockStatus && params.stockStatus !== 'ALL') {
    query.set('stockStatus', params.stockStatus);
  }
  if (params?.keyword && params.keyword.trim()) {
    query.set('keyword', params.keyword.trim());
  }
  if (params?.sort) {
    query.set('sort', params.sort);
  }
  if (params?.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params?.size !== undefined) {
    query.set('size', String(params.size));
  }

  const url = `${BASE_URL}/stock-ledger?${query.toString()}`;
  const res = await authFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Không thể tải sổ tồn kho (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

/**
 * Lấy tổng hợp của toàn bộ kết quả đang lọc (S5-05)
 */
export async function fetchStockLedgerSummary(params?: {
  warehouseId?: number | string;
  categoryId?: number | string;
  stockStatus?: string;
  keyword?: string;
}): Promise<StockLedgerSummary> {
  const query = new URLSearchParams();
  if (params?.warehouseId !== undefined && params.warehouseId !== '' && params.warehouseId !== 'ALL') {
    query.set('warehouseId', String(params.warehouseId));
  }
  if (params?.categoryId !== undefined && params.categoryId !== '' && params.categoryId !== 'ALL') {
    query.set('categoryId', String(params.categoryId));
  }
  if (params?.stockStatus && params.stockStatus !== 'ALL') {
    query.set('stockStatus', params.stockStatus);
  }
  if (params?.keyword && params.keyword.trim()) {
    query.set('keyword', params.keyword.trim());
  }

  const url = `${BASE_URL}/stock-ledger/summary?${query.toString()}`;
  const res = await authFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Không thể tải tổng hợp sổ tồn kho (Mã lỗi: ${res.status})`);
  }
  return await res.json();
}

/**
 * Lấy danh sách kho cho ô chọn kho trên sổ tồn (tự động lọc theo quyền nhân viên kho)
 */
export async function fetchStockLedgerWarehouses(): Promise<WarehouseOptionResponse[]> {
  const url = `${BASE_URL}/warehouses?status=ACTIVE`;
  const res = await authFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error('Không thể tải danh sách kho lưu trữ');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
