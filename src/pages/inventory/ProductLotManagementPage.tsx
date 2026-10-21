import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Lock,
  Unlock,
  Edit,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import {
  searchProductLots,
  getLotSummary,
  updateProductLot
} from '../../services/productLotApi';
import { fetchWarehouses } from '../../services/warehouseApi';
import { productService } from '../../services/productService';
import type { ProductLotResponse, LotStockSummaryResponse } from '../../types/productLot';
import type { Warehouse } from '../../types/warehouse';
import type { Product } from '../../types/product';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { ProductLotCreateModal } from '../../components/inventory/ProductLotCreateModal';
import { ProductLotUpdateModal } from '../../components/inventory/ProductLotUpdateModal';
import { ProductLotLockConfirmModal } from '../../components/inventory/ProductLotLockConfirmModal';
import { ProductBatchManagementConfigModal } from '../../components/inventory/ProductBatchManagementConfigModal';

export const ProductLotManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, user, showToast } = useAuth();

  // State danh sách & phân trang
  const [lots, setLots] = useState<ProductLotResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [size] = useState(20);

  // State bộ lọc
  const [keyword, setKeyword] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedExpiryStatus, setSelectedExpiryStatus] = useState<string>('ALL');
  const [nearExpiryDays, setNearExpiryDays] = useState<number>(30);
  const [sortBy, setSortBy] = useState<string>('id,desc');

  // Dữ liệu danh mục phục vụ bộ lọc
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Thống kê tổng quan
  const [summary, setSummary] = useState<LotStockSummaryResponse | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBatchConfigModalOpen, setIsBatchConfigModalOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<ProductLotResponse | null>(null);
  const [lotToToggleLock, setLotToToggleLock] = useState<ProductLotResponse | null>(null);
  const [submittingLock, setSubmittingLock] = useState(false);

  const isWhManagerOrAdmin =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    currentRole === 'ROLE_WAREHOUSE' ||
    Boolean(user?.roles?.some((r) => ['ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_WAREHOUSE'].includes(r)));

  // Tải danh mục cho dropdown lọc
  useEffect(() => {
    fetchWarehouses().then(setWarehouses).catch(() => []);
    productService
      .getProducts({ page: 0, size: 200 })
      .then((res) => setProducts(res.products))
      .catch(() => []);
  }, []);

  // Tải thống kê thẻ đầu trang
  const loadSummary = useCallback(async () => {
    try {
      const data = await getLotSummary(nearExpiryDays, selectedWarehouseId || undefined);
      setSummary(data);
    } catch (err) {
      console.warn('Lỗi tải thống kê lô:', err);
    }
  }, [nearExpiryDays, selectedWarehouseId]);

  // Tải danh sách lô
  const loadLots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchProductLots({
        warehouseId: selectedWarehouseId || undefined,
        productId: selectedProductId || undefined,
        keyword: keyword.trim() || undefined,
        status: selectedStatus,
        expiryStatus: selectedExpiryStatus,
        nearExpiryDays,
        sort: sortBy,
        page,
        size
      });
      setLots(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      showToast?.(err instanceof Error ? err.message : 'Lỗi tải danh sách lô hàng', 'error');
      setLots([]);
    } finally {
      setLoading(false);
    }
  }, [
    selectedWarehouseId,
    selectedProductId,
    keyword,
    selectedStatus,
    selectedExpiryStatus,
    nearExpiryDays,
    sortBy,
    page,
    size,
    showToast
  ]);

  useEffect(() => {
    loadLots();
    loadSummary();
  }, [loadLots, loadSummary]);

  // Mở modal xác nhận Khóa / Mở khóa một lô hàng
  const handleOpenLockModal = (lot: ProductLotResponse) => {
    if (!isWhManagerOrAdmin) {
      showToast?.('Chỉ Quản lý kho, Thủ kho hoặc Admin mới có quyền khóa/mở khóa lô', 'error');
      return;
    }
    setLotToToggleLock(lot);
  };

  // Xác nhận Khóa / Mở khóa lô hàng từ modal
  const handleConfirmToggleLock = async () => {
    if (!lotToToggleLock) return;
    if (!isWhManagerOrAdmin) {
      showToast?.('Chỉ Quản lý kho, Thủ kho hoặc Admin mới có quyền khóa/mở khóa lô', 'error');
      return;
    }
    const nextStatus = lotToToggleLock.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      setSubmittingLock(true);
      await updateProductLot(lotToToggleLock.id, { status: nextStatus });
      showToast?.(
        nextStatus === 'LOCKED'
          ? `Đã khóa thành công lô hàng ${lotToToggleLock.batchNumber}`
          : `Đã mở khóa thành công lô hàng ${lotToToggleLock.batchNumber}`,
        'success'
      );
      setLotToToggleLock(null);
      loadLots();
      loadSummary();
    } catch (err: unknown) {
      showToast?.(err instanceof Error ? err.message : 'Thao tác không thành công', 'error');
    } finally {
      setSubmittingLock(false);
    }
  };

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. Header tác vụ tinh gọn */}
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => {
            loadLots();
            loadSummary();
          }}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>

        {isWhManagerOrAdmin && (
          <>
            <button
              type="button"
              onClick={() => setIsBatchConfigModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Bật/Tắt quản lý lô theo từng SKU sản phẩm "
            >
              <SlidersHorizontal size={15} className="text-[#F85606]" />
              <span>Bật/Tắt lô theo SKU</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/inventory/lots/create')}
              className="px-4 py-2 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Khai báo lô mới</span>
            </button>
          </>
        )}
      </div>

      {/* 2. Thẻ Thống kê Tổng quan (KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Tổng số lô */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Layers size={13} className="text-blue-500" />
            <span>Tổng số lô</span>
          </span>
          <div className="text-2xl font-black text-gray-900">
            {summary?.totalLots ?? lots.length}
          </div>
          <div className="text-[11px] text-gray-500">
            Tổng tồn: <strong>{summary?.totalQuantity ?? 0}</strong> sp
          </div>
        </div>

        {/* Lô an toàn */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Lô an toàn</span>
          </span>
          <div className="text-2xl font-black text-emerald-950">
            {summary?.safeLots ?? 0}
          </div>
          <div className="text-[11px] text-emerald-800">
            Hạn dùng &gt; {nearExpiryDays} ngày
          </div>
        </div>

        {/* Lô sắp hết hạn */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} className="text-amber-600" />
            <span>Sắp hết hạn</span>
          </span>
          <div className="text-2xl font-black text-amber-950">
            {summary?.nearExpiryLots ?? 0}
          </div>
          <div className="text-[11px] text-amber-800">
            Trong vòng {nearExpiryDays} ngày tới
          </div>
        </div>

        {/* Lô quá hạn */}
        <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-300 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={13} className="text-rose-600" />
            <span>Đã quá hạn</span>
          </span>
          <div className="text-2xl font-black text-rose-950">
            {summary?.expiredLots ?? 0}
          </div>
          <div className="text-[11px] text-rose-800 font-semibold">
            Nghiêm cấm xuất kho
          </div>
        </div>

        {/* Lô hết hàng */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Package size={13} className="text-gray-400" />
            <span>Hết tồn kho</span>
          </span>
          <div className="text-2xl font-black text-gray-700">
            {summary?.outOfStockLots ?? 0}
          </div>
          <div className="text-[11px] text-gray-400">
            Số lượng tồn = 0
          </div>
        </div>
      </div>

      {/* 3. Thanh Bộ lọc đa chiều & Cấu hình ngưỡng cảnh báo */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo số lô, mã SKU, tên sản phẩm, nhà cung cấp..."
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          {/* Cấu hình ngưỡng cảnh báo sắp hết hạn (AC 3) */}
          <div className="flex items-center gap-2 shrink-0 bg-orange-50/60 border border-orange-200/80 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal size={14} className="text-orange-600" />
            <span className="text-xs font-bold text-orange-900 whitespace-nowrap">
              Ngưỡng cảnh báo:
            </span>
            <select
              value={nearExpiryDays}
              onChange={(e) => {
                setNearExpiryDays(Number(e.target.value));
                setPage(0);
              }}
              className="bg-white border border-orange-300 rounded-lg text-xs font-bold text-orange-950 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value={15}>15 ngày</option>
              <option value={30}>30 ngày (chuẩn)</option>
              <option value={45}>45 ngày</option>
              <option value={60}>60 ngày</option>
              <option value={90}>90 ngày</option>
            </select>
          </div>
        </div>

        {/* Các dropdown lọc phụ */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1 border-t border-gray-100">
          {/* Kho */}
          <select
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="">Tất cả kho hàng</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                [{w.code}] {w.name}
              </option>
            ))}
          </select>

          {/* Sản phẩm */}
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="">Tất cả sản phẩm</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.sku}] {p.name}
              </option>
            ))}
          </select>

          {/* Tình trạng hạn dùng */}
          <select
            value={selectedExpiryStatus}
            onChange={(e) => {
              setSelectedExpiryStatus(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="ALL">Tất cả tình trạng HSD</option>
            <option value="SAFE">An toàn (còn hạn)</option>
            <option value="NEAR_EXPIRATION">Sắp hết hạn</option>
            <option value="EXPIRED">Đã quá hạn</option>
            <option value="OUT_OF_STOCK">Hết tồn kho</option>
          </select>

          {/* Trạng thái khóa */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (Cho xuất)</option>
            <option value="LOCKED">Đã khóa (Cấm xuất)</option>
          </select>

          {/* Sắp xếp thứ tự */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 bg-orange-50/70 border border-orange-200 rounded-xl text-xs font-semibold text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="id,desc">Mới khai báo nhất (Mặc định)</option>
            <option value="expiredDate,asc">Hạn dùng gần nhất (FEFO)</option>
            <option value="expiredDate,desc">Hạn dùng xa nhất</option>
            <option value="id,asc">Cũ nhất trước</option>
            <option value="quantity,desc">Số lượng tồn nhiều nhất</option>
            <option value="quantity,asc">Số lượng tồn ít nhất</option>
          </select>
        </div>
      </div>

      {/* 4. Bảng Theo dõi Lô hàng chi tiết */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Số lô (Batch)</th>
                <th className="py-3 px-4">Sản phẩm / SKU</th>
                <th className="py-3 px-4 whitespace-nowrap">Kho lưu</th>
                <th className="py-3 px-4 whitespace-nowrap">Ngày sản xuất</th>
                <th className="py-3 px-4 whitespace-nowrap">Hạn sử dụng</th>
                <th className="py-3 px-4 whitespace-nowrap">Tình trạng hạn dùng</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Số lượng tồn</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-orange-500" />
                      <span>Đang tải dữ liệu lô hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : lots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Layers size={32} className="text-gray-300" />
                      <span className="font-semibold">Không tìm thấy lô hàng nào phù hợp</span>
                      <p className="text-xs text-gray-400">Hãy thử điều chỉnh bộ lọc hoặc khai báo lô mới</p>
                    </div>
                  </td>
                </tr>
              ) : (
                lots.map((lot) => {
                  const isLocked = lot.status === 'LOCKED';
                  const isExpired = lot.daysToExpiration <= 0 || lot.expiryStatus === 'EXPIRED';
                  const isNearExp = lot.expiryStatus === 'NEAR_EXPIRATION';

                  return (
                    <tr
                      key={lot.id}
                      className={`hover:bg-orange-50/30 transition-colors ${isExpired ? 'bg-rose-50/20' : isLocked ? 'bg-gray-50/50' : 'bg-white'
                        }`}
                    >
                      {/* Số lô */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/80 inline-block">
                          {lot.batchNumber}
                        </div>
                        {lot.supplierName && (
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px]" title={lot.supplierName}>
                            NCC: {lot.supplierName}
                          </div>
                        )}
                      </td>

                      {/* Sản phẩm */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{lot.productName}</div>
                        <div className="font-mono text-[11px] text-orange-700">{lot.productSku}</div>
                      </td>

                      {/* Kho lưu */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-gray-800 font-medium">{lot.warehouseName}</span>
                      </td>

                      {/* Ngày sản xuất */}
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {lot.manufactureDate || '—'}
                      </td>

                      {/* Hạn sử dụng */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">{lot.expiredDate}</span>
                      </td>

                      {/* Tình trạng HSD (Badge) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <XCircle size={12} className="text-rose-600" />
                            <span>Quá hạn ({Math.abs(lot.daysToExpiration)} ngày)</span>
                          </span>
                        ) : isNearExp ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock size={12} className="text-amber-600" />
                            <span>Còn {lot.daysToExpiration} ngày</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>An toàn ({lot.daysToExpiration} ngày)</span>
                          </span>
                        )}
                      </td>

                      {/* Số lượng tồn */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-mono font-bold text-sm ${lot.quantity > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {lot.quantity}
                        </span>
                        <span className="text-gray-500 ml-1">{lot.productBaseUnit}</span>
                      </td>

                      {/* Trạng thái (Hoạt động / Đã khóa) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <Lock size={10} />
                            <span>Đã khóa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Unlock size={10} />
                            <span>Hoạt động</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Sửa thông tin */}
                          {isWhManagerOrAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditingLot(lot)}
                              title="Cập nhật NSX, HSD hoặc ghi chú"
                              className="p-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 transition cursor-pointer"
                            >
                              <Edit size={14} />
                            </button>
                          )}

                          {/* Khóa / Mở khóa (Có modal popup xác nhận) */}
                          {isWhManagerOrAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenLockModal(lot)}
                              title={isLocked ? 'Mở khóa cho phép xuất kho' : 'Khóa lô ngăn xuất kho'}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${isLocked
                                  ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                                }`}
                            >
                              {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
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

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Hiển thị <strong>{lots.length}</strong> / <strong>{totalElements}</strong> lô hàng
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-semibold px-2 text-gray-700">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <ProductLotCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            showToast?.('Khai báo lô hàng mới thành công', 'success');
            setSortBy('id,desc');
            setPage(0);
            loadLots();
            loadSummary();
          }}
        />
      )}

      {editingLot && (
        <ProductLotUpdateModal
          isOpen={Boolean(editingLot)}
          lot={editingLot}
          onClose={() => setEditingLot(null)}
          onSuccess={() => {
            showToast?.('Cập nhật thông tin lô hàng thành công', 'success');
            loadLots();
            loadSummary();
          }}
        />
      )}


      {/* Modal xác nhận Khóa / Mở khóa lô hàng */}
      {lotToToggleLock && (
        <ProductLotLockConfirmModal
          isOpen={Boolean(lotToToggleLock)}
          lot={lotToToggleLock}
          isLoading={submittingLock}
          onClose={() => {
            if (!submittingLock) setLotToToggleLock(null);
          }}
          onConfirm={handleConfirmToggleLock}
        />
      )}

      {/* Modal Cấu hình Bật/Tắt quản lý lô theo từng SKU (S6-01) */}
      <ProductBatchManagementConfigModal
        isOpen={isBatchConfigModalOpen}
        onClose={() => setIsBatchConfigModalOpen(false)}
        onUpdated={() => {
          loadLots();
          loadSummary();
        }}
      />
    </div>
  );
};
