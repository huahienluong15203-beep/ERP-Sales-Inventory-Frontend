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
  ProductOptionBackendResponse,
  OrderTotalsSummary,
  OrderFilterCriteria,
  OrderPageResponse,
  CustomerPurchaseHistoryItem,
  CustomerPurchaseHistoryData,
  PendingOrderResponse,
  OrderApprovalHistoryResponse
} from '../types/order';
import type { Agency, CustomerGroupId } from '../types/agency';
import type { UserProfile } from '../types/user';

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
      floorPrice: item.floorPrice != null ? Number(item.floorPrice) : undefined,
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
 * S4-05 & S4-02: Chốt đơn hàng từ đơn nháp (POST /api/orders/{id}/submit)
 * - Nếu không vi phạm: đơn sang ĐÃ DUYỆT (APPROVED).
 * - Nếu vượt hạn mức hoặc bán dưới giá sàn: đơn sang CHỜ DUYỆT (PENDING_APPROVAL).
 */
export async function submitOrderToBackend(orderId: number | string): Promise<OrderBackendResponse> {
  const res = await callBackend(`${API_BASE_URL}/api/orders/${orderId}/submit`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await readBackendError(res, 'Không thể chốt đơn hàng'));
  return (await res.json()) as OrderBackendResponse;
}

/**
 * S4-05: Lấy danh sách đơn hàng chờ duyệt kèm lý do vi phạm (GET /api/orders/pending-approval)
 * Sắp xếp: Đơn chờ lâu nhất lên đầu.
 */
export async function fetchPendingApprovalOrders(
  keyword?: string,
  page: number = 0,
  size: number = 20
): Promise<{ content: PendingOrderResponse[]; totalElements: number; totalPages: number }> {
  const kw = keyword && keyword.trim() ? encodeURIComponent(keyword.trim()) : '';
  const url = `${API_BASE_URL}/api/orders/pending-approval?page=${page}&size=${size}${kw ? `&keyword=${kw}` : ''}`;
  const res = await callBackend(url);
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không tải được danh sách đơn chờ duyệt'));
  }
  const data = await res.json();
  return {
    content: Array.isArray(data?.content) ? data.content : [],
    totalElements: Number(data?.totalElements || 0),
    totalPages: Math.max(1, Number(data?.totalPages || 1))
  };
}

/**
 * S4-05: Duyệt đơn hàng (POST /api/orders/{id}/approve) - chuyển trạng thái ĐÃ DUYỆT (APPROVED)
 */
export async function approveOrder(id: number | string, comment?: string): Promise<OrderBackendResponse> {
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment?.trim() || null })
  });
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không thể duyệt đơn hàng'));
  }
  return await res.json();
}

/**
 * S4-05: Từ chối đơn hàng (POST /api/orders/{id}/reject) - bắt buộc nhập lý do
 */
export async function rejectOrder(id: number | string, comment: string): Promise<OrderBackendResponse> {
  if (!comment || !comment.trim()) {
    throw new Error('Bắt buộc nhập lý do khi từ chối đơn hàng!');
  }
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment.trim() })
  });
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không thể từ chối đơn hàng'));
  }
  return await res.json();
}

/**
 * S4-05: Trả lại sửa (POST /api/orders/{id}/return) - chuyển đơn về Nháp, bắt buộc nhập ý kiến
 */
export async function returnOrderForEdit(id: number | string, comment: string): Promise<OrderBackendResponse> {
  if (!comment || !comment.trim()) {
    throw new Error('Bắt buộc nhập ý kiến khi trả lại đơn hàng!');
  }
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment.trim() })
  });
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không thể trả lại đơn hàng'));
  }
  return await res.json();
}

/**
 * S4-05: Lịch sử phê duyệt đơn hàng (GET /api/orders/{id}/approval-history)
 */
