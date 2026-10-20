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
  const [isOverrideConfirmed, setIsOverrideConfirmed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingLot, setPendingLot] = useState<ProductLotResponse | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [modalOverrideChecked, setModalOverrideChecked] = useState(false);
  const [modalError, setModalError] = useState('');

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
    const isDifferent = suggestedLot && lot.batchNumber !== suggestedLot.batchNumber;
    const isExpired = lot.daysToExpiration <= 0 || lot.expiryStatus === 'EXPIRED';

    setIsOpen(false);

    if (isDifferent || isExpired) {
      // Khi chọn lô khác hoặc lô quá hạn -> Hiển thị popup ra màn hình để nhập lý do
      setPendingLot(lot);
      setModalReason(manualReason || '');
      setModalOverrideChecked(isOverrideConfirmed);
      setModalError('');
      setIsReasonModalOpen(true);
    } else {
      // Chọn đúng lô gợi ý FEFO và còn hạn -> Gán trực tiếp
      onChange(lot.batchNumber, undefined, false);
      setManualReason('');
      setIsOverrideConfirmed(false);
    }
  };

  const handleConfirmModal = () => {
    if (!pendingLot) return;
    const isExpired = pendingLot.daysToExpiration <= 0 || pendingLot.expiryStatus === 'EXPIRED';

    if (isExpired && !modalOverrideChecked) {
      setModalError('Quản lý kho phải tích xác nhận ghi đè cho phép xuất lô quá hạn.');
      return;
    }

    if (!modalReason.trim()) {
      setModalError('Vui lòng nhập hoặc chọn lý do cụ thể.');
      return;
    }

    const trimmedReason = modalReason.trim();
    setManualReason(trimmedReason);
    if (isExpired) {
      setIsOverrideConfirmed(modalOverrideChecked);
    }

    onChange(pendingLot.batchNumber, trimmedReason, isExpired && modalOverrideChecked);
    setIsReasonModalOpen(false);
    setPendingLot(null);
  };

  const handleCancelModal = () => {
    setIsReasonModalOpen(false);
    setPendingLot(null);
    setModalError('');
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
    <div className="relative min-w-[220px]">
      {/* Dropdown kích hoạt */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition cursor-pointer ${
          disabled
            ? 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200'
            : isSelectedExpired
            ? 'bg-rose-50/70 border-rose-300 text-rose-900 shadow-2xs hover:bg-rose-50'
            : isDifferentFromSuggested
            ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-2xs hover:bg-amber-50'
            : 'bg-white hover:bg-orange-50/40 border-gray-300 text-gray-900 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Layers
            size={14}
            className={
              isSelectedExpired
                ? 'text-rose-500'
                : isDifferentFromSuggested
                ? 'text-amber-600'
                : 'text-orange-600'
            }
          />
          <div className="truncate">
            {currentSelectedLot ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-xs">{currentSelectedLot.batchNumber}</span>
                {suggestedLot?.batchNumber === currentSelectedLot.batchNumber ? (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Gợi ý FEFO
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Khác FEFO
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
              <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5 truncate">
                <span>HSD: {currentSelectedLot.expiredDate}</span>
                <span>•</span>
                <span>Tồn: <strong>{currentSelectedLot.quantity}</strong> {baseUnit}</span>
                {manualReason && isDifferentFromSuggested && (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 italic truncate max-w-[100px]" title={manualReason}>
                      {manualReason}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
      </button>

      {/* Menu danh sách các lô xổ xuống dưới (Chỉ hiển thị danh sách gọn gàng) */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 min-w-[340px] w-full top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-3.5 py-2 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between bg-gray-50/70">
              <span>Danh sách lô (Ưu tiên FEFO)</span>
              <span className="text-[10px] text-orange-600 font-normal">Hạn gần nhất xếp trước</span>
            </div>

            <div className="max-h-60 overflow-y-auto py-1 divide-y divide-gray-50">
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
                    className={`w-full text-left px-3 py-2 text-xs transition cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-orange-50/80 font-semibold' : 'hover:bg-gray-50'
                    } ${isLocked ? 'opacity-40 cursor-not-allowed bg-gray-50' : ''}`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
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
          </div>
        </>
      )}

      {/* POPUP MODAL NHẬP LÝ DO KHI CHỌN LÔ KHÁC HOẶC LÔ QUÁ HẠN (Hiển thị giữa màn hình) */}
      {isReasonModalOpen && pendingLot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center gap-2.5 ${
              pendingLot.daysToExpiration <= 0 || pendingLot.expiryStatus === 'EXPIRED'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {pendingLot.daysToExpiration <= 0 || pendingLot.expiryStatus === 'EXPIRED' ? (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <h3 className="font-bold text-sm">
                  {pendingLot.daysToExpiration <= 0 || pendingLot.expiryStatus === 'EXPIRED'
                    ? 'Xác nhận xuất lô quá hạn sử dụng'
                    : 'Lý do chọn lô khác gợi ý FEFO'}
                </h3>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {pendingLot.daysToExpiration <= 0 || pendingLot.expiryStatus === 'EXPIRED'
                    ? 'Lô hàng đã hết hạn sử dụng. Cần Quản lý kho xác nhận ghi đè.'
                    : 'Hệ thống khuyến nghị ưu tiên xuất lô cận hạn nhất trước (FEFO).'}
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* So sánh lô gợi ý vs lô chọn */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Gợi ý FEFO</div>
                  <div className="font-mono font-bold text-gray-900 text-xs truncate">
                    {suggestedLot?.batchNumber || 'N/A'}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    HSD: {suggestedLot?.expiredDate || 'N/A'}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Tồn: <strong>{suggestedLot?.quantity || 0}</strong> {baseUnit}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                  <div className="text-[10px] font-bold text-amber-700 uppercase">Lô bạn chọn</div>
                  <div className="font-mono font-bold text-gray-900 text-xs truncate">
                    {pendingLot.batchNumber}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    HSD: {pendingLot.expiredDate}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    Tồn: <strong>{pendingLot.quantity}</strong> {baseUnit}
                  </div>
                </div>
              </div>

              {/* Gợi ý chọn nhanh lý do */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700">
                  Chọn nhanh lý do:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Đại lý yêu cầu date xa',
                    'Hàng góc trong khó lấy',
                    'Khách chỉ định lô này',
                    'Bao bì phù hợp vận chuyển'
                  ].map((tag, tIdx) => (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => {
                        setModalReason(tag);
                        setModalError('');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-orange-50 hover:border-orange-300 text-gray-700 border border-gray-200 font-medium cursor-pointer transition shadow-2xs"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhập lý do chi tiết */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-700">
                  Nhập lý do cụ thể <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={modalReason}
                  onChange={(e) => {
                    setModalReason(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  placeholder="Nhập lý do tại sao không xuất theo lô FEFO gợi ý..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none text-gray-900"
                />
              </div>

              {/* Ghi đè lô quá hạn nếu áp dụng */}
              {(pendingLot.daysToExpiration <= 0 || pendingLot.expiryStatus === 'EXPIRED') && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  {isWhManagerOrAdmin ? (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-950">
                      <input
                        type="checkbox"
                        checked={modalOverrideChecked}
                        onChange={(e) => {
                          setModalOverrideChecked(e.target.checked);
                          if (modalError) setModalError('');
                        }}
                        className="rounded border-rose-400 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Quản lý kho xác nhận cho phép xuất lô quá hạn</span>
                    </label>
                  ) : (
                    <div className="text-[11px] text-rose-700 font-semibold">
                      ⚠️ Bạn không có quyền Quản lý kho để xuất lô quá hạn. Vui lòng liên hệ Quản lý kho.
                    </div>
                  )}
                </div>
              )}

              {/* Thông báo lỗi nếu có */}
              {modalError && (
                <div className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 font-medium">
                  {modalError}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelModal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition cursor-pointer shadow-xs active:scale-95"
              >
                Xác nhận đổi lô
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
