import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { sendForgotPasswordEmail, changePasswordApi } from '../../services/api';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  Key,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck
} from '../../components/common/Icons';

type AuthViewMode = 'login' | 'forgot_password';

interface DemoAccount {
  username: string;
  pass: string;
  roleLabel: string;
  desc: string;
  badgeColor: string;
  bg: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'admin',
    pass: 'admin123',
    roleLabel: 'Admin Hệ Thống',
    desc: 'Quản trị viên & Phân quyền',
    badgeColor: '#EF4444',
    bg: '#FEF2F2'
  },
  {
    username: 'sales_manager',
    pass: 'manager123',
    roleLabel: 'QL Kinh Doanh',
    desc: 'Duyệt đơn, giá & hạn mức',
    badgeColor: '#EA580C',
    bg: '#FFF7ED'
  },
  {
    username: 'sales_rep',
    pass: 'sales123',
    roleLabel: 'NV Kinh Doanh',
    desc: 'Lên đơn & chăm sóc đại lý',
    badgeColor: '#D97706',
    bg: '#FFFBEB'
  },
  {
    username: 'wh_manager',
    pass: 'wh123',
    roleLabel: 'Quản Lý Kho',
    desc: 'Điều phối & xuất kho FEFO',
    badgeColor: '#059669',
    bg: '#ECFDF5'
  },
  {
    username: 'wh_staff',
    pass: 'wh123',
    roleLabel: 'Thủ Kho',
    desc: 'Kiểm kê, nhập/xuất vật tư',
    badgeColor: '#0891B2',
    bg: '#ECFEFF'
  },
  {
    username: 'accountant',
    pass: 'acc123',
    roleLabel: 'Kế Toán Viên',
    desc: 'Hóa đơn, công nợ & đối soát',
    badgeColor: '#4F46E5',
    bg: '#EEF2FF'
  },
  {
    username: 'customer_agent',
    pass: 'cust123',
    roleLabel: 'Đại Lý B2B',
    desc: 'Minh Phát - Đặt hàng B2B',
    badgeColor: '#7C3AED',
    bg: '#F5F3FF'
  }
];

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user, clearMustChangePassword } = useAuth();
  const navigate = useNavigate();

  // Chế độ xem: Đăng nhập thường hoặc Quên mật khẩu
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');

  // Form đăng nhập
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);

  // Thông báo đăng xuất thành công
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  // Form quên mật khẩu
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);

  // Modal bắt buộc đổi mật khẩu lần đầu (S1-04 + S1-08)
  const [showForceChangeModal, setShowForceChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Trạng thái chung
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Khôi phục tên đăng nhập đã ghi nhớ & hiển thị thông báo đăng xuất nếu vừa logout
  useEffect(() => {
    const saved = localStorage.getItem('erp_remembered_username');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
    if (sessionStorage.getItem('erp_just_logged_out')) {
      sessionStorage.removeItem('erp_just_logged_out');
      setLogoutMessage('Bạn đã đăng xuất an toàn khỏi hệ thống.');
      const timer = setTimeout(() => setLogoutMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Nếu đã đăng nhập và không phải đang đổi mật khẩu thì vào dashboard
  useEffect(() => {
    if (isAuthenticated && !user?.mustChangePassword && !showForceChangeModal) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user?.mustChangePassword, showForceChangeModal, navigate]);

  // Xử lý Đăng Nhập (S1-01)
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập!');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(cleanUsername, password);
      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('erp_remembered_username', cleanUsername);
        } else {
          localStorage.removeItem('erp_remembered_username');
        }

        // Kiểm tra xem tài khoản có gắn cờ bắt buộc đổi mật khẩu lần đầu không (S1-08)
        if (result.user?.mustChangePassword) {
          setShowForceChangeModal(true);
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setErrorMessage(result.message || 'Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch {
      setErrorMessage('Không thể kết nối tới máy chủ backend. Vui lòng thử lại sau!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý Quên Mật Khẩu (S1-03)
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setForgotSuccessMessage(null);

    const email = forgotEmail.trim();
    if (!email) {
      setErrorMessage('Vui lòng nhập địa chỉ email của bạn!');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Địa chỉ email không đúng định dạng!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendForgotPasswordEmail(email);
      if (res.success) {
        setForgotSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng kiểm tra lại dịch vụ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý Đổi Mật Khẩu Lần Đầu (S1-04)
  const handleForceChangePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm cả chữ cái và chữ số!');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    if (newPassword === password) {
      setErrorMessage('Mật khẩu mới không được trùng với mật khẩu tạm!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePasswordApi(password, newPassword, confirmNewPassword);
      if (res.success) {
        clearMustChangePassword();
        setShowForceChangeModal(false);
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%)',
        color: '#0F172A',
        fontFamily: 'var(--erp-font-sans, system-ui, -apple-system, sans-serif)',
        padding: '24px 16px',
        position: 'relative'
      }}
    >
      {/* Auth Card Trung Tâm (Chuẩn Nền Trắng Doanh Nghiệp) */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
          padding: '36px 32px',
          margin: 'auto 0',
          position: 'relative'
        }}
      >
        {/* LOGO CHÍNH THỨC DỰ ÁN */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', marginBottom: '12px' }}>
            <img
              src="/logo-cube.png"
              alt="ERP Sales & Inventory Logo"
              style={{
                width: '100px',
                height: 'auto',
                display: 'block',
                margin: '0 auto',
                transform: 'translateX(-15px)',
                filter: 'drop-shadow(0 6px 14px rgba(249, 115, 22, 0.18))'
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: '#0F172A',
              margin: '0 0 4px 0'
            }}
          >
            ERP SALES & INVENTORY
          </h1>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 500,
              color: '#64748B'
            }}
          >

            <span>Hệ Thống Bán Hàng & Quản Trị Kho</span>
          </div>
        </div>

        {/* Thông báo vừa đăng xuất thành công */}
        {logoutMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '20px',
              lineHeight: 1.45,
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
            <span>{logoutMessage}</span>
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '13px',
              marginBottom: '20px',
              lineHeight: 1.45,
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ======================= CHẾ ĐỘ 1: ĐĂNG NHẬP (S1-01) ======================= */}
        {viewMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            {/* Tên Đăng Nhập */}
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: '#475569',
                  marginBottom: '8px'
                }}
              >
                TÊN ĐĂNG NHẬP
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <User size={18} />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tên tài khoản (vd: admin, wh_staff...)"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '46px',
                    paddingLeft: '44px',
                    paddingRight: '14px',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
                    e.target.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = '#F8FAFC';
                  }}
                />
              </div>
            </div>

            {/* Mật Khẩu */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label
                  htmlFor="password"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    color: '#475569'
                  }}
                >
                  MẬT KHẨU
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('forgot_password');
                    setErrorMessage(null);
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#F97316',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '46px',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
                    e.target.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = '#F8FAFC';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Ghi nhớ đăng nhập */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: '#F97316',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span>Duy trì trạng thái đăng nhập</span>
              </label>
            </div>

            {/* Nút Đăng Nhập */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                boxShadow: '0 8px 22px rgba(249, 115, 22, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                border: 'none',
                opacity: isSubmitting ? 0.8 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#FFFFFF',
                    animation: 'erpSpin 0.8s linear infinite'
                  }}
                />
              ) : (
                <span>ĐĂNG NHẬP HỆ THỐNG</span>
              )}
            </button>

            {/* Bộ chọn tài khoản dùng thử nhanh (1-Click Fill) */}
            <div
              style={{
                marginTop: '22px',
                paddingTop: '16px',
                borderTop: '1px dashed #E2E8F0'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: '#475569'
                    }}
                  >
                    Tài khoản kiểm thử nhanh
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      backgroundColor: '#FFEDD5',
                      color: '#EA580C',
                      fontWeight: 700
                    }}
                  >
                    7 Vai Trò
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Click để điền</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
                  gap: '7px'
                }}
              >
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = selectedDemoRole === acc.username || username === acc.username;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => {
                        setUsername(acc.username);
                        setPassword(acc.pass);
                        setSelectedDemoRole(acc.username);
                        setErrorMessage(null);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: isSelected ? `1.5px solid ${acc.badgeColor}` : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? acc.bg : '#F8FAFC',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      title={`${acc.desc} - Mật khẩu: ${acc.pass}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: isSelected ? acc.badgeColor : '#1E293B' }}>
                          {acc.username}
                        </span>
                        {isSelected && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: acc.badgeColor }} />
                        )}
                      </div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                        {acc.roleLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#94A3B8'
                }}
              >
                <span>* Mật khẩu mẫu sẽ tự động điền</span>
                {selectedDemoRole && (
                  <span style={{ color: '#EA580C', fontWeight: 600 }}>
                    Đã điền: @{selectedDemoRole}
                  </span>
                )}
              </div>
            </div>
          </form>
        )}

        {/* ======================= CHẾ ĐỘ 2: QUÊN MẬT KHẨU (S1-03) ======================= */}
        {viewMode === 'forgot_password' && (
          <div>
            {forgotSuccessMessage ? (
              <div style={{ textAlign: 'center', padding: '16px 0', animation: 'fadeIn 0.3s ease' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#10B981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px'
                  }}
                >
                  <CheckCircle2 size={30} />
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0F172A',
                    marginBottom: '6px'
                  }}
                >
                  Đã Gửi Liên Kết!
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: 1.5,
                    marginBottom: '20px'
                  }}
                >
                  {forgotSuccessMessage}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setForgotSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  QUAY LẠI ĐĂNG NHẬP
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div style={{ marginBottom: '18px' }}>
                  <label
                    htmlFor="forgot-email"
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color: '#475569',
                      marginBottom: '8px'
                    }}
                  >
                    ĐỊA CHỈ EMAIL TÀI KHOẢN
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '14px',
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: 'none'
                      }}
                    >
                      <Mail size={18} />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Nhập email của bạn (vd: example@gmail.com)..."
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        height: '46px',
                        paddingLeft: '44px',
                        paddingRight: '14px',
                        borderRadius: '12px',
                        border: '1.5px solid #E2E8F0',
                        background: '#F8FAFC',
                        color: '#0F172A',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#F97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    * Hệ thống sẽ gửi email chứa liên kết đặt lại mật khẩu có hiệu lực trong 30 phút.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    border: 'none',
                    opacity: isSubmitting ? 0.8 : 1,
                    transition: 'all 0.2s ease',
                    marginBottom: '16px'
                  }}
                >
                  {isSubmitting ? (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: '#FFFFFF',
                        animation: 'erpSpin 0.8s linear infinite'
                      }}
                    />
                  ) : (
                    <span>GỬI LIÊN KẾT ĐẶT LẠI</span>
                  )}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setErrorMessage(null);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#64748B',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Quay lại trang Đăng nhập</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>

      {/* ======================= MODAL: BẮT BUỘC ĐỔI MẬT KHẨU LẦN ĐẦU (S1-04 & S1-08) ======================= */}
      {showForceChangeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)',
              padding: '32px 28px',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#FFF2EE',
                  color: '#F97316',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <ShieldCheck size={32} />
              </div>
              <h2
                style={{
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0 0 6px 0'
                }}
              >
                YÊU CẦU ĐỔI MẬT KHẨU
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748B',
                  lineHeight: 1.45,
                  margin: 0
                }}
              >
                Tài khoản của bạn đang sử dụng mật khẩu tạm do Quản trị viên cấp. Vui lòng thiết lập mật khẩu mới để bảo vệ tài khoản của bạn.
              </p>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '12.5px',
                  marginBottom: '16px'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleForceChangePasswordSubmit}>
              {/* Mật khẩu mới */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="new-pwd"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    color: '#475569',
                    marginBottom: '6px'
                  }}
                >
                  MẬT KHẨU MỚI
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: '#94A3B8', display: 'flex' }}>
                    <Key size={16} />
                  </div>
                  <input
                    id="new-pwd"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự (chữ & số)..."
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '38px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#0F172A',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#F97316';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#CBD5E1';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nhập lại mật khẩu mới */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="confirm-pwd"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    color: '#475569',
                    marginBottom: '6px'
                  }}
                >
                  XÁC NHẬN MẬT KHẨU MỚI
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: '#94A3B8', display: 'flex' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    id="confirm-pwd"
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#0F172A',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#F97316';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#CBD5E1';
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#FFFFFF',
                      animation: 'erpSpin 0.8s linear infinite'
                    }}
                  />
                ) : (
                  <span>LƯU MẬT KHẨU & TIẾP TỤC</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForceChangeModal(false);
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('erp_user_profile');
                }}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#64748B',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Hủy bỏ & Quay lại đăng nhập
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Thông Tin Bản Quyền & Trụ Sở */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          fontSize: '12px',
          color: '#64748B',
          textAlign: 'center',
          marginTop: '16px'
        }}
      >
        <span>Trụ sở chính & Toàn quốc</span>
        <span>•</span>
        <span>Hotline: 1900 6868</span>
        <span>•</span>
        <span>support@erp.com</span>
        <span>•</span>
        <span>© 2026 ERP Sales & Inventory System. All rights reserved.</span>
      </div>
    </div>
  );
};
