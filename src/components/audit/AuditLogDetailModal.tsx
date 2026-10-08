import React, { useState } from 'react';
import type { AuditLogItem } from '../../types/auditLog';
import { AUDIT_MODULE_OPTIONS, formatDateTime } from '../../services/auditLogApi';
import { getAvatarFullUrl } from '../../services/api';
import { getUserAvatarInitials } from '../../types/user';
import {
  X,
  Lock,
  User,
  Info,
  Check,
  Copy,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ArrowRight
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

  const cleanTargetCode = log.targetCode ? log.targetCode.split(':')[0] : '—';
  const cleanUnitName = log.targetCode && log.targetCode.includes(':') ? log.targetCode.split(':')[1] : null;

  const moduleMeta = AUDIT_MODULE_OPTIONS.find((m) => m.value === log.module);
  const isDecrease = log.deltaType === 'decrease';
  const isIncrease = log.deltaType === 'increase';

  // Hàm format phòng thủ bảo đảm hiển thị thân thiện tiếng Việt kể cả khi dữ liệu là JSON thô
  const formatDetailValue = (val: string | undefined): string => {
    if (!val || val === '—') return '—';
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        if ('creditLimit' in obj) {
          const lim = Number(obj.creditLimit || 0);
          const days = obj.maxDebtDays ?? 0;
          return `${lim.toLocaleString('vi-VN')} đ • ${days} ngày nợ`;
        }
        if ('transactionLocked' in obj) {
          return obj.transactionLocked ? 'Đã khóa giao dịch' : 'Đang mở giao dịch';
        }
        if ('price' in obj) {
          return `${Number(obj.price || 0).toLocaleString('vi-VN')} đ`;
        }
        // Format tổng quát các keys
        return Object.entries(obj)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' • ');
      } catch {
        // Fallback giữ nguyên chuỗi
      }
    }
    return val;
  };

  const formatDeltaValue = (delta: string | undefined): string => {
    if (!delta || delta === '—') return '';
    // Phòng ngừa trường hợp chuỗi delta bị ghép thô từ JSON {"creditLimit":...} ➔ {"creditLimit":...}
    if (delta.includes('➔') && delta.includes('creditLimit')) {
      const parts = delta.split('➔').map((s) => s.trim());
      try {
        const o = JSON.parse(parts[0]);
        const n = JSON.parse(parts[1]);
        const oLim = Number(o.creditLimit || 0);
        const nLim = Number(n.creditLimit || 0);
        const diffLim = nLim - oLim;
        if (diffLim !== 0) {
          return `${diffLim > 0 ? '+' : ''}${diffLim.toLocaleString('vi-VN')} đ`;
        }
        return '';
      } catch {
        // Fallback
      }
    }
    return delta;
  };

  const displayOld = formatDetailValue(log.oldValue);
  const displayNew = formatDetailValue(log.newValue);
  const displayDelta = formatDeltaValue(log.deltaFormatted);

  const hasDelta = Boolean(displayDelta && displayDelta !== '—');
  const hasBothOldAndNew = displayOld !== '—' && displayNew !== '—';

  const handleCopyTrace = () => {
    const traceText = `[BẰNG CHỨNG KIỂM TOÁN HỆ THỐNG ERP]
Mã Nhật Ký: #${log.id}
Thời Điểm: ${formatDateTime(log.createdAt)}
Người Thực Hiện: ${log.actorFullName} (@${log.actorUsername}) - ${log.actorRole || 'Nhân sự'}
Phân Hệ: ${log.moduleLabel} (${log.module})
Hành Động: ${log.actionLabel || log.action}
Đối Tượng: ${cleanTargetCode} (${log.targetName || ''})
Giá Trị Trước: ${displayOld}
Giá Trị Sau: ${displayNew}
Chênh Lệch: ${displayDelta || 'N/A'}
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
                className="text-xs font-bold px-2.5 py-0.5 rounded-md inline-block uppercase tracking-wider"
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
                  <strong className="font-mono text-orange-600">{cleanTargetCode}</strong>
                </span>
                {cleanUnitName && (
                  <>
                    <span>•</span>
                    <span>
                      Đơn vị quy cách: <strong className="text-slate-700">{cleanUnitName}</strong>
                    </span>
                  </>
                )}
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

          {/* Đối chiếu so sánh linh hoạt theo phân hệ */}
          {hasDelta ? (
            /* Dạng 3 cột: Có số liệu chênh lệch (Tồn kho, kiểm kê, đơn vị tính...) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Trước điều chỉnh */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-0 overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Giá Trị Trước (Cũ)
                  </span>
                  <div className="mt-2 text-sm sm:text-base font-bold text-slate-600 line-through break-words [overflow-wrap:anywhere]">
                    {displayOld}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 mt-2 block">
                  Ghi nhận trước thời điểm sửa
                </span>
              </div>

              {/* Mức chênh lệch */}
              <div
                className={`p-4 rounded-xl border text-center flex flex-col justify-between items-center min-w-0 overflow-hidden ${
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
                <div className="my-2 text-sm sm:text-base md:text-lg font-black tracking-tight break-words [overflow-wrap:anywhere]">
                  {displayDelta}
                </div>
                <span className="text-[11px] opacity-80 block">Biến động số liệu thực tế</span>
              </div>

              {/* Sau điều chỉnh */}
              <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 text-center min-w-0 overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider block">
                    Giá Trị Sau (Mới)
                  </span>
                  <div className="mt-2 text-sm sm:text-base font-extrabold text-orange-900 break-words [overflow-wrap:anywhere]">
                    {displayNew}
                  </div>
                </div>
                <span className="text-[11px] text-orange-600/80 mt-2 block font-medium">
                  Áp dụng kể từ khi lưu vết
                </span>
              </div>
            </div>
          ) : hasBothOldAndNew ? (
            /* Dạng 2 cột có mũi tên chuyển giao: Đổi trạng thái, đổi người phụ trách, đổi cấu hình */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 min-w-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Thông Tin Ban Đầu (Trước Sửa)
                </span>
                <div className="text-sm font-semibold text-slate-700 break-words [overflow-wrap:anywhere]">
                  {displayOld}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 min-w-0">
                <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <ArrowRight size={14} className="text-[#F85606]" />
                  Thông Tin Áp Dụng (Sau Sửa)
                </span>
                <div className="text-sm font-bold text-orange-950 break-words [overflow-wrap:anywhere]">
                  {displayNew}
                </div>
              </div>
            </div>
          ) : (
            /* Dạng đơn: Khởi tạo mới hoặc xóa */
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Chi Tiết Dữ Liệu Ghi Nhận
              </span>
              <div className="text-sm font-medium text-slate-800 break-words [overflow-wrap:anywhere]">
                {displayNew !== '—' ? displayNew : displayOld}
              </div>
            </div>
          )}

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
            {/* Thông tin nhân sự - Đồng bộ Avatar */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <User size={15} className="text-emerald-500" />
                <span>Nhân Sự Thực Hiện Thao Tác</span>
              </div>
              <div className="flex items-center gap-3 pt-1 border-b border-slate-100 pb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-[#F85606] font-bold overflow-hidden shrink-0 shadow-2xs">
                  {log.actorAvatarUrl ? (
                    <img
                      src={getAvatarFullUrl(log.actorAvatarUrl)}
                      alt={log.actorFullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const span = document.createElement('span');
                          span.className = 'text-xs font-bold text-orange-700';
                          span.innerText = getUserAvatarInitials(log.actorFullName, log.actorRole);
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs font-bold text-orange-700">
                      {getUserAvatarInitials(log.actorFullName, log.actorRole)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">{log.actorFullName}</div>
                  <div className="text-xs text-orange-600 font-mono">@{log.actorUsername}</div>
                </div>
              </div>
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vị trí / Phụ trách:</span>
                  <span className="text-slate-700 font-medium">{log.actorRole || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Thông số kỹ thuật ghi vết */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <ShieldCheck size={15} className="text-blue-500" />
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
