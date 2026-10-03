import React, { useState, useEffect } from 'react';
import type { Product, CreateProductInput, UpdateProductInput, ProductStatus } from '../../../types/product';
import { PRODUCT_CATEGORIES, COMMON_BASE_UNITS, canManageCostPrice, productService } from '../../../services/productService';
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
      setSkuError(`Mã SKU "${cleanSku}" đã tồn tại. Vui lòng nhập mã khác.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && productToEdit) {
        const updatePayload: UpdateProductInput = {
          sku: cleanSku,
          name: name.trim(),
          category,
          baseUnit: baseUnit.trim(),
          packagingSpec: packagingSpec.trim(),
          imageUrl: imageUrl.trim(),
          status
        };
        if (canEditCost) {
          updatePayload.costPrice = Number(costPrice) || 0;
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
          packagingSpec: packagingSpec.trim() || 'Thùng tiêu chuẩn',
          costPrice: canEditCost ? Number(costPrice) || 0 : 0,
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
    } catch {
      setGeneralError('Đã xảy ra lỗi khi lưu thông tin sản phẩm. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(3px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #FFF7ED, #FFFFFF)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#FFEDD5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icons.Package size={22} color="#EA580C" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                {isEditing ? 'Cập nhật thông tin sản phẩm' : 'Khai báo sản phẩm mới (S2-05)'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6B7280' }}>
                Chuẩn hóa mã SKU, tên gọi và quy cách đóng gói toàn công ty
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div
            style={{
              padding: '20px 24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {generalError && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '10px',
                  color: '#991B1B',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Icons.AlertCircle size={18} color="#DC2626" />
                <span>{generalError}</span>
              </div>
            )}

            {/* 1. Mã SKU & 8. Trạng thái */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  1. Mã SKU duy nhất <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    placeholder="VD: SP-COCA-330"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${skuError ? '#EF4444' : '#D1D5DB'}`,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#111827',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                  {sku && !skuError && (
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                      <Icons.CheckCircle2 size={16} color="#16A34A" />
                    </span>
                  )}
                </div>
                {skuError ? (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626', fontWeight: 500 }}>
                    {skuError}
                  </p>
                ) : (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                    Mã định danh duy nhất toàn hệ thống.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  8. Trạng thái kinh doanh <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="ACTIVE">Đang kinh doanh</option>
                  <option value="INACTIVE">Ngừng kinh doanh</option>
                </select>
              </div>
            </div>

            {/* 2. Tên sản phẩm */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                2. Tên sản phẩm chuẩn toàn công ty <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nước ngọt có gas Coca-Cola lon 330ml"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 3. Nhóm hàng & 4. Đơn vị tính cơ sở */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  3. Nhóm hàng <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  4. ĐVT cơ sở (Base Unit) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                >
                  {COMMON_BASE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Quy cách đóng gói & 6. Giá vốn */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  5. Quy cách đóng gói <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={packagingSpec}
                  onChange={(e) => setPackagingSpec(e.target.value)}
                  placeholder="VD: 24 lon / thùng, 12 hộp / lốc..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* 6. GIÁ VỐN */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    6. Giá vốn (VNĐ)
                  </label>
                  {!canEditCost && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        backgroundColor: '#FEF2F2',
                        color: '#991B1B',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontWeight: 600
                      }}
                    >
                      <Icons.Lock size={12} color="#DC2626" />
                      Chỉ QLKD xem/sửa
                    </span>
                  )}
                </div>

                {canEditCost ? (
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="VD: 215000"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#EA580C',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      disabled
                      value="••••••••••"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        fontSize: '14px',
                        letterSpacing: '3px',
                        color: '#9CA3AF',
                        backgroundColor: '#F3F4F6',
                        boxSizing: 'border-box',
                        cursor: 'not-allowed'
                      }}
                    />
                    <span style={{ position: 'absolute', left: '10px', color: '#9CA3AF' }}>
                      <Icons.Lock size={16} />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Ảnh sản phẩm */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                7. Đường dẫn ảnh sản phẩm (Image URL)
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    border: '1px dashed #D1D5DB',
                    backgroundColor: '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}
                >
                  {imageUrl && !imagePreviewError ? (
                    <img
                      src={imageUrl}
                      alt="Xem trước"
                      onError={() => setImagePreviewError(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Icons.Package size={22} color="#9CA3AF" />
                  )}
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreviewError(false);
                  }}
                  placeholder="https://example.com/san-pham.jpg (để trống nếu chưa có)"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Modal Actions */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: '#F9FAFB'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(skuError)}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting || skuError ? '#FDA4AF' : '#F85606',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting || skuError ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icons.Check size={16} />
              <span>{isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