export async function fetchOrderApprovalHistory(id: number | string): Promise<OrderApprovalHistoryResponse[]> {
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}/approval-history`);
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * S4-06 / SCRUM-158 AC2: Hủy đơn hàng và tự động nhả tồn đang giữ chỗ (POST /api/orders/{id}/cancel)
 * Bắt buộc nhập lý do hủy theo quy chuẩn S4-06 AC2. Đơn đã xuất kho không thể hủy (AC3).
 */
export async function cancelOrder(id: number | string, reason: string): Promise<OrderBackendResponse> {
  if (!reason || !reason.trim()) {
    throw new Error('Bắt buộc nhập lý do hủy đơn hàng theo quy chuẩn S4-06 AC2!');
  }
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason.trim() })
  });
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không thể hủy đơn hàng'));
  }
  return await res.json();
}

/**
 * S4-06 / SCRUM-158: Chuyển trạng thái đơn hàng theo vòng đời (POST /api/orders/{id}/status)
 * APPROVED -> PICKING -> DISPATCHED -> DELIVERED -> CLOSED
 */
export async function updateOrderStatus(
  id: number | string,
  status: string,
  note?: string
): Promise<OrderBackendResponse> {
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note: note ? note.trim() : undefined })
  });
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không thể chuyển trạng thái đơn hàng'));
  }
  return await res.json();
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
    return data.content.map((item: { id: number | string; code?: string; customerId?: string | number; customerCode?: string; customerName?: string; desiredDeliveryDate?: string; lineCount?: number; totalAmount?: number; createdByUsername?: string; updatedAt?: string; [key: string]: unknown }) => ({
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
      updatedAt: String(item.updatedAt || new Date().toISOString())
    } as unknown as OrderDraft));
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

// ======================== S4-07: QUẢN LÝ DANH SÁCH ĐƠN HÀNG & BỘ LỌC TOÀN CÔNG TY ========================

/**
 * S4-07: Tải danh sách đơn hàng có phân trang và bộ lọc đa tiêu chí
 * Backend: GET /api/orders
 */
export async function fetchOrders(criteria: OrderFilterCriteria = {}): Promise<OrderPageResponse> {
  const query = new URLSearchParams();
  if (criteria.statuses && criteria.statuses.length > 0) {
    query.set('status', criteria.statuses.join(','));
  }
  if (criteria.customerId) query.set('customerId', String(criteria.customerId));
  if (criteria.salesRepId) query.set('salesRepId', String(criteria.salesRepId));
  if (criteria.regionId) query.set('regionId', String(criteria.regionId));
  if (criteria.fromDate) query.set('fromDate', criteria.fromDate);
  if (criteria.toDate) query.set('toDate', criteria.toDate);
  if (criteria.keyword && criteria.keyword.trim()) query.set('keyword', criteria.keyword.trim());
  query.set('page', String(criteria.page ?? 0));
  query.set('size', String(criteria.size ?? 20));

  const res = await callBackend(`${API_BASE_URL}/api/orders?${query.toString()}`);
  if (!res.ok) throw new Error(await readBackendError(res, 'Không tải được danh sách đơn hàng'));
  return res.json();
}

/**
 * S4-07: Tải tổng số đơn và tổng doanh số/tiền hàng của toàn bộ kết quả đang lọc từ Database
 * Backend: GET /api/orders/totals
 */
export async function fetchOrderTotals(criteria: OrderFilterCriteria = {}): Promise<OrderTotalsSummary> {
  const query = new URLSearchParams();
  if (criteria.statuses && criteria.statuses.length > 0) {
    query.set('status', criteria.statuses.join(','));
  }
  if (criteria.customerId) query.set('customerId', String(criteria.customerId));
  if (criteria.salesRepId) query.set('salesRepId', String(criteria.salesRepId));
  if (criteria.regionId) query.set('regionId', String(criteria.regionId));
  if (criteria.fromDate) query.set('fromDate', criteria.fromDate);
  if (criteria.toDate) query.set('toDate', criteria.toDate);
  if (criteria.keyword && criteria.keyword.trim()) query.set('keyword', criteria.keyword.trim());

  const res = await callBackend(`${API_BASE_URL}/api/orders/totals?${query.toString()}`);
  if (!res.ok) throw new Error(await readBackendError(res, 'Không tải được tổng tiền đơn hàng'));
  return res.json();
}

/**
 * S4-07 / S3-09: Tải chi tiết đơn hàng theo ID (kèm danh sách dòng hàng và thông tin duyệt)
 * Backend: GET /api/orders/{id}
 */
export async function fetchOrderDetail(id: number | string): Promise<OrderBackendResponse> {
  const res = await callBackend(`${API_BASE_URL}/api/orders/${id}`);
  if (!res.ok) throw new Error(await readBackendError(res, 'Không tải được chi tiết đơn hàng'));
  return res.json();
}

// ======================== S4-09: SAO CHÉP ĐƠN CŨ THÀNH ĐƠN MỚI (CHỐT ĐƠN ĐỊNH KỲ) ========================

/**
 * Story S4-09: Sao chép một đơn cũ thành đơn mới
 * 1. AC1: Sao chép toàn bộ dòng hàng (SKU, ĐVT, số lượng) của đơn đã chọn.
 * 2. AC2: Đơn giá và chiết khấu được áp lại theo bảng giá hiện hành, không kế thừa giá cũ (isCustomPrice = false).
 * 3. AC3: Bản sao luôn bắt đầu ở trạng thái Nháp (DRAFT), chưa có mã đơn chính thức.
 */
export async function cloneOrderToDraft(orderId: number | string): Promise<{
  draft: OrderDraft;
  sourceCode: string;
  itemCount: number;
}> {
  // 1. Tải chi tiết đơn gốc
  const source = await fetchOrderDetail(orderId);
  const customerId = source.customerId;
  if (!customerId) {
    throw new Error('Đơn hàng không có thông tin đại lý');
  }

  // 2. Gọi API Backend POST /api/orders/{id}/copy (S4-09 / SCRUM-159 do BE xử lý)
  try {
    const copyRes = await callBackend(`${API_BASE_URL}/api/orders/${orderId}/copy`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (copyRes.ok) {
      const copiedOrder: OrderBackendResponse = await copyRes.json();
      const draft = await fetchBackendDraftById(Number(copiedOrder.id));
      setActiveDraft(draft);

      const sourceCode = source.code || `DH-${orderId}`;
      try {
        sessionStorage.setItem(
          'erp_order_clone_notice',
          JSON.stringify({
            sourceCode,
            sourceId: orderId,
            itemCount: draft.items.length,
            timestamp: Date.now()
          })
        );
      } catch (e) {
        console.warn('Không lưu được clone notice vào sessionStorage:', e);
      }

      return {
        draft,
        sourceCode,
        itemCount: draft.items.length
      };
    }
  } catch (backendErr) {
    console.warn('Backend copy API chưa sẵn sàng hoặc gặp lỗi, dùng phương thức fallback client-side:', backendErr);
  }

  // 3. Fallback: Tải danh mục sản phẩm của đại lý theo bảng giá hiện hành
  let catalog: OrderProductCatalogItem[] = [];
  try {
    catalog = await fetchBackendProductOptions(customerId);
  } catch (err) {
    console.warn('Không tải được catalog theo bảng giá đại lý:', err);
  }

  // 4. Sao chép các dòng hàng, áp lại giá theo bảng giá hiện hành (AC1 & AC2)
  const lines = source.lines || [];
  const clonedItems: OrderItem[] = lines.map((line, idx) => {
    const catItem = catalog.find((c) => c.sku === line.productSku);
    const factor = Number(line.conversionFactor || 1);
    const qty = Number(line.quantity || 1);

    // Xây dựng availableUnits chuẩn
    let availableUnits: OrderItemUnitOption[];
    let currentUnitPrice: number;
    let originalUnitPrice: number;
    let floorPrice: number | undefined;

    if (catItem && catItem.availableUnits && catItem.availableUnits.length > 0) {
      availableUnits = buildItemUnitOptions(catItem);
      const matchedUnit =
        availableUnits.find((u) => u.unitName.trim().toLowerCase() === line.unitName.trim().toLowerCase()) ||
        availableUnits[0];
      currentUnitPrice = matchedUnit.unitPrice;
      originalUnitPrice = matchedUnit.unitPrice;
      floorPrice = matchedUnit.floorPrice;
    } else {
      currentUnitPrice = Number(line.pricePerUnit || 0);
      originalUnitPrice = currentUnitPrice;
      availableUnits = [
        {
          unitName: line.unitName,
          conversionFactor: factor,
          isBaseUnit: line.unitName === line.baseUnit,
          unitPrice: currentUnitPrice
        }
      ];
    }

    const rawAmount = qty * currentUnitPrice;

    const stockInfo = catItem
      ? {
          physicalStock: catItem.physicalStock ?? 100,
          reservedStock: catItem.reservedStock ?? 0,
          availableStock: catItem.availableStock ?? 100
        }
      : getStockInfoForProduct(line.productSku);

    const availableInSelectedUnit = Math.floor(stockInfo.availableStock / (factor || 1));

    const item: OrderItem = {
      id: `clone-item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      productId: line.productId || (catItem ? catItem.id : idx + 1),
      sku: line.productSku,
      name: line.productName,
      category: catItem?.category || '',
      baseUnit: line.baseUnit,
      selectedUnit: line.unitName,
      conversionFactor: factor,
      quantity: qty,
      baseQuantity: qty * factor,
      unitPrice: currentUnitPrice,
      originalUnitPrice,
      floorPrice,
      isCustomPrice: false, // AC2: Bỏ giá cũ, áp giá hiện hành
      isBelowFloor: false,
      warehouseCode: catItem?.warehouseCode || 'WH-MB01',
      warehouseName: catItem?.warehouseName || 'Kho Tổng Miền Bắc',
      physicalStock: stockInfo.physicalStock,
      reservedStock: stockInfo.reservedStock,
      availableStock: stockInfo.availableStock,
      availableInSelectedUnit,
      isOverStock: qty > availableInSelectedUnit,
      maxAllowedQuantity: Math.max(0, availableInSelectedUnit),
      rawAmount,
      discountPercent: 0,
      discountAmount: 0,
      finalAmount: rawAmount,
      availableUnits
    };

    return recalculateOrderItem(item, qty, line.unitName);
  });

  // 4. Ngày giao dự kiến mới (ngày mai)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const grpId: CustomerGroupId =
    source.customerGroup === 'DEALER_LEVEL_1'
      ? 'TIER_1'
      : source.customerGroup === 'DEALER_LEVEL_2'
      ? 'TIER_2'
      : 'RETAIL_SHOWROOM';

  // 5. Tạo đơn nháp mới (AC3: Trạng thái DRAFT, không có orderNumber cũ)
  const clonedDraft: OrderDraft = {
    id: `DRAFT-${Date.now()}`,
    backendDraftId: undefined,
    orderNumber: undefined,
    status: 'DRAFT',
    agencyId: String(source.customerId),
    agencyCode: source.customerCode,
    agencyName: source.customerName,
    customerGroup: grpId,
    customerGroupName: source.customerGroupLabel || 'Đại lý',
    pricingTierCode: source.lines?.[0]?.priceListCode || 'BG-STANDARD',
    pricingTierName: source.lines?.[0]?.priceListCode || 'Bảng giá hiện hành',
    deliveryPointId: source.deliveryAddress ? String(source.deliveryAddress.id) : '',
    deliveryPointName: source.deliveryAddress?.label || 'Kho đại lý',
    deliveryAddress: source.deliveryAddress?.address || '',
    expectedDeliveryDate: tomorrowStr,
    note: source.note
      ? `${source.note} (Sao chép từ đơn ${source.code || orderId})`
      : `Sao chép từ đơn ${source.code || orderId}`,
    items: clonedItems,
    totalItemsCount: clonedItems.length,
    totalQuantity: clonedItems.reduce((s, i) => s + i.quantity, 0),
    subtotalAmount: clonedItems.reduce((s, i) => s + i.rawAmount, 0),
    discountAmount: 0,
    totalPayable: clonedItems.reduce((s, i) => s + i.rawAmount, 0),
    salesRepId: '',
    salesRepName: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 6. Lưu vào active draft
  setActiveDraft(clonedDraft);

  // 7. Ghi nhận cờ thông báo sao chép vào sessionStorage
  const sourceCode = source.code || `DH-${orderId}`;
  try {
    sessionStorage.setItem(
      'erp_order_clone_notice',
      JSON.stringify({
        sourceCode,
        sourceId: orderId,
        itemCount: clonedItems.length,
        timestamp: Date.now()
      })
    );
  } catch (err) {
    console.warn('Không lưu được clone notice vào sessionStorage:', err);
  }

  return {
    draft: clonedDraft,
    sourceCode,
    itemCount: clonedItems.length
  };
}

