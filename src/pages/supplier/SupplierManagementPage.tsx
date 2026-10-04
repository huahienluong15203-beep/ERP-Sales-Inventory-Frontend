import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Supplier, SupplierStatus } from '../../types/supplier';
import {
  fetchSuppliers,
  deleteSupplier,
  calculateSupplierStats
} from '../../services/supplierApi';
import { SupplierStats } from '../../components/supplier/SupplierStats';
import { SupplierTable } from '../../components/supplier/SupplierTable';
import { SupplierFormModal } from '../../components/supplier/SupplierFormModal';
import { ChangeStatusModal } from '../../components/supplier/ChangeStatusModal';
import { SupplierDetailModal } from '../../components/supplier/SupplierDetailModal';
import { Icons } from '../../components/common/Icons';

export const SupplierManagementPage: React.FC = () => {
  const { currentRole, user, showToast } = useAuth();

  // Quyền quản lý (ADMIN, Quản lý kho WH_MANAGER, Nhân viên kho WAREHOUSE)
  const canManage = useMemo(() => {
    if (!currentRole) return true;
    const r = currentRole.toUpperCase();
    if (r.includes('ADMIN') || r.includes('WH_MANAGER') || r.includes('WAREHOUSE')) {
      return true;
    }
    return (user?.roles || []).some((userRole) => {
      const ur = String(userRole).toUpperCase();
      return ur.includes('ADMIN') || ur.includes('WH_MANAGER') || ur.includes('WAREHOUSE');
    });
  }, [currentRole, user]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Phân trang & Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusTargetSupplier, setStatusTargetSupplier] = useState<Supplier | null>(null);
  const [targetStatus, setTargetStatus] = useState<SupplierStatus>('INACTIVE');

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  // Tải dữ liệu từ API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSuppliers({
        keyword: searchTerm,
        status: statusFilter,
        page: currentPage,
        size: pageSize
      });
      setSuppliers(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê nhanh
  const stats = useMemo(() => calculateSupplierStats(suppliers), [suppliers]);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  };

  // Mở modal sửa
  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  // Mở modal xem chi tiết
  const handleOpenDetail = (supplier: Supplier) => {
    setDetailSupplier(supplier);
    setIsDetailOpen(true);
  };

  // Mở modal đổi trạng thái
  const handleOpenToggleStatus = (supplier: Supplier) => {
    const nextStatus: SupplierStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusTargetSupplier(supplier);
    setTargetStatus(nextStatus);
    setIsStatusModalOpen(true);
  };

  // Xóa nhà cung cấp
  const handleDelete = async (supplier: Supplier) => {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Xác nhận xóa nhà cung cấp "${supplier.name}" (${supplier.code})?\n\nLưu ý: Nếu nhà cung cấp đã từng phát sinh phiếu nhập kho, hệ thống sẽ chặn xóa và yêu cầu chuyển sang ngừng giao dịch theo quy tắc S2-09.`
    );
    if (!confirmed) return;

    try {
      await deleteSupplier(supplier.id);
      showToast?.(
        'Xóa thành công',
        `Đã xóa nhà cung cấp ${supplier.code} khỏi danh mục`,
        'success'
      );
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xóa nhà cung cấp');
    }
  };

  const handleFormSuccess = (saved: Supplier) => {
    showToast?.(
      'Thành công',
      `Đã lưu thông tin nhà cung cấp ${saved.code} thành công!`,
      'success'
    );
    loadData();
  };

  const handleStatusSuccess = (updated: Supplier) => {
    const isNowActive = updated.status === 'ACTIVE';
    showToast?.(
      'Cập nhật trạng thái thành công',
      `Nhà cung cấp ${updated.code} đã được chuyển sang ${
        isNowActive ? 'ĐANG GIAO DỊCH' : 'NGỪNG GIAO DỊCH'
      }`,
      'success'
    );
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Tiêu đề trang & Nút thao tác chính */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Kho hàng & Nhập kho
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              SCRUM-46 (S2-09)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Icons.Truck className="text-indigo-600 dark:text-indigo-400" size={28} />
            Quản lý Danh mục Nhà Cung Cấp
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Quản lý nguồn hàng và đối tác cung ứng. Phiếu nhập kho luôn gắn đúng nguồn hàng để dễ dàng truy nguyên khi có lô hàng lỗi. Nhà cung cấp đã có phiếu nhập không được xóa, chỉ ngừng giao dịch.
          </p>
        </div>

        {/* Thanh tác vụ */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={loadData}
            disabled={loading}
            title="Tải lại danh sách"
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
          >
            <Icons.RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Icons.Plus size={18} />
              <span>Khai báo nhà cung cấp mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Thông tin vai trò & phạm vi nghiệp vụ */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Icons.ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span>
            Vai trò hiện tại: <strong>{currentRole || 'Nhân viên kho'}</strong>
          </span>
          <span className="text-slate-400">•</span>
          <span>
            {canManage
              ? 'Toàn quyền thêm, cập nhật hồ sơ pháp nhân, ngừng giao dịch và kiểm soát nguồn hàng'
              : 'Quyền xem danh mục nhà cung cấp để kiểm tra nguồn hàng nhập kho'}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
          <span>Quy chuẩn: <strong>S2-09 / SCRUM-46</strong></span>
        </div>
      </div>

      {/* KPI Thống kê nhà cung cấp */}
      <SupplierStats stats={stats} />

      {/* Lỗi nếu có */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="font-semibold underline hover:no-underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Bảng danh sách nhà cung cấp */}
      <SupplierTable
        suppliers={suppliers}
        loading={loading}
        totalElements={totalElements}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(0);
        }}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(0);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setCurrentPage(0);
        }}
        onViewDetail={handleOpenDetail}
        onEdit={handleOpenEdit}
        onToggleStatus={handleOpenToggleStatus}
        onDelete={handleDelete}
        canManage={canManage}
      />

      {/* Modal Khai báo / Sửa nhà cung cấp */}
      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        supplier={editingSupplier}
        onSuccess={handleFormSuccess}
      />

      {/* Modal Ngừng / Tiếp tục giao dịch (bắt buộc nhập lý do S2-09) */}
      <ChangeStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        supplier={statusTargetSupplier}
        targetStatus={targetStatus}
        onSuccess={handleStatusSuccess}
      />

      {/* Modal Xem chi tiết hồ sơ nhà cung cấp */}
      <SupplierDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        supplier={detailSupplier}
        onEdit={handleOpenEdit}
        onToggleStatus={handleOpenToggleStatus}
        canManage={canManage}
      />
    </div>
  );
};
