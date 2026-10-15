import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { validateLotForDispatch } from '../../services/productLotApi';
import type { LotDispatchValidationResponse, ProductLotResponse } from '../../types/productLot';
import { useAuth } from '../../contexts/AuthContext';

interface ProductLotDispatchCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot: ProductLotResponse | null;
}

export const ProductLotDispatchCheckModal: React.FC<ProductLotDispatchCheckModalProps> = ({
  isOpen,
  onClose,
  lot
}) => {
  const { currentRole, user } = useAuth();
  const [quantity, setQuantity] = useState<number | string>(10);
  const [overrideExpired, setOverrideExpired] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<LotDispatchValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isWhManagerOrAdmin =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => ['ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(r)));

  if (!isOpen || !lot) return null;

  const handleValidate = async () => {
    setError(null);
    setResult(null);

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Số lượng xuất kiểm tra phải lớn hơn 0');
      return;
    }
    if (overrideExpired && !overrideReason.trim()) {
      setError('Bắt buộc nhập lý do khi chọn ghi đè xuất lô quá hạn');
      return;
    }

    try {
      setChecking(true);
      const res = await validateLotForDispatch({
        productId: lot.productId,
        warehouseId: lot.warehouseId,
        batchNumber: lot.batchNumber,
        quantity: qty,
        overrideExpired,
        overrideReason: overrideExpired ? overrideReason.trim() : undefined
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kiểm tra thất bại');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Kiểm tra HSD & Xuất kho theo lô</h3>
              <p className="text-xs text-gray-500 font-mono">
                Số lô: <strong>{lot.batchNumber}</strong> • SKU: {lot.productSku}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Thông tin hiện tại của lô */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Sản phẩm:</span>
              <strong className="text-gray-900">{lot.productName}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Kho lưu trữ:</span>
              <span className="font-semibold text-gray-800">{lot.warehouseName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Hạn sử dụng:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar size={13} className="text-gray-400" />
                <span>{lot.expiredDate}</span>
                {lot.daysToExpiration > 0 ? (
                  <span className="text-emerald-700 font-mono">(còn {lot.daysToExpiration} ngày)</span>
                ) : (
                  <span className="text-rose-700 font-mono font-bold">(đã hết hạn)</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Số lượng tồn hiện tại:</span>
              <span className="font-bold text-gray-900 font-mono">
                {lot.quantity} {lot.productBaseUnit}
              </span>
            </div>
          </div>

          {/* Nhập số lượng cần xuất để kiểm tra */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Số lượng dự kiến xuất ({lot.productBaseUnit})
            </label>
            <input
              type="number"
              min="0.0001"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Tùy chọn ghi đè cho Quản lý kho nếu lô quá hạn */}
          {lot.daysToExpiration <= 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>Quy tắc xuất kho: Không cho xuất lô đã quá hạn!</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Để xuất lô này, Quản lý kho bắt buộc phải tích xác nhận ghi đè và nhập lý do phê duyệt.
              </p>

              {isWhManagerOrAdmin ? (
                <div className="space-y-2 pt-1 border-t border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-900">
                    <input
                      type="checkbox"
                      checked={overrideExpired}
                      onChange={(e) => setOverrideExpired(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Xác nhận ghi đè cho phép xuất lô quá hạn</span>
                  </label>
                  {overrideExpired && (
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Lý do ghi đè (vd: Đã tái kiểm nghiệm đạt chuẩn, xuất xử lý đặc thù...)"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-rose-700 font-semibold italic">
                  * Chỉ Quản lý kho hoặc Admin mới có quyền ghi đè xuất lô quá hạn.
                </p>
              )}
            </div>
          )}

          {/* Kết quả kiểm tra */}
          {result && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 animate-in fade-in ${
                result.valid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.valid ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>HỢP LỆ — ĐỦ ĐIỀU KIỆN XUẤT KHO</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-rose-600" />
                    <span>KHÔNG ĐỦ ĐIỀU KIỆN XUẤT KHO</span>
                  </>
                )}
              </div>
              <p className="text-xs leading-relaxed">{result.message}</p>
              {result.overrideApplied && (
                <div className="text-[11px] font-bold text-amber-800 bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
                  * Đã áp dụng xác nhận ghi đè của Quản lý kho cho phép xuất lô này.
                </div>
              )}
            </div>
          )}

          {/* Action */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={checking}
              onClick={handleValidate}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {checking ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Chạy kiểm tra</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
