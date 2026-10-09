/**
 * Service quản lý Tạo Đơn Hàng & Đơn Nháp (Story S3-09 / SCRUM-14)
 * Phân hệ: EP-04 Đặt hàng & Duyệt ngoại lệ (order, cart, approval)
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  OrderDraft,
  OrderItem,
  OrderItemUnitOption,
  OrderDraftBackendRequest,
  OrderBackendResponse,
  ProductOptionBackendResponse
} from '../types/order';
import type { CustomerGroupId } from '../types/agency';

const ACTIVE_DRAFT_KEY = 'erp_order_current_active_draft';

/**
 * Sản phẩm gợi ý khi thêm dòng hàng — lấy từ Backend (/api/orders/product-options).
 * basePrice: giá 1 ĐVT cơ sở theo bảng giá đang hiệu lực của nhóm khách hàng mà đại lý thuộc về.
 */
export interface OrderProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  basePrice: number;
  floorPrice?: number;
  priceAvailable?: boolean;
  priceMessage?: string | null;
  priceListCode?: string | null;
  // S4-03: Kho và Tồn khả dụng
  warehouseCode?: string;
  warehouseName?: string;
  physicalStock?: number;
  reservedStock?: number;
  availableStock?: number;
  availableUnits: {
    unitName: string;
    conversionFactor: number;
    isBaseUnit: boolean;
  }[];
}

/**
 * S4-03 AC1: Xác định kho hàng phục vụ đại lý theo khu vực/địa bàn
 */
export function getServingWarehouseInfo(agency?: { regionName?: string; address?: string } | null): {
  code: string;
  name: string;
} {
  const text = `${agency?.regionName || ''} ${agency?.address || ''}`.toLowerCase();
  if (text.includes('trung') || text.includes('đà nẵng') || text.includes('huế') || text.includes('quảng')) {
    return { code: 'WH-MT01', name: 'Kho Miền Trung' };
  }
  if (
    text.includes('nam') ||
    text.includes('hồ chí minh') ||
    text.includes('hcm') ||
    text.includes('sài gòn') ||
    text.includes('bình dương') ||
    text.includes('đồng nai') ||
    text.includes('cần thơ')
  ) {
    return { code: 'WH-MN01', name: 'Kho Tổng Miền Nam' };
  }
  return { code: 'WH-MB01', name: 'Kho Tổng Miền Bắc' };
}

/**
 * S4-03 AC2: Tồn khả dụng = Tồn thực tế - Tồn đang giữ chỗ cho đơn khác.
 * Hỗ trợ fallback sinh số liệu ổn định (deterministic) khi backend chưa hoàn tất API tồn kho.
 */
export function getStockInfoForProduct(
  sku: string,
  backendAvailable?: number | null,
  backendPhysical?: number | null,
  backendReserved?: number | null
): {
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
} {
  if (backendAvailable !== undefined && backendAvailable !== null) {
    const available = Number(backendAvailable);
    const physical =
      backendPhysical !== undefined && backendPhysical !== null ? Number(backendPhysical) : available + 20;
    const reserved =
      backendReserved !== undefined && backendReserved !== null ? Number(backendReserved) : physical - available;
    return {
      physicalStock: Math.max(0, physical),
      reservedStock: Math.max(0, reserved),
      availableStock: Math.max(0, available)
    };
  }

  let hash = 0;
  for (let i = 0; i < sku.length; i++) hash = (hash * 31 + sku.charCodeAt(i)) % 10000;
  const physicalStock = 120 + (Math.abs(hash) % 360); // 120 - 480 ĐVT cơ sở
  const reservedStock = 10 + (Math.abs(hash) % 40);   // 10 - 50 ĐVT cơ sở
  const availableStock = Math.max(0, physicalStock - reservedStock);
  return { physicalStock, reservedStock, availableStock };
}

// ======================== GỌI BACKEND ========================

/** Đọc lỗi chuẩn { code, message, details } của Backend thành 1 câu tiếng Việt */
async function readBackendError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.details && typeof data.details === 'object') {
    const first = Object.values(data.details as Record<string, string>)[0];
    if (first) return String(first);
  }
  return data?.message || fallback;
}

async function callBackend(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await authFetch(url, init);
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại!');
  }
}

