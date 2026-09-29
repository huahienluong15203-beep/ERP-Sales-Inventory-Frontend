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
   Trường nhập mật khẩu có nhãn và nút ẩn/hiện thoáng đãng (100% Tailwind CSS)
   ──────────────────────────────────────────────────────────────────────── */
const PasswordField: FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}> = ({ id, label, value, onChange, disabled, placeholder }) => {
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
          placeholder={placeholder || `Nhập ${label.toLowerCase()}`}
          className="w-full px-4 py-2.5 pr-11 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-400 transition"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          tabIndex={-1}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Đo độ mạnh mật khẩu (4 nấc: Trống, Yếu, Trung bình, Rất mạnh)
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
  weak:   { label: 'Yếu',       color: 'bg-red-500',    bars: 1 },
  medium: { label: 'Trung bình', color: 'bg-amber-500',  bars: 2 },
  strong: { label: 'Rất mạnh',  color: 'bg-emerald-500', bars: 3 },
};

/* ──────────────────────────────────────────────────────────────────────────
   Trang Hồ Sơ & Bảo Mật Cá Nhân (Thiết kế thoáng đãng, khoảng cách rõ ràng)
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
    if (newPassword.length < 8) return 'Mật khẩu mới phải có tối thiểu 8 ký tự.';
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
    if (err) {
      setResult({ type: 'error', message: err });
      return;
    }

    setLoading(true);
    try {
      const res = await changePasswordApi(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setResult({ type: 'success', message: res.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Thu hồi phiên đăng nhập sau 2.5s và chuyển về login
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

  /* ── Avatar Initials ── */
  const initials = (() => {
    const name = user?.fullName?.trim() || '';
    const words = name.split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'QT';
  })();

  const userRoles = user?.roles && user.roles.length > 0 ? user.roles : [currentRole];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">

      {/* ─────────────────────────────────────────────────────────────
          BỐ CỤC 2 CỘT THÔNG THOÁNG (5 CỘT TRÁI - 7 CỘT PHẢI)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ═════════════════════════════════════════════════════════════
            CỘT TRÁI (5/12): HỒ SƠ NHÂN SỰ & VỊ TRÍ CÔNG TÁC
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header Thẻ Cá Nhân */}
            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md ring-4 ring-orange-50 shrink-0">
                {initials}
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-gray-900 truncate">
                    {user?.fullName || 'Người Dùng Hệ Thống'}
                  </h2>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" title="Đang trực tuyến" />
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  @{user?.username || 'user'} • Mã NV: ERP-{user?.id ? String(user.id).padStart(4, '0') : '0001'}
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {roleMeta.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Chi tiết liên hệ & công tác */}
            <div className="p-6 flex flex-col gap-5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Thông tin công tác & liên hệ
              </span>

              <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-gray-400">Hòm thư điện tử</span>
                    <span className="text-sm font-semibold text-gray-800 truncate">{user?.email || 'admin@erp.com'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-gray-400">Số điện thoại liên lạc</span>
                    <span className="text-sm font-semibold text-gray-800">{user?.phone || '0988776655'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-gray-400">Kho hàng trực thuộc</span>
                    <span className="text-sm font-semibold text-gray-800 truncate" title={user?.warehouse || roleMeta.sampleLocation}>
                      {user?.warehouse || roleMeta.sampleLocation || 'Trụ sở chính & Toàn quốc'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-gray-400">Địa bàn làm việc</span>
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {user?.workLocation || 'Trụ sở điều hành Hà Nội'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Danh sách vai trò */}
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Vai trò được gán ({userRoles.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {userRoles.map((r) => {
                    const meta = ROLE_METADATA_MAP[r];
                    const isCurrent = r === currentRole;
                    return (
                      <span
                        key={r}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          isCurrent
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                        title={meta?.description}
                      >
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                        <span>{meta?.label || r}</span>
                        {isCurrent && <span className="text-[10px] text-orange-600 font-bold">(Hiện tại)</span>}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400">
                  Bạn có thể đổi vai trò làm việc nhanh tại menu trên cùng bên trái.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            CỘT PHẢI (7/12): ĐỔI MẬT KHẨU & CHÍNH SÁCH BẢO MẬT
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
            {/* Header Form */}
            <div className="flex items-start gap-4 pb-5 border-b border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Key size={22} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Đổi Mật Khẩu Tài Khoản</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Chủ động đổi mật khẩu định kỳ để nâng cao tính an toàn. Khi đổi xong, toàn bộ phiên đăng nhập trên các thiết bị khác sẽ được tự động thu hồi.
                </p>
              </div>
            </div>

            {/* Thông báo kết quả */}
            {result && (
              <div
                className={`flex items-start gap-3 rounded-xl p-4 text-xs font-medium border ${
                  result.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {result.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            {/* Thông báo đang đăng xuất phiên */}
            {result?.type === 'success' && (
              <div className="flex items-center gap-2.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                <RefreshCw size={14} className="animate-spin text-blue-600 shrink-0" />
                <span>Đang điều hướng về trang đăng nhập để áp dụng phiên bảo mật mới…</span>
              </div>
            )}

            {/* Form Đổi Mật Khẩu */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="off">
              <PasswordField
                id="current-password"
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={setCurrentPassword}
                disabled={loading || result?.type === 'success'}
              />

              <div className="flex flex-col gap-2">
                <PasswordField
                  id="new-password"
                  label="Mật khẩu mới"
                  value={newPassword}
                  onChange={setNewPassword}
                  disabled={loading || result?.type === 'success'}
                  placeholder="Tối thiểu 8 ký tự, gồm cả chữ và số"
                />

                {/* Thanh đo độ mạnh mật khẩu */}
                {newPassword && (
                  <div className="flex flex-col gap-1.5 pt-1">
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
                        <span className="text-gray-400">Độ phức tạp mật khẩu:</span>
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
              </div>

              <div className="flex flex-col gap-2">
                <PasswordField
                  id="confirm-password"
                  label="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  disabled={loading || result?.type === 'success'}
                />

                {/* Trạng thái so khớp */}
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
              </div>

              {/* Checklist Tiêu Chuẩn Mật Khẩu */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
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
                  <div key={req.text} className="flex items-center gap-2.5 text-xs">
                    {req.ok ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                    )}
                    <span className={req.ok ? 'text-emerald-800 font-semibold' : 'text-gray-500'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nút bấm Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || result?.type === 'success'}
                  className="w-full py-3 px-6 rounded-xl text-sm font-bold text-white
                             flex items-center justify-center gap-2 transition-all duration-200
                             bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600
                             shadow-md hover:shadow-lg active:scale-[0.99]
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
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
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Lưu ý bảo mật:</strong> Sau khi đổi mật khẩu, hệ thống sẽ thu hồi các phiên đăng nhập khác và yêu cầu đăng nhập lại để đảm bảo an toàn.
                </span>
              </div>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
