import React from 'react';
import type { OrderItem } from '../../types/order';
import { formatCurrencyVND } from '../../services/orderService';
import { Trash2, Plus, Minus, Tag } from '../common/Icons';

interface OrderItemRowProps {
  item: OrderItem;
  itemIndex: number;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onUpdateUnit: (id: string, newUnitName: string) => void;
  onRemoveItem: (id: string) => void;
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  item,
  itemIndex,
  onUpdateQuantity,
  onUpdateUnit,
  onRemoveItem
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs hover:border-orange-200 transition-all space-y-3">
      {/* Hàng 1: Thứ tự, Tên sản phẩm, SKU và nút Xóa */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {itemIndex + 1}
          </span>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
              {item.name}
            </h4>
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
          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
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
                {u.unitName} (x{u.conversionFactor} {item.baseUnit}) — {formatCurrencyVND(u.unitPrice)}
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
              className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 transition-colors"
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
              className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
              title="Tăng 1"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Hàng 3: Đơn giá, Chiết khấu sản lượng & Thành tiền */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-orange-50/40 border border-orange-100/80 text-xs">
        <div>
          <span className="text-[11px] text-gray-500 block">
            Đơn giá: <strong className="text-gray-800">{formatCurrencyVND(item.unitPrice)}</strong>/{item.selectedUnit}
          </span>
          {item.discountAmount > 0 && (
            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <Tag size={10} />
              <span>CK -{item.discountPercent}% (-{formatCurrencyVND(item.discountAmount)})</span>
            </span>
          )}
        </div>

        <div className="text-right">
          <span className="text-[10px] text-gray-400 block">Thành tiền</span>
          <div className="flex items-center gap-1.5 justify-end">
            {item.discountAmount > 0 && (
              <span className="text-[11px] text-gray-400 line-through">
                {formatCurrencyVND(item.rawAmount)}
              </span>
            )}
            <strong className="text-sm font-extrabold text-[#F85606] font-mono">
              {formatCurrencyVND(item.finalAmount)}
            </strong>
          </div>
        </div>
      </div>

      {item.appliedDiscountNote && (
        <div className="text-[10px] text-emerald-700 italic flex items-center gap-1">
          <span>🎯 {item.appliedDiscountNote}</span>
        </div>
      )}
    </div>
  );
};
