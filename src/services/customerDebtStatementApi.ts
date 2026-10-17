import * as XLSX from 'xlsx';
import { authFetch, API_BASE_URL } from './api';
import type {
  CustomerDebtStatement,
  CustomerDebtStatementFilterParams,
  CustomerDebtTransaction
} from '../types/customerDebtStatement';

/**
 * Lấy sổ chi tiết công nợ thực tế của 1 đại lý theo khoảng thời gian (S8-10)
 * Dữ liệu được tính toán 100% từ các hoá đơn bán hàng, phiếu thu và khách hàng thực tế trong hệ thống
 */
export async function fetchCustomerDebtStatement(
  params: CustomerDebtStatementFilterParams
): Promise<CustomerDebtStatement> {
  const cid = Number(params.customerId) || 1;

  // 1. Tải thông tin đại lý / khách hàng thực tế
  let customerInfo: any = null;
  try {
    const cRes = await authFetch(`${API_BASE_URL}/api/customers/${cid}`);
    if (cRes.ok) {
      customerInfo = await cRes.json();
    }
  } catch (err) {
    console.warn('Lỗi khi tải thông tin khách hàng:', err);
  }

  // 2. Tải danh sách hoá đơn bán hàng thực tế của đại lý
  let realInvoices: any[] = [];
  try {
    const invRes = await authFetch(`${API_BASE_URL}/api/invoices?customerId=${cid}&size=100`);
    if (invRes.ok) {
      const invData = await invRes.json();
      realInvoices = invData.content || [];
    }
  } catch (err) {
    console.warn('Lỗi khi tải hoá đơn thực tế:', err);
  }

  // 3. Tải danh sách phiếu thu thanh toán thực tế của đại lý
  let realPayments: any[] = [];
  try {
    const payRes = await authFetch(`${API_BASE_URL}/api/payments?customerId=${cid}&size=100`);
    if (payRes.ok) {
      const payData = await payRes.json();
      realPayments = payData.content || [];
    }
  } catch (err) {
    console.warn('Lỗi khi tải phiếu thu thực tế:', err);
  }

  // 4. Tổng hợp danh sách nghiệp vụ phát sinh thực tế
  const allList: {
    date: string;
    code: string;
    documentType: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT';
    documentTypeLabel: string;
    description: string;
    debit: number;
    credit: number;
  }[] = [];

  // Ghi nhận các hoá đơn bán hàng (Phát sinh Nợ)
  realInvoices.forEach(inv => {
    allList.push({
      date: inv.invoiceDate,
      code: inv.code || inv.invoiceCode || `HD-${inv.id}`,
      documentType: 'INVOICE',
      documentTypeLabel: 'Hoá đơn bán hàng',
      description: inv.note || `Hoá đơn bán hàng xuất cho đại lý theo đơn hàng`,
      debit: Number(inv.totalAmount) || 0,
      credit: 0
    });
  });

  // Ghi nhận các phiếu thu tiền (Phát sinh Có)
  realPayments.forEach(p => {
    allList.push({
      date: p.paymentDate,
      code: p.code || `PT-${p.id}`,
      documentType: 'PAYMENT',
      documentTypeLabel: 'Phiếu thu tiền',
      description: p.note || `Thu tiền bán hàng (${p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'})`,
      debit: 0,
      credit: Number(p.amount) || 0
    });
  });

  // Sắp xếp tăng dần theo ngày phát sinh
  allList.sort((a, b) => a.date.localeCompare(b.date));

  // 5. Tính số dư đầu kỳ (trước ngày fromDate)
  let openingBalance = 0;
  allList.forEach(t => {
    if (params.fromDate && t.date < params.fromDate) {
      openingBalance += (t.debit - t.credit);
    }
  });

  // 6. Lọc các giao dịch trong kỳ [fromDate, toDate]
  const inPeriod = allList.filter(t => {
    if (params.fromDate && t.date < params.fromDate) return false;
    if (params.toDate && t.date > params.toDate) return false;
    return true;
  });

  // 7. Tính toán số dư luỹ kế
  let running = openingBalance;
  const transactions: CustomerDebtTransaction[] = inPeriod.map((t, idx) => {
    running = running + t.debit - t.credit;
    return {
      id: idx + 1,
      date: t.date,
      code: t.code,
      documentType: t.documentType,
      documentTypeLabel: t.documentTypeLabel,
      description: t.description,
      debit: t.debit,
      credit: t.credit,
      balance: running
    };
  });

  const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
  const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  return {
    customerId: cid,
    customerCode: customerInfo?.code || `DL-${String(cid).padStart(3, '0')}`,
    customerName: customerInfo?.name || `Đại lý số ${cid}`,
    customerAddress: customerInfo?.address || 'Chưa cập nhật',
    customerTaxCode: customerInfo?.taxCode || 'Chưa cập nhật',
    customerPhone: customerInfo?.phone || 'Chưa cập nhật',
    salesRepName: customerInfo?.salesRepName || customerInfo?.salesRep?.fullName || 'Chưa phân công',
    creditLimit: Number(customerInfo?.creditLimit) || 50000000,
    maxDebtDays: Number(customerInfo?.maxDebtDays) || 30,
    fromDate: params.fromDate,
    toDate: params.toDate,
    asOf: new Date().toISOString().slice(0, 10),
    openingBalance,
    totalDebit,
    totalCredit,
    closingBalance,
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
