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
  XCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';
import type { DeliveryTrip } from '../../types/deliveryTrip';
import {
  fetchDeliveryTripById,
  completeDeliveryTrip
} from '../../services/deliveryTripApi';
import { DeliveryTripPrintModal } from '../../components/inventory/DeliveryTripPrintModal';

export const DeliveryTripDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast, currentRole } = useAuth();

  const isWarehouseStaff = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [trip, setTrip] = useState<DeliveryTrip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [completing, setCompleting] = useState<boolean>(false);

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

  const handleCompleteTrip = async () => {
    if (!trip) return;
    const confirm = window.confirm(
      `Xác nhận xe ${trip.vehiclePlate} (${trip.driverName}) đã hoàn tất lộ trình và quay về kho an toàn?`
    );
    if (!confirm) return;

    setCompleting(true);
    try {
      const updated = await completeDeliveryTrip(trip.id);
      setTrip(updated);
      showToast('Thành công', `Chuyến giao hàng ${updated.code} đã kết thúc!`, 'success');
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể kết thúc chuyến', 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
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
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const sortedStops = [...(trip.stops || [])].sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));
  const percent = trip.totalStops > 0 ? Math.round((trip.deliveredStops / trip.totalStops) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory/delivery-trips')}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* In danh sách điểm giao AC3 */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            In Bảng Kê Điểm Giao (AC3)
          </button>

          {/* Xác nhận xe về kho */}
          {isWarehouseStaff && trip.status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteTrip}
              disabled={completing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              {completing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
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
            <User className="w-4 h-4 text-blue-600" />
            Tài xế & Phương tiện
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Họ và tên:</span>
              <strong className="text-gray-900">{trip.driverName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số điện thoại:</span>
              <strong className="text-blue-700 font-mono">
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
            <Clock className="w-4 h-4 text-blue-600" />
            Thời gian lộ trình
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Xuất bến:</span>
              <strong className="text-gray-900">
                {trip.departedAt ? new Date(trip.departedAt).toLocaleString('vi-VN') : 'Đang chuẩn bị'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dự kiến về:</span>
              <strong className="text-gray-900">
                {new Date(trip.expectedReturnAt).toLocaleString('vi-VN')}
              </strong>
            </div>
            {trip.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Về thực tế:</span>
                <strong className="text-emerald-700">
                  {new Date(trip.completedAt).toLocaleString('vi-VN')}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Tiến độ & Tiền hàng */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            <Package className="w-4 h-4 text-blue-600" />
            Tiến độ giao hàng ({percent}%)
          </div>
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Đã giao: <strong>{trip.deliveredStops}</strong></span>
              <span>Còn lại: <strong>{trip.remainingStops}</strong></span>
              <span>Thất bại: <strong className="text-red-600">{trip.failedStops}</strong></span>
            </div>
            <div className="pt-1 text-xs flex justify-between font-bold border-t border-gray-100">
              <span className="text-gray-500">Tiền còn trên xe:</span>
              <span className="text-blue-700 font-mono">
                {trip.valueOnRoad?.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách điểm giao (Stop Manifest Table) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedStops.map((stop, idx) => (
                <tr key={stop.orderId || idx} className="hover:bg-blue-50/20 transition-colors">
                  <td className="py-3 px-3 text-center font-black text-blue-700 bg-blue-50/40">
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
                    <div className="font-mono text-blue-700 font-bold text-[11px] mt-0.5">
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đã giao xong
                      </span>
                    ) : stop.status === 'DELIVERY_FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
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
    </div>
  );
};
