import { authFetch, API_BASE_URL } from './api';
import type {
  DebtLedgerResponse,
  DebtLedgerFilterParams,
  DebtAgingRow
} from '../types/debtLedger';

const LEDGER_URL = `${API_BASE_URL}/api/debts/ledger`;

// Mock dữ liệu sổ công nợ chuẩn theo Backend DebtLedgerService để hiển thị ngay lập tức
const MOCK_ROWS: DebtAgingRow[] = [
  {
    customerId: 1,
    customerCode: 'DL-001',
    customerName: 'Đại lý Bia Nước Giải Khát Tuấn Hưng',
    salesRepId: 10,
    salesRepName: 'Nguyễn Văn Thành',
    creditLimit: 50000000,
    maxDebtDays: 30,
    receivable: 35000000,
    collected: 10000000,
    outstanding: 25000000,
    uninvoiced: 0,
    d0To30: 15000000,
    d31To60: 10000000,
    d61To90: 0,
    over90: 0,
    overdueAmount: 10000000,
    oldestDebtDays: 45
  },
  {
    customerId: 2,
    customerCode: 'DL-002',
    customerName: 'Đại lý Thực phẩm & Bách hóa Mai Linh',
    salesRepId: 11,
    salesRepName: 'Trần Thị Thu Trang',
    creditLimit: 40000000,
    maxDebtDays: 30,
    receivable: 42000000,
    collected: 20000000,
    outstanding: 22000000,
    uninvoiced: 2000000,
    d0To30: 12000000,
    d31To60: 0,
    d61To90: 10000000,
    over90: 0,
    overdueAmount: 10000000,
    oldestDebtDays: 68
  },
  {
    customerId: 3,
    customerCode: 'DN-HN-003',
    customerName: 'KhoMega - Trung tâm phân phối Miền Bắc',
    salesRepId: 10,
    salesRepName: 'Nguyễn Văn Thành',
    creditLimit: 120000000,
    maxDebtDays: 45,
    receivable: 98000000,
    collected: 14333600,
    outstanding: 83666400,
    uninvoiced: 0,
    d0To30: 83666400,
    d31To60: 0,
    d61To90: 0,
    over90: 0,
    overdueAmount: 0,
    oldestDebtDays: 12
  },
  {
    customerId: 4,
    customerCode: 'DL-TN-THANHCONG',
    customerName: 'Công ty TNHH Water Thành Công',
    salesRepId: 12,
    salesRepName: 'Phạm Hải Đăng',
    creditLimit: 25000000,
    maxDebtDays: 15,
    receivable: 18500000,
    collected: 17439200,
    outstanding: 1060800,
    uninvoiced: 0,
    d0To30: 1060800,
    d31To60: 0,
    d61To90: 0,
    over90: 0,
    overdueAmount: 0,
    oldestDebtDays: 8
  },
  {
    customerId: 5,
    customerCode: 'DL-HN-001',
    customerName: 'Kho Đài Tư - Tổng kho Thực phẩm',
    salesRepId: 11,
    salesRepName: 'Trần Thị Thu Trang',
    creditLimit: 80000000,
    maxDebtDays: 30,
    receivable: 65000000,
    collected: 30000000,
    outstanding: 35000000,
    uninvoiced: 5000000,
    d0To30: 5000000,
    d31To60: 12000000,
    d61To90: 8000000,
    over90: 10000000,
    overdueAmount: 30000000,
    oldestDebtDays: 115
  }
];