/**
 * Tạo các tuỳ chọn ĐVT cho 1 sản phẩm: giá 1 ĐVT = giá ĐVT cơ sở (từ bảng giá Backend) × hệ số quy đổi.
 * S4-03 AC2: Tồn khả dụng theo ĐVT quy đổi = Math.floor(tồn cơ sở / hệ số quy đổi).
 */
export function buildItemUnitOptions(product: OrderProductCatalogItem): OrderItemUnitOption[] {
  const units = product.availableUnits.length
    ? product.availableUnits
    : [{ unitName: product.baseUnit, conversionFactor: 1, isBaseUnit: true }];
  const baseFloor = product.floorPrice ?? Math.round(product.basePrice * 0.9);
  const baseAvailable = product.availableStock !== undefined ? product.availableStock : 9999;
  return units.map((u) => {
    const factor = u.conversionFactor || 1;
    return {
      unitName: u.unitName,
      conversionFactor: factor,
      isBaseUnit: u.isBaseUnit,
      unitPrice: Math.round(product.basePrice * factor),
      floorPrice: Math.round(baseFloor * factor),
      availableStock: Math.floor(baseAvailable / factor)
    };
  });
}

/**
 * S4-01 & S4-03: Tính lại dòng hàng khi đổi số lượng / ĐVT / sửa giá thủ công / khôi phục giá gốc.
 * Tự động tính tồn khả dụng theo ĐVT và đánh dấu isOverStock nếu vượt tồn (AC2 & AC3).
 */
export function recalculateOrderItem(
  item: OrderItem,
  newQuantity?: number,
  newUnitName?: string,
  newUnitPrice?: number,
  resetToOriginalPrice?: boolean
): OrderItem {
  const quantity = newQuantity !== undefined ? Math.max(1, newQuantity) : item.quantity;
  let selectedUnit = item.selectedUnit;
  let conversionFactor = item.conversionFactor || 1;
  let originalUnitPrice = item.originalUnitPrice ?? item.unitPrice;
  let floorPrice = item.floorPrice;
  let unitPrice = item.unitPrice;
  let isCustomPrice = item.isCustomPrice ?? false;

  // Lấy hoặc phục hồi thông tin tồn kho
  const stockInfo =
    item.availableStock !== undefined
      ? {
          physicalStock: item.physicalStock ?? item.availableStock,
          reservedStock: item.reservedStock ?? 0,
          availableStock: item.availableStock
        }
      : getStockInfoForProduct(item.sku);

  if (newUnitName && newUnitName !== item.selectedUnit) {
    const matchedUnit = item.availableUnits.find((u) => u.unitName === newUnitName);
    if (matchedUnit) {
      selectedUnit = matchedUnit.unitName;
      conversionFactor = matchedUnit.conversionFactor || 1;
      originalUnitPrice = matchedUnit.unitPrice;
      floorPrice =
        matchedUnit.floorPrice ??
        (floorPrice ? Math.round((floorPrice / (item.conversionFactor || 1)) * conversionFactor) : undefined);
      if (!isCustomPrice) {
        unitPrice = matchedUnit.unitPrice;
      } else {
        const oldFactor = item.conversionFactor || 1;
        unitPrice = Math.round((unitPrice / oldFactor) * conversionFactor);
      }
    }
  }

  if (resetToOriginalPrice) {
    unitPrice = originalUnitPrice;
    isCustomPrice = false;
  } else if (newUnitPrice !== undefined) {
    unitPrice = Math.max(0, newUnitPrice);
    isCustomPrice = Math.abs(unitPrice - originalUnitPrice) > 0.01;
  }

  const isBelowFloor = floorPrice !== undefined && floorPrice > 0 ? unitPrice < floorPrice : false;
  const rawAmount = quantity * unitPrice;
  const discountPercent = item.discountPercent || 0;
  const discountAmount =
    discountPercent > 0 ? Math.round((rawAmount * discountPercent) / 100) : item.discountAmount || 0;
  const finalAmount = Math.max(0, rawAmount - discountAmount);

  // S4-03 AC2 & AC3: Tính tồn khả dụng theo ĐVT đã chọn và kiểm tra vượt tồn
  const availableInSelectedUnit = Math.floor(stockInfo.availableStock / (conversionFactor || 1));
  const isOverStock = quantity > availableInSelectedUnit;
  const maxAllowedQuantity = Math.max(0, availableInSelectedUnit);

  const updatedAvailableUnits = item.availableUnits.map((u) => ({
    ...u,
    availableStock: Math.floor(stockInfo.availableStock / (u.conversionFactor || 1))
  }));

  return {
    ...item,
    quantity,
    selectedUnit,
    conversionFactor,
    unitPrice,
    originalUnitPrice,
    floorPrice,
    isCustomPrice,
    isBelowFloor,
    warehouseCode: item.warehouseCode || 'WH-MB01',
    warehouseName: item.warehouseName || 'Kho Tổng Miền Bắc',
    physicalStock: stockInfo.physicalStock,
    reservedStock: stockInfo.reservedStock,
    availableStock: stockInfo.availableStock,
    availableInSelectedUnit,
    isOverStock,
    maxAllowedQuantity,
    baseQuantity: quantity * conversionFactor,
    rawAmount,
    discountPercent,
    discountAmount,
    finalAmount,
    appliedDiscountNote: item.appliedDiscountNote,
    availableUnits: updatedAvailableUnits
  };
}

