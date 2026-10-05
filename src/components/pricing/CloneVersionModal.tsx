import React, { useState } from 'react';
import type { PriceList, PriceListRequest, PriceListItemRequest } from '../../types/pricing';
import { clonePriceListVersion } from '../../services/pricingApi';
import { Icons } from '../common/Icons';

interface CloneVersionModalProps {
  originalList: PriceList;
  onClose: () => void;
  onSuccess: (clonedList: PriceList) => void;
}

interface EditableCloneItem {
  productSku: string;
  productName: string;
  price: string;
  floorPrice: string;
}

export const CloneVersionModal: React.FC<CloneVersionModalProps> = ({
  originalList,
  onClose,
  onSuccess
}) => {
  const nextVer = (originalList.version || 1) + 1;
  const [newCode, setNewCode] = useState<string>(`${originalList.code}-V${nextVer}`);
  const [newName, setNewName] = useState<string>(`${originalList.name} (v${nextVer})`);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(originalList.endDate || '');
  const [note, setNote] = useState<string>(
    `Tạo phiên bản mới từ ${originalList.code} do bảng giá cũ đã phát sinh đơn hàng`
  );
  const [items, setItems] = useState<EditableCloneItem[]>(
    (originalList.items || []).map((it) => ({
      productSku: it.productSku,
      productName: it.productName || it.productSku,
      price: it.price.toString(),
      floorPrice: it.floorPrice.toString()
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleUpdateItem = (index: number, field: keyof EditableCloneItem, value: string) => {
    setItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newCode.trim()) {
      setError('Vui lòng nhập mã bảng giá mới');
      return;
    }
    if (!newName.trim()) {
      setError('Vui lòng nhập tên bảng giá mới');
      return;
    }
    if (!startDate) {
      setError('Vui lòng chọn ngày bắt đầu hiệu lực');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('Ngày kết thúc hiệu lực không được trước ngày bắt đầu');
      return;
    }

    const preparedItems: PriceListItemRequest[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const p = parseFloat(it.price);
      const f = parseFloat(it.floorPrice);
      if (isNaN(p) || p <= 0) {
        setError(`Sản phẩm ${it.productSku}: Giá bán phải lớn hơn 0`);
        return;
      }
      if (isNaN(f) || f < 0) {
        setError(`Sản phẩm ${it.productSku}: Mức giá sàn không được âm`);
        return;
      }
      if (f > p) {
        setError(
          `Sản phẩm ${it.productSku}: Giá sàn (${f.toLocaleString('vi-VN')} đ) không được lớn hơn giá bán (${p.toLocaleString('vi-VN')} đ)!`
        );
        return;
      }
      preparedItems.push({
        productSku: it.productSku,
        productName: it.productName,
        price: p,
        floorPrice: f
      });
    }

    const payload: Partial<PriceListRequest> = {
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      customerGroup: originalList.customerGroup,
      startDate,
      endDate: endDate || null,
      note: note.trim() || null,
      items: preparedItems
    };

    setSubmitting(true);
    try {
      const cloned = await clonePriceListVersion(originalList.id, payload);
      onSuccess(cloned);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo phiên bản mới');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[92vh] my-auto flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-orange-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-[#F85606]">
              <Icons.Copy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Tạo phiên bản mới từ {originalList.code}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-orange-100 text-[#F85606] font-bold">
                  v{nextVer}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Quy tắc nghiệp vụ: Bảng giá đã phát sinh đơn thì không sửa, chỉ tạo phiên bản mới
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <Icons.ShieldAlert size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Thông tin phiên bản mới */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã bảng giá phiên bản mới *
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên bảng giá phiên bản mới *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ngày bắt đầu hiệu lực bản mới *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ngày kết thúc hiệu lực
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ghi chú điều chỉnh phiên bản
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Danh sách sản phẩm sao chép và điều chỉnh giá */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-800">
                Điều chỉnh giá & giá sàn cho phiên bản mới ({items.length} mặt hàng):
              </span>
              <span className="text-[11px] text-gray-500">
                Tự động kế thừa từ {originalList.code}
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-gray-100 z-10 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Tên sản phẩm</th>
                    <th className="py-2 px-3 text-right">Giá bán mới (đ)</th>
                    <th className="py-2 px-3 text-right">Giá sàn mới (đ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it, idx) => {
                    const np = parseFloat(it.price) || 0;
                    const nf = parseFloat(it.floorPrice) || 0;
                    const hasErr = nf > np && np > 0;
                    return (
                      <tr key={`clone-item-${it.productSku || 'idx'}-${idx}`} className={hasErr ? 'bg-rose-50/60' : ''}>
                        <td className="py-2 px-3 font-mono font-bold text-gray-800">
                          {it.productSku}
                        </td>
                        <td className="py-2 px-3 text-gray-600 line-clamp-1">
                          {it.productName}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={it.price}
                            onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                            className="w-28 px-2 py-1 text-xs border border-gray-300 rounded-lg text-right font-semibold text-emerald-600"
                            required
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={it.floorPrice}
                            onChange={(e) => handleUpdateItem(idx, 'floorPrice', e.target.value)}
                            className={`w-28 px-2 py-1 text-xs border rounded-lg text-right font-semibold ${
                              hasErr
                                ? 'border-rose-500 text-rose-600'
                                : 'border-gray-300 text-amber-600'
                            }`}
                            required
                          />
                        </td>
                      </tr>
                    );
                  })}
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
                  <span>Đang khởi tạo phiên bản v{nextVer}...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Check size={16} />
                  <span>Tạo & Kích hoạt phiên bản v{nextVer}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