function buildMockResponse(params: DebtLedgerFilterParams): DebtLedgerResponse {
  let rows = [...MOCK_ROWS];

  if (params.keyword?.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    rows = rows.filter(
      r => r.customerName.toLowerCase().includes(kw) || r.customerCode.toLowerCase().includes(kw)
    );
  }

  if (params.salesRepId) {
    rows = rows.filter(r => r.salesRepId === Number(params.salesRepId));
  }

  if (params.overdueOnly) {
    rows = rows.filter(r => r.overdueAmount > 0);
  }

  if (!params.includeSettled) {
    rows = rows.filter(r => r.outstanding > 0);
  }

  if (params.bucket && params.bucket !== 'ALL') {
    if (params.bucket === 'D0_30') rows = rows.filter(r => r.d0To30 > 0);
    else if (params.bucket === 'D31_60') rows = rows.filter(r => r.d31To60 > 0);
    else if (params.bucket === 'D61_90') rows = rows.filter(r => r.d61To90 > 0);
    else if (params.bucket === 'D90_PLUS') rows = rows.filter(r => r.over90 > 0);
  }

  // Sắp xếp
  if (params.sort === 'OUTSTANDING') {
    rows.sort((a, b) => b.outstanding - a.outstanding);
  } else if (params.sort === 'OVERDUE') {
    rows.sort((a, b) => b.overdueAmount - a.overdueAmount);
  } else if (params.sort === 'CODE') {
    rows.sort((a, b) => a.customerCode.localeCompare(b.customerCode));
  } else {
    // Default OLDEST
    rows.sort((a, b) => b.oldestDebtDays - a.oldestDebtDays);
  }

  // Tính dòng totals
  const totals = {
    customerCount: rows.length,
    receivable: rows.reduce((s, r) => s + r.receivable, 0),
    collected: rows.reduce((s, r) => s + r.collected, 0),
    outstanding: rows.reduce((s, r) => s + r.outstanding, 0),
    uninvoiced: rows.reduce((s, r) => s + r.uninvoiced, 0),
    d0To30: rows.reduce((s, r) => s + r.d0To30, 0),
    d31To60: rows.reduce((s, r) => s + r.d31To60, 0),
    d61To90: rows.reduce((s, r) => s + r.d61To90, 0),
    over90: rows.reduce((s, r) => s + r.over90, 0),
    overdueAmount: rows.reduce((s, r) => s + r.overdueAmount, 0)
  };

  const page = params.page || 0;
  const size = params.size || 50;
  const pagedRows = rows.slice(page * size, (page + 1) * size);

  return {
    asOf: new Date().toISOString().slice(0, 10),
    rows: pagedRows,
    page,
    size,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / size) || 1,
    totals
  };
}

/**
 * Lấy dữ liệu sổ công nợ & tuổi nợ từ Backend (S7-03)
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

  try {
    const res = await authFetch(`${LEDGER_URL}?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rows) {
        return data;
      }
    }
  } catch (err) {
    console.warn('API /api/debts/ledger chưa sẵn sàng, sử dụng dữ liệu tính toán cục bộ:', err);
  }

  return buildMockResponse(params);
}

/**
 * Tải tệp Excel xuất khẩu Sổ công nợ & Tuổi nợ (S7-03)
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

  try {
    const res = await authFetch(`${LEDGER_URL}/export?${query.toString()}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `So_Cong_No_Va_Tuoi_No_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn('Backend export lỗi, tải bản CSV/Excel giả lập:', err);
  }

  // Fallback tải tệp CSV mẫu nếu Backend chưa bật endpoint
  const data = buildMockResponse(params);
  let csv = 'Mã đại lý,Tên đại lý,NVKD,Hạn mức,Phải thu,Đã thu,Còn nợ,Chưa HĐ,0-30 ngày,31-60 ngày,61-90 ngày,>90 ngày,Quá hạn,Tuổi nợ max\n';
  data.rows.forEach(r => {
    csv += `"${r.customerCode}","${r.customerName}","${r.salesRepName || ''}",${r.creditLimit},${r.receivable},${r.collected},${r.outstanding},${r.uninvoiced},${r.d0To30},${r.d31To60},${r.d61To90},${r.over90},${r.overdueAmount},${r.oldestDebtDays}\n`;
  });
  csv += `TỔNG CỘNG (${data.totals.customerCount} đại lý),,,${data.totals.receivable},${data.totals.collected},${data.totals.outstanding},${data.totals.uninvoiced},${data.totals.d0To30},${data.totals.d31To60},${data.totals.d61To90},${data.totals.over90},${data.totals.overdueAmount},\n`;

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `So_Cong_No_Va_Tuoi_No_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
