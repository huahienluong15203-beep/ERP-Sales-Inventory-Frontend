import React, { useState } from 'react';
import type { PriceList, PriceListRequest, PriceListItemRequest, CustomerGroupType } from '../../types/pricing';
import { CUSTOMER_GROUPS, CATALOG_PRODUCTS } from '../../types/pricing';
import { createPriceList, updatePriceList } from '../../services/pricingApi';
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
    return [
      {
        productSku: 'BIA-HN-330',
        productName: 'Bia Hà Nội Lon 330ml (Thùng 24 lon)',
        price: '210000',
        floorPrice: '200000'
      },
      {
        productSku: 'BIA-SG-330',
        productName: 'Bia Sài Gòn Special Lon 330ml',
        price: '260000',
        floorPrice: '245000'
      },
      {
        productSku: 'COCA-320',
        productName: 'Nước ngọt Coca-Cola Lon 320ml',
        price: '165000',
        floorPrice: '155000'
      }
    ];
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

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

  const handleAddCatalogProduct = (catalogSku: string) => {
    if (!catalogSku) return;
    const prod = CATALOG_PRODUCTS.find((p) => p.sku === catalogSku);
    if (!prod) return;

    // Kiểm tra SKU đã có chưa
    const existing = items.find((i) => i.productSku.toUpperCase() === prod.sku.toUpperCase());
    if (existing) {
      alert(`Sản phẩm '${prod.sku}' đã có trong danh sách bảng giá!`);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productSku: prod.sku,
        productName: prod.name,
        price: prod.suggestedRetailPrice.toString(),
        floorPrice: Math.round(prod.suggestedRetailPrice * 0.9).toString()
      }
    ]);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[94vh] my-auto flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Icons.Tags size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEdit ? 'Chỉnh sửa Bảng giá' : 'Khai báo Bảng giá mới (S2-10)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thiết lập theo nhóm khách hàng, thời hạn hiệu lực và giá sàn phê duyệt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Icons.ShieldAlert size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Phần 1: Thông tin cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Mã bảng giá */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mã bảng giá *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: BG-DL1-2026"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* Nhóm khách hàng */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nhóm khách hàng áp dụng *
              </label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên bảng giá *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Bảng giá Đại lý Cấp 1 Toàn Quốc"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* Ngày bắt đầu */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày bắt đầu hiệu lực *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* Ngày kết thúc */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày kết thúc (Tùy chọn)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Ghi chú */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú điều kiện
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú chiết khấu, phạm vi..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phần 2: Danh sách dòng giá */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Icons.Package size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Danh sách sản phẩm định giá ({items.length} mặt hàng)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Quy tắc S2-10: Mức giá sàn là ngưỡng tối thiểu. Nhân viên bán dưới giá sàn sẽ phải qua Quản lý kinh doanh duyệt ngoại lệ.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Chọn nhanh từ catalog FMCG */}
                <select
                  onChange={(e) => {
                    handleAddCatalogProduct(e.target.value);
                    e.target.value = '';
                  }}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">+ Chọn từ Danh mục FMCG mẫu...</option>
                  {CATALOG_PRODUCTS.map((prod) => (
                    <option key={prod.sku} value={prod.sku}>
                      {prod.sku} - {prod.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                >
                  <Icons.Plus size={14} />
                  <span>Thêm dòng trống</span>
                </button>
              </div>
            </div>

            {/* Bảng nhập liệu dòng giá */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 w-40">Mã SKU *</th>
                    <th className="py-2.5 px-3">Tên sản phẩm</th>
                    <th className="py-2.5 px-3 w-36 text-right">Giá niêm yết (đ) *</th>
                    <th className="py-2.5 px-3 w-36 text-right">Mức giá sàn (đ) *</th>
                    <th className="py-2.5 px-3 w-28 text-center">Chênh lệch</th>
                    <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Chưa có sản phẩm nào. Hãy bấm "Chọn từ Danh mục FMCG mẫu" hoặc "Thêm dòng trống".
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
                          className={hasFloorError ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            <span>{idx + 1}</span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.productSku}
                              onChange={(e) => handleUpdateItem(idx, 'productSku', e.target.value)}
                              placeholder="SKU-001"
                              className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono uppercase font-bold"
                              required
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                              placeholder="Tên sản phẩm..."
                              className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                              placeholder="250000"
                              className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-right font-semibold text-emerald-600 dark:text-emerald-400"
                              required
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.floorPrice}
                              onChange={(e) => handleUpdateItem(idx, 'floorPrice', e.target.value)}
                              placeholder="220000"
                              className={`w-full px-2 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs text-right font-semibold ${
                                hasFloorError
                                  ? 'border-rose-500 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500'
                                  : 'border-slate-300 dark:border-slate-700 text-amber-600 dark:text-amber-400'
                              }`}
                              required
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={
                                hasFloorError
                                  ? 'inline-block text-[10px] text-rose-600 dark:text-rose-400 font-bold'
                                  : numP > 0
                                  ? 'inline-block text-[11px] text-slate-500 font-medium'
                                  : 'inline-block text-slate-400'
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
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
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
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
