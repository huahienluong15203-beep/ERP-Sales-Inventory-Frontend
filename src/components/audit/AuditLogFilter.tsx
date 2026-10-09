import React from 'react';
import type { AuditLogFilterParams, AuditModuleKey } from '../../types/auditLog';
import { AUDIT_MODULE_OPTIONS } from '../../services/auditLogApi';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Clock,
  AlertCircle
} from '../common/Icons';

interface AuditLogFilterProps {
  filters: AuditLogFilterParams;
  onChange: (updated: Partial<AuditLogFilterParams>) => void;
  onReset: () => void;
}

export const AuditLogFilter: React.FC<AuditLogFilterProps> = ({
  filters,
  onChange,
  onReset
}) => {
  const isFiltered =
    Boolean(filters.keyword) ||
    (filters.module && filters.module !== 'ALL') ||
    (filters.actorUsername && filters.actorUsername !== 'ALL') ||
    (filters.quickTimeRange && filters.quickTimeRange !== 'ALL') ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  const handleTimePresetChange = (preset: string) => {
    if (preset === 'ALL') {
      onChange({ quickTimeRange: 'ALL', startDate: undefined, endDate: undefined, page: 0 });
    } else if (preset === 'TODAY') {
      const today = new Date().toISOString().slice(0, 10);
      onChange({ quickTimeRange: 'TODAY', startDate: today, endDate: today, page: 0 });
    } else if (preset === 'LAST_MONTH') {
      // Kỳ kiểm kê cuối tháng 09/2026 (Focus S2-04)
      onChange({
        quickTimeRange: 'LAST_MONTH',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        page: 0
      });
    } else if (preset === 'THIS_MONTH') {
      onChange({
        quickTimeRange: 'THIS_MONTH',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        page: 0
      });
    } else if (preset === 'LAST_3_MONTHS') {
      onChange({
        quickTimeRange: 'LAST_3_MONTHS',
        startDate: '2026-08-01',
        endDate: '2026-10-31',
        page: 0
      });
    }
  };

  const isValidYear = (val: string) => {
    if (!val) return true;
    const parts = val.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    return !isNaN(year) && year >= 1970 && year <= 2099 && parts[0].length === 4;
  };

  const handleStartDateChange = (val: string) => {
    if (!val) {
      onChange({ startDate: undefined, quickTimeRange: 'ALL', page: 0 });
      return;
    }
    if (!isValidYear(val)) return;
    onChange({
      startDate: val,
      quickTimeRange: 'ALL',
      page: 0
    });
  };

  const handleEndDateChange = (val: string) => {
    if (!val) {
      onChange({ endDate: undefined, quickTimeRange: 'ALL', page: 0 });
      return;
    }
    if (!isValidYear(val)) return;
    onChange({
      endDate: val,
      quickTimeRange: 'ALL',
      page: 0
    });
  };

  const handleSwapDates = () => {
    if (!filters.startDate || !filters.endDate) return;
    onChange({
      startDate: filters.endDate,
      endDate: filters.startDate,
      quickTimeRange: 'ALL',
      page: 0
    });
  };

  const isDateRangeInvalid = Boolean(
    filters.startDate && filters.endDate && filters.startDate > filters.endDate
  );

  const handleClearDateRange = () => {
    onChange({ startDate: undefined, endDate: undefined, quickTimeRange: 'ALL', page: 0 });
  };

  const hasCustomDates = Boolean(filters.startDate || filters.endDate);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header bộ lọc */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <SlidersHorizontal size={18} className="text-orange-600" />
          <span>Bộ Lọc Truy Vết & Kiểm Toán Thao Tác</span>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      {/* Grid 4 bộ lọc chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Tìm từ khóa */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.keyword || ''}
            onChange={(e) => onChange({ keyword: e.target.value, page: 0 })}
            placeholder="Tìm theo SKU, mã phiếu, người sửa, lý do..."
            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>

        {/* 2. Lọc theo Phân hệ / Loại đối tượng */}
        <div>
          <select
            value={filters.module || 'ALL'}
            onChange={(e) => onChange({ module: e.target.value as AuditModuleKey | 'ALL', page: 0 })}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          >
            <option value="ALL">-- Tất cả phân hệ đối tượng --</option>
            {AUDIT_MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Lọc theo Người thực hiện (Truy ai đã điều chỉnh tồn kho) */}
        <div>
          <select
            value={filters.actorUsername || 'ALL'}
            onChange={(e) => onChange({ actorUsername: e.target.value, page: 0 })}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          >
            <option value="ALL">-- Tất cả người thực hiện --</option>
            <option value="wh_staff">Nguyễn Văn Thủ Kho (@wh_staff - Kho HCM)</option>
            <option value="wh_manager">Hoàng Quản Lý Kho (@wh_manager - Quản lý)</option>
            <option value="accountant">Phạm Thị Kế Toán (@accountant - Công nợ)</option>
            <option value="sales_manager">Trần Quản Lý Kinh Doanh (@sales_manager)</option>
            <option value="admin">Quản Trị Viên Hệ Thống (@admin)</option>
          </select>
        </div>

        {/* 4. Lọc theo Khoảng thời gian kiểm kê */}
        <div>
          <select
            value={filters.quickTimeRange || 'ALL'}
            onChange={(e) => handleTimePresetChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          >
            <option value="ALL">Toàn bộ thời gian</option>
            <option value="LAST_MONTH">Kỳ kiểm kê tháng trước (Tháng 09/2026)</option>
            <option value="THIS_MONTH">Kỳ kiểm kê tháng này (Tháng 10/2026)</option>
            <option value="LAST_3_MONTHS">3 tháng gần nhất (Q3/2026)</option>
            <option value="TODAY">Hôm nay</option>
          </select>
        </div>
      </div>

      {/* Tùy chọn ngày chi tiết (Từ ngày - Đến ngày) */}
      <div className="flex flex-col gap-2 pt-1 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Clock size={14} className="text-orange-500" />
            <span>Khoảng ngày cụ thể:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className={`px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 focus:outline-none focus:ring-1 cursor-pointer transition ${
                isDateRangeInvalid
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500 text-rose-900'
                  : 'border-slate-200 focus:ring-orange-500'
              }`}
              title="Chọn hoặc nhập ngày bắt đầu"
            />
            <span className="text-slate-400 font-medium">đến</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className={`px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 focus:outline-none focus:ring-1 cursor-pointer transition ${
                isDateRangeInvalid
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500 text-rose-900'
                  : 'border-slate-200 focus:ring-orange-500'
              }`}
              title="Chọn hoặc nhập ngày kết thúc"
            />
            {hasCustomDates && (
              <button
                type="button"
                onClick={handleClearDateRange}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 rounded-md transition cursor-pointer border border-slate-200"
                title="Xóa khoảng ngày đã chọn"
              >
                <span>Xóa ngày</span>
              </button>
            )}
            {isDateRangeInvalid && (
              <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                <AlertCircle size={14} className="shrink-0 text-rose-500" />
                <span>Ngày kết thúc không được nhỏ hơn ngày bắt đầu</span>
                <button
                  type="button"
                  onClick={handleSwapDates}
                  className="ml-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                  title="Đảo thứ tự ngày bắt đầu và kết thúc"
                >
                  Đảo lại ngày
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