// ======================== S4-04: XEM LỊCH SỬ MUA HÀNG ĐẠI LÝ & GỢI Ý ĐẶT HÀNG ========================

/**
 * S4-04 AC3: Kiểm tra quyền xem lịch sử mua hàng của đại lý.
 * - Quản trị viên (ROLE_ADMIN), Quản lý kinh doanh (ROLE_SALES_MANAGER), Kế toán (ROLE_ACCOUNTANT): Xem được mọi đại lý.
 * - Server mới là nơi chặn thật (GET /api/customers/{id}/purchase-history), ở đây chỉ để ẩn / hiện thẻ.
 * - Nhân viên kinh doanh (ROLE_SALES_REP): Chỉ được xem lịch sử của đại lý mình được phân công phụ trách.
 */
export function canViewCustomerPurchaseHistory(
  user: UserProfile | null,
  agency: Agency | null
): { allowed: boolean; reason?: string } {
  if (!user || !agency) {
    return { allowed: false, reason: 'Chưa có thông tin đại lý hoặc người dùng' };
  }

  // Quản trị viên, Quản lý kinh doanh, Kế toán: Xem toàn bộ
  const userRoles: string[] = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const hasFullAccess = userRoles.some(
    (r) => r === 'ROLE_ADMIN' || r === 'ROLE_SALES_MANAGER' || r === 'ROLE_ACCOUNTANT'
  );
  if (hasFullAccess) {
    return { allowed: true };
  }

  // Nếu là Nhân viên kinh doanh: Kiểm tra phân công đại lý
  const userIdStr = String(user.id || '').trim();
  const usernameStr = (user.username || '').trim().toLowerCase();
  const userFullName = (user.fullName || '').trim().toLowerCase();

  const assignedRepIdStr = String(agency.assignedRepId || '').trim();
  const assignedRepName = (agency.assignedRepName || '').trim().toLowerCase();

  // Khớp theo ID, Username hoặc Họ tên
  const isAssigned =
    (Boolean(userIdStr) && Boolean(assignedRepIdStr) && (userIdStr === assignedRepIdStr || assignedRepIdStr.includes(userIdStr))) ||
    (Boolean(usernameStr) && (assignedRepName.includes(usernameStr) || assignedRepIdStr.toLowerCase().includes(usernameStr))) ||
    (Boolean(userFullName) && (assignedRepName === userFullName || userFullName.includes(assignedRepName) || assignedRepName.includes(userFullName)));

  if (isAssigned) {
    return { allowed: true };
  }

  const repDisplay = agency.assignedRepName || 'chưa phân công';
  return {
    allowed: false,
    reason: `Bạn không được phân công phụ trách đại lý này (Người phụ trách: ${repDisplay}). Theo quy định bảo mật kinh doanh (S4-04), bạn chỉ có thể xem lịch sử mua hàng của các đại lý trong địa bàn được phân công.`
  };
}

