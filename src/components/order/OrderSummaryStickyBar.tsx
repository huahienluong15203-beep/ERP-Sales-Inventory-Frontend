import React, { useState } from 'react';
import { formatCurrencyVND } from '../../services/orderService';
import { ShoppingCart, Save, CheckCircle2, ChevronUp, ChevronDown, Tag } from '../common/Icons';

interface OrderSummaryStickyBarProps {
  totalItemsCount: number;
  totalQuantity: number;
  subtotalAmount: number;
  discountAmount: number;
  totalPayable: number;
  isSavingDraft: boolean;
  isSubmittingOrder: boolean;
  onSaveDraft: () => void;
  onSubmitOrder: () => void;
  disabledSubmit?: boolean;
  disabledReason?: string;
}

export const OrderSummaryStickyBar: React.FC<OrderSummaryStickyBarProps> = ({
  totalItemsCount,
  totalQuantity,
  subtotalAmount,
  discountAmount,
  totalPayable,
  isSavingDraft,
  isSubmittingOrder,
  onSaveDraft,
  onSubmitOrder,
  disabledSubmit,
  disabledReason
}) => {
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      {/* Chi tiết sổ ra trên mobile nếu người dùng bấm xem */}
      {showDetailOnMobile && (
        <div className="p-3.5 bg-gray-50 border-b border-gray-200 text-xs space-y-2 max-w-7xl mx-auto animate-in slide-in-from-bottom duration-150">
          <div className="flex justify-between text-gray-600">
            <span>Số loại sản phẩm:</span>
            <strong>{totalItemsCount} mặt hàng</strong>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tổng số lượng đặt:</span>
            <strong>{totalQuantity} kiện / đơn vị</strong>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tổng tiền hàng (chưa giảm):</span>
            <span className="font-mono">{formatCurrencyVND(subtotalAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span className="flex items-center gap-1">
                <Tag size={12} />
                <span>Chiết khấu sản lượng (Best-Deal):</span>
              </span>
              <span className="font-mono font-bold">-{formatCurrencyVND(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>Tổng số tiền phải thu:</span>
            <span className="font-mono text-[#F85606]">{formatCurrencyVND(totalPayable)}</span>
          </div>
        </div>
      )}

      {/* Thanh Action Bar chính - Tối ưu màn hình 360px */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Phần thông tin giá bên trái */}
        <div
          onClick={() => setShowDetailOnMobile(!showDetailOnMobile)}
          className="cursor-pointer select-none min-w-0 flex-1"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span>
              {totalItemsCount} món ({totalQuantity} kiện)
            </span>
            <span className="text-gray-400 sm:hidden">
              {showDetailOnMobile ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </span>
            {discountAmount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                <Tag size={10} /> -{formatCurrencyVND(discountAmount)}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-gray-600 font-medium hidden sm:inline">
              Tổng phải thu:
            </span>
            <strong className="text-base sm:text-xl font-black text-[#F85606] font-mono tracking-tight truncate">
              {formatCurrencyVND(totalPayable)}
            </strong>
          </div>
        </div>

        {/* Các nút bấm bên phải (To bản, tiện bấm 1 tay trên mobile 360px) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Nút Lưu nháp */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className="h-10 px-3 sm:px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Lưu nháp để mở lại tiếp tục gõ"
          >
            <Save size={15} className="text-gray-600" />
            <span className="hidden xs:inline">Lưu Nháp</span>
          </button>

          {/* Nút Chốt đơn hàng */}
          <div className="relative group">
            <button
              type="button"
              onClick={onSubmitOrder}
              disabled={disabledSubmit || isSubmittingOrder}
              className={`h-10 px-3.5 sm:px-5 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 transition-all shadow-md ${
                disabledSubmit
                  ? 'bg-gray-400 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-[#FF6A00] to-[#EE4D2D] hover:opacity-95 shadow-orange-500/25 active:scale-98'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>Chốt Đơn</span>
            </button>

            {disabledSubmit && disabledReason && (
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[11px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg z-50">
                {disabledReason}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
