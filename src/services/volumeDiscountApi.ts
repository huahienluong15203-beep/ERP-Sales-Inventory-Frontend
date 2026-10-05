/**
 * S3-01 / SCRUM-12 / SCRUM-77: Dịch vụ API Quản lý Chính sách Chiết khấu theo Sản lượng
 * Phân hệ: EP-02 / EP-04: Sản phẩm & Bảng giá, Chính sách chiết khấu
 *
 * Kết nối backend Spring Boot:
 * - GET    /api/discount-policies?status=&keyword=
 * - GET    /api/discount-policies/{id}
 * - POST   /api/discount-policies            (ADMIN, SALES_MANAGER)
 * - PUT    /api/discount-policies/{id}       (ADMIN, SALES_MANAGER)
 * - PATCH  /api/discount-policies/{id}/status?status=ACTIVE|INACTIVE (ADMIN, SALES_MANAGER)
 * - POST   /api/discount-policies/calculate  (Best-Deal Rule Engine phía server)
 * Backend không có xoá cứng: "xoá" = ngừng áp dụng (INACTIVE).
 */

import type {
  VolumeDiscountPolicy,
  VolumeDiscountPolicyRequest,
  VolumeDiscountTier,
  BestDealSimulationInput,
  BestDealSimulationOutput,
  PolicyCandidateResult,
  VolumeDiscountFilterParams,
  DiscountCalculationType,
  DiscountPolicyStatus
} from '../types/discount';
import type { CatalogProduct } from '../types/pricing';
import { API_BASE_URL, authFetch } from './api';

const BASE = `${API_BASE_URL}/api/discount-policies`;

export const BEST_DEAL_RULE_STATEMENT =
  'Quy tắc kinh doanh: Khi một đơn hàng hoặc dòng sản phẩm cùng lúc thỏa mãn nhiều chính sách chiết khấu (ví dụ: vừa có chính sách riêng theo SKU, vừa có chính sách theo nhóm hàng, hoặc chương trình đại lý), hệ thống sẽ tự động so sánh và áp dụng chính sách có tổng mức chiết khấu cao nhất (có lợi nhất cho khách hàng), không cộng dồn chồng chéo trừ khi có quy định ngoại lệ.';

// ============================================================================
// Kiểu dữ liệu backend
// ============================================================================

type BeScope = 'PRODUCT' | 'CATEGORY';
type BeDiscountType = 'PERCENT' | 'AMOUNT_PER_UNIT';

interface BeTier {
  id: number;
  minQuantity: number;
  discountValue: number;
}

interface BePolicy {
  id: number;
  code: string;
  name: string;
  scope: BeScope;
  productId: number | null;
  productSku: string | null;
  productName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  discountType: BeDiscountType;
  startDate: string;
  endDate: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  note: string | null;
  tiers: BeTier[];
  createdAt: string;
  updatedAt: string;
}

interface BeCandidate {
  policyId: number;
  policyCode: string;
  policyName: string;
  scope: BeScope;
  discountType: BeDiscountType;
  tierMinQuantity: number;
  discountValue: number;
  discountPerUnit: number;
  discountAmount: number;
}

interface BeCalculateResponse {
  productId: number;
  productSku: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  applied: BeCandidate | null;
  candidates: BeCandidate[];
}

interface BeProduct {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  categoryId: number | null;
  baseUnit: string | null;
}

interface BeCategory {
  id: number;
  name: string;
  level: number;
}

export interface DiscountCategoryOption {
  id: string;
  name: string;
  level: number;
}

// ============================================================================
// Tiện ích
// ============================================================================

/** Đọc lỗi backend ({code, message, details, timestamp}) và ném Error với nội dung hữu ích */
async function throwBackendError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => null);
  let text = '';
  if (data && typeof data === 'object') {
    const details = (data as { details?: unknown }).details;
    const message = (data as { message?: unknown }).message;
    let firstDetail = '';
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      const vals = Object.values(details as Record<string, unknown>);
      if (vals.length > 0) firstDetail = String(vals[0]);
    } else if (Array.isArray(details) && details.length > 0) {
      firstDetail = String(details[0]);
    } else if (typeof details === 'string') {
      firstDetail = details;
    }
    if (typeof message === 'string' && message && message !== 'Dữ liệu không hợp lệ') {
      text = message;
    } else if (firstDetail) {
      text = firstDetail;
    } else if (typeof message === 'string') {
      text = message;
    }
  }
  throw new Error(text || `${fallback} (HTTP ${res.status})`);
}

