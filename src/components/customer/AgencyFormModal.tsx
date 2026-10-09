import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type {
  Agency,
  CreateAgencyPayload,
  UpdateAgencyPayload,
  CustomerGroupId,
  SalesRepOption,
  RegionOption,
  PriceListOption
} from '../../types/agency';
import {
  CUSTOMER_GROUP_OPTIONS,
  fetchAgencyFormOptions,
  getRealPriceListForGroup
} from '../../services/agencyApi';
import { X, Building2, AlertTriangle, CheckCircle2, Info } from '../common/Icons';
import { AddressPicker } from '../common/AddressPicker';
import { useAuth } from '../../contexts/AuthContext';

interface AgencyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAgencyPayload | UpdateAgencyPayload) => Promise<{ success: boolean; message: string }>;
  initialData?: Agency | null;
}

export const AgencyFormModal: React.FC<AgencyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  const isEdit = Boolean(initialData);
  // Đổi người phụ trách chỉ Admin, QL kinh doanh được làm (Backend cũng chặn); Kế toán chỉ xem
  const { currentRole } = useAuth();
  const canChangeSalesRep = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER';
  const formRef = useRef<HTMLFormElement>(null);

  // Khu vực + nhân viên kinh doanh + bảng giá lấy từ Backend (id thật trong DB)
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupId>('TIER_1');
  const [regionId, setRegionId] = useState('');
  const [assignedRepId, setAssignedRepId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(50000000);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAgencyFormOptions(true)
        .then((options) => {
          setRegions(options.regions);
          setSalesReps(options.salesReps);
          setPriceLists(options.priceLists || []);
          // Chỉ khi THÊM MỚI mới chọn sẵn khu vực / người phụ trách đầu tiên.
          // Sửa đại lý chưa có người phụ trách thì giữ trống, không tự gán người khác.
          if (!initialData) {
            setRegionId((prev) => prev || options.regions[0]?.id || '');
            setAssignedRepId((prev) => prev || options.salesReps[0]?.id || '');
          }
        })
        .catch(() => setError('Không tải được danh mục khu vực và nhân viên kinh doanh. Vui lòng thử lại!'));
    }
  }, [isOpen, initialData]);

  // Bảng giá hiện thời được ánh xạ trực tiếp từ Nhóm khách hàng đã chọn (dữ liệu thật trong hệ thống)
  const activePricingTier = useMemo(() => {
    const calculated = getRealPriceListForGroup(customerGroup, priceLists);
    if (calculated.id) return calculated;
    if (initialData?.customerGroup === customerGroup && initialData?.pricingTier?.id) {
      return initialData.pricingTier;
    }
    return calculated;
  }, [customerGroup, priceLists, initialData]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (initialData) {
      setCode(initialData.code);
      setName(initialData.name);
      setTaxCode(initialData.taxCode);
      setCustomerGroup(initialData.customerGroup);
      setRegionId(initialData.regionId);
      setAssignedRepId(initialData.assignedRepId);
      setPhone(initialData.phone || '');
      setEmail(initialData.email || '');
      setAddress(initialData.address || '');
      // Hạn mức 0 là giá trị thật (chưa cấp nợ), không được tự đổi thành 50 triệu
      setCreditLimit(initialData.creditLimit ?? 0);
    } else {
      setCode('');
      setName('');
      setTaxCode('');
      setCustomerGroup('TIER_1');
      setRegionId(regions[0]?.id || '');
      setAssignedRepId(salesReps[0]?.id || '');
      setPhone('');
      setEmail('');
      setAddress('');
      setCreditLimit(50000000);
    }
    setError(null);
  }, [initialData, isOpen]);

  // Tự động cuộn lên đầu khi có lỗi
  const triggerError = (msg: string) => {
    setError(msg);
    formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && !code.trim()) {
      triggerError('Vui lòng nhập mã đại lý (ví dụ: DL-HN-005)!');
      return;
    }

    if (!taxCode.trim()) {
      triggerError('Vui lòng nhập mã số thuế của đại lý!');
      return;
    }

    if (!name.trim()) {
      triggerError('Vui lòng nhập tên đại lý!');
      return;
    }

    if (!regionId) {
      triggerError('Vui lòng chọn khu vực / địa bàn của đại lý!');
      return;
    }

    // Kiểm tra định dạng số điện thoại 10 số nếu có nhập
    const cleanPhone = phone.trim();
    if (cleanPhone && (!/^\d{10}$/.test(cleanPhone) || !/^0(3|5|7|8|9)/.test(cleanPhone))) {
      triggerError('Số điện thoại không hợp lệ (phải đủ 10 chữ số và bắt đầu bằng 03, 05, 07, 08, 09)!');
      return;
    }

    // Kiểm tra định dạng email
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      triggerError('Địa chỉ email không đúng định dạng!');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (isEdit) {
        res = await onSubmit({
          changeSalesRep: canChangeSalesRep && assignedRepId !== (initialData?.assignedRepId || ''),
          name: name.trim(),
          taxCode: taxCode.trim(),
          customerGroup,
          regionId,
          assignedRepId,
          phone: cleanPhone,
          email: email.trim(),
          address: address.trim()
          // Không gửi hạn mức khi sửa: đổi hạn mức phải qua "Hạn mức công nợ" có lý do thật để ghi nhật ký
        });
      } else {
        res = await onSubmit({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          taxCode: taxCode.trim(),
          customerGroup,
          regionId,
          assignedRepId,
          phone: cleanPhone,
          email: email.trim(),
          address: address.trim(),
          creditLimit
        });
      }

      if (res.success) {
        onClose();
      } else {
        triggerError(res.message);
      }
    } catch {
      triggerError('Lỗi khi lưu hồ sơ đại lý, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render qua createPortal để phủ lên toàn bộ màn hình (Taskbar, Sidebar, Topbar)
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? 'Cập Nhật Hồ Sơ Đại Lý' : 'Khai Báo Hồ Sơ Đại Lý Mới'}
              </h2>

            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* POP-UP THÔNG BÁO LỖI NỔI BẬT (LUÔN CỐ ĐỊNH, KHÔNG BỊ TRÔI KHI CUỘN) */}
        {error && (
          <div className="absolute top-16 left-4 right-4 z-40 animate-in slide-in-from-top-3 duration-200">
            <div className="p-3.5 bg-red-600 text-white rounded-xl shadow-xl flex items-start justify-between gap-3 border border-red-500">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-white shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-200 block">
                    Cảnh Báo Lỗi Nhập Liệu
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5 leading-snug">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="w-6 h-6 rounded-md bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title="Đóng thông báo lỗi"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Nội dung form */}
        <form ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mã đại lý */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Mã Đại Lý <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={isEdit}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                placeholder="VD: DL-HN-005"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${isEdit
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100'
                  } outline-none font-mono font-semibold transition-all`}
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                {isEdit ? 'Mã đại lý là duy nhất, không thể thay đổi sau khi tạo' : 'Mã định danh duy nhất toàn hệ thống'}
              </span>
            </div>

            {/* Mã số thuế */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Mã Số Thuế (MST) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value.trim())}
                placeholder="VD: 0108889999"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition-all font-mono"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">Phục vụ xuất hoá đơn và đối soát kế toán</span>
            </div>
          </div>

          {/* Tên đại lý */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Tên Doanh Nghiệp / Tên Đại Lý <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Công Ty TNHH Phân Phối Thương Mại Á Châu"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium"
            />
          </div>

          {/* KHỐI QUY TẮC: Nhóm khách hàng & Bảng giá tự động */}
          <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Chọn Nhóm KH */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Chọn Nhóm Khách Hàng:
                </label>
                <select
                  value={customerGroup}
                  onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupId)}
                  className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-orange-200 focus:border-[#F85606] outline-none font-medium"
                >
                  {CUSTOMER_GROUP_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bảng giá tự động ánh xạ */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Bảng Giá Áp Dụng Tự Động:
                </label>
                <div
                  className="px-3 py-2 rounded-lg border flex items-center justify-between text-xs font-bold gap-2"
                  style={{
                    backgroundColor: activePricingTier.badgeBg,
                    color: activePricingTier.badgeColor,
                    borderColor: 'currentColor'
                  }}
                  title={`${activePricingTier.code} - ${activePricingTier.name}`}
                >
                  <span className="truncate">{activePricingTier.name}</span>
                  {activePricingTier.code && (
                    <span className="px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-mono tracking-wider shrink-0 border border-black/10">
                      {activePricingTier.code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-600 italic flex items-center gap-1.5 pt-1">
              <Info size={14} className="text-[#F85606] shrink-0" />
              <span>{activePricingTier.description}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Khu vực / Địa bàn */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Khu Vực / Địa Bàn <span className="text-red-500">*</span>
              </label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] outline-none"
              >
                {!regionId && <option value="">— Chọn khu vực —</option>}
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nhân viên phụ trách (Sales Rep) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Người Phụ Trách (Sales Rep) <span className="text-red-500">*</span>
              </label>
              <select
                value={assignedRepId}
                onChange={(e) => setAssignedRepId(e.target.value)}
                disabled={isEdit && !canChangeSalesRep}
                title={isEdit && !canChangeSalesRep ? 'Chỉ Admin hoặc Quản lý kinh doanh được đổi người phụ trách' : undefined}
                className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] outline-none font-medium disabled:bg-gray-50 disabled:text-gray-500"
              >
                {!assignedRepId && (
                  <option value="">{isEdit ? '— Chưa gán người phụ trách —' : '— Chọn người phụ trách —'}</option>
                )}
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName} {rep.phone ? `(${rep.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Điện thoại */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Số Điện Thoại Liên Hệ
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="VD: 0912345678"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#F85606] outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Email Đối Soát
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: ketoan@daily.vn"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#F85606] outline-none"
              />
            </div>
          </div>

          {/* Địa chỉ giao hàng / trụ sở */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Địa Chỉ Trụ Sở & Kho Nhận Hàng
            </label>
            <AddressPicker
              value={address}
              onChange={(value) => setAddress(value)}
              streetPlaceholder="VD: Số 123 Trần Phú"
            />
          </div>

          {/* Hạn mức công nợ */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Hạn Mức Công Nợ Cấp Cho Đại Lý (VND)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={creditLimit ? creditLimit.toLocaleString('vi-VN') : ''}
              onChange={(e) => setCreditLimit(Number(e.target.value.replace(/\D/g, '').slice(0, 15)) || 0)}
              placeholder="50000000"
              disabled={isEdit}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#F85606] outline-none font-mono disabled:bg-gray-50 disabled:text-gray-500"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Quy đổi: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(creditLimit || 0)}
              {isEdit && ' • Muốn đổi hạn mức, dùng chức năng "Hạn mức công nợ" (bắt buộc nhập lý do).'}
            </span>
          </div>
        </form>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/70">
          {/* Cảnh báo lỗi ngay tại chân nút submit để khi kéo xuống vẫn thấy ngay */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold truncate">
                <AlertTriangle size={15} className="shrink-0 text-red-500" />
                <span className="truncate" title={error}>
                  {error}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#FF6A00] to-[#EE4D2D] hover:opacity-95 shadow-md shadow-orange-500/20 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isEdit ? 'Lưu Thay Đổi' : 'Tạo Hồ Sơ Đại Lý'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
