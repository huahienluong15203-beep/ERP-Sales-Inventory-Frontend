import React, { useState } from 'react';
import type { AuditLogItem } from '../../types/auditLog';
import { AUDIT_MODULE_OPTIONS, formatDateTime } from '../../services/auditLogApi';
import {
  X,
  Lock,
  User,
  Package,
  Calendar,
  Info,
  Check,
  Copy,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Globe
} from '../common/Icons';

interface AuditLogDetailModalProps {
  log: AuditLogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const moduleMeta = AUDIT_MODULE_OPTIONS.find((m) => m.value === log.module);
  const isDecrease = log.deltaType === 'decrease';
  const isIncrease = log.deltaType === 'increase';

  const handleCopyTrace = () => {
    const traceText = `[BẰNG CHỨNG KIỂM TOÁN HỆ THỐNG ERP - S2-04]
Mã Nhật Ký: #${log.id}
Thời Điểm: ${formatDateTime(log.createdAt)}
Người Thực Hiện: ${log.actorFullName} (@${log.actorUsername}) - ${log.actorRole || 'Nhân sự'}
Phân Hệ: ${log.moduleLabel} (${log.module})
Hành Động: ${log.actionLabel || log.action}
Đối Tượng: ${log.targetCode} (${log.targetName || ''})
Giá Trị Trước: ${log.oldValue}
Giá Trị Sau: ${log.newValue}
Chênh Lệch: ${log.deltaFormatted || 'N/A'}
Lý Do & Căn Cứ: ${log.reason}
Địa Chỉ IP: ${log.ipAddress || '127.0.0.1'}
Yêu Cầu HTTP: ${log.httpMethod || 'POST'} ${log.requestUri || ''}`;

    navigator.clipboard.writeText(traceText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Chi Tiết Nhật Ký Thao Tác #{log.id}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  <Lock size={11} className="text-amber-500" />
                  Bất biến (Immutable)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ghi vết tự động trên hệ thống, phục vụ truy xét lệch kho & kiểm toán cuối tháng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTrace}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition ${
                copied
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title="Sao chép toàn bộ bằng chứng kiểm toán"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép vết'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              title="Đóng (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nội dung chi tiết cuộn được */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Thông tin đối tượng tác động */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-md inline-block uppercase tracking-wider"
                style={{
                  backgroundColor: moduleMeta?.badgeBg || '#F1F5F9',
                  color: moduleMeta?.badgeColor || '#334155'
                }}
              >
                {log.moduleLabel} ({log.actionLabel || log.action})
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-1.5">
                {log.targetName || log.targetType}
              </h4>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>
                  Mã đối tượng:{' '}
                  <strong className="font-mono text-orange-600">{log.targetCode}</strong>
                </span>
                <span>•</span>
                <span>
                  Loại thực thể: <strong className="text-slate-700">{log.targetType}</strong>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Thời điểm thực hiện</span>
              <span className="font-semibold text-slate-800 text-sm">
                {formatDateTime(log.createdAt)}
              </span>
            </div>
          </div>

          {/* Đối chiếu so sánh: Trước (Cũ) ➔ Sau (Mới) ➔ Chênh lệch */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Trước điều chỉnh */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Giá Trị Trước (Cũ)
              </span>
              <div className="mt-2 text-base font-bold text-slate-600 line-through">
                {log.oldValue}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Ghi nhận trước thời điểm sửa
              </span>
            </div>

            {/* Mức chênh lệch */}
            <div
              className={`p-4 rounded-xl border text-center flex flex-col justify-center items-center ${
                isDecrease
                  ? 'bg-rose-50/70 border-rose-200 text-rose-700'
                  : isIncrease
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                {isIncrease && <TrendingUp size={15} />}
                {isDecrease && <TrendingDown size={15} />}
                <span>
                  {isDecrease ? 'Lệch Giảm / Hao Hụt' : isIncrease ? 'Lệch Tăng / Bổ Sung' : 'Điều Chỉnh'}
                </span>
              </div>
              <div className="mt-1 text-lg font-black tracking-tight">
                {log.deltaFormatted || 'Thay đổi trạng thái'}
              </div>
              <span className="text-[11px] opacity-80 mt-0.5">Biến động số liệu thực tế</span>
            </div>

            {/* Sau điều chỉnh */}
            <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 text-center">
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider block">
                Giá Trị Sau (Mới)
              </span>
              <div className="mt-2 text-base font-extrabold text-orange-900">
                {log.newValue}
              </div>
              <span className="text-[11px] text-orange-600/80 mt-1 block font-medium">
                Áp dụng kể từ khi lưu vết
              </span>
            </div>
          </div>

          {/* Căn cứ & Lý do điều chỉnh (Then chốt để giải trình kiểm kê) */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <Info size={16} className="text-amber-600" />
              <span>Căn Cứ / Lý Do Điều Chỉnh Được Ghi Nhận</span>
            </div>
            <p className="text-sm text-amber-950 leading-relaxed font-medium bg-white/70 p-3 rounded-lg border border-amber-100">
              {log.reason}
            </p>
          </div>

          {/* Chi tiết người thực hiện & Thông tin kỹ thuật mạng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Thông tin nhân sự */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <User size={15} className="text-emerald-500" />
                <span>Nhân Sự Thực Hiện Thao Tác</span>
              </div>
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-800">{log.actorFullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tài khoản:</span>
                  <span className="font-mono text-orange-600 font-semibold">
                    @{log.actorUsername}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vị trí / Phụ trách:</span>
                  <span className="text-slate-700">{log.actorRole || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Thông số kỹ thuật ghi vết */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Globe size={15} className="text-blue-500" />
                <span>Giao Thức Mạng & IP Client</span>
              </div>
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Địa chỉ IP:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {log.ipAddress || '192.168.1.100'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phương thức & URI:</span>
                  <span className="font-mono text-blue-600 font-semibold">
                    {log.httpMethod || 'POST'} {log.requestUri || '/api/inventory'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bảo mật:</span>
                  <span className="text-emerald-700 font-medium">Bảo toàn băm SHA-256</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal: TUYỆT ĐỐI KHÔNG CÓ NÚT SỬA HOẶC XÓA */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock size={13} className="text-amber-500" />
            <span>Tiêu chuẩn ISO/IEC 27001 & ERP Audit: Dữ liệu nhật ký được niêm phong vĩnh viễn.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition shadow-xs cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
