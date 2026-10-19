import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw,
  PackageCheck,
  Eye
} from 'lucide-react';
import type { StockTransfer, StockTransferStatus } from '../../types/stockTransfer';
import { SYSTEM_WAREHOUSES, getAllowedWarehouses, type WarehouseOption } from '../../types/inventory';
import {
  fetchStockTransfers,
  dispatchStockTransfer
} from '../../services/stockTransferApi';
import { StockTransferReceiveModal } from '../../components/inventory/StockTransferReceiveModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from '../../routes/Router';
import { SearchSelect } from '../../components/common/SearchSelect';
import { RowActionMenu } from '../../components/common/RowActionMenu';

/**
 * S5-07 (Nguyễn Văn Minh): Phân hệ Quản lý Phiếu Chuyển Kho Nội Bộ
 * Acceptance Criteria:
 * - AC1: Chọn kho đi, kho đến, danh sách hàng và số lượng
 * - AC2: Quản lý kho xác nhận phiếu xuất kho -> hàng đang đi đường
 * - AC3: Kho đến kiểm tra, xác nhận nhận đủ -> cộng tồn, kết thúc 1 quy trình
 * - AC4: Chênh lệch khi nhận phải nhập lý do
 */
export const StockTransferManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, currentRole, user } = useAuth();
  const location = useLocation();

  // Lọc danh sách kho mà người dùng có quyền phụ trách (kho nào không có quyền thì không hiện)
  const allowedWarehouses = useMemo(() => {
    return getAllowedWarehouses(user, currentRole);
  }, [user, currentRole]);

  // Mục 12 (góp ý GV): chặn ở cả FE và BE - chỉ NV kho, QL kho, Admin được lập / xuất / nhận phiếu chuyển;
  // Kế toán chỉ xem.
  const canEditInventory = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  // Phân quyền Quản lý kho / Admin: Chỉ Quản lý kho hoặc Admin mới có quyền phê duyệt & xuất kho
  const isManagerOrAdmin =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_ADMIN'));

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceWhFilter, setSourceWhFilter] = useState<string>('ALL');
  const [destWhFilter, setDestWhFilter] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Modals state
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<StockTransfer | null>(null);

  // Tải danh sách phiếu chuyển
  const loadTransfers = async () => {
    setLoading(true);
    try {
      const data = await fetchStockTransfers({
        status: statusFilter,
        sourceWarehouse: sourceWhFilter,
        destWarehouse: destWhFilter,
        keyword
      });
      setTransfers(data);

      // Nếu có query param id hoặc code thì tự chuyển hướng sang trang chi tiết
      const params = new URLSearchParams(location.search);
      const targetId = params.get('id');
      const targetCode = params.get('code');
      if (targetId) {
        navigate(`/inventory/transfers/${targetId}`, { replace: true });
      } else if (targetCode) {
        const found = data.find(
          (t) => t.code.toUpperCase() === targetCode.toUpperCase()
        );
        if (found) {
          navigate(`/inventory/transfers/${found.id}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách phiếu chuyển kho:', err);
      showToast('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [statusFilter, sourceWhFilter, destWhFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransfers();
  };

  // Thao tác Xuất kho vận chuyển cho phiếu DRAFT (AC2)
  const handleDispatch = async (transfer: StockTransfer) => {
    try {
      const updated = await dispatchStockTransfer(transfer.id);
      showToast(
        'Đã xuất kho vận chuyển',
        `Phiếu [${updated.code}] đã bắt đầu vận chuyển. Hàng ghi nhận ĐANG ĐI ĐƯỜNG, kho đến chưa cộng tồn!`,
        'success',
        5000
      );
      setTransfers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: unknown) {
      showToast('Lỗi xuất kho', err instanceof Error ? err.message : 'Không thể xuất kho', 'error');
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = transfers.length;
    const inTransit = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
    const completed = transfers.filter((t) => t.status === 'COMPLETED').length;
    const discrepancy = transfers.filter((t) => t.status === 'DISCREPANCY_RESOLVED').length;
    return { total, inTransit, completed, discrepancy };
  }, [transfers]);

  // Helper render badge trạng thái
  const renderStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={12} className="text-amber-600" />
            <span>Chờ QL duyệt</span>
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 animate-pulse">
            <Truck size={13} className="text-blue-600" />
            <span>Đang đi đường</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Đã nhận đủ</span>
          </span>
        );
      case 'DISCREPANCY_RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle size={13} className="text-amber-600" />
            <span>Nhận chênh lệch</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <span>Đã hủy</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3.5 pb-8">
      {/* Tiêu đề trang & Nút thao tác chính (Tinh gọn giống Danh mục nhà cung cấp) */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={loadTransfers}
          disabled={loading}
          title="Làm mới danh sách phiếu chuyển kho"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 rounded-lg hover:bg-blue-50/40 text-xs font-semibold transition cursor-pointer shadow-2xs h-9"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>

        {canEditInventory && (
          <button
            type="button"
            onClick={() => navigate('/inventory/transfers/create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm hover:shadow cursor-pointer h-9"
          >
            <Plus size={16} />
            <span>Lập Phiếu Chuyển Kho</span>
          </button>
        )}
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-semibold">Tổng số phiếu</div>
            <div className="text-xl font-black text-gray-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="text-xs text-blue-600 font-bold">Đang đi đường</div>
            <div className="text-xl font-black text-blue-700">{stats.inTransit}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs text-emerald-600 font-bold">Đã nhận đủ</div>
            <div className="text-xl font-black text-emerald-700">{stats.completed}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-xs text-amber-600 font-bold">Chênh lệch</div>
            <div className="text-xl font-black text-amber-700">{stats.discrepancy}</div>
          </div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, tài xế, biển số xe, sản phẩm..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center md:justify-end gap-2 w-full md:w-auto">
            {/* Lọc Trạng thái */}
            <SearchSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Phiếu nháp</option>
              <option value="IN_TRANSIT">Đang đi đường</option>
              <option value="COMPLETED">Đã nhận đủ</option>
              <option value="DISCREPANCY_RESOLVED">Nhận chênh lệch</option>
            </SearchSelect>

            {/* Lọc Kho đi */}
            <SearchSelect
              value={sourceWhFilter}
              onChange={(e) => setSourceWhFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">{allowedWarehouses.length > 1 ? 'Kho xuất: Tất cả phụ trách' : 'Kho xuất'}</option>
              {allowedWarehouses.map((w: WarehouseOption) => (
                <option key={w.code} value={w.code}>
                  Từ: {w.name}
                </option>
              ))}
            </SearchSelect>

            {/* Lọc Kho đến */}
            <SearchSelect
              value={destWhFilter}
              onChange={(e) => setDestWhFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Kho nhận: Tất cả</option>
              {SYSTEM_WAREHOUSES.map((w: WarehouseOption) => (
                <option key={w.code} value={w.code}>
                  Đến: {w.name}
                </option>
              ))}
            </SearchSelect>

            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer"
            >
              Lọc
            </button>
          </div>
        </form>
      </div>

      {/* BẢNG DANH SÁCH PHIẾU CHUYỂN KHO */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-blue-600" />
            <span>Đang tải danh sách phiếu chuyển kho...</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ArrowRightLeft size={36} className="mx-auto text-gray-300" />
            <div className="text-sm font-bold text-gray-700">Chưa có phiếu chuyển kho nào phù hợp</div>
            <div className="text-xs text-gray-400">Hãy tạo phiếu chuyển kho mới để điều phối luân chuyển hàng</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Mã phiếu</th>
                  <th className="py-3 px-4">Lộ trình chuyển</th>
                  <th className="py-3 px-4">Ngày chuyển</th>
                  <th className="py-3 px-4">Phương tiện / Tài xế</th>
                  <th className="py-3 px-4 text-center">Số lượng hàng</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((item) => {
                  const totalQty = item.lines.reduce((s, l) => s + l.transferQuantity, 0);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                      {/* Mã phiếu */}
                      <td
                        className="py-3.5 px-4 cursor-pointer"
                        onClick={() => navigate(`/inventory/transfers/${item.id}`)}
                      >
                        <div className="font-mono font-black text-blue-700 hover:underline">{item.code}</div>
                        <div className="text-[10px] text-gray-400">Người tạo: {item.createdBy}</div>
                      </td>

                      {/* Lộ trình kho đi -> kho đến */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-800">
                          <span className="text-rose-600">{item.sourceWarehouseName}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-emerald-700">{item.destWarehouseName}</span>
                        </div>
                        {item.note && (
                          <div className="text-[11px] text-gray-400 truncate max-w-xs">{item.note}</div>
                        )}
                      </td>

                      {/* Ngày chuyển */}
                      <td className="py-3.5 px-4 font-semibold text-gray-600">
                        {item.transferDate}
                        {item.expectedReceiveDate && (
                          <div className="text-[10px] text-gray-400">Dự kiến: {item.expectedReceiveDate}</div>
                        )}
                      </td>

                      {/* Xe / Tài xế */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-gray-800">
                          {item.vehiclePlate || 'Chưa có biển số'}
                        </div>
                        <div className="text-[10px] text-gray-400">{item.transporterName || '—'}</div>
                      </td>

                      {/* Tổng số lượng */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-full">
                          {totalQty.toLocaleString('vi-VN')}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">{item.lines.length} mặt hàng</div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">{renderStatusBadge(item.status)}</td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Xem chi tiết (Chỉ icon con mắt) */}
                          <button
                            type="button"
                            onClick={() => navigate(`/inventory/transfers/${item.id}`)}
                            title="Xem chi tiết phiếu chuyển kho"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Menu dấu 3 chấm "⋯" tích hợp Duyệt & Xuất kho, Kiểm tra & Nhận */}
                          <RowActionMenu
                            title="Thao tác phiếu chuyển kho"
                            items={[
                              {
                                label: 'Duyệt & Xuất kho',
                                icon: <CheckCircle2 size={14} className="text-blue-600" />,
                                title: 'Quản lý kho duyệt phiếu & xuất kho bắt đầu vận chuyển',
                                onClick: () => handleDispatch(item),
                                hidden: item.status !== 'DRAFT' || !canEditInventory || !isManagerOrAdmin
                              },
                              {
                                label: 'Kiểm tra & Nhận hàng',
                                icon: <PackageCheck size={14} className="text-emerald-600" />,
                                title: 'Kho đến kiểm tra thực tế & xác nhận nhận đủ',
                                onClick: () => setSelectedTransferForReceive(item),
                                hidden: item.status !== 'IN_TRANSIT' || !canEditInventory
                              },
                              {
                                label: 'Xem chi tiết',
                                icon: <Eye size={14} className="text-gray-500" />,
                                title: 'Xem chi tiết chứng từ chuyển kho',
                                onClick: () => navigate(`/inventory/transfers/${item.id}`)
                              }
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: KHO ĐẾN NHẬN HÀNG (AC3, AC4) */}
      <StockTransferReceiveModal
        isOpen={Boolean(selectedTransferForReceive)}
        transfer={selectedTransferForReceive}
        onClose={() => setSelectedTransferForReceive(null)}
        onSuccess={(updated) => {
          setTransfers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
      />
    </div>
  );
};
