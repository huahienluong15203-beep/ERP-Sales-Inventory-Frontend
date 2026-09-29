import { useState, type FC } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_METADATA_MAP } from '../../types/user';
import { changePasswordApi } from '../../services/api';
import {
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  User
} from '../../components/common/Icons';

/* ──────────────────────────────────────────────────────────────────────────
   Trường nhập mật khẩu có nút ẩn/hiện (100% Tailwind CSS)
   ──────────────────────────────────────────────────────────────────────── */
const PasswordField: FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hint?: string;
}> = ({ id, label, value, onChange, disabled, hint }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="off"
          className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm
                     bg-white text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                     disabled:bg-gray-50 disabled:text-gray-400 transition"
          placeholder={`Nhập ${label.toLowerCase()}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition p-1"
          tabIndex={-1}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Kiểm tra độ mạnh mật khẩu (tối thiểu 8 ký tự, có chữ và số)
   ──────────────────────────────────────────────────────────────────────── */
type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';
function getStrength(pwd: string): StrengthLevel {
  if (!pwd) return 'empty';
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  if (pwd.length < 8 || !hasLetter || !hasDigit) return 'weak';
  if (hasSpecial && pwd.length >= 12) return 'strong';
  return 'medium';
}

const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; color: string; bars: number }> = {
  empty:  { label: '',          color: 'bg-gray-200',   bars: 0 },
  weak:   { label: 'Yếu',       color: 'bg-red-400',    bars: 1 },
  medium: { label: 'Trung bình', color: 'bg-amber-400',  bars: 2 },
  strong: { label: 'Mạnh',      color: 'bg-emerald-500', bars: 3 },
};

/* ──────────────────────────────────────────────────────────────────────────
   Trang hồ sơ cá nhân & bảo mật tài khoản (100% Tailwind CSS)
   ──────────────────────────────────────────────────────────────────────── */
export const ProfilePage: FC = () => {
  const { user, currentRole, logout } = useAuth();
  const roleMeta = ROLE_METADATA_MAP[currentRole] ?? ROLE_METADATA_MAP['ROLE_ADMIN'];

  /* ── Tab Switcher: 'info' (Hồ sơ cá nhân & Công tác) vs 'password' (Đổi mật khẩu) ── */
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  /* ── Form state ── */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const strength = getStrength(newPassword);
  const strengthCfg = STRENGTH_CONFIG[strength];

  /* ── Validate phía client ── */
  function validate(): string | null {
    if (!currentPassword) return 'Vui lòng nhập mật khẩu hiện tại.';
    if (!newPassword) return 'Vui lòng nhập mật khẩu mới.';
    if (newPassword.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.';
    if (!/[a-zA-Z]/.test(newPassword)) return 'Mật khẩu mới phải chứa ít nhất một chữ cái.';
    if (!/[0-9]/.test(newPassword)) return 'Mật khẩu mới phải chứa ít nhất một chữ số.';
    if (newPassword === currentPassword) return 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
    if (!confirmPassword) return 'Vui lòng xác nhận mật khẩu mới.';
    if (newPassword !== confirmPassword) return 'Xác nhận mật khẩu không trùng khớp.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const err = validate();
    if (err) { setResult({ type: 'error', message: err }); return; }

    setLoading(true);
    try {
      const res = await changePasswordApi(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setResult({ type: 'success', message: res.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Đổi xong: thu hồi phiên hiện tại và chuyển về trang đăng nhập
        setTimeout(() => logout(), 2500);
      } else {
        setResult({ type: 'error', message: res.message });
      }
    } catch {
      setResult({ type: 'error', message: 'Không thể kết nối máy chủ. Vui lòng thử lại!' });
    } finally {
      setLoading(false);
    }
  }

  /* ── Avatar initials ── */
  const initials = (() => {
    const name = user?.fullName?.trim() || '';
    const words = name.split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'EP';
  })();

  const userRoles = user?.roles && user.roles.length > 0 ? user.roles : [currentRole];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">

      {/* ─────────────────────────────────────────────────────────────
          1. HERO OVERVIEW BANNER: Thông tin tóm tắt toàn màn hình
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-8 relative overflow-hidden">
        {/* Họa tiết trang trí góc mờ nhẹ */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-orange-500/10 to-amber-500/5 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Avatar & Danh tính */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-sm ring-4 ring-orange-50 shrink-0 select-none">
                {initials}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                    {user?.fullName || 'Người Dùng Hệ Thống'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hoạt động
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-md font-semibold">
                    @{user?.username || 'user'}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500 font-medium">
                    Mã NV: ERP-{user?.id ? String(user.id).padStart(4, '0') : '0001'}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {roleMeta.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Nút thao tác nhanh chuyển sang Đổi mật khẩu hoặc Thông tin */}
            <div className="flex items-center gap-3">
              {activeTab === 'info' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('password')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors flex items-center gap-2"
                >
                  <Key size={15} />
                  <span>Đổi Mật Khẩu</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors flex items-center gap-2"
                >
                  <User size={15} />
                  <span>Xem Hồ Sơ Chi Tiết</span>
                </button>
              )}
            </div>
          </div>

          {/* Dải thông số nổi bật (Highlights Bar) */}
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Mail size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-gray-400 font-medium">Hòm thư chính thức</div>
                <div className="text-xs font-bold text-gray-800 truncate">{user?.email || 'admin@erp.com'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Phone size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-gray-400 font-medium">Số điện thoại liên lạc</div>
                <div className="text-xs font-bold text-gray-800">{user?.phone || '0988776655'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Building2 size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-gray-400 font-medium">Kho trực thuộc</div>
                <div className="text-xs font-bold text-gray-800 truncate" title={user?.warehouse || roleMeta.sampleLocation}>
                  {user?.warehouse || roleMeta.sampleLocation || 'Trụ sở chính & Toàn quốc'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-gray-400 font-medium">Trạng thái bảo mật</div>
                <div className="text-xs font-bold text-emerald-700">Phiên xác thực JWT</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TAB NAVIGATION (Thoáng đãng, chuyển tab mượt mà)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-xl w-fit border border-gray-200/60">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'info'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <User size={15} className={activeTab === 'info' ? 'text-orange-500' : 'text-gray-400'} />
          <span>Thông Tin Nhân Sự & Vị Trí Công Tác</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'password'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Lock size={15} className={activeTab === 'password' ? 'text-orange-500' : 'text-gray-400'} />
          <span>Bảo Mật & Thiết Lập Mật Khẩu</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NỘI DUNG TAB 1: THÔNG TIN NHÂN SỰ & CÔNG TÁC (3 CỘT RỘNG MỞ)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Card 1: Định danh tài khoản */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <User size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Thông Tin Định Danh</h2>
                <p className="text-[11px] text-gray-400">Tài khoản và thông tin nhân viên</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Họ và tên:</span>
                <span className="font-bold text-gray-800">{user?.fullName || 'Người Dùng Hệ Thống'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Tên đăng nhập:</span>
                <span className="font-mono font-semibold text-gray-700">@{user?.username || 'user'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Mã định danh NV:</span>
                <span className="font-mono font-semibold text-orange-600">
                  ERP-{user?.id ? String(user.id).padStart(4, '0') : '0001'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Trạng thái:</span>
                <span className="font-semibold text-emerald-700">Hoạt động bình thường</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Loại tài khoản:</span>
                <span className="font-semibold text-gray-800">Nội bộ doanh nghiệp</span>
              </div>
            </div>
          </div>

          {/* Card 2: Địa bàn & Vị trí làm việc */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Building2 size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Địa Bàn & Đơn Vị Công Tác</h2>
                <p className="text-[11px] text-gray-400">Kho hàng và địa bàn quản lý</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Kho trực thuộc:</span>
                <span className="font-bold text-gray-800 text-right truncate max-w-[170px]" title={user?.warehouse || roleMeta.sampleLocation}>
                  {user?.warehouse || roleMeta.sampleLocation || 'Trụ sở chính & Toàn quốc'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Vị trí làm việc:</span>
                <span className="font-semibold text-gray-800 text-right truncate max-w-[170px]" title={user?.workLocation}>
                  {user?.workLocation || 'Trụ sở điều hành Hà Nội'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Phạm vi dữ liệu:</span>
                <span className="font-semibold text-teal-700">Toàn quốc (Toàn quyền)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Đơn vị quản trị:</span>
                <span className="font-semibold text-gray-800">Ban Điều Hành ERP</span>
              </div>
            </div>
          </div>

          {/* Card 3: Phân quyền & Vai trò */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Phân Quyền & Vai Trò ({userRoles.length})</h2>
                <p className="text-[11px] text-gray-400">Các vai trò được cấp quyền</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Danh sách vai trò
              </label>
              <div className="flex flex-wrap gap-2">
                {userRoles.map((r) => {
                  const meta = ROLE_METADATA_MAP[r];
                  const isCurrent = r === currentRole;
                  return (
                    <div
                      key={r}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        isCurrent
                          ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-xs'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                      title={meta?.description}
                    >
                      {isCurrent && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                      <span>{meta?.label || r}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orange-200/60 text-orange-800 font-extrabold">
                          Đang dùng
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-[11.5px] text-gray-500 leading-relaxed mt-4">
                <strong>Ghi chú phân quyền:</strong> Bạn có thể chuyển đổi nhanh giữa các vai trò được cấp tại góc trên thanh menu bên trái.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. NỘI DUNG TAB 2: BẢO MẬT & ĐỔI MẬT KHẨU (BỐ CỤC THOÁNG ĐÃNG 7-5)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'password' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          {/* CỘT TRÁI: FORM ĐỔI MẬT KHẨU (7 CỘT) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-8">
              {/* Header của Form */}
              <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                  <Key size={22} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Thiết Lập Mật Khẩu Mới</h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Đổi mật khẩu định kỳ để nâng cao an toàn cho dữ liệu bán hàng và kho vận. Khi đổi xong, hệ thống sẽ thu hồi các phiên đăng nhập khác.
                  </p>
                </div>
              </div>

              {/* Thông báo kết quả đổi mật khẩu */}
              {result && (
                <div
                  className={`mb-5 flex items-start gap-3 rounded-xl p-4 text-sm font-medium border ${
                    result.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {result.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{result.message}</span>
                </div>
              )}

              {/* Thông báo đếm ngược chuyển trang */}
              {result?.type === 'success' && (
                <div className="mb-5 flex items-center gap-2.5 text-xs text-blue-700 bg-blue-50/80 border border-blue-100 rounded-xl p-3.5">
                  <RefreshCw size={15} className="animate-spin text-blue-600 shrink-0" />
                  <span>Đang tự động chuyển về trang đăng nhập để áp dụng phiên bảo mật mới…</span>
                </div>
              )}

              {/* Form nhập liệu */}
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <PasswordField
                  id="current-password"
                  label="Mật khẩu hiện tại"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  disabled={loading || result?.type === 'success'}
                />

                <PasswordField
                  id="new-password"
                  label="Mật khẩu mới"
                  value={newPassword}
                  onChange={setNewPassword}
                  disabled={loading || result?.type === 'success'}
                  hint="Mật khẩu cần tối thiểu 8 ký tự, bao gồm chữ cái và chữ số."
                />

                {/* Thanh đo độ phức tạp mật khẩu */}
                {newPassword && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            strengthCfg.bars >= bar ? strengthCfg.color : 'bg-gray-100'
                          }`}
                        />
                      ))}
                    </div>
                    {strengthCfg.label && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Độ phức tạp mật khẩu:</span>
                        <span
                          className={`font-bold ${
                            strength === 'weak'
                              ? 'text-red-500'
                              : strength === 'medium'
                              ? 'text-amber-500'
                              : 'text-emerald-600'
                          }`}
                        >
                          {strengthCfg.label}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <PasswordField
                  id="confirm-password"
                  label="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  disabled={loading || result?.type === 'success'}
                />

                {/* Trạng thái xác nhận trùng khớp */}
                {confirmPassword && newPassword && (
                  <div className="flex items-center gap-1.5 text-xs font-medium pt-1">
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span className="text-emerald-700">Mật khẩu xác nhận hoàn toàn trùng khớp</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} className="text-red-500" />
                        <span className="text-red-600">Mật khẩu xác nhận chưa khớp với mật khẩu mới</span>
                      </>
                    )}
                  </div>
                )}

                {/* Nút Submit */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading || result?.type === 'success'}
                    className="w-full py-3 px-6 rounded-xl text-sm font-bold text-white
                               flex items-center justify-center gap-2 transition-all duration-200
                               bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600
                               shadow-sm hover:shadow active:scale-[0.99]
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {loading ? (
                      <RefreshCw size={16} className="animate-spin text-white" />
                    ) : (
                      <Lock size={16} className="text-white" />
                    )}
                    <span>{loading ? 'Đang cập nhật mật khẩu…' : 'Cập Nhật Mật Khẩu'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI: QUY CHUẨN AN TOÀN & CHÍNH SÁCH BẢO MẬT (5 CỘT) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Thẻ 1: Quy chuẩn mật khẩu */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-3.5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <CheckCircle2 size={18} className="text-orange-600" />
                <h3 className="text-sm font-bold text-gray-900">Quy Chuẩn Mật Khẩu Bắt Buộc</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { ok: newPassword.length >= 8, text: 'Tối thiểu 8 ký tự' },
                  { ok: /[a-zA-Z]/.test(newPassword), text: 'Chứa ít nhất một chữ cái (a–z, A–Z)' },
                  { ok: /[0-9]/.test(newPassword), text: 'Chứa ít nhất một chữ số (0–9)' },
                  {
                    ok: newPassword !== currentPassword && newPassword.length > 0,
                    text: 'Không trùng với mật khẩu hiện tại'
                  },
                ].map((req) => (
                  <div key={req.text} className="flex items-center gap-2.5 text-xs">
                    {req.ok ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                    )}
                    <span className={req.ok ? 'text-emerald-800 font-semibold' : 'text-gray-500'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Thẻ 2: Cơ chế thu hồi phiên */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <ShieldAlert size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900">Cơ Chế Thu Hồi Phiên</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Sau khi đổi mật khẩu thành công, toàn bộ phiên đăng nhập trên tất cả các trình duyệt và thiết bị khác sẽ bị hệ thống tự động vô hiệu hóa ngay lập tức nhằm bảo vệ an toàn cho dữ liệu bán hàng và kho hàng.
              </p>
            </div>

            {/* Thẻ 3: Lưu ý an ninh thông tin */}
            <div className="bg-amber-50/70 rounded-2xl border border-amber-200/70 p-5 flex items-start gap-3">
              <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Khuyến nghị an toàn:</strong> Không chia sẻ mật khẩu của tài khoản quản trị cho bất kỳ ai. Nên đổi mật khẩu định kỳ mỗi 90 ngày.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
