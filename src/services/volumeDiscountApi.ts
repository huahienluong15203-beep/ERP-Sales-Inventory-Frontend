/**
 * S3-01 / SCRUM-12 / SCRUM-77: Dịch vụ API Quản lý Chính sách Chiết khấu theo Sản lượng
 * Phân hệ: EP-02 / EP-04: Sản phẩm & Bảng giá, Chính sách chiết khấu
 *
 * Tính năng chính:
 * 1. CRUD chính sách chiết khấu theo sản lượng (SKU hoặc Nhóm hàng).
 * 2. Lưu trữ bền vững (LocalStorage) với bộ hạt dữ liệu khởi tạo phong phú.
 * 3. Quy tắc cốt lõi: Best-Deal Rule Engine
 *    - Tự động quét tất cả các chính sách đang hiệu lực phù hợp với SKU / Nhóm hàng / Nhóm khách hàng.
 *    - Tìm bậc chiết khấu tương ứng với số lượng mua.
 *    - Quy đổi chiết khấu sang số tiền giảm thực tế (VND).
 *    - Tự động chọn chính sách có mức giảm lớn nhất (có lợi nhất cho khách hàng).
 *    - Xuất báo cáo giải trình minh bạch công thức so sánh.
 * 4. Xuất dữ liệu chính sách ra định dạng CSV/Excel.
 */

import type {
  VolumeDiscountPolicy,
  VolumeDiscountPolicyRequest,
  BestDealSimulationInput,
  BestDealSimulationOutput,
  PolicyCandidateResult,
  VolumeDiscountFilterParams
} from '../types/discount';
import { CATALOG_PRODUCTS } from '../types/pricing';

const STORAGE_KEY = 'erp_volume_discount_policies_v1';

export const AVAILABLE_CATEGORIES = [
  'Đồ uống có cồn',
  'Nước giải khát',
  'Thực phẩm dinh dưỡng',
  'Gia vị thực phẩm',
  'Lương thực',
  'Cà phê & Trà'
];

export const BEST_DEAL_RULE_STATEMENT =
  'Quy tắc kinh doanh: Khi một đơn hàng hoặc dòng sản phẩm cùng lúc thỏa mãn nhiều chính sách chiết khấu (ví dụ: vừa có chính sách riêng theo SKU, vừa có chính sách theo nhóm hàng, hoặc chương trình đại lý), hệ thống sẽ tự động so sánh và áp dụng chính sách có tổng mức chiết khấu cao nhất (có lợi nhất cho khách hàng), không cộng dồn chồng chéo trừ khi có quy định ngoại lệ.';

