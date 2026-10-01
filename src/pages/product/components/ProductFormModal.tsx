import React, { useState, useEffect, useMemo } from 'react';
import type { Product, UnitConversion, ProductStatus } from '../../../types/product';
import { CategoryService } from '../../../services/categoryService';
import { Icons } from '../../../components/common/Icons';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Product | null;
  canViewCostPrice?: boolean; // Chỉ Quản lý kinh doanh & Admin
  existingProducts?: Product[]; // Kiểm tra tính duy nhất của mã SKU
}

const CATEGORY_SUGGESTIONS = [
  'Bia & Đồ uống có cồn',
  'Nước ngọt & Giải khát',
  'Sữa & Chế phẩm sữa',
  'Thực phẩm chế biến & Mì ăn liền',
  'Gia vị & Nước chấm',
  'Bánh kẹo & Đồ ăn vặt',
  'Hóa mỹ phẩm & Chăm sóc cá nhân'
];

const BASE_UNIT_SUGGESTIONS = ['Lon', 'Chai', 'Hộp', 'Gói', 'Cái', 'Túi', 'Kg', 'Lít', 'Thanh', 'Hũ'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  canViewCostPrice = true,
  existingProducts = []
}) => {
  // Form fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORY_SUGGESTIONS[0]);
  const [baseUnit, setBaseUnit] = useState(BASE_UNIT_SUGGESTIONS[0]);
  const [packagingSpec, setPackagingSpec] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');

  // Bảng cài đặt quy đổi đơn vị
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);

  // Danh mục nhóm hàng từ Category Tree
  const flatCategories = useMemo(() => {
    try {
      const tree = CategoryService.getCategoryTree();
      const list = CategoryService.getFlatCategories(tree);
      if (list && list.length > 0) {
        return list.map((c) => c.name.replace(/^[—\s]+/, ''));
      }
    } catch (e) {
      // fallback
    }
    return CATEGORY_SUGGESTIONS;
  }, [isOpen]);

  // KIỂM TRA MÃ SKU DUY NHẤT TRÊN TOÀN HỆ THỐNG
  const isSkuDuplicate = useMemo(() => {
    const cleanSku = sku.trim().toUpperCase();
    if (!cleanSku) return false;
    return existingProducts.some(
      (p) => p.sku.trim().toUpperCase() === cleanSku && p.id !== initialData?.id
    );
  }, [sku, existingProducts, initialData]);

  // Trạng thái modal
  const [activeTab, setActiveTab] = useState<'general' | 'conversions'>('general');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đổ dữ liệu khi mở form Sửa hoặc Tạo mới
  useEffect(() => {
    if (initialData) {
      setSku(initialData.sku);
      setName(initialData.name);
      setCategory(initialData.category);
      setBaseUnit(initialData.baseUnit);
      setPackagingSpec(initialData.packagingSpec);
      setCostPrice(initialData.costPrice || 0);
      setImageUrl(initialData.imageUrl || '');
      setStatus(initialData.status);
      setUnitConversions(initialData.unitConversions || []);
    } else {
      setSku('');
      setName('');
      setCategory(CATEGORY_SUGGESTIONS[0]);
      setBaseUnit(BASE_UNIT_SUGGESTIONS[0]);
      setPackagingSpec('24 lon / thùng');
      setCostPrice(0);
      setImageUrl('');
      setStatus('ACTIVE');
      setUnitConversions([
        {
          id: `conv-${Date.now()}`,
          unitName: 'Thùng',
          conversionFactor: 24,
          operator: 'MULTIPLY',
          barcode: '',
          sellingPrice: 0,
          isDefaultSalesUnit: true,
          note: 'Quy cách xuất kho bán buôn'
        }
      ]);
    }
    setError(null);
    setActiveTab('general');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Thêm một dòng quy đổi đơn vị mới
  const handleAddConversion = () => {
    const newConv: UnitConversion = {
      id: `conv-${Date.now()}`,
      unitName: 'Lốc',
      conversionFactor: 6,
      operator: 'MULTIPLY',
      barcode: '',
      sellingPrice: 0,
      isDefaultSalesUnit: false,
      note: ''
    };
    setUnitConversions([...unitConversions, newConv]);
  };

  // Cập nhật một dòng quy đổi
  const handleUpdateConversion = (id: string, field: keyof UnitConversion, value: any) => {
    setUnitConversions(
      unitConversions.map((conv) => {
        if (conv.id === id) {
          return { ...conv, [field]: value };
        }
        return conv;
      })
    );
  };

  // Xóa một dòng quy đổi
  const handleRemoveConversion = (id: string) => {
    setUnitConversions(unitConversions.filter((conv) => conv.id !== id));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSku = sku.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanBaseUnit = baseUnit.trim();
    const cleanPackaging = packagingSpec.trim();

    if (!cleanSku) {
      setError('Vui lòng nhập Mã SKU cho sản phẩm!');
      setActiveTab('general');
      return;
    }

    if (!/^[A-Z0-9_\-]+$/.test(cleanSku)) {
      setError('Mã SKU chỉ được chứa chữ cái in hoa, chữ số và dấu gạch (- hoặc _)!');
      setActiveTab('general');
      return;
    }

    if (!cleanName) {
      setError('Vui lòng nhập Tên sản phẩm chuẩn toàn công ty!');
      setActiveTab('general');
      return;
    }

    if (!cleanBaseUnit) {
      setError('Đơn vị tính cơ sở không được để trống (Nguyên tắc Base Unit)!');
      setActiveTab('general');
      return;
    }

    if (!cleanPackaging) {
      setError('Vui lòng nhập Quy cách đóng gói (ví dụ: 24 lon/thùng)!');
      setActiveTab('general');
      return;
    }

    if (isSkuDuplicate) {
      setError(`Mã SKU "${cleanSku}" đã tồn tại trong danh mục! Mã SKU phải là duy nhất trên toàn hệ thống.`);
      setActiveTab('general');
      return;
    }

    if (costPrice < 0) {
      setError('Giá vốn sản phẩm không thể là số âm!');
      setActiveTab('general');
      return;
    }

    // Kiểm tra tính hợp lệ của bảng quy đổi
    for (const conv of unitConversions) {
      if (!conv.unitName.trim()) {
        setError('Tên đơn vị quy đổi không được để trống!');
        setActiveTab('conversions');
        return;
      }
      if (conv.unitName.trim().toLowerCase() === cleanBaseUnit.toLowerCase()) {
        setError(`Đơn vị quy đổi "${conv.unitName}" không được trùng với Đơn vị tính cơ sở "${cleanBaseUnit}"!`);
        setActiveTab('conversions');
        return;
      }
      if (conv.conversionFactor <= 0) {
        setError(`Hệ số quy đổi của đơn vị "${conv.unitName}" phải lớn hơn 0!`);
        setActiveTab('conversions');
        return;
      }
    }

    // Bảo mật giá vốn: Nếu không phải Quản lý kinh doanh/Admin thì giữ nguyên giá vốn cũ
    const finalCostPrice = canViewCostPrice
      ? (Number(costPrice) || 0)
      : (initialData ? (initialData.costPrice || 0) : 0);

    setIsSubmitting(true);
    try {
      await onSave({
        sku: cleanSku,
        name: cleanName,
        category: cleanCategory,
        baseUnit: cleanBaseUnit,
        packagingSpec: cleanPackaging,
        costPrice: finalCostPrice,
        imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
        status,
        unitConversions
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu sản phẩm. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#FFF7ED',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #FFEDD5'
              }}
            >
              <Icons.Package size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {initialData ? 'Cập Nhật Sản Phẩm (SKU)' : 'Khai Báo Mã Sản Phẩm Mới (SKU)'}
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0' }}>
                Chuẩn hóa tên gọi, mã hàng và bảng cài đặt quy đổi đơn vị toàn hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px 0',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'general' ? 700 : 500,
              color: activeTab === 'general' ? '#EA580C' : '#64748B',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'general' ? '2.5px solid #EA580C' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icons.Tags size={15} />
            <span>1. Khai Báo SKU & Thông Tin Cơ Bản</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conversions')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'conversions' ? 700 : 500,
              color: activeTab === 'conversions' ? '#EA580C' : '#64748B',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'conversions' ? '2.5px solid #EA580C' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icons.Layers size={15} />
            <span>2. Bảng Cài Đặt Quy Đổi Đơn Vị ({unitConversions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {/* Báo lỗi nếu có */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '13px',
                  marginBottom: '20px'
                }}
              >
                <Icons.AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: THÔNG TIN KHAI BÁO SKU CƠ BẢN */}
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {/* 1. Mã SKU */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                      MÃ SKU ĐỊNH DANH <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="VD: BEER-TIGER-330"
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: isSkuDuplicate ? '2px solid #EF4444' : '1.5px solid #CBD5E1',
                        backgroundColor: isSkuDuplicate ? '#FEF2F2' : '#FFFFFF',
                        color: isSkuDuplicate ? '#DC2626' : '#0F172A',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {isSkuDuplicate ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#DC2626', fontSize: '11px', fontWeight: 700 }}>
                        <Icons.AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>Mã SKU "{sku.trim().toUpperCase()}" đã tồn tại! Mã SKU phải là duy nhất.</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                        Mã chuẩn hóa toàn công ty (in hoa, không trùng lặp, dùng dấu gạch -)
                      </span>
                    )}
                  </div>

                  {/* 2. Nhóm hàng */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                      NHÓM HÀNG / DANH MỤC <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      list="categories-list"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Chọn hoặc nhập nhóm hàng..."
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <datalist id="categories-list">
                      {flatCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* 3. Tên sản phẩm */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                    TÊN SẢN PHẨM CHUẨN <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Bia Tiger Nâu Lon 330ml"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {/* 4. Đơn vị tính cơ sở */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                      ĐƠN VỊ TÍNH CƠ SỞ (BASE UNIT) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      list="base-units-list"
                      value={baseUnit}
                      onChange={(e) => setBaseUnit(e.target.value)}
                      placeholder="VD: Lon, Chai, Hộp, Gói..."
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: '#EA580C',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <datalist id="base-units-list">
                      {BASE_UNIT_SUGGESTIONS.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                    <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                      Nguyên tắc bất biến: Tồn kho & công nợ luôn ghi nhận theo ĐVT cơ sở
                    </span>
                  </div>

                  {/* 5. Quy cách đóng gói */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                      QUY CÁCH ĐÓNG GÓI <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={packagingSpec}
                      onChange={(e) => setPackagingSpec(e.target.value)}
                      placeholder="VD: 24 lon / thùng (4 lốc x 6 lon)"
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {/* 6. Giá vốn (BẢO MẬT: CHỈ Quản lý kinh doanh & Admin) */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                      <span>GIÁ VỐN (VNĐ) <span style={{ color: '#EF4444' }}>*</span></span>
                      <span style={{ fontSize: '10px', color: canViewCostPrice ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                        {canViewCostPrice ? '🔓 QUẢN LÝ KINH DOANH' : '🔒 BẢO MẬT (CHỈ QUẢN LÝ KD/ADMIN)'}
                      </span>
                    </label>
                    {canViewCostPrice ? (
                      <>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={costPrice}
                          onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value)))}
                          placeholder="0"
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#0F172A',
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                          = {Number(costPrice).toLocaleString('vi-VN')} đ (Được quyền xem và sửa)
                        </span>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          disabled
                          value="••••••••••••••"
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #E2E8F0',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#94A3B8',
                            backgroundColor: '#F8FAFC',
                            letterSpacing: '3px',
                            cursor: 'not-allowed',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icons.Lock size={12} />
                          <span>Chỉ Quản lý kinh doanh và Admin mới có quyền xem & chỉnh sửa giá vốn!</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* 7. Trạng thái */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                      TRẠNG THÁI KINH DOANH <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ProductStatus)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13.5px',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="ACTIVE">🟢 Đang kinh doanh (Active)</option>
                      <option value="INACTIVE">🟡 Tạm ngưng kinh doanh (Inactive)</option>
                      <option value="OUT_OF_STOCK">🔴 Hết hàng tạm thời (Out of stock)</option>
                    </select>
                  </div>
                </div>

                {/* 8. Ảnh sản phẩm */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                    ẢNH SẢN PHẨM (URL HOẶC LINK MINH HỌA)
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Icons.Image size={24} color="#94A3B8" />
                      )}
                    </div>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Dán đường dẫn ảnh sản phẩm (vd: https://...)..."
                      style={{
                        flex: 1,
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BẢNG CÀI ĐẶT QUY ĐỔI ĐƠN VỊ (UNIT CONVERSION TABLE) */}
            {activeTab === 'conversions' && (
              <div>
                <div
                  style={{
                    backgroundColor: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <Icons.Info size={18} color="#EA580C" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12.5px', color: '#9A3412', lineHeight: 1.45 }}>
                    <strong>Nguyên tắc Đơn Vị Tính Cơ Sở (Base Unit Rule):</strong> Mọi xuất nhập tồn trong thẻ kho và công nợ đều quy về Đơn vị cơ sở: <strong>{baseUnit || 'Lon/Chai/Hộp'}</strong>.
                    Bảng này cài đặt hệ số quy đổi để nhân viên kinh doanh và đại lý dễ dàng đặt hàng theo <strong>Thùng, Lốc, Két</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Danh sách đơn vị quy đổi ({unitConversions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddConversion}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      backgroundColor: '#EA580C',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icons.Plus size={15} />
                    <span>+ Thêm Đơn Vị Quy Đổi</span>
                  </button>
                </div>

                {unitConversions.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 16px',
                      border: '1.5px dashed #CBD5E1',
                      borderRadius: '14px',
                      color: '#64748B'
                    }}
                  >
                    <p style={{ margin: '0 0 10px', fontSize: '13px' }}>Chưa có đơn vị quy đổi nào (mặc định chỉ bán theo {baseUnit || 'ĐVT cơ sở'}).</p>
                    <button
                      type="button"
                      onClick={handleAddConversion}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#F1F5F9',
                        color: '#0F172A',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid #CBD5E1',
                        cursor: 'pointer'
                      }}
                    >
                      + Thêm đơn vị Thùng / Lốc
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>ĐƠN VỊ QUY ĐỔI</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>HỆ SỐ (= X {baseUnit || 'Cơ sở'})</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>CÔNG THỨC QUY ĐỔI</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>GIÁ BÁN (VNĐ)</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>MÃ VẠCH (BARCODE)</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px' }}>XÓA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitConversions.map((conv) => (
                          <tr key={conv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            {/* Tên đơn vị */}
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="text"
                                value={conv.unitName}
                                onChange={(e) => handleUpdateConversion(conv.id, 'unitName', e.target.value)}
                                placeholder="VD: Thùng"
                                style={{
                                  width: '100%',
                                  height: '34px',
                                  padding: '0 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Hệ số quy đổi */}
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                min={1}
                                value={conv.conversionFactor}
                                onChange={(e) => handleUpdateConversion(conv.id, 'conversionFactor', Math.max(1, Number(e.target.value)))}
                                style={{
                                  width: '90px',
                                  height: '34px',
                                  padding: '0 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                  color: '#EA580C',
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Hiển thị công thức trực quan */}
                            <td style={{ padding: '8px 12px', color: '#0F172A', fontWeight: 600 }}>
                              <span style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                                1 {conv.unitName || 'Đơn vị'} = {conv.conversionFactor} {baseUnit || 'Cơ sở'}
                              </span>
                            </td>

                            {/* Giá bán theo đơn vị */}
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={conv.sellingPrice || 0}
                                onChange={(e) => handleUpdateConversion(conv.id, 'sellingPrice', Math.max(0, Number(e.target.value)))}
                                placeholder="0"
                                style={{
                                  width: '120px',
                                  height: '34px',
                                  padding: '0 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12.5px',
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Mã vạch */}
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="text"
                                value={conv.barcode || ''}
                                onChange={(e) => handleUpdateConversion(conv.id, 'barcode', e.target.value)}
                                placeholder="893..."
                                style={{
                                  width: '100%',
                                  height: '34px',
                                  padding: '0 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12px',
                                  fontFamily: 'monospace',
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Nút xóa */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveConversion(conv.id)}
                                title="Xóa đơn vị quy đổi này"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#FEE2E2',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Icons.Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              * SKU và Đơn vị tính cơ sở là trường dữ liệu cốt lõi đồng bộ toàn doanh nghiệp.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isSkuDuplicate}
                style={{
                  height: '40px',
                  padding: '0 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSkuDuplicate
                    ? '#94A3B8'
                    : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: isSkuDuplicate ? 'none' : '0 4px 12px rgba(234, 88, 12, 0.3)',
                  cursor: (isSubmitting || isSkuDuplicate) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: (isSubmitting || isSkuDuplicate) ? 0.7 : 1
                }}
              >
                {isSubmitting ? (
                  <>
                    <Icons.RefreshCw size={15} className="animate-spin" />
                    <span>Đang lưu SKU...</span>
                  </>
                ) : (
                  <>
                    <Icons.CheckCircle2 size={16} />
                    <span>{initialData ? 'Lưu Thay Đổi SKU' : 'Khai Báo SKU & Lưu'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