async function requestJson<T>(url: string, options: RequestInit, fallback: string): Promise<T> {
  const res = await authFetch(url, options);
  if (!res.ok) {
    await throwBackendError(res, fallback);
  }
  return (await res.json()) as T;
}

/** Ngày hôm nay theo múi giờ Asia/Ho_Chi_Minh (YYYY-MM-DD) */
function todayVN(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function toFeType(t: BeDiscountType): DiscountCalculationType {
  return t === 'PERCENT' ? 'PERCENT' : 'FIXED_AMOUNT';
}

function mapPolicy(p: BePolicy): VolumeDiscountPolicy {
  const isSku = p.scope === 'PRODUCT';
  let status: DiscountPolicyStatus = p.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  if (p.endDate && p.endDate < todayVN()) status = 'EXPIRED';

  const sorted = [...(p.tiers || [])].sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity));
  const tiers: VolumeDiscountTier[] = sorted.map((t, idx) => ({
    id: t.id,
    tierOrder: idx + 1,
    minQuantity: Number(t.minQuantity),
    maxQuantity: idx < sorted.length - 1 ? Number(sorted[idx + 1].minQuantity) - 1 : null,
    discountType: toFeType(p.discountType),
    discountValue: Number(t.discountValue)
  }));

  return {
    id: p.id,
    code: p.code,
    name: p.name,
    scopeType: isSku ? 'SKU' : 'CATEGORY',
    targetId: isSku ? p.productSku || '' : p.categoryId != null ? String(p.categoryId) : '',
    targetName: (isSku ? p.productName : p.categoryName) || '',
    customerGroup: 'ALL',
    customerGroupLabel: 'Tất cả nhóm đại lý',
    startDate: p.startDate,
    endDate: p.endDate,
    status,
    priority: isSku ? 1 : 2,
    description: p.note || '',
    bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
    tiers,
    appliedOrdersCount: 0,
    totalDiscountGiven: 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    createdBy: ''
  };
}

function toBackendBody(req: VolumeDiscountPolicyRequest) {
  if (!req.tiers || req.tiers.length === 0) {
    throw new Error('Chính sách phải có ít nhất một bậc chiết khấu!');
  }
  const types = new Set(req.tiers.map((t) => t.discountType));
  if (types.size > 1) {
    throw new Error('Tất cả các bậc phải cùng kiểu giảm (% hoặc số tiền/đơn vị)');
  }
  const feType = req.tiers[0].discountType;
  const isSku = req.scopeType === 'SKU';
  return {
    code: req.code.trim(),
    name: req.name.trim(),
    scope: isSku ? 'PRODUCT' : 'CATEGORY',
    productSku: isSku ? req.targetId : null,
    categoryId: isSku ? null : Number(req.targetId),
    discountType: feType === 'PERCENT' ? 'PERCENT' : 'AMOUNT_PER_UNIT',
    startDate: req.startDate,
    endDate: req.endDate || null,
    note: req.description || '',
    tiers: [...req.tiers]
      .sort((a, b) => a.minQuantity - b.minQuantity)
      .map((t) => ({ minQuantity: t.minQuantity, discountValue: t.discountValue }))
  };
}

async function patchStatus(id: string | number, status: 'ACTIVE' | 'INACTIVE'): Promise<VolumeDiscountPolicy> {
  const data = await requestJson<BePolicy>(
    `${BASE}/${id}/status?status=${status}`,
    { method: 'PATCH' },
    'Không thể đổi trạng thái chính sách'
  );
  return mapPolicy(data);
}

// ============================================================================
// Danh mục tham chiếu (sản phẩm, nhóm hàng)
// ============================================================================


/** Danh sách sản phẩm đang kinh doanh để chọn trong form / mô phỏng */
export async function fetchDiscountProductOptions(): Promise<CatalogProduct[]> {
  const data = await requestJson<{ content: BeProduct[] }>(
    `${API_BASE_URL}/api/products?page=0&size=200&status=ACTIVE`,
    { method: 'GET' },
    'Không tải được danh sách sản phẩm'
  );
  return (data.content || []).map((p) => ({
    sku: p.sku,
    name: p.name,
    defaultCategory: p.category || '',
    unit: p.baseUnit || '',
    suggestedRetailPrice: 0
  }));
}

