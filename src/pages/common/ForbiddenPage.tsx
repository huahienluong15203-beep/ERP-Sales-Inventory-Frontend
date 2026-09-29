import type { FC } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from '../../routes/Router';
import { ROLE_METADATA_MAP, type RoleName } from '../../types/user';
import { getAllowedRolesForPath } from '../../services/menuConfig';
import { Icons } from '../../components/common/Icons';

interface ForbiddenPageProps {
  attemptedPath?: string;
  requiredRoles?: RoleName[];
}

export const ForbiddenPage: FC<ForbiddenPageProps> = ({ attemptedPath, requiredRoles }) => {
  const { user, currentRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = attemptedPath || location.pathname;
  const currentRoleMeta = ROLE_METADATA_MAP[currentRole];
  const allowedRoles = requiredRoles || getAllowedRolesForPath(currentPath);

  // Đường dẫn mặc định an toàn cho vai trò hiện tại
  const myHomePath = currentRoleMeta?.defaultPath || '/dashboard';

  return (
    <div className="erp-error-container">
      <div className="erp-error-card">
        {/* Biểu tượng cảnh báo phân quyền */}
        <div className="erp-error-icon-wrapper forbidden">
          <Icons.ShieldAlert size={48} className="text-danger" />
        </div>

        {/* Mã lỗi & Tiêu đề chính */}
        <div className="erp-error-badge forbidden">LỖI 403 • FORBIDDEN</div>
        <h1 className="erp-error-title">Không đủ quyền truy cập chức năng này</h1>

        {/* Mô tả giải thích chi tiết */}
        <p className="erp-error-desc">
          Bạn đang cố gắng truy cập đường dẫn <code className="erp-code-pill">{currentPath}</code>.
          Hệ thống bảo mật RBAC phát hiện tài khoản hiện tại không có quyền thực hiện nghiệp vụ này.
        </p>

        {/* Bảng so sánh quyền hạn hiện tại vs quyền cần thiết */}
        <div className="erp-permission-box">
          <div className="erp-permission-row">
            <span className="erp-permission-label">Tài khoản & Vai trò hiện tại:</span>
            <div className="erp-role-tag" style={{ backgroundColor: currentRoleMeta.badgeBg, color: currentRoleMeta.badgeColor }}>
              <span className="erp-role-tag-dot" style={{ backgroundColor: currentRoleMeta.badgeColor }}></span>
              <strong>{user?.fullName || currentRoleMeta.label}</strong> ({currentRoleMeta.label})
            </div>
          </div>

          <div className="erp-permission-row">
            <span className="erp-permission-label">Khu vực / Kho đang làm việc:</span>
            <span className="erp-permission-val">{user?.warehouse || user?.workLocation || 'Chưa thiết lập'}</span>
          </div>

          {allowedRoles.length > 0 && (
            <div className="erp-permission-row">
              <span className="erp-permission-label">Các vai trò được phép truy cập:</span>
              <div className="erp-allowed-roles-list">
                {allowedRoles.map((r) => {
                  const meta = ROLE_METADATA_MAP[r];
                  return (
                    <span key={r} className="erp-allowed-pill" title={meta.description}>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* HÀNH ĐỘNG GỢI Ý ĐỂ QUAY LẠI LUỒNG LÀM VIỆC (Acceptance Criteria S1-07) */}
        <div className="erp-action-group">
          <button
            type="button"
            className="erp-btn erp-btn-primary"
            onClick={() => navigate(myHomePath)}
            id="btn-return-my-home"
          >
            <Icons.Home size={18} />
            <span>Về trang chủ của tôi ({currentRoleMeta.label})</span>
          </button>

          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(-1)}
            id="btn-go-back"
          >
            <Icons.ArrowLeft size={18} />
            <span>Quay lại trang trước</span>
          </button>
        </div>

        {/* Trợ giúp kiểm thử nhanh cho giảng viên / người chấm */}
        {allowedRoles.length > 0 && (
          <div className="erp-test-helper">
            <span className="erp-test-helper-title">💡 Dành cho giảng viên / Người chấm kiểm thử phân quyền:</span>
            <div className="erp-test-helper-btns">
              {allowedRoles.map((targetRole) => (
                <button
                  key={targetRole}
                  type="button"
                  className="erp-btn erp-btn-sm erp-btn-outline"
                  onClick={async () => {
                    await switchRole(targetRole);
                    navigate(currentPath);
                  }}
                >
                  <Icons.RefreshCw size={14} />
                  <span>Đổi sang {ROLE_METADATA_MAP[targetRole].label} để vào ngay</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
