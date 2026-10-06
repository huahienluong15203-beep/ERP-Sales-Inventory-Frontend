import React from 'react';
import type { AuditStatsSummary } from '../../types/auditLog';
import {
  Package,
  Building2,
  Tags,
  Lock
} from '../common/Icons';

interface AuditLogStatsProps {
  stats: AuditStatsSummary;
  selectedModule?: string;
  onSelectModuleFilter?: (mod: string) => void;
}

export const AuditLogStats: React.FC<AuditLogStatsProps> = ({
  stats,
  selectedModule = 'ALL',
  onSelectModuleFilter
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Tổng lượt kiểm toán */}
      <div
        onClick={() => onSelectModuleFilter?.('ALL')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedModule === 'ALL'
            ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-600/20'
            : 'bg-white hover:bg-orange-50/50 border-orange-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              selectedModule === 'ALL' ? 'text-orange-100' : 'text-orange-700'
            }`}
          >
            Tổng Lượt Thao Tác
          </span>
          <div
            className={`p-2 rounded-xl ${
              selectedModule === 'ALL'
                ? 'bg-orange-700 text-white'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            <Lock size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black tracking-tight text-orange-950 dark:text-inherit">
          {stats.totalCount.toLocaleString('vi-VN')}
        </div>
        <div
          className={`mt-1 flex items-center gap-1.5 text-xs ${
            selectedModule === 'ALL' ? 'text-orange-100' : 'text-slate-500'
          }`}
        >
          <span>Ghi nhận từ {stats.actorCount} nhân sự</span>
          <span>•</span>
          <span
            className={
              selectedModule === 'ALL'
                ? 'text-white/90 font-semibold'
                : 'text-emerald-600 font-medium'
            }
          >
            Bất biến 100%
          </span>
        </div>
      </div>

      {/* 2. Thao tác Tồn kho (S2-04 cốt lõi) */}
      <div
        onClick={() => onSelectModuleFilter?.('INVENTORY')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedModule === 'INVENTORY'
            ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600/20'
            : 'bg-white hover:bg-amber-50/50 border-amber-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              selectedModule === 'INVENTORY' ? 'text-amber-100' : 'text-amber-700'
            }`}
          >
            Biến Động Tồn Kho
          </span>
          <div
            className={`p-2 rounded-xl ${
              selectedModule === 'INVENTORY'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <Package size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black tracking-tight text-amber-900 dark:text-inherit">
          {stats.inventoryCount.toLocaleString('vi-VN')}
        </div>
        <div
          className={`mt-1 text-xs ${
            selectedModule === 'INVENTORY' ? 'text-amber-100' : 'text-amber-700'
          }`}
        >
          Lệch kiểm kê cuối tháng, hao hụt, hư hỏng
        </div>
      </div>

      {/* 3. Thao tác Công nợ & Hạn mức (S2-04 cốt lõi) */}
      <div
        onClick={() => onSelectModuleFilter?.('DEBT_LIMIT')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedModule === 'DEBT_LIMIT'
            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
            : 'bg-white hover:bg-blue-50/50 border-blue-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              selectedModule === 'DEBT_LIMIT' ? 'text-blue-100' : 'text-blue-700'
            }`}
          >
            Hạn Mức & Số Ngày Nợ
          </span>
          <div
            className={`p-2 rounded-xl ${
              selectedModule === 'DEBT_LIMIT'
                ? 'bg-blue-700 text-white'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            <Building2 size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black tracking-tight text-blue-900 dark:text-inherit">
          {stats.debtCount.toLocaleString('vi-VN')}
        </div>
        <div
          className={`mt-1 text-xs ${
            selectedModule === 'DEBT_LIMIT' ? 'text-blue-100' : 'text-blue-700'
          }`}
        >
          Tăng/giảm hạn mức tiền, gia hạn ngày nợ đại lý
        </div>
      </div>

      {/* 4. Thao tác Giá & Hóa đơn */}
      <div
        onClick={() => onSelectModuleFilter?.('PRICING')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedModule === 'PRICING'
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
            : 'bg-white hover:bg-emerald-50/50 border-emerald-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              selectedModule === 'PRICING' ? 'text-emerald-100' : 'text-emerald-700'
            }`}
          >
            Giá Bán & Hóa Đơn
          </span>
          <div
            className={`p-2 rounded-xl ${
              selectedModule === 'PRICING'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <Tags size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black tracking-tight text-emerald-900 dark:text-inherit">
          {(stats.pricingCount + stats.invoiceCount).toLocaleString('vi-VN')}
        </div>
        <div
          className={`mt-1 text-xs ${
            selectedModule === 'PRICING' ? 'text-emerald-100' : 'text-emerald-700'
          }`}
        >
          {stats.pricingCount} lượt biểu giá • {stats.invoiceCount} lượt hóa đơn
        </div>
      </div>
    </div>
  );
};
