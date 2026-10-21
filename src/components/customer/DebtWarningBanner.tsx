import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  Receipt,
  CheckCircle2,
  Lock
} from 'lucide-react';
import type { CreditStatusResponse } from '../../types/agency';
import { formatCurrencyVND } from '../../services/orderService';

interface DebtWarningBannerProps {
  creditStatus: CreditStatusResponse | null | undefined;
  customerName?: string;
  onOpenPaymentModal?: () => void;
  compact?: boolean;
  className?: string;
}

export const DebtWarningBanner: React.FC<DebtWarningBannerProps> = ({
  creditStatus,
  customerName,
  onOpenPaymentModal,
  compact = false,
  className = ''
}) => {
  if (!creditStatus) return null;

  const isBlocked = creditStatus.blocked;
  const isOverdue = creditStatus.overdue;
  const isExceeded = creditStatus.exceedsLimit;

  // Nếu không có bất kỳ cảnh báo nào về nợ
  if (!isBlocked && !isOverdue && !isExceeded) {
    if (compact) {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>Công nợ tốt</span>
        </span>
      );
    }
    return null;
  }

  // Chế độ Compact: hiển thị badge cảnh báo nhỏ gọn (dùng cho bảng biểu, danh sách đơn hàng, cột khách hàng)
  if (compact) {
    if (isBlocked) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs animate-pulse ${className}`}
          title={`Đại lý bị khóa giao dịch: ${creditStatus.message || 'Nợ quá hạn / Vượt hạn mức'}`}
        >
          <Lock size={12} className="text-rose-700" />
          <span>Khóa bán: Quá hạn {creditStatus.overdueDays} ngày</span>
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs ${className}`}
          title={`Nợ quá hạn ${creditStatus.overdueDays} ngày (Số tiền: ${formatCurrencyVND(creditStatus.overdueAmount)})`}
        >
          <Clock size={12} className="text-amber-700" />
          <span>Nợ quá hạn {creditStatus.overdueDays} ngày</span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300 shadow-xs ${className}`}
        title={`Vượt hạn mức nợ: ${formatCurrencyVND(creditStatus.exceededAmount)}`}
      >
        <AlertTriangle size={12} className="text-orange-700" />
        <span>Vượt hạn mức nợ</span>
      </span>
    );
  }

  // Chế độ Banner đầy đủ (dùng cho màn hình Tạo đơn hàng, Chi tiết đơn hàng, Chi tiết đại lý)
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition shadow-sm ${
        isBlocked
          ? 'bg-rose-50/90 border-rose-300 text-rose-950'
          : isOverdue
          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
          : 'bg-orange-50/90 border-orange-300 text-orange-950'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Nội dung cảnh báo */}
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isBlocked
                ? 'bg-rose-600 text-white'
                : isOverdue
                ? 'bg-amber-500 text-white'
                : 'bg-orange-500 text-white'
            }`}
          >
            {isBlocked ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {!isBlocked && (
                <span
                  className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isOverdue
                      ? 'bg-amber-200/90 text-amber-900'
                      : 'bg-orange-200/90 text-orange-900'
                  }`}
                >
                  {isOverdue
                    ? 'Gắn cờ tự động: Cảnh báo nợ quá hạn'
                    : 'Cảnh báo: Vượt hạn mức công nợ'}
                </span>
              )}

              {customerName && (
                <span className="text-xs font-bold text-gray-700">
                  Khách hàng: <span className="text-gray-900">{customerName}</span>
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold leading-snug">
              {isBlocked
                ? 'Đại lý đã bị hệ thống tự động khóa giao dịch!'
                : isOverdue
                ? `Đại lý có khoản nợ đã quá hạn thanh toán ${creditStatus.overdueDays} ngày!`
                : 'Đại lý đã phát sinh dư nợ vượt quá hạn mức tín dụng cho phép!'}
            </h3>

            {!isBlocked && (
              <p className="text-xs leading-relaxed text-gray-700">
                Đề nghị kế toán công nợ và nhân viên kinh doanh đôn đốc thu hồi công nợ trước khi tiếp tục giao thêm hàng hóa.
              </p>
            )}

            {/* Chỉ số công nợ chi tiết */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-gray-200">
                <span className="text-gray-500 block text-[11px]">Hạn mức tín dụng:</span>
                <span className="font-semibold text-gray-800 font-mono">
                  {formatCurrencyVND(creditStatus.creditLimit)}
                </span>
              </div>

              <div className="bg-white/80 p-2 rounded-lg border border-gray-200">
                <span className="text-gray-500 block text-[11px]">Tổng nợ hiện tại:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {formatCurrencyVND(creditStatus.currentDebt)}
                </span>
              </div>

              {isOverdue && (
                <div className="bg-white/80 p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block text-[11px]">Nợ quá hạn:</span>
                  <span className="font-bold text-rose-700 font-mono">
                    {formatCurrencyVND(creditStatus.overdueAmount)} ({creditStatus.overdueDays} ngày)
                  </span>
                </div>
              )}

              {isExceeded && (
                <div className="bg-white/80 p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block text-[11px]">Số tiền vượt hạn mức:</span>
                  <span className="font-bold text-orange-700 font-mono">
                    +{formatCurrencyVND(creditStatus.exceededAmount)}
                  </span>
                </div>
              )}

              <div className="bg-white/80 p-2 rounded-lg border border-gray-200">
                <span className="text-gray-500 block text-[11px]">Hạn mức còn lại:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatCurrencyVND(creditStatus.availableCredit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nút hành động nhanh: Lập phiếu thu tiền ngay */}
        {onOpenPaymentModal && (
          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Receipt size={16} />
            <span>Thu tiền cấn nợ ngay</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
