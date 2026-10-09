import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Check,
  Package
} from 'lucide-react';
import type { GoodsReceipt } from '../../types/inventory';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import {
  fetchGoodsReceipts,
  confirmGoodsReceipt
} from '../../services/inventoryReceiptApi';
import { GoodsReceiptFormModal } from '../../components/inventory/GoodsReceiptFormModal';
import { formatQuantity } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';

export const GoodsReceiptManagementPage: React.FC = () => {
  const { user, showToast } = useAuth();

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [keyword, setKeyword] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedDetailReceipt, setSelectedDetailReceipt] = useState<GoodsReceipt | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGoodsReceipts({
        keyword,
        warehouseCode: selectedWarehouse,
        status: selectedStatus
      });
      setReceipts(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phiếu nhập kho:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedWarehouse, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xác nhận phiếu nhập kho trực tiếp từ danh sách (AC4: Cộng tồn kho khi xác nhận)
  const handleConfirmDirect = async (receiptId: number | string) => {
    setConfirmingId(receiptId);
    try {
      const confirmed = await confirmGoodsReceipt(receiptId, user?.username || 'wh_manager');
      showToast(
        'Đã xác nhận nhập kho (AC4)',
        `Phiếu [${confirmed.code}] đã được ghi sổ thành công. Tồn kho đã được cộng thêm theo đơn vị cơ sở!`,
        'success',
        5000
      );
      loadData();
    } catch (err: unknown) {
      console.error('Lỗi xác nhận phiếu nhập kho:', err);
      showToast('Lỗi xác nhận', err instanceof Error ? err.message : 'Không thể xác nhận phiếu', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const draftCount = receipts.filter((r) => r.status === 'DRAFT').length;
  const confirmedCount = receipts.filter((r) => r.status === 'CONFIRMED').length;
  const totalBaseUnits = receipts
    .filter((r) => r.status === 'CONFIRMED')
    .reduce((s, r) => s + r.totalBaseQuantity, 0);

  return (
    <div className="space-y-5 antialiased">
      {/* 1. HEADER TRANG PHIẾU NHẬP KHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Quản Lý Phiếu Nhập Kho Từ Nhà Cung Cấp
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              Sprint 5: S5-04
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ghi nhận hàng về đúng lô/hạn, quy đổi đơn vị cơ sở và quản lý cộng tồn kho khi xác nhận
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFormModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-500 hover:from-orange-600 hover:to-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
            id="create-receipt-btn"
          >
            <Plus size={16} />
            <span>Lập Phiếu Nhập Kho (S5-04)</span>
          </button>
        </div>
      </div>

      {/* 2. THẺ THỐNG KÊ NHANH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F85606] flex items-center justify-center font-bold">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase">Tổng số phiếu</div>
            <div className="text-lg font-black text-gray-900 font-mono">{receipts.length}</div>
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

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase">Phiếu nháp (Chưa cộng tồn)</div>
            <div className="text-lg font-black text-gray-700 font-mono">{draftCount}</div>
          </div>
        </div>
      </div>

      {/* 3. BỘ LỌC TÌM KIẾM */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, nhà cung cấp, số chứng từ..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="text-xs font-semibold border border-gray-200 rounded-xl p-2.5 bg-white"
        >
          <option value="">Tất cả các kho</option>
          {SYSTEM_WAREHOUSES.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs font-semibold border border-gray-200 rounded-xl p-2.5 bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="CONFIRMED">Đã xác nhận (Đã cộng tồn)</option>
          <option value="DRAFT">Phiếu nháp (Chưa cộng tồn)</option>
        </select>
      </div>

      {/* 4. BẢNG DANH SÁCH PHIẾU NHẬP KHO */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 text-gray-600 font-bold border-b border-gray-200">
                <th className="py-3 px-4">Mã phiếu</th>
                <th className="py-3 px-4">Nhà cung cấp (AC1)</th>
                <th className="py-3 px-4">Số chứng từ (AC1)</th>
                <th className="py-3 px-4">Kho nhập (AC1)</th>
                <th className="py-3 px-4">Ngày nhập</th>
                <th className="py-3 px-4 text-center">Số SKU</th>
                <th className="py-3 px-4 text-center">Quy đổi cơ sở (AC2)</th>
                <th className="py-3 px-4 text-center">Trạng thái (AC4)</th>
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
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 space-y-2">
                    <Package size={36} className="mx-auto text-gray-300" />
                    <p className="font-bold text-gray-700 text-sm">Chưa có phiếu nhập kho nào</p>
                    <p className="text-xs text-gray-500">
                      Hãy bấm &quot;Lập Phiếu Nhập Kho&quot; để ghi nhận hàng về kho từ nhà cung cấp.
                    </p>
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#F85606]">
                      {r.code}
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
                      {r.status === 'CONFIRMED' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>Đã cộng tồn</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                          <Clock size={11} />
                          <span>Phiếu nháp</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailReceipt(r)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                          title="Xem chi tiết phiếu nhập"
                        >
                          <Eye size={15} />
                        </button>

                        {/* AC4: Nút xác nhận cộng tồn đối với phiếu nháp */}
                        {r.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmDirect(r.id)}
                            disabled={confirmingId === r.id}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                            title="Xác nhận nhập kho & cộng tồn kho (AC4)"
                          >
                            <Check size={15} className={confirmingId === r.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL FORM LẬP PHIẾU NHẬP KHO CHI TIẾT (S5-04) */}
      <GoodsReceiptFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* 6. MODAL XEM CHI TIẾT PHIẾU NHẬP KHO */}
      {selectedDetailReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                  <span>Phiếu Nhập Kho:</span>
                  <span className="font-mono text-[#F85606]">{selectedDetailReceipt.code}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ngày nhập: {selectedDetailReceipt.receiptDate} • Kho: {selectedDetailReceipt.warehouseName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailReceipt(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                X
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-400 block text-[11px]">Nhà cung cấp</span>
                <span className="font-bold text-gray-800">{selectedDetailReceipt.supplierName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Số chứng từ / HĐ</span>
                <span className="font-bold font-mono text-gray-900">{selectedDetailReceipt.documentNumber}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Người lập phiếu</span>
                <span className="font-bold text-gray-800">{selectedDetailReceipt.createdByUsername}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Trạng thái tồn kho (AC4)</span>
                <span
                  className={`font-bold ${
                    selectedDetailReceipt.status === 'CONFIRMED' ? 'text-emerald-600' : 'text-gray-600'
                  }`}
                >
                  {selectedDetailReceipt.status === 'CONFIRMED' ? 'ĐÃ CỘNG TỒN' : 'CHƯA CỘNG TỒN (NHÁP)'}
                </span>
              </div>
            </div>

            {/* Chi tiết từng dòng hàng kèm số lô & hạn dùng (AC2, AC3) */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 font-bold text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Mặt hàng</th>
                    <th className="py-2.5 px-3 text-center">ĐVT Nhập (AC2)</th>
                    <th className="py-2.5 px-3 text-center">Số lượng</th>
                    <th className="py-2.5 px-3 text-center">Quy về cơ sở (AC2)</th>
                    <th className="py-2.5 px-3">Số lô & Hạn dùng (AC3)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedDetailReceipt.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{l.productName}</div>
                        <div className="font-mono text-gray-400 text-[10px]">{l.productSku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-gray-700">
                        {l.selectedUnit} (x{l.conversionFactor})
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">
                        {formatQuantity(l.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black font-mono text-emerald-700">
                        {formatQuantity(l.baseQuantity)} {l.baseUnit}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <div>Lô: <strong className="text-gray-800">{l.batchNumber || '—'}</strong></div>
                        <div className="text-gray-500">Hạn: {l.expiredDate || '—'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailReceipt(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