// Danh sách dữ liệu mẫu ban đầu
const INITIAL_POLICIES: VolumeDiscountPolicy[] = [
  {
    id: 'CK-BIA-HN-2026',
    code: 'CK-BIA-HN-Q4',
    name: 'Chiết khấu sản lượng Bia Hà Nội Lon 330ml - Quý 4',
    scopeType: 'SKU',
    targetId: 'BIA-HN-330',
    targetName: 'Bia Hà Nội Lon 330ml (Thùng 24 lon)',
    customerGroup: 'ALL',
    customerGroupLabel: 'Tất cả đại lý & Khách mua sỉ',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    priority: 1,
    description: 'Chương trình kích cầu sản lượng cho dòng Bia Hà Nội chủ lực, áp dụng theo bậc thùng mua.',
    bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
    appliedOrdersCount: 42,
    totalDiscountGiven: 48500000,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-09-15T10:30:00Z',
    createdBy: 'Nguyễn Văn Minh (Quản lý KD)',
    tiers: [
      {
        tierOrder: 1,
        minQuantity: 20,
        maxQuantity: 49,
        discountType: 'PERCENT',
        discountValue: 3,
        note: 'Sản lượng khởi điểm'
      },
      {
        tierOrder: 2,
        minQuantity: 50,
        maxQuantity: 99,
        discountType: 'PERCENT',
        discountValue: 5,
        note: 'Đạt định mức đại lý khá'
      },
      {
        tierOrder: 3,
        minQuantity: 100,
        maxQuantity: null,
        discountType: 'PERCENT',
        discountValue: 8,
        note: 'Tổng thầu / Đơn hàng lớn'
      }
    ]
  },
  {
    id: 'CK-BEV-CAT-2026',
    code: 'CK-NHOM-BEV',
    name: 'Chiết khấu sản lượng toàn ngành Nước giải khát',
    scopeType: 'CATEGORY',
    targetId: 'Nước giải khát',
    targetName: 'Nhóm: Nước giải khát (Coca, Lavie, Redbull...)',
    customerGroup: 'DEALER_LEVEL_1',
    customerGroupLabel: 'Đại lý Cấp 1 (Tổng thầu / NPP Lớn)',
    startDate: '2026-02-01',
    endDate: null,
    status: 'ACTIVE',
    priority: 2,
    description: 'Áp dụng cho toàn bộ sản phẩm thuộc nhóm Nước giải khát khi đại lý cấp 1 mua số lượng lớn.',
    bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
    appliedOrdersCount: 28,
    totalDiscountGiven: 32400000,
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-08-20T14:15:00Z',
    createdBy: 'Nguyễn Văn Minh (Quản lý KD)',
    tiers: [
      {
        tierOrder: 1,
        minQuantity: 30,
        maxQuantity: 99,
        discountType: 'FIXED_AMOUNT',
        discountValue: 6000,
        note: 'Giảm 6.000 đ/thùng'
      },
      {
        tierOrder: 2,
        minQuantity: 100,
        maxQuantity: 299,
        discountType: 'FIXED_AMOUNT',
        discountValue: 12000,
        note: 'Giảm 12.000 đ/thùng'
      },
      {
        tierOrder: 3,
        minQuantity: 300,
        maxQuantity: null,
        discountType: 'FIXED_AMOUNT',
        discountValue: 20000,
        note: 'Giảm 20.000 đ/thùng cho đơn tổng thầu'
      }
    ]
  },
  {
    id: 'CK-BIA-SG-2026',
    code: 'CK-BIA-SG-TIER',
    name: 'Ưu đãi số lượng Bia Sài Gòn Special',
    scopeType: 'SKU',
    targetId: 'BIA-SG-330',
    targetName: 'Bia Sài Gòn Special Lon 330ml',
    customerGroup: 'ALL',
    customerGroupLabel: 'Tất cả đại lý',
    startDate: '2026-03-01',
    endDate: '2026-11-30',
    status: 'ACTIVE',
    priority: 1,
    description: 'Chính sách chiết khấu trực tiếp tiền mặt theo từng thùng sản phẩm Bia Sài Gòn Special.',
    bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
    appliedOrdersCount: 35,
    totalDiscountGiven: 41200000,
    createdAt: '2026-03-01T08:30:00Z',
    updatedAt: '2026-07-10T16:00:00Z',
    createdBy: 'Nguyễn Văn Minh (Quản lý KD)',
    tiers: [
      {
        tierOrder: 1,
        minQuantity: 25,
        maxQuantity: 49,
        discountType: 'FIXED_AMOUNT',
        discountValue: 10000,
        note: 'Giảm 10.000 đ/thùng'
      },
      {
        tierOrder: 2,
        minQuantity: 50,
        maxQuantity: 99,
        discountType: 'FIXED_AMOUNT',
        discountValue: 18000,
        note: 'Giảm 18.000 đ/thùng'
      },
      {
        tierOrder: 3,
        minQuantity: 100,
        maxQuantity: null,
        discountType: 'FIXED_AMOUNT',
        discountValue: 28000,
        note: 'Giảm 28.000 đ/thùng'
      }
    ]
  },
  {
    id: 'CK-ALCOHOL-CAT-2026',
    code: 'CK-CAT-DO-UONG-CON',
    name: 'Chiết khấu nhóm Đồ uống có cồn (Đại lý cấp 2)',
    scopeType: 'CATEGORY',
    targetId: 'Đồ uống có cồn',
    targetName: 'Nhóm: Đồ uống có cồn (Bia Hà Nội, Sài Gòn, Trúc Bạch...)',
    customerGroup: 'DEALER_LEVEL_2',
    customerGroupLabel: 'Đại lý Cấp 2 (Bán buôn khu vực)',
    startDate: '2026-01-15',
    endDate: null,
    status: 'ACTIVE',
    priority: 2,
    description: 'Áp dụng cho đại lý cấp 2 nhập số lượng tích lũy nhóm hàng bia.',
    bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
    appliedOrdersCount: 19,
    totalDiscountGiven: 18900000,
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-05-12T09:40:00Z',
    createdBy: 'Trần Thị Thu (Admin)',
    tiers: [
      {
        tierOrder: 1,
        minQuantity: 40,
        maxQuantity: 79,
        discountType: 'PERCENT',
        discountValue: 3.5,
        note: 'Bậc đại lý cơ sở'
      },
      {
        tierOrder: 2,
        minQuantity: 80,
        maxQuantity: null,
        discountType: 'PERCENT',
        discountValue: 6,
        note: 'Bậc đại lý chiến lược'
      }
    ]
  },
  {
    id: 'CK-GAO-ST25-2026',
    code: 'CK-GAO-ST25',
    name: 'Chiết khấu mua sỉ Gạo ST25 Ông Cua Túi 5kg',
    scopeType: 'SKU',
    targetId: 'GAO-ST25-5K',
    targetName: 'Gạo ST25 Ông Cua Túi 5kg',
    customerGroup: 'ALL',
    customerGroupLabel: 'Tất cả đối tượng',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: 'EXPIRED',
    priority: 3,
    description: 'Chương trình chiết khấu vụ mùa đầu năm 2026 (Đã hết hạn).',
    bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
    appliedOrdersCount: 54,
    totalDiscountGiven: 26700000,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    createdBy: 'Nguyễn Văn Minh (Quản lý KD)',
    tiers: [
      {
        tierOrder: 1,
        minQuantity: 50,
        maxQuantity: 99,
        discountType: 'PERCENT',
        discountValue: 4,
        note: 'Từ 50 túi'
      },
      {
        tierOrder: 2,
        minQuantity: 100,
        maxQuantity: null,
        discountType: 'PERCENT',
        discountValue: 7.5,
        note: 'Từ 100 túi'
      }
    ]
  }
];

