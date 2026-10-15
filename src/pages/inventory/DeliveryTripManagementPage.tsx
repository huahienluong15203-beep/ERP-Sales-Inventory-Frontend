import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Eye,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  User,
  Package
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import type { DeliveryTrip, InTransitSummary } from '../../types/deliveryTrip';
import {
  fetchDeliveryTrips,
  fetchInTransitSummary,
  completeDeliveryTrip
} from '../../services/deliveryTripApi';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import { DeliveryTripPrintModal } from '../../components/inventory/DeliveryTripPrintModal';

export const DeliveryTripManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, currentRole } = useAuth();

  const isWarehouseStaff = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [summary, setSummary] = useState<InTransitSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedForPrint, setSelectedForPrint] = useState<DeliveryTrip | null>(null);
  const [completingTripId, setCompletingTripId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tripsData, summaryData] = await Promise.all([
        fetchDeliveryTrips({ warehouseId, status: statusFilter }),
        fetchInTransitSummary()
      ]);
      setTrips(tripsData);
      setSummary(summaryData);
    } catch (err: any) {
      showToast('Lỗi tải dữ liệu', err.message || 'Không thể tải danh sách chuyến giao', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [warehouseId, statusFilter]);

  // Xác nhận xe về kho / kết thúc chuyến
  const handleConfirmComplete = async (trip: DeliveryTrip) => {
    const confirm = window.confirm(
      `Xác nhận xe ${trip.vehiclePlate} (${trip.driverName}) đã hoàn thành giao hàng và quay về kho?`
    );
    if (!confirm) return;

    setCompletingTripId(trip.id);
    try {
      await completeDeliveryTrip(trip.id);
      showToast('Thành công', `Chuyến giao ${trip.code} đã kết thúc hoàn tất`, 'success');
      loadData();
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể kết thúc chuyến giao', 'error');
    } finally {
      setCompletingTripId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
              Quản Lý Phân Tuyến Giao Hàng (Delivery Dispatch)
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">
              Gom nhiều phiếu xuất vào một chuyến xe, gán tài xế và in danh sách điểm giao theo khu vực (S6-06)
            </p>
          </div>
        </div>

        {isWarehouseStaff && (
          <button
            onClick={() => navigate('/inventory/delivery-trips/create')}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Lập chuyến giao mới
          </button>
        )}
      </div>

      {/* KPI Stats Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600">Chuyến đang chạy</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{summary.runningTrips} chuyến</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600">Chuyến trễ hạn</p>
              <p className="text-xl font-bold text-red-600 mt-0.5">{summary.overdueTrips} chuyến</p>
            </div>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600">Đơn hàng đang giao</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{summary.ordersOnRoad} đơn</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600">Giá trị hàng trên xe</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">
                {summary.valueOnRoad.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Tabs */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả chuyến xe' },
            { key: 'IN_PROGRESS', label: 'Đang lưu thông (IN_PROGRESS)' },
            { key: 'COMPLETED', label: 'Đã về kho (COMPLETED)' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="w-full sm:w-64">
            <select
              value={warehouseId ?? ''}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="">🏢 Tất cả kho xuất phát</option>
              {SYSTEM_WAREHOUSES.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Có <strong>{summary?.unassignedDispatchedOrders || 0}</strong> đơn đã xuất kho đang chờ lập chuyến
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm">Đang tải danh sách chuyến giao hàng...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Truck className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-base font-semibold text-gray-700">Chưa có chuyến giao hàng nào</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Quản lý kho có thể gom các đơn đã xuất kho thành các chuyến giao theo từng khu vực để xe chạy vòng quanh.
            </p>
            {isWarehouseStaff && (
              <button
                onClick={() => navigate('/inventory/delivery-trips/create')}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Lập chuyến đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Mã chuyến</th>
                  <th className="py-3 px-4">Kho xuất phát</th>
                  <th className="py-3 px-4">Phương tiện & Tài xế</th>
                  <th className="py-3 px-4 text-center">Tiến độ điểm giao</th>
                  <th className="py-3 px-4 text-right">Tiền hàng trên xe</th>
                  <th className="py-3 px-4">Thời gian xuất / Dự kiến về</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trips.map((trip) => {
                  const percent =
                    trip.totalStops > 0 ? Math.round((trip.deliveredStops / trip.totalStops) * 100) : 0;
                  return (
                    <tr key={trip.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        <button
                          onClick={() => navigate(`/inventory/delivery-trips/${trip.id}`)}
                          className="hover:text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          {trip.code}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {trip.warehouseName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[11px]">
                            {trip.vehiclePlate || 'Xe giao hàng'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-gray-400" />
                          <span>{trip.driverName}</span>
                          {trip.driverPhone && (
                            <span className="text-gray-400">({trip.driverPhone})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center w-40">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-gray-700">
                              {trip.deliveredStops}/{trip.totalStops} điểm
                            </span>
                            <span className="font-bold text-blue-600">{percent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-gray-900">
                        {trip.valueOnRoad?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-4 text-[11px]">
                        <div>Xuất: {trip.departedAt ? new Date(trip.departedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chờ'}</div>
                        <div className="text-gray-500">
                          Về: {new Date(trip.expectedReturnAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </div>
                        {trip.overdue && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                            Trễ {trip.overdueMinutes} phút
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {trip.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Đang lưu thông
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đã về kho
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/inventory/delivery-trips/${trip.id}`)}
                            title="Xem chi tiết lộ trình"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* In danh sách điểm giao AC3 */}
                          <button
                            onClick={() => setSelectedForPrint(trip)}
                            title="In danh sách điểm giao (AC3)"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Xác nhận xe về kho */}
                          {isWarehouseStaff && trip.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleConfirmComplete(trip)}
                              disabled={completingTripId === trip.id}
                              title="Xác nhận xe về kho / Kết thúc chuyến"
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] transition-colors"
                            >
                              Xe về kho
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal In Bảng Kê Điểm Giao */}
      <DeliveryTripPrintModal
        isOpen={Boolean(selectedForPrint)}
        trip={selectedForPrint}
        onClose={() => setSelectedForPrint(null)}
      />
    </div>
  );
};
