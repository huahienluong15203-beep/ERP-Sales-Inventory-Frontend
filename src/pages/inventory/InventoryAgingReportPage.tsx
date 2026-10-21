import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Boxes
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type {
  InventoryAgingItem,
  InventoryAgingSummary,
  AgingBracket
} from '../../types/inventoryAging';
import { fetchInventoryAgingReport } from '../../services/inventoryAgingApi';
import { fetchWarehouses } from '../../services/warehouseApi';
import { fetchCategories, type CategoryWithCount } from '../../services/categoryApi';
import type { Warehouse } from '../../types/warehouse';
import { SearchSelect } from '../../components/common/SearchSelect';
import { formatCurrencyVND } from '../../services/orderService';

export const InventoryAgingReportPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [items, setItems] = useState<InventoryAgingItem[]>([]);
  const [summary, setSummary] = useState<InventoryAgingSummary | null>(null);

  // Bộ lọc
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [agingBracket, setAgingBracket] = useState<AgingBracket>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Phân trang Server-side & Client sync
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Tải danh mục kho và nhóm hàng khi mở trang
  useEffect(() => {
    Promise.all([
      fetchWarehouses().catch(() => []),
      fetchCategories().catch(() => [])
    ]).then(([whs, cats]) => {
      setWarehouses(whs);
      setCategories(cats);
    });
  }, []);

  // Tải dữ liệu báo cáo luân chuyển kho từ Backend theo phân trang
  const loadData = useCallback(async (pageToLoad: number = currentPage, sizeToLoad: number = pageSize) => {
    setLoading(true);
    try {
      const res = await fetchInventoryAgingReport({
        warehouseId: selectedWarehouseId,
        categoryId: selectedCategory,
        agingBracket,
        keyword,
        page: pageToLoad,
        size: sizeToLoad
      });
      setItems(res.items || []);
      setSummary(res.summary || null);
      setTotalElements(res.totalElements ?? (res.items?.length || 0));
      setTotalPages(res.totalPages ?? Math.max(1, Math.ceil((res.totalElements ?? (res.items?.length || 0)) / sizeToLoad)));
    } catch (err) {
      console.error('Lỗi tải báo cáo luân chuyển kho:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouseId, selectedCategory, agingBracket, keyword, currentPage, pageSize]);

  useEffect(() => {
    loadData(currentPage, pageSize);
  }, [loadData, currentPage, pageSize]);

  const startIndex = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);

  // Sắp xếp nhóm hàng theo phân cấp cây DFS trực quan cho combobox lọc (Style cây DFS, truyền id chuẩn xác)
  const hierarchicalCategoryOptions = useMemo(() => {
    if (!categories || !categories.length) return [];
    const map = new Map<string | null, CategoryWithCount[]>();
    for (const c of categories) {
      const pid = c.parentId ?? null;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(c);
    }
    const result: { value: string; label: string; level: number; productCount: number }[] = [];
    const traverse = (parentId: string | null, depth: number) => {
      const list = map.get(parentId) || [];
      list.sort((a, b) => a.code.localeCompare(b.code));
      for (const item of list) {
        let prefix = '';
        if (depth === 2) prefix = '└─ ';
        else if (depth === 3) prefix = '└── ';
        else if (depth > 3) prefix = `${'──'.repeat(depth - 1)} `;

        const badge = item.level === 1 ? '[Ngành]' : item.level === 2 ? '[Nhóm]' : '';
        const countText = item.productCount > 0 ? ` (${item.productCount} SP)` : '';
        result.push({
          value: String(item.id),
          label: `${prefix}${badge} ${item.name}${countText}`.trim(),
          level: item.level,
          productCount: item.productCount,
        });
        traverse(item.id, depth + 1);
      }
    };
    traverse(null, 1);
    return result;
  }, [categories]);

  // Danh sách trang hiển thị kèm dấu ... khi có nhiều trang
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  // Xuất file Excel báo cáo luân chuyển kho (Tải toàn bộ dữ liệu không bị giới hạn trang)
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const selectedWh = warehouses.find((w) => String(w.id) === String(selectedWarehouseId));
      const whCode = selectedWh ? (selectedWh.code || `KHO_${selectedWarehouseId}`).toUpperCase() : 'TAT_CA';
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `Bao_cao_luan_chuyen_kho_${whCode}_${todayStr}.xlsx`;

      const fullRes = await fetchInventoryAgingReport({
        warehouseId: selectedWarehouseId,
        categoryId: selectedCategory,
        agingBracket,
        keyword,
        page: 1,
        size: 50000
      });

      const exportList = fullRes.items || items;

      const exportRows = exportList.map((i, idx) => ({
        'STT': idx + 1,
        'Mã SKU': i.productSku,
        'Tên sản phẩm': i.productName,
        'Nhóm hàng': i.categoryName,
        'Kho lưu trữ': i.warehouseName,
        'Đơn vị tính': i.baseUnit,
        'Số lượng tồn': i.quantity,
        'Giá vốn (VNĐ)': i.costPrice,
        'Tổng giá trị tồn (VNĐ)': i.totalValue,
        'Số ngày lưu kho bình quân': i.averageAgingDays,
        'Tốc độ luân chuyển':
          i.turnoverSpeed === 'FAST'
            ? 'Nhanh (0-30 ngày)'
            : i.turnoverSpeed === 'NORMAL'
            ? 'Bình thường (31-60 ngày)'
            : i.turnoverSpeed === 'SLOW'
            ? 'Chậm luân chuyển (61-90 ngày)'
            : 'Chôn vốn (> 90 ngày)',
        'Ngày biến động gần nhất': i.lastMovementDate || 'Chưa ghi nhận'
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Luan_chuyen_kho');
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Lỗi xuất Excel báo cáo luân chuyển:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 antialiased p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      {/* 1. Header tác vụ tinh gọn */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting || loading || items.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Download size={14} className={exporting ? 'animate-bounce' : ''} />
          <span>{exporting ? 'Đang xuất Excel...' : 'Xuất Excel'}</span>
        </button>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:text-orange-600 hover:border-orange-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Thẻ Thống kê Tổng quan (KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tổng giá trị tồn */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={13} className="text-blue-500" />
            <span>Tổng giá trị hàng tồn</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
            {summary ? formatCurrencyVND(summary.totalInventoryValue) : '--'}
          </div>
          <div className="text-[11px] text-gray-500">
            Dựa trên giá vốn của <strong>{totalElements}</strong> sản phẩm
          </div>
        </div>

        {/* Tỷ lệ chậm luân chuyển */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <TrendingDown size={13} className="text-amber-600" />
            <span>Tỷ lệ quay vòng chậm</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
            {summary ? `${summary.slowMovingRatio}%` : '--'}
          </div>
          <div className="text-[11px] text-amber-800">
            <strong>{summary?.slowMovingCount ?? 0}</strong> SKU tồn lưu kho &gt; 60 ngày
          </div>
        </div>

        {/* Vốn bị chôn đọng (> 90 ngày) */}
        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={13} className="text-rose-600" />
            <span>Vốn đọng nguy hiểm (&gt; 90 ngày)</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-950 font-mono">
            {summary ? formatCurrencyVND(summary.stagnantValue) : '--'}
          </div>
          <div className="text-[11px] text-rose-800 font-semibold">
            Cần lên kế hoạch khuyến mãi / thanh lý
          </div>
        </div>

        {/* Ngày tồn bình quân toàn hệ thống */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} className="text-emerald-600" />
            <span>Tuổi hàng bình quân</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
            {summary ? `${summary.averageSystemDays} ngày` : '--'}
          </div>
          <div className="text-[11px] text-emerald-800">
            Số ngày lưu kho bình quân toàn hệ thống
          </div>
        </div>
      </div>

      {/* 3. Bộ lọc đa chiều có SearchSelect */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setCurrentPage(1);
                setKeyword(e.target.value);
              }}
              placeholder="Tìm theo mã SKU, tên sản phẩm..."
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition min-h-[38px]"
            />
          </div>

          {/* Phân loại thời gian lưu kho (Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Thời gian:</span>
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: '0_30', label: '≤ 30 ngày (Nhanh)' },
              { key: '31_60', label: '31-60 ngày' },
              { key: '61_90', label: '61-90 ngày' },
              { key: 'OVER_90', label: '> 90 ngày (Chôn vốn)' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setAgingBracket(tab.key as AgingBracket);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  agingBracket === tab.key
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown lọc Kho & Nhóm hàng bằng SearchSelect */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Kho hàng:
            </label>
            <SearchSelect
              value={selectedWarehouseId}
              onChange={(e) => {
                setCurrentPage(1);
                setSelectedWarehouseId(e.target.value);
              }}
              searchPlaceholder="Gõ để tìm kho hàng..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="ALL">Tất cả kho hàng</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  [{w.code}] {w.name}
                </option>
              ))}
            </SearchSelect>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Nhóm hàng:
            </label>
            <SearchSelect
              value={selectedCategory}
              onChange={(e) => {
                setCurrentPage(1);
                setSelectedCategory(e.target.value);
              }}
              searchPlaceholder="Gõ để tìm nhóm hàng..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="ALL">Tất cả nhóm hàng ({categories.length})</option>
              {hierarchicalCategoryOptions.map((opt, idx) => (
                <option key={`${opt.value}-${idx}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SearchSelect>
          </div>

          <div className="flex items-end">
            {(selectedWarehouseId !== 'ALL' || selectedCategory !== 'ALL' || agingBracket !== 'ALL' || keyword) && (
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setSelectedWarehouseId('ALL');
                  setSelectedCategory('ALL');
                  setAgingBracket('ALL');
                  setKeyword('');
                }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bảng Dữ liệu Luân chuyển Kho Chi tiết */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Mã SKU</th>
                <th className="py-3 px-4">Tên sản phẩm</th>
                <th className="py-3 px-4">Nhóm hàng</th>
                <th className="py-3 px-4 whitespace-nowrap">Kho lưu trữ</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Số lượng tồn</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Giá vốn (VNĐ)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Tổng giá trị tồn</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Số ngày lưu kho</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Tốc độ luân chuyển</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-orange-500" />
                      <span>Đang tải số liệu luân chuyển kho...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Boxes size={28} className="text-gray-300" />
                      <span className="font-medium text-gray-600">Không có sản phẩm nào phù hợp bộ lọc</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {item.productSku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{item.productName}</div>
                      <div className="text-[11px] text-gray-400">Đơn vị: {item.baseUnit}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{item.categoryName}</td>
                    <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                      <div className="font-semibold">{item.warehouseName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{item.warehouseCode}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {item.quantity.toLocaleString('vi-VN')} {item.baseUnit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-600 whitespace-nowrap">
                      {formatCurrencyVND(item.costPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrencyVND(item.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                          item.averageAgingDays <= 30
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.averageAgingDays <= 60
                            ? 'bg-blue-100 text-blue-800'
                            : item.averageAgingDays <= 90
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <Clock size={12} />
                        <span>{item.averageAgingDays} ngày</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {item.turnoverSpeed === 'FAST' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Nhanh
                        </span>
                      )}
                      {item.turnoverSpeed === 'NORMAL' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          Bình thường
                        </span>
                      )}
                      {item.turnoverSpeed === 'SLOW' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Chậm luân chuyển
                        </span>
                      )}
                      {item.turnoverSpeed === 'STAGNANT' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          Cảnh báo chôn vốn
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang ở cuối trang */}
        {totalElements > 0 && (
          <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị <strong>{startIndex}–{endIndex}</strong> / <strong>{totalElements}</strong> sản phẩm
              </span>
              <div className="flex items-center gap-1.5 text-gray-500">
                <span>Số dòng/trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition cursor-pointer"
              >
                &lt;
              </button>
              {getPageNumbers().map((pageItem, idx) => {
                if (typeof pageItem === 'string') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 font-bold text-xs">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={pageItem}
                    type="button"
                    disabled={loading}
                    onClick={() => setCurrentPage(pageItem)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                      currentPage === pageItem
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {pageItem}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAgingReportPage;
