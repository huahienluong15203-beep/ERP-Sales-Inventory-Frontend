import React from 'react';
import { Icons } from '../common/Icons';
import type { VolumeDiscountPolicy } from '../../types/discount';

interface VolumeDiscountStatsProps {
  policies: VolumeDiscountPolicy[];
}

export const VolumeDiscountStats: React.FC<VolumeDiscountStatsProps> = ({ policies }) => {
  const totalCount = policies.length;
  const activeCount = policies.filter((p) => p.status === 'ACTIVE').length;
  const skuCount = policies.filter((p) => p.scopeType === 'SKU').length;
  const categoryCount = policies.filter((p) => p.scopeType === 'CATEGORY').length;
  const totalDiscountGiven = policies.reduce((acc, p) => acc + (p.totalDiscountGiven || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Tổng chính sách */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng chính sách
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {totalCount}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Icons.Tags size={24} />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {activeCount} đang hiệu lực
          </span>
          <span className="mx-1.5">•</span>
          <span>{totalCount - activeCount} tạm dừng/hết hạn</span>
        </div>
      </div>

      {/* 2. Chiết khấu theo SKU */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chính sách theo SKU
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {skuCount}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Icons.Package size={24} />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Ưu đãi bậc số lượng riêng biệt từng sản phẩm
        </p>
      </div>

      {/* 3. Chiết khấu theo Nhóm hàng */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Theo Nhóm hàng
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {categoryCount}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Icons.Boxes size={24} />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Áp dụng đồng bộ cho toàn bộ sản phẩm cùng nhóm
        </p>
      </div>

      {/* 4. Tổng chiết khấu đã hỗ trợ */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng CK đã cấp
            </p>
            <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {(totalDiscountGiven / 1000000).toFixed(1)} tr đ
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Icons.BadgeDollarSign size={24} />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-500 dark:text-slate-400">
          <Icons.CheckSquare size={14} className="mr-1 text-emerald-600 dark:text-emerald-400" />
          <span>Tự động tối ưu theo Best-Deal</span>
        </div>
      </div>
    </div>
  );
};
