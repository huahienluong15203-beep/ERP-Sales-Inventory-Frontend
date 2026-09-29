import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { SYSTEM_DEMO_CREDENTIALS } from '../../services/api';
import {
  Package,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
  Sparkles
} from '../../components/common/Icons';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  // Nếu đã đăng nhập thì tự động chuyển vào dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage('Vui lòng nhập tên đăng nhập!');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu!');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(result.message || 'Đăng nhập thất bại!');
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoAccount = (uname: string, pass: string) => {
    setUsername(uname);
    setPassword(pass);
    setShowHintModal(false);
    setErrorMessage(null);
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
          ? 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)'
          : 'linear-gradient(135deg, #090E17 0%, #111827 50%, #0F172A 100%)',
        color: isLightMode ? '#111827' : '#F9FAFB',
        fontFamily: 'var(--erp-font-sans)',
        padding: '24px 16px',
        position: 'relative',
        transition: 'background 0.3s ease'
      }}
    >
      {/* Nút chuyển chế độ sáng tối ở góc trên bên phải (như App ETC) */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '12px'
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
            background: isLightMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
            color: isLightMode ? '#374151' : '#E5E7EB',
            border: isLightMode ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isLightMode ? <Moon size={16} /> : <Sun size={16} color="#FBBF24" />}
          <span>{isLightMode ? 'Chế độ Tối' : 'Chế độ Sáng'}</span>
        </button>
      </div>

      {/* Centered Login Card (Phong cách chuẩn App ETC + Tone Cam Lazada) */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: isLightMode ? '#FFFFFF' : 'rgba(19, 27, 44, 0.95)',
          borderRadius: '24px',
          border: isLightMode ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isLightMode
            ? '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.02)'
            : '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(248, 86, 6, 0.1)',
          padding: '36px 32px',
          backdropFilter: 'blur(16px)',
          margin: 'auto 0'
        }}
      >
        {/* Logo & Subtitle */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)',
              color: '#FFFFFF',
              boxShadow: '0 8px 20px rgba(238, 77, 45, 0.35)',
              marginBottom: '16px'
            }}
          >
            <Package size={30} />
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '0.3px',
              color: isLightMode ? '#111827' : '#FFFFFF',
              marginBottom: '6px'
            }}
          >
            ERP <span style={{ color: '#F85606' }}>SALES & WH</span>
          </h1>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 500,
              color: isLightMode ? '#6B7280' : '#38BDF8'
            }}
          >
            <Sparkles size={14} />
            <span>Hệ Thống Bán Hàng & Quản Trị Kho</span>
          </div>
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
              border: isLightMode ? '1px solid #FCA5A5' : '1px solid rgba(239, 68, 68, 0.3)',
              color: isLightMode ? '#B91C1C' : '#FCA5A5',
              fontSize: '13px',
              marginBottom: '20px',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Đăng Nhập */}
        <form onSubmit={handleSubmit}>
          {/* Tên Đăng Nhập */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: isLightMode ? '#4B5563' : '#94A3B8',
                marginBottom: '8px'
              }}
            >
              TÊN ĐĂNG NHẬP
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: isLightMode ? '#9CA3AF' : '#64748B',
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
                placeholder="Nhập tên đăng nhập (vd: admin, wh_staff...)"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '46px',
                  paddingLeft: '44px',
                  paddingRight: '14px',
                  borderRadius: '12px',
                  border: isLightMode
                    ? '1.5px solid #E5E7EB'
                    : '1.5px solid rgba(255, 255, 255, 0.1)',
                  background: isLightMode ? '#F9FAFB' : 'rgba(15, 23, 42, 0.6)',
                  color: isLightMode ? '#111827' : '#FFFFFF',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#F85606';
                  e.target.style.boxShadow = '0 0 0 3px rgba(248, 86, 6, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isLightMode
                    ? '#E5E7EB'
                    : 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Mật Khẩu */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: isLightMode ? '#4B5563' : '#94A3B8',
                marginBottom: '8px'
              }}
            >
              MẬT KHẨU
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: isLightMode ? '#9CA3AF' : '#64748B',
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
                  border: isLightMode
                    ? '1.5px solid #E5E7EB'
                    : '1.5px solid rgba(255, 255, 255, 0.1)',
                  background: isLightMode ? '#F9FAFB' : 'rgba(15, 23, 42, 0.6)',
                  color: isLightMode ? '#111827' : '#FFFFFF',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#F85606';
                  e.target.style.boxShadow = '0 0 0 3px rgba(248, 86, 6, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isLightMode
                    ? '#E5E7EB'
                    : 'rgba(255, 255, 255, 0.1)';
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
                  color: isLightMode ? '#9CA3AF' : '#64748B',
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

          {/* Nút Đăng Nhập dạng Pill Gradient Cam Lazada có Spinner */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.3px',
              boxShadow: '0 6px 18px rgba(238, 77, 45, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.8 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? (
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#FFFFFF',
                  animation: 'erpSpin 0.8s linear infinite'
                }}
              />
            ) : (
              <span>ĐĂNG NHẬP</span>
            )}
          </button>
        </form>

        {/* Dòng Quên mật khẩu & Hỗ trợ chuẩn App ETC */}
        <div
          style={{
            marginTop: '22px',
            textAlign: 'center',
            fontSize: '12.5px',
            color: isLightMode ? '#6B7280' : '#94A3B8'
          }}
        >
          <span>Quên mật khẩu? </span>
          <span style={{ color: '#F85606', fontWeight: 600, cursor: 'pointer' }}>
            Vui lòng liên hệ Quản trị viên để được hỗ trợ
          </span>
        </div>

        {/* Nút nhỏ xem danh sách tài khoản hệ thống (ẩn gọn gàng, không phá giao diện) */}
        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowHintModal(!showHintModal)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: isLightMode ? '#9CA3AF' : '#64748B',
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'transparent',
              transition: 'color 0.2s'
            }}
          >
            <HelpCircle size={14} />
            <span>Xem danh sách tài khoản mẫu</span>
          </button>

          {showHintModal && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '12px',
                background: isLightMode ? '#F9FAFB' : 'rgba(15, 23, 42, 0.8)',
                border: isLightMode ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'left',
                fontSize: '12px'
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: isLightMode ? '#374151' : '#E2E8F0'
                }}
              >
                Nhấp để điền nhanh:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '6px'
                }}
              >
                {Object.entries(SYSTEM_DEMO_CREDENTIALS).map(([key, acc]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectDemoAccount(key, acc.pass)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: isLightMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                      border: isLightMode ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isLightMode ? '#1F2937' : '#CBD5E1',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{acc.name}</span>
                    <span style={{ fontSize: '11px', color: '#F85606' }}>
                      {key} / {acc.pass}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Thông Tin Bản Quyền & Trụ Sở dưới đáy trang */}
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
          color: isLightMode ? '#9CA3AF' : '#64748B',
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
