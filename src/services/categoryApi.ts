import { API_BASE_URL, authFetch } from './api';
import type { CategoryProduct, ProductCategory } from '../types/category';

/**
 * API Nhóm hàng nhiều cấp (S2-06) — /api/product-categories
 * Backend dùng id số (Long); FE dùng id dạng chuỗi để tương thích với UI sẵn có.
 */

const BASE = `${API_BASE_URL}/api/product-categories`;

/** Số cấp tối đa của cây nhóm hàng (khớp ProductCategoryService.MAX_LEVEL) */
export const CATEGORY_MAX_LEVEL = 5;

/** Kích thước trang tối đa backend cho phép khi lấy sản phẩm theo nhóm */
export const CATEGORY_PRODUCTS_MAX_PAGE_SIZE = 100;

interface CategoryResponseDto {
  id: number;
  code: string;
  name: string;
  level: number;
  parentId: number | null;
  description: string | null;
  productCount: number;
}

interface CategoryProductItemDto {
  id: number;
  sku: string;
  name: string;
  baseUnit: string;
  status: string;
  categoryId: number;
  categoryName: string;
}

interface PageDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Nhóm hàng kèm số sản phẩm gắn trực tiếp (theo backend) */
export interface CategoryWithCount extends ProductCategory {
  productCount: number;
}

export interface CategoryProductPage {
  content: CategoryProduct[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MoveProductsResult {
  categoryId: string;
  categoryName: string;
  movedCount: number;
}

export interface CreateCategoryPayload {
  code: string;
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface UpdateCategoryPayload {
  name: string;
  description?: string;
}

const GENERIC_VALIDATION_MESSAGE = 'Dữ liệu không hợp lệ';

/**
 * Đọc lỗi chuẩn của backend { code, message, details, timestamp } và ném Error tiếng Việt.
 * Với lỗi validation, ưu tiên thông điệp đầu tiên trong `details`.
 */
export async function throwApiError(response: Response, fallback: string): Promise<never> {
  const data = await response.json().catch(() => null);
  let message: string | undefined;
  if (data && typeof data === 'object') {
    const details = (data as { details?: unknown }).details;
    const rawMessage = (data as { message?: unknown }).message;
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      const first = Object.values(details as Record<string, unknown>).find(
        (v) => typeof v === 'string' && v.trim() !== ''
      );
      if (typeof first === 'string') message = first;
    } else if (Array.isArray(details) && typeof details[0] === 'string') {
      if (rawMessage === GENERIC_VALIDATION_MESSAGE) message = details[0];
    }
    if (!message && typeof rawMessage === 'string' && rawMessage.trim() !== '') {
      message = rawMessage;
    }
  }
  if (!message) {
    message =
      response.status === 409
        ? 'Thao tác bị từ chối do xung đột dữ liệu.'
        : response.status >= 500
        ? 'Máy chủ đang gặp sự cố, vui lòng thử lại sau.'
        : fallback;
  }
  throw new Error(message);
}

async function request<T>(url: string, options: RequestInit, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await authFetch(url, options);
  } catch (err) {
    if (err instanceof Error && err.message && !(err instanceof TypeError)) throw err;
    throw new Error('Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.');
  }
  if (!response.ok) {
    return throwApiError(response, fallback);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const toNumberId = (id: string): number => Number(id);

function mapCategory(dto: CategoryResponseDto): CategoryWithCount {
  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    level: dto.level,
    parentId: dto.parentId === null || dto.parentId === undefined ? null : String(dto.parentId),
    description: dto.description ?? undefined,
    productCount: dto.productCount ?? 0
  };
}

function mapProduct(dto: CategoryProductItemDto): CategoryProduct {
  return {
    id: String(dto.id),
    sku: dto.sku,
    name: dto.name,
    baseUnit: dto.baseUnit,
    categoryId: String(dto.categoryId),
    // Backend chưa có dữ liệu bán hàng (sẽ có khi phân hệ đơn hàng hoạt động)
    unitPrice: 0,
    salesQuantity: 0,
    revenue: 0
  };
}

/** GET /api/product-categories — danh sách phẳng toàn bộ nhóm hàng */
export async function fetchCategories(): Promise<CategoryWithCount[]> {
  const data = await request<CategoryResponseDto[]>(BASE, { method: 'GET' }, 'Không thể tải danh sách nhóm hàng.');
  return (data || []).map(mapCategory);
}

/** POST /api/product-categories */
export async function createCategory(payload: CreateCategoryPayload): Promise<CategoryWithCount> {
  const body = {
    code: payload.code.trim(),
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    parentId: payload.parentId ? toNumberId(payload.parentId) : null
  };
  const data = await request<CategoryResponseDto>(
    BASE,
    { method: 'POST', body: JSON.stringify(body) },
    'Không thể tạo nhóm hàng.'
  );
  return mapCategory(data);
}

/** PUT /api/product-categories/{id} — chỉ sửa tên & mô tả (mã và nhóm cha cố định) */
export async function updateCategory(id: string, payload: UpdateCategoryPayload): Promise<CategoryWithCount> {
  const body = {
    name: payload.name.trim(),
    description: payload.description?.trim() || null
  };
  const data = await request<CategoryResponseDto>(
    `${BASE}/${toNumberId(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
    'Không thể cập nhật nhóm hàng.'
  );
  return mapCategory(data);
}

/** DELETE /api/product-categories/{id} — 409 nếu còn nhóm con hoặc sản phẩm */
export async function deleteCategory(id: string): Promise<void> {
  await request<void>(`${BASE}/${toNumberId(id)}`, { method: 'DELETE' }, 'Không thể xoá nhóm hàng.');
}

/** GET /api/product-categories/{id}/products */
export async function fetchCategoryProducts(
  id: string,
  options: { includeSubgroups?: boolean; page?: number; size?: number } = {}
): Promise<CategoryProductPage> {
  const params = new URLSearchParams({
    includeSubgroups: String(options.includeSubgroups ?? false),
    page: String(options.page ?? 0),
    size: String(Math.min(options.size ?? 20, CATEGORY_PRODUCTS_MAX_PAGE_SIZE))
  });
  const data = await request<PageDto<CategoryProductItemDto>>(
    `${BASE}/${toNumberId(id)}/products?${params.toString()}`,
    { method: 'GET' },
    'Không thể tải danh sách sản phẩm của nhóm.'
  );
  return {
    content: (data?.content || []).map(mapProduct),
    page: data?.page ?? 0,
    size: data?.size ?? 0,
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0
  };
}

/** PUT /api/product-categories/{targetId}/products — chuyển sản phẩm VÀO nhóm đích */
export async function moveProductsToCategory(targetId: string, productIds: string[]): Promise<MoveProductsResult> {
  const data = await request<{ categoryId: number; categoryName: string; movedCount: number }>(
    `${BASE}/${toNumberId(targetId)}/products`,
    { method: 'PUT', body: JSON.stringify({ productIds: productIds.map(toNumberId) }) },
    'Không thể chuyển sản phẩm sang nhóm khác.'
  );
  return {
    categoryId: String(data.categoryId),
    categoryName: data.categoryName,
    movedCount: data.movedCount
  };
}
