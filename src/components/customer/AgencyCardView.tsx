import React from 'react';
import type { Agency } from '../../types/agency';
import {
  MapPin,
  Phone,
  Navigation,
  BadgeDollarSign,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  Edit,
  Users,
  CreditCard,
  Truck,
  History
} from '../common/Icons';

interface AgencyCardViewProps {
  agencies: Agency[];
  loading: boolean;
  canManageAgency: boolean;
  canManageAssignments: boolean;
  onEdit: (agency: Agency) => void;
  onAssignRep: (agency: Agency) => void;
  onDeliveryPoints: (agency: Agency) => void;
  onCreditLimit: (agency: Agency) => void;
  onHistory: (agency: Agency) => void;
  onLockModal: (agency: Agency) => void;
  onSuspendModal: (agency: Agency) => void;
  /** Không còn dùng: hồ sơ đại lý không xoá cứng (giữ để không phải sửa nơi gọi) */
  onDeleteModal?: (agency: Agency) => void;
}

/**
 * S3-08 (SCRUM-21): Chế độ xem dạng Thẻ tối ưu cho Nhân viên kinh doanh đi thị trường
 * Giúp tìm nhanh khách hàng trong tuyến, gọi điện 1 chạm, chỉ đường Google Maps khi đang đứng ngoài đường.
 */
