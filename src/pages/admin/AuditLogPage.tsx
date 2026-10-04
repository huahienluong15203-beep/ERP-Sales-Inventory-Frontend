import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AuditLogItem,
  AuditLogFilterParams,
  AuditStatsSummary
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
  FileSpreadsheet,
  ShieldCheck
} from '../../components/common/Icons';

export const AuditLogPage: React.FC = () => {
  // Trạng thái dữ liệu nhật ký
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [size] = useState(15);
  const [loading, setLoading] = useState(true);

  // Thống kê toàn cục
  const [allLogsForStats, setAllLogsForStats] = useState<AuditLogItem[]>([]);

  // Bộ lọc
  const [filters, setFilters] = useState<AuditLogFilterParams>({
    keyword: '',
    module: 'ALL',
    actorUsername: 'ALL',
    quickTimeRange: 'ALL',
    startDate: undefined,
    endDate: undefined,
    page: 0,
    size: 15
  });

  // Modal chi tiết
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tải dữ liệu toàn bộ để tính thống kê
  useEffect(() => {
    const raw = getLocalAuditLogs();
    setAllLogsForStats(raw);
  }, []);

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
    loadData();
  }, [loadData]);

  // Thống kê KPI
  const stats: AuditStatsSummary = useMemo(() => {
    return calculateAuditStats(allLogsForStats);
  }, [allLogsForStats]);

  // Thay đổi bộ lọc
  const handleFilterChange = (updated: Partial<AuditLogFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
    setPage(0);
  };

  // Đặt lại bộ lọc
  const handleResetFilter = () => {
    setFilters({
      keyword: '',
      module: 'ALL',
      actorUsername: 'ALL',
      quickTimeRange: 'ALL',
      startDate: undefined,
      endDate: undefined,
      page: 0,
      size: 15
    });
    setPage(0);
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header phân hệ & Thao tác chính */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
              Kiểm Toán & Giám Sát Hệ Thống
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              S2-04: Nhật Ký Tồn Kho & Công Nợ
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="text-orange-600" size={28} />
            Nhật Ký Thao Tác Tồn Kho & Công Nợ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Lưu vết tự động mọi hành động điều chỉnh tồn kho, kiểm kê cuối tháng bị lệch, biến động hạn mức công nợ và giá niêm yết. Dữ liệu chỉ đọc và bất biến phục vụ đối soát kiểm toán.
          </p>
        </div>

        {/* Nút tác vụ: Tải lại & Xuất Excel */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Tải lại nhật ký"
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-orange-600 rounded-xl hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
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
      </div>

      {/* 2. Thẻ KPI thống kê biến động */}
      <AuditLogStats
        stats={stats}
        selectedModule={filters.module}
        onSelectModuleFilter={(mod) => handleFilterChange({ module: mod as any })}
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
