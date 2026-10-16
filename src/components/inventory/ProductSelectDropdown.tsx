import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Check, X, Package, Tag } from 'lucide-react';
import type { Product } from '../../types/product';

interface ProductSelectDropdownProps {
  products: Product[];
  selectedProductId: string | number;
  onSelect: (productId: string, product?: Product) => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
}

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm không dấu / có dấu linh hoạt
 */
const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const ProductSelectDropdown: React.FC<ProductSelectDropdownProps> = ({
  products,
  selectedProductId,
  onSelect,
  disabled = false,
  placeholder = '-- Chọn sản phẩm --',
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30; // Phân trang cố định 30 sản phẩm / trang

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Tìm sản phẩm đang được chọn
  const selectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedProductId));
  }, [products, selectedProductId]);

  // Xử lý click ngoài và phím Escape để đóng dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Tự động focus vào ô tìm kiếm ngay khi mở
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Lọc sản phẩm theo từ khóa (hỗ trợ tiếng Việt không dấu & có dấu, tìm theo SKU, Tên, Danh mục, ĐVT, Quy cách)
  const filteredProducts = useMemo(() => {
    if (!keyword.trim()) return products;
    const kw = keyword.trim().toLowerCase();
    const kwNoAccent = removeAccents(keyword.trim());

    return products.filter((p) => {
      const matchSku = p.sku.toLowerCase().includes(kw);
      const matchName = p.name.toLowerCase().includes(kw) || removeAccents(p.name).includes(kwNoAccent);
      const matchCat = p.category ? p.category.toLowerCase().includes(kw) || removeAccents(p.category).includes(kwNoAccent) : false;
      const matchUnit = p.baseUnit ? p.baseUnit.toLowerCase().includes(kw) : false;
      const matchSpec = p.packagingSpec ? p.packagingSpec.toLowerCase().includes(kw) : false;
      return matchSku || matchName || matchCat || matchUnit || matchSpec;
    });
  }, [products, keyword]);

  // Reset trang về 1 khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [keyword]);

  // Cuộn về đầu danh sách khi chuyển trang
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Phân trang danh sách sản phẩm
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleSelect = (p: Product) => {
    onSelect(String(p.id), p);
    setIsOpen(false);
    setKeyword('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('', undefined);
    setKeyword('');
  };

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all select-none ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-xs cursor-pointer'
            : 'bg-gray-50/80 hover:bg-white border-gray-300 text-gray-800 hover:border-gray-400 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedProduct ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                {selectedProduct.sku}
              </span>
              <span className="text-sm font-semibold text-gray-900 truncate">
                {selectedProduct.name}
              </span>
              {selectedProduct.baseUnit && (
                <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
                  ({selectedProduct.baseUnit})
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400 truncate">
              {loading ? 'Đang tải danh sách sản phẩm...' : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {selectedProduct && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
              title="Bỏ chọn sản phẩm"
            >
              <X size={15} />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-600' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu: Khớp hoàn toàn với độ rộng cột sản phẩm, kéo dài vừa đến vạch mép dưới */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1.5 w-full min-w-full z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden origin-top animate-in fade-in-0 slide-in-from-top-1 duration-150 flex flex-col max-h-[370px]"
        >
          {/* Header: Thanh tìm kiếm (cố định ở đầu) */}
          <div className="p-2.5 sm:p-3 border-b border-gray-100 bg-gray-50/80 shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo mã SKU, tên sản phẩm, đơn vị..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 px-0.5">
              <span>
                Tìm thấy <strong className="text-gray-800">{filteredProducts.length}</strong> sản phẩm
              </span>
              <div className="flex items-center gap-1.5">
                {keyword && (
                  <span className="text-orange-600 font-semibold mr-1">Đang lọc</span>
                )}
                <span className="text-gray-400 font-medium">(30 SP / trang)</span>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm: Tự co giãn trong vùng flex-1, cuộn nội bộ mượt mà */}
          <div
            ref={listContainerRef}
            tabIndex={0}
            className="divide-y divide-gray-100 flex-1 min-h-0 overflow-y-auto overscroll-contain focus:outline-none"
            style={{ scrollbarWidth: 'thin' }}
          >
            {pagedProducts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 space-y-1">
                <Package size={24} className="mx-auto text-gray-300" />
                <p className="text-xs font-medium">Không tìm thấy sản phẩm phù hợp</p>
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setKeyword('')}
                    className="text-xs text-orange-600 hover:underline font-semibold pt-1 cursor-pointer"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                )}
              </div>
            ) : (
              pagedProducts.map((prod) => {
                const isSelected = String(prod.id) === String(selectedProductId);

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelect(prod)}
                    className={`px-3.5 py-2 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50/90 text-orange-950 font-medium'
                        : 'hover:bg-orange-50/40 text-gray-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                          {prod.sku}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold truncate text-gray-900" title={prod.name}>
                          {prod.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        {prod.category && (
                          <span className="flex items-center gap-1">
                            <Tag size={11} className="text-gray-400" />
                            <span className="truncate max-w-[150px]">{prod.category}</span>
                          </span>
                        )}
                        {prod.baseUnit && (
                          <span>• ĐVT: <strong className="text-gray-700 font-semibold">{prod.baseUnit}</strong></span>
                        )}
                        {prod.packagingSpec && (
                          <span className="hidden sm:inline text-gray-400">• {prod.packagingSpec}</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#F85606] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Phân trang luôn hiển thị chuẩn chỉ */}
          <div className="p-2 sm:p-2.5 border-t border-gray-100 bg-gray-50 shrink-0 flex items-center justify-between text-xs text-gray-600">
            <span className="text-[11px] text-gray-500 font-medium">
              Trang <strong className="text-gray-800">{currentPage}</strong> / <strong>{totalPages}</strong> ({filteredProducts.length} SP)
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={13} />
                <span>Trước</span>
              </button>

              {/* Các nút số trang */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    totalPages > 5 &&
                    Math.abs(pageNum - currentPage) > 1 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return <span key={pageNum} className="px-1 text-gray-400 text-xs">..</span>;
                    }
                    return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-6 h-6 rounded-md font-bold text-xs transition cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-[#F85606] text-white shadow-2xs'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <span>Sau</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
