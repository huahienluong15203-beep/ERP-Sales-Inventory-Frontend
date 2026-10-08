import React, { useState, useEffect } from 'react';
import type { Agency } from '../../types/agency';
import type { OrderProductCatalogItem } from '../../services/orderService';
import { fetchBackendProductOptions, formatCurrencyVND } from '../../services/orderService';
import {
  Search,
  X,
  Plus,
  Check,
  Package,
  AlertCircle,
  Building2,
  Phone,
  Tag,
  BadgeDollarSign,
  CreditCard
} from '../common/Icons';

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

  // Tự động tải sản phẩm theo cấp đại lý ngay khi mở modal, và lọc khi người dùng gõ từ khóa
  useEffect(() => {
    if (!isOpen) return;

    const kw = keyword.trim();
    setLoadError(null);

    if (!agency?.id || !agency?.priceList) {
      setProducts([]);
      setLoadingBackend(false);
      return;
    }

    let alive = true;
    setLoadingBackend(true);

    // Nếu kw rỗng thì tải ngay không delay; nếu có gõ từ khóa thì debounce 250ms
    const delay = kw === '' ? 0 : 250;
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
    }, delay);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [isOpen, agency?.id, agency?.priceList, keyword]);

  // Reset từ khóa khi đóng mở modal
  useEffect(() => {
    if (isOpen) {
      setKeyword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const priceListName = agency?.priceList?.name || 'Chưa có bảng giá áp dụng';
  const groupLabel = agency?.customerGroupName || (agency?.customerGroup === 'TIER_1' ? 'Đại lý Cấp 1' : agency?.customerGroup === 'TIER_2' ? 'Đại lý Cấp 2' : 'Khách lẻ');

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold shadow-xs">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Chọn Sản Phẩm Vào Đơn Hàng
              </h3>
              <p className="text-[11px] text-gray-500">
                Hiển thị danh mục mặt hàng và giá niêm yết theo cấp đại lý
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* THÔNG TIN ĐẠI LÝ ĐÃ CHỌN (Card hiển thị nổi bật) */}
        {agency ? (
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-orange-50/90 via-amber-50/40 to-orange-50/70 rounded-xl border border-orange-200/90 shadow-xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#F85606]/10 text-[#F85606] flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                      {agency.code}
                    </span>
                    <strong className="text-xs sm:text-sm text-gray-900 font-bold truncate">
                      {agency.name}
                    </strong>
                  </div>
                  <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                    {agency.taxCode && (
                      <span>MST: <strong className="text-gray-700">{agency.taxCode}</strong></span>
                    )}
                    {agency.phone && (
                      <span className="flex items-center gap-0.5">
                        <Phone size={11} className="text-gray-400" /> {agency.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Badge Cấp đại lý */}
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-[#F85606] border border-orange-300 shadow-xs shrink-0 flex items-center gap-1">
                <Tag size={12} />
                {groupLabel}
              </span>
            </div>

            {/* Hàng 2: Bảng giá áp dụng & Hạn mức công nợ */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-orange-200/60 text-[11px]">
              <div className="inline-flex items-center gap-1.5 text-gray-700 min-w-0">
                <BadgeDollarSign size={14} className="text-[#F85606] shrink-0" />
                <span className="text-gray-500 shrink-0">Bảng giá:</span>
                <strong className="text-gray-900 truncate" title={priceListName}>
                  {priceListName}
                </strong>
              </div>
              <div className="inline-flex items-center gap-1.5 text-gray-600 shrink-0">
                <CreditCard size={13} className="text-emerald-600" />
                <span className="text-gray-500">Hạn mức:</span>
                <strong className="text-emerald-700 font-bold">
                  {formatCurrencyVND(agency.creditLimit)}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 text-center">
            Vui lòng chọn đại lý ở bước 1 để áp dụng đúng bảng giá và danh mục mặt hàng.
          </div>
        )}

        {/* Thanh tìm kiếm & Trạng thái */}
        <div className="p-4 border-b border-gray-100 space-y-2 bg-white">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={agency ? `Tìm theo mã SKU hoặc tên sản phẩm trong bảng giá ${groupLabel}...` : 'Gõ mã SKU hoặc tên sản phẩm...'}
              className="w-full h-10 pl-9 pr-14 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {loadingBackend && (
                <span className="w-4 h-4 border-2 border-[#F85606] border-t-transparent rounded-full animate-spin inline-block" />
              )}
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="text-gray-400 hover:text-gray-600 text-xs p-1 rounded-full hover:bg-gray-100"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
            <span>
              {loadingBackend
                ? 'Đang tải danh mục sản phẩm...'
                : products.length > 0
                ? `Hiển thị ${products.length} sản phẩm theo bảng giá ${groupLabel}`
                : keyword
                ? `Không có kết quả khớp với "${keyword}"`
                : 'Chưa có sản phẩm'}
            </span>
            {keyword && (
              <span className="text-gray-400">
                Tìm kiếm theo SKU hoặc tên
              </span>
            )}
          </div>
        </div>

        {/* Danh sách sản phẩm cuộn được */}
        <div className="p-3 sm:p-4 overflow-y-auto divide-y divide-gray-100 space-y-2 flex-1">
          {agency && !agency.priceList ? (
            <div className="py-12 text-center text-amber-800 space-y-2">
              <AlertCircle size={36} className="mx-auto text-amber-500" />
              <p className="text-xs font-bold text-amber-900">Đại lý chưa có bảng giá hiệu lực</p>
              <p className="text-[11px] text-amber-700 max-w-sm mx-auto">
                Nhóm khách hàng "{agency.customerGroupName}" hiện chưa có bảng giá nào đang hoạt động trong hệ thống. Vui lòng thiết lập bảng giá trước khi thêm sản phẩm vào đơn.
              </p>
            </div>
          ) : !agency ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <Package size={36} className="mx-auto text-gray-300" />
              <p className="text-xs font-semibold text-gray-700">Chưa chọn đại lý đặt hàng</p>
              <span className="text-[11px]">Vui lòng quay lại chọn đại lý trước khi thêm sản phẩm</span>
            </div>
          ) : loadError ? (
            <div className="py-10 text-center space-y-2">
              <AlertCircle size={32} className="mx-auto text-red-400" />
              <p className="text-xs font-semibold text-red-600">{loadError}</p>
              <button
                type="button"
                onClick={() => setKeyword((k) => k + ' ')}
                className="px-3 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Thử lại
              </button>
            </div>
          ) : loadingBackend && products.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <span className="w-7 h-7 border-3 border-[#F85606] border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs font-medium text-gray-600">Đang tải các sản phẩm theo bảng giá {groupLabel}...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Package size={36} className="mx-auto text-gray-300" />
              <p className="text-xs font-semibold text-gray-700">
                {keyword ? `Không tìm thấy sản phẩm nào khớp với "${keyword}"` : `Chưa có sản phẩm nào trong bảng giá ${groupLabel}`}
              </p>
              {keyword ? (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="px-3 py-1.5 text-xs rounded-xl bg-orange-50 text-[#F85606] font-medium border border-orange-200 hover:bg-orange-100"
                >
                  Xoá từ khoá tìm kiếm
                </button>
              ) : (
                <span className="text-[11px] text-gray-500">Vui lòng kiểm tra lại cấu hình bảng giá của nhóm đại lý này</span>
              )}
            </div>
          ) : (
            products.map((p) => {
              const isAdded = addedSkuList.includes(p.sku);

              return (
                <div
                  key={p.id}
                  className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/90 rounded-xl px-2.5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                        {p.sku}
                      </span>
                      <strong className="text-xs sm:text-sm text-gray-900 truncate block">
                        {p.name}
                      </strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500">
                      <span>ĐVT cơ sở: <strong className="text-gray-700">{p.baseUnit}</strong></span>
                      {p.availableUnits.length > 1 && (
                        <>
                          <span>•</span>
                          <span>Quy cách: {p.availableUnits.map((u) => u.unitName).join(', ')}</span>
                        </>
                      )}
                    </div>

                    {p.priceAvailable === false ? (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                        <AlertCircle size={13} className="text-amber-500 shrink-0" />
                        <span>{p.priceMessage || 'Chưa có giá cho cấp đại lý này'}</span>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="text-xs sm:text-sm font-bold text-[#F85606]">
                          {formatCurrencyVND(p.basePrice)} <span className="text-[10px] text-gray-400 font-normal">/{p.baseUnit}</span>
                        </div>
                        {p.priceListCode && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                            {p.priceListCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={p.priceAvailable === false}
                    onClick={() => onSelectProduct(p)}
                    title={p.priceAvailable === false ? (p.priceMessage || 'Sản phẩm chưa có giá áp dụng') : undefined}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs cursor-pointer ${
                      p.priceAvailable === false
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        : isAdded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-[#F85606] hover:bg-orange-600 active:scale-98 text-white'
                    }`}
                  >
                    {p.priceAvailable === false ? (
                      <span>Chặn thêm</span>
                    ) : isAdded ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
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

        {/* Footer Modal */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Đơn hiện có: <strong className="text-[#F85606] font-bold">{addedSkuList.length}</strong> món
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-black transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
