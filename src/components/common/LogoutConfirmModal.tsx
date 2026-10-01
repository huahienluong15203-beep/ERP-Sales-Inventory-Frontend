import React, { useEffect } from 'react';
import type { UserProfile, RoleName } from '../../types/user';
import { ROLE_METADATA_MAP } from '../../types/user';
import { Icons } from './Icons';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  user?: UserProfile | null;
  currentRole?: RoleName;
  isLoggingOut?: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  currentRole,
  isLoggingOut = false
}) => {
  // Lắng nghe phím Escape để đóng modal khi không bận
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoggingOut, onClose]);

  if (!isOpen) return null;

  const roleMeta = currentRole ? ROLE_METADATA_MAP[currentRole] : null;

  // Lấy 2 chữ cái đầu cho Avatar
  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoggingOut) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          padding: '28px 24px',
          position: 'relative',
          animation: 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Nút đóng modal góc phải */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoggingOut}
          aria-label="Đóng cửa sổ"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#F1F5F9',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isLoggingOut) {
              e.currentTarget.style.backgroundColor = '#E2E8F0';
              e.currentTarget.style.color = '#0F172A';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F1F5F9';
            e.currentTarget.style.color = '#64748B';
          }}
        >
          <Icons.X size={16} />
        </button>

        {/* Biểu tượng cảnh báo đăng xuất */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #FEE2E2 0%, #FFEDD5 100%)',
              color: '#EF4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 8px 18px -4px rgba(239, 68, 68, 0.25)',
              border: '1.5px solid #FECACA'
            }}
          >
            <Icons.LogOut size={26} color="#DC2626" />
          </div>

          <h3
            id="logout-dialog-title"
            style={{
              fontSize: '18.5px',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px'
            }}
          >
            Xác Nhận Đăng Xuất
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: '#64748B',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại và đăng xuất khỏi hệ thống không?
          </p>
        </div>

        {/* Thông tin tài khoản đang đăng nhập */}
        {user && (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 3px 8px rgba(249, 115, 22, 0.25)'
              }}
            >
              {getInitials(user.fullName)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {user.fullName || user.username}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748B',
                  marginTop: '2px'
                }}
              >
                <span>@{user.username}</span>
                <span>•</span>
                <span
                  style={{
                    color: '#EA580C',
                    fontWeight: 600,
                    fontSize: '11.5px'
                  }}
                >
                  {roleMeta?.label || currentRole || 'Người dùng'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cảnh báo an toàn */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#64748B',
            marginBottom: '22px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FEF3C7',
            padding: '9px 12px',
            borderRadius: '10px'
          }}
        >
          <Icons.AlertCircle size={15} color="#D97706" style={{ flexShrink: 0 }} />
          <span>Phiên làm việc và quyền truy cập sẽ được thu hồi an toàn.</span>
        </div>

        {/* Nút hành động */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            style={{
              height: '44px',
              borderRadius: '12px',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isLoggingOut) {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#94A3B8';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={isLoggingOut}
            style={{
              height: '44px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 16px rgba(220, 38, 38, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isLoggingOut ? 0.8 : 1,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoggingOut) {
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(220, 38, 38, 0.45)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.3)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {isLoggingOut ? (
              <>
                <Icons.RefreshCw size={16} className="animate-spin" />
                <span>Đang thoát...</span>
              </>
            ) : (
              <>
                <Icons.LogOut size={16} />
                <span>Đăng Xuất</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
