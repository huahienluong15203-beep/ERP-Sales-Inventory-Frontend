import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Ban,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { StockTake } from '../../types/stockTake';
import type { WarehouseOption } from '../../types/inventory';
import { fetchStockTakes, fetchWarehousesList } from '../../services/stockTakeApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { RowActionMenu } from '../../components/common/RowActionMenu';

/**
 * S5-08: Trang Quản Lý Kiểm Kê Kho & Ghi Nhận Chênh Lệch
 *
 * Acceptance Criteria:
 * - AC1: Tạo phiếu kiểm kê theo kho hoặc theo nhóm hàng; hệ thống chụp chốt số tồn sổ tại thời điểm tạo.
 * - AC2: Nhập số đếm thực tế; hệ thống tự tính chênh lệch từng dòng.
 * - AC3: Chốt kiểm kê điều chỉnh tồn về số thực đếm và bắt buộc nhập lý do.
 * - AC4: Chỉ Quản lý kho (ROLE_WH_MANAGER) được chốt phiếu kiểm kê.
 */
export const StockTakeManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();

  const canCreate = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [loading, setLoading] = useState<boolean>(true);
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  // Pagination & filter state
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  const [filterWarehouseId, setFilterWarehouseId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Load list of warehouses for filter
  useEffect(() => {
    fetchWarehousesList()
      .then(setWarehouses)
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchStockTakes({
        warehouseId: filterWarehouseId ? Number(filterWarehouseId) : undefined,
        status: filterStatus || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        size
      });
      setStockTakes(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: unknown) {
      console.error('Lỗi tải danh sách phiếu kiểm kê:', err);
    } finally {
      setLoading(false);
    }
  }, [filterWarehouseId, filterStatus, fromDate, toDate, page, size]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Status counters (from current page data)
  const draftCount = stockTakes.filter((s) => s.status === 'DRAFT').length;
  const closedCount = stockTakes.filter((s) => s.status === 'CLOSED').length;
  const cancelledCount = stockTakes.filter((s) => s.status === 'CANCELLED').length;

  const handleResetFilters = () => {
    setFilterWarehouseId('');
    setFilterStatus('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  return (
    <div className="space-y-4 antialiased p-1 sm:p-2">
      {/* Tiêu đề trang & Nút thao tác chính (Tinh gọn chuẩn như Danh mục nhà cung cấp) */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          title="Làm mới danh sách"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-primary-600 rounded-lg hover:bg-primary-50/40 text-xs font-semibold transition cursor-pointer shadow-2xs h-9"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>

        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/inventory/stocktakes/create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer h-9 active:scale-95"
          >
            <Plus size={16} />
            <span>Tạo phiếu kiểm kê mới</span>
          </button>
        )}
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng số phiếu
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">
              {totalElements}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Đang đếm (Nháp)
            </span>
            <span className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-0.5 block">
              {draftCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Đã chốt cân bằng
            </span>
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5 block">
              {closedCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Đã huỷ bỏ
            </span>
            <span className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-0.5 block">
              {cancelledCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Bộ Lọc Tìm Kiếm */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Kho */}
          <div className="min-w-[180px] flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Kho kiểm kê
            </label>
            <select
              value={filterWarehouseId}
              onChange={(e) => {
                setFilterWarehouseId(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium"
            >
              <option value="">-- Tất cả kho --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  [{w.code}] {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái */}
          <div className="min-w-[160px] flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Trạng thái phiếu
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium"
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="DRAFT">Đang đếm (Bản nháp)</option>
              <option value="CLOSED">Đã chốt cân bằng tồn</option>
              <option value="CANCELLED">Đã huỷ bỏ</option>
            </select>
          </div>

          {/* Từ ngày */}
          <div className="min-w-[140px] flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Đến ngày */}
          <div className="min-w-[140px] flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Nút xoá lọc */}
          <div className="flex items-end pt-5">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bảng Dữ Liệu */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 min-w-[160px]">Mã phiếu & Ghi chú</th>
                <th className="py-3 px-4 min-w-[200px]">Kho & Phạm vi kiểm kê</th>
                <th className="py-3 px-4 min-w-[160px]">Tiến độ đếm</th>
                <th className="py-3 px-4 min-w-[160px]">Kết quả chênh lệch</th>
                <th className="py-3 px-4 min-w-[150px]">Người tạo / Ngày tạo</th>
                <th className="py-3 px-4 min-w-[130px] text-center">Trạng thái</th>
                <th className="py-3 px-4 w-32 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Đang tải danh sách phiếu kiểm kê...</span>
                    </div>
                  </td>
                </tr>
              ) : stockTakes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      Chưa có phiếu kiểm kê nào
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bấm &ldquo;Tạo phiếu kiểm kê mới&rdquo; để chụp chốt số tồn sổ và bắt đầu đếm.
                    </p>
                  </td>
                </tr>
              ) : (
                stockTakes.map((st) => {
                  const progressPct =
                    st.lineCount > 0 ? Math.round((st.countedCount / st.lineCount) * 100) : 0;

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/inventory/stocktakes/${st.id}`)}
                    >
                      {/* Mã phiếu */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-primary-600 dark:text-primary-400 text-sm block">
                          {st.code}
                        </span>
                        {st.note ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                            {st.note}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">--</span>
                        )}
                      </td>

                      {/* Kho & Phạm vi */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {st.warehouseName}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>{st.categoryName || 'Toàn bộ mặt hàng trong kho'}</span>
                        </div>
                      </td>

                      {/* Tiến độ đếm */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <span>
                            {st.countedCount}/{st.lineCount} SKU
                          </span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              progressPct === 100 ? 'bg-emerald-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Chênh lệch */}
                      <td className="py-3 px-4">
                        {st.differenceCount === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Khớp 100%
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">
                              {st.differenceCount} SKU có chênh lệch
                            </span>
                            <div className="flex items-center gap-2 text-[11px]">
                              {st.totalSurplus > 0 && (
                                <span className="text-emerald-600 font-semibold flex items-center">
                                  +{st.totalSurplus}
                                </span>
                              )}
                              {st.totalShortage > 0 && (
                                <span className="text-rose-600 font-semibold flex items-center">
                                  -{st.totalShortage}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Người tạo & Ngày */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">
                          {st.createdByUsername}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {st.createdAt ? new Date(st.createdAt).toLocaleDateString('vi-VN') : '--'}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                            st.status === 'CLOSED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : st.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {st.status === 'CLOSED' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : st.status === 'CANCELLED' ? (
                            <Ban className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {st.statusLabel || st.status}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút Xem chi tiết (Chỉ icon con mắt) */}
                          <button
                            type="button"
                            onClick={() => navigate(`/inventory/stocktakes/${st.id}`)}
                            title="Xem chi tiết phiếu kiểm kê"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Menu 3 chấm "⋯" */}
                          <RowActionMenu
                            title="Thao tác phiếu kiểm kê"
                            items={[
                              {
                                label: 'Đếm & Nhập số lượng',
                                icon: <ClipboardList className="w-3.5 h-3.5 text-primary-600" />,
                                title: 'Tiến hành đếm và ghi nhận số lượng thực tế',
                                onClick: () => navigate(`/inventory/stocktakes/${st.id}`),
                                hidden: st.status !== 'DRAFT'
                              },
                              {
                                label: 'Xem chi tiết',
                                icon: <Eye className="w-3.5 h-3.5 text-slate-500" />,
                                title: 'Xem chi tiết phiếu kiểm kê',
                                onClick: () => navigate(`/inventory/stocktakes/${st.id}`)
                              }
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Phân Trang */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Hiển thị <strong>{stockTakes.length}</strong> trên tổng số <strong>{totalElements}</strong> phiếu
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium">
              Trang {page + 1} / {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
