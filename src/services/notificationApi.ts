import { authFetch, API_BASE_URL } from './api';

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  notificationType: 'PAYMENT_DUE_SOON' | 'PAYMENT_OVERDUE' | 'ORDER_STATUS' | 'GENERAL';
  referenceType?: string;
  referenceId?: number;
  referenceCode?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

const NOTIF_URL = `${API_BASE_URL}/api/notifications`;

export async function fetchMyNotifications(page = 0, size = 20) {
  try {
    const res = await authFetch(`${NOTIF_URL}?page=${page}&size=${size}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Lỗi gọi API danh sách thông báo:', err);
  }
  return { content: [], totalElements: 0, totalPages: 0, number: 0 };
}

export async function fetchRecentNotifications(): Promise<NotificationItem[]> {
  try {
    const res = await authFetch(`${NOTIF_URL}/recent`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Lỗi gọi API thông báo gần đây:', err);
  }
  return [];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const res = await authFetch(`${NOTIF_URL}/unread-count`);
    if (res.ok) {
      const data: UnreadCountResponse = await res.json();
      return data.unreadCount || 0;
    }
  } catch (err) {
    console.warn('Lỗi gọi API đếm thông báo chưa đọc:', err);
  }
  return 0;
}

export async function markNotificationAsRead(id: number): Promise<boolean> {
  try {
    const res = await authFetch(`${NOTIF_URL}/${id}/read`, {
      method: 'PUT'
    });
    return res.ok;
  } catch (err) {
    console.warn('Lỗi đánh dấu đã đọc thông báo:', err);
    return false;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const res = await authFetch(`${NOTIF_URL}/read-all`, {
      method: 'PUT'
    });
    return res.ok;
  } catch (err) {
    console.warn('Lỗi đánh dấu đọc tất cả thông báo:', err);
    return false;
  }
}
