/**
 * S4-10 / S5-02: API cổng đại lý (B2B Customer Portal) – chỉ dành cho tài khoản vai trò Đại lý (ROLE_CUSTOMER).
 * Đại lý luôn được Backend xác định từ tài khoản đăng nhập, Frontend KHÔNG gửi customerId.
 * Giá luôn do Backend tính theo bảng giá nhóm khách hiện hành, Frontend chỉ gửi SKU / ĐVT / số lượng.
 */
import { authFetch, API_BASE_URL } from './api';
import type { Agency, CreditStatusResponse, CustomerGroupId, DeliveryPoint } from '../types/agency';
import type { OrderProductCatalogItem } from './orderService';

const PORTAL_URL = `${API_BASE_URL}/api/portal`;

async function readPortalError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.details && typeof data.details === 'object') {
    const first = Object.values(data.details as Record<string, string>)[0];
    if (first) return String(first);
  }
  return data?.message || fallback;
}

async function portalFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await authFetch(`${PORTAL_URL}${path}`, init);
  } catch (err) {
    if (err instanceof Error && err.message) throw err;
    throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại!');
  }
}

async function portalJson<T>(path: string, fallbackError: string, init?: RequestInit): Promise<T> {
  const res = await portalFetch(path, init);
  if (!res.ok) throw new Error(await readPortalError(res, fallbackError));
  return res.json();
}

// ===================== KIỂU DỮ LIỆU BACKEND =====================

interface PortalMeBackend {
  customerId: number;
  customerCode: string;
  customerName: string;
  customerGroup?: string | null;
  customerGroupLabel?: string | null;
  salesRepName?: string | null;
  regionName?: string | null;
  phone?: string | null;
  address?: string | null;
  transactionLocked: boolean;
  status?: string | null;
}

interface PortalProductBackend {
  productId: number;
  sku: string;
  name: string;
  baseUnit: string;
  units?: { unitName: string; conversionFactor: number | string }[];
  priceAvailable: boolean;
  unitPrice?: number | string | null;
  message?: string | null;
  availableStock?: number | string | null;
}

