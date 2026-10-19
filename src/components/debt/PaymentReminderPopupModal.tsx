import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  CheckCheck,
  ShieldAlert,
  Send,
  Building2
} from 'lucide-react';
import {
  fetchRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem
} from '../../services/notificationApi';
import type { DebtAgingRow } from '../../types/debtLedger';
import { authFetch, API_BASE_URL } from '../../services/api';

interface PaymentReminderPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Danh sách thông báo chuông (nếu có)
  initialItems?: NotificationItem[];
  // Danh sách đại lý đang phát sinh công nợ từ sổ công nợ
  activeDebtRows?: DebtAgingRow[];
}

export const PaymentReminderPopupModal: React.FC<PaymentReminderPopupModalProps> = ({
  isOpen,
  onClose,
  initialItems,
  activeDebtRows
}) => {
  const [items, setItems] = useState<NotificationItem[]>(initialItems || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [sentAgencyIds, setSentAgencyIds] = useState<Set<number>>(new Set());
  const [sendingId, setSendingId] = useState<number | 'ALL' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeDebtList = activeDebtRows?.filter((r) => r.outstanding > 0) || [];

  const formatVnd = (amount: number | null | undefined) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

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

  const handleSendReminder = async (customerId: number, customerName: string, amount: number) => {
    setSendingId(customerId);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/payments/reminders/customers/${customerId}/send`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Không thể gửi nhắc nợ');
      }
      const data = await res.json().catch(() => ({}));
      setSentAgencyIds((prev) => new Set(prev).add(customerId));
      setToastMessage(
        data.message ||
          `Đã gửi thông báo nhắc nợ đến đại lý "${customerName}" (${formatVnd(amount)}) thành công!`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(`Lỗi: ${err.message || 'Không thể gửi nhắc nợ'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAll = async () => {
    if (activeDebtList.length === 0) return;
    setSendingId('ALL');
    try {
      const res = await authFetch(`${API_BASE_URL}/api/payments/reminders/send-all`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Không thể gửi nhắc nợ');
      }
      const data = await res.json().catch(() => ({}));
      const allIds = new Set(activeDebtList.map((a) => a.customerId));
      setSentAgencyIds(allIds);
      setToastMessage(
        data.message ||
          `Đã gửi thông báo nhắc nợ đến tất cả ${activeDebtList.length} đại lý thành công!`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(`Lỗi: ${err.message || 'Không thể gửi nhắc nợ'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSendingId(null);
    }
  };

  const hasAnyData = activeDebtList.length > 0 || items.length > 0;

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
                {activeDebtList.length > 0
                  ? `Có ${activeDebtList.length} đại lý đang phát sinh công nợ cần theo dõi & nhắc thanh toán`
                  : overdueItems.length > 0
                  ? `Có ${overdueItems.length} hoá đơn đã quá hạn thanh toán cần xử lý gấp!`
                  : dueSoonItems.length > 0
                  ? `Có ${dueSoonItems.length} hoá đơn sắp đến hạn trong vòng 3 ngày tới.`
                  : 'Danh sách nhắc hạn thanh toán công nợ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeDebtList.length > 0 && !activeDebtList.every((a) => sentAgencyIds.has(a.customerId)) && (
              <button
                type="button"
                onClick={handleSendAll}
                disabled={sendingId === 'ALL'}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="Gửi nhắc nợ cho tất cả các đại lý đang có số dư nợ"
              >
                <Send size={12} />
                <span>{sendingId === 'ALL' ? 'Đang gửi...' : 'Nhắc nợ tất cả'}</span>
              </button>
            )}

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

        {/* Nội dung danh sách nhắc nợ */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Thông báo thao tác thành công */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Đang tải danh sách nhắc nợ...
            </div>
          ) : !hasAnyData ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="font-bold text-sm text-gray-800">Không có khoản nợ nào cần nhắc</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Hiện tại tất cả hoá đơn đều đang trong hạn an toàn hoặc đã được thanh toán đầy đủ.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Danh sách đại lý đang phát sinh công nợ */}
              {activeDebtList.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-orange-500" />
                      <span>Đại lý đang có số dư nợ ({activeDebtList.length})</span>
                    </span>
                    <span className="text-gray-500 font-normal text-[11px]">
                      Tổng nợ:{' '}
                      <strong className="text-rose-600 font-mono font-bold">
                        {formatVnd(activeDebtList.reduce((sum, r) => sum + r.outstanding, 0))}
                      </strong>
                    </span>
                  </div>

                  {activeDebtList.map((agency) => {
                    const isOverdue = (agency.overdueAmount || 0) > 0;
                    const isSent = sentAgencyIds.has(agency.customerId);

                    return (
                      <div
                        key={agency.customerId}
                        className={`rounded-2xl p-4 transition-all border ${
                          isOverdue
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-orange-50/30 border-orange-200/80 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-[#F85606]'
                              }`}
                            >
                              {isOverdue ? <AlertTriangle size={18} /> : <Clock size={18} />}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-gray-900">{agency.customerName}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white text-gray-700 border border-gray-200">
                                  {agency.customerCode}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    isOverdue
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {isOverdue
                                    ? `Quá hạn: ${formatVnd(agency.overdueAmount)}`
                                    : `Trong hạn (${agency.oldestDebtDays > 0 ? agency.oldestDebtDays + ' ngày' : '0-30 ngày'})`}
                                </span>
                              </div>

                              <div className="text-xs text-gray-600 flex items-center gap-2.5 flex-wrap">
                                <span>
                                  Còn nợ:{' '}
                                  <strong className="text-rose-600 font-mono text-sm font-bold">
                                    {formatVnd(agency.outstanding)}
                                  </strong>
                                </span>
                                <span className="text-gray-300">•</span>
                                <span>
                                  Phải thu: <span className="font-mono">{formatVnd(agency.receivable)}</span>
                                </span>
                                <span className="text-gray-300">•</span>
                                <span>
                                  Hạn mức: <span className="font-mono">{formatVnd(agency.creditLimit)}</span> (Tối đa {agency.maxDebtDays} ngày)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSendReminder(agency.customerId, agency.customerName, agency.outstanding)}
                              disabled={isSent || sendingId === agency.customerId}
                              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                                isSent
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                                  : 'bg-gradient-to-r from-orange-500 to-[#F85606] hover:from-orange-600 hover:to-orange-700 text-white'
                              }`}
                            >
                              {isSent ? (
                                <>
                                  <CheckCircle2 size={14} className="text-emerald-700" />
                                  <span>Đã gửi nhắc nợ</span>
                                </>
                              ) : sendingId === agency.customerId ? (
                                <span>Đang gửi...</span>
                              ) : (
                                <>
                                  <Send size={13} />
                                  <span>Gửi nhắc nợ</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Danh sách thông báo chuông (nếu có thông báo tự động) */}
              {items.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Thông báo hạn thanh toán tự động ({items.length})
                  </div>

                  {items.map((item) => {
                    const isOverdue = item.notificationType === 'PAYMENT_OVERDUE';
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-4 transition-colors border ${
                          isOverdue
                            ? 'bg-rose-50/40 border-rose-200/80'
                            : 'bg-amber-50/40 border-amber-200/80'
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
                                  {isOverdue ? 'Quá hạn thanh toán' : 'Sắp đến hạn'}
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

                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkItemRead(item.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-200/60 text-gray-500 hover:text-gray-800 transition cursor-pointer shrink-0"
                              title="Đánh dấu đã đọc"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer: Chỉ còn nút đóng */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-end text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition cursor-pointer text-xs"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
