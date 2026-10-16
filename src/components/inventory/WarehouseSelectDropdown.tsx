import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Check, X, Building2, MapPin } from 'lucide-react';
import type { Warehouse } from '../../types/warehouse';

interface WarehouseSelectDropdownProps {
  warehouses: Warehouse[];
  selectedWarehouseId: string | number;
  onSelect: (warehouseId: string, warehouse?: Warehouse) => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
}

const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const WarehouseSelectDropdown: React.FC<WarehouseSelectDropdownProps> = ({
  warehouses,
  selectedWarehouseId,
  onSelect,
  disabled = false,
  placeholder = '-- Chọn kho hàng --',
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30; // Cố định 30 dòng / trang

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Tìm kho đang được chọn
  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => String(w.id) === String(selectedWarehouseId));
  }, [warehouses, selectedWarehouseId]);

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

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Lọc theo từ khóa (Mã kho, Tên kho, Địa chỉ)
  const filteredWarehouses = useMemo(() => {
    if (!keyword.trim()) return warehouses;
    const kw = keyword.trim().toLowerCase();
    const kwNoAccent = removeAccents(keyword.trim());

    return warehouses.filter((w) => {
      const matchCode = w.code.toLowerCase().includes(kw);
      const matchName = w.name.toLowerCase().includes(kw) || removeAccents(w.name).includes(kwNoAccent);
      const matchAddr = w.address ? w.address.toLowerCase().includes(kw) || removeAccents(w.address).includes(kwNoAccent) : false;
      return matchCode || matchName || matchAddr;
    });
  }, [warehouses, keyword]);

  // Reset trang về 1 khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [keyword]);

  // Cuộn về đầu danh sách khi đổi trang
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Phân trang 30 dòng / trang
  const totalPages = Math.ceil(filteredWarehouses.length / pageSize) || 1;
  const pagedWarehouses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWarehouses.slice(start, start + pageSize);
  }, [filteredWarehouses, currentPage, pageSize]);

  const handleSelect = (w: Warehouse) => {
    onSelect(String(w.id), w);
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
      {/* Trigger Button: Bo viền tròn giống chọn sản phẩm */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all select-none ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-xs cursor-pointer'
            : 'bg-gray-50/80 hover:bg-white border-gray-300 text-gray-800 hover:border-gray-400 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedWarehouse ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                {selectedWarehouse.code}
              </span>
              <span className="text-sm font-semibold text-gray-900 truncate">
                {selectedWarehouse.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 truncate">
              {loading ? 'Đang tải danh sách kho...' : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {selectedWarehouse && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
              title="Bỏ chọn kho"
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

      {/* Dropdown Menu: Luôn xổ xuống dưới, bo cong rounded-2xl đồng bộ, kéo dài vừa vặn đến đáy */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1.5 w-full min-w-full z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden origin-top animate-in fade-in-0 slide-in-from-top-1 duration-150 flex flex-col max-h-[360px] sm:max-h-[370px]"
        >
          {/* Header: Thanh tìm kiếm */}
          <div className="p-2.5 sm:p-3 border-b border-gray-100 bg-gray-50/80 shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo mã kho, tên kho hàng..."
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
                Tìm thấy <strong className="text-gray-800">{filteredWarehouses.length}</strong> kho hàng
              </span>
              <div className="flex items-center gap-1.5">
                {keyword && (
                  <span className="text-orange-600 font-semibold mr-1">Đang lọc</span>
                )}
                <span className="text-gray-400 font-medium">(30 kho / trang)</span>
              </div>
            </div>
          </div>

          {/* Danh sách kho hàng */}
          <div
            ref={listContainerRef}
            tabIndex={0}
            className="divide-y divide-gray-100 flex-1 min-h-0 overflow-y-auto overscroll-contain focus:outline-none"
            style={{ scrollbarWidth: 'thin' }}
          >
            {pagedWarehouses.length === 0 ? (
              <div className="p-6 text-center text-gray-400 space-y-1">
                <Building2 size={24} className="mx-auto text-gray-300" />
                <p className="text-xs font-medium">Không tìm thấy kho hàng phù hợp</p>
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
              pagedWarehouses.map((wh) => {
                const isSelected = String(wh.id) === String(selectedWarehouseId);

                return (
                  <div
                    key={wh.id}
                    onClick={() => handleSelect(wh)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50/90 text-orange-950 font-medium'
                        : 'hover:bg-orange-50/40 text-gray-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                          {wh.code}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold truncate text-gray-900" title={wh.name}>
                          {wh.name}
                        </span>
                      </div>
                      {wh.address && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <MapPin size={11} className="text-gray-400 shrink-0" />
                          <span className="truncate">{wh.address}</span>
                        </div>
                      )}
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

          {/* Footer: Phân trang luôn hiển thị */}
          <div className="p-2 sm:p-2.5 border-t border-gray-100 bg-gray-50 shrink-0 flex items-center justify-between text-xs text-gray-600">
            <span className="text-[11px] text-gray-500 font-medium">
              Trang <strong className="text-gray-800">{currentPage}</strong> / <strong>{totalPages}</strong> ({filteredWarehouses.length} kho)
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
