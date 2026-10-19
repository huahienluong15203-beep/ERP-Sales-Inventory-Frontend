import React from 'react';
import { CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import type { PickingList } from '../../types/pickingList';

interface PickingCompleteConfirmModalProps {
  isOpen: boolean;
  pickingList: PickingList;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const PickingCompleteConfirmModal: React.FC<PickingCompleteConfirmModalProps> = ({
  isOpen,
  pickingList,
  onConfirm,
  onClose,
  isSubmitting = false
}) => {
  if (!isOpen) return null;

  const totalItems = pickingList.items.length;
  const completedItems = pickingList.items.filter((i) => i.isCompleted).length;
  const uncompletedItems = pickingList.items.filter((i) => !i.isCompleted);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
        {/* Top Header Banner */}
        <div className="p-6 text-center space-y-3 bg-gradient-to-b from-orange-50/70 to-white">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-gray-900">
              Xác nhận chốt hoàn thành đợt soạn hàng
            </h3>
            <p className="text-xs font-mono font-bold text-[#F85606]">{pickingList.code}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 pb-4 space-y-3 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
            <div className="flex justify-between items-center text-gray-600">
              <span>Kho xuất phát:</span>
              <strong className="text-gray-900">{pickingList.warehouseName}</strong>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <span>Tiến độ gom hàng:</span>
              <strong className="text-emerald-700 font-bold">
                {completedItems} / {totalItems} mặt hàng (
                {Math.round((completedItems / Math.max(1, totalItems)) * 100)}%)
              </strong>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <span>Đơn hàng liên quan:</span>
              <strong className="text-gray-900">{pickingList.orderCount} đơn hàng</strong>
            </div>
          </div>

          {uncompletedItems.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                Có <strong>{uncompletedItems.length} mặt hàng</strong> chưa tích hoàn thành thủ công,
                hệ thống sẽ tự động chốt theo số lượng thực soạn hiện tại.
              </div>
            </div>
          )}

          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200/70 flex items-start gap-2 text-orange-800">
            <Truck className="w-4 h-4 shrink-0 text-[#F85606] mt-0.5" />
            <div>
              Sau khi chốt phiếu, các đơn hàng sẽ được tự động chuyển sang trạng thái{' '}
              <strong>ĐÃ XUẤT KHO (DISPATCHED)</strong> để Quản lý kho xếp xe và lập chuyến giao hàng ngay.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition cursor-pointer shadow-2xs"
          >
            Quay lại kiểm tra
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang chốt đợt soạn...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận hoàn tất phiếu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
