import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from '../../routes/Router';
import { ROLE_METADATA_MAP } from '../../types/user';
import { Icons } from '../../components/common/Icons';

export const NotFoundPage: React.FC = () => {
  const { currentRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentRoleMeta = ROLE_METADATA_MAP[currentRole];
  const myHomePath = currentRoleMeta?.defaultPath || '/dashboard';

  return (
    <div className="erp-error-container">
      <div className="erp-error-card">
        {/* Biểu tượng tìm kiếm không thấy */}
        <div className="erp-error-icon-wrapper not-found">
          <Icons.AlertTriangle size={48} className="text-warning" />
        </div>

        {/* Mã lỗi & Tiêu đề */}
        <div className="erp-error-badge not-found">LỖI 404 • KHÔNG TÌM THẤY TRANG</div>
        <h1 className="erp-error-title">Truy cập nhầm chỗ hoặc đường dẫn không tồn tại</h1>

        {/* Mô tả giải thích */}
        <p className="erp-error-desc">
          Bạn vừa truy cập đường dẫn <code className="erp-code-pill">{location.pathname}</code>.
          Hệ thống ERP Sales & Inventory không tìm thấy tính năng nào khớp với địa chỉ này.
        </p>

        <div className="erp-help-note">
          <p>
            Vui lòng kiểm tra lại chính tả đường link hoặc sử dụng thanh menu điều hướng bên trái
            để truy cập đúng các chức năng được cấp phép cho vai trò <strong>{currentRoleMeta?.label}</strong>.
          </p>
        </div>

        {/* HÀNH ĐỘNG GỢI Ý ĐỂ QUAY LẠI LUỒNG LÀM VIỆC (Acceptance Criteria S1-07) */}
        <div className="erp-action-group">
          <button
            type="button"
            className="erp-btn erp-btn-primary"
            onClick={() => navigate(myHomePath)}
            id="btn-notfound-my-home"
          >
            <Icons.Home size={18} />
            <span>Về bàn làm việc chính ({currentRoleMeta?.label})</span>
          </button>

          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(-1)}
            id="btn-notfound-back"
          >
            <Icons.ArrowLeft size={18} />
            <span>Quay lại trang trước</span>
          </button>
        </div>
      </div>
    </div>
  );
};
