import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Check,
  MapPin,
  Sparkles,
  Info
} from 'lucide-react';
import type { PickingListItem } from '../../types/pickingList';

export interface ShortageItemState {
  item: PickingListItem;
  pickedQuantity: number;
  reason: string;
  error?: string;
}

interface PickingBatchShortageModalProps {
  isOpen: boolean;
  shortageItems: PickingListItem[];
  onConfirm: (
    updates: Array<{ itemId: number; pickedQuantity: number; discrepancyReason: string }>
  ) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

const COMMON_SHORTAGE_REASONS = [
  'Hết hàng trên vị trí kệ lưu trữ',
  'Hàng bị móp méo, rách bao bì, bể vỡ',
  'Hàng cận hạn sử dụng không đủ tiêu chuẩn xuất',
  'Lệch số lượng tồn thực tế so với hệ thống ERP',
  'Thất lạc trong kho chưa tìm thấy vị trí'
];

export const PickingBatchShortageModal: React.FC<PickingBatchShortageModalProps> = ({
  isOpen,
  shortageItems,
  onConfirm,
  onClose,
  isSubmitting = false
}) => {
  const [itemsState, setItemsState] = useState<ShortageItemState[]>([]);
  const [generalError, setGeneralError] = useState<string>('');

  useEffect(() => {
    if (isOpen && shortageItems.length > 0) {
      setItemsState(
        shortageItems.map((item) => ({
          item,
          pickedQuantity: item.pickedQuantity,
          reason: item.discrepancyReason || '',
          error: ''
        }))
      );
      setGeneralError('');
    }
  }, [isOpen, shortageItems]);

  if (!isOpen) return null;

  const handleReasonChange = (index: number, val: string) => {
    setItemsState((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        reason: val,
        error: val.trim().length >= 5 ? '' : next[index].error
      };
      return next;
    });
  };

  const handlePickedQtyChange = (index: number, val: number) => {
    setItemsState((prev) => {
      const next = [...prev];
      const max = next[index].item.requiredQuantity;
      const safeVal = Math.max(0, Math.min(max, isNaN(val) ? 0 : val));
      next[index] = {
        ...next[index],
        pickedQuantity: safeVal
      };
      return next;
    });
  };

  const handleApplyQuickReason = (index: number, quickReason: string) => {
    handleReasonChange(index, quickReason);
  };

  const handleApplyToAll = (reasonToApply: string) => {
    if (!reasonToApply.trim()) return;
    setItemsState((prev) =>
      prev.map((s) => ({
        ...s,
        reason: reasonToApply.trim(),
        error: ''
      }))
    );
    setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const validated = itemsState.map((s) => {
      const shortage = s.item.requiredQuantity - s.pickedQuantity;
      if (shortage > 0) {
        const trimmed = s.reason.trim();
        if (!trimmed) {
          hasError = true;
          return { ...s, error: 'Bắt buộc nhập lý do soạn thiếu hàng (S6-03 AC4)!' };
        }
        if (trimmed.length < 5) {
          hasError = true;
          return { ...s, error: 'Lý do tối thiểu 5 ký tự để đảm bảo ghi nhận nguyên nhân rõ ràng.' };
        }
      }
      return { ...s, error: '' };
    });

    setItemsState(validated);

    if (hasError) {
      setGeneralError('Vui lòng nhập lý do đầy đủ (tối thiểu 5 ký tự) cho tất cả các mặt hàng bị thiếu trước khi chốt phiếu!');
      return;
    }

    const payload = validated.map((s) => ({
      itemId: s.item.id,
      pickedQuantity: s.pickedQuantity,
      discrepancyReason: s.reason.trim()
    }));

    await onConfirm(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl shadow-inner backdrop-blur-xs">
              <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Phát hiện mặt hàng soạn thiếu số lượng
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Bắt buộc ghi nhận lý do chênh lệch trước khi hoàn tất phiếu (Tiêu chí S6-03 AC4)
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Quick Action Bar */}
        <div className="bg-amber-50/70 border-b border-amber-200/80 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Chọn nhanh lý do chung cho toàn bộ các mặt hàng bị thiếu:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SHORTAGE_REASONS.map((qr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyToAll(qr)}
                className="text-xs px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer font-medium"
              >
                + {qr}
              </button>
            ))}
          </div>
          {generalError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 font-semibold animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{generalError}</span>
            </div>
          )}
        </div>

        {/* Shortage Items Form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[55vh] overflow-y-auto p-5 space-y-4 divide-y divide-gray-100">
            {itemsState.map((state, idx) => {
              const shortage = state.item.requiredQuantity - state.pickedQuantity;
              return (
                <div key={state.item.id} className={idx > 0 ? 'pt-4 space-y-2.5' : 'space-y-2.5'}>
                  {/* Top Item Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                          {state.item.productSku}
                        </span>
                        {state.item.locationCode && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            {state.item.locationCode}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-gray-900 leading-snug">
                        {state.item.productName}
                      </div>
                    </div>

                    {/* Quantity Counters */}
                    <div className="flex items-center gap-2 shrink-0 bg-gray-50 p-2 rounded-xl border border-gray-200">
                      <div className="text-right text-xs">
                        <span className="text-gray-500">Yêu cầu: </span>
                        <strong className="text-gray-800 font-mono">
                          {state.item.requiredQuantity} {state.item.baseUnit}
                        </strong>
                      </div>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Soạn:</span>
                        <input
                          type="number"
                          min={0}
                          max={state.item.requiredQuantity}
                          value={state.pickedQuantity}
                          onChange={(e) => handlePickedQtyChange(idx, Number(e.target.value))}
                          className="w-14 text-center font-bold font-mono text-xs py-1 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-200 outline-none"
                        />
                      </div>
                      <span className="text-gray-300">|</span>
                      <div className="px-2 py-0.5 rounded-lg bg-red-100 text-red-700 font-bold text-xs font-mono">
                        Thiếu -{shortage} {state.item.baseUnit}
                      </div>
                    </div>
                  </div>

                  {/* Reason Textarea & Quick Tags */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <span>Lý do thiếu hàng (bắt buộc):</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-gray-400">Tối thiểu 5 ký tự</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-1">
                      {COMMON_SHORTAGE_REASONS.slice(0, 3).map((r, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => handleApplyQuickReason(idx, r)}
                          className="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-amber-900 border border-gray-200 transition-colors cursor-pointer"
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={state.reason}
                      onChange={(e) => handleReasonChange(idx, e.target.value)}
                      placeholder="Nhập nguyên nhân cụ thể (ví dụ: Kệ chỉ còn 1 lon nguyên vẹn, các lon khác bị móp méo...)"
                      className={`w-full text-xs p-2.5 rounded-xl border outline-none transition-all ${
                        state.error
                          ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                      }`}
                    />

                    {state.error && (
                      <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {state.error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Hệ thống sẽ lưu vết lý do và tự động phân tách phần thiếu thành Backorder (S6-05).</span>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition cursor-pointer shadow-2xs"
              >
                Quay lại soạn tiếp
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu & Chốt phiếu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Xác nhận lý do & Chốt hoàn thành phiếu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