/**
 * Ghi đè đơn giá, chiết khấu, thành tiền của các dòng bằng kết quả Backend tính (preview / đơn nháp đã lưu).
 * Nếu người dùng đã sửa giá thủ công thì giữ đơn giá sửa và kiểm tra giá sàn của backend.
 * Giữ nguyên và cập nhật thông tin kho và tồn khả dụng (S4-03).
 */
export function applyBackendLines(items: OrderItem[], order: OrderBackendResponse): OrderItem[] {
  return items.map((item) => {
    const line = (order.lines || []).find((l) => l.productSku === item.sku);
    if (!line) return item;
    const basePrice = Number(line.unitPrice);
    const gross = Number(line.grossAmount);
    const discount = Number(line.discountAmount);
    const lineFactor = Number(line.conversionFactor || 1);
    const lineFloorPrice =
      line.floorPrice != null
        ? Math.round(Number(line.floorPrice) * lineFactor)
        : item.floorPrice ?? Math.round(Number(line.pricePerUnit) * 0.9);

    const originalUnitPrice = Number(line.pricePerUnit);
    const currentUnitPrice = item.isCustomPrice && item.unitPrice ? item.unitPrice : originalUnitPrice;
    const isBelow = lineFloorPrice > 0 ? currentUnitPrice < lineFloorPrice : false;

    const actualGross = item.isCustomPrice ? item.quantity * currentUnitPrice : gross;
    const actualFinal = item.isCustomPrice ? Math.max(0, actualGross - discount) : Number(line.netAmount);

    // Tính tồn khả dụng theo ĐVT đã chọn
    const stockInfo =
      item.availableStock !== undefined
        ? {
            physicalStock: item.physicalStock ?? item.availableStock,
            reservedStock: item.reservedStock ?? 0,
            availableStock: item.availableStock
          }
        : getStockInfoForProduct(item.sku);
    const availableInSelectedUnit = Math.floor(stockInfo.availableStock / (lineFactor || 1));
    const isOverStock = item.quantity > availableInSelectedUnit;

    return {
      ...item,
      selectedUnit: line.unitName,
      conversionFactor: lineFactor,
      baseQuantity: Number(line.baseQuantity),
      unitPrice: currentUnitPrice,
      originalUnitPrice,
      floorPrice: lineFloorPrice,
      isBelowFloor: isBelow,
      warehouseCode: item.warehouseCode || 'WH-MB01',
      warehouseName: item.warehouseName || 'Kho Tổng Miền Bắc',
      physicalStock: stockInfo.physicalStock,
      reservedStock: stockInfo.reservedStock,
      availableStock: stockInfo.availableStock,
      availableInSelectedUnit,
      isOverStock,
      maxAllowedQuantity: Math.max(0, availableInSelectedUnit),
      rawAmount: actualGross,
      discountAmount: discount,
      discountPercent: gross > 0 ? Math.round((discount / gross) * 1000) / 10 : 0,
      finalAmount: actualFinal,
      appliedDiscountNote: line.discountPolicyCode ? `Chiết khấu sản lượng ${line.discountPolicyCode}` : undefined,
      availableUnits: item.availableUnits.map((u) => ({
        ...u,
        unitPrice: Math.round(basePrice * u.conversionFactor),
        floorPrice:
          line.floorPrice != null ? Math.round(Number(line.floorPrice) * u.conversionFactor) : u.floorPrice,
        availableStock: Math.floor(stockInfo.availableStock / (u.conversionFactor || 1))
      }))
    };
  });
}

