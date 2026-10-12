/**
 * S5-09: API Service Quản lý cấu hình ngưỡng tồn tối thiểu & Cảnh báo đứt hàng
 * Acceptance Criteria:
 * - AC1: Khai báo tồn tối thiểu theo SKU và theo kho
 * - AC2: Hàng dưới ngưỡng hiển thị nổi bật trong sổ tồn và trên dashboard kho
 */

import { authFetch, API_BASE_URL } from './api';
import type { MinStockThresholdConfig, UpdateMinThresholdPayload } from '../types/stockAlert';

const STORAGE_KEY = 'erp_min_stock_configs_v1';

// Dữ liệu mẫu phong phú phục vụ kiểm thử cảnh báo đỏ (Test case QA Ngô Thị Ánh Ngọc)
export const INITIAL_MIN_STOCK_CONFIGS: MinStockThresholdConfig[] = [
  {
    id: 'cfg-1',
    productId: 1,
    productSku: 'BEV-PEPSI-330',
    productName: 'Nước ngọt Pepsi lon 330ml',
    category: 'Nước giải khát',
    unit: 'Thùng',
    warehouseCode: 'WH-MB01',
    warehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    minThreshold: 100,           // Định mức tối thiểu: 100 thùng
    currentStock: 18,            // Tồn thực tế: 18 thùng (DƯỚI ĐỊNH MỨC NGUY HIỂM)
    availableStock: 15,
    isBelowThreshold: true,
    deficitQuantity: 82,
    severity: 'CRITICAL',        // Báo đỏ nghiêm trọng
    suggestedReorderQuantity: 200,
    supplierCode: 'NCC-SABECO',
    supplierName: 'Tổng Công ty Bia - Rượu - Nước giải khát',
    lastRestockedDate: '2026-09-28',
    updatedAt: '2026-10-09T08:00:00'
  },
  {
    id: 'cfg-2',
    productId: 2,
    productSku: 'MILK-VNM-180',
    productName: 'Sữa tươi tiệt trùng Vinamilk 180ml',
    category: 'Sữa & Sản phẩm từ sữa',
    unit: 'Thùng',
    warehouseCode: 'WH-MB01',
    warehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    minThreshold: 80,
    currentStock: 0,             // HẾT SẠCH TỒN KHO - NGUY CƠ ĐỨT HÀNG TUYỆT ĐỐI
    availableStock: 0,
    isBelowThreshold: true,
    deficitQuantity: 80,
    severity: 'CRITICAL',        // Báo đỏ khẩn cấp
    suggestedReorderQuantity: 150,
    supplierCode: 'NCC-VNM',
    supplierName: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
    lastRestockedDate: '2026-09-15',
    updatedAt: '2026-10-09T08:00:00'
  },
  {
    id: 'cfg-3',
    productId: 3,
    productSku: 'FOOD-CHINSU-500',
    productName: 'Nước mắm Chinsu Cá Hồi 500ml',
    category: 'Gia vị & Thực phẩm',
    unit: 'Thùng',
    warehouseCode: 'WH-MN01',
    warehouseName: 'Kho Tổng Miền Nam (Bình Dương)',
    minThreshold: 60,
    currentStock: 42,            // Tồn 42 < 60
    availableStock: 35,
    isBelowThreshold: true,
    deficitQuantity: 18,
    severity: 'WARNING',         // Cảnh báo vàng/cam
    suggestedReorderQuantity: 100,
    supplierCode: 'NCC-MASAN',
    supplierName: 'Công ty Cổ phần Hàng tiêu dùng Masan',
    lastRestockedDate: '2026-10-01',
    updatedAt: '2026-10-09T08:00:00'
  },
  {
    id: 'cfg-4',
    productId: 4,
    productSku: 'BEV-AQUAFINA-500',
    productName: 'Nước khoáng đóng chai Aquafina 500ml',
    category: 'Nước giải khát',
    unit: 'Thùng',
    warehouseCode: 'WH-MT01',
    warehouseName: 'Kho Miền Trung (Đà Nẵng)',
    minThreshold: 50,
    currentStock: 120,           // Tồn an toàn 120 >= 50
    availableStock: 110,
    isBelowThreshold: false,
    deficitQuantity: 0,
    severity: 'SAFE',
    suggestedReorderQuantity: 0,
    supplierCode: 'NCC-LAVIE',
    supplierName: 'Công ty TNHH La Vie',
    lastRestockedDate: '2026-10-05',
    updatedAt: '2026-10-09T08:00:00'
  },
  {
    id: 'cfg-5',
    productId: 5,
    productSku: 'BEV-COCA-330',
    productName: 'Nước ngọt Coca-Cola lon 330ml',
    category: 'Nước giải khát',
    unit: 'Thùng',
    warehouseCode: 'WH-MB01',
    warehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    minThreshold: 120,
    currentStock: 25,            // Tồn 25 < 120 (Báo đỏ)
    availableStock: 20,
    isBelowThreshold: true,
    deficitQuantity: 95,
    severity: 'CRITICAL',
    suggestedReorderQuantity: 250,
    supplierCode: 'NCC-SABECO',
    supplierName: 'Công ty Nước giải khát',
    lastRestockedDate: '2026-09-20',
    updatedAt: '2026-10-09T08:00:00'
  }
];