/** Dữ liệu thô từ Backend GET /api/customers/{id}/purchase-history (số tiền / số lượng là số JSON). */
interface PurchaseHistoryBackendResponse {
  customerId: number;
  customerCode: string;
  customerName: string;
  assignedRepId?: number | null;
  assignedRepName?: string | null;
  months: number;
  threeMonthsSummary: {
    totalOrders: number;
    totalRevenue: number;
    distinctProductCount: number;
    startDate: string;
    endDate: string;
  };
  frequentProducts: Array<{
    productId: number;
    sku: string;
    name: string;
    category?: string | null;
    baseUnit: string;
    preferredUnit: string;
    preferredConversionFactor: number;
    totalQuantity3M: number;
    orderCount3M: number;
    avgQuantityPerMonth: number;
    avgQuantityPerOrder: number;
    lastOrderedDate?: string | null;
    lastUnitPrice?: number | null;
    currentUnitPrice?: number | null;
    availableStock?: number | null;
    availableInPreferredUnit?: number | null;
  }>;
  lastOrder: {
    orderId: number;
    orderCode: string;
    orderDate?: string | null;
    itemCount: number;
    totalQuantity: number;
    totalAmount: number;
    items: Array<{
      productId?: number | null;
      sku: string;
      name: string;
      unitName: string;
      conversionFactor?: number | null;
      quantity: number;
      unitPrice?: number | null;
    }>;
  } | null;
}

