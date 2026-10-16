import { authFetch, API_BASE_URL } from './api';
import type {
  PeriodicReconciliationStatement,
  CreateReconciliationParams
} from '../types/debtReconciliation';

const RECON_STORAGE_KEY = 'erp_periodic_reconciliations_v1';

const INITIAL_STATEMENTS: PeriodicReconciliationStatement[] = [
  {
    id: 1,
    statementCode: 'BB-DC-202610-001',
    customerId: 1,
    customerCode: 'DL-001',
    customerName: 'Đại lý Bia Nước Giải Khát Tuấn Hưng',
    customerAddress: 'Số 45 Cầu Giấy, Hà Nội',
    customerTaxCode: '0101234567',
    customerPhone: '0912345678',
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    statementDate: '2026-10-01',
    openingBalance: 15000000,
    totalDebit: 45000000,
    totalCredit: 35000000,
    closingBalance: 25000000,
    status: 'AGENCY_ACCEPTED',
    confirmedBy: 'Kế toán trưởng',
    confirmedAt: '2026-10-02 10:15',
    agencySignedBy: 'Phạm Tuấn Hưng (Chủ đại lý)',
    agencySignedAt: '2026-10-03 14:20',
    notes: 'Đối chiếu chốt công nợ tháng 09/2026 chuẩn xác, không có tranh chấp.',
    transactions: [
      {
        id: 101,
        date: '2026-09-05',
        code: 'HD-202609-012',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 25000000,
        credit: 0,
        balance: 40000000,
        notes: 'Xuất 100 thùng bia Tiger'
      },
      {
        id: 102,
        date: '2026-09-12',
        code: 'PT-202609-045',
        type: 'PAYMENT',
        typeLabel: 'Phiếu thu tiền tuyến',
        debit: 0,
        credit: 20000000,
        balance: 20000000,
        notes: 'Chuyển khoản thanh toán đợt 1'
      },
      {
        id: 103,
        date: '2026-09-20',
        code: 'HD-202609-088',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 20000000,
        credit: 0,
        balance: 40000000,
        notes: 'Xuất 80 két bia Heineken'
      },
      {
        id: 104,
        date: '2026-09-25',
        code: 'PT-202609-102',
        type: 'PAYMENT',
        typeLabel: 'Phiếu thu tiền tuyến',
        debit: 0,
        credit: 15000000,
        balance: 25000000,
        notes: 'Thanh toán tiền mặt cho NV giao hàng'
      }
    ]
  },
  {
    id: 2,
    statementCode: 'BB-DC-202610-002',
    customerId: 2,
    customerCode: 'DL-002',
    customerName: 'Đại lý Thực phẩm & Bách hóa Mai Linh',
    customerAddress: 'Số 120 Đường Láng, Đống Đa, Hà Nội',
    customerTaxCode: '0109876543',
    customerPhone: '0987654321',
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    statementDate: '2026-10-02',
    openingBalance: 10000000,
    totalDebit: 32000000,
    totalCredit: 20000000,
    closingBalance: 22000000,
    status: 'CONFIRMED',
    confirmedBy: 'Phạm Thị Kế Toán',
    confirmedAt: '2026-10-02 16:30',
    notes: 'Đã gửi biên bản lên cổng đại lý, chờ đại lý ký xác nhận điện tử.',
    transactions: [
      {
        id: 201,
        date: '2026-09-08',
        code: 'HD-202609-030',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 32000000,
        credit: 0,
        balance: 42000000,
        notes: 'Cung cấp thực phẩm khô & nước ngọt'
      },
      {
        id: 202,
        date: '2026-09-22',
        code: 'PT-202609-090',
        type: 'PAYMENT',
        typeLabel: 'Phiếu thu tiền mặt',
        debit: 0,
        credit: 20000000,
        balance: 22000000,
        notes: 'Thu tiền mặt tại quầy'
      }
    ]
  },
  {
    id: 3,
    statementCode: 'BB-DC-202610-003',
    customerId: 5,
    customerCode: 'DL-HN-001',
    customerName: 'Kho Đài Tư - Tổng kho Thực phẩm',
    customerAddress: 'Xóm Nhội, Xã Thành Công, Thái Nguyên',
    customerTaxCode: '1234567899',
    customerPhone: '0933221100',
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    statementDate: '2026-10-03',
    openingBalance: 20000000,
    totalDebit: 45000000,
    totalCredit: 30000000,
    closingBalance: 35000000,
    status: 'AGENCY_DISPUTED',
    confirmedBy: 'Phạm Thị Kế Toán',
    confirmedAt: '2026-10-03 09:00',
    agencySignedBy: 'Vũ Đức Thành',
    agencySignedAt: '2026-10-04 11:30',
    agencyFeedback: 'Hóa đơn ngày 20/09 bên tôi trả lại 5 thùng nước khoáng chưa được cấn trừ vào số dư này, đề nghị kế toán kiểm tra lại biên bản giảm trừ.',
    notes: 'Đang phối hợp với thủ kho kiểm tra phiếu trả hàng PTH-202609-15.',
    transactions: [
      {
        id: 301,
        date: '2026-09-10',
        code: 'HD-202609-041',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 45000000,
        credit: 0,
        balance: 65000000
      },
      {
        id: 302,
        date: '2026-09-28',
        code: 'PT-202609-115',
        type: 'PAYMENT',
        typeLabel: 'Phiếu thu tiền ngân hàng',
        debit: 0,
        credit: 30000000,
        balance: 35000000
      }
    ]
  }
];

