import React, { useState, useMemo } from 'react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import type { CreateSupplierPayload } from '../../types/supplier';
import { createSupplier } from '../../services/supplierApi';
import {
  Truck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  FileText,
  User,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from '../../components/common/Icons';
import { AddressPicker } from '../../components/common/AddressPicker';

// Các mẫu điều khoản thanh toán phổ biến trong thương mại & kho vận
const QUICK_PAYMENT_TERMS = [
  'Thanh toán ngay khi nhận hàng (COD)',
  'Thanh toán sau 30 ngày kể từ ngày nhận hàng (Net 30)',
  'Thanh toán sau 15 ngày kể từ ngày nhận hàng (Net 15)',
  'Thanh toán trước 50%, 50% còn lại trong 15 ngày sau khi nhập kho',
  'Gối đầu theo từng đợt giao hàng'
];

export const CreateSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, user, showToast } = useAuth();

  // Quyền quản lý nhà cung cấp: Chỉ ADMIN và Quản lý kho (WH_MANAGER).
  const canManage = useMemo(() => {
    if (!currentRole) return false;
    const r = currentRole.toUpperCase();
    if (r.includes('ADMIN') || r.includes('WH_MANAGER')) {
      return true;
    }
    return (user?.roles || []).some((userRole) => {
      const ur = String(userRole).toUpperCase();
      return ur.includes('ADMIN') || ur.includes('WH_MANAGER');
    });
  }, [currentRole, user]);

  const [formData, setFormData] = useState<CreateSupplierPayload>({
    code: '',
    name: '',
    taxCode: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: '',
    note: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // Mã NCC
    const codeRegex = /^[A-Za-z0-9_-]{2,30}$/;
    if (!formData.code.trim()) {
      errs.code = 'Mã nhà cung cấp không được để trống';
    } else if (!codeRegex.test(formData.code.trim())) {
      errs.code = 'Mã từ 2–30 ký tự (chữ cái, chữ số, dấu - hoặc _, không dấu cách)';
    }

    // Tên nhà cung cấp
    if (!formData.name.trim()) {
      errs.name = 'Tên nhà cung cấp không được để trống';
    } else if (formData.name.trim().length > 200) {
      errs.name = 'Tên nhà cung cấp tối đa 200 ký tự';
    }

    // Mã số thuế (Chuẩn VN: 10 chữ số hoặc 10 chữ số kèm -3 chữ số chi nhánh)
    const taxRegex = /^[0-9]{10}(-[0-9]{3})?$/;
    if (!formData.taxCode.trim()) {
      errs.taxCode = 'Mã số thuế không được để trống';
    } else if (!taxRegex.test(formData.taxCode.trim())) {
      errs.taxCode = 'Mã số thuế gồm 10 chữ số hoặc 10 số kèm -3 số chi nhánh (vd: 0300588569 hoặc 0100100989-001)';
    }

    // Số điện thoại
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^0[0-9]{9,10}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errs.phone = 'Số điện thoại gồm 10–11 chữ số và bắt đầu bằng số 0';
      }
    }

    // Email
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Địa chỉ email không đúng định dạng';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const payload: CreateSupplierPayload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        taxCode: formData.taxCode.trim(),
        contactName: formData.contactName?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        paymentTerms: formData.paymentTerms?.trim() || undefined,
        note: formData.note?.trim() || undefined
      };

      const created = await createSupplier(payload);
      showToast?.(
        'Tạo đối tác thành công',
        `Đã thêm đối tác ${created.name} (${created.code}) vào danh mục nhà cung cấp!`,
        'success'
      );
      navigate('/suppliers');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thông tin đối tác';
      setApiError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Ánh xạ lỗi trùng lặp từ backend trực tiếp vào ô input tương ứng
      const lower = msg.toLowerCase();
      if (lower.includes('thuế') || lower.includes('taxcode')) {
        setErrors((prev) => ({ ...prev, taxCode: msg }));
      } else if (lower.includes('mã nhà cung cấp') || lower.includes('code')) {
        setErrors((prev) => ({ ...prev, code: msg }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 p-8 text-center animate-in fade-in">
        <AlertTriangle size={36} className="text-amber-500" />
        <h3 className="text-base font-bold text-gray-800">Quyền truy cập bị giới hạn</h3>
        <p className="text-xs text-gray-500 max-w-md">
          Chỉ Quản trị viên hệ thống (Admin) và Quản lý kho (WH_Manager) mới có quyền tạo mới nhà cung cấp đối tác.
        </p>
        <button
          type="button"
          onClick={() => navigate('/suppliers')}
          className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
        >
          Quay lại danh mục nhà cung cấp
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 antialiased pb-24 animate-in fade-in duration-200">
      {/* 1. THANH QUAY LẠI & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/suppliers')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="supplier-create-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh mục nhà cung cấp</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Sản phẩm & Kho / Danh mục nhà cung cấp / Thêm mới đối tác cung ứng
          </span>
        </div>
      </div>

      {/* 2. BANNER TIÊU ĐỀ TRANG */}
      <div className="bg-gradient-to-r from-orange-500 via-[#FF6A00] to-[#EE4D2D] rounded-2xl p-5 sm:p-6 text-white shadow-md shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25">
            <Truck size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Thêm Mới Đối Tác Cung Ứng</h1>
            <p className="text-xs sm:text-sm text-orange-100 mt-0.5">
              Nguồn hàng chuẩn để gắn vào phiếu nhập kho truy nguyên nguồn gốc lô hàng
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-xs text-xs font-semibold border border-white/20 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>Chuẩn hóa chuỗi cung ứng ERP</span>
          </span>
        </div>
      </div>

      {/* 3. THÔNG BÁO LỖI NẾU CÓ */}
      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3 shadow-2xs animate-in slide-in-from-top-2">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-red-800">Không thể lưu thông tin đối tác:</strong>
            <span>{apiError}</span>
          </div>
        </div>
      )}

      {/* 4. FORM NHẬP LIỆU CHÍNH */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* KHỐI 1: THÔNG TIN ĐỊNH DANH & PHÁP LÝ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Thông Tin Định Danh & Pháp Lý</h3>
                <p className="text-[11px] text-gray-500">Mã đối tác, tên doanh nghiệp và mã số thuế bắt buộc</p>
              </div>
            </div>
            <span className="text-[11px] text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md font-medium">
              * Bắt buộc
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Mã nhà cung cấp */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã nhà cung cấp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: NCC-VNM"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[42px] ${
                      errors.code ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.code ? (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{errors.code}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">Định danh duy nhất (VD: NCC-VNM, NCC-HABECO)</p>
                )}
              </div>

              {/* Tên nhà cung cấp */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên nhà cung cấp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Công ty Cổ phần Sữa Việt Nam"
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[42px] ${
                      errors.name ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.name ? (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">Tên pháp nhân đầy đủ ghi trên hợp đồng & hóa đơn</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1">
              {/* Mã số thuế */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã số thuế (MST) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.taxCode}
                    onChange={(e) => setFormData({ ...formData, taxCode: e.target.value.trim() })}
                    placeholder="VD: 0300588569 hoặc 0100100989-001"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[42px] ${
                      errors.taxCode ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.taxCode ? (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{errors.taxCode}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">Chuẩn 10 số hoặc 10 số kèm 3 số chi nhánh</p>
                )}
              </div>

              {/* Điều khoản thanh toán */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Điều khoản thanh toán
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    placeholder="VD: Thanh toán sau 30 ngày kể từ ngày nhận hàng"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[42px]"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">Căn cứ hạch toán công nợ và đối soát hóa đơn</p>

                {/* Gợi ý chọn nhanh điều khoản thanh toán */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">Chọn nhanh:</span>
                  {QUICK_PAYMENT_TERMS.slice(0, 3).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paymentTerms: term }))}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-gray-200 text-gray-600 transition cursor-pointer"
                    >
                      {term.length > 28 ? term.slice(0, 28) + '...' : term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 2: THÔNG TIN LIÊN HỆ & ĐẠI DIỆN */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Người Liên Hệ & Đầu Mối Giao Dịch</h3>
              <p className="text-[11px] text-gray-500">Đầu mối làm việc về đơn đặt hàng, giao nhận và công nợ</p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Người liên hệ */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Người liên hệ đại diện
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="VD: Nguyễn Văn A (P. Kinh Doanh)"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[42px]"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">Họ tên, chức vụ hoặc bộ phận phụ trách</p>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Số điện thoại liên hệ
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone size={15} />
                  </div>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.trim() })}
                    placeholder="VD: 02854155555"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs font-mono rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[42px] ${
                      errors.phone ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.phone ? (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{errors.phone}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">Số di động hoặc số bàn bắt đầu bằng số 0</p>
                )}
              </div>

              {/* Email liên hệ */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email liên hệ
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                    placeholder="VD: contact@vinamilk.com.vn"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[42px] ${
                      errors.email ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.email ? (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">Nhận đơn đặt hàng, biên bản bàn giao, hóa đơn</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 3: ĐỊA CHỈ TRỤ SỞ / KHO HÀNG & GHI CHÚ NỘI BỘ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Địa Chỉ Kho Hàng / Trụ Sở & Ghi Chú</h3>
              <p className="text-[11px] text-gray-500">Địa chỉ điều động xe vận tải giao nhận hàng hóa và cam kết chất lượng</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Địa chỉ trụ sở / kho nguồn */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={15} className="text-orange-500" />
                <span>Địa chỉ kho / trụ sở nhà cung cấp</span>
              </label>
              <div className="bg-gray-50/40 p-3.5 rounded-xl border border-gray-200">
                <AddressPicker
                  compact={false}
                  value={formData.address || ''}
                  onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))}
                  streetPlaceholder="VD: Số 10 Tân Trào, P. Tân Phú"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Lựa chọn Tỉnh/Thành phố, Quận/Huyện/Xã và nhập số nhà tên đường để đồng bộ hệ thống logistics
              </p>
            </div>

            {/* Ghi chú nội bộ */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <FileText size={15} className="text-gray-400" />
                <span>Ghi chú nội bộ</span>
              </label>
              <textarea
                rows={3}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Ghi chú về năng lực cung ứng, chất lượng hàng hóa, cam kết đổi trả lô lỗi..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all resize-y"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Thông tin nội bộ giúp thủ kho & nhân viên mua hàng lưu ý khi lập phiếu nhập
              </p>
            </div>
          </div>
        </div>

        {/* 5. KHU VỰC NÚT THAO TÁC (ACTION BUTTONS) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-orange-500" />
            <span>Đối tác sau khi lưu có thể gắn ngay vào các phiếu nhập kho mới</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[42px]"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="btn-submit-create-supplier"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 via-[#FF6A00] to-[#EE4D2D] hover:from-orange-600 hover:to-[#EE4D2D] active:from-orange-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 min-h-[42px]"
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Đang lưu thông tin...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Lưu đối tác cung ứng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
