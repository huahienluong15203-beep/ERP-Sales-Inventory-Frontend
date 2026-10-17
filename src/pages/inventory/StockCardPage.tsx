import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookOpenCheck,
  Search,
  RefreshCw,
  Printer,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  X,
  Eye,
  User
} from 'lucide-react';
import type {
  StockCardResponse,
  StockCardRow,
  StockCardFilterParams,
  StockMovementType
} from '../../types/stockCard';
import { MOVEMENT_TYPES_MAP, DOC_TYPES_MAP } from '../../types/stockCard';
import type { WarehouseOptionResponse } from '../../types/stockLedger';
import { fetchStockCard, exportStockCardToExcel } from '../../services/stockCardApi';
import { fetchStockLedgerWarehouses } from '../../services/stockLedgerApi';
import { productService, type ProductOptionItem } from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from '../../routes/Router';
import { Pagination } from '../../components/common/Pagination';

/**
 * S6-02: Thẻ kho chi tiết (Stock Card)
 * - Quản lý mọi biến động nhập, xuất, chuyển kho, điều chỉnh kiểm kê theo thứ tự thời gian
 * - Tồn sau từng phát sinh và liên kết trực tiếp tới chứng từ gốc
 * - Tồn đầu kỳ, tổng nhập, tổng xuất, tồn cuối kỳ và tồn thực tế hiện tại
 */
