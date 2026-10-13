import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  Search,
  ShoppingCart,
  RefreshCw,
  CheckCircle2,
  TrendingDown,
  Edit2,
  Check,
  X
} from 'lucide-react';
import type { MinStockThresholdConfig } from '../../types/stockAlert';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import {
  fetchMinStockConfigsPaged,
  getDashboardMinStockSummary,
  updateMinStockThreshold
} from '../../services/stockAlertApi';
import { useLocation } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { SearchSelect } from '../../components/common/SearchSelect';
import { NumberInput } from '../../components/common/NumberInput';
import { Pagination } from '../../components/common/Pagination';
import { WarehouseMinStockDashboardAlert } from '../../components/inventory/WarehouseMinStockDashboardAlert';
import { GoodsReceiptFormModal } from '../../components/inventory/GoodsReceiptFormModal';

/**
 * S5-09 (Nguyễn Văn Minh): Sổ Tồn Kho & Khai Báo Ngưỡng Tồn Tối Thiểu
 * Acceptance Criteria:
 * - AC1: Khai báo tồn tối thiểu theo SKU và theo kho
 * - AC2: Hàng dưới ngưỡng hiển thị nổi bật trong sổ tồn và trên dashboard kho
 */
export const StockLedgerPage: React.FC = () => {
  const location = useLocation();
  const { showToast, currentRole } = useAuth();

  // Mục 12 (góp ý GV): chặn ở cả FE và BE - chỉ NV kho, QL kho, Admin được lập / xác nhận / sửa;
  // Kế toán, QL kinh doanh chỉ xem.
  const canEditInventory = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [configs, setConfigs] = useState<MinStockThresholdConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Phân trang: Cố định 50 sản phẩm ban đầu để load cực nhanh
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(50);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELOW' | 'CRITICAL' | 'SAFE'>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Highlight SKU được bấm từ thông báo chuông hoặc thẻ cảnh báo
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  // Modal lập nhanh phiếu nhập kho NCC trực tiếp tại trang
  const [selectedAlertForReceipt, setSelectedAlertForReceipt] = useState<MinStockThresholdConfig | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Thống kê nhanh toàn bộ hệ thống
  const [stats, setStats] = useState({
    total: 0,
    below: 0,
    critical: 0,
    safe: 0
  });

  // Chỉnh sửa định mức trực tiếp trên dòng (inline edit AC1)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinValue, setEditMinValue] = useState<number>(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = async (
    targetPage = page,
    targetSize = size,
    kw = keyword,
    status = statusFilter,
    wh = selectedWarehouse
  ) => {
    setLoading(true);
    try {
      const [pagedRes, summary] = await Promise.all([
        fetchMinStockConfigsPaged({
          warehouseCode: wh,
          status,
          keyword: kw,
          page: targetPage,
          size: targetSize
        }),
        getDashboardMinStockSummary(wh).catch(() => null)
      ]);

      setConfigs(pagedRes.content);
      setTotalElements(pagedRes.totalElements);
      setTotalPages(pagedRes.totalPages);

      if (summary) {
        const total = summary.totalSkuCount || pagedRes.totalElements;
        const below = summary.totalAlerts;
        const critical = summary.criticalCount;
        const safe = summary.totalSafeCount ?? Math.max(0, total - below);
        setStats({ total, below, critical, safe });
      } else {
        setStats({
          total: pagedRes.totalElements,
          below: pagedRes.content.filter((c) => c.isBelowThreshold).length,
          critical: pagedRes.content.filter((c) => c.severity === 'CRITICAL').length,
          safe: Math.max(0, pagedRes.totalElements - pagedRes.content.filter((c) => c.isBelowThreshold).length)
        });
      }
    } catch (err) {
      console.error('Lỗi tải sổ tồn kho:', err);
      showToast('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, size, keyword, statusFilter, selectedWarehouse);
  }, [page, size, selectedWarehouse, statusFilter]);

  // Tự động nhận diện SKU & Kho từ thông báo chuông header nếu có
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const skuParam = params.get('sku');
    const whParam = params.get('warehouseCode');
    const isHighlight = params.get('highlight') === 'true';

    if (skuParam && isHighlight) {
      const key = whParam ? `${skuParam}_${whParam}` : skuParam;
      setHighlightedKey(key);
      // Để trống keyword để không bị bó cứng chỉ tìm mỗi sản phẩm đó
      setKeyword('');
      setStatusFilter('ALL');
      const targetWarehouse = whParam || 'ALL';
      setSelectedWarehouse(targetWarehouse);
      setPage(0);
      loadData(0, size, '', 'ALL', targetWarehouse);

      // Xóa query params trên URL ngay sau khi load để khi F5/reload trang thì viền đỏ mất đi đúng thực tế
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Cuộn mượt đến sản phẩm được bấm xem chi tiết
      setTimeout(() => {
        const el = document.querySelector(`[data-row-key="${key}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    }

    return () => {
      // Khi thoát page ra thì mất highlight
      setHighlightedKey(null);
    };
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHighlightedKey(null);
    setPage(0);
    loadData(0, size, keyword, statusFilter, selectedWarehouse);
  };

  const handleStartEdit = (cfg: MinStockThresholdConfig) => {
    setEditingId(cfg.id);
    setEditMinValue(cfg.minThreshold);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Lưu cấu hình ngưỡng tối thiểu (AC1)
  const handleSaveMinThreshold = async (cfg: MinStockThresholdConfig) => {
    if (editMinValue < 0) {
      showToast('Lỗi định mức', 'Định mức tồn tối thiểu không thể nhỏ hơn 0', 'error');
      return;
    }

    setSavingId(cfg.id);
    try {
      const updated = await updateMinStockThreshold({
        productSku: cfg.productSku,
        warehouseCode: cfg.warehouseCode,
        minThreshold: Number(editMinValue)
      });

      showToast(
        'Đã cập nhật định mức tồn',
        `SKU [${cfg.productSku}] tại ${cfg.warehouseName} đã được cập nhật định mức: ${editMinValue} ${cfg.unit}`,
        'success',
        4000
      );

      setConfigs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingId(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('min_stock_updated'));
      }
    } catch (err: unknown) {
      showToast('Lỗi lưu định mức', err instanceof Error ? err.message : 'Không thể lưu định mức', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3.5 pb-8">

      {/* CẢNH BÁO TỒN KHO DƯỚI ĐỊNH MỨC TỐI THIỂU NỔI BẬT (S5-09 / AC2) */}
      <WarehouseMinStockDashboardAlert
        warehouseCode={selectedWarehouse === 'ALL' ? undefined : selectedWarehouse}
        hideLedgerButton={true}
      />

      {/* 4 THẺ THỐNG KÊ (KPI CARDS) - HỖ TRỢ NHẤP ĐỂ LỌC TRỰC TIẾP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tổng SKU theo kho */}
        <div
          onClick={() => {
            setHighlightedKey(null);
            setStatusFilter('ALL');
            setPage(0);
          }}
          className={`p-3.5 rounded-2xl border shadow-2xs cursor-pointer transition select-none ${statusFilter === 'ALL'
              ? 'bg-gray-100/90 border-gray-400 ring-2 ring-gray-400/30'
              : 'bg-white border-gray-200/80 hover:bg-gray-50/80'
            }`}
          title="Nhấp để hiển thị tất cả hàng hóa"
        >
          <div className="text-[11px] text-gray-500 font-semibold">Tổng SKU theo kho</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            {statusFilter === 'ALL' ? 'Đang hiển thị tất cả' : 'Nhấp để xem tất cả'}
          </div>
        </div>

        {/* Card 2: Dưới Định Mức (AC2) */}
        <div
          onClick={() => {
            setHighlightedKey(null);
            setStatusFilter(statusFilter === 'BELOW' ? 'ALL' : 'BELOW');
            setPage(0);
          }}
          className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer transition select-none ${statusFilter === 'BELOW'
              ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500/30 shadow-xs'
              : 'bg-white border-rose-200/80 hover:bg-rose-50/40'
            }`}
          title="Nhấp để lọc nhanh các mặt hàng dưới định mức"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase flex items-center gap-1">
              <AlertTriangle size={14} className="text-rose-600" />
              <span>Dưới Định Mức</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              Cần Bổ Sung
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1 flex items-center gap-2">
            <span>{stats.below}</span>
            <span className="text-xs font-semibold text-rose-600">Mặt hàng</span>
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5 font-medium">
            {statusFilter === 'BELOW' ? 'Đang lọc xem các SKU thiếu hụt' : 'Nhấp để lọc nhanh'}
          </div>
        </div>

        {/* Card 3: Cạn Kiệt Tồn (Tồn = 0) */}
        <div
          onClick={() => {
            setHighlightedKey(null);
            setStatusFilter(statusFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL');
            setPage(0);
          }}
          className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer transition select-none ${statusFilter === 'CRITICAL'
              ? 'bg-red-50/90 border-red-400 ring-2 ring-red-500/30 shadow-xs'
              : 'bg-white border-red-200/80 hover:bg-red-50/40'
            }`}
          title="Nhấp để lọc nhanh các mặt hàng cạn kiệt tồn kho"
        >
          <div className="text-xs text-red-600 font-bold">Cạn Kiệt Tồn (Tồn = 0)</div>
          <div className="text-2xl font-black text-red-700 mt-1">{stats.critical}</div>
          <div className="text-[11px] text-red-500 mt-0.5 font-medium">
            {statusFilter === 'CRITICAL' ? 'Đang lọc xem hàng hết sạch' : 'Nguy cơ mất doanh số ngay lập tức'}
          </div>
        </div>

        {/* Card 4: Tồn Kho An Toàn */}
        <div
          onClick={() => {
            setHighlightedKey(null);
            setStatusFilter(statusFilter === 'SAFE' ? 'ALL' : 'SAFE');
            setPage(0);
          }}
          className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer transition select-none ${statusFilter === 'SAFE'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
              : 'bg-white border-emerald-200/80 hover:bg-emerald-50/40'
            }`}
          title="Nhấp để lọc nhanh các mặt hàng tồn an toàn"
        >
          <div className="text-xs text-emerald-600 font-bold">Tồn Kho An Toàn</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.safe}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            {statusFilter === 'SAFE' ? 'Đang lọc xem hàng an toàn' : 'Đạt và vượt mức dự trữ tối thiểu'}
          </div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã SKU, tên sản phẩm, nhóm hàng..."
              value={keyword}
              onChange={(e) => {
                setHighlightedKey(null);
                setKeyword(e.target.value);
              }}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center sm:justify-end gap-2 w-full sm:w-auto">
            {/* Lọc Kho */}
            <SearchSelect
              value={selectedWarehouse}
              onChange={(e) => {
                setHighlightedKey(null);
                setSelectedWarehouse(e.target.value);
                setPage(0);
              }}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="ALL">Tất cả kho hàng</option>
              {SYSTEM_WAREHOUSES.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </SearchSelect>

            {/* Ô chọn Trạng Thái Tồn (thay thế nút toggle) */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setHighlightedKey(null);
                setStatusFilter(e.target.value as 'ALL' | 'BELOW' | 'CRITICAL' | 'SAFE');
                setPage(0);
              }}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer text-gray-700"
            >
              <option value="ALL">Tất cả trạng thái tồn</option>
              <option value="BELOW">⚠️ Dưới định mức (Cần bổ sung)</option>
              <option value="CRITICAL">🚨 Cạn kiệt tồn (Tồn = 0)</option>
              <option value="SAFE">✅ Tồn kho an toàn</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition cursor-pointer"
            >
              Lọc
            </button>
          </div>
        </form>
      </div>

      {/* BẢNG SỔ TỒN KHO & CẢNH BÁO NỔI BẬT (AC2) */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-rose-600" />
            <span>Đang tải số liệu tồn kho & định mức...</span>
          </div>
        ) : configs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Boxes size={36} className="mx-auto text-gray-300" />
            <div className="text-sm font-bold text-gray-700">Không tìm thấy bản ghi tồn kho nào</div>
            <div className="text-xs text-gray-400">Thay đổi bộ lọc hoặc từ khóa tìm kiếm</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
              {/* Định nghĩa kích thước cố định cho từng cột: không xê dịch khi chỉnh sửa */}
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[18%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">Mã SKU & Tên Hàng</th>
                  <th className="py-3 px-3">Kho Lưu Trữ</th>
                  <th className="py-3 px-2 text-center">Tồn Hiện Tại</th>
                  <th className="py-3 px-2 text-center">Tồn Khả Dụng</th>
                  <th className="py-3 px-2 text-center">Định Mức Tối Thiểu</th>
                  <th className="py-3 px-2 text-center">Trạng Thái Tồn</th>
                  <th className="py-3 px-2 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map((item) => {
                  const isEditing = editingId === item.id;
                  const isSaving = savingId === item.id;
                  const isBelow = Boolean(item.isBelowThreshold || (item as any).belowThreshold || item.currentStock < item.minThreshold);
                  const itemKey = `${item.productSku}_${item.warehouseCode}`;
                  const isHighlighted = highlightedKey ? (highlightedKey === itemKey || highlightedKey === item.productSku) : false;

                  return (
                    <tr
                      key={item.id}
                      data-row-key={itemKey}
                      className={`transition duration-150 ${isHighlighted
                          ? 'bg-rose-100/80 hover:bg-rose-100 border-l-4 border-rose-600 ring-2 ring-rose-500/40 shadow-sm'
                          : isBelow
                            ? 'bg-rose-50/20 hover:bg-rose-50/50 border-l-4 border-transparent'
                            : 'hover:bg-gray-50/70 border-l-4 border-transparent'
                        }`}
                    >
                      {/* 1. Mã SKU & Tên hàng */}
                      <td className="py-3 px-3 overflow-hidden">
                        <div className="font-mono font-bold text-gray-900 truncate">{item.productSku}</div>
                        <div className="font-semibold text-gray-800 text-xs mt-0.5 truncate" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">Nhóm: {item.category}</div>
                      </td>

                      {/* 2. Kho lưu trữ */}
                      <td className="py-3 px-3 overflow-hidden">
                        <div className="font-bold text-gray-800 truncate" title={item.warehouseName}>
                          {item.warehouseName}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400">{item.warehouseCode}</div>
                      </td>

                      {/* 3. Tồn hiện tại */}
                      <td className="py-3 px-2 text-center overflow-hidden">
                        <span
                          className={`inline-block font-bold text-xs px-2 py-0.5 rounded-lg whitespace-nowrap ${isBelow
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            }`}
                        >
                          {item.currentStock.toLocaleString('vi-VN')} {item.unit}
                        </span>
                      </td>

                      {/* 4. Tồn khả dụng */}
                      <td className="py-3 px-2 text-center overflow-hidden">
                        <span className="font-bold text-gray-700 whitespace-nowrap">
                          {item.availableStock.toLocaleString('vi-VN')} {item.unit}
                        </span>
                      </td>

                      {/* 5. Định mức tối thiểu (Sửa trực tiếp không làm xê dịch bảng) */}
                      <td className="py-3 px-2 text-center overflow-visible">
                        {isEditing ? (
                          <div className="relative inline-flex items-center justify-center gap-1">
                            <NumberInput
                              min="0"
                              value={editMinValue}
                              onChange={(e) => setEditMinValue(Math.max(0, Number(e.target.value)))}
                              className="w-14 h-7 text-center font-bold text-xs border border-rose-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 py-0 px-1"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveMinThreshold(item)}
                              className="w-6 h-7 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition flex items-center justify-center shrink-0 cursor-pointer"
                              title="Lưu định mức"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="w-6 h-7 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition flex items-center justify-center shrink-0 cursor-pointer"
                              title="Hủy"
                            >
                              <X size={13} />
                            </button>
                            {/* Gợi ý nhập nổi bên dưới tuyệt đối, không làm tăng chiều cao cell hay xê dịch cột */}
                            {item.suggestedReorderQuantity > 0 && (
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 text-[10px] bg-white text-rose-700 px-2 py-0.5 rounded-md shadow-md border border-rose-200 font-bold pointer-events-none">
                                💡 Gợi ý: +{item.suggestedReorderQuantity} {item.unit}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center justify-center gap-1.5 group cursor-pointer"
                            onClick={() => canEditInventory && handleStartEdit(item)}
                          >
                            <span className="font-bold text-gray-800 whitespace-nowrap">
                              {item.minThreshold.toLocaleString('vi-VN')} {item.unit}
                            </span>
                            {canEditInventory && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(item);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Sửa định mức tồn tối thiểu"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 6. Trạng thái tồn */}
                      <td className="py-3 px-2 text-center overflow-hidden">
                        {item.severity === 'CRITICAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            <AlertTriangle size={11} className="text-rose-500 shrink-0" />
                            <span>Thiếu {item.deficitQuantity} {item.unit}</span>
                          </span>
                        ) : item.severity === 'WARNING' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                            <TrendingDown size={11} className="text-amber-500 shrink-0" />
                            <span>Thiếu {item.deficitQuantity} {item.unit}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                            <span>Đạt định mức</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Thao tác */}
                      <td className="py-3 px-2 text-center overflow-hidden">
                        <div className="flex items-center justify-center">
                          {isBelow && canEditInventory && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAlertForReceipt(item);
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap mx-auto"
                              title={`Lập phiếu nhập nhanh NCC (Gợi ý đặt: +${item.suggestedReorderQuantity} ${item.unit})`}
                            >
                              <ShoppingCart size={12} />
                              <span>Đặt NCC</span>
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

        {/* THANH PHÂN TRANG: Cố định 50 sản phẩm/trang, bấm sang trang để xem tiếp */}
        {totalElements > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={size}
            onPageChange={(newPage) => setPage(newPage)}
            onSizeChange={(newSize) => {
              setSize(newSize);
              setPage(0);
            }}
            itemLabel="sản phẩm"
            disabled={loading}
          />
        )}
      </div>

      {/* MODAL LẬP PHIẾU NHẬP NCC TRỰC TIẾP (QUICK MODULE) */}
      <GoodsReceiptFormModal
        isOpen={isReceiptModalOpen}
        initialWarehouseCode={selectedAlertForReceipt?.warehouseCode}
        initialProductSku={selectedAlertForReceipt?.productSku}
        initialProductName={selectedAlertForReceipt?.productName}
        initialQuantity={selectedAlertForReceipt?.suggestedReorderQuantity}
        initialNote={
          selectedAlertForReceipt
            ? `Nhập nhanh bù hàng dưới định mức tồn cho ${selectedAlertForReceipt.warehouseName} (Đề xuất: +${selectedAlertForReceipt.suggestedReorderQuantity} ${selectedAlertForReceipt.unit})`
            : undefined
        }
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedAlertForReceipt(null);
        }}
        onSuccess={() => {
          setIsReceiptModalOpen(false);
          setSelectedAlertForReceipt(null);
          showToast('Lập phiếu nhập thành công', 'Đã lưu phiếu nhập kho NCC', 'success');
          loadData();
        }}
      />
    </div>
  );
};
