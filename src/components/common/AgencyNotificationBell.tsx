import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  RefreshCw,
  CheckCheck
} from 'lucide-react';
import {
  fetchRecentNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem
} from '../../services/notificationApi';

interface AgencyNotificationBellProps {
  onNavigateToDebt?: () => void;
}

export const AgencyNotificationBell: React.FC<AgencyNotificationBellProps> = ({
  onNavigateToDebt
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [count, items] = await Promise.all([
        fetchUnreadNotificationCount(),
        fetchRecentNotifications()
      ]);
      setUnreadCount(count);
      setNotifications(items);
    } catch (err) {
      console.warn('Lỗi tải thông báo chuông đại lý:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Tự động kiểm tra định kỳ mỗi 60 giây
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    const ok = await markAllNotificationsAsRead();
    if (ok) {
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    }
  };

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    setIsOpen(false);
    if (item.notificationType === 'PAYMENT_DUE_SOON' || item.notificationType === 'PAYMENT_OVERDUE') {
      if (onNavigateToDebt) {
        onNavigateToDebt();
      }
    }
  };

  const hasOverdue = notifications.some((n) => n.notificationType === 'PAYMENT_OVERDUE' && !n.isRead);

  return (
    <div className="relative" ref={containerRef}>
      {/* NÚT CHUÔNG */}
      <button
        type="button"
        id="btn-agency-notification-bell"
        aria-label="Thông báo nhắc hạn thanh toán"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
          isOpen
            ? 'bg-orange-50 border-orange-300 text-orange-600 shadow-xs'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-2xs'
        }`}
        title="Thông báo nhắc nợ & Hạn thanh toán"
      >
        <Bell size={18} className={hasOverdue ? 'text-rose-600 animate-pulse' : unreadCount > 0 ? 'text-orange-600' : ''} />

        {/* BADGE SỐ LƯỢNG CHƯA ĐỌC */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[18px]">
            {hasOverdue && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex items-center justify-center rounded-full h-4 min-w-[18px] px-1 text-[10px] font-black text-white shadow-xs ${
                hasOverdue ? 'bg-rose-600' : 'bg-orange-600'
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* POPUP DROPDOWN */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[400px] max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl border border-gray-200 bg-white text-gray-900 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* HEADER */}
          <div className="px-4 py-3 border-b border-gray-100 bg-orange-50/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <Bell size={15} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-gray-900">
                  Thông Báo & Nhắc Nợ
                </h4>
                <div className="text-[11px] text-gray-500">
                  {unreadCount > 0 ? (
                    <span className="text-orange-600 font-bold">{unreadCount} thông báo chưa đọc</span>
                  ) : (
                    <span>Không có thông báo mới</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-orange-600 hover:bg-orange-100/60 rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="Đánh dấu đã đọc tất cả"
                >
                  <CheckCheck size={13} />
                  <span className="hidden sm:inline">Đã đọc hết</span>
                </button>
              )}
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer ${
                  loading ? 'animate-spin text-orange-600' : ''
                }`}
                title="Làm mới"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* DANH SÁCH THÔNG BÁO */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-orange-500" />
                <span>Đang tải...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                Không có thông báo mới
              </div>
            ) : (
              notifications.map((item) => {
                const isOverdue = item.notificationType === 'PAYMENT_OVERDUE';
                const isDueSoon = item.notificationType === 'PAYMENT_DUE_SOON';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleClickItem(item)}
                    className={`p-3 transition cursor-pointer flex items-start gap-2.5 ${
                      !item.isRead
                        ? isOverdue
                          ? 'bg-rose-50/60 hover:bg-rose-50'
                          : 'bg-orange-50/50 hover:bg-orange-50'
                        : 'hover:bg-gray-50 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isOverdue
                          ? 'bg-rose-100 text-rose-600'
                          : isDueSoon
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-700'
                              : isDueSoon
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isOverdue ? 'Quá Hạn' : isDueSoon ? 'Sắp Đến Hạn' : 'Thông Báo'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : ''}
                        </span>
                      </div>

                      <div
                        className={`text-xs font-bold leading-tight mt-1 ${
                          isOverdue ? 'text-rose-900' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </div>

                      <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
