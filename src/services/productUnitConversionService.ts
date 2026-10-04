/**
 * S2-07 / SCRUM-43 / SCRUM-77: Dịch vụ Quản lý Đơn vị tính quy đổi của SKU
 * Phân hệ: EP-02: Sản phẩm & Bảng giá
 *
 * Kết nối các API Backend:
 * - GET    /api/products/{productId}/units
 * - POST   /api/products/{productId}/units
 * - PUT    /api/products/{productId}/units/{conversionId}
 * - DELETE /api/products/{productId}/units/{conversionId}
 * - POST   /api/products/convert
 */

import { API_BASE_URL, getStoredToken } from './api';
import type {
  ProductUnitConversion,
  CreateProductUnitConversionRequest,
  UpdateProductUnitConversionRequest,
  UnitConversionCalculateRequest,
  UnitConversionResult
} from '../types/productUnitConversion';

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export const productUnitConversionService = {
  /**
   * Lấy danh sách toàn bộ đơn vị tính của SKU (bao gồm đơn vị cơ sở hệ số 1)
   */
  async getUnits(productId: number | string): Promise<ProductUnitConversion[]> {
    const res = await authFetch(`${API_BASE_URL}/api/products/${productId}/units`, {
      method: 'GET'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Không thể tải danh sách đơn vị tính của sản phẩm.');
    }

    return res.json();
  },

  /**
   * Khai báo thêm đơn vị quy đổi mới cho SKU
   */
  async addUnit(
    productId: number | string,
    data: CreateProductUnitConversionRequest
  ): Promise<ProductUnitConversion> {
    const res = await authFetch(`${API_BASE_URL}/api/products/${productId}/units`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Không thể thêm đơn vị quy đổi mới.');
    }

    return res.json();
  },

  /**
   * Cập nhật hệ số quy đổi hoặc thông tin quy cách (S2-07 AC3)
   */
  async updateUnit(
    productId: number | string,
    conversionId: number,
    data: UpdateProductUnitConversionRequest
  ): Promise<ProductUnitConversion> {
    const res = await authFetch(`${API_BASE_URL}/api/products/${productId}/units/${conversionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Không thể cập nhật đơn vị tính quy đổi.');
    }

    return res.json();
  },

  /**
   * Xóa đơn vị quy đổi của SKU
   */
  async deleteUnit(productId: number | string, conversionId: number): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/products/${productId}/units/${conversionId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Không thể xóa đơn vị quy đổi.');
    }
  },

  /**
   * Tiện ích tính toán quy đổi tức thời (S2-07 AC2)
   */
  async calculateConversion(data: UnitConversionCalculateRequest): Promise<UnitConversionResult> {
    const res = await authFetch(`${API_BASE_URL}/api/products/convert`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Lỗi khi tính toán quy đổi đơn vị tính.');
    }

    return res.json();
  }
};
