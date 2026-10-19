import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Package,
  CheckCheck,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import type { DeliveryTrip, InTransitSummary } from '../../types/deliveryTrip';
import {
  fetchDeliveryTrips,
  fetchInTransitSummary,
  completeTripWithAutoResolve,
  formatOverdueTime
} from '../../services/deliveryTripApi';
import { getAllowedWarehouses, type WarehouseOption } from '../../types/inventory';

export const DeliveryTripManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast, currentRole } = useAuth();

  const isWarehouseStaff = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  // Lọc danh sách kho mà người dùng có quyền phụ trách (kho nào không có quyền thì không hiện)
  const allowedWarehouses = useMemo(() => {
    return getAllowedWarehouses(user, currentRole);
  }, [user, currentRole]);

  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [summary, setSummary] = useState<InTransitSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [warehouseId, setWarehouseId] = useState<number | undefined>(() => {
    const isBroad = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_ACCOUNTANT' || currentRole === 'ROLE_SALES_MANAGER';
    if (!isBroad && allowedWarehouses.length === 1) {
      return Number(allowedWarehouses[0].id);
    }
    return undefined;
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const isBroad = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_ACCOUNTANT' || currentRole === 'ROLE_SALES_MANAGER';
    if (!isBroad && allowedWarehouses.length === 1 && warehouseId !== Number(allowedWarehouses[0].id)) {
      setWarehouseId(Number(allowedWarehouses[0].id));
    }
  }, [allowedWarehouses, currentRole, warehouseId]);

  // Modals
  const [pendingModalTrip, setPendingModalTrip] = useState<DeliveryTrip | null>(null);
  const [resolvingStops, setResolvingStops] = useState<boolean>(false);

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

  // Tự động xác nhận giao đủ và kết thúc chuyến
  const handleAutoResolveAndComplete = async () => {
    if (!pendingModalTrip) return;
    setResolvingStops(true);
    try {
      await completeTripWithAutoResolve(pendingModalTrip.id);
      showToast(
        'Thành công',
        `Chuyến giao ${pendingModalTrip.code} đã hoàn tất và xe đã về kho thành công!`,
        'success'
      );
      setPendingModalTrip(null);
      await loadData();
    } catch (err: any) {
      showToast('Lỗi kết thúc chuyến', err.message || 'Không thể kết thúc chuyến giao', 'error');
    } finally {
      setResolvingStops(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex items-center justify-end">
        {isWarehouseStaff && (
          <button
            onClick={() => navigate('/inventory/delivery-trips/create')}
            className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-3 text-base cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
            <span>Lập chuyến giao mới</span>
          </button>
        )}
      </div>

      {/* KPI Stats Bar (3 thẻ: Trễ hạn, Đơn hàng đang giao, Giá trị hàng trên xe) */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
          <div className="bg-white p-6 rounded-2xl border-2 border-red-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-base font-bold text-red-600">Chuyến trễ hạn</p>
              <p className="text-3xl md:text-4xl font-black text-red-600">{summary.overdueTrips} chuyến</p>
            </div>
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
              <AlertTriangle className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border-2 border-orange-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-base font-bold text-orange-600">Đơn hàng đang giao</p>
              <p className="text-3xl md:text-4xl font-black text-gray-900">{summary.ordersOnRoad} đơn</p>
            </div>
            <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
              <Package className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border-2 border-emerald-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-base font-bold text-emerald-700">Giá trị hàng trên xe</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-700">
                {summary.valueOnRoad.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Clock className="w-8 h-8" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-5">
          {[
            { key: 'ALL', label: 'Tất cả chuyến xe' },
            { key: 'IN_PROGRESS', label: 'Đang lưu thông' },
            { key: 'COMPLETED', label: 'Đã về kho' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-5 py-3 text-base font-bold rounded-xl transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-[#F85606] text-white font-extrabold shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="w-full sm:w-80">
            <select
              value={warehouseId ?? ''}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full text-base font-bold border-2 border-gray-300 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none shadow-sm cursor-pointer"
            >
              {allowedWarehouses.length > 1 && (
                <option value="">🏢 Tất cả kho phụ trách</option>
              )}
              {allowedWarehouses.map((wh: WarehouseOption) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-base text-gray-700 font-semibold">
            Có <strong className="text-gray-900 text-lg font-black">{summary?.unassignedDispatchedOrders || 0}</strong> đơn đã xuất kho đang chờ lập chuyến
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-500 space-y-4">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto text-[#F85606]" />
            <p className="text-lg font-bold">Đang tải danh sách chuyến giao hàng...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="p-20 text-center space-y-5">
            <Truck className="w-20 h-20 text-gray-300 mx-auto" />
            <p className="text-xl font-black text-gray-800">Chưa có chuyến giao hàng nào</p>
            <p className="text-base text-gray-500 max-w-lg mx-auto">
              Quản lý kho có thể gom các đơn đã xuất kho thành các chuyến giao theo từng khu vực để xe chạy vòng quanh.
            </p>
            {isWarehouseStaff && (
              <button
                onClick={() => navigate('/inventory/delivery-trips/create')}
                className="mt-4 px-6 py-3.5 bg-[#F85606] hover:bg-[#E04D05] text-white text-base font-extrabold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                Lập chuyến đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/90 border-b-2 border-gray-200 text-gray-900 font-extrabold uppercase text-sm tracking-wider">
                  <th className="py-4.5 px-6">Mã chuyến</th>
                  <th className="py-4.5 px-6">Kho xuất phát</th>
                  <th className="py-4.5 px-6 text-center">Tiến độ điểm giao</th>
                  <th className="py-4.5 px-6 text-right">Tiền hàng / Trên xe</th>
                  <th className="py-4.5 px-6">Thời gian</th>
                  <th className="py-4.5 px-6 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trips.map((trip) => {
                  const percent =
                    trip.totalStops > 0 ? Math.round((trip.deliveredStops / trip.totalStops) * 100) : 0;
                  return (
                    <tr
                      key={trip.id}
                      onClick={() => navigate(`/inventory/delivery-trips/${trip.id}`)}
                      className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                      title="Nhấn vào dòng để xem chi tiết chuyến giao hàng"
                    >
                      <td className="py-5 px-6 font-mono font-black text-gray-900 text-base">
                        <div className="group-hover:text-[#F85606] flex items-center gap-2.5 transition-colors">
                          <Truck className="w-5 h-5 text-[#F85606] shrink-0" />
                          <span>{trip.code}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 font-bold text-gray-900 text-base">
                        {trip.warehouseName}
                      </td>
                      <td className="py-5 px-6 text-center w-64">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-bold text-gray-900">
                              {trip.deliveredStops}/{trip.totalStops} điểm
                            </span>
                            <span className="font-extrabold text-[#F85606]">{percent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-[#F85606] h-3 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        {trip.totalValue && trip.totalValue > 0 ? (
                          <div>
                            <div className="font-mono font-black text-gray-900 text-base md:text-lg">
                              {trip.totalValue.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="text-sm mt-1">
                              {trip.valueOnRoad > 0 ? (
                                <span className="text-[#F85606] font-bold">
                                  Trên xe: {trip.valueOnRoad.toLocaleString('vi-VN')} đ
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">
                                  ✓ Đã giao hết
                                </span>
                              )}
                            </div>
                          </div>
                        ) : trip.valueOnRoad > 0 ? (
                          <div>
                            <div className="font-mono font-black text-gray-900 text-base md:text-lg">
                              {trip.valueOnRoad.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="text-sm text-orange-600 font-bold mt-1">
                              Đang trên đường
                            </div>
                          </div>
                        ) : percent === 100 ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100/80 px-3 py-1 rounded-lg border border-emerald-300 text-sm">
                              ✓ Đã giao xong
                            </span>
                            <div className="text-sm text-gray-500 font-medium mt-1">Trên xe: 0 đ</div>
                          </div>
                        ) : (
                          <span className="font-mono text-gray-500 font-bold text-base">0 đ</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-sm whitespace-nowrap">
                        <div className="font-medium text-gray-800 leading-relaxed">
                          <span className="text-gray-500 font-semibold">Xuất: </span>
                          <span className="font-mono font-bold text-gray-900">
                            {trip.departedAt ? (
                              `${new Date(trip.departedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${new Date(trip.departedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                            ) : (
                              'Chờ'
                            )}
                          </span>
                        </div>
                        <div className="mt-1 font-medium leading-relaxed">
                          {trip.completedAt ? (
                            <div className="text-emerald-800">
                              <span className="text-gray-500 font-semibold">Về: </span>
                              <span className="font-mono font-bold">
                                {new Date(trip.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                                {new Date(trip.completedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <div className="text-gray-700">
                              <span className="text-gray-500 font-semibold">Dự kiến: </span>
                              <span className="font-mono font-bold">
                                {new Date(trip.expectedReturnAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                                {new Date(trip.expectedReturnAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                        {trip.overdue && !trip.completedAt && (
                          <span className="inline-block mt-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-black text-xs">
                            {formatOverdueTime(trip.overdueMinutes)}
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        {trip.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-extrabold bg-amber-50 text-amber-800 border-2 border-amber-200">
                            <Clock className="w-4 h-4 text-amber-600" />
                            Đang lưu thông
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-extrabold bg-emerald-50 text-emerald-800 border-2 border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Đã về kho
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Xác nhận Xe về kho khi còn điểm giao chưa cập nhật */}
      {pendingModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Xác Nhận Xe Về Kho ({pendingModalTrip.code})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Xe: <strong>{pendingModalTrip.vehiclePlate}</strong> • Tài xế: <strong>{pendingModalTrip.driverName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingModalTrip(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <span>⚠️ Chuyến xe còn {pendingModalTrip.remainingStops}/{pendingModalTrip.totalStops} điểm chưa ghi nhận kết quả</span>
              </div>
              <p className="leading-relaxed text-amber-700">
                Theo quy chuẩn ERP, chuyến xe chỉ được kết thúc khi tất cả hàng hoá trên xe đã được xác nhận kết quả (đã giao thành công hoặc ghi nhận không giao được).
              </p>
              <div className="pt-1 text-[11px] font-semibold text-amber-900 flex justify-between">
                <span>Tiền hàng còn trên xe:</span>
                <span className="font-mono font-bold">{pendingModalTrip.valueOnRoad?.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleAutoResolveAndComplete}
                disabled={resolvingStops}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {resolvingStops ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                <span>Xác nhận giao đủ tất cả & Cho xe về kho</span>
              </button>

              <button
                onClick={() => {
                  const id = pendingModalTrip.id;
                  setPendingModalTrip(null);
                  navigate(`/inventory/delivery-trips/${id}`);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100 text-orange-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-orange-600" />
                <span>Xem chi tiết chuyến để xử lý từng điểm giao</span>
              </button>

              <button
                onClick={() => setPendingModalTrip(null)}
                className="w-full py-2 text-center text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
