import React, { useState, useEffect } from 'react';
import type { Agency, DeliveryPoint } from '../../types/agency';
import { fetchAgencies, fetchDeliveryPoints } from '../../services/agencyApi';
import { formatCurrencyVND } from '../../services/orderService';
import {
  Building2,
  Truck,
  Calendar,
  Lock,
  AlertTriangle,
  MapPin,
  Phone,
  FileText,
  BadgeDollarSign
} from '../common/Icons';

interface OrderHeaderCardProps {
  selectedAgency: Agency | null;
  onSelectAgency: (agency: Agency) => void;
  selectedDeliveryPoint: DeliveryPoint | null;
  onSelectDeliveryPoint: (point: DeliveryPoint) => void;
  expectedDeliveryDate: string;
  onChangeExpectedDeliveryDate: (date: string) => void;
  orderNote: string;
  onChangeOrderNote: (note: string) => void;
}

export const OrderHeaderCard: React.FC<OrderHeaderCardProps> = ({
  selectedAgency,
  onSelectAgency,
  selectedDeliveryPoint,
  onSelectDeliveryPoint,
  expectedDeliveryDate,
  onChangeExpectedDeliveryDate,
  orderNote,
  onChangeOrderNote
}) => {
  const [agenciesList, setAgenciesList] = useState<Agency[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState<boolean>(false);
  const [agencySearchText, setAgencySearchText] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Tải danh sách đại lý khi mount
  useEffect(() => {
    fetchAgencies({ size: 100 })
      .then((res) => {
        setAgenciesList(res.content);
      })
      .catch((err) => console.error('Lỗi tải đại lý:', err));
  }, []);

  // Tải danh sách điểm giao hàng của đại lý được chọn (S3-04)
  useEffect(() => {
    if (!selectedAgency) {
      setDeliveryPoints([]);
      return;
    }

    setLoadingPoints(true);
    fetchDeliveryPoints(selectedAgency.id)
      .then((points: DeliveryPoint[]) => {
        setDeliveryPoints(points);
        // Tự động chọn điểm giao mặc định (isDefault) hoặc điểm đầu tiên
        if (points.length > 0) {
          const defaultPt = points.find((p: DeliveryPoint) => p.isDefault) || points[0];
          onSelectDeliveryPoint(defaultPt);
        }
      })
      .catch((err: unknown) => console.error('Lỗi tải điểm giao:', err))
      .finally(() => setLoadingPoints(false));
  }, [selectedAgency?.id]);

  // Lọc đại lý theo từ khóa
  const filteredAgencies = agenciesList.filter((a) => {
    if (!agencySearchText.trim()) return true;
    const q = agencySearchText.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q))
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F85606] flex items-center justify-center font-bold">
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
              1. Thông Tin Khách Hàng & Điểm Giao
            </h2>
            <p className="text-[11px] text-gray-500">
              Chọn đại lý đặt hàng và kho nhận hàng
            </p>
          </div>
        </div>

        {selectedAgency && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
            {selectedAgency.customerGroupName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CHỌN ĐẠI LÝ */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs font-bold text-gray-700">
            Đại Lý Đặt Hàng <span className="text-red-500">*</span>
          </label>

          {selectedAgency ? (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {selectedAgency.code}
                    </span>
                    <strong className="text-xs text-gray-900">
                      {selectedAgency.name}
                    </strong>
                  </div>
                  <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>MST: {selectedAgency.taxCode}</span>
                    {selectedAgency.phone && (
                      <span className="flex items-center gap-0.5">
                        <Phone size={10} /> {selectedAgency.phone}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(true);
                    setAgencySearchText('');
                  }}
                  className="px-2.5 py-1 text-[11px] rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-[#F85606] hover:border-orange-200 transition-colors font-medium shrink-0"
                >
                  Đổi đại lý
                </button>
              </div>

              {/* Thông tin hạn mức và bảng giá tự động */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/70 text-[11px]">
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <BadgeDollarSign size={12} className="text-[#F85606]" />
                  Bảng giá: <strong>{selectedAgency.pricingTier.name}</strong>
                </span>
                <span className="text-gray-500">
                  Hạn mức: <strong className="text-gray-700">{formatCurrencyVND(selectedAgency.creditLimit)}</strong>
                </span>
              </div>

              {/* CẢNH BÁO NẾU ĐẠI LÝ BỊ KHÓA GIAO DỊCH (S3-07 / Description 1) */}
              {selectedAgency.transactionLocked && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                  <Lock size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-rose-900">
                      Đại lý đang bị khóa giao dịch!
                    </strong>
                    <span className="text-[11px] leading-tight block mt-0.5">
                      Lý do: {selectedAgency.transactionLockReason || 'Có rủi ro công nợ quá hạn'}.
                      Hệ thống nghiêm cấm tạo đơn mới cho đại lý này.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Nhập mã, tên hoặc SĐT đại lý..."
                value={agencySearchText}
                onChange={(e) => {
                  setAgencySearchText(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition"
              />
            </div>
          )}

          {/* DROPDOWN CHỌN ĐẠI LÝ */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs">
              <div className="p-2 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                <span className="text-[11px] text-gray-500 font-medium">
                  Tìm thấy {filteredAgencies.length} đại lý
                </span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-[11px]"
                >
                  ✕ Đóng
                </button>
              </div>

              {filteredAgencies.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Không tìm thấy đại lý phù hợp
                </div>
              ) : (
                filteredAgencies.map((agency) => (
                  <div
                    key={agency.id}
                    onClick={() => {
                      onSelectAgency(agency);
                      setIsDropdownOpen(false);
                      setAgencySearchText('');
                    }}
                    className={`p-2.5 hover:bg-orange-50/70 cursor-pointer transition flex items-center justify-between gap-2 ${
                      agency.transactionLocked ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-gray-700">
                          {agency.code}
                        </span>
                        <strong className="text-gray-900 font-medium">
                          {agency.name}
                        </strong>
                        {agency.transactionLocked && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5">
                            <Lock size={9} /> Bị khóa
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>{agency.customerGroupName}</span>
                        <span>•</span>
                        <span>{agency.regionName}</span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] shrink-0">
                      <span className="font-mono text-gray-600 block">
                        Nợ: {formatCurrencyVND(agency.totalDebt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* CHỌN ĐIỂM GIAO HÀNG (S3-04) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Truck size={13} className="text-[#F85606]" />
              Điểm Giao Hàng <span className="text-red-500">*</span>
            </span>
            {selectedAgency && (
              <span className="text-[10px] text-gray-400 font-normal">
                ({deliveryPoints.length} điểm của khách)
              </span>
            )}
          </label>

          {!selectedAgency ? (
            <div className="h-10 px-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center text-xs text-gray-400">
              Vui lòng chọn đại lý trước
            </div>
          ) : loadingPoints ? (
            <div className="h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center text-xs text-gray-500 animate-pulse">
              Đang tải danh sách kho giao hàng...
            </div>
          ) : deliveryPoints.length === 0 ? (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
              <AlertTriangle size={14} className="shrink-0 text-amber-600" />
              <span>Đại lý chưa có điểm giao! Sử dụng địa chỉ chính tại hồ sơ.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <select
                value={selectedDeliveryPoint?.id || ''}
                onChange={(e) => {
                  const pt = deliveryPoints.find((p) => p.id === e.target.value);
                  if (pt) onSelectDeliveryPoint(pt);
                }}
                className="w-full h-10 px-3 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none font-medium text-gray-800"
              >
                {deliveryPoints.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name} {pt.isDefault ? '⭐ [Kho mặc định]' : ''} — {pt.address}
                  </option>
                ))}
              </select>

              {selectedDeliveryPoint && (
                <div className="p-2 bg-gray-50 rounded-lg text-[11px] text-gray-600 space-y-0.5 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-700">
                    <MapPin size={11} className="text-blue-500 shrink-0" />
                    <span className="truncate">{selectedDeliveryPoint.address}</span>
                  </div>
                  {selectedDeliveryPoint.contactPerson && (
                    <div className="flex items-center justify-between text-gray-500">
                      <span>Người nhận: <strong>{selectedDeliveryPoint.contactPerson}</strong></span>
                      {selectedDeliveryPoint.phone && <span>SĐT: {selectedDeliveryPoint.phone}</span>}
                    </div>
                  )}
                  {selectedDeliveryPoint.routeNotes && (
                    <p className="text-[10px] text-amber-700 italic">
                      Lưu ý đường đi: {selectedDeliveryPoint.routeNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* HÀNG 2: NGÀY GIAO MONG MUỐN & GHI CHÚ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <Calendar size={13} className="text-[#F85606]" />
            Ngày Giao Hàng Mong Muốn <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            min={todayStr}
            value={expectedDeliveryDate}
            onChange={(e) => onChangeExpectedDeliveryDate(e.target.value)}
            className="w-full h-10 px-3 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
            required
          />
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            Kho cần tối thiểu 2-4 giờ để chuẩn bị xuất hàng theo nguyên tắc FEFO.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <FileText size={13} className="text-gray-500" />
            Ghi Chú Đơn Hàng (Tuỳ chọn)
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Giao trước 11h trưa, mang hoá đơn đỏ VAT..."
            value={orderNote}
            onChange={(e) => onChangeOrderNote(e.target.value)}
            className="w-full h-10 px-3 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
          />
        </div>
      </div>
    </div>
  );
};
