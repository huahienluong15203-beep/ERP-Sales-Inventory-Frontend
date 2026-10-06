import React, { useState, useEffect, useCallback } from 'react';
import type { Product, ProductStatus } from '../../types/product';
import {
  productService,
  PRODUCT_CATEGORIES,
  canManageCostPrice,
  formatCurrencyVND
} from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';
import { Icons } from '../../components/common/Icons';
import { ProductFormModal } from './components/ProductFormModal';
import { useNavigate } from '../../routes/Router';
import { useUrlPaging } from '../../hooks/useUrlParams';
import { useServerSearch } from '../../hooks/useServerSearch';
import { Pagination } from '../../components/common/Pagination';
import { fetchCategories } from '../../services/categoryApi';
import { ProductUnitConversionModal } from './components/ProductUnitConversionModal';

export const ProductManagementPage: React.FC = () => {
  const { currentRole } = useAuth();
  const canSeeCost = canManageCostPrice(currentRole);
  const canManageProducts = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER';

  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, categoryCount: 0 });
  const [categoryOptions, setCategoryOptions] = useState<string[]>([...PRODUCT_CATEGORIES]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Bộ lọc + trang lưu trên URL, vd: /products?category=Bia&status=ACTIVE&page=3
  const { params: urlParams, setParams: setUrlParams, page, size, setPage, setSize, setFilters } = useUrlPaging({
    keyword: '',
    category: 'ALL',
    status: 'ALL'
  });
  const selectedCategory = urlParams.category;
  const selectedStatus = urlParams.status as ProductStatus | 'ALL';
  const setSelectedCategory = (value: string) => setFilters({ category: value });
  const setSelectedStatus = (value: ProductStatus | 'ALL') => setFilters({ status: value });

  // Ô tìm kiếm: đợi ngừng gõ 0,4 giây mới gọi API
  const [keyword, setKeyword] = useState(urlParams.keyword);
  const resetToFirstPage = useCallback(() => setPage(0), [setPage]);
  const { serverKeyword } = useServerSearch(keyword, resetToFirstPage, urlParams.keyword);
  useEffect(() => {
    setUrlParams({ keyword: serverKeyword });
  }, [serverKeyword, setUrlParams]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [unitConversionProduct, setUnitConversionProduct] = useState<Product | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);

  // Tải 1 trang sản phẩm từ Backend (lọc + phân trang phía server)
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productService.getProducts({
        keyword: serverKeyword,
        category: selectedCategory,
        status: selectedStatus,
        page,
        size
      });
      setProducts(res.products);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
      if (res.totalPages > 0 && page > res.totalPages - 1) {
        setPage(res.totalPages - 1);
      }
    } catch (err: unknown) {
      setProducts([]);
      showToast(err instanceof Error ? err.message : 'Không tải được danh sách sản phẩm!', 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKeyword, selectedCategory, selectedStatus, page, size, setPage]);

  // Số liệu thẻ đầu trang (đếm trên toàn bộ sản phẩm) + danh sách nhóm hàng cho ô lọc
  const loadStats = useCallback(async () => {
    try {
      const [s, categories] = await Promise.all([
        productService.getStats(),
        fetchCategories().catch(() => [])
      ]);
      const names = Array.from(
        new Set([...PRODUCT_CATEGORIES, ...categories.map((c) => c.name)].filter(Boolean))
      );
      setCategoryOptions(names);
      setStats({ ...s, categoryCount: categories.length || PRODUCT_CATEGORIES.length });
    } catch {
      // Lỗi đã báo ở loadProducts
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const reloadAll = () => {
    loadProducts();
    loadStats();
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  // Sản phẩm không xoá cứng (quy tắc 8) -> chỉ Ngừng kinh doanh / Mở lại kinh doanh
  const handleSwitchToInactive = async () => {
    if (!deactivateTarget) return;
    const res = await productService.deactivateProduct(deactivateTarget.id);
    setDeactivateTarget(null);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) reloadAll();
  };

  const handleActivate = async (p: Product) => {
    const res = await productService.activateProduct(p.id);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) reloadAll();
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] max-w-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium border bg-white animate-in fade-in slide-in-from-bottom-2 ${toastMessage.type === 'error' ? 'border-red-200 text-red-700' : 'border-emerald-200 text-emerald-800'
            }`}
        >
          {toastMessage.type === 'error' ? (
            <Icons.AlertCircle size={18} className="text-red-500 shrink-0" />
          ) : (
            <Icons.CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Phân hệ - Nút tác vụ */}
      <div className="flex items-center justify-end gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={reloadAll}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-[#F85606] hover:border-orange-200 transition shadow-xs cursor-pointer min-h-[44px]"
            title="Làm mới danh sách sản phẩm"
          >
            <Icons.RefreshCw size={16} className={isLoading ? 'animate-spin text-orange-600' : ''} />
            <span>Làm mới</span>
          </button>

          {canManageProducts && (
            <>
              <button
                type="button"
                onClick={() => navigate('/products/import')}
                className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 min-h-[44px]"
                title="Nhập danh mục sản phẩm từ file Excel"
              >
                <Icons.ClipboardList size={18} className="text-emerald-700" />
                <span>Nhập từ Excel</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:shadow transition-all duration-200 min-h-[44px]"
              >
                <Icons.Plus size={18} />
                <span>Thêm sản phẩm mới</span>
              </button>
            </>
          )}
        </div>
      </div>


      {/* Hàng Stat Cards chuẩn App ETC */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tổng sản phẩm</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
            <Icons.Package size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Đang kinh doanh</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Icons.CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ngừng kinh doanh</p>
            <p className="text-2xl font-bold text-gray-500 mt-1">{stats.inactive}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200">
            <Icons.AlertCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nhóm hàng</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.categoryCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Icons.Building2 size={20} />
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Icons.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo Mã SKU, tên hàng, quy cách đóng gói..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
          />
        </div>

        <div className="w-full sm:w-52">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
          >
            <option value="ALL">Tất cả nhóm hàng</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ProductStatus | 'ALL')}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kinh doanh</option>
            <option value="INACTIVE">Ngừng kinh doanh</option>
          </select>
        </div>

        <div className="w-full sm:w-auto sm:ml-auto text-xs sm:text-sm text-gray-500 font-medium">
          Tìm thấy: <span className="font-bold text-gray-900">{totalElements.toLocaleString('vi-VN')}</span> sản phẩm
        </div>
      </div>

      {/* Bảng danh sách sản phẩm */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-14 text-center whitespace-nowrap">Ảnh</th>
                <th className="py-3.5 px-4 w-32 whitespace-nowrap">Mã SKU</th>
                <th className="py-3.5 px-4 min-w-[220px] whitespace-nowrap">Tên sản phẩm</th>
                <th className="py-3.5 px-4 w-44 whitespace-nowrap">Nhóm hàng</th>
                <th className="py-3.5 px-4 w-28 text-center whitespace-nowrap">ĐVT cơ sở</th>
                <th className="py-3.5 px-4 w-44 whitespace-nowrap">Quy cách đóng gói</th>
                <th className="py-3.5 px-4 w-36 text-right whitespace-nowrap">Giá vốn</th>
                <th className="py-3.5 px-4 w-36 text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-4 w-28 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                    Đang tải dữ liệu sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Icons.Package size={36} className="text-gray-300" />
                      <span className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp</span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isInactive = p.status === 'INACTIVE';
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors hover:bg-orange-50/40 ${isInactive ? 'bg-gray-50/60' : 'bg-white'
                        }`}
                    >
                      {/* 1. Ảnh với fallback an toàn */}
                      <td className="py-3 px-4 text-center">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 inline-flex items-center justify-center overflow-hidden border border-gray-200/80">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.sku}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.querySelector('.fallback-icon')?.removeAttribute('style');
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                          <span
                            className="fallback-icon flex items-center justify-center"
                            style={{ display: p.imageUrl ? 'none' : 'flex' }}
                          >
                            <Icons.Package size={18} className="text-orange-500" />
                          </span>
                        </div>
                      </td>

                      {/* 2. Mã SKU */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-orange-700 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded">
                          {p.sku}
                        </span>
                      </td>

                      {/* 3. Tên sản phẩm */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div>{p.name}</div>
                        {p.transactionCount > 0 && (
                          <span className="text-xs text-gray-500 font-normal">
                            Đã phát sinh {p.transactionCount} giao dịch
                          </span>
                        )}
                      </td>

                      {/* 4. Nhóm hàng */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {p.category}
                      </td>

                      {/* 5. ĐVT cơ sở */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setUnitConversionProduct(p)}
                          title="Xem và quản lý các đơn vị tính quy đổi"
                          className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 border border-orange-200/80 px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>{p.baseUnit}</span>
                          <Icons.Scale size={13} className="text-orange-600" />
                        </button>
                      </td>

                      {/* 6. Quy cách đóng gói */}
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {p.packagingSpec}
                      </td>

                      {/* 7. GIÁ VỐN (Bảo mật RBAC) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canSeeCost ? (
                          <span className="font-bold text-orange-700">
                            {formatCurrencyVND(p.costPrice)}
                          </span>
                        ) : (
                          <span
                            title="Bảo mật: Chỉ Quản lý kinh doanh & Admin được xem giá vốn"
                            className="inline-flex items-center gap-1.5 text-gray-400 text-xs tracking-widest cursor-help"
                          >
                            <Icons.Lock size={13} className="text-gray-400" />
                            ••••••
                          </span>
                        )}
                      </td>

                      {/* 8. Trạng thái */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.status === 'ACTIVE' ? (
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            Đang kinh doanh
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            Ngừng kinh doanh
                          </span>
                        )}
                      </td>

                      {/* 9. Thao tác */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Quản lý đơn vị tính quy đổi"
                            onClick={() => setUnitConversionProduct(p)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                          >
                            <Icons.Scale size={16} />
                          </button>

                          {canManageProducts && (
                            <>
                              <button
                                type="button"
                                title="Sửa thông tin sản phẩm"
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              >
                                <Icons.Edit size={16} />
                              </button>

                              {p.status === 'ACTIVE' ? (
                                <button
                                  type="button"
                                  title="Ngừng kinh doanh (sản phẩm không xoá khỏi hệ thống)"
                                  onClick={() => setDeactivateTarget(p)}
                                  className="p-1.5 rounded-lg transition-colors cursor-pointer text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Icons.Trash2 size={16} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Mở lại kinh doanh"
                                  onClick={() => handleActivate(p)}
                                  className="p-1.5 rounded-lg transition-colors cursor-pointer text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Icons.RotateCcw size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang: ‹ 1 2 … n › */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
          itemLabel="sản phẩm"
          disabled={isLoading}
        />
      </div>

      {/* Modal Khai báo / Chỉnh sửa */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          reloadAll();
        }}
        productToEdit={editingProduct}
      />

      {/* Modal NGỪNG KINH DOANH (sản phẩm không xoá cứng để giữ lịch sử giao dịch) */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full my-auto p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <Icons.AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Ngừng kinh doanh sản phẩm?</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Sản phẩm <b className="text-gray-900">{deactivateTarget.sku} - {deactivateTarget.name}</b> sẽ chuyển sang{' '}
                  <b>Ngừng kinh doanh</b>. Theo quy định, sản phẩm không bị xoá khỏi hệ thống để giữ nguyên lịch sử
                  đơn hàng, kho và công nợ. Bạn có thể mở lại kinh doanh bất cứ lúc nào.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSwitchToInactive}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors shadow-xs"
              >
                Chuyển sang Ngừng kinh doanh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý Đơn vị tính quy đổi */}
      <ProductUnitConversionModal
        isOpen={Boolean(unitConversionProduct)}
        onClose={() => setUnitConversionProduct(null)}
        product={unitConversionProduct}
        onSuccess={(msg) => {
          showToast(msg);
        }}
      />
    </div>
  );
};

