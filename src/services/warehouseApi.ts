import { authFetch, API_BASE_URL } from './api';
import type {
  Warehouse,
  WarehouseLocation,
  WarehouseCreatePayload,
  WarehouseUpdatePayload,
  WarehouseLocationCreatePayload,
  WarehouseLocationUpdatePayload,
  WarehouseFilterParams,
  WarehouseLocationFilterParams
} from '../types/warehouse';

const WAREHOUSE_BASE = `${API_BASE_URL}/api/warehouses`;

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
    // ignore
  }
  if (res.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (res.status === 400) {
    return 'Dữ liệu không hợp lệ hoặc thiếu thông tin bắt buộc.';
  }
  return fallback;
}

export async function fetchWarehouses(params?: WarehouseFilterParams): Promise<Warehouse[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.keyword) query.set('keyword', params.keyword);

  const url = `${WAREHOUSE_BASE}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await authFetch(url);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không tải được danh sách kho hàng.'));
  }
  return await res.json();
}

export async function fetchWarehouseById(id: number): Promise<Warehouse> {
  const res = await authFetch(`${WAREHOUSE_BASE}/${id}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không tải được thông tin kho hàng.'));
  }
  return await res.json();
}

export async function createWarehouse(payload: WarehouseCreatePayload): Promise<Warehouse> {
  const res = await authFetch(WAREHOUSE_BASE, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể tạo kho hàng mới.'));
  }
  return await res.json();
}

export async function updateWarehouse(id: number, payload: WarehouseUpdatePayload): Promise<Warehouse> {
  const res = await authFetch(`${WAREHOUSE_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể cập nhật thông tin kho hàng.'));
  }
  return await res.json();
}

export async function deleteWarehouse(id: number): Promise<void> {
  const res = await authFetch(`${WAREHOUSE_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể xóa kho hàng.'));
  }
}

export async function fetchWarehouseLocations(
  warehouseId: number,
  params?: WarehouseLocationFilterParams
): Promise<WarehouseLocation[]> {
  const query = new URLSearchParams();
  if (params?.locationType) query.set('locationType', params.locationType);
  if (params?.status) query.set('status', params.status);
  if (params?.keyword) query.set('keyword', params.keyword);

  const url = `${WAREHOUSE_BASE}/${warehouseId}/locations${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await authFetch(url);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không tải được danh sách vị trí lưu kho.'));
  }
  return await res.json();
}

export async function createWarehouseLocation(
  warehouseId: number,
  payload: WarehouseLocationCreatePayload
): Promise<WarehouseLocation> {
  const res = await authFetch(`${WAREHOUSE_BASE}/${warehouseId}/locations`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể tạo vị trí lưu trữ mới.'));
  }
  return await res.json();
}

export async function updateWarehouseLocation(
  warehouseId: number,
  locationId: number,
  payload: WarehouseLocationUpdatePayload
): Promise<WarehouseLocation> {
  const res = await authFetch(`${WAREHOUSE_BASE}/${warehouseId}/locations/${locationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể cập nhật vị trí lưu trữ.'));
  }
  return await res.json();
}

export async function deleteWarehouseLocation(warehouseId: number, locationId: number): Promise<void> {
  const res = await authFetch(`${WAREHOUSE_BASE}/${warehouseId}/locations/${locationId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể xóa vị trí lưu trữ.'));
  }
}
