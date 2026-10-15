import React, { useState, useEffect } from 'react';
import {
  Truck,
  ArrowLeft,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Clock,
  User,
  Phone,
  MapPin,
  Building2,
  CheckCircle2,
  RefreshCw,
  GripVertical
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import type { DeliveryTripStop } from '../../types/deliveryTrip';
import {
  fetchDispatchedOrdersForRouting,
  createDeliveryTrip
} from '../../services/deliveryTripApi';

export const DeliveryTripCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Warehouse Selection
  const [warehouseId, setWarehouseId] = useState<number>(1);
  const [availableOrders, setAvailableOrders] = useState<DeliveryTripStop[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);

  // Filter for Left Column (Chờ xếp chuyến)
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Selected Stops in Right Column (Đang xếp chuyến)
  const [assignedStops, setAssignedStops] = useState<DeliveryTripStop[]>([]);

  // Drag & Drop State
  const [draggedOrder, setDraggedOrder] = useState<DeliveryTripStop | null>(null);

  // Form Fields (AC2)
  const [driverName, setDriverName] = useState<string>('Nguyễn Văn Mạnh');
  const [driverPhone, setDriverPhone] = useState<string>('0912.334.556');
  const [vehiclePlate, setVehiclePlate] = useState<string>('29C-912.45');
  const [expectedReturnAt, setExpectedReturnAt] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 5);
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load available dispatched orders
  useEffect(() => {
    loadDispatchedOrders(warehouseId);
  }, [warehouseId]);

  const loadDispatchedOrders = async (whId: number) => {
    setLoadingOrders(true);
    setAssignedStops([]);
    try {
      const orders = await fetchDispatchedOrdersForRouting(whId);
      setAvailableOrders(orders);
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể tải đơn đã xuất kho', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Trích xuất danh sách các quận/huyện duy nhất để lọc nhanh theo khu vực (AC1)
  const districts = Array.from(
    new Set(availableOrders.map((o) => o.district || 'Khu vực nội thành'))
  ).filter(Boolean);

  // Lọc danh sách chờ
  const filteredAvailable = availableOrders.filter((order) => {
    // Không hiện các đơn đã được đưa vào chuyến bên phải
    if (assignedStops.some((s) => s.orderId === order.orderId)) return false;

    if (districtFilter !== 'ALL' && order.district !== districtFilter) return false;

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      const match =
        order.orderCode.toLowerCase().includes(kw) ||
        order.customerName.toLowerCase().includes(kw) ||
        order.deliveryAddress.toLowerCase().includes(kw);
      if (!match) return false;
    }
    return true;
  });

  // Action: Thêm đơn vào chuyến (Click hoặc Drag)
  const handleAddStop = (order: DeliveryTripStop) => {
    setAssignedStops((prev) => [
      ...prev,
      { ...order, stopSequence: prev.length + 1 }
    ]);
  };

  // Action: Xóa đơn khỏi chuyến
  const handleRemoveStop = (orderId: number) => {
    setAssignedStops((prev) => {
      const next = prev.filter((s) => s.orderId !== orderId);
      return next.map((s, idx) => ({ ...s, stopSequence: idx + 1 }));
    });
  };

  // Action: Gom tất cả các đơn của khu vực đang xem vào chuyến
  const handleAddAllFiltered = () => {
    setAssignedStops((prev) => {
      const next = [...prev];
      filteredAvailable.forEach((order) => {
        if (!next.some((s) => s.orderId === order.orderId)) {
          next.push({ ...order, stopSequence: next.length + 1 });
        }
      });
      return next;
    });
  };

  // Action: Di chuyển thứ tự điểm giao lên / xuống
  const handleMoveStop = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === assignedStops.length - 1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const newStops = [...assignedStops];
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;

    setAssignedStops(newStops.map((s, idx) => ({ ...s, stopSequence: idx + 1 })));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, order: DeliveryTripStop) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(order));
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToTrip = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedOrder) return;
    if (!assignedStops.some((s) => s.orderId === draggedOrder.orderId)) {
      handleAddStop(draggedOrder);
    }
    setDraggedOrder(null);
  };

  // Submit tạo chuyến giao hàng
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignedStops.length === 0) {
      showToast('Cảnh báo', 'Vui lòng chọn ít nhất 1 điểm giao cho chuyến xe!', 'info');
      return;
    }
    if (!driverName.trim()) {
      showToast('Cảnh báo', 'Vui lòng nhập tên tài xế / người giao!', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const trip = await createDeliveryTrip({
        warehouseId,
        orderIds: assignedStops.map((s) => s.orderId),
        vehiclePlate: vehiclePlate.trim(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        expectedReturnAt: new Date(expectedReturnAt).toISOString(),
        note: note.trim()
      });

      showToast('Thành công', `Đã lập chuyến giao hàng ${trip.code}!`, 'success');
      navigate(`/inventory/delivery-trips/${trip.id}`);
    } catch (err: any) {
      showToast('Lỗi lập chuyến', err.message || 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAssignedValue = assignedStops.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory/delivery-trips')}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              Lập Chuyến Giao Hàng & Phân Tuyến Theo Khu Vực (S6-06)
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Gom nhiều phiếu xuất vào một chuyến xe, kéo thả/chọn thứ tự giao và gán phương tiện
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/inventory/delivery-trips')}
          className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Hủy bỏ
        </button>
      </div>

      {/* Select Warehouse Row */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-blue-600" />
          <div>
            <div className="text-xs font-bold text-gray-900 uppercase">Kho hàng xuất phát:</div>
            <div className="text-[11px] text-gray-500">Các đơn trên cùng một chuyến phải xuất từ cùng một kho</div>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(Number(e.target.value))}
            className="w-full text-xs font-semibold border border-blue-300 rounded-xl px-3 py-2 bg-blue-50/50 text-blue-950 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            {SYSTEM_WAREHOUSES.map((wh) => (
              <option key={wh.id} value={wh.id}>
                📍 {wh.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GIAO DIỆN KÉO THẢ & CHỌN CHUYẾN (TEST FE / SUBTASK) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CỘT TRÁI: ĐƠN HÀNG ĐÃ XUẤT CHỜ XẾP CHUYẾN (GOM THEO KHU VỰC - AC1) */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col h-[640px]">
          <div className="border-b border-gray-100 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                Phiếu Xuất Chờ Xếp Chuyến ({filteredAvailable.length})
              </h2>
              {filteredAvailable.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllFiltered}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  + Gom tất cả vào chuyến
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Chọn hoặc kéo thả các điểm giao sang cột bên phải để xếp vào xe
            </p>

            {/* Bộ lọc khu vực (AC1: Gom theo khu vực) */}
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-48">
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5 bg-gray-50 outline-none"
                >
                  <option value="ALL">📍 Tất cả khu vực</option>
                  {districts.map((dist, idx) => (
                    <option key={idx} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo mã đơn, khách, địa chỉ..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          {/* Danh sách đơn hàng bên trái */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingOrders ? (
              <div className="p-8 text-center text-gray-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs">Đang tải phiếu xuất kho...</p>
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-gray-700">Đã xếp hết các đơn khả dụng</p>
                <p className="text-[11px] text-gray-400">Không còn đơn chờ trong bộ lọc hiện tại</p>
              </div>
            ) : (
              filteredAvailable.map((order) => (
                <div
                  key={order.orderId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order)}
                  className="p-3 bg-gray-50 hover:bg-blue-50/60 rounded-xl border border-gray-200 transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 text-xs">
                          {order.orderCode}
                        </span>
                        {order.district && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-medium">
                            {order.district}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-800 text-xs truncate mt-0.5">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                        <span>{order.deliveryAddress}</span>
                      </div>
                      <div className="text-[11px] text-gray-600 font-mono mt-1 flex items-center justify-between">
                        <span>📞 {order.receiverPhone}</span>
                        <strong className="text-blue-700">
                          {order.totalAmount?.toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Button Click to Add */}
                  <button
                    type="button"
                    onClick={() => handleAddStop(order)}
                    title="Đưa vào chuyến"
                    className="p-2 bg-white hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg border border-gray-200 transition-colors shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI: LỘ TRÌNH ĐIỂM GIAO CỦA CHUYẾN XE NÀY (HỖ TRỢ THAY ĐỔI THỨ TỰ) */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropToTrip}
          className="bg-white p-5 rounded-2xl shadow-xs border border-blue-200 flex flex-col h-[640px]"
        >
          <div className="border-b border-gray-100 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                Lộ Trình Chuyến Xe ({assignedStops.length} điểm giao)
              </h2>
              {assignedStops.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAssignedStops([])}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Xóa tất cả
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Thứ tự từ trên xuống dưới là thứ tự xe sẽ ghé giao (Kéo thả hoặc dùng nút ↑ ↓ để tối ưu vòng chạy)
            </p>
          </div>

          {/* Danh sách các điểm dừng trên chuyến */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {assignedStops.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/20 text-gray-500 space-y-2">
                <Truck className="w-10 h-10 text-blue-400 stroke-1" />
                <p className="text-xs font-bold text-gray-700">Chưa có điểm giao nào trong chuyến</p>
                <p className="text-[11px] text-gray-400 max-w-xs">
                  Bấm nút <strong>"+"</strong> hoặc <strong>Kéo thả</strong> các phiếu xuất từ cột bên trái vào đây để xếp chuyến.
                </p>
              </div>
            ) : (
              assignedStops.map((stop, idx) => (
                <div
                  key={stop.orderId}
                  className="p-3 bg-white rounded-xl border-2 border-blue-100 hover:border-blue-300 transition-all shadow-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Số thứ tự điểm dừng */}
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                      #{idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 text-xs">
                          {stop.orderCode}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {stop.receiverName} • {stop.receiverPhone}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-800 text-xs truncate">
                        {stop.customerName}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{stop.deliveryAddress}</span>
                      </div>
                      <div className="text-[11px] font-bold text-blue-700 font-mono mt-0.5">
                        Thu COD: {stop.totalAmount?.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>

                  {/* Actions: Sắp xếp thứ tự & Xóa */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStop(idx, 'UP')}
                      title="Chuyển lên đầu lộ trình"
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === assignedStops.length - 1}
                      onClick={() => handleMoveStop(idx, 'DOWN')}
                      title="Chuyển xuống sau"
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.orderId)}
                      title="Bỏ khỏi chuyến"
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tóm tắt chân bảng */}
          {assignedStops.length > 0 && (
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-600">
                Tổng cộng: <strong className="text-gray-900">{assignedStops.length} điểm dừng</strong>
              </span>
              <span className="text-blue-700 font-bold">
                Tiền hàng trên xe: {totalAssignedValue.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THÔNG TIN TÀI XẾ & PHƯƠNG TIỆN (AC2) */}
      {/* ========================================================================= */}
      <form onSubmit={handleCreateTrip} className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
          Gán Tài Xế & Phương Tiện Cho Chuyến Xe (AC2)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Tên tài xế */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              Tên tài xế / người giao: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn Mạnh..."
              required
              className="w-full font-medium border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>

          {/* Số điện thoại tài xế */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-600" />
              Số điện thoại tài xế:
            </label>
            <input
              type="text"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="Ví dụ: 0912.334.556..."
              className="w-full font-medium border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>

          {/* Biển số xe */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              Biển số xe / Phương tiện:
            </label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="Ví dụ: 29C-912.45..."
              className="w-full font-mono font-bold border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none uppercase"
            />
          </div>

          {/* Thời gian dự kiến về kho */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Thời gian dự kiến giao xong & về kho: <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={expectedReturnAt}
              onChange={(e) => setExpectedReturnAt(e.target.value)}
              required
              className="w-full font-medium border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Hệ thống sẽ tự động cảnh báo chuyến trễ hạn nếu quá thời gian này.
            </p>
          </div>

          {/* Ghi chú lộ trình */}
          <div className="md:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Ghi chú lộ trình / Dặn dò tài xế:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Chú ý đường cấm xe tải giờ cao điểm, ưu tiên giao Đại lý VinMart trước 11h..."
              className="w-full font-medium border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/inventory/delivery-trips')}
            className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={assignedStops.length === 0 || submitting}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang xuất bến...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                Khởi Hành Chuyến Xe ({assignedStops.length} điểm)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
