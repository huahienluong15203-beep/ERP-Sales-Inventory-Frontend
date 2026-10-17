import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  Warehouse as WarehouseIcon,
  Filter,
  Package,
  FileText
} from 'lucide-react';
import {
  fetchStockAdjustments,
  fetchStockAdjustmentDetail,
  approveStockAdjustment,
  rejectStockAdjustment,
  cancelStockAdjustment
} from '../../services/stockAdjustmentApi';
import { authFetch, API_BASE_URL } from '../../services/api';
import type { StockAdjustment } from '../../types/stockAdjustment';

export const StockAdjustmentListPage: React.FC = () => {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();

  // Roles
  const isWhManager =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => ['ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(r)));

  const canCreate =
    isWhManager ||
    currentRole === 'ROLE_WAREHOUSE' ||
    Boolean(user?.roles?.some((r) => ['ROLE_WAREHOUSE'].includes(r)));

  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Filters
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  // Modals
  const [detailItem, setDetailItem] = useState<StockAdjustment | null>(null);

  const [approvingItem, setApprovingItem] = useState<StockAdjustment | null>(null);
  const [approveNotes, setApproveNotes] = useState<string>('');

  const [rejectingItem, setRejectingItem] = useState<StockAdjustment | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [cancellingItem, setCancellingItem] = useState<StockAdjustment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Tải danh sách kho
  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/warehouses`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setWarehouses(Array.isArray(data) ? data : []))
      .catch((err) => console.warn('Không tải được danh sách kho:', err));
  }, []);

  // Tải danh sách phiếu điều chỉnh
  const loadAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStockAdjustments({
        warehouseId: selectedWarehouseId ? Number(selectedWarehouseId) : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        reason: selectedReason !== 'ALL' ? selectedReason : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        keyword: keyword || undefined,
        page: currentPage,
        size: 15
      });
      setAdjustments(data.content || []);
      setTotalElements(data.totalElements || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi tải danh sách phiếu điều chỉnh');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouseId, selectedStatus, selectedReason, fromDate, toDate, keyword, currentPage]);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  // Xem chi tiết
  const handleOpenDetail = async (id: number) => {
    setDetailItem(null);
    try {
      const detail = await fetchStockAdjustmentDetail(id);
      setDetailItem(detail);
    } catch (err: any) {
      showToast('error', err.message || 'Không thể tải chi tiết phiếu điều chỉnh');
    }
  };

  // Xác nhận Duyệt phiếu (AC3)
  const handleConfirmApprove = async () => {
    if (!approvingItem) return;
    setActionLoading(true);
    try {
      await approveStockAdjustment(approvingItem.id, { notes: approveNotes.trim() });
      showToast('success', `Đã duyệt phiếu ${approvingItem.code} và xuất kho ghi nhận thẻ kho thành công!`);
      setApprovingItem(null);
      setApproveNotes('');
      loadAdjustments();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi phê duyệt phiếu');
    } finally {
      setActionLoading(false);
    }
  };

  // Xác nhận Từ chối duyệt
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    if (!rejectReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await rejectStockAdjustment(rejectingItem.id, { notes: rejectReason.trim() });
      showToast('success', `Đã từ chối phiếu ${rejectingItem.code}`);
      setRejectingItem(null);
      setRejectReason('');
      loadAdjustments();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi từ chối phiếu');
    } finally {
      setActionLoading(false);
    }
  };

  // Xác nhận Huỷ phiếu
  const handleConfirmCancel = async () => {
    if (!cancellingItem) return;
    if (!cancelReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do huỷ phiếu');
      return;
    }
    setActionLoading(true);
    try {
      await cancelStockAdjustment(cancellingItem.id, cancelReason.trim());
      showToast('success', `Đã huỷ phiếu ${cancellingItem.code}`);
      setCancellingItem(null);
      setCancelReason('');
      loadAdjustments();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi huỷ phiếu');
    } finally {
      setActionLoading(false);
    }
  };

  const formatVnd = (amount: number | null | undefined) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} className="text-emerald-600" />
            Đã duyệt & xuất kho
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} className="text-rose-600" />
            Từ chối duyệt
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            <Trash2 size={12} className="text-gray-500" />
            Đã huỷ
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const getReasonBadge = (reason: string, label?: string) => {
    switch (reason) {
      case 'DAMAGED_GOODS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {label || 'Hàng hỏng / hư hại'}
          </span>
        );
      case 'LOST_GOODS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {label || 'Hàng mất / thất thoát'}
          </span>
        );
      case 'EXPIRED_DISPOSAL':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {label || 'Hết hạn phải huỷ'}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {label || 'Lý do khác'}
          </span>
        );
    }
  };

  return (
    <div className="erp-fade-in space-y-4">
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

      {/* Filter Bar with Action Buttons */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-orange-500" />
            <span>Bộ lọc tìm kiếm</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAdjustments}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-orange-500' : ''} />
              <span>Làm mới</span>
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={() => navigate('/inventory/stock-adjustments/create')}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Lập Phiếu Điều Chỉnh Mới</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Kho hàng */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Kho hàng</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none"
            >
              <option value="">-- Tất cả kho --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Trạng thái</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="PENDING_APPROVAL">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt & xuất kho</option>
              <option value="REJECTED">Từ chối duyệt</option>
              <option value="CANCELLED">Đã huỷ</option>
            </select>
          </div>

          {/* Lý do */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Lý do điều chỉnh</label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none"
            >
              <option value="ALL">-- Tất cả lý do --</option>
              <option value="DAMAGED_GOODS">Hàng hỏng / hư hại</option>
              <option value="LOST_GOODS">Hàng mất / thất thoát</option>
              <option value="EXPIRED_DISPOSAL">Hết hạn phải huỷ</option>
              <option value="OTHER">Lý do khác</option>
            </select>
          </div>

          {/* Từ ngày */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Đến ngày */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Từ khóa */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tìm mã phiếu</label>
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setCurrentPage(0);
                }}
                placeholder="Nhập mã phiếu..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200/70 text-gray-600 font-bold">
                <th className="py-3 px-3.5">Mã Phiếu</th>
                <th className="py-3 px-3">Ngày Lập</th>
                <th className="py-3 px-3">Kho Hàng</th>
                <th className="py-3 px-3">Lý Do Hao Hụt</th>
                <th className="py-3 px-3 text-right">Tổng SL Giảm</th>
                <th className="py-3 px-3 text-right">Giá Trị Tổn Thất</th>
                <th className="py-3 px-3">Người Lập</th>
                <th className="py-3 px-3">Trạng Thái</th>
                <th className="py-3 px-3">Người Duyệt</th>
                <th className="py-3 px-3.5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-orange-500" />
                    <span>Đang tải danh sách phiếu điều chỉnh tồn kho...</span>
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <Package size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-gray-700">Chưa có phiếu điều chỉnh tồn kho nào</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Các phiếu xử lý hàng hỏng, hàng mất hoặc hết hạn huỷ bỏ sẽ hiển thị tại đây.
                    </p>
                  </td>
                </tr>
              ) : (
                adjustments.map((item) => {
                  const isPending = item.status === 'PENDING_APPROVAL';
                  // Quy định AC3: Chỉ Quản lý kho / Admin được duyệt; người lập và người duyệt KHÔNG ĐƯỢC LÀ MỘT.
                  const isCreator = Boolean(user?.id && item.createdById && Number(user.id) === Number(item.createdById));

                  return (
                    <tr key={item.id} className="hover:bg-orange-50/20 transition">
                      {/* Mã phiếu */}
                      <td className="py-3 px-3.5 font-bold text-orange-600 font-mono">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="hover:underline cursor-pointer"
                        >
                          {item.code}
                        </button>
                      </td>

                      {/* Ngày lập */}
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {item.adjustmentDate}
                      </td>

                      {/* Kho hàng */}
                      <td className="py-3 px-3 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <WarehouseIcon size={13} className="text-gray-400" />
                          <span>{item.warehouseName}</span>
                        </div>
                      </td>

                      {/* Lý do hao hụt */}
                      <td className="py-3 px-3">
                        {getReasonBadge(item.adjustmentReason, item.adjustmentReasonLabel)}
                        {item.reasonDescription && (
                          <div className="text-[11px] text-gray-400 truncate max-w-[180px] mt-0.5">
                            {item.reasonDescription}
                          </div>
                        )}
                      </td>

                      {/* Tổng SL giảm */}
                      <td className="py-3 px-3 text-right font-bold text-gray-800">
                        {item.totalQuantity?.toLocaleString('vi-VN')}
                      </td>

                      {/* Giá trị tổn thất */}
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {formatVnd(item.totalLossValue)}
                      </td>

                      {/* Người lập */}
                      <td className="py-3 px-3 text-gray-600">
                        <span className="font-medium text-gray-800">{item.createdByName || '—'}</span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-3">{getStatusBadge(item.status)}</td>

                      {/* Người duyệt */}
                      <td className="py-3 px-3 text-gray-500">
                        {item.approvedByName ? (
                          <div>
                            <span className="font-semibold text-gray-800">{item.approvedByName}</span>
                            {item.approvedAt && (
                              <div className="text-[10px] text-gray-400">
                                {new Date(item.approvedAt).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chưa duyệt</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item.id)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
                            title="Xem chi tiết phiếu"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Duyệt phiếu (AC3) */}
                          {isPending && isWhManager && (
                            <button
                              type="button"
                              disabled={isCreator}
                              onClick={() => setApprovingItem(item)}
                              className={`p-1.5 rounded-lg text-white font-bold transition flex items-center gap-1 ${
                                isCreator
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                                  : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                              }`}
                              title={
                                isCreator
                                  ? 'Bạn là người lập phiếu này'
                                  : 'Phê duyệt phiếu điều chỉnh'
                              }
                            >
                              <CheckCircle size={13} />
                            </button>
                          )}

                          {/* Từ chối duyệt */}
                          {isPending && isWhManager && !isCreator && (
                            <button
                              type="button"
                              onClick={() => setRejectingItem(item)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                              title="Từ chối duyệt"
                            >
                              <XCircle size={13} />
                            </button>
                          )}

                          {/* Huỷ phiếu (cho phép khi chờ duyệt) */}
                          {isPending && (isCreator || isWhManager) && (
                            <button
                              type="button"
                              onClick={() => setCancellingItem(item)}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition cursor-pointer"
                              title="Huỷ phiếu"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Tổng số <strong>{totalElements}</strong> phiếu điều chỉnh (Trang {currentPage + 1}/{totalPages})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentPage === i
                      ? 'bg-orange-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL XEM CHI TIẾT PHIẾU ĐIỀU CHỈNH ================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">Chi Tiết Phiếu Điều Chỉnh</h2>
                    <span className="font-mono font-bold text-orange-600 text-sm">{detailItem.code}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Kho: <strong>{detailItem.warehouseName}</strong> • Ngày lập: {detailItem.adjustmentDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(detailItem.status)}
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Thống kê tổn thất */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-orange-50/40 border border-orange-200/60">
                <div>
                  <span className="block text-[11px] font-semibold text-gray-500">Lý do điều chỉnh</span>
                  <div className="mt-1">
                    {getReasonBadge(detailItem.adjustmentReason, detailItem.adjustmentReasonLabel)}
                  </div>
                  {detailItem.reasonDescription && (
                    <p className="text-xs text-gray-600 mt-1 italic">{detailItem.reasonDescription}</p>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-gray-500">Người lập phiếu</span>
                  <span className="text-xs font-bold text-gray-800 mt-1 block">
                    {detailItem.createdByName || '—'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('vi-VN') : ''}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-gray-500">Người duyệt (AC3)</span>
                  <span className="text-xs font-bold text-gray-800 mt-1 block">
                    {detailItem.approvedByName || 'Chưa duyệt'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {detailItem.approvedAt ? new Date(detailItem.approvedAt).toLocaleString('vi-VN') : ''}
                  </span>
                </div>

                <div className="sm:text-right">
                  <span className="block text-[11px] font-semibold text-gray-500">Tổng Giá Trị Tổn Thất</span>
                  <span className="text-base font-bold text-rose-600 mt-0.5 block">
                    {formatVnd(detailItem.totalLossValue)}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Tổng giảm: <strong>{detailItem.totalQuantity?.toLocaleString('vi-VN')}</strong> SP
                  </span>
                </div>
              </div>

              {Boolean(detailItem.rejectionReason) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  <strong className="block font-bold mb-0.5">Lý do từ chối / huỷ phiếu:</strong>
                  <span>{detailItem.rejectionReason}</span>
                </div>
              )}

              {/* Bảng chi tiết mặt hàng */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Danh Sách Mặt Hàng Điều Chỉnh</span>
                  <span className="text-gray-400 font-normal">
                    {detailItem.lines?.length || 0} sản phẩm
                  </span>
                </h3>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Mã SKU</th>
                        <th className="py-2.5 px-3">Tên Sản Phẩm</th>
                        <th className="py-2.5 px-3">Số Lô</th>
                        <th className="py-2.5 px-3 text-right">Tồn Khi Lập</th>
                        <th className="py-2.5 px-3 text-right">Số Lượng Giảm</th>
                        <th className="py-2.5 px-3 text-right">Giá Vốn</th>
                        <th className="py-2.5 px-3 text-right">Thành Tiền Tổn Thất</th>
                        <th className="py-2.5 px-3 text-center">Thẻ Kho (AC4)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detailItem.lines?.map((line, idx) => (
                        <tr key={line.id || idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 text-gray-400">{line.lineNo || idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-800">{line.productSku}</td>
                          <td className="py-2.5 px-3 text-gray-900 font-medium">
                            {line.productName}
                            <span className="text-[11px] text-gray-400 ml-1">({line.baseUnit})</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {line.hasBatchManagement ? (
                              <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                {line.batchNumber || 'Chưa gán lô'}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Không theo lô</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500">
                            {line.currentStock?.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            {line.adjustmentQuantity?.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-600">
                            {formatVnd(line.costPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            {formatVnd(line.lossValue)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailItem(null);
                                navigate(`/inventory/stock-card?productId=${line.productId}&warehouseId=${detailItem.warehouseId}`);
                              }}
                              className="px-2 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 text-[11px] font-bold transition cursor-pointer"
                              title="Xem biến động trên thẻ kho"
                            >
                              Thẻ kho &gt;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                      <tr>
                        <td colSpan={5} className="py-2.5 px-3 text-right text-gray-700">
                          TỔNG CỘNG:
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-900">
                          {detailItem.totalQuantity?.toLocaleString('vi-VN')}
                        </td>
                        <td></td>
                        <td className="py-2.5 px-3 text-right text-rose-600 text-sm">
                          {formatVnd(detailItem.totalLossValue)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs text-gray-500">
                Ghi chú: {detailItem.notes || 'Không có ghi chú thêm'}
              </span>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PHÊ DUYỆT (AC3) ================= */}
      {approvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Phê Duyệt Phiếu Điều Chỉnh</h3>
                <p className="text-xs text-gray-500">Mã phiếu: {approvingItem.code}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <strong className="block font-bold">Xác nhận xuất kho xử lý hao hụt:</strong>
              <p>
                - Tổng giá trị tổn thất: <strong className="text-rose-600">{formatVnd(approvingItem.totalLossValue)}</strong>
              </p>
              <p>- Tồn kho thực tế tại kho <strong>{approvingItem.warehouseName}</strong> sẽ bị trừ ngay lập tức.</p>
              <p>- Mọi thay đổi sẽ tự động ghi nhận vào Thẻ kho (Stock Movement).</p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-gray-700">Ghi chú duyệt (không bắt buộc)</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Đã kiểm tra thực tế hàng vỡ tại kho, đồng ý duyệt..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setApprovingItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Đang duyệt...' : 'Xác Nhận Duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TỪ CHỐI DUYỆT ================= */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Từ Chối Phê Duyệt Phiếu</h3>
                <p className="text-xs text-gray-500">Mã phiếu: {rejectingItem.code}</p>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-gray-700 flex items-center gap-1">
                <span>Lý do từ chối</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Nhập lý do không đồng ý duyệt phiếu điều chỉnh..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Đang từ chối...' : 'Xác Nhận Từ Chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL HUỶ PHIẾU ================= */}
      {cancellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Huỷ Phiếu Điều Chỉnh</h3>
                <p className="text-xs text-gray-500">Mã phiếu: {cancellingItem.code}</p>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-gray-700 flex items-center gap-1">
                <span>Lý do huỷ phiếu</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Nhập lý do huỷ phiếu này..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={actionLoading || !cancelReason.trim()}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Đang huỷ...' : 'Xác Nhận Huỷ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