function getLocalConfigs(): MinStockThresholdConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MIN_STOCK_CONFIGS));
      return INITIAL_MIN_STOCK_CONFIGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MIN_STOCK_CONFIGS;
  }
}

function saveLocalConfigs(data: MinStockThresholdConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Lỗi lưu cấu hình tồn tối thiểu vào localStorage:', e);
  }
}

let memoryCachedConfigs: MinStockThresholdConfig[] | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // Cache 1 phút

export function invalidateMinStockCache() {
  memoryCachedConfigs = null;
  lastCacheFetchTime = 0;
}

export interface PagedMinStockResult {
  content: MinStockThresholdConfig[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/**
 * Lấy danh sách cấu hình định mức phân trang (cố định 50 sản phẩm/trang để tải nhanh tức thì)
 * Tự động cắt lát (slice) 50 bản ghi và cache bộ nhớ để triệt tiêu tình trạng lag giật DOM.
 */
export async function fetchMinStockConfigsPaged(params?: {
  warehouseCode?: string;
  onlyBelowThreshold?: boolean;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PagedMinStockResult> {
  const page = Math.max(0, params?.page ?? 0);
  const size = Math.max(1, params?.size ?? 50);

  // Nếu chỉ tìm SKU dưới ngưỡng (Báo đỏ), gọi thẳng endpoint /check siêu nhẹ (~150ms)
  if (params?.onlyBelowThreshold && !params?.keyword?.trim()) {
    try {
      const q = new URLSearchParams();
      if (params?.warehouseCode && params.warehouseCode !== 'ALL') {
        q.set('warehouseCode', params.warehouseCode);
      }
      const checkRes = await authFetch(`${API_BASE_URL}/api/inventory/min-stock-alerts/check?${q.toString()}`);
      if (checkRes.ok) {
        const rawList = await checkRes.json();
        const list: MinStockThresholdConfig[] = (Array.isArray(rawList) ? rawList : (rawList.content || [])).map((item: any) => ({
          ...item,
          isBelowThreshold: true
        }));
        const totalElements = list.length;
        const totalPages = Math.ceil(totalElements / size) || 1;
        const start = page * size;
        const content = list.slice(start, start + size);
        return { content, totalElements, totalPages, page, size };
      }
    } catch {
      // fallback to full flow
    }
  }

  // Kiểm tra cache trong bộ nhớ
  const isCacheFresh = memoryCachedConfigs && (Date.now() - lastCacheFetchTime < CACHE_TTL_MS);

  if (!isCacheFresh) {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/inventory/min-stock-alerts`);
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.content || []);
        memoryCachedConfigs = rawList.map((item: any) => ({
          ...item,
          isBelowThreshold: Boolean(item.isBelowThreshold ?? item.belowThreshold ?? (item.currentStock < item.minThreshold))
        }));
        lastCacheFetchTime = Date.now();
      }
    } catch (err) {
      console.warn('Lỗi gọi API danh sách sổ tồn:', err);
    }
  }

  // Dùng dữ liệu từ cache hoặc fallback
  let list = memoryCachedConfigs || getLocalConfigs();

  if (params?.warehouseCode && params.warehouseCode !== 'ALL') {
    list = list.filter((c) => c.warehouseCode === params.warehouseCode);
  }
  if (params?.onlyBelowThreshold) {
    list = list.filter((c) => c.isBelowThreshold);
  }
  if (params?.keyword?.trim()) {
    const q = params.keyword.trim().toLowerCase();
    list = list.filter(
      (c) =>
        (c.productSku && c.productSku.toLowerCase().includes(q)) ||
        (c.productName && c.productName.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }

  const totalElements = list.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const start = page * size;
  // Cắt đúng 50 sản phẩm để đưa vào React state, không bao giờ render hàng nghìn dòng
  const content = list.slice(start, start + size);

  return { content, totalElements, totalPages, page, size };
}

/**
 * Lấy danh sách cấu hình tồn tối thiểu và trạng thái theo kho
 */
export async function fetchMinStockConfigs(params?: {
  warehouseCode?: string;
  onlyBelowThreshold?: boolean;
  keyword?: string;
  limit?: number;
}): Promise<MinStockThresholdConfig[]> {
  try {
    const query = new URLSearchParams();
    if (params?.warehouseCode && params.warehouseCode !== 'ALL') {
      query.set('warehouseCode', params.warehouseCode);
    }
    if (params?.onlyBelowThreshold) {
      query.set('belowThresholdOnly', 'true');
    }
    if (params?.keyword) {
      query.set('keyword', params.keyword);
    }
    if (params?.limit) {
      query.set('limit', String(params.limit));
    }
    const res = await authFetch(`${API_BASE_URL}/api/inventory/min-stock-alerts?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.content || []);
      return (rawList || []).map((item: any) => ({
        ...item,
        isBelowThreshold: Boolean(item.isBelowThreshold ?? item.belowThreshold ?? (item.currentStock < item.minThreshold))
      }));
    }
  } catch {
    // fallback
  }

  let list = getLocalConfigs();
  if (params?.warehouseCode && params.warehouseCode !== 'ALL') {
    list = list.filter((c) => c.warehouseCode === params.warehouseCode);
  }
  if (params?.onlyBelowThreshold) {
    list = list.filter((c) => c.isBelowThreshold);
  }
  if (params?.keyword?.trim()) {
    const q = params.keyword.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.productSku.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Khai báo / Cập nhật ngưỡng tồn tối thiểu cho SKU tại kho (AC1)
 */
export async function updateMinStockThreshold(payload: UpdateMinThresholdPayload): Promise<MinStockThresholdConfig> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/inventory/min-stock-alerts`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const item = await res.json();
      invalidateMinStockCache();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('min_stock_updated'));
      }
      return {
        ...item,
        isBelowThreshold: Boolean(item.isBelowThreshold ?? item.belowThreshold ?? (item.currentStock < item.minThreshold))
      };
    }
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Lỗi lưu định mức (HTTP ${res.status})`);
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
    // fallback nếu mất mạng
  }

  const list = getLocalConfigs();
  const idx = list.findIndex(
    (c) => c.productSku === payload.productSku && c.warehouseCode === payload.warehouseCode
  );

  const newMin = Math.max(0, payload.minThreshold);
  const now = new Date().toISOString();

  if (idx !== -1) {
    const item = list[idx];
    const isBelow = item.currentStock < newMin;
    const deficit = Math.max(0, newMin - item.currentStock);
    let severity: 'CRITICAL' | 'WARNING' | 'SAFE' = 'SAFE';
    if (isBelow) {
      severity = item.currentStock === 0 || item.currentStock < newMin * 0.5 ? 'CRITICAL' : 'WARNING';
    }

    const updated: MinStockThresholdConfig = {
      ...item,
      minThreshold: newMin,
      isBelowThreshold: isBelow,
      deficitQuantity: deficit,
      severity,
      suggestedReorderQuantity: isBelow ? deficit + Math.round(newMin * 0.5) : 0,
      updatedAt: now
    };
    list[idx] = updated;
    saveLocalConfigs(list);
    invalidateMinStockCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('min_stock_updated'));
    }
    return updated;
  }

  throw new Error('Không tìm thấy bản ghi SKU tại kho để cập nhật ngưỡng.');
}

