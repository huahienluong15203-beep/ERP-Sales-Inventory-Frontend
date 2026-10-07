import React from 'react';
import type { SupplierStatsData } from '../../types/supplier';
import { Icons } from '../common/Icons';

interface SupplierStatsProps {
  stats: SupplierStatsData;
}

export const SupplierStats: React.FC<SupplierStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Tổng số đối tác */}
      <div className="p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Tổng đối tác</span>
          <span className="text-2xl font-bold text-gray-900 mt-1 block">{stats.total}</span>
          <p className="text-[11px] text-gray-400 mt-0.5">Nguồn hàng liên kết</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
          <Icons.Building2 size={24} />
        </div>
      </div>

      {/* 2. Đang giao dịch */}
      <div className="p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Đang giao dịch</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">{stats.activeCount}</span>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Sẵn sàng nhận phiếu nhập kho</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <Icons.CheckCircle2 size={24} />
        </div>
      </div>

      {/* 3. Ngừng giao dịch */}
      <div className="p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Ngừng giao dịch</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{stats.inactiveCount}</span>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Tạm dừng để đối soát nguồn hàng</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <Icons.AlertTriangle size={24} />
        </div>
      </div>

      {/* 4. Điều khoản thanh toán */}
      <div className="p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Đ/K thanh toán</span>
          <span className="text-2xl font-bold text-blue-600 mt-1 block">{stats.hasPaymentTermsCount}</span>
          <p className="text-[11px] text-gray-400 mt-0.5">Đã thiết lập công nợ thanh toán</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Icons.Receipt size={24} />
        </div>
      </div>
    </div>
  );
};