/**
 * S4-04: Tải lịch sử mua hàng 3 tháng của đại lý từ Backend (GET /api/customers/{id}/purchase-history).
 * Server tự kiểm quyền: NV kinh doanh chỉ xem được đại lý mình phụ trách (khác -> lỗi "không tìm thấy").
 * Không còn dữ liệu giả: lỗi thì ném Error để giao diện báo lỗi.
 */
export async function fetchCustomerPurchaseHistory(agency: Agency, months = 3): Promise<CustomerPurchaseHistoryData> {
  if (!/^\d+$/.test(String(agency.id))) {
    throw new Error('Đại lý chưa được lưu trên hệ thống nên chưa có lịch sử mua hàng.');
  }
  const res = await callBackend(`${API_BASE_URL}/api/customers/${agency.id}/purchase-history?months=${months}`);
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không tải được lịch sử mua hàng của đại lý.'));
  }
  const data = (await res.json()) as PurchaseHistoryBackendResponse;
  const num = (v: number | null | undefined) => (v == null ? 0 : Number(v));
  const opt = (v: number | null | undefined) => (v == null ? undefined : Number(v));

  return {
    customerId: String(data.customerId),
    customerCode: data.customerCode,
    customerName: data.customerName,
    assignedRepId: data.assignedRepId != null ? String(data.assignedRepId) : undefined,
    assignedRepName: data.assignedRepName ?? undefined,
    threeMonthsSummary: {
      totalOrders: num(data.threeMonthsSummary?.totalOrders),
      totalRevenue: num(data.threeMonthsSummary?.totalRevenue),
      distinctProductCount: num(data.threeMonthsSummary?.distinctProductCount),
      startDate: data.threeMonthsSummary?.startDate ?? '',
      endDate: data.threeMonthsSummary?.endDate ?? ''
    },
    frequentProducts: (data.frequentProducts || []).map((p) => ({
      productId: p.productId,
      sku: p.sku,
      name: p.name,
      category: p.category ?? undefined,
      baseUnit: p.baseUnit,
      preferredUnit: p.preferredUnit,
      preferredConversionFactor: num(p.preferredConversionFactor) || 1,
      totalQuantity3M: num(p.totalQuantity3M),
      orderCount3M: num(p.orderCount3M),
      avgQuantityPerMonth: num(p.avgQuantityPerMonth),
      avgQuantityPerOrder: num(p.avgQuantityPerOrder),
      lastOrderedDate: p.lastOrderedDate ?? '',
      lastUnitPrice: num(p.lastUnitPrice ?? p.currentUnitPrice),
      currentUnitPrice: opt(p.currentUnitPrice),
      availableStock: opt(p.availableStock),
      availableInPreferredUnit: opt(p.availableInPreferredUnit)
    })),
    lastOrder: data.lastOrder
      ? {
          orderId: data.lastOrder.orderId,
          orderCode: data.lastOrder.orderCode,
          orderDate: data.lastOrder.orderDate ?? '',
          itemCount: num(data.lastOrder.itemCount),
          totalQuantity: num(data.lastOrder.totalQuantity),
          totalAmount: num(data.lastOrder.totalAmount),
          items: (data.lastOrder.items || []).map((i) => ({
            productId: i.productId ?? i.sku,
            sku: i.sku,
            name: i.name,
            unitName: i.unitName,
            conversionFactor: num(i.conversionFactor) || 1,
            quantity: num(i.quantity),
            unitPrice: num(i.unitPrice)
          }))
        }
      : null
  };
}

