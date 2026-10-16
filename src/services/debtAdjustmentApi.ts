import { authFetch, API_BASE_URL } from './api';
import type {
  DebtAdjustment,
  DebtAdjustmentFilterParams
} from '../types/debtAdjustment';

/**
 * S8-02: Chứng từ điều chỉnh giảm trừ công nợ khi trả hàng.
 * Backend: GET /api/debt-adjustments, POST /api/debt-adjustments/{id}/approve | /reject.
 * Luôn dùng dữ liệu thật từ backend; lỗi backend được ném ra để màn hình hiện đúng thông báo
 * (không tự chuyển sang dữ liệu giả, tránh hiện "thành công" khi công nợ thật không đổi).
 */
const DEBT_ADJUST_URL = `${API_BASE_URL}/api/debt-adjustments`;

/** Đọc thông báo lỗi dạng { code, message, details } của backend. */
async function toError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json();
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return new Error(body.message);
    }
  } catch {
    // body rỗng hoặc không phải JSON
  }
  return new Error(`${fallback} (mã lỗi ${res.status})`);
}

/**
 * Danh sách chứng từ điều chỉnh giảm trừ công nợ
 */
export async function fetchDebtAdjustments(
  params: DebtAdjustmentFilterParams = {}
): Promise<DebtAdjustment[]> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'ALL') query.set('status', params.status);
  if (params.customerId && params.customerId !== 'ALL') query.set('customerId', params.customerId);
  if (params.keyword && params.keyword.trim()) query.set('keyword', params.keyword.trim());
  const res = await authFetch(`${DEBT_ADJUST_URL}?${query.toString()}`);
  if (!res.ok) {
    throw await toError(res, 'Không tải được danh sách chứng từ điều chỉnh');
  }
  return await res.json();
}

/**
 * Phê duyệt chứng từ điều chỉnh (Kế toán công nợ duyệt - AC2, AC3, AC4).
 * Backend lập chứng từ giảm trừ và cập nhật công nợ, hạn mức của đại lý ngay.
 * Người duyệt do backend lấy từ tài khoản đăng nhập (tham số _approverName giữ lại để không đổi chỗ gọi).
 */
export async function approveDebtAdjustment(
  id: number,
  approvalNote: string,
  _approverName?: string
): Promise<DebtAdjustment> {
  const res = await authFetch(`${DEBT_ADJUST_URL}/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approvalNote })
  });
  if (!res.ok) {
    throw await toError(res, 'Không duyệt được chứng từ điều chỉnh');
  }
  return await res.json();
}

/**
 * Từ chối chứng từ điều chỉnh (bắt buộc lý do)
 */
export async function rejectDebtAdjustment(
  id: number,
  reason: string
): Promise<DebtAdjustment> {
  const res = await authFetch(`${DEBT_ADJUST_URL}/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    throw await toError(res, 'Không từ chối được chứng từ điều chỉnh');
  }
  return await res.json();
}
