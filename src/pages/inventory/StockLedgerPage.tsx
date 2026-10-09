import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  AlertTriangle,
  Search,
  ShoppingCart,
  ArrowRightLeft,
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
  fetchMinStockConfigs,
  updateMinStockThreshold
} from '../../services/stockAlertApi';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';

/**
 * S5-09 (Nguyễn Văn Minh): Sổ Tồn Kho & Khai Báo Ngưỡng Tồn Tối Thiểu
 * Acceptance Criteria:
 * - AC1: Khai báo tồn tối thiểu theo SKU và theo kho
 * - AC2: Hàng dưới ngưỡng hiển thị nổi bật trong sổ tồn và trên dashboard kho
 */
export const StockLedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [configs, setConfigs] = useState<MinStockThresholdConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [onlyBelowThreshold, setOnlyBelowThreshold] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');

  // Chỉnh sửa định mức trực tiếp trên dòng (inline edit AC1)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinValue, setEditMinValue] = useState<number>(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMinStockConfigs({
        warehouseCode: selectedWarehouse,
        onlyBelowThreshold,
        keyword
      });
      setConfigs(data);
    } catch (err) {
      console.error('Lỗi tải sổ tồn kho:', err);
      showToast('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouse, onlyBelowThreshold]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
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
    } catch (err: unknown) {
      showToast('Lỗi lưu định mức', err instanceof Error ? err.message : 'Không thể lưu định mức', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = configs.length;
    const below = configs.filter((c) => c.isBelowThreshold).length;
    const critical = configs.filter((c) => c.severity === 'CRITICAL').length;
    const safe = configs.filter((c) => c.severity === 'SAFE').length;
    return { total, below, critical, safe };
  }, [configs]);

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/20">
            <Boxes size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Sổ Tồn Kho & Cảnh Báo Tồn Tối Thiểu</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Sprint 5: S5-09
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Khai báo định mức tối thiểu theo SKU và kho, cảnh báo nguy cơ đứt hàng trước khi hết tồn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/inventory/receipts')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow-sm cursor-pointer"
          >
            <ShoppingCart size={15} />
            <span>Lập Phiếu Nhập NCC</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory/transfers')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm cursor-pointer"
          >
            <ArrowRightLeft size={15} />
            <span>Lập Phiếu Chuyển Kho</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs text-gray-500 font-semibold">Tổng SKU theo kho</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{stats.total}</div>
        </div>

        {/* THẺ BÁO ĐỎ QUAN TRỌNG NHẤT (AC2) */}
        <div
          onClick={() => setOnlyBelowThreshold(!onlyBelowThreshold)}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition ${
            onlyBelowThreshold || stats.below > 0
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-gray-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase flex items-center gap-1">
              <AlertTriangle size={14} className="text-rose-600" />
              <span>Dưới Định Mức (AC2)</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
              Báo Đỏ
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1 flex items-center gap-2">
            <span>{stats.below}</span>
            <span className="text-xs font-semibold text-rose-600">Mặt hàng</span>
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">
            {onlyBelowThreshold ? 'Đang lọc xem các SKU báo đỏ' : 'Nhấp để lọc nhanh'}
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
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã SKU, tên sản phẩm, nhóm hàng..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Lọc Kho */}
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="ALL">Tất cả kho hàng</option>
              {SYSTEM_WAREHOUSES.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Toggle Chỉ hiển thị SKU dưới định mức */}
            <button
              type="button"
              onClick={() => setOnlyBelowThreshold(!onlyBelowThreshold)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                onlyBelowThreshold
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle size={14} />
              <span>Chỉ hiện SKU Báo Đỏ</span>
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
                  <th className="py-3 px-4 text-center min-w-[140px]">Định Mức Tối Thiểu (AC1)</th>
                  <th className="py-3 px-4 text-center">Trạng Thái Tồn (AC2)</th>
                  <th className="py-3 px-4 text-center">Đề Xuất Đặt Hàng</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map((item) => {
                  const isEditing = editingId === item.id;
                  const isSaving = savingId === item.id;

                  // AC2: Highlight nổi bật màu đỏ khi hàng dưới định mức
                  return (
                    <tr
                      key={item.id}
                      className={`transition ${
                        item.isBelowThreshold
                          ? 'bg-rose-50/70 hover:bg-rose-50 border-l-4 border-rose-500'
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

                      {/* Tồn hiện tại (AC2: đỏ rực in đậm nếu dưới ngưỡng) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block font-black text-sm px-2.5 py-1 rounded-xl ${
                            item.isBelowThreshold
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-emerald-50 text-emerald-800'
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

                      {/* Định mức tồn tối thiểu (AC1: cho phép sửa trực tiếp) */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={editMinValue}
                              onChange={(e) => setEditMinValue(Math.max(0, Number(e.target.value)))}
                              className="w-20 text-center font-black text-xs border border-rose-400 rounded-lg p-1 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveMinThreshold(item)}
                              className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                              title="Lưu định mức"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                              title="Hủy"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 group">
                            <span className="font-bold text-gray-800">
                              {item.minThreshold.toLocaleString('vi-VN')} {item.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 rounded transition"
                              title="Sửa định mức tồn tối thiểu (AC1)"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Trạng thái tồn (AC2: Báo đỏ nổi bật) */}
                      <td className="py-3.5 px-4 text-center">
                        {item.severity === 'CRITICAL' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                            <AlertTriangle size={12} />
                            <span>BÁO ĐỎ: Thiếu {item.deficitQuantity}</span>
                          </span>
                        ) : item.severity === 'WARNING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <TrendingDown size={12} />
                            <span>CẢNH BÁO: Thiếu {item.deficitQuantity}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            <span>An toàn</span>
                          </span>
                        )}
                      </td>

                      {/* Đề xuất đặt hàng */}
                      <td className="py-3.5 px-4 text-center">
                        {item.suggestedReorderQuantity > 0 ? (
                          <span className="font-extrabold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full text-[11px]">
                            +{item.suggestedReorderQuantity} {item.unit}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-semibold">—</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.isBelowThreshold && (
                            <button
                              type="button"
                              onClick={() => navigate('/inventory/receipts')}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Lập phiếu nhập kho từ nhà cung cấp"
                            >
                              <ShoppingCart size={12} />
                              <span>Đặt NCC</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                          >
                            Định mức
                          </button>
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
    </div>
  );
};
