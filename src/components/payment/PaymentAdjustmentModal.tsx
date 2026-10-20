import React, { useState } from 'react';
import {
  X,
  FileEdit,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  User,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { adjustPaymentReceipt } from '../../services/paymentApi';
import type { PaymentReconciliationItem } from '../../types/payment';

interface PaymentAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReconciliationItem | null;
  onSuccess: () => void;
}

const QUICK_REASONS = [
  'Nhầm lẫn số tiền thu thực tế',
  'Khách hàng khiếu nại cấn trừ sai hoá đơn',
  'Hoàn trả tiền cho đại lý do huỷ / trả đơn hàng',
  'Giao dịch chuyển khoản chưa khớp / chưa về tài khoản',
  'Thu trùng khoản thanh toán'
];

export const PaymentAdjustmentModal: React.FC<PaymentAdjustmentModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onSuccess
}) => {
  const { user, showToast } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !receipt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do lập bút toán điều chỉnh');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await adjustPaymentReceipt(receipt.id, reason.trim());
      showToast(
        `Đã lập bút toán điều chỉnh thành công cho phiếu ${receipt.code}. Công nợ hoá đơn đã được hoàn tác!`,
        'success'
      );
      setReason('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lập bút toán điều chỉnh';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectQuickReason = (r: string) => {
    setReason((prev) => (prev ? `${prev}; ${r}` : r));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-orange-50/40 dark:bg-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#F85606]">
              <FileEdit size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Lập Bút Toán Điều Chỉnh Phiếu Thu
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Hoàn tác cấn trừ và cập nhật chứng từ thanh toán
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Thông tin phiếu thu gốc */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Mã chứng từ gốc:</span>
              <span className="font-mono font-bold text-[#F85606] text-sm">{receipt.code}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-gray-400 block text-[11px]">Đại lý nộp tiền:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block mt-0.5" title={receipt.customerName}>
                  {receipt.customerName}
                </span>
                <span className="text-gray-400 font-mono text-[10px]">[{receipt.customerCode}]</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Số tiền phát sinh:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
                  {formatCurrencyVND(receipt.amount)}
                </span>
                <span className="text-gray-400 text-[10px]">
                  {receipt.paymentMethod === 'CASH'
                    ? 'Tiền mặt'
                    : receipt.paymentMethod === 'BANK_TRANSFER'
                    ? 'Chuyển khoản'
                    : receipt.paymentMethod}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Ngày thu: <strong>{receipt.paymentDate}</strong></span>
              <span>
                Trạng thái:{' '}
                <strong className={receipt.status === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'}>
                  {receipt.status === 'CONFIRMED' ? 'Đã nộp quỹ' : 'Chờ nộp quỹ'}
                </strong>
              </span>
            </div>
          </div>

          {/* Cảnh báo nguyên tắc kế toán */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Nguyên tắc kế toán công nợ</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Chứng từ thu tiền đã ghi nhận vào sổ không được xoá trực tiếp. Khi thực hiện bút toán điều chỉnh, khoản thu sẽ chuyển sang trạng thái <strong>Đã điều chỉnh</strong>, toàn bộ số tiền đã cấn trừ sẽ được hoàn tác về nợ hoá đơn tương ứng và lưu vết kiểm toán.
              </p>
            </div>
          </div>

          {/* Chọn nhanh lý do điều chỉnh */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Gợi ý lý do điều chỉnh nhanh:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectQuickReason(r)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 hover:bg-orange-50 hover:text-[#F85606] hover:border-orange-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>

          {/* Nhập lý do điều chỉnh chi tiết */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Lý do lập bút toán điều chỉnh <span className="text-rose-500">*</span>:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Nhập chi tiết căn cứ và lý do kế toán cần lập bút toán điều chỉnh..."
              className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
              required
            />
            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium mt-1">{errorMsg}</p>
            )}
          </div>

          {/* Thông tin người thực hiện */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-gray-400" />
              <span>Người lập: <strong className="text-gray-800 dark:text-gray-200">{user?.fullName || user?.username || 'Kế toán'}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span>Ngày lập: <strong>{new Date().toISOString().slice(0, 10)}</strong></span>
            </span>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs transition cursor-pointer"
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F85606] to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <FileEdit size={14} />
              )}
              <span>Xác nhận lập bút toán</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
