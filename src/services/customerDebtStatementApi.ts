import * as XLSX from 'xlsx';
import { authFetch, API_BASE_URL } from './api';
import type {
  CustomerDebtStatement,
  CustomerDebtStatementFilterParams,
  CustomerDebtTransaction
} from '../types/customerDebtStatement';

/**
 * Lấy sổ chi tiết công nợ thực tế của 1 đại lý theo khoảng thời gian (S8-10)
 * Dữ liệu được tính toán 100% từ Backend SQL theo hoá đơn bán hàng, phiếu thu và chứng từ giảm trừ
 */
export async function fetchCustomerDebtStatement(
  params: CustomerDebtStatementFilterParams
): Promise<CustomerDebtStatement> {
  const cid = Number(params.customerId) || 1;
  const query = new URLSearchParams();
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);

  // 1. Gọi trực tiếp API Backend S8-10 (/api/debts/customers/{cid}/statement)
  const res = await authFetch(`${API_BASE_URL}/api/debts/customers/${cid}/statement?${query.toString()}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Lỗi tải sổ chi tiết công nợ (mã lỗi ${res.status})`);
  }
  const data = await res.json();

  // 2. Tải thêm thông tin hạn mức của đại lý để hiển thị đầy đủ tiêu đề mẫu biểu
  let creditLimit = 50000000;
  let maxDebtDays = 30;
  let salesRepName = 'Chưa phân công';
  try {
    const cRes = await authFetch(`${API_BASE_URL}/api/customers/${cid}`);
    if (cRes.ok) {
      const cData = await cRes.json();
      creditLimit = Number(cData.creditLimit) || 50000000;
      maxDebtDays = Number(cData.maxDebtDays) || 30;
      salesRepName = cData.salesRepName || cData.salesRep?.fullName || 'Chưa phân công';
    }
  } catch {
    // ignore
  }

  // 3. Map danh sách dòng nghiệp vụ từ backend sang kiểu dữ liệu frontend
  const transactions: CustomerDebtTransaction[] = (data.entries || []).map((e: any, idx: number) => ({
    id: idx + 1,
    refId: e.refId,
    date: e.date,
    code: e.code,
    documentType: e.type,
    documentTypeLabel: e.typeLabel || (
      e.type === 'INVOICE'
        ? 'Hoá đơn bán hàng'
        : e.type === 'PAYMENT'
        ? 'Phiếu thu tiền'
        : e.type === 'ADJUSTMENT'
        ? 'Giảm trừ trả hàng'
        : 'Chứng từ công nợ'
    ),
    description: e.description || '',
    debit: Number(e.debit) || 0,
    credit: Number(e.credit) || 0,
    balance: Number(e.balance) || 0
  }));

  return {
    customerId: data.customerId ?? cid,
    customerCode: data.customerCode || `DL-${String(cid).padStart(3, '0')}`,
    customerName: data.customerName || `Đại lý số ${cid}`,
    customerAddress: data.customerAddress || 'Chưa cập nhật',
    customerTaxCode: data.customerTaxCode || 'Chưa cập nhật',
    customerPhone: data.customerPhone || 'Chưa cập nhật',
    salesRepName,
    creditLimit,
    maxDebtDays,
    fromDate: data.fromDate || params.fromDate,
    toDate: data.toDate || params.toDate,
    asOf: new Date().toISOString().slice(0, 10),
    openingBalance: Number(data.openingBalance) || 0,
    totalDebit: Number(data.totalDebit) || 0,
    totalCredit: Number(data.totalCredit) || 0,
    closingBalance: Number(data.closingBalance) || 0,
    transactions
  };
}

/**
 * Xuất file Excel Sổ chi tiết công nợ đại lý chuẩn Mẫu biểu Kế toán (S8-10)
 */
export function exportCustomerDebtStatementExcel(
  statement: CustomerDebtStatement
): void {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['CÔNG TY CỔ PHẦN PHÂN PHỐI TIÊU DÙNG TOÀN CẦU'],
    ['Tòa nhà Discovery, 302 Cầu Giấy, Hà Nội · MST: 0108888888 · SĐT: (024) 3888 9999'],
    [],
    ['SỔ CHI TIẾT CÔNG NỢ PHẢI THU KHÁCH HÀNG (TK 131)'],
    [`Từ ngày: ${statement.fromDate}  đến ngày: ${statement.toDate}`],
    [],
    [`Đại lý / Khách hàng: ${statement.customerName} (${statement.customerCode})`],
    [`Địa chỉ: ${statement.customerAddress || 'Chưa cập nhật'}  ·  MST: ${statement.customerTaxCode || 'Chưa cập nhật'}  ·  SĐT: ${statement.customerPhone || 'Chưa cập nhật'}`],
    [`Hạn mức tín dụng: ${statement.creditLimit.toLocaleString('vi-VN')} ₫  ·  Thời hạn nợ tối đa: ${statement.maxDebtDays} ngày  ·  NV phụ trách: ${statement.salesRepName}`],
    [],
    [
      'STT',
      'Ngày',
      'Số chứng từ',
      'Loại nghiệp vụ',
      'Diễn giải nội dung',
      'Phát sinh Nợ (₫)',
      'Phát sinh Có (₫)',
      'Số dư luỹ kế (₫)'
    ],
    [
      '#',
      statement.fromDate,
      'SỐ DƯ ĐẦU KỲ',
      'Đầu kỳ',
      `Số dư nợ công nợ tính đến trước ngày ${statement.fromDate}`,
      '',
      '',
      statement.openingBalance
    ]
  ];

  statement.transactions.forEach((t, i) => {
    titleRows.push([
      i + 1,
      t.date,
      t.code,
      t.documentTypeLabel,
      t.description,
      t.debit > 0 ? t.debit : '',
      t.credit > 0 ? t.credit : '',
      t.balance
    ]);
  });

  titleRows.push([
    '',
    '',
    '',
    '',
    'CỘNG PHÁT SINH TRONG KỲ',
    statement.totalDebit,
    statement.totalCredit,
    ''
  ]);

  titleRows.push([
    '',
    '',
    '',
    '',
    `SỐ DƯ CÔNG NỢ CUỐI KỲ (ĐẾN ${statement.toDate})`,
    '',
    '',
    statement.closingBalance
  ]);

  const ws = XLSX.utils.aoa_to_sheet(titleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'SoChiTietCongNo');

  XLSX.writeFile(
    wb,
    `so-chi-tiet-cong-no-${statement.customerCode}-${statement.fromDate}-den-${statement.toDate}.xlsx`
  );
}
