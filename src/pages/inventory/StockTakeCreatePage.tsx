import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Warehouse,
  Layers,
  FileText,
  AlertCircle,
  Search,
  Check,
  Package,
  Loader2,
  X
} from 'lucide-react';
import type { WarehouseOption } from '../../types/inventory';
import { fetchCategories } from '../../services/categoryApi';
import {
  createStockTake,
  fetchWarehousesList,
  fetchStockTakeCategoriesByWarehouse
} from '../../services/stockTakeApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { Pagination } from '../../components/common/Pagination';
import { SearchSelect } from '../../components/common/SearchSelect';

export interface StockTakeCategoryItem {
  id: number | string;
  code: string;
  name: string;
  level: number;
  parentId?: number | string | null;
  parentName?: string | null;
  description?: string;
  skuCount?: number;
  productCount?: number;
}

export const StockTakeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [categories, setCategories] = useState<StockTakeCategoryItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);

  // Form inputs
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  // Multi-select danh sách nhóm hàng cần kiểm kê
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [note, setNote] = useState<string>('');

  // Category search, level filter & pagination (Table view giống Danh mục NCC)
  const [catKeyword, setCatKeyword] = useState<string>('');
  const [catLevelFilter, setCatLevelFilter] = useState<string>('ALL');
  const [catPage, setCatPage] = useState<number>(0); // 0-indexed cho Pagination
  const [catPageSize, setCatPageSize] = useState<number>(10);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 1. Tải danh sách kho được phân công cho nhân viên kho
  useEffect(() => {
    let alive = true;
    setLoadingData(true);
    fetchWarehousesList()
      .then((whList) => {
        if (!alive) return;
        setWarehouses(whList);
        if (whList.length > 0) {
          setSelectedWarehouseId(Number(whList[0].id));
        }
      })
      .catch((err) => {
        if (alive) {
          console.error('Lỗi nạp danh sách kho kiểm kê:', err);
          setErrorMsg('Không thể tải danh sách kho kiểm kê.');
        }
      })
      .finally(() => {
        if (alive) setLoadingData(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  // 2. Khi kho kiểm kê thay đổi -> Tự động nạp danh sách nhóm hàng thực tế có tồn trong kho đó
  useEffect(() => {
    if (!selectedWarehouseId) {
      setCategories([]);
      setSelectedCategoryIds([]);
      return;
    }

    let alive = true;
    setLoadingCategories(true);
    setSelectedCategoryIds([]); // Reset lựa chọn nhóm hàng khi đổi kho

    fetchStockTakeCategoriesByWarehouse(selectedWarehouseId)
      .then((whCats) => {
        if (!alive) return;
        if (whCats && whCats.length > 0) {
          setCategories(whCats);
        } else {
          // Fallback sang toàn bộ danh mục nếu kho chưa có dữ liệu tồn
          fetchCategories()
            .then((allCats) => {
              if (alive) setCategories(allCats);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (alive) console.warn('Lỗi tải nhóm hàng theo kho:', err);
      })
      .finally(() => {
        if (alive) setLoadingCategories(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedWarehouseId]);

  // Map tra cứu tên nhóm cha nhanh
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      map.set(String(c.id), c.name);
    });
    return map;
  }, [categories]);

  // Lọc danh mục nhóm hàng theo từ khóa và phân cấp
  const filteredCategories = useMemo(() => {
    let list = categories;
    if (catKeyword.trim()) {
      const kw = catKeyword.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(kw) ||
          (c.code && c.code.toLowerCase().includes(kw))
      );
    }
    if (catLevelFilter === 'LEVEL_1') {
      list = list.filter((c) => c.level === 1 || !c.parentId);
    } else if (catLevelFilter === 'LEVEL_2') {
      list = list.filter((c) => c.level === 2 || Boolean(c.parentId));
    }
    return list;
  }, [categories, catKeyword, catLevelFilter]);

  // Phân trang danh mục nhóm hàng dạng bảng (Pagination 0-indexed)
  const totalCatElements = filteredCategories.length;
  const totalCatPages = Math.ceil(totalCatElements / catPageSize) || 1;

  const paginatedCategories = useMemo(() => {
    const start = catPage * catPageSize;
    return filteredCategories.slice(start, start + catPageSize);
  }, [filteredCategories, catPage, catPageSize]);

  useEffect(() => {
    setCatPage(0);
  }, [catKeyword, catLevelFilter]);

  // Multi-select helpers
  const toggleCategory = (rawCatId: number | string) => {
    const catId = Number(rawCatId);
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedCategories.length === 0) return false;
    return paginatedCategories.every((c) => selectedCategoryIds.includes(Number(c.id)));
  }, [paginatedCategories, selectedCategoryIds]);

  const toggleSelectAllCurrentPage = () => {
    const pageIds = paginatedCategories.map((c) => Number(c.id));
    if (isAllCurrentPageSelected) {
      setSelectedCategoryIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      setErrorMsg('Vui lòng chọn kho kiểm kê.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const created = await createStockTake({
        warehouseId: Number(selectedWarehouseId),
        categoryId: selectedCategoryIds.length === 1 ? selectedCategoryIds[0] : null,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : null,
        note: note.trim() || undefined
      });

      showToast(
        'Tạo phiếu kiểm kê thành công!',
        `Phiếu ${created.code} đã được tạo với ${created.lineCount} mặt hàng tồn sổ.`,
        'success',
        4000
      );

      // Chuyển hướng trực tiếp đến trang chi tiết thực hiện đếm của phiếu vừa tạo
      navigate(`/inventory/stocktakes/${created.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo phiếu kiểm kê');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-5 antialiased pb-16 animate-in fade-in duration-200">
      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/inventory/stocktakes')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="stocktake-create-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách phiếu kiểm kê</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Kho bãi & Tồn kho / Kiểm kê kho / Tạo phiếu kiểm kê mới
          </span>
        </div>
      </div>

      {/* 2. HERO HEADER TRANG TẠO PHIẾU */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 bg-gradient-to-r from-orange-50/60 via-amber-50/20 to-white">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
            <ClipboardList size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Tạo Phiếu Kiểm Kê Kho Mới
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Chụp chốt số tồn sổ tại thời điểm tạo phiếu (Snapshot) để đối chiếu với số lượng thực đếm tại kho
            </p>
          </div>
        </div>
      </div>

      {/* 3. THÔNG BÁO CƠ CHẾ CHỤP CHỐT SỐ TỒN SỔ (SNAPSHOT) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs leading-relaxed space-y-1.5 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-blue-900">
          <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
          <span>Quy tắc chụp chốt số tồn sổ hệ thống (Inventory Snapshot):</span>
        </div>
        <p className="pl-6 text-slate-600 text-xs leading-relaxed">
          Hệ thống sẽ ghi nhận số lượng tồn sổ của từng mặt hàng tại kho ngay lúc bạn bấm <strong>&ldquo;Tạo phiếu kiểm kê&rdquo;</strong>.
          Các giao dịch xuất/nhập phát sinh sau thời điểm này sẽ không làm thay đổi mốc số sổ đối chiếu của phiếu.
        </p>
      </div>

      {/* LỖI NẾU CÓ */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-bold flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4. FORM TẠO PHIẾU KIỂM KÊ */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* KHỐI 1: CHỌN KHO KIỂM KÊ */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-100">
            <Warehouse size={16} className="text-[#F85606]" />
            <span>1. Kho Kiểm Kê <span className="text-rose-500">*</span></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {warehouses.map((w) => {
              const isSelected = Number(w.id) === Number(selectedWarehouseId);
              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWarehouseId(Number(w.id))}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-[#F85606] bg-orange-50/50 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/20'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold text-[#F85606] bg-white px-2 py-0.5 rounded border border-orange-200 inline-block">
                      {w.code}
                    </span>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{w.name}</h4>
                    {w.address && (
                      <p className="text-[11px] text-gray-500 line-clamp-1">{w.address}</p>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'border-[#F85606] bg-[#F85606] text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KHỐI 2: CHỌN PHẠM VI NHÓM HÀNG (MULTI-SELECT HOẶC TOÀN BỘ KHO) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Layers size={16} className="text-emerald-600" />
              <span>2. Phạm Vi Nhóm Hàng Cần Kiểm Kê</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span>
                Tổng cộng: <strong className="text-[#F85606] font-mono">{filteredCategories.length}</strong> nhóm hàng trong kho
              </span>
              {selectedCategoryIds.length > 0 ? (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#F85606] font-bold text-[11px] inline-flex items-center gap-1">
                    <Check size={11} strokeWidth={3} />
                    <span>Đang chọn {selectedCategoryIds.length} nhóm hàng</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryIds([])}
                    className="text-[11px] text-gray-400 hover:text-rose-600 underline cursor-pointer ml-1"
                  >
                    Bỏ chọn
                  </button>
                </div>
              ) : (
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1">
                  <Check size={11} strokeWidth={3} />
                  <span>Kiểm kê toàn bộ kho ({filteredCategories.length} nhóm)</span>
                </span>
              )}
            </div>
          </div>

          {/* Ô chọn nhanh: Toàn bộ mặt hàng trong kho */}
          <div
            onClick={() => setSelectedCategoryIds([])}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              selectedCategoryIds.length === 0
                ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Package size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                  Toàn bộ mặt hàng trong kho (Kiểm kê tổng thể)
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Chụp chốt và kiểm đếm tất cả mọi sản phẩm đang có số dư tồn sổ tại kho được chọn.
                </p>
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                selectedCategoryIds.length === 0
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {selectedCategoryIds.length === 0 && <Check size={12} strokeWidth={3} />}
            </div>
          </div>

          {/* Chọn nhiều nhóm hàng cụ thể dạng Bảng */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase block">
                Hoặc tick chọn một hay nhiều nhóm hàng cụ thể (Multi-select):
              </span>
              {filteredCategories.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllCurrentPage}
                  className="text-xs text-[#F85606] font-bold hover:underline cursor-pointer"
                >
                  {isAllCurrentPageSelected ? 'Bỏ chọn toàn bộ trang này' : 'Chọn tất cả nhóm hàng trang này'}
                </button>
              )}
            </div>

            <div className="border border-gray-200 rounded-2xl sm:rounded-3xl bg-white shadow-2xs overflow-hidden">
              {/* Thanh tìm kiếm & bộ lọc */}
              <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
                {/* Ô tìm kiếm */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={catKeyword}
                    onChange={(e) => setCatKeyword(e.target.value)}
                    placeholder="Tìm theo mã, tên nhóm hàng..."
                    aria-label="Tìm kiếm nhóm hàng"
                    className="w-full pl-10 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all min-h-[38px]"
                  />
                  {catKeyword && (
                    <button
                      type="button"
                      onClick={() => setCatKeyword('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Bộ lọc phân cấp & số dòng / trang */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs text-gray-500 hidden sm:inline">Phân cấp:</span>
                  <SearchSelect
                    value={catLevelFilter}
                    onChange={(e) => setCatLevelFilter(e.target.value)}
                    aria-label="Lọc theo phân cấp nhóm hàng"
                    className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 cursor-pointer min-h-[38px]"
                  >
                    <option value="ALL">Tất cả phân cấp</option>
                    <option value="LEVEL_1">Cấp 1 - Ngành hàng gốc</option>
                    <option value="LEVEL_2">Cấp 2 - Nhóm hàng trực thuộc</option>
                  </SearchSelect>

                  <SearchSelect
                    value={catPageSize}
                    onChange={(e) => setCatPageSize(Number(e.target.value))}
                    aria-label="Số dòng trên mỗi trang"
                    className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 cursor-pointer min-h-[38px]"
                  >
                    <option value={10}>10 dòng / trang</option>
                    <option value={20}>20 dòng / trang</option>
                    <option value={50}>50 dòng / trang</option>
                  </SearchSelect>
                </div>
              </div>

              {/* Bảng danh sách nhóm hàng */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={isAllCurrentPageSelected}
                          disabled={paginatedCategories.length === 0}
                          onChange={toggleSelectAllCurrentPage}
                          className="w-4 h-4 rounded text-[#F85606] accent-[#F85606] cursor-pointer"
                          title={isAllCurrentPageSelected ? 'Bỏ chọn toàn bộ trang này' : 'Tick chọn tất cả nhóm hàng trang này'}
                        />
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Mã nhóm hàng</th>
                      <th className="py-3 px-4 min-w-[220px]">Tên nhóm hàng</th>
                      <th className="py-3 px-4 min-w-[170px]">Cấp bậc / Ngành cha</th>
                      <th className="py-3 px-4 whitespace-nowrap">Số lượng SKU trong kho</th>
                      <th className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {loadingData || loadingCategories ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 size={24} className="animate-spin text-[#F85606]" />
                            <span className="text-gray-600 font-medium">Đang tải danh sách nhóm hàng có trong kho...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedCategories.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          {catKeyword
                            ? `Không tìm thấy nhóm hàng phù hợp với từ khóa "${catKeyword}"`
                            : 'Kho này hiện chưa có nhóm hàng nào có tồn kho.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedCategories.map((c) => {
                        const catId = Number(c.id);
                        const isSelected = selectedCategoryIds.includes(catId);
                        const parentName = c.parentId ? categoryMap.get(String(c.parentId)) : null;
                        const skuCount = (c as any).skuCount ?? (c as any).productCount ?? 0;

                        return (
                          <tr
                            key={c.id}
                            onClick={() => toggleCategory(catId)}
                            className={`transition-colors cursor-pointer group ${
                              isSelected
                                ? 'bg-orange-50/80 font-medium'
                                : 'hover:bg-gray-50/80 bg-white'
                            }`}
                          >
                            {/* Cột 1: Checkbox Chọn */}
                            <td
                              className="py-3.5 px-4 text-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategory(catId);
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggleCategory(catId)}
                                className="w-4 h-4 rounded text-[#F85606] accent-[#F85606] cursor-pointer"
                              />
                            </td>

                            {/* Cột 2: Mã nhóm */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                {c.code || '—'}
                              </span>
                            </td>

                            {/* Cột 3: Tên nhóm hàng */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <span className={`text-xs block ${isSelected ? 'text-[#F85606] font-bold' : 'text-gray-900 font-bold'}`}>
                                  {c.name}
                                </span>
                                {c.description && (
                                  <p className="text-[11px] text-gray-400 line-clamp-1">{c.description}</p>
                                )}
                              </div>
                            </td>

                            {/* Cột 4: Cấp bậc / Ngành cha */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {parentName ? (
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                                    Cấp 2
                                  </span>
                                  <span className="truncate max-w-[160px]" title={parentName}>
                                    {parentName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                                  Cấp 1 • Ngành hàng gốc
                                </span>
                              )}
                            </td>

                            {/* Cột 5: Số SKU trực thuộc kho */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  skuCount > 0
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                <strong className="font-mono">{skuCount}</strong> SKU
                              </span>
                            </td>

                            {/* Cột 6: Thao tác / Trạng thái */}
                            <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                              {isSelected ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategory(catId);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#F85606] text-white shadow-2xs hover:bg-[#e04d05] transition cursor-pointer"
                                >
                                  <Check size={12} strokeWidth={3} />
                                  <span>Đang chọn</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategory(catId);
                                  }}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:text-[#F85606] hover:border-orange-300 hover:bg-orange-50 transition cursor-pointer"
                                >
                                  Chọn nhóm này
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân trang chuẩn giống Danh mục nhà cung cấp */}
              {!loadingData && totalCatElements > 0 && (
                <Pagination
                  page={catPage}
                  totalPages={totalCatPages}
                  totalElements={totalCatElements}
                  size={catPageSize}
                  onPageChange={setCatPage}
                  onSizeChange={setCatPageSize}
                  itemLabel="nhóm hàng"
                />
              )}
            </div>
          </div>
        </div>

        {/* KHỐI 3: GHI CHÚ / MỤC ĐÍCH KIỂM KÊ */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-100">
            <FileText size={16} className="text-[#F85606]" />
            <span>3. Ghi Chú & Mục Đích Kiểm Kê</span>
          </div>

          <div>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Ví dụ: Kiểm kê định kỳ chốt sổ tháng, kiểm kê đột xuất nhóm đồ uống giải nhiệt..."
              className="w-full p-3 text-xs border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <div className="text-right text-[11px] text-gray-400 mt-1">
              {note.length}/500 ký tự
            </div>
          </div>
        </div>

        {/* 5. FOOTER ACTIONS */}
        <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 italic text-center sm:text-left">
            Sau khi tạo, phiếu sẽ được chuyển thẳng sang màn hình nhập số lượng thực đếm.
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/inventory/stocktakes')}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F85606] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang khởi tạo phiếu & chụp snapshot...</span>
                </>
              ) : (
                <>
                  <ClipboardList size={16} />
                  <span>Tạo Phiếu Kiểm Kê (Chụp Snapshot)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