export const StockCardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, user } = useAuth();

  // Danh sách kho có thể truy cập
  const [warehouses, setWarehouses] = useState<WarehouseOptionResponse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState<boolean>(true);

  // Bộ lọc
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<ProductOptionItem | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29); // 30 ngày gần nhất
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [movementType, setMovementType] = useState<string>('ALL');
  const [activeQuickRange, setActiveQuickRange] = useState<number | 'thisMonth' | 'lastMonth' | 'today' | null>(30);

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(50);

  // Dữ liệu thẻ kho từ backend
  const [data, setData] = useState<StockCardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tìm kiếm sản phẩm nhanh (Autocomplete)
  const [productSearchKw, setProductSearchKw] = useState<string>('');
  const [productOptions, setProductOptions] = useState<ProductOptionItem[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean>(false);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Modal xem chi tiết dòng phát sinh
  const [selectedRowDetail, setSelectedRowDetail] = useState<StockCardRow | null>(null);

  // Modal in Thẻ kho
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // 1. Tải danh sách kho mà tài khoản được quyền xem
  useEffect(() => {
    let isMounted = true;
    setLoadingWarehouses(true);

    fetchStockLedgerWarehouses()
      .then((whs) => {
        if (!isMounted) return;
        setWarehouses(whs);

        // Đọc query params từ URL nếu có
        const params = new URLSearchParams(location.search);
        const whParam = params.get('warehouseId');
        const whCodeParam = params.get('warehouseCode');

        if (whParam) {
          setSelectedWarehouseId(whParam);
        } else if (whCodeParam) {
          const matched = whs.find((w) => w.code.toUpperCase() === whCodeParam.toUpperCase());
          if (matched) {
            setSelectedWarehouseId(String(matched.id));
          }
        } else {
          // Mặc định ở "Tất cả các kho" khi mở tab
          setSelectedWarehouseId('');
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách kho:', err);
        if (isMounted) {
          showToast('Lỗi kho', 'Không thể tải danh sách kho được phân quyền', 'error');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingWarehouses(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Nhận diện SKU / ProductId từ URL khi chuyển từ trang khác sang
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prodIdParam = params.get('productId');
    const skuParam = params.get('sku');
    const fromParam = params.get('fromDate');
    const toParam = params.get('toDate');
    const typeParam = params.get('type');

    if (fromParam) setFromDate(fromParam);
    if (toParam) setToDate(toParam);
    if (typeParam) setMovementType(typeParam);

    if (prodIdParam) {
      setSelectedProductId(prodIdParam);
      productService.getProductById(prodIdParam).then((p) => {
        if (p) {
          setSelectedProduct({
            id: Number(p.id),
            sku: p.sku,
            name: p.name,
            baseUnit: p.baseUnit,
            category: p.category
          });
          setProductSearchKw(`${p.sku} - ${p.name}`);
        }
      });
    } else if (skuParam) {
      productService.searchProductOptions(skuParam, 5).then((opts) => {
        const found = opts.find((o) => o.sku.toUpperCase() === skuParam.toUpperCase()) || opts[0];
        if (found) {
          setSelectedProductId(String(found.id));
          setSelectedProduct(found);
          setProductSearchKw(`${found.sku} - ${found.name}`);
        }
      });
    }
  }, [location.search]);

  // Đóng dropdown tìm sản phẩm khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Debounce tìm kiếm gợi ý sản phẩm
  useEffect(() => {
    if (!productSearchKw.trim() || selectedProduct?.sku === productSearchKw.split(' - ')[0]) {
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const results = await productService.searchProductOptions(productSearchKw.trim(), 15);
        setProductOptions(results);
        setShowProductDropdown(true);
      } catch (err) {
        console.warn('Lỗi tìm sản phẩm:', err);
      } finally {
        setIsSearchingProduct(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearchKw, selectedProduct]);

  // 4. Hàm tải dữ liệu Thẻ kho từ Backend
  const loadStockCard = useCallback(
    async (
      whId = selectedWarehouseId,
      prodId = selectedProductId,
      from = fromDate,
      to = toDate,
      type = movementType,
      targetPage = page,
      targetSize = size
    ) => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const params: StockCardFilterParams = {
          warehouseId: whId || undefined,
          productId: prodId || undefined,
          fromDate: from || undefined,
          toDate: to || undefined,
          type: type !== 'ALL' ? type : undefined,
          page: targetPage,
          size: targetSize
        };

        const res = await fetchStockCard(params);
        setData(res);
      } catch (err: unknown) {
        console.error('Lỗi tải thẻ kho:', err);
        const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu thẻ kho';
        setErrorMsg(msg);
        showToast('Lỗi thẻ kho', msg, 'error');
      } finally {
        setLoading(false);
      }
    },
    [selectedWarehouseId, selectedProductId, fromDate, toDate, movementType, page, size, showToast]
  );

  // Tải dữ liệu khi bộ lọc hoặc phân trang thay đổi
  useEffect(() => {
    loadStockCard(selectedWarehouseId, selectedProductId, fromDate, toDate, movementType, page, size);
  }, [selectedWarehouseId, selectedProductId, fromDate, toDate, movementType, page, size, loadStockCard]);

  // Thao tác nút Lọc
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadStockCard(selectedWarehouseId, selectedProductId, fromDate, toDate, movementType, 0, size);
  };

  // Chọn khoảng ngày nhanh
  const setQuickDateRange = (days: number | 'thisMonth' | 'lastMonth' | 'today') => {
    setActiveQuickRange(days);
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);

    if (days === 'today') {
      setFromDate(toStr);
      setToDate(toStr);
    } else if (days === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(firstDay.toISOString().slice(0, 10));
      setToDate(toStr);
    } else if (days === 'lastMonth') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(firstDayLastMonth.toISOString().slice(0, 10));
      setToDate(lastDayLastMonth.toISOString().slice(0, 10));
    } else {
      const from = new Date();
      from.setDate(today.getDate() - (days - 1));
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(toStr);
    }
    setPage(0);
  };

  // Xóa sản phẩm đang chọn
  const handleClearProduct = () => {
    setSelectedProductId('');
    setSelectedProduct(null);
    setProductSearchKw('');
    setProductOptions([]);
    setShowProductDropdown(false);
    setPage(0);
  };

  // Chọn sản phẩm từ gợi ý
  const handleSelectProduct = (prod: ProductOptionItem) => {
    setSelectedProductId(String(prod.id));
    setSelectedProduct(prod);
    setProductSearchKw(`${prod.sku} - ${prod.name}`);
    setShowProductDropdown(false);
    setPage(0);
  };

  // Xuất Excel Thẻ kho
  const handleExportExcel = () => {
    if (!data) {
      showToast('Thông báo', 'Chưa có dữ liệu để xuất file Excel', 'info');
      return;
    }
    const currentWh = warehouses.find((w) => String(w.id) === String(selectedWarehouseId));
    exportStockCardToExcel(data, {
      warehouseName: currentWh?.name,
      warehouseCode: currentWh?.code,
      productName: selectedProduct?.name,
      productSku: selectedProduct?.sku,
      baseUnit: selectedProduct?.baseUnit ?? undefined
    });
    showToast('Xuất Excel thành công', 'Tệp Thẻ kho chi tiết đã được tải về máy tính của bạn', 'success');
  };

  // Mở chứng từ gốc
  const handleOpenDocument = (row: StockCardRow) => {
    if (!row.docType || !row.docId) {
      showToast('Không có liên kết', 'Nghiệp vụ này không có mã chứng từ gốc tương ứng', 'info');
      return;
    }

    const docConfig = DOC_TYPES_MAP[row.docType];
    if (docConfig) {
      navigate(docConfig.path(row.docId));
    } else if (row.docType === 'SALES_ORDER') {
      navigate(`/orders/${row.docId}`);
    } else if (row.docType === 'GOODS_RECEIPT') {
      navigate(`/inventory/receipts/${row.docId}`);
    } else if (row.docType === 'STOCK_TRANSFER') {
      navigate(`/inventory/transfers?id=${row.docId}&code=${row.docCode || ''}`);
    } else if (row.docType === 'STOCK_TAKE') {
      navigate(`/inventory/stocktakes/${row.docId}`);
    } else {
      showToast('Thông báo', `Không xác định được đường dẫn cho loại chứng từ ${row.docType}`, 'info');
    }
  };

  // Định dạng số lượng hiển thị
  const formatQty = (qty: number | null | undefined): string => {
    if (qty === null || qty === undefined) return '—';
    return Number(qty).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
  };

  // Định dạng thời gian
  const formatTime = (isoString?: string): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      return `${time} ${date}`;
    } catch {
      return isoString.replace('T', ' ').substring(0, 19);
    }
  };

  // Tách giờ và ngày để hiển thị 2 dòng gọn gàng (dòng trên là giờ, dòng dưới là ngày tháng năm)
  const splitDateTime = (isoString?: string): { time: string; date: string } => {
    if (!isoString) return { time: '—', date: '' };
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      return { time, date };
    } catch {
      const parts = (isoString || '').replace('T', ' ').substring(0, 19).split(' ');
      return { time: parts[1] || '—', date: parts[0] || '' };
    }
  };

  // Tìm thông tin kho đang chọn
  const selectedWhInfo = useMemo(() => {
    return warehouses.find((w) => String(w.id) === String(selectedWarehouseId));
  }, [warehouses, selectedWarehouseId]);

  const rawRows = data?.movements?.content || [];
  const totalElements = data?.movements?.totalElements || 0;
  const totalPages = data?.movements?.totalPages || 1;

  // Sắp xếp mới nhất lên trước (movementAt DESC, id DESC)
  const rows = useMemo(() => {
    return [...rawRows].sort((a, b) => {
      const timeA = new Date(a.movementAt || 0).getTime();
      const timeB = new Date(b.movementAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [rawRows]);

  // Xác định chế độ Thẻ kho chi tiết (khi đã chọn đủ 1 Kho + 1 Sản phẩm và Backend đã tính số dư chuẩn)
  const isStockCardMode = Boolean(
    data?.openingBalance !== null && data?.openingBalance !== undefined
  );

  // Thống kê khi ở chế độ Nhật ký tổng hợp (xem toàn bộ hoặc chưa chọn sản phẩm cụ thể)
  const inTransactionsCount = useMemo(() => rows.filter((r) => (Number(r.quantityIn) || 0) > 0).length, [rows]);
  const outTransactionsCount = useMemo(() => rows.filter((r) => (Number(r.quantityOut) || 0) > 0).length, [rows]);

  // Phục vụ biểu mẫu in Thẻ kho nếu backend chưa trả tổng chung
  const fallbackTotalIn = useMemo(() => rows.reduce((s, r) => s + (Number(r.quantityIn) || 0), 0), [rows]);
  const fallbackTotalOut = useMemo(() => rows.reduce((s, r) => s + (Number(r.quantityOut) || 0), 0), [rows]);

  return (
    <div className="space-y-3.5 pb-10">
      {/* Nút thao tác chính - Tinh gọn đồng bộ toàn hệ thống */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          {selectedProduct && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200/80 rounded-lg text-xs h-9">
              <span className="font-mono font-bold text-[#F85606]">[{selectedProduct.sku}]</span>
              <span className="text-gray-800 font-semibold truncate max-w-xs">{selectedProduct.name}</span>
              {selectedProduct.baseUnit && (
                <span className="text-gray-400 text-[11px]">({selectedProduct.baseUnit})</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadStockCard()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-[#F85606] hover:border-orange-300 rounded-lg hover:bg-orange-50/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs h-9 disabled:opacity-50"
            title="Tải lại dữ liệu mới nhất"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#F85606]' : 'text-gray-500'} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-2xs h-9"
            title="Xem và in Thẻ kho theo biểu mẫu kế toán chuẩn"
          >
            <Printer size={14} className="text-gray-600" />
            <span>In thẻ kho</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50 shadow-xs h-9 active:scale-95"
            title="Xuất bảng thẻ kho ra Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. KHỐI THẺ CHỈ SỐ (KPI SUMMARY CARDS - 3 THẺ TINH GỌN) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Thẻ 1: Tổng phát sinh / Tồn đầu kỳ */}
        <div className="p-3.5 rounded-2xl border bg-white border-blue-200/80 shadow-2xs">
          <div className="text-[11px] text-gray-500 font-semibold flex items-center justify-between">
            <span>{isStockCardMode ? 'Tồn Đầu Kỳ' : 'Tổng Phát Sinh'}</span>
            <span className="text-[10px] text-gray-400 font-normal">
              {isStockCardMode ? `Từ ${fromDate}` : `Kỳ ${fromDate.slice(5)} → ${toDate.slice(5)}`}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {isStockCardMode ? (
              <>
                {formatQty(data?.openingBalance)}
                {selectedProduct?.baseUnit && (
                  <span className="text-xs font-semibold text-gray-400 ml-1.5">
                    {selectedProduct.baseUnit}
                  </span>
                )}
              </>
            ) : (
              <>
                {totalElements.toLocaleString('vi-VN')}
                <span className="text-xs font-semibold text-gray-400 ml-1.5">nghiệp vụ</span>
              </>
            )}
          </div>
        </div>

        {/* Thẻ 2: Lượt nhập / Tổng nhập */}
        <div className="p-3.5 rounded-2xl border bg-white border-emerald-200/80 shadow-2xs">
          <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingDown size={14} className="text-emerald-600 rotate-180" />
              <span>{isStockCardMode ? 'Tổng Nhập (+)' : 'Lượt Nhập (+)'}</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {isStockCardMode ? (
              <>
                +{formatQty(data?.totalIn)}
                {selectedProduct?.baseUnit && (
                  <span className="text-xs font-semibold text-emerald-600/70 ml-1.5">
                    {selectedProduct.baseUnit}
                  </span>
                )}
              </>
            ) : (
              <>
                +{inTransactionsCount.toLocaleString('vi-VN')}
                <span className="text-xs font-semibold text-emerald-600/70 ml-1.5">lượt</span>
              </>
            )}
          </div>
        </div>

        {/* Thẻ 3: Lượt xuất / Tổng xuất (kèm thông tin Tồn cuối) */}
        <div className="p-3.5 rounded-2xl border bg-white border-orange-200/80 shadow-2xs">
          <div className="text-[11px] text-orange-700 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp size={14} className="text-orange-600" />
              <span>{isStockCardMode ? 'Tổng Xuất (-)' : 'Lượt Xuất (-)'}</span>
            </span>
            {isStockCardMode && data?.closingBalance !== null && data?.closingBalance !== undefined && (
              <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                Tồn cuối: {formatQty(data?.closingBalance)} {selectedProduct?.baseUnit}
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-700 mt-1">
            {isStockCardMode ? (
              <>
                -{formatQty(data?.totalOut)}
                {selectedProduct?.baseUnit && (
                  <span className="text-xs font-semibold text-orange-600/70 ml-1.5">
                    {selectedProduct.baseUnit}
                  </span>
                )}
              </>
            ) : (
              <>
                -{outTransactionsCount.toLocaleString('vi-VN')}
                <span className="text-xs font-semibold text-orange-600/70 ml-1.5">lượt</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. BỘ LỌC ĐA CHIỀU (FILTER BAR & TOOLBAR) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <form onSubmit={handleFilterSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Lọc 1: Kho hàng */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Kho Lưu Trữ
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value);
                  setPage(0);
                }}
                disabled={loadingWarehouses}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606] cursor-pointer"
              >
                <option value="">-- Tất cả các kho --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc 2: Sản phẩm (Tìm nhanh SKU hoặc tên với Autocomplete) */}
            <div className="relative" ref={productDropdownRef}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Sản phẩm
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Gõ tên sản phẩm hoặc mã..."
                  value={productSearchKw}
                  onChange={(e) => {
                    setProductSearchKw(e.target.value);
                    if (!e.target.value.trim()) {
                      handleClearProduct();
                    }
                  }}
                  onFocus={() => {
                    if (productOptions.length > 0) setShowProductDropdown(true);
                  }}
                  className="w-full text-xs font-medium pl-8 pr-7 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                {selectedProduct ? (
                  <button
                    type="button"
                    onClick={handleClearProduct}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                    title="Bỏ chọn sản phẩm"
                  >
                    <X size={14} />
                  </button>
                ) : isSearchingProduct ? (
                  <RefreshCw
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                  />
                ) : null}
              </div>

              {/* Danh sách gợi ý tìm sản phẩm */}
              {showProductDropdown && productOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {productOptions.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectProduct(opt)}
                      className="p-2.5 hover:bg-orange-50/70 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">{opt.sku}</span>
                        <span className="text-[10px] text-gray-400">{opt.baseUnit}</span>
                      </div>
                      <div className="text-gray-700 font-medium truncate mt-0.5">{opt.name}</div>
                      {opt.category && (
                        <div className="text-[10px] text-gray-400 mt-0.5">Nhóm: {opt.category}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lọc 3: Khoảng thời gian (Từ ngày - Đến ngày) */}
            <div className="sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Từ Ngày
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setActiveQuickRange(null);
                      setFromDate(e.target.value);
                      setPage(0);
                    }}
                    className="w-full text-xs font-semibold px-2.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Đến Ngày
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setActiveQuickRange(null);
                      setToDate(e.target.value);
                      setPage(0);
                    }}
                    className="w-full text-xs font-semibold px-2.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dòng bổ trợ: Loại nghiệp vụ & Phím tắt chọn nhanh ngày */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-2 border-t border-gray-100">
            {/* Loại nghiệp vụ */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Nghiệp vụ:</span>
              <select
                value={movementType}
                onChange={(e) => {
                  setMovementType(e.target.value);
                  setPage(0);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#F85606] cursor-pointer text-gray-700"
              >
                <option value="ALL">Tất cả nghiệp vụ</option>
                <option value="RECEIPT">🟢 Nhập kho (RECEIPT)</option>
                <option value="SALES_DISPATCH">🟠 Xuất bán (SALES_DISPATCH)</option>
                <option value="DELIVERY_RETURN">🟣 Nhập hàng hoàn (DELIVERY_RETURN)</option>
                <option value="SALES_RETURN">🟢 Nhập trả hàng (SALES_RETURN)</option>
                <option value="TRANSFER_OUT">🟡 Xuất chuyển kho (TRANSFER_OUT)</option>
                <option value="TRANSFER_IN">🔵 Nhận chuyển kho (TRANSFER_IN)</option>
                <option value="STOCKTAKE_ADJUST">🔴 Điều chỉnh kiểm kê (STOCKTAKE_ADJUST)</option>
                <option value="STOCK_ADJUSTMENT">🔴 Xuất hủy hao hụt (STOCK_ADJUSTMENT)</option>
              </select>
            </div>

            {/* Phím tắt chọn ngày nhanh */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 font-medium">Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => setQuickDateRange('today')}
                className={`px-2 py-1 text-[11px] rounded-lg border transition cursor-pointer ${
                  activeQuickRange === 'today'
                    ? 'border-amber-400 bg-amber-100 text-amber-900 font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-100 font-medium text-gray-600'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange(7)}
                className={`px-2 py-1 text-[11px] rounded-lg border transition cursor-pointer ${
                  activeQuickRange === 7
                    ? 'border-amber-400 bg-amber-100 text-amber-900 font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-100 font-medium text-gray-600'
                }`}
              >
                7 ngày
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange(30)}
                className={`px-2 py-1 text-[11px] rounded-lg border transition cursor-pointer ${
                  activeQuickRange === 30
                    ? 'border-amber-400 bg-amber-100 text-amber-900 font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-100 font-medium text-gray-600'
                }`}
              >
                30 ngày
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('thisMonth')}
                className={`px-2 py-1 text-[11px] rounded-lg border transition cursor-pointer ${
                  activeQuickRange === 'thisMonth'
                    ? 'border-amber-400 bg-amber-100 text-amber-900 font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-100 font-medium text-gray-600'
                }`}
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('lastMonth')}
                className={`px-2 py-1 text-[11px] rounded-lg border transition cursor-pointer ${
                  activeQuickRange === 'lastMonth'
                    ? 'border-amber-400 bg-amber-100 text-amber-900 font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-100 font-medium text-gray-600'
                }`}
              >
                Tháng trước
              </button>

              <button
                type="submit"
                className="ml-2 px-4 py-1.5 bg-[#F85606] hover:bg-[#E04D05] text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs active:scale-95"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 4. BẢNG DỮ LIỆU THẺ KHO (DATA GRID) */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-[#F85606] mx-auto" />
            <div className="text-sm font-bold text-gray-800">Đang truy vấn thẻ kho thời gian thực...</div>
            <div className="text-xs text-gray-400">Đang đối soát số dư tồn sau từng nghiệp vụ</div>
          </div>
        ) : errorMsg ? (
          <div className="py-16 text-center space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertCircle size={24} />
            </div>
            <div className="text-sm font-bold text-rose-800">Lỗi truy vấn thẻ kho</div>
            <div className="text-xs text-gray-500">{errorMsg}</div>
            <button
              type="button"
              onClick={() => loadStockCard()}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto border border-gray-200">
              <BookOpenCheck size={24} />
            </div>
            <div className="text-sm font-bold text-gray-800">Không có nghiệp vụ phát sinh nào trong kỳ</div>
            <div className="text-xs text-gray-400 max-w-sm mx-auto">
              Không có phát sinh nhập, xuất, chuyển kho hoặc điều chỉnh kiểm kê nào trong khoảng thời gian đã chọn ({fromDate} đến {toDate}).
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
              {/* Định nghĩa kích thước cố định cho các cột */}
              <colgroup>
                <col className="w-[50px]" />  {/* STT */}
                <col className="w-[105px]" /> {/* Thời gian phát sinh (2 dòng: giờ / ngày) */}
                <col className="w-[160px]" /> {/* Chứng từ gốc */}
                <col className="w-[160px]" /> {/* Loại nghiệp vụ */}
                <col className="w-[310px]" /> {/* Sản phẩm (tên & ĐVT) */}
                <col className="w-[110px]" /> {/* Nhập (+) */}
                <col className="w-[110px]" /> {/* Xuất (-) */}
                <col className="w-[120px]" /> {/* Tồn sau phát sinh */}
                <col className="w-[65px]" />  {/* Thao tác (Con mắt) */}
              </colgroup>
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 text-center">STT</th>
                  <th className="py-3 px-3">Thời Gian</th>
                  <th className="py-3 px-3">Chứng Từ Gốc</th>
                  <th className="py-3 px-3">Nghiệp Vụ</th>
                  <th className="py-3 px-3">Sản Phẩm</th>
                  <th className="py-3 px-3 text-right">Nhập (+)</th>
                  <th className="py-3 px-3 text-right">Xuất (-)</th>
                  <th className="py-3 px-3 text-right">Tồn Sau</th>
                  <th className="py-3 px-2 text-center">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* CÁC DÒNG NGHIỆP VỤ BIẾN ĐỘNG THẺ KHO (MỚI NHẤT LÊN ĐẦU) */}
                {rows.map((row, idx) => {
                  const typeCfg = MOVEMENT_TYPES_MAP[row.movementType] || {
                    code: row.movementType as StockMovementType,
                    label: row.movementTypeLabel || row.movementType,
                    shortLabel: row.movementTypeLabel || row.movementType,
                    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
                    dotColor: '#6b7280',
                    direction: 'ADJUST'
                  };

                  const qtyIn = Number(row.quantityIn) || 0;
                  const qtyOut = Number(row.quantityOut) || 0;
                  const stt = page * size + idx + 1;
                  const { time, date } = splitDateTime(row.movementAt);

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-orange-50/30 transition duration-100 group"
                    >
                      {/* STT */}
                      <td className="py-3 px-2 text-center text-gray-400 font-mono text-[11px]">
                        {stt}
                      </td>

                      {/* Thời gian phát sinh (Dòng trên là giờ, dòng dưới là ngày tháng năm) */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-gray-900 font-bold text-xs whitespace-nowrap">
                          {time}
                        </div>
                        <div className="font-mono text-gray-400 text-[10px] whitespace-nowrap">
                          {date}
                        </div>
                      </td>

                      {/* Chứng từ gốc (Link mở phiếu) */}
                      <td className="py-3 px-3">
                        {row.docCode ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(row)}
                            className="inline-flex items-center gap-1 font-mono font-bold text-[#F85606] hover:text-[#E04D05] hover:underline cursor-pointer group-hover:bg-orange-100/60 px-1.5 py-0.5 rounded transition text-xs"
                            title={`Mở chứng từ gốc: ${row.docCode} (${row.docType || 'Chi tiết'})`}
                          >
                            <span>{row.docCode}</span>
                            <ExternalLink size={11} className="opacity-70 group-hover:opacity-100" />
                          </button>
                        ) : (
                          <span className="text-gray-400 font-mono text-[11px]">—</span>
                        )}
                        {row.docType && (
                          <div className="text-[10px] text-gray-400 truncate">
                            {DOC_TYPES_MAP[row.docType]?.label || row.docType}
                          </div>
                        )}
                      </td>

                      {/* Loại nghiệp vụ */}
                      <td className="py-3 px-3 overflow-hidden">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-full ${typeCfg.badgeClass}`}
                          title={typeCfg.label}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: typeCfg.dotColor }}
                          />
                          <span className="truncate">{typeCfg.label}</span>
                        </span>
                      </td>

                      {/* Sản phẩm (Bỏ mã SKU, chỉ hiển thị tên & ĐVT) */}
                      <td className="py-3 px-3 overflow-hidden">
                        <div className="font-semibold text-gray-900 text-xs truncate" title={row.productName}>
                          {row.productName}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          ĐVT: <strong className="text-gray-600 font-semibold">{row.baseUnit}</strong>
                        </div>
                      </td>

                      {/* Nhập (+) */}
                      <td className="py-3 px-3 text-right">
                        {qtyIn > 0 ? (
                          <span className="font-mono font-bold text-emerald-700 text-xs">
                            +{formatQty(qtyIn)}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Xuất (-) */}
                      <td className="py-3 px-3 text-right">
                        {qtyOut > 0 ? (
                          <span className="font-mono font-bold text-orange-700 text-xs">
                            -{formatQty(qtyOut)}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Tồn sau phát sinh (balanceAfter) */}
                      <td className="py-3 px-3 text-right">
                        <span className="inline-block font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md text-xs whitespace-nowrap">
                          {formatQty(row.balanceAfter)}
                        </span>
                      </td>

                      {/* Thao tác xem chi tiết (Con mắt - xem chi tiết & ghi chú) */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRowDetail(row)}
                          className="p-1.5 text-gray-400 hover:text-[#F85606] hover:bg-orange-50 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết phát sinh & ghi chú"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. PHÂN TRANG */}
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
            itemLabel="nghiệp vụ phát sinh"
            disabled={loading}
          />
        )}
      </div>

      {/* 6. MODAL XEM CHI TIẾT DÒNG PHÁT SINH THẺ KHO (QUICK VIEW) */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl sm:max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold shadow-xs">
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                    Chi Tiết Nghiệp Vụ Thẻ Kho
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    <span className="font-mono text-gray-400">ID: #{selectedRowDetail.id}</span>
                    {selectedRowDetail.docCode && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-semibold text-orange-600">
                          {selectedRowDetail.docCode}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal - 2 Cột Rộng Rãi & Thông Thoáng */}
            <div className="py-5 space-y-4 text-xs">
              {/* Khối 1: Thông tin nghiệp vụ & Thông tin hàng hóa chia 2 cột */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cột 1: Thông tin phát sinh */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Thông tin phát sinh
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-gray-400 block mb-0.5">Thời gian phát sinh</span>
                      <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                        {formatTime(selectedRowDetail.movementAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-400 block mb-0.5">Loại nghiệp vụ</span>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm inline-block">
                        {selectedRowDetail.movementTypeLabel || selectedRowDetail.movementType}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-400 block mb-0.5">Kho lưu trữ</span>
                      <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                        {selectedRowDetail.warehouseCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-400 block mb-0.5">Người thực hiện</span>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <User size={13} className="text-gray-400" />
                        <span>{selectedRowDetail.actorUsername || 'Hệ thống'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cột 2: Thông tin hàng hóa */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Sản phẩm & Đơn vị tính
                    </span>
                    <div className="font-mono font-bold text-sm text-[#F85606] bg-orange-50/80 border border-orange-200/60 px-2.5 py-1 rounded-lg inline-block">
                      {selectedRowDetail.productSku}
                    </div>
                    <div className="font-bold text-gray-900 text-xs sm:text-sm mt-2 leading-relaxed">
                      {selectedRowDetail.productName}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-gray-600 flex items-center justify-between">
                    <span>Đơn vị tính cơ sở:</span>
                    <strong className="text-gray-900 font-bold font-mono text-xs">
                      {selectedRowDetail.baseUnit || '—'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Khối 2: Ba thẻ số lượng biến động (Nhập / Xuất / Tồn sau phiếu) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs">
                  <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
                    Nhập vào (+)
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1">
                    +{formatQty(selectedRowDetail.quantityIn)}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">{selectedRowDetail.baseUnit}</div>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/90 shadow-2xs">
                  <div className="text-[11px] text-orange-800 font-bold uppercase tracking-wider">
                    Xuất ra (-)
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-orange-700 font-mono mt-1">
                    -{formatQty(selectedRowDetail.quantityOut)}
                  </div>
                  <div className="text-[10px] text-orange-600 mt-0.5">{selectedRowDetail.baseUnit}</div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/90 shadow-2xs">
                  <div className="text-[11px] text-blue-900 font-bold uppercase tracking-wider">
                    Tồn sau phát sinh
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono mt-1">
                    {formatQty(selectedRowDetail.balanceAfter)}
                  </div>
                  <div className="text-[10px] text-blue-700 mt-0.5">Tồn lũy kế ({selectedRowDetail.baseUnit})</div>
                </div>
              </div>

              {/* Khối 3: Chứng từ gốc & Ghi chú nghiệp vụ */}
              <div className="space-y-3">
                {/* Chứng từ gốc */}
                {selectedRowDetail.docCode && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/70 to-white border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider block">
                        Chứng từ gốc ({selectedRowDetail.docType})
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-gray-900 mt-0.5 block">
                        {selectedRowDetail.docCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const row = selectedRowDetail;
                        setSelectedRowDetail(null);
                        handleOpenDocument(row);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F85606] to-orange-600 text-white rounded-xl font-bold text-xs hover:opacity-95 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                    >
                      <span>Mở chứng từ gốc</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                )}

                {/* Ghi chú & Diễn giải chi tiết */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-gray-800 text-xs">
                  <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Ghi chú / Diễn giải nghiệp vụ:</span>
                  </span>
                  <div className="text-gray-800 leading-relaxed font-medium text-xs sm:text-sm pl-5">
                    {selectedRowDetail.note ? (
                      selectedRowDetail.note
                    ) : (
                      <span className="text-gray-400 italic">Không có ghi chú thêm cho nghiệp vụ này.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400 hidden sm:inline-block">
                Số liệu được truy nguyên tự động từ nhật ký biến động kho thời gian thực
              </span>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition cursor-pointer ml-auto active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL XEM TRƯỚC VÀ IN THẺ KHO (PRINT PREVIEW MODAL) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto print:max-w-none print:w-full print:p-0 print:shadow-none print:border-none">
            {/* Header Modal (ẩn khi in) */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-[#F85606]" />
                <h3 className="text-base font-black text-gray-900">Xem Trước Bản In Thẻ Kho</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-[#F85606] hover:bg-[#E04D05] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={13} />
                  <span>In ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* NỘI DUNG THẺ KHO CHUẨN MẪU IN KẾ TOÁN S12-DN */}
            <div className="p-6 text-black print:p-0 space-y-4 font-sans">
              <div className="flex justify-between items-start text-xs border-b pb-3">
                <div>
                  <div className="font-bold uppercase tracking-wider text-sm">HỆ THỐNG ERP SALES & INVENTORY</div>
                  <div className="text-gray-600">Kho lưu trữ: {selectedWhInfo?.name || 'Tất cả kho'} ({selectedWhInfo?.code || 'ALL'})</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">Mẫu số S12-DN</div>
                  <div className="text-[11px] text-gray-500">(Ban hành theo Thông tư 200/2014/TT-BTC)</div>
                </div>
              </div>

              <div className="text-center py-2 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-wide">THẺ KHO</h2>
                <div className="text-xs text-gray-600">
                  Từ ngày <strong>{fromDate}</strong> đến ngày <strong>{toDate}</strong>
                </div>
                {selectedProduct && (
                  <div className="text-xs text-gray-800 font-semibold">
                    Tên sản phẩm: <span className="font-bold text-black">{selectedProduct.name}</span> — Mã SKU: <span className="font-mono font-bold text-black">{selectedProduct.sku}</span> — ĐVT: <span className="font-bold text-black">{selectedProduct.baseUnit}</span>
                  </div>
                )}
              </div>

              {/* Bảng in chi tiết */}
              <table className="w-full text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100 font-bold text-center border-b border-black">
                    <th className="border border-black p-1.5 w-[35px]" rowSpan={2}>STT</th>
                    <th className="border border-black p-1.5 w-[110px]" rowSpan={2}>Ngày giờ</th>
                    <th className="border border-black p-1.5 w-[120px]" rowSpan={2}>Số chứng từ</th>
                    <th className="border border-black p-1.5" rowSpan={2}>Diễn giải / Nghiệp vụ</th>
                    <th className="border border-black p-1.5" colSpan={3}>Số lượng</th>
                    <th className="border border-black p-1.5 w-[80px]" rowSpan={2}>Người lập</th>
                  </tr>
                  <tr className="bg-gray-100 font-bold text-center border-b border-black">
                    <th className="border border-black p-1.5 w-[75px]">Nhập</th>
                    <th className="border border-black p-1.5 w-[75px]">Xuất</th>
                    <th className="border border-black p-1.5 w-[85px]">Tồn lũy kế</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Tồn đầu kỳ */}
                  {data?.openingBalance !== null && data?.openingBalance !== undefined && (
                    <tr className="font-bold bg-gray-50 border-b border-black">
                      <td className="border border-black p-1.5 text-center">—</td>
                      <td className="border border-black p-1.5 font-mono">{fromDate}</td>
                      <td className="border border-black p-1.5">ĐẦU KỲ</td>
                      <td className="border border-black p-1.5">Số dư đầu kỳ báo cáo</td>
                      <td className="border border-black p-1.5 text-right">—</td>
                      <td className="border border-black p-1.5 text-right">—</td>
                      <td className="border border-black p-1.5 text-right font-mono">{formatQty(data.openingBalance)}</td>
                      <td className="border border-black p-1.5 text-center">—</td>
                    </tr>
                  )}

                  {/* Các dòng */}
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-b border-gray-300">
                      <td className="border border-black p-1.5 text-center">{i + 1}</td>
                      <td className="border border-black p-1.5 font-mono text-[11px]">{formatTime(r.movementAt)}</td>
                      <td className="border border-black p-1.5 font-mono font-bold">{r.docCode || '—'}</td>
                      <td className="border border-black p-1.5">
                        <div className="font-semibold">{r.movementTypeLabel || r.movementType}</div>
                        {r.note && <div className="text-[10px] text-gray-600 italic">{r.note}</div>}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono">
                        {Number(r.quantityIn) > 0 ? formatQty(r.quantityIn) : '—'}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono">
                        {Number(r.quantityOut) > 0 ? formatQty(r.quantityOut) : '—'}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono font-bold">
                        {formatQty(r.balanceAfter)}
                      </td>
                      <td className="border border-black p-1.5 text-center text-[11px]">{r.actorUsername || '—'}</td>
                    </tr>
                  ))}

                  {/* Tổng phát sinh */}
                  <tr className="font-bold bg-gray-100 border-b border-black">
                    <td className="border border-black p-1.5 text-center" colSpan={4}>TỔNG CỘNG PHÁT SINH TRONG KỲ</td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {formatQty(data?.totalIn !== null && data?.totalIn !== undefined ? data.totalIn : fallbackTotalIn)}
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {formatQty(data?.totalOut !== null && data?.totalOut !== undefined ? data.totalOut : fallbackTotalOut)}
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {formatQty(data?.closingBalance)}
                    </td>
                    <td className="border border-black p-1.5 text-center">—</td>
                  </tr>

                  {/* Tồn cuối kỳ */}
                  {data?.closingBalance !== null && data?.closingBalance !== undefined && (
                    <tr className="font-black bg-gray-50 border-b border-black">
                      <td className="border border-black p-1.5 text-center" colSpan={4}>SỐ DƯ CUỐI KỲ BÁO CÁO</td>
                      <td className="border border-black p-1.5 text-right">—</td>
                      <td className="border border-black p-1.5 text-right">—</td>
                      <td className="border border-black p-1.5 text-right font-mono text-sm">{formatQty(data.closingBalance)}</td>
                      <td className="border border-black p-1.5 text-center">—</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Chữ ký xác nhận */}
              <div className="grid grid-cols-3 text-center text-xs pt-8 pb-4">
                <div>
                  <div className="font-bold">Người lập thẻ</div>
                  <div className="text-[10px] text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                  <div className="mt-14 font-semibold">{user?.fullName || user?.username || '....................'}</div>
                </div>
                <div>
                  <div className="font-bold">Thủ kho</div>
                  <div className="text-[10px] text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                  <div className="mt-14 font-semibold">....................</div>
                </div>
                <div>
                  <div className="font-bold">Kế toán trưởng / Quản lý kho</div>
                  <div className="text-[10px] text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                  <div className="mt-14 font-semibold">....................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
