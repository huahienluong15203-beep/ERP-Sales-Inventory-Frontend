import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Layers,
  X
} from 'lucide-react';
import type {
  StockLedgerRow,
  StockLedgerSummary,
  WarehouseOptionResponse
} from '../../types/stockLedger';
import type { CategoryWithCount } from '../../services/categoryApi';
import {
  fetchStockLedger,
  fetchStockLedgerSummary,
  fetchStockLedgerWarehouses
} from '../../services/stockLedgerApi';
import { fetchCategories } from '../../services/categoryApi';
import { Pagination } from '../common/Pagination';

/**
 * S5-05: Sổ tồn kho 3 cột theo từng SKU và từng kho
 * Acceptance Criteria:
 * - Ba cột tách bạch: tồn thực tế, tồn đang giữ chỗ, tồn khả dụng
 * - Lọc theo kho, nhóm hàng, trạng thái tồn
 * - Tìm nhanh theo mã hoặc tên sản phẩm
 * - Trả lời ngay được câu hỏi mặt hàng này còn bao nhiêu bán được
 */
export const StockLedgerThreeColumnsTab: React.FC = () => {

  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<StockLedgerRow[]>([]);
  const [summary, setSummary] = useState<StockLedgerSummary | null>(null);

  // Danh sách kho & danh sách nhóm hàng phục vụ bộ lọc
  const [warehouses, setWarehouses] = useState<WarehouseOptionResponse[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);

  // Bộ lọc (S5-05)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [stockStatus, setStockStatus] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');
  const [sortField, setSortField] = useState<string>('physicalStock');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Load kho và nhóm hàng khi mount
  useEffect(() => {
    Promise.all([
      fetchStockLedgerWarehouses().catch(() => []),
      fetchCategories().catch(() => [])
    ]).then(([whList, catList]) => {
      setWarehouses(whList);
      setCategories(catList);
    });
  }, []);

  // Tải dữ liệu sổ tồn kho
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sortParam = `${sortField},${sortDir}`;
      const [pageData, summaryData] = await Promise.all([
        fetchStockLedger({
          warehouseId: selectedWarehouseId,
          categoryId: selectedCategoryId,
          stockStatus,
          keyword,
          sort: sortParam,
          page,
          size
        }),
        fetchStockLedgerSummary({
          warehouseId: selectedWarehouseId,
          categoryId: selectedCategoryId,
          stockStatus,
          keyword
        }).catch(() => null)
      ]);

      setRows(pageData.content || []);
      setTotalElements(pageData.totalElements || 0);
      setTotalPages(pageData.totalPages || 1);
      setSummary(summaryData);
    } catch (err: unknown) {
      console.error('Lỗi tải sổ tồn kho 3 cột:', err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedWarehouseId,
    selectedCategoryId,
    stockStatus,
    keyword,
    sortField,
    sortDir,
    page,
    size
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadData();
  };

  const handleResetFilters = () => {
    setSelectedWarehouseId('ALL');
    setSelectedCategoryId('ALL');
    setStockStatus('ALL');
    setKeyword('');
    setSortField('physicalStock');
    setSortDir('desc');
    setPage(0);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  return (
    <div className="space-y-3.5 antialiased">
      {/* Tiêu đề trang & Nút thao tác chính (Tinh gọn chuẩn như Danh mục nhà cung cấp) */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          title="Làm mới dữ liệu tồn kho"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-orange-600 hover:border-orange-300 rounded-lg hover:bg-orange-50/40 text-xs font-semibold transition cursor-pointer shadow-2xs h-9"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 1. THẺ THỐNG KÊ TỔNG QUAN (GIỮ NGUYÊN SỐ LIỆU, TINH GỌN CHỮ) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Thẻ 1: Tồn thực tế */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
              Tồn thực tế
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {summary ? summary.totalPhysicalStock.toLocaleString('vi-VN') : '--'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 flex items-center justify-center shrink-0">
            <Boxes size={22} />
          </div>
        </div>

        {/* Thẻ 2: Đang giữ chỗ */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
              Đang giữ chỗ
            </span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              {summary ? summary.totalReservedStock.toLocaleString('vi-VN') : '--'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* Thẻ 3: Tồn khả dụng */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
              Tồn khả dụng
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {summary ? summary.totalAvailableStock.toLocaleString('vi-VN') : '--'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Thẻ 4: Còn hàng */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
              Còn hàng
            </span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">
              {summary ? summary.inStockCount.toLocaleString('vi-VN') : '--'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* 2. BỘ LỌC TÌM KIẾM TINH GỌN */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(0);
            }}
            placeholder="Tìm theo mã SKU, tên hàng..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition min-h-[38px]"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => {
                setKeyword('');
                setPage(0);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* Bộ lọc dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#F85606] cursor-pointer min-h-[38px]"
          >
            <option value="ALL">Tất cả kho hàng</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#F85606] cursor-pointer min-h-[38px]"
          >
            <option value="ALL">Tất cả nhóm hàng</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#F85606] cursor-pointer min-h-[38px]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="IN_STOCK">Còn hàng</option>
            <option value="FULLY_RESERVED">Đã giữ hết</option>
            <option value="OUT_OF_STOCK">Hết hàng</option>
          </select>

          {(selectedWarehouseId !== 'ALL' || selectedCategoryId !== 'ALL' || stockStatus !== 'ALL' || keyword) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition cursor-pointer"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU SỔ TỒN KHO TINH GỌN */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-500 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            <span className="font-medium text-gray-600">Đang tải dữ liệu tồn kho...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Boxes className="w-10 h-10 mx-auto text-gray-300" />
            <div className="text-sm font-bold text-gray-700">
              Không tìm thấy bản ghi tồn kho nào
            </div>
            <div className="text-xs text-gray-400">
              Thử thay đổi kho, nhóm hàng hoặc từ khóa tìm kiếm
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th
                    onClick={() => toggleSort('sku')}
                    className="py-3 px-4 min-w-[200px] cursor-pointer hover:text-gray-900 transition"
                    title="Bấm để sắp xếp theo mã SKU"
                  >
                    Mặt hàng {sortField === 'sku' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="py-3 px-4 min-w-[150px]">Kho lưu trữ</th>
                  <th className="py-3 px-3 w-16 text-center">ĐVT</th>
                  <th
                    onClick={() => toggleSort('physicalStock')}
                    className="py-3 px-4 w-32 text-right cursor-pointer hover:text-gray-900 transition"
                    title="Bấm để sắp xếp theo tồn thực tế"
                  >
                    Tồn thực tế {sortField === 'physicalStock' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => toggleSort('reservedStock')}
                    className="py-3 px-4 w-32 text-right cursor-pointer hover:text-gray-900 transition"
                    title="Bấm để sắp xếp theo giữ chỗ"
                  >
                    Đang giữ chỗ {sortField === 'reservedStock' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => toggleSort('availableStock')}
                    className="py-3 px-4 w-32 text-right cursor-pointer hover:text-gray-900 transition"
                    title="Bấm để sắp xếp theo tồn khả dụng"
                  >
                    Tồn khả dụng {sortField === 'availableStock' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {rows.map((row, idx) => {
                  const isAvailable = row.availableStock > 0;
                  const isFullyReserved = row.physicalStock > 0 && row.availableStock === 0;

                  return (
                    <tr
                      key={row.inventoryId}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-gray-400 text-[11px]">
                        {page * size + idx + 1}
                      </td>

                      {/* Mặt hàng */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 block text-xs">
                          {row.sku}
                        </span>
                        <span
                          className="text-gray-600 line-clamp-1 text-xs"
                          title={row.productName}
                        >
                          {row.productName}
                        </span>
                        {row.categoryName && (
                          <span className="text-[11px] text-gray-400 mt-0.5 block">
                            {row.categoryName}
                          </span>
                        )}
                      </td>

                      {/* Kho */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-800 block text-xs">
                          {row.warehouseName}
                        </span>
                        <span className="font-mono text-[11px] text-gray-400">
                          {row.warehouseCode}
                        </span>
                      </td>

                      {/* ĐVT */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-gray-600 font-medium text-xs">
                          {row.baseUnit}
                        </span>
                      </td>

                      {/* Tồn thực tế */}
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 text-xs">
                        {row.physicalStock.toLocaleString('vi-VN')}
                      </td>

                      {/* Đang giữ chỗ */}
                      <td className="py-3 px-4 text-right text-xs">
                        {row.reservedStock > 0 ? (
                          <span className="font-semibold text-amber-600">
                            {row.reservedStock.toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>

                      {/* Tồn khả dụng */}
                      <td className="py-3 px-4 text-right text-xs">
                        <span
                          className={`font-semibold ${
                            isAvailable ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        >
                          {row.availableStock.toLocaleString('vi-VN')}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : isFullyReserved
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {isAvailable ? 'Còn hàng' : isFullyReserved ? 'Đã giữ hết' : 'Hết hàng'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PHÂN TRANG */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={(newSize) => {
            setSize(newSize);
            setPage(0);
          }}
          itemLabel="mặt hàng"
          disabled={loading}
        />
      </div>
    </div>
  );
};
