import React, { useState, useEffect, useMemo } from 'react';
import type { Product, CreateProductInput, UpdateProductInput, ProductStatus } from '../../../types/product';
import {
  PRODUCT_CATEGORIES,
  COMMON_BASE_UNITS,
  canManageCostPrice,
  formatCurrencyVND,
  productService
} from '../../../services/productService';
import { fetchCategories, type CategoryWithCount } from '../../../services/categoryApi';
import { useAuth } from '../../../contexts/AuthContext';
import { Icons } from '../../../components/common/Icons';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  productToEdit?: Product | null;
}
 
/**
 * Kiểm tra tính hợp lệ của đường dẫn ảnh sản phẩm.
 * - Cho phép rỗng (ảnh không bắt buộc).
 * - Bắt buộc phải là HTTP/HTTPS và có tên miền hợp lệ.
 * - Kiểm tra định dạng đuôi tệp phổ biến nếu có phần mở rộng.
 */
export function validateImageUrl(url: string): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://';
    }
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return 'Tên miền không hợp lệ (ví dụ: https://example.com/anh.jpg)';
    }
    const pathname = parsed.pathname.toLowerCase();
    const hasExtension = /\.[a-z0-9]+$/i.test(pathname);
    if (hasExtension) {
      const isImageExt = /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico)$/i.test(pathname);
      if (!isImageExt) {
        return 'Định dạng tệp không được hỗ trợ (vui lòng dùng link ảnh .jpg, .png, .webp, .gif, .svg)';
      }
    }
    return null;
  } catch {
    return 'Đường dẫn ảnh không đúng định dạng URL hợp lệ';
  }
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit
}) => {
  const { currentRole } = useAuth();
  const canEditCost = canManageCostPrice(currentRole);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [baseUnit, setBaseUnit] = useState<string>(COMMON_BASE_UNITS[0]);
  const [packagingSpec, setPackagingSpec] = useState('');
  const [costPrice, setCostPrice] = useState<number | string>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');

  const [skuError, setSkuError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);

  const isEditing = Boolean(productToEdit);

  useEffect(() => {
    if (isOpen) {
      setLoadingCategories(true);
      fetchCategories()
        .then((list) => {
          setCategories(list);
          if (productToEdit) {
            if (productToEdit.categoryId) {
              setCategoryId(productToEdit.categoryId);
              const matched = list.find((c) => c.id === productToEdit.categoryId);
              if (matched) setCategory(matched.name);
            } else if (productToEdit.category) {
              const matchedByName = list.find((c) => c.name.toLowerCase() === productToEdit.category.toLowerCase());
              if (matchedByName) {
                setCategoryId(matchedByName.id);
                setCategory(matchedByName.name);
              }
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCategories(false));

      if (productToEdit) {
        setSku(productToEdit.sku);
        setName(productToEdit.name);
        setCategoryId(productToEdit.categoryId || '');
        setCategory(productToEdit.category || '');
        setBaseUnit(productToEdit.baseUnit || COMMON_BASE_UNITS[0]);
        setPackagingSpec(productToEdit.packagingSpec || '');
        setCostPrice(productToEdit.costPrice || 0);
        setImageUrl(productToEdit.imageUrl || '');
        setStatus(productToEdit.status || 'ACTIVE');
      } else {
        setSku('');
        setName('');
        setCategoryId('');
        setCategory('');
        setBaseUnit(COMMON_BASE_UNITS[0]);
        setPackagingSpec('');
        setCostPrice(0);
        setImageUrl('');
        setStatus('ACTIVE');
      }
      setSkuError(null);
      setGeneralError(null);
      setImagePreviewError(false);
      setImageUrlError(null);
    }
  }, [isOpen, productToEdit]);

  // Sắp xếp nhóm hàng theo phân cấp cây DFS
  const hierarchicalCategories = useMemo(() => {
    const map = new Map<string | null, CategoryWithCount[]>();
    for (const c of categories) {
      const pid = c.parentId ?? null;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(c);
    }
    const result: { cat: CategoryWithCount; label: string; path: string }[] = [];
    const getPath = (c: CategoryWithCount): string => {
      const parts: string[] = [c.name];
      let curr = c;
      while (curr.parentId) {
        const parent = categories.find((p) => p.id === curr.parentId);
        if (!parent) break;
        parts.unshift(parent.name);
        curr = parent;
      }
      return parts.join(' > ');
    };
    const traverse = (parentId: string | null, depth: number) => {
      const list = map.get(parentId) || [];
      list.sort((a, b) => a.code.localeCompare(b.code));
      for (const item of list) {
        let indent = '';
        if (depth === 2) indent = '└─ ';
        else if (depth === 3) indent = '└── ';
        else if (depth > 3) indent = `${'──'.repeat(depth - 1)} `;
        const badge = item.level === 1 ? '[Cấp 1 - Ngành]' : item.level === 2 ? '[Cấp 2 - Nhóm]' : `[Cấp ${item.level}]`;
        result.push({
          cat: item,
          label: `${indent}${badge} ${item.name} (${item.code})`,
          path: getPath(item)
        });
        traverse(item.id, depth + 1);
      }
    };
    traverse(null, 1);
    return result;
  }, [categories]);

  const selectedCategoryPath = useMemo(() => {
    if (!categoryId) return null;
    const found = hierarchicalCategories.find((h) => h.cat.id === categoryId);
    return found ? found.path : null;
  }, [categoryId, hierarchicalCategories]);

  const handleCategoryChange = (val: string) => {
    if (!val) {
      setCategoryId('');
      setCategory('');
      return;
    }
    const found = categories.find((c) => c.id === val);
    if (found) {
      setCategoryId(found.id);
      setCategory(found.name);
    } else {
      setCategoryId('');
      setCategory(val);
    }
  };

  const handleSkuChange = async (val: string) => {
    const formatted = val.toUpperCase().replace(/\s+/g, '-');
    setSku(formatted);
    if (!formatted.trim()) {
      setSkuError('Mã SKU không được để trống.');
      return;
    }
    const isDuplicate = await productService.checkSkuExists(formatted, productToEdit?.id);
    if (isDuplicate) {
      setSkuError(`Mã SKU "${formatted}" đã tồn tại trên hệ thống.`);
    } else {
      setSkuError(null);
    }
  };

  const handleImageUrlChange = (val: string) => {
    setImageUrl(val);
    setImagePreviewError(false);
    if (!val.trim()) {
      setImageUrlError(null);
      return;
    }
    const err = validateImageUrl(val);
    setImageUrlError(err);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const cleanSku = sku.trim().toUpperCase();
    if (!cleanSku) {
      setSkuError('Mã SKU là bắt buộc.');
      return;
    }
    if (!name.trim()) {
      setGeneralError('Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (!baseUnit.trim()) {
      setGeneralError('Vui lòng chọn hoặc nhập đơn vị tính cơ sở.');
      return;
    }

    const isDuplicate = await productService.checkSkuExists(cleanSku, productToEdit?.id);
    if (isDuplicate) {
      setSkuError(`Mã SKU "${cleanSku}" đã tồn tại.`);
      return;
    }

    if (!category.trim() && !categoryId) {
      setGeneralError('Vui lòng chọn nhóm hàng cho sản phẩm.');
      return;
    }

    if (imageUrl.trim()) {
      const urlErr = validateImageUrl(imageUrl);
      if (urlErr) {
        setImageUrlError(urlErr);
        setGeneralError(urlErr);
        return;
      }
      if (imagePreviewError) {
        setImageUrlError('Không thể tải hình ảnh từ đường dẫn này.');
        setGeneralError('Hình ảnh không hợp lệ hoặc không tải được. Vui lòng kiểm tra lại liên kết ảnh hoặc xóa trống.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const parsedCost = canEditCost ? Number(costPrice) || 0 : productToEdit?.costPrice || 0;

      if (isEditing && productToEdit) {
        const updatePayload: UpdateProductInput = {
          name: name.trim(),
          category: category.trim() || 'Chưa phân loại',
          categoryId: categoryId ? categoryId : undefined,
          baseUnit: baseUnit.trim(),
          packagingSpec: packagingSpec.trim(),
          status,
          imageUrl: imageUrl.trim()
        };
        if (canEditCost) {
          updatePayload.costPrice = parsedCost;
        }

        const res = await productService.updateProduct(productToEdit.id, updatePayload, currentRole);
        if (res.success) {
          onSuccess(res.message);
          onClose();
        } else {
          setGeneralError(res.message);
        }
      } else {
        const createPayload: CreateProductInput = {
          sku: cleanSku,
          name: name.trim(),
          category: category.trim() || 'Chưa phân loại',
          categoryId: categoryId ? categoryId : undefined,
          baseUnit: baseUnit.trim(),
          packagingSpec: packagingSpec.trim(),
          costPrice: parsedCost,
          imageUrl: imageUrl.trim(),
          status: 'ACTIVE'
        };

        const res = await productService.createProduct(createPayload, currentRole);
        if (res.success) {
          onSuccess(res.message);
          onClose();
        } else {
          setGeneralError(res.message);
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu sản phẩm';
      setGeneralError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] my-auto flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200/60 shrink-0">
              <Icons.Package size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {isEditing ? 'Cập nhật thông tin sản phẩm' : 'Khai báo sản phẩm mới'}
              </h3>
              <p className="text-xs text-gray-500">
                Chuẩn hóa mã SKU, tên gọi, quy cách đóng gói và bảo mật giá vốn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {generalError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2.5">
                <Icons.AlertCircle size={18} className="text-red-600 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* 1. Mã SKU & Trạng thái kinh doanh */}
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    1. Mã SKU duy nhất <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sku}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-mono font-semibold uppercase tracking-wider text-gray-700 opacity-80 cursor-not-allowed min-h-[44px]"
                  />
                  <p className="text-xs text-gray-400 mt-1">Mã SKU cố định không được thay đổi</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Trạng thái kinh doanh <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProductStatus)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
                  >
                    <option value="ACTIVE">Đang kinh doanh (ACTIVE)</option>
                    <option value="INACTIVE">Ngừng kinh doanh (INACTIVE)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Chuyển sang "Ngừng kinh doanh" khi sản phẩm ngừng lưu hành</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    1. Mã SKU duy nhất <span className="text-red-500">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Mặc định: Đang kinh doanh
                  </span>
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  placeholder="VD: SP-COCA-330"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono font-semibold uppercase tracking-wider text-gray-900 focus:outline-none focus:ring-2 transition-all min-h-[44px] ${
                    skuError
                      ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 focus:ring-orange-500/20 focus:border-orange-500'
                  }`}
                />
                {skuError ? (
                  <p className="text-xs text-red-600 font-medium mt-1">{skuError}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Mã nhận diện duy nhất toàn hệ thống (không trùng lặp)</p>
                )}
              </div>
            )}

            {/* 2. Tên sản phẩm */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                2. Tên sản phẩm chuẩn hóa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nước ngọt có gas Coca-Cola lon 330ml"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
              />
            </div>

            {/* 3. Nhóm hàng & 4. ĐVT cơ sở */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    3. Nhóm hàng (Cây S2-06) <span className="text-red-500">*</span>
                  </label>
                  {loadingCategories && (
                    <span className="text-[11px] text-gray-400">Đang tải cây...</span>
                  )}
                </div>
                <select
                  value={categoryId || category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
                >
                  <option value="">-- Chọn nhóm hàng từ cây phân cấp --</option>
                  {hierarchicalCategories.length > 0 ? (
                    hierarchicalCategories.map(({ cat, label }) => (
                      <option key={cat.id} value={cat.id}>
                        {label}
                      </option>
                    ))
                  ) : (
                    PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  )}
                </select>
                {selectedCategoryPath && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50/80 px-2.5 py-1 rounded-lg border border-orange-200/50">
                    <Icons.Building2 size={13} className="shrink-0 text-orange-600" />
                    <span className="font-semibold">Phân cấp:</span>
                    <span className="font-medium truncate">{selectedCategoryPath}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  4. Đơn vị tính cơ sở <span className="text-red-500">*</span>
                </label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
                >
                  {COMMON_BASE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Đơn vị nhỏ nhất dùng để ghi sổ thẻ kho và tính tồn</p>
              </div>
            </div>

            {/* 5. Quy cách đóng gói */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                5. Quy cách đóng gói
              </label>
              <input
                type="text"
                value={packagingSpec}
                onChange={(e) => setPackagingSpec(e.target.value)}
                placeholder="VD: 24 lon / thùng (4 lốc x 6 lon)"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
              />
            </div>

            {/* 6. GIÁ VỐN (Bảo mật RBAC EP-02) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  6. Giá vốn (VNĐ)
                </label>
                {canEditCost ? (
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    Quyền hạn: Quản lý KD / Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    <Icons.Lock size={12} />
                    Bảo mật: Bị khóa theo vai trò
                  </span>
                )}
              </div>

              {canEditCost ? (
                <div>
                  <div className="flex rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all overflow-hidden min-h-[44px]">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="VD: 215000"
                      className="flex-1 px-3.5 py-2.5 bg-transparent text-sm font-semibold text-gray-900 focus:outline-none min-h-[44px]"
                    />
                    <span className="bg-gray-100 px-3.5 flex items-center justify-center border-l border-gray-200 text-xs font-bold text-gray-500 select-none shrink-0">
                      VNĐ
                    </span>
                  </div>
                  {Number(costPrice) > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
                      <span>Quy đổi:</span>
                      <span className="font-bold text-orange-600 font-mono">
                        {formatCurrencyVND(Number(costPrice) || 0)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value="•••••• (Bạn không có quyền xem/sửa giá vốn)"
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed italic min-h-[44px]"
                  />
                </div>
              )}
            </div>

            {/* 7. URL Ảnh sản phẩm */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                7. Đường dẫn hình ảnh (URL)
              </label>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      placeholder="https://example.com/images/coca-cola-330ml.jpg"
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all min-h-[44px] ${
                        imageUrlError || imagePreviewError
                          ? 'bg-red-50/50 border border-red-300 text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
                      }`}
                    />
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => handleImageUrlChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                        title="Xóa link ảnh"
                      >
                        <Icons.X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Thông báo trạng thái / lỗi URL ảnh */}
                  {imageUrlError ? (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5 font-medium">
                      <Icons.AlertCircle size={14} className="shrink-0 text-red-500" />
                      <span>{imageUrlError}</span>
                    </p>
                  ) : imagePreviewError ? (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5 font-medium">
                      <Icons.AlertCircle size={14} className="shrink-0 text-red-500" />
                      <span>Không thể tải hình ảnh từ liên kết này (link lỗi, 404 hoặc không phải ảnh).</span>
                    </p>
                  ) : imageUrl.trim() ? (
                    <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1.5">
                      <Icons.CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                      <span>Đường dẫn ảnh hợp lệ</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Hỗ trợ link ảnh trực tiếp từ internet (.jpg, .png, .webp...). Bỏ trống nếu chưa có ảnh.
                    </p>
                  )}
                </div>

                {/* Hộp xem trước ảnh (Preview) */}
                <div
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 transition-all ${
                    imageUrlError || imagePreviewError
                      ? 'bg-red-50 border-red-300 text-red-500 shadow-2xs'
                      : imageUrl.trim()
                      ? 'bg-white border-orange-200 shadow-2xs'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}
                  title={
                    imageUrlError || imagePreviewError
                      ? 'Ảnh không hợp lệ hoặc không tải được'
                      : imageUrl.trim()
                      ? 'Ảnh xem trước'
                      : 'Chưa có ảnh'
                  }
                >
                  {imageUrl.trim() && !imageUrlError && !imagePreviewError ? (
                    <img
                      src={imageUrl.trim()}
                      alt="Preview"
                      onLoad={() => setImagePreviewError(false)}
                      onError={() => setImagePreviewError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : imageUrlError || imagePreviewError ? (
                    <Icons.AlertTriangle size={20} className="text-red-500" />
                  ) : (
                    <Icons.Package size={20} className="text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Modal */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-sm font-semibold transition-colors min-h-[44px]"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(skuError) || Boolean(imageUrlError) || imagePreviewError}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold shadow-xs hover:shadow transition-all duration-200 flex items-center gap-2 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Icons.CheckCircle2 size={18} />
                  <span>{isEditing ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
