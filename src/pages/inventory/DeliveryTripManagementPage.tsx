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
  X,
  Search
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
import { Pagination } from '../../components/common/Pagination';

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
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Pagination state (0-indexed)
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    const isBroad = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_ACCOUNTANT' || currentRole === 'ROLE_SALES_MANAGER';
    if (!isBroad && allowedWarehouses.length === 1 && warehouseId !== Number(allowedWarehouses[0].id)) {
      setWarehouseId(Number(allowedWarehouses[0].id));
    }
  }, [allowedWarehouses, currentRole, warehouseId]);

  // Lọc danh sách chuyến giao theo từ khóa tìm kiếm (mã chuyến, tài xế, biển số xe, SĐT, kho, ghi chú, điểm giao)
  const filteredTrips = useMemo(() => {
    if (!searchKeyword.trim()) return trips;
    const kw = searchKeyword.trim().toLowerCase();
    return trips.filter((trip) => {
      const matchCode = trip.code?.toLowerCase().includes(kw);
      const matchDriver = trip.driverName?.toLowerCase().includes(kw);
      const matchPlate = trip.vehiclePlate?.toLowerCase().includes(kw);
      const matchPhone = trip.driverPhone?.toLowerCase().includes(kw);
      const matchWarehouse =
        trip.warehouseName?.toLowerCase().includes(kw) ||
        trip.warehouseCode?.toLowerCase().includes(kw);
      const matchNote = trip.note?.toLowerCase().includes(kw);
      const matchStops = trip.stops?.some((stop) =>
        stop.orderCode?.toLowerCase().includes(kw) ||
        stop.customerName?.toLowerCase().includes(kw) ||
        stop.deliveryAddress?.toLowerCase().includes(kw) ||
        stop.receiverName?.toLowerCase().includes(kw) ||
        stop.receiverPhone?.toLowerCase().includes(kw) ||
        stop.district?.toLowerCase().includes(kw) ||
        stop.province?.toLowerCase().includes(kw) ||
        stop.regionName?.toLowerCase().includes(kw)
      );
      return Boolean(
        matchCode ||
        matchDriver ||
        matchPlate ||
        matchPhone ||
        matchWarehouse ||
        matchNote ||
        matchStops
      );
    });
  }, [trips, searchKeyword]);

  const totalElements = filteredTrips.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  // Reset page nếu trang hiện tại vượt quá tổng số trang
  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(0);
    }
  }, [page, totalPages]);

  // Phân trang trên client
  const pagedTrips = useMemo(() => {
    const start = page * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, page, pageSize]);

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
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Lập chuyến giao mới</span>
          </button>
        )}
      </div>

      {/* KPI Stats Bar (3 thẻ: Trễ hạn, Đơn hàng đang giao, Giá trị hàng trên xe) */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-red-600">Chuyến trễ hạn</p>
              <p className="text-xl md:text-2xl font-black text-red-600">{summary.overdueTrips} chuyến</p>
            </div>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-orange-600">Đơn hàng đang giao</p>
              <p className="text-xl md:text-2xl font-black text-gray-900">{summary.ordersOnRoad} đơn</p>
            </div>
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-emerald-700">Giá trị hàng trên xe</p>
              <p className="text-lg md:text-xl font-black text-emerald-700">
                {summary.valueOnRoad.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Tabs */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả chuyến xe' },
            { key: 'IN_PROGRESS', label: 'Đang lưu thông' },
            { key: 'COMPLETED', label: 'Đã về kho' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(0);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-[#F85606] text-white font-extrabold shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
            {/* Dropdown Kho */}
            <div className="w-full sm:w-64 shrink-0">
              <select
                value={warehouseId ?? ''}
                onChange={(e) => {
                  setWarehouseId(e.target.value ? Number(e.target.value) : undefined);
                  setPage(0);
                }}
                className="w-full text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-orange-200 focus:border-[#F85606] outline-none shadow-2xs cursor-pointer"
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

            {/* Ô Tìm kiếm chuyến xe */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(0);
                }}
                placeholder="Tìm mã chuyến, tài xế, biển số xe, SĐT..."
                className="w-full text-xs pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-orange-200 focus:border-[#F85606] outline-none shadow-2xs"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword('');
                    setPage(0);
                  }}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Xoá tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-600 font-medium shrink-0">
            Có <strong className="text-gray-900 font-bold">{summary?.unassignedDispatchedOrders || 0}</strong> đơn đã xuất kho đang chờ lập chuyến
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F85606]" />
            <p className="text-xs font-bold">Đang tải danh sách chuyến giao hàng...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Truck className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-black text-gray-800">Chưa có chuyến giao hàng nào</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Quản lý kho có thể gom các đơn đã xuất kho thành các chuyến giao theo từng khu vực để xe chạy vòng quanh.
            </p>
            {isWarehouseStaff && (
              <button
                onClick={() => navigate('/inventory/delivery-trips/create')}
                className="mt-2 px-4 py-2 bg-[#F85606] hover:bg-[#E04D05] text-white text-xs font-bold rounded-lg shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Lập chuyến đầu tiên
              </button>
            )}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Search className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-black text-gray-800">Không tìm thấy chuyến giao hàng phù hợp</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Không có chuyến xe nào khớp với từ khóa <strong>"{searchKeyword}"</strong>. Vui lòng kiểm tra lại mã chuyến, tên tài xế hoặc biển số xe.
            </p>
            <button
              onClick={() => {
                setSearchKeyword('');
                setPage(0);
              }}
              className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc tìm kiếm</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Mã chuyến</th>
                  <th className="py-3 px-4">Kho xuất phát</th>
                  <th className="py-3 px-4 text-center">Tiến độ điểm giao</th>
                  <th className="py-3 px-4 text-right">Tiền hàng / Trên xe</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedTrips.map((trip) => {
                  const percent =
                    trip.totalStops > 0 ? Math.round((trip.deliveredStops / trip.totalStops) * 100) : 0;
                  return (
                    <tr
                      key={trip.id}
                      onClick={() => navigate(`/inventory/delivery-trips/${trip.id}`)}
                      className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                      title="Nhấn vào dòng để xem chi tiết chuyến giao hàng"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900 text-xs">
                        <div className="group-hover:text-[#F85606] flex items-center gap-2 transition-colors">
                          <Truck className="w-4 h-4 text-[#F85606] shrink-0" />
                          <span>{trip.code}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900 text-xs">
                        {trip.warehouseName}
                      </td>
                      <td className="py-3.5 px-4 text-center w-56">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-900">
                              {trip.deliveredStops}/{trip.totalStops} điểm
                            </span>
                            <span className="font-bold text-[#F85606]">{percent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#F85606] h-2 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {trip.totalValue && trip.totalValue > 0 ? (
                          <div>
                            <div className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                              {trip.totalValue.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="text-[11px] mt-0.5">
                              {trip.valueOnRoad > 0 ? (
                                <span className="text-[#F85606] font-semibold">
                                  Trên xe: {trip.valueOnRoad.toLocaleString('vi-VN')} đ
                                </span>
                              ) : trip.failedStops > 0 ? (
                                trip.deliveredStops > 0 ? (
                                  <span className="text-amber-700 font-semibold" title={`${trip.failedStops} điểm giao thất bại hoàn kho`}>
                                    Giao {trip.deliveredStops}/{trip.totalStops} (⚠️ {trip.failedStops} hoàn kho)
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-semibold" title="Tất cả điểm giao không thành công và đã hoàn lại kho">
                                    ⚠️ Giao không thành công
                                  </span>
                                )
                              ) : (
                                <span className="text-emerald-700 font-semibold">
                                  ✓ Đã giao hết
                                </span>
                              )}
                            </div>
                          </div>
                        ) : trip.valueOnRoad > 0 ? (
                          <div>
                            <div className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                              {trip.valueOnRoad.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="text-[11px] text-orange-600 font-semibold mt-0.5">
                              Đang trên đường
                            </div>
                          </div>
                        ) : percent === 100 && trip.failedStops === 0 ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                              ✓ Đã giao xong
                            </span>
                            <div className="text-[11px] text-gray-500 font-medium mt-0.5">Trên xe: 0 đ</div>
                          </div>
                        ) : trip.failedStops > 0 && trip.deliveredStops === 0 ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-red-800 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-xs">
                              ⚠️ Giao không thành công
                            </span>
                            <div className="text-[11px] text-gray-500 font-medium mt-0.5">Trên xe: 0 đ</div>
                          </div>
                        ) : (
                          <span className="font-mono text-gray-500 font-semibold text-xs">0 đ</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div className="font-medium text-gray-800 leading-normal">
                          <span className="text-gray-500 font-normal">Xuất: </span>
                          <span className="font-mono font-bold text-gray-900">
                            {trip.departedAt ? (
                              `${new Date(trip.departedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${new Date(trip.departedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                            ) : (
                              'Chờ'
                            )}
                          </span>
                        </div>
                        <div className="mt-0.5 font-medium leading-normal">
                          {trip.completedAt ? (
                            <div className="text-emerald-800">
                              <span className="text-gray-500 font-normal">Về: </span>
                              <span className="font-mono font-bold">
                                {new Date(trip.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                                {new Date(trip.completedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <div className="text-gray-700">
                              <span className="text-gray-500 font-normal">Dự kiến: </span>
                              <span className="font-mono font-bold">
                                {new Date(trip.expectedReturnAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                                {new Date(trip.expectedReturnAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                        {trip.overdue && !trip.completedAt && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                            {formatOverdueTime(trip.overdueMinutes)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {trip.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Đang lưu thông
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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

        {/* Phân trang danh sách chuyến giao */}
        {!loading && filteredTrips.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={pageSize}
            itemLabel="chuyến giao"
            onPageChange={(p) => setPage(p)}
            onSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
            disabled={loading}
          />
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
