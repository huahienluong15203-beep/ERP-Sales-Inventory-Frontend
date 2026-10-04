/**
 * S3-01 / SCRUM-12 / SCRUM-77: Khai báo chính sách chiết khấu theo sản lượng (Volume Discount Policy)
 * Phân hệ: EP-02 / EP-04: Sản phẩm, Bảng giá & Chính sách chiết khấu
 *
 * Nghiệp vụ cốt lõi:
 * 1. Bậc chiết khấu theo số lượng mua của một SKU hoặc một nhóm hàng (Category).
 * 2. Chiết khấu tính theo phần trăm (%) hoặc số tiền cố định trên đơn vị (VND/đơn vị).
 * 3. Quy tắc "Best-Deal": Nhiều chính sách cùng áp dụng thì tự động lấy chính sách có lợi nhất cho khách hàng
 *    (mức giảm giá cao nhất quy đổi ra VND). Quy tắc này được ghi rõ trong tài liệu và hiển thị minh bạch trên UI.
 */

import type { CustomerGroupType } from './pricing';

export type DiscountScopeType = 'SKU' | 'CATEGORY';

export type DiscountCalculationType = 'PERCENT' | 'FIXED_AMOUNT';

export type DiscountPolicyStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export type DiscountCustomerScope = 'ALL' | CustomerGroupType;

/**
 * Chi tiết từng bậc chiết khấu theo sản lượng
 */
export interface VolumeDiscountTier {
  id?: string | number;
  tierOrder: number;            // Thứ tự bậc (1, 2, 3...)
  minQuantity: number;          // Số lượng tối thiểu (>= minQuantity)
  maxQuantity: number | null;   // Số lượng tối đa (< maxQuantity hoặc <= maxQuantity, null = không giới hạn trên)
  discountType: DiscountCalculationType; // 'PERCENT' (%) hoặc 'FIXED_AMOUNT' (VND/đơn vị)
  discountValue: number;        // Giá trị chiết khấu (% hoặc số tiền VND/đv)
  note?: string;                // Ghi chú ngắn cho bậc (vd: Thưởng đại lý lớn)
}

/**
 * Mô hình chính sách chiết khấu theo sản lượng
 */
export interface VolumeDiscountPolicy {
  id: string | number;
  code: string;                 // Mã chính sách (vd: CK-BIA-SL-2026)
  name: string;                 // Tên chính sách
  scopeType: DiscountScopeType; // Áp dụng theo 'SKU' hay 'CATEGORY'
  targetId: string;             // SKU sản phẩm hoặc Mã nhóm hàng
  targetName: string;           // Tên SKU hoặc Tên nhóm hàng hiển thị
  customerGroup: DiscountCustomerScope; // 'ALL' hoặc nhóm đại lý cụ thể
  customerGroupLabel?: string;
  startDate: string;            // Ngày bắt đầu áp dụng (YYYY-MM-DD)
  endDate: string | null;       // Ngày kết thúc (null = vô thời hạn)
  status: DiscountPolicyStatus; // Trạng thái chính sách
  priority: number;             // Độ ưu tiên hiển thị (số càng nhỏ càng ưu tiên)
  description?: string;         // Mô tả mục tiêu chính sách
  bestDealRuleNote: string;     // Ghi chú quy tắc có lợi nhất cho khách
  tiers: VolumeDiscountTier[];  // Danh sách các bậc sản lượng
  appliedOrdersCount?: number;  // Số đơn hàng đã hưởng chính sách này
  totalDiscountGiven?: number;  // Tổng số tiền chiết khấu đã cấp qua chính sách này (VND)
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Payload yêu cầu tạo mới hoặc cập nhật chính sách
 */
export interface VolumeDiscountPolicyRequest {
  code: string;
  name: string;
  scopeType: DiscountScopeType;
  targetId: string;
  targetName: string;
  customerGroup: DiscountCustomerScope;
  startDate: string;
  endDate?: string | null;
  status: DiscountPolicyStatus;
  priority?: number;
  description?: string;
  tiers: Omit<VolumeDiscountTier, 'id'>[];
}

/**
 * Đầu vào cho công cụ mô phỏng chính sách tối ưu (Best-Deal Simulator)
 */
export interface BestDealSimulationInput {
  productSku: string;
  quantity: number;
  customerGroup: CustomerGroupType;
  unitPrice?: number;           // Giá niêm yết trước chiết khấu để tính quy đổi VND
}

/**
 * Chi tiết kết quả so sánh của một chính sách ứng viên
 */
export interface PolicyCandidateResult {
  policy: VolumeDiscountPolicy;
  matchedTier: VolumeDiscountTier | null;
  isEligible: boolean;
  ineligibleReason?: string;
  discountType: DiscountCalculationType;
  discountValue: number;
  unitDiscountAmount: number;   // Số tiền giảm trên 1 đơn vị sản phẩm (VND)
  totalDiscountAmount: number;  // Tổng số tiền giảm cho toàn bộ số lượng (VND)
  finalUnitPrice: number;       // Đơn giá sau chiết khấu
  finalTotalPrice: number;      // Tổng tiền sau chiết khấu
  effectiveDiscountRate: number;// Tỷ lệ % giảm thực tế
  isBestDeal: boolean;          // Có phải chính sách có lợi nhất cho khách hàng hay không
}

/**
 * Kết quả mô phỏng toàn diện quy tắc "Best-Deal"
 */
export interface BestDealSimulationOutput {
  productSku: string;
  productName: string;
  category: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  customerGroup: CustomerGroupType;
  totalOriginalAmount: number;  // Tổng tiền ban đầu trước chiết khấu
  appliedBestDeal: PolicyCandidateResult | null;
  candidatePolicies: PolicyCandidateResult[];
  explanation: string;          // Lời giải thích minh bạch tại sao chọn chính sách này
  bestDealRuleStatement: string;// Quy định chính sách tốt nhất
}

/**
 * Bộ lọc danh sách chính sách chiết khấu
 */
export interface VolumeDiscountFilterParams {
  keyword?: string;
  scopeType?: 'ALL' | DiscountScopeType;
  customerGroup?: 'ALL' | CustomerGroupType;
  status?: 'ALL' | DiscountPolicyStatus;
  targetCategory?: string;
  page?: number;
  size?: number;
}
