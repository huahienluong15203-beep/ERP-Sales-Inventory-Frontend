import React from 'react';
import type { PriceListStatsData } from '../../services/pricingApi';
import { Icons } from '../common/Icons';

interface PriceListStatsProps {
  /** Số liệu đếm trên toàn bộ bảng giá, lấy từ /api/price-lists/stats */
  stats: PriceListStatsData;
}

export const PriceListStats: React.FC<PriceListStatsProps> = ({ stats: data }) => {
  const total = data.total;
  const activeCount = data.active;
  const tier1Count = data.dealerLevel1;
  const tier2Count = data.dealerLevel2;
  const retailCount = data.retail;
  const lockedCount = data.locked;

  const stats = [
    {
      title: 'Tổng bảng giá',
      value: total,
      sub: `${activeCount} bảng đang kích hoạt`,
      icon: 'Tags',
      color: 'text-[#F85606]',
      bg: 'bg-orange-50',
      border: 'border-orange-100'
    },
    {
      title: 'Đại lý Cấp 1 (NPP)',
      value: tier1Count,
      sub: 'Chính sách giá buôn cấp tỉnh',
      icon: 'Building2',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    },
    {
      title: 'Đại lý Cấp 2',
      value: tier2Count,
      sub: 'Bán buôn khu vực & vệ tinh',
      icon: 'Users',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    },
    {
      title: 'Khách lẻ / Showroom',
      value: retailCount,
      sub: 'Giá niêm yết bán lẻ',
      icon: 'ShoppingCart',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    {
      title: 'Đã phát sinh đơn',
      value: lockedCount,
      sub: 'Bảo vệ giá, chỉ tạo bản mới',
      icon: 'ShieldCheck',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {stats.map((stat, idx) => {
        const IconComponent = Icons[stat.icon] || Icons.Tags;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl border bg-white ${stat.border} shadow-xs hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 line-clamp-1">
                {stat.title}
              </span>
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                <IconComponent size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-800 tracking-tight">
                {stat.value}
              </span>
              <span className="text-xs text-gray-400">bảng</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 line-clamp-1">
              {stat.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
};
