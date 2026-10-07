import React from 'react';
import type { Supplier } from '../../types/supplier';
import { Icons } from '../common/Icons';
import { Pagination } from '../common/Pagination';

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
  onOpenCreate: () => void;
  onSeedSample: () => void;
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
  onOpenCreate,
  onSeedSample,
  canManage
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <Icons.Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo mã, tên, mã số thuế, SĐT..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all placeholder:text-gray-400 min-h-[40px]"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icons.X size={14} />
            </button>
          )}
        </div>

        {/* Bộ lọc Trạng thái */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-gray-500 hidden sm:inline">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Lọc theo trạng thái giao dịch"
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 cursor-pointer min-h-[40px]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang giao dịch</option>
            <option value="INACTIVE">Ngừng giao dịch</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Số dòng trên mỗi trang"
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 cursor-pointer min-h-[40px]"
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
            <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6 min-w-[180px]">Đối tác cung ứng</th>
              <th className="py-3 px-4 whitespace-nowrap">Mã số thuế (MST)</th>
              <th className="py-3 px-4 min-w-[150px]">Người liên hệ & SĐT</th>
              <th className="py-3 px-4 min-w-[140px]">Điều khoản thanh toán</th>
              <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
              <th className="py-3 px-4 sm:px-6 text-right whitespace-nowrap sticky right-0 bg-gray-50 border-l border-gray-200 z-10">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Icons.RefreshCw size={24} className="animate-spin text-orange-500" />
                    <span className="text-gray-600 font-medium">Đang tải danh sách nhà cung cấp...</span>
                  </div>
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto p-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
                      <Icons.Truck size={28} />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-base text-gray-800 block">
                        Chưa có đối tác nào trong danh mục
                      </span>
                      <p className="text-xs text-gray-500">
                        Bạn có thể tạo đối tác mới hoặc nạp sẵn 5 đơn vị mẫu (Vinamilk, Sabeco...) để kiểm tra nhanh.
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={onOpenCreate}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <Icons.Plus size={16} />
                          <span>Thêm mới đối tác</span>
                        </button>
                        <button
                          type="button"
                          onClick={onSeedSample}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs rounded-xl border border-orange-200 transition-all cursor-pointer"
                        >
                          <Icons.Sparkles size={16} />
                          <span>Nạp 5 đối tác mẫu</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => {
                const isActive = supplier.status === 'ACTIVE';

                return (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    {/* Cột 1: Thông tin NCC */}
                    <td className="py-3.5 px-4 sm:px-6 max-w-[240px]">
                      <div className="space-y-0.5">
                        <button
                          onClick={() => onViewDetail(supplier)}
                          className="font-bold text-gray-900 hover:text-orange-600 text-left transition-colors cursor-pointer truncate max-w-full block"
                          title={supplier.name}
                        >
                          {supplier.name}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold shrink-0">
                            {supplier.code}
                          </span>
                          {supplier.address && (
                            <span className="truncate max-w-[150px] font-sans text-gray-500" title={supplier.address}>
                              • {supplier.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Mã số thuế */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-gray-800 whitespace-nowrap">
                      {supplier.taxCode}
                    </td>

                    {/* Cột 3: Người liên hệ & SĐT */}
                    <td className="py-3.5 px-4 max-w-[180px]">
                      {supplier.contactName || supplier.phone ? (
                        <div className="space-y-0.5">
                          {supplier.contactName && (
                            <div className="font-medium text-gray-800 truncate" title={supplier.contactName}>
                              {supplier.contactName}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                            {supplier.phone && <span className="shrink-0">{supplier.phone}</span>}
                            {supplier.email && (
                              <span className="truncate max-w-[110px]" title={supplier.email}>
                                • {supplier.email}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Chưa cập nhật</span>
                      )}
                    </td>

                    {/* Cột 4: Điều khoản thanh toán */}
                    <td className="py-3.5 px-4 max-w-[180px]">
                      {supplier.paymentTerms ? (
                        <span
                          className="inline-block max-w-full text-gray-700 truncate font-medium"
                          title={supplier.paymentTerms}
                        >
                          {supplier.paymentTerms}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Chưa thiết lập</span>
                      )}
                    </td>

                    {/* Cột 5: Trạng thái */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          />
                          {isActive ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                        </span>
                        {!isActive && supplier.statusReason && (
                          <p
                            className="text-[10px] text-amber-600 truncate max-w-[140px]"
                            title={`Lý do: ${supplier.statusReason}`}
                          >
                            Lý do: {supplier.statusReason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Cột 6: Thao tác - Sticky right để không bao giờ bị tràn mất */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 z-10 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewDetail(supplier)}
                          title="Xem chi tiết hồ sơ nhà cung cấp"
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Icons.Eye size={16} />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => onEdit(supplier)}
                              title="Chỉnh sửa thông tin"
                              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Icons.Edit size={16} />
                            </button>

                            <button
                              onClick={() => onToggleStatus(supplier)}
                              title={
                                isActive
                                  ? 'Ngừng giao dịch (Bắt buộc nhập lý do)'
                                  : 'Mở lại giao dịch cho nhà cung cấp'
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {isActive ? <Icons.AlertTriangle size={16} /> : <Icons.CheckCircle2 size={16} />}
                            </button>

                            <button
                              onClick={() => onDelete(supplier)}
                              title="Xóa nhà cung cấp (chỉ khi chưa phát sinh phiếu nhập)"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Phân trang: ‹ 1 2 … n › */}
      {!loading && totalElements > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          size={pageSize}
          onPageChange={onPageChange}
          onSizeChange={onPageSizeChange}
          itemLabel="đối tác"
        />
      )}
    </div>
  );
};
