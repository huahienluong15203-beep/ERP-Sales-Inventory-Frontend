import type { FC } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_METADATA_MAP } from '../../types/user';

export const ProfilePage: FC = () => {
  const { user, currentRole } = useAuth();
  const roleMeta = ROLE_METADATA_MAP[currentRole];

  return (
    <div className="erp-profile-page">
      <div className="erp-module-header">
        <div>
          <span className="erp-badge badge-epic">EP-01</span>
          <h1 className="erp-module-title">Hồ sơ cá nhân & Thông tin công tác</h1>
          <p className="erp-module-desc">
            Thông tin chi tiết về người dùng, vai trò được phân công và địa bàn/kho phụ trách trong hệ thống ERP.
          </p>
        </div>
      </div>

      <div className="erp-card">
        <div className="erp-card-header">
          <h2 className="erp-card-title">Chi tiết tài khoản nhân sự</h2>
          <span
            className="erp-role-tag"
            style={{ backgroundColor: roleMeta.badgeBg, color: roleMeta.badgeColor }}
          >
            {roleMeta.label}
          </span>
        </div>

        <div className="erp-card-body">
          <div className="erp-profile-detail-grid">
            <div className="erp-detail-item">
              <span className="erp-detail-label">Họ và tên:</span>
              <span className="erp-detail-value font-bold">{user?.fullName}</span>
            </div>

            <div className="erp-detail-item">
              <span className="erp-detail-label">Tên tài khoản (Username):</span>
              <span className="erp-detail-value"><code>{user?.username}</code></span>
            </div>

            <div className="erp-detail-item">
              <span className="erp-detail-label">Vai trò trong hệ thống:</span>
              <span className="erp-detail-value font-bold" style={{ color: roleMeta.badgeColor }}>
                {roleMeta.label} ({currentRole})
              </span>
            </div>

            <div className="erp-detail-item">
              <span className="erp-detail-label">Kho hoặc địa bàn làm việc (Tiêu chí 2):</span>
              <span className="erp-detail-value font-bold text-brand">
                {user?.warehouse || user?.workLocation || 'Toàn quốc'}
              </span>
            </div>

            <div className="erp-detail-item">
              <span className="erp-detail-label">Địa chỉ trụ sở / Nơi làm việc:</span>
              <span className="erp-detail-value">{user?.workLocation}</span>
            </div>

            <div className="erp-detail-item">
              <span className="erp-detail-label">Email liên hệ:</span>
              <span className="erp-detail-value">{user?.email}</span>
            </div>

            <div className="erp-detail-item">
              <span className="erp-detail-label">Số điện thoại:</span>
              <span className="erp-detail-value">{user?.phone}</span>
            </div>

            <div className="erp-detail-item">
              <span className="erp-detail-label">Trạng thái tài khoản:</span>
              <span className="erp-status-badge status-active">Hoạt động (ACTIVE)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
