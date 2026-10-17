import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Layers,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import type { Warehouse, WarehouseLocation, LocationType } from '../../types/warehouse';
import {
  fetchWarehouses,
  deleteWarehouse,
  fetchWarehouseLocations,
  deleteWarehouseLocation
} from '../../services/warehouseApi';
import { WarehouseFormModal } from '../../components/warehouse/WarehouseFormModal';
import { WarehouseLocationFormModal } from '../../components/warehouse/WarehouseLocationFormModal';
import { WarehouseDeleteConfirmModal } from '../../components/warehouse/WarehouseDeleteConfirmModal';
import { useAuth } from '../../contexts/AuthContext';

const LOCATION_TABS: { key: '' | LocationType; label: string; icon: string }[] = [
  { key: '', label: 'Tất cả vị trí', icon: 'All' },
  { key: 'ZONE', label: 'Phân khu (Zone)', icon: 'Zone' },
  { key: 'RACK', label: 'Kệ hàng (Rack)', icon: 'Rack' },
  { key: 'SHELF', label: 'Tầng giá (Shelf)', icon: 'Shelf' },
  { key: 'BIN', label: 'Ô / Ngăn chứa (Bin)', icon: 'Bin' }
];

export const WarehouseManagementPage: React.FC = () => {
  const { currentRole, showToast } = useAuth();

  // Phân quyền quản trị kho: Chỉ Admin và Quản lý kho mới được Thêm/Sửa/Xóa
  const canManage = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_WH_MANAGER';

  // State danh sách kho
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState<boolean>(true);
  const [warehouseKeyword, setWarehouseKeyword] = useState<string>('');
  const [warehouseStatusFilter, setWarehouseStatusFilter] = useState<'' | 'ACTIVE' | 'INACTIVE'>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // State danh sách vị trí của kho đang chọn
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
  const [locationKeyword, setLocationKeyword] = useState<string>('');
  const [locationTypeTab, setLocationTypeTab] = useState<'' | LocationType>('');
  const [locationStatusFilter, setLocationStatusFilter] = useState<'' | 'ACTIVE' | 'INACTIVE'>('');

  // Phân trang danh sách kho (30 / 50 kho / trang)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Reset về trang 1 khi tìm kiếm hoặc lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [warehouseKeyword, warehouseStatusFilter]);

  // Danh sách kho sau khi phân trang
  const totalPages = Math.ceil(warehouses.length / pageSize) || 1;
  const pagedWarehouses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return warehouses.slice(start, start + pageSize);
  }, [warehouses, currentPage, pageSize]);

  // State Modals
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState<boolean>(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [locationToEdit, setLocationToEdit] = useState<WarehouseLocation | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'warehouse' | 'location';
    warehouse?: Warehouse;
    location?: WarehouseLocation;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 1. Tải danh sách kho hàng (Mặc định không tự động chọn kho để hiển thị danh sách kho trước)
  const loadWarehouses = useCallback(async (preserveSelectedId?: number) => {
    setLoadingWarehouses(true);
    try {
      const data = await fetchWarehouses({
        status: warehouseStatusFilter || undefined,
        keyword: warehouseKeyword.trim() || undefined
      });
      setWarehouses(data);

      // Cập nhật selected warehouse nếu đang xem chi tiết kho
      if (data.length > 0) {
        if (preserveSelectedId) {
          const match = data.find((w) => w.id === preserveSelectedId);
          setSelectedWarehouse(match || null);
        } else {
          setSelectedWarehouse((prev) => {
            if (!prev) return null; // Giữ nguyên ở màn hình danh sách kho
            const match = data.find((w) => w.id === prev.id);
            return match || null;
          });
        }
      } else {
        setSelectedWarehouse(null);
      }
    } catch (err: unknown) {
      showToast('Lỗi tải dữ liệu kho', err instanceof Error ? err.message : 'Không thể tải danh sách kho', 'error');
      setWarehouses([]);
      setSelectedWarehouse(null);
    } finally {
      setLoadingWarehouses(false);
    }
  }, [warehouseStatusFilter, warehouseKeyword, showToast]);

  // 2. Tải danh sách vị trí khi chọn kho
  const loadLocations = useCallback(async (warehouseId: number) => {
    setLoadingLocations(true);
    try {
      const data = await fetchWarehouseLocations(warehouseId, {
        locationType: locationTypeTab || undefined,
        status: locationStatusFilter || undefined,
        keyword: locationKeyword.trim() || undefined
      });
      setLocations(data);
    } catch (err: unknown) {
      showToast('Lỗi tải vị trí lưu kho', err instanceof Error ? err.message : 'Không thể tải danh sách vị trí', 'error');
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, [locationTypeTab, locationStatusFilter, locationKeyword, showToast]);

  // Lắng nghe thay đổi kho hoặc bộ lọc kho
  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // Lắng nghe kho được chọn hoặc bộ lọc vị trí
  useEffect(() => {
    if (selectedWarehouse?.id) {
      loadLocations(selectedWarehouse.id);
    } else {
      setLocations([]);
    }
  }, [selectedWarehouse?.id, loadLocations]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalWarehouses = warehouses.length;
    const activeWarehouses = warehouses.filter((w) => w.status === 'ACTIVE').length;
    const inactiveWarehouses = warehouses.filter((w) => w.status === 'INACTIVE').length;
    const totalLocations = warehouses.reduce((sum, w) => sum + (w.locationCount || 0), 0);
    const currentLocationsCount = locations.length;
    const zoneCount = locations.filter((l) => l.locationType === 'ZONE').length;
    const rackCount = locations.filter((l) => l.locationType === 'RACK').length;
    const shelfCount = locations.filter((l) => l.locationType === 'SHELF').length;
    const binCount = locations.filter((l) => l.locationType === 'BIN').length;

    return {
      totalWarehouses,
      activeWarehouses,
      inactiveWarehouses,
      totalLocations,
      currentLocationsCount,
      zoneCount,
      rackCount,
      shelfCount,
      binCount
    };
  }, [warehouses, locations]);

  // Handler tạo/sửa kho thành công
  const handleWarehouseSuccess = (saved: Warehouse) => {
    showToast(
      warehouseToEdit ? 'Cập nhật kho thành công' : 'Thêm kho hàng thành công',
      `Kho "${saved.name}" (${saved.code}) đã được lưu.`,
      'success'
    );
    loadWarehouses(selectedWarehouse ? saved.id : undefined);
  };

  // Handler tạo/sửa vị trí thành công
  const handleLocationSuccess = (saved: WarehouseLocation) => {
    showToast(
      locationToEdit ? 'Cập nhật vị trí thành công' : 'Thêm vị trí thành công',
      `Vị trí "${saved.name}" (${saved.code}) đã được lưu.`,
      'success'
    );
    if (selectedWarehouse?.id) {
      loadLocations(selectedWarehouse.id);
    }
  };

  // Handler xác nhận xóa kho hoặc vị trí
  const handleConfirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'warehouse' && deleteTarget.warehouse) {
        await deleteWarehouse(deleteTarget.warehouse.id, reason);
        showToast('Xử lý thành công', `Đã xóa hoặc chuyển ngừng hoạt động kho "${deleteTarget.warehouse.name}"`, 'success');
        setDeleteTarget(null);
        if (selectedWarehouse?.id === deleteTarget.warehouse.id) {
          setSelectedWarehouse(null);
        }
        loadWarehouses();
      } else if (deleteTarget.type === 'location' && deleteTarget.location && selectedWarehouse) {
        await deleteWarehouseLocation(selectedWarehouse.id, deleteTarget.location.id, reason);
        showToast('Xóa vị trí thành công', `Đã xóa vị trí "${deleteTarget.location.name}"`, 'success');
        setDeleteTarget(null);
        loadLocations(selectedWarehouse.id);
      }
    } catch (err: unknown) {
      showToast('Thao tác không thành công', err instanceof Error ? err.message : 'Có lỗi xảy ra khi thực hiện thao tác xóa', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper render badge phân loại vị trí
  const renderLocationTypeBadge = (type: LocationType) => {
    switch (type) {
      case 'ZONE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
            Phân khu (Zone)
          </span>
        );
      case 'RACK':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
            Kệ hàng (Rack)
          </span>
        );
      case 'SHELF':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
            Tầng giá (Shelf)
          </span>
        );
      case 'BIN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            Ô chứa (Bin)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            {type}
          </span>
        );
    }
  };

  // Helper lấy thông tin hiển thị thủ kho/quản lý kho (hỗ trợ cả RefItem name/code và fullName/username)
  const getManagerInfo = (wh?: Warehouse | null) => {
    if (!wh) return { name: '', username: '' };
    const name = wh.manager?.name || wh.manager?.fullName || wh.managerName || '';
    const username = wh.manager?.code || wh.manager?.username || '';
    return { name, username };
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* =========================================================================
          TRƯỜNG HỢP 1: CHƯA CHỌN KHO (HIỂN THỊ DANH SÁCH KHO HÀNG & THÊM KHO)
      ========================================================================= */}
      {!selectedWarehouse ? (
        <div className="space-y-6">
          {/* Header Nút thao tác tinh gọn */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => loadWarehouses()}
              disabled={loadingWarehouses}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={loadingWarehouses ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setWarehouseToEdit(null);
                  setIsWarehouseModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-md shadow-orange-600/20 hover:shadow-orange-600/30 transition-all active:scale-[0.98]"
              >
                <Plus size={18} />
                <span>Thêm kho mới</span>
              </button>
            )}
          </div>

          {/* Thẻ KPI Thống Kê Tổng Quan */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng số kho</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.totalWarehouses}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                <Building2 size={22} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đang hoạt động</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeWarehouses}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ngừng hoạt động</p>
                <p className="text-2xl font-bold text-slate-500 dark:text-slate-400 mt-1">{stats.inactiveWarehouses}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <AlertCircle size={22} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng vị trí lưu trữ</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.totalLocations}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Layers size={22} />
              </div>
            </div>
          </div>

          {/* Khối Danh Sách Kho Hàng (Full Width) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header bộ lọc danh sách kho */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 flex items-center justify-center font-bold">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Danh sách kho hàng
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      {warehouses.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bấm vào kho để xem sơ đồ phân khu, kệ hàng, tầng giá và ô chứa
                  </p>
                </div>
              </div>

              {/* Tìm kiếm & lọc trạng thái */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative min-w-[240px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã hoặc tên kho..."
                    value={warehouseKeyword}
                    onChange={(e) => setWarehouseKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setWarehouseStatusFilter('')}
                    className={`py-1.5 px-3 rounded-lg font-medium transition-colors ${
                      warehouseStatusFilter === ''
                        ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehouseStatusFilter('ACTIVE')}
                    className={`py-1.5 px-3 rounded-lg font-medium transition-colors ${
                      warehouseStatusFilter === 'ACTIVE'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Hoạt động
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehouseStatusFilter('INACTIVE')}
                    className={`py-1.5 px-3 rounded-lg font-medium transition-colors ${
                      warehouseStatusFilter === 'INACTIVE'
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Tạm ngừng
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách các kho theo Hàng Ngang Dài (Table) & Có phân trang */}
            <div>
              {loadingWarehouses ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw size={28} className="animate-spin text-orange-500" />
                  <span className="text-xs">Đang tải danh sách kho...</span>
                </div>
              ) : warehouses.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Building2 size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Không tìm thấy kho hàng nào</p>
                  <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setWarehouseToEdit(null);
                        setIsWarehouseModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs"
                    >
                      <Plus size={16} />
                      <span>Thêm kho mới</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 w-12 text-center">#</th>
                          <th className="py-3 px-4 w-32">Mã kho</th>
                          <th className="py-3 px-4 min-w-[180px]">Tên kho hàng</th>
                          <th className="py-3 px-4 min-w-[220px]">Địa chỉ kho</th>
                          <th className="py-3 px-4 w-48">Thủ kho / Quản lý</th>
                          <th className="py-3 px-4 w-32 text-center">Số vị trí</th>
                          <th className="py-3 px-4 w-36 text-center">Trạng thái</th>
                          <th className="py-3 px-4 w-52 text-right">Sơ đồ vị trí & Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                        {pagedWarehouses.map((wh, idx) => {
                          const isActive = wh.status === 'ACTIVE';
                          const stt = (currentPage - 1) * pageSize + idx + 1;

                          return (
                            <tr
                              key={wh.id}
                              onClick={() => setSelectedWarehouse(wh)}
                              className="hover:bg-orange-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                            >
                              {/* STT */}
                              <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                                {stt}
                              </td>

                              {/* Mã kho */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-mono text-xs px-2.5 py-1 rounded-lg font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/50">
                                  {wh.code}
                                </span>
                              </td>

                              {/* Tên kho */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                    {wh.name}
                                  </span>
                                </div>
                              </td>

                              {/* Địa chỉ */}
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1.5 line-clamp-1 max-w-xs">
                                  <MapPin size={13} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{wh.address || 'Chưa thiết lập'}</span>
                                </div>
                              </td>

                              {/* Thủ kho / Quản lý */}
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {(() => {
                                  const { name, username } = getManagerInfo(wh);
                                  if (!name && !username) {
                                    return (
                                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                        <User size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                        <span className="text-xs italic">Chưa phân công</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-700 dark:text-orange-300 font-bold text-[11px] shrink-0">
                                        {(name || username).charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate max-w-[170px]" title={name || username}>
                                          {name || username}
                                        </div>
                                        {username && name && (
                                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[170px]">
                                            @{username}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* Số vị trí */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                                  <Layers size={12} className="text-indigo-500" />
                                  <span>{wh.locationCount || 0} vị trí</span>
                                </span>
                              </td>

                              {/* Trạng thái */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    isActive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {isActive ? 'Đang hoạt động' : 'Tạm ngừng'}
                                </span>
                              </td>

                              {/* Thao tác & Xem sơ đồ */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedWarehouse(wh)}
                                    className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white dark:bg-orange-950/40 dark:text-orange-300 dark:hover:text-white font-semibold text-xs flex items-center gap-1 transition-all shadow-2xs"
                                    title="Xem sơ đồ phân cấp (Zone, Kệ, Ô)"
                                  >
                                    <Layers size={13} />
                                    <span>Xem vị trí</span>
                                    <ChevronRight size={13} />
                                  </button>

                                  {canManage && (
                                    <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-700 pl-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setWarehouseToEdit(wh);
                                          setIsWarehouseModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
                                        title="Chỉnh sửa kho"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeleteTarget({ type: 'warehouse', warehouse: wh });
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                        title="Xóa kho"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Thanh phân trang danh sách kho */}
                  {warehouses.length > 0 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>
                          Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, warehouses.length)}</strong> trên tổng số <strong>{warehouses.length}</strong> kho
                        </span>
                        <span>•</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                        >
                          <option value={30}>30 kho / trang</option>
                          <option value={50}>50 kho / trang</option>
                        </select>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                          >
                            Trước
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-orange-600 text-white shadow-2xs'
                                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}

                          <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                          >
                            Sau
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            TRƯỜNG HỢP 2: ĐÃ CHỌN KHO (HIỂN THỊ PHÂN CẤP VỊ TRÍ NHỎ HƠN - KHOANH MÀU ĐỎ)
        ========================================================================= */
        <div className="space-y-5 animate-fadeIn">
          {/* Thanh Điều Hướng Quay Lại & Header Chi Tiết Kho */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              {/* Nút quay lại danh sách kho */}
              <button
                type="button"
                onClick={() => setSelectedWarehouse(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-950/40 dark:hover:text-orange-300 transition-all shadow-2xs group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Quay lại danh sách kho</span>
              </button>

              <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200">
                  {selectedWarehouse.code}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedWarehouse.name}
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedWarehouse.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {selectedWarehouse.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngừng'}
                </span>
              </div>

              {/* Thông tin phụ kho */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                {selectedWarehouse.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" />
                    {selectedWarehouse.address}
                  </span>
                )}
                {(() => {
                  const { name, username } = getManagerInfo(selectedWarehouse);
                  if (!name && !username) return null;
                  return (
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      Quản lý:{' '}
                      <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                        {name || username}
                        {username && name && (
                          <span className="font-normal text-slate-400 dark:text-slate-500 ml-1">
                            (@{username})
                          </span>
                        )}
                      </strong>
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Các nút thao tác chi tiết */}
            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (selectedWarehouse?.id) loadLocations(selectedWarehouse.id);
                }}
                disabled={loadingLocations}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all"
                title="Làm mới sơ đồ vị trí"
              >
                <RefreshCw size={14} className={loadingLocations ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Làm mới vị trí</span>
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setWarehouseToEdit(selectedWarehouse);
                      setIsWarehouseModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all"
                    title="Chỉnh sửa thông tin kho này"
                  >
                    <Edit size={14} />
                    <span>Sửa kho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLocationToEdit(null);
                      setIsLocationModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    <Plus size={16} />
                    <span>Thêm vị trí mới</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Thẻ KPI Chi Tiết Vị Trí Của Kho Này */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng vị trí kho</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{locations.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                <Layers size={18} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Phân khu (Zone)</p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.zoneCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Building2 size={18} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Kệ hàng (Rack)</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{stats.rackCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Layers size={18} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Ô chứa (Bin)</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.binCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>

          {/* BẢNG PHÂN CẤP VỊ TRÍ (ZONE, RACK, SHELF, BIN) - PHẦN KHOANH MÀU ĐỎ */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            {/* Header phân loại tabs & tìm kiếm vị trí */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              {/* Tabs phân loại cấp vị trí */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {LOCATION_TABS.map((tab) => {
                  const isActive = locationTypeTab === tab.key;
                  return (
                    <button
                      key={tab.key || 'ALL'}
                      type="button"
                      onClick={() => setLocationTypeTab(tab.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search bar & lọc trạng thái vị trí */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã vị trí, tên, phân khu, kệ..."
                    value={locationKeyword}
                    onChange={(e) => setLocationKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={locationStatusFilter}
                    onChange={(e) => setLocationStatusFilter(e.target.value as '' | 'ACTIVE' | 'INACTIVE')}
                    className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang dùng (ACTIVE)</option>
                    <option value="INACTIVE">Ngừng dùng (INACTIVE)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bảng danh sách vị trí chi tiết */}
            <div className="overflow-x-auto flex-1">
              {loadingLocations ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw size={26} className="animate-spin text-orange-500" />
                  <span className="text-xs">Đang tải sơ đồ vị trí lưu trữ...</span>
                </div>
              ) : locations.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Layers size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Chưa có vị trí lưu trữ nào trong kho này
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Hãy thiết lập sơ đồ phân khu, dãy kệ và ô chứa để tối ưu quy trình nhập kho và nhặt hàng.
                  </p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationToEdit(null);
                        setIsLocationModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <Plus size={16} />
                      <span>Thêm vị trí đầu tiên</span>
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Mã vị trí</th>
                      <th className="py-3 px-4">Tên vị trí</th>
                      <th className="py-3 px-4">Phân loại</th>
                      <th className="py-3 px-4">Phân khu / Dãy kệ</th>
                      <th className="py-3 px-4">Mô tả</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      {canManage && <th className="py-3 px-4 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {locations.map((loc) => {
                      const isLocActive = loc.status === 'ACTIVE';

                      return (
                        <tr
                          key={loc.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Mã vị trí */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {loc.code}
                            </span>
                          </td>

                          {/* Tên vị trí */}
                          <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {loc.name}
                          </td>

                          {/* Phân loại */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderLocationTypeBadge(loc.locationType)}
                          </td>

                          {/* Phân khu / Dãy kệ */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <div className="space-y-0.5">
                              {loc.zone && (
                                <div className="text-xs">
                                  <span className="text-slate-400">Khu: </span>
                                  <span className="font-medium">{loc.zone}</span>
                                </div>
                              )}
                              {loc.shelf && (
                                <div className="text-xs">
                                  <span className="text-slate-400">Kệ: </span>
                                  <span className="font-medium">{loc.shelf}</span>
                                </div>
                              )}
                              {!loc.zone && !loc.shelf && <span className="text-slate-400 italic">-</span>}
                            </div>
                          </td>

                          {/* Mô tả */}
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {loc.description || <span className="italic text-slate-400">-</span>}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isLocActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                            >
                              {isLocActive ? 'Đang dùng' : 'Tạm dừng'}
                            </span>
                          </td>

                          {/* Thao tác */}
                          {canManage && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLocationToEdit(loc);
                                    setIsLocationModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
                                  title="Chỉnh sửa vị trí"
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteTarget({
                                      type: 'location',
                                      location: loc
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Xóa vị trí"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
      ========================================================================= */}
      {/* Modal tạo / sửa kho */}
      <WarehouseFormModal
        isOpen={isWarehouseModalOpen}
        onClose={() => {
          setIsWarehouseModalOpen(false);
          setWarehouseToEdit(null);
        }}
        warehouseToEdit={warehouseToEdit}
        onSuccess={handleWarehouseSuccess}
        showToast={showToast}
      />

      {/* Modal tạo / sửa vị trí */}
      {selectedWarehouse && (
        <WarehouseLocationFormModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            setLocationToEdit(null);
          }}
          warehouse={selectedWarehouse}
          locationToEdit={locationToEdit}
          onSuccess={handleLocationSuccess}
          showToast={showToast}
        />
      )}

      {/* Modal xác nhận xóa kho hoặc vị trí */}
      <WarehouseDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.type === 'warehouse' ? 'Xác nhận xóa kho hàng' : 'Xác nhận xóa vị trí'}
        targetName={
          deleteTarget?.type === 'warehouse'
            ? deleteTarget.warehouse?.name || ''
            : deleteTarget?.location?.name || ''
        }
        targetCode={
          deleteTarget?.type === 'warehouse'
            ? deleteTarget.warehouse?.code
            : deleteTarget?.location?.code
        }
        isWarehouse={deleteTarget?.type === 'warehouse'}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default WarehouseManagementPage;
