import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from '../../routes/Router';
import { resetPasswordWithToken } from '../../services/api';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Key
} from '../../components/common/Icons';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Lấy token từ query string trên URL (?token=...)
  const [token, setToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setErrorMessage('Không tìm thấy mã token xác thực trên liên kết. Vui lòng kiểm tra lại email của bạn!');
    }
  }, []);

  // Tiêu chí mật khẩu
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && isMatch;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Mã token không hợp lệ hoặc đã bị thiếu!');
      return;
    }

    if (!isFormValid) {
      setErrorMessage('Mật khẩu mới chưa đáp ứng đủ tiêu chí bảo mật hoặc xác nhận chưa khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPasswordWithToken(token, newPassword);
      if (result.success) {
        setSuccessMessage(result.message);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại!');
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
      {/* Card Đặt lại mật khẩu (Nền Trắng Doanh Nghiệp) */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
          padding: '36px 32px',
          margin: 'auto 0'
        }}
      >
        {/* Logo chính hãng ERP Sales & Inventory */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', marginBottom: '14px' }}>
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
              fontSize: '21px',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: '#0F172A',
              marginBottom: '4px'
            }}
          >
            ĐẶT LẠI MẬT KHẨU
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#64748B',
              margin: 0
            }}
          >
            Nhập mật khẩu mới cho tài khoản của bạn (liên kết bảo mật 30 phút)
          </p>
        </div>

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
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMessage ? (
          <div
            style={{
              textAlign: 'center',
              padding: '20px 10px',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#ECFDF5',
                color: '#10B981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: '#0F172A',
                marginBottom: '8px'
              }}
            >
              Thành Công!
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#475569',
                lineHeight: 1.5,
                marginBottom: '20px'
              }}
            >
              {successMessage}
            </p>
            <p
              style={{
                fontSize: '12.5px',
                color: '#94A3B8',
                marginBottom: '20px'
              }}
            >
              Đang tự động chuyển hướng về trang đăng nhập trong giây lát...
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)'
              }}
            >
              ĐĂNG NHẬP NGAY
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Mật Khẩu Mới */}
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="new-password"
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
                MẬT KHẨU MỚI
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
                  <Key size={18} />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập tối thiểu 8 ký tự (chữ & số)..."
                  disabled={isSubmitting || !token}
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

            {/* Xác Nhận Mật Khẩu */}
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="confirm-password"
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
                XÁC NHẬN MẬT KHẨU
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
                  <Lock size={18} />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  disabled={isSubmitting || !token}
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Checklist Tiêu Chuẩn Mật Khẩu */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '22px',
                fontSize: '12px'
              }}
            >
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Yêu cầu mật khẩu an toàn:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLength ? '#10B981' : '#64748B' }}>
                  <CheckCircle2 size={14} color={hasMinLength ? '#10B981' : '#CBD5E1'} />
                  <span>Ít nhất 8 ký tự</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasLetter ? '#10B981' : '#64748B' }}>
                  <CheckCircle2 size={14} color={hasLetter ? '#10B981' : '#CBD5E1'} />
                  <span>Bao gồm chữ cái (A-Z, a-z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasNumber ? '#10B981' : '#64748B' }}>
                  <CheckCircle2 size={14} color={hasNumber ? '#10B981' : '#CBD5E1'} />
                  <span>Bao gồm ít nhất một chữ số (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isMatch ? '#10B981' : '#64748B' }}>
                  <CheckCircle2 size={14} color={isMatch ? '#10B981' : '#CBD5E1'} />
                  <span>Xác nhận mật khẩu trùng khớp</span>
                </div>
              </div>
            </div>

            {/* Nút Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid || !token}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                background: isFormValid && token
                  ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
                  : '#CBD5E1',
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                boxShadow: isFormValid && token
                  ? '0 8px 22px rgba(249, 115, 22, 0.35)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: isFormValid && token && !isSubmitting ? 'pointer' : 'not-allowed',
                border: 'none',
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
                <span>LƯU MẬT KHẨU MỚI</span>
              )}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
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
                <span>Quay lại Đăng nhập</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          fontSize: '12px',
          color: '#64748B',
          textAlign: 'center',
          marginTop: '16px'
        }}
      >
        <span>© 2026 ERP Sales & Inventory System. All rights reserved.</span>
      </div>
    </div>
  );
};
