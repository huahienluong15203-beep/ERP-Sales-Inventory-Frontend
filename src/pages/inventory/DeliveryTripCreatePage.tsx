import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  RefreshCw,
  GripVertical
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { getAllowedWarehouses, type WarehouseOption } from '../../types/inventory';
import type { DeliveryTripStop } from '../../types/deliveryTrip';
import {
  fetchDispatchedOrdersForRouting,
  createDeliveryTrip
} from '../../services/deliveryTripApi';

export const DeliveryTripCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentRole, showToast } = useAuth();

  // Lọc danh sách kho mà người dùng có quyền phụ trách (kho nào không có quyền thì không hiện)
  const allowedWarehouses = useMemo(() => {
    return getAllowedWarehouses(user, currentRole);
  }, [user, currentRole]);

  // Warehouse Selection: Mặc định chọn kho được phân công
  const [warehouseId, setWarehouseId] = useState<number>(() => {
    const list = getAllowedWarehouses(user, currentRole);
    return Number(list[0]?.id || 5);
  });

  // Tự động đồng bộ warehouseId nếu allowedWarehouses thay đổi hoặc warehouseId hiện tại không hợp lệ
  useEffect(() => {
    if (allowedWarehouses.length > 0 && !allowedWarehouses.some((w: WarehouseOption) => Number(w.id) === warehouseId)) {
      setWarehouseId(Number(allowedWarehouses[0].id));
    }
  }, [allowedWarehouses, warehouseId]);
  const [availableOrders, setAvailableOrders] = useState<DeliveryTripStop[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);

  // Filter for Left Column (Chờ xếp chuyến)
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Selected Stops in Right Column (Đang xếp chuyến)
  const [assignedStops, setAssignedStops] = useState<DeliveryTripStop[]>([]);

  // Drag & Drop State
  const [draggedOrder, setDraggedOrder] = useState<DeliveryTripStop | null>(null);

  // Form Fields (AC2) - Để trống để người dùng tự nhập
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
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
        expectedReturnAt: expectedReturnAt.length === 16 ? `${expectedReturnAt}:00` : expectedReturnAt,
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
    <div className="space-y-6 max-w-full mx-auto pb-12">
      {/* Back Button Row */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/inventory/delivery-trips')}
          className="px-5 py-2.5 bg-white text-gray-700 hover:text-[#F85606] hover:border-orange-300 rounded-xl border border-gray-200 shadow-xs hover:shadow transition-all cursor-pointer inline-flex items-center gap-2 text-sm font-bold active:scale-95"
          title="Quay lại danh sách chuyến giao hàng"
          id="btn-delivery-trip-create-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* GIAO DIỆN KÉO THẢ & CHỌN CHUYẾN (TEST FE / SUBTASK) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* CỘT TRÁI: ĐƠN HÀNG ĐÃ XUẤT CHỜ XẾP CHUYẾN (GOM THEO KHU VỰC - AC1) */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-orange-200 flex flex-col h-full transition-all">
          <div className="border-b border-gray-100 pb-3 mb-3 min-h-[82px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F85606] text-white flex items-center justify-center text-xs font-black">1</span>
                Phiếu Xuất Chờ Xếp Chuyến ({filteredAvailable.length})
              </h2>
              {filteredAvailable.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllFiltered}
                  className="text-sm font-bold text-[#F85606] hover:text-[#E04D05] hover:underline cursor-pointer"
                >
                  + Gom tất cả vào chuyến
                </button>
              )}
            </div>

            {/* Bộ lọc khu vực (AC1: Gom theo khu vực) */}
            <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
              <div className="w-full sm:w-52">
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full text-sm font-medium border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-orange-200 outline-none"
                >
                  <option value="ALL">Tất cả khu vực</option>
                  {districts.map((dist, idx) => (
                    <option key={idx} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo mã đơn, khách, địa chỉ..."
                  className="w-full text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Danh sách đơn hàng bên trái */}
          <div className="flex-1 flex flex-col space-y-2.5 pr-1 max-h-[580px] overflow-y-auto">
            {loadingOrders ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-gray-500 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F85606]" />
                <p className="text-sm font-semibold">Đang tải phiếu xuất kho...</p>
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed border-orange-200/80 rounded-2xl bg-orange-50/20 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#F85606] mx-auto stroke-1" />
                <p className="text-sm font-bold text-gray-800">Đã xếp hết các đơn khả dụng</p>
                <p className="text-xs text-gray-400">Không còn đơn chờ trong bộ lọc hiện tại</p>
              </div>
            ) : (
              filteredAvailable.map((order) => (
                <div
                  key={order.orderId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order)}
                  className="p-3.5 bg-gray-50 hover:bg-orange-50/50 rounded-xl border border-gray-200 transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-[#F85606] mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {order.orderCode}
                        </span>
                        {order.district && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-semibold">
                            {order.district}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-gray-800 text-sm truncate mt-1">
                        {order.customerName}
                      </div>
                      <div className="text-xs text-gray-600 truncate flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span>{order.deliveryAddress}</span>
                      </div>
                      <div className="text-xs text-gray-700 font-mono mt-1.5 flex items-center justify-between">
                        <span>📞 {order.receiverPhone}</span>
                        <strong className="text-[#F85606] text-sm font-bold">
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
                    className="p-2.5 bg-white hover:bg-[#F85606] hover:text-white text-[#F85606] rounded-xl border border-gray-200 transition-colors shadow-xs shrink-0 cursor-pointer"
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
          className="bg-white p-5 rounded-2xl shadow-xs border border-orange-200 flex flex-col h-full transition-all"
        >
          <div className="border-b border-gray-100 pb-3 mb-3 min-h-[82px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F85606] text-white flex items-center justify-center text-xs font-black">2</span>
                Lộ Trình Chuyến Xe ({assignedStops.length} điểm giao)
              </h2>
              {assignedStops.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAssignedStops([])}
                  className="text-sm font-bold text-red-500 hover:underline cursor-pointer"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 h-[31px]">
              <span className="text-xs text-gray-500">Xe sẽ ghé giao lần lượt theo thứ tự từ trên xuống</span>
              {assignedStops.length > 0 && (
                <span className="font-bold text-[#F85606] text-sm">
                  Tổng COD: {totalAssignedValue.toLocaleString('vi-VN')} đ
                </span>
              )}
            </div>
          </div>

          {/* Danh sách các điểm dừng trên chuyến */}
          <div className="flex-1 flex flex-col space-y-2.5 pr-1 max-h-[580px] overflow-y-auto">
            {assignedStops.length === 0 ? (
              <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed border-orange-200/80 rounded-2xl bg-orange-50/20 text-gray-500 space-y-2">
                <Truck className="w-10 h-10 text-[#F85606] stroke-1" />
                <p className="text-sm font-bold text-gray-800">Chưa có điểm giao nào trong chuyến</p>
                <p className="text-xs text-gray-500 max-w-sm">
                  Bấm nút <strong>"+"</strong> hoặc <strong>kéo thả</strong> các phiếu xuất từ cột bên trái vào đây để xếp chuyến.
                </p>
              </div>
            ) : (
              assignedStops.map((stop, idx) => (
                <div
                  key={stop.orderId}
                  className="p-3.5 bg-white rounded-xl border-2 border-orange-100 hover:border-orange-300 transition-all shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Số thứ tự điểm dừng */}
                    <span className="w-8 h-8 rounded-xl bg-[#F85606] text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                      #{idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {stop.orderCode}
                        </span>
                        <span className="text-xs text-gray-500">
                          {stop.receiverName} • {stop.receiverPhone}
                        </span>
                      </div>
                      <div className="font-bold text-gray-800 text-sm truncate mt-1">
                        {stop.customerName}
                      </div>
                      <div className="text-xs text-gray-600 truncate flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{stop.deliveryAddress}</span>
                      </div>
                      <div className="text-xs font-bold text-[#F85606] font-mono mt-1">
                        Thu COD: {stop.totalAmount?.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>

                  {/* Actions: Sắp xếp thứ tự & Xóa */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStop(idx, 'UP')}
                      title="Chuyển lên đầu lộ trình"
                      className="p-2 text-gray-500 hover:text-[#F85606] hover:bg-gray-100 rounded-lg disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === assignedStops.length - 1}
                      onClick={() => handleMoveStop(idx, 'DOWN')}
                      title="Chuyển xuống sau"
                      className="p-2 text-gray-500 hover:text-[#F85606] hover:bg-gray-100 rounded-lg disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.orderId)}
                      title="Bỏ khỏi chuyến"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1 cursor-pointer"
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
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm font-bold">
              <span className="text-gray-700">
                Tổng cộng: <strong className="text-gray-900">{assignedStops.length} điểm dừng</strong>
              </span>
              <span className="text-[#F85606] font-black text-base">
                Tiền hàng trên xe: {totalAssignedValue.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THÔNG TIN TÀI XẾ & PHƯƠNG TIỆN (AC2) */}
      {/* ========================================================================= */}
      <form onSubmit={handleCreateTrip} className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-6">
        <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <span className="w-7 h-7 rounded-full bg-[#F85606] text-white flex items-center justify-center text-xs font-black">3</span>
          Gán Tài Xế & Phương Tiện Cho Chuyến Xe
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
          {/* Tên tài xế */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#F85606]" />
              Tên tài xế / người giao: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Nhập họ tên tài xế / người giao..."
              required
              className="w-full font-medium border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none"
            />
          </div>

          {/* Số điện thoại tài xế */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#F85606]" />
              Số điện thoại tài xế:
            </label>
            <input
              type="text"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="Nhập số điện thoại liên hệ..."
              className="w-full font-medium border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none"
            />
          </div>

          {/* Biển số xe */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#F85606]" />
              Biển số xe / Phương tiện:
            </label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="Nhập biển số xe (VD: 29C-123.45)..."
              className="w-full font-mono font-bold border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none uppercase"
            />
          </div>

          {/* Thời gian dự kiến về kho */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#F85606]" />
              Thời gian dự kiến giao xong & về kho: <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={expectedReturnAt}
              onChange={(e) => setExpectedReturnAt(e.target.value)}
              required
              className="w-full font-medium border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Hệ thống sẽ tự động cảnh báo chuyến trễ hạn nếu quá thời gian này.
            </p>
          </div>

          {/* Ghi chú lộ trình */}
          <div className="md:col-span-2">
            <label className="block font-bold text-gray-700 mb-1.5">
              Ghi chú lộ trình / Dặn dò tài xế:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Chú ý đường cấm xe tải giờ cao điểm, ưu tiên giao Đại lý VinMart trước 11h..."
              className="w-full font-medium border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3.5 pt-5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/inventory/delivery-trips')}
            className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={assignedStops.length === 0 || submitting}
            className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Đang xuất bến...
              </>
            ) : (
              <>
                <Truck className="w-5 h-5" />
                Khởi Hành Chuyến Xe ({assignedStops.length} điểm)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
