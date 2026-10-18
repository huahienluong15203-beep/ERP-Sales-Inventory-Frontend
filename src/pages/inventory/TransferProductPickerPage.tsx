import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Plus,
  Check,
  Package,
  Loader2,
  FolderTree,
  Warehouse,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { productService } from '../../services/productService';
import { fetchCategories, type CategoryWithCount } from '../../services/categoryApi';
import { fetchMinStockConfigs } from '../../services/stockAlertApi';
import { fetchStockLedgerWarehouses } from '../../services/stockLedgerApi';
import { SYSTEM_WAREHOUSES, type WarehouseOption } from '../../types/inventory';
import { Pagination } from '../../components/common/Pagination';
import { SearchSelect } from '../../components/common/SearchSelect';
import type { Product } from '../../types/product';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';

export interface TransferLineDraft {
  id: string;
  productId: number;
  productSku: string;
  productName: string;
  category?: string;
  unit: string;
  sourceAvailableStock: number;
  transferQuantity: number;
  batchNumber: string;
  expiredDate: string;
}

export interface StockTransferDraftData {
  sourceWarehouseCode: string;
  destWarehouseCode: string;
  transferDate: string;
  expectedReceiveDate: string;
  vehiclePlate: string;
  transporterName: string;
  generalNote: string;
  lines: TransferLineDraft[];
}

const DRAFT_STORAGE_KEY = 'erp_stock_transfer_draft';
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [30, 50, 100];