/** Danh sách nhóm hàng (phẳng) để chọn trong form */
export async function fetchDiscountCategoryOptions(): Promise<DiscountCategoryOption[]> {
  const data = await requestJson<BeCategory[]>(
    `${API_BASE_URL}/api/product-categories`,
    { method: 'GET' },
    'Không tải được danh sách nhóm hàng'
  );
  return (data || []).map((c) => ({ id: String(c.id), name: c.name, level: c.level }));
}

// ============================================================================
// CRUD chính sách
// ============================================================================

/**
 * Lấy danh sách chính sách chiết khấu theo bộ lọc
 */
export async function getVolumeDiscountPolicies(
  params: VolumeDiscountFilterParams = {}
): Promise<{ data: VolumeDiscountPolicy[]; total: number }> {
  const query = new URLSearchParams();
  if (params.keyword && params.keyword.trim() !== '') query.set('keyword', params.keyword.trim());
  // Backend chỉ biết ACTIVE/INACTIVE; EXPIRED được suy ra từ ngày kết thúc nên lọc phía client
  const qs = query.toString();
  const raw = await requestJson<BePolicy[]>(
    `${BASE}${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
    'Không tải được danh sách chính sách chiết khấu'
  );
  let list = (raw || []).map(mapPolicy);

  if (params.status && params.status !== 'ALL') {
    list = list.filter((p) => p.status === params.status);
  }
  if (params.scopeType && params.scopeType !== 'ALL') {
    list = list.filter((p) => p.scopeType === params.scopeType);
  }
  if (params.targetCategory && params.targetCategory !== 'ALL') {
    const tc = params.targetCategory.toLowerCase();
    list = list.filter(
      (p) => p.targetId === params.targetCategory || p.targetName.toLowerCase().includes(tc)
    );
  }

  return { data: list, total: list.length };
}

/**
 * Lấy chi tiết một chính sách theo ID
 */
export async function getVolumeDiscountPolicyById(
  id: string | number
): Promise<VolumeDiscountPolicy | null> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) await throwBackendError(res, 'Không tải được chính sách');
  return mapPolicy((await res.json()) as BePolicy);
}

/**
 * Tạo mới chính sách chiết khấu (backend tạo ở trạng thái ACTIVE)
 */
export async function createVolumeDiscountPolicy(
  req: VolumeDiscountPolicyRequest
): Promise<VolumeDiscountPolicy> {
  const body = toBackendBody(req);
  const data = await requestJson<BePolicy>(
    BASE,
    { method: 'POST', body: JSON.stringify(body) },
    'Không thể tạo chính sách chiết khấu'
  );
  if (req.status === 'INACTIVE' && data.status !== 'INACTIVE') {
    return patchStatus(data.id, 'INACTIVE');
  }
  return mapPolicy(data);
}

/**
 * Cập nhật chính sách chiết khấu
 */
export async function updateVolumeDiscountPolicy(
  id: string | number,
  req: VolumeDiscountPolicyRequest
): Promise<VolumeDiscountPolicy> {
  const body = toBackendBody(req);
  const data = await requestJson<BePolicy>(
    `${BASE}/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
    'Không thể cập nhật chính sách chiết khấu'
  );
  if (req.status === 'INACTIVE' && data.status !== 'INACTIVE') {
    return patchStatus(data.id, 'INACTIVE');
  }
  return mapPolicy(data);
}

/**
 * Backend không cho xoá cứng (quy tắc dự án) → "Ngừng áp dụng" = chuyển INACTIVE
 */
export async function deleteVolumeDiscountPolicy(id: string | number): Promise<boolean> {
  await patchStatus(id, 'INACTIVE');
  return true;
}

/**
 * Đổi nhanh trạng thái ACTIVE <-> INACTIVE
 */
