import { authFetch, API_BASE_URL } from './api';
import type {
  DebtLedgerResponse,
  DebtLedgerFilterParams
} from '../types/debtLedger';

const LEDGER_URL = `${API_BASE_URL}/api/debts/ledger`;

/**
 * Lấy dữ liệu sổ công nợ & tuổi nợ từ Backend (S7-03)
 * 100% dữ liệu thật từ cơ sở dữ liệu PostgreSQL
 */
export async function fetchDebtLedger(
  params: DebtLedgerFilterParams = {}
): Promise<DebtLedgerResponse> {
  const query = new URLSearchParams();
  if (params.keyword?.trim()) query.append('keyword', params.keyword.trim());
  if (params.salesRepId) query.append('salesRepId', String(params.salesRepId));
  if (params.bucket && params.bucket !== 'ALL') query.append('bucket', params.bucket);
  if (params.overdueOnly) query.append('overdueOnly', 'true');
  if (params.includeSettled) query.append('includeSettled', 'true');
  if (params.sort) query.append('sort', params.sort);
  query.append('page', String(params.page || 0));
  query.append('size', String(params.size || 50));

  const res = await authFetch(`${LEDGER_URL}?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || `Lỗi tải sổ công nợ & tuổi nợ (mã lỗi ${res.status})`);
  }
  const data = await res.json();
  if (!data || !data.rows) {
    throw new Error('Dữ liệu sổ công nợ trả về không hợp lệ');
  }
  return data;
}

/**
 * Tải tệp Excel xuất khẩu Sổ công nợ & Tuổi nợ từ Backend (S7-03)
 */
export async function downloadDebtLedgerExcel(
  params: DebtLedgerFilterParams = {}
): Promise<void> {
  const query = new URLSearchParams();
  if (params.keyword?.trim()) query.append('keyword', params.keyword.trim());
  if (params.salesRepId) query.append('salesRepId', String(params.salesRepId));
  if (params.bucket && params.bucket !== 'ALL') query.append('bucket', params.bucket);
  if (params.overdueOnly) query.append('overdueOnly', 'true');
  if (params.includeSettled) query.append('includeSettled', 'true');
  if (params.sort) query.append('sort', params.sort);

  const res = await authFetch(`${LEDGER_URL}/export?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || `Lỗi xuất file Excel sổ công nợ (mã lỗi ${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `So_Cong_No_Va_Tuoi_No_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
