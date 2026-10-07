import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AuditLogItem,
  AuditLogFilterParams,
  AuditStatsSummary,
  AuditModuleKey
} from '../../types/auditLog';
import {
  fetchAuditLogs,
  calculateAuditStats,
  exportAuditLogsToExcel,
  getLocalAuditLogs
} from '../../services/auditLogApi';
import { AuditLogStats } from '../../components/audit/AuditLogStats';
import { AuditLogFilter } from '../../components/audit/AuditLogFilter';
import { AuditLogTable } from '../../components/audit/AuditLogTable';
import { AuditLogDetailModal } from '../../components/audit/AuditLogDetailModal';
import {
  RefreshCw,
  FileSpreadsheet
} from '../../components/common/Icons';
import { useUrlPaging, useClampPage } from '../../hooks/useUrlParams';

export const AuditLogPage: React.FC = () => {
  // Trạng thái dữ liệu nhật ký
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Thống kê toàn cục
  const [allLogsForStats] = useState<AuditLogItem[]>(() => getLocalAuditLogs());

  // Bộ lọc + trang lưu trên URL, vd: /audit-logs?module=PRICING&range=TODAY&page=2
  const { params: urlParams, page, size, setPage, setSize, setFilters: setUrlFilters } = useUrlPaging({
    keyword: '',
    module: 'ALL',
    actor: 'ALL',
    range: 'ALL',
    from: '',
    to: ''
  });
  const filters: AuditLogFilterParams = useMemo(
    () => ({
      keyword: urlParams.keyword,
      module: urlParams.module as AuditLogFilterParams['module'],
      actorUsername: urlParams.actor,
      quickTimeRange: urlParams.range as AuditLogFilterParams['quickTimeRange'],
      startDate: urlParams.from || undefined,
      endDate: urlParams.to || undefined
    }),
    [urlParams.keyword, urlParams.module, urlParams.actor, urlParams.range, urlParams.from, urlParams.to]
  );

  // Modal chi tiết
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tải dữ liệu theo trang và bộ lọc
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        ...filters,
        page,
        size
      });
      setLogs(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Lỗi khi tải nhật ký thao tác:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, size]);

  useEffect(() => {
    let ignore = false;
    fetchAuditLogs({
      ...filters,
      page,
      size
    })
      .then((res) => {
        if (!ignore) {
          setLogs(res.content);
          setTotalElements(res.totalElements);
          setTotalPages(res.totalPages);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Lỗi khi tải nhật ký thao tác:', err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filters, page, size]);

  // Thống kê KPI
  const stats: AuditStatsSummary = useMemo(() => {
    return calculateAuditStats(allLogsForStats);
  }, [allLogsForStats]);

  // Thay đổi bộ lọc
  const handleFilterChange = (updated: Partial<AuditLogFilterParams>) => {
    const patch: Record<string, string> = {};
    if ('keyword' in updated) patch.keyword = updated.keyword ?? '';
    if ('module' in updated) patch.module = String(updated.module ?? 'ALL');
    if ('actorUsername' in updated) patch.actor = updated.actorUsername ?? 'ALL';
    if ('quickTimeRange' in updated) patch.range = updated.quickTimeRange ?? 'ALL';
    if ('startDate' in updated) patch.from = updated.startDate ?? '';
    if ('endDate' in updated) patch.to = updated.endDate ?? '';
    setUrlFilters(patch);
  };

  // Đặt lại bộ lọc
  const handleResetFilter = () => {
    setUrlFilters({ keyword: '', module: 'ALL', actor: 'ALL', range: 'ALL', from: '', to: '' });
  };

  // Mở modal chi tiết
  const handleOpenDetail = (log: AuditLogItem) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    exportAuditLogsToExcel(logs, 'Nhat_Ky_Thao_Tac_Ton_Kho_Cong_No_S2_04');
  };

  // Đang ở trang vượt quá số trang -> tự lùi về trang cuối
  useClampPage(page, totalPages, setPage, loading);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* 1. Nút tác vụ chính */}
      <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Làm mới nhật ký thao tác"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-orange-600 rounded-xl hover:bg-slate-50 text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow transition cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span>Xuất Excel Kiểm Toán</span>
          </button>
        </div>

      {/* 2. Thẻ KPI thống kê biến động */}
      <AuditLogStats
        stats={stats}
        selectedModule={filters.module}
        onSelectModuleFilter={(mod) =>
          handleFilterChange({ module: mod as AuditModuleKey | 'ALL' })
        }
      />

      {/* 3. Bộ lọc đa tiêu chí (S2-04: Lọc theo người dùng, loại đối tượng, khoảng thời gian) */}
      <AuditLogFilter
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilter}
      />

      {/* 4. Bảng Sổ ghi nhật ký thao tác chi tiết */}
      <AuditLogTable
        logs={logs}
        loading={loading}
        totalElements={totalElements}
        totalPages={totalPages}
        page={page}
        size={size}
        onPageChange={setPage}
        onSizeChange={setSize}
        onSelectLog={handleOpenDetail}
      />

      {/* 5. Modal chi tiết bằng chứng kiểm toán kỹ thuật */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
