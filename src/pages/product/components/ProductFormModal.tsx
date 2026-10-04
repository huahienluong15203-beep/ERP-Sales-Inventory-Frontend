import React, { useState, useEffect } from 'react';
import type { Product, CreateProductInput, UpdateProductInput, ProductStatus } from '../../../types/product';
import {
  PRODUCT_CATEGORIES,
  COMMON_BASE_UNITS,
  canManageCostPrice,
  formatCurrencyVND,
  productService
} from '../../../services/productService';
import { useAuth } from '../../../contexts/AuthContext';
import { Icons } from '../../../components/common/Icons';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  productToEdit?: Product | null;
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
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [baseUnit, setBaseUnit] = useState<string>(COMMON_BASE_UNITS[0]);
  const [packagingSpec, setPackagingSpec] = useState('');
  const [costPrice, setCostPrice] = useState<number | string>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');

  const [skuError, setSkuError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  const isEditing = Boolean(productToEdit);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setSku(productToEdit.sku);
        setName(productToEdit.name);
        setCategory(productToEdit.category || PRODUCT_CATEGORIES[0]);
        setBaseUnit(productToEdit.baseUnit || COMMON_BASE_UNITS[0]);
        setPackagingSpec(productToEdit.packagingSpec || '');
        setCostPrice(productToEdit.costPrice || 0);
        setImageUrl(productToEdit.imageUrl || '');
        setStatus(productToEdit.status || 'ACTIVE');
      } else {
        setSku('');
        setName('');
        setCategory(PRODUCT_CATEGORIES[0]);
        setBaseUnit(COMMON_BASE_UNITS[0]);
        setPackagingSpec('');
        setCostPrice(0);
        setImageUrl('');
        setStatus('ACTIVE');
      }
      setSkuError(null);
      setGeneralError(null);
      setImagePreviewError(false);
    }
  }, [isOpen, productToEdit]);

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

    setIsSubmitting(true);
    try {
      const parsedCost = canEditCost ? Number(costPrice) || 0 : productToEdit?.costPrice || 0;

      if (isEditing && productToEdit) {
        const updatePayload: UpdateProductInput = {
          name: name.trim(),
          category,
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
          category,
          baseUnit: baseUnit.trim(),
          packagingSpec: packagingSpec.trim(),
          costPrice: parsedCost,
          imageUrl: imageUrl.trim(),
          status
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

            {/* 1. Mã SKU & 8. Trạng thái */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  1. Mã SKU duy nhất <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  placeholder="VD: SP-COCA-330"
                  disabled={isEditing || isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono font-semibold uppercase tracking-wider text-gray-900 focus:outline-none focus:ring-2 transition-all min-h-[44px] ${
                    skuError
                      ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 focus:ring-orange-500/20 focus:border-orange-500'
                  } ${isEditing ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {skuError ? (
                  <p className="text-xs text-red-600 font-medium mt-1">{skuError}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Mã nhận diện duy nhất toàn hệ thống (không trùng lặp)</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  8. Trạng thái kinh doanh <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
                >
                  <option value="ACTIVE">Đang kinh doanh (ACTIVE)</option>
                  <option value="INACTIVE">Ngừng kinh doanh (INACTIVE)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Sản phẩm ngừng kinh doanh vẫn lưu vết lịch sử giao dịch</p>
              </div>
            </div>

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
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  3. Nhóm hàng <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreviewError(false);
                  }}
                  placeholder="https://example.com/images/coca-cola-330ml.jpg"
                  disabled={isSubmitting}
                  className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[44px]"
                />

                <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  {imageUrl && !imagePreviewError ? (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      onError={() => setImagePreviewError(true)}
                      className="w-full h-full object-cover"
                    />
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
              disabled={isSubmitting || Boolean(skuError)}
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