/**
 * S4-04: Tạo hoặc chuyển đổi nhanh một sản phẩm từ lịch sử mua hàng thành dòng hàng đặt (OrderItem)
 */
export function createOrderItemFromHistory(
  historyItem: CustomerPurchaseHistoryItem,
  catalogItem?: OrderProductCatalogItem,
  customQuantity?: number,
  warehouse?: { code: string; name: string }
): OrderItem {
  if (catalogItem) {
    const qty = customQuantity ?? Math.max(1, Math.round(historyItem.avgQuantityPerOrder) || 1);
    const item = createOrderItemFromCatalog(catalogItem, qty, warehouse);
    return recalculateOrderItem(item, qty, historyItem.preferredUnit);
  }

  // Trường hợp không có trong catalog, tự tạo dòng hàng hoàn chỉnh
  const factor = historyItem.preferredConversionFactor || 1;
  const stock = historyItem.availableStock ?? 200;
  const qty = customQuantity ?? Math.max(1, Math.round(historyItem.avgQuantityPerOrder) || 1);
  const unitPrice = historyItem.currentUnitPrice || historyItem.lastUnitPrice;
  const floorPrice = Math.round(unitPrice * 0.9);

  const availableUnits: OrderItemUnitOption[] = [
    {
      unitName: historyItem.baseUnit,
      conversionFactor: 1,
      isBaseUnit: true,
      unitPrice: Math.round(unitPrice / factor),
      floorPrice: Math.round(floorPrice / factor),
      availableStock: stock
    }
  ];

  if (historyItem.preferredUnit !== historyItem.baseUnit) {
    availableUnits.unshift({
      unitName: historyItem.preferredUnit,
      conversionFactor: factor,
      isBaseUnit: false,
      unitPrice: unitPrice,
      floorPrice: floorPrice,
      availableStock: Math.floor(stock / factor)
    });
  }

  const initialItem: OrderItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId: historyItem.productId,
    sku: historyItem.sku,
    name: historyItem.name,
    category: historyItem.category,
    baseUnit: historyItem.baseUnit,
    selectedUnit: historyItem.preferredUnit,
    conversionFactor: factor,
    quantity: qty,
    baseQuantity: qty * factor,
    unitPrice: unitPrice,
    originalUnitPrice: unitPrice,
    floorPrice: floorPrice,
    isCustomPrice: false,
    isBelowFloor: false,
    warehouseCode: warehouse?.code || 'WH-MB01',
    warehouseName: warehouse?.name || 'Kho Tổng Miền Bắc',
    physicalStock: stock + 20,
    reservedStock: 20,
    availableStock: stock,
    rawAmount: qty * unitPrice,
    discountPercent: 0,
    discountAmount: 0,
    finalAmount: qty * unitPrice,
    availableUnits
  };

  return recalculateOrderItem(initialItem, qty, historyItem.preferredUnit);
}
