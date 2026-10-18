/**
 * S4-10 / S5-02: API cổng đại lý (B2B Customer Portal) – chỉ dành cho tài khoản vai trò Đại lý (ROLE_CUSTOMER).
 * Đại lý luôn được Backend xác định từ tài khoản đăng nhập, Frontend KHÔNG gửi customerId.
 * Giá luôn do Backend tính theo bảng giá nhóm khách hiện hành, Frontend chỉ gửi SKU / ĐVT / số lượng.
 */
import { authFetch, API_BASE_URL } from './api';
import type { Agency, CreditStatusResponse, CustomerGroupId, DeliveryPoint } from '../types/agency';
import type { OrderProductCatalogItem } from './orderService';
import type { OrderPageResponse } from '../types/order';

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

/** Xem trước giỏ hàng: Backend tính giá, chiết khấu sản lượng (Volume Discount) và công nợ (không lưu đơn). */
export async function previewPortalOrder(input: PortalOrderInput): Promise<PortalOrderResult> {
  const data = await portalJson<unknown>('/orders/preview', 'Không tính toán được giỏ hàng', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return mapOrder(data);
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

export interface PortalOrderFilterCriteria {
  status?: string;
  statuses?: string[];
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

/**
 * Tải lịch sử đơn của đại lý có bộ lọc và phân trang từ Backend GET /api/portal/orders
 * Lọc phía server để tối ưu tốc độ tải và băng thông mạng.
 */
export async function fetchPortalOrders(criteria: PortalOrderFilterCriteria = {}): Promise<OrderPageResponse> {
  const query = new URLSearchParams();
  if (criteria.statuses && criteria.statuses.length > 0) {
    query.set('status', criteria.statuses.join(','));
  } else if (criteria.status && criteria.status !== 'ALL') {
    query.set('status', criteria.status);
  }
  if (criteria.fromDate) query.set('fromDate', criteria.fromDate);
  if (criteria.toDate) query.set('toDate', criteria.toDate);
  if (criteria.keyword && criteria.keyword.trim()) query.set('keyword', criteria.keyword.trim());
  query.set('page', String(criteria.page ?? 0));
  query.set('size', String(criteria.size ?? 10));

  return portalJson<OrderPageResponse>(`/orders?${query.toString()}`, 'Không tải được lịch sử đơn hàng của đại lý');
}

export interface PortalTimelineStepDetail {
  statusKey: string;
  label: string;
  subLabel?: string;
  completed: boolean;
  current: boolean;
  time?: string | null;
  actor?: string | null;
  note?: string | null;
}

export interface PortalDeliveryTripInfo {
  tripId?: number;
  tripCode?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  stopSequence?: number;
  status?: string;
  departedAt?: string;
  expectedReturnAt?: string;
}

export interface PortalDeliveryLineItem {
  lineId?: number;
  lineNo?: number;
  productId?: number;
  productSku?: string;
  productName?: string;
  unitName?: string;
  conversionFactor?: number;
  orderedQuantity?: number;
  dispatchedQuantity?: number;
  deliveredQuantity?: number;
  shortageQuantity?: number;
  isShortage: boolean;
  shortageReason?: string;
}

export interface PortalDeliveryTimelineResponse {
  orderId: number;
  orderCode: string;
  status: string;
  statusLabel?: string;
  currentStep: number;
  customerId?: number;
  customerCode?: string;
  customerName?: string;
  deliveryAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  warehouseCode?: string;
  warehouseName?: string;
  hasShortage: boolean;
  shortageLineCount: number;
  totalAmount?: number;
  steps: {
    approved: PortalTimelineStepDetail;
    picking: PortalTimelineStepDetail;
    dispatched: PortalTimelineStepDetail;
    shipping: PortalTimelineStepDetail;
    delivered: PortalTimelineStepDetail;
  };
  tripInfo?: PortalDeliveryTripInfo | null;
  lines: PortalDeliveryLineItem[];
}

/**
 * S6-09: Tải dữ liệu mốc thời gian và chi tiết số lượng thực giao cho đại lý
 * GET /api/portal/orders/{id}/delivery-timeline
 */
export async function fetchPortalDeliveryTimeline(orderId: number | string): Promise<PortalDeliveryTimelineResponse> {
  return portalJson<PortalDeliveryTimelineResponse>(
    `/orders/${orderId}/delivery-timeline`,
    'Không tải được tiến độ giao hàng của đơn'
  );
}

// ===================== CÔNG NỢ & HOÁ ĐƠN ĐẠI LÝ (PORTAL DEBT) =====================

export interface PortalDebtSummary {
  customerId: number;
  customerCode: string;
  customerName: string;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  invoicedDebt: number;
  uninvoicedDebt: number;
  maxDebtDays: number | null;
  openInvoiceCount: number;
  overdue: boolean;
  overdueCount: number;
  overdueAmount: number;
  overdueDays: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  message?: string | null;
}

export interface PortalInvoiceDebtItem {
  id: number;
  code: string;
  invoiceDate: string;
  dueDate: string;
  orderCodes: string[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  overdue: boolean;
  isOverdue: boolean;
  overdueDays: number;
}

export interface PortalInvoiceDebtPageResponse {
  content: PortalInvoiceDebtItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PortalDebtInvoicesParams {
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

/**
 * S7-07: Tóm tắt công nợ & hạn mức của chính đại lý
 * GET /api/portal/debt
 */
export async function fetchPortalDebtSummary(): Promise<PortalDebtSummary> {
  return portalJson<PortalDebtSummary>('/debt', 'Không tải được tóm tắt công nợ đại lý');
}

/**
 * S7-07: Danh sách hoá đơn công nợ của đại lý kèm tìm kiếm và phân trang (lọc cả FE & BE)
 * GET /api/portal/debt/invoices
 */
export async function fetchPortalDebtInvoices(
  params: PortalDebtInvoicesParams = {}
): Promise<PortalInvoiceDebtPageResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'ALL') query.set('status', params.status);
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.size !== undefined) query.set('size', String(params.size));

  const qs = query.toString();
  const raw = await portalJson<any>(`/debt/invoices${qs ? `?${qs}` : ''}`, 'Không tải được danh sách hoá đơn công nợ');

  const content: PortalInvoiceDebtItem[] = (raw.content || []).map((inv: any) => ({
    ...inv,
    totalAmount: Number(inv.totalAmount || 0),
    paidAmount: Number(inv.paidAmount || 0),
    remainingAmount: Number(inv.remainingAmount || 0),
    status: (inv.paymentStatus || inv.status || 'UNPAID') as 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
    paymentStatus: (inv.paymentStatus || inv.status || 'UNPAID') as 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
    isOverdue: inv.overdue ?? inv.isOverdue ?? false,
    overdue: inv.overdue ?? inv.isOverdue ?? false,
    overdueDays: Number(inv.overdueDays || 0)
  }));

  return {
    content,
    page: raw.page ?? raw.number ?? 0,
    size: raw.size ?? 10,
    totalElements: raw.totalElements ?? content.length,
    totalPages: Math.max(1, raw.totalPages ?? 1)
  };
}


