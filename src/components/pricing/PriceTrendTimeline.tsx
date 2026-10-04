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
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      {/* Header Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              Trục Biến Động Giá
            </span>
            <h4 className="text-base font-bold text-gray-900">
              {productName}
            </h4>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mã SKU: <span className="font-mono font-semibold">{productSku}</span> • Theo dõi sự thay đổi qua các mốc thời gian
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Giá hiện tại (Mới nhất)</span>
            <span className="text-lg font-extrabold text-blue-600">
              {formatVND(latestRecord.newPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Trục Timeline trực quan */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
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
                    ? 'bg-blue-600 border-white text-white shadow-md ring-4 ring-blue-100'
                    : isIncrease
                    ? 'bg-white border-rose-500 text-rose-500'
                    : isDecrease
                    ? 'bg-white border-emerald-500 text-emerald-500'
                    : 'bg-white border-gray-400 text-gray-500'
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
                    ? 'bg-blue-50/40 border-blue-200 hover:shadow-md'
                    : 'bg-gray-50/60 border-gray-200 hover:bg-gray-100/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">
                      {formatDateTime(item.effectiveDate)}
                    </span>
                    {isLatest && (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-600 text-white shadow-xs">
                        Đang áp dụng
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-gray-200 text-gray-700">
                      {item.priceTypeName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecord(item);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <Eye size={13} />
                    <span>Xem chi tiết giải thích</span>
                  </button>
                </div>

                {/* So sánh giá cũ -> mới */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-gray-500 line-through text-xs font-medium">
                    {formatVND(item.oldPrice)}
                  </span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="font-extrabold text-gray-900">
                    {formatVND(item.newPrice)}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                      isIncrease
                        ? 'bg-rose-100 text-rose-700'
                        : isDecrease
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isIncrease ? '+' : ''}{item.percentageChange.toFixed(2)}% ({isIncrease ? '+' : ''}{formatVND(item.difference)})
                  </span>
                </div>

                {/* Tóm tắt lý do giải thích cho đại lý */}
                <p className="mt-2 text-xs text-gray-600 line-clamp-2 italic bg-white/60 p-2 rounded-lg border border-gray-100">
                  💬 Giải thích đại lý: "{item.explanationForAgency}"
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>Người sửa: {item.modifierName} ({item.modifierRole})</span>
                  </div>
                  <span className="font-mono text-gray-400">Số QĐ: {item.decisionCode}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
