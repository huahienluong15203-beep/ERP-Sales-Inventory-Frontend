/**
 * S2-10 / SCRUM-55: API Service & Client Layer cho Quản lý Bảng giá
 * Tích hợp trực tiếp với PriceListController (/api/price-lists) của Backend Spring Boot.
 * Chỉ dùng dữ liệu thật trên Backend: lỗi từ Backend được báo nguyên văn cho người dùng,
 * KHÔNG lưu tạm trong trình duyệt (trước đây lưu tạm làm người dùng tưởng đã lưu, F5 là mất).
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  PriceList,
  PriceListRequest,
  PriceListItemRequest,
  PriceLookupResponse,
  CustomerGroupType,
  PriceListStatus
} from '../types/pricing';

export interface PriceListPageResult {
  content: PriceList[];
  totalElements: number;
  totalPages: number;
}

export interface PriceListStatsData {
  total: number;
  active: number;
  dealerLevel1: number;
  dealerLevel2: number;
  retail: number;
  locked: number;
}

const PRICE_LISTS_URL = `${API_BASE_URL}/api/price-lists`;

/** Đọc lỗi chuẩn { code, message, details } của Backend thành 1 câu tiếng Việt */
async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.details && typeof data.details === 'object') {
    const first = Object.values(data.details as Record<string, string>)[0];
    if (first) return String(first);
  }
  return data?.message || fallback;
}

/** Gọi Backend; lỗi thì ném Error với thông báo của Backend (không có dữ liệu dự phòng) */
async function request<T>(url: string, init: RequestInit, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(url, init);
  } catch (err) {
    throw err instanceof Error ? err : new Error('Không kết nối được máy chủ. Vui lòng thử lại!');
  }
  if (!res.ok) {
    throw new Error(await readError(res, fallback));
  }
  return res.json() as Promise<T>;
}

/**
 * Lấy 1 trang bảng giá: Backend lọc (nhóm khách hàng, trạng thái, từ khoá) + phân trang (page đếm từ 0).
 */
export async function fetchPriceLists(params: {
  customerGroup?: CustomerGroupType;
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
} = {}): Promise<PriceListPageResult> {
  const query = new URLSearchParams();
  if (params.customerGroup) query.set('customerGroup', params.customerGroup);
  if (params.status) query.set('status', params.status);
  if (params.keyword) query.set('keyword', params.keyword);
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));

  const data = await request<{ content?: PriceList[]; totalElements?: number; totalPages?: number } | PriceList[]>(
    `${PRICE_LISTS_URL}?${query.toString()}`,
    { method: 'GET' },
    'Không tải được danh sách bảng giá'
  );
  if (Array.isArray(data)) {
    return { content: data, totalElements: data.length, totalPages: 1 };
  }
  return {
    content: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 1
  };
}

/**
 * Số liệu thẻ đầu trang, đếm trên TOÀN BỘ bảng giá (không phụ thuộc trang đang xem).
 */
export async function fetchPriceListStats(): Promise<PriceListStatsData> {
  return request<PriceListStatsData>(`${PRICE_LISTS_URL}/stats`, { method: 'GET' }, 'Không tải được số liệu bảng giá');
}

/**
 * Lấy chi tiết một bảng giá kèm toàn bộ danh sách dòng giá
 */
export async function fetchPriceListById(id: number): Promise<PriceList> {
  return request<PriceList>(`${PRICE_LISTS_URL}/${id}`, { method: 'GET' }, `Không tìm thấy bảng giá ID ${id}`);
}

/**
 * Tạo bảng giá mới (kèm danh sách dòng giá & giá sàn)
 */
export async function createPriceList(payload: PriceListRequest): Promise<PriceList> {
  return request<PriceList>(
    PRICE_LISTS_URL,
    { method: 'POST', body: JSON.stringify(payload) },
    'Không thể tạo bảng giá'
  );
}

/**
 * Cập nhật bảng giá (chỉ khi chưa phát sinh đơn hàng; Backend kiểm)
 */
export async function updatePriceList(id: number, payload: PriceListRequest): Promise<PriceList> {
  return request<PriceList>(
    `${PRICE_LISTS_URL}/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    'Không thể cập nhật bảng giá'
  );
}

/**
 * Tạo phiên bản mới từ một bảng giá đã phát sinh đơn
 */
export async function clonePriceListVersion(id: number, payload?: Partial<PriceListRequest>): Promise<PriceList> {
  return request<PriceList>(
    `${PRICE_LISTS_URL}/${id}/clone-version`,
    { method: 'POST', body: JSON.stringify(payload || {}) },
    'Không thể tạo phiên bản mới cho bảng giá'
  );
}

/**
 * Bật/Tắt trạng thái bảng giá (ACTIVE | INACTIVE)
 */
export async function changePriceListStatus(id: number, status: PriceListStatus): Promise<PriceList> {
  return request<PriceList>(
    `${PRICE_LISTS_URL}/${id}/status?status=${status}`,
    { method: 'PATCH' },
    'Không thể đổi trạng thái bảng giá'
  );
}

/**
 * Thêm hoặc cập nhật một dòng sản phẩm kèm giá sàn
 */
export async function addOrUpdatePriceListItem(id: number, itemReq: PriceListItemRequest): Promise<PriceList> {
  return request<PriceList>(
    `${PRICE_LISTS_URL}/${id}/items`,
    { method: 'POST', body: JSON.stringify(itemReq) },
    'Không thể lưu dòng giá'
  );
}

/**
 * Xoá một dòng giá khỏi bảng giá (chỉ khi bảng giá chưa phát sinh đơn; Backend kiểm)
 */
export async function deletePriceListItem(id: number, itemId: number): Promise<PriceList> {
  return request<PriceList>(
    `${PRICE_LISTS_URL}/${id}/items/${itemId}`,
    { method: 'DELETE' },
    'Không thể xoá dòng giá'
  );
}

/**
 * Xoá toàn bộ bảng giá (chỉ khi bảng giá chưa phát sinh đơn hàng)
 */
export async function deletePriceList(id: number): Promise<void> {
  return request<void>(
    `${PRICE_LISTS_URL}/${id}`,
    { method: 'DELETE' },
    'Không thể xoá bảng giá'
  );
}


/**
 * S2-10 Tra cứu nhanh giá bán niêm yết và mức giá sàn theo Nhóm khách hàng + SKU + Ngày
 */
export async function lookupPrice(params: {
  customerGroup: CustomerGroupType;
  productSku: string;
  date?: string;
}): Promise<PriceLookupResponse> {
  const query = new URLSearchParams({
    customerGroup: params.customerGroup,
    productSku: params.productSku
  });
  if (params.date) query.set('date', params.date);
  return request<PriceLookupResponse>(
    `${PRICE_LISTS_URL}/lookup?${query.toString()}`,
    { method: 'GET' },
    'Không tra cứu được giá'
  );
}
