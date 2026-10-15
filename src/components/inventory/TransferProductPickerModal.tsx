import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  Plus,
  Check,
  Package,
  Loader2,
  FolderTree,
  Trash2,
  Maximize2
} from 'lucide-react';
import { productService } from '../../services/productService';
import { fetchCategories, type CategoryWithCount } from '../../services/categoryApi';
import { Pagination } from '../common/Pagination';
import { SearchSelect } from '../common/SearchSelect';
import type { Product } from '../../types/product';

const DEFAULT_PAGE_SIZE = 50;
const MODAL_PAGE_SIZE_OPTIONS = [30, 50, 100];

interface TransferProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWarehouseCode: string;
  sourceWarehouseName: string;
  stockMap: Record<number, number>;
  loadingStock?: boolean;
  existingLinesMap: Map<number, number>; // productId -> quantity đã có trong phiếu
  onAddProduct: (product: Product) => void;
  onAddMultipleProducts: (products: Product[]) => void;
  onRemoveProduct?: (productId: number) => void;
  onDecreaseProduct?: (productId: number) => void;
  onOpenDedicatedPage?: () => void;
}

export const TransferProductPickerModal: React.FC<TransferProductPickerModalProps> = ({
  isOpen,
  onClose,
  sourceWarehouseCode,
  sourceWarehouseName,
  stockMap,
  loadingStock = false,
  existingLinesMap,
  onAddProduct,
  onAddMultipleProducts,
  onRemoveProduct,
  onDecreaseProduct,
  onOpenDedicatedPage
}) => {
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Danh mục nhóm hàng thật từ Backend (S2-06 /api/product-categories)
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);

  // Phân trang sản phẩm
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Map lưu các sản phẩm đã tick chọn (hỗ trợ chọn nhiều qua các trang khác nhau)
  const [selectedProductsMap, setSelectedProductsMap] = useState<Map<number, Product>>(new Map());

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Tải danh mục nhóm hàng thật từ backend
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingCategories(true);
    fetchCategories()
      .then((data) => {
        if (isMounted) {
          setCategories(data || []);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh mục nhóm hàng thật từ backend:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingCategories(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Sắp xếp nhóm hàng theo phân cấp cây DFS cho SearchSelect
  const hierarchicalCategoryOptions = useMemo(() => {
    if (!categories.length) return [];
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
        if (depth === 2) prefix = '  └─ ';
        else if (depth === 3) prefix = '    └── ';
        else if (depth > 3) prefix = `${'  '.repeat(depth - 1)}── `;

        const badge = item.level === 1 ? '[Ngành]' : item.level === 2 ? '[Nhóm]' : '';
        const countText = item.productCount > 0 ? ` (${item.productCount} SP)` : '';
        result.push({
          value: item.id,
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

  // 2. Hàm tải dữ liệu sản phẩm từ backend theo trang
  const fetchProducts = useCallback(
    async (targetPage: number, targetSize: number, kw: string, cat: string) => {
      setLoading(true);
      try {
        const res = await productService.getProducts({
          page: targetPage,
          size: targetSize,
          keyword: kw.trim() || undefined,
          category: cat !== 'ALL' ? cat : undefined,
          status: 'ACTIVE'
        });

        setProducts(res.products || []);
        setPage(targetPage);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      } catch (err) {
        console.error('Lỗi tải danh mục sản phẩm chuyển kho:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Khởi tạo lại khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    setSelectedProductsMap(new Map());
    setKeyword('');
    setSelectedCategory('ALL');
    setPage(0);
    fetchProducts(0, pageSize, '', 'ALL');
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [isOpen, fetchProducts, pageSize]);

  // Xử lý tìm kiếm với debounce 300ms
  const handleKeywordChange = (newKw: string) => {
    setKeyword(newKw);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(0);
      fetchProducts(0, pageSize, newKw, selectedCategory);
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = 0;
      }
    }, 300);
  };

  // Đổi nhóm hàng từ hộp select
  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setPage(0);
    fetchProducts(0, pageSize, keyword, newCat);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  // Đổi trang
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProducts(newPage, pageSize, keyword, selectedCategory);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  // Đổi số dòng trên trang
  const handleSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
    fetchProducts(0, newSize, keyword, selectedCategory);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  // Danh sách sản phẩm còn hàng trên trang hiện tại
  const availableProductsOnPage = useMemo(() => {
    return products.filter((p) => (stockMap[Number(p.id)] ?? 0) > 0);
  }, [products, stockMap]);

  // Toggle tick chọn 1 sản phẩm (chỉ cho phép nếu còn hàng)
  const toggleSelectProduct = (product: Product) => {
    const prodId = Number(product.id);
    const availableStock = stockMap[prodId] ?? 0;
    if (availableStock <= 0) return; // Sản phẩm hết hàng không cho chọn

    setSelectedProductsMap((prev) => {
      const next = new Map(prev);
      if (next.has(prodId)) {
        next.delete(prodId);
      } else {
        next.set(prodId, product);
      }
      return next;
    });
  };

  // Toggle tick chọn tất cả sản phẩm còn hàng đang hiển thị trên trang hiện tại
  const isAllCurrentPageSelected =
    availableProductsOnPage.length > 0 &&
    availableProductsOnPage.every((p) => selectedProductsMap.has(Number(p.id)));

  const toggleSelectAllCurrentPage = () => {
    if (availableProductsOnPage.length === 0) return;
    setSelectedProductsMap((prev) => {
      const next = new Map(prev);
      if (isAllCurrentPageSelected) {
        availableProductsOnPage.forEach((p) => next.delete(Number(p.id)));
      } else {
        availableProductsOnPage.forEach((p) => next.set(Number(p.id), p));
      }
      return next;
    });
  };

  // Thêm đồng loạt các sản phẩm đã tick (lọc bỏ sản phẩm hết hàng nếu có)
  const handleAddSelected = () => {
    if (selectedProductsMap.size === 0) return;
    const selectedList = Array.from(selectedProductsMap.values()).filter(
      (p) => (stockMap[Number(p.id)] ?? 0) > 0
    );
    if (selectedList.length > 0) {
      onAddMultipleProducts(selectedList);
    }
    setSelectedProductsMap(new Map());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                <span>Chọn Sản Phẩm Điều Chuyển Kho</span>
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <span>Kho xuất hàng:</span>
                <b className="text-blue-700">[{sourceWarehouseCode}] {sourceWarehouseName}</b>
                <span className="text-gray-300">•</span>
                <span>Tồn khả dụng cập nhật tức thì</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenDedicatedPage && (
              <button
                type="button"
                onClick={onOpenDedicatedPage}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 transition cursor-pointer"
                title="Mở ra trang riêng toàn màn hình"
              >
                <Maximize2 size={13} />
                <span>Mở trang riêng</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* THANH TÌM KIẾM & BỘ LỌC HỘP SELECT NHÓM HÀNG */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Ô tìm kiếm từ khóa */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                placeholder="Tìm nhanh theo mã SKU, tên sản phẩm..."
                className="w-full pl-10 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs min-h-[38px]"
                autoFocus
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => handleKeywordChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Hộp Select nhóm hàng thật từ database */}
            <div className="w-full sm:w-80 shrink-0">
              <SearchSelect
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                searchPlaceholder="Tìm kiếm nhóm hàng..."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs min-h-[38px]"
              >
                <option value="ALL">
                  {loadingCategories
                    ? 'Đang tải nhóm hàng...'
                    : `Tất cả nhóm hàng (${categories.length})`}
                </option>
                {hierarchicalCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SearchSelect>
            </div>
          </div>

          {/* Thanh tác vụ khi tick chọn nhiều sản phẩm */}
          {selectedProductsMap.size > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-blue-900 font-bold">
                <span className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[11px] font-black">
                  {selectedProductsMap.size}
                </span>
                <span>Đã tick chọn <strong>{selectedProductsMap.size}</strong> sản phẩm</span>
                <button
                  type="button"
                  onClick={() => setSelectedProductsMap(new Map())}
                  className="text-gray-500 hover:text-gray-800 underline ml-2 font-normal cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddSelected}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm {selectedProductsMap.size} sản phẩm đã chọn vào phiếu</span>
              </button>
            </div>
          )}
        </div>

        {/* DANH SÁCH BẢNG SẢN PHẨM */}
        <div
          ref={tableContainerRef}
          className="flex-1 overflow-y-auto max-h-[50vh] min-h-[280px]"
        >
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-gray-500 font-semibold">Đang tải danh mục sản phẩm...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center space-y-2">
              <Package size={40} className="text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">Không tìm thấy sản phẩm nào</p>
              <p className="text-xs text-gray-400">Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn nhóm hàng khác.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100/90 text-gray-700 font-bold uppercase text-[11px] sticky top-0 z-10 border-b border-gray-200 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      disabled={availableProductsOnPage.length === 0}
                      onChange={toggleSelectAllCurrentPage}
                      className={`w-4 h-4 rounded text-blue-600 accent-blue-600 ${
                        availableProductsOnPage.length === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      title={
                        availableProductsOnPage.length === 0
                          ? 'Tất cả sản phẩm trên trang này đều đã hết hàng'
                          : isAllCurrentPageSelected
                          ? 'Bỏ chọn toàn bộ sản phẩm trang này'
                          : 'Tick chọn toàn bộ sản phẩm còn hàng trên trang này'
                      }
                    />
                  </th>
                  <th className="py-2.5 px-2 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-32">Mã SKU</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Tên sản phẩm</th>
                  <th className="py-2.5 px-3 w-40">Nhóm hàng</th>
                  <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 w-36 text-center bg-blue-50/40">
                    Tồn khả dụng kho đi
                  </th>
                  <th className="py-2.5 px-3 w-36 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p, idx) => {
                  const prodId = Number(p.id);
                  const isChecked = selectedProductsMap.has(prodId);
                  const existingQty = existingLinesMap.get(prodId) ?? 0;
                  const availableStock = stockMap[prodId] ?? 0;
                  const isOutOfStock = availableStock <= 0;
                  const isMaxStockReached = existingQty >= availableStock;
                  const rowNumber = page * pageSize + idx + 1;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isOutOfStock
                          ? 'bg-gray-50/70 opacity-60'
                          : isChecked
                          ? 'bg-blue-50/40 hover:bg-blue-50/60'
                          : existingQty > 0
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'hover:bg-blue-50/30'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isOutOfStock}
                          onChange={() => toggleSelectProduct(p)}
                          className={`w-4 h-4 rounded text-blue-600 accent-blue-600 ${
                            isOutOfStock ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title={isOutOfStock ? 'Sản phẩm đã hết hàng tại kho xuất, không thể điều chuyển' : undefined}
                        />
                      </td>

                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                          {p.sku}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{p.name}</p>
                        {p.packagingSpec && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Quy cách: {p.packagingSpec}</p>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-gray-600 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <FolderTree size={12} className="text-gray-400 shrink-0" />
                          <span>{p.category || 'Chưa phân loại'}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          {p.baseUnit}
                        </span>
                      </td>

                      {/* Tồn khả dụng tại kho đi */}
                      <td className="py-2.5 px-3 text-center bg-blue-50/20">
                        {loadingStock ? (
                          <span className="text-gray-400 text-[11px]">Đang kiểm tra tồn...</span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            0 {p.baseUnit} (Hết hàng)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {availableStock.toLocaleString('vi-VN')} {p.baseUnit}
                          </span>
                        )}
                      </td>

                      {/* Nút Thao Tác Thêm */}
                      <td className="py-2.5 px-3 text-center">
                        {isOutOfStock ? (
                          existingQty > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] inline-flex items-center gap-1">
                              <span>Đã thêm ({existingQty})</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-400 rounded-lg font-bold text-xs cursor-not-allowed border border-gray-200 select-none"
                              title="Sản phẩm đã hết hàng tại kho xuất, không thể điều chuyển"
                            >
                              <span>Hết hàng</span>
                            </button>
                          )
                        ) : existingQty > 0 ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1">
                              <Check size={12} />
                              <span>Đã thêm ({existingQty})</span>
                            </span>
                            {onDecreaseProduct && (
                              <button
                                type="button"
                                onClick={() => onDecreaseProduct(prodId)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 cursor-pointer active:scale-95 transition"
                                title="Giảm số lượng đi 1"
                              >
                                -1
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isMaxStockReached}
                              onClick={() => onAddProduct(p)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                                isMaxStockReached
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                              }`}
                              title={
                                isMaxStockReached
                                  ? `Đã thêm tối đa số lượng tồn khả dụng (${availableStock} ${p.baseUnit})`
                                  : 'Tăng số lượng thêm 1'
                              }
                            >
                              +1
                            </button>
                            {onRemoveProduct && (
                              <button
                                type="button"
                                onClick={() => onRemoveProduct(prodId)}
                                className="p-1 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 bg-rose-50 transition cursor-pointer active:scale-95"
                                title="Bỏ mặt hàng này khỏi phiếu chuyển"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAddProduct(p)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Plus size={13} />
                            <span>Thêm</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* BỘ PHÂN TRANG (PAGINATION BAR) */}
        <div className="border-t border-gray-200">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={pageSize}
            sizeOptions={MODAL_PAGE_SIZE_OPTIONS}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
            itemLabel="sản phẩm"
            disabled={loading}
          />
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Đã thêm <strong className="text-blue-700 font-mono font-bold">{existingLinesMap.size}</strong> mặt hàng vào phiếu chuyển kho
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Hoàn tất & Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
