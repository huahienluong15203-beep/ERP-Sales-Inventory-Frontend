import React from 'react';
import type { Supplier } from '../../types/supplier';
import { Icons } from '../common/Icons';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (supplier: Supplier) => void;
  canManage: boolean;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onEdit,
  onToggleStatus,
  canManage
}) => {
  if (!isOpen || !supplier) return null;

  const isActive = supplier.status === 'ACTIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Icons.Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{supplier.name}</h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {isActive ? 'ĐANG GIAO DỊCH' : 'NGỪNG GIAO DỊCH'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Mã: <strong>{supplier.code}</strong> • MST: <strong>{supplier.taxCode}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cảnh báo ngừng giao dịch */}
          {!isActive && supplier.statusReason && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                <Icons.AlertTriangle size={16} />
                <span>Lý do ngừng giao dịch (S2-09):</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 pl-6">{supplier.statusReason}</p>
            </div>
          )}

          {/* Grid thông tin chung */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mã số thuế (MST)</span>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">{supplier.taxCode}</p>
              <p className="text-[11px] text-slate-400">Đã đối soát thông tin thuế doanh nghiệp</p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Điều khoản thanh toán</span>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                {supplier.paymentTerms || 'Chưa thiết lập điều khoản công nợ'}
              </p>
              <p className="text-[11px] text-slate-400">Áp dụng cho các phiếu nhập kho</p>
            </div>
          </div>

          {/* Người liên hệ & Kênh liên lạc */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Icons.User size={15} className="text-indigo-500" />
              Thông tin liên hệ & Nguồn hàng
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block mb-0.5">Người đại diện</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {supplier.contactName || 'Chưa cập nhật'}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block mb-0.5">Số điện thoại</span>
                <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {supplier.phone || 'Chưa cập nhật'}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block mb-0.5">Email</span>
                <p className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                  {supplier.email || 'Chưa cập nhật'}
                </p>
              </div>
            </div>
          </div>

          {/* Địa chỉ trụ sở */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Icons.MapPin size={15} className="text-indigo-500" />
              Địa chỉ kho & Trụ sở
            </h3>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              {supplier.address || 'Chưa cập nhật địa chỉ giao nhận hàng'}
            </div>
          </div>

          {/* Ghi chú */}
          {supplier.note && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Icons.FileText size={15} className="text-indigo-500" />
                Ghi chú nội bộ
              </h3>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 italic">
                {supplier.note}
              </div>
            </div>
          )}

          {/* Dấu thời gian */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Ngày tạo: {new Date(supplier.createdAt).toLocaleString('vi-VN')}</span>
            <span>Cập nhật lần cuối: {new Date(supplier.updatedAt).toLocaleString('vi-VN')}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            {canManage && (
              <button
                onClick={() => {
                  onClose();
                  onToggleStatus(supplier);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                {isActive ? 'Ngừng giao dịch...' : 'Mở lại giao dịch...'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            {canManage && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(supplier);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Icons.Edit size={14} />
                <span>Chỉnh sửa</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
