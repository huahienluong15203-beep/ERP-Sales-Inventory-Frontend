import React, { useState } from 'react';
import type { PriceChangeRecord } from '../../types/pricing';
import { formatVND, formatDateTime } from '../../services/priceHistoryApi';
import {
  X,
  Lock,
  CalendarClock,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  Building2,
  Copy,
  Check
} from '../common/Icons';

interface PriceHistoryDetailModalProps {
  record: PriceChangeRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PriceHistoryDetailModal: React.FC<PriceHistoryDetailModalProps> = ({
  record,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !record) return null;

  const isIncrease = record.difference > 0;
  const isDecrease = record.difference < 0;

  const handleCopyExplanation = () => {
    const textToCopy = `[Giải thích biến động giá] Sản phẩm: ${record.productName} (${record.productSku})\nBiểu giá: ${record.priceTypeName}\nGiá cũ: ${formatVND(record.oldPrice)} ➔ Giá mới: ${formatVND(record.newPrice)} (${isIncrease ? '+' : ''}${record.percentageChange.toFixed(2)}%)\nThời điểm áp dụng: ${formatDateTime(record.effectiveDate)}\nCăn cứ: ${record.decisionCode}\nNội dung giải thích: ${record.explanationForAgency}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Chi Tiết Thay Đổi Giá #{record.id}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Lock size={11} className="text-amber-500" />
                  Bất biến (Immutable)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lịch sử ghi vết kiểm toán tự động, không thể chỉnh sửa hoặc xóa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Đóng (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nội dung chi tiết cuộn được */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Thông tin sản phẩm */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                {record.category}
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {record.productName}
              </h4>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Mã SKU: <strong className="font-mono text-slate-700 dark:text-slate-300">{record.productSku}</strong></span>
                <span>•</span>
                <span>Quy cách: <strong className="text-slate-700 dark:text-slate-300">{record.unit}</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Biểu giá áp dụng</span>
              <span className="inline-block mt-0.5 px-3 py-1 text-xs font-bold rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                {record.priceTypeName}
              </span>
            </div>
          </div>

          {/* Đối chiếu so sánh Giá Cũ vs Giá Mới */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Giá cũ */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Giá Áp Dụng Tháng Trước (Giá Cũ)
              </span>
              <div className="mt-2 text-xl font-bold text-slate-600 dark:text-slate-300 line-through">
                {formatVND(record.oldPrice)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Trước ngày {formatDateTime(record.effectiveDate).split(' ')[0]}
              </span>
            </div>

            {/* Mức chênh lệch */}
            <div
              className={`p-4 rounded-xl border text-center flex flex-col justify-center items-center ${
                isIncrease
                  ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400'
                  : isDecrease
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                {isIncrease && <TrendingUp size={16} />}
                {isDecrease && <TrendingDown size={16} />}
                <span>{isIncrease ? 'Điều Chỉnh Tăng' : isDecrease ? 'Hỗ Trợ Giảm Giá' : 'Không Đổi'}</span>
              </div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight">
                {isIncrease ? '+' : ''}{formatVND(record.difference)}
              </div>
              <div className="mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/70 dark:bg-slate-900/50 shadow-sm inline-block">
                {isIncrease ? '+' : ''}{record.percentageChange.toFixed(2)}%
              </div>
            </div>

            {/* Giá mới */}
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-center">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                Giá Áp Dụng Tháng Này (Giá Mới)
              </span>
              <div className="mt-2 text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                {formatVND(record.newPrice)}
              </div>
              <span className="text-[11px] text-blue-600/80 dark:text-blue-300 mt-1 block font-medium">
                Có hiệu lực từ {formatDateTime(record.effectiveDate)}
              </span>
            </div>
          </div>

          {/* Căn cứ điều chỉnh & Người thực hiện */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <CalendarClock size={16} className="text-blue-500" />
                <span>Thời Điểm & Quyết Định Áp Dụng</span>
              </div>
              <div className="text-sm space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Thời điểm hiệu lực:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {formatDateTime(record.effectiveDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Số quyết định / Mã căn cứ:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                    {record.decisionCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Thời điểm ghi nhận CSDL:</span>
                  <span className="text-slate-600 dark:text-slate-300 text-xs font-mono">
                    {formatDateTime(record.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <User size={16} className="text-emerald-500" />
                <span>Người Thực Hiện Phê Duyệt</span>
              </div>
              <div className="text-sm space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Họ và tên:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {record.modifierName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Tài khoản:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">
                    @{record.modifierUsername}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Vai trò hệ thống:</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                    {record.modifierRole}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lý do điều chỉnh nội bộ */}
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1.5">
              <Info size={16} />
              <span>Nguyên Nhân & Căn Cứ Điều Chỉnh Giá</span>
            </div>
            <p className="text-sm text-amber-950 dark:text-amber-200/90 leading-relaxed font-normal">
              {record.reason}
            </p>
            {record.notes && (
              <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-2 italic">
                * Ghi chú bổ sung: {record.notes}
              </p>
            )}
          </div>

          {/* NỘI DUNG then chốt: Kịch bản giải thích cho Đại lý (Story S3-02) */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white dark:from-indigo-950/40 dark:via-blue-950/20 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/60 shadow-sm relative group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h5 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Kịch Bản Giải Thích Minh Bạch Cho Đại Lý (Vì sao giá tháng này khác tháng trước?)
                </h5>
              </div>
              <button
                onClick={handleCopyExplanation}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700'
                }`}
                title="Sao chép kịch bản đối thoại với đại lý"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép giải thích'}</span>
              </button>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-800/70 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
              {record.explanationForAgency}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-indigo-700/80 dark:text-indigo-300/80">
              <CheckCircle2 size={14} className="text-indigo-500" />
              <span>
                Sales Manager hoặc Nhân viên kinh doanh sử dụng nội dung trên để phản hồi thắc mắc báo giá của Đại lý.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Modal: TUYỆT ĐỐI KHÔNG CÓ NÚT SỬA HOẶC XOÁ */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Lock size={14} className="text-amber-500" />
            <span>Quy chuẩn kiểm toán ERP: Dữ liệu lịch sử giá được lưu vết vĩnh viễn, cấm sửa và cấm xóa.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl border border-slate-300 dark:border-slate-600 transition shadow-sm"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