function getStoredStatements(): PeriodicReconciliationStatement[] {
  try {
    const raw = localStorage.getItem(RECON_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  localStorage.setItem(RECON_STORAGE_KEY, JSON.stringify(INITIAL_STATEMENTS));
  return INITIAL_STATEMENTS;
}

function saveStatements(list: PeriodicReconciliationStatement[]) {
  localStorage.setItem(RECON_STORAGE_KEY, JSON.stringify(list));
}

export async function fetchReconciliationStatements(
  params?: { customerId?: number; status?: string }
): Promise<PeriodicReconciliationStatement[]> {
  try {
    const query = new URLSearchParams();
    if (params?.customerId) query.append('customerId', String(params.customerId));
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);

    const res = await authFetch(`${API_BASE_URL}/api/debts/reconciliation?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    // Fallback to local storage
  }

  let list = getStoredStatements();
  if (params?.customerId) {
    list = list.filter(s => s.customerId === Number(params.customerId));
  }
  if (params?.status && params.status !== 'ALL') {
    list = list.filter(s => s.status === params.status);
  }
  return list;
}

export async function createReconciliationStatement(
  params: CreateReconciliationParams,
  customerInfo: { code: string; name: string; address?: string; taxCode?: string; phone?: string },
  initialOpeningBalance: number = 0,
  transactions: any[] = []
): Promise<PeriodicReconciliationStatement> {
  const list = getStoredStatements();
  const nextId = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
  const seq = String(nextId).padStart(3, '0');
  const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 6);
  const code = `BB-DC-${nowStr}-${seq}`;

  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const closingBalance = initialOpeningBalance + totalDebit - totalCredit;

  const newStatement: PeriodicReconciliationStatement = {
    id: nextId,
    statementCode: code,
    customerId: params.customerId,
    customerCode: customerInfo.code,
    customerName: customerInfo.name,
    customerAddress: customerInfo.address,
    customerTaxCode: customerInfo.taxCode,
    customerPhone: customerInfo.phone,
    fromDate: params.fromDate,
    toDate: params.toDate,
    statementDate: params.statementDate,
    openingBalance: initialOpeningBalance,
    totalDebit,
    totalCredit,
    closingBalance,
    status: 'CONFIRMED',
    confirmedBy: 'Kế toán công nợ',
    confirmedAt: new Date().toLocaleString('vi-VN'),
    notes: params.notes,
    transactions: transactions.map((t, idx) => ({
      id: idx + 1,
      date: t.date || params.statementDate,
      code: t.code || `GD-${idx + 1}`,
      type: t.type || 'INVOICE',
      typeLabel: t.typeLabel || 'Phát sinh trong kỳ',
      debit: t.debit || 0,
      credit: t.credit || 0,
      balance: t.balance || 0,
      notes: t.notes || ''
    }))
  };

  list.unshift(newStatement);
  saveStatements(list);
  return newStatement;
}

export async function confirmReconciliationStatement(
  id: number
): Promise<PeriodicReconciliationStatement> {
  const list = getStoredStatements();
  const item = list.find(s => s.id === id);
  if (!item) throw new Error('Không tìm thấy biên bản đối chiếu');

  item.status = 'CONFIRMED';
  item.confirmedAt = new Date().toLocaleString('vi-VN');
  item.confirmedBy = 'Kế toán công nợ';

  saveStatements(list);
  return item;
}

export async function agencyRespondStatement(
  id: number,
  status: 'AGENCY_ACCEPTED' | 'AGENCY_DISPUTED',
  feedback?: string,
  signerName?: string
): Promise<PeriodicReconciliationStatement> {
  const list = getStoredStatements();
  const item = list.find(s => s.id === id);
  if (!item) throw new Error('Không tìm thấy biên bản đối chiếu');

  item.status = status;
  item.agencySignedAt = new Date().toLocaleString('vi-VN');
  item.agencySignedBy = signerName || 'Đại diện đại lý';
  if (feedback?.trim()) {
    item.agencyFeedback = feedback.trim();
  }

  saveStatements(list);
  return item;
}
