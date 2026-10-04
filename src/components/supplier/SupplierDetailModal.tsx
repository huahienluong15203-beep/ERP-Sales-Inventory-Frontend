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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-orange-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Icons.Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{supplier.name}</h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isActive ? 'ĐANG GIAO DỊCH' : 'NGỪNG GIAO DỊCH'}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-500">
                Mã: <strong>{supplier.code}</strong> • MST: <strong>{supplier.taxCode}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cảnh báo ngừng giao dịch */}
          {!isActive && supplier.statusReason && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <Icons.AlertTriangle size={16} />
                <span>Lý do ngừng giao dịch:</span>
              </div>
              <p className="text-xs text-amber-700 pl-6">{supplier.statusReason}</p>
            </div>
          )}

          {/* Grid thông tin chung */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/80 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Mã số thuế (MST)</span>
              <p className="text-sm font-mono font-bold text-gray-900">{supplier.taxCode}</p>
              <p className="text-[11px] text-gray-400">Đã đối soát thông tin thuế doanh nghiệp</p>
            </div>

            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/80 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Điều khoản thanh toán</span>
              <p className="text-xs font-semibold text-orange-700">
                {supplier.paymentTerms || 'Chưa thiết lập điều khoản công nợ'}
              </p>
              <p className="text-[11px] text-gray-400">Áp dụng cho các phiếu nhập kho</p>
            </div>
          </div>

          {/* Người liên hệ & Kênh liên lạc */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Icons.User size={15} className="text-orange-500" />
              Thông tin liên hệ & Nguồn hàng
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                <span className="text-[11px] text-gray-400 block mb-0.5">Người đại diện</span>
                <p className="text-xs font-semibold text-gray-800">
                  {supplier.contactName || 'Chưa cập nhật'}
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                <span className="text-[11px] text-gray-400 block mb-0.5">Số điện thoại</span>
                <p className="text-xs font-mono font-semibold text-gray-800">
                  {supplier.phone || 'Chưa cập nhật'}
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                <span className="text-[11px] text-gray-400 block mb-0.5">Email</span>
                <p className="text-xs font-mono text-gray-800 truncate">
                  {supplier.email || 'Chưa cập nhật'}
                </p>
              </div>
            </div>
          </div>

          {/* Địa chỉ trụ sở */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Icons.MapPin size={15} className="text-orange-500" />
              Địa chỉ kho & Trụ sở
            </h3>
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/80 text-xs text-gray-700">
              {supplier.address || 'Chưa cập nhật địa chỉ giao nhận hàng'}
            </div>
          </div>

          {/* Ghi chú */}
          {supplier.note && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Icons.FileText size={15} className="text-orange-500" />
                Ghi chú nội bộ
              </h3>
              <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200/80 text-xs text-gray-600 italic">
                {supplier.note}
              </div>
            </div>
          )}

          {/* Dấu thời gian */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
            <span>Ngày tạo: {new Date(supplier.createdAt).toLocaleString('vi-VN')}</span>
            <span>Cập nhật lần cuối: {new Date(supplier.updatedAt).toLocaleString('vi-VN')}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            {canManage && (
              <button
                onClick={() => {
                  onClose();
                  onToggleStatus(supplier);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'text-amber-600 hover:bg-amber-50'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {isActive ? 'Ngừng giao dịch...' : 'Mở lại giao dịch...'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            {canManage && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(supplier);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-xs transition-all cursor-pointer"
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
