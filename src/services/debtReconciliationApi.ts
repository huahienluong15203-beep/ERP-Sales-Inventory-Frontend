import { authFetch, API_BASE_URL } from './api';
import type {
  PeriodicReconciliationStatement,
  CreateReconciliationParams
} from '../types/debtReconciliation';

/**
 * S7-06: Đối chiếu công nợ định kỳ — dùng dữ liệu thật từ backend.
 * - GET  /api/debts/reconciliation?customerId=&status=
 * - GET  /api/debts/reconciliation/preview?customerId=&fromDate=&toDate=&statementDate=
 * - POST /api/debts/reconciliation  { customerId, fromDate, toDate, statementDate, notes, draft }
 * - POST /api/debts/reconciliation/{id}/confirm
 * - POST /api/debts/reconciliation/{id}/respond  { status, feedback, signerName }  (chỉ đại lý)
 * Số dư đầu kỳ, phát sinh và cuối kỳ do backend tính từ hoá đơn, phiếu thu, chứng từ giảm trừ.
 * Lỗi backend được ném ra để màn hình hiện đúng thông báo (không lưu dữ liệu giả vào trình duyệt).
 */
const RECON_URL = `${API_BASE_URL}/api/debts/reconciliation`;

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

export async function fetchReconciliationStatements(
  params?: { customerId?: number; status?: string }
): Promise<PeriodicReconciliationStatement[]> {
  const query = new URLSearchParams();
  if (params?.customerId) query.append('customerId', String(params.customerId));
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  const res = await authFetch(`${RECON_URL}?${query.toString()}`);
  if (!res.ok) {
    throw await toError(res, 'Không tải được danh sách biên bản đối chiếu');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Xem trước số liệu biên bản (chưa lưu). */
export async function previewReconciliationStatement(
  params: CreateReconciliationParams
): Promise<PeriodicReconciliationStatement> {
  const query = new URLSearchParams({
    customerId: String(params.customerId),
    fromDate: params.fromDate,
    toDate: params.toDate
  });
  if (params.statementDate) query.append('statementDate', params.statementDate);
  const res = await authFetch(`${RECON_URL}/preview?${query.toString()}`);
  if (!res.ok) {
    throw await toError(res, 'Không tính được số liệu đối chiếu');
  }
  return res.json();
}

/** Lập biên bản (mặc định chốt luôn và gửi đại lý; draft = true để lưu nháp). */
export async function createReconciliationStatement(
  params: CreateReconciliationParams & { draft?: boolean }
): Promise<PeriodicReconciliationStatement> {
  const res = await authFetch(RECON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: params.customerId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      statementDate: params.statementDate || undefined,
      notes: params.notes || undefined,
      draft: params.draft ?? false
    })
  });
  if (!res.ok) {
    throw await toError(res, 'Không lập được biên bản đối chiếu');
  }
  return res.json();
}

/** Chốt bản nháp và gửi đại lý xác nhận. */
export async function confirmReconciliationStatement(id: number): Promise<PeriodicReconciliationStatement> {
  const res = await authFetch(`${RECON_URL}/${id}/confirm`, { method: 'POST' });
  if (!res.ok) {
    throw await toError(res, 'Không chốt được biên bản đối chiếu');
  }
  return res.json();
}

/** Đại lý xác nhận hoặc phản hồi lệch (bắt buộc ghi lý do khi lệch). */
export async function agencyRespondStatement(
  id: number,
  status: 'AGENCY_ACCEPTED' | 'AGENCY_DISPUTED',
  feedback?: string,
  signerName?: string
): Promise<PeriodicReconciliationStatement> {
  const res = await authFetch(`${RECON_URL}/${id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, feedback: feedback?.trim() || undefined, signerName })
  });
  if (!res.ok) {
    throw await toError(res, 'Không gửi được phản hồi biên bản đối chiếu');
  }
  return res.json();
}
