import type { FC } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_METADATA_MAP, type RoleName } from '../../types/user';
import { Icons, DynamicIcon } from '../../components/common/Icons';

interface ModulePageProps {
  title: string;
  epic: string;
  description: string;
  iconName: string;
  allowedRoles: RoleName[];
}

export const ModulePage: FC<ModulePageProps> = ({
  title,
  epic,
  description,
  iconName,
  allowedRoles
}) => {
  const { currentRole, user } = useAuth();
  const roleMeta = ROLE_METADATA_MAP[currentRole];

  return (
    <div className="erp-module-page">
      {/* Header của phân hệ */}
      <div className="erp-module-header">
        <div className="erp-module-header-left">
          <div className="erp-module-icon-box">
            <DynamicIcon name={iconName} size={28} />
          </div>
          <div>
            <div className="erp-module-badges">
              <span className="erp-badge badge-epic">{epic}</span>
              <span className="erp-badge badge-success">Đã xác thực quyền</span>
            </div>
            <h1 className="erp-module-title">{title}</h1>
            <p className="erp-module-desc">{description}</p>
          </div>
        </div>

        <div className="erp-module-header-right">
          <div className="erp-user-badge-mini" style={{ backgroundColor: roleMeta.badgeBg, color: roleMeta.badgeColor }}>
            <span>Đang truy cập với vai trò:</span>
            <strong>{roleMeta.label}</strong>
          </div>
        </div>
      </div>

      {/* Thông tin ngữ cảnh người dùng đang làm việc (Tiêu chí 2 S1-06) */}
      <div className="erp-context-strip">
        <div className="erp-context-item">
          <Icons.User size={15} />
          <span>Nhân sự: <strong>{user?.fullName}</strong></span>
        </div>
        <div className="erp-context-divider">•</div>
        <div className="erp-context-item">
          <Icons.MapPin size={15} />
          <span>Điểm công tác: <strong>{user?.warehouse || user?.workLocation}</strong></span>
        </div>
        <div className="erp-context-divider">•</div>
        <div className="erp-context-item">
          <Icons.ShieldCheck size={15} />
          <span>Quyền hạn: <strong>{roleMeta.label}</strong></span>
        </div>
      </div>

      {/* Khung nội dung nghiệp vụ mẫu */}
      <div className="erp-card">
        <div className="erp-card-header">
          <h2 className="erp-card-title">Dữ liệu phân hệ {title}</h2>
          <span className="erp-badge badge-neutral">Dữ liệu hoạt động</span>
        </div>

        <div className="erp-card-body">
          <div className="erp-info-callout">
            <Icons.CheckSquare size={20} className="text-success" />
            <div>
              <strong>Phân quyền thành công:</strong> Vai trò <code>{currentRole}</code> của bạn nằm trong danh sách được phép truy cập chức năng này:
              <div className="erp-allowed-pills-wrap">
                {allowedRoles.map((r) => (
                  <span
                    key={r}
                    className={`erp-pill-mini ${r === currentRole ? 'current' : ''}`}
                  >
                    {ROLE_METADATA_MAP[r].label} {r === currentRole ? '✓ (Bạn)' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu demo trực quan theo chuẩn ERP Design System */}
          <div className="erp-table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã chứng từ / Bản ghi</th>
                  <th>Nội dung nghiệp vụ</th>
                  <th>Phạm vi / Kho phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật gần nhất</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>DOC-2026-001</code></td>
                  <td>Giao dịch ghi nhận tại {user?.warehouse || 'Chi nhánh'}</td>
                  <td>{user?.warehouse || 'Kho Tổng'}</td>
                  <td><span className="erp-status-badge status-active">Hoạt động</span></td>
                  <td>29/09/2026 15:30</td>
                </tr>
                <tr>
                  <td><code>DOC-2026-002</code></td>
                  <td>Kiểm soát định kỳ theo chuẩn ISO ERP</td>
                  <td>{user?.workLocation || 'Trụ sở'}</td>
                  <td><span className="erp-status-badge status-pending">Đang xử lý</span></td>
                  <td>29/09/2026 14:15</td>
                </tr>
                <tr>
                  <td><code>DOC-2026-003</code></td>
                  <td>Hồ sơ phân quyền và nhật ký thẻ kho</td>
                  <td>Hệ thống trung tâm</td>
                  <td><span className="erp-status-badge status-active">Hoàn tất</span></td>
                  <td>29/09/2026 11:00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
