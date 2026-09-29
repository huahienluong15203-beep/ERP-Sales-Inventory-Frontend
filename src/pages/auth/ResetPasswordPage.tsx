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
  Key,
  Sun,
  Moon
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
  const [isLightMode, setIsLightMode] = useState(false);

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
        background: isLightMode
          ? 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)'
          : 'radial-gradient(ellipse at 50% 20%, rgba(249, 115, 22, 0.08) 0%, rgba(11, 15, 25, 0) 65%), linear-gradient(135deg, #090D16 0%, #0F172A 60%, #0B0F19 100%)',
        color: isLightMode ? '#0F172A' : '#F8FAFC',
        fontFamily: 'var(--erp-font-sans, system-ui, -apple-system, sans-serif)',
        padding: '24px 16px',
        position: 'relative',
        transition: 'background 0.3s ease'
      }}
    >
      {/* Nút chuyển chế độ sáng/tối */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '8px'
        }}
      >
        <button
          type="button"
          onClick={() => setIsLightMode(!isLightMode)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 500,
            background: isLightMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
            color: isLightMode ? '#334155' : '#E2E8F0',
            border: isLightMode ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isLightMode ? <Moon size={16} /> : <Sun size={16} color="#FBBF24" />}
          <span>{isLightMode ? 'Chế độ Tối' : 'Chế độ Sáng'}</span>
        </button>
      </div>

      {/* Card Đặt lại mật khẩu */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: isLightMode ? '#FFFFFF' : 'rgba(15, 23, 42, 0.9)',
          borderRadius: '24px',
          border: isLightMode ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isLightMode
            ? '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0,0,0,0.04)'
            : '0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(249, 115, 22, 0.12)',
          padding: '36px 32px',
          backdropFilter: 'blur(20px)',
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
                filter: 'drop-shadow(0 12px 28px rgba(249, 115, 22, 0.28))'
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '21px',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: isLightMode ? '#0F172A' : '#FFFFFF',
              marginBottom: '4px'
            }}
          >
            ĐẶT LẠI MẬT KHẨU
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: isLightMode ? '#64748B' : '#94A3B8',
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
              background: isLightMode ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
              border: isLightMode ? '1px solid #FECACA' : '1px solid rgba(239, 68, 68, 0.25)',
              color: isLightMode ? '#DC2626' : '#FCA5A5',
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
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22C55E',
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
                color: isLightMode ? '#0F172A' : '#FFFFFF',
                marginBottom: '8px'
              }}
            >
              Thành Công!
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: isLightMode ? '#475569' : '#CBD5E1',
                lineHeight: 1.5,
                marginBottom: '20px'
              }}
            >
              {successMessage}
            </p>
            <p
              style={{
                fontSize: '12.5px',
                color: isLightMode ? '#94A3B8' : '#64748B',
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
                  color: isLightMode ? '#475569' : '#94A3B8',
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
                    color: isLightMode ? '#94A3B8' : '#64748B',
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
                    border: isLightMode
                      ? '1.5px solid #E2E8F0'
                      : '1.5px solid rgba(255, 255, 255, 0.1)',
                    background: isLightMode ? '#F8FAFC' : 'rgba(11, 15, 25, 0.6)',
                    color: isLightMode ? '#0F172A' : '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isLightMode ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'none';
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
                    color: isLightMode ? '#94A3B8' : '#64748B',
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
                  color: isLightMode ? '#475569' : '#94A3B8',
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
                    color: isLightMode ? '#94A3B8' : '#64748B',
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
                    border: isLightMode
                      ? '1.5px solid #E2E8F0'
                      : '1.5px solid rgba(255, 255, 255, 0.1)',
                    background: isLightMode ? '#F8FAFC' : 'rgba(11, 15, 25, 0.6)',
                    color: isLightMode ? '#0F172A' : '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isLightMode ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'none';
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
                    color: isLightMode ? '#94A3B8' : '#64748B',
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

            {/* Bảng checklist kiểm tra mật khẩu */}
            <div
              style={{
                marginBottom: '24px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: isLightMode ? '#F1F5F9' : 'rgba(255, 255, 255, 0.04)',
                border: isLightMode ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '12px'
              }}
            >
              <div style={{ fontWeight: 600, color: isLightMode ? '#475569' : '#94A3B8', marginBottom: '8px' }}>
                Tiêu chuẩn bảo mật mật khẩu:
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasMinLength ? '#22C55E' : (isLightMode ? '#64748B' : '#94A3B8') }}>
                  <span>{hasMinLength ? '✓' : '○'}</span>
                  <span>Tối thiểu 8 ký tự</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasLetter ? '#22C55E' : (isLightMode ? '#64748B' : '#94A3B8') }}>
                  <span>{hasLetter ? '✓' : '○'}</span>
                  <span>Chứa ít nhất một chữ cái</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasNumber ? '#22C55E' : (isLightMode ? '#64748B' : '#94A3B8') }}>
                  <span>{hasNumber ? '✓' : '○'}</span>
                  <span>Chứa ít nhất một chữ số (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMatch ? '#22C55E' : (isLightMode ? '#64748B' : '#94A3B8') }}>
                  <span>{isMatch ? '✓' : '○'}</span>
                  <span>Mật khẩu xác nhận trùng khớp</span>
                </div>
              </div>
            </div>

            {/* Nút lưu mật khẩu */}
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid || !token}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                background: isFormValid
                  ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
                  : (isLightMode ? '#CBD5E1' : '#334155'),
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                boxShadow: isFormValid ? '0 8px 20px rgba(249, 115, 22, 0.35)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
                border: 'none',
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
                <span>LƯU MẬT KHẨU MỚI</span>
              )}
            </button>
          </form>
        )}

        {/* Nút quay lại đăng nhập */}
        <div style={{ marginTop: '22px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: isLightMode ? '#64748B' : '#94A3B8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              transition: 'color 0.2s'
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại trang Đăng nhập</span>
          </button>
        </div>
      </div>

      {/* Footer */}
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
          color: isLightMode ? '#94A3B8' : '#64748B',
          textAlign: 'center',
          marginTop: '16px'
        }}
      >
        <span>ERP Sales & Inventory System</span>
        <span>•</span>
        <span>Hotline: 1900 6868</span>
        <span>•</span>
        <span>Bảo mật 256-bit SSL</span>
      </div>
    </div>
  );
};
