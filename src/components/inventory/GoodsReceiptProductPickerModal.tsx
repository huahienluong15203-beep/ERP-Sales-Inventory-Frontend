import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Plus,
  Check,
  Package,
  RefreshCw
} from 'lucide-react';
import type { Product } from '../../types/product';
import { productService, PRODUCT_CATEGORIES } from '../../services/productService';

interface GoodsReceiptProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  addedProductIds: number[];
}

export const GoodsReceiptProductPickerModal: React.FC<GoodsReceiptProductPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  addedProductIds
}) => {
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [recentAddedIds, setRecentAddedIds] = useState<Set<number>>(new Set());

  // Tải danh sách sản phẩm từ backend
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    setLoading(true);

    const timer = setTimeout(() => {
      productService
        .getProducts({
          keyword: keyword.trim() || undefined,
          category: selectedCategory === 'ALL' ? undefined : selectedCategory,
          status: 'ACTIVE',
          size: 50
        })
        .then((res) => {
          if (isSubscribed) {
            setProducts(res.products || []);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Lỗi tải sản phẩm cho phiếu nhập:', err);
          if (isSubscribed) setLoading(false);
        });
    }, 250);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isOpen, keyword, selectedCategory]);

  const handleSelect = (prod: Product) => {
    onSelectProduct(prod);
    setRecentAddedIds((prev) => new Set(prev).add(Number(prod.id)));
  };

  const isAdded = (prodId: string | number) => {
    const numId = Number(prodId);
    return addedProductIds.includes(numId) || recentAddedIds.has(numId);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 via-amber-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F85606] to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Package size={22} />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <span>Danh Sách Sản Phẩm Nhập Kho</span>
              </h3>
              <p className="text-xs text-gray-500">
                Tìm kiếm và bấm chọn sản phẩm để thêm trực tiếp vào phiếu nhập kho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ô Tìm kiếm & Lọc Ngành hàng */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Tìm theo mã SKU, tên sản phẩm..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606] transition shadow-2xs"
              autoFocus
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dải phân loại ngành hàng */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                selectedCategory === 'ALL'
                  ? 'bg-[#F85606] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Tất cả ngành hàng
            </button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer text-xs ${
                  selectedCategory === cat
                    ? 'bg-[#F85606] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách sản phẩm dạng bảng rộng rãi */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <RefreshCw size={28} className="animate-spin text-[#F85606] mx-auto" />
              <p className="text-xs font-semibold">Đang tìm kiếm sản phẩm...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <Package size={36} className="mx-auto text-gray-300" />
              <p className="text-sm font-bold text-gray-700">Không tìm thấy sản phẩm phù hợp</p>
              <p className="text-xs text-gray-400">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn ngành hàng khác
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-gray-100">
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 bg-gray-50/90 p-3 text-[11px] font-bold text-gray-600 uppercase">
                <div className="col-span-3">Mã SKU</div>
                <div className="col-span-4">Tên sản phẩm</div>
                <div className="col-span-2 text-center">ĐVT Cơ Sở</div>
                <div className="col-span-3 text-right">Thao tác</div>
              </div>

              {products.map((p) => {
                const added = isAdded(p.id);

                return (
                  <div
                    key={p.id}
                    className="p-3 sm:p-2.5 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 sm:items-center hover:bg-orange-50/20 transition-colors"
                  >
                    <div className="sm:col-span-3">
                      <span className="font-mono font-bold text-xs text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 inline-block">
                        {p.sku}
                      </span>
                      <span className="text-[11px] text-gray-400 block mt-0.5 sm:hidden">
                        {p.category}
                      </span>
                    </div>

                    <div className="sm:col-span-4 space-y-0.5">
                      <p className="font-semibold text-xs sm:text-sm text-gray-900 leading-tight">
                        {p.name}
                      </p>
                      <span className="hidden sm:inline-block text-[11px] text-gray-400">
                        {p.category}
                        {p.packagingSpec ? ` • ${p.packagingSpec}` : ''}
                      </span>
                    </div>

                    <div className="sm:col-span-2 text-left sm:text-center">
                      <span className="text-[11px] font-semibold text-gray-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">
                        {p.baseUnit}
                      </span>
                    </div>

                    <div className="sm:col-span-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSelect(p)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95 ${
                          added
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-[#F85606] hover:bg-orange-600 text-white shadow-orange-500/20'
                        }`}
                      >
                        {added ? (
                          <>
                            <Check size={13} className="text-emerald-700" />
                            <span>+ Thêm tiếp</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} />
                            <span>Thêm vào phiếu</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Hiển thị tối đa 50 sản phẩm đang kinh doanh. Bấm tìm kiếm nếu chưa thấy sản phẩm.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
