import React, { useState } from 'react';
import type { OrderItem } from '../../types/order';
import { formatCurrencyVND } from '../../services/orderService';
import { Trash2, Plus, Minus, Tag, Edit, Check, X, RotateCw, AlertTriangle } from '../common/Icons';

interface OrderItemRowProps {
  item: OrderItem;
  itemIndex: number;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onUpdateUnit: (id: string, newUnitName: string) => void;
  onUpdatePrice: (id: string, newPrice: number, resetToOriginal?: boolean) => void;
  onRemoveItem: (id: string) => void;
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  item,
  itemIndex,
  onUpdateQuantity,
  onUpdateUnit,
  onUpdatePrice,
  onRemoveItem
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [priceInput, setPriceInput] = useState<string>(() => String(item.unitPrice));

  const originalPrice = item.originalUnitPrice ?? item.unitPrice;
  const floorPrice = item.floorPrice ?? 0;
  const isBelowFloor = item.isBelowFloor || (floorPrice > 0 && item.unitPrice < floorPrice);

  const handleStartEdit = () => {
    setPriceInput(String(item.unitPrice));
    setIsEditingPrice(true);
  };

  const handleSavePrice = () => {
    const parsed = parseFloat(priceInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdatePrice(item.id, parsed, false);
    }
    setIsEditingPrice(false);
  };

  const handleCancelEdit = () => {
    setPriceInput(String(item.unitPrice));
    setIsEditingPrice(false);
  };

