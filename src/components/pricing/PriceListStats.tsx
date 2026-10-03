import React from 'react';
import type { PriceList } from '../../types/pricing';
import { Icons } from '../common/Icons';

interface PriceListStatsProps {
  priceLists: PriceList[];
}

export const PriceListStats: React.FC<PriceListStatsProps> = ({ priceLists }) => {
  const total = priceLists.length;
  const activeCount = priceLists.filter((p) => p.status === 'ACTIVE').length;
  const tier1Count = priceLists.filter((p) => p.customerGroup === 'DEALER_LEVEL_1').length;
  const tier2Count = priceLists.filter((p) => p.customerGroup === 'DEALER_LEVEL_2').length;
  const retailCount = priceLists.filter((p) => p.customerGroup === 'RETAIL').length;
  const lockedCount = priceLists.filter((p) => p.hasOrders).length;

  const stats = [
    {
      title: 'Tổng bảng giá',
      value: total,
      sub: `${activeCount} bảng đang kích hoạt`,
      icon: 'Tags',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      border: 'border-indigo-100 dark:border-indigo-900/50'
    },
    {
      title: 'Đại lý Cấp 1 (NPP)',
      value: tier1Count,
      sub: 'Chính sách giá buôn cấp tỉnh',
      icon: 'Building2',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-100 dark:border-amber-900/50'
    },
    {
      title: 'Đại lý Cấp 2',
      value: tier2Count,
      sub: 'Bán buôn khu vực & vệ tinh',
      icon: 'Users',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-100 dark:border-blue-900/50'
    },
    {
      title: 'Khách lẻ / Showroom',
      value: retailCount,
      sub: 'Giá niêm yết bán lẻ',
      icon: 'ShoppingCart',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-100 dark:border-emerald-900/50'
    },
    {
      title: 'Đã phát sinh đơn',
      value: lockedCount,
      sub: 'Bảo vệ giá, chỉ tạo bản mới',
      icon: 'ShieldCheck',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-100 dark:border-rose-900/50'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {stats.map((stat, idx) => {
        const IconComponent = Icons[stat.icon] || Icons.Tags;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl border bg-white dark:bg-slate-900 ${stat.border} shadow-xs hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                {stat.title}
              </span>
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                <IconComponent size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {stat.value}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">bảng</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {stat.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
};
