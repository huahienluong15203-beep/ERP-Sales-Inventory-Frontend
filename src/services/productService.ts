/**
 * Dịch vụ Quản lý Danh mục Sản phẩm (S2-05) — gọi Backend /api/products (không còn dùng dữ liệu giả trong trình duyệt)
 * Tuân thủ 4 Acceptance Criteria:
 * 1. Khai báo đúng 8 trường: SKU, Tên, Nhóm hàng, ĐVT cơ sở, Quy cách đóng gói, Giá vốn, Ảnh, Trạng thái.
 * 2. Mã SKU duy nhất toàn hệ thống.
 * 3. Giá vốn chỉ Quản lý kinh doanh (ROLE_SALES_MANAGER) và Admin (ROLE_ADMIN) xem & sửa.
 * 4. Sản phẩm đã có giao dịch (transactionCount > 0) KHÔNG được xóa, chỉ chuyển sang Ngừng kinh doanh.
 */

import type { Product, ProductStatus, CreateProductInput, UpdateProductInput } from '../types/product';
import type { RoleName } from '../types/user';
import { API_BASE_URL, authFetch } from './api';

export const PRODUCT_CATEGORIES = [
  'Nước giải khát',
  'Sữa & Sản phẩm từ sữa',
  'Gia vị & Thực phẩm',
  'Thực phẩm khô & Ăn liền',
  'Bánh kẹo & Snack',
  'Hóa phẩm & Chăm sóc gia đình',
  'Hóa mỹ phẩm & Chăm sóc cá nhân'
] as const;

export const COMMON_BASE_UNITS = [
  'Lon',
  'Chai',
  'Hộp',
  'Gói',
  'Lốc',
  'Thùng',
  'Cái',
  'Túi',
  'Kg',
  'Gram'
] as const;

export function canManageCostPrice(role?: RoleName | null): boolean {
  let activeRole = role;
  if (!activeRole) {
    try {
      activeRole = (localStorage.getItem('erp_active_role') || sessionStorage.getItem('erp_active_role')) as RoleName | null;
    } catch {
      // ignore
    }
  }
  if (!activeRole) return false;
  return activeRole === 'ROLE_SALES_MANAGER' || activeRole === 'ROLE_ADMIN';
}

export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

export interface ProductFilterParams {
  keyword?: string;
  category?: string;
  status?: ProductStatus | 'ALL';
  /** Trang đếm từ 0 (giống API) */
  page?: number;
  size?: number;
}

