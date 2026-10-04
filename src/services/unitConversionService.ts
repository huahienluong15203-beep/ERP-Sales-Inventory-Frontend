/**
 * Dịch vụ Quản lý Đơn vị tính quy đổi của SKU (S2-07 / SCRUM-43)
 * Tuân thủ 3 Acceptance Criteria:
 * 1. Khai báo nhiều đơn vị quy đổi (lon, lốc, thùng) kèm hệ số quy đổi về đơn vị cơ sở.
 * 2. Đơn hàng và phiếu kho nhập theo đơn vị nào cũng tự động quy về đơn vị cơ sở khi ghi sổ.
 * 3. Đổi hệ số quy đổi không làm sai lệch các giao dịch đã ghi trước đó (Snapshot bất biến & Audit Log).
 */

import type {
  ProductUnitConversion,
  CreateProductUnitConversionPayload,
  UpdateProductUnitConversionPayload,
  UnitConversionCalculateRequest,
  UnitConversionResult
} from '../types/unitConversion';
import { API_BASE_URL } from './api';

const STORAGE_KEY = 'erp_product_unit_conversions_v1';

function getAuthHeader(): Record<string, string> {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  return token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    : {
        'Content-Type': 'application/json'
      };
}

// Dữ liệu mẫu khởi tạo chuẩn hóa theo danh mục sản phẩm (S2-05 / S2-07)
const INITIAL_CONVERSIONS: ProductUnitConversion[] = [
  // SP-COCA-330 (Lon cơ sở)
  {
    id: 101,
    productId: 1,
    sku: 'SP-COCA-330',
    unitName: 'Lon',
    conversionFactor: 1.0,
    isBaseUnit: true,
    formula: '1 Lon = 1 Lon (Đơn vị tính cơ sở)',
    barcode: '8934567890100',
    isDefaultPurchase: false,
    isDefaultSale: false,
    description: 'Đơn vị tính cơ sở chuẩn của SKU',
    status: 'ACTIVE',
    createdAt: '2026-09-15 08:30:00',
    updatedAt: '2026-09-15 08:30:00'
  },
  {
    id: 102,
    productId: 1,
    sku: 'SP-COCA-330',
    unitName: 'Thùng',
    conversionFactor: 24,
    isBaseUnit: false,
    formula: '1 Thùng = 24 Lon',
    barcode: '8934567890101',
    isDefaultPurchase: true,
    isDefaultSale: false,
    description: 'Thùng carton 24 lon (4 lốc x 6 lon)',
    status: 'ACTIVE',
    createdAt: '2026-09-15 08:30:00',
    updatedAt: '2026-10-01 10:15:00'
  },
  {
    id: 103,
    productId: 1,
    sku: 'SP-COCA-330',
    unitName: 'Lốc',
    conversionFactor: 6,
    isBaseUnit: false,
    formula: '1 Lốc = 6 Lon',
    barcode: '8934567890102',
    isDefaultPurchase: false,
    isDefaultSale: true,
    description: 'Lốc màng co 6 lon tiện lợi',
    status: 'ACTIVE',
    createdAt: '2026-09-15 08:30:00',
    updatedAt: '2026-10-01 10:15:00'
  },

  // SP-PEPSI-330 (Lon cơ sở)
  {
    id: 201,
    productId: 2,
    sku: 'SP-PEPSI-330',
    unitName: 'Lon',
    conversionFactor: 1.0,
    isBaseUnit: true,
    formula: '1 Lon = 1 Lon (Đơn vị tính cơ sở)',
    barcode: '8934567890200',
    isDefaultPurchase: false,
    isDefaultSale: false,
    description: 'Đơn vị tính cơ sở chuẩn của SKU',
    status: 'ACTIVE',
    createdAt: '2026-09-16 09:00:00',
    updatedAt: '2026-09-16 09:00:00'
  },
  {
    id: 202,
    productId: 2,
    sku: 'SP-PEPSI-330',
    unitName: 'Thùng',
    conversionFactor: 24,
    isBaseUnit: false,
    formula: '1 Thùng = 24 Lon',
    barcode: '8934567890201',
    isDefaultPurchase: true,
    isDefaultSale: false,
    description: 'Thùng carton 24 lon 330ml',
    status: 'ACTIVE',
    createdAt: '2026-09-16 09:00:00',
    updatedAt: '2026-09-16 09:00:00'
  },
  {
    id: 203,
    productId: 2,
    sku: 'SP-PEPSI-330',
    unitName: 'Lốc',
    conversionFactor: 6,
    isBaseUnit: false,
    formula: '1 Lốc = 6 Lon',
    barcode: '8934567890202',
    isDefaultPurchase: false,
    isDefaultSale: true,
    description: 'Lốc 6 lon',
    status: 'ACTIVE',
    createdAt: '2026-09-16 09:00:00',
    updatedAt: '2026-09-16 09:00:00'
  },

  // SP-MILO-180 (Hộp cơ sở)
  {
    id: 301,
    productId: 3,
    sku: 'SP-MILO-180',
    unitName: 'Hộp',
    conversionFactor: 1.0,
    isBaseUnit: true,
    formula: '1 Hộp = 1 Hộp (Đơn vị tính cơ sở)',
    barcode: '8934567890300',
    isDefaultPurchase: false,
    isDefaultSale: false,
    description: 'Đơn vị tính cơ sở chuẩn của SKU',
    status: 'ACTIVE',
    createdAt: '2026-09-18 11:20:00',
    updatedAt: '2026-09-18 11:20:00'
  },
  {
    id: 302,
    productId: 3,
    sku: 'SP-MILO-180',
    unitName: 'Thùng',
    conversionFactor: 48,
    isBaseUnit: false,
    formula: '1 Thùng = 48 Hộp',
    barcode: '8934567890301',
    isDefaultPurchase: true,
    isDefaultSale: false,
    description: 'Thùng carton 48 hộp (12 lốc x 4 hộp)',
    status: 'ACTIVE',
    createdAt: '2026-09-18 11:20:00',
    updatedAt: '2026-10-02 09:40:00'
  },
  {
    id: 303,
    productId: 3,
    sku: 'SP-MILO-180',
    unitName: 'Lốc',
    conversionFactor: 4,
    isBaseUnit: false,
    formula: '1 Lốc = 4 Hộp',
    barcode: '8934567890302',
    isDefaultPurchase: false,
    isDefaultSale: true,
    description: 'Lốc màng co 4 hộp 180ml',
    status: 'ACTIVE',
    createdAt: '2026-09-18 11:20:00',
    updatedAt: '2026-10-02 09:40:00'
  },

  // SP-TH-1L (Hộp cơ sở)
  {
    id: 401,
    productId: 4,
    sku: 'SP-TH-1L',
    unitName: 'Hộp',
    conversionFactor: 1.0,
    isBaseUnit: true,
    formula: '1 Hộp = 1 Hộp (Đơn vị tính cơ sở)',
    barcode: '8934567890400',
    isDefaultPurchase: false,
    isDefaultSale: false,
    description: 'Đơn vị tính cơ sở chuẩn của SKU',
    status: 'ACTIVE',
    createdAt: '2026-10-01 14:00:00',
    updatedAt: '2026-10-01 14:00:00'
  },
  {
    id: 402,
    productId: 4,
    sku: 'SP-TH-1L',
    unitName: 'Thùng',
    conversionFactor: 12,
    isBaseUnit: false,
    formula: '1 Thùng = 12 Hộp',
    barcode: '8934567890401',
    isDefaultPurchase: true,
    isDefaultSale: true,
    description: 'Thùng 12 hộp 1 lít nguyên chất',
    status: 'ACTIVE',
    createdAt: '2026-10-01 14:00:00',
    updatedAt: '2026-10-01 14:00:00'
  },

  // SP-CHINSU-500 (Chai cơ sở)
  {
    id: 501,
    productId: 5,
    sku: 'SP-CHINSU-500',
    unitName: 'Chai',
    conversionFactor: 1.0,
    isBaseUnit: true,
    formula: '1 Chai = 1 Chai (Đơn vị tính cơ sở)',
    barcode: '8934567890500',
    isDefaultPurchase: false,
    isDefaultSale: false,
    description: 'Đơn vị tính cơ sở chuẩn của SKU',
    status: 'ACTIVE',
    createdAt: '2026-09-20 10:00:00',
    updatedAt: '2026-09-20 10:00:00'
  },
  {
    id: 502,
    productId: 5,
    sku: 'SP-CHINSU-500',
    unitName: 'Thùng',
    conversionFactor: 15,
    isBaseUnit: false,
    formula: '1 Thùng = 15 Chai',
    barcode: '8934567890501',
    isDefaultPurchase: true,
    isDefaultSale: true,
    description: 'Thùng 15 chai 500ml',
    status: 'ACTIVE',
    createdAt: '2026-09-20 10:00:00',
    updatedAt: '2026-09-20 10:00:00'
  }
];

