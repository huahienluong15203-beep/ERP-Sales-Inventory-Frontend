import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Printer,
  X,
  AlertTriangle,
  RefreshCw,
  Layers
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchSalesReturns,
  confirmReceiveAndRestock,
  cancelSalesReturn,
  type SalesReturnItem
} from '../../services/salesReturnApi';
import { fetchWarehouses } from '../../services/warehouseApi';
import type { Warehouse } from '../../types/warehouse';
import { formatCurrencyVND } from '../../services/orderService';

export const SalesReturnListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, currentRole } = useAuth();

  const isWarehouseOrAdmin = [
    'ROLE_WAREHOUSE',
    'ROLE_WH_MANAGER',
    'ROLE_ADMIN'
  ].includes(currentRole ?? '');

  // Filter states
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Data states
  const [items, setItems] = useState<SalesReturnItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modal chi tiết
  const [detailItem, setDetailItem] = useState<SalesReturnItem | null>(null);

  // Modal xác nhận nhận hàng (AC4)
  const [receivingItem, setReceivingItem] = useState<SalesReturnItem | null>(null);
  const [receiveNotes, setReceiveNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modal huỷ phiếu
  const [cancellingItem, setCancellingItem] = useState<SalesReturnItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Load kho
  useEffect(() => {
    fetchWarehouses()
      .then(setWarehouses)
      .catch((err) => console.warn('Lỗi tải danh sách kho:', err));
  }, []);

  // Load danh sách phiếu trả
  const loadData = async (targetPage = 0) => {
    setLoading(true);
    try {
      const res = await fetchSalesReturns({
        keyword: keyword.trim() || undefined,
        status: statusFilter,
        warehouseId: selectedWarehouseId !== '' ? Number(selectedWarehouseId) : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: targetPage,
        size: 15
      });
      setItems(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
      setPage(targetPage);
    } catch (err: any) {
      showToast(err?.message || 'Không thể tải danh sách phiếu trả hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(0);
  }, [statusFilter, selectedWarehouseId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(0);
  };

  // Xác nhận nhận hàng & cộng tồn kho ngược lại (AC4)
  const handleConfirmReceive = async () => {
    if (!receivingItem) return;
    setActionLoading(true);
    try {
      await confirmReceiveAndRestock(receivingItem.id, receiveNotes);
      showToast(`Đã xác nhận nhận hàng phiếu ${receivingItem.code} và cộng tồn kho thành công!`, 'success');
      setReceivingItem(null);
      setReceiveNotes('');
      loadData(page);
    } catch (err: any) {
      showToast(err?.message || 'Không thể xác nhận nhận hàng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Huỷ phiếu trả hàng
  const handleConfirmCancel = async () => {
    if (!cancellingItem) return;
    if (!cancelReason.trim()) {
      showToast('Vui lòng nhập lý do huỷ phiếu', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await cancelSalesReturn(cancellingItem.id, cancelReason);
      showToast(`Đã huỷ phiếu trả hàng ${cancellingItem.code}`, 'success');
      setCancellingItem(null);
      setCancelReason('');
      loadData(page);
    } catch (err: any) {
      showToast(err?.message || 'Không thể huỷ phiếu trả hàng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: SalesReturnItem['status']) => {
    switch (status) {
      case 'PENDING_RECEIPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={12} className="text-amber-600" />
            <span>Chờ nhận hàng</span>
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>Đã nhập kho</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle size={12} className="text-gray-500" />
            <span>Đã huỷ</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20 antialiased">
      {/* 1. Header tinh gọn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#F85606]" />
            <span>Phiếu Trả Hàng & Nhập Lại Kho (S8-01)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Lập phiếu hoàn hàng từ đại lý theo hoá đơn, nhập kho theo lô & kiểm duyệt nhập kho
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/sales-returns/create')}
          className="px-4 py-2.5 rounded-xl bg-[#F85606] hover:bg-[#E04D05] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Plus size={16} />
          <span>Lập Phiếu Trả Hàng Mới</span>
        </button>
      </div>

      {/* 2. Tabs trạng thái */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        {[
          { key: 'ALL', label: 'Tất cả phiếu' },
          { key: 'PENDING_RECEIPT', label: 'Chờ nhận hàng' },
          { key: 'RECEIVED', label: 'Đã nhập kho' },
          { key: 'CANCELLED', label: 'Đã huỷ' }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`pb-3 px-3 transition cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 ${
              statusFilter === tab.key
                ? 'border-[#F85606] text-[#F85606]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Thanh tìm kiếm & bộ lọc */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs"
      >
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã phiếu, mã hoá đơn, tên đại lý..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc kho */}
          <select
            value={selectedWarehouseId}
            onChange={(e) =>
              setSelectedWarehouseId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition cursor-pointer"
          >
            <option value="">Tất cả kho tiếp nhận</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>

          {/* Lọc ngày */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              title="Từ ngày"
            />
            <span>-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              title="Đến ngày"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition cursor-pointer"
          >
            Lọc
          </button>
        </div>
      </form>

      {/* 4. Bảng danh sách phiếu trả hàng */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#F85606] mx-auto" />
            <div>Đang tải danh sách phiếu trả hàng...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400 space-y-2">
            <RotateCcw className="w-10 h-10 text-gray-300 mx-auto" />
            <div>Không có phiếu trả hàng nào phù hợp với điều kiện tìm kiếm</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold">
                  <th className="p-3 w-32">Mã phiếu</th>
                  <th className="p-3 w-28">Ngày trả</th>
                  <th className="p-3 w-32">Hoá đơn gốc</th>
                  <th className="p-3 min-w-[180px]">Đại lý</th>
                  <th className="p-3 min-w-[140px]">Kho tiếp nhận</th>
                  <th className="p-3 w-24 text-right">Tổng SL</th>
                  <th className="p-3 w-32 text-right">Tổng tiền</th>
                  <th className="p-3 w-32 text-center">Trạng thái</th>
                  <th className="p-3 min-w-[130px]">Lý do trả</th>
                  <th className="p-3 w-36 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition">
                    {/* Mã phiếu */}
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="font-mono font-bold text-[#F85606] hover:underline cursor-pointer"
                      >
                        {item.code}
                      </button>
                    </td>

                    {/* Ngày trả */}
                    <td className="p-3 text-gray-600 font-mono">
                      {item.returnDate ? item.returnDate.split('T')[0] : ''}
                    </td>

                    {/* Hoá đơn gốc */}
                    <td className="p-3">
                      <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                        {item.invoiceCode}
                      </span>
                    </td>

                    {/* Đại lý */}
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{item.customerName}</div>
                      <div className="font-mono text-[10px] text-gray-400">{item.customerCode}</div>
                    </td>

                    {/* Kho tiếp nhận */}
                    <td className="p-3 text-gray-700 font-medium">
                      {item.receivingWarehouseName}
                    </td>

                    {/* Tổng SL */}
                    <td className="p-3 text-right font-mono font-bold text-gray-800">
                      {item.totalQuantity}
                    </td>

                    {/* Tổng tiền */}
                    <td className="p-3 text-right font-mono font-bold text-[#F85606]">
                      {formatCurrencyVND(item.totalAmount)}
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3 text-center">{getStatusBadge(item.status)}</td>

                    {/* Lý do trả */}
                    <td className="p-3 text-gray-600 truncate max-w-[160px]" title={item.returnReason}>
                      {item.returnReason}
                    </td>

                    {/* Thao tác */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 transition cursor-pointer"
                          title="Xem chi tiết phiếu"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Quản lý kho xác nhận nhận hàng mới cộng tồn (AC4) */}
                        {item.status === 'PENDING_RECEIPT' && isWarehouseOrAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceivingItem(item);
                              setReceiveNotes('');
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                            title="Xác nhận nhận hàng & Nhập kho"
                          >
                            <CheckCircle2 size={12} />
                            <span>Nhận hàng</span>
                          </button>
                        )}

                        {/* Huỷ phiếu */}
                        {item.status === 'PENDING_RECEIPT' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingItem(item);
                              setCancelReason('');
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                            title="Huỷ phiếu trả"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div>
              Hiển thị <strong>{items.length}</strong> / <strong>{totalElements}</strong> phiếu
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => loadData(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-50 cursor-pointer font-bold"
              >
                Trước
              </button>
              <span className="font-bold">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => loadData(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-50 cursor-pointer font-bold"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. MODAL CHI TIẾT PHIẾU TRẢ HÀNG & MẪU IN */}
      {detailItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs antialiased animate-fade-in"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-[#F85606] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">
                    Chi Tiết Phiếu Trả Hàng: {detailItem.code}
                  </h3>
                  <p className="text-[11px] text-orange-100">
                    Hoá đơn gốc: {detailItem.invoiceCode} • Đại lý: {detailItem.customerName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>In phiếu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Thẻ thông tin chung */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                <div className="space-y-1">
                  <div className="text-gray-500 text-[11px]">Đại lý hoàn trả:</div>
                  <div className="font-bold text-gray-900">{detailItem.customerName}</div>
                  <div className="font-mono text-gray-500 text-[10px]">{detailItem.customerCode}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-[11px]">Kho tiếp nhận:</div>
                  <div className="font-bold text-gray-900">{detailItem.receivingWarehouseName}</div>
                  <div className="text-gray-500 text-[10px]">Ngày lập: {detailItem.returnDate?.split('T')[0]}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-[11px]">Trạng thái phiếu:</div>
                  <div>{getStatusBadge(detailItem.status)}</div>
                  {detailItem.receivedByUsername && (
                    <div className="text-[10px] text-emerald-700 font-medium">
                      Nhận bởi: {detailItem.receivedByUsername} ({detailItem.receivedAt?.slice(0, 16).replace('T', ' ')})
                    </div>
                  )}
                </div>
              </div>

              {/* Lý do trả hàng */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span>Lý do hoàn trả: {detailItem.returnReason}</span>
                </div>
                {detailItem.reasonDescription && (
                  <p className="text-amber-800 text-[11px] pl-5">{detailItem.reasonDescription}</p>
                )}
                {detailItem.notes && (
                  <p className="text-gray-600 text-[11px] pl-5 italic">Ghi chú: {detailItem.notes}</p>
                )}
              </div>

              {/* Bảng chi tiết sản phẩm */}
              <div>
                <h4 className="font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers size={14} className="text-[#F85606]" />
                  <span>Danh Sách Dòng Hàng Hoàn Trả ({detailItem.lines?.length || 0})</span>
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5">Sản phẩm / SKU</th>
                        <th className="p-2.5 w-20 text-center">ĐVT</th>
                        <th className="p-2.5 w-24 text-right">SL trả</th>
                        <th className="p-2.5 w-28 text-right">Đơn giá</th>
                        <th className="p-2.5 w-32 text-right">Thành tiền</th>
                        <th className="p-2.5 min-w-[140px]">Số lô & Hạn dùng</th>
                        <th className="p-2.5 w-28 text-center">Phân loại</th>
                        <th className="p-2.5 w-28 text-center">Cộng tồn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detailItem.lines?.map((line, idx) => (
                        <tr key={line.id} className="hover:bg-gray-50/50">
                          <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-gray-900">{line.productName}</div>
                            <div className="font-mono text-[10px] text-gray-500">{line.productSku}</div>
                          </td>
                          <td className="p-2.5 text-center text-gray-600">{line.unitName}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#F85606]">
                            {line.returnQuantity}
                          </td>
                          <td className="p-2.5 text-right font-mono text-gray-700">
                            {formatCurrencyVND(line.unitPrice)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                            {formatCurrencyVND(line.totalAmount)}
                          </td>
                          <td className="p-2.5">
                            {line.batchNumber ? (
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                                  Lô: {line.batchNumber}
                                </span>
                                {line.expiredDate && (
                                  <div className="text-[10px] text-gray-500">
                                    HSD: {line.expiredDate}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">Không có lô</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {line.isDamaged ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Hàng lỗi (Nhập kho hỏng)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Bình thường
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {line.restocked ? (
                              <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                                <CheckCircle2 size={13} />
                                <span>Đã cộng tồn</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium">Chưa cộng</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tổng cộng */}
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between font-bold">
                <span className="text-gray-600">Tổng giá trị phiếu hoàn trả:</span>
                <span className="text-base text-[#F85606] font-mono">
                  {formatCurrencyVND(detailItem.totalAmount)}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL XÁC NHẬN NHẬN HÀNG & NHẬP KHO (AC4) */}
      {receivingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs antialiased animate-fade-in"
          onClick={() => setReceivingItem(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">
                  Xác Nhận Nhận Hàng & Nhập Kho
                </h3>
                <p className="text-xs text-gray-500">
                  Phiếu trả: <strong>{receivingItem.code}</strong> (Kho: {receivingItem.receivingWarehouseName})
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-2 leading-relaxed bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
              <p>
                Hệ thống sẽ chính thức <strong>cộng số lượng tồn kho</strong> của các sản phẩm trong phiếu trả này vào kho tiếp nhận{' '}
                <strong>{receivingItem.receivingWarehouseName}</strong>.
              </p>
              <p className="text-[11px] text-gray-500">
                • Hàng nguyên vẹn sẽ nhập vào tồn kho sẵn sàng bán.<br />
                • Hàng đánh dấu lỗi/hỏng sẽ nhập vào phân khu hàng lỗi (AC3).
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-gray-700">Ghi chú kiểm đếm của thủ kho (tuỳ chọn):</label>
              <textarea
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                rows={3}
                placeholder="VD: Đã kiểm đếm đủ 10 thùng, tình trạng niêm phong nguyên vẹn..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setReceivingItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Đang cập nhật tồn kho...' : 'Xác Nhận & Cộng Tồn Kho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL HUỶ PHIẾU TRẢ HÀNG */}
      {cancellingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs antialiased animate-fade-in"
          onClick={() => setCancellingItem(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Huỷ Phiếu Trả Hàng</h3>
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
                placeholder="Nhập lý do huỷ phiếu trả hàng này..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-500 focus:bg-white focus:outline-none transition"
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
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
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
