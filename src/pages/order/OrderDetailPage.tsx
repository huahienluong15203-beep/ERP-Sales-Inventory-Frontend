import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Edit,
  Copy,
  Phone,
  RefreshCw,
  RotateCcw,
  History,
  Ban,
  Printer,
  Truck,
  CheckCheck,
  Archive,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import type { OrderBackendResponse, OrderApprovalHistoryResponse } from '../../types/order';
import {
  fetchOrderDetail,
  fetchOrderApprovalHistory,
  formatCurrencyVND,
  formatQuantity,
  updateOrderStatus,
  cloneOrderToDraft
} from '../../services/orderService';
import { useNavigate, useParams } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { OrderApprovalActionModal, type ApprovalActionType } from '../../components/order/OrderApprovalActionModal';
import { OrderLifecycleTimeline } from '../../components/order/OrderLifecycleTimeline';
import { OrderCancelModal } from '../../components/order/OrderCancelModal';
import { OrderPdfPreviewModal } from '../../components/order/OrderPdfPreviewModal';
import { AgencyDeliveryTimeline } from '../../components/portal/AgencyDeliveryTimeline';
import { getUserFullName } from '../../lib/userFormatters';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, currentRole, showToast } = useAuth();

  const [order, setOrder] = useState<OrderBackendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<OrderApprovalHistoryResponse[]>([]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Modals state
  const [approvalModalState, setApprovalModalState] = useState<{
    isOpen: boolean;
    actionType: ApprovalActionType;
  }>({ isOpen: false, actionType: 'APPROVE' });
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [cloningOrder, setCloningOrder] = useState<boolean>(false);

  // Phân trang & Tìm kiếm sản phẩm trong đơn hàng
  const [lineKeyword, setLineKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Phân quyền theo vai trò
  const isSalesManager =
    currentRole === 'ROLE_SALES_MANAGER' ||
    Boolean(user?.roles?.includes('ROLE_SALES_MANAGER'));

  const isWarehouseOrAdmin =
    currentRole === 'ROLE_ADMIN' ||
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_WAREHOUSE' ||
    Boolean(user?.roles?.some((r) => ['ROLE_ADMIN', 'ROLE_WH_MANAGER', 'ROLE_WAREHOUSE'].includes(r)));

  const canCreateOrder =
    currentRole === 'ROLE_SALES_REP' ||
    currentRole === 'ROLE_SALES_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN'].includes(r)));

  const isSalesRep =
    currentRole === 'ROLE_SALES_REP' || Boolean(user?.roles?.includes('ROLE_SALES_REP'));

  const isPortalOrder = Boolean(order?.note?.startsWith('[Đại lý tự đặt qua cổng]'));
  const canDecideApproval = isSalesManager || (isSalesRep && isPortalOrder);

  // Tải chi tiết đơn hàng & lịch sử phê duyệt
  const loadOrderDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrderDetail(id);
      setOrder(data);
    } catch (err: unknown) {
      console.error('Lỗi tải chi tiết đơn hàng:', err);
      const msg = err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết đơn hàng';
      setError(msg);
      showToast('Lỗi tải đơn hàng', msg, 'error');
    } finally {
      setLoading(false);
    }

    fetchOrderApprovalHistory(id)
      .then(setApprovalHistory)
      .catch(() => setApprovalHistory([]));
  }, [id, showToast]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  // Cập nhật trạng thái vòng đời kho (Soạn hàng, Xuất kho, Giao hàng, Hoàn tất)
  const handleUpdateStatus = async (targetStatus: string, actionLabel: string) => {
    if (!order?.id) return;
    try {
      setUpdatingStatus(true);
      await updateOrderStatus(order.id, targetStatus);
      showToast('Thành công', `Đơn hàng đã chuyển sang trạng thái "${actionLabel}"`, 'success');
      loadOrderDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể chuyển trạng thái đơn hàng';
      showToast('Lỗi thao tác', msg, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Sao chép đơn cũ thành đơn nháp mới (S4-09)
  const handleClone = async () => {
    if (!order?.id) return;
    try {
      setCloningOrder(true);
      const res = await cloneOrderToDraft(order.id);
      showToast(
        'Đã sao chép đơn cũ',
        `Đã sao chép ${res.itemCount} dòng hàng từ đơn ${res.sourceCode}. Đơn giá và chiết khấu đã được tính lại theo bảng giá hiện hành!`,
        'success'
      );
      navigate('/orders/create');
    } catch (err: unknown) {
      console.error('Lỗi sao chép đơn hàng:', err);
      showToast('Sao chép thất bại', err instanceof Error ? err.message : 'Không thể sao chép đơn hàng', 'error');
    } finally {
      setCloningOrder(false);
    }
  };

  const handleCopyOrderCode = () => {
    if (!order?.code) return;
    navigator.clipboard.writeText(order.code);
    setCopiedCode(true);
    showToast('Đã sao chép mã đơn', `Mã đơn "${order.code}" đã được lưu vào bộ nhớ tạm`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Lọc dòng sản phẩm theo từ khóa
  const filteredLines = useMemo(() => {
    if (!order?.lines) return [];
    if (!lineKeyword.trim()) return order.lines;
    const kw = lineKeyword.trim().toLowerCase();
    return order.lines.filter(
      (l) =>
        l.productName.toLowerCase().includes(kw) ||
        l.productSku.toLowerCase().includes(kw) ||
        (l.unitName && l.unitName.toLowerCase().includes(kw))
    );
  }, [order?.lines, lineKeyword]);

  // Phân trang
  const totalLines = filteredLines.length;
  const totalPages = Math.ceil(totalLines / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [lineKeyword, pageSize]);

  const paginatedLines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLines.slice(start, start + pageSize);
  }, [filteredLines, currentPage, pageSize]);

  // Render Badge trạng thái đồng bộ
  const renderStatusBadge = (status: string) => {
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
            <Package size={13} />
            <span>Đang soạn hàng</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Truck size={13} />
            <span>Đã xuất kho</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
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

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center mx-auto animate-pulse">
          <RefreshCw size={24} className="animate-spin" />
        </div>
        <p className="text-sm font-bold text-gray-700">Đang tải thông tin chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <Package size={32} />
        </div>
        <h2 className="text-lg font-black text-gray-900">Không tìm thấy đơn hàng</h2>
        <p className="text-xs text-gray-500">
          {error || 'Đơn hàng với mã hoặc ID được cung cấp không tồn tại trên hệ thống hoặc đã bị gỡ bỏ.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="px-4 py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách đơn hàng</span>
        </button>
      </div>
    );
  }

  const hasDeliveryInfo = Boolean(
    order.hasShortage ||
    ['DELIVERED', 'CLOSED'].includes(order.status) ||
    order.lines?.some((l) => l.deliveredQuantity !== undefined && l.deliveredQuantity !== null)
  );

  return (
    <div className="space-y-5 antialiased max-w-7xl mx-auto pb-16 print:pb-0 print:m-0 print:max-w-none print:space-y-0 animate-in fade-in duration-200">
      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & BREADCRUMBS (ẨN KHI IN) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span>Danh sách đơn hàng</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-xs text-gray-500 font-medium">Chi tiết đơn hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-xs font-mono font-bold text-gray-800">{order.code}</span>
        </div>

        {/* Nút hành động đầu trang */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadOrderDetail}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
            title="Tải lại dữ liệu đơn hàng"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Xem trước & In hóa đơn PDF"
          >
            <Printer size={15} />
            <span>In / Xuất PDF</span>
          </button>

          {/* S4-09: Nút sao chép đơn (CHỈ hiển thị cho vai trò được phép tạo đơn) */}
          {canCreateOrder && (
            <button
              type="button"
              disabled={cloningOrder}
              onClick={handleClone}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
              title="Sao chép toàn bộ dòng hàng thành đơn nháp mới"
            >
              <Copy size={15} className={cloningOrder ? 'animate-spin' : ''} />
              <span>{cloningOrder ? 'Đang sao chép...' : 'Sao chép thành đơn mới'}</span>
            </button>
          )}

          {/* Sửa đơn nháp (NVKD / Admin) */}
          {order.status === 'DRAFT' && canCreateOrder && (
            <button
              type="button"
              onClick={() => navigate(`/orders/create?draftId=${order.id}`)}
              className="px-3.5 py-2 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              <Edit size={15} />
              <span>Tiếp tục sửa nháp</span>
            </button>
          )}

          {/* Duyệt / Trả lại / Từ chối (Quản lý kinh doanh) */}
          {order.status === 'PENDING_APPROVAL' && canDecideApproval && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setApprovalModalState({ isOpen: true, actionType: 'APPROVE' })}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="Phê duyệt đơn hàng"
              >
                <CheckCircle2 size={14} />
                <span>Duyệt đơn</span>
              </button>
              <button
                type="button"
                onClick={() => setApprovalModalState({ isOpen: true, actionType: 'RETURN' })}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="Trả lại yêu cầu NVKD sửa (bắt buộc nhập lý do)"
              >
                <RotateCcw size={14} />
                <span>Trả lại sửa</span>
              </button>
              <button
                type="button"
                onClick={() => setApprovalModalState({ isOpen: true, actionType: 'REJECT' })}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="Từ chối đơn hàng (bắt buộc nhập lý do)"
              >
                <XCircle size={14} />
                <span>Từ chối</span>
              </button>
            </div>
          )}

          {/* Thao tác xử lý kho theo vòng đời */}
          {order.status === 'APPROVED' && isWarehouseOrAdmin && (
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => handleUpdateStatus('PICKING', 'Đang soạn hàng')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Package size={14} className={updatingStatus ? 'animate-spin' : ''} />
              <span>Bắt đầu soạn hàng</span>
            </button>
          )}

          {order.status === 'PICKING' && isWarehouseOrAdmin && (
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => handleUpdateStatus('DISPATCHED', 'Đã xuất kho')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Truck size={14} className={updatingStatus ? 'animate-spin' : ''} />
              <span>Xác nhận xuất kho</span>
            </button>
          )}

          {order.status === 'DISPATCHED' && (
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => handleUpdateStatus('DELIVERED', 'Đã giao hàng')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <CheckCheck size={14} className={updatingStatus ? 'animate-spin' : ''} />
              <span>Xác nhận đã giao hàng</span>
            </button>
          )}

          {order.status === 'DELIVERED' && (isWarehouseOrAdmin || isSalesManager || currentRole === 'ROLE_ACCOUNTANT') && (
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => handleUpdateStatus('CLOSED', 'Hoàn tất')}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Archive size={14} className={updatingStatus ? 'animate-spin' : ''} />
              <span>Hoàn tất đơn</span>
            </button>
          )}

          {/* Nút hủy đơn hàng */}
          {!['CANCELLED', 'REJECTED', 'CLOSED', 'DISPATCHED', 'DELIVERED'].includes(order.status) &&
            (currentRole === 'ROLE_CUSTOMER'
              ? ['PENDING_APPROVAL', 'DRAFT'].includes(order.status)
              : ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP'].includes(currentRole ?? '')) && (
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Ban size={14} />
              <span>Hủy đơn</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CARD TIÊU ĐỀ ĐƠN HÀNG & CHỈ SỐ NHANH */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              <FileText size={28} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-mono tracking-tight">
                  {order.code || `Đơn hàng #${order.id}`}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyOrderCode}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  title="Sao chép mã đơn"
                >
                  {copiedCode ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
                {renderStatusBadge(order.status)}
              </div>
              <p className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                <span>Khách hàng: <strong>{order.customerName}</strong></span>
                <span>•</span>
                <span>Mã ĐL: <strong className="font-mono">{order.customerCode}</strong></span>
                {order.customerGroupLabel && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-orange-100/70 text-[#F85606] font-bold text-[11px]">
                      {order.customerGroupLabel}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
              <span className="text-[11px] font-medium text-gray-500 uppercase block">Số mặt hàng</span>
              <span className="text-base font-black text-gray-900">{order.lines?.length || 0} SKU</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
              <span className="text-[11px] font-medium text-gray-500 uppercase block">Ngày tạo</span>
              <span className="text-xs font-bold text-gray-800">
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
              <span className="text-[11px] font-medium text-gray-500 uppercase block">Ngày giao dự kiến</span>
              <span className="text-xs font-bold text-gray-800">
                {order.desiredDeliveryDate ? new Date(order.desiredDeliveryDate).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-100 text-center">
              <span className="text-[11px] font-medium text-[#F85606] uppercase block">Tổng thanh toán</span>
              <span className="text-base font-black text-[#F85606]">
                {formatCurrencyVND(Number(order.totalAmount || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. S4-06: TIMELINE HÀNH TRÌNH VÒNG ĐỜI ĐƠN HÀNG */}
      <OrderLifecycleTimeline
        status={order.status}
        cancelReason={order.lastApprovalComment || order.cancelReason || undefined}
        approvalHistory={approvalHistory}
        createdAt={order.createdAt}
        desiredDeliveryDate={order.desiredDeliveryDate || undefined}
      />

      {/* CHI TIẾT SỐ LƯỢNG THỰC GIAO TỪNG MẶT HÀNG & THÔNG TIN GIAO NHẬN (Ẩn timeline 5 nấc trùng lặp) */}
      <AgencyDeliveryTimeline
        order={order}
        approvalHistory={approvalHistory}
        hideTimelineTrack={true}
      />

      {/* 4. CẢNH BÁO PHÊ DUYỆT NGOẠI LỆ HOẶC GIAO THIẾU HÀNG */}
      {order.warnings && order.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 shadow-2xs">
          <div className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
            <AlertTriangle size={16} />
            <span>Cảnh báo duyệt ngoại lệ đơn hàng:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-gray-700">
            {order.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {order.hasShortage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1 shadow-2xs">
          <div className="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
            <AlertTriangle size={16} className="text-rose-600" />
            <span>Cảnh báo đơn hàng giao thiếu ({order.shortageLineCount || 1} mặt hàng):</span>
          </div>
          <p className="text-rose-800 pl-5">
            Hệ thống ghi nhận đơn hàng có mặt hàng thực tế giao ít hơn số lượng đặt. Quý khách vui lòng đối chiếu cột <strong>Thực giao</strong> bên dưới.
          </p>
        </div>
      )}

      {/* 5. THÔNG TIN ĐẠI LÝ & THÔNG TIN QUẢN LÝ (GRID 2 CỘT CÂN ĐỐI) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cột 1: Thông tin đại lý & Giao hàng */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Building2 size={15} className="text-[#F85606]" />
            <span>Thông tin đại lý & Địa điểm giao hàng</span>
          </h3>

          <div className="space-y-2">
            <div>
              <p className="text-base font-black text-gray-900">{order.customerName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-bold">
                  {order.customerCode}
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-orange-100/70 text-[#F85606] font-semibold text-[11px]">
                  {order.customerGroupLabel || order.customerGroup}
                </span>
              </div>
            </div>

            {order.deliveryAddress ? (
              <div className="pt-2 border-t border-gray-100 text-xs text-gray-700 space-y-1.5">
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900">{order.deliveryAddress.label}:</span>{' '}
                    <span>{order.deliveryAddress.address}</span>
                  </div>
                </div>
                {(order.deliveryAddress.receiverName || order.deliveryAddress.receiverPhone) && (
                  <div className="flex items-center gap-3 text-xs text-gray-600 pl-5">
                    {order.deliveryAddress.receiverName && (
                      <span>Người nhận: <strong>{order.deliveryAddress.receiverName}</strong></span>
                    )}
                    {order.deliveryAddress.receiverPhone && (
                      <span className="flex items-center gap-1 font-mono font-bold text-gray-800">
                        <Phone size={12} className="text-gray-400" />
                        <a href={`tel:${order.deliveryAddress.receiverPhone}`} className="hover:underline">
                          {order.deliveryAddress.receiverPhone}
                        </a>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic pt-2 border-t border-gray-100">
                Chưa cập nhật thông tin địa điểm giao hàng.
              </p>
            )}
          </div>
        </div>

        {/* Cột 2: Thời gian & Người lập đơn */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Calendar size={15} className="text-[#F85606]" />
            <span>Thời gian & Người phụ trách</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500 block">Ngày tạo đơn:</span>
              <span className="font-bold text-gray-900 text-sm">
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}
              </span>
              <span className="text-[11px] text-gray-400 block">
                {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>

            <div>
              <span className="text-gray-500 block">Ngày giao dự kiến:</span>
              <span className="font-bold text-gray-900 text-sm">
                {order.desiredDeliveryDate ? new Date(order.desiredDeliveryDate).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>

            <div>
              <span className="text-gray-500 block">Người lập đơn:</span>
              <span className="font-bold text-gray-800 flex items-center gap-1.5 mt-0.5">
                <User size={13} className="text-gray-400" />
                <span>{getUserFullName(order.createdByUsername, order.createdByUsername || 'sales_rep')}</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono block pl-4.5">
                @{order.createdByUsername || 'sales_rep'}
              </span>
            </div>

            <div>
              <span className="text-gray-500 block">Cập nhật lần cuối:</span>
              <span className="font-semibold text-gray-800">
                {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString('vi-VN') : '—'}
              </span>
              <span className="text-[11px] text-gray-400 block">
                {order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>

          {order.note && (
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-xl">
              <strong className="text-gray-700">Ghi chú đơn hàng:</strong>{' '}
              <span className="italic">{order.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. BẢNG CHI TIẾT SẢN PHẨM ĐẶT HÀNG */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {/* Header Bảng & Tìm kiếm nhanh */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Danh sách sản phẩm đặt hàng
              </h3>
              <p className="text-xs text-gray-500">
                Tổng cộng {order.lines?.length || 0} mặt hàng trong đơn
              </p>
            </div>
          </div>

          {/* Ô tìm kiếm dòng hàng */}
          <div className="flex items-center gap-2 w-full sm:w-72 no-print">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={lineKeyword}
                onChange={(e) => setLineKeyword(e.target.value)}
                placeholder="Tìm mã SKU, tên sản phẩm..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50/90 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-3.5 text-center w-12">#</th>
                <th className="py-3 px-3.5 w-32">Mã SKU</th>
                <th className="py-3 px-3.5 min-w-[200px]">Tên sản phẩm</th>
                <th className="py-3 px-3.5 text-center w-24">ĐVT</th>
                <th className="py-3 px-3.5 text-right w-28">
                  {hasDeliveryInfo ? 'Số lượng đặt' : 'Số lượng'}
                </th>
                {hasDeliveryInfo && (
                  <th className="py-3 px-3.5 text-right w-36 font-bold text-orange-900 bg-orange-50/50">
                    Thực giao
                  </th>
                )}
                <th className="py-3 px-3.5 text-right w-32">Đơn giá</th>
                <th className="py-3 px-3.5 text-right w-28">Chiết khấu</th>
                <th className="py-3 px-3.5 text-right w-36 font-bold">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLines.length === 0 ? (
                <tr>
                  <td colSpan={hasDeliveryInfo ? 9 : 8} className="py-12 text-center text-gray-400">
                    {lineKeyword ? 'Không tìm thấy dòng sản phẩm nào khớp từ khóa' : 'Đơn hàng chưa có dòng sản phẩm nào'}
                  </td>
                </tr>
              ) : (
                paginatedLines.map((line, index) => {
                  const globalIdx = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={line.id || index}
                      className={`hover:bg-orange-50/25 transition-colors ${
                        line.isShortage ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 text-center text-gray-500 font-medium">
                        {line.lineNo || globalIdx}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-orange-700 bg-orange-50/40 rounded">
                        {line.productSku}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-gray-900">
                        {line.productName}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-bold">
                          {line.unitName || line.baseUnit}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-gray-900 text-sm">
                        {formatQuantity(line.quantity)}
                      </td>
                      {hasDeliveryInfo && (
                        <td className="py-3 px-3.5 text-right bg-orange-50/20">
                          {line.deliveredQuantity !== undefined && line.deliveredQuantity !== null ? (
                            line.isShortage ? (
                              <div className="space-y-0.5">
                                <span className="font-black text-rose-600 font-mono text-sm">
                                  {formatQuantity(line.deliveredQuantity)}
                                </span>
                                <span className="block text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded">
                                  Thiếu {formatQuantity(line.shortageQuantity ?? Math.max(0, line.quantity - line.deliveredQuantity))}
                                </span>
                                {line.shortageReason && (
                                  <span className="block text-[10px] text-gray-500 italic max-w-[140px] ml-auto truncate" title={line.shortageReason}>
                                    {line.shortageReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-emerald-600 font-mono">
                                {formatQuantity(line.deliveredQuantity)} (Đủ)
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 italic">Chờ giao</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-3.5 text-right text-gray-700 font-medium">
                        {formatCurrencyVND(line.pricePerUnit || line.unitPrice)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-rose-600 font-semibold">
                        {line.discountAmount > 0 ? `-${formatCurrencyVND(line.discountAmount)}` : '0 đ'}
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-[#F85606] text-sm">
                        {formatCurrencyVND(line.netAmount || line.grossAmount - line.discountAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang danh sách dòng hàng (no-print) */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs no-print">
            <div className="flex items-center gap-3">
              <span className="text-gray-500">
                Hiển thị {paginatedLines.length} / {totalLines} mặt hàng (Trang {currentPage} / {totalPages})
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
              >
                <option value={10}>10 dòng / trang</option>
                <option value={20}>20 dòng / trang</option>
                <option value={50}>50 dòng / trang</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer"
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-orange-50 font-bold text-[#F85606]">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer"
                title="Trang kế tiếp"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer"
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Khối Tổng kết tài chính (Footer bảng) */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs text-gray-500 italic">
            * Bảng giá và chính sách chiết khấu áp dụng theo thời điểm duyệt/chốt đơn hàng.
          </div>

          <div className="w-full sm:w-80 rounded-2xl bg-white border border-orange-100 p-4 space-y-2 text-xs shadow-xs">
            <div className="flex justify-between text-gray-600">
              <span>Tổng tiền hàng:</span>
              <span className="font-bold text-gray-900">
                {formatCurrencyVND(Number(order.subtotal || 0))}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tổng chiết khấu:</span>
              <span className="font-bold text-rose-600">
                -{formatCurrencyVND(Number(order.discountTotal || 0))}
              </span>
            </div>
            <div className="pt-2.5 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-900">Tổng thanh toán:</span>
              <span className="text-lg font-black text-[#F85606]">
                {formatCurrencyVND(Number(order.totalAmount || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. S4-05: LỊCH SỬ PHÊ DUYỆT ĐƠN HÀNG (BẤT BIẾN - CHỈ XEM) */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <History size={15} className="text-[#F85606]" />
            <span>Lịch sử phê duyệt đơn hàng</span>
          </h3>
          <span className="text-[10px] text-gray-400 font-medium italic">
            * Bất biến — Không thể chỉnh sửa hoặc xóa
          </span>
        </div>

        {approvalHistory.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">
            Chưa có lịch sử phê duyệt cho đơn hàng này.
          </p>
        ) : (
          <div className="space-y-2">
            {approvalHistory.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 rounded-xl bg-gray-50/80 border border-gray-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.action === 'APPROVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.action === 'REJECT'
                          ? 'bg-rose-100 text-rose-800'
                          : item.action === 'RETURN'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.actionLabel || item.action}
                    </span>
                    <span className="text-gray-600 text-[11px]">
                      bởi <strong>{item.actorFullName || item.actorUsername}</strong>
                    </span>
                  </div>
                  {item.comment && (
                    <p className="text-[11px] text-gray-700 italic pl-1">
                      &ldquo;{item.comment}&rdquo;
                    </p>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DUYỆT / TỪ CHỐI / TRẢ LẠI SỬA (S4-05) */}
      <OrderApprovalActionModal
        isOpen={approvalModalState.isOpen}
        order={order}
        actionType={approvalModalState.actionType}
        onClose={() => setApprovalModalState((s) => ({ ...s, isOpen: false }))}
        onSuccess={() => loadOrderDetail()}
      />

      {/* MODAL HỦY ĐƠN HÀNG (S4-06) */}
      <OrderCancelModal
        isOpen={isCancelModalOpen}
        order={order}
        onClose={() => setIsCancelModalOpen(false)}
        onSuccess={() => loadOrderDetail()}
      />

      {/* MODAL XEM TRƯỚC VÀ IN PDF (S4-08) */}
      <OrderPdfPreviewModal
        isOpen={isPdfModalOpen}
        order={order}
        approvalHistory={approvalHistory}
        onClose={() => setIsPdfModalOpen(false)}
      />
    </div>
  );
};
