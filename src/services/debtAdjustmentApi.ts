import { authFetch, API_BASE_URL } from './api';
import type {
  DebtAdjustment,
  DebtAdjustmentFilterParams
} from '../types/debtAdjustment';

const DEBT_ADJUST_URL = `${API_BASE_URL}/api/debt-adjustments`;
const STORAGE_KEY = 'erp_debt_adjustments_v1';

function getStoredAdjustments(): DebtAdjustment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  const initial: DebtAdjustment[] = [
    {
      id: 1,
      adjustmentCode: 'CT-DC-202610-001',
      returnOrderCode: 'PTH-202610-05',
      originalInvoiceId: 101,
      originalInvoiceCode: 'HD-202610-008',
      originalInvoiceDate: '2026-10-02',
      customerId: 1,
      customerCode: 'DL-001',
      customerName: 'Đại lý Bia Nước Giải Khát Tuấn Hưng',
      customerPhone: '0912345678',
      customerAddress: 'Số 45 Cầu Giấy, Hà Nội',
      status: 'PENDING_APPROVAL',
      returnReason: 'Hàng bị móp méo vỏ lon trong quá trình vận chuyển, kho đã kiểm đếm và nhập lại kho',
      notes: 'Đại lý yêu cầu cấn trừ ngay vào công nợ tháng 10',
      totalAdjustmentAmount: 18500000,
      createdAt: '2026-10-14 09:30',
      createdBy: 'Trần Văn Kho',
      items: [
        {
          id: 11,
          productSku: 'SP-BIA-TIGER-330',
          productName: 'Bia Tiger Crystal 330ml',
          baseUnit: 'Thùng 24 lon',
          returnQuantity: 50,
          originalSoldPrice: 370000, // Giá lúc bán trên HĐ gốc
          currentCatalogPrice: 395000, // Giá hiện hành cao hơn nhưng bắt buộc cấn theo giá gốc
          adjustmentAmount: 18500000
        }
      ]
    },
    {
      id: 2,
      adjustmentCode: 'CT-DC-202610-002',
      returnOrderCode: 'PTH-202610-08',
      originalInvoiceId: 104,
      originalInvoiceCode: 'HD-202610-019',
      originalInvoiceDate: '2026-10-05',
      customerId: 2,
      customerCode: 'DL-002',
      customerName: 'Đại lý Thực phẩm & Bách hóa Mai Linh',
      customerPhone: '0987654321',
      customerAddress: 'Số 12 Quang Trung, Hà Đông, Hà Nội',
      status: 'APPROVED',
      returnReason: 'Đại lý đổi trả 20 thùng mì do giao nhầm vị sốt',
      notes: 'Đã duyệt giảm trừ công nợ thành công',
      totalAdjustmentAmount: 3200000,
      createdAt: '2026-10-12 14:15',
      createdBy: 'Lê Văn Kho',
      approvedAt: '2026-10-12 15:40',
      approvedBy: 'Kế toán trưởng',
      approvalNote: 'Đồng ý cấn trừ vào công nợ theo đúng giá bán ban đầu',
      items: [
        {
          id: 12,
          productSku: 'SP-OMACHI-BO',
          productName: 'Mì khoai tây Omachi xốt bò hầm 80g',
          baseUnit: 'Thùng 30 gói',
          returnQuantity: 20,
          originalSoldPrice: 160000,
          currentCatalogPrice: 175000,
          adjustmentAmount: 3200000
        }
      ]
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveStoredAdjustments(items: DebtAdjustment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Danh sách chứng từ điều chỉnh giảm trừ công nợ
 */
export async function fetchDebtAdjustments(
  params: DebtAdjustmentFilterParams = {}
): Promise<DebtAdjustment[]> {
  try {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.customerId && params.customerId !== 'ALL') query.set('customerId', params.customerId);
    const res = await authFetch(`${DEBT_ADJUST_URL}?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  let list = getStoredAdjustments();
  if (params.status && params.status !== 'ALL') {
    list = list.filter((i) => i.status === params.status);
  }
  if (params.customerId && params.customerId !== 'ALL') {
    list = list.filter((i) => String(i.customerId) === String(params.customerId));
  }
  if (params.keyword && params.keyword.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    list = list.filter(
      (i) =>
        i.adjustmentCode.toLowerCase().includes(kw) ||
        i.returnOrderCode.toLowerCase().includes(kw) ||
        i.originalInvoiceCode.toLowerCase().includes(kw) ||
        i.customerName.toLowerCase().includes(kw)
    );
  }
  return list;
}

/**
 * Phê duyệt chứng từ điều chỉnh (Kế toán công nợ duyệt - AC2, AC3, AC4)
 */
export async function approveDebtAdjustment(
  id: number,
  approvalNote: string,
  approverName: string = 'Kế toán công nợ'
): Promise<DebtAdjustment> {
  try {
    const res = await authFetch(`${DEBT_ADJUST_URL}/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvalNote })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const list = getStoredAdjustments();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Không tìm thấy chứng từ điều chỉnh');

  const updated: DebtAdjustment = {
    ...list[idx],
    status: 'APPROVED',
    approvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    approvedBy: approverName,
    approvalNote: approvalNote.trim() || 'Đã duyệt giảm trừ công nợ theo phiếu trả hàng'
  };

  list[idx] = updated;
  saveStoredAdjustments(list);

  // Tác động cập nhật ngay hạn mức khả dụng của đại lý (cấn trừ giảm nợ) theo AC3
  try {
    const creditKey = `erp_customer_credit_${updated.customerId}`;
    const rawCredit = localStorage.getItem(creditKey);
    if (rawCredit) {
      const creditObj = JSON.parse(rawCredit);
      creditObj.currentDebt = Math.max(0, (creditObj.currentDebt || 0) - updated.totalAdjustmentAmount);
      creditObj.availableCredit = Math.min(
        creditObj.creditLimit,
        (creditObj.availableCredit || 0) + updated.totalAdjustmentAmount
      );
      creditObj.overdueDebt = Math.max(0, (creditObj.overdueDebt || 0) - updated.totalAdjustmentAmount);
      localStorage.setItem(creditKey, JSON.stringify(creditObj));
    }
  } catch {
    // ignore
  }

  return updated;
}

/**
 * Từ chối chứng từ điều chỉnh
 */
export async function rejectDebtAdjustment(
  id: number,
  reason: string
): Promise<DebtAdjustment> {
  try {
    const res = await authFetch(`${DEBT_ADJUST_URL}/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const list = getStoredAdjustments();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Không tìm thấy chứng từ điều chỉnh');

  const updated: DebtAdjustment = {
    ...list[idx],
    status: 'REJECTED',
    approvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    approvalNote: `Từ chối: ${reason.trim()}`
  };

  list[idx] = updated;
  saveStoredAdjustments(list);
  return updated;
}
