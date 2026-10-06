import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Supplier, SupplierStatus } from '../../types/supplier';
import {
  fetchSuppliers,
  deleteSupplier,
  seedSampleSuppliers,
  calculateSupplierStats
} from '../../services/supplierApi';
import { SupplierStats } from '../../components/supplier/SupplierStats';
import { SupplierTable } from '../../components/supplier/SupplierTable';
import { SupplierFormModal } from '../../components/supplier/SupplierFormModal';
import { ChangeStatusModal } from '../../components/supplier/ChangeStatusModal';
import { SupplierDetailModal } from '../../components/supplier/SupplierDetailModal';
import { DeleteSupplierModal } from '../../components/supplier/DeleteSupplierModal';
import { Icons } from '../../components/common/Icons';
import { useUrlPaging, useClampPage } from '../../hooks/useUrlParams';

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
  // Lưu trên URL, vd: /suppliers?keyword=bia&status=ACTIVE&page=2
  const {
    params: urlParams,
    page: currentPage,
    size: pageSize,
    setPage: setCurrentPage,
    setSize: setPageSize,
    setFilters
  } = useUrlPaging({ keyword: '', status: 'ALL' });
  const searchTerm = urlParams.keyword;
  const statusFilter = urlParams.status;
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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

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

  // Nạp 5 nhà cung cấp mẫu
  const handleSeedSample = async () => {
    setLoading(true);
    try {
      await seedSampleSuppliers();
      showToast?.('Nạp mẫu thành công', 'Đã khởi tạo 5 nhà cung cấp mẫu vào hệ thống', 'success');
      loadData();
    } catch (err: unknown) {
      showToast?.(
        'Lỗi nạp dữ liệu mẫu',
        err instanceof Error ? err.message : 'Không thể nạp dữ liệu mẫu',
        'error'
      );
      setLoading(false);
    }
  };

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

  // Mở modal xác nhận xóa
  const handleOpenDelete = (supplier: Supplier) => {
    if (!canManage) return;
    setDeletingSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  // Thực hiện xóa đối tác
  const handleConfirmDelete = async (supplier: Supplier) => {
    await deleteSupplier(supplier.id);
    showToast?.(
      'Xóa thành công',
      `Đã xóa đối tác ${supplier.code} khỏi danh mục`,
      'success'
    );
    loadData();
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

  // Đang ở trang vượt quá số trang -> tự lùi về trang cuối
  useClampPage(currentPage, totalPages, setCurrentPage, loading);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Tiêu đề trang & Nút thao tác chính */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200">
              Quản trị Nguồn hàng
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F85606] shrink-0">
              <Icons.Truck size={22} />
            </div>
            <span>Đối Tác Cung Ứng</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            Hồ sơ pháp nhân, mã số thuế và điều khoản thanh toán phục vụ nhập kho, truy nguyên lô lỗi.
          </p>
        </div>

        {/* Thanh tác vụ */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={loadData}
            disabled={loading}
            title="Tải lại danh sách"
            className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-[#F85606] hover:border-orange-300 rounded-xl hover:bg-orange-50/40 transition-all cursor-pointer shadow-xs min-h-[44px]"
          >
            <Icons.RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer min-h-[44px]"
            >
              <Icons.Plus size={18} />
              <span>Thêm đối tác mới</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Thống kê nhà cung cấp */}
      <SupplierStats stats={stats} />

      {/* Lỗi nếu có */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
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
        onPageSizeChange={setPageSize}
        searchTerm={searchTerm}
        onSearchChange={(val) => setFilters({ keyword: val })}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => setFilters({ status: val })}
        onViewDetail={handleOpenDetail}
        onEdit={handleOpenEdit}
        onToggleStatus={handleOpenToggleStatus}
        onDelete={handleOpenDelete}
        onOpenCreate={handleOpenCreate}
        onSeedSample={handleSeedSample}
        canManage={canManage}
      />

      {/* Modal Khai báo / Sửa nhà cung cấp */}
      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        supplier={editingSupplier}
        onSuccess={handleFormSuccess}
      />

      {/* Modal Ngừng / Tiếp tục giao dịch (bắt buộc nhập lý do) */}
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

      {/* Modal Xác nhận Xóa đối tác (chuẩn giao diện ETC) */}
      <DeleteSupplierModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingSupplier(null);
        }}
        supplier={deletingSupplier}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
