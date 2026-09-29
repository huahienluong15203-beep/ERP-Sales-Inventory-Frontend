import { useState, type FC } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_METADATA_MAP } from '../../types/user';
import { changePasswordApi } from '../../services/api';

/* ──────────────────────────────────────────────────────────────────────────
   Biểu tượng mắt để hiện / ẩn mật khẩu (inline SVG, không cần thư viện)
   ──────────────────────────────────────────────────────────────────────── */
const EyeIcon: FC<{ open: boolean }> = ({ open }) =>
  open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

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
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
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
                     focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400
                     disabled:bg-gray-50 disabled:text-gray-400 transition"
          placeholder={`Nhập ${label.toLowerCase()}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition"
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
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
  strong: { label: 'Mạnh',    color: 'bg-green-500', bars: 3 },
};

/* ──────────────────────────────────────────────────────────────────────────
   Trang hồ sơ cá nhân
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
    if (newPassword !== confirmPassword) return 'Xác nhận mật khẩu không khớp.';
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

  return (
    <div className="erp-profile-page space-y-6">

      {/* ── Tiêu đề trang ── */}
      <div className="erp-module-header">
        <div>
          <h1 className="erp-module-title">Hồ sơ & Bảo mật tài khoản</h1>
          <p className="erp-module-desc">
            Xem thông tin cá nhân và chủ động thay đổi mật khẩu để bảo vệ tài khoản.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ─────────────────────────────────────────────────────────────
            CỘT TRÁI: Thông tin cá nhân
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Avatar card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center gap-4 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)' }}
            >
              {initials}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{user?.fullName || '—'}</p>
              <p className="text-sm text-gray-400 mt-0.5">@{user?.username || '—'}</p>
            </div>
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: roleMeta.badgeBg, color: roleMeta.badgeColor }}
            >
              {roleMeta.label}
            </span>
            <div className="w-full border-t border-gray-100 pt-4 space-y-2 text-sm text-left">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-gray-400">📧</span>
                <span className="truncate">{user?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-gray-400">📱</span>
                <span>{user?.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-gray-400">🏢</span>
                <span className="truncate">{user?.warehouse || user?.workLocation || 'Toàn quốc'}</span>
              </div>
            </div>
          </div>

          {/* Thông tin chi tiết */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
              Chi tiết công tác
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Vai trò', value: `${roleMeta.label} (${currentRole})`, color: roleMeta.badgeColor },
                { label: 'Kho / Địa bàn', value: user?.warehouse || user?.workLocation || 'Toàn quốc' },
                { label: 'Nơi làm việc', value: user?.workLocation || roleMeta.sampleLocation },
                { label: 'Trạng thái', value: 'Hoạt động (ACTIVE)', green: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-start gap-2 text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 shrink-0">{row.label}</span>
                  <span
                    className="font-semibold text-right"
                    style={{ color: row.green ? '#10B981' : (row.color || '#111827') }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CỘT PHẢI: Form đổi mật khẩu
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">

            {/* Header section */}
            <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-100">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'linear-gradient(135deg, #FFF2EE 0%, #FFE4DC 100%)' }}>
                <span className="text-xl">🔐</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Đổi mật khẩu</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Sau khi đổi thành công, <strong>tất cả phiên đăng nhập khác sẽ bị thu hồi</strong> và bạn sẽ được đăng nhập lại bằng mật khẩu mới.
                </p>
              </div>
            </div>

            {/* Thông báo kết quả */}
            {result && (
              <div
                className={`mb-5 flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium border
                  ${result.type === 'success'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'}`}
              >
                <span className="text-lg leading-none mt-0.5">
                  {result.type === 'success' ? '✅' : '❌'}
                </span>
                <span>{result.message}</span>
              </div>
            )}

            {/* Thông báo đang đăng xuất */}
            {result?.type === 'success' && (
              <div className="mb-5 flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <span className="animate-spin text-lg">⏳</span>
                <span>Đang chuyển về trang đăng nhập trong vài giây…</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

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
                hint="Tối thiểu 8 ký tự, bao gồm chữ cái và chữ số."
              />

              {/* Thanh độ mạnh mật khẩu */}
              {newPassword && (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300
                          ${strengthCfg.bars >= bar ? strengthCfg.color : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  {strengthCfg.label && (
                    <p className={`text-xs font-semibold
                      ${strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-amber-500' : 'text-green-600'}`}>
                      Độ mạnh: {strengthCfg.label}
                      {strength === 'weak' && ' — Cần thêm chữ số hoặc ký tự đặc biệt'}
                      {strength === 'strong' && ' — Xuất sắc!'}
                    </p>
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

              {/* Xác nhận trùng khớp */}
              {confirmPassword && newPassword && (
                <p className={`text-xs font-semibold flex items-center gap-1
                  ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {newPassword === confirmPassword ? '✅ Mật khẩu khớp' : '❌ Mật khẩu chưa khớp'}
                </p>
              )}

              {/* Danh sách yêu cầu */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Yêu cầu mật khẩu mới
                </p>
                {[
                  { ok: newPassword.length >= 8,         text: 'Tối thiểu 8 ký tự' },
                  { ok: /[a-zA-Z]/.test(newPassword),    text: 'Có ít nhất một chữ cái (a–z, A–Z)' },
                  { ok: /[0-9]/.test(newPassword),       text: 'Có ít nhất một chữ số (0–9)' },
                  { ok: newPassword !== currentPassword && newPassword.length > 0,
                                                          text: 'Khác với mật khẩu hiện tại' },
                ].map((req) => (
                  <div key={req.text} className="flex items-center gap-2 text-xs">
                    <span className={req.ok ? 'text-green-500' : 'text-gray-300'}>
                      {req.ok ? '✔' : '○'}
                    </span>
                    <span className={req.ok ? 'text-green-700 font-medium' : 'text-gray-400'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nút submit */}
              <button
                type="submit"
                disabled={loading || result?.type === 'success'}
                className="w-full py-3 px-6 rounded-xl text-sm font-bold text-white
                           transition-all duration-200 flex items-center justify-center gap-2
                           disabled:opacity-60 disabled:cursor-not-allowed
                           hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: loading || result?.type === 'success'
                    ? '#D1D5DB'
                    : 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)',
                  boxShadow: loading || result?.type === 'success'
                    ? 'none'
                    : '0 6px 18px rgba(238, 77, 45, 0.35)',
                }}
              >
                {loading && (
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                )}
                {loading ? 'Đang xử lý…' : result?.type === 'success' ? 'Đổi thành công!' : '🔒 Đổi mật khẩu'}
              </button>

            </form>

            {/* Lưu ý bảo mật */}
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Lưu ý bảo mật:</strong> Sau khi đổi mật khẩu thành công, bạn sẽ được tự động đăng xuất.
                Vui lòng <strong>không chia sẻ mật khẩu</strong> với bất kỳ ai, kể cả quản trị viên.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