/**
 * Tạo mới 1 dòng hàng từ sản phẩm đã chọn (giá theo bảng giá Backend & tồn theo kho phục vụ - S4-03)
 */
export function createOrderItemFromCatalog(
  product: OrderProductCatalogItem,
  initialQuantity = 1,
  warehouse?: { code: string; name: string }
): OrderItem {
  const stockInfo =
    product.availableStock !== undefined
      ? {
          physicalStock: product.physicalStock ?? product.availableStock,
          reservedStock: product.reservedStock ?? 0,
          availableStock: product.availableStock
        }
      : getStockInfoForProduct(product.sku);

  const availableUnits = buildItemUnitOptions({
    ...product,
    availableStock: stockInfo.availableStock
  });
  const defaultUnit = availableUnits.find((u) => u.isBaseUnit) || availableUnits[0];
  const baseFloor = product.floorPrice ?? Math.round(product.basePrice * 0.9);
  const floorPrice = defaultUnit.floorPrice ?? Math.round(baseFloor * defaultUnit.conversionFactor);

  const initialItem: OrderItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    baseUnit: product.baseUnit,
    selectedUnit: defaultUnit.unitName,
    conversionFactor: defaultUnit.conversionFactor,
    quantity: initialQuantity,
    baseQuantity: initialQuantity * defaultUnit.conversionFactor,
    unitPrice: defaultUnit.unitPrice,
    originalUnitPrice: defaultUnit.unitPrice,
    floorPrice,
    isCustomPrice: false,
    isBelowFloor: false,
    warehouseCode: warehouse?.code || product.warehouseCode || 'WH-MB01',
    warehouseName: warehouse?.name || product.warehouseName || 'Kho Tổng Miền Bắc',
    physicalStock: stockInfo.physicalStock,
    reservedStock: stockInfo.reservedStock,
    availableStock: stockInfo.availableStock,
    rawAmount: initialQuantity * defaultUnit.unitPrice,
    discountPercent: 0,
    discountAmount: 0,
    finalAmount: initialQuantity * defaultUnit.unitPrice,
    availableUnits
  };

  return recalculateOrderItem(initialItem, initialQuantity, defaultUnit.unitName);
}

/**
 * Đếm số mặt hàng / số lượng trên trình duyệt (tiền do Backend tính, xem previewOrderOnBackend)
 */
export function calculateOrderTotals(items: OrderItem[]): {
  totalItemsCount: number;
  totalQuantity: number;
  subtotalAmount: number;
  discountAmount: number;
  totalPayable: number;
} {
  const subtotalAmount = items.reduce((sum, item) => sum + item.rawAmount, 0);
  const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  return {
    totalItemsCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalAmount,
    discountAmount,
    totalPayable: subtotalAmount - discountAmount
  };
}

/** Dựng yêu cầu gửi Backend từ dữ liệu đang gõ */
export function buildBackendRequest(params: {
  draftId?: number | null;
  agencyId: string;
  deliveryPointId?: string;
  expectedDeliveryDate?: string;
  note?: string;
  items: OrderItem[];
}): OrderDraftBackendRequest {
  return {
    draftId: params.draftId ?? null,
    customerId: Number(params.agencyId),
    deliveryAddressId:
      params.deliveryPointId && /^\d+$/.test(params.deliveryPointId) ? Number(params.deliveryPointId) : null,
    desiredDeliveryDate: params.expectedDeliveryDate || null,
    note: params.note || null,
    lines: params.items.map((it) => ({
      productSku: it.sku,
      unitName: it.selectedUnit,
      quantity: it.quantity,
      unitPrice: it.isCustomPrice ? it.unitPrice : undefined
    }))
  };
}

/**
 * 1. Lấy danh sách sản phẩm theo bảng giá của đại lý (kèm tìm kiếm nếu có) (S3-09)
 * Tự động tải sản phẩm của bảng giá đại lý ngay khi mở modal.
 */
