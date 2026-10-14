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
  ChevronRight
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

  // 1. Tải danh sách kho hàng
  const loadWarehouses = useCallback(async (preserveSelectedId?: number) => {
    setLoadingWarehouses(true);
    try {
      const data = await fetchWarehouses({
        status: warehouseStatusFilter || undefined,
        keyword: warehouseKeyword.trim() || undefined
      });
      setWarehouses(data);

      // Cập nhật selected warehouse
      if (data.length > 0) {
        if (preserveSelectedId) {
          const match = data.find((w) => w.id === preserveSelectedId);
          setSelectedWarehouse(match || data[0]);
        } else {
          setSelectedWarehouse((prev) => {
            if (!prev) return data[0];
            const match = data.find((w) => w.id === prev.id);
            return match || data[0];
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
    const currentLocationsCount = locations.length;
    return {
      totalWarehouses,
      activeWarehouses,
      inactiveWarehouses,
      currentLocationsCount
    };
  }, [warehouses, locations]);

  // Handler tạo/sửa kho thành công
  const handleWarehouseSuccess = (saved: Warehouse) => {
    showToast(
      warehouseToEdit ? 'Cập nhật kho thành công' : 'Thêm kho hàng thành công',
      `Kho "${saved.name}" (${saved.code}) đã được lưu.`,
      'success'
    );
    loadWarehouses(saved.id);
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
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'warehouse' && deleteTarget.warehouse) {
        await deleteWarehouse(deleteTarget.warehouse.id);
        showToast('Xử lý thành công', `Đã xóa hoặc chuyển ngừng hoạt động kho "${deleteTarget.warehouse.name}"`, 'success');
        setDeleteTarget(null);
        loadWarehouses();
      } else if (deleteTarget.type === 'location' && deleteTarget.location && selectedWarehouse) {
        await deleteWarehouseLocation(selectedWarehouse.id, deleteTarget.location.id);
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
            Phân khu
          </span>
        );
      case 'RACK':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
            Kệ hàng
          </span>
        );
      case 'SHELF':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
            Tầng giá
          </span>
        );
      case 'BIN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            Ô chứa
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

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Header Trang & Nút thao tác chính */}
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => {
            loadWarehouses();
            if (selectedWarehouse?.id) loadLocations(selectedWarehouse.id);
          }}
          disabled={loadingWarehouses || loadingLocations}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={16} className={loadingWarehouses || loadingLocations ? 'animate-spin' : ''} />
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

      {/* 2. Thẻ KPI Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng số kho</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.totalWarehouses}</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
            <Building2 size={22} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đang hoạt động</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeWarehouses}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ngừng hoạt động</p>
            <p className="text-2xl font-bold text-slate-500 dark:text-slate-400 mt-1">{stats.inactiveWarehouses}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {selectedWarehouse ? `Vị trí (${selectedWarehouse.code})` : 'Vị trí lưu kho'}
            </p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {selectedWarehouse ? stats.currentLocationsCount : '-'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* 3. Bố Cục Chính: 2 Cột Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (4 cols): Danh sách kho */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header cột trái */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                  <Building2 size={18} className="text-orange-600" />
                  <span>Danh sách kho hàng</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                    {warehouses.length}
                  </span>
                </div>
              </div>

              {/* Tìm kiếm & lọc trạng thái */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã hoặc tên kho..."
                    value={warehouseKeyword}
                    onChange={(e) => setWarehouseKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setWarehouseStatusFilter('')}
                    className={`flex-1 py-1 px-2 rounded-lg font-medium transition-colors ${
                      warehouseStatusFilter === ''
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehouseStatusFilter('ACTIVE')}
                    className={`flex-1 py-1 px-2 rounded-lg font-medium transition-colors ${
                      warehouseStatusFilter === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Hoạt động
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehouseStatusFilter('INACTIVE')}
                    className={`flex-1 py-1 px-2 rounded-lg font-medium transition-colors ${
                      warehouseStatusFilter === 'INACTIVE'
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Tạm ngừng
                  </button>
                </div>
              </div>
            </div>

            {/* List kho items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[640px] flex-1">
              {loadingWarehouses ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-orange-500" />
                  <span className="text-xs">Đang tải danh sách kho...</span>
                </div>
              ) : warehouses.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Building2 size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">Không tìm thấy kho hàng nào</p>
                  <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                </div>
              ) : (
                warehouses.map((wh) => {
                  const isSelected = selectedWarehouse?.id === wh.id;
                  const isActive = wh.status === 'ACTIVE';

                  return (
                    <div
                      key={wh.id}
                      onClick={() => setSelectedWarehouse(wh)}
                      className={`p-4 cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20'
                          : 'border-transparent hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {wh.code}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                              title={isActive ? 'Hoạt động' : 'Tạm dừng'}
                            />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate mt-1">
                            {wh.name}
                          </h4>
                        </div>

                        {/* Hành động sửa / xóa kho */}
                        {canManage && (
                          <div
                            className="flex items-center gap-1 opacity-80 hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setWarehouseToEdit(wh);
                                setIsWarehouseModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
                              title="Chỉnh sửa kho"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget({ type: 'warehouse', warehouse: wh });
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Xóa kho"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {wh.address && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{wh.address}</span>
                          </div>
                        )}
                        {(wh.manager?.fullName || wh.managerName) && (
                          <div className="flex items-center gap-1.5 truncate">
                            <User size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">Quản lý: {wh.manager?.fullName || wh.managerName}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">
                          {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                        <span
                          className={`font-medium flex items-center gap-0.5 ${
                            isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'
                          }`}
                        >
                          Xem sơ đồ vị trí
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (8 cols): Sơ đồ vị trí lưu kho của kho đang chọn */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            {selectedWarehouse ? (
              <>
                {/* Header chi tiết kho & vị trí */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                          {selectedWarehouse.code}
                        </span>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                          {selectedWarehouse.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            selectedWarehouse.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {selectedWarehouse.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngừng'}
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationToEdit(null);
                          setIsLocationModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95"
                      >
                        <Plus size={16} />
                        <span>Thêm vị trí mới</span>
                      </button>
                    )}
                  </div>

                  {/* Tabs phân loại vị trí */}
                  <div className="flex items-center gap-1.5 overflow-x-auto mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 no-scrollbar">
                    {LOCATION_TABS.map((tab) => {
                      const isActive = locationTypeTab === tab.key;
                      return (
                        <button
                          key={tab.key || 'ALL'}
                          type="button"
                          onClick={() => setLocationTypeTab(tab.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                            isActive
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search bar & trạng thái vị trí */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
                    <div className="relative flex-1 w-full">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm theo mã vị trí, tên, phân khu, kệ..."
                        value={locationKeyword}
                        onChange={(e) => setLocationKeyword(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={locationStatusFilter}
                        onChange={(e) => setLocationStatusFilter(e.target.value as '' | 'ACTIVE' | 'INACTIVE')}
                        className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      >
                        <option value="">Tất cả trạng thái</option>
                        <option value="ACTIVE">Đang dùng (ACTIVE)</option>
                        <option value="INACTIVE">Ngừng dùng (INACTIVE)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bảng danh sách vị trí */}
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
              </>
            ) : (
              /* Khi chưa chọn kho nào */
              <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <Building2 size={44} className="text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="font-semibold text-base text-slate-700 dark:text-slate-200">
                  Chưa chọn kho hàng nào
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Vui lòng chọn một kho từ danh sách bên trái để theo dõi sơ đồ và cấu hình các phân khu, kệ hàng, ô chứa.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modals */}
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
