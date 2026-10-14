import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  RotateCcw,
  History,
  Ban,
  Printer,
  Phone,
  RefreshCw
} from 'lucide-react';
import type { OrderBackendResponse, OrderApprovalHistoryResponse } from '../../types/order';
import {
  fetchOrderDetail,
  fetchOrderApprovalHistory,
  formatCurrencyVND,
  formatQuantity
} from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { OrderLifecycleTimeline } from '../../components/order/OrderLifecycleTimeline';
import { OrderCancelModal } from '../../components/order/OrderCancelModal';
import { OrderPdfPreviewModal } from '../../components/order/OrderPdfPreviewModal';

interface CustomerOrderDetailViewProps {
  orderId: number | string;
  onBack: () => void;
  onReorder?: (orderId: number | string) => void;
  onOrderUpdated?: () => void;
}

export const CustomerOrderDetailView: React.FC<CustomerOrderDetailViewProps> = ({
  orderId,
  onBack,
  onReorder,
  onOrderUpdated
}) => {
  const { currentRole, showToast } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<OrderBackendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<OrderApprovalHistoryResponse[]>([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  const loadOrderDetailAndHistory = (id: number | string) => {
    setLoading(true);
    setError(null);
    fetchOrderDetail(id)
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi tải chi tiết đơn hàng:', err);
        setError(err.message || 'Không thể tải thông tin chi tiết đơn hàng');
        setLoading(false);
      });

    fetchOrderApprovalHistory(id)
      .then(setApprovalHistory)
      .catch(() => setApprovalHistory([]));
  };

  useEffect(() => {
    if (!orderId) return;
    loadOrderDetailAndHistory(orderId);
  }, [orderId]);

  // Cuộn lên đầu trang khi mở chi tiết
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [orderId]);

  const renderStatusBadge = (status: string, hasShortage?: boolean) => {
    if (hasShortage) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs"
          title="Đơn hàng được ghi nhận có mặt hàng giao thiếu"
        >
          <AlertTriangle size={13} className="text-amber-600" />
          <span>{status === 'DELIVERED' ? 'Đã giao hàng (Thiếu hàng)' : 'Có mặt hàng giao thiếu'}</span>
        </span>
      );
    }

    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} />
            <span>Đã duyệt</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={13} />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <FileText size={13} />
            <span>Đơn nháp</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={13} />
            <span>Từ chối</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} />
            <span>Hoàn thành</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <CheckCircle2 size={13} />
            <span>Đã hoàn tất</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <CheckCircle2 size={13} />
            <span>Đã giao hàng</span>
          </span>
        );
      case 'PICKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>Đang soạn hàng</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <span>Đã xuất kho</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <XCircle size={13} />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  const hasDeliveryInfo = Boolean(
    order?.hasShortage ||
    (order?.status && ['DELIVERED', 'CLOSED'].includes(order.status)) ||
    order?.lines?.some((l) => l.deliveredQuantity !== undefined && l.deliveredQuantity !== null)
  );

  const canCancelOrder = Boolean(
    order &&
    !['CANCELLED', 'REJECTED', 'CLOSED', 'DISPATCHED', 'DELIVERED'].includes(order.status) &&
    (currentRole === 'ROLE_CUSTOMER'
      ? ['PENDING_APPROVAL', 'DRAFT'].includes(order.status)
      : ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP'].includes(currentRole ?? ''))
  );

  const canReorder = Boolean(
    order && order.id != null && ['DELIVERED', 'CLOSED', 'COMPLETED', 'APPROVED'].includes(order.status)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="order-detail-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách đơn hàng</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Cổng Đại Lý B2B / Đơn hàng đã gửi / Chi tiết đơn hàng
          </span>
        </div>

        {/* Nút Làm mới dữ liệu */}
        <button
          type="button"
          onClick={() => loadOrderDetailAndHistory(orderId)}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#F85606]' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* TRẠNG THÁI ĐANG TẢI */}
      {loading && (
        <div className="bg-white rounded-3xl border border-gray-200 p-16 text-center text-gray-500 shadow-2xs">
          <RefreshCw size={36} className="animate-spin text-[#F85606] mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800">Đang tải thông tin chi tiết đơn hàng...</p>
          <p className="text-xs text-gray-400 mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      )}

      {/* TRẠNG THÁI LỖI */}
      {error && !loading && (
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Không thể tải chi tiết đơn hàng</h3>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadOrderDetailAndHistory(orderId)}
            className="px-4 py-2 rounded-xl bg-[#F85606] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* NỘI DUNG CHI TIẾT ĐƠN HÀNG TO RỘNG */}
      {!loading && order && (
        <div className="space-y-6">
          {/* HERO HEADER CARD CỦA ĐƠN HÀNG */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 bg-gradient-to-r from-orange-50/60 via-amber-50/20 to-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
                  <FileText size={28} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-mono tracking-tight">
                      {order.code || `Đơn hàng #${orderId}`}
                    </h1>
                    {renderStatusBadge(order.status, Boolean(order.hasShortage))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    Chi tiết dòng sản phẩm và thông tin đặt hàng của đại lý
                  </p>
                </div>
              </div>

              {/* HÀNH ĐỘNG NHANH TRÊN HEADER */}
              <div className="flex items-center gap-2 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                  title="Xem trước & In phiếu PDF"
                >
                  <Printer size={15} />
                  <span>In / Xuất PDF</span>
                </button>

                {canReorder && onReorder && order.id != null && (
                  <button
                    type="button"
                    onClick={() => onReorder(order.id!)}
                    className="px-4 py-2 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95"
                    title="Đặt lại các mặt hàng trong đơn này"
                  >
                    <RotateCcw size={15} />
                    <span>Mua lại đơn này</span>
                  </button>
                )}

                {canCancelOrder && (
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                    title="Hủy đơn hàng này"
                  >
                    <Ban size={15} />
                    <span>Hủy đơn</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* S5-01: CẢNH BÁO ĐƠN HÀNG GIAO THIẾU (NẾU CÓ) */}
          {order.hasShortage && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm space-y-1.5 shadow-2xs">
              <div className="font-bold flex items-center gap-2 text-amber-900">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span className="text-sm font-black">
                  Cảnh báo đơn hàng giao thiếu ({order.shortageLineCount || 1} mặt hàng)
                </span>
              </div>
              <p className="text-amber-800 pl-6 leading-relaxed">
                Hệ thống ghi nhận đơn hàng có mặt hàng thực tế giao ít hơn số lượng đặt ban đầu. Quý khách vui lòng đối chiếu chi tiết cột <strong className="text-orange-950 font-bold underline">Thực giao</strong> và lý do ghi nhận trong bảng sản phẩm bên dưới.
              </p>
            </div>
          )}

          {/* CẢNH BÁO DUYỆT NGOẠI LỆ (NẾU CÓ) */}
          {order.warnings && order.warnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs space-y-1.5 shadow-2xs">
              <div className="font-bold flex items-center gap-2 text-amber-900">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span className="font-bold">Cảnh báo duyệt ngoại lệ:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-2 text-amber-900/90">
                {order.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* TIMELINE HÀNH TRÌNH VÒNG ĐỜI ĐƠN HÀNG */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-2xs">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-[#F85606]" />
              <span>Tiến độ xử lý đơn hàng</span>
            </h3>
            <OrderLifecycleTimeline
              status={order.status}
              cancelReason={((order as unknown as { lastApprovalComment?: string }).lastApprovalComment) || undefined}
              approvalHistory={approvalHistory}
              createdAt={order.createdAt}
              desiredDeliveryDate={order.desiredDeliveryDate || undefined}
            />
          </div>

          {/* 2 CỘT THÔNG TIN: ĐẠI LÝ & THỜI GIAN/NGƯỜI LẬP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cột 1: Thông tin đại lý & Địa chỉ nhận hàng */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-3.5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={16} className="text-[#F85606]" />
                <span>Thông tin đại lý & Địa chỉ giao hàng</span>
              </h3>
              <div className="space-y-1.5">
                <p className="text-base font-black text-gray-900">{order.customerName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                  <span className="font-mono bg-gray-100 px-2.5 py-0.5 rounded-lg border border-gray-200 font-semibold">
                    {order.customerCode}
                  </span>
                  <span>•</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 text-[#F85606] font-bold text-xs">
                    {order.customerGroupLabel || order.customerGroup || 'Đại lý'}
                  </span>
                </div>
              </div>

              {order.deliveryAddress ? (
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-[#F85606] mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-gray-900 block">
                        {order.deliveryAddress.label || 'Địa chỉ nhận hàng'}:
                      </span>
                      <span className="text-gray-600 leading-relaxed block">
                        {order.deliveryAddress.address}
                      </span>
                    </div>
                  </div>
                  {order.deliveryAddress.receiverName && (
                    <div className="flex items-center gap-3 text-xs text-gray-600 pl-6 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User size={13} className="text-gray-400" />
                        <span>Người nhận: <strong>{order.deliveryAddress.receiverName}</strong></span>
                      </span>
                      {order.deliveryAddress.receiverPhone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone size={13} className="text-gray-400" />
                            <strong className="text-gray-800">{order.deliveryAddress.receiverPhone}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 italic">
                  Chưa ghi nhận địa chỉ giao hàng cụ thể
                </div>
              )}
            </div>

            {/* Cột 2: Thời gian & Người lập đơn */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-3.5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={16} className="text-[#F85606]" />
                <span>Thời gian & Người lập đơn</span>
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-0.5">
                  <span className="text-gray-400 text-[11px] block">Ngày đặt hàng:</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-0.5">
                  <span className="text-blue-700 text-[11px] font-semibold block">Ngày giao dự kiến:</span>
                  <span className="font-bold text-blue-900 text-sm">
                    {order.desiredDeliveryDate ? new Date(order.desiredDeliveryDate).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-0.5">
                  <span className="text-gray-400 text-[11px] block">Người tạo đơn:</span>
                  <span className="font-bold text-gray-800 flex items-center gap-1.5 text-xs truncate">
                    <User size={13} className="text-gray-400 shrink-0" />
                    <span>{order.createdByUsername || 'customer_agent'}</span>
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-0.5">
                  <span className="text-gray-400 text-[11px] block">Cập nhật lúc:</span>
                  <span className="font-bold text-gray-800 text-xs">
                    {order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>

              {order.note ? (
                <div className="pt-2 text-xs text-gray-600 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/80">
                  <strong className="text-amber-900 block mb-0.5">Ghi chú đơn hàng:</strong>
                  <p className="italic text-gray-700">{order.note}</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* BẢNG DANH SÁCH SẢN PHẨM TO RỘNG */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs space-y-0">
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/90 to-white">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Package size={18} className="text-[#F85606]" />
                <span>Danh sách sản phẩm đặt hàng ({order.lines?.length || 0})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/80 text-gray-700 font-bold border-b border-gray-200 text-xs">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Mã SKU</th>
                    <th className="py-3 px-4">Tên sản phẩm</th>
                    <th className="py-3 px-4 text-center">ĐVT</th>
                    <th className="py-3 px-4 text-right">
                      {hasDeliveryInfo ? 'Số lượng đặt' : 'Số lượng'}
                    </th>
                    {hasDeliveryInfo && (
                      <th className="py-3 px-4 text-right font-bold text-orange-950 bg-orange-50/70">
                        Thực giao
                      </th>
                    )}
                    <th className="py-3 px-4 text-right">Đơn giá</th>
                    <th className="py-3 px-4 text-right">Chiết khấu</th>
                    <th className="py-3 px-4 text-right font-black">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.lines && order.lines.length > 0 ? (
                    order.lines.map((line, index) => (
                      <tr
                        key={line.id || index}
                        className={`hover:bg-orange-50/30 transition-colors ${
                          line.isShortage ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center text-gray-400 font-medium">
                          {line.lineNo || index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                          {line.productSku}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900 max-w-xs">
                          {line.productName}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
                            {line.unitName || line.baseUnit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900 text-sm">
                          {formatQuantity(line.quantity)}
                        </td>
                        {hasDeliveryInfo && (
                          <td className="py-3.5 px-4 text-right bg-orange-50/30">
                            {line.deliveredQuantity !== undefined && line.deliveredQuantity !== null ? (
                              line.isShortage ? (
                                <div className="space-y-1">
                                  <span className="font-black text-rose-600 font-mono text-sm block">
                                    {formatQuantity(line.deliveredQuantity)}
                                  </span>
                                  <span className="inline-block text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                    Thiếu {formatQuantity(line.shortageQuantity ?? Math.max(0, line.quantity - line.deliveredQuantity))}
                                  </span>
                                  {line.shortageReason && (
                                    <span
                                      className="block text-[11px] text-gray-500 italic max-w-[180px] ml-auto truncate"
                                      title={line.shortageReason}
                                    >
                                      Lý do: {line.shortageReason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-bold text-emerald-600 font-mono text-sm">
                                  {formatQuantity(line.deliveredQuantity)} (Đủ)
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 italic">Chờ giao</span>
                            )}
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right text-gray-700 font-medium">
                          {formatCurrencyVND(line.pricePerUnit || line.unitPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold">
                          {line.discountAmount > 0 ? (
                            <span className="text-rose-600">-{formatCurrencyVND(line.discountAmount)}</span>
                          ) : (
                            <span className="text-gray-400">0 đ</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#F85606] text-sm font-mono">
                          {formatCurrencyVND(line.netAmount || (line.grossAmount - line.discountAmount))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={hasDeliveryInfo ? 9 : 8} className="py-10 text-center text-gray-400">
                        Đơn hàng chưa có dòng sản phẩm nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* BẢNG TỔNG KẾT TÀI CHÍNH */}
            <div className="p-5 sm:p-6 bg-gray-50/70 border-t border-gray-100 flex justify-end">
              <div className="w-full sm:w-96 rounded-2xl bg-white border border-orange-200/80 p-5 space-y-3 text-xs shadow-2xs">
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Tổng tiền hàng:</span>
                  <span className="font-bold text-gray-900 text-sm font-mono">
                    {formatCurrencyVND(Number(order.subtotal || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Tổng chiết khấu:</span>
                  <span className="font-bold text-rose-600 text-sm font-mono">
                    -{formatCurrencyVND(Number(order.discountTotal || 0))}
                  </span>
                </div>
                <div className="pt-3 border-t border-orange-200 flex justify-between items-center">
                  <span className="font-black text-gray-900 text-sm">Tổng thanh toán:</span>
                  <span className="text-lg sm:text-xl font-black text-[#F85606] font-mono">
                    {formatCurrencyVND(Number(order.totalAmount || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LỊCH SỬ PHÊ DUYỆT ĐƠN HÀNG (BẤT BIẾN) */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <History size={16} className="text-[#F85606]" />
                <span>Lịch Sử Phê Duyệt Đơn Hàng</span>
              </h3>
              <span className="text-[11px] text-gray-400 font-medium italic">
                * Bất biến — Không thể chỉnh sửa hoặc xóa
              </span>
            </div>

            {approvalHistory.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">
                Chưa có lịch sử phê duyệt cho đơn hàng này.
              </p>
            ) : (
              <div className="space-y-2.5">
                {approvalHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            item.action === 'APPROVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.action === 'REJECT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.action === 'RETURN'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {item.actionLabel || item.action}
                        </span>
                        <span className="text-gray-600">
                          bởi <strong>{item.actorFullName || item.actorUsername}</strong>
                        </span>
                      </div>
                      {item.comment && (
                        <p className="text-xs text-gray-700 italic pl-1 bg-white/70 p-2 rounded-lg border border-gray-200/50 mt-1">
                          &ldquo;{item.comment}&rdquo;
                        </p>
                      )}
                    </div>

                    <span className="text-[11px] text-gray-400 shrink-0 font-mono">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER ACTION BAR */}
          <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <ArrowLeft size={15} />
              <span>Quay lại danh sách đơn hàng</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
              >
                <Printer size={15} />
                <span>In / Xuất PDF</span>
              </button>

              {canReorder && onReorder && order.id != null && (
                <button
                  type="button"
                  onClick={() => onReorder(order.id!)}
                  className="px-5 py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95"
                >
                  <RotateCcw size={15} />
                  <span>Mua lại đơn hàng này</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC VÀ IN PDF */}
      <OrderPdfPreviewModal
        isOpen={isPdfModalOpen}
        order={order}
        onClose={() => setIsPdfModalOpen(false)}
      />

      {/* MODAL HỦY ĐƠN HÀNG (BẮT BUỘC NHẬP LÝ DO) */}
      <OrderCancelModal
        isOpen={isCancelModalOpen}
        order={order}
        onClose={() => setIsCancelModalOpen(false)}
        onSuccess={() => {
          showToast('Đã hủy đơn', 'Đơn hàng đã được chuyển trạng thái Hủy', 'success');
          loadOrderDetailAndHistory(orderId);
          if (onOrderUpdated) onOrderUpdated();
        }}
      />
    </div>
  );
};
