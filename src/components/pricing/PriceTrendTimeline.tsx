import React from 'react';
import type { PriceChangeRecord } from '../../types/pricing';
import { formatVND, formatDateTime } from '../../services/priceHistoryApi';
import {
  TrendingUp,
  TrendingDown,
  CalendarClock,
  User,
  Eye,
  ArrowRight
} from '../common/Icons';

interface PriceTrendTimelineProps {
  records: PriceChangeRecord[];
  productName: string;
  productSku: string;
  onSelectRecord: (record: PriceChangeRecord) => void;
}

export const PriceTrendTimeline: React.FC<PriceTrendTimelineProps> = ({
  records,
  productName,
  productSku,
  onSelectRecord
}) => {
  // Sắp xếp tăng dần theo thời gian để vẽ timeline từ quá khứ đến hiện tại
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );

  if (sortedRecords.length === 0) {
    return null;
  }

  const latestRecord = sortedRecords[sortedRecords.length - 1];

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm">
      {/* Header Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              Trục Biến Động Giá
            </span>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {productName}
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Mã SKU: <span className="font-mono font-semibold">{productSku}</span> • Theo dõi sự thay đổi qua các mốc thời gian
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Giá hiện tại (Mới nhất)</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {formatVND(latestRecord.newPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Trục Timeline trực quan */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
        {sortedRecords.map((item, index) => {
          const isLatest = index === sortedRecords.length - 1;
          const isIncrease = item.difference > 0;
          const isDecrease = item.difference < 0;

          return (
            <div key={item.id} className="relative group">
              {/* Điểm nút trên trục thời gian */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isLatest
                    ? 'bg-blue-600 border-white dark:border-slate-900 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900/30'
                    : isIncrease
                    ? 'bg-white dark:bg-slate-800 border-rose-500 text-rose-500'
                    : isDecrease
                    ? 'bg-white dark:bg-slate-800 border-emerald-500 text-emerald-500'
                    : 'bg-white dark:bg-slate-800 border-slate-400 text-slate-500'
                }`}
              >
                {isIncrease ? (
                  <TrendingUp size={12} />
                ) : isDecrease ? (
                  <TrendingDown size={12} />
                ) : (
                  <CalendarClock size={12} />
                )}
              </div>

              {/* Nội dung mốc thời gian */}
              <div
                onClick={() => onSelectRecord(item)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isLatest
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 hover:shadow-md'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100/60 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatDateTime(item.effectiveDate)}
                    </span>
                    {isLatest && (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-600 text-white shadow-xs">
                        Đang áp dụng
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.priceTypeName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecord(item);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Eye size={13} />
                    <span>Xem chi tiết giải thích</span>
                  </button>
                </div>

                {/* So sánh giá cũ -> mới */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400 line-through text-xs font-medium">
                    {formatVND(item.oldPrice)}
                  </span>
                  <ArrowRight size={14} className="text-slate-400" />
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatVND(item.newPrice)}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                      isIncrease
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        : isDecrease
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isIncrease ? '+' : ''}{item.percentageChange.toFixed(2)}% ({isIncrease ? '+' : ''}{formatVND(item.difference)})
                  </span>
                </div>

                {/* Tóm tắt lý do giải thích cho đại lý */}
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  💬 Giải thích đại lý: "{item.explanationForAgency}"
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>Người sửa: {item.modifierName} ({item.modifierRole})</span>
                  </div>
                  <span className="font-mono text-slate-400">Số QĐ: {item.decisionCode}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
