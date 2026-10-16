import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

interface PickingDiscrepancyModalProps {
  isOpen: boolean;
  productName: string;
  productSku: string;
  locationCode: string;
  requiredQuantity: number;
  pickedQuantity: number;
  baseUnit: string;
  initialReason?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const QUICK_REASONS = [
  'Hết hàng trên vị trí lưu (vị trí kệ rỗng)',
  'Hàng bị móp méo, trầy xước, rách bao bì',
  'Hàng cận date / hết hạn sử dụng không đủ chuẩn xuất',
  'Sản phẩm sai quy cách / sai mã vạch trên kệ',
  'Lỗi lệch số lượng tồn thực tế so với hệ thống'
];

export const PickingDiscrepancyModal: React.FC<PickingDiscrepancyModalProps> = ({
  isOpen,
  productName,
  productSku,
  locationCode,
  requiredQuantity,
  pickedQuantity,
  baseUnit,
  initialReason = '',
  onConfirm,
  onClose
}) => {
  const [reason, setReason] = useState<string>(initialReason);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason || '');
      setError('');
    }
  }, [isOpen, initialReason]);

  if (!isOpen) return null;

  const shortageQty = requiredQuantity - pickedQuantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Tiêu chí bắt buộc: Vui lòng nhập lý do soạn thiếu hàng (AC4)!');
      return;
    }
    if (trimmed.length < 5) {
      setError('Lý do quá ngắn. Vui lòng ghi rõ nguyên nhân (tối thiểu 5 ký tự).');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Ghi nhận lý do soạn thiếu hàng</h3>
              <p className="text-xs text-amber-100">Bắt buộc theo tiêu chí chấp nhận AC4</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Thông tin mặt hàng */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase text-amber-800 tracking-wider">
                Mặt hàng đang soạn
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white font-mono font-medium text-amber-900 border border-amber-200">
                📍 {locationCode}
              </span>
            </div>
            <div className="font-bold text-gray-900 text-sm leading-snug">{productName}</div>
            <div className="text-xs text-gray-500 font-mono">SKU: {productSku}</div>

            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
              <span className="text-gray-600">Yêu cầu: <strong>{requiredQuantity} {baseUnit}</strong></span>
              <span className="text-gray-600">Thực soạn: <strong className="text-emerald-700">{pickedQuantity} {baseUnit}</strong></span>
              <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Thiếu: -{shortageQty} {baseUnit}
              </span>
            </div>
          </div>

          {/* Gợi ý lý do nhanh */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Chọn nhanh nguyên nhân phổ biến:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setError('');
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                    reason === r
                      ? 'bg-amber-100 border-amber-500 text-amber-900 font-semibold shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Ô nhập lý do chi tiết */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Chi tiết giải trình cho Quản lý kho: <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ví dụ: Kiểm tra kệ A-01 chỉ còn 15 thùng, 10 thùng còn lại bị nước nhỏ giọt ướt vỏ đang lập biên bản hủy..."
              className={`w-full text-sm p-3 rounded-xl border focus:ring-2 outline-none transition-all ${
                error
                  ? 'border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50/30'
                  : 'border-gray-300 focus:ring-amber-200 focus:border-amber-500'
              }`}
            />
            {error && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Xác nhận lý do & Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