function getStoredPolicies(): VolumeDiscountPolicy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_POLICIES));
      return INITIAL_POLICIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error reading volume discounts from localStorage:', err);
  }
  return INITIAL_POLICIES;
}

function saveStoredPolicies(policies: VolumeDiscountPolicy[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
  } catch (err) {
    console.error('Error saving volume discounts to localStorage:', err);
  }
}

/**
 * Lấy danh sách chính sách chiết khấu theo bộ lọc
 */
export async function getVolumeDiscountPolicies(
  params: VolumeDiscountFilterParams = {}
): Promise<{ data: VolumeDiscountPolicy[]; total: number }> {
  // Mô phỏng độ trễ mạng nhẹ
  await new Promise((resolve) => setTimeout(resolve, 150));

  let list = getStoredPolicies();

  if (params.keyword && params.keyword.trim() !== '') {
    const kw = params.keyword.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.code.toLowerCase().includes(kw) ||
        p.name.toLowerCase().includes(kw) ||
        p.targetId.toLowerCase().includes(kw) ||
        p.targetName.toLowerCase().includes(kw) ||
        (p.description && p.description.toLowerCase().includes(kw))
    );
  }

  if (params.scopeType && params.scopeType !== 'ALL') {
    list = list.filter((p) => p.scopeType === params.scopeType);
  }

  if (params.customerGroup && params.customerGroup !== 'ALL') {
    list = list.filter(
      (p) => p.customerGroup === 'ALL' || p.customerGroup === params.customerGroup
    );
  }

  if (params.status && params.status !== 'ALL') {
    list = list.filter((p) => p.status === params.status);
  }

  if (params.targetCategory && params.targetCategory !== 'ALL') {
    list = list.filter(
      (p) =>
        p.targetId === params.targetCategory ||
        p.targetName.toLowerCase().includes(params.targetCategory!.toLowerCase())
    );
  }

  return {
    data: list,
    total: list.length
  };
}

/**
 * Lấy chi tiết một chính sách theo ID
 */
