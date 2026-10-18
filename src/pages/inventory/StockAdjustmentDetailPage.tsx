import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  Printer,
  RefreshCw,
  Search,
  AlertTriangle,
  User,
  Layers
} from 'lucide-react';
import type { StockAdjustment } from '../../types/stockAdjustment';
import {
  fetchStockAdjustmentDetail,
  approveStockAdjustment,
  rejectStockAdjustment,
  cancelStockAdjustment
} from '../../services/stockAdjustmentApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';

export const StockAdjustmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();

  // Roles & Permissions
  const isWhManager =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => ['ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(r)));

  // State
  const [adjustment, setAdjustment] = useState<StockAdjustment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [lineKeyword, setLineKeyword] = useState<string>('');

  // Modals for Actions
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false);
  const [approveNotes, setApproveNotes] = useState<string>('');

  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchStockAdjustmentDetail(id);
      setAdjustment(data);
    } catch (err: any) {
      console.error('Lỗi tải chi tiết phiếu điều chỉnh:', err);
      showToast('error', err.message || 'Không thể tải chi tiết phiếu điều chỉnh tồn kho');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const formatVnd = (amount: number | null | undefined) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

  const isPending = adjustment?.status === 'PENDING_APPROVAL';
  const isCreator = Boolean(
    user?.id && adjustment?.createdById && Number(user.id) === Number(adjustment.createdById)
  );
  const canApprove = Boolean(isPending && isWhManager && !isCreator);
  const canReject = Boolean(isPending && isWhManager && !isCreator);
  const canCancel = Boolean(isPending && (isCreator || isWhManager));

  // Thao tác Duyệt phiếu (AC3)
  const handleConfirmApprove = async () => {
    if (!adjustment) return;
    setActionLoading(true);
    try {
      const updated = await approveStockAdjustment(adjustment.id, { notes: approveNotes.trim() });
      setAdjustment(updated);
      setIsApproveOpen(false);
      setApproveNotes('');
      showToast('success', `Đã phê duyệt phiếu ${updated.code} và xuất kho ghi nhận thẻ kho thành công!`);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi phê duyệt phiếu');
    } finally {
      setActionLoading(false);
    }
  };

  // Thao tác Từ chối duyệt
  const handleConfirmReject = async () => {
    if (!adjustment) return;
    if (!rejectReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await rejectStockAdjustment(adjustment.id, { notes: rejectReason.trim() });
      setAdjustment(updated);
      setIsRejectOpen(false);
      setRejectReason('');
      showToast('success', `Đã từ chối duyệt phiếu ${updated.code}`);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi từ chối phiếu');
    } finally {
      setActionLoading(false);
    }
  };

  // Thao tác Huỷ phiếu
  const handleConfirmCancel = async () => {
    if (!adjustment) return;
    setActionLoading(true);
    try {
      const updated = await cancelStockAdjustment(adjustment.id, cancelReason.trim());
      setAdjustment(updated);
      setIsCancelOpen(false);
      setCancelReason('');
      showToast('success', `Đã huỷ phiếu ${updated.code}`);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi huỷ phiếu');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Chờ duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle size={14} className="text-emerald-600" />
            Đã duyệt & xuất kho
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <XCircle size={14} className="text-rose-600" />
            Từ chối duyệt
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 shadow-2xs">
            <Trash2 size={14} className="text-gray-500" />
            Đã huỷ
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt & xuất kho';
      case 'REJECTED':
        return 'Từ chối duyệt';
      case 'CANCELLED':
        return 'Đã huỷ';
      default:
        return status || '—';
    }
  };

  const getReasonBadge = (reason?: string, label?: string) => {
    switch (reason) {
      case 'DAMAGED_GOODS':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {label || 'Hàng hỏng / hư hại'}
          </span>
        );
      case 'LOST_GOODS':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {label || 'Hàng mất / thất thoát'}
          </span>
        );
      case 'EXPIRED_DISPOSAL':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            {label || 'Hết hạn phải huỷ'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            {label || 'Lý do khác'}
          </span>
        );
    }
  };

  // Lọc mặt hàng theo từ khoá
  const filteredLines = useMemo(() => {
    if (!adjustment?.lines) return [];
    if (!lineKeyword.trim()) return adjustment.lines;
    const kw = lineKeyword.trim().toLowerCase();
    return adjustment.lines.filter(
      (l) =>
        l.productName?.toLowerCase().includes(kw) ||
        l.productSku?.toLowerCase().includes(kw) ||
        (l.batchNumber && l.batchNumber.toLowerCase().includes(kw))
    );
  }, [adjustment?.lines, lineKeyword]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center mx-auto animate-pulse">
          <RefreshCw size={24} className="animate-spin" />
        </div>
        <p className="text-sm font-bold text-gray-700">Đang tải thông tin chi tiết phiếu điều chỉnh tồn kho...</p>
      </div>
    );
  }

  if (!adjustment) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <FileText size={32} />
        </div>
        <h2 className="text-lg font-black text-gray-900">Không tìm thấy phiếu điều chỉnh</h2>
        <p className="text-xs text-gray-500">
          Phiếu điều chỉnh tồn kho với mã hoặc ID được cung cấp không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <button
          type="button"
          onClick={() => navigate('/inventory/stock-adjustments')}
          className="px-4 py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto pb-16 print:pb-0 print:m-0 print:max-w-none print:space-y-0 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle size={16} className="text-emerald-600" />
          ) : (
            <XCircle size={16} className="text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & THAO TÁC (ẨN KHI IN) */}
      <div className="flex items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={() => navigate('/inventory/stock-adjustments')}
          className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
          id="stock-adjustment-detail-back-btn"
          title="Quay lại danh sách"
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadDetail}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Tải lại chi tiết"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="In phiếu điều chỉnh"
          >
            <Printer size={15} />
            <span>In Phiếu</span>
          </button>

          {/* Nút Phê duyệt phiếu */}
          {canApprove && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsApproveOpen(true)}
              className="px-4 py-2 rounded-xl text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              title="Phê duyệt phiếu điều chỉnh"
            >
              <CheckCircle size={16} />
              <span>Phê Duyệt Phiếu</span>
            </button>
          )}

          {/* Nút Từ chối duyệt */}
          {canReject && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsRejectOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Từ chối duyệt phiếu"
            >
              <XCircle size={15} />
              <span>Từ Chối Duyệt</span>
            </button>
          )}

          {/* Nút Huỷ phiếu */}
          {canCancel && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsCancelOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 hover:border-rose-200 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Huỷ phiếu điều chỉnh"
            >
              <Trash2 size={15} />
              <span>Huỷ Phiếu</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THỐNG KÊ TỔN THẤT & THÔNG TIN PHIẾU - STAT CARDS (ẨN KHI IN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Card 1: Mã phiếu, Lý do hao hụt & Ngày lập */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200 text-xs">
                {adjustment.code}
              </span>
              {getStatusBadge(adjustment.status)}
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Lý do điều chỉnh
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {getReasonBadge(adjustment.adjustmentReason, adjustment.adjustmentReasonLabel)}
            </div>
            {adjustment.reasonDescription && (
              <p className="text-xs text-gray-600 mt-2 italic bg-gray-50 p-2 rounded-xl border border-gray-100">
                "{adjustment.reasonDescription}"
              </p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Ngày lập: <strong className="text-gray-800">{adjustment.adjustmentDate}</strong>
          </div>
        </div>

        {/* Card 2: Người lập phiếu */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Người lập phiếu
            </span>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {adjustment.createdByName ? adjustment.createdByName.charAt(0).toUpperCase() : <User size={16} />}
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900 block">
                  {adjustment.createdByName || '—'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {adjustment.createdAt ? new Date(adjustment.createdAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Kho: <strong className="text-gray-800">{adjustment.warehouseName}</strong>
          </div>
        </div>

        {/* Card 3: Người duyệt */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Người duyệt
            </span>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                  adjustment.approvedByName
                    ? 'bg-emerald-50 text-emerald-600'
                    : adjustment.status === 'CANCELLED'
                    ? 'bg-gray-100 text-gray-500'
                    : adjustment.status === 'REJECTED'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {adjustment.approvedByName ? (
                  <CheckCircle size={18} />
                ) : adjustment.status === 'CANCELLED' ? (
                  <Trash2 size={16} />
                ) : adjustment.status === 'REJECTED' ? (
                  <XCircle size={18} />
                ) : (
                  '—'
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900 block">
                  {adjustment.approvedByName ||
                    (adjustment.status === 'CANCELLED'
                      ? 'Không xét duyệt'
                      : adjustment.status === 'REJECTED'
                      ? 'Từ chối duyệt'
                      : 'Chưa duyệt')}
                </span>
                <span className="text-[10px] text-gray-400">
                  {adjustment.approvedAt
                    ? new Date(adjustment.approvedAt).toLocaleString('vi-VN')
                    : adjustment.status === 'CANCELLED'
                    ? 'Phiếu đã bị huỷ'
                    : adjustment.status === 'REJECTED'
                    ? 'Không chấp thuận'
                    : 'Đang chờ phê duyệt'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Trạng thái: <strong className="text-gray-800">{getStatusText(adjustment.status)}</strong>
          </div>
        </div>

        {/* Card 4: Tổng tổn thất tài chính */}
        <div className="bg-gradient-to-br from-rose-50 to-orange-50/40 p-4 rounded-2xl border border-rose-200 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-2">
              Tổng Giá Trị Tổn Thất
            </span>
            <span className="text-2xl font-bold font-mono text-rose-600 block whitespace-nowrap">
              {formatVnd(adjustment.totalLossValue)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-200/60 text-xs text-rose-800 font-semibold flex items-center justify-between">
            <span>Tổng số lượng giảm:</span>
            <span className="font-mono font-bold text-sm">{adjustment.totalQuantity?.toLocaleString('vi-VN')} SP</span>
          </div>
        </div>
      </div>

      {/* 4. BANNER LÝ DO TỪ CHỐI / HUỶ PHIẾU (NẾU CÓ) */}
      {Boolean(adjustment.rejectionReason) && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3 shadow-2xs no-print">
          <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-sm mb-0.5">Lý do từ chối / huỷ phiếu:</strong>
            <span>{adjustment.rejectionReason}</span>
          </div>
        </div>
      )}

      {/* 5. BẢNG CHI TIẾT MẶT HÀNG ĐIỀU CHỈNH (ẨN KHI IN) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden no-print">
        {/* Table Filter & Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#F85606]" />
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Danh Sách Mặt Hàng Điều Chỉnh
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold font-mono">
              {adjustment.lines?.length || 0} SP
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={lineKeyword}
              onChange={(e) => setLineKeyword(e.target.value)}
              placeholder="Tìm theo mã SKU, tên SP, số lô..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 whitespace-nowrap">Mã SKU</th>
                <th className="py-3 px-4 min-w-[200px]">Tên Sản Phẩm</th>
                <th className="py-3 px-3 whitespace-nowrap">Số Lô Hàng</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Tồn Khi Lập</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Số Lượng Giảm</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Giá Vốn</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Thành Tiền</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Thẻ Kho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    Không có mặt hàng nào phù hợp với bộ lọc tìm kiếm
                  </td>
                </tr>
              ) : (
                filteredLines.map((line, idx) => (
                  <tr key={line.id || idx} className="hover:bg-orange-50/30 transition">
                    <td className="py-3 px-3 text-center text-gray-400 font-medium">
                      {line.lineNo || idx + 1}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {line.productSku}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      <div className="font-semibold text-gray-800">{line.productName}</div>
                      <div className="text-[11px] text-gray-400">ĐVT: {line.baseUnit}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {line.hasBatchManagement ? (
                        <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200 inline-block">
                          {line.batchNumber || 'Chưa gán lô'}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Không theo lô</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-gray-600 whitespace-nowrap">
                      {line.currentStock?.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-900 font-mono whitespace-nowrap">
                      {line.adjustmentQuantity?.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-700 whitespace-nowrap">
                      {formatVnd(line.costPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 font-mono whitespace-nowrap">
                      {formatVnd(line.lossValue)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/inventory/stock-card?productId=${line.productId}&warehouseId=${adjustment.warehouseId}`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 text-xs font-bold border border-orange-200 transition cursor-pointer active:scale-95 whitespace-nowrap"
                        title="Xem biến động trên thẻ kho"
                      >
                        Thẻ kho &gt;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50/90 font-bold border-t border-gray-200 text-xs">
              <tr>
                <td colSpan={5} className="py-3.5 px-3 text-right text-gray-700 uppercase tracking-wider font-bold">
                  TỔNG CỘNG:
                </td>
                <td className="py-3.5 px-3 text-center text-gray-900 font-mono font-bold whitespace-nowrap">
                  {adjustment.totalQuantity?.toLocaleString('vi-VN')}
                </td>
                <td></td>
                <td className="py-3.5 px-3 text-right text-rose-600 font-mono font-bold whitespace-nowrap">
                  {formatVnd(adjustment.totalLossValue)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Card Ghi chú phiếu */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/40 text-xs text-gray-600">
          <strong>Ghi chú phiếu:</strong> {adjustment.notes || 'Không có ghi chú thêm'}
        </div>
      </div>

      {/* ================= 6. BẢN IN PHIẾU ĐIỀU CHỈNH CHUẨN KẾ TOÁN (CHỈ HIỆN KHI BẤM IN) ================= */}
      <div className="hidden print:block w-full bg-white text-black font-sans leading-normal">
        {/* Header Quốc hiệu / Đơn vị */}
        <div className="flex justify-between items-start pb-2 border-b border-black mb-3">
          <div>
            <p className="font-bold text-xs uppercase tracking-wider">CÔNG TY CỔ PHẦN THƯƠNG MẠI & PHÂN PHỐI ERP</p>
            <p className="text-[11px] text-gray-700">Kho thực hiện: {adjustment.warehouseName} ({adjustment.warehouseCode})</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs font-bold">Mẫu số: 02-VT</p>
            <p className="text-[10px] italic text-gray-600">(Ban hành theo TT 200/2014/TT-BTC)</p>
            <p className="font-mono text-xs font-bold mt-0.5">Số phiếu: {adjustment.code}</p>
          </div>
        </div>

        {/* Tiêu đề chính giữa */}
        <div className="text-center my-3">
          <h1 className="text-base font-black uppercase tracking-wider">PHIẾU ĐIỀU CHỈNH / XUẤT HỦY TỒN KHO</h1>
          <p className="text-[11px] italic text-gray-600 mt-0.5">
            Ngày lập: {adjustment.adjustmentDate}
          </p>
        </div>

        {/* Khối thông tin chi tiết */}
        <div className="border border-black p-2.5 rounded text-[11px] mb-3 space-y-1">
          <div className="grid grid-cols-2 gap-x-4">
            <div><strong>- Lý do điều chỉnh:</strong> {adjustment.adjustmentReasonLabel || adjustment.adjustmentReason}</div>
            <div><strong>- Người lập phiếu:</strong> {adjustment.createdByName}</div>
            <div><strong>- Kho điều chỉnh:</strong> {adjustment.warehouseName}</div>
            <div><strong>- Người duyệt:</strong> {adjustment.approvedByName || 'Chưa duyệt'}</div>
            <div><strong>- Trạng thái phiếu:</strong> {getStatusText(adjustment.status)}</div>
            <div><strong>- Tổng số lượng giảm:</strong> {adjustment.totalQuantity?.toLocaleString('vi-VN')} SP</div>
          </div>
          {adjustment.reasonDescription && (
            <div><strong>- Diễn giải lý do:</strong> {adjustment.reasonDescription}</div>
          )}
          {adjustment.notes && (
            <div><strong>- Ghi chú:</strong> {adjustment.notes}</div>
          )}
        </div>

        {/* Bảng in toàn bộ mặt hàng */}
        <table className="w-full border-collapse border-2 border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black text-center font-bold">
              <th className="border border-black py-1 px-1.5 w-7">STT</th>
              <th className="border border-black py-1 px-2 w-24 text-left">Mã SKU</th>
              <th className="border border-black py-1 px-2 text-left">Tên sản phẩm</th>
              <th className="border border-black py-1 px-1.5 w-14">ĐVT</th>
              <th className="border border-black py-1 px-2 w-20">Số lô</th>
              <th className="border border-black py-1 px-2 w-16 text-right">Tồn khi lập</th>
              <th className="border border-black py-1 px-2 w-16 text-right">SL Giảm</th>
              <th className="border border-black py-1 px-2 w-20 text-right">Giá vốn</th>
              <th className="border border-black py-1 px-2 w-24 text-right">Thành tiền tổn thất</th>
            </tr>
          </thead>
          <tbody>
            {adjustment.lines?.map((line, idx) => (
              <tr key={line.id || idx} className="border-b border-black">
                <td className="border border-black py-1 px-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black py-1 px-2 font-mono font-bold">{line.productSku}</td>
                <td className="border border-black py-1 px-2 font-medium">{line.productName}</td>
                <td className="border border-black py-1 px-1 text-center font-medium">{line.baseUnit}</td>
                <td className="border border-black py-1 px-2 text-center font-mono">{line.batchNumber || '---'}</td>
                <td className="border border-black py-1 px-2 text-right font-mono">
                  {line.currentStock?.toLocaleString('vi-VN')}
                </td>
                <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                  {line.adjustmentQuantity?.toLocaleString('vi-VN')}
                </td>
                <td className="border border-black py-1 px-2 text-right font-mono">
                  {formatVnd(line.costPrice)}
                </td>
                <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                  {formatVnd(line.lossValue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-bold border-t-2 border-b-2 border-black">
            <tr>
              <td colSpan={6} className="border border-black py-1.5 px-3 text-right uppercase">
                Tổng cộng ({adjustment.lines?.length || 0} mặt hàng):
              </td>
              <td className="border border-black py-1.5 px-2 text-right font-mono">
                {adjustment.totalQuantity?.toLocaleString('vi-VN')}
              </td>
              <td className="border border-black py-1.5 px-2 text-right"></td>
              <td className="border border-black py-1.5 px-2 text-right font-mono text-xs">
                {formatVnd(adjustment.totalLossValue)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Khối chữ ký xác nhận 4 bên */}
        <div className="mt-8 pt-3 border-t border-gray-400 text-[11px]">
          <div className="text-right italic mb-3">
            Ngày ...... tháng ...... năm 2026
          </div>
          <div className="grid grid-cols-4 text-center gap-2">
            <div>
              <p className="font-bold">Người lập phiếu</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold">{adjustment.createdByName}</p>
            </div>
            <div>
              <p className="font-bold">Thủ kho</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-400">..............................</p>
            </div>
            <div>
              <p className="font-bold">Kế toán kho</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-400">..............................</p>
            </div>
            <div>
              <p className="font-bold">Quản lý kho / Admin</p>
              <p className="text-[10px] italic text-gray-600">(Ký, đóng dấu)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-800">
                {adjustment.approvedByName || '..............................'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL PHÊ DUYỆT (AC3) ================= */}
      {isApproveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Phê Duyệt Phiếu Điều Chỉnh</h3>
                <p className="text-xs text-gray-500">Mã phiếu: {adjustment.code}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <strong className="block font-bold">Xác nhận xuất kho xử lý hao hụt:</strong>
              <p>
                - Tổng giá trị tổn thất: <strong className="text-rose-600">{formatVnd(adjustment.totalLossValue)}</strong>
              </p>
              <p>- Tồn kho thực tế tại kho <strong>{adjustment.warehouseName}</strong> sẽ bị trừ ngay lập tức.</p>
              <p>- Mọi thay đổi sẽ tự động ghi nhận vào Thẻ kho (Stock Movement).</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-800 text-sm">Ghi chú duyệt (không bắt buộc)</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                rows={4}
                placeholder="Nhập ý kiến phê duyệt hoặc chỉ đạo xử lý..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmApprove}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw size={13} className="animate-spin" />}
                <span>Xác nhận phê duyệt & Xuất kho</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TỪ CHỐI DUYỆT ================= */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Từ Chối Phê Duyệt Phiếu</h3>
                <p className="text-xs text-gray-500">Mã phiếu: {adjustment.code}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-800 text-sm">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Nhập rõ lý do từ chối để thủ kho nắm thông tin điều chỉnh lại..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading && <RefreshCw size={13} className="animate-spin" />}
                <span>Xác nhận từ chối</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL HUỶ PHIẾU ================= */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Xác Nhận Huỷ Phiếu Điều Chỉnh</h3>
                <p className="text-xs text-gray-500">Mã phiếu: {adjustment.code}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Bạn có chắc chắn muốn huỷ phiếu điều chỉnh này không? Sau khi huỷ, phiếu sẽ chuyển sang trạng thái <strong>ĐÃ HUỶ</strong> và không thể hoàn tác.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-800 text-sm">Lý do huỷ phiếu (tuỳ chọn)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Nhập lý do huỷ..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:border-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw size={13} className="animate-spin" />}
                <span>Xác nhận huỷ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
