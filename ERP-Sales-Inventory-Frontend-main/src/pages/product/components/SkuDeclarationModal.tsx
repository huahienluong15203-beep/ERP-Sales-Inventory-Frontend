import React, { useState, useEffect } from 'react';
import type { ProductItem, UnitConversion, ProductStatus } from '../../../types/product';
import type { RoleName } from '../../../types/user';
import { canViewCostPrice, PRODUCT_CATEGORIES } from '../../../services/productService';
import {
  X,
  Plus,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Package,
  DollarSign,
  Trash2,
  Info
} from '../../../components/common/Icons';

interface SkuDeclarationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductItem) => Promise<{ success: boolean; message: string }>;
  initialData?: ProductItem | null;
  userRoles: RoleName[];
}

export const SkuDeclarationModal: React.FC<SkuDeclarationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  userRoles
}) => {
  const allowCost = canViewCostPrice(userRoles);

  // Form thông tin SKU (S2-05)
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [baseUnit, setBaseUnit] = useState('Lon');
  const [packagingSpec, setPackagingSpec] = useState('24 lon / thùng');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');

  // Bảng đơn vị tính và quy đổi (S2-07)
  const [units, setUnits] = useState<UnitConversion[]>([]);

  // Trạng thái modal
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đồng bộ khi mở modal hoặc thay đổi initialData
  useEffect(() => {
    if (initialData) {
      setSku(initialData.sku);
      setName(initialData.name);
      setCategory(initialData.category || PRODUCT_CATEGORIES[0]);
      setBaseUnit(initialData.baseUnit || 'Lon');
      setPackagingSpec(initialData.packagingSpec || '');
      setCostPrice(initialData.costPrice || 0);
      setBasePrice(initialData.basePrice || 0);
      setImageUrl(initialData.imageUrl || '');
      setStatus(initialData.status);
      setUnits(
        initialData.units && initialData.units.length > 0
          ? JSON.parse(JSON.stringify(initialData.units))
          : [
              {
                id: `u-${Date.now()}-base`,
                unitName: initialData.baseUnit || 'Lon',
                conversionFactor: 1,
                barcode: '8934567010011',
                isBaseUnit: true,
                suggestedPrice: initialData.basePrice || 0,
                sellingPrice: initialData.basePrice || 0,
                costPrice: initialData.costPrice || 0
              }
            ]
      );
    } else {
      // Giá trị mặc định khi tạo mới
      const defaultBase = 'Lon';
      const defaultPrice = 15000;
      const defaultCost = 11500;
      setSku('');
      setName('');
      setCategory(PRODUCT_CATEGORIES[0]);
      setBaseUnit(defaultBase);
      setPackagingSpec('24 lon / thùng (4 lốc x 6 lon)');
      setCostPrice(defaultCost);
      setBasePrice(defaultPrice);
      setImageUrl('');
      setStatus('ACTIVE');
      setUnits([
        {
          id: `u-${Date.now()}-base`,
          unitName: defaultBase,
          conversionFactor: 1,
          barcode: `893${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          isBaseUnit: true,
          suggestedPrice: defaultPrice,
          sellingPrice: defaultPrice,
          costPrice: defaultCost
        },
        {
          id: `u-${Date.now()}-thung`,
          unitName: 'Thùng (24 lon)',
          conversionFactor: 24,
          barcode: `893${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          isBaseUnit: false,
          suggestedPrice: defaultPrice * 24,
          sellingPrice: defaultPrice * 24 - 15000, // Chiết khấu sỉ mẫu
          costPrice: defaultCost * 24
        }
      ]);
    }
    setErrorMessage(null);
  }, [initialData, isOpen]);

  // Khi người dùng đổi tên ĐVT cơ sở -> Cập nhật dòng Base Unit trong bảng quy đổi
  const handleBaseUnitChange = (newBaseUnit: string) => {
    setBaseUnit(newBaseUnit);
    setUnits((prev) =>
      prev.map((u) =>
        u.isBaseUnit
          ? {
              ...u,
              unitName: newBaseUnit,
              suggestedPrice: basePrice,
              sellingPrice: u.sellingPrice || basePrice
            }
          : u
      )
    );
  };

  // Khi người dùng thay đổi giá bán cơ sở -> Tính lại suggestedPrice cho các đơn vị
  const handleBasePriceChange = (newBasePrice: number) => {
    setBasePrice(newBasePrice);
    setUnits((prev) =>
      prev.map((u) => {
        const suggested = newBasePrice * u.conversionFactor;
        return {
          ...u,
          suggestedPrice: suggested,
          // Nếu đơn vị cơ sở thì cập nhật luôn giá bán, còn đơn vị quy đổi nếu chưa chỉnh thì cập nhật theo
          sellingPrice: u.isBaseUnit ? newBasePrice : u.sellingPrice || suggested
        };
      })
    );
  };

  // Khi đổi giá vốn cơ sở -> Cập nhật giá vốn các đơn vị
  const handleCostPriceChange = (newCostPrice: number) => {
    setCostPrice(newCostPrice);
    setUnits((prev) =>
      prev.map((u) => ({
        ...u,
        costPrice: newCostPrice * u.conversionFactor
      }))
    );
  };

  // Thêm đơn vị quy đổi mới
  const handleAddUnit = () => {
    const newFactor = 6;
    const suggested = basePrice * newFactor;
    const newUnit: UnitConversion = {
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      unitName: 'Lốc (6 lon)',
      conversionFactor: newFactor,
      barcode: `893${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      isBaseUnit: false,
      suggestedPrice: suggested,
      sellingPrice: suggested,
      costPrice: costPrice * newFactor
    };
    setUnits([...units, newUnit]);
  };

  // Cập nhật thông tin dòng đơn vị quy đổi
  const handleUpdateUnit = (index: number, field: keyof UnitConversion, value: string | number) => {
    setUnits((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'conversionFactor') {
        const factor = Math.max(1, Number(value) || 1);
        target.conversionFactor = factor;
        target.suggestedPrice = basePrice * factor;
        if (target.isBaseUnit) {
          target.conversionFactor = 1;
        } else {
          // Gợi ý giá bán mới nếu chưa có giá tùy chỉnh
          target.sellingPrice = target.suggestedPrice;
          target.costPrice = costPrice * factor;
        }
      } else if (field === 'sellingPrice') {
        target.sellingPrice = Math.max(0, Number(value) || 0);
      } else if (field === 'unitName') {
        target.unitName = String(value);
      } else if (field === 'barcode') {
        target.barcode = String(value);
      }

      updated[index] = target;
      return updated;
    });
  };

  // Xóa đơn vị quy đổi (Cấm xoá đơn vị cơ sở)
  const handleDeleteUnit = (index: number) => {
    if (units[index].isBaseUnit) {
      alert('Không thể xoá Đơn vị tính cơ sở!');
      return;
    }
    setUnits(units.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sku.trim()) {
      setErrorMessage('Mã SKU là bắt buộc!');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Tên sản phẩm là bắt buộc!');
      return;
    }

    if (!baseUnit.trim()) {
      setErrorMessage('Đơn vị tính cơ sở là bắt buộc!');
      return;
    }

    if (units.length === 0) {
      setErrorMessage('Sản phẩm phải có tối thiểu 1 Đơn vị tính cơ sở!');
      return;
    }

    // Đảm bảo đơn vị cơ sở hợp lệ
    const baseUnitCount = units.filter((u) => u.isBaseUnit).length;
    if (baseUnitCount !== 1) {
      setErrorMessage('Hệ thống yêu cầu đúng duy nhất 1 Đơn vị tính cơ sở (Hệ số = 1)');
      return;
    }

    const payload: ProductItem = {
      id: initialData ? initialData.id : '',
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category,
      baseUnit: baseUnit.trim(),
      packagingSpec: packagingSpec.trim(),
      costPrice: allowCost ? costPrice : (initialData?.costPrice || 0),
      basePrice,
      imageUrl: imageUrl.trim(),
      status,
      hasTransactions: initialData?.hasTransactions || false,
      units,
      createdAt: initialData?.createdAt || '',
      updatedAt: ''
    };

    setIsSubmitting(true);
    try {
      const res = await onSave(payload);
      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {initialData ? 'Chỉnh sửa sản phẩm & SKU' : 'Khai báo SKU & Cài đặt Quy đổi Đơn vị'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                  S2-05 & S2-07
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Khai báo mã hàng chuẩn hóa, quy chuẩn ĐVT cơ sở và hệ thống mã vạch Barcode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Phần 1: Khai báo SKU & Thông tin sản phẩm (S2-05) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                I. Thông tin SKU & Danh mục (S2-05)
              </h3>
              {initialData?.hasTransactions && (
                <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                  ⚠️ Đã phát sinh giao dịch (Không thể xoá SKU)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mã SKU */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mã SKU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="VD: BEER-SGS-330"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 uppercase font-mono font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">Mã định danh duy nhất toàn hệ thống</p>
              </div>

              {/* Tên sản phẩm */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Bia Sài Gòn Special Lon 330ml"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Nhóm ngành hàng */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nhóm ngành hàng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Đơn vị tính cơ sở (Base Unit) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ĐVT cơ sở (Base Unit) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={baseUnit}
                  onChange={(e) => handleBaseUnitChange(e.target.value)}
                  placeholder="VD: Lon, Chai, Gói..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold text-blue-600 dark:text-blue-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Đơn vị nhỏ nhất để ghi thẻ kho & nợ</p>
              </div>

              {/* Quy cách đóng gói */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quy cách đóng gói
                </label>
                <input
                  type="text"
                  value={packagingSpec}
                  onChange={(e) => setPackagingSpec(e.target.value)}
                  placeholder="VD: 24 lon / thùng (4 lốc x 6 lon)"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Giá bán ĐVT cơ sở */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Giá bán ĐVT cơ sở (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={basePrice}
                    onChange={(e) => handleBasePriceChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold pr-10"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">đ</span>
                </div>
              </div>

              {/* Giá vốn (Bảo mật: Chỉ Sales Manager & Admin xem/sửa) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Giá vốn ĐVT cơ sở (VNĐ)</span>
                  {allowCost ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <ShieldCheck size={12} /> Quản lý xem được
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <ShieldAlert size={12} /> Bảo mật
                    </span>
                  )}
                </label>
                {allowCost ? (
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={costPrice}
                      onChange={(e) => handleCostPriceChange(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold pr-10 text-emerald-700 dark:text-emerald-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-emerald-500 font-medium">đ</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 flex items-center justify-between">
                    <span>••••••••••</span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                      Chỉ Quản lý KD
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  {allowCost ? 'Căn cứ tính biên lợi nhuận' : 'Được ẩn ở tầng Server theo quy chuẩn S2-05'}
                </p>
              </div>

              {/* Trạng thái kinh doanh */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái kinh doanh
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="ACTIVE">🟢 Đang kinh doanh</option>
                  <option value="INACTIVE">🔴 Ngừng kinh doanh</option>
                </select>
              </div>
            </div>
          </div>

          {/* Phần 2: Bảng cài đặt quy đổi đơn vị (S2-07) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  II. Bảng cài đặt quy đổi Đơn vị tính (S2-07)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quy đổi 1 cấp về ĐVT cơ sở (<span className="font-semibold text-blue-600">{baseUnit}</span>) • Gắn mã Barcode riêng cho từng ĐVT • Tự động tính giá bán & cho phép sửa
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddUnit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition"
              >
                <Plus size={14} />
                Thêm đơn vị quy đổi
              </button>
            </div>

            {/* Bảng đơn vị tính */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Tên ĐVT</th>
                    <th className="py-2.5 px-3">Hệ số quy đổi</th>
                    <th className="py-2.5 px-3">Mã Barcode / GTIN</th>
                    <th className="py-2.5 px-3">Giá đề xuất</th>
                    <th className="py-2.5 px-3">Giá bán thực tế</th>
                    {allowCost && <th className="py-2.5 px-3">Giá vốn</th>}
                    <th className="py-2.5 px-3 text-center w-12">Xoá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {units.map((unitItem, idx) => (
                    <tr
                      key={unitItem.id || idx}
                      className={unitItem.isBaseUnit ? 'bg-blue-50/30 dark:bg-blue-950/15' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}
                    >
                      {/* Tên ĐVT */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {unitItem.isBaseUnit ? (
                            <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              {unitItem.unitName}
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                                Cơ sở
                              </span>
                            </span>
                          ) : (
                            <input
                              type="text"
                              required
                              value={unitItem.unitName}
                              onChange={(e) => handleUpdateUnit(idx, 'unitName', e.target.value)}
                              placeholder="VD: Thùng, Lốc..."
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 w-32"
                            />
                          )}
                        </div>
                      </td>

                      {/* Hệ số quy đổi */}
                      <td className="py-2.5 px-3">
                        {unitItem.isBaseUnit ? (
                          <span className="font-mono text-slate-500">1 {baseUnit} = 1</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">=</span>
                            <input
                              type="number"
                              min="1"
                              required
                              value={unitItem.conversionFactor}
                              onChange={(e) => handleUpdateUnit(idx, 'conversionFactor', e.target.value)}
                              className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-slate-500 font-medium">{baseUnit}</span>
                          </div>
                        )}
                      </td>

                      {/* Mã Barcode */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={unitItem.barcode}
                            onChange={(e) => handleUpdateUnit(idx, 'barcode', e.target.value)}
                            placeholder="Mã vạch EAN/GTIN"
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono w-36"
                          />
                        </div>
                      </td>

                      {/* Giá đề xuất */}
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {unitItem.suggestedPrice.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Giá bán thực tế */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={unitItem.sellingPrice}
                            onChange={(e) => handleUpdateUnit(idx, 'sellingPrice', e.target.value)}
                            className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-900 dark:text-white"
                          />
                          <span className="text-slate-400 text-[11px]">đ</span>
                        </div>
                      </td>

                      {/* Giá vốn (chỉ Manager & Admin) */}
                      {allowCost && (
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          {((unitItem.costPrice || (costPrice * unitItem.conversionFactor))).toLocaleString('vi-VN')} đ
                        </td>
                      )}

                      {/* Nút xoá */}
                      <td className="py-2.5 px-3 text-center">
                        {unitItem.isBaseUnit ? (
                          <span className="text-[10px] text-slate-400 italic">Khóa</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteUnit(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                            title="Xóa đơn vị quy đổi này"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note nguyên tắc Base Unit */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p>
                <strong>Quy tắc nghiệp vụ bất biến (AGENTS.md):</strong> Mọi giao dịch kho và công nợ ghi nhận trên đơn vị quy đổi (Thùng, Lốc) đều được hệ thống tự động quy về ĐVT cơ sở (<strong>{baseUnit}</strong>) khi ghi sổ kế toán. Thay đổi hệ số quy đổi về sau không làm sai lệch các phiếu kho lịch sử.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{initialData ? 'Cập nhật SKU' : 'Lưu SKU & Cài đặt ĐVT'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
