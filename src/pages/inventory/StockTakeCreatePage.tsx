import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Warehouse,
  Layers,
  FileText,
  AlertCircle,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Loader2,
  ArrowDown
} from 'lucide-react';
import type { WarehouseOption } from '../../types/inventory';
import type { CategoryWithCount } from '../../services/categoryApi';
import { fetchCategories } from '../../services/categoryApi';
import { createStockTake, fetchWarehousesList } from '../../services/stockTakeApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';

const CATEGORY_PAGE_SIZE = 8;

export const StockTakeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Form inputs
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
  const [note, setNote] = useState<string>('');

  // Category search, pagination & infinite scroll
  const [catKeyword, setCatKeyword] = useState<string>('');
  const [catPage, setCatPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'PAGE' | 'SCROLL'>('PAGE');
  const [visibleScrollCount, setVisibleScrollCount] = useState<number>(8);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Load danh sách kho và danh mục nhóm hàng
  useEffect(() => {
    let alive = true;
    setLoadingData(true);
    Promise.all([
      fetchWarehousesList(),
      fetchCategories().catch(() => [])
    ])
      .then(([whList, catList]) => {
        if (!alive) return;
        setWarehouses(whList);
        if (whList.length > 0) {
          setSelectedWarehouseId(Number(whList[0].id));
        }
        setCategories(catList);
      })
      .catch((err) => {
        if (alive) {
          console.error('Lỗi nạp dữ liệu kiểm kê:', err);
          setErrorMsg('Không thể tải danh sách kho hoặc nhóm hàng.');
        }
      })
      .finally(() => {
        if (alive) setLoadingData(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  // Lọc danh mục nhóm hàng theo từ khóa
  const filteredCategories = useMemo(() => {
    if (!catKeyword.trim()) return categories;
    const kw = catKeyword.trim().toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        (c.code && c.code.toLowerCase().includes(kw))
    );
  }, [categories, catKeyword]);

  // Phân trang danh mục nhóm hàng
  const totalCatPages = Math.ceil(filteredCategories.length / CATEGORY_PAGE_SIZE) || 1;

  useEffect(() => {
    setCatPage(1);
    setVisibleScrollCount(8);
  }, [catKeyword]);

  // IntersectionObserver khi ở chế độ cuộn tải tiếp
  useEffect(() => {
    if (viewMode !== 'SCROLL') return;
    const el = scrollSentinelRef.current;
    if (!el) return;
    if (visibleScrollCount >= filteredCategories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleScrollCount((prev) => Math.min(prev + 8, filteredCategories.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode, visibleScrollCount, filteredCategories.length]);

  const displayedCategories = useMemo(() => {
    if (viewMode === 'SCROLL') {
      return filteredCategories.slice(0, visibleScrollCount);
    }
    const start = (catPage - 1) * CATEGORY_PAGE_SIZE;
    return filteredCategories.slice(start, start + CATEGORY_PAGE_SIZE);
  }, [filteredCategories, viewMode, visibleScrollCount, catPage]);

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
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
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
    <div className="space-y-6 antialiased max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

        {/* KHỐI 2: CHỌN PHẠM VI NHÓM HÀNG (CÓ PHÂN TRANG ĐẦY ĐỦ, CUỘN TẢI TIẾP, KHÔNG ĐỔ DANH SÁCH LÊN TRÊN) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Layers size={16} className="text-emerald-600" />
              <span>2. Phạm Vi Nhóm Hàng Cần Kiểm Kê</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Chế độ xem: Phân trang hoặc Cuộn tải tiếp */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('PAGE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'PAGE'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Phân trang
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('SCROLL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'SCROLL'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Cuộn tải tiếp
                </button>
              </div>

              {/* Trạng thái phân trang rõ ràng */}
              <div className="text-xs text-gray-500 font-medium">
                {viewMode === 'PAGE' ? (
                  <>
                    Đang hiển thị:{' '}
                    <strong className="text-gray-900 font-mono">
                      {filteredCategories.length === 0 ? 0 : (catPage - 1) * CATEGORY_PAGE_SIZE + 1} -{' '}
                      {Math.min(catPage * CATEGORY_PAGE_SIZE, filteredCategories.length)}
                    </strong>{' '}
                    / <strong className="text-[#F85606] font-mono">{filteredCategories.length}</strong> nhóm
                  </>
                ) : (
                  <>
                    Đã tải:{' '}
                    <strong className="text-gray-900 font-mono">
                      {Math.min(visibleScrollCount, filteredCategories.length)}
                    </strong>{' '}
                    / <strong className="text-[#F85606] font-mono">{filteredCategories.length}</strong> nhóm
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ô chọn nhanh: Toàn bộ mặt hàng trong kho */}
          <div
            onClick={() => setSelectedCategoryId('')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              selectedCategoryId === ''
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
                selectedCategoryId === ''
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {selectedCategoryId === '' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>

          {/* Tìm kiếm nhóm hàng cụ thể */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-700 uppercase">
                Hoặc chọn một nhóm hàng cụ thể:
              </span>
              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm nhóm hàng theo tên, mã..."
                  value={catKeyword}
                  onChange={(e) => setCatKeyword(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            {/* Danh sách nhóm hàng dạng Grid / Card mở to trên trang (không đổ ngược lên trên) */}
            {loadingData ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 size={24} className="animate-spin text-[#F85606] mx-auto" />
                <p className="text-xs text-gray-400">Đang tải danh sách nhóm hàng...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                Không tìm thấy nhóm hàng phù hợp với từ khóa &ldquo;{catKeyword}&rdquo;
              </div>
            ) : (
              <div
                className={
                  viewMode === 'SCROLL'
                    ? 'max-h-[380px] overflow-y-auto pr-1 space-y-3 custom-scrollbar'
                    : 'space-y-3'
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {displayedCategories.map((c) => {
                    const isSelected = Number(c.id) === Number(selectedCategoryId);
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCategoryId(Number(c.id))}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'border-[#F85606] bg-orange-50/60 shadow-xs ring-1 ring-[#F85606]'
                            : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/20'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          {c.code && (
                            <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200 inline-block">
                              {c.code}
                            </span>
                          )}
                          <h5 className="font-bold text-gray-900 text-xs truncate" title={c.name}>
                            {c.name}
                          </h5>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {c.productCount ?? 0} SKU trực thuộc
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#F85606] bg-[#F85606] text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Phần tử Sentinel cuộn tải tiếp (Infinite scroll) */}
                {viewMode === 'SCROLL' && (
                  <div className="pt-2">
                    {visibleScrollCount < filteredCategories.length ? (
                      <div
                        ref={scrollSentinelRef}
                        className="p-3 text-center rounded-xl bg-orange-50/50 border border-orange-100 text-xs text-gray-500 flex items-center justify-center gap-2"
                      >
                        <ArrowDown size={14} className="text-[#F85606] animate-bounce" />
                        <span>
                          Cuộn tiếp để tải thêm nhóm hàng (Đã hiển thị {visibleScrollCount}/
                          {filteredCategories.length})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleScrollCount((prev) =>
                              Math.min(prev + 8, filteredCategories.length)
                            )
                          }
                          className="ml-2 px-2 py-0.5 rounded-lg bg-white border border-orange-200 text-[#F85606] font-bold hover:bg-orange-50 transition"
                        >
                          Tải thêm +8
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 text-center text-xs text-gray-400 italic">
                        Đã tải toàn bộ {filteredCategories.length} nhóm hàng
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Phân trang đầy đủ cho danh sách nhóm hàng (khi ở chế độ Phân trang) */}
            {viewMode === 'PAGE' && totalCatPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-500">
                  Trang <strong className="text-gray-900">{catPage}</strong> /{' '}
                  <strong className="text-gray-900">{totalCatPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCatPage(1)}
                    disabled={catPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatPage((p) => Math.max(1, p - 1))}
                    disabled={catPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Trang trước"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalCatPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCatPage(p)}
                        className={`min-w-[26px] h-6.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          catPage === p
                            ? 'bg-[#F85606] text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-[#F85606]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCatPage((p) => Math.min(totalCatPages, p + 1))}
                    disabled={catPage === totalCatPages}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Trang sau"
                  >
                    <ChevronRight size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatPage(totalCatPages)}
                    disabled={catPage === totalCatPages}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Trang cuối"
                  >
                    <ChevronsRight size={13} />
                  </button>
                </div>
              </div>
            )}
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
