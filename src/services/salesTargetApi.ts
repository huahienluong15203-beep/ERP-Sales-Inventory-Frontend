import { authFetch, API_BASE_URL } from './api';
import type {
  SalesTargetResponse,
  MySalesProgressResponse,
  SalesTargetCreateRequest,
  SalesTargetUpdateRequest
} from '../types/salesTarget';

const TARGET_URL = `${API_BASE_URL}/api/sales-targets`;

const STORAGE_KEY = 'erp_sales_targets_v1';

// Dọn dẹp dữ liệu mock cũ nếu còn lưu trong localStorage trình duyệt
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && raw.includes('Nguyễn Văn Minh (NVKD)')) {
    localStorage.removeItem(STORAGE_KEY);
  }
} catch {
  // ignore
}

function getStoredTargets(): SalesTargetResponse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
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
 * Trả về null nếu chưa được giao chỉ tiêu hoặc không có dữ liệu
 */
export async function fetchMySalesProgress(
  period?: string
): Promise<MySalesProgressResponse | null> {
  const currentMonth = period || new Date().toISOString().slice(0, 7);
  try {
    const query = new URLSearchParams();
    query.set('period', currentMonth);
    const res = await authFetch(`${TARGET_URL}/my-progress?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (!data) return null;

      const targetAmount = data.targetAmount != null ? Number(data.targetAmount) : 0;
      // Nếu backend trả về targetAmount là null hoặc <= 0, tức là chưa được giao chỉ tiêu
      if (targetAmount <= 0) {
        return null;
      }

      const actualAmount = data.actualAmount != null ? Number(data.actualAmount) : 0;
      const rate = data.achievementPercent != null
        ? Number(data.achievementPercent)
        : (data.completionRate != null
            ? Number(data.completionRate)
            : Math.round((actualAmount / targetAmount) * 1000) / 10);
      const remaining = data.remainingAmount != null
        ? Number(data.remainingAmount)
        : Math.max(0, targetAmount - actualAmount);

      const daysRemaining = (data.daysInMonth && data.daysElapsed !== undefined)
        ? Math.max(0, data.daysInMonth - data.daysElapsed)
        : (() => {
            const now = new Date();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            return Math.max(0, lastDay - now.getDate());
          })();

      return {
        period: data.period || currentMonth,
        targetAmount,
        actualAmount,
        completionRate: rate,
        remainingAmount: remaining,
        daysRemainingInMonth: data.daysRemainingInMonth ?? daysRemaining,
        salesRepName: data.salesRepName || ''
      };
    }
  } catch {
    // fallback
  }

  // Fallback từ localStorage nếu offline (chỉ trả về khi thực sự có chỉ tiêu đã lưu)
  const list = getStoredTargets();
  const mine = list.find((i) => i.period === currentMonth && i.targetType === 'REP');
  if (mine && mine.targetAmount > 0) {
    const target = mine.targetAmount;
    const actual = mine.actualAmount || 0;
    const rate = Math.round((actual / target) * 1000) / 10;
    const remaining = Math.max(0, target - actual);
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
      salesRepName: mine.salesRepName || ''
    };
  }

  // Không có chỉ tiêu -> trả về null, tuyệt đối không tạo dữ liệu ảo
  return null;
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
    salesRepCode: payload.salesRepId ? `NVKD-${payload.salesRepId}` : undefined,
    salesRepName: payload.salesRepId ? `Nhân viên #${payload.salesRepId}` : undefined,
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
