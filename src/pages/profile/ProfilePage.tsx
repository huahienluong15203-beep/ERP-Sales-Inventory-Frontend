import { useState, type FC, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_METADATA_MAP, getUserAvatarInitials } from '../../types/user';
import {
  changePasswordApi,
  updatePersonalProfileApi,
  deleteAvatarApi,
  getAvatarFullUrl
} from '../../services/api';
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
  RefreshCw,
  Edit,
  X,
  Camera,
  Trash2,
  ZoomIn
} from '../../components/common/Icons';
import { AvatarCropModal } from '../../components/profile/AvatarCropModal';

/* ──────────────────────────────────────────────────────────────────────────
   Trường nhập mật khẩu gọn gàng, chuẩn Tailwind CSS (không tràn màn hình)
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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
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
          className="w-full px-3 py-1.5 pr-9 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-400 transition"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          tabIndex={-1}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
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
  empty: { label: '', color: 'bg-gray-200', bars: 0 },
  weak: { label: 'Yếu', color: 'bg-red-500', bars: 1 },
  medium: { label: 'Trung bình', color: 'bg-amber-500', bars: 2 },
  strong: { label: 'Rất mạnh', color: 'bg-emerald-500', bars: 3 },
};

/* ──────────────────────────────────────────────────────────────────────────
   Trang Hồ Sơ & Bảo Mật Cá Nhân
   - 2 Card cân đối chiều cao hoàn hảo (items-stretch, h-full)
   - Thiết kế vừa vặn khung nhìn, không phải cuộn trang trên mọi màn hình
   - Dữ liệu kho/địa bàn mặc định là "Chưa có"
   ──────────────────────────────────────────────────────────────────────── */
