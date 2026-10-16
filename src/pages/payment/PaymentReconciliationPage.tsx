import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Image as ImageIcon,
  Plus,
  Printer,
  RefreshCw,
  Building2,
  Check,
  X,
  User,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import {
  fetchPaymentReconciliation,
  confirmRouteCashCollection,
  rejectRouteCashCollection
} from '../../services/paymentApi';
import type {
  PaymentReconciliationResponse,
  PaymentReconciliationItem,
  PaymentReceipt
} from '../../types/payment';
import { PaymentReceiptModal } from '../../components/payment/PaymentReceiptModal';
import { PaymentReceiptPrintModal } from '../../components/payment/PaymentReceiptPrintModal';

export const PaymentReconciliationPage: React.FC = () => {
  const { user, showToast } = useAuth();
  const isAccountantOrAdmin =
    user?.role === 'ROLE_ACCOUNTANT' || user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_SALES_MANAGER';

  const todayStr = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [collectorId, setCollectorId] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<PaymentReconciliationResponse | null>(null);

  // Modal ghi nhận thu tiền tại tuyến
  const [showCollectModal, setShowCollectModal] = useState<boolean>(false);

  // Modal in phiếu thu
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<PaymentReceipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Lightbox xem ảnh biên lai
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Modal từ chối nhận tiền
  const [rejectingItem, setRejectingItem] = useState<PaymentReconciliationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPaymentReconciliation({
        fromDate,
        toDate,
        collectorId: collectorId || undefined
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải bảng đối chiếu tiền thu';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, collectorId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Kế toán xác nhận nhận tiền nộp quỹ
  const handleConfirm = async (item: PaymentReconciliationItem) => {
    if (!window.confirm(`Xác nhận đã nhận tiền mặt ${formatCurrencyVND(item.amount)} cho phiếu ${item.code} từ nhân viên?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await confirmRouteCashCollection(item.id, {
        username: user?.username || 'accountant',
        fullName: user?.fullName || 'Kế toán'
      });
      showToast(`Đã duyệt nộp quỹ và cấn trừ công nợ cho phiếu ${item.code}!`, 'success');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xác nhận nộp quỹ';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Kế toán từ chối nhận tiền nộp quỹ
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối nhận tiền', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      await rejectRouteCashCollection(rejectingItem.id, rejectionReason.trim(), {
        username: user?.username || 'accountant',
        fullName: user?.fullName || 'Kế toán'
      });
      showToast(`Đã từ chối khoản thu ${rejectingItem.code}`, 'info');
      setRejectingItem(null);
      setRejectionReason('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi từ chối nhận tiền';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Mở modal in từ item đối chiếu
  const handleOpenPrint = (item: PaymentReconciliationItem) => {
    const receipt: PaymentReceipt = {
      id: item.id,
      code: item.code,
      customerId: item.customerId,
      customerCode: item.customerCode,
      customerName: item.customerName,
      amount: item.amount,
      paymentMethod: item.paymentMethod as any,
      paymentDate: item.paymentDate,
      collectorName: data?.collectorName || user?.fullName || 'Nhân viên kinh doanh',
      collectorUsername: data?.collectorUsername || user?.username,
      notes: item.notes,
      status: item.status,
      receiptImageUrl: item.receiptImageUrl,
      confirmedAt: item.confirmedAt,
      confirmedByUsername: item.confirmedByUsername,
      rejectedAt: item.rejectedAt,
      rejectedByUsername: item.rejectedByUsername,
      rejectionReason: item.rejectionReason,
      allocationType: 'FIFO',
      allocations: [],
      createdAt: item.createdAt
    };
    setSelectedReceiptForPrint(receipt);
    setShowPrintModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              S7-05
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              Đối chiếu thu tiền theo tuyến & Nộp quỹ
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ghi nhận khoản thu tại cửa hàng kèm ảnh biên lai, đối chiếu tiền đã thu với tiền đã nộp mà không tranh cãi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCollectModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Plus size={16} />
            <span>Thu tiền tại tuyến</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng thu */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tổng tiền đã thu</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign size={18} />
            </span>
          </div>
          <p className="text-xl font-black text-gray-900 dark:text-white font-mono mt-2">
            {formatCurrencyVND(data?.totalCollectedAmount || 0)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Tổng số: <strong className="text-gray-800 dark:text-gray-200">{data?.totalCount || 0}</strong> khoản thu
          </p>
        </div>

        {/* Chờ nộp quỹ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800/40 shadow-sm bg-amber-50/20 dark:bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Chờ nộp quỹ</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock size={18} />
            </span>
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-2">
            {formatCurrencyVND(data?.pendingAmount || 0)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Đang giữ bởi NVKD: <strong className="text-amber-700 dark:text-amber-400">{data?.pendingCount || 0}</strong> khoản
          </p>
        </div>

        {/* Đã nộp quỹ & cấn nợ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/40 shadow-sm bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Đã nộp quỹ thành công</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            {formatCurrencyVND(data?.confirmedAmount || 0)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Kế toán đã duyệt: <strong className="text-emerald-700 dark:text-emerald-400">{data?.confirmedCount || 0}</strong> khoản
          </p>
        </div>

        {/* Bị từ chối */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-800/40 shadow-sm bg-rose-50/20 dark:bg-rose-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Bị từ chối</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <XCircle size={18} />
            </span>
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-2">
            {formatCurrencyVND(data?.rejectedAmount || 0)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Cần xử lý lại: <strong className="text-rose-700 dark:text-rose-400">{data?.rejectedCount || 0}</strong> khoản
          </p>
        </div>
      </div>

      {/* Bộ lọc theo ngày & nhân viên */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Từ ngày</span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Đến ngày</span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {isAccountantOrAdmin && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                <User size={13} />
                <span>Mã/ID nhân viên (tuỳ chọn)</span>
              </label>
              <input
                type="text"
                placeholder="Tất cả nhân viên"
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={loadData}
              className="w-full py-2 px-3.5 rounded-xl bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Tra cứu đối chiếu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bảng danh sách chi tiết các khoản thu */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Bảng đối chiếu thu tiền ({data?.items?.length || 0} phát sinh)
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Kỳ: <strong className="text-gray-700 dark:text-gray-300">{fromDate}</strong> đến{' '}
            <strong className="text-gray-700 dark:text-gray-300">{toDate}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Mã phiếu</th>
                <th className="px-4 py-3">Ngày thu</th>
                <th className="px-4 py-3">Đại lý</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3 text-center">Hình thức</th>
                <th className="px-4 py-3 text-center">Ảnh biên lai</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3">Ghi chú / Lý do</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-500" />
                    <span>Đang tải bảng đối chiếu...</span>
                  </td>
                </tr>
              ) : !data?.items || data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <AlertCircle size={28} className="mx-auto mb-2 text-gray-400" />
                    <span>Không có khoản thu nào trong khoảng thời gian đã chọn</span>
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.paymentDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {item.customerName}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                        {item.customerCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyVND(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {item.paymentMethod === 'CASH' ? 'Tiền mặt' : item.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.receiptImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(item.receiptImageUrl || null)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-semibold text-[11px] cursor-pointer transition"
                          title="Xem ảnh biên lai chụp tại cửa hàng"
                        >
                          <ImageIcon size={13} />
                          <span>Xem ảnh</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Không có</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'PENDING_SUBMISSION' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock size={12} />
                          <span>Chờ nộp quỹ</span>
                        </span>
                      )}
                      {item.status === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          <span>Đã nộp quỹ</span>
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle size={12} />
                          <span>Từ chối</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                      {item.rejectionReason ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          Lý do từ chối: {item.rejectionReason}
                        </span>
                      ) : (
                        item.notes || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Kế toán duyệt hoặc từ chối khi đang PENDING_SUBMISSION */}
                        {isAccountantOrAdmin && item.status === 'PENDING_SUBMISSION' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleConfirm(item)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold cursor-pointer transition"
                              title="Xác nhận đã nhận tiền nộp quỹ (cấn trừ nợ)"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingItem(item);
                                setRejectionReason('');
                              }}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold cursor-pointer transition"
                              title="Từ chối nhận tiền"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenPrint(item)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition"
                          title="Xem và in phiếu thu"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lightbox xem ảnh biên lai */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-3xl max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
            <div className="flex items-center justify-between p-3.5 bg-gray-900/90 border-b border-gray-800">
              <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <ImageIcon size={14} />
                <span>Ảnh biên lai thu tiền tại cửa hàng</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img
                src={previewImageUrl}
                alt="Ảnh biên lai"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập lý do từ chối nhận tiền */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <XCircle size={18} className="text-rose-500" />
                <span>Từ chối nhận tiền nộp quỹ</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Khoản thu: <strong className="font-mono text-gray-900 dark:text-white">{rejectingItem.code}</strong> -{' '}
              Đại lý: <strong>{rejectingItem.customerName}</strong> ({formatCurrencyVND(rejectingItem.amount)})
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Lý do từ chối *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Thiếu tiền mặt so với biên lai, tiền rách, biên lai không rõ nét..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold text-xs transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lập phiếu thu tiền tại tuyến */}
      <PaymentReceiptModal
        isOpen={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Modal In phiếu thu */}
      <PaymentReceiptPrintModal
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setSelectedReceiptForPrint(null);
        }}
        receipt={selectedReceiptForPrint}
      />
    </div>
  );
};
