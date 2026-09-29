import { useState, type FC } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_METADATA_MAP } from '../../types/user';
import { changePasswordApi } from '../../services/api';
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw
} from '../../components/common/Icons';

/* ──────────────────────────────────────────────────────────────────────────
   Trường nhập mật khẩu có nút ẩn/hiện
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
          className="w-full px-3.5 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm
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
  empty:  { label: '',         color: 'bg-gray-200',  bars: 0 },
  weak:   { label: 'Yếu',     color: 'bg-red-400',   bars: 1 },
  medium: { label: 'Trung bình', color: 'bg-amber-400', bars: 2 },
  strong: { label: 'Mạnh',    color: 'bg-emerald-500', bars: 3 },
};

/* ──────────────────────────────────────────────────────────────────────────
   Trang hồ sơ cá nhân & bảo mật
   ──────────────────────────────────────────────────────────────────────── */
export const ProfilePage: FC = () => {
  const { user, currentRole, logout } = useAuth();
  const roleMeta = ROLE_METADATA_MAP[currentRole] ?? ROLE_METADATA_MAP['ROLE_ADMIN'];

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
    <div className="erp-profile-page max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ─────────────────────────────────────────────────────────────
            CỘT TRÁI: Hồ sơ nhân sự (5/12)
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/90 overflow-hidden">
            {/* Header Cover Banner */}
            <div className="h-28 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 relative">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
            </div>

            {/* Profile Info Body */}
            <div className="px-6 pb-6 pt-0 relative">
              {/* Avatar */}
              <div className="flex justify-between items-end -mt-12 mb-4">
                <div className="w-22 h-22 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md ring-4 ring-white">
                  {initials}
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>

              {/* Name & Username */}
              <div className="mb-4">
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
                  {user?.fullName || 'Người Dùng Hệ Thống'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    @{user?.username || 'user'}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 font-medium">Mã NV: ERP-{user?.id ? String(user.id).padStart(4, '0') : '0001'}</span>
                </div>
              </div>

              {/* Danh sách vai trò */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Vai trò được gán ({userRoles.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {userRoles.map((r) => {
                    const meta = ROLE_METADATA_MAP[r];
                    const isCurrent = r === currentRole;
                    return (
                      <span
                        key={r}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          isCurrent
                            ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-xs'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                        title={meta?.description}
                      >
                        {meta?.label || r}
                        {isCurrent && <span className="text-[10px] text-orange-500">✓</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Thông tin liên hệ & Công tác */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-orange-600 shrink-0">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-gray-400 font-medium">Hòm thư điện tử</div>
                    <div className="text-sm font-semibold text-gray-800 truncate">{user?.email || 'Chưa thiết lập'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-orange-600 shrink-0">
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-gray-400 font-medium">Số điện thoại liên lạc</div>
                    <div className="text-sm font-semibold text-gray-800">{user?.phone || 'Chưa cập nhật'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-orange-600 shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-gray-400 font-medium">Kho trực thuộc / Đơn vị</div>
                    <div className="text-sm font-semibold text-gray-800 truncate" title={user?.warehouse || roleMeta.sampleLocation}>
                      {user?.warehouse || roleMeta.sampleLocation || 'Trụ sở chính & Toàn quốc'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-orange-600 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-gray-400 font-medium">Vị trí làm việc</div>
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {user?.workLocation || 'Trụ sở điều hành Hà Nội'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CỘT PHẢI: Form Đổi mật khẩu (7/12)
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/90 p-6 sm:p-7">
            {/* Header section */}
            <div className="flex items-start gap-3.5 mb-6 pb-5 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Thiết Lập Mật Khẩu Mới</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Chủ động đổi mật khẩu định kỳ để nâng cao tính an toàn. Sau khi hoàn tất, mọi phiên đăng nhập khác của tài khoản này sẽ tự động thu hồi.
                </p>
              </div>
            </div>

            {/* Thông báo kết quả */}
            {result && (
              <div
                className={`mb-5 flex items-start gap-3 rounded-xl p-3.5 text-sm font-medium border ${
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

            {/* Thông báo đang chuyển trang */}
            {result?.type === 'success' && (
              <div className="mb-5 flex items-center gap-2.5 text-xs text-blue-700 bg-blue-50/80 border border-blue-100 rounded-xl p-3">
                <RefreshCw size={14} className="animate-spin text-blue-600 shrink-0" />
                <span>Đang điều hướng về trang đăng nhập để áp dụng phiên bảo mật mới…</span>
              </div>
            )}

            {/* Form */}
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

              {/* Thanh đo độ mạnh mật khẩu */}
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
                <div className="flex items-center gap-1.5 text-xs font-medium">
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

              {/* Checklist tiêu chí mật khẩu */}
              <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-3.5 space-y-2 mt-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Quy chuẩn mật khẩu an toàn
                </span>
                {[
                  { ok: newPassword.length >= 8, text: 'Tối thiểu 8 ký tự' },
                  { ok: /[a-zA-Z]/.test(newPassword), text: 'Chứa ít nhất một chữ cái (a–z, A–Z)' },
                  { ok: /[0-9]/.test(newPassword), text: 'Chứa ít nhất một chữ số (0–9)' },
                  {
                    ok: newPassword !== currentPassword && newPassword.length > 0,
                    text: 'Không trùng với mật khẩu hiện tại'
                  },
                ].map((req) => (
                  <div key={req.text} className="flex items-center gap-2 text-xs">
                    {req.ok ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                    )}
                    <span className={req.ok ? 'text-emerald-800 font-medium' : 'text-gray-500'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nút Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || result?.type === 'success'}
                  className="w-full py-2.5 px-6 rounded-xl text-sm font-bold text-white
                             flex items-center justify-center gap-2 transition-all duration-200
                             bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600
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

              {/* Ghi chú an toàn */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-800 leading-relaxed mt-3">
                <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Lưu ý bảo mật:</strong> Để bảo vệ dữ liệu nội bộ, không chia sẻ mật khẩu quản trị cho người khác dưới mọi hình thức.
                </span>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
