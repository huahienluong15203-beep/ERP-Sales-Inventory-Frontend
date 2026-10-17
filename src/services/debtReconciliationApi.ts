import { authFetch, API_BASE_URL } from './api';
import type {
  PeriodicReconciliationStatement,
  CreateReconciliationParams
} from '../types/debtReconciliation';

const RECON_STORAGE_KEY = 'erp_periodic_reconciliations_v2';

const INITIAL_STATEMENTS: PeriodicReconciliationStatement[] = [
  {
    id: 1,
    statementCode: 'BB-DC-202610-001',
    customerId: 2,
    customerCode: 'DL-TN-THANHCONG',
    customerName: 'Công ty TNHH Water',
    customerAddress: 'Phường An Sinh, Thành phố Quảng Ninh',
    customerTaxCode: '1112223331',
    customerPhone: '0374668406',
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    statementDate: '2026-10-01',
    openingBalance: 0,
    totalDebit: 50222400,
    totalCredit: 0,
    closingBalance: 50222400,
    status: 'AGENCY_ACCEPTED',
    confirmedBy: 'Phạm Thị Kế Toán',
    confirmedAt: '2026-10-02 10:15',
    agencySignedBy: 'Nguyễn Văn Nước (Đại diện đại lý)',
    agencySignedAt: '2026-10-03 14:20',
    notes: 'Đối chiếu chốt công nợ tháng 09/2026 chuẩn xác, không có tranh chấp.',
    transactions: [
      {
        id: 101,
        date: '2026-09-10',
        code: 'HD2026-000002',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 1060800,
        credit: 0,
        balance: 1060800,
        notes: 'Hoá đơn GTGT số HD2026-000002'
      },
      {
        id: 102,
        date: '2026-09-20',
        code: 'DH-202609-002',
        type: 'INVOICE',
        typeLabel: 'Đơn hàng thực giao',
        debit: 49161600,
        credit: 0,
        balance: 50222400,
        notes: 'Đơn hàng giao đợt 2 theo hợp đồng'
      }
    ]
  },
  {
    id: 2,
    statementCode: 'BB-DC-202610-002',
    customerId: 3,
    customerCode: 'DN-HN-003',
    customerName: 'KhoMega',
    customerAddress: 'Phường An Hội Đông, Thành phố Hồ Chí Minh',
    customerTaxCode: '2222211111',
    customerPhone: '0374466840',
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    statementDate: '2026-10-02',
    openingBalance: 720000,
    totalDebit: 83666400,
    totalCredit: 0,
    closingBalance: 84386400,
    status: 'CONFIRMED',
    confirmedBy: 'Phạm Thị Kế Toán',
    confirmedAt: '2026-10-02 16:30',
    notes: 'Đã gửi biên bản lên cổng đại lý, chờ đại lý ký xác nhận điện tử.',
    transactions: [
      {
        id: 201,
        date: '2026-09-15',
        code: 'HD2026-000001',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 83666400,
        credit: 0,
        balance: 84386400,
        notes: 'Hoá đơn GTGT số HD2026-000001'
      }
    ]
  },
  {
    id: 3,
    statementCode: 'BB-DC-202610-003',
    customerId: 1,
    customerCode: 'DL-HN-001',
    customerName: 'Kho Đài Tư',
    customerAddress: 'Xóm Nhội, Xã Thành Công, Tỉnh Thái Nguyên',
    customerTaxCode: '1234567899',
    customerPhone: '0374668406',
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    statementDate: '2026-10-03',
    openingBalance: 35000000,
    totalDebit: 0,
    totalCredit: 35000000,
    closingBalance: 0,
    status: 'AGENCY_ACCEPTED',
    confirmedBy: 'Phạm Thị Kế Toán',
    confirmedAt: '2026-10-03 09:00',
    agencySignedBy: 'Trần Văn Đài (Đại diện đại lý)',
    agencySignedAt: '2026-10-04 11:30',
    notes: 'Đại lý đã thanh toán dứt điểm toàn bộ số dư nợ trong kỳ đối chiếu.',
    transactions: [
      {
        id: 301,
        date: '2026-09-28',
        code: 'PT2026-000001',
        type: 'PAYMENT',
        typeLabel: 'Phiếu thu ngân hàng',
        debit: 0,
        credit: 35000000,
        balance: 0,
        notes: 'Chuyển khoản thanh toán dứt điểm công nợ'
      }
    ]
  }
];

function getStoredStatements(): PeriodicReconciliationStatement[] {
  try {
    const raw = localStorage.getItem(RECON_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && !parsed.some(s => s.customerCode === 'DL-001' || s.customerCode === 'DL-002')) {
        return parsed;
      }
    }
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
