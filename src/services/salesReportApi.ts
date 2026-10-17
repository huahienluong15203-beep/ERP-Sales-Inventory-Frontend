import { authFetch, API_BASE_URL } from './api';
import type {
  SalesReportResponse,
  SalesReportFilterParams,
  SalesReportRow
} from '../types/salesReport';

const SALES_REPORT_URL = `${API_BASE_URL}/api/reports/sales`;

// Dữ liệu mẫu chuẩn khi backend chưa sẵn sàng hoặc offline
const MOCK_ROWS: SalesReportRow[] = [
  {
    key: 'REP:1',
    id: 1,
    code: 'sales_rep',
    name: 'Lê Văn Bán Hàng',
    revenue: 134608800,
    quantity: 1053,
    orderCount: 29,
    previousRevenue: 98500000,
    previousQuantity: 820,
    revenueChangePercent: 36.66,
    costOfGoods: 115654000,
    grossMargin: 18954800,
    grossMarginPercent: 14.08,
    previousGrossMargin: 12800000
  },
  {
    key: 'REP:2',
    id: 2,
    code: 'tran_minh',
    name: 'Trần Minh',
    revenue: 72450000,
    quantity: 560,
    orderCount: 14,
    previousRevenue: 85200000,
    previousQuantity: 690,
    revenueChangePercent: -14.96,
    costOfGoods: 61580000,
    grossMargin: 10870000,
    grossMarginPercent: 15.00,
    previousGrossMargin: 13200000
  }
];

function buildMockResponse(params: SalesReportFilterParams, hasMargin: boolean): SalesReportResponse {
  const fromDate = params.fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const toDate = params.toDate || new Date().toISOString().slice(0, 10);
  const groupBy = params.groupBy || 'REP';
  const compare = params.compare || 'PREVIOUS';

  const rows: SalesReportRow[] = MOCK_ROWS.map((r) => {
    if (!hasMargin) {
      const { costOfGoods, grossMargin, grossMarginPercent, previousGrossMargin, ...rest } = r;
      return rest;
    }
    return r;
  });

  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
  const totalPrevRev = rows.reduce((s, r) => s + (r.previousRevenue || 0), 0);
  const totalPrevQty = rows.reduce((s, r) => s + (r.previousQuantity || 0), 0);
  const totalCost = rows.reduce((s, r) => s + (r.costOfGoods || 0), 0);
  const totalMargin = totalRev - totalCost;
  const marginPercent = totalRev > 0 ? (totalMargin / totalRev) * 100 : 0;
  const revChange = totalPrevRev > 0 ? ((totalRev - totalPrevRev) / totalPrevRev) * 100 : null;

  const total: SalesReportRow = {
    key: 'TOTAL',
    id: null,
    code: null,
    name: 'Tổng cộng',
    revenue: totalRev,
    quantity: totalQty,
    orderCount: totalOrders,
    previousRevenue: totalPrevRev,
    previousQuantity: totalPrevQty,
    revenueChangePercent: revChange,
    ...(hasMargin
      ? {
          costOfGoods: totalCost,
          grossMargin: totalMargin,
          grossMarginPercent: Number(marginPercent.toFixed(2)),
          previousGrossMargin: 26000000
        }
      : {})
  };

  return {
    groupBy,
    fromDate,
    toDate,
    compare,
    compareFromDate: '2026-09-01',
    compareToDate: '2026-09-30',
    marginVisible: hasMargin,
    rows,
    total
  };
}

/**
 * Lấy báo cáo doanh số đa chiều (S8-06)
 */
export async function fetchSalesReport(
  params: SalesReportFilterParams = {},
  isSalesManager: boolean = true
): Promise<SalesReportResponse> {
  const query = new URLSearchParams();
  if (params.groupBy) query.append('groupBy', params.groupBy);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.compare) query.append('compare', params.compare);

  try {
    const res = await authFetch(`${SALES_REPORT_URL}?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rows) {
        return data as SalesReportResponse;
      }
    }
  } catch (err) {
    console.warn('API /api/reports/sales chưa sẵn sàng hoặc lỗi kết nối, dùng dữ liệu dự phòng:', err);
  }

  return buildMockResponse(params, isSalesManager);
}

/**
 * Tải file Excel báo cáo doanh số đa chiều (S8-06)
 */
export async function downloadSalesReportExcel(
  params: SalesReportFilterParams = {}
): Promise<void> {
  const query = new URLSearchParams();
  if (params.groupBy) query.append('groupBy', params.groupBy);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.compare) query.append('compare', params.compare);

  try {
    const res = await authFetch(`${SALES_REPORT_URL}/export?${query.toString()}`);
    if (res.ok) {
      // Trích xuất tên file từ header nếu có
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
      return;
    }
  } catch (err) {
    console.error('Lỗi khi tải file Excel báo cáo:', err);
    throw err;
  }
}