export async function getVolumeDiscountPolicyById(
  id: string | number
): Promise<VolumeDiscountPolicy | null> {
  const list = getStoredPolicies();
  const found = list.find((p) => String(p.id) === String(id));
  return found || null;
}

/**
 * Tạo mới chính sách chiết khấu
 */
export async function createVolumeDiscountPolicy(
  req: VolumeDiscountPolicyRequest
): Promise<VolumeDiscountPolicy> {
  const list = getStoredPolicies();

  // Kiểm tra trùng mã code
  if (list.some((p) => p.code.toLowerCase() === req.code.toLowerCase())) {
    throw new Error(`Mã chính sách "${req.code}" đã tồn tại trong hệ thống! Vui lòng chọn mã khác.`);
  }

  // Sắp xếp các bậc số lượng tăng dần
  const sortedTiers = [...req.tiers]
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .map((tier, idx) => ({
      ...tier,
      tierOrder: idx + 1
    }));

  const newPolicy: VolumeDiscountPolicy = {
    id: `CK-${Date.now()}`,
    code: req.code.trim().toUpperCase(),
    name: req.name.trim(),
    scopeType: req.scopeType,
    targetId: req.targetId,
    targetName: req.targetName,
    customerGroup: req.customerGroup,
    customerGroupLabel:
      req.customerGroup === 'ALL'
        ? 'Tất cả đại lý'
        : req.customerGroup === 'DEALER_LEVEL_1'
        ? 'Đại lý Cấp 1 (Tổng thầu)'
        : req.customerGroup === 'DEALER_LEVEL_2'
        ? 'Đại lý Cấp 2 (Bán buôn)'
        : 'Khách lẻ / Showroom',
    startDate: req.startDate,
    endDate: req.endDate || null,
    status: req.status,
    priority: req.priority || 2,
    description: req.description || '',
    bestDealRuleNote: BEST_DEAL_RULE_STATEMENT,
    tiers: sortedTiers,
    appliedOrdersCount: 0,
    totalDiscountGiven: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Nguyễn Văn Minh (Quản lý KD)'
  };

  list.unshift(newPolicy);
  saveStoredPolicies(list);
  return newPolicy;
}

/**
 * Cập nhật chính sách chiết khấu
 */