export interface ProductListResult {
  products: Product[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface ProductOptionItem {
  id: number;
  sku: string;
  name: string;
  category?: string | null;
  baseUnit?: string | null;
  packaging?: string | null;
  costPrice?: number | null;
  status?: string | null;
}

export interface ProductStatsResult {
  total: number;
  active: number;
  inactive: number;
}

/** Dữ liệu sản phẩm Backend trả về (ProductResponse / ProductDetailResponse) */
interface BackendProduct {
  id: number;
  sku: string;
  name: string;
  category?: string | null;
  categoryId?: number | null;
  baseUnit: string;
  packaging?: string | null;
  costPrice?: number | null;
  status?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const PRODUCTS_URL = `${API_BASE_URL}/api/products`;

function formatDateTime(value?: string | null): string | undefined {
  return value ? value.replace('T', ' ').substring(0, 19) : undefined;
}

function mapProduct(p: BackendProduct): Product {
  return {
    id: String(p.id),
    sku: p.sku,
    name: p.name,
    category: p.category || 'Chưa phân loại',
    categoryId: p.categoryId != null ? String(p.categoryId) : undefined,
    baseUnit: p.baseUnit,
    packagingSpec: p.packaging || '',
    // Backend trả null nếu vai trò không được xem giá vốn
    costPrice: p.costPrice != null ? Number(p.costPrice) : 0,
    imageUrl: p.imageUrl || '',
    status: p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    // Backend chưa trả số giao dịch; sản phẩm không bao giờ xoá cứng nên không cần đếm
    transactionCount: 0,
    createdAt: formatDateTime(p.createdAt),
    updatedAt: formatDateTime(p.updatedAt)
  };
}

/** Đọc lỗi chuẩn { code, message, details } của Backend thành 1 câu tiếng Việt */
async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.details && typeof data.details === 'object') {
    const first = Object.values(data.details as Record<string, string>)[0];
    if (first) return String(first);
  }
  return data?.message || fallback;
}

async function fetchDetail(id: string): Promise<BackendProduct | null> {
  const res = await authFetch(`${PRODUCTS_URL}/${id}`);
  if (!res.ok) return null;
  return res.json();
}

/** Gửi PUT /api/products/{id}: Backend bắt buộc có tên + ĐVT, nên trộn với dữ liệu hiện tại */
async function putProduct(
  id: string,
  current: BackendProduct,
  patch: Partial<BackendProduct>
): Promise<{ ok: boolean; data?: BackendProduct; message?: string }> {
  const body = {
    name: patch.name ?? current.name,
    category: patch.category ?? current.category ?? undefined,
    categoryId: patch.categoryId !== undefined ? patch.categoryId : (current.categoryId ?? undefined),
    baseUnit: patch.baseUnit ?? current.baseUnit,
    packaging: patch.packaging ?? current.packaging ?? undefined,
    // Không gửi giá vốn nếu không đổi -> Backend giữ nguyên
    costPrice: patch.costPrice ?? undefined,
    barcode: current.barcode ?? undefined,
    imageUrl: patch.imageUrl ?? current.imageUrl ?? undefined,
    description: current.description ?? undefined,
    status: patch.status ?? current.status ?? undefined
  };
  const res = await authFetch(`${PRODUCTS_URL}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) {
    return { ok: false, message: await readError(res, 'Không thể cập nhật sản phẩm!') };
  }
  return { ok: true, data: await res.json() };
}

export const productService = {
  /** Lọc + phân trang phía server: GET /api/products?keyword&category&status&page&size */
  async getProducts(params: ProductFilterParams = {}): Promise<ProductListResult> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const query = new URLSearchParams();
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    query.set('page', String(page));
    query.set('size', String(size));

    const res = await authFetch(`${PRODUCTS_URL}?${query.toString()}`);
    if (!res.ok) {
      throw new Error(await readError(res, 'Không tải được danh sách sản phẩm!'));
    }
    const data = await res.json();
    return {
      products: (data?.content ?? []).map(mapProduct),
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 1,
      currentPage: page
    };
  },

  /**
   * Tra cứu nhanh sản phẩm cho combobox / dropdown (hỗ trợ tìm kiếm cả FE lẫn BE, tới 5.000+ sản phẩm).
   */
  async searchProductOptions(keyword: string = '', limit: number = 30): Promise<ProductOptionItem[]> {
    const query = new URLSearchParams();
    if (keyword.trim()) query.set('keyword', keyword.trim());
    query.set('limit', String(limit));
    try {
      const res = await authFetch(`${PRODUCTS_URL}/search-options?${query.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback bên dưới
    }
    // Fallback: nếu API search-options chưa sẵn sàng, dùng getProducts
    const result = await this.getProducts({ keyword, size: limit, status: 'ACTIVE' });
    return result.products.map((p) => ({
      id: Number(p.id),
      sku: p.sku,
      name: p.name,
      category: p.category,
      baseUnit: p.baseUnit,
      packaging: p.packagingSpec,
      costPrice: p.costPrice,
      status: p.status
    }));
  },

  /** Số liệu thẻ đầu trang, đếm trên TOÀN BỘ sản phẩm (gọi API với size=1 chỉ để lấy tổng). */
  async getStats(): Promise<ProductStatsResult> {
    const [all, active] = await Promise.all([
      this.getProducts({ page: 0, size: 1 }),
      this.getProducts({ page: 0, size: 1, status: 'ACTIVE' })
    ]);
    return {
      total: all.totalElements,
      active: active.totalElements,
      inactive: Math.max(0, all.totalElements - active.totalElements)
    };
  },

  async getProductById(id: string): Promise<Product | null> {
    const data = await fetchDetail(id);
    return data ? mapProduct(data) : null;
  },

  async checkSkuExists(sku: string, excludeId?: string): Promise<boolean> {
    const cleanSku = sku.trim().toUpperCase();
    if (cleanSku.length < 2) return false;
    try {
      const res = await authFetch(`${PRODUCTS_URL}/sku/${encodeURIComponent(cleanSku)}`);
      if (!res.ok) return false;
      const data: BackendProduct = await res.json();
      return String(data.id) !== String(excludeId ?? '');
    } catch {
      return false;
    }
  },

  async createProduct(
    input: CreateProductInput,
    userRole?: RoleName | null
  ): Promise<{ success: boolean; message: string; product?: Product }> {
    const body = {
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      category: input.category || undefined,
      categoryId: input.categoryId ? Number(input.categoryId) : undefined,
      baseUnit: input.baseUnit.trim(),
      packaging: input.packagingSpec?.trim() || undefined,
      // Giá vốn chỉ Quản lý kinh doanh & Admin được nhập (Backend cũng kiểm)
      costPrice: canManageCostPrice(userRole) ? Number(input.costPrice) || 0 : undefined,
      imageUrl: input.imageUrl?.trim() || undefined,
      status: input.status || 'ACTIVE'
    };
    const res = await authFetch(PRODUCTS_URL, { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      return { success: false, message: await readError(res, 'Không thể tạo sản phẩm!') };
    }
    const product = mapProduct(await res.json());
    return {
      success: true,
      message: `Đã tạo thành công sản phẩm "${product.name}" (SKU: ${product.sku})`,
      product
    };
  },

  async updateProduct(
    id: string,
    input: UpdateProductInput,
    userRole?: RoleName | null
  ): Promise<{ success: boolean; message: string; product?: Product }> {
    const current = await fetchDetail(id);
    if (!current) {
      return { success: false, message: 'Không tìm thấy sản phẩm cần cập nhật!' };
    }
    const result = await putProduct(id, current, {
      name: input.name?.trim(),
      category: input.category,
      categoryId: input.categoryId !== undefined ? (input.categoryId ? Number(input.categoryId) : null) : undefined,
      baseUnit: input.baseUnit?.trim(),
      packaging: input.packagingSpec?.trim(),
      imageUrl: input.imageUrl?.trim(),
      status: input.status,
      costPrice:
        input.costPrice !== undefined && canManageCostPrice(userRole) ? Number(input.costPrice) || 0 : undefined
    });
    if (!result.ok || !result.data) {
      return { success: false, message: result.message || 'Không thể cập nhật sản phẩm!' };
    }
    const product = mapProduct(result.data);
    return { success: true, message: `Đã cập nhật thông tin sản phẩm "${product.name}"`, product };
  },

  /** Sản phẩm không xoá cứng (quy tắc 8): DELETE trên Backend chỉ chuyển sang Ngừng kinh doanh. */
  async deactivateProduct(id: string): Promise<{ success: boolean; message: string }> {
    const res = await authFetch(`${PRODUCTS_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      return { success: false, message: await readError(res, 'Không thể ngừng kinh doanh sản phẩm!') };
    }
    return { success: true, message: 'Đã chuyển sản phẩm sang trạng thái "Ngừng kinh doanh".' };
  },

  async activateProduct(id: string): Promise<{ success: boolean; message: string; product?: Product }> {
    const current = await fetchDetail(id);
    if (!current) {
      return { success: false, message: 'Không tìm thấy sản phẩm!' };
    }
    const result = await putProduct(id, current, { status: 'ACTIVE' });
    if (!result.ok || !result.data) {
      return { success: false, message: result.message || 'Không thể mở lại kinh doanh!' };
    }
    return {
      success: true,
      message: `Đã mở lại kinh doanh cho sản phẩm "${current.sku}".`,
      product: mapProduct(result.data)
    };
  }
};
