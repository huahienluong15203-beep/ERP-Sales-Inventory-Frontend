import React from 'react';
import { Icons } from '../common/Icons';
import type { VolumeDiscountPolicy } from '../../types/discount';
import type { VolumeDiscountStatsData } from '../../services/volumeDiscountApi';

interface VolumeDiscountStatsProps {
  /** Chính sách của trang đang xem (chỉ dùng cho tổng tiền chiết khấu). */
  policies: VolumeDiscountPolicy[];
  /** Số liệu đếm trên toàn bộ chính sách, lấy từ /api/discount-policies/stats */
  stats?: VolumeDiscountStatsData | null;
}

export const VolumeDiscountStats: React.FC<VolumeDiscountStatsProps> = ({ policies, stats }) => {
  const totalCount = stats ? stats.total : policies.length;
  const activeCount = stats ? stats.active : policies.filter((p) => p.status === 'ACTIVE').length;
  const skuCount = stats ? stats.productScope : policies.filter((p) => p.scopeType === 'SKU').length;
  const categoryCount = stats ? stats.categoryScope : policies.filter((p) => p.scopeType === 'CATEGORY').length;
  const totalDiscountGiven = policies.reduce((acc, p) => acc + (p.totalDiscountGiven || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Tổng chính sách */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tổng chính sách
            </p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">
              {totalCount}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F85606] border border-orange-100 shadow-2xs">
            <Icons.Tags size={24} />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-gray-500">
          <span className="font-semibold text-emerald-600">
            {activeCount} đang hiệu lực
          </span>
          <span className="mx-1.5 text-gray-300">•</span>
          <span>{totalCount - activeCount} tạm dừng/hết hạn</span>
        </div>
      </div>

      {/* 2. Chiết khấu theo SKU */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Chính sách theo SKU
            </p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">
              {skuCount}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
            <Icons.Package size={24} />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Ưu đãi bậc số lượng riêng biệt từng SKU sản phẩm
        </p>
      </div>

      {/* 3. Chiết khấu theo Nhóm hàng */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Theo Nhóm hàng
            </p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">
              {categoryCount}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
            <Icons.Boxes size={24} />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Áp dụng đồng bộ cho toàn bộ sản phẩm cùng ngành hàng
        </p>
      </div>

      {/* 4. Tổng chiết khấu đã hỗ trợ */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tổng CK đã cấp
            </p>
            <h3 className="mt-1 text-2xl font-bold text-emerald-600">
              {(totalDiscountGiven / 1000000).toFixed(1)} tr đ
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
            <Icons.BadgeDollarSign size={24} />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-gray-500">
          <Icons.CheckSquare size={14} className="mr-1 text-emerald-600" />
          <span>Tự động tối ưu theo quy tắc Best-Deal</span>
        </div>
      </div>
    </div>
  );
};
