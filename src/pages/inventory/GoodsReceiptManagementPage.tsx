import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Package
} from 'lucide-react';
import type { GoodsReceipt, WarehouseOption } from '../../types/inventory';
import {
  fetchGoodsReceipts,
  deleteGoodsReceipt
} from '../../services/inventoryReceiptApi';
import { formatQuantity } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from '../../routes/Router';
import { SearchSelect } from '../../components/common/SearchSelect';
import { GoodsReceiptDraftsModal } from '../../components/inventory/GoodsReceiptDraftsModal';
import { getAllowedWarehouses } from '../../types/inventory';
import { Pagination } from '../../components/common/Pagination';
import { useClientPagination } from '../../hooks/useClientPagination';

export const GoodsReceiptManagementPage: React.FC = () => {
  const { user, showToast, currentRole } = useAuth();

  // Lọc danh sách kho mà người dùng có quyền phụ trách (kho nào không có quyền thì không hiện)
  const allowedWarehouses = useMemo(() => {
    return getAllowedWarehouses(user, currentRole);
  }, [user, currentRole]);

  // Mục 12 (góp ý GV): chặn ở cả FE và BE - chỉ NV kho, QL kho, Admin được lập / xác nhận / sửa;
  // Kế toán, QL kinh doanh chỉ xem.
  const canEditInventory = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');
  const { pathname, search } = useLocation();

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState<boolean>(false);

  // Bộ lọc
  const [keyword, setKeyword] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  const navigate = useNavigate();

  // Lắng nghe thay đổi query param từ router để tự động chuyển sang trang lập phiếu
  useEffect(() => {
    const rawSearch = search || (pathname.includes('?') ? '?' + pathname.split('?')[1] : window.location.search);
    const params = new URLSearchParams(rawSearch);
    if ((params.get('create') === '1' || params.get('openModal') === '1') && canEditInventory) {
      navigate(`/inventory/receipts/create${rawSearch.startsWith('?') ? rawSearch : '?' + rawSearch}`);
    }
  }, [pathname, search, canEditInventory, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGoodsReceipts({
        keyword,
        warehouseCode: selectedWarehouse
      });
      setReceipts(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phiếu nhập kho:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedWarehouse]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xóa phiếu nhập kho nháp
  const handleDeleteDraft = async (receiptId: number | string) => {
    try {
      await deleteGoodsReceipt(receiptId);
      showToast('Đã xóa phiếu nháp', 'Phiếu nhập kho nháp đã được xóa thành công.', 'success');
      loadData();
    } catch (err: unknown) {
      console.error('Lỗi xóa phiếu nhập kho nháp:', err);
      showToast('Lỗi xóa phiếu nháp', err instanceof Error ? err.message : 'Không thể xóa phiếu nháp', 'error');
      throw err;
    }
  };

  // Phân loại: Phiếu nháp đưa vào nút / modal; Bảng chính chỉ hiển thị phiếu đã xác nhận (không hiển thị phiếu nháp)
  const draftReceipts = receipts.filter((r) => r.status === 'DRAFT');
  const confirmedReceipts = receipts.filter((r) => r.status === 'CONFIRMED');
  // Phân trang tại chỗ, cùng kiểu với các trang danh sách khác
  const pager = useClientPagination(confirmedReceipts);
  const draftCount = draftReceipts.length;
  const confirmedCount = confirmedReceipts.length;
  const totalBaseUnits = confirmedReceipts.reduce((s, r) => s + r.totalBaseQuantity, 0);

  return (
    <div className="space-y-3.5 antialiased">
      {/* Tiêu đề trang & Nút thao tác chính */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          title="Làm mới danh sách phiếu nhập kho"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-[#F85606] hover:border-orange-300 rounded-lg hover:bg-orange-50/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs h-9"
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>

        {/* Nút xem danh sách phiếu nháp (tương tự nút Đơn nháp) */}
        {canEditInventory && (
          <button
            type="button"
            onClick={() => setIsDraftsModalOpen(true)}
            title="Xem danh sách phiếu nhập kho nháp"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:text-[#F85606] hover:border-orange-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs h-9"
          >
            <Clock size={14} className="text-gray-500" />
            <span>Phiếu nháp</span>
            {draftCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#F85606] text-white text-[10px] font-bold flex items-center justify-center">
                {draftCount}
              </span>
            )}
          </button>
        )}

        {canEditInventory && (
          <button
            type="button"
            onClick={() => navigate('/inventory/receipts/create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#F85606] to-orange-500 hover:from-orange-600 hover:to-orange-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition cursor-pointer h-9 active:scale-95"
            id="create-receipt-btn"
          >
            <Plus size={16} />
            <span>Lập Phiếu Nhập Kho</span>
          </button>
        )}
      </div>

      {/* 2. THẺ THỐNG KÊ NHANH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F85606] flex items-center justify-center font-bold">
            <FileText size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase">Tổng số phiếu chính thức</div>
            <div className="text-lg font-black text-gray-900 font-mono">{confirmedCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase">Đã xác nhận (Đã cộng tồn)</div>
            <div className="text-lg font-black text-emerald-600 font-mono">
              {confirmedCount} <span className="text-xs font-medium text-gray-500">({totalBaseUnits.toLocaleString('vi-VN')} cơ sở)</span>
            </div>
          </div>
        </div>

        <div
          onClick={() => setIsDraftsModalOpen(true)}
          title="Bấm để xem danh sách phiếu nháp"
          className="bg-white p-4 rounded-2xl border border-gray-200/80 hover:border-orange-300 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition hover:bg-orange-50/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase">Phiếu nháp (Chưa cộng tồn)</div>
              <div className="text-lg font-black text-gray-700 font-mono">{draftCount}</div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#F85606] bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
            Xem nháp →
          </span>
        </div>
      </div>

      {/* 3. BỘ LỌC TÌM KIẾM */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, nhà cung cấp, số chứng từ..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center sm:justify-end gap-2">
          <SearchSelect
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl p-2.5 bg-white"
          >
            {allowedWarehouses.length > 1 && (
              <option value="">Tất cả các kho phụ trách</option>
            )}
            {allowedWarehouses.map((w: WarehouseOption) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </SearchSelect>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH PHIẾU NHẬP KHO (CHỈ HIỂN THỊ PHIẾU ĐÃ XÁC NHẬN) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 text-gray-600 font-bold border-b border-gray-200">
                <th className="py-3 px-4">Mã phiếu</th>
                <th className="py-3 px-4">Nhà cung cấp</th>
                <th className="py-3 px-4">Số chứng từ</th>
                <th className="py-3 px-4">Kho nhập</th>
                <th className="py-3 px-4">Ngày nhập</th>
                <th className="py-3 px-4 text-center">Số SKU</th>
                <th className="py-3 px-4 text-center">Quy đổi cơ sở</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-500">
                    <RefreshCw size={26} className="animate-spin text-[#F85606] mx-auto mb-2" />
                    <span>Đang tải danh sách phiếu nhập kho...</span>
                  </td>
                </tr>
              ) : confirmedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 space-y-2">
                    <Package size={36} className="mx-auto text-gray-300" />
                    <p className="font-bold text-gray-700 text-sm">Chưa có phiếu nhập kho chính thức nào</p>
                    <p className="text-xs text-gray-500">
                      Các phiếu nháp đang chờ được lưu trữ trong mục &quot;Phiếu nháp&quot; ở trên.
                    </p>
                  </td>
                </tr>
              ) : (
                pager.pageItems.map((r) => (
                  <tr key={r.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#F85606]">
                      <button
                        type="button"
                        onClick={() => navigate(`/inventory/receipts/${r.id}`)}
                        className="hover:underline cursor-pointer text-left font-mono font-bold text-[#F85606]"
                        title="Bấm để xem chi tiết phiếu nhập kho"
                      >
                        {r.code}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{r.supplierName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{r.supplierCode}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-800">
                      {r.documentNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {r.warehouseName}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {new Date(r.receiptDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800">
                      {r.totalLines} SKU
                    </td>
                    <td className="py-3 px-4 text-center font-black font-mono text-emerald-700">
                      {formatQuantity(r.totalBaseQuantity)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Đã cộng tồn</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/inventory/receipts/${r.id}`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#F85606] hover:bg-orange-50 transition cursor-pointer"
                          title="Xem trang chi tiết phiếu nhập"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Phân trang dùng chung toàn hệ thống */}
        {pager.totalElements > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              page={pager.page}
              totalPages={pager.totalPages}
              totalElements={pager.totalElements}
              size={pager.size}
              itemLabel="phiếu nhập"
              onPageChange={pager.setPage}
              onSizeChange={pager.setSize}
            />
          </div>
        )}
      </div>

      {/* Modal Quản lý Phiếu Nhập Kho Nháp */}
      <GoodsReceiptDraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        drafts={draftReceipts}
        onEdit={(id) => navigate(`/inventory/receipts/${id}`)}
        onDeleteDraft={handleDeleteDraft}
        canEdit={canEditInventory}
      />
    </div>
  );
};
