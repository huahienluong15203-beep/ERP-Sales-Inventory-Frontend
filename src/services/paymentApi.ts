import { authFetch, API_BASE_URL } from './api';
import { fetchCustomerCreditStatus } from './agencyApi';
import { fetchPortalCreditStatus as fetchCustomerPortalCreditStatus } from './portalApi';
import type {
  PaymentReceipt,
  PaymentReceiptCreateRequest,
  RouteCashCollectionRequest,
  PaymentFilterParams,
  PaymentReceiptPageResponse,
  CustomerInvoiceDebtItem,
  InvoicePaymentAllocation
} from '../types/payment';
import type { InvoiceSummaryResponse } from '../types/invoice';

export { fetchCustomerCreditStatus, fetchCustomerPortalCreditStatus };

const PAYMENT_STORAGE_KEY = 'erp_payment_receipts_v1';
const INVOICE_PAYMENT_STATE_KEY = 'erp_invoice_payment_allocations_v1';

function getLocalReceipts(): PaymentReceipt[] {
  try {
    const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
    if (!raw) {
      // Dữ liệu mẫu ban đầu cho phiếu thu và nộp quỹ
      const demo: PaymentReceipt[] = [
        {
          id: 1,
          code: 'PT2026-000001',
          customerId: 1,
          customerCode: 'DL-HN-001',
          customerName: 'Đại lý Bia Nước Ngọt Minh Phát',
          customerAddress: 'Số 45 Cầu Giấy, Q. Cầu Giấy, Hà Nội',
          amount: 50000000,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
          collectorName: 'Phạm Thị Kế Toán',
          collectorUsername: 'accountant',
          notes: 'Thanh toán đợt 1 tiền hàng tháng 10 qua Vietcombank',
          status: 'CONFIRMED',
          allocationType: 'FIFO',
          allocations: [
            {
              invoiceId: 1,
              invoiceCode: 'HD2026-000001',
              allocatedAmount: 50000000,
              invoiceTotal: 120000000,
              remainingBefore: 120000000,
              remainingAfter: 70000000
            }
          ],
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          id: 2,
          code: 'PT2026-000002',
          customerId: 2,
          customerCode: 'DL-HN-002',
          customerName: 'Đại Lý Tạp Hóa Thành Công',
          customerAddress: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
          amount: 15000000,
          paymentMethod: 'CASH',
          paymentDate: new Date().toISOString().slice(0, 10),
          collectorName: 'Lê Văn Bán Hàng',
          collectorUsername: 'sales_rep',
          notes: 'Thu tiền mặt tại điểm bán của đại lý trên tuyến',
          status: 'PENDING_SUBMISSION',
          receiptImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60',
          allocationType: 'FIFO',
          allocations: [],
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(demo));
      return demo;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalReceipts(list: PaymentReceipt[]): void {
  try {
    localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Lỗi lưu danh sách phiếu thu vào localStorage:', err);
  }
}

function getLocalInvoiceAllocations(): Record<number, number> {
  try {
    const raw = localStorage.getItem(INVOICE_PAYMENT_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordInvoiceAllocations(allocations: InvoicePaymentAllocation[]): void {
  try {
    const state = getLocalInvoiceAllocations();
    for (const alloc of allocations) {
      state[alloc.invoiceId] = (state[alloc.invoiceId] || 0) + alloc.allocatedAmount;
    }
    localStorage.setItem(INVOICE_PAYMENT_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Lỗi lưu phân bổ hoá đơn:', err);
  }
}

/**
 * 1. Tải danh sách hoá đơn nợ của đại lý để đối trừ
 */
export async function fetchCustomerInvoicesForDebt(customerId: number | string): Promise<CustomerInvoiceDebtItem[]> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/invoices?customerId=${customerId}&size=100`);
    if (res.ok) {
      const data = await res.json();
      const content: InvoiceSummaryResponse[] = data.content || [];
      const allocationState = getLocalInvoiceAllocations();
      const today = new Date().toISOString().slice(0, 10);

      return content.map((inv) => {
        const total = Number(inv.totalAmount || 0);
        const alreadyPaid = allocationState[inv.id] || 0;
        const remaining = Math.max(0, total - alreadyPaid);
        const dueDate = inv.invoiceDate || today;
        const isOverdue = dueDate < today && remaining > 0;
        let overdueDays = 0;
        if (isOverdue) {
          const diffMs = new Date(today).getTime() - new Date(dueDate).getTime();
          overdueDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        let status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
        if (remaining <= 0) {
          status = 'PAID';
        } else if (alreadyPaid > 0) {
          status = 'PARTIALLY_PAID';
        }

        return {
          id: inv.id,
          code: inv.code,
          invoiceDate: inv.invoiceDate,
          dueDate,
          orderCodes: [],
          totalAmount: total,
          paidAmount: alreadyPaid,
          remainingAmount: remaining,
          status,
          isOverdue,
          overdueDays
        };
      });
    }
  } catch (err) {
    console.warn('Không tải được hoá đơn từ backend, dùng dữ liệu mặc định:', err);
  }

  // Dữ liệu mẫu nếu chưa có hoá đơn trên backend
  const allocationState = getLocalInvoiceAllocations();
  const demoInvoices: CustomerInvoiceDebtItem[] = [
    {
      id: 101,
      code: 'HD2026-000101',
      invoiceDate: '2026-10-01',
      dueDate: '2026-10-10',
      orderCodes: ['DH2610-0012'],
      totalAmount: 35000000,
      paidAmount: allocationState[101] || 0,
      remainingAmount: Math.max(0, 35000000 - (allocationState[101] || 0)),
      status: (allocationState[101] || 0) >= 35000000 ? 'PAID' : (allocationState[101] || 0) > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      isOverdue: true,
      overdueDays: 5
    },
    {
      id: 102,
      code: 'HD2026-000102',
      invoiceDate: '2026-10-08',
      dueDate: '2026-10-18',
      orderCodes: ['DH2610-0045'],
      totalAmount: 48000000,
      paidAmount: allocationState[102] || 0,
      remainingAmount: Math.max(0, 48000000 - (allocationState[102] || 0)),
      status: (allocationState[102] || 0) >= 48000000 ? 'PAID' : (allocationState[102] || 0) > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      isOverdue: false,
      overdueDays: 0
    }
  ];
  return demoInvoices;
}

/**
 * 2. Lấy danh sách phiếu thu (có lọc, phân trang)
 */
export async function fetchPaymentReceipts(params: PaymentFilterParams = {}): Promise<PaymentReceiptPageResponse> {
  try {
    const query = new URLSearchParams();
    if (params.customerId) query.set('customerId', String(params.customerId));
    if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);
    if (params.status) query.set('status', params.status);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.keyword) query.set('keyword', params.keyword);
    query.set('page', String(params.page || 0));
    query.set('size', String(params.size || 20));

    const res = await authFetch(`${API_BASE_URL}/api/payments?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback sang local storage
  }

  // Fallback Local Storage
  let items = getLocalReceipts();
  if (params.customerId) {
    items = items.filter((i) => i.customerId === Number(params.customerId));
  }
  if (params.paymentMethod && params.paymentMethod !== 'ALL') {
    items = items.filter((i) => i.paymentMethod === params.paymentMethod);
  }
  if (params.status && params.status !== 'ALL') {
    items = items.filter((i) => i.status === params.status);
  }
  if (params.keyword && params.keyword.trim()) {
    const q = params.keyword.toLowerCase().trim();
    items = items.filter(
      (i) =>
        i.code.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.customerCode.toLowerCase().includes(q) ||
        i.collectorName.toLowerCase().includes(q)
    );
  }

  const page = params.page || 0;
  const size = params.size || 20;
  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const content = items.slice(page * size, (page + 1) * size);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages
  };
}

/**
 * 3. Tạo phiếu thu ghi nhận thanh toán (hỗ trợ FIFO hoặc chỉ định hoá đơn)
 */
export async function createPaymentReceipt(
  request: PaymentReceiptCreateRequest,
  customerInfoOrUser?: { code?: string; name?: string; address?: string; phone?: string } | { username: string; fullName: string },
  currentUserParam?: { username: string; fullName: string }
): Promise<PaymentReceipt> {
  const customerInfo =
    customerInfoOrUser && 'code' in customerInfoOrUser
      ? (customerInfoOrUser as { code: string; name: string; address?: string; phone?: string })
      : { code: `DL-${request.customerId}`, name: `Đại lý #${request.customerId}` };

  const currentUser =
    currentUserParam ||
    (customerInfoOrUser && 'username' in customerInfoOrUser
      ? (customerInfoOrUser as { username: string; fullName: string })
      : { username: 'accountant', fullName: request.collectorName || 'Kế toán' });
  try {
    const res = await authFetch(`${API_BASE_URL}/api/payments`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback sang local storage
  }

  // Xử lý cấn trừ hoá đơn
  const invoices = await fetchCustomerInvoicesForDebt(request.customerId);
  const unpaidInvoices = invoices.filter((i) => i.remainingAmount > 0);
  let remainingMoney = request.amount;
  const allocations: InvoicePaymentAllocation[] = [];

  if (request.allocationType === 'SPECIFIC' && request.specificAllocations?.length) {
    for (const alloc of request.specificAllocations) {
      const inv = invoices.find((i) => i.id === alloc.invoiceId);
      if (inv && alloc.amount > 0) {
        const allocated = Math.min(alloc.amount, inv.remainingAmount);
        allocations.push({
          invoiceId: inv.id,
          invoiceCode: inv.code,
          allocatedAmount: allocated,
          invoiceTotal: inv.totalAmount,
          remainingBefore: inv.remainingAmount,
          remainingAfter: inv.remainingAmount - allocated
        });
      }
    }
  } else {
    // Thuật toán FIFO: sắp theo ngày hoá đơn cũ nhất cấn trừ trước
    const sorted = [...unpaidInvoices].sort((a, b) => (a.invoiceDate > b.invoiceDate ? 1 : -1));
    for (const inv of sorted) {
      if (remainingMoney <= 0) break;
      const allocated = Math.min(remainingMoney, inv.remainingAmount);
      allocations.push({
        invoiceId: inv.id,
        invoiceCode: inv.code,
        allocatedAmount: allocated,
        invoiceTotal: inv.totalAmount,
        remainingBefore: inv.remainingAmount,
        remainingAfter: inv.remainingAmount - allocated
      });
      remainingMoney -= allocated;
    }
  }

  // Ghi nhận trạng thái phân bổ hoá đơn
  recordInvoiceAllocations(allocations);

  const localList = getLocalReceipts();
  const nextSeq = localList.length + 1;
  const code = `PT2026-${String(nextSeq).padStart(6, '0')}`;

  const newReceipt: PaymentReceipt = {
    id: Date.now(),
    code,
    customerId: request.customerId,
    customerCode: customerInfo.code,
    customerName: customerInfo.name,
    customerAddress: customerInfo.address,
    customerPhone: customerInfo.phone,
    amount: request.amount,
    paymentMethod: request.paymentMethod,
    paymentDate: request.paymentDate,
    collectorName: request.collectorName || currentUser.fullName,
    collectorUsername: currentUser.username,
    notes: request.notes,
    status: 'CONFIRMED',
    confirmedAt: new Date().toISOString(),
    confirmedByUsername: currentUser.username,
    allocationType: request.allocationType,
    allocations,
    createdAt: new Date().toISOString()
  };

  localList.unshift(newReceipt);
  saveLocalReceipts(localList);

  return newReceipt;
}

/**
 * 4. NVKD ghi nhận thu tiền tại tuyến (kèm ảnh biên lai, trạng thái Chờ nộp)
 */
export async function submitRouteCashCollection(
  request: RouteCashCollectionRequest,
  customerInfo: { code: string; name: string; address?: string; phone?: string },
  currentUser: { username: string; fullName: string }
): Promise<PaymentReceipt> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/payments/route-collection`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback sang local storage
  }

  const localList = getLocalReceipts();
  const nextSeq = localList.length + 1;
  const code = `TT2026-${String(nextSeq).padStart(6, '0')}`;

  const newCollection: PaymentReceipt = {
    id: Date.now(),
    code,
    customerId: request.customerId,
    customerCode: customerInfo.code,
    customerName: customerInfo.name,
    customerAddress: customerInfo.address,
    customerPhone: customerInfo.phone,
    amount: request.amount,
    paymentMethod: request.paymentMethod,
    paymentDate: request.paymentDate,
    collectorName: currentUser.fullName,
    collectorUsername: currentUser.username,
    notes: request.notes,
    status: 'PENDING_SUBMISSION',
    receiptImageUrl: request.receiptImageBase64 || '',
    allocationType: 'FIFO',
    allocations: [],
    createdAt: new Date().toISOString()
  };

  localList.unshift(newCollection);
  saveLocalReceipts(localList);

  return newCollection;
}

export async function createRouteCashCollection(
  request: RouteCashCollectionRequest,
  currentUser: { id?: number; username: string; fullName: string },
  customerInfo?: { code: string; name: string; address?: string; phone?: string }
): Promise<PaymentReceipt> {
  return submitRouteCashCollection(
    request,
    {
      code: customerInfo?.code || `DL-${request.customerId}`,
      name: customerInfo?.name || `Đại lý #${request.customerId}`,
      address: customerInfo?.address,
      phone: customerInfo?.phone
    },
    currentUser
  );
}

/**
 * 5. Kế toán xác nhận đã nhận tiền nộp quỹ từ NVKD
 */
export async function confirmRouteCashCollection(
  receiptId: number | string,
  confirmedBy: { username: string; fullName: string }
): Promise<PaymentReceipt> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/payments/${receiptId}/confirm`, {
      method: 'POST'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const localList = getLocalReceipts();
  const index = localList.findIndex((r) => String(r.id) === String(receiptId));
  if (index === -1) {
    throw new Error('Không tìm thấy khoản thu để xác nhận');
  }

  const item = localList[index];
  item.status = 'CONFIRMED';
  item.confirmedAt = new Date().toISOString();
  item.confirmedByUsername = confirmedBy.username;

  // Thực hiện phân bổ hoá đơn tự động FIFO khi kế toán xác nhận nộp quỹ
  const invoices = await fetchCustomerInvoicesForDebt(item.customerId);
  const unpaid = invoices.filter((i) => i.remainingAmount > 0).sort((a, b) => (a.invoiceDate > b.invoiceDate ? 1 : -1));
  let remainingMoney = item.amount;
  const allocations: InvoicePaymentAllocation[] = [];

  for (const inv of unpaid) {
    if (remainingMoney <= 0) break;
    const allocated = Math.min(remainingMoney, inv.remainingAmount);
    allocations.push({
      invoiceId: inv.id,
      invoiceCode: inv.code,
      allocatedAmount: allocated,
      invoiceTotal: inv.totalAmount,
      remainingBefore: inv.remainingAmount,
      remainingAfter: inv.remainingAmount - allocated
    });
    remainingMoney -= allocated;
  }

  item.allocations = allocations;
  recordInvoiceAllocations(allocations);

  localList[index] = item;
  saveLocalReceipts(localList);

  return item;
}
