import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw
} from 'lucide-react';
import type { StockTransfer, StockTransferStatus } from '../../types/stockTransfer';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import {
  fetchStockTransfers,
  dispatchStockTransfer
} from '../../services/stockTransferApi';
import { StockTransferFormModal } from '../../components/inventory/StockTransferFormModal';
import { StockTransferReceiveModal } from '../../components/inventory/StockTransferReceiveModal';
import { useAuth } from '../../contexts/AuthContext';

/**
 * S5-07 (Nguyễn Văn Minh): Phân hệ Quản lý Phiếu Chuyển Kho Nội Bộ
 * Acceptance Criteria:
 * - AC1: Chọn kho đi, kho đến, danh sách hàng và số lượng
 * - AC2: Hàng đang chuyển được ghi nhận là đang trên đường, chưa cộng vào kho đến
 * - AC3: Kho đến xác nhận nhận đủ thì tồn mới được cộng
 * - AC4: Chênh lệch khi nhận phải nhập lý do
 */
export const StockTransferManagementPage: React.FC = () => {
  const { showToast } = useAuth();

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceWhFilter, setSourceWhFilter] = useState<string>('ALL');
  const [destWhFilter, setDestWhFilter] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<StockTransfer | null>(null);
  const [selectedTransferDetail, setSelectedTransferDetail] = useState<StockTransfer | null>(null);

  // Tải danh sách phiếu chuyển
  const loadTransfers = async () => {
    setLoading(true);
    try {
      const data = await fetchStockTransfers({
        status: statusFilter,
        sourceWarehouse: sourceWhFilter,
        destWarehouse: destWhFilter,
        keyword
      });
      setTransfers(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phiếu chuyển kho:', err);
      showToast('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [statusFilter, sourceWhFilter, destWhFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransfers();
  };

  // Thao tác Xuất kho vận chuyển cho phiếu DRAFT (AC2)
  const handleDispatch = async (transfer: StockTransfer) => {
    try {
      const updated = await dispatchStockTransfer(transfer.id);
      showToast(
        'Đã xuất kho vận chuyển (AC2)',
        `Phiếu [${updated.code}] đã bắt đầu vận chuyển. Hàng ghi nhận ĐANG ĐI ĐƯỜNG, kho đến chưa cộng tồn!`,
        'success',
        5000
      );
      setTransfers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: unknown) {
      showToast('Lỗi xuất kho', err instanceof Error ? err.message : 'Không thể xuất kho', 'error');
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = transfers.length;
    const inTransit = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
    const completed = transfers.filter((t) => t.status === 'COMPLETED').length;
    const discrepancy = transfers.filter((t) => t.status === 'DISCREPANCY_RESOLVED').length;
    return { total, inTransit, completed, discrepancy };
  }, [transfers]);

  // Helper render badge trạng thái
  const renderStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            <Clock size={12} />
            <span>Phiếu nháp</span>
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 animate-pulse">
            <Truck size={13} className="text-blue-600" />
            <span>Đang đi đường (AC2)</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Đã nhận đủ (AC3)</span>
          </span>
        );
      case 'DISCREPANCY_RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle size={13} className="text-amber-600" />
            <span>Nhận chênh lệch (AC4)</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <span>Đã hủy</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Điều Chuyển Kho Nội Bộ</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Sprint 5: S5-07
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Quản lý luân chuyển hàng giữa các kho chi nhánh và theo dõi chặt chẽ trạng thái hàng đi đường
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus size={18} />
          <span>Lập Phiếu Chuyển Kho</span>
        </button>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-semibold">Tổng số phiếu</div>
            <div className="text-xl font-black text-gray-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="text-xs text-blue-600 font-bold">Đang đi đường (AC2)</div>
            <div className="text-xl font-black text-blue-700">{stats.inTransit}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs text-emerald-600 font-bold">Đã nhận đủ (AC3)</div>
            <div className="text-xl font-black text-emerald-700">{stats.completed}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-xs text-amber-600 font-bold">Chênh lệch (AC4)</div>
            <div className="text-xl font-black text-amber-700">{stats.discrepancy}</div>
          </div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, tài xế, biển số xe, sản phẩm..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Lọc Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Phiếu nháp</option>
              <option value="IN_TRANSIT">Đang đi đường (AC2)</option>
              <option value="COMPLETED">Đã nhận đủ (AC3)</option>
              <option value="DISCREPANCY_RESOLVED">Nhận chênh lệch (AC4)</option>
            </select>

            {/* Lọc Kho đi */}
            <select
              value={sourceWhFilter}
              onChange={(e) => setSourceWhFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Kho xuất: Tất cả</option>
              {SYSTEM_WAREHOUSES.map((w) => (
                <option key={w.code} value={w.code}>
                  Từ: {w.name}
                </option>
              ))}
            </select>

            {/* Lọc Kho đến */}
            <select
              value={destWhFilter}
              onChange={(e) => setDestWhFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Kho nhận: Tất cả</option>
              {SYSTEM_WAREHOUSES.map((w) => (
                <option key={w.code} value={w.code}>
                  Đến: {w.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer"
            >
              Lọc
            </button>
          </div>
        </form>
      </div>

      {/* BẢNG DANH SÁCH PHIẾU CHUYỂN KHO */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-blue-600" />
            <span>Đang tải danh sách phiếu chuyển kho...</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ArrowRightLeft size={36} className="mx-auto text-gray-300" />
            <div className="text-sm font-bold text-gray-700">Chưa có phiếu chuyển kho nào phù hợp</div>
            <div className="text-xs text-gray-400">Hãy tạo phiếu chuyển kho mới để điều phối luân chuyển hàng</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Mã phiếu</th>
                  <th className="py-3 px-4">Lộ trình chuyển (AC1)</th>
                  <th className="py-3 px-4">Ngày chuyển</th>
                  <th className="py-3 px-4">Phương tiện / Tài xế</th>
                  <th className="py-3 px-4 text-center">Số lượng hàng</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((item) => {
                  const totalQty = item.lines.reduce((s, l) => s + l.transferQuantity, 0);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                      {/* Mã phiếu */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-blue-700">{item.code}</div>
                        <div className="text-[10px] text-gray-400">Người tạo: {item.createdBy}</div>
                      </td>

                      {/* Lộ trình kho đi -> kho đến (AC1) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-800">
                          <span className="text-rose-600">{item.sourceWarehouseName}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-emerald-700">{item.destWarehouseName}</span>
                        </div>
                        {item.note && (
                          <div className="text-[11px] text-gray-400 truncate max-w-xs">{item.note}</div>
                        )}
                      </td>

                      {/* Ngày chuyển */}
                      <td className="py-3.5 px-4 font-semibold text-gray-600">
                        {item.transferDate}
                        {item.expectedReceiveDate && (
                          <div className="text-[10px] text-gray-400">Dự kiến: {item.expectedReceiveDate}</div>
                        )}
                      </td>

                      {/* Xe / Tài xế */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-gray-800">
                          {item.vehiclePlate || 'Chưa có biển số'}
                        </div>
                        <div className="text-[10px] text-gray-400">{item.transporterName || '—'}</div>
                      </td>

                      {/* Tổng số lượng */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-full">
                          {totalQty.toLocaleString('vi-VN')}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">{item.lines.length} mặt hàng</div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">{renderStatusBadge(item.status)}</td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => setSelectedTransferDetail(item)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            Chi tiết
                          </button>

                          {/* Nút Xuất kho nếu đang DRAFT */}
                          {item.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleDispatch(item)}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Truck size={13} />
                              <span>Xuất kho (AC2)</span>
                            </button>
                          )}

                          {/* Nút Kho đến nhận hàng nếu IN_TRANSIT (AC3, AC4) */}
                          {item.status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={() => setSelectedTransferForReceive(item)}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              <span>Nhận hàng (AC3)</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: FORM LẬP PHIẾU CHUYỂN KHO (AC1) */}
      <StockTransferFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newTransfer) => {
          setTransfers((prev) => [newTransfer, ...prev]);
        }}
      />

      {/* MODAL 2: KHO ĐẾN NHẬN HÀNG (AC3, AC4) */}
      <StockTransferReceiveModal
        isOpen={Boolean(selectedTransferForReceive)}
        transfer={selectedTransferForReceive}
        onClose={() => setSelectedTransferForReceive(null)}
        onSuccess={(updated) => {
          setTransfers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
      />

      {/* MODAL 3: XEM CHI TIẾT PHIẾU CHUYỂN KHO */}
      {selectedTransferDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>Phiếu Chuyển Kho [{selectedTransferDetail.code}]</span>
                  {renderStatusBadge(selectedTransferDetail.status)}
                </h3>
                <p className="text-xs text-gray-500">
                  Lập bởi: {selectedTransferDetail.createdBy} lúc {selectedTransferDetail.createdAt.slice(0, 10)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransferDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-2xl">
              <div>
                <span className="text-gray-500">Kho xuất:</span>{' '}
                <b>{selectedTransferDetail.sourceWarehouseName}</b>
              </div>
              <div>
                <span className="text-gray-500">Kho nhận:</span>{' '}
                <b>{selectedTransferDetail.destWarehouseName}</b>
              </div>
              <div>
                <span className="text-gray-500">Xe vận chuyển:</span>{' '}
                <b className="font-mono">{selectedTransferDetail.vehiclePlate || '—'}</b>
              </div>
              <div>
                <span className="text-gray-500">Tài xế:</span>{' '}
                <b>{selectedTransferDetail.transporterName || '—'}</b>
              </div>
            </div>

            {selectedTransferDetail.discrepancyGeneralReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span>Biên bản giải trình chênh lệch khi nhận (AC4):</span>
                </div>
                <p>{selectedTransferDetail.discrepancyGeneralReason}</p>
              </div>
            )}

            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Mặt hàng</th>
                    <th className="py-2 px-3 text-center">SL chuyển</th>
                    <th className="py-2 px-3 text-center">SL nhận</th>
                    <th className="py-2 px-3 text-center">Chênh lệch</th>
                    <th className="py-2 px-3">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedTransferDetail.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 px-3">
                        <div className="font-bold">{l.productName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{l.productSku}</div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        {l.transferQuantity} {l.unit}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700">
                        {l.receivedQuantity !== undefined ? `${l.receivedQuantity} ${l.unit}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {l.differenceQuantity ? (
                          <span className="text-rose-600 font-bold">-{l.differenceQuantity}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-600 italic">
                        {l.discrepancyReason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTransferDetail(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
