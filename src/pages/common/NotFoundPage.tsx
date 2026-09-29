import React from 'react';
import { useNavigate, useLocation } from '../../routes/Router';
import { AlertTriangle, Home, ArrowLeft } from '../../components/common/Icons';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        minHeight: 'calc(100vh - 120px)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          padding: '40px 36px',
          textAlign: 'center'
        }}
      >
        {/* Biểu tượng 404 */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: '#FFFBEB',
            color: '#D97706',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '1px solid #FDE68A'
          }}
        >
          <AlertTriangle size={38} />
        </div>

        {/* Mã lỗi & Tiêu đề */}
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: '#FFF5F1',
            color: '#F85606',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.6px',
            marginBottom: '12px'
          }}
        >
          MÃ LỖI 404 • NOT FOUND
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#111827',
            marginBottom: '10px'
          }}
        >
          Không Tìm Thấy Trang
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: '#6B7280',
            lineHeight: 1.6,
            marginBottom: '24px'
          }}
        >
          Đường dẫn <strong style={{ color: '#111827', wordBreak: 'break-all' }}>{location.pathname}</strong>{' '}
          không tồn tại hoặc đã được di chuyển trong hệ thống ERP.
        </p>

        {/* Nút hành động quay lại luồng làm việc (Story S1-07) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(238, 77, 45, 0.3)',
              cursor: 'pointer'
            }}
          >
            <Home size={16} />
            <span>Về Bàn Làm Việc</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '9999px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay Lại Trang Trước</span>
          </button>
        </div>
      </div>
    </div>
  );
};
