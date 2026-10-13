/**
 * S5-08: Service API Kiểm kê kho & ghi nhận chênh lệch
 *
 * Acceptance Criteria:
 * - AC1: Tạo phiếu kiểm kê theo kho hoặc theo nhóm hàng; hệ thống chụp chốt số tồn sổ tại thời điểm tạo.
 * - AC2: Nhập số đếm thực tế; hệ thống tự tính chênh lệch từng dòng (difference = countedQuantity - systemQuantity).
 * - AC3: Chốt kiểm kê điều chỉnh tồn về số thực đếm và bắt buộc nhập lý do.
 * - AC4: Chỉ Quản lý kho (ROLE_WH_MANAGER) được chốt phiếu kiểm kê.
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  StockTake,
  StockTakeFilterParams,
  StockTakeCreatePayload,
  StockTakeCountPayload,
  StockTakePageResponse
} from '../types/stockTake';
import { SYSTEM_WAREHOUSES, type WarehouseOption } from '../types/inventory';

const BASE_URL = `${API_BASE_URL}/api/inventory/stocktakes`;

/**
 * Đọc message lỗi chuẩn từ backend (code, message, details)
 */
async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }
      if (data.details && typeof data.details === 'object') {
        const detailsObj = data.details as Record<string, unknown>;
        const first = Object.values(detailsObj).find((v) => typeof v === 'string' && (v as string).trim());
        if (typeof first === 'string') return first;
      }
    }
  } catch {
    // ignore json parse error
  }
  if (res.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này (Chỉ Quản lý kho mới được chốt phiếu).';
  }
  if (res.status === 400) {
    return 'Dữ liệu không hợp lệ hoặc thiếu thông tin bắt buộc.';
  }
  return fallback;
}

/**
 * Danh sách phiếu kiểm kê có phân trang và bộ lọc
 */
export async function fetchStockTakes(params?: StockTakeFilterParams): Promise<StockTakePageResponse> {
  const query = new URLSearchParams();
  if (params?.warehouseId !== undefined && params.warehouseId !== '') {
    query.set('warehouseId', String(params.warehouseId));
  }
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.fromDate) {
    query.set('fromDate', params.fromDate);
  }
  if (params?.toDate) {
    query.set('toDate', params.toDate);
  }
  if (params?.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params?.size !== undefined) {
    query.set('size', String(params.size));
  }

  const url = `${BASE_URL}?${query.toString()}`;
  const res = await authFetch(url, { method: 'GET' });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Không thể tải danh sách phiếu kiểm kê');
    throw new Error(msg);
  }
  return await res.json();
}

/**
 * Lấy chi tiết phiếu kiểm kê kèm toàn bộ các dòng hàng
 */
export async function fetchStockTakeDetail(id: number | string): Promise<StockTake> {
  const url = `${BASE_URL}/${id}`;
  const res = await authFetch(url, { method: 'GET' });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, `Không thể tải chi tiết phiếu kiểm kê #${id}`);
    throw new Error(msg);
  }
  return await res.json();
}

/**
 * Tạo phiếu kiểm kê mới (chụp snapshot số tồn sổ)
 */
export async function createStockTake(payload: StockTakeCreatePayload): Promise<StockTake> {
  const res = await authFetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Không thể tạo phiếu kiểm kê');
    throw new Error(msg);
  }
  return await res.json();
}

/**
 * Cập nhật số đếm thực tế cho các dòng
 */
export async function updateStockTakeCounts(
  id: number | string,
  payload: StockTakeCountPayload
): Promise<StockTake> {
  const url = `${BASE_URL}/${id}/counts`;
  const res = await authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Không thể lưu số đếm thực tế');
    throw new Error(msg);
  }
  return await res.json();
}

/**
 * Chốt kiểm kê: điều chỉnh tồn về số thực đếm, bắt buộc có lý do.
 * Chỉ Quản lý kho (ROLE_WH_MANAGER).
 */
export async function closeStockTake(id: number | string, reason: string): Promise<StockTake> {
  const url = `${BASE_URL}/${id}/close`;
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason.trim() })
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Không thể chốt phiếu kiểm kê');
    throw new Error(msg);
  }
  return await res.json();
}

/**
 * Huỷ phiếu kiểm kê nháp (bắt buộc có lý do)
 */
export async function cancelStockTake(id: number | string, reason: string): Promise<StockTake> {
  const url = `${BASE_URL}/${id}/cancel`;
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason.trim() })
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Không thể huỷ phiếu kiểm kê');
    throw new Error(msg);
  }
  return await res.json();
}

/**
 * Lấy danh sách kho hàng từ backend (có fallback sang SYSTEM_WAREHOUSES)
 */
export async function fetchWarehousesList(): Promise<WarehouseOption[]> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/warehouses?status=ACTIVE`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((w: any) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          address: w.address,
          status: w.status || 'ACTIVE'
        }));
      }
    }
  } catch {
    // fallback
  }
  return SYSTEM_WAREHOUSES;
}
