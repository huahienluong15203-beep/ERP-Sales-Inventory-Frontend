import React from 'react';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Lock
} from '../common/Icons';

interface ProductPriceSummaryCardsProps {
  totalRecords: number;
  increaseCount: number;
  decreaseCount: number;
  selectedProductCount: number;
}

export const ProductPriceSummaryCards: React.FC<ProductPriceSummaryCardsProps> = ({
  totalRecords,
  increaseCount,
  decreaseCount,
  selectedProductCount
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Thẻ 1: Tổng số biến động giá */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tổng Lịch Sử Giá
          </span>
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <FileText size={20} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalRecords}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            lần điều chỉnh
          </span>
        </div>
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
          Đang theo dõi {selectedProductCount} SKU sản phẩm
        </div>
      </div>

      {/* Thẻ 2: Điều chỉnh tăng giá */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Điều Chỉnh Tăng
          </span>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {increaseCount}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            bản ghi tăng giá
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Chủ yếu do giá vỏ lon & nguyên vật liệu quý 4
        </div>
      </div>

      {/* Thẻ 3: Hỗ trợ giảm giá / Kích cầu */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Hỗ Trợ Giảm Giá
          </span>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <TrendingDown size={20} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {decreaseCount}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            chính sách ưu đãi
          </span>
        </div>
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          Chương trình kích cầu mùa mưa & trợ giá đại lý
        </div>
      </div>

      {/* Thẻ 4: Chuẩn kiểm toán ERP bất biến */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm hover:shadow-md transition relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-3 translate-y-3 pointer-events-none">
          <ShieldCheck size={90} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Chuẩn Kiểm Toán ERP
          </span>
          <div className="p-2.5 rounded-xl bg-white/10 text-amber-400">
            <Lock size={18} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-black text-amber-400">
            100% BẤT BIẾN
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-300">
          Lịch sử giá không thể sửa và không thể xoá
        </div>
      </div>
    </div>
  );
};