export const ProfilePage: FC = () => {
  const { user, currentRole, logout, refreshContext, showToast, updateUser } = useAuth();
  const roleMeta = ROLE_METADATA_MAP[currentRole] ?? ROLE_METADATA_MAP['ROLE_ADMIN'];

  /* ── S2-02: State Chỉnh sửa hồ sơ cá nhân ── */
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResult, setProfileResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  /* ── S2-03: State Tải lên & Cắt ảnh đại diện ── */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    setAvatarImgError(false);
  }, [user?.avatarUrl, user?.avatarThumbnailUrl]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value input để có thể chọn lại cùng một file nếu muốn
    e.target.value = '';

    // Validate định dạng JPG / PNG
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showToast('Định dạng tệp không hợp lệ!', 'Chỉ chấp nhận ảnh định dạng JPG hoặc PNG.', 'error');
      return;
    }

    // Validate dung lượng tối đa 2MB
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('Dung lượng ảnh vượt quá giới hạn!', 'Vui lòng chọn ảnh có dung lượng tối đa 2MB.', 'error');
      return;
    }

    // Đọc ảnh và mở modal cắt vuông
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropFile(file);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUploadSuccess = async (result: { avatarUrl: string; avatarThumbnailUrl: string }) => {
    setAvatarImgError(false);
    updateUser({
      avatarUrl: result.avatarUrl,
      avatarThumbnailUrl: result.avatarThumbnailUrl
    });
    await refreshContext();
    showToast('Tải ảnh đại diện thành công!', 'Ảnh đại diện của bạn đã được cập nhật trên toàn hệ thống.');
  };

  const handleDeleteAvatar = async () => {
    setDeletingAvatar(true);
    try {
      const res = await deleteAvatarApi();
      if (res.success) {
        setShowDeleteConfirm(false);
        setShowLightbox(false);
        updateUser({
          avatarUrl: undefined,
          avatarThumbnailUrl: undefined
        });
        await refreshContext();
        showToast('Đã xóa ảnh đại diện!', 'Tài khoản đã trở về ảnh đại diện chữ cái mặc định.');
      } else {
        showToast('Không thể xóa ảnh đại diện', res.message, 'error');
      }
    } catch {
      showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại!', 'error');
    } finally {
      setDeletingAvatar(false);
    }
  };

  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  function getPhoneError(val: string): string | null {
    const p = val.trim();
    if (!p) return null;
    if (!/^\d+$/.test(p)) return 'Số điện thoại chỉ được chứa chữ số.';
    if (p.length !== 10) return `Số điện thoại phải đủ 10 số (hiện có ${p.length} số).`;
    if (!/^0(3|5|7|8|9)\d{8}$/.test(p)) return 'Đầu số không hợp lệ (phải bắt đầu bằng 03, 05, 07, 08 hoặc 09).';
    return null;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileResult(null);

    const trimmedName = editFullName.trim();
    if (!trimmedName) {
      setProfileResult({ type: 'error', message: 'Họ và tên không được để trống.' });
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setProfileResult({ type: 'error', message: 'Họ và tên phải từ 2 đến 100 ký tự.' });
      return;
    }

    const phoneErr = getPhoneError(editPhone);
    if (phoneErr) {
      setProfileResult({ type: 'error', message: phoneErr });
      return;
    }

    setProfileLoading(true);
    try {
      const res = await updatePersonalProfileApi({
        fullName: trimmedName,
        phone: editPhone.trim() || undefined
      });

      if (res.success) {
        setIsEditingProfile(false);
        setProfileResult(null);
        updateUser({
          fullName: trimmedName,
          phone: editPhone.trim() || undefined
        });
        await refreshContext();
        showToast(
          'Cập nhật hồ sơ thành công!'
        );
      } else {
        setProfileResult({ type: 'error', message: res.message });
      }
    } catch {
      setProfileResult({ type: 'error', message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau!' });
    } finally {
      setProfileLoading(false);
    }
  }

  /* ── Form state đổi mật khẩu ── */
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
        setResult(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast(
          'Đổi mật khẩu thành công!',
          'Mật khẩu của bạn đã được thay đổi. Đang đăng xuất sau 2.5s...'
        );
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

  /* ── Avatar Initials (chuẩn đồng bộ toàn hệ thống) ── */
  const initials = getUserAvatarInitials(user?.fullName || user?.username, currentRole);

  const userRoles = user?.roles && user.roles.length > 0 ? user.roles : [currentRole];

  /* ── Chuẩn hóa Kho & Địa bàn mặc định: "Chưa có" ── */
  const warehouseDisplay =
    user?.warehouse && user.warehouse !== 'Trụ sở chính & Toàn quốc'
      ? user.warehouse
      : 'Chưa có';

  const locationDisplay =
    user?.workLocation && user.workLocation !== 'Trụ sở điều hành Hà Nội'
      ? user.workLocation
      : 'Chưa có';

  return (
    <div className="w-full max-w-6xl mx-auto">

      {/* ─────────────────────────────────────────────────────────────
          BỐ CỤC 2 CỘT CÂN BẰNG CHIỀU CAO (ITEMS-STRETCH)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* ═════════════════════════════════════════════════════════════
            CỘT TRÁI (5/12): HỒ SƠ NHÂN SỰ & VỊ TRÍ CÔNG TÁC
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between h-full gap-3.5">
            {/* 1. Header Thẻ Cá Nhân (S2-03: Ảnh đại diện cắt vuông & thumbnail) */}
            <div className="pb-3 border-b border-gray-100 flex items-center gap-3.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              {/* Vùng Avatar: Bấm vào avatar để XEM CHI TIẾT (Phóng to), bấm vào Camera để ĐỔI ẢNH */}
              <div className="relative group shrink-0">
                <div
                  onClick={() => {
                    if (user?.avatarUrl && !avatarImgError) {
                      setShowLightbox(true);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  title={user?.avatarUrl && !avatarImgError ? "Bấm để xem chi tiết ảnh đại diện phóng to" : "Bấm để tải ảnh đại diện mới"}
                  className="w-14 h-14 rounded-full overflow-hidden shadow-sm ring-4 ring-orange-50 bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold text-base flex items-center justify-center cursor-pointer transition-transform active:scale-95 relative"
                >
                  {user?.avatarUrl && !avatarImgError ? (
                    <img
                      src={getAvatarFullUrl(user.avatarUrl)}
                      alt={user.fullName || user.username}
                      onError={() => setAvatarImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}

                  {/* Lớp overlay mờ khi hover: Xem chi tiết nếu đã có ảnh */}
                  <div className="absolute inset-0 bg-black/45 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {user?.avatarUrl && !avatarImgError ? (
                      <>
                        <ZoomIn size={16} />
                        <span className="text-[9px] font-semibold mt-0.5">Chi tiết</span>
                      </>
                    ) : (
                      <>
                        <Camera size={16} />
                        <span className="text-[9px] font-semibold mt-0.5">Tải ảnh</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Badge nút Camera nhỏ góc phải: Đổi ảnh */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  title="Thay đổi ảnh đại diện"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md flex items-center justify-center border-2 border-white cursor-pointer hover:from-orange-600 hover:to-amber-600 transition"
                >
                  <Camera size={11} />
                </button>
              </div>

              {/* Thông tin tên, username, vai trò và nút hành động nhanh avatar */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-gray-900 truncate">
                    {user?.fullName || 'Người Dùng Hệ Thống'}
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" title="Đang trực tuyến" />
                </div>
                <div className="text-[11px] text-gray-500 font-mono truncate">
                  Mã NV: ERP-{user?.id ? String(user.id).padStart(4, '0') : '0001'}
                </div>
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {roleMeta.label}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Chi tiết liên hệ & công tác (S2-02: Xem & Sửa hồ sơ cá nhân) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Thông tin công tác & liên hệ
                </span>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileResult(null);
                      setIsEditingProfile(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition cursor-pointer"
                  >
                    <Edit size={12} />
                    <span>Chỉnh sửa</span>
                  </button>
                )}
              </div>

              {/* Thông báo lỗi cập nhật hồ sơ nếu có */}
              {profileResult && profileResult.type === 'error' && (
                <div className="flex items-start gap-1.5 p-2 rounded-xl text-[11px] font-medium border bg-red-50 text-red-700 border-red-200">
                  <AlertCircle size={13} className="text-red-600 shrink-0 mt-0.5" />
                  <span className="flex-1">{profileResult.message}</span>
                  <button
                    type="button"
                    onClick={() => setProfileResult(null)}
                    className="text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Chế độ CHỈNH SỬA (S2-02) */}
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-2 p-2.5 rounded-xl bg-orange-50/40 border border-orange-100">
                  {/* Họ tên */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10.5px] font-bold text-gray-700">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Nhập họ và tên"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                      disabled={profileLoading}
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10.5px] font-bold text-gray-700">
                      Số điện thoại liên hệ (Việt Nam)
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Ví dụ: 0987654321"
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 transition ${getPhoneError(editPhone)
                        ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500'
                        : 'border-gray-300 focus:ring-orange-500/20 focus:border-orange-500'
                        }`}
                      disabled={profileLoading}
                    />
                    {getPhoneError(editPhone) && (
                      <span className="text-[10px] text-red-600 font-medium">
                        {getPhoneError(editPhone)}
                      </span>
                    )}
                  </div>

                  {/* Các trường cấm sửa (Read-only có icon Lock) */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-orange-200/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9.5px] font-medium text-gray-400 flex items-center gap-1">
                        <Lock size={10} className="text-gray-400" /> Tài khoản (Cố định)
                      </span>
                      <span className="text-[11px] font-mono font-medium text-gray-500 bg-gray-100/80 px-2 py-1 rounded border border-gray-200 truncate">
                        {user?.username}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9.5px] font-medium text-gray-400 flex items-center gap-1">
                        <Lock size={10} className="text-gray-400" /> Email (Cố định)
                      </span>
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100/80 px-2 py-1 rounded border border-gray-200 truncate" title={user?.email}>
                        {user?.email}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9.5px] font-medium text-gray-400 flex items-center gap-1">
                        <Lock size={10} className="text-gray-400" /> Kho trực thuộc
                      </span>
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100/80 px-2 py-1 rounded border border-gray-200 truncate" title={warehouseDisplay}>
                        {warehouseDisplay}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9.5px] font-medium text-gray-400 flex items-center gap-1">
                        <Lock size={10} className="text-gray-400" /> Địa bàn
                      </span>
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100/80 px-2 py-1 rounded border border-gray-200 truncate" title={locationDisplay}>
                        {locationDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-amber-700 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60 leading-tight">
                    Tên đăng nhập, email, vai trò và kho do Quản trị viên chỉ định theo phân quyền an toàn, không thể tự sửa.
                  </div>

                  {/* Nút hành động */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={profileLoading}
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditFullName(user?.fullName || '');
                        setEditPhone(user?.phone || '');
                        setProfileResult(null);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading || !!getPhoneError(editPhone)}
                      className="px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      {profileLoading && <RefreshCw size={11} className="animate-spin text-white" />}
                      <span>{profileLoading ? 'Đang lưu…' : 'Lưu Thay Đổi'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Chế độ XEM THÔNG THƯỜNG */
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50/80 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Mail size={14} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-medium text-gray-400">Hòm thư điện tử (Cố định)</span>
                      <span className="text-xs font-semibold text-gray-800 truncate">{user?.email || 'okluon123pk@gmail.com'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50/80 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Phone size={14} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-medium text-gray-400">Số điện thoại liên hệ</span>
                      <span className="text-xs font-semibold text-gray-800">{user?.phone || 'Chưa cập nhật'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50/80 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Building2 size={14} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-medium text-gray-400">Kho hàng trực thuộc (Cố định)</span>
                      <span className="text-xs font-semibold text-gray-800 truncate" title={warehouseDisplay}>
                        {warehouseDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50/80 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <MapPin size={14} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-medium text-gray-400">Địa bàn làm việc (Cố định)</span>
                      <span className="text-xs font-semibold text-gray-800 truncate" title={locationDisplay}>
                        {locationDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Vai trò */}
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Vai trò được cấp ({userRoles.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {userRoles.map((r) => {
                  const meta = ROLE_METADATA_MAP[r];
                  const isCurrent = r === currentRole;
                  return (
                    <span
                      key={r}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${isCurrent
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      title={meta?.description}
                    >
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                      <span>{meta?.label || r}</span>

                    </span>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            CỘT PHẢI (7/12): ĐỔI MẬT KHẨU & BẢO MẬT (GỌN GÀNG, VỪA VẶN)
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
            {/* Header Form */}
            <div className="flex items-center gap-3 pb-2.5 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Key size={16} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900 leading-tight">Đổi Mật Khẩu Tài Khoản</h3>
                <p className="text-[11px] text-gray-500 leading-tight truncate">
                  Đổi mật khẩu định kỳ để nâng cao tính an toàn tài khoản
                </p>
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {result && result.type === 'error' && (
              <div className="flex items-start gap-2 rounded-lg p-2 text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <span>{result.message}</span>
              </div>
            )}

            {/* Form Đổi Mật Khẩu */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 flex-1 justify-between" autoComplete="off">
              <div className="flex flex-col gap-2">
                <PasswordField
                  id="current-password"
                  label="Mật khẩu hiện tại"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  disabled={loading || result?.type === 'success'}
                />

                <div className="flex flex-col gap-0.5">
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
                    <div className="flex flex-col gap-0.5 pt-0.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((bar) => (
                          <div
                            key={bar}
                            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${strengthCfg.bars >= bar ? strengthCfg.color : 'bg-gray-100'
                              }`}
                          />
                        ))}
                      </div>
                      {strengthCfg.label && (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400">Độ phức tạp:</span>
                          <span
                            className={`font-bold ${strength === 'weak'
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

                <div className="flex flex-col gap-0.5">
                  <PasswordField
                    id="confirm-password"
                    label="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    disabled={loading || result?.type === 'success'}
                  />

                  {/* Trạng thái so khớp */}
                  {confirmPassword && newPassword && (
                    <div className="flex items-center gap-1 text-[10.5px] font-medium pt-0.5">
                      {newPassword === confirmPassword ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span className="text-emerald-700">Mật khẩu xác nhận trùng khớp</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} className="text-red-500" />
                          <span className="text-red-600">Mật khẩu xác nhận chưa khớp</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Checklist Tiêu Chuẩn Mật Khẩu (2x2 Grid gọn gàng) */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-2 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Quy chuẩn mật khẩu an toàn
                  </span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {[
                      { ok: newPassword.length >= 8, text: 'Tối thiểu 8 ký tự' },
                      { ok: /[a-zA-Z]/.test(newPassword), text: 'Có chữ cái (a–z)' },
                      { ok: /[0-9]/.test(newPassword), text: 'Có chữ số (0–9)' },
                      {
                        ok: newPassword !== currentPassword && newPassword.length > 0,
                        text: 'Không trùng mật khẩu cũ'
                      },
                    ].map((req) => (
                      <div key={req.text} className="flex items-center gap-1 text-[10.5px]">
                        {req.ok ? (
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0" />
                        )}
                        <span className={req.ok ? 'text-emerald-800 font-semibold' : 'text-gray-500'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nút bấm Submit & Ghi chú */}
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="submit"
                  disabled={loading || result?.type === 'success'}
                  className="w-full py-2 px-4 rounded-xl text-xs font-bold text-white
                             flex items-center justify-center gap-1.5 transition-all duration-200
                             bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600
                             shadow-sm hover:shadow active:scale-[0.99]
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : (
                    <Lock size={14} className="text-white" />
                  )}
                  <span>{loading ? 'Đang cập nhật mật khẩu…' : 'Cập Nhật Mật Khẩu'}</span>
                </button>

                <div className="flex items-center justify-center gap-1 text-[10.5px] text-amber-700">
                  <ShieldCheck size={12} className="text-amber-600 shrink-0" />
                  <span>Sau khi đổi, hệ thống sẽ tự động thu hồi các phiên đăng nhập khác.</span>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* S2-03: Modal Cắt Ảnh Vuông */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        originalFile={cropFile}
        onClose={() => setCropModalOpen(false)}
        onSuccess={handleAvatarUploadSuccess}
      />

      {/* S2-03: Hộp thoại xác nhận xóa ảnh đại diện */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div
            className="w-full max-w-[400px] bg-white rounded-2xl border border-gray-200 shadow-2xl p-5 flex flex-col gap-3 relative"
            style={{ animation: 'scaleIn 0.2s ease-out' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 size={20} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-gray-900">Xóa ảnh đại diện?</h4>
                <p className="text-xs text-gray-500">
                  Ảnh đại diện sẽ trở về chữ cái mặc định ({initials})
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại? Hành động này sẽ cập nhật trên toàn bộ hệ thống ngay lập tức.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingAvatar}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={deletingAvatar}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {deletingAvatar && <RefreshCw size={12} className="animate-spin text-white" />}
                <span>{deletingAvatar ? 'Đang xóa…' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S2-03: Modal Xem Chi Tiết Ảnh Đại Diện (Lightbox Phóng To) */}
      {showLightbox && user?.avatarUrl && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]"
          onClick={() => setShowLightbox(false)}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div
            className="w-full max-w-[380px] bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 flex flex-col items-center gap-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.2s ease-out' }}
          >
            {/* Nút đóng góc phải */}
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Header thông tin người dùng */}
            <div className="flex flex-col items-center text-center">
              <h3 className="text-base font-bold text-gray-900">{user.fullName || user.username}</h3>
              <span className="text-xs text-gray-500 font-mono">{roleMeta.label} • Mã NV: ERP-{user.id ? String(user.id).padStart(4, '0') : '0001'}</span>
            </div>

            {/* Ảnh phóng to tròn viền đẹp */}
            <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full overflow-hidden ring-4 ring-orange-500/20 shadow-xl bg-gray-50 relative">
              <img
                src={getAvatarFullUrl(user.avatarUrl)}
                alt={user.fullName || user.username}
                className="w-full h-full object-cover"
              />
            </div>



            {/* Hành động trong modal xem ảnh: Đổi ảnh khác hoặc Xóa ảnh */}
            <div className="flex flex-col gap-2 w-full pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLightbox(false);
                    fileInputRef.current?.click();
                  }}
                  className="py-2.5 px-3 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Camera size={14} />
                  <span>Đổi ảnh mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLightbox(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="py-2.5 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Xóa ảnh</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="w-full py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
