import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import type {
  VolumeDiscountPolicy,
  VolumeDiscountPolicyRequest,
  DiscountScopeType,
  DiscountCustomerScope,
  DiscountCalculationType
} from '../../types/discount';
import type { CatalogProduct } from '../../types/pricing';
import {
  BEST_DEAL_RULE_STATEMENT,
  fetchDiscountProductOptions,
  fetchDiscountCategoryOptions
} from '../../services/volumeDiscountApi';
import type { DiscountCategoryOption } from '../../services/volumeDiscountApi';

interface VolumeDiscountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VolumeDiscountPolicyRequest) => Promise<void>;
  initialData?: VolumeDiscountPolicy | null;
  mode: 'create' | 'edit';
}

interface TierDraft {
  minQuantity: number;
  maxQuantity: number | null;
  isUnlimited: boolean;
  discountType: DiscountCalculationType;
  discountValue: number;
  note: string;
}

export const VolumeDiscountFormModal: React.FC<VolumeDiscountFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [scopeType, setScopeType] = useState<DiscountScopeType>('SKU');
  const [targetId, setTargetId] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [customerGroup, setCustomerGroup] = useState<DiscountCustomerScope>('ALL');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>('');
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [priority, setPriority] = useState<number>(2);
  const [description, setDescription] = useState<string>('');

  const [tiers, setTiers] = useState<TierDraft[]>([
    {
      minQuantity: 20,
      maxQuantity: 49,
      isUnlimited: false,
      discountType: 'PERCENT',
      discountValue: 3,
      note: 'Bậc khởi điểm'
    },
    {
      minQuantity: 50,
      maxQuantity: 99,
      isUnlimited: false,
      discountType: 'PERCENT',
      discountValue: 5,
      note: 'Bậc đại lý khá'
    },
    {
      minQuantity: 100,
      maxQuantity: null,
      isUnlimited: true,
      discountType: 'PERCENT',
      discountValue: 8,
      note: 'Bậc sản lượng lớn'
    }
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Danh mục thật từ backend
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<DiscountCategoryOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingOptions(true);
    Promise.all([fetchDiscountProductOptions(), fetchDiscountCategoryOptions()])
      .then(([prods, cats]) => {
        if (cancelled) return;
        setProducts(prods);
        setCategories(cats);
        // Khi tạo mới: mặc định chọn phần tử đầu tiên của danh sách
        if (mode !== 'edit' || !initialData) {
          setTargetId((prev) => {
            if (prev) return prev;
            if (prods[0]) {
              setTargetName(prods[0].name);
              return prods[0].sku;
            }
            return '';
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(
          err instanceof Error
            ? `Không tải được danh mục sản phẩm/nhóm hàng: ${err.message}`
            : 'Không tải được danh mục sản phẩm/nhóm hàng!'
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, initialData]);

  // Điền dữ liệu khi edit hoặc reset khi create
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setCode(initialData.code);
      setName(initialData.name);
      setScopeType(initialData.scopeType);
      setTargetId(initialData.targetId);
      setTargetName(initialData.targetName);
      setCustomerGroup(initialData.customerGroup);
      setStartDate(initialData.startDate);
      if (initialData.endDate) {
        setEndDate(initialData.endDate);
        setHasEndDate(true);
      } else {
        setEndDate('');
        setHasEndDate(false);
      }
      setStatus(initialData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
      setPriority(initialData.priority || 2);
      setDescription(initialData.description || '');

      if (initialData.tiers && initialData.tiers.length > 0) {
        setTiers(
          initialData.tiers.map((t) => ({
            minQuantity: t.minQuantity,
            maxQuantity: t.maxQuantity,
            isUnlimited: t.maxQuantity === null,
            discountType: t.discountType,
            discountValue: t.discountValue,
            note: t.note || ''
          }))
        );
      }
    } else {
      // Giá trị mặc định khi tạo mới
      const defaultProduct = products[0];
      setCode(`CK-SL-${Date.now().toString().slice(-4)}`);
      setName('Chính sách Chiết khấu Sản lượng Mới');
      setScopeType('SKU');
      setTargetId(defaultProduct ? defaultProduct.sku : '');
      setTargetName(defaultProduct ? defaultProduct.name : '');
      setCustomerGroup('ALL');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setHasEndDate(false);
      setStatus('ACTIVE');
      setPriority(2);
      setDescription('');
      setTiers([
        {
          minQuantity: 20,
          maxQuantity: 49,
          isUnlimited: false,
          discountType: 'PERCENT',
          discountValue: 3,
          note: 'Bậc 1'
        },
        {
          minQuantity: 50,
          maxQuantity: 99,
          isUnlimited: false,
          discountType: 'PERCENT',
          discountValue: 5,
          note: 'Bậc 2'
        },
        {
          minQuantity: 100,
          maxQuantity: null,
          isUnlimited: true,
          discountType: 'PERCENT',
          discountValue: 8,
          note: 'Bậc 3'
        }
      ]);
    }
    setErrorMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, mode, isOpen]);

  // Thay đổi phạm vi áp dụng
  const handleScopeChange = (newScope: DiscountScopeType) => {
    setScopeType(newScope);
    if (newScope === 'SKU') {
      const prod = products[0];
      setTargetId(prod ? prod.sku : '');
      setTargetName(prod ? prod.name : '');
    } else {
      const cat = categories[0];
      setTargetId(cat ? cat.id : '');
      setTargetName(cat ? cat.name : '');
    }
  };

  const handleProductSelect = (sku: string) => {
    const prod = products.find((p) => p.sku === sku);
    if (prod) {
      setTargetId(prod.sku);
      setTargetName(prod.name);
    }
  };

  const handleCategorySelect = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    setTargetId(catId);
    setTargetName(cat ? cat.name : '');
  };

  // Thêm một bậc chiết khấu mới
  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    let newMin = 100;
    if (lastTier) {
      newMin = (lastTier.maxQuantity || lastTier.minQuantity) + 1;
    }
    setTiers([
      ...tiers,
      {
        minQuantity: newMin,
        maxQuantity: null,
        isUnlimited: true,
        discountType: lastTier?.discountType || 'PERCENT',
        discountValue: (lastTier?.discountValue || 5) + 2,
        note: `Bậc ${tiers.length + 1}`
      }
    ]);
  };

  // Xóa một bậc
  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      setErrorMsg('Chính sách phải có ít nhất một bậc chiết khấu sản lượng!');
      return;
    }
    setTiers(tiers.filter((_, i) => i !== index));
  };

  // Cập nhật trường của một bậc
  const handleTierChange = <K extends keyof TierDraft>(
    index: number,
    field: K,
    value: TierDraft[K]
  ) => {
    // Backend chỉ hỗ trợ một kiểu giảm cho cả chính sách → đổi kiểu ở một bậc sẽ áp dụng cho mọi bậc
    if (field === 'discountType') {
      setTiers(tiers.map((t) => ({ ...t, discountType: value as DiscountCalculationType })));
      return;
    }
    const updated = tiers.map((t) => ({ ...t }));
    updated[index][field] = value;
    if (field === 'isUnlimited' && value === true) {
      updated[index].maxQuantity = null;
    }
    setTiers(updated);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate thông tin chung
    if (!code.trim()) {
      setErrorMsg('Vui lòng nhập Mã chính sách chiết khấu!');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập Tên chính sách chiết khấu!');
      return;
    }
    if (!targetId) {
      setErrorMsg(
        scopeType === 'SKU'
          ? 'Vui lòng chọn sản phẩm (SKU) áp dụng! Danh sách sản phẩm đang trống.'
          : 'Vui lòng chọn nhóm hàng áp dụng! Danh sách nhóm hàng đang trống.'
      );
      return;
    }
    if (!startDate) {
      setErrorMsg('Vui lòng chọn Ngày bắt đầu hiệu lực!');
      return;
    }
    if (hasEndDate && endDate && endDate < startDate) {
      setErrorMsg('Ngày kết thúc hiệu lực không được sớm hơn ngày bắt đầu!');
      return;
    }

    // Validate danh sách bậc
    if (tiers.length === 0) {
      setErrorMsg('Vui lòng tạo ít nhất một bậc chiết khấu!');
      return;
    }
    if (new Set(tiers.map((t) => t.discountType)).size > 1) {
      setErrorMsg('Tất cả các bậc phải cùng kiểu giảm (% hoặc số tiền/đơn vị)');
      return;
    }

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.minQuantity <= 0) {
        setErrorMsg(`Bậc ${i + 1}: Số lượng tối thiểu phải lớn hơn 0!`);
        return;
      }
      if (!t.isUnlimited && t.maxQuantity !== null && t.maxQuantity <= t.minQuantity) {
        setErrorMsg(`Bậc ${i + 1}: Số lượng tối đa phải lớn hơn số lượng tối thiểu!`);
        return;
      }
      if (t.discountValue < 0) {
        setErrorMsg(`Bậc ${i + 1}: Mức chiết khấu không được âm!`);
        return;
      }
      if (t.discountType === 'PERCENT' && t.discountValue > 99) {
        setErrorMsg(`Bậc ${i + 1}: Chiết khấu phần trăm chỉ được từ 0% đến 99%!`);
        return;
      }
    }

    // Chuẩn hóa payload
    const payload: VolumeDiscountPolicyRequest = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      scopeType,
      targetId,
      targetName,
      customerGroup,
      startDate,
      endDate: hasEndDate && endDate ? endDate : null,
      status,
      priority,
      description: description.trim(),
      tiers: tiers.map((t, idx) => ({
        tierOrder: idx + 1,
        minQuantity: t.minQuantity,
        maxQuantity: t.isUnlimited ? null : t.maxQuantity,
        discountType: t.discountType,
        discountValue: t.discountValue,
        note: t.note.trim() || undefined
      }))
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Đã có lỗi xảy ra khi lưu chính sách!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative my-8 w-full max-w-4xl rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal - Cam Trắng */}
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 px-5 sm:px-6 py-4 text-white">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs shadow-inner">
              <Icons.Percent size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {mode === 'create'
                  ? 'Khai Báo Chính Sách Chiết Khấu Theo Sản Lượng'
                  : 'Cập Nhật Chính Sách Chiết Khấu'}
              </h3>
              <p className="text-xs text-orange-100">
                Khai báo chính sách chiết khấu theo số lượng cho từng đối tượng khách hàng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <span className="text-xl font-bold leading-none">&times;</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
            <Icons.ShieldAlert size={16} className="shrink-0 text-red-500" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Nhóm 1: Thông tin cơ bản */}
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                1. Thông tin định danh & Phạm vi áp dụng
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Mã chính sách */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Mã chính sách <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CK-BIA-HN-Q4"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900 shadow-2xs focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
                  />
                </div>

                {/* Tên chính sách */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Tên chính sách <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chiết khấu sản lượng Bia Hà Nội Quý 4"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-900 shadow-2xs focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                {/* Phạm vi áp dụng: SKU hay CATEGORY */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Phạm vi áp dụng <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleScopeChange('SKU')}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${scopeType === 'SKU'
                          ? 'border-[#F85606] bg-orange-50 text-[#F85606] shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      Theo SKU
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScopeChange('CATEGORY')}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${scopeType === 'CATEGORY'
                          ? 'border-[#F85606] bg-orange-50 text-[#F85606] shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      Theo Nhóm hàng
                    </button>
                  </div>
                </div>

                {/* Chọn đối tượng theo Scope */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    {scopeType === 'SKU' ? 'Chọn sản phẩm (SKU)' : 'Chọn nhóm hàng'} <span className="text-red-500">*</span>
                  </label>
                  {scopeType === 'SKU' ? (
                    <select
                      value={targetId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-900 shadow-2xs focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                    >
                      {isLoadingOptions && products.length === 0 && (
                        <option value="">Đang tải danh sách sản phẩm...</option>
                      )}
                      {!isLoadingOptions && products.length === 0 && (
                        <option value="">-- Chưa có sản phẩm đang kinh doanh --</option>
                      )}
                      {targetId && !products.some((p) => p.sku === targetId) && (
                        <option value={targetId}>
                          [{targetId}] {targetName}
                        </option>
                      )}
                      {products.map((prod) => (
                        <option key={prod.sku} value={prod.sku}>
                          [{prod.sku}] {prod.name}
                          {prod.defaultCategory ? ` (${prod.defaultCategory})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={targetId}
                      onChange={(e) => handleCategorySelect(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-900 shadow-2xs focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                    >
                      {isLoadingOptions && categories.length === 0 && (
                        <option value="">Đang tải danh sách nhóm hàng...</option>
                      )}
                      {!isLoadingOptions && categories.length === 0 && (
                        <option value="">-- Chưa có nhóm hàng --</option>
                      )}
                      {targetId && !categories.some((c) => c.id === targetId) && (
                        <option value={targetId}>Nhóm: {targetName || targetId}</option>
                      )}
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.level > 1 ? `${'— '.repeat(cat.level - 1)}` : ''}Nhóm: {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Đối tượng đại lý */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Đối tượng đại lý / khách hàng
                  </label>
                  <select
                    value={customerGroup}
                    onChange={(e) => setCustomerGroup(e.target.value as DiscountCustomerScope)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-900 shadow-2xs focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                  >
                    <option value="ALL">Tất cả nhóm đại lý</option>
                    <option value="DEALER_LEVEL_1">Đại lý cấp 1 (Tổng thầu / NPP lớn)</option>
                    <option value="DEALER_LEVEL_2">Đại lý cấp 2 (Bán buôn khu vực)</option>
                    <option value="RETAIL">Khách lẻ / Showroom</option>
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {customerGroup === 'ALL'
                      ? 'Áp dụng cho mọi nhóm đại lý'
                      : `Chỉ áp dụng riêng cho ${
                          customerGroup === 'DEALER_LEVEL_1'
                            ? 'Đại lý Cấp 1'
                            : customerGroup === 'DEALER_LEVEL_2'
                            ? 'Đại lý Cấp 2'
                            : 'Khách lẻ / Showroom'
                        }`}
                  </p>
                </div>

                {/* Ngày bắt đầu */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Ngày bắt đầu hiệu lực <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 shadow-2xs focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                  />
                </div>

                {/* Ngày kết thúc */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">
                      Ngày kết thúc
                    </label>
                    <label className="flex items-center space-x-1.5 text-[11px] text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hasEndDate}
                        onChange={(e) => {
                          setHasEndDate(!e.target.checked);
                          if (e.target.checked) setEndDate('');
                        }}
                        className="rounded text-[#F85606] focus:ring-orange-500"
                      />
                      <span>Vô thời hạn</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={!hasEndDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 shadow-2xs disabled:bg-gray-100 disabled:text-gray-400 focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm 2: Cấu hình Bậc chiết khấu sản lượng */}
            <div className="border-t border-gray-200 pt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    2. Cấu hình Bậc chiết khấu theo sản lượng (Tiered Tiers)
                  </h4>
                  <p className="text-xs text-gray-500">
                    Chiết khấu tính theo phần trăm (%) hoặc theo số tiền trên đơn vị (VND/đơn vị) — mọi bậc dùng chung một hình thức CK
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="flex items-center space-x-1.5 rounded-xl bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-bold text-[#F85606] transition-colors hover:bg-orange-100 cursor-pointer"
                >
                  <Icons.Receipt size={14} className="hidden" />
                  <span>+ Thêm bậc số lượng</span>
                </button>
              </div>

              {/* Danh sách các bậc */}
              <div className="space-y-3">
                {tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl border border-orange-200/80 bg-orange-50/30 p-4 transition-all"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
                      {/* Bậc số */}
                      <div className="sm:col-span-2">
                        <span className="inline-flex items-center rounded-lg bg-[#F85606] px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                          Bậc {idx + 1}
                        </span>
                      </div>

                      {/* Số lượng từ */}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                          Từ số lượng (≥)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={tier.minQuantity}
                          onChange={(e) =>
                            handleTierChange(idx, 'minQuantity', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none font-mono"
                        />
                      </div>

                      {/* Số lượng đến */}
                      <div className="sm:col-span-2">
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-gray-700">
                            Đến số lượng (≤)
                          </label>
                        </div>
                        {tier.isUnlimited ? (
                          <div className="flex h-[30px] items-center justify-between rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700">
                            <span>Không giới hạn</span>
                            <button
                              type="button"
                              onClick={() => handleTierChange(idx, 'isUnlimited', false)}
                              className="text-[10px] text-gray-500 underline cursor-pointer"
                            >
                              Đặt hạn
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="number"
                              min={tier.minQuantity}
                              step="1"
                              value={tier.maxQuantity ?? ''}
                              onChange={(e) =>
                                handleTierChange(
                                  idx,
                                  'maxQuantity',
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 pr-8 text-xs font-bold text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleTierChange(idx, 'isUnlimited', true)}
                              title="Chuyển thành không giới hạn trên"
                              className="absolute right-1 top-1 rounded px-1 text-[10px] text-gray-400 hover:text-[#F85606] cursor-pointer"
                            >
                              &infin;
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Loại chiết khấu */}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                          Hình thức CK
                        </label>
                        <select
                          value={tier.discountType}
                          onChange={(e) =>
                            handleTierChange(idx, 'discountType', e.target.value as DiscountCalculationType)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none cursor-pointer"
                        >
                          <option value="PERCENT">Phần trăm (%)</option>
                          <option value="FIXED_AMOUNT">Số tiền (đ/đv)</option>
                        </select>
                      </div>

                      {/* Giá trị chiết khấu */}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                          Mức giảm ({tier.discountType === 'PERCENT' ? '%' : 'VND/đv'})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            max={tier.discountType === 'PERCENT' ? 99 : undefined}
                            required
                            value={tier.discountValue}
                            onChange={(e) =>
                              handleTierChange(idx, 'discountValue', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 pr-8 text-xs font-bold text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none font-mono"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1.5 text-xs font-bold text-gray-400">
                            {tier.discountType === 'PERCENT' ? '%' : 'đ'}
                          </span>
                        </div>
                      </div>

                      {/* Nút xóa bậc */}
                      <div className="flex justify-end sm:col-span-2">
                        <button
                          type="button"
                          disabled={tiers.length <= 1}
                          onClick={() => handleRemoveTier(idx)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                          title="Xóa bậc này"
                        >
                          <Icons.ShieldAlert size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* Nhóm 4: Ghi chú mô tả thêm */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Ghi chú / Thỏa thuận kinh doanh bổ sung
              </label>
              <textarea
                rows={2}
                placeholder="VD: Áp dụng hỗ trợ NPP dịp cao điểm, không cộng dồn với quà tặng hiện vật..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-900 shadow-2xs focus:border-[#F85606] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="mt-6 flex items-center justify-end space-x-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icons.CheckSquare size={16} />
              <span>{isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo chính sách' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