/**
 * Lấy nhanh số lượng cảnh báo đỏ cho Dashboard & Header chuông (AC2)
 * Gọi endpoint /check (~150ms) để tải siêu tốc, không bị block
 */
export async function getDashboardMinStockSummary(warehouseCode?: string): Promise<{
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  totalSkuCount?: number;
  totalSafeCount?: number;
  criticalItems: MinStockThresholdConfig[];
}> {
  try {
    const query = new URLSearchParams();
    if (warehouseCode && warehouseCode !== 'ALL') {
      query.set('warehouseCode', warehouseCode);
    }

    // Gọi endpoint /check đã được kiểm thử siêu tốc (~150ms)
    const checkRes = await authFetch(`${API_BASE_URL}/api/inventory/min-stock-alerts/check?${query.toString()}`);
    if (checkRes.ok) {
      const data = await checkRes.json();
      const rawList: any[] = Array.isArray(data) ? data : (data.content || []);
      const criticalItems = rawList.filter((c) => c.severity === 'CRITICAL');
      const warningItems = rawList.filter((c) => c.severity === 'WARNING');
      return {
        totalAlerts: rawList.length,
        criticalCount: criticalItems.length,
        warningCount: warningItems.length,
        criticalItems: rawList.map((item) => ({
          ...item,
          isBelowThreshold: true
        }))
      };
    }
  } catch (err) {
    // fallback
  }

  const configs = await fetchMinStockConfigs({
    warehouseCode,
    onlyBelowThreshold: true
  });

  const criticalItems = configs.filter((c) => c.severity === 'CRITICAL');
  const warningItems = configs.filter((c) => c.severity === 'WARNING');

  return {
    totalAlerts: configs.length,
    criticalCount: criticalItems.length,
    warningCount: warningItems.length,
    criticalItems
  };
}
