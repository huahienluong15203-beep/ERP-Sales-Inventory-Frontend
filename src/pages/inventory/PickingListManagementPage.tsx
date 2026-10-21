import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  User,
  PackageCheck,
  PackageSearch
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import type { PickingList, PickingStatus } from '../../types/pickingList';
import { fetchPickingLists, cancelPickingList } from '../../services/pickingListApi';
import { SYSTEM_WAREHOUSES, type WarehouseOption } from '../../types/inventory';
import { PickingListPrintModal } from '../../components/inventory/PickingListPrintModal';
import { fetchWarehouses } from '../../services/warehouseApi';
import { SearchSelect } from '../../components/common/SearchSelect';
import { Pagination } from '../../components/common/Pagination';
import { useClientPagination } from '../../hooks/useClientPagination';

export const PickingListManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, currentRole, user } = useAuth();

  const isWarehouseStaff = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [warehousesList, setWarehousesList] = useState<WarehouseOption[]>(SYSTEM_WAREHOUSES);

  useEffect(() => {
    fetchWarehouses({ status: 'ACTIVE' })
      .then((data) => {
        if (data && data.length > 0) {
          setWarehousesList(
            data.map((w) => ({
              id: w.id,
              code: w.code,
              name: w.name,
              address: w.address || undefined,
              status: w.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách kho từ backend, dùng fallback:', err);
      });
  }, []);

  // Lọc danh sách kho mà người dùng được phân công phụ trách
  const allowedWarehouses = React.useMemo(() => {
    const baseList = warehousesList.length > 0 ? warehousesList : SYSTEM_WAREHOUSES;
    if (currentRole === 'ROLE_ADMIN' || user?.roles?.includes('ROLE_ADMIN')) {
      return baseList;
    }
    if (user?.warehouseCodes && user.warehouseCodes.length > 0) {
      const filtered = baseList.filter((wh) => user.warehouseCodes!.includes(wh.code));
      if (filtered.length > 0) return filtered;
    }
    if (user?.warehouse) {
      const filtered = baseList.filter(
        (wh) => user.warehouse!.includes(wh.code) || user.warehouse!.includes(wh.name)
      );
      if (filtered.length > 0) return filtered;
    }
    return baseList;
  }, [user, currentRole, warehousesList]);

  const [pickingLists, setPickingLists] = useState<PickingList[]>([]);
  // Phân trang tại chỗ, cùng kiểu với các trang danh sách khác
  const pager = useClientPagination(pickingLists);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters: Nhân viên kho mặc định chọn kho mình phụ trách
  const [warehouseId, setWarehouseId] = useState<number | undefined>(() => {
    if (currentRole === 'ROLE_ADMIN' || user?.roles?.includes('ROLE_ADMIN')) {
      return undefined;
    }
    if (user?.warehouseCodes && user.warehouseCodes.length > 0) {
      const found = SYSTEM_WAREHOUSES.find((wh) => user.warehouseCodes!.includes(wh.code));
      if (found) return Number(found.id);
    }
    if (user?.warehouse) {
      const found = SYSTEM_WAREHOUSES.find((wh) => user.warehouse!.includes(wh.code) || user.warehouse!.includes(wh.name));
      if (found) return Number(found.id);
    }
    return undefined;
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Modals
  const [selectedForPrint, setSelectedForPrint] = useState<PickingList | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PickingList | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Đồng bộ kho phụ trách khi user load xong
  useEffect(() => {
    if (currentRole !== 'ROLE_ADMIN' && allowedWarehouses.length > 0 && warehouseId === undefined) {
      setWarehouseId(Number(allowedWarehouses[0].id));
    }
  }, [allowedWarehouses, currentRole, warehouseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchPickingLists({
        warehouseId,
        status: statusFilter,
        keyword
      });
      setPickingLists(res.content);
    } catch (err: any) {
      showToast('Lỗi tải danh sách', err.message || 'Không thể tải phiếu soạn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [warehouseId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      showToast('Cảnh báo', 'Vui lòng nhập lý do hủy phiếu soạn hàng!', 'info');
      return;
    }
    try {
      await cancelPickingList(cancelTarget.id, cancelReason.trim());
      showToast('Thành công', `Đã hủy phiếu soạn hàng ${cancelTarget.code}`, 'success');
      setCancelTarget(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      showToast('Lỗi hủy phiếu', err.message || 'Thao tác thất bại', 'error');
    }
  };

  // Stats
  const totalCount = pickingLists.length;
  const inProgressCount = pickingLists.filter((l) => l.status === 'IN_PROGRESS').length;
  const assignedCount = pickingLists.filter((l) => l.status === 'ASSIGNED').length;
  const completedCount = pickingLists.filter((l) => l.status === 'COMPLETED').length;

  const getStatusBadge = (status: PickingStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            Đã giao việc
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <PackageSearch className="w-3.5 h-3.5 text-amber-600" />
            Đang soạn hàng
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <XCircle className="w-3 h-3" />
            Đã hủy
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Nút thao tác chính (Tinh gọn góc phải) */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          title="Làm mới danh sách phiếu soạn hàng"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-orange-600 rounded-lg text-xs font-semibold shadow-2xs h-9 cursor-pointer transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>

        {isWarehouseStaff && (
          <button
            type="button"
            onClick={() => navigate('/inventory/picking-lists/create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer h-9 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Lập phiếu soạn hàng mới</span>
          </button>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Tổng phiếu đợt soạn</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalCount}</p>
          </div>
          <div className="p-2.5 bg-gray-50 text-gray-600 rounded-lg">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600">Đã giao việc (Chờ soạn)</p>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{assignedCount}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600">Đang thực hiện soạn</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{inProgressCount}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600">Đã hoàn thành</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{completedCount}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả trạng thái' },
            { key: 'ASSIGNED', label: 'Đã giao việc' },
            { key: 'IN_PROGRESS', label: 'Đang soạn hàng' },
            { key: 'COMPLETED', label: 'Đã hoàn tất' },
            { key: 'CANCELLED', label: 'Đã hủy' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === tab.key
                  ? 'bg-orange-500 text-white font-semibold shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
            {/* Warehouse select có ô tìm kiếm */}
            <div className="w-full sm:w-72">
              <SearchSelect
                value={warehouseId ?? ''}
                onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : undefined)}
                searchPlaceholder="Tìm kiếm tên hoặc mã kho..."
                className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none"
              >
                {allowedWarehouses.length > 1 && (
                  <option value="">🏢 Tất cả các kho phụ trách</option>
                )}
                {allowedWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    🏢 {wh.name} {wh.code ? `(${wh.code})` : ''}
                  </option>
                ))}
              </SearchSelect>
            </div>
          </div>

          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm mã phiếu, mã đơn hàng, người soạn..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Lọc
            </button>
          </form>
        </div>
      </div>

      {/* Main Table / Card List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
            <p className="text-sm">Đang tải danh sách phiếu soạn hàng...</p>
          </div>
        ) : pickingLists.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-base font-semibold text-gray-700">Chưa có phiếu soạn hàng nào</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Nhân viên kho có thể gom các đơn hàng đã duyệt (APPROVED) để tạo đợt soạn hàng tối ưu theo đường đi.
            </p>
            {isWarehouseStaff && (
              <button
                onClick={() => navigate('/inventory/picking-lists/create')}
                className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg shadow transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo phiếu đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Mã phiếu</th>
                  <th className="py-3 px-4">Kho xuất</th>
                  <th className="py-3 px-4">Người soạn</th>
                  <th className="py-3 px-3 text-center w-24">Số đơn</th>
                  <th className="py-3 px-4">Tiến độ soạn hàng</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pager.pageItems.map((list) => {
                  const percent = list.totalItems > 0 ? Math.round((list.completedItems / list.totalItems) * 100) : 0;
                  return (
                    <tr
                      key={list.id}
                      onClick={() => navigate(`/inventory/picking-lists/${list.id}`)}
                      className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                      title="Bấm để xem chi tiết đợt soạn hàng"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        <span className="group-hover:text-orange-600 group-hover:underline flex items-center gap-1.5 transition-colors">
                          <ClipboardCheck className="w-3.5 h-3.5 text-orange-500" />
                          {list.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {list.warehouseName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{list.pickerName || 'Chưa gán'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center w-24 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-100 font-bold text-gray-800 text-xs">
                          {list.orderCount} đơn
                        </span>
                      </td>
                      <td className="py-3.5 px-4 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-gray-700">
                              {list.completedItems}/{list.totalItems} mặt hàng
                            </span>
                            <span className="font-bold text-orange-600">{percent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                percent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(list.status)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {new Date(list.createdAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Phân trang dùng chung toàn hệ thống */}
        {pager.totalElements > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              page={pager.page}
              totalPages={pager.totalPages}
              totalElements={pager.totalElements}
              size={pager.size}
              itemLabel="phiếu soạn"
              onPageChange={pager.setPage}
              onSizeChange={pager.setSize}
            />
          </div>
        )}
      </div>

      {/* Modal In Phiếu Soạn Hàng */}
      <PickingListPrintModal
        isOpen={Boolean(selectedForPrint)}
        pickingList={selectedForPrint}
        onClose={() => setSelectedForPrint(null)}
      />

      {/* Modal xác nhận Hủy Phiếu */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Hủy phiếu soạn hàng</h3>
                <p className="text-xs text-gray-500">Mã phiếu: {cancelTarget.code}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Khi hủy phiếu, các đơn hàng trong đợt soạn sẽ tự động được trả về trạng thái sẵn sàng để gom vào đợt soạn khác.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lý do hủy phiếu: <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy phiếu soạn hàng..."
                className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow transition-colors"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
