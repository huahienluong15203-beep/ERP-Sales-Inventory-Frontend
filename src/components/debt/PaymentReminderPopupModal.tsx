import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Receipt,
  CheckCheck,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import {
  fetchRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem
} from '../../services/notificationApi';

interface PaymentReminderPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Cho phép truyền sẵn danh sách hoặc modal tự tải
  initialItems?: NotificationItem[];
}

export const PaymentReminderPopupModal: React.FC<PaymentReminderPopupModalProps> = ({
  isOpen,
  onClose,
  initialItems
}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>(initialItems || []);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
      return;
    }

    const loadReminders = async () => {
      setLoading(true);
      try {
        const all = await fetchRecentNotifications();
        const reminderItems = all.filter(
          (n) => n.notificationType === 'PAYMENT_DUE_SOON' || n.notificationType === 'PAYMENT_OVERDUE'
        );
        setItems(reminderItems);
      } catch (err) {
        console.warn('Lỗi tải thông báo nhắc nợ popup:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReminders();
  }, [isOpen, initialItems]);

  // Ngăn cuộn trang khi modal mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const overdueItems = items.filter((n) => n.notificationType === 'PAYMENT_OVERDUE');
  const dueSoonItems = items.filter((n) => n.notificationType === 'PAYMENT_DUE_SOON');

  const handleMarkItemRead = async (id: number) => {
    await markNotificationAsRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleViewInvoice = (invoiceCode?: string) => {
    onClose();
    if (invoiceCode) {
      navigate(`/invoices?keyword=${encodeURIComponent(invoiceCode)}`);
    } else {
      navigate('/invoices');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs antialiased animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[88vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header tinh gọn */}
        <div className="bg-gradient-to-r from-orange-500 to-[#F85606] px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 id="reminder-popup-title" className="font-bold text-sm tracking-wide">
                Nhắc Hạn Thanh Toán & Cảnh Báo Công Nợ
              </h3>
              <p className="text-[11px] text-orange-100 mt-0.5">
                {overdueItems.length > 0
                  ? `Có ${overdueItems.length} hoá đơn đã quá hạn thanh toán cần xử lý gấp!`
                  : dueSoonItems.length > 0
                  ? `Có ${dueSoonItems.length} hoá đơn sắp đến hạn trong vòng 3 ngày tới.`
                  : 'Danh sách nhắc hạn thanh toán tự động (S7-08)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.some((i) => !i.isRead) && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck size={13} />
                <span>Đọc tất cả</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nội dung danh sách thông báo */}
        <div className="p-6 overflow-y-auto space-y-3.5 divide-y divide-gray-100 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Đang tải danh sách thông báo nhắc nợ...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="font-bold text-sm text-gray-800">Không có khoản nợ nào cần nhắc</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Hiện tại tất cả hoá đơn đều đang trong hạn an toàn hoặc đã được thanh toán đầy đủ.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isOverdue = item.notificationType === 'PAYMENT_OVERDUE';
              return (
                <div
                  key={item.id}
                  className={`pt-3.5 first:pt-0 rounded-2xl p-4 transition-colors ${
                    isOverdue
                      ? 'bg-rose-50/40 border border-rose-200/80'
                      : 'bg-amber-50/40 border border-amber-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isOverdue ? <AlertTriangle size={18} /> : <Clock size={18} />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {isOverdue ? 'Quá hạn thanh toán' : 'Sắp đến hạn (còn 3 ngày)'}
                          </span>

                          {item.referenceCode && (
                            <span className="font-mono text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                              {item.referenceCode}
                            </span>
                          )}

                          {!item.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#F85606]" title="Chưa đọc" />
                          )}
                        </div>

                        <div className="font-bold text-xs text-gray-900">{item.title}</div>
                        <p className="text-xs text-gray-600 leading-relaxed">{item.content}</p>

                        <div className="text-[10px] text-gray-400 font-mono pt-1">
                          Thời gian gửi: {item.createdAt ? item.createdAt.replace('T', ' ').slice(0, 19) : ''}
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động cho từng mục */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewInvoice(item.referenceCode)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#F85606] text-gray-700 hover:text-[#F85606] text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        title="Xem hoá đơn"
                      >
                        <Receipt size={13} />
                        <span className="hidden sm:inline">Hoá đơn</span>
                      </button>

                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkItemRead(item.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-200/60 text-gray-500 hover:text-gray-800 transition cursor-pointer"
                          title="Đánh dấu đã đọc"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/invoices');
            }}
            className="text-xs font-bold text-[#F85606] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Receipt size={14} />
            <span>Xem toàn bộ danh sách hoá đơn bán hàng</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