interface PortalDeliveryAddressBackend {
  id: number;
  customerId?: number;
  label?: string | null;
  address?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  note?: string | null;
  isDefault?: boolean;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PortalOrderLine {
  lineNo?: number;
  productId?: number;
  productSku: string;
  productName: string;
  unitName: string;
  conversionFactor?: number;
  quantity: number;
  pricePerUnit: number;
  grossAmount?: number;
  discountAmount?: number;
  netAmount: number;
  availableStock?: number | null;
  isOverStock?: boolean | null;
}

export interface PortalOrderResult {
  id: number | null;
  code: string | null;
  status: string | null;
  statusLabel: string | null;
  note?: string | null;
  lines: PortalOrderLine[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  warnings: string[];
  credit?: CreditStatusResponse | null;
}

/** Một dòng hàng gửi lên khi đặt đơn: chỉ SKU, ĐVT và số lượng (giá do Backend tính). */
export interface PortalOrderLineInput {
  productSku: string;
  unitName: string;
  quantity: number;
}

export interface PortalOrderInput {
  deliveryAddressId?: number | null;
  desiredDeliveryDate?: string | null;
  note?: string | null;
  lines: PortalOrderLineInput[];
}

export interface PortalRemovedLine {
  productSku: string;
  productName: string;
  unitName: string;
  quantity: number;
  reason: string;
}

export interface PortalReorderPreview {
  sourceOrderId: number;
  sourceOrderCode: string;
  keptLines: PortalOrderLineInput[];
  removedLines: PortalRemovedLine[];
  preview: PortalOrderResult | null;
}

// ===================== CHUYỂN ĐỔI =====================

const KNOWN_GROUPS: CustomerGroupId[] = ['TIER_1', 'TIER_2', 'RETAIL_SHOWROOM'];

function toNumber(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function shortDate(value?: string | null): string {
  return value ? value.replace('T', ' ').substring(0, 19) : '';
}

function mapMe(me: PortalMeBackend): Agency {
  const group = (KNOWN_GROUPS as string[]).includes(me.customerGroup || '')
    ? (me.customerGroup as CustomerGroupId)
    : 'TIER_1';
  const groupName = me.customerGroupLabel || 'Đại lý';
  return {
    id: String(me.customerId),
    code: me.customerCode,
    name: me.customerName,
    taxCode: '',
    customerGroup: group,
    customerGroupName: groupName,
    pricingTier: { id: group, code: group, name: groupName, badgeBg: '', badgeColor: '' },
    priceList: null,
    regionId: '',
    regionName: me.regionName || '',
    assignedRepId: '',
    assignedRepName: me.salesRepName || '',
    phone: me.phone || '',
    email: '',
    address: me.address || '',
    status: me.status === 'SUSPENDED' || me.status === 'INACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    hasTransactions: false,
    transactionCount: 0,
    totalDebt: 0,
    creditLimit: 0,
    createdAt: '',
    updatedAt: '',
    transactionLocked: me.transactionLocked
  };
}

function mapProduct(p: PortalProductBackend): OrderProductCatalogItem {
  const stock = p.availableStock == null ? undefined : toNumber(p.availableStock);
  return {
    id: String(p.productId),
    sku: p.sku,
    name: p.name,
    category: '',
    baseUnit: p.baseUnit,
    basePrice: toNumber(p.unitPrice),
    priceAvailable: p.priceAvailable,
    priceMessage: p.message,
    availableStock: stock,
    availableUnits: (p.units || []).map((u) => ({
      unitName: u.unitName,
      conversionFactor: toNumber(u.conversionFactor) || 1,
      isBaseUnit: u.unitName.trim().toLowerCase() === p.baseUnit.trim().toLowerCase()
    }))
  };
}

function mapDeliveryPoint(a: PortalDeliveryAddressBackend): DeliveryPoint {
  return {
    id: String(a.id),
    agencyId: String(a.customerId ?? ''),
    name: a.label || 'Kho nhận hàng',
    address: a.address || '',
    contactPerson: a.receiverName || '',
    phone: a.receiverPhone || '',
    routeNotes: a.note || '',
    isDefault: Boolean(a.isDefault),
    createdAt: shortDate(a.createdAt),
    updatedAt: shortDate(a.updatedAt || a.createdAt)
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(o: any): PortalOrderResult {
  return {
    id: o?.id ?? null,
    code: o?.code ?? null,
    status: o?.status ?? null,
    statusLabel: o?.statusLabel ?? null,
    note: o?.note ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines: (Array.isArray(o?.lines) ? o.lines : []).map((l: any) => ({
      lineNo: l.lineNo,
      productId: l.productId,
      productSku: l.productSku,
      productName: l.productName,
      unitName: l.unitName,
      conversionFactor: toNumber(l.conversionFactor) || 1,
      quantity: toNumber(l.quantity),
      pricePerUnit: toNumber(l.pricePerUnit),
      grossAmount: toNumber(l.grossAmount),
      discountAmount: toNumber(l.discountAmount),
      netAmount: toNumber(l.netAmount),
      availableStock: l.availableStock == null ? null : toNumber(l.availableStock),
      isOverStock: l.isOverStock ?? null
    })),
    subtotal: toNumber(o?.subtotal),
    discountTotal: toNumber(o?.discountTotal),
    totalAmount: toNumber(o?.totalAmount),
    warnings: Array.isArray(o?.warnings) ? o.warnings : [],
    credit: o?.credit ?? null
  };
}

// ===================== API =====================

/** Đại lý gắn với tài khoản đang đăng nhập (chưa gắn -> lỗi 409 kèm thông báo liên hệ quản trị viên). */
export async function fetchPortalMe(): Promise<Agency> {
  return mapMe(await portalJson<PortalMeBackend>('/me', 'Không tải được thông tin đại lý'));
}

/** Sản phẩm và giá (ĐVT cơ sở) theo bảng giá nhóm khách hiện hành của đại lý. */
export async function fetchPortalProducts(keyword: string = ''): Promise<OrderProductCatalogItem[]> {
  const kw = keyword.trim();
  const data = await portalJson<PortalProductBackend[]>(
    kw ? `/products?keyword=${encodeURIComponent(kw)}` : '/products',
    'Không tải được danh sách sản phẩm'
  );
  return (Array.isArray(data) ? data : []).map(mapProduct);
}

/** Công nợ, hạn mức, còn lại; orderAmount = tổng giỏ hàng để biết có vượt hạn mức không. */
export async function fetchPortalCreditStatus(orderAmount: number = 0): Promise<CreditStatusResponse> {
  return portalJson<CreditStatusResponse>(
    orderAmount > 0 ? `/credit-status?orderAmount=${orderAmount}` : '/credit-status',
    'Không tải được tình trạng công nợ'
  );
}

/** Điểm giao hàng đang hoạt động của đại lý, điểm mặc định lên đầu. */
export async function fetchPortalDeliveryPoints(): Promise<DeliveryPoint[]> {
  const data = await portalJson<PortalDeliveryAddressBackend[]>(
    '/delivery-addresses',
    'Không tải được danh sách điểm giao hàng'
  );
  return (Array.isArray(data) ? data : [])
    .filter((a) => !a.status || a.status === 'ACTIVE')
    .map(mapDeliveryPoint)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** Gửi đơn: Backend tính giá và luôn đưa đơn về trạng thái Chờ duyệt để nhân viên phụ trách xác nhận. */
export async function placePortalOrder(input: PortalOrderInput): Promise<PortalOrderResult> {
  const data = await portalJson<unknown>('/orders', 'Không gửi được đơn hàng', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return mapOrder(data);
}

/**
 * S5-02: Xem trước đặt lại đơn cũ. Bỏ trống lineIds = lấy toàn bộ đơn.
 * Hàng ngừng kinh doanh / không còn giá bị loại kèm lý do; giá áp lại theo bảng giá hiện hành.
 */
export async function previewPortalReorder(orderId: number | string, lineIds: number[] = []): Promise<PortalReorderPreview> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await portalJson<any>(`/orders/${orderId}/reorder-preview`, 'Không lấy lại được đơn cũ', {
    method: 'POST',
    body: JSON.stringify({ lineIds })
  });
  return {
    sourceOrderId: data?.sourceOrderId,
    sourceOrderCode: data?.sourceOrderCode,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keptLines: (Array.isArray(data?.keptLines) ? data.keptLines : []).map((l: any) => ({
      productSku: l.productSku,
      unitName: l.unitName,
      quantity: toNumber(l.quantity)
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removedLines: (Array.isArray(data?.removedLines) ? data.removedLines : []).map((l: any) => ({
      productSku: l.productSku,
      productName: l.productName,
      unitName: l.unitName,
      quantity: toNumber(l.quantity),
      reason: l.reason
    })),
    preview: data?.preview ? mapOrder(data.preview) : null
  };
}
