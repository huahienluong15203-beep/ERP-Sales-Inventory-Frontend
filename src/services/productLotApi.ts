import { authFetch, API_BASE_URL } from './api';
import type {
  ProductLotResponse,
  ProductLotStockResponse,
  LotStockSummaryResponse,
  LotDispatchValidationRequest,
  LotDispatchValidationResponse,
  ProductLotCreateRequest,
  ProductLotUpdateRequest,
  ProductLotFilterParams,
  PageResponse
} from '../types/productLot';

const LOT_BASE_URL = `${API_BASE_URL}/api/inventory/lots`;

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
  return fallback;
}

/**
 * Tra cứu danh sách lô hàng theo bộ lọc & phân trang
 */
export async function searchProductLots(
  params: ProductLotFilterParams = {}
): Promise<PageResponse<ProductLotResponse>> {
  const query = new URLSearchParams();
  if (params.warehouseId) query.set('warehouseId', String(params.warehouseId));
  if (params.productId) query.set('productId', String(params.productId));
  if (params.keyword && params.keyword.trim()) query.set('keyword', params.keyword.trim());
  if (params.status && params.status !== 'ALL') query.set('status', params.status);
  if (params.expiryStatus && params.expiryStatus !== 'ALL') query.set('expiryStatus', params.expiryStatus);
  if (params.nearExpiryDays !== undefined) query.set('nearExpiryDays', String(params.nearExpiryDays));
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));
  query.set('sort', params.sort || 'expiredDate,asc');

  const res = await authFetch(`${LOT_BASE_URL}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể tải danh sách lô hàng'));
  }
  return await res.json();
}

/**
 * Lấy chi tiết một lô hàng theo ID
 */
export async function getProductLotById(id: number): Promise<ProductLotResponse> {
  const res = await authFetch(`${LOT_BASE_URL}/${id}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể tải thông tin lô hàng'));
  }
  return await res.json();
}

/**
 * Khai báo lô hàng mới
 */
export async function createProductLot(
  payload: ProductLotCreateRequest
): Promise<ProductLotResponse> {
  const res = await authFetch(LOT_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể khai báo lô hàng mới'));
  }
  return await res.json();
}

/**
 * Cập nhật thông tin lô hàng (NSX, HSD, ghi chú, khóa/mở khóa)
 */
export async function updateProductLot(
  id: number,
  payload: ProductLotUpdateRequest
): Promise<ProductLotResponse> {
  const res = await authFetch(`${LOT_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể cập nhật lô hàng'));
  }
  return await res.json();
}

/**
 * Bật hoặc tắt quản lý lô theo từng SKU
 */
export async function toggleProductBatchManagement(
  productId: number | string,
  hasBatchManagement: boolean
): Promise<{ id: number; sku: string; name: string; hasBatchManagement: boolean }> {
  const res = await authFetch(`${LOT_BASE_URL}/products/${productId}/batch-management`, {
    method: 'PATCH',
    body: JSON.stringify({ hasBatchManagement })
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể thay đổi cấu hình quản lý lô cho SKU'));
  }
  return await res.json();
}

/**
 * Tính tồn chi tiết theo lô của sản phẩm (sắp xếp FEFO)
 */
export async function calculateStockByLot(
  productId: number | string,
  warehouseId?: number | string,
  nearExpiryDays: number = 30
): Promise<ProductLotStockResponse> {
  const query = new URLSearchParams();
  query.set('productId', String(productId));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  query.set('nearExpiryDays', String(nearExpiryDays));

  const res = await authFetch(`${LOT_BASE_URL}/product-stock?${query.toString()}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể tính tồn theo lô'));
  }
  return await res.json();
}

/**
 * Kiểm tra HSD và tính hợp lệ khi xuất lô hàng
 */
export async function validateLotForDispatch(
  payload: LotDispatchValidationRequest
): Promise<LotDispatchValidationResponse> {
  const res = await authFetch(`${LOT_BASE_URL}/validate-dispatch`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Kiểm tra xuất lô thất bại'));
  }
  return await res.json();
}

/**
 * Cảnh báo danh sách lô sắp hết hạn
 */
export async function getExpiringLots(
  daysThreshold: number = 30,
  warehouseId?: number | string,
  page: number = 0,
  size: number = 20
): Promise<PageResponse<ProductLotResponse>> {
  const query = new URLSearchParams();
  query.set('daysThreshold', String(daysThreshold));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  query.set('page', String(page));
  query.set('size', String(size));

  const res = await authFetch(`${LOT_BASE_URL}/expiring?${query.toString()}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể tải danh sách lô sắp hết hạn'));
  }
  return await res.json();
}

/**
 * Thống kê tổng quan tình trạng Lô hàng & HSD
 */
export async function getLotSummary(
  daysThreshold: number = 30,
  warehouseId?: number | string
): Promise<LotStockSummaryResponse> {
  const query = new URLSearchParams();
  query.set('daysThreshold', String(daysThreshold));
  if (warehouseId) query.set('warehouseId', String(warehouseId));

  const res = await authFetch(`${LOT_BASE_URL}/summary?${query.toString()}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Không thể tải thống kê lô hàng'));
  }
  return await res.json();
}
