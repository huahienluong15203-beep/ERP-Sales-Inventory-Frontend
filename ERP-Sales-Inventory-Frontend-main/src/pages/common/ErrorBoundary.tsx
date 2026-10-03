import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icons } from '../../components/common/Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary bắt các lỗi runtime trong ứng dụng để ngăn chặn "màn hình trắng" (White Screen of Death)
 * Đảm bảo trải nghiệm chuyên nghiệp cho người dùng và giảng viên chấm bài (Story S1-07)
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lỗi ứng dụng được bắt bởi ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="erp-error-container">
          <div className="erp-error-card">
            <div className="erp-error-icon-wrapper forbidden">
              <Icons.AlertTriangle size={48} className="text-danger" />
            </div>
            <div className="erp-error-badge forbidden">LỖI HỆ THỐNG</div>
            <h1 className="erp-error-title">Đã xảy ra sự cố hiển thị ngoài dự kiến</h1>
            <p className="erp-error-desc">
              Giao diện gặp lỗi trong quá trình xử lý dữ liệu. Hệ thống đã ngăn chặn màn hình trắng
              để bạn có thể tiếp tục công việc.
            </p>
            {this.state.errorMessage && (
              <pre className="erp-code-block">{this.state.errorMessage}</pre>
            )}
            <div className="erp-action-group">
              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  window.location.href = '/dashboard';
                }}
              >
                <Icons.Home size={18} />
                <span>Tải lại bàn làm việc</span>
              </button>
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => window.location.reload()}
              >
                <Icons.RefreshCw size={18} />
                <span>Làm mới trình duyệt</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
