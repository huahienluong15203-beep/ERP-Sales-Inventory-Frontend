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
  priceAvailable?: boolean;
  priceMessage?: string | null;
  priceListCode?: string | null;
  availableUnits: {
    unitName: string;
    conversionFactor: number;
    isBaseUnit: boolean;
  }[];
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
 * Không tự nhân thêm chiết khấu nhóm khách hàng ở trình duyệt (bảng giá của nhóm đã là giá cuối).
 */
export function buildItemUnitOptions(product: OrderProductCatalogItem): OrderItemUnitOption[] {
  const units = product.availableUnits.length
    ? product.availableUnits
    : [{ unitName: product.baseUnit, conversionFactor: 1, isBaseUnit: true }];
  return units.map((u) => ({
    unitName: u.unitName,
    conversionFactor: u.conversionFactor,
    isBaseUnit: u.isBaseUnit,
    unitPrice: Math.round(product.basePrice * u.conversionFactor)
  }));
}

/**
 * Tính lại dòng hàng khi đổi số lượng / ĐVT (chỉ là TẠM TÍNH theo đơn giá đang có).
 * Chiết khấu sản lượng và thành tiền chính thức do Backend tính (/api/orders/preview) rồi ghi đè lên dòng.
 */
export function recalculateOrderItem(item: OrderItem, newQuantity?: number, newUnitName?: string): OrderItem {
  const quantity = newQuantity !== undefined ? Math.max(1, newQuantity) : item.quantity;
  let selectedUnit = item.selectedUnit;
  let conversionFactor = item.conversionFactor;
  let unitPrice = item.unitPrice;

  if (newUnitName && newUnitName !== item.selectedUnit) {
    const matchedUnit = item.availableUnits.find((u) => u.unitName === newUnitName);
    if (matchedUnit) {
      selectedUnit = matchedUnit.unitName;
      conversionFactor = matchedUnit.conversionFactor;
      unitPrice = matchedUnit.unitPrice;
    }
  }

  const rawAmount = quantity * unitPrice;
  return {
    ...item,
    quantity,
    selectedUnit,
    conversionFactor,
    unitPrice,
    baseQuantity: quantity * conversionFactor,
    rawAmount,
    discountPercent: 0,
    discountAmount: 0,
    finalAmount: rawAmount,
    appliedDiscountNote: undefined
  };
}

/**
 * Ghi đè đơn giá, chiết khấu, thành tiền của các dòng bằng kết quả Backend tính (preview / đơn nháp đã lưu).
 */
export function applyBackendLines(items: OrderItem[], order: OrderBackendResponse): OrderItem[] {
  return items.map((item) => {
    const line = (order.lines || []).find((l) => l.productSku === item.sku);
    if (!line) return item;
    const basePrice = Number(line.unitPrice);
    const gross = Number(line.grossAmount);
    const discount = Number(line.discountAmount);
    return {
      ...item,
      selectedUnit: line.unitName,
      conversionFactor: Number(line.conversionFactor || 1),
      baseQuantity: Number(line.baseQuantity),
      unitPrice: Number(line.pricePerUnit),
      rawAmount: gross,
      discountAmount: discount,
      discountPercent: gross > 0 ? Math.round((discount / gross) * 1000) / 10 : 0,
      finalAmount: Number(line.netAmount),
      appliedDiscountNote: line.discountPolicyCode ? `Chiết khấu sản lượng ${line.discountPolicyCode}` : undefined,
      availableUnits: item.availableUnits.map((u) => ({ ...u, unitPrice: Math.round(basePrice * u.conversionFactor) }))
    };
  });
}

/**
 * Tạo mới 1 dòng hàng từ sản phẩm đã chọn (giá theo bảng giá Backend)
 */
export function createOrderItemFromCatalog(product: OrderProductCatalogItem, initialQuantity = 1): OrderItem {
  const availableUnits = buildItemUnitOptions(product);
  const defaultUnit = availableUnits.find((u) => u.isBaseUnit) || availableUnits[0];

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
      quantity: it.quantity
    }))
  };
}

/**
 * 1. Gợi ý sản phẩm theo mã / tên (gõ ≥ 2 ký tự) kèm giá theo nhóm khách hàng của đại lý (S3-09)
 * Lỗi -> ném Error với thông báo của Backend (KHÔNG dùng danh mục mẫu thay thế).
 */
export async function fetchBackendProductOptions(
  customerId: string | number,
  keyword: string
): Promise<OrderProductCatalogItem[]> {
  const kw = keyword.trim();
  if (!customerId || !/^\d+$/.test(String(customerId)) || kw.length < 2) return [];

  const url = `${API_BASE_URL}/api/orders/product-options?customerId=${customerId}&keyword=${encodeURIComponent(kw)}`;
  const res = await callBackend(url);
  if (!res.ok) throw new Error(await readBackendError(res, 'Không tải được danh sách sản phẩm'));
  const data: ProductOptionBackendResponse[] = await res.json();
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: String(item.productId),
    sku: item.sku,
    name: item.name,
    category: '',
    baseUnit: item.baseUnit,
    basePrice: Number(item.unitPrice || 0),
    priceAvailable: item.priceAvailable,
    priceMessage: item.message,
    priceListCode: item.priceListCode,
    availableUnits: (item.units || []).map((u) => ({
      unitName: u.unitName,
      conversionFactor: Number(u.conversionFactor),
      isBaseUnit: u.unitName.trim().toLowerCase() === item.baseUnit.trim().toLowerCase()
    }))
  }));
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
