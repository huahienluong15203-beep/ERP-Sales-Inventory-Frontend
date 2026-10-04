import React from 'react';
import type { SupplierStatsData } from '../../types/supplier';
import { Icons } from '../common/Icons';

interface SupplierStatsProps {
  stats: SupplierStatsData;
}

export const SupplierStats: React.FC<SupplierStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Tổng số nhà cung cấp */}
      <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <Icons.Building2 size={24} />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Tổng nhà cung cấp</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</span>
          <p className="text-[11px] text-slate-400 mt-0.5">Danh mục đối tác cung ứng</p>
        </div>
      </div>

      {/* 2. Đang giao dịch */}
      <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Icons.CheckCircle2 size={24} />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Đang giao dịch</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activeCount}</span>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Sẵn sàng nhận phiếu nhập</p>
        </div>
      </div>

      {/* 3. Ngừng giao dịch */}
      <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <Icons.AlertTriangle size={24} />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Ngừng giao dịch</span>
          <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.inactiveCount}</span>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Tạm dừng (có lý do S2-09)</p>
        </div>
      </div>

      {/* 4. Điều khoản thanh toán */}
      <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
          <Icons.Receipt size={24} />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Đã có Đ/K thanh toán</span>
          <span className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.hasPaymentTermsCount}</span>
          <p className="text-[11px] text-slate-400 mt-0.5">Kiểm soát rủi ro công nợ</p>
        </div>
      </div>
    </div>
  );
};
