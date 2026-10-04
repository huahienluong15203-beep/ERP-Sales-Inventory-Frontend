import React from 'react';
import type { Supplier } from '../../types/supplier';
import { Icons } from '../common/Icons';

interface SupplierTableProps {
  suppliers: Supplier[];
  loading: boolean;
  totalElements: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onViewDetail: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  canManage: boolean;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  suppliers,
  loading,
  totalElements,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onViewDetail,
  onEdit,
  onToggleStatus,
  onDelete,
  canManage
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <Icons.Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo mã, tên nhà cung cấp, mã số thuế, SĐT..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <Icons.X size={14} />
            </button>
          )}
        </div>

        {/* Bộ lọc Trạng thái */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Lọc theo trạng thái giao dịch"
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang giao dịch</option>
            <option value="INACTIVE">Ngừng giao dịch</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Số dòng trên mỗi trang"
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value={10}>10 dòng / trang</option>
            <option value={20}>20 dòng / trang</option>
            <option value={50}>50 dòng / trang</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Nhà cung cấp</th>
              <th className="py-3 px-4">Mã số thuế (MST)</th>
              <th className="py-3 px-4">Người liên hệ & SĐT</th>
              <th className="py-3 px-4">Điều khoản thanh toán</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Icons.RefreshCw size={24} className="animate-spin text-indigo-500" />
                    <span>Đang tải danh sách nhà cung cấp...</span>
                  </div>
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Icons.Truck size={24} />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Không tìm thấy nhà cung cấp nào
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Thử thay đổi từ khóa tìm kiếm hoặc bỏ lọc trạng thái để xem thêm kết quả.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => {
                const isActive = supplier.status === 'ACTIVE';

                return (
                  <tr
                    key={supplier.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Cột 1: Thông tin NCC */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="space-y-0.5">
                        <button
                          onClick={() => onViewDetail(supplier)}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors cursor-pointer"
                        >
                          {supplier.name}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {supplier.code}
                          </span>
                          {supplier.address && (
                            <span className="truncate max-w-xs font-sans" title={supplier.address}>
                              • {supplier.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Mã số thuế */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {supplier.taxCode}
                    </td>

                    {/* Cột 3: Người liên hệ & SĐT */}
                    <td className="py-3.5 px-4">
                      {supplier.contactName || supplier.phone ? (
                        <div className="space-y-0.5">
                          {supplier.contactName && (
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {supplier.contactName}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                            {supplier.phone && <span>{supplier.phone}</span>}
                            {supplier.email && (
                              <span className="truncate max-w-[140px]" title={supplier.email}>
                                • {supplier.email}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>

                    {/* Cột 4: Điều khoản thanh toán */}
                    <td className="py-3.5 px-4">
                      {supplier.paymentTerms ? (
                        <span
                          className="inline-block max-w-[220px] text-slate-700 dark:text-slate-300 truncate font-medium"
                          title={supplier.paymentTerms}
                        >
                          {supplier.paymentTerms}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa thiết lập</span>
                      )}
                    </td>

                    {/* Cột 5: Trạng thái (S2-09) */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          />
                          {isActive ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                        </span>
                        {!isActive && supplier.statusReason && (
                          <p
                            className="text-[10px] text-amber-600 dark:text-amber-400 truncate max-w-[180px]"
                            title={`Lý do: ${supplier.statusReason}`}
                          >
                            Lý do: {supplier.statusReason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Cột 6: Thao tác */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewDetail(supplier)}
                          title="Xem chi tiết hồ sơ nhà cung cấp"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Icons.Eye size={16} />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => onEdit(supplier)}
                              title="Chỉnh sửa thông tin"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Icons.Edit size={16} />
                            </button>

                            <button
                              onClick={() => onToggleStatus(supplier)}
                              title={
                                isActive
                                  ? 'Ngừng giao dịch (Bắt buộc nhập lý do S2-09)'
                                  : 'Mở lại giao dịch cho nhà cung cấp'
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              {isActive ? <Icons.AlertTriangle size={16} /> : <Icons.CheckCircle2 size={16} />}
                            </button>

                            <button
                              onClick={() => onDelete(supplier)}
                              title="Xóa nhà cung cấp (chỉ khi chưa phát sinh phiếu nhập)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Icons.Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {!loading && totalElements > 0 && (
        <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị <strong>{currentPage * pageSize + 1}</strong> -{' '}
            <strong>{Math.min((currentPage + 1) * pageSize, totalElements)}</strong> trong tổng số{' '}
            <strong>{totalElements}</strong> nhà cung cấp
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Icons.ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-300">
              Trang {currentPage + 1} / {totalPages}
            </span>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Icons.ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
