import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, ChevronRight } from './Icons';

interface SessionExpiredModalProps {
  message?: string;
  onConfirm: () => void;
  autoRedirectSeconds?: number;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  message,
  onConfirm,
  autoRedirectSeconds = 10
}) => {
  const [countdown, setCountdown] = useState<number>(autoRedirectSeconds);

  useEffect(() => {
    if (countdown <= 0) {
      onConfirm();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onConfirm]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200">
      {/* Container Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500" />

        <div className="p-6 sm:p-7 text-center flex flex-col items-center">
          {/* Glowing Icon Badge */}
          <div className="relative mb-4 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 border border-orange-200/80 flex items-center justify-center shadow-inner text-orange-600">
              <ShieldAlert size={34} color="#F85606" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-orange-400/20 animate-ping -z-10 pointer-events-none" />
          </div>

          {/* Security Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200/70 mb-2.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Bảo Mật Tài Khoản Doanh Nghiệp
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
            Phiên Làm Việc Đã Kết Thúc
          </h3>

          {/* Message */}
          <p className="text-slate-600 text-sm leading-relaxed mb-4 px-2">
            {message ||
              'Tài khoản của bạn vừa được đăng nhập ở một thiết bị hoặc phiên làm việc khác. Để bảo mật thông tin nội bộ, phiên làm việc hiện tại đã được thu hồi.'}
          </p>

          {/* Explanation Callout */}
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 text-left mb-6 flex items-start gap-2.5">
            <AlertTriangle size={18} color="#D97706" className="shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Hệ thống áp dụng chính sách <strong>1 tài khoản chỉ duy trì 1 phiên hoạt động duy nhất</strong>. Nếu bạn không thực hiện đăng nhập này, vui lòng thông báo Quản trị viên và đổi mật khẩu ngay sau khi đăng nhập lại.
            </div>
          </div>

          {/* Countdown timer */}
          <div className="text-xs text-slate-400 mb-3">
            Tự động chuyển hướng về trang Đăng nhập sau <span className="font-bold text-orange-600">{countdown}s</span>...
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3 px-5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)',
              boxShadow: '0 4px 14px rgba(248, 86, 6, 0.35)'
            }}
          >
            <span>Đăng nhập lại ngay</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
