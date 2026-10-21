import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Eye,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { fetchOrders, formatCurrencyVND } from '../../services/orderService';
import type { OrderSummaryItem } from '../../types/order';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';

export const InTransitDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'OVERDUE' | 'ON_TIME'>('ALL');

  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Ngày hiện tại định dạng YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Tải danh sách đơn đang ở trạng thái DISPATCHED (Đã xuất kho / Đang trên đường đi giao)
  const loadInTransitOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOrders({
        statuses: ['DISPATCHED'],
        keyword: keyword.trim() || undefined,
        page,
        size
      });
      setOrders(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      showToast?.(err instanceof Error ? err.message : 'Lỗi tải danh sách hàng đi đường', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, size, showToast]);

  useEffect(() => {
    loadInTransitOrders();
  }, [loadInTransitOrders]);

  // Phân tích trạng thái trễ hẹn của đơn hàng
  const processedOrders = useMemo(() => {
    return orders.map((o) => {
      const isOverdue = Boolean(o.desiredDeliveryDate && o.desiredDeliveryDate < todayStr);
      let overdueDays = 0;
      if (isOverdue && o.desiredDeliveryDate) {
        const diffMs = new Date(todayStr).getTime() - new Date(o.desiredDeliveryDate).getTime();
        overdueDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
      return {
        ...o,
        isOverdue,
        overdueDays
      };
    });
  }, [orders, todayStr]);

  // Lọc theo bộ lọc trễ hạn
  const filteredOrders = useMemo(() => {
    if (scheduleFilter === 'OVERDUE') {
      return processedOrders.filter((o) => o.isOverdue);
    }
    if (scheduleFilter === 'ON_TIME') {
      return processedOrders.filter((o) => !o.isOverdue);
    }
    return processedOrders;
  }, [processedOrders, scheduleFilter]);

  // Số liệu KPI tổng quan
  const stats = useMemo(() => {
    const totalAmount = processedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const overdueCount = processedOrders.filter((o) => o.isOverdue).length;
    const totalCount = processedOrders.length;
    const onTimeCount = totalCount - overdueCount;

    return {
      totalAmount,
      totalCount,
      overdueCount,
      onTimeCount
    };
  }, [processedOrders]);

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. Header tác vụ tinh gọn */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={loadInTransitOrders}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Thẻ KPI Số liệu Tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng tiền hàng trên đường */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 border border-indigo-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Tiền hàng đang đi đường
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">
            {formatCurrencyVND(stats.totalAmount)}
          </div>
          <p className="text-[11px] text-gray-500">
            Tổng giá trị hàng hoá đã rời kho chưa hoàn tất bàn giao
          </p>
        </div>

        {/* Số chuyến / đơn đang giao */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Đơn / Chuyến đang giao
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {stats.totalCount} <span className="text-xs font-normal text-gray-400">chuyến</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Đang vận chuyển trên đường tới đại lý
          </p>
        </div>

        {/* Cảnh báo trễ hẹn */}
        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-300 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={13} className="text-rose-600" />
              <span>Cảnh báo quá hạn giao</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              !
            </div>
          </div>
          <div className="text-2xl font-black text-rose-950 font-mono">
            {stats.overdueCount} <span className="text-xs font-normal text-rose-700">chuyến trễ</span>
          </div>
          <p className="text-[11px] text-rose-800 font-semibold">
            Đã quá ngày hẹn giao cần liên hệ tài xế
          </p>
        </div>

        {/* Chuyến đúng tiến độ */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Đúng tiến độ dự kiến
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950">
            {stats.onTimeCount} <span className="text-xs font-normal text-emerald-700">chuyến</span>
          </div>
          <p className="text-[11px] text-emerald-800">
            Trong khung thời gian cam kết giao hàng
          </p>
        </div>
      </div>

      {/* 3. BẢO VỆ NGUYÊN TẮC: Trách nhiệm chuyến xe */}
      <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/90 text-xs text-blue-900 flex items-start gap-2.5">
        <ShieldAlert size={17} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Quy tắc quản lý hàng đi đường:</strong> Hàng hóa đã xuất kho đang nằm trên xe vẫn thuộc hoàn toàn trách nhiệm của tài xế và chuyến giao. Hàng chưa giao được <strong>tuyệt đối không tự động hoàn về kho</strong> trên hệ thống; chỉ khi có biên bản xử lý trả hàng hoặc nhập lại kho chính thức thì mới được phép ghi giảm trách nhiệm chuyến.
        </div>
      </div>

      {/* 4. Thanh tìm kiếm & bộ lọc */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tìm kiếm từ khóa */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(0);
            }}
            placeholder="Tìm kiếm mã đơn hàng, tên khách hàng, số điện thoại..."
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Lọc theo hạn giao */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <span className="text-xs font-bold text-gray-600 whitespace-nowrap">Tiến độ:</span>
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setScheduleFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                scheduleFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả ({processedOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setScheduleFilter('OVERDUE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                scheduleFilter === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle size={12} />
              <span>Quá hạn ({stats.overdueCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleFilter('ON_TIME')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                scheduleFilter === 'ON_TIME'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Đúng hẹn ({stats.onTimeCount})
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bảng Danh sách các đơn/chuyến hàng đang đi đường */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Mã đơn hàng</th>
                <th className="py-3 px-4">Đại lý / Điểm nhận hàng</th>
                <th className="py-3 px-4 whitespace-nowrap">Thời điểm xuất kho</th>
                <th className="py-3 px-4 whitespace-nowrap">Ngày hẹn giao</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Tiến độ giao</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Tiền hàng trên đường</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Cảnh báo tiến độ</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-blue-500" />
                      <span>Đang tải các chuyến giao đang chạy...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Truck size={32} className="text-gray-300" />
                      <span className="font-semibold">Không có đơn hàng nào đang trên đường vận chuyển</span>
                      <p className="text-xs text-gray-400">Tất cả các đơn đã xuất kho đã hoàn tất giao hàng</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  return (
                    <tr
                      key={o.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        o.isOverdue ? 'bg-rose-50/25' : 'bg-white'
                      }`}
                    >
                      {/* Mã đơn */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="font-mono font-bold text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {o.code}
                        </button>
                        <div className="text-[10px] text-gray-400">
                          {o.lineCount} mặt hàng
                        </div>
                      </td>

                      {/* Khách hàng / Đại lý */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{o.customerName}</div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          Mã KH: {o.customerCode}
                        </div>
                      </td>

                      {/* Thời điểm xuất kho */}
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {o.updatedAt ? new Date(o.updatedAt).toLocaleDateString('vi-VN') : 'Đã xuất kho'}
                      </td>

                      {/* Ngày hẹn giao */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <Calendar size={13} className="text-gray-400" />
                          <span>{o.desiredDeliveryDate || 'Giao tiêu chuẩn'}</span>
                        </div>
                      </td>

                      {/* Tiến độ giao: Điểm đã giao & còn lại (AC 1) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <MapPin size={12} className="text-blue-600" />
                          <span>Còn lại: 1 điểm nhận</span>
                        </div>
                      </td>

                      {/* Tiền hàng trên đường */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-gray-900">
                        {formatCurrencyVND(o.totalAmount)}
                      </td>

                      {/* Cảnh báo tiến độ / Trễ hẹn (AC 3) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {o.isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs animate-pulse">
                            <AlertTriangle size={12} className="text-rose-600" />
                            <span>Quá hạn {o.overdueDays} ngày</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Đúng tiến độ</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Hiển thị <strong>{filteredOrders.length}</strong> / <strong>{totalElements}</strong> chuyến giao
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-semibold px-2 text-gray-700">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
