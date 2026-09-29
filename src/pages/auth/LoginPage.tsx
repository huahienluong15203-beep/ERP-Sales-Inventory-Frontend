import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { ROLE_METADATA_MAP, RoleName } from '../../types/user';
import { Icons } from '../../components/common/Icons';

interface DemoAccount {
  username: string;
  pass: string;
  role: RoleName;
  name: string;
  badge: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'admin', pass: 'admin123', role: 'ROLE_ADMIN', name: 'Quản Trị Viên Hệ Thống', badge: 'Toàn quyền' },
  { username: 'sales_rep', pass: 'sales123', role: 'ROLE_SALES_REP', name: 'Lê Văn Bán Hàng', badge: 'Kinh doanh' },
  { username: 'sales_manager', pass: 'manager123', role: 'ROLE_SALES_MANAGER', name: 'Trần Quản Lý Kinh Doanh', badge: 'QL Bán hàng' },
  { username: 'wh_staff', pass: 'wh123', role: 'ROLE_WAREHOUSE', name: 'Nguyễn Văn Thủ Kho', badge: 'Thủ kho' },
  { username: 'wh_manager', pass: 'wh123', role: 'ROLE_WH_MANAGER', name: 'Hoàng Quản Lý Kho', badge: 'QL Kho' },
  { username: 'accountant', pass: 'acc123', role: 'ROLE_ACCOUNTANT', name: 'Phạm Thị Kế Toán', badge: 'Kế toán' },
  { username: 'customer_agent', pass: 'cust123', role: 'ROLE_CUSTOMER', name: 'Đại Lý Minh Phát', badge: 'Đại lý B2B' },
];

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Nếu đã đăng nhập thì tự động chuyển vào dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await login(username.trim(), password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage(res.message || 'Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch {
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (acc: DemoAccount) => {
    setUsername(acc.username);
    setPassword(acc.pass);
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const res = await login(acc.username, acc.pass);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage(res.message || 'Lỗi đăng nhập tài khoản mẫu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="erp-login-page">
      <div className="erp-login-container">
        {/* Khối bên trái: Card Đăng nhập */}
        <div className="erp-login-card">
          <div className="erp-login-header">
            <div className="erp-login-logo">
              <Icons.Warehouse size={28} />
            </div>
            <h1 className="erp-login-title">ERP SALES & INVENTORY</h1>
            <p className="erp-login-subtitle">Hệ thống Quản trị Bán hàng & Quản lý Kho hàng</p>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="erp-login-error-alert" role="alert">
              <Icons.ShieldAlert size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form đăng nhập */}
          <form className="erp-login-form" onSubmit={handleSubmit}>
            <div className="erp-form-group">
              <label htmlFor="login-username" className="erp-form-label">
                Tên đăng nhập / Username
              </label>
              <div className="erp-input-wrapper">
                <span className="erp-input-icon">
                  <Icons.User size={18} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  className="erp-form-input"
                  placeholder="Nhập tên tài khoản..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="erp-form-group">
              <div className="erp-form-label-row">
                <label htmlFor="login-password" className="erp-form-label">
                  Mật khẩu
                </label>
              </div>
              <div className="erp-input-wrapper">
                <span className="erp-input-icon">
                  <Icons.ShieldCheck size={18} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="erp-form-input"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="erp-input-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Ẩn hiện mật khẩu"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="erp-btn erp-btn-primary erp-btn-login"
              disabled={isSubmitting}
              id="btn-submit-login"
            >
              {isSubmitting ? (
                <>
                  <div className="erp-spinner-sm"></div>
                  <span>Đang xác thực hệ thống...</span>
                </>
              ) : (
                <>
                  <Icons.CheckSquare size={18} />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* KHU VỰC TÀI KHOẢN MẪU DÀNH CHO GIÁO VIÊN / NGƯỜI CHẤM BÀI (1 CHẠM ĐĂNG NHẬP) */}
          <div className="erp-login-demo-section">
            <div className="erp-demo-divider">
              <span>HOẶC CHỌN NHANH VAI TRÒ ĐỂ CHẤM ĐIỂM (1 CHẠM)</span>
            </div>

            <div className="erp-demo-grid">
              {DEMO_ACCOUNTS.map((acc) => {
                const meta = ROLE_METADATA_MAP[acc.role];
                return (
                  <button
                    key={acc.username}
                    type="button"
                    className="erp-demo-acc-btn"
                    onClick={() => handleQuickLogin(acc)}
                    disabled={isSubmitting}
                    title={`Đăng nhập với vai trò ${meta.label}`}
                  >
                    <span
                      className="erp-demo-acc-badge"
                      style={{ backgroundColor: meta.badgeBg, color: meta.badgeColor }}
                    >
                      {acc.badge}
                    </span>
                    <span className="erp-demo-acc-name">{acc.name}</span>
                    <span className="erp-demo-acc-role">({acc.username})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Khối bên phải: Giới thiệu hệ thống & Quy chuẩn đồ án */}
        <div className="erp-login-aside">
          <div className="erp-aside-content">
            <span className="erp-aside-tag">ĐỒ ÁN THỰC TẬP CƠ SỞ (TTCS_T926_K13C4_N3)</span>
            <h2 className="erp-aside-title">Hệ Thống Bán Hàng & Quản Lý Kho Phân Quyền Đa Tầng</h2>
            <p className="erp-aside-desc">
              Hệ thống đáp ứng trọn vẹn 7 vai trò người dùng (RBAC), kiểm soát menu thông minh
              và giao diện báo lỗi đồng bộ chuẩn mực doanh nghiệp.
            </p>

            <div className="erp-aside-features">
              <div className="erp-aside-feat-item">
                <Icons.ShieldCheck size={20} className="text-emerald" />
                <div>
                  <strong>Phân quyền điều hướng (S1-06):</strong>
                  <span>Mục menu không thuộc quyền sẽ tự động ẩn hoàn toàn.</span>
                </div>
              </div>

              <div className="erp-aside-feat-item">
                <Icons.MapPin size={20} className="text-sky" />
                <div>
                  <strong>Thông tin công tác:</strong>
                  <span>Hiển thị rõ Tên, Vai trò và Kho/Địa bàn làm việc.</span>
                </div>
              </div>

              <div className="erp-aside-feat-item">
                <Icons.AlertTriangle size={20} className="text-amber" />
                <div>
                  <strong>Báo lỗi đồng bộ (S1-07):</strong>
                  <span>Trang 403 & 404 dùng chung giao diện, có gợi ý quay lại luồng làm việc.</span>
                </div>
              </div>

              <div className="erp-aside-feat-item">
                <Icons.ShoppingCart size={20} className="text-indigo" />
                <div>
                  <strong>Chuẩn Mobile 360px:</strong>
                  <span>Thao tác dễ dàng trên mọi thiết bị cầm tay của nhân viên.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
