import { authFetch, API_BASE_URL } from './api';
import type {
  SalesReportResponse,
  SalesReportFilterParams
} from '../types/salesReport';

const SALES_REPORT_URL = `${API_BASE_URL}/api/reports/sales`;

/**
 * Lấy báo cáo doanh số đa chiều (S8-06) - 100% dữ liệu thật từ SQL Backend
 */
export async function fetchSalesReport(
  params: SalesReportFilterParams = {},
  _isSalesManager?: boolean
): Promise<SalesReportResponse> {
  const query = new URLSearchParams();
  if (params.groupBy) query.append('groupBy', params.groupBy);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.compare) query.append('compare', params.compare);

  const res = await authFetch(`${SALES_REPORT_URL}?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || `Lỗi tải báo cáo doanh số (mã lỗi ${res.status})`);
  }
  const data = await res.json();
  if (!data || !data.rows) {
    throw new Error('Định dạng dữ liệu báo cáo không hợp lệ');
  }
  return data as SalesReportResponse;
}

/**
 * Tải file Excel báo cáo doanh số đa chiều (S8-06) từ Backend
 */
export async function downloadSalesReportExcel(
  params: SalesReportFilterParams = {}
): Promise<void> {
  const query = new URLSearchParams();
  if (params.groupBy) query.append('groupBy', params.groupBy);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.compare) query.append('compare', params.compare);

  const res = await authFetch(`${SALES_REPORT_URL}/export?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || `Lỗi xuất file Excel báo cáo (mã lỗi ${res.status})`);
  }

  let filename = `BaoCaoDoanhSo_${params.groupBy || 'REP'}_${params.fromDate || ''}_${params.toDate || ''}.xlsx`;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (matches && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
