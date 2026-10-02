import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { ProductItem, ProductStatus } from '../../types/product';
import {
  getProducts,
  saveProduct,
  deleteProduct,
  toggleProductStatus,
  canViewCostPrice,
  PRODUCT_CATEGORIES
} from '../../services/productService';
import { SkuDeclarationModal } from './components/SkuDeclarationModal';
import { ProductExcelImportModal } from './components/ProductExcelImportModal';
import { CategoryTreeView } from './components/CategoryTreeView';
import {
  Package,
  Plus,
  FileSpreadsheet,
  Search,
  Filter,
  Edit,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  Boxes,
  Layers
} from '../../components/common/Icons';

export const ProductManagementPage: React.FC = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const allowCost = canViewCostPrice(userRoles);

  // Danh sách sản phẩm & loading
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Thông báo phản hồi
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tab hiển thị: 'products' (Danh sách SKU) | 'categories' (Cây nhóm hàng đa cấp S2-06)
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  // Modal Khai báo SKU & Cài đặt ĐVT (S2-05, S2-07)
  const [isSkuModalOpen, setIsSkuModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Modal Import Excel & Lưới báo lỗi từng dòng (S2-08)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Tải danh sách sản phẩm
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProducts(userRoles);
      setProducts(data);
    } catch {
      setAlert({ type: 'error', message: 'Không thể tải danh mục sản phẩm' });
    } finally {
      setLoading(false);
    }
  }, [userRoles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xử lý lưu sản phẩm từ SkuDeclarationModal
  const handleSaveProduct = async (productToSave: ProductItem) => {
    const res = await saveProduct(productToSave, userRoles);
    if (res.success) {
      setAlert({ type: 'success', message: res.message });
      await loadData();
    }
    return res;
  };

  // Xử lý xoá sản phẩm (S2-05)
  const handleDeleteProduct = async (item: ProductItem) => {
    if (item.hasTransactions) {
      setAlert({
        type: 'error',
        message: `Sản phẩm [${item.sku}] đã phát sinh giao dịch trên đơn hàng/sổ kho. Theo quy tắc nghiệp vụ S2-05, BẮT BUỘC chỉ được chuyển sang trạng thái "Ngừng kinh doanh" chứ không được xoá!`
      });
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xoá sản phẩm [${item.sku} - ${item.name}]?`)) {
      const res = await deleteProduct(item.id);
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
        await loadData();
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    }
  };

  // Xử lý đổi trạng thái kinh doanh
  const handleToggleStatus = async (item: ProductItem) => {
    const newStatus: ProductStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await toggleProductStatus(item.id, newStatus);
    if (res.success) {
      setAlert({ type: 'success', message: res.message });
      await loadData();
    } else {
      setAlert({ type: 'error', message: res.message });
    }
  };

  // Mở modal thêm mới
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsSkuModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEditModal = (item: ProductItem) => {
    setEditingProduct(item);
    setIsSkuModalOpen(true);
  };

  // Lọc sản phẩm theo điều kiện tìm kiếm
  const filteredProducts = products.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedStatus && p.status !== selectedStatus) return false;

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchSku = p.sku.toLowerCase().includes(kw);
      const matchName = p.name.toLowerCase().includes(kw);
      const matchBarcode = p.units?.some((u) => u.barcode.includes(kw));
      return matchSku || matchName || matchBarcode;
    }
    return true;
  });

  // Thống kê nhanh
  const totalSku = products.length;
  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;
  const inactiveCount = products.filter((p) => p.status === 'INACTIVE').length;
  const totalUnitsConfigured = products.reduce((acc, p) => acc + (p.units?.length || 1), 0);

  return (
    <div className="space-y-6">
      {/* Banner & Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              Phân hệ EP-02
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Sprint 2</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="text-blue-600 dark:text-blue-400" size={26} />
            Danh mục Sản phẩm & SKU
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Khai báo mã SKU chuẩn hóa (S2-05), bảng cài đặt quy đổi đơn vị tính kèm Barcode (S2-07) và nhập hàng loạt từ Excel với lưới báo lỗi từng dòng (S2-08).
          </p>
        </div>

        {/* Nút tác vụ chính */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition shadow-xs"
          >
            <FileSpreadsheet size={18} />
            <span>Import Excel (S2-08)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Plus size={18} />
            <span>Khai báo SKU mới (S2-05)</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: Danh sách SKU vs Cây nhóm hàng đa cấp (S2-06) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition ${
            activeTab === 'products'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package size={16} />
          <span>Danh sách SKU & Quy đổi ĐVT (S2-05, S2-07)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition ${
            activeTab === 'categories'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers size={16} />
          <span>Cây nhóm hàng đa cấp & Kéo thả (S2-06)</span>
        </button>
      </div>

      {/* Thông báo Alert */}
      {alert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition ${
            alert.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm">
            {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="text-xs font-semibold underline hover:no-underline ml-4"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Nội dung theo Tab: Cây nhóm hàng vs Danh sách SKU */}
      {activeTab === 'categories' ? (
        <CategoryTreeView
          onSelectCategory={(catName) => {
            setSelectedCategory(catName);
            setActiveTab('products');
          }}
        />
      ) : (
        <>
          {/* 4 Thẻ chỉ số tổng quan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Tổng số SKU</span>
            <Package size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalSku}</div>
          <div className="text-xs text-slate-400 mt-1">Mã hàng trong danh mục</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Đang kinh doanh</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{activeCount}</div>
          <div className="text-xs text-slate-400 mt-1">Sẵn sàng xuất đơn bán</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ngừng kinh doanh</span>
            <AlertCircle size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-500 font-mono">{inactiveCount}</div>
          <div className="text-xs text-slate-400 mt-1">Khóa không cho tạo mới đơn</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tổng ĐVT quy đổi</span>
            <Boxes size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">{totalUnitsConfigured}</div>
          <div className="text-xs text-slate-400 mt-1">Lon, Lốc, Thùng kèm Barcode</div>
        </div>
      </div>

      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã SKU, tên sản phẩm, mã vạch..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lọc ngành hàng */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả ngành hàng</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Lọc trạng thái */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kinh doanh</option>
            <option value="INACTIVE">Ngừng kinh doanh</option>
          </select>
        </div>

        {/* Nút reset & tải lại */}
        <button
          type="button"
          onClick={loadData}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          title="Tải lại danh sách"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Bảng dữ liệu danh sách sản phẩm & SKU */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-40">Mã SKU</th>
                <th className="py-3.5 px-4 min-w-[220px]">Sản phẩm & Quy cách</th>
                <th className="py-3.5 px-4 w-36">Ngành hàng</th>
                <th className="py-3.5 px-4 min-w-[200px]">ĐVT & Hệ số quy đổi</th>
                <th className="py-3.5 px-4 w-32 text-right">Giá bán cơ sở</th>
                <th className="py-3.5 px-4 w-32 text-right">Giá vốn</th>
                <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải danh mục SKU...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy sản phẩm nào khớp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    {/* Mã SKU */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                      {item.sku}
                    </td>

                    {/* Tên sản phẩm & Quy cách */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Quy cách: {item.packagingSpec || 'Chưa thiết lập'}
                      </div>
                    </td>

                    {/* Ngành hàng */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.category}
                      </span>
                    </td>

                    {/* Đơn vị tính cơ sở & Quy đổi */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.units && item.units.length > 0 ? (
                          item.units.map((u) => (
                            <span
                              key={u.id}
                              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                                u.isBaseUnit
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              }`}
                              title={`Barcode: ${u.barcode || 'Chưa có'} | Giá bán: ${u.sellingPrice.toLocaleString('vi-VN')}đ`}
                            >
                              <span>{u.unitName}</span>
                              <span className="text-[10px] opacity-75 font-mono">
                                ({u.conversionFactor}x)
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-blue-600 font-semibold">{item.baseUnit}</span>
                        )}
                      </div>
                    </td>

                    {/* Giá bán cơ sở */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {item.basePrice.toLocaleString('vi-VN')} đ
                    </td>

                    {/* Giá vốn (Bảo mật theo Role) */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {allowCost ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {item.costPrice ? item.costPrice.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-slate-400 font-normal italic"
                          title="Giá vốn chỉ hiển thị với Quản lý kinh doanh & Admin"
                        >
                          <ShieldAlert size={12} />
                          ••••••
                        </span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                        title="Bấm để chuyển trạng thái kinh doanh"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        ></span>
                        <span>{item.status === 'ACTIVE' ? 'Kinh doanh' : 'Ngừng KD'}</span>
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title="Sửa thông tin SKU & cài đặt ĐVT"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item)}
                          className={`p-1.5 rounded-lg transition ${
                            item.hasTransactions
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed hover:text-amber-500'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          }`}
                          title={
                            item.hasTransactions
                              ? 'Đã có giao dịch: Không thể xoá theo S2-05 (Chỉ được ngừng KD)'
                              : 'Xoá sản phẩm này'
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Modal Khai báo SKU & Cài đặt Quy đổi ĐVT (S2-05, S2-07) */}
      <SkuDeclarationModal
        isOpen={isSkuModalOpen}
        onClose={() => setIsSkuModalOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
        userRoles={userRoles}
      />

      {/* Modal Import Excel & Lưới báo lỗi từng dòng (S2-08) */}
      <ProductExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(msg) => {
          setAlert({ type: 'success', message: msg });
          loadData();
        }}
        userRoles={userRoles}
      />
    </div>
  );
};