export const TransferProductPickerPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Khôi phục draft từ sessionStorage
  const [draftData, setDraftData] = useState<StockTransferDraftData>(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Lỗi đọc draft chuyển kho từ sessionStorage:', e);
    }
    return {
      sourceWarehouseCode: 'WH-MB01',
      destWarehouseCode: 'WH-MT01',
      transferDate: new Date().toISOString().slice(0, 10),
      expectedReceiveDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      vehiclePlate: '',
      transporterName: '',
      generalNote: '',
      lines: []
    };
  });

  const [lines, setLines] = useState<TransferLineDraft[]>(draftData.lines || []);
  const [sourceWarehouses, setSourceWarehouses] = useState<WarehouseOption[]>(SYSTEM_WAREHOUSES);

  // Bộ lọc tìm kiếm & nhóm hàng
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Nhóm hàng thật từ backend
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);

  // Phân trang sản phẩm
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Tồn kho khả dụng kho xuất
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [loadingStock, setLoadingStock] = useState<boolean>(false);

  // Checkbox chọn nhiều
  const [selectedProductsMap, setSelectedProductsMap] = useState<Map<number, Product>>(new Map());
  const searchTimeoutRef = useRef<any>(null);

  // Đồng bộ lines vào sessionStorage mỗi khi thay đổi
  const syncLinesToDraft = useCallback(
    (newLines: TransferLineDraft[]) => {
      setLines(newLines);
      const updatedDraft: StockTransferDraftData = {
        ...draftData,
        lines: newLines
      };
      setDraftData(updatedDraft);
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updatedDraft));
      } catch (e) {
        console.warn('Lỗi lưu draft chuyển kho vào sessionStorage:', e);
      }
    },
    [draftData]
  );

  // Tải danh sách kho thực tế
  useEffect(() => {
    fetchStockLedgerWarehouses()
      .then((data) => {
        if (data && data.length > 0) {
          setSourceWarehouses(
            data.map((w) => ({
              id: w.id,
              code: w.code,
              name: w.name,
              address: w.address,
              status: w.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách kho xuất, dùng fallback:', err);
      });
  }, []);

  const sourceWarehouseName = useMemo(() => {
    const wh = sourceWarehouses.find((w) => w.code === draftData.sourceWarehouseCode);
    return wh ? wh.name : draftData.sourceWarehouseCode;
  }, [sourceWarehouses, draftData.sourceWarehouseCode]);

  // Tải tồn kho khả dụng của kho xuất
  useEffect(() => {
    if (!draftData.sourceWarehouseCode) return;
    setLoadingStock(true);
    fetchMinStockConfigs({ warehouseCode: draftData.sourceWarehouseCode })
      .then((configs) => {
        const map: Record<number, number> = {};
        (configs || []).forEach((c) => {
          if (c.productId != null) {
            map[Number(c.productId)] = Number(c.availableStock ?? 0);
          }
        });
        setStockMap(map);
      })
      .catch((err) => {
        console.error('Lỗi tải tồn kho khả dụng kho xuất:', err);
      })
      .finally(() => {
        setLoadingStock(false);
      });
  }, [draftData.sourceWarehouseCode]);

  // Tải danh mục nhóm hàng thật
  useEffect(() => {
    setLoadingCategories(true);
    fetchCategories()
      .then((data) => {
        setCategories(data || []);
      })
      .catch((err) => {
        console.error('Lỗi tải nhóm hàng thật:', err);
      })
      .finally(() => {
        setLoadingCategories(false);
      });
  }, []);

  // Xây dựng cây nhóm hàng DFS
  const hierarchicalCategoryOptions = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const map = new Map<string | null, CategoryWithCount[]>();
    for (const cat of categories) {
      const pId = cat.parentId ?? null;
      if (!map.has(pId)) map.set(pId, []);
      map.get(pId)!.push(cat);
    }

    const result: Array<{
      value: string;
      label: string;
      level: number;
      productCount: number;
    }> = [];

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
          productCount: item.productCount
        });
        traverse(item.id, depth + 1);
      }
    };
    traverse(null, 1);
    return result;
  }, [categories]);

  // Tải danh sách sản phẩm theo trang
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
        console.error('Lỗi tải sản phẩm:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchProducts(0, pageSize, '', 'ALL');
  }, [fetchProducts, pageSize]);

  // Tìm kiếm với debounce 300ms
  const handleKeywordChange = (newKw: string) => {
    setKeyword(newKw);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(0);
      fetchProducts(0, pageSize, newKw, selectedCategory);
    }, 300);
  };

  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setPage(0);
    fetchProducts(0, pageSize, keyword, newCat);
  };

  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage, pageSize, keyword, selectedCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
    fetchProducts(0, newSize, keyword, selectedCategory);
  };

  // Map mặt hàng đã có trong phiếu (productId -> transferQuantity)
  const existingLinesMap = useMemo(() => {
    const map = new Map<number, number>();
    lines.forEach((l) => map.set(l.productId, l.transferQuantity));
    return map;
  }, [lines]);

  const totalTransferQty = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.transferQuantity) || 0), 0);
  }, [lines]);

  // Thêm 1 sản phẩm
  const handleAddProduct = (prod: Product) => {
    const availStock = stockMap[Number(prod.id)] ?? 0;
    if (availStock <= 0) {
      showToast('Hết hàng', `Sản phẩm [${prod.sku}] đã hết hàng tại kho xuất, không thể điều chuyển!`, 'error', 3000);
      return;
    }

    const existingIndex = lines.findIndex((l) => l.productId === Number(prod.id));
    if (existingIndex >= 0) {
      if (lines[existingIndex].transferQuantity >= availStock) {
        showToast('Đạt tồn tối đa', `Số lượng đã đạt tồn khả dụng tối đa (${availStock} ${lines[existingIndex].unit})`, 'error', 3000);
        return;
      }
      const updated = lines.map((l, idx) =>
        idx === existingIndex ? { ...l, transferQuantity: l.transferQuantity + 1 } : l
      );
      syncLinesToDraft(updated);
      showToast('Đã tăng số lượng', `Sản phẩm [${prod.sku}] số lượng tăng lên ${lines[existingIndex].transferQuantity + 1}`, 'info', 2000);
      return;
    }

    const newLine: TransferLineDraft = {
      id: `draft-line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: Number(prod.id),
      productSku: prod.sku,
      productName: prod.name,
      category: prod.category,
      unit: prod.baseUnit || 'Thùng',
      sourceAvailableStock: availStock,
      transferQuantity: 1,
      batchNumber: `LOT-TRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      expiredDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    };

    syncLinesToDraft([...lines, newLine]);
    showToast('Đã thêm sản phẩm', `Đã thêm [${prod.sku}] vào phiếu chuyển kho`, 'success', 2000);
  };

  // Checkbox logic
  const availableProductsOnPage = useMemo(() => {
    return products.filter((p) => (stockMap[Number(p.id)] ?? 0) > 0);
  }, [products, stockMap]);

  const isAllCurrentPageSelected = useMemo(() => {
    if (availableProductsOnPage.length === 0) return false;
    return availableProductsOnPage.every((p) => selectedProductsMap.has(Number(p.id)));
  }, [availableProductsOnPage, selectedProductsMap]);

  const toggleSelectAllCurrentPage = () => {
    const nextMap = new Map(selectedProductsMap);
    if (isAllCurrentPageSelected) {
      availableProductsOnPage.forEach((p) => nextMap.delete(Number(p.id)));
    } else {
      availableProductsOnPage.forEach((p) => nextMap.set(Number(p.id), p));
    }
    setSelectedProductsMap(nextMap);
  };

  const toggleSelectProduct = (prod: Product) => {
    const prodId = Number(prod.id);
    const availStock = stockMap[prodId] ?? 0;
    if (availStock <= 0) return;

    const nextMap = new Map(selectedProductsMap);
    if (nextMap.has(prodId)) {
      nextMap.delete(prodId);
    } else {
      nextMap.set(prodId, prod);
    }
    setSelectedProductsMap(nextMap);
  };

  // Thêm tất cả sản phẩm đã tick chọn
  const handleAddSelected = () => {
    const prods = Array.from(selectedProductsMap.values());
    if (prods.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedOutOfStock = 0;

    const next = [...lines];
    prods.forEach((prod) => {
      const availStock = stockMap[Number(prod.id)] ?? 0;
      if (availStock <= 0) {
        skippedOutOfStock++;
        return;
      }
      const existingIndex = next.findIndex((l) => l.productId === Number(prod.id));
      if (existingIndex >= 0) {
        if (next[existingIndex].transferQuantity < availStock) {
          next[existingIndex] = {
            ...next[existingIndex],
            transferQuantity: next[existingIndex].transferQuantity + 1
          };
          updatedCount++;
        }
      } else {
        next.push({
          id: `draft-line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: Number(prod.id),
          productSku: prod.sku,
          productName: prod.name,
          category: prod.category,
          unit: prod.baseUnit || 'Thùng',
          sourceAvailableStock: availStock,
          transferQuantity: 1,
          batchNumber: '',
          expiredDate: ''
        });
        addedCount++;
      }
    });

    syncLinesToDraft(next);
    setSelectedProductsMap(new Map());

    if (addedCount > 0 || updatedCount > 0) {
      showToast(
        'Đã thêm sản phẩm',
        `Đã thêm ${addedCount} sản phẩm mới và cập nhật ${updatedCount} sản phẩm${
          skippedOutOfStock > 0 ? ` (Bỏ qua ${skippedOutOfStock} hết hàng)` : ''
        }`,
        'success',
        3000
      );
    }
  };

  const handleReturnToCreatePage = () => {
    // Lưu draft và quay về
    try {
      const updatedDraft: StockTransferDraftData = {
        ...draftData,
        lines
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updatedDraft));
    } catch (e) {
      console.warn('Lỗi lưu draft trước khi quay về:', e);
    }
    navigate('/inventory/transfers/create');
  };

  return (
    <div className="space-y-5 pb-20">
      {/* THANH BREADCRUMB & HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReturnToCreatePage}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer border border-gray-200 shadow-2xs active:scale-95"
              title="Quay lại phiếu chuyển kho"
            >
              <ArrowLeft size={16} />
              <span>Quay lại lập phiếu</span>
              {lines.length > 0 && (
                <span className="bg-blue-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {lines.length} mặt hàng
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-400 border-l border-gray-200 pl-3">
              <button
                type="button"
                onClick={() => navigate('/inventory/transfers')}
                className="hover:text-blue-600 transition text-gray-500"
              >
                Phiếu chuyển kho
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={handleReturnToCreatePage}
                className="hover:text-blue-600 transition text-gray-500"
              >
                Lập phiếu chuyển
              </button>
              <span>/</span>
              <span className="font-bold text-gray-800">Chọn sản phẩm</span>
            </div>
          </div>
        </div>

        {/* THÔNG TIN KHO XUẤT */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Warehouse size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                Chọn Sản Phẩm Điều Chuyển Kho
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Kho xuất hàng:</span>
                <b className="text-blue-700">[{draftData.sourceWarehouseCode}] {sourceWarehouseName}</b>
                <span className="text-gray-300">•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Tồn khả dụng cập nhật tức thì
                </span>
                {loadingStock && <Loader2 size={12} className="animate-spin text-blue-500" />}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 text-xs">
            <span className="text-gray-500">Đã đưa vào phiếu:</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
              {lines.length} mặt hàng
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-mono font-bold text-gray-800">
              Tổng SL: {totalTransferQty.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Tìm kiếm từ khóa */}
          <div className="md:col-span-6 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Tìm nhanh theo mã SKU, tên sản phẩm, quy cách đóng gói..."
              className="w-full pl-10 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs min-h-[38px]"
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

          {/* Chọn nhóm hàng DFS */}
          <div className="md:col-span-4">
            <SearchSelect
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              searchPlaceholder="Tìm kiếm nhóm hàng..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs min-h-[38px]"
            >
              <option value="ALL">
                {loadingCategories ? 'Đang tải nhóm hàng...' : `Tất cả nhóm hàng (${categories.length})`}
              </option>
              {hierarchicalCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SearchSelect>
          </div>

          {/* Chọn số dòng hiển thị */}
          <div className="md:col-span-2 flex items-center justify-end gap-2 text-xs">
            <span className="text-gray-500 shrink-0">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / trang
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thanh tác vụ khi tick chọn nhiều */}
        {selectedProductsMap.size > 0 && (
          <div className="flex flex-wrap items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs gap-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <span className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[11px] font-black">
                {selectedProductsMap.size}
              </span>
              <span>Đã chọn <strong>{selectedProductsMap.size}</strong> sản phẩm từ danh sách</span>
              <button
                type="button"
                onClick={() => setSelectedProductsMap(new Map())}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline font-normal cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddSelected}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>Thêm {selectedProductsMap.size} sản phẩm đã chọn vào phiếu chuyển</span>
            </button>
          </div>
        )}
      </div>

      {/* DANH SÁCH BẢNG SẢN PHẨM */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 size={36} className="animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-gray-500 font-semibold">Đang tải danh mục sản phẩm chuyển kho...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <Package size={44} className="text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">Không tìm thấy sản phẩm nào phù hợp</p>
            <p className="text-xs text-gray-400">Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn nhóm hàng khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100/90 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
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
                  <th className="py-3 px-2 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-36">Mã SKU</th>
                  <th className="py-3 px-3 min-w-[240px]">Tên sản phẩm</th>
                  <th className="py-3 px-3 w-48">Nhóm hàng</th>
                  <th className="py-3 px-3 w-20 text-center">ĐVT</th>
                  <th className="py-3 px-3 w-40 text-center bg-blue-50/40">
                    Tồn khả dụng kho đi
                  </th>
                  <th className="py-3 px-3 w-52 text-center sticky right-0 bg-gray-100 z-10 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    Thao tác
                  </th>
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
                      className={`group transition-colors ${
                        isOutOfStock
                          ? 'bg-gray-50/70 opacity-60'
                          : isChecked
                          ? 'bg-blue-50/40 hover:bg-blue-50/60'
                          : existingQty > 0
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'hover:bg-blue-50/30'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
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

                      <td className="py-3 px-2 text-center text-gray-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                          {p.sku}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{p.name}</p>
                        {p.packagingSpec && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Quy cách: {p.packagingSpec}</p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-gray-600 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <FolderTree size={12} className="text-gray-400 shrink-0" />
                          <span>{p.category || 'Chưa phân loại'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          {p.baseUnit}
                        </span>
                      </td>

                      {/* Tồn khả dụng tại kho xuất */}
                      <td className="py-3 px-3 text-center bg-blue-50/20">
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

                      {/* Thao tác Thêm */}
                      <td className="py-3 px-3 text-center sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                        {isOutOfStock ? (
                          existingQty > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1">
                              <Check size={12} />
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
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1">
                              <Check size={12} />
                              <span>Đã thêm ({existingQty})</span>
                            </span>
                            <button
                              type="button"
                              disabled={isMaxStockReached}
                              onClick={() => handleAddProduct(p)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                                isMaxStockReached
                                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 shadow-2xs'
                              }`}
                              title={
                                isMaxStockReached
                                  ? `Đã thêm tối đa tồn khả dụng (${availableStock} ${p.baseUnit})`
                                  : 'Thêm tiếp vào phiếu'
                              }
                            >
                              <Plus size={12} />
                              <span>Thêm</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddProduct(p)}
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
          </div>
        )}

        {/* PHÂN TRANG */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-gray-500">
            Hiển thị <b>{products.length > 0 ? page * pageSize + 1 : 0}</b>–
            <b>{Math.min((page + 1) * pageSize, totalElements)}</b> / <b>{totalElements.toLocaleString('vi-VN')}</b> sản phẩm
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={pageSize}
            sizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={handlePageChange}
            onSizeChange={handlePageSizeChange}
            itemLabel="sản phẩm"
            disabled={loading}
          />
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG CỐ ĐỊNH Ở ĐÁY (STICKY FOOTER BAR) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-6 py-3 shadow-lg z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500 font-medium">Trong phiếu chuyển kho:</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              {lines.length} mặt hàng
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-bold text-gray-800">
              Tổng số lượng: <span className="font-mono text-sm text-blue-600">{totalTransferQty.toLocaleString('vi-VN')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReturnToCreatePage}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              Hủy / Giữ nguyên
            </button>
            <button
              type="button"
              onClick={handleReturnToCreatePage}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
            >
              <span>Hoàn tất & Quay về lập phiếu</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
