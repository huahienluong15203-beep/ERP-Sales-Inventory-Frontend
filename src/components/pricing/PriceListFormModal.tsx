import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PriceList, PriceListRequest, PriceListItemRequest, CustomerGroupType } from '../../types/pricing';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import { createPriceList, updatePriceList } from '../../services/pricingApi';
import { productService } from '../../services/productService';
import type { ProductOptionItem } from '../../services/productService';
import { Icons } from '../common/Icons';

interface PriceListFormModalProps {
  initialData?: PriceList | null;
  onClose: () => void;
  onSuccess: (savedList: PriceList) => void;
}

interface EditableItem {
  id?: number;
  productSku: string;
  productName: string;
  price: string;
  floorPrice: string;
}

export const PriceListFormModal: React.FC<PriceListFormModalProps> = ({
  initialData,
  onClose,
  onSuccess
}) => {
  const isEdit = !!initialData;

  const year = new Date().getFullYear();
  const [code, setCode] = useState<string>(() => initialData?.code || `BG-DL1-${year}`);
  const [name, setName] = useState<string>(() => initialData?.name || `Bảng giá Đại lý Cấp 1 Toàn Quốc ${year}`);
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupType>(() => initialData?.customerGroup || 'DEALER_LEVEL_1');
  const [startDate, setStartDate] = useState<string>(() => initialData?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => initialData?.endDate || '');
  const [note, setNote] = useState<string>(() => initialData?.note || '');
  const [items, setItems] = useState<EditableItem[]>(() => {
    if (initialData?.items) {
      return initialData.items.map((it) => ({
        id: it.id,
        productSku: it.productSku,
        productName: it.productName || it.productSku,
        price: it.price.toString(),
        floorPrice: it.floorPrice.toString()
      }));
    }
    return [];
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Tìm kiếm sản phẩm thật trong hệ thống (YC1: hỗ trợ tìm kiếm cả FE lẫn BE)
  const [productSearchInput, setProductSearchInput] = useState<string>('');
  const [productOptions, setProductOptions] = useState<ProductOptionItem[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean>(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Tải danh sách sản phẩm thật ban đầu khi mở modal
  useEffect(() => {
    productService
      .searchProductOptions('', 50)
      .then((prods) => {
        setProductOptions(prods);
      })
      .catch((err) => {
        console.error('Không tải được danh mục sản phẩm mẫu:', err);
      });
  }, []);

  // Debounce tìm kiếm phía Server (BE) khi người dùng gõ từ khóa
  useEffect(() => {
    const trimmed = productSearchInput.trim();
    if (!trimmed) return;

    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const results = await productService.searchProductOptions(trimmed, 30);
        setProductOptions((prev) => {
          const map = new Map<number, ProductOptionItem>();
          results.forEach((p) => map.set(p.id, p));
          prev.forEach((p) => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          return Array.from(map.values());
        });
      } catch (err) {
        console.error('Lỗi tìm kiếm sản phẩm phía BE:', err);
      } finally {
        setIsSearchingProduct(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearchInput]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lọc tức thì phía Frontend (FE) trên tập sản phẩm đã nạp
  const filteredProducts = useMemo(() => {
    const q = productSearchInput.trim().toLowerCase();
    if (!q) return productOptions.slice(0, 30);
    return productOptions
      .filter((p) => {
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = p.category ? p.category.toLowerCase().includes(q) : false;
        return matchSku || matchName || matchCat;
      })
      .slice(0, 30);
  }, [productOptions, productSearchInput]);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productSku: '',
        productName: '',
        price: '',
        floorPrice: ''
      }
    ]);
  };

  const handleAddRealProduct = (prod: ProductOptionItem) => {
    if (!prod) return;

    // Kiểm tra SKU đã có chưa
    const existing = items.find((i) => i.productSku.toUpperCase() === prod.sku.toUpperCase());
    if (existing) {
      alert(`Sản phẩm '${prod.sku} - ${prod.name}' đã có trong danh sách bảng giá!`);
      return;
    }

    // Tính mức giá bán và giá sàn hợp lý: nếu có giá vốn thì giá bán = vốn * 1.2, giá sàn = vốn * 1.05
    let defaultPrice = 100000;
    let defaultFloor = 90000;
    if (prod.costPrice && Number(prod.costPrice) > 0) {
      const cost = Number(prod.costPrice);
      defaultPrice = Math.round(cost * 1.2);
      defaultFloor = Math.round(cost * 1.05);
    }

    setItems((prev) => [
      ...prev,
      {
        productSku: prod.sku,
        productName: prod.name,
        price: defaultPrice.toString(),
        floorPrice: defaultFloor.toString()
      }
    ]);
    setProductSearchInput('');
    setIsProductDropdownOpen(false);
  };

  const handleUpdateItem = (index: number, field: keyof EditableItem, value: string) => {
    setItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!code.trim()) {
      setFormError('Vui lòng nhập mã bảng giá');
      return;
    }
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên bảng giá');
      return;
    }
    if (!startDate) {
      setFormError('Vui lòng chọn ngày bắt đầu hiệu lực');
      return;
    }
    if (endDate && endDate < startDate) {
      setFormError('Ngày kết thúc hiệu lực không được trước ngày bắt đầu!');
      return;
    }

    // Validate danh sách dòng giá
    const preparedItems: PriceListItemRequest[] = [];
    const skuSet = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sku = it.productSku.trim().toUpperCase();
      if (!sku) {
        setFormError(`Dòng thứ ${i + 1}: Vui lòng nhập mã SKU sản phẩm`);
        return;
      }
      if (skuSet.has(sku)) {
        setFormError(`Mã SKU '${sku}' bị trùng lặp ở dòng ${i + 1}`);
        return;
      }
      skuSet.add(sku);

      const numPrice = parseFloat(it.price);
      const numFloor = parseFloat(it.floorPrice);

      if (isNaN(numPrice) || numPrice <= 0) {
        setFormError(`Dòng '${sku}': Giá bán niêm yết phải lớn hơn 0`);
        return;
      }
      if (isNaN(numFloor) || numFloor < 0) {
        setFormError(`Dòng '${sku}': Mức giá sàn không được âm`);
        return;
      }
      if (numFloor > numPrice) {
        setFormError(
          `Dòng '${sku}': Mức giá sàn (${numFloor.toLocaleString('vi-VN')} đ) KHÔNG ĐƯỢC LỚN HƠN giá bán (${numPrice.toLocaleString('vi-VN')} đ)!`
        );
        return;
      }

      preparedItems.push({
        productSku: sku,
        productName: it.productName.trim() || sku,
        price: numPrice,
        floorPrice: numFloor
      });
    }

    const payload: PriceListRequest = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      customerGroup,
      startDate,
      endDate: endDate || null,
      note: note.trim() || null,
      items: preparedItems
    };

    setSubmitting(true);
    try {
      let saved: PriceList;
      if (isEdit && initialData) {
        saved = await updatePriceList(initialData.id, payload);
      } else {
        saved = await createPriceList(payload);
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lỗi khi lưu bảng giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-4xl w-full max-h-[94vh] my-auto flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-50 text-[#F85606]">
              <Icons.Tags size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa Bảng giá' : 'Khai báo Bảng giá mới'}
              </h2>
              <p className="text-xs text-gray-500">
                Thiết lập theo nhóm khách hàng, thời hạn hiệu lực và giá sàn phê duyệt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <Icons.ShieldAlert size={16} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Phần 1: Thông tin cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/60 p-4 rounded-xl border border-gray-200">
            {/* Mã bảng giá */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã bảng giá *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: BG-DL1-2026"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            {/* Nhóm khách hàng */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nhóm khách hàng áp dụng *
              </label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
              >
                {Object.values(CUSTOMER_GROUPS).map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tên bảng giá */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên bảng giá *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Bảng giá Đại lý Cấp 1 Toàn Quốc"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            {/* Ngày bắt đầu */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ngày bắt đầu hiệu lực *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            {/* Ngày kết thúc */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ngày kết thúc (Tùy chọn)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* Ghi chú */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ghi chú điều kiện
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú chiết khấu, phạm vi..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phần 2: Danh sách dòng giá */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Icons.Package size={18} className="text-[#F85606]" />
                  Danh sách sản phẩm định giá ({items.length} mặt hàng)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Quy tắc nghiệp vụ: Mức giá sàn là ngưỡng tối thiểu. Nhân viên bán dưới giá sàn sẽ phải qua Quản lý kinh doanh duyệt ngoại lệ.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Thanh tìm kiếm & chọn sản phẩm thật trong hệ thống (YC1: Tìm kiếm FE & BE) */}
                <div ref={searchDropdownRef} className="relative min-w-[280px] sm:min-w-[340px]">
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearchInput}
                      onChange={(e) => {
                        setProductSearchInput(e.target.value);
                        setIsProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      placeholder="🔍 Tìm & thêm sản phẩm thật (SKU, tên)..."
                      className="w-full text-xs px-3 py-1.5 pl-8 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Icons.Search size={13} />
                    </span>
                    {isSearchingProduct && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-500">
                        <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      </span>
                    )}
                  </div>

                  {/* Dropdown danh sách sản phẩm thật */}
                  {isProductDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50 divide-y divide-gray-100 animate-in fade-in zoom-in-95">
                      <div className="p-2 bg-gray-50/90 text-[11px] font-semibold text-gray-500 flex justify-between items-center sticky top-0 backdrop-blur-sm border-b border-gray-100">
                        <span>Sản phẩm trong hệ thống ({filteredProducts.length})</span>
                        {productSearchInput ? (
                          <span className="text-orange-600 font-normal">Gõ tìm kiếm FE & BE</span>
                        ) : (
                          <span className="text-gray-400 font-normal">Gợi ý sản phẩm thật</span>
                        )}
                      </div>
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          {isSearchingProduct
                            ? 'Đang tìm kiếm sản phẩm...'
                            : `Không tìm thấy sản phẩm nào khớp với "${productSearchInput}"`}
                        </div>
                      ) : (
                        filteredProducts.map((p) => {
                          const isAdded = items.some(
                            (it) => it.productSku.toUpperCase() === p.sku.toUpperCase()
                          );
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isAdded}
                              onClick={() => handleAddRealProduct(p)}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isAdded ? 'bg-gray-50/70 opacity-60 cursor-not-allowed' : 'hover:bg-orange-50/70'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                                    {p.sku}
                                  </span>
                                  <span className="font-medium text-xs text-gray-900 truncate">
                                    {p.name}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                                  {p.category && <span>{p.category}</span>}
                                  {p.baseUnit && <span>• ĐVT: {p.baseUnit}</span>}
                                  {p.packaging && <span>• {p.packaging}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {isAdded ? (
                                  <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-md">
                                    Đã thêm
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-orange-600 font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-md hover:bg-orange-100/80 transition-colors">
                                    <Icons.Plus size={12} /> Thêm
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#F85606] text-xs font-semibold rounded-xl border border-orange-200 transition-colors cursor-pointer shrink-0"
                >
                  <Icons.Plus size={14} />
                  <span>Thêm dòng trống</span>
                </button>
              </div>
            </div>

            {/* Bảng nhập liệu dòng giá */}
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 w-40">Mã SKU *</th>
                    <th className="py-2.5 px-3">Tên sản phẩm</th>
                    <th className="py-2.5 px-3 w-36 text-right">Giá niêm yết (đ) *</th>
                    <th className="py-2.5 px-3 w-36 text-right">Mức giá sàn (đ) *</th>
                    <th className="py-2.5 px-3 w-28 text-center">Chênh lệch</th>
                    <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Chưa có sản phẩm nào. Hãy tìm kiếm sản phẩm phía trên hoặc bấm "Thêm dòng trống" để bắt đầu định giá.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const numP = parseFloat(item.price) || 0;
                      const numF = parseFloat(item.floorPrice) || 0;
                      const hasFloorError = numF > numP && numP > 0;
                      const diff = numP - numF;
                      const rowKey = item.id ? `item-${item.id}` : `sku-${item.productSku || 'idx'}-${idx}`;

                      return (
                        <tr
                          key={rowKey}
                          className={hasFloorError ? 'bg-rose-50/60' : ''}
                        >
                          <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                            <span>{idx + 1}</span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.productSku}
                              onChange={(e) => handleUpdateItem(idx, 'productSku', e.target.value)}
                              placeholder="SKU-001"
                              className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-mono uppercase font-bold"
                              required
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                              placeholder="Tên sản phẩm..."
                              className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                              placeholder="250000"
                              className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs text-right font-semibold text-emerald-600"
                              required
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.floorPrice}
                              onChange={(e) => handleUpdateItem(idx, 'floorPrice', e.target.value)}
                              placeholder="220000"
                              className={`w-full px-2 py-1 bg-white border rounded-lg text-xs text-right font-semibold ${
                                hasFloorError
                                  ? 'border-rose-500 text-rose-600 ring-1 ring-rose-500'
                                  : 'border-gray-300 text-amber-600'
                              }`}
                              required
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={
                                hasFloorError
                                  ? 'inline-block text-[10px] text-rose-600 font-bold'
                                  : numP > 0
                                  ? 'inline-block text-[11px] text-gray-500 font-medium'
                                  : 'inline-block text-gray-400'
                              }
                            >
                              {hasFloorError
                                ? 'Sàn > Giá!'
                                : numP > 0
                                ? `-${Math.round((diff / numP) * 100)}%`
                                : '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-gray-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                            >
                              <Icons.Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#F85606] hover:bg-[#E04D05] text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Check size={16} />
                  <span>{isEdit ? 'Lưu cập nhật' : 'Hoàn tất & Khai báo bảng giá'}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
