import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  CheckCircle2,
  Lock,
  Calendar,
  XCircle
} from 'lucide-react';
import { calculateStockByLot } from '../../services/productLotApi';
import type { ProductLotResponse } from '../../types/productLot';
import { useAuth } from '../../contexts/AuthContext';

interface LotSelectorDropdownProps {
  productId: number | string;
  warehouseId?: number | string;
  requiredQuantity: number;
  baseUnit?: string;
  selectedBatchNumber?: string;
  onChange: (batchNumber: string, reason?: string, isOverride?: boolean) => void;
  disabled?: boolean;
}

export const LotSelectorDropdown: React.FC<LotSelectorDropdownProps> = ({
  productId,
  warehouseId,
  requiredQuantity,
  baseUnit = 'đơn vị',
  selectedBatchNumber,
  onChange,
  disabled = false
}) => {
  const { currentRole, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState<ProductLotResponse[]>([]);
  const [hasBatchManagement, setHasBatchManagement] = useState(false);
  const [manualReason, setManualReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverrideConfirmed, setIsOverrideConfirmed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isWhManagerOrAdmin =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => ['ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(r)));

  // Tải danh sách lô từ backend theo FEFO
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    calculateStockByLot(productId, warehouseId)
      .then((data) => {
        setHasBatchManagement(Boolean(data.hasBatchManagement));
        setLots(data.lots || []);
      })
      .catch((err) => {
        console.warn('Không tải được danh sách lô cho sản phẩm:', err);
        setLots([]);
      })
      .finally(() => setLoading(false));
  }, [productId, warehouseId]);

  // Tìm lô được hệ thống tự động gợi ý theo nguyên tắc FEFO (hạn gần nhất, còn hạn, còn đủ tồn)
  const suggestedLot = useMemo(() => {
    if (!lots.length) return null;
    // Tìm lô đầu tiên: Trạng thái ACTIVE, chưa hết hạn, và số lượng tồn >= yêu cầu
    const optimal = lots.find(
      (l) => l.status === 'ACTIVE' && l.daysToExpiration > 0 && l.quantity >= requiredQuantity
    );
    if (optimal) return optimal;
    // Nếu không có lô nào đủ số lượng, lấy lô còn hạn đầu tiên
    return lots.find((l) => l.status === 'ACTIVE' && l.daysToExpiration > 0) || null;
  }, [lots, requiredQuantity]);

  // Tự động gán lô gợi ý ban đầu nếu chưa có lựa chọn
  useEffect(() => {
    if (!selectedBatchNumber && suggestedLot) {
      onChange(suggestedLot.batchNumber, undefined, false);
    }
  }, [suggestedLot, selectedBatchNumber, onChange]);

  const currentSelectedLot = useMemo(() => {
    return lots.find((l) => l.batchNumber === selectedBatchNumber) || null;
  }, [lots, selectedBatchNumber]);

  // Kiểm tra xem người dùng có chọn lô khác với lô gợi ý FEFO không
  const isDifferentFromSuggested = Boolean(
    suggestedLot &&
    currentSelectedLot &&
    suggestedLot.batchNumber !== currentSelectedLot.batchNumber
  );

  // Kiểm tra xem lô đã chọn có bị hết hạn không
  const isSelectedExpired = Boolean(
    currentSelectedLot &&
    (currentSelectedLot.daysToExpiration <= 0 || currentSelectedLot.expiryStatus === 'EXPIRED')
  );

  const handleSelectLot = (lot: ProductLotResponse) => {
    setIsOpen(false);
    const isDifferent = suggestedLot && lot.batchNumber !== suggestedLot.batchNumber;
    const isExpired = lot.daysToExpiration <= 0 || lot.expiryStatus === 'EXPIRED';

    let reasonToSend: string | undefined = undefined;
    if (isDifferent) {
      reasonToSend = manualReason.trim() || 'Thủ kho chọn lô xuất khác lô gợi ý ban đầu';
    }
    if (isExpired && isWhManagerOrAdmin) {
      reasonToSend = overrideReason.trim() || 'Quản lý kho xác nhận ghi đè xuất lô quá hạn';
    }

    onChange(lot.batchNumber, reasonToSend, isExpired);
  };

  const handleManualReasonBlur = () => {
    if (selectedBatchNumber) {
      onChange(selectedBatchNumber, manualReason.trim(), isSelectedExpired && isOverrideConfirmed);
    }
  };

  const handleOverrideConfirmToggle = (checked: boolean) => {
    setIsOverrideConfirmed(checked);
    if (selectedBatchNumber) {
      onChange(
        selectedBatchNumber,
        checked ? overrideReason.trim() || 'Quản lý kho xác nhận ghi đè xuất lô' : manualReason.trim(),
        checked
      );
    }
  };

  if (!hasBatchManagement) {
    return (
      <span className="text-xs text-gray-400 italic">
        SKU không theo dõi lô
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 py-1">
        <Clock size={13} className="animate-spin text-orange-500" />
        <span>Đang tìm lô theo FEFO...</span>
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
        <AlertTriangle size={13} />
        <span>Hết tồn theo lô trong kho</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-[240px]">
      {/* Dropdown kích hoạt */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left p-2 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition cursor-pointer ${
            disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200' :
            isSelectedExpired ? 'bg-rose-50/70 border-rose-300 text-rose-900 shadow-2xs' :
            isDifferentFromSuggested ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-2xs' :
            'bg-white hover:bg-orange-50/40 border-gray-300 text-gray-900 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Layers size={14} className={isSelectedExpired ? 'text-rose-500' : 'text-orange-600'} />
            <div className="truncate">
              {currentSelectedLot ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold">{currentSelectedLot.batchNumber}</span>
                  {suggestedLot?.batchNumber === currentSelectedLot.batchNumber && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Gợi ý FEFO
                    </span>
                  )}
                  {isSelectedExpired && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      Đã quá hạn
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">Chọn lô xuất hàng...</span>
              )}
              {currentSelectedLot && (
                <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                  <span>HSD: {currentSelectedLot.expiredDate}</span>
                  <span>•</span>
                  <span>Tồn: <strong>{currentSelectedLot.quantity}</strong> {baseUnit}</span>
                </div>
              )}
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </button>

        {/* Menu danh sách các lô */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="px-3 py-1.5 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Danh sách lô (Ưu tiên FEFO)</span>
              <span className="text-[10px] text-orange-600 font-normal">Hạn gần nhất xếp trước</span>
            </div>
            {lots.map((lot) => {
              const isSelected = lot.batchNumber === selectedBatchNumber;
              const isSuggested = suggestedLot?.batchNumber === lot.batchNumber;
              const isExpired = lot.daysToExpiration <= 0 || lot.expiryStatus === 'EXPIRED';
              const isLocked = lot.status === 'LOCKED';
              const isShortStock = lot.quantity < requiredQuantity;

              return (
                <button
                  key={lot.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSelectLot(lot)}
                  className={`w-full text-left px-3 py-2 text-xs transition cursor-pointer flex items-start justify-between gap-2 border-b border-gray-50 last:border-0 ${
                    isSelected ? 'bg-orange-50/80 font-semibold' : 'hover:bg-gray-50'
                  } ${isLocked ? 'opacity-40 cursor-not-allowed bg-gray-50' : ''}`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-gray-900">{lot.batchNumber}</span>
                      {isSuggested && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Gợi ý FEFO
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Quá hạn
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-gray-200 text-gray-700">
                          <Lock size={10} />
                          Đã khóa
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-gray-400" />
                        HSD: {lot.expiredDate}
                      </span>
                      <span>•</span>
                      <span>
                        Tồn: <strong className={isShortStock ? 'text-amber-700' : 'text-gray-800'}>{lot.quantity}</strong> {baseUnit}
                      </span>
                      {lot.daysToExpiration > 0 ? (
                        <span className="text-[10px] text-emerald-600">(còn {lot.daysToExpiration} ngày)</span>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-bold">(đã hết hạn)</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {isSelected && <CheckCircle2 size={15} className="text-orange-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* YÊU CẦU NHẬP LÝ DO NẾU THỦ KHO CHỌN LÔ KHÁC VỚI LÔ GỢI Ý FEFO (AC 2) */}
      {isDifferentFromSuggested && !isSelectedExpired && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
            <span>Đang chọn khác lô gợi ý FEFO ({suggestedLot?.batchNumber})</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Vui lòng nhập lý do chọn lô này thay vì lô ưu tiên hạn gần nhất:
          </p>
          <div className="flex flex-wrap gap-1">
            {['Đại lý yêu cầu date xa', 'Hàng góc trong khó lấy', 'Khách chỉ định lô'].map((tag, tIdx) => (
              <button
                key={tIdx}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setManualReason(tag);
                  if (selectedBatchNumber) {
                    onChange(selectedBatchNumber, tag, false);
                  }
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium cursor-pointer shadow-2xs"
              >
                + {tag}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={manualReason}
            disabled={disabled}
            onChange={(e) => setManualReason(e.target.value)}
            onBlur={handleManualReasonBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleManualReasonBlur();
              }
            }}
            placeholder="Nhập lý do cụ thể (tối thiểu 5 ký tự)..."
            className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      )}

      {/* CẢNH BÁO VÀ XÁC NHẬN GHI ĐÈ NẾU LÔ QUÁ HẠN */}
      {isSelectedExpired && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-rose-950">
            <XCircle size={14} className="text-rose-600 shrink-0" />
            <span>Cảnh báo nghiêm ngặt: Lô hàng đã quá hạn sử dụng!</span>
          </div>
          <p className="text-[11px] leading-relaxed text-rose-800">
            Hệ thống không cho phép xuất lô đã quá hạn trừ khi <strong>Quản lý kho</strong> xác nhận ghi đè kèm lý do.
          </p>

          {isWhManagerOrAdmin ? (
            <div className="space-y-1.5 pt-1 border-t border-rose-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-950">
                <input
                  type="checkbox"
                  checked={isOverrideConfirmed}
                  disabled={disabled}
                  onChange={(e) => handleOverrideConfirmToggle(e.target.checked)}
                  className="rounded border-rose-400 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span>Quản lý kho xác nhận ghi đè cho phép xuất</span>
              </label>
              {isOverrideConfirmed && (
                <input
                  type="text"
                  value={overrideReason}
                  disabled={disabled}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  onBlur={() =>
                    onChange(
                      selectedBatchNumber || '',
                      overrideReason.trim() || 'Quản lý kho xác nhận xuất lô quá hạn',
                      true
                    )
                  }
                  placeholder="Nhập lý do cho phép xuất lô quá hạn (bắt buộc)..."
                  className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              )}
            </div>
          ) : (
            <div className="text-[11px] font-bold text-rose-700 bg-rose-100/70 p-1.5 rounded-lg">
              Bạn đang ở vai trò Nhân viên kho. Vui lòng liên hệ Quản lý kho để thực hiện ghi đè nếu muốn xuất lô này.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
