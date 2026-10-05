import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import type {
  VolumeDiscountPolicy,
  VolumeDiscountPolicyRequest,
  DiscountScopeType,
  DiscountCustomerScope,
  DiscountCalculationType
} from '../../types/discount';
import { CATALOG_PRODUCTS, CUSTOMER_GROUPS } from '../../types/pricing';
import { AVAILABLE_CATEGORIES, BEST_DEAL_RULE_STATEMENT } from '../../services/volumeDiscountApi';

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
    } else if (mode === 'create') {
      // Giá trị mặc định
      const autoCode = `CK-SKU-${Math.floor(100 + Math.random() * 900)}`;
      setCode(autoCode);
      setName('');
      setScopeType('SKU');
      const firstProd = CATALOG_PRODUCTS[0];
      setTargetId(firstProd.sku);
      setTargetName(firstProd.name);
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
          note: 'Bậc khởi điểm'
        },
        {
          minQuantity: 50,
          maxQuantity: 99,
          isUnlimited: false,
          discountType: 'PERCENT',
          discountValue: 5,
          note: 'Bậc vừa'
        },
        {
          minQuantity: 100,
          maxQuantity: null,
          isUnlimited: true,
          discountType: 'PERCENT',
          discountValue: 8,
          note: 'Bậc lớn'
        }
      ]);
    }
    setErrorMsg(null);
  }, [initialData, mode, isOpen]);

  // Thay đổi kiểu phạm vi
  const handleScopeChange = (type: DiscountScopeType) => {
    setScopeType(type);
    if (type === 'SKU') {
      const firstProd = CATALOG_PRODUCTS[0];
      setTargetId(firstProd.sku);
      setTargetName(firstProd.name);
    } else {
      const firstCat = AVAILABLE_CATEGORIES[0];
      setTargetId(firstCat);
      setTargetName(`Toàn bộ nhóm ${firstCat}`);
    }
  };

  // Chọn SKU
  const handleProductSelect = (sku: string) => {
    const prod = CATALOG_PRODUCTS.find((p) => p.sku === sku);
    if (prod) {
      setTargetId(prod.sku);
      setTargetName(prod.name);
    }
  };

  // Chọn Nhóm hàng
  const handleCategorySelect = (category: string) => {
    setTargetId(category);
    setTargetName(`Toàn bộ nhóm ${category}`);
  };

  // Thao tác với Bậc chiết khấu (Tiers)
  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMin = lastTier ? (lastTier.maxQuantity ? lastTier.maxQuantity + 1 : lastTier.minQuantity + 50) : 10;
    
    // Nếu bậc cũ đang để unlimited thì đóng lại
    if (lastTier && lastTier.isUnlimited) {
      lastTier.isUnlimited = false;
      lastTier.maxQuantity = newMin - 1;
    }

    setTiers([
      ...tiers,
      {
        minQuantity: newMin,
        maxQuantity: null,
        isUnlimited: true,
        discountType: 'PERCENT',
        discountValue: lastTier ? Math.min(100, lastTier.discountValue + 2) : 5,
        note: `Bậc ${tiers.length + 1}`
      }
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      setErrorMsg('Chính sách phải có ít nhất 1 bậc chiết khấu!');
      return;
    }
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleTierChange = <K extends keyof TierDraft>(index: number, field: K, val: TierDraft[K]) => {
    const updated = [...tiers];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    setTiers(updated);
  };

  // Kiểm tra tính hợp lệ của các bậc
  const validateTiers = (): string | null => {
    if (tiers.length === 0) return 'Vui lòng cấu hình ít nhất 1 bậc chiết khấu!';

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.minQuantity <= 0) {
        return `Bậc ${i + 1}: Số lượng tối thiểu phải lớn hơn 0!`;
      }
      if (!t.isUnlimited && t.maxQuantity !== null && t.maxQuantity <= t.minQuantity) {
        return `Bậc ${i + 1}: Số lượng tối đa (${t.maxQuantity}) phải lớn hơn số lượng tối thiểu (${t.minQuantity})!`;
      }
      if (t.discountValue <= 0) {
        return `Bậc ${i + 1}: Mức chiết khấu phải lớn hơn 0!`;
      }
      if (t.discountType === 'PERCENT' && t.discountValue > 100) {
        return `Bậc ${i + 1}: Chiết khấu phần trăm không được vượt quá 100%!`;
      }

      // Kiểm tra gối đầu logic
      if (i > 0) {
        const prev = tiers[i - 1];
        if (prev.maxQuantity !== null && t.minQuantity <= prev.maxQuantity) {
          return `Bậc ${i + 1} (Từ ${t.minQuantity}) bị chồng lấn với Bậc ${i} (Đến ${prev.maxQuantity})!`;
        }
      }
    }
    return null;
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!code.trim()) {
      setErrorMsg('Vui lòng nhập mã chính sách!');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên chính sách!');
      return;
    }
    if (!startDate) {
      setErrorMsg('Vui lòng chọn ngày bắt đầu hiệu lực!');
      return;
    }
    if (hasEndDate && endDate && endDate < startDate) {
      setErrorMsg('Ngày kết thúc không được sớm hơn ngày bắt đầu!');
      return;
    }

    const tierError = validateTiers();
    if (tierError) {
      setErrorMsg(tierError);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: VolumeDiscountPolicyRequest = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        scopeType,
        targetId,
        targetName,
        customerGroup,
        startDate,
        endDate: hasEndDate && endDate ? endDate : undefined,
        status,
        priority,
        description: description.trim(),
        tiers: tiers.map((t, idx) => ({
          tierOrder: idx + 1,
          minQuantity: t.minQuantity,
          maxQuantity: t.isUnlimited ? null : t.maxQuantity,
          discountType: t.discountType,
          discountValue: t.discountValue,
          note: t.note.trim()
        }))
      };

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      console.error('Lỗi khi lưu chính sách:', err);
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Lỗi lưu chính sách chiết khấu!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative my-8 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icons.Percent size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {mode === 'create'
                  ? 'Khai báo Chính sách Chiết khấu theo Sản lượng'
                  : 'Cập nhật Chính sách Chiết khấu'}
              </h3>
              <p className="text-xs text-slate-500">
                Ticket S3-01 / SCRUM-12 (Tự động áp dụng chính sách có lợi nhất cho khách hàng)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Icons.RotateCcw size={18} className="hidden" />
            <span className="text-xl font-bold leading-none">&times;</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <Icons.ShieldAlert size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Nhóm 1: Thông tin cơ bản */}
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Thông tin định danh & Phạm vi áp dụng
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Mã chính sách */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mã chính sách <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CK-BIA-HN-Q4"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-wider text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Tên chính sách */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tên chính sách <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chiết khấu sản lượng Bia Hà Nội Quý 4"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Phạm vi áp dụng: SKU hay CATEGORY */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phạm vi áp dụng <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleScopeChange('SKU')}
                      className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                        scopeType === 'SKU'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Theo SKU
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScopeChange('CATEGORY')}
                      className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                        scopeType === 'CATEGORY'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Theo Nhóm hàng
                    </button>
                  </div>
                </div>

                {/* Chọn đối tượng theo Scope */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {scopeType === 'SKU' ? 'Chọn sản phẩm (SKU)' : 'Chọn nhóm hàng'} <span className="text-red-500">*</span>
                  </label>
                  {scopeType === 'SKU' ? (
                    <select
                      value={targetId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {CATALOG_PRODUCTS.map((prod) => (
                        <option key={prod.sku} value={prod.sku}>
                          [{prod.sku}] {prod.name} ({prod.defaultCategory})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={targetId}
                      onChange={(e) => handleCategorySelect(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {AVAILABLE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          Nhóm: {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Đối tượng đại lý */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Đối tượng đại lý / khách hàng
                  </label>
                  <select
                    value={customerGroup}
                    onChange={(e) => setCustomerGroup(e.target.value as DiscountCustomerScope)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ALL">Tất cả khách hàng & Đại lý</option>
                    {Object.entries(CUSTOMER_GROUPS).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ngày bắt đầu */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Ngày bắt đầu hiệu lực <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Ngày kết thúc */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Ngày kết thúc
                    </label>
                    <label className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={!hasEndDate}
                        onChange={(e) => {
                          setHasEndDate(!e.target.checked);
                          if (e.target.checked) setEndDate('');
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Vô thời hạn</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={!hasEndDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs disabled:bg-slate-100 disabled:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm 2: Cấu hình Bậc chiết khấu sản lượng */}
            <div className="border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Cấu hình Bậc chiết khấu theo sản lượng (Tiered Tiers)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Chiết khấu tính theo phần trăm (%) hoặc theo số tiền trên đơn vị (VND/đơn vị)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="flex items-center space-x-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
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
                    className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
                      {/* Bậc số */}
                      <div className="sm:col-span-2">
                        <span className="inline-flex items-center rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                          Bậc {idx + 1}
                        </span>
                      </div>

                      {/* Số lượng từ */}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
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
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-2xs"
                        />
                      </div>

                      {/* Số lượng đến */}
                      <div className="sm:col-span-2">
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-600">
                            Đến số lượng (≤)
                          </label>
                        </div>
                        {tier.isUnlimited ? (
                          <div className="flex h-[30px] items-center justify-between rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-2 text-xs font-semibold text-emerald-700">
                            <span>Không giới hạn</span>
                            <button
                              type="button"
                              onClick={() => handleTierChange(idx, 'isUnlimited', false)}
                              className="text-[10px] text-slate-500 underline"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 pr-8 text-xs font-bold text-slate-900 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleTierChange(idx, 'isUnlimited', true)}
                              title="Chuyển thành không giới hạn trên"
                              className="absolute right-1 top-1 rounded px-1 text-[10px] text-slate-400 hover:text-indigo-600"
                            >
                              &infin;
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Loại chiết khấu */}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Hình thức CK
                        </label>
                        <select
                          value={tier.discountType}
                          onChange={(e) =>
                            handleTierChange(idx, 'discountType', e.target.value as DiscountCalculationType)
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-2xs"
                        >
                          <option value="PERCENT">Phần trăm (%)</option>
                          <option value="FIXED_AMOUNT">Số tiền (đ/đv)</option>
                        </select>
                      </div>

                      {/* Giá trị chiết khấu */}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Mức giảm ({tier.discountType === 'PERCENT' ? '%' : 'VND/đv'})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step={tier.discountType === 'PERCENT' ? '0.5' : '1000'}
                            max={tier.discountType === 'PERCENT' ? 100 : undefined}
                            required
                            value={tier.discountValue}
                            onChange={(e) =>
                              handleTierChange(idx, 'discountValue', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 pr-8 text-xs font-bold text-slate-900 shadow-2xs"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">
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
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
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

            {/* Nhóm 3: Banner cam kết quy tắc Best-Deal */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-indigo-900">
              <div className="flex items-start space-x-2">
                <Icons.CheckSquare size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                <p>
                  <strong className="font-semibold">Quy tắc có lợi nhất cho khách (Best-deal rule): </strong>
                  {BEST_DEAL_RULE_STATEMENT}
                </p>
              </div>
            </div>

            {/* Nhóm 4: Ghi chú mô tả thêm */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ghi chú / Thỏa thuận kinh doanh bổ sung
              </label>
              <textarea
                rows={2}
                placeholder="VD: Áp dụng hỗ trợ NPP dịp cao điểm, không cộng dồn với quà tặng hiện vật..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="mt-6 flex items-center justify-end space-x-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:opacity-50"
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
