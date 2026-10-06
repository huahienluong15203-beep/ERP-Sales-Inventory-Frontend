import React, { useState, useEffect } from 'react';
import type { Agency } from '../../types/agency';
import type { OrderProductCatalogItem } from '../../services/orderService';
import { fetchBackendProductOptions, formatCurrencyVND } from '../../services/orderService';
import { Search, X, Plus, Check, Package, AlertCircle } from '../common/Icons';

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: OrderProductCatalogItem) => void;
  addedSkuList: string[];
  agency?: Agency | null;
}

export const ProductPickerModal: React.FC<ProductPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  addedSkuList,
  agency
}) => {
  const [keyword, setKeyword] = useState<string>('');
  const [products, setProducts] = useState<OrderProductCatalogItem[]>([]);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tìm trên Backend (giá theo bảng giá của nhóm khách hàng mà đại lý thuộc về), gõ >= 2 ký tự, chờ 300ms
  useEffect(() => {
    if (!isOpen) return;
    const kw = keyword.trim();
    setLoadError(null);
    if (!agency?.id || kw.length < 2) {
      setProducts([]);
      setLoadingBackend(false);
      return;
    }
    let alive = true;
    setLoadingBackend(true);
    const timer = setTimeout(() => {
      fetchBackendProductOptions(agency.id, kw)
        .then((items) => {
          if (alive) setProducts(items);
        })
        .catch((err: unknown) => {
          if (!alive) return;
          setProducts([]);
          setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách sản phẩm');
        })
        .finally(() => {
          if (alive) setLoadingBackend(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [isOpen, agency?.id, keyword]);

  const keywordTooShort = keyword.trim().length < 2;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold">
              <Package size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Chọn Sản Phẩm Vào Đơn Hàng
              </h3>
              <p className="text-[11px] text-gray-500">
                Tìm kiếm theo mã SKU hoặc tên sản phẩm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thanh tìm kiếm & Lọc danh mục */}
        <div className="p-3.5 border-b border-gray-100 space-y-2 bg-white">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Gõ mã SKU hoặc tên sản phẩm..."
              className="w-full h-10 pl-9 pr-14 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-orange-100 outline-none"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {loadingBackend && (
                <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
              )}
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="text-gray-400 hover:text-gray-600 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Danh sách sản phẩm cuộn được */}
        <div className="p-3 overflow-y-auto divide-y divide-gray-100 space-y-2 flex-1">
          {!agency ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <Package size={32} className="mx-auto text-gray-300" />
              <p className="text-xs font-medium">Chọn đại lý trước khi thêm sản phẩm</p>
              <span className="text-[11px]">Giá lấy theo bảng giá của nhóm khách hàng mà đại lý thuộc về</span>
            </div>
          ) : loadError ? (
            <div className="py-10 text-center space-y-1">
              <AlertCircle size={28} className="mx-auto text-red-400" />
              <p className="text-xs font-semibold text-red-600">{loadError}</p>
            </div>
          ) : keywordTooShort ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <Search size={30} className="mx-auto text-gray-300" />
              <p className="text-xs font-medium">Gõ ít nhất 2 ký tự mã SKU hoặc tên sản phẩm</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <Package size={32} className="mx-auto text-gray-300" />
              <p className="text-xs font-medium">{loadingBackend ? 'Đang tìm...' : 'Không tìm thấy sản phẩm nào khớp'}</p>
              {!loadingBackend && <span className="text-[11px]">Thử tìm với từ khóa khác</span>}
            </div>
          ) : (
            products.map((p) => {
              const isAdded = addedSkuList.includes(p.sku);

              return (
                <div
                  key={p.id}
                  className="pt-2 pb-2 flex items-center justify-between gap-3 hover:bg-gray-50/80 rounded-xl px-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600">
                        {p.sku}
                      </span>
                      <strong className="text-xs text-gray-900 truncate block">
                        {p.name}
                      </strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500">
                      <span>ĐVT cơ sở: <strong className="text-gray-700">{p.baseUnit}</strong></span>
                      <span>•</span>
                      <span>Quy cách: {p.availableUnits.map((u) => u.unitName).join(', ')}</span>
                    </div>

                    {p.priceAvailable === false ? (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                        <AlertCircle size={13} className="text-amber-500 shrink-0" />
                        <span>{p.priceMessage || 'Chưa có giá cho nhóm khách hàng này'}</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs font-bold text-[#F85606]">
                        {formatCurrencyVND(p.basePrice)} <span className="text-[10px] text-gray-400 font-normal">/{p.baseUnit}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={p.priceAvailable === false}
                    onClick={() => onSelectProduct(p)}
                    title={p.priceAvailable === false ? (p.priceMessage || 'Sản phẩm chưa có giá áp dụng') : undefined}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-xs ${
                      p.priceAvailable === false
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        : isAdded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-[#F85606] hover:bg-orange-600 text-white'
                    }`}
                  >
                    {p.priceAvailable === false ? (
                      <span>Chặn thêm</span>
                    ) : isAdded ? (
                      <>
                        <Check size={14} />
                        <span>Thêm tiếp</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Thêm vào đơn</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
