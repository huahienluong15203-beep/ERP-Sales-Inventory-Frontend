import React from 'react';
import { useNavigate } from '../../routes/Router';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Truck,
  AlertTriangle,
  Boxes,
  Zap,
  RefreshCw
} from 'lucide-react';
import type { ExecutiveDashboardSummary } from '../../types/dashboard';

interface ExecutiveKpiWidgetsProps {
  summary: ExecutiveDashboardSummary | null;
  responseTimeMs?: number;
  fromCache?: boolean;
  onRefreshCache?: () => void;
  refreshing?: boolean;
  loading?: boolean;
}

export const ExecutiveKpiWidgets: React.FC<ExecutiveKpiWidgetsProps> = ({
  summary,
  responseTimeMs = 0,
  fromCache = false,
  onRefreshCache,
  refreshing = false,
  loading = false
}) => {
  const navigate = useNavigate();

  const formatVnd = (amount: number | null | undefined) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="space-y-3">
      {/* Performance & Cache Status Bar (AC 4: Tải dưới 2 giây) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-500" />
          <span>
            Thời gian phản hồi:{' '}
            <strong className={responseTimeMs > 2000 ? 'text-amber-600' : 'text-emerald-600'}>
              {responseTimeMs} ms
            </strong>{' '}
            (Tiêu chí AC4 &lt; 2.0s)
          </span>
          <span className="text-gray-300">•</span>
          <span className="inline-flex items-center gap-1 font-medium">
            Bộ nhớ đệm:{' '}
            <strong className={fromCache ? 'text-blue-600' : 'text-gray-700'}>
              {fromCache ? 'Đã lưu Cache (Tối ưu tải nhanh)' : 'Tính toán thời gian thực'}
            </strong>
          </span>
        </div>

        {onRefreshCache && (
          <button
            type="button"
            onClick={onRefreshCache}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold transition cursor-pointer disabled:opacity-50 text-[11px]"
            title="Làm mới bộ đệm dữ liệu"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-orange-500' : ''} />
            <span>{refreshing ? 'Đang làm mới...' : 'Làm mới Cache'}</span>
          </button>
        )}
      </div>

      {/* 6 Thẻ chỉ số điều hành (AC 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* 1. Doanh số hôm nay */}
        <div className="erp-stat-card border-l-4 border-l-orange-500 p-4">
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">DOANH SỐ HÔM NAY</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <DollarSign size={17} />
            </div>
          </div>
          <div className="text-base font-black text-gray-900 font-mono mt-1">
            {loading ? '...' : formatVnd(summary?.revenueToday)}
          </div>
          <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
            <TrendingUp size={11} />
            <span>Ghi nhận trong ngày</span>
          </div>
        </div>

        {/* 2. Doanh số tháng này */}
        <div className="erp-stat-card border-l-4 border-l-blue-500 p-4">
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">DOANH SỐ THÁNG NÀY</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={17} />
            </div>
          </div>
          <div className="text-base font-black text-gray-900 font-mono mt-1">
            {loading ? '...' : formatVnd(summary?.revenueThisMonth)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            <span>Đơn đã xuất/giao thành công</span>
          </div>
        </div>

        {/* 3. Đơn chờ duyệt */}
        <div
          onClick={() => navigate('/orders?status=PENDING_APPROVAL')}
          className="erp-stat-card border-l-4 border-l-amber-500 p-4 cursor-pointer hover:bg-amber-50/20 transition"
          title="Bấm để xem danh sách đơn chờ duyệt"
        >
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">ĐƠN CHỜ DUYỆT</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={17} />
            </div>
          </div>
          <div className="text-lg font-black text-amber-700 font-mono mt-1">
            {loading ? '...' : (summary?.pendingApprovalOrders ?? 0)}
          </div>
          <div className="text-[10px] text-amber-600 font-bold mt-1">
            <span>Cần Quản lý phê duyệt &gt;</span>
          </div>
        </div>

        {/* 4. Đơn chờ xuất */}
        <div
          onClick={() => navigate('/orders?status=APPROVED,PICKING')}
          className="erp-stat-card border-l-4 border-l-indigo-500 p-4 cursor-pointer hover:bg-indigo-50/20 transition"
          title="Bấm để xem danh sách đơn chờ xuất kho"
        >
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">ĐƠN CHỜ XUẤT</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck size={17} />
            </div>
          </div>
          <div className="text-lg font-black text-indigo-700 font-mono mt-1">
            {loading ? '...' : (summary?.pendingDispatchOrders ?? 0)}
          </div>
          <div className="text-[10px] text-indigo-600 font-bold mt-1">
            <span>Kho đang soạn & xuất &gt;</span>
          </div>
        </div>

        {/* 5. Công nợ quá hạn */}
        <div
          onClick={() => navigate('/debts/ledger')}
          className="erp-stat-card border-l-4 border-l-rose-500 p-4 cursor-pointer hover:bg-rose-50/20 transition"
          title="Bấm để xem sổ công nợ"
        >
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">CÔNG NỢ QUÁ HẠN</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={17} />
            </div>
          </div>
          <div className="text-base font-black text-rose-600 font-mono mt-1">
            {loading ? '...' : formatVnd(summary?.overdueDebtAmount)}
          </div>
          <div className="text-[10px] text-rose-600 font-bold mt-1">
            <span>Cảnh báo thu hồi nợ &gt;</span>
          </div>
        </div>

        {/* 6. SKU dưới tồn tối thiểu */}
        <div
          onClick={() => navigate('/inventory/stock-ledger?stockStatus=BELOW_MIN')}
          className="erp-stat-card border-l-4 border-l-purple-500 p-4 cursor-pointer hover:bg-purple-50/20 transition"
          title="Bấm để xem danh sách SKU dưới tồn tối thiểu"
        >
          <div className="erp-stat-card-top">
            <span className="erp-stat-label">SKU DƯỚI TỒN TỐI THIỂU</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Boxes size={17} />
            </div>
          </div>
          <div className="text-lg font-black text-purple-700 font-mono mt-1">
            {loading ? '...' : (summary?.skusBelowMinStock ?? 0)}
          </div>
          <div className="text-[10px] text-purple-600 font-bold mt-1">
            <span>Cần nhập bổ sung kho &gt;</span>
          </div>
        </div>
      </div>
    </div>
  );
};