export const AgencyCardView: React.FC<AgencyCardViewProps> = ({
  agencies,
  loading,
  canManageAgency,
  canManageAssignments,
  onEdit,
  onAssignRep,
  onDeliveryPoints,
  onCreditLimit,
  onHistory,
  onLockModal,
  onSuspendModal
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs animate-pulse space-y-3">
            <div className="h-5 bg-gray-200 rounded-md w-2/3" />
            <div className="h-4 bg-gray-100 rounded-md w-1/2" />
            <div className="h-16 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (agencies.length === 0) {
    return null; // Đã có empty state chung ở page
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agencies.map((agency) => {
        const isLocked = Boolean(agency.transactionLocked);
        const isSuspended = agency.status === 'SUSPENDED';
        const debtRatio =
          agency.creditLimit > 0 ? Math.round((agency.totalDebt / agency.creditLimit) * 100) : 0;

        return (
          <div
            key={agency.id}
            className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
              isLocked
                ? 'border-rose-200 ring-1 ring-rose-200/50 bg-gradient-to-b from-rose-50/20 to-white'
                : isSuspended
                ? 'border-amber-200 bg-gradient-to-b from-amber-50/20 to-white'
                : 'border-gray-200/80 hover:border-orange-300'
            }`}
          >
            {/* 1. Header Thẻ */}
            <div className="p-4 border-b border-gray-100 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-gray-100 text-gray-800 border border-gray-200">
                    {agency.code}
                  </span>
                  <div
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border max-w-full"
                    style={{
                      backgroundColor: agency.pricingTier.badgeBg,
                      color: agency.pricingTier.badgeColor,
                      borderColor: 'currentColor'
                    }}
                    title={`${agency.pricingTier.code} - ${agency.pricingTier.name}`}
                  >
                    <BadgeDollarSign size={11} className="shrink-0" />
                    <span className="truncate">{agency.pricingTier.name}</span>
                    {agency.pricingTier.code && (
                      <span className="px-1 py-0.2 rounded-md bg-white/90 text-[9px] font-mono shrink-0 ml-0.5 border border-black/10">
                        {agency.pricingTier.code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Trạng thái hoạt động / khóa */}
                {isLocked ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                    <Lock size={11} className="text-rose-600" />
                    Khóa Giao Dịch
                  </span>
                ) : isSuspended ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    <ShieldAlert size={11} />
                    Dừng Giao Dịch
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    <CheckCircle2 size={11} />
                    Đang Hoạt Động
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                  {agency.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                  <span>MST: <strong className="font-mono text-gray-700">{agency.taxCode}</strong></span>
                  <span>•</span>
                  <span>{agency.customerGroupName}</span>
                </div>
              </div>

              {/* Tuyến / Khu vực phụ trách */}
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-gray-600">
                <div className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-100">
                  <MapPin size={12} className="text-blue-500 shrink-0" />
                  <span>Tuyến: {agency.regionName}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Users size={11} className="text-orange-500" />
                  <span className="truncate max-w-[120px]">{agency.assignedRepName || 'Chưa gán'}</span>
                </div>
              </div>

              {/* Cảnh báo quy tắc nghiệp vụ khi đại lý bị khóa giao dịch (SCRUM-21) */}
              {isLocked && (
                <div className="p-2.5 bg-rose-50/90 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-1 animate-in fade-in">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                    <Lock size={12} className="text-rose-600 shrink-0" />
                    <span>Lý do khóa: "{agency.transactionLockReason || 'Rủi ro nợ quá hạn'}"</span>
                  </div>
                  <div className="text-[10.5px] text-rose-700 space-y-0.5 pl-3.5 border-l-2 border-rose-300">
                    <p>• <strong>Chặn tạo đơn mới</strong> trên toàn bộ hệ thống (kể cả cổng đặt hàng B2B).</p>
                    <p>• <strong>Đơn dở dang</strong> vẫn được xử lý tiếp nhưng có cảnh báo công nợ.</p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Thao tác Nhanh Khi Đi Đường: Chỉ đường & Gọi điện 1 chạm */}
            <div className="p-4 space-y-3">
              {/* Địa chỉ & Nút Chỉ đường Google Maps */}
              <div className="flex items-start justify-between gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs">
                <div className="flex items-start gap-1.5 min-w-0">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                    {agency.address || 'Chưa cập nhật địa chỉ trụ sở'}
                  </span>
                </div>
                {agency.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${agency.name} ${agency.address}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-600 border border-gray-200 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                    title="Mở chỉ đường trên Google Maps"
                  >
                    <Navigation size={11} className="text-blue-500" />
                    <span>Chỉ đường</span>
                  </a>
                )}
              </div>

              {/* Số điện thoại & Nút Gọi điện 1 chạm */}
              {agency.phone && (
                <div className="flex items-center justify-between gap-2 bg-orange-50/50 p-2.5 rounded-xl border border-orange-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-[#F85606]" />
                    <span className="font-mono font-bold text-gray-900 text-[11px]">{agency.phone}</span>
                  </div>
                  <a
                    href={`tel:${agency.phone}`}
                    className="px-2.5 py-1 rounded-lg bg-[#FF6A00] hover:bg-[#EE4D2D] text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                    title="Bấm để gọi ngay khi đứng ngoài đường"
                  >
                    <Phone size={11} />
                    <span>Gọi ngay</span>
                  </a>
                </div>
              )}

              {/* Thông số Tài chính & Công nợ */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Công nợ hiện tại:</span>
                  <strong className={`font-mono ${agency.totalDebt > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(agency.totalDebt)}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-gray-500 text-[10px]">
                  <span>Hạn mức nợ: <strong className="font-mono text-gray-700">{new Intl.NumberFormat('vi-VN').format(agency.creditLimit)}đ</strong></span>
                  <span>Tối đa: <strong className="text-blue-600">{agency.maxDebtDays || 30} ngày</strong></span>
                </div>

                {/* Thanh tiến độ công nợ */}
                {agency.creditLimit > 0 && (
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        debtRatio > 100 ? 'bg-red-500' : debtRatio > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(debtRatio, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. Footer Thao Tác Đại Lý */}
            <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-1">
                {/* Điểm giao hàng */}
                <button
                  type="button"
                  onClick={() => onDeliveryPoints(agency)}
                  className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:text-[#F85606] hover:border-orange-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  title="Quản lý điểm giao hàng"
                >
                  <Truck size={12} className="text-[#F85606]" />
                  <span>Kho ({agency.deliveryPointCount ?? 0})</span>
                </button>

                {/* Lịch sử phân công */}
                <button
                  type="button"
                  onClick={() => onHistory(agency)}
                  className="p-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 text-[11px] cursor-pointer transition-colors"
                  title="Xem lịch sử phân công"
                >
                  <History size={13} />
                </button>

                {/* Hạn mức công nợ */}
                {canManageAgency && (
                  <button
                    type="button"
                    onClick={() => onCreditLimit(agency)}
                    className="p-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 text-[11px] cursor-pointer transition-colors"
                    title="Điều chỉnh hạn mức công nợ"
                  >
                    <CreditCard size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Sửa hồ sơ */}
                {canManageAgency && (
                  <button
                    type="button"
                    onClick={() => onEdit(agency)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-[#F85606] hover:border-orange-200 transition-colors cursor-pointer"
                    title="Sửa hồ sơ đại lý"
                  >
                    <Edit size={13} />
                  </button>
                )}

                {/* Phân công sales rep */}
                {canManageAssignments && (
                  <button
                    type="button"
                    onClick={() => onAssignRep(agency)}
                    className="p-1.5 rounded-lg border border-purple-200 bg-white text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                    title="Phân công nhân viên phụ trách"
                  >
                    <Users size={13} />
                  </button>
                )}

                {/* Khóa / Mở giao dịch */}
                {canManageAgency && (
                  <button
                    type="button"
                    onClick={() => onLockModal(agency)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isLocked
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                    title={isLocked ? 'Mở khóa giao dịch' : 'Khóa giao dịch (Rủi ro nợ)'}
                  >
                    {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                  </button>
                )}

                {/* Dừng giao dịch */}
                {canManageAgency && (
                  <button
                    type="button"
                    onClick={() => onSuspendModal(agency)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isSuspended
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                    title={isSuspended ? 'Mở lại giao dịch' : 'Dừng giao dịch'}
                  >
                    <ShieldAlert size={13} />
                  </button>
                )}

              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
