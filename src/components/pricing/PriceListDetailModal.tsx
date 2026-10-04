import React, { useState } from 'react';
import type { PriceList, CustomerGroupType, PriceListItemRequest } from '../../types/pricing';
import { CUSTOMER_GROUPS, CATALOG_PRODUCTS } from '../../types/pricing';
import { addOrUpdatePriceListItem, deletePriceListItem } from '../../services/pricingApi';
import { Icons } from '../common/Icons';

interface PriceListDetailModalProps {
  priceList: PriceList | null;
  canManage: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenClone: (priceList: PriceList) => void;
}

export const PriceListDetailModal: React.FC<PriceListDetailModalProps> = ({
  priceList,
  canManage,
  onClose,
  onRefresh,
  onOpenClone
}) => {
  const [addingItem, setAddingItem] = useState<boolean>(false);
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [floorPrice, setFloorPrice] = useState<string>('');
  const [itemError, setItemError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!priceList) return null;

  const groupInfo = CUSTOMER_GROUPS[priceList.customerGroup as CustomerGroupType];
  const items = priceList.items || [];

  const handleSelectCatalogProduct = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSku = e.target.value;
    if (!selectedSku) return;
    const prod = CATALOG_PRODUCTS.find((p) => p.sku === selectedSku);
    if (prod) {
      setSku(prod.sku);
      setName(prod.name);
      setPrice(prod.suggestedRetailPrice.toString());
      setFloorPrice(Math.round(prod.suggestedRetailPrice * 0.9).toString());
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim()) {
      setItemError('Vui lòng nhập mã SKU sản phẩm');
      return;
    }
    const numPrice = parseFloat(price);
    const numFloor = parseFloat(floorPrice);

    if (isNaN(numPrice) || numPrice <= 0) {
      setItemError('Giá bán phải lớn hơn 0');
      return;
    }
    if (isNaN(numFloor) || numFloor < 0) {
      setItemError('Mức giá sàn không được âm');
      return;
    }
    if (numFloor > numPrice) {
      setItemError(`Mức giá sàn (${numFloor.toLocaleString('vi-VN')} đ) không được lớn hơn giá bán (${numPrice.toLocaleString('vi-VN')} đ)!`);
      return;
    }

    setSubmitting(true);
    setItemError(null);

    try {
      const itemReq: PriceListItemRequest = {
        productSku: sku.trim().toUpperCase(),
        productName: name.trim() || sku.trim().toUpperCase(),
        price: numPrice,
        floorPrice: numFloor
      };
      await addOrUpdatePriceListItem(priceList.id, itemReq);
      setSku('');
      setName('');
      setPrice('');
      setFloorPrice('');
      setAddingItem(false);
      onRefresh();
    } catch (err: unknown) {
      setItemError(err instanceof Error ? err.message : 'Lỗi khi lưu dòng sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dòng giá sản phẩm này khỏi bảng giá?')) {
      return;
    }
    try {
      await deletePriceListItem(priceList.id, itemId);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xóa dòng sản phẩm');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] my-auto flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {priceList.code}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                Phiên bản v{priceList.version || 1}
              </span>
              {groupInfo && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${groupInfo.badgeBg} ${groupInfo.badgeText} ${groupInfo.badgeBorder}`}
                >
                  {groupInfo.label}
                </span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  priceList.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {priceList.status === 'ACTIVE' ? 'Đang áp dụng' : 'Ngừng áp dụng'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
              {priceList.name}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4 mt-1">
              <span>
                Hiệu lực: <strong>{priceList.startDate}</strong> {priceList.endDate ? `đến ${priceList.endDate}` : '(Không thời hạn)'}
              </span>
              {priceList.note && <span>• {priceList.note}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Cảnh báo S2-10: Bảng giá đã phát sinh đơn */}
        {priceList.hasOrders && (
          <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <Icons.ShieldAlert size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Bảng giá đã phát sinh đơn hàng:</strong> Theo quy chuẩn kiểm toán S2-10, bảng giá này đã bị khóa chống sửa trực tiếp. Để áp dụng giá mới, vui lòng tạo phiên bản mới (v{(priceList.version || 1) + 1}).
              </span>
            </div>
            {canManage && (
              <button
                onClick={() => {
                  onClose();
                  onOpenClone(priceList);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Icons.Copy size={14} />
                <span>Tạo phiên bản mới</span>
              </button>
            )}
          </div>
        )}

        {/* Nội dung danh sách dòng giá */}
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icons.Tags size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Chi tiết dòng giá niêm yết & Mức giá sàn ({items.length} mặt hàng)
              </h3>
            </div>
            {canManage && !priceList.hasOrders && (
              <button
                onClick={() => setAddingItem(!addingItem)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
              >
                <Icons.Plus size={14} />
                <span>{addingItem ? 'Đóng form thêm' : '+ Thêm dòng giá'}</span>
              </button>
            )}
          </div>

          {/* Form thêm nhanh dòng sản phẩm (khi chưa khóa) */}
          {addingItem && !priceList.hasOrders && (
            <form onSubmit={handleAddItem} className="mb-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                  Thêm hoặc cập nhật giá sản phẩm:
                </span>
                <select
                  onChange={handleSelectCatalogProduct}
                  className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="">-- Chọn nhanh sản phẩm từ mẫu FMCG --</option>
                  {CATALOG_PRODUCTS.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    Mã SKU *
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="VD: BIA-HN-330"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg uppercase font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tên sản phẩm..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    Giá niêm yết (VNĐ) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="VD: 250000"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    Mức giá sàn (VNĐ) *
                  </label>
                  <input
                    type="number"
                    value={floorPrice}
                    onChange={(e) => setFloorPrice(e.target.value)}
                    placeholder="Dưới mức này phải duyệt"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
              </div>

              {itemError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 mb-2 font-medium flex items-center gap-1">
                  <Icons.ShieldAlert size={14} />
                  <span>{itemError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingItem(false)}
                  className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu dòng sản phẩm'}
                </button>
              </div>
            </form>
          )}

          {/* Bảng các dòng giá */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Mã SKU</th>
                  <th className="py-2.5 px-3">Tên sản phẩm</th>
                  <th className="py-2.5 px-3 text-right">Giá niêm yết</th>
                  <th className="py-2.5 px-3 text-right">Mức giá sàn</th>
                  <th className="py-2.5 px-3 text-center">Biên độ sàn</th>
                  {canManage && !priceList.hasOrders && (
                    <th className="py-2.5 px-3 text-center w-16">Xóa</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Chưa có mặt hàng nào trong bảng giá này.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const margin = item.price - item.floorPrice;
                    const marginPercent = item.price > 0 ? Math.round((margin / item.price) * 100) : 0;
                    return (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.productSku}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {item.productName || item.productSku}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.price.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {item.floorPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            title={`Chênh lệch: ${margin.toLocaleString('vi-VN')} đ`}
                            className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                          >
                            {marginPercent}% ({margin.toLocaleString('vi-VN')} đ)
                          </span>
                        </td>
                        {canManage && !priceList.hasOrders && (
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => item.id && handleDeleteItem(item.id)}
                              title="Xóa dòng giá này"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                            >
                              <Icons.Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tổng cộng: <strong>{items.length}</strong> dòng sản phẩm
          </div>
          <div className="flex items-center gap-2">
            {canManage && priceList.hasOrders && (
              <button
                onClick={() => {
                  onClose();
                  onOpenClone(priceList);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Icons.Copy size={15} />
                <span>Tạo phiên bản mới (v{(priceList.version || 1) + 1})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