export async function updateVolumeDiscountPolicy(
  id: string | number,
  req: VolumeDiscountPolicyRequest
): Promise<VolumeDiscountPolicy> {
  const list = getStoredPolicies();
  const index = list.findIndex((p) => String(p.id) === String(id));
  if (index === -1) {
    throw new Error(`Không tìm thấy chính sách với ID: ${id}`);
  }

  // Kiểm tra trùng code với chính sách khác
  const duplicate = list.find(
    (p) => String(p.id) !== String(id) && p.code.toLowerCase() === req.code.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Mã chính sách "${req.code}" đã được sử dụng bởi chính sách khác!`);
  }

  const sortedTiers = [...req.tiers]
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .map((tier, idx) => ({
      ...tier,
      tierOrder: idx + 1
    }));

  const updated: VolumeDiscountPolicy = {
    ...list[index],
    code: req.code.trim().toUpperCase(),
    name: req.name.trim(),
    scopeType: req.scopeType,
    targetId: req.targetId,
    targetName: req.targetName,
    customerGroup: req.customerGroup,
    customerGroupLabel:
      req.customerGroup === 'ALL'
        ? 'Tất cả đại lý'
        : req.customerGroup === 'DEALER_LEVEL_1'
        ? 'Đại lý Cấp 1 (Tổng thầu)'
        : req.customerGroup === 'DEALER_LEVEL_2'
        ? 'Đại lý Cấp 2 (Bán buôn)'
        : 'Khách lẻ / Showroom',
    startDate: req.startDate,
    endDate: req.endDate || null,
    status: req.status,
    priority: req.priority || list[index].priority,
    description: req.description || '',
    tiers: sortedTiers,
    updatedAt: new Date().toISOString()
  };

  list[index] = updated;
  saveStoredPolicies(list);
  return updated;
}

/**
 * Xóa một chính sách chiết khấu
 */
export async function deleteVolumeDiscountPolicy(id: string | number): Promise<boolean> {
  const list = getStoredPolicies();
  const filtered = list.filter((p) => String(p.id) !== String(id));
  saveStoredPolicies(filtered);
  return true;
}

/**
 * Đổi nhanh trạng thái ACTIVE <-> INACTIVE
 */
export async function togglePolicyStatus(
  id: string | number
): Promise<VolumeDiscountPolicy> {
  const list = getStoredPolicies();
  const index = list.findIndex((p) => String(p.id) === String(id));
  if (index === -1) {
    throw new Error(`Không tìm thấy chính sách với ID: ${id}`);
  }

  const current = list[index];
  const newStatus = current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  list[index] = {
    ...current,
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  saveStoredPolicies(list);
  return list[index];
}

/**
 * ============================================================================
 * BEST-DEAL RULE ENGINE:
 * "Nhiều chính sách cùng áp dụng thì lấy chính sách có lợi nhất cho khách,
 * quy tắc này được ghi rõ trong tài liệu"
 * ============================================================================
 */
export async function simulateBestDeal(
  input: BestDealSimulationInput
): Promise<BestDealSimulationOutput> {
  const product = CATALOG_PRODUCTS.find((p) => p.sku === input.productSku) || {
    sku: input.productSku,
    name: input.productSku,
    defaultCategory: 'Khác',
    unit: 'Đơn vị',
    suggestedRetailPrice: input.unitPrice || 250000
  };

  const unitPrice = input.unitPrice && input.unitPrice > 0 ? input.unitPrice : product.suggestedRetailPrice;
  const quantity = Math.max(1, input.quantity);
  const totalOriginalAmount = unitPrice * quantity;

  const policies = getStoredPolicies();

  // Tìm tất cả chính sách ACTIVE
  const activePolicies = policies.filter((p) => p.status === 'ACTIVE');

  // Đánh giá từng chính sách
  const candidateResults: PolicyCandidateResult[] = [];

  for (const policy of activePolicies) {
    // 1. Kiểm tra đối tượng khách hàng
    const matchesCustomer =
      policy.customerGroup === 'ALL' || policy.customerGroup === input.customerGroup;
    if (!matchesCustomer) {
      continue; // Không thuộc đối tượng áp dụng
    }

    // 2. Kiểm tra phạm vi (Scope): theo SKU hoặc theo Category
    let matchesScope = false;
    if (policy.scopeType === 'SKU' && policy.targetId === product.sku) {
      matchesScope = true;
    } else if (
      policy.scopeType === 'CATEGORY' &&
      policy.targetId.toLowerCase() === product.defaultCategory.toLowerCase()
    ) {
      matchesScope = true;
    }

    if (!matchesScope) {
      continue;
    }

    // 3. Tìm bậc (Tier) thỏa mãn số lượng
    // Sắp xếp bậc theo minQuantity giảm dần để lấy bậc cao nhất thỏa mãn
    const sortedTiers = [...policy.tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    const matchedTier = sortedTiers.find((tier) => {
      const minOk = quantity >= tier.minQuantity;
      const maxOk = tier.maxQuantity === null || quantity <= tier.maxQuantity;
      return minOk && maxOk;
    });

    if (!matchedTier) {
      // Số lượng chưa đạt bậc tối thiểu của chính sách này
      candidateResults.push({
        policy,
        matchedTier: null,
        isEligible: false,
        ineligibleReason: `Chưa đạt số lượng tối thiểu (${policy.tiers[0]?.minQuantity || 0} ${product.unit})`,
        discountType: 'PERCENT',
        discountValue: 0,
        unitDiscountAmount: 0,
        totalDiscountAmount: 0,
        finalUnitPrice: unitPrice,
        finalTotalPrice: totalOriginalAmount,
        effectiveDiscountRate: 0,
        isBestDeal: false
      });
      continue;
    }

    // 4. Tính toán số tiền chiết khấu thực tế (VND)
    let unitDiscount = 0;
    if (matchedTier.discountType === 'PERCENT') {
      unitDiscount = (unitPrice * matchedTier.discountValue) / 100;
    } else {
      // FIXED_AMOUNT (VND / đơn vị)
      unitDiscount = matchedTier.discountValue;
    }

    // Đảm bảo không giảm quá giá trị gốc
    unitDiscount = Math.min(unitDiscount, unitPrice);
    const totalDiscount = unitDiscount * quantity;
    const finalUnitPrice = Math.max(0, unitPrice - unitDiscount);
    const finalTotalPrice = Math.max(0, totalOriginalAmount - totalDiscount);
    const effectiveRate = unitPrice > 0 ? (unitDiscount / unitPrice) * 100 : 0;

    candidateResults.push({
      policy,
      matchedTier,
      isEligible: true,
      discountType: matchedTier.discountType,
      discountValue: matchedTier.discountValue,
      unitDiscountAmount: Math.round(unitDiscount),
      totalDiscountAmount: Math.round(totalDiscount),
      finalUnitPrice: Math.round(finalUnitPrice),
      finalTotalPrice: Math.round(finalTotalPrice),
      effectiveDiscountRate: Number(effectiveRate.toFixed(2)),
      isBestDeal: false
    });
  }

  // 5. Áp dụng quy tắc "BEST DEAL":
  // Chọn chính sách có totalDiscountAmount LỚN NHẤT
  const eligibleCandidates = candidateResults.filter((c) => c.isEligible && c.totalDiscountAmount > 0);

  let bestDeal: PolicyCandidateResult | null = null;

  if (eligibleCandidates.length > 0) {
    // Sắp xếp giảm dần theo totalDiscountAmount. Nếu bằng nhau, ưu tiên chính sách SKU trước Category
    eligibleCandidates.sort((a, b) => {
      if (b.totalDiscountAmount !== a.totalDiscountAmount) {
        return b.totalDiscountAmount - a.totalDiscountAmount;
      }
      if (a.policy.scopeType === 'SKU' && b.policy.scopeType === 'CATEGORY') {
        return -1;
      }
      return a.policy.priority - b.policy.priority;
    });

    bestDeal = eligibleCandidates[0];
    bestDeal.isBestDeal = true;
  }

  // Tạo lời giải thích minh bạch
  let explanation = '';
  if (!bestDeal) {
    if (candidateResults.length === 0) {
      explanation = `Không tìm thấy chính sách chiết khấu nào áp dụng cho ${product.name} và nhóm khách hàng này.`;
    } else {
      explanation = `Có ${candidateResults.length} chính sách liên quan nhưng số lượng mua (${quantity} ${product.unit}) chưa đạt mức tối thiểu của bất kỳ bậc chiết khấu nào.`;
    }
  } else if (eligibleCandidates.length === 1) {
    explanation = `Áp dụng chính sách duy nhất thỏa mãn: "${bestDeal.policy.name}" (${bestDeal.matchedTier?.discountType === 'PERCENT' ? `${bestDeal.matchedTier.discountValue}%` : `${bestDeal.matchedTier?.discountValue.toLocaleString('vi-VN')} đ/${product.unit}`}), tiết kiệm được ${bestDeal.totalDiscountAmount.toLocaleString('vi-VN')} đ cho khách hàng.`;
  } else {
    const others = eligibleCandidates.slice(1);
    const runnerUp = others[0];
    const diff = bestDeal.totalDiscountAmount - runnerUp.totalDiscountAmount;
    explanation = `Có ${eligibleCandidates.length} chính sách cùng thỏa mãn. Theo quy tắc Best-Deal, hệ thống tự động chọn chính sách "${bestDeal.policy.name}" với mức giảm cao nhất: ${bestDeal.totalDiscountAmount.toLocaleString('vi-VN')} đ (nhiều hơn chính sách đứng thứ hai "${runnerUp.policy.name}" ${diff > 0 ? diff.toLocaleString('vi-VN') + ' đ' : '0 đ'}).`;
  }

  return {
    productSku: product.sku,
    productName: product.name,
    category: product.defaultCategory,
    unit: product.unit,
    unitPrice,
    quantity,
    customerGroup: input.customerGroup,
    totalOriginalAmount,
    appliedBestDeal: bestDeal,
    candidatePolicies: candidateResults,
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