export async function togglePolicyStatus(
  id: string | number
): Promise<VolumeDiscountPolicy> {
  const current = await requestJson<BePolicy>(
    `${BASE}/${id}`,
    { method: 'GET' },
    'Không tải được chính sách'
  );
  return patchStatus(id, current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
}

// ============================================================================
// BEST-DEAL RULE ENGINE (tính ở backend: POST /calculate)
// ============================================================================

let productCache: Promise<CatalogProduct[]> | null = null;

function getProductsCached(): Promise<CatalogProduct[]> {
  if (!productCache) {
    productCache = fetchDiscountProductOptions().catch(() => {
      productCache = null;
      return [] as CatalogProduct[];
    });
  }
  return productCache;
}

async function lookupListPrice(customerGroup: string, productSku: string): Promise<number> {
  const query = new URLSearchParams({ customerGroup, productSku });
  const res = await authFetch(`${API_BASE_URL}/api/price-lists/lookup?${query.toString()}`, {
    method: 'GET'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data && typeof data.message === 'string' ? data.message : '';
    throw new Error(
      `Không tìm thấy giá bán đang hiệu lực của SKU ${productSku} cho nhóm khách hàng đã chọn${
        msg ? `: ${msg}` : ''
      }. Vui lòng nhập đơn giá thủ công.`
    );
  }
  const data = (await res.json()) as { price?: number };
  const price = Number(data?.price);
  if (!price || price <= 0) {
    throw new Error(
      `SKU ${productSku} chưa có giá bán hiệu lực trong bảng giá của nhóm khách hàng đã chọn. Vui lòng nhập đơn giá thủ công.`
    );
  }
  return price;
}

export async function simulateBestDeal(
  input: BestDealSimulationInput
): Promise<BestDealSimulationOutput> {
  const quantity = Math.max(1, input.quantity);
  const unitPrice =
    input.unitPrice && input.unitPrice > 0
      ? input.unitPrice
      : await lookupListPrice(input.customerGroup, input.productSku);

  const calc = await requestJson<BeCalculateResponse>(
    `${BASE}/calculate`,
    {
      method: 'POST',
      body: JSON.stringify({ productSku: input.productSku, quantity, unitPrice, date: todayVN() })
    },
    'Không thể mô phỏng chiết khấu'
  );

  const [policiesRes, products] = await Promise.all([
    getVolumeDiscountPolicies().catch(() => ({ data: [] as VolumeDiscountPolicy[], total: 0 })),
    getProductsCached()
  ]);
  const policyMap = new Map(policiesRes.data.map((p) => [String(p.id), p]));
  const product = products.find((p) => p.sku === input.productSku);
  const productName = product?.name || input.productSku;
  const unit = product?.unit || 'đơn vị';

  const gross = Number(calc.grossAmount) || unitPrice * quantity;
  const appliedId = calc.applied ? String(calc.applied.policyId) : null;

  const candidates: PolicyCandidateResult[] = (calc.candidates || []).map((c) => {
    const feType = toFeType(c.discountType);
    const policy: VolumeDiscountPolicy = policyMap.get(String(c.policyId)) || {
      id: c.policyId,
      code: c.policyCode,
      name: c.policyName,
      scopeType: c.scope === 'PRODUCT' ? 'SKU' : 'CATEGORY',
      targetId: c.scope === 'PRODUCT' ? input.productSku : '',
      targetName: c.scope === 'PRODUCT' ? productName : product?.defaultCategory || '',
      customerGroup: 'ALL',
      customerGroupLabel: 'Tất cả nhóm đại lý',
      startDate: '',
      endDate: null,
      status: 'ACTIVE',
      priority: c.scope === 'PRODUCT' ? 1 : 2,
      bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
      tiers: [],
      createdAt: '',
      updatedAt: '',
      createdBy: ''
    };
    const matchedTier =
      policy.tiers.find((t) => Number(t.minQuantity) === Number(c.tierMinQuantity)) || {
        tierOrder: 1,
        minQuantity: Number(c.tierMinQuantity),
        maxQuantity: null,
        discountType: feType,
        discountValue: Number(c.discountValue)
      };
    const unitDiscount = Number(c.discountPerUnit) || 0;
    const totalDiscount = Number(c.discountAmount) || 0;
    return {
      policy,
      matchedTier,
      isEligible: true,
      discountType: feType,
      discountValue: Number(c.discountValue),
      unitDiscountAmount: unitDiscount,
      totalDiscountAmount: totalDiscount,
      finalUnitPrice: Math.max(0, unitPrice - unitDiscount),
      finalTotalPrice: Math.max(0, gross - totalDiscount),
      effectiveDiscountRate: unitPrice > 0 ? Number(((unitDiscount / unitPrice) * 100).toFixed(2)) : 0,
      isBestDeal: appliedId !== null && String(c.policyId) === appliedId
    };
  });

  // Sắp xếp: chính sách được áp dụng lên đầu, sau đó theo mức giảm giảm dần
  candidates.sort((a, b) => {
    if (a.isBestDeal !== b.isBestDeal) return a.isBestDeal ? -1 : 1;
    return b.totalDiscountAmount - a.totalDiscountAmount;
  });
  const bestDeal = candidates.find((c) => c.isBestDeal) || null;

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  let explanation = '';
  if (!bestDeal) {
    explanation = `Không có chính sách chiết khấu nào đang hiệu lực mà số lượng mua (${quantity} ${unit}) của ${productName} đạt bậc tối thiểu.`;
  } else if (candidates.length === 1) {
    explanation = `Áp dụng chính sách duy nhất thỏa mãn: "${bestDeal.policy.name}" (${
      bestDeal.discountType === 'PERCENT'
        ? `${bestDeal.discountValue}%`
        : `${fmt(bestDeal.discountValue)} đ/${unit}`
    }), tiết kiệm được ${fmt(bestDeal.totalDiscountAmount)} đ cho khách hàng.`;
  } else {
    const runnerUp = candidates.find((c) => !c.isBestDeal)!;
    const diff = bestDeal.totalDiscountAmount - runnerUp.totalDiscountAmount;
    explanation = `Có ${candidates.length} chính sách cùng thỏa mãn. Theo quy tắc Best-Deal, hệ thống tự động chọn chính sách "${bestDeal.policy.name}" với mức giảm cao nhất: ${fmt(
      bestDeal.totalDiscountAmount
    )} đ (nhiều hơn chính sách đứng thứ hai "${runnerUp.policy.name}" ${fmt(Math.max(0, diff))} đ${
      diff === 0 ? ', bằng nhau nên ưu tiên chính sách theo SKU' : ''
    }).`;
  }

  return {
    productSku: calc.productSku || input.productSku,
    productName,
    category: product?.defaultCategory || '',
    unit,
    unitPrice,
    quantity,
    customerGroup: input.customerGroup,
    totalOriginalAmount: gross,
    appliedBestDeal: bestDeal,
    candidatePolicies: candidates,
    explanation,
    bestDealRuleStatement: BEST_DEAL_RULE_STATEMENT
  };
}

/**
 * Xuất danh sách chính sách ra CSV
 */
export function exportPoliciesToCsv(policies: VolumeDiscountPolicy[]): void {
  const headers = [
    'Mã chính sách',
    'Tên chính sách',
    'Phạm vi',
    'Mã đối tượng',
    'Tên đối tượng',
    'Đối tượng khách hàng',
    'Ngày bắt đầu',
    'Ngày kết thúc',
    'Trạng thái',
    'Các bậc chiết khấu (Bậc - Min - Max - Giá trị)',
    'Số đơn đã áp dụng',
    'Tổng CK đã cấp (VNĐ)',
    'Ghi chú quy tắc'
  ];

  const rows = policies.map((p) => {
    const tiersStr = p.tiers
      .map(
        (t) =>
          `[Bậc ${t.tierOrder}: từ ${t.minQuantity} đến ${
            t.maxQuantity ?? 'vô cùng'
          } -> ${
            t.discountType === 'PERCENT'
              ? `${t.discountValue}%`
              : `${t.discountValue.toLocaleString('vi-VN')} đ/đv`
          }]`
      )
      .join('; ');

    return [
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.scopeType === 'SKU' ? 'Theo SKU' : 'Theo Nhóm hàng'}"`,
      `"${p.targetId}"`,
      `"${p.targetName.replace(/"/g, '""')}"`,
      `"${p.customerGroupLabel || p.customerGroup}"`,
      `"${p.startDate}"`,
      `"${p.endDate || 'Vô thời hạn'}"`,
      `"${p.status === 'ACTIVE' ? 'Đang hiệu lực' : p.status === 'INACTIVE' ? 'Tạm dừng' : 'Hết hạn'}"`,
      `"${tiersStr}"`,
      p.appliedOrdersCount || 0,
      p.totalDiscountGiven || 0,
      `"${(p.bestDealRuleNote || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Chinh_sach_chiet_khau_san_luong_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
