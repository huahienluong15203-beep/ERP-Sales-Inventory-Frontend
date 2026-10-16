import React from 'react';
import {
  X,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  Layers,
  RefreshCw
} from 'lucide-react';
import type { ProductLotResponse } from '../../types/productLot';

interface ProductLotLockConfirmModalProps {
  isOpen: boolean;
  lot: ProductLotResponse | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const ProductLotLockConfirmModal: React.FC<ProductLotLockConfirmModalProps> = ({
  isOpen,
  lot,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  if (!isOpen || !lot) return null;

  const isLocking = lot.status === 'ACTIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isLocking
              ? 'bg-gradient-to-r from-rose-50/80 via-white to-amber-50/40 border-rose-100'
              : 'bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/40 border-emerald-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                isLocking
                  ? 'bg-rose-600 shadow-rose-600/20'
                  : 'bg-emerald-600 shadow-emerald-600/20'
              }`}
            >
              {isLocking ? <Lock size={20} /> : <Unlock size={20} />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {isLocking ? 'Xác nhận khóa lô hàng' : 'Xác nhận mở khóa lô hàng'}
              </h3>
              <p className="text-xs text-gray-500">
                {isLocking
                  ? 'Ngăn chặn xuất kho đối với lô hàng này'
                  : 'Khôi phục quyền xuất kho bình thường'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Thông tin chi tiết lô */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Layers size={14} className="text-orange-500" />
                <span>Số lô (Batch / Lot):</span>
              </span>
              <span className="font-mono font-bold text-gray-900 px-2 py-0.5 rounded bg-white border border-gray-200 shadow-2xs">
                {lot.batchNumber}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
                <Package size={14} className="text-gray-400" />
                <span>Sản phẩm:</span>
              </span>
              <span className="font-medium text-gray-900 text-right">
                <span className="font-mono text-xs text-orange-600 font-bold mr-1">[{lot.productSku}]</span>
                <span>{lot.productName}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Building2 size={14} className="text-gray-400" />
                <span>Kho lưu trữ:</span>
              </span>
              <span className="font-medium text-gray-800">
                {lot.warehouseName || 'Chưa thiết lập'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <span>Hạn sử dụng (HSD):</span>
              </span>
              <span className="font-semibold text-gray-800">
                {lot.expiredDate}
              </span>
            </div>
          </div>

          {/* Cảnh báo hậu quả thao tác */}
          {isLocking ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                <span>Cảnh báo ảnh hưởng xuất kho</span>
              </div>
              <p className="leading-relaxed pl-5 text-rose-700">
                Khi lô bị khóa, hệ thống sẽ <strong>từ chối xuất kho</strong> cho mọi Đơn bán hàng (SO) và Phiếu chuyển kho liên quan đến lô này cho đến khi được mở khóa.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Khôi phục quyền xuất kho</span>
              </div>
              <p className="leading-relaxed pl-5 text-emerald-700">
                Lô hàng sẽ chuyển sang trạng thái <strong>Đang hoạt động</strong> và tiếp tục được xuất kho bình thường theo quy tắc ưu tiên hạn dùng (FEFO).
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-40"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] ${
              isLocking
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : isLocking ? (
              <>
                <Lock size={15} />
                <span>Xác nhận khóa lô</span>
              </>
            ) : (
              <>
                <Unlock size={15} />
                <span>Xác nhận mở khóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
