import React from 'react';
import type { AuditLogItem } from '../../types/auditLog';
import { AUDIT_MODULE_OPTIONS, formatDateTime } from '../../services/auditLogApi';
import { getAvatarFullUrl } from '../../services/api';
import { getUserAvatarInitials } from '../../types/user';
import {
  Lock,
  Eye,
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown,
  User,
  ChevronLeft,
  ChevronRight
} from '../common/Icons';

interface AuditLogTableProps {
  logs: AuditLogItem[];
  loading: boolean;
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  onPageChange: (newPage: number) => void;
  onSelectLog: (log: AuditLogItem) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  loading,
  totalElements,
  totalPages,
  page,
  size,
  onPageChange,
  onSelectLog
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Tiêu đề bảng & Badge bất biến */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">
            Sổ Ghi Nhật Ký Thao Tác Hệ Thống
          </h3>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800">
            {totalElements} bản ghi
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lock size={13} className="text-amber-500" />
          <span>Dữ liệu kiểm toán bất biến (Immutable Audit Trail) • Nghiêm cấm chỉnh sửa và xóa</span>
        </div>
      </div>

      {/* Nội dung bảng */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-3">Thời Điểm</th>
              <th className="py-3.5 px-3">Người Thực Hiện</th>
              <th className="py-3.5 px-3">Phân Hệ & Thao Tác</th>
              <th className="py-3.5 px-3">Mã Đối Tượng (SKU/ĐL)</th>
              <th className="py-3.5 px-3 text-right">Trước Đ/C</th>
              <th className="py-3.5 px-3 text-right">Sau Đ/C</th>
              <th className="py-3.5 px-2 text-center">Chênh Lệch</th>
              <th className="py-3.5 px-3">Lý Do / Căn Cứ</th>
              <th className="py-3.5 px-2 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-orange-600" />
                    <span>Đang truy xuất nhật ký kiểm toán...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <Info size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-medium text-slate-700">Không tìm thấy bản ghi nhật ký phù hợp</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Thử thay đổi bộ lọc phân hệ, người dùng hoặc khoảng thời gian kiểm kê
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const moduleMeta = AUDIT_MODULE_OPTIONS.find((m) => m.value === log.module);
                const isDecrease = log.deltaType === 'decrease';
                const isIncrease = log.deltaType === 'increase';

                // Tách mã SKU sạch và tên quy cách (không kẹp chữ :Thùng vào mã SKU)
                const cleanTargetCode = log.targetCode ? log.targetCode.split(':')[0] : '—';
                const cleanTargetName =
                  log.targetName && log.targetName !== 'PRODUCT_UNIT' && log.targetName !== 'PRODUCT_INVENTORY'
                    ? log.targetName
                    : log.targetCode && log.targetCode.includes(':')
                    ? `Đơn vị: ${log.targetCode.split(':')[1]}`
                    : '';

                return (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    {/* 1. Thời điểm */}
                    <td className="py-3 px-3 overflow-hidden">
                      <div className="font-semibold text-slate-900 text-xs truncate" title={formatDateTime(log.createdAt)}>
                        {formatDateTime(log.createdAt)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono truncate block">
                        Log #{log.id}
                      </span>
                    </td>

                    {/* 2. Người thực hiện (Actor) - Đồng bộ Avatar */}
                    <td className="py-3 px-3 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200/80 flex items-center justify-center text-[#F85606] font-bold overflow-hidden shrink-0 shadow-2xs">
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
                                  span.className = 'text-[11px] font-bold text-orange-700';
                                  span.innerText = getUserAvatarInitials(log.actorFullName, log.actorRole);
                                  parent.appendChild(span);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-[11px] font-bold text-orange-700">
                              {getUserAvatarInitials(log.actorFullName, log.actorRole)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs truncate" title={log.actorFullName}>
                            {log.actorFullName}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate" title={`@${log.actorUsername} • ${log.actorRole || 'Nhân sự'}`}>
                            {log.actorRole || `@${log.actorUsername}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Phân hệ & Thao tác */}
                    <td className="py-3 px-3 overflow-hidden">
                      <span
                        className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-md truncate max-w-full"
                        style={{
                          backgroundColor: moduleMeta?.badgeBg || '#F1F5F9',
                          color: moduleMeta?.badgeColor || '#334155'
                        }}
                        title={log.moduleLabel}
                      >
                        {log.moduleLabel}
                      </span>
                      <div className="text-[11px] font-medium text-slate-600 mt-0.5 truncate" title={log.actionLabel || log.action}>
                        {log.actionLabel || log.action}
                      </div>
                    </td>

                    {/* 4. Mã đối tượng (SKU / Phiếu / Khách nợ) */}
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="font-mono font-bold text-orange-600 text-xs block truncate" title={cleanTargetCode}>
                        {cleanTargetCode}
                      </span>
                      {cleanTargetName && (
                        <p className="text-xs text-slate-500 truncate mt-0.5" title={cleanTargetName}>
                          {cleanTargetName}
                        </p>
                      )}
                    </td>

                    {/* 5. Giá trị trước (Old Value) */}
                    <td className="py-3 px-3 text-right overflow-hidden">
                      <span className="font-medium text-slate-500 line-through text-xs block truncate" title={log.oldValue}>
                        {log.oldValue}
                      </span>
                    </td>

                    {/* 6. Giá trị sau (New Value) */}
                    <td className="py-3 px-3 text-right overflow-hidden">
                      <span className="font-bold text-slate-900 text-xs block truncate" title={log.newValue}>
                        {log.newValue}
                      </span>
                    </td>

                    {/* 7. Chênh lệch (Delta) */}
                    <td className="py-3 px-2 text-center overflow-hidden">
                      {log.deltaFormatted ? (
                        <span
                          className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md max-w-full ${
                            isDecrease
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isIncrease
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={log.deltaFormatted}
                        >
                          {isIncrease ? <TrendingUp size={12} className="shrink-0" /> : isDecrease ? <TrendingDown size={12} className="shrink-0" /> : null}
                          <span className="truncate">{log.deltaFormatted}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* 8. Lý do / Căn cứ điều chỉnh */}
                    <td className="py-3 px-3 overflow-hidden">
                      <p className="text-xs text-slate-700 truncate" title={log.reason}>
                        {log.reason}
                      </p>
                    </td>

                    {/* 9. Nút xem chi tiết kỹ thuật */}
                    <td className="py-3 px-2 text-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectLog(log)}
                        className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 transition cursor-pointer"
                        title="Xem bằng chứng kiểm toán chi tiết"
                      >
                        <Eye size={13} />
                        <span className="ml-1 hidden xl:inline">Xem</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/40">
        <div>
          Hiển thị <strong>{logs.length}</strong> / <strong>{totalElements}</strong> lượt thao tác hệ thống ({size} mục/trang)
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="font-semibold text-slate-700 px-2">
            Trang {page + 1} / {Math.max(1, totalPages)}
          </span>

          <button
            type="button"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang tiếp theo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
