import type { FC } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from '../../routes/Router';
import { ROLE_METADATA_MAP } from '../../types/user';
import type { RoleName } from '../../types/user';
import { getAllowedRolesForPath } from '../../services/menuConfig';
import {
  ShieldAlert,
  Home,
  ArrowLeft,
  User,
  MapPin,
  Lock
} from '../../components/common/Icons';

interface ForbiddenPageProps {
  attemptedPath?: string;
  requiredRoles?: RoleName[];
}

export const ForbiddenPage: FC<ForbiddenPageProps> = ({ attemptedPath, requiredRoles }) => {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = attemptedPath || location.pathname;
  const currentRoleMeta = ROLE_METADATA_MAP[currentRole];
  const allowedRoles = requiredRoles || getAllowedRolesForPath(currentPath);

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
          maxWidth: '580px',
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          padding: '40px 36px',
          textAlign: 'center'
        }}
      >
        {/* Biểu tượng Shield Alert */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: '#FEF2F2',
            color: '#EF4444',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '1px solid #FEE2E2'
          }}
        >
          <ShieldAlert size={38} />
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
          MÃ LỖI 403 • FORBIDDEN
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#111827',
            marginBottom: '10px'
          }}
        >
          Từ Chối Quyền Truy Cập
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: '#6B7280',
            lineHeight: 1.6,
            marginBottom: '24px'
          }}
        >
          Tài khoản của bạn hiện không có thẩm quyền truy cập phân hệ{' '}
          <strong style={{ color: '#111827', wordBreak: 'break-all' }}>
            {currentPath}
          </strong>
          . Vui lòng liên hệ Quản trị viên nếu bạn cần cấp quyền cho nghiệp vụ này.
        </p>

        {/* Chi tiết tài khoản & Vai trò hiện tại */}
        <div
          style={{
            background: '#F9FAFB',
            borderRadius: '14px',
            border: '1px solid #E5E7EB',
            padding: '16px 20px',
            textAlign: 'left',
            fontSize: '13px',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} />
              <span>Tài khoản hiện tại:</span>
            </span>
            <strong style={{ color: '#111827' }}>{user?.fullName}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={15} />
              <span>Vai trò hiệu lực:</span>
            </span>
            <span
              style={{
                background: currentRoleMeta.badgeBg,
                color: currentRoleMeta.badgeColor,
                padding: '2px 10px',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '12px'
              }}
            >
              {currentRoleMeta.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} />
              <span>Kho / Địa bàn:</span>
            </span>
            <span style={{ color: '#374151', fontWeight: 500 }}>
              {user?.warehouse || user?.workLocation || 'Trụ sở chính'}
            </span>
          </div>

          {allowedRoles.length > 0 && (
            <div
              style={{
                borderTop: '1px solid #E5E7EB',
                paddingTop: '10px',
                marginTop: '4px'
              }}
            >
              <div style={{ color: '#6B7280', marginBottom: '6px', fontSize: '12px' }}>
                Các vai trò được phép truy cập:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allowedRoles.map((r) => (
                  <span
                    key={r}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      color: '#4B5563',
                      fontWeight: 500
                    }}
                  >
                    {ROLE_METADATA_MAP[r]?.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

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
