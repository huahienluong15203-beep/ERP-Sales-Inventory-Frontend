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
      const rawList: any[] = await res.json();
      return rawList.map((item) => ({
        id: item.id,
        period: item.period,
        targetType: item.targetType,
        salesRepId: item.salesRepId,
        salesRepCode: item.salesRepCode || (item.salesRepId ? `NV-${item.salesRepId}` : ''),
        salesRepName: item.salesRepName || '',
        regionId: item.regionId,
        regionName: item.regionName || item.region || '',
        region: item.region || item.regionName || '',
        targetAmount: item.targetAmount != null ? Number(item.targetAmount) : 0,
        actualAmount: item.actualAmount != null ? Number(item.actualAmount) : 0,
        achievementPercent: item.achievementPercent != null ? Number(item.achievementPercent) : 0,
        completionRate: item.completionRate != null ? Number(item.completionRate) : (item.achievementPercent != null ? Number(item.achievementPercent) : 0),
        locked: Boolean(item.locked ?? item.isLocked),
        isLocked: Boolean(item.isLocked ?? item.locked),
        note: item.note || '',
        updatedAt: item.updatedAt,
        updatedBy: item.updatedByUsername || item.updatedBy
      }));
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
  const res = await authFetch(TARGET_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let msg = 'Lỗi khi thiết lập chỉ tiêu';
    try {
      const err = await res.json();
      msg = err.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const item = await res.json();
  return {
    ...item,
    region: item.region || item.regionName || '',
    salesRepCode: item.salesRepCode || (item.salesRepId ? `NV-${item.salesRepId}` : ''),
    completionRate: item.completionRate != null ? Number(item.completionRate) : (item.achievementPercent != null ? Number(item.achievementPercent) : 0),
    isLocked: Boolean(item.isLocked ?? item.locked)
  };
}

/**
 * Cập nhật chỉ tiêu (yêu cầu lý do theo AC3)
 */
export async function updateSalesTarget(
  id: number,
  payload: SalesTargetUpdateRequest
): Promise<SalesTargetResponse> {
  const res = await authFetch(`${TARGET_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let msg = 'Lỗi khi điều chỉnh chỉ tiêu';
    try {
      const err = await res.json();
      msg = err.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const item = await res.json();
  return {
    ...item,
    region: item.region || item.regionName || '',
    salesRepCode: item.salesRepCode || (item.salesRepId ? `NV-${item.salesRepId}` : ''),
    completionRate: item.completionRate != null ? Number(item.completionRate) : (item.achievementPercent != null ? Number(item.achievementPercent) : 0),
    isLocked: Boolean(item.isLocked ?? item.locked)
  };
}
