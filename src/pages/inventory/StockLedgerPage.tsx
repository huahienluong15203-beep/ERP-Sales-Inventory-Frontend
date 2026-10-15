import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Boxes,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
  TrendingDown,
  Edit2,
  Check,
  X,
  BookOpenCheck
} from 'lucide-react';
import type { MinStockThresholdConfig } from '../../types/stockAlert';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import {
  fetchMinStockConfigsPaged,
  getDashboardMinStockSummary,
  updateMinStockThreshold
} from '../../services/stockAlertApi';
import { fetchCategories, buildHierarchicalCategoryOptions, type CategoryWithCount } from '../../services/categoryApi';
import { useLocation, useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { SearchSelect } from '../../components/common/SearchSelect';
import { NumberInput } from '../../components/common/NumberInput';
import { Pagination } from '../../components/common/Pagination';

/**
 * Sổ Tồn Kho & Khai Báo Ngưỡng Tồn Tối Thiểu
 * Hiển thị số liệu tồn thực tế, đang giữ chỗ, khả dụng và thiết lập định mức an toàn
 */
export const StockLedgerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast, currentRole, user } = useAuth();

  // Quyền khai báo / sửa định mức tồn tối thiểu:
  // - Chỉ Quản lý kho (ROLE_WH_MANAGER) và Quản trị viên (ROLE_ADMIN) mới có quyền sửa
  // - Nhân viên kho (ROLE_WAREHOUSE), Kế toán, QL kinh doanh chỉ được xem sổ tồn
  const canEditMinThreshold =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_ADMIN'));

  // Kiểm tra quyền sửa theo từng kho:
  // - Admin: được sửa tất cả các kho
  // - Quản lý kho: chỉ được sửa tại các kho mà tài khoản được phân công
  // - Nhân viên kho / người dùng khác: không được sửa
  const canEditItem = (item: MinStockThresholdConfig) => {
    if (!canEditMinThreshold) return false;
    if (currentRole === 'ROLE_ADMIN' || user?.roles?.includes('ROLE_ADMIN')) return true;
    if (user?.warehouseCodes && user.warehouseCodes.length > 0) {
      return user.warehouseCodes.includes(item.warehouseCode);
    }
    if (user?.warehouse) {
      return user.warehouse.includes(item.warehouseCode) || user.warehouse.includes(item.warehouseName);
    }
    return false;
  };

  const [configs, setConfigs] = useState<MinStockThresholdConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Phân trang: Cố định 50 sản phẩm ban đầu để load cực nhanh
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(50);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELOW' | 'CRITICAL' | 'SAFE'>('ALL');
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');

  // Danh mục nhóm hàng đồng bộ từ Quản lý nhóm hàng
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);

  // Highlight SKU được bấm từ thông báo chuông hoặc thẻ cảnh báo
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  // Bộ nhớ đệm phân trang tránh query liên tục khi đã load dữ liệu
  const cacheRef = useRef<Map<string, {
    content: MinStockThresholdConfig[];
    totalElements: number;
    totalPages: number;
  }>>(new Map());

  // Thống kê nhanh toàn bộ hệ thống
  const [stats, setStats] = useState({
    total: 0,
    below: 0,
    critical: 0,
    safe: 0
  });

  // Chỉnh sửa định mức trực tiếp trên dòng (inline edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinValue, setEditMinValue] = useState<number>(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Tải danh mục nhóm hàng từ backend khi mount
  useEffect(() => {
    fetchCategories()
      .then((res) => {
        if (Array.isArray(res)) {
          setCategories(res);
        }
      })
      .catch((err) => console.warn('Lỗi tải nhóm hàng:', err));
  }, []);

  // Sắp xếp nhóm hàng theo phân cấp cây DFS trực quan cho combobox lọc
  const hierarchicalCategoryOptions = useMemo(() => {
    return buildHierarchicalCategoryOptions(categories);
  }, [categories]);

  // Debounce tìm kiếm reactive: gõ là tự lọc sau 300ms, không bắt buộc bấm nút Lọc
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedKeyword !== keyword) {
        setDebouncedKeyword(keyword);
        setPage(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, debouncedKeyword]);

  const loadData = async (
    targetPage = page,
    targetSize = size,
    kw = debouncedKeyword,
    status = statusFilter,
    wh = selectedWarehouse,
    cat = selectedCategory
  ) => {
    const cacheKey = `${wh}__${cat}__${status}__${(kw || '').trim().toLowerCase()}__${targetPage}__${targetSize}`;

    // Nếu đã load data đó rồi thì lấy luôn từ cache, tránh lag trang
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setConfigs(cached.content);
      setTotalElements(cached.totalElements);
      setTotalPages(cached.totalPages);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [pagedRes, summary] = await Promise.all([
        fetchMinStockConfigsPaged({
          warehouseCode: wh,
          category: cat,
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

      // Lưu kết quả vào cache
      cacheRef.current.set(cacheKey, {
        content: pagedRes.content,
        totalElements: pagedRes.totalElements,
        totalPages: pagedRes.totalPages
      });

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
    loadData(page, size, debouncedKeyword, statusFilter, selectedWarehouse, selectedCategory);
  }, [page, size, debouncedKeyword, statusFilter, selectedWarehouse, selectedCategory]);

  // Tự động nhận diện SKU & Kho hoặc trạng thái lọc từ URL nếu có
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const skuParam = params.get('sku');
    const whParam = params.get('warehouseCode');
    const isHighlight = params.get('highlight') === 'true';
    const statusParam = params.get('status');

    if (statusParam === 'BELOW' || statusParam === 'CRITICAL' || statusParam === 'SAFE') {
      setStatusFilter(statusParam as any);
      setPage(0);
    }

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
    setDebouncedKeyword(keyword);
    setPage(0);
    loadData(0, size, keyword, statusFilter, selectedWarehouse, selectedCategory);
  };

  const handleStartEdit = (cfg: MinStockThresholdConfig) => {
    setEditingId(cfg.id);
    setEditMinValue(cfg.minThreshold);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Lưu cấu hình ngưỡng tối thiểu
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
      cacheRef.current.clear();
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

        {/* Card 2: Dưới Định Mức */}
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
          <div className="text-xs text-red-600 font-bold">Cạn Kiệt Tồn </div>
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
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Ô Tìm Nhanh Reactive */}
          <div className="relative w-full lg:max-w-xs">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm nhanh theo mã hoặc tên..."
              value={keyword}
              onChange={(e) => {
                setHighlightedKey(null);
                setKeyword(e.target.value);
              }}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
            />
          </div>

          <div className="flex flex-wrap items-center lg:justify-end gap-2 w-full lg:w-auto">
            {/* 1. Lọc Kho */}
            <SearchSelect
              value={selectedWarehouse}
              onChange={(e) => {
                setHighlightedKey(null);
                setSelectedWarehouse(e.target.value);
                setPage(0);
              }}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
            >
              <option value="ALL">Tất cả kho hàng</option>
              {SYSTEM_WAREHOUSES.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </SearchSelect>

            {/* 2. Lọc Nhóm Hàng */}
            <SearchSelect
              value={selectedCategory}
              onChange={(e) => {
                setHighlightedKey(null);
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606] cursor-pointer text-gray-700 min-w-[200px]"
              searchPlaceholder="Tìm nhóm hàng..."
            >
              <option value="ALL">Tất cả nhóm hàng ({categories.length})</option>
              {hierarchicalCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SearchSelect>

            {/* 3. Lọc Trạng Thái Tồn */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setHighlightedKey(null);
                setStatusFilter(e.target.value as 'ALL' | 'BELOW' | 'CRITICAL' | 'SAFE');
                setPage(0);
              }}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606] cursor-pointer text-gray-700"
            >
              <option value="ALL">Tất cả trạng thái tồn</option>
              <option value="BELOW">⚠️ Dưới định mức (Cần bổ sung)</option>
              <option value="CRITICAL">🚨 Cạn kiệt tồn (Tồn = 0)</option>
              <option value="SAFE">✅ Tồn kho an toàn</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 bg-[#F85606] hover:bg-[#E04D05] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs active:scale-95"
            >
              Lọc
            </button>

            <button
              type="button"
              onClick={() => {
                const whParam = selectedWarehouse !== 'ALL' ? `?warehouseCode=${encodeURIComponent(selectedWarehouse)}` : '';
                navigate(`/inventory/stock-card${whParam}`);
              }}
              className="px-3.5 py-2.5 bg-orange-50 hover:bg-orange-100 text-[#F85606] border border-orange-200/80 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Mở màn hình Thẻ kho chi tiết (S6-02)"
            >
              <BookOpenCheck size={14} />
              <span>Thẻ kho chi tiết</span>
            </button>
          </div>
        </form>
      </div>

      {/* BẢNG SỔ TỒN KHO & CẢNH BÁO NỔI BẬT */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-rose-600" />
            <span>Đang tải số liệu tồn kho & định mức...</span>
          </div>
        ) : configs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            {statusFilter === 'BELOW' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 size={24} />
                </div>
                <div className="text-sm font-bold text-gray-800">Tất cả sản phẩm đều đạt định mức dự trữ an toàn!</div>
                <div className="text-xs text-gray-400">Không có mặt hàng nào ở dưới ngưỡng tồn tối thiểu đã thiết lập.</div>
              </>
            ) : (
              <>
                <Boxes size={36} className="mx-auto text-gray-300" />
                <div className="text-sm font-bold text-gray-700">Không tìm thấy bản ghi tồn kho nào</div>
                <div className="text-xs text-gray-400">Thay đổi bộ lọc hoặc từ khóa tìm kiếm</div>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
              {/* Định nghĩa kích thước cố định cho 8 cột tách bạch */}
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">Mã SKU & Tên Hàng</th>
                  <th className="py-3 px-3">Kho Lưu Trữ</th>
                  <th className="py-3 px-2 text-center">Tồn Thực Tế</th>
                  <th className="py-3 px-2 text-center">Đang Giữ Chỗ</th>
                  <th className="py-3 px-2 text-center">Tồn Khả Dụng</th>
                  <th className="py-3 px-2 text-center">Tồn Tối Thiểu</th>
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
                  const reserved = item.reservedStock ?? Math.max(0, item.currentStock - item.availableStock);

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

                      {/* 3. Tồn thực tế */}
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

                      {/* 4. Tồn đang giữ chỗ (Tạm giữ) */}
                      <td className="py-3 px-2 text-center overflow-hidden">
                        <span
                          className={`inline-block font-bold text-xs px-2 py-0.5 rounded-lg whitespace-nowrap ${reserved > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-gray-400 font-medium'
                            }`}
                        >
                          {reserved.toLocaleString('vi-VN')} {item.unit}
                        </span>
                      </td>

                      {/* 5. Tồn khả dụng */}
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
                            className={`relative inline-flex items-center justify-center group ${canEditItem(item) ? 'cursor-pointer' : 'cursor-default'}`}
                            onClick={() => canEditItem(item) && handleStartEdit(item)}
                            title={canEditItem(item) ? 'Nhấp để sửa định mức tối thiểu' : `Chỉ Quản lý phụ trách ${item.warehouseName} mới được sửa định mức`}
                          >
                            <span className="font-bold text-gray-800 whitespace-nowrap">
                              {item.minThreshold.toLocaleString('vi-VN')} {item.unit}
                            </span>
                            {canEditItem(item) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(item);
                                }}
                                className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
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

                      {/* 7. Nút xem Thẻ kho chi tiết của SKU này */}
                      <td className="py-3 px-2 text-center overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const whParam = item.warehouseCode ? `&warehouseCode=${encodeURIComponent(item.warehouseCode)}` : '';
                            const skuParam = item.productSku ? `&sku=${encodeURIComponent(item.productSku)}` : '';
                            const prodIdParam = item.productId ? `&productId=${item.productId}` : '';
                            navigate(`/inventory/stock-card?${whParam}${skuParam}${prodIdParam}`);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-[11px] border border-orange-200/80 transition cursor-pointer shadow-2xs"
                          title={`Xem thẻ kho chi tiết của SKU [${item.productSku}] tại ${item.warehouseName}`}
                        >
                          <BookOpenCheck size={12} />
                          <span>Thẻ kho</span>
                        </button>
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
