import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Package,
  RefreshCw,
  XCircle,
  CheckCheck,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';
import type { DeliveryTrip } from '../../types/deliveryTrip';
import {
  fetchDeliveryTripById,
  completeDeliveryTrip,
  confirmStopDelivery,
  completeTripWithAutoResolve
} from '../../services/deliveryTripApi';
import { DeliveryTripPrintModal } from '../../components/inventory/DeliveryTripPrintModal';
import { DeliveryProofModal } from '../../components/delivery/DeliveryProofModal';
import { TripActionConfirmModal } from '../../components/inventory/TripActionConfirmModal';

export const DeliveryTripDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast, currentRole } = useAuth();

  const isWarehouseStaff = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [trip, setTrip] = useState<DeliveryTrip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [completing, setCompleting] = useState<boolean>(false);

  // S6-08: Quản lý Modal xác nhận giao hàng & Tải ảnh chứng từ chữ ký (POD)
  const [proofModalState, setProofModalState] = useState<{
    isOpen: boolean;
    orderId: number;
    orderCode: string;
    customerName?: string;
    deliveryAddress?: string;
    receiverPhone?: string;
    isDelivered?: boolean;
    mode: 'CONFIRM' | 'FAIL' | 'VIEW';
  } | null>(null);

  // Modal xác nhận thao tác thay thế window.confirm
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    tripCode?: string;
    badgeText?: string;
    message: string;
    highlightDetail?: string;
    confirmLabel: string;
    confirmVariant?: 'primary' | 'warning' | 'danger';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchDeliveryTripById(Number(id));
      setTrip(data);
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể tải chi tiết chuyến giao', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Xác nhận giao tất cả các điểm còn lại
  const handleConfirmAllStops = () => {
    if (!trip?.stops) return;
    const pending = trip.stops.filter((s) => s.status === 'DISPATCHED');
    if (pending.length === 0) return;

    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận giao đủ tất cả điểm giao',
      tripCode: trip.code,
      badgeText: `${pending.length} điểm cần giao`,
      highlightDetail: `Hệ thống sẽ cập nhật kết quả giao thành công cho toàn bộ ${pending.length} điểm giao còn lại trên xe.`,
      message: `Xác nhận toàn bộ ${pending.length} điểm giao đều đã được bàn giao đến tay đại lý/khách hàng?`,
      confirmLabel: 'Xác nhận giao đủ',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setCompleting(true);
        try {
          for (const stop of pending) {
            await confirmStopDelivery(stop.orderId);
          }
          showToast('Thành công', `Đã xác nhận giao thành công tất cả ${pending.length} điểm giao!`, 'success');
          setConfirmModalConfig(null);
          await loadData();
        } catch (err: any) {
          showToast('Lỗi', err.message || 'Có lỗi xảy ra khi xác nhận giao hàng', 'error');
        } finally {
          setCompleting(false);
        }
      }
    });
  };

  const handleCompleteTrip = () => {
    if (!trip) return;

    // Nếu còn điểm chưa giao
    if (trip.remainingStops > 0) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Xác nhận kết thúc chuyến & Cho xe về kho',
        tripCode: trip.code,
        badgeText: `Còn ${trip.remainingStops} điểm chưa giao`,
        highlightDetail: `Chuyến xe ${trip.code} hiện còn ${trip.remainingStops} điểm giao chưa cập nhật kết quả.`,
        message: 'Bạn có muốn tự động XÁC NHẬN GIAO THÀNH CÔNG TẤT CẢ các điểm còn lại và cho xe về kho ngay không?',
        confirmLabel: 'Xác nhận & Cho xe về kho',
        confirmVariant: 'warning',
        onConfirm: async () => {
          setCompleting(true);
          try {
            const updated = await completeTripWithAutoResolve(trip.id);
            setTrip(updated);
            showToast('Thành công', `Chuyến giao hàng ${updated.code} đã kết thúc hoàn tất và xe đã về kho!`, 'success');
            setConfirmModalConfig(null);
            await loadData();
          } catch (err: any) {
            showToast('Lỗi kết thúc chuyến', err.message || 'Không thể kết thúc chuyến', 'error');
          } finally {
            setCompleting(false);
          }
        }
      });
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận xe đã về kho an toàn',
      tripCode: trip.code,
      badgeText: '100% điểm đã giao xong',
      message: `Xác nhận xe ${trip.vehiclePlate} (${trip.driverName}) đã hoàn tất lộ trình và quay về kho an toàn?`,
      confirmLabel: 'Xác nhận về kho',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setCompleting(true);
        try {
          const updated = await completeDeliveryTrip(trip.id);
          setTrip(updated);
          showToast('Thành công', `Chuyến giao hàng ${updated.code} đã kết thúc!`, 'success');
          setConfirmModalConfig(null);
          await loadData();
        } catch (err: any) {
          showToast('Lỗi', err.message || 'Không thể kết thúc chuyến', 'error');
        } finally {
          setCompleting(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F85606]" />
        <p className="text-sm font-semibold">Đang tải chi tiết chuyến giao...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-gray-900">Không tìm thấy chuyến giao hàng</h3>
        <button
          onClick={() => navigate('/inventory/delivery-trips')}
          className="px-4 py-2 bg-[#F85606] hover:bg-[#E04D05] text-white text-xs font-semibold rounded-lg cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const sortedStops = [...(trip.stops || [])].sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));
  const percent = trip.totalStops > 0 ? Math.round((trip.deliveredStops / trip.totalStops) * 100) : 0;

  // Tính toán minh bạch các giá trị tiền hàng của chuyến
  const calculatedTotal = sortedStops.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalTripValue = (trip.totalValue && trip.totalValue > 0) ? trip.totalValue : calculatedTotal;
  const deliveredValue = sortedStops
    .filter((s) => s.status === 'DELIVERED' || s.status === 'CLOSED')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const remainingValue = (trip.valueOnRoad !== undefined && trip.valueOnRoad !== null && trip.valueOnRoad > 0)
    ? trip.valueOnRoad
    : sortedStops
      .filter((s) => s.status === 'DISPATCHED')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Nút Quay lại chuẩn như các trang trước */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/inventory/delivery-trips')}
          className="px-4 py-2.5 bg-white text-gray-700 hover:text-[#F85606] hover:border-orange-300 rounded-xl border border-gray-200 shadow-xs hover:shadow transition-all cursor-pointer inline-flex items-center gap-2 text-xs font-bold active:scale-95"
          title="Quay lại danh sách chuyến giao hàng"
          id="btn-delivery-trip-detail-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900 tracking-tight font-mono">
              {trip.code}
            </h1>
            {trip.status === 'COMPLETED' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✓ ĐÃ VỀ KHO
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                ĐANG LƯU THÔNG
              </span>
            )}
            {trip.overdue && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                ⚠️ Trễ hạn {trip.overdueMinutes} phút
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Kho xuất: <strong>{trip.warehouseName}</strong> • Phương tiện: <strong>{trip.vehiclePlate}</strong> • Tài xế: <strong>{trip.driverName}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút giao tất cả điểm nếu còn điểm chưa giao */}
          {isWarehouseStaff && trip.status === 'IN_PROGRESS' && trip.remainingStops > 0 && (
            <button
              onClick={handleConfirmAllStops}
              disabled={completing}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Xác nhận giao hàng thành công toàn bộ điểm trên xe"
            >
              <CheckCheck className="w-4 h-4" />
              Xác nhận Giao đủ tất cả ({trip.remainingStops} điểm)
            </button>
          )}

          {/* In danh sách điểm giao AC3 */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-[#F85606] hover:bg-[#E04D05] text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            In Bảng Kê Điểm Giao (AC3)
          </button>

          {/* Xác nhận xe về kho */}
          {isWarehouseStaff && trip.status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteTrip}
              disabled={completing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {completing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              Xác nhận Xe về kho
            </button>
          )}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tài xế & Phương tiện */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            <User className="w-4 h-4 text-[#F85606]" />
            Tài xế & Phương tiện
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Họ và tên:</span>
              <strong className="text-gray-900">{trip.driverName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số điện thoại:</span>
              <strong className="text-[#F85606] font-mono">
                {trip.driverPhone ? (
                  <a href={`tel:${trip.driverPhone}`} className="hover:underline">
                    📞 {trip.driverPhone}
                  </a>
                ) : (
                  'N/A'
                )}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Biển số xe:</span>
              <strong className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                {trip.vehiclePlate || 'Chưa gán'}
              </strong>
            </div>
          </div>
        </div>

        {/* Lịch trình thời gian */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            <Clock className="w-4 h-4 text-[#F85606]" />
            Thời gian lộ trình
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Xuất bến:</span>
              <strong className="text-gray-900 font-mono">
                {trip.departedAt ? (
                  `${new Date(trip.departedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${new Date(trip.departedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                ) : (
                  'Đang chuẩn bị'
                )}
              </strong>
            </div>
            {trip.completedAt ? (
              <div className="flex justify-between">
                <span className="text-gray-500">Bàn giao / Về:</span>
                <strong className="text-emerald-700 font-mono">
                  {new Date(trip.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                  {new Date(trip.completedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </strong>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-gray-500">Dự kiến về:</span>
                <strong className="text-gray-900 font-mono">
                  {new Date(trip.expectedReturnAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                  {new Date(trip.expectedReturnAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Tiến độ & Tiền hàng */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#F85606]" />
              Tiến độ giao hàng ({percent}%)
            </span>
            <span className="text-[#F85606] font-mono font-black text-sm">
              {totalTripValue.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#F85606] h-2 rounded-full transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Đã giao: <strong>{trip.deliveredStops}</strong></span>
              <span>Còn lại: <strong>{trip.remainingStops}</strong></span>
              <span>Thất bại: <strong className="text-red-600">{trip.failedStops}</strong></span>
            </div>
            <div className="pt-2 text-xs space-y-1.5 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Tổng tiền hàng chuyến:</span>
                <span className="font-mono font-black text-gray-900">
                  {totalTripValue.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {deliveredValue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Đã giao cho khách:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {deliveredValue.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Tiền còn trên xe:</span>
                <span className={`font-mono font-bold ${remainingValue > 0 ? 'text-[#F85606]' : 'text-emerald-600'}`}>
                  {remainingValue > 0 ? `${remainingValue.toLocaleString('vi-VN')} đ` : '0 đ (Đã giao đủ)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách điểm giao (Stop Manifest Table) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#F85606]" />
            Danh Sách Điểm Giao Của Chuyến ({sortedStops.length} điểm)
          </h2>
          <span className="text-xs text-gray-400 italic">
            Liệt kê theo thứ tự xe ghé giao kèm địa chỉ và số điện thoại người nhận
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                <th className="py-3 px-3 text-center w-12">Lộ trình</th>
                <th className="py-3 px-3 w-28">Mã đơn hàng</th>
                <th className="py-3 px-4">Khách hàng / Đại lý</th>
                <th className="py-3 px-4">Địa chỉ giao hàng</th>
                <th className="py-3 px-4 w-44">Người nhận & SĐT</th>
                <th className="py-3 px-3 text-right w-28">Tiền hàng (COD)</th>
                <th className="py-3 px-3 text-center w-32">Trạng thái</th>
                <th className="py-3 px-3 text-center w-44">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedStops.map((stop, idx) => (
                <tr key={stop.orderId || idx} className="hover:bg-orange-50/20 transition-colors">
                  <td className="py-3 px-3 text-center font-black text-[#F85606] bg-orange-50/40">
                    #{stop.stopSequence || idx + 1}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-gray-900">
                    {stop.orderCode}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">{stop.customerName}</div>
                    {stop.customerCode && (
                      <div className="text-[10px] text-gray-400 font-mono">Mã: {stop.customerCode}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-800 leading-snug">{stop.deliveryAddress}</div>
                    {stop.district && (
                      <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                        📍 {stop.district}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-900">{stop.receiverName || 'Người nhận'}</div>
                    <div className="font-mono text-[#F85606] font-bold text-[11px] mt-0.5">
                      <a href={`tel:${stop.receiverPhone}`} className="hover:underline">
                        📞 {stop.receiverPhone || '0988.xxx.xxx'}
                      </a>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-gray-900">
                    {stop.totalAmount?.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-3 text-center">
                    {stop.status === 'DELIVERED' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã giao xong
                        </span>
                        {stop.deliveredAt && (
                          <div className="text-[10px] text-emerald-700 font-mono mt-0.5 font-medium">
                            {new Date(stop.deliveredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                            {new Date(stop.deliveredAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ) : stop.status === 'DELIVERY_FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200" title={stop.deliveryFailedReason || ''}>
                        <XCircle className="w-3 h-3 text-red-600" />
                        Giao không thành công
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Đang trên xe
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {isWarehouseStaff && trip.status === 'IN_PROGRESS' && stop.status === 'DISPATCHED' && (
                        <>
                          <button
                            onClick={() =>
                              setProofModalState({
                                isOpen: true,
                                orderId: stop.orderId,
                                orderCode: stop.orderCode,
                                customerName: stop.customerName || undefined,
                                deliveryAddress: stop.deliveryAddress || undefined,
                                receiverPhone: stop.receiverPhone || undefined,
                                isDelivered: false,
                                mode: 'CONFIRM'
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Xác nhận giao thành công & Tải ảnh biên bản có chữ ký (POD)"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Xác nhận giao
                          </button>
                          <button
                            onClick={() =>
                              setProofModalState({
                                isOpen: true,
                                orderId: stop.orderId,
                                orderCode: stop.orderCode,
                                customerName: stop.customerName || undefined,
                                deliveryAddress: stop.deliveryAddress || undefined,
                                receiverPhone: stop.receiverPhone || undefined,
                                isDelivered: false,
                                mode: 'FAIL'
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Ghi nhận giao không thành công (chọn lý do, hàng quay về kho)"
                          >
                            <X className="w-3.5 h-3.5" />
                            Thất bại
                          </button>
                        </>
                      )}

                      {stop.status === 'DELIVERED' && (
                        <button
                          onClick={() =>
                            setProofModalState({
                              isOpen: true,
                              orderId: stop.orderId,
                              orderCode: stop.orderCode,
                              customerName: stop.customerName || undefined,
                              deliveryAddress: stop.deliveryAddress || undefined,
                              receiverPhone: stop.receiverPhone || undefined,
                              isDelivered: true,
                              mode: 'VIEW'
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          title="Xem ảnh biên bản giao hàng có chữ ký khách hàng"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          Xem POD
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/orders/${stop.orderId}`)}
                        className="p-1.5 text-gray-400 hover:text-[#F85606] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết đơn hàng"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal In Bảng Kê Điểm Giao */}
      <DeliveryTripPrintModal
        isOpen={isPrintModalOpen}
        trip={trip}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* S6-08: Modal Xác Nhận Giao Hàng & Tải Biên Bản Có Chữ Ký (POD) */}
      {proofModalState && (
        <DeliveryProofModal
          isOpen={proofModalState.isOpen}
          onClose={() => setProofModalState(null)}
          orderId={proofModalState.orderId}
          orderCode={proofModalState.orderCode}
          customerName={proofModalState.customerName}
          deliveryAddress={proofModalState.deliveryAddress}
          receiverPhone={proofModalState.receiverPhone}
          isDelivered={proofModalState.isDelivered}
          initialMode={proofModalState.mode}
          onSuccess={() => {
            setProofModalState(null);
            loadData();
          }}
          showToast={showToast}
        />
      )}

      {/* Modal xác nhận thao tác thay thế window.confirm */}
      {confirmModalConfig && (
        <TripActionConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig(null)}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          tripCode={confirmModalConfig.tripCode}
          badgeText={confirmModalConfig.badgeText}
          highlightDetail={confirmModalConfig.highlightDetail}
          message={confirmModalConfig.message}
          confirmLabel={confirmModalConfig.confirmLabel}
          confirmVariant={confirmModalConfig.confirmVariant}
          loading={completing}
        />
      )}
    </div>
  );
};
