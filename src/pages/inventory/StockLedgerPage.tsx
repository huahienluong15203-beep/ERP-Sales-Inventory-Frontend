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
import { useNavigate, useLocation } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { SearchSelect } from '../../components/common/SearchSelect';
import { NumberInput } from '../../components/common/NumberInput';
import { Pagination } from '../../components/common/Pagination';
import { WarehouseMinStockDashboardAlert } from '../../components/inventory/WarehouseMinStockDashboardAlert';

/**
 * S5-09 (Nguyễn Văn Minh): Sổ Tồn Kho & Khai Báo Ngưỡng Tồn Tối Thiểu
 * Acceptance Criteria:
 * - AC1: Khai báo tồn tối thiểu theo SKU và theo kho
 * - AC2: Hàng dưới ngưỡng hiển thị nổi bật trong sổ tồn và trên dashboard kho
 */
export const StockLedgerPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [onlyBelowThreshold, setOnlyBelowThreshold] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');

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
    belowOnly = onlyBelowThreshold,
    wh = selectedWarehouse
  ) => {
    setLoading(true);
    try {
      const [pagedRes, summary] = await Promise.all([
        fetchMinStockConfigsPaged({
          warehouseCode: wh,
          onlyBelowThreshold: belowOnly,
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
    loadData(page, size, keyword, onlyBelowThreshold, selectedWarehouse);
  }, [page, size, selectedWarehouse, onlyBelowThreshold]);

  // Tự động nhận diện SKU từ thông báo chuông header nếu có
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const skuParam = params.get('sku');
    if (skuParam) {
      setKeyword(skuParam);
      setOnlyBelowThreshold(true);
      setPage(0);
      loadData(0, size, skuParam, true, selectedWarehouse);
    }
  }, [location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadData(0, size, keyword, onlyBelowThreshold, selectedWarehouse);
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
        'Đã cập nhật định mức tồn (AC1)',
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

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="text-[11px] text-gray-500 font-semibold">Tổng SKU theo kho</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{stats.total}</div>
        </div>

        {/* THẺ BÁO ĐỎ QUAN TRỌNG NHẤT (AC2) */}
        <div
          onClick={() => setOnlyBelowThreshold(!onlyBelowThreshold)}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition ${onlyBelowThreshold || stats.below > 0
            ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
            : 'bg-white border-gray-200/80'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase flex items-center gap-1">
              <AlertTriangle size={14} className="text-rose-600" />
              <span>Dưới Định Mức (AC2)</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              Cần Bổ Sung
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1 flex items-center gap-2">
            <span>{stats.below}</span>
            <span className="text-xs font-semibold text-rose-600">Mặt hàng</span>
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">
            {onlyBelowThreshold ? 'Đang lọc xem các SKU thiếu hụt' : 'Nhấp để lọc nhanh'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200/80 shadow-xs">
          <div className="text-xs text-red-600 font-bold">Cạn Kiệt Tồn (Tồn = 0)</div>
          <div className="text-2xl font-black text-red-700 mt-1">{stats.critical}</div>
          <div className="text-[11px] text-red-500">Nguy cơ mất doanh số ngay lập tức</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="text-xs text-emerald-600 font-bold">Tồn Kho An Toàn</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.safe}</div>
          <div className="text-[11px] text-emerald-600">Đạt và vượt mức dự trữ tối thiểu</div>
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
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center sm:justify-end gap-2 w-full sm:w-auto">
            {/* Lọc Kho */}
            <SearchSelect
              value={selectedWarehouse}
              onChange={(e) => {
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

            {/* Toggle Chỉ hiển thị SKU dưới định mức */}
            <button
              type="button"
              onClick={() => {
                setOnlyBelowThreshold(!onlyBelowThreshold);
                setPage(0);
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${onlyBelowThreshold
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <AlertTriangle size={14} />
              <span>Chỉ hiện SKU thiếu hụt</span>
            </button>

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
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Mã SKU & Tên Hàng</th>
                  <th className="py-3 px-4">Kho Lưu Trữ</th>
                  <th className="py-3 px-4 text-center">Tồn Hiện Tại</th>
                  <th className="py-3 px-4 text-center">Tồn Khả Dụng</th>
                  <th className="py-3 px-4 text-center min-w-[140px]">Định Mức Tối Thiểu</th>
                  <th className="py-3 px-4 text-center">Trạng Thái Tồn</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map((item) => {
                  const isEditing = editingId === item.id;
                  const isSaving = savingId === item.id;
                  const isBelow = Boolean(item.isBelowThreshold || (item as any).belowThreshold || item.currentStock < item.minThreshold);

                  return (
                    <tr
                      key={item.id}
                      className={`transition ${isBelow
                        ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-rose-500'
                        : 'hover:bg-gray-50/70 border-l-4 border-transparent'
                        }`}
                    >
                      {/* SKU & Tên hàng */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-gray-900">{item.productSku}</div>
                        <div className="font-semibold text-gray-800 text-xs mt-0.5">{item.productName}</div>
                        <div className="text-[10px] text-gray-400">Nhóm: {item.category}</div>
                      </td>

                      {/* Kho */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-800">{item.warehouseName}</div>
                        <div className="text-[10px] font-mono text-gray-400">{item.warehouseCode}</div>
                      </td>

                      {/* Tồn hiện tại */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block font-bold text-xs px-2.5 py-1 rounded-lg ${isBelow
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            }`}
                        >
                          {item.currentStock.toLocaleString('vi-VN')} {item.unit}
                        </span>
                      </td>

                      {/* Tồn khả dụng */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-gray-700">
                          {item.availableStock.toLocaleString('vi-VN')} {item.unit}
                        </span>
                      </td>

                      {/* Định mức tồn tối thiểu & Module chỉnh sửa gợi ý */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <div className="inline-flex flex-col items-center gap-1.5 p-2 bg-rose-50/90 rounded-xl border border-rose-200 shadow-2xs">
                            <div className="flex items-center gap-1">
                              <NumberInput
                                min="0"
                                value={editMinValue}
                                onChange={(e) => setEditMinValue(Math.max(0, Number(e.target.value)))}
                                className="w-20 text-center font-bold text-xs border border-rose-300 rounded-lg p-1 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                autoFocus
                              />
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveMinThreshold(item)}
                                className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
                                title="Lưu định mức"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                                title="Hủy"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            {item.suggestedReorderQuantity > 0 && (
                              <div className="text-[10px] text-rose-700 font-semibold whitespace-nowrap flex items-center gap-1">
                                <span>💡 Gợi ý nhập:</span>
                                <strong className="font-bold">+{item.suggestedReorderQuantity} {item.unit}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 group">
                            <span className="font-bold text-gray-800">
                              {item.minThreshold.toLocaleString('vi-VN')} {item.unit}
                            </span>
                            {canEditInventory && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 rounded transition"
                                title="Sửa định mức tồn tối thiểu"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái tồn */}
                      <td className="py-3.5 px-4 text-center">
                        {item.severity === 'CRITICAL' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle size={12} className="text-rose-500 shrink-0" />
                            <span>Thiếu {item.deficitQuantity} {item.unit}</span>
                          </span>
                        ) : item.severity === 'WARNING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <TrendingDown size={12} className="text-amber-500 shrink-0" />
                            <span>Thiếu {item.deficitQuantity} {item.unit}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                            <span>Đạt định mức</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isBelow && canEditInventory && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/inventory/receipts?warehouseCode=${encodeURIComponent(
                                    item.warehouseCode
                                  )}&sku=${encodeURIComponent(
                                    item.productSku
                                  )}&qty=${item.suggestedReorderQuantity}&create=1`
                                )
                              }
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                              title={`Lập phiếu nhập NCC (Gợi ý đặt: +${item.suggestedReorderQuantity} ${item.unit})`}
                            >
                              <ShoppingCart size={13} />
                              <span>Đặt NCC</span>
                            </button>
                          )}

                          {canEditInventory && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-gray-200 transition cursor-pointer"
                              title={`Chỉnh sửa định mức${item.suggestedReorderQuantity > 0 ? ` (Gợi ý nhập: +${item.suggestedReorderQuantity} ${item.unit})` : ''}`}
                            >
                              <Edit2 size={13} />
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
    </div>
  );
};