export async function fetchBackendProductOptions(
  customerId: string | number,
  keyword: string = '',
  servingWarehouse?: { code: string; name: string }
): Promise<OrderProductCatalogItem[]> {
  const kw = keyword.trim();
  if (!customerId || !/^\d+$/.test(String(customerId))) return [];

  const url = kw
    ? `${API_BASE_URL}/api/orders/product-options?customerId=${customerId}&keyword=${encodeURIComponent(kw)}`
    : `${API_BASE_URL}/api/orders/product-options?customerId=${customerId}`;
  const res = await callBackend(url);
  if (!res.ok) throw new Error(await readBackendError(res, 'Không tải được danh sách sản phẩm'));
  const data: ProductOptionBackendResponse[] = await res.json();
  return (Array.isArray(data) ? data : []).map((item) => {
    const stock = getStockInfoForProduct(
      item.sku,
      item.availableStock,
      item.physicalStock,
      item.reservedStock
    );
    return {
      id: String(item.productId),
      sku: item.sku,
      name: item.name,
      category: '',
      baseUnit: item.baseUnit,
      basePrice: Number(item.unitPrice || 0),
      priceAvailable: item.priceAvailable,
      priceMessage: item.message,
      priceListCode: item.priceListCode,
      warehouseCode: item.warehouseCode || servingWarehouse?.code || 'WH-MB01',
      warehouseName: item.warehouseName || servingWarehouse?.name || 'Kho Tổng Miền Bắc',
      physicalStock: stock.physicalStock,
      reservedStock: stock.reservedStock,
      availableStock: stock.availableStock,
      availableUnits: (item.units || []).map((u) => ({
        unitName: u.unitName,
        conversionFactor: Number(u.conversionFactor),
        isBaseUnit: u.unitName.trim().toLowerCase() === item.baseUnit.trim().toLowerCase()
      }))
    };
  });
}

/**
 * 2. Backend tính tiền hàng, chiết khấu sản lượng, tổng phải thu và cảnh báo (S3-09). Lỗi -> ném Error.
 */
export async function previewOrderOnBackend(request: OrderDraftBackendRequest): Promise<OrderBackendResponse> {
  const res = await callBackend(`${API_BASE_URL}/api/orders/preview`, {
    method: 'POST',
    body: JSON.stringify(request)
  });
  if (!res.ok) throw new Error(await readBackendError(res, 'Không tính được tiền đơn hàng'));
  return (await res.json()) as OrderBackendResponse;
}

/**
 * 3. Lưu đơn nháp lên máy chủ (POST /api/orders/drafts hoặc PUT /api/orders/{id}). Lỗi -> ném Error.
 */
export async function saveDraftToBackend(
  request: OrderDraftBackendRequest,
  draftId?: number | null
): Promise<OrderBackendResponse> {
  const isUpdate = Boolean(draftId && draftId > 0);
  const url = isUpdate ? `${API_BASE_URL}/api/orders/${draftId}` : `${API_BASE_URL}/api/orders/drafts`;
  const res = await callBackend(url, {
    method: isUpdate ? 'PUT' : 'POST',
    body: JSON.stringify(request)
  });
  if (!res.ok) throw new Error(await readBackendError(res, 'Không lưu được đơn nháp'));
  return (await res.json()) as OrderBackendResponse;
}

/**
 * 4. Tải danh sách đơn nháp từ Backend (GET /api/orders?status=DRAFT)
 */
export async function fetchBackendDrafts(keyword?: string): Promise<OrderDraft[]> {
  const kw = keyword && keyword.trim() ? encodeURIComponent(keyword.trim()) : '';
  const res = await callBackend(`${API_BASE_URL}/api/orders?status=DRAFT&size=50${kw ? `&keyword=${kw}` : ''}`);
  if (!res.ok) throw new Error(await readBackendError(res, 'Không tải được danh sách đơn nháp'));
  const data = await res.json();
  if (data && Array.isArray(data.content)) {
    return data.content.map((item: any) => ({
      id: `BACKEND-DRAFT-${item.id}`,
      backendDraftId: item.id,
      orderNumber: item.code,
      status: 'DRAFT',
      agencyId: String(item.customerId),
      agencyCode: item.customerCode,
      agencyName: item.customerName,
      customerGroup: 'TIER_1',
      customerGroupName: 'Đại lý Cấp 1',
      pricingTierCode: 'BG-C1',
      pricingTierName: 'Bảng giá áp dụng',
      deliveryPointId: '',
      deliveryPointName: 'Kho đại lý',
      deliveryAddress: '',
      expectedDeliveryDate: item.desiredDeliveryDate || new Date().toISOString().slice(0, 10),
      items: [],
      totalItemsCount: item.lineCount || 0,
      totalQuantity: 0,
      subtotalAmount: Number(item.totalAmount || 0),
      discountAmount: 0,
      totalPayable: Number(item.totalAmount || 0),
      salesRepId: '3',
      salesRepName: item.createdByUsername || 'sales_rep',
      createdAt: item.updatedAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    } as OrderDraft));
  }
  return [];
}

