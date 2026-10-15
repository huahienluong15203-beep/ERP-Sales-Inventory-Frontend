import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  Save,
  RefreshCw,
  Sliders,
  Tag,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams, useLocation } from '../../routes/Router';
import type {
  PriceList,
  PriceListRequest,
  PriceListItemRequest,
  CustomerGroupType
} from '../../types/pricing';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import {
  createPriceList,
  updatePriceList,
  fetchPriceListById
} from '../../services/pricingApi';
import { productService } from '../../services/productService';
import type { ProductOptionItem } from '../../services/productService';
import { SearchSelect } from '../../components/common/SearchSelect';
import { NumberInput } from '../../components/common/NumberInput';

interface EditablePriceItem {
  id?: number;
  productSku: string;
  productName: string;
  category?: string | null;
  baseUnit?: string | null;
  costPrice?: number;
  price: string;
  floorPrice: string;
}

export const PriceListCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const { currentRole, user, showToast } = useAuth();

  const isSalesManagerOrAdmin =
    !currentRole ||
    currentRole.includes('ADMIN') ||
    currentRole.includes('MANAGER') ||
    (user?.roles || []).some((r) => String(r).includes('ADMIN') || String(r).includes('MANAGER'));

  // Xác định chế độ tạo mới hay chỉnh sửa
  const urlId = params?.id;
  const isEdit = Boolean(urlId && !location.pathname.endsWith('/create'));

  const year = new Date().getFullYear();
  const [code, setCode] = useState<string>(`BG-DL1-${year}`);
  const [name, setName] = useState<string>(`Bảng giá Đại lý Cấp 1 Toàn Quốc ${year}`);
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupType>('DEALER_LEVEL_1');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [items, setItems] = useState<EditablePriceItem[]>([]);

  const [loadingInitial, setLoadingInitial] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Danh mục sản phẩm nạp từ Backend (đầy đủ, không giới hạn 30)
  const [productOptions, setProductOptions] = useState<ProductOptionItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productSearchInput, setProductSearchInput] = useState<string>('');
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean>(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Bộ điều chỉnh giá hàng loạt
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkPriceChangePercent, setBulkPriceChangePercent] = useState<string>('0');
  const [bulkFloorPercentOfPrice, setBulkFloorPercentOfPrice] = useState<string>('90');

  // Phân trang & lọc cho bảng dòng giá đã thêm
  const [itemSearch, setItemSearch] = useState<string>('');
  const [itemPage, setItemPage] = useState<number>(0);
  const pageSize = 20;

  // 1. Tải dữ liệu ban đầu nếu là chế độ Sửa (Edit) hoặc Clone
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search || window.location.search);
    const cloneFromId = searchParams.get('cloneFrom');
    const targetId = isEdit && urlId ? Number(urlId) : cloneFromId ? Number(cloneFromId) : null;

    if (targetId) {
      setLoadingInitial(true);
      fetchPriceListById(targetId)
        .then((data) => {
          if (isEdit) {
            setCode(data.code);
            setName(data.name);
          } else {
            setCode(`${data.code}-COPY`);
            setName(`${data.name} (Bản sao)`);
          }
          setCustomerGroup(data.customerGroup);
          setStartDate(data.startDate || new Date().toISOString().split('T')[0]);
          setEndDate(data.endDate || '');
          setNote(data.note || '');

          if (data.items && data.items.length > 0) {
            setItems(
              data.items.map((it) => ({
                id: isEdit ? it.id : undefined,
                productSku: it.productSku,
                productName: it.productName || it.productSku,
                price: it.price.toString(),
                floorPrice: it.floorPrice.toString()
              }))
            );
          }
        })
        .catch((err) => {
          setFormError(err instanceof Error ? err.message : 'Không tải được dữ liệu bảng giá');
        })
        .finally(() => setLoadingInitial(false));
    }
  }, [isEdit, urlId, location.search]);

  // 2. Nạp danh mục sản phẩm từ hệ thống (lên tới 1000 sản phẩm, không bị cắt 30)
  useEffect(() => {
    setLoadingProducts(true);
    productService
      .searchProductOptions('', 1000)
      .then((prods) => {
        setProductOptions(prods);
      })
      .catch((err) => {
        console.error('Lỗi khi nạp danh mục sản phẩm:', err);
      })
      .finally(() => {
        setLoadingProducts(false);
      });
  }, []);

  // 3. Tìm kiếm sản phẩm phía BE khi người dùng gõ từ khóa
  useEffect(() => {
    const trimmed = productSearchInput.trim();
    if (!trimmed) return;

    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const results = await productService.searchProductOptions(trimmed, 300);
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
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearchInput]);

  // Đóng dropdown tìm kiếm khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy danh sách nhóm hàng duy nhất để lọc
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    productOptions.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [productOptions]);

  // Lọc sản phẩm tìm kiếm (FE + BE), hiển thị danh sách linh hoạt
  const filteredProductOptions = useMemo(() => {
    const q = productSearchInput.trim().toLowerCase();
    let list = productOptions;

    if (selectedCategoryFilter !== 'ALL') {
      list = list.filter((p) => p.category === selectedCategoryFilter);
    }

    if (q) {
      list = list.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [productOptions, productSearchInput, selectedCategoryFilter]);

  // Thêm 1 sản phẩm vào danh sách định giá
  const handleAddProduct = (prod: ProductOptionItem) => {
    if (!prod) return;
    const existing = items.find((i) => i.productSku.toUpperCase() === prod.sku.toUpperCase());
    if (existing) {
      showToast?.('Sản phẩm đã tồn tại', `Mã ${prod.sku} đã có trong bảng giá!`, 'info');
      return;
    }

    // Tính giá bán và giá sàn đề xuất theo giá vốn
    let defaultPrice = 100000;
    let defaultFloor = 90000;
    if (prod.costPrice && Number(prod.costPrice) > 0) {
      const cost = Number(prod.costPrice);
      defaultPrice = Math.round(cost * 1.2);
      defaultFloor = Math.round(cost * 1.05);
    }

    setItems((prev) => [
      {
        productSku: prod.sku,
        productName: prod.name,
        category: prod.category,
        baseUnit: prod.baseUnit,
        costPrice: prod.costPrice ? Number(prod.costPrice) : undefined,
        price: defaultPrice.toString(),
        floorPrice: defaultFloor.toString()
      },
      ...prev
    ]);
    setItemPage(0);
    setProductSearchInput('');
    setIsProductDropdownOpen(false);
  };

  // Thêm toàn bộ sản phẩm đang hiển thị trong bộ lọc
  const handleAddAllFilteredProducts = () => {
    const newItems: EditablePriceItem[] = [];
    const existingSkus = new Set(items.map((it) => it.productSku.toUpperCase()));

    filteredProductOptions.forEach((prod) => {
      if (!existingSkus.has(prod.sku.toUpperCase())) {
        let defaultPrice = 100000;
        let defaultFloor = 90000;
        if (prod.costPrice && Number(prod.costPrice) > 0) {
          const cost = Number(prod.costPrice);
          defaultPrice = Math.round(cost * 1.2);
          defaultFloor = Math.round(cost * 1.05);
        }
        newItems.push({
          productSku: prod.sku,
          productName: prod.name,
          category: prod.category,
          baseUnit: prod.baseUnit,
          costPrice: prod.costPrice ? Number(prod.costPrice) : undefined,
          price: defaultPrice.toString(),
          floorPrice: defaultFloor.toString()
        });
        existingSkus.add(prod.sku.toUpperCase());
      }
    });

    if (newItems.length === 0) {
      showToast?.('Thông báo', 'Tất cả các sản phẩm này đã được thêm vào bảng giá.', 'info');
      return;
    }

    setItems((prev) => [...newItems, ...prev]);
    showToast?.('Thành công', `Đã thêm ${newItems.length} sản phẩm vào bảng giá!`, 'success');
  };

  // Cập nhật giá bán hoặc giá sàn
  const handleUpdateItem = (index: number, field: 'price' | 'floorPrice', value: string) => {
    setItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  // Xóa 1 dòng giá
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Áp dụng điều chỉnh giá hàng loạt
  const handleApplyBulkAdjust = () => {
    const priceChangeRatio = 1 + (parseFloat(bulkPriceChangePercent) || 0) / 100;
    const floorRatio = (parseFloat(bulkFloorPercentOfPrice) || 90) / 100;

    setItems((prev) =>
      prev.map((it) => {
        const curPrice = parseFloat(it.price) || 0;
        const newPrice = Math.max(1000, Math.round((curPrice * priceChangeRatio) / 1000) * 1000);
        const newFloor = Math.max(500, Math.round((newPrice * floorRatio) / 1000) * 1000);
        return {
          ...it,
          price: newPrice.toString(),
          floorPrice: newFloor.toString()
        };
      })
    );
    setShowBulkModal(false);
    showToast?.('Đã cập nhật', 'Đã áp dụng mức điều chỉnh giá cho toàn bộ bảng giá!', 'success');
  };

  // Lọc và phân trang cho bảng các dòng đã thêm
  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (!q) return true;
        return (
          item.productSku.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q))
        );
      });
  }, [items, itemSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(itemPage, totalPages - 1);
  const pagedItems = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let totalListed = 0;
    let totalFloor = 0;
    items.forEach((it) => {
      totalListed += parseFloat(it.price) || 0;
      totalFloor += parseFloat(it.floorPrice) || 0;
    });
    const count = items.length;
    return {
      count,
      avgPrice: count > 0 ? Math.round(totalListed / count) : 0,
      avgFloor: count > 0 ? Math.round(totalFloor / count) : 0
    };
  }, [items]);

  // Submit lưu bảng giá
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!code.trim()) {
      setFormError('Vui lòng nhập mã bảng giá.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên bảng giá.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!startDate) {
      setFormError('Vui lòng chọn ngày bắt đầu hiệu lực.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (endDate && endDate < startDate) {
      setFormError('Ngày kết thúc hiệu lực không được nhỏ hơn ngày bắt đầu.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (items.length === 0) {
      setFormError('Bảng giá phải có ít nhất một sản phẩm định giá.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate từng dòng
    const preparedItems: PriceListItemRequest[] = [];
    const skuSet = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sku = it.productSku.trim().toUpperCase();
      if (!sku) {
        setFormError(`Dòng thứ ${i + 1}: Mã SKU không được để trống.`);
        return;
      }
      if (skuSet.has(sku)) {
        setFormError(`Mã SKU '${sku}' bị trùng lặp ở dòng ${i + 1}.`);
        return;
      }
      skuSet.add(sku);

      const numPrice = parseFloat(it.price);
      const numFloor = parseFloat(it.floorPrice);

      if (isNaN(numPrice) || numPrice <= 0) {
        setFormError(`Sản phẩm '${sku}': Giá bán niêm yết phải lớn hơn 0.`);
        return;
      }
      if (isNaN(numFloor) || numFloor < 0) {
        setFormError(`Sản phẩm '${sku}': Giá sàn phê duyệt không được âm.`);
        return;
      }
      if (numFloor > numPrice) {
        setFormError(
          `Sản phẩm '${sku}': Giá sàn (${numFloor.toLocaleString('vi-VN')} đ) KHÔNG ĐƯỢC LỚN HƠN giá bán (${numPrice.toLocaleString('vi-VN')} đ)!`
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
      if (isEdit && urlId) {
        saved = await updatePriceList(Number(urlId), payload);
        showToast?.('Cập nhật thành công', `Bảng giá ${saved.code} đã được cập nhật thành công!`, 'success');
      } else {
        saved = await createPriceList(payload);
        showToast?.('Tạo thành công', `Bảng giá ${saved.code} đã được tạo thành công với ${saved.itemsCount || preparedItems.length} mặt hàng!`, 'success');
      }
      navigate('/pricing');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lỗi khi lưu bảng giá.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-200 p-12">
        <div className="w-10 h-10 border-4 border-[#F85606] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Đang tải dữ liệu bảng giá...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 antialiased pb-20 animate-in fade-in duration-200">
      {/* 1. THANH QUAY LẠI & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="pricelist-create-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách bảng giá</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Giá & Chiết khấu / Bảng giá sản phẩm / {isEdit ? 'Chỉnh sửa bảng giá' : 'Khai báo bảng giá mới'}
          </span>
        </div>

        {/* Nút lưu nhanh trên header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#F85606] hover:bg-[#E04D05] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{isEdit ? 'Cập nhật bảng giá' : 'Lưu bảng giá'}</span>
          </button>
        </div>
      </div>

      {/* 2. HERO BANNER */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 bg-gradient-to-r from-orange-50/60 via-amber-50/20 to-white">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
              <Tag size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  {isEdit ? 'Chỉnh sửa Bảng giá' : 'Khai báo Bảng giá mới'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#F85606] border border-orange-200">
                  {CUSTOMER_GROUPS[customerGroup]?.label || customerGroup}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                Thiết lập mức giá niêm yết và mức giá sàn phê duyệt cho từng nhóm đối tượng khách hàng. Mức giá sàn bảo vệ biên độ an toàn và ngăn chặn nhân viên bán dưới giá vốn.
              </p>
            </div>
          </div>

          {/* Badge thống kê nhỏ trên banner */}
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-gray-200 text-xs">
            <div className="text-center px-3 border-r border-gray-200">
              <div className="text-[10px] text-gray-400 font-bold uppercase">Mặt hàng</div>
              <div className="text-base font-black text-gray-900">{stats.count}</div>
            </div>
            <div className="text-center px-3 border-r border-gray-200">
              <div className="text-[10px] text-gray-400 font-bold uppercase">Giá niêm yết TB</div>
              <div className="text-sm font-black text-[#F85606]">{stats.avgPrice.toLocaleString('vi-VN')} đ</div>
            </div>
            <div className="text-center px-3">
              <div className="text-[10px] text-gray-400 font-bold uppercase">Giá sàn TB</div>
              <div className="text-sm font-black text-emerald-600">{stats.avgFloor.toLocaleString('vi-VN')} đ</div>
            </div>
          </div>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span className="font-semibold">{formError}</span>
        </div>
      )}

      {/* 3. FORM NHẬP THÔNG TIN CƠ BẢN */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
          <span className="w-2 h-2 rounded-full bg-[#F85606]" />
          1. Thông tin chung về Bảng giá
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Mã bảng giá */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Mã bảng giá <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: BG-DL1-2026"
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase text-gray-900 focus:bg-white focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 transition"
              required
            />
          </div>

          {/* Nhóm khách hàng */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nhóm khách hàng áp dụng <span className="text-rose-500">*</span>
            </label>
            <SearchSelect
              value={customerGroup}
              onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 cursor-pointer"
            >
              {Object.values(CUSTOMER_GROUPS).map((group) => (
                <option key={group.key} value={group.key}>
                  {group.label}
                </option>
              ))}
            </SearchSelect>
          </div>

          {/* Tên bảng giá */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tên bảng giá <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Bảng giá Đại lý Cấp 1 Toàn Quốc"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 transition"
              required
            />
          </div>

          {/* Ngày bắt đầu */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ngày bắt đầu hiệu lực <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100"
              required
            />
          </div>

          {/* Ngày kết thúc */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ngày kết thúc hiệu lực <span className="text-gray-400 font-normal">(Tùy chọn)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ghi chú điều kiện áp dụng
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Áp dụng cho các hợp đồng ký trong Quý 4..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>
      </div>

      {/* 4. PHẦN ĐỊNH GIÁ SẢN PHẨM */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              2. Danh sách sản phẩm định giá ({items.length} mặt hàng)
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              Tìm và thêm sản phẩm từ danh mục hệ thống. Mức giá sàn bảo vệ doanh thu; nhân viên không được phép xuất bán thấp hơn giá sàn.
            </p>
          </div>

          {/* Các nút tác vụ nhanh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              disabled={items.length === 0}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Sliders size={14} />
              <span>Điều chỉnh giá hàng loạt</span>
            </button>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi bảng giá?')) {
                    setItems([]);
                    setItemPage(0);
                  }
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Xóa tất cả</span>
              </button>
            )}
          </div>
        </div>

        {/* Thanh tìm kiếm & chọn sản phẩm (Toàn bộ danh mục hệ thống, không cắt 30) */}
        <div className="bg-orange-50/40 p-4 rounded-2xl border border-orange-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Package size={15} className="text-[#F85606]" />
              Tìm kiếm & thêm sản phẩm từ hệ thống:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Lọc theo nhóm:</span>
              <SearchSelect
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="ALL">Tất cả ngành hàng ({productOptions.length} SKU)</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </SearchSelect>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Ô tìm kiếm có dropdown */}
            <div ref={searchDropdownRef} className="relative flex-1 min-w-[280px]">
              <div className="relative">
                <input
                  type="text"
                  value={productSearchInput}
                  onChange={(e) => {
                    setProductSearchInput(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  placeholder="🔍 Nhập mã SKU, tên sản phẩm hoặc ngành hàng để tìm kiếm..."
                  className="w-full text-xs px-3.5 py-2.5 pl-9 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all shadow-2xs"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Search size={15} />
                </span>
                {productSearchInput && (
                  <button
                    type="button"
                    onClick={() => setProductSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Danh sách dropdown kết quả tìm kiếm */}
              {isProductDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 divide-y divide-gray-100 animate-in fade-in zoom-in-95">
                  <div className="p-2.5 bg-gray-50/90 text-[11px] font-bold text-gray-600 flex justify-between items-center sticky top-0 backdrop-blur-sm border-b border-gray-100">
                    <span>
                      Kết quả tìm kiếm: <strong>{filteredProductOptions.length}</strong> sản phẩm trong hệ thống
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      ✕
                    </button>
                  </div>

                  {loadingProducts || isSearchingProduct ? (
                    <div className="p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-[#F85606]" />
                      <span>Đang tìm kiếm sản phẩm...</span>
                    </div>
                  ) : filteredProductOptions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">
                      Không tìm thấy sản phẩm nào khớp với từ khóa & bộ lọc.
                    </div>
                  ) : (
                    filteredProductOptions.map((p) => {
                      const isAdded = items.some(
                        (it) => it.productSku.toUpperCase() === p.sku.toUpperCase()
                      );
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (!isAdded) handleAddProduct(p);
                          }}
                          className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isAdded
                              ? 'bg-gray-50/80 opacity-60 cursor-not-allowed'
                              : 'hover:bg-orange-50/80'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                                {p.sku}
                              </span>
                              <span className="font-bold text-xs text-gray-900 truncate">
                                {p.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              {p.category && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                                  {p.category}
                                </span>
                              )}
                              {p.baseUnit && <span>ĐVT: <b>{p.baseUnit}</b></span>}
                              {p.packaging && <span>• {p.packaging}</span>}
                              {p.costPrice && isSalesManagerOrAdmin && (
                                <span className="text-gray-400">
                                  • Giá vốn: {Number(p.costPrice).toLocaleString('vi-VN')} đ
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAdded ? (
                              <span className="text-[11px] text-gray-400 font-semibold px-2.5 py-1 bg-gray-100 rounded-lg">
                                Đã thêm
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddProduct(p);
                                }}
                                className="text-xs text-white font-bold px-3 py-1 bg-[#F85606] hover:bg-orange-600 rounded-lg flex items-center gap-1 shadow-2xs transition"
                              >
                                <Plus size={13} /> Thêm
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Nút thêm nhanh tất cả sản phẩm đang lọc */}
            <button
              type="button"
              onClick={handleAddAllFilteredProducts}
              className="px-4 py-2.5 bg-white border border-orange-200 hover:bg-orange-50 text-[#F85606] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Thêm tất cả ({filteredProductOptions.length} SKU)</span>
            </button>
          </div>
        </div>

        {/* Thanh lọc tìm kiếm trên các dòng đã thêm */}
        {items.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="relative min-w-[240px]">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setItemPage(0);
                }}
                placeholder="Lọc trong các dòng đã thêm..."
                className="w-full text-xs px-3 py-2 pl-8 pr-6 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#F85606]"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={13} />
              </span>
              {itemSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setItemSearch('');
                    setItemPage(0);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Hiển thị <strong>{pagedItems.length}</strong> / <strong>{items.length}</strong> sản phẩm đã chọn
            </div>
          </div>
        )}

        {/* Bảng nhập liệu giá bán & giá sàn */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600 font-bold">
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-4 w-44">Mã SKU</th>
                <th className="py-3 px-4">Tên sản phẩm & Ngành hàng</th>
                {isSalesManagerOrAdmin && (
                  <th className="py-3 px-3 w-32 text-right">Giá vốn (đ)</th>
                )}
                <th className="py-3 px-4 w-44 text-right">
                  Giá bán niêm yết (đ) <span className="text-rose-500">*</span>
                </th>
                <th className="py-3 px-4 w-44 text-right">
                  Giá sàn phê duyệt (đ) <span className="text-rose-500">*</span>
                </th>
                <th className="py-3 px-3 w-28 text-center">Biên độ sàn (%)</th>
                <th className="py-3 px-3 w-16 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSalesManagerOrAdmin ? 8 : 7}
                    className="py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tag size={32} className="text-gray-300 stroke-1" />
                      <p className="font-semibold text-gray-600">Chưa có sản phẩm nào trong bảng giá này.</p>
                      <p className="text-[11px] text-gray-400">
                        Hãy sử dụng ô tìm kiếm phía trên để thêm sản phẩm thật hoặc bấm "Thêm tất cả".
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSalesManagerOrAdmin ? 8 : 7}
                    className="py-8 text-center text-gray-400"
                  >
                    Không tìm thấy sản phẩm nào khớp với từ khóa lọc "{itemSearch}".
                  </td>
                </tr>
              ) : (
                pagedItems.map(({ item, originalIndex }, idx) => {
                  const numPrice = parseFloat(item.price) || 0;
                  const numFloor = parseFloat(item.floorPrice) || 0;
                  const isFloorInvalid = numFloor > numPrice;
                  const isPriceInvalid = numPrice <= 0;
                  const marginPercent =
                    numPrice > 0 ? (((numPrice - numFloor) / numPrice) * 100).toFixed(1) : '0';

                  return (
                    <tr
                      key={item.productSku}
                      className={`hover:bg-orange-50/20 transition-colors ${
                        isFloorInvalid || isPriceInvalid ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {currentPage * pageSize + idx + 1}
                      </td>

                      {/* Mã SKU */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">
                        <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs">
                          {item.productSku}
                        </span>
                      </td>

                      {/* Tên sản phẩm */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                          {item.category && <span>{item.category}</span>}
                          {item.baseUnit && <span>• ĐVT: {item.baseUnit}</span>}
                        </div>
                      </td>

                      {/* Giá vốn */}
                      {isSalesManagerOrAdmin && (
                        <td className="py-3 px-3 text-right font-mono text-gray-500">
                          {item.costPrice ? `${item.costPrice.toLocaleString('vi-VN')} đ` : '—'}
                        </td>
                      )}

                      {/* Giá niêm yết */}
                      <td className="py-3 px-4 text-right">
                        <NumberInput
                          value={item.price}
                          onChange={(e) => handleUpdateItem(originalIndex, 'price', e.target.value)}
                          className={`w-full text-right px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition ${
                            isPriceInvalid
                              ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-500'
                              : 'border-gray-200 bg-white text-gray-900 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                        {isPriceInvalid && (
                          <span className="text-[10px] text-rose-500 block text-right mt-0.5">
                            Giá phải &gt; 0
                          </span>
                        )}
                      </td>

                      {/* Giá sàn phê duyệt */}
                      <td className="py-3 px-4 text-right">
                        <NumberInput
                          value={item.floorPrice}
                          onChange={(e) => handleUpdateItem(originalIndex, 'floorPrice', e.target.value)}
                          className={`w-full text-right px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition ${
                            isFloorInvalid
                              ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-500'
                              : 'border-gray-200 bg-white text-emerald-800 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                        {isFloorInvalid && (
                          <span className="text-[10px] text-rose-600 font-bold block text-right mt-0.5">
                            Giá sàn &gt; Giá bán!
                          </span>
                        )}
                      </td>

                      {/* Biên độ sàn (%) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isFloorInvalid
                              ? 'bg-rose-100 text-rose-700'
                              : Number(marginPercent) >= 15
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {marginPercent}%
                        </span>
                      </td>

                      {/* Xóa dòng */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(originalIndex)}
                          title="Xóa mặt hàng khỏi bảng giá"
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang danh sách dòng giá */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
            <div>
              Trang <strong>{currentPage + 1}</strong> / <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setItemPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer font-bold"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setItemPage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer font-bold"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. NÚT SUBMIT FOOTER */}
      <div className="flex items-center justify-between bg-white rounded-3xl border border-gray-200 shadow-xs p-4">
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Hủy bỏ & Quay lại
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Tổng cộng: <strong>{items.length}</strong> sản phẩm được định giá
          </span>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-[#F85606] hover:bg-[#E04D05] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-orange-500/25 disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>{isEdit ? 'Cập nhật Bảng giá' : 'Lưu & Áp dụng Bảng giá'}</span>
          </button>
        </div>
      </div>

      {/* MODAL: ĐIỀU CHỈNH GIÁ HÀNG LOẠT */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Điều chỉnh giá hàng loạt</h3>
                  <p className="text-[11px] text-gray-500">Áp dụng cho toàn bộ {items.length} sản phẩm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  1. Thay đổi Giá bán niêm yết (%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={bulkPriceChangePercent}
                    onChange={(e) => setBulkPriceChangePercent(e.target.value)}
                    placeholder="VD: 5 để tăng 5%, -5 để giảm 5%"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs"
                  />
                  <span className="font-bold text-gray-500">%</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Nhập số dương để tăng giá (VD: 5 = +5%), nhập số âm để giảm giá (VD: -5 = -5%).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  2. Thiết lập Giá sàn theo % Giá bán:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={bulkFloorPercentOfPrice}
                    onChange={(e) => setBulkFloorPercentOfPrice(e.target.value)}
                    placeholder="VD: 90"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs"
                  />
                  <span className="font-bold text-gray-500">% giá bán</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Khuyến nghị: 85% - 95%. Giá sàn sẽ bằng X% của giá bán niêm yết mới.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyBulkAdjust}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Áp dụng ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