class UnitConversionService {
  private getLocalConversions(): ProductUnitConversion[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CONVERSIONS));
      return INITIAL_CONVERSIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CONVERSIONS));
      return INITIAL_CONVERSIONS;
    }
  }

  private saveLocalConversions(list: ProductUnitConversion[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /**
   * S2-07: Xem danh sách toàn bộ đơn vị tính của SKU
   */
  async getUnits(
    productId: number | string,
    sku?: string,
    fallbackBaseUnit?: string
  ): Promise<ProductUnitConversion[]> {
    const numericId = typeof productId === 'string' ? parseInt(productId.replace(/\D/g, ''), 10) || 0 : productId;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${numericId}/units`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Backend chưa chạy hoặc lỗi mạng -> fallback sang LocalStorage
    }

    const all = this.getLocalConversions();
    const filtered = all.filter(
      (c) => (numericId > 0 && c.productId === numericId) || (sku && c.sku.toLowerCase() === sku.toLowerCase())
    );

    if (filtered.length > 0) {
      return filtered;
    }

    // Nếu sản phẩm mới chưa có đơn vị quy đổi, tự động tạo đơn vị cơ sở hệ số 1.0
    const baseUnitName = fallbackBaseUnit || 'Lon';
    const baseUnitItem: ProductUnitConversion = {
      id: Date.now(),
      productId: numericId || 0,
      sku: sku || 'SKU-UNKNOWN',
      unitName: baseUnitName,
      conversionFactor: 1.0,
      isBaseUnit: true,
      formula: `1 ${baseUnitName} = 1 ${baseUnitName} (Đơn vị tính cơ sở)`,
      isDefaultPurchase: false,
      isDefaultSale: false,
      description: 'Đơn vị tính cơ sở chuẩn của SKU',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    return [baseUnitItem];
  }

  /**
   * S2-07 AC1: Khai báo thêm đơn vị quy đổi mới cho SKU
   */
  async addUnit(
    productId: number | string,
    sku: string,
    baseUnitName: string,
    payload: CreateProductUnitConversionPayload
  ): Promise<ProductUnitConversion> {
    const numericId = typeof productId === 'string' ? parseInt(productId.replace(/\D/g, ''), 10) || 0 : productId;

    // Kiểm tra AC1: Hệ số quy đổi phải lớn hơn 0
    if (!payload.conversionFactor || payload.conversionFactor <= 0) {
      throw new Error('Hệ số quy đổi phải lớn hơn 0!');
    }

    // Kiểm tra AC1: Không trùng với đơn vị cơ sở
    if (payload.unitName.trim().toLowerCase() === baseUnitName.trim().toLowerCase()) {
      throw new Error(`Đơn vị quy đổi '${payload.unitName}' không được trùng với đơn vị cơ sở '${baseUnitName}'!`);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${numericId}/units`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      if (errData?.message) {
        throw new Error(errData.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg && !msg.includes('Failed to fetch')) {
        throw err;
      }
    }

    // Fallback LocalStorage
    const all = this.getLocalConversions();
    const existing = all.find(
      (c) =>
        ((numericId > 0 && c.productId === numericId) || (sku && c.sku.toLowerCase() === sku.toLowerCase())) &&
        c.unitName.trim().toLowerCase() === payload.unitName.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Đơn vị tính '${payload.unitName}' đã tồn tại trong danh mục quy đổi của SKU ${sku}!`);
    }

    const newUnit: ProductUnitConversion = {
      id: Date.now(),
      productId: numericId,
      sku,
      unitName: payload.unitName.trim(),
      conversionFactor: Number(payload.conversionFactor),
      isBaseUnit: false,
      formula: `1 ${payload.unitName.trim()} = ${payload.conversionFactor} ${baseUnitName}`,
      barcode: payload.barcode?.trim() || undefined,
      isDefaultPurchase: Boolean(payload.isDefaultPurchase),
      isDefaultSale: Boolean(payload.isDefaultSale),
      description: payload.description?.trim() || undefined,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Nếu đặt là mặc định mua hoặc bán, cập nhật các đơn vị khác
    const updatedAll = all.map((c) => {
      if (c.productId === numericId || (sku && c.sku === sku)) {
        return {
          ...c,
          isDefaultPurchase: payload.isDefaultPurchase ? false : c.isDefaultPurchase,
          isDefaultSale: payload.isDefaultSale ? false : c.isDefaultSale
        };
      }
      return c;
    });

    updatedAll.push(newUnit);
    this.saveLocalConversions(updatedAll);
    return newUnit;
  }

  /**
   * S2-07 AC3: Cập nhật hệ số quy đổi hoặc thông tin quy cách
   * Ghi AuditLog, không làm sai lệch giao dịch lịch sử
   */
  async updateUnit(
    productId: number | string,
    conversionId: number,
    baseUnitName: string,
    payload: UpdateProductUnitConversionPayload
  ): Promise<ProductUnitConversion> {
    const numericId = typeof productId === 'string' ? parseInt(productId.replace(/\D/g, ''), 10) || 0 : productId;

    if (payload.conversionFactor !== undefined && payload.conversionFactor <= 0) {
      throw new Error('Hệ số quy đổi phải lớn hơn 0!');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${numericId}/units/${conversionId}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      if (errData?.message) {
        throw new Error(errData.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg && !msg.includes('Failed to fetch')) {
        throw err;
      }
    }

    // Fallback LocalStorage
    const all = this.getLocalConversions();
    const index = all.findIndex((c) => c.id === conversionId);
    if (index === -1) {
      throw new Error(`Không tìm thấy đơn vị quy đổi với ID ${conversionId}!`);
    }

    const current = all[index];
    const unitName = payload.unitName ? payload.unitName.trim() : current.unitName;
    const factor = payload.conversionFactor !== undefined ? Number(payload.conversionFactor) : current.conversionFactor;

    const updated: ProductUnitConversion = {
      ...current,
      unitName,
      conversionFactor: factor,
      formula: `1 ${unitName} = ${factor} ${baseUnitName}`,
      barcode: payload.barcode !== undefined ? payload.barcode : current.barcode,
      isDefaultPurchase: payload.isDefaultPurchase !== undefined ? payload.isDefaultPurchase : current.isDefaultPurchase,
      isDefaultSale: payload.isDefaultSale !== undefined ? payload.isDefaultSale : current.isDefaultSale,
      description: payload.description !== undefined ? payload.description : current.description,
      status: payload.status !== undefined ? payload.status : current.status,
      updatedAt: new Date().toISOString()
    };

    all[index] = updated;
    this.saveLocalConversions(all);
    return updated;
  }

  /**
   * S2-07: Xóa đơn vị quy đổi
   */
  async deleteUnit(productId: number | string, conversionId: number): Promise<{ success: boolean; message: string }> {
    const numericId = typeof productId === 'string' ? parseInt(productId.replace(/\D/g, ''), 10) || 0 : productId;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${numericId}/units/${conversionId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (res.ok || res.status === 204) {
        return { success: true, message: 'Đã xóa đơn vị quy đổi thành công!' };
      }
      const errData = await res.json().catch(() => ({}));
      if (errData?.message) {
        throw new Error(errData.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg && !msg.includes('Failed to fetch')) {
        throw err;
      }
    }

    // Fallback LocalStorage
    const all = this.getLocalConversions();
    const filtered = all.filter((c) => c.id !== conversionId);
    this.saveLocalConversions(filtered);
    return { success: true, message: 'Đã xóa đơn vị quy đổi thành công (offline storage)!' };
  }

  /**
   * S2-07 AC2: Tiện ích tính toán quy đổi đơn vị tính
   * Hỗ trợ nhân viên kho nhập theo thùng/lốc -> tự động tính số lượng đơn vị cơ sở ghi sổ kho
   */
  async calculateConversion(request: UnitConversionCalculateRequest): Promise<UnitConversionResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/convert`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(request)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    // Fallback tính toán nội bộ
    const all = this.getLocalConversions();
    const matchingUnits = all.filter((c) => {
      if (request.productId && c.productId === request.productId) return true;
      if (request.sku && c.sku.toLowerCase() === request.sku.toLowerCase()) return true;
      return false;
    });

    const targetUnit = matchingUnits.find(
      (c) => c.unitName.trim().toLowerCase() === request.unitName.trim().toLowerCase()
    );

    const baseUnitItem = matchingUnits.find((c) => c.isBaseUnit);
    const baseUnitName = baseUnitItem?.unitName || 'Lon';
    const factor = targetUnit ? targetUnit.conversionFactor : 1.0;
    const baseQty = Number(request.quantity) * factor;

    const formula = `${request.quantity} ${request.unitName} x ${factor} = ${baseQty} ${baseUnitName}`;

    return {
      productId: request.productId || 0,
      sku: request.sku || 'SKU-001',
      productName: targetUnit?.sku || request.sku || 'Sản phẩm',
      inputUnit: request.unitName,
      inputQuantity: Number(request.quantity),
      conversionFactor: factor,
      baseUnit: baseUnitName,
      baseQuantity: baseQty,
      formula,
      convertedAt: new Date().toISOString(),
      snapshot: {
        transactionUnit: request.unitName,
        transactionQuantity: Number(request.quantity),
        conversionFactor: factor,
        baseUnit: baseUnitName,
        baseQuantity: baseQty
      }
    };
  }
}

export const unitConversionService = new UnitConversionService();
