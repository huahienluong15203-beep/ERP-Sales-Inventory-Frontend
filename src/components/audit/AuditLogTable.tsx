import React from 'react';
import type { AuditLogItem } from '../../types/auditLog';
import { AUDIT_MODULE_OPTIONS, formatDateTime } from '../../services/auditLogApi';
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
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Thời Điểm</th>
              <th className="py-3.5 px-4">Người Thực Hiện</th>
              <th className="py-3.5 px-4">Phân Hệ & Thao Tác</th>
              <th className="py-3.5 px-4">Mã Đối Tượng (SKU/ĐL)</th>
              <th className="py-3.5 px-4 text-right">Trước Điều Chỉnh</th>
              <th className="py-3.5 px-4 text-right">Sau Điều Chỉnh</th>
              <th className="py-3.5 px-4 text-center">Chênh Lệch</th>
              <th className="py-3.5 px-4">Lý Do / Căn Cứ Điều Chỉnh</th>
              <th className="py-3.5 px-4 text-center">Thao Tác</th>
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

                return (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    {/* 1. Thời điểm */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 text-xs">
                        {formatDateTime(log.createdAt)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Log #{log.id}
                      </span>
                    </td>

                    {/* 2. Người thực hiện (Actor) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                          <User size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {log.actorFullName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            @{log.actorUsername} • {log.actorRole || 'Nhân sự'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Phân hệ & Thao tác */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className="inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-md"
                        style={{
                          backgroundColor: moduleMeta?.badgeBg || '#F1F5F9',
                          color: moduleMeta?.badgeColor || '#334155'
                        }}
                      >
                        {log.moduleLabel}
                      </span>
                      <div className="text-[11px] font-medium text-slate-600 mt-0.5">
                        {log.actionLabel || log.action}
                      </div>
                    </td>

                    {/* 4. Mã đối tượng (SKU / Phiếu / Khách nợ) */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-orange-600 text-xs block">
                        {log.targetCode}
                      </span>
                      {log.targetName && (
                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5" title={log.targetName}>
                          {log.targetName}
                        </p>
                      )}
                    </td>

                    {/* 5. Giá trị trước (Old Value) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-medium text-slate-500 line-through text-xs">
                        {log.oldValue}
                      </span>
                    </td>

                    {/* 6. Giá trị sau (New Value) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900 text-xs">
                        {log.newValue}
                      </span>
                    </td>

                    {/* 7. Chênh lệch (Delta) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {log.deltaFormatted ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md ${
                            isDecrease
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isIncrease
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isIncrease ? <TrendingUp size={12} /> : isDecrease ? <TrendingDown size={12} /> : null}
                          <span>{log.deltaFormatted}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* 8. Lý do / Căn cứ điều chỉnh */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed" title={log.reason}>
                        {log.reason}
                      </p>
                    </td>

                    {/* 9. Nút xem chi tiết kỹ thuật */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 transition cursor-pointer"
                        title="Xem bằng chứng kiểm toán chi tiết"
                      >
                        <Eye size={13} />
                        <span>Chi tiết</span>
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
