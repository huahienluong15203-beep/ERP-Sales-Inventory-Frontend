import { authFetch, API_BASE_URL } from './api';
import type {
  SalesTargetResponse,
  MySalesProgressResponse,
  SalesTargetCreateRequest,
  SalesTargetUpdateRequest
} from '../types/salesTarget';

const TARGET_URL = `${API_BASE_URL}/api/sales-targets`;

const STORAGE_KEY = 'erp_sales_targets_v1';

function getStoredTargets(): SalesTargetResponse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const prevPeriod = '2026-09';

  // Dữ liệu mẫu chuẩn nghiệp vụ
  const initial: SalesTargetResponse[] = [
    {
      id: 1,
      period: currentPeriod,
      targetType: 'REP',
      salesRepId: 101,
      salesRepCode: 'NVKD-01',
      salesRepName: 'Nguyễn Văn Minh (NVKD)',
      region: 'Miền Bắc',
      targetAmount: 500000000,
      actualAmount: 412500000,
      completionRate: 82.5,
      isLocked: false,
      note: 'Chỉ tiêu bán hàng kênh chuỗi và đại lý cấp 1'
    },
    {
      id: 2,
      period: currentPeriod,
      targetType: 'REP',
      salesRepId: 102,
      salesRepCode: 'NVKD-02',
      salesRepName: 'Trần Thị Thu Thảo',
      region: 'Miền Trung',
      targetAmount: 450000000,
      actualAmount: 295000000,
      completionRate: 65.6,
      isLocked: false,
      note: 'Phát triển tuyến đại lý mới khu vực Đà Nẵng'
    },
    {
      id: 3,
      period: currentPeriod,
      targetType: 'REP',
      salesRepId: 103,
      salesRepCode: 'NVKD-03',
      salesRepName: 'Lê Hoàng Nam',
      region: 'Miền Nam',
      targetAmount: 600000000,
      actualAmount: 630000000,
      completionRate: 105.0,
      isLocked: false,
      note: 'Vượt chỉ tiêu xuất sắc tháng này'
    },
    {
      id: 4,
      period: currentPeriod,
      targetType: 'REGION',
      region: 'Miền Bắc',
      targetAmount: 1800000000,
      actualAmount: 1540000000,
      completionRate: 85.6,
      isLocked: false,
      note: 'Toàn bộ thị trường các tỉnh phía Bắc'
    },
    {
      id: 5,
      period: currentPeriod,
      targetType: 'REGION',
      region: 'Miền Nam',
      targetAmount: 2200000000,
      actualAmount: 1980000000,
      completionRate: 90.0,
      isLocked: false,
      note: 'Khu vực TP.HCM và Đông Nam Bộ'
    },
    {
      id: 6,
      period: prevPeriod,
      targetType: 'REP',
      salesRepId: 101,
      salesRepCode: 'NVKD-01',
      salesRepName: 'Nguyễn Văn Minh (NVKD)',
      region: 'Miền Bắc',
      targetAmount: 450000000,
      actualAmount: 462000000,
      completionRate: 102.7,
      isLocked: true, // Đã qua kỳ thì khoá
      note: 'Kỳ tháng trước đã chốt số'
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveStoredTargets(items: SalesTargetResponse[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Danh sách chỉ tiêu KPI theo kỳ và loại
 */
export async function fetchSalesTargets(
  period?: string,
  type?: string
): Promise<SalesTargetResponse[]> {
  try {
    const query = new URLSearchParams();
    if (period) query.set('period', period);
    if (type && type !== 'ALL') query.set('type', type);
    const res = await authFetch(`${TARGET_URL}?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  let list = getStoredTargets();
  if (period) {
    list = list.filter((i) => i.period === period);
  }
  if (type && type !== 'ALL') {
    list = list.filter((i) => i.targetType === type);
  }
  return list;
}

/**
 * Xem tiến độ KPI của cá nhân (Sales Rep)
 */
export async function fetchMySalesProgress(
  period?: string
): Promise<MySalesProgressResponse> {
  const currentMonth = period || new Date().toISOString().slice(0, 7);
  try {
    const query = new URLSearchParams();
    query.set('period', currentMonth);
    const res = await authFetch(`${TARGET_URL}/my-progress?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const list = getStoredTargets();
  const mine = list.find((i) => i.period === currentMonth && i.targetType === 'REP') || list[0];
  const target = mine ? mine.targetAmount : 500000000;
  const actual = mine ? mine.actualAmount : 412500000;
  const rate = Math.round((actual / target) * 1000) / 10;
  const remaining = Math.max(0, target - actual);

  // Tính số ngày còn lại trong tháng
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, lastDay - now.getDate());

  return {
    period: currentMonth,
    targetAmount: target,
    actualAmount: actual,
    completionRate: rate,
    remainingAmount: remaining,
    daysRemainingInMonth: daysRemaining,
    salesRepName: mine?.salesRepName || 'Nguyễn Văn Minh'
  };
}

/**
 * Tạo mới chỉ tiêu tháng
 */
export async function createSalesTarget(
  payload: SalesTargetCreateRequest
): Promise<SalesTargetResponse> {
  try {
    const res = await authFetch(TARGET_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const list = getStoredTargets();
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const isPast = payload.period < currentPeriod;

  const newItem: SalesTargetResponse = {
    id: Date.now(),
    period: payload.period,
    targetType: payload.targetType,
    salesRepId: payload.salesRepId,
    salesRepCode: payload.salesRepId ? `NVKD-0${payload.salesRepId}` : undefined,
    salesRepName: payload.salesRepId === 101 ? 'Nguyễn Văn Minh' : payload.salesRepId === 102 ? 'Trần Thị Thu Thảo' : 'Lê Hoàng Nam',
    region: payload.region || 'Miền Bắc',
    targetAmount: payload.targetAmount,
    actualAmount: 0,
    completionRate: 0,
    isLocked: isPast,
    note: payload.note,
    updatedAt: new Date().toISOString()
  };

  list.unshift(newItem);
  saveStoredTargets(list);
  return newItem;
}

/**
 * Cập nhật chỉ tiêu (yêu cầu lý do theo AC3)
 */
export async function updateSalesTarget(
  id: number,
  payload: SalesTargetUpdateRequest
): Promise<SalesTargetResponse> {
  try {
    const res = await authFetch(`${TARGET_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const list = getStoredTargets();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Không tìm thấy chỉ tiêu cần sửa');

  const old = list[idx];
  const rate = Math.round((old.actualAmount / payload.targetAmount) * 1000) / 10;

  const updated: SalesTargetResponse = {
    ...old,
    targetAmount: payload.targetAmount,
    note: payload.note || old.note,
    completionRate: rate,
    updatedAt: new Date().toISOString(),
    updatedBy: `Sửa do: ${payload.reason}`
  };

  list[idx] = updated;
  saveStoredTargets(list);
  return updated;
}
