import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
  Layers,
  RefreshCw
} from 'lucide-react';
import { productService } from '../../services/productService';
import { toggleProductBatchManagement } from '../../services/productLotApi';
import type { Product } from '../../types/product';
import { useAuth } from '../../contexts/AuthContext';

interface ProductBatchManagementConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const ProductBatchManagementConfigModal: React.FC<ProductBatchManagementConfigModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  const { showToast } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getProducts({ page: 0, size: 500 });
      setProducts(res.products || []);
    } catch (err: any) {
      console.warn('Lỗi tải danh mục sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) => {
    const matchKw =
      !keyword ||
      p.sku.toLowerCase().includes(keyword.toLowerCase().trim()) ||
      p.name.toLowerCase().includes(keyword.toLowerCase().trim()) ||
      (p.category && p.category.toLowerCase().includes(keyword.toLowerCase().trim()));

    if (!matchKw) return false;

    if (filterMode === 'ACTIVE') return p.hasBatchManagement;
    if (filterMode === 'INACTIVE') return !p.hasBatchManagement;
    return true;
  });

  const activeCount = products.filter((p) => p.hasBatchManagement).length;
  const inactiveCount = products.filter((p) => !p.hasBatchManagement).length;

  const handleToggle = async (product: Product) => {
    const nextVal = !product.hasBatchManagement;
    setTogglingId(product.id);
    try {
      await toggleProductBatchManagement(product.id, nextVal);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, hasBatchManagement: nextVal } : p))
      );
      showToast?.(
        nextVal
          ? `Đã BẬT quản lý lô cho SKU ${product.sku}`
          : `Đã TẮT quản lý lô cho SKU ${product.sku}`,
        'success'
      );
      onUpdated?.();
    } catch (err: any) {
      showToast?.(err.message || 'Không thể thay đổi cấu hình quản lý lô', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-orange-600 to-[#F85606] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl shadow-inner backdrop-blur-xs">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Cấu hình Bật / Tắt Quản lý Lô theo từng SKU
              </h3>
              <p className="text-xs text-orange-100 mt-0.5">
                Kích hoạt hoặc vô hiệu hóa cơ chế theo dõi số lô, hạn sử dụng và trừ tồn kho theo FEFO
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="p-4 sm:p-5 bg-gray-50/80 border-b border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm kiếm theo mã SKU, tên sản phẩm hoặc nhóm hàng..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${filterMode === 'ALL'
                    ? 'bg-[#F85606] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Tất cả ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${filterMode === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-emerald-700'
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Đang theo dõi lô ({activeCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${filterMode === 'INACTIVE'
                    ? 'bg-gray-700 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Chưa theo dõi ({inactiveCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Product Table */}
        <div className="max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
              <p className="text-xs font-semibold">Đang tải danh sách SKU...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <Package className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-xs font-semibold">Không tìm thấy sản phẩm phù hợp</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] sticky top-0 z-10 backdrop-blur-sm">
                  <th className="py-2.5 px-4 w-32">Mã SKU</th>
                  <th className="py-2.5 px-4">Tên sản phẩm</th>
                  <th className="py-2.5 px-3 w-28">Nhóm hàng</th>
                  <th className="py-2.5 px-3 text-center w-16">ĐVT</th>
                  <th className="py-2.5 px-4 text-center w-48">Trạng thái theo dõi lô (S6-01)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const isToggling = togglingId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{p.name}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 text-[11px]">
                        {p.category || 'Mặc định'}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700 font-medium">
                        {p.baseUnit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggle(p)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs ${p.hasBatchManagement
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                            }`}
                        >
                          {isToggling ? (
                            <RefreshCw size={12} className="animate-spin text-orange-500" />
                          ) : (
                            <span
                              className={`w-2 h-2 rounded-full ${p.hasBatchManagement ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                                }`}
                            />
                          )}
                          <span>{p.hasBatchManagement ? 'Đang theo dõi lô' : 'Đang tắt (Nhấp bật)'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Hiển thị <strong>{filteredProducts.length}</strong> / <strong>{products.length}</strong> SKU sản phẩm
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
