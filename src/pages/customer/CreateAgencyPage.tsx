import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import type {
  CreateAgencyPayload,
  CustomerGroupId,
  SalesRepOption,
  RegionOption,
  PriceListOption
} from '../../types/agency';
import {
  CUSTOMER_GROUP_OPTIONS,
  fetchAgencyFormOptions,
  getRealPriceListForGroup,
  createAgency,
  type PortalUserOption
} from '../../services/agencyApi';
import {
  Building2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Info,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Users,
  FileText,
  Tag,
  ShieldCheck,
  RefreshCw
} from '../../components/common/Icons';
import { AddressPicker } from '../../components/common/AddressPicker';
import { SearchSelect } from '../../components/common/SearchSelect';

export const CreateAgencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, showToast } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  // Phân quyền: chỉ Admin, Quản lý kinh doanh, Kế toán
  const canManageAgency =
    currentRole === 'ROLE_ADMIN' ||
    currentRole === 'ROLE_SALES_MANAGER' ||
    currentRole === 'ROLE_ACCOUNTANT';

  // Dữ liệu danh mục lấy từ Backend
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUserOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Các trường form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupId>('TIER_1');
  const [regionId, setRegionId] = useState('');
  const [assignedRepId, setAssignedRepId] = useState('');
  const [portalUserId, setPortalUserId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(50000000);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoadingOptions(true);
    fetchAgencyFormOptions(true)
      .then((options) => {
        if (ignore) return;
        setRegions(options.regions);
        setSalesReps(options.salesReps);
        setPriceLists(options.priceLists || []);
        setPortalUsers(options.portalUsers || []);

        // Mặc định chọn khu vực và người phụ trách đầu tiên
        if (options.regions.length > 0) {
          setRegionId((prev) => prev || options.regions[0].id);
        }
        if (options.salesReps.length > 0) {
          setAssignedRepId((prev) => prev || options.salesReps[0].id);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Không thể tải danh mục khu vực và nhân viên kinh doanh. Vui lòng thử lại!');
        }
      })
      .finally(() => {
        if (!ignore) setLoadingOptions(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Bảng giá hiện thời được ánh xạ trực tiếp từ Nhóm khách hàng đã chọn
  const activePricingTier = useMemo(() => {
    return getRealPriceListForGroup(customerGroup, priceLists);
  }, [customerGroup, priceLists]);

  const triggerError = (msg: string) => {
    setError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      triggerError('Vui lòng nhập mã đại lý (ví dụ: DL-HN-005)!');
      return;
    }

    if (!taxCode.trim()) {
      triggerError('Vui lòng nhập mã số thuế của đại lý!');
      return;
    }

    if (!name.trim()) {
      triggerError('Vui lòng nhập tên doanh nghiệp / đại lý!');
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

    const payload: CreateAgencyPayload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      taxCode: taxCode.trim(),
      customerGroup,
      regionId,
      assignedRepId,
      phone: cleanPhone,
      email: email.trim(),
      address: address.trim(),
      creditLimit,
      portalUserId: portalUserId ? Number(portalUserId) : null
    };

    setSubmitting(true);
    try {
      const res = await createAgency(payload);
      if (res.success) {
        showToast('Thành công', res.message || 'Khai báo hồ sơ đại lý mới thành công!', 'success');
        navigate('/customers');
      } else {
        triggerError(res.message || 'Không thể tạo mới hồ sơ đại lý.');
      }
    } catch {
      triggerError('Lỗi kết nối máy chủ khi tạo hồ sơ đại lý, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManageAgency) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <AlertTriangle size={36} className="text-amber-500" />
        <h3 className="text-base font-bold text-gray-800">Quyền truy cập bị giới hạn</h3>
        <p className="text-xs text-gray-500 max-w-md">
          Chỉ Quản trị viên, Quản lý kinh doanh và Kế toán mới có quyền khai báo hồ sơ đại lý mới.
        </p>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
        >
          Quay lại danh sách đại lý
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 antialiased pb-20 animate-in fade-in duration-200">
      {/* 1. THANH QUAY LẠI & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="agency-create-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách đại lý</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Bán hàng / Hồ sơ đại lý / Khai báo hồ sơ đại lý mới
          </span>
        </div>
      </div>

      {/* 2. BANNER TIÊU ĐỀ TRANG */}
      <div className="bg-gradient-to-r from-orange-500 via-[#FF6A00] to-[#EE4D2D] rounded-2xl p-5 sm:p-6 text-white shadow-md shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25">
            <Building2 size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Khai Báo Hồ Sơ Đại Lý Mới</h1>
            <p className="text-xs sm:text-sm text-orange-100 mt-0.5">
              Thiết lập thông tin định danh, nhóm khách hàng, cơ chế bảng giá và phân công địa bàn quản lý
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-xs text-xs font-semibold border border-white/20 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>Chuẩn hóa dữ liệu ERP</span>
          </span>
        </div>
      </div>

      {/* 3. THÔNG BÁO LỖI NẾU CÓ */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3 shadow-2xs animate-in slide-in-from-top-2">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-red-800">Không thể lưu hồ sơ:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 4. FORM NHẬP LIỆU CHÍNH */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION 1: THÔNG TIN ĐỊNH DANH & PHÁP LÝ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FileText size={16} className="text-[#F85606]" />
                <span>Thông Tin Định Danh & Pháp Lý</span>
              </h2>
              <p className="text-[11px] text-gray-500">Mã định danh duy nhất và thông tin hoá đơn tài chính</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mã đại lý */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mã Đại Lý <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="VD: DL-HN-005"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none font-mono font-bold transition-all shadow-2xs"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Mã định danh duy nhất trên toàn hệ thống, tự động viết hoa (VD: DL-MB-001)
                </span>
              </div>

              {/* Mã số thuế */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mã Số Thuế (MST) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value.trim())}
                  placeholder="VD: 0108889999"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none font-mono transition-all shadow-2xs"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Phục vụ xuất hoá đơn điện tử, đối soát kế toán và hạn mức công nợ
                </span>
              </div>
            </div>

            {/* Tên doanh nghiệp / đại lý */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tên Doanh Nghiệp / Tên Đại Lý <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Công Ty TNHH Phân Phối Thương Mại Á Châu"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none font-medium transition-all shadow-2xs"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Tên đại lý đầy đủ xuất hiện trên đơn đặt hàng và hợp đồng thương mại
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: PHÂN NHÓM & BẢNG GIÁ ÁP DỤNG TỰ ĐỘNG */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Tag size={16} className="text-[#F85606]" />
                <span>Phân Nhóm Khách Hàng & Cơ Chế Bảng Giá</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Tự động ánh xạ bảng giá bán buôn / bán lẻ theo cấp đại lý đã được phê duyệt
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Chọn Nhóm KH */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Chọn Nhóm Khách Hàng <span className="text-red-500">*</span>
                  </label>
                  <SearchSelect
                    value={customerGroup}
                    onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupId)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-orange-200 focus:border-[#F85606] outline-none font-semibold text-gray-800"
                  >
                    {CUSTOMER_GROUP_OPTIONS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </SearchSelect>
                </div>

                {/* Bảng giá tự động ánh xạ */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Bảng Giá Áp Dụng Tự Động:
                  </label>
                  <div
                    className="px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs font-bold gap-2 shadow-2xs"
                    style={{
                      backgroundColor: activePricingTier.badgeBg,
                      color: activePricingTier.badgeColor,
                      borderColor: 'currentColor'
                    }}
                    title={`${activePricingTier.code} - ${activePricingTier.name}`}
                  >
                    <span className="truncate">{activePricingTier.name}</span>
                    {activePricingTier.code && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/95 text-[11px] font-mono tracking-wider shrink-0 border border-black/10">
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
          </div>
        </div>

        {/* SECTION 3: ĐỊA BÀN & NHÂN VIÊN KINH DOANH PHỤ TRÁCH */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Users size={16} className="text-[#F85606]" />
                <span>Phân Công Địa Bàn & Nhân Viên Kinh Doanh (Sales Rep)</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Xác định vùng thị trường và phân công nhân viên phụ trách trực tiếp
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Khu vực / Địa bàn */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Khu Vực / Địa Bàn <span className="text-red-500">*</span>
                </label>
                <SearchSelect
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] outline-none shadow-2xs font-medium"
                >
                  {!regionId && <option value="">— Chọn khu vực —</option>}
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SearchSelect>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Khu vực địa lý dùng để gom đơn, tuyến giao hàng và kho xuất phục vụ
                </span>
              </div>

              {/* Người phụ trách (Sales Rep) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Người Phụ Trách (Sales Rep) <span className="text-red-500">*</span>
                </label>
                <SearchSelect
                  value={assignedRepId}
                  onChange={(e) => setAssignedRepId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] outline-none font-medium shadow-2xs"
                >
                  {!assignedRepId && <option value="">— Chọn người phụ trách —</option>}
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.fullName} {rep.phone ? `(${rep.phone})` : ''}
                    </option>
                  ))}
                </SearchSelect>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Nhân viên phụ trách chăm sóc, nhận đơn và quản lý công nợ khách hàng
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: TÀI KHOẢN CỔNG B2B & THÔNG TIN LIÊN HỆ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Phone size={16} className="text-[#F85606]" />
                <span>Cổng Đặt Hàng Đại Lý B2B & Thông Tin Liên Hệ</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Cấp quyền tự đặt hàng trên cổng trực tuyến và thông tin đối soát giao dịch
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* S4-10: Tài khoản Cổng Đại Lý B2B (ROLE_CUSTOMER) */}
            <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/40 space-y-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                <span>Tài Khoản Đăng Nhập Cổng Đại Lý (B2B Portal)</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#F85606]">
                  ROLE_CUSTOMER
                </span>
              </label>
              <SearchSelect
                value={portalUserId}
                onChange={(e) => setPortalUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] outline-none font-medium shadow-2xs"
              >
                <option value="">— Không gắn tài khoản (hoặc tạo sau) —</option>
                {portalUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} (@{u.username})
                  </option>
                ))}
              </SearchSelect>
              <p className="text-[11px] text-gray-500">
                Chọn tài khoản vai trò Đại lý để cấp quyền đăng nhập Cổng đặt hàng trực tuyến B2B (<code>/portal</code>).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Điện thoại */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" />
                  <span>Số Điện Thoại Liên Hệ</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="VD: 0912345678"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none font-mono shadow-2xs"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Định dạng 10 số (03, 05, 07, 08, 09) dùng nhận SMS xác nhận đơn hàng
                </span>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" />
                  <span>Email Nhận Hoá Đơn & Đối Soát</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: ketoan@daily.vn"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none shadow-2xs"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Địa chỉ email kế toán đại lý dùng nhận biên bản đối soát và hoá đơn
                </span>
              </div>
            </div>

            {/* Địa chỉ giao hàng / trụ sở */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400" />
                <span>Địa Chỉ Trụ Sở & Kho Nhận Hàng</span>
              </label>
              <AddressPicker
                value={address}
                onChange={(value) => setAddress(value)}
                streetPlaceholder="VD: Số 123 Đường Trần Phú, Cụm công nghiệp..."
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Địa chỉ giao hàng mặc định khi nhân viên kinh doanh lên đơn bán hàng
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: THIẾT LẬP HẠN MỨC CÔNG NỢ BAN ĐẦU */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
              5
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CreditCard size={16} className="text-[#F85606]" />
                <span>Hạn Mức Công Nợ Cấp Cho Đại Lý (VND)</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Giá trị nợ tối đa cho phép đại lý mua gối đầu trước khi hệ thống chặn xuất đơn
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="max-w-md">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Số Tiền Hạn Mức Ban Đầu (VND)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={creditLimit ? creditLimit.toLocaleString('vi-VN') : ''}
                  onChange={(e) => setCreditLimit(Number(e.target.value.replace(/\D/g, '').slice(0, 15)) || 0)}
                  placeholder="50.000.000"
                  className="w-full px-3.5 py-2.5 text-base rounded-xl border border-gray-200 bg-white focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none font-mono font-bold text-[#F85606] shadow-2xs"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  VNĐ
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mt-2 text-xs text-gray-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Quy đổi chữ:</span>
                  <strong className="text-gray-900 font-bold">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(creditLimit || 0)}
                  </strong>
                </div>
                <p className="text-[11px] text-gray-400">
                  • Sau khi tạo, việc thay đổi hạn mức nợ sẽ yêu cầu nhập lý do và lưu lại nhật ký đối soát kế toán.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* THANH NÚT HÀNH ĐỘNG CỐ ĐỊNH / CHÂN TRANG */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Info size={14} className="text-[#F85606]" />
            <span>Vui lòng kiểm tra kỹ Mã đại lý và MST trước khi bấm hoàn tất.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200 w-full sm:w-auto text-center"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#FF6A00] to-[#EE4D2D] hover:opacity-95 rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
              id="btn-submit-create-agency"
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Đang khởi tạo hồ sơ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Tạo Hồ Sơ Đại Lý</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
