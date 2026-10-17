import { authFetch, API_BASE_URL } from './api';
import type {
  ExecutiveDashboardOverview,
  ExecutiveDashboardSummary,
  ExecutiveDailySales,
  ExecutiveRegionSales,
  ExecutiveOverdueAgencies
} from '../types/dashboard';

const BASE_URL = `${API_BASE_URL}/api/dashboard/executive`;

/**
 * Tải toàn bộ dữ liệu Dashboard điều hành bán hàng & kho trong 1 API duy nhất (< 2 giây)
 */
export async function fetchExecutiveDashboardOverview(
  month?: number,
  year?: number,
  limit: number = 10,
  refresh: boolean = false
): Promise<ExecutiveDashboardOverview> {
  const query = new URLSearchParams();
  if (month !== undefined) query.append('month', String(month));
  if (year !== undefined) query.append('year', String(year));
  query.append('limit', String(limit));
  if (refresh) query.append('refresh', 'true');

  const res = await authFetch(`${BASE_URL}/overview?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải dữ liệu Dashboard điều hành');
  }
  return await res.json();
}

/**
 * Thẻ chỉ số tổng quan bán hàng & kho
 */
export async function fetchExecutiveSummary(refresh: boolean = false): Promise<ExecutiveDashboardSummary> {
  const query = new URLSearchParams();
  if (refresh) query.append('refresh', 'true');

  const res = await authFetch(`${BASE_URL}/summary?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải chỉ số tổng quan');
  }
  return await res.json();
}

/**
 * Biểu đồ doanh số theo từng ngày trong tháng (hỗ trợ lọc Tháng/Năm)
 */
export async function fetchDailySales(
  month?: number,
  year?: number,
  refresh: boolean = false
): Promise<ExecutiveDailySales> {
  const query = new URLSearchParams();
  if (month !== undefined) query.append('month', String(month));
  if (year !== undefined) query.append('year', String(year));
  if (refresh) query.append('refresh', 'true');

  const res = await authFetch(`${BASE_URL}/daily-sales?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải doanh số theo ngày');
  }
  return await res.json();
}

/**
 * Biểu đồ doanh số theo khu vực
 */
export async function fetchRegionSales(
  month?: number,
  year?: number,
  refresh: boolean = false
): Promise<ExecutiveRegionSales> {
  const query = new URLSearchParams();
  if (month !== undefined) query.append('month', String(month));
  if (year !== undefined) query.append('year', String(year));
  if (refresh) query.append('refresh', 'true');

  const res = await authFetch(`${BASE_URL}/region-sales?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải doanh số theo khu vực');
  }
  return await res.json();
}

/**
 * Danh sách đại lý quá hạn công nợ xếp theo số tiền nợ giảm dần
 */
export async function fetchOverdueAgencies(
  limit: number = 10,
  refresh: boolean = false
): Promise<ExecutiveOverdueAgencies> {
  const query = new URLSearchParams();
  query.append('limit', String(limit));
  if (refresh) query.append('refresh', 'true');

  const res = await authFetch(`${BASE_URL}/overdue-agencies?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể tải danh sách đại lý nợ quá hạn');
  }
  return await res.json();
}

/**
 * Làm mới bộ nhớ đệm (Cache) thủ công
 */
export async function refreshDashboardCache(): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(`${BASE_URL}/refresh-cache`, {
    method: 'POST'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể làm mới bộ đệm');
  }
  return await res.json();
}