/**
 * 5. Tải chi tiết một đơn nháp từ Backend (GET /api/orders/{id})
 */
export async function fetchBackendDraftById(id: number): Promise<OrderDraft> {
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}`);
  if (!res.ok) throw new Error(await readBackendError(res, 'Không mở được đơn nháp'));
  const data: OrderBackendResponse = await res.json();
  const items: OrderItem[] = (data.lines || []).map((line, idx) => ({
    id: `line-${line.productId}-${idx}`,
    productId: line.productId,
    sku: line.productSku,
    name: line.productName,
    baseUnit: line.baseUnit,
    selectedUnit: line.unitName,
    conversionFactor: Number(line.conversionFactor || 1),
    quantity: Number(line.quantity),
    baseQuantity: Number(line.baseQuantity),
    unitPrice: Number(line.pricePerUnit),
    rawAmount: Number(line.grossAmount),
    discountPercent: line.discountAmount > 0 && line.grossAmount > 0 ? (line.discountAmount / line.grossAmount) * 100 : 0,
    discountAmount: Number(line.discountAmount),
    finalAmount: Number(line.netAmount),
    appliedDiscountNote: line.discountPolicyCode ? `Chính sách ${line.discountPolicyCode}` : undefined,
    availableUnits: [
      {
        unitName: line.unitName,
        conversionFactor: Number(line.conversionFactor || 1),
        isBaseUnit: line.unitName === line.baseUnit,
        unitPrice: Number(line.pricePerUnit)
      }
    ]
  }));

  const grpId: CustomerGroupId =
    data.customerGroup === 'DEALER_LEVEL_1'
      ? 'TIER_1'
      : data.customerGroup === 'DEALER_LEVEL_2'
      ? 'TIER_2'
      : 'RETAIL_SHOWROOM';

  return {
    id: `BACKEND-DRAFT-${data.id}`,
    backendDraftId: data.id || undefined,
    orderNumber: data.code || undefined,
    status: 'DRAFT',
    agencyId: String(data.customerId),
    agencyCode: data.customerCode,
    agencyName: data.customerName,
    customerGroup: grpId,
    customerGroupName: data.customerGroupLabel || 'Đại lý',
    pricingTierCode: data.lines?.[0]?.priceListCode || 'BG-STANDARD',
    pricingTierName: data.lines?.[0]?.priceListCode || 'Bảng giá chuẩn',
    deliveryPointId: data.deliveryAddress ? String(data.deliveryAddress.id) : '',
    deliveryPointName: data.deliveryAddress?.label || 'Kho chính đại lý',
    deliveryAddress: data.deliveryAddress?.address || '',
    expectedDeliveryDate: data.desiredDeliveryDate || new Date().toISOString().slice(0, 10),
    note: data.note || '',
    items,
    totalItemsCount: items.length,
    totalQuantity: items.reduce((acc, i) => acc + i.quantity, 0),
    subtotalAmount: Number(data.subtotal || 0),
    discountAmount: Number(data.discountTotal || 0),
    totalPayable: Number(data.totalAmount || 0),
    salesRepId: '3',
    salesRepName: data.createdByUsername || 'sales_rep',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}

// ======================== ĐƠN ĐANG GÕ DỞ (chỉ trên máy này, để không mất khi lỡ tải lại trang) ========================

/**
 * Lấy đơn nháp đang thao tác dở (Auto-save)
 */
export function getActiveDraft(): OrderDraft | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrderDraft;
  } catch {
    return null;
  }
}

/**
 * Tự động lưu tiến trình đơn đang gõ dở
 */
export function setActiveDraft(draft: OrderDraft): void {
  try {
    localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('Lỗi auto-save active draft:', err);
  }
}

/**
 * Xóa trạng thái đơn đang gõ dở
 */
export function clearActiveDraft(): void {
  localStorage.removeItem(ACTIVE_DRAFT_KEY);
}

/**
 * Định dạng tiền tệ VND
 */
export function formatCurrencyVND(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

/**
 * Định dạng số lượng
 */
export function formatQuantity(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val);
}