  const handleResetPrice = () => {
    onUpdatePrice(item.id, originalPrice, true);
    setPriceInput(String(originalPrice));
    setIsEditingPrice(false);
  };

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all space-y-3 ${
        isBelowFloor
          ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-300/70 hover:border-amber-400'
          : item.isCustomPrice
          ? 'bg-blue-50/20 border-blue-200 hover:border-blue-300'
          : 'bg-white border-gray-200/80 hover:border-orange-200'
      }`}
    >
      {/* Hàng 1: Thứ tự, Tên sản phẩm, SKU, Huy hiệu duyệt & nút Xóa */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
              isBelowFloor
                ? 'bg-amber-200 text-amber-900'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {itemIndex + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                {item.name}
              </h4>
              {isBelowFloor && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <AlertTriangle size={11} className="text-amber-600" />
                  <span>Dưới giá sàn • Cần duyệt</span>
                </span>
              )}
              {item.isCustomPrice && !isBelowFloor && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                  Giá tùy chỉnh
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-gray-500">
              <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                {item.sku}
              </span>
              {item.category && <span>{item.category}</span>}
              <span>•</span>
              <span className="text-gray-400">ĐVT chuẩn: {item.baseUnit}</span>
            </div>
          </div>
        </div>

        {/* Nút xóa dòng hàng */}
        <button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
          title="Xóa sản phẩm này"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Hàng 2: Chọn ĐVT & Bộ Tăng Giảm Số Lượng (Tối ưu 360px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-gray-100">
        {/* Chọn đơn vị tính */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Đơn Vị Đặt Hàng
          </label>
          <select
            value={item.selectedUnit}
            onChange={(e) => onUpdateUnit(item.id, e.target.value)}
            className="w-full h-9 px-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#F85606] outline-none text-gray-800"
          >
            {item.availableUnits.map((u) => (
              <option key={u.unitName} value={u.unitName}>
                {u.unitName} (x{u.conversionFactor} {item.baseUnit}) — Niêm yết: {formatCurrencyVND(u.unitPrice)}
              </option>
            ))}
          </select>
        </div>

        {/* Bộ tăng giảm số lượng (+ / - to bản dễ bấm ngón tay) */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Số Lượng Đặt</span>
            <span className="text-[10px] text-gray-400 font-normal">
              (= {item.baseQuantity} {item.baseUnit})
            </span>
          </label>
          <div className="flex items-center h-9 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
              className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 transition-colors cursor-pointer"
              title="Giảm 1"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onUpdateQuantity(item.id, isNaN(val) ? 1 : Math.max(1, val));
              }}
              className="flex-1 h-full text-center text-xs font-bold text-gray-900 bg-white border-x border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#F85606]"
            />
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer"
              title="Tăng 1"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Hàng 3: Sửa Đơn Giá Thủ Công & Kiểm Tra Giá Sàn (S4-01) */}
      <div className="p-2.5 rounded-xl bg-orange-50/40 border border-orange-100/80 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Cột Trái: Đơn giá và Form sửa giá */}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">
              Đơn Giá Áp Dụng
            </span>

            {isEditingPrice ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePrice();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                    className="w-36 sm:w-44 h-8 px-2 text-xs font-bold rounded-lg border border-orange-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F85606]"
                    placeholder="Nhập đơn giá mới..."
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-gray-400 font-semibold pointer-events-none">
                    đ
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSavePrice}
                  className="h-8 px-2.5 rounded-lg bg-[#F85606] hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Xác nhận lưu giá mới"
                >
                  <Check size={14} />
                  <span>Lưu</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-8 px-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  title="Hủy"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-gray-900 font-mono">
                  {formatCurrencyVND(item.unitPrice)}
                </span>
                <span className="text-[11px] text-gray-500 font-medium">/{item.selectedUnit}</span>

                {/* Nút sửa giá */}
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 hover:border-orange-300 hover:text-[#F85606] text-gray-600 text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                  title="Nhấn để sửa đơn giá thủ công"
                >
                  <Edit size={12} />
                  <span>Sửa giá</span>
                </button>

                {/* Nút Đặt lại giá gốc niêm yết nếu đã sửa */}
                {item.isCustomPrice && (
                  <button
                    type="button"
                    onClick={handleResetPrice}
                    className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                    title="Khôi phục giá niêm yết theo bảng giá"
                  >
                    <RotateCw size={11} />
                    <span>Giá gốc ({formatCurrencyVND(originalPrice)})</span>
                  </button>
                )}
              </div>
            )}

            {/* Chi tiết giá niêm yết & giá sàn tham chiếu */}
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500">
              <span>
                Niêm yết: <strong className="text-gray-700">{formatCurrencyVND(originalPrice)}</strong>
              </span>
              {floorPrice > 0 && (
                <>
                  <span>•</span>
                  <span>
                    Giá sàn: <strong className={isBelowFloor ? 'text-amber-700 font-bold' : 'text-gray-700'}>{formatCurrencyVND(floorPrice)}</strong>
                  </span>
                </>
              )}
            </div>

            {/* Chiết khấu sản lượng */}
            {item.discountAmount > 0 && (
              <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                <Tag size={11} />
                <span>CK sản lượng: -{item.discountPercent}% (-{formatCurrencyVND(item.discountAmount)})</span>
              </div>
            )}
          </div>

          {/* Cột Phải: Thành tiền sau chiết khấu */}
          <div className="text-right shrink-0">
            <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Thành tiền</span>
            <div className="flex items-center gap-1.5 justify-end">
              {item.discountAmount > 0 && (
                <span className="text-[11px] text-gray-400 line-through">
                  {formatCurrencyVND(item.rawAmount)}
                </span>
              )}
              <strong className="text-sm sm:text-base font-extrabold text-[#F85606] font-mono">
                {formatCurrencyVND(item.finalAmount)}
              </strong>
            </div>
          </div>
        </div>

        {/* CẢNH BÁO VI PHẠM GIÁ SÀN (AC3) */}
        {isBelowFloor && (
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold animate-in fade-in">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span>
              Đơn giá thấp hơn giá sàn ({formatCurrencyVND(floorPrice)}/{item.selectedUnit}) — Đơn hàng sẽ bị đánh dấu <strong>CẦN DUYỆT</strong> bởi Quản lý!
            </span>
          </div>
        )}
      </div>

      {item.appliedDiscountNote && (
        <div className="text-[10px] text-emerald-700 italic flex items-center gap-1">
          <span>🎯 {item.appliedDiscountNote}</span>
        </div>
      )}
    </div>
  );
};
