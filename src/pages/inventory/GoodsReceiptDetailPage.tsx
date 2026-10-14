import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Warehouse,
  Building2,
  Package,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import type { GoodsReceipt, GoodsReceiptLine } from '../../types/inventory';
import { fetchGoodsReceiptById, confirmGoodsReceipt } from '../../services/inventoryReceiptApi';
import { formatCurrencyVND, formatQuantity } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';
import { getUserFullName } from '../../lib/userFormatters';

export const GoodsReceiptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, showToast, currentRole } = useAuth();

  const canEditInventory = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirming, setConfirming] = useState<boolean>(false);

  // Phân trang & Tìm kiếm dòng hàng trong phiếu nhập
  const [lineKeyword, setLineKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadReceiptDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchGoodsReceiptById(id);
      setReceipt(data);
    } catch (err) {
      console.error('Lỗi tải chi tiết phiếu nhập kho:', err);
      showToast('Lỗi tải phiếu', 'Không tìm thấy thông tin phiếu nhập kho yêu cầu', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadReceiptDetail();
  }, [loadReceiptDetail]);

  // Xác nhận phiếu nhập kho (Cộng tồn)
  const handleConfirmReceipt = async () => {
    if (!receipt || !receipt.id) return;
    setConfirming(true);
    try {
      const updated = await confirmGoodsReceipt(receipt.id, user?.username || 'wh_manager');
      setReceipt(updated);
      showToast(
        'Đã xác nhận nhập kho',
        `Phiếu [${updated.code}] đã được xác nhận thành công. Hàng hóa đã được cộng vào tồn kho!`,
        'success',
        5000
      );
    } catch (err) {
      console.error('Lỗi xác nhận phiếu:', err);
      showToast('Lỗi xác nhận', err instanceof Error ? err.message : 'Không thể xác nhận phiếu', 'error');
    } finally {
      setConfirming(false);
    }
  };

  // In phiếu nhập kho
  const handlePrint = () => {
    window.print();
  };

  // Lọc dòng hàng theo từ khóa
  const filteredLines = useMemo(() => {
    if (!receipt?.lines) return [];
    if (!lineKeyword.trim()) return receipt.lines;
    const kw = lineKeyword.trim().toLowerCase();
    return receipt.lines.filter(
      (l) =>
        l.productName.toLowerCase().includes(kw) ||
        l.productSku.toLowerCase().includes(kw) ||
        (l.batchNumber && l.batchNumber.toLowerCase().includes(kw))
    );
  }, [receipt?.lines, lineKeyword]);

  // Phân trang cho danh sách dòng hàng
  const totalLines = filteredLines.length;
  const totalPages = Math.ceil(totalLines / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [lineKeyword, pageSize]);

  const paginatedLines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLines.slice(start, start + pageSize);
  }, [filteredLines, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center mx-auto animate-pulse">
          <RefreshCw size={24} className="animate-spin" />
        </div>
        <p className="text-sm font-bold text-gray-700">Đang tải thông tin chi tiết phiếu nhập kho...</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <Package size={32} />
        </div>
        <h2 className="text-lg font-black text-gray-900">Không tìm thấy phiếu nhập kho</h2>
        <p className="text-xs text-gray-500">
          Phiếu nhập kho với mã hoặc ID được cung cấp không tồn tại trên hệ thống hoặc đã bị gỡ bỏ.
        </p>
        <button
          type="button"
          onClick={() => navigate('/inventory/receipts')}
          className="px-4 py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách phiếu nhập kho</span>
        </button>
      </div>
    );
  }

  const isConfirmed = receipt.status === 'CONFIRMED';

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto pb-16 print:pb-0 print:m-0 print:max-w-none print:space-y-0 animate-in fade-in duration-200">
      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & BREADCRUMBS (ẨN KHI IN) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/inventory/receipts')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="goods-receipt-detail-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách phiếu nhập kho</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Kho bãi & Tồn kho / Phiếu nhập kho / Chi tiết phiếu {receipt.code}
          </span>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadReceiptDetail}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Tải lại chi tiết"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="In phiếu nhập kho"
          >
            <Printer size={15} />
            <span>In Phiếu</span>
          </button>

          {!isConfirmed && canEditInventory && (
            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirmReceipt}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check size={16} className={confirming ? 'animate-spin' : ''} />
              <span>Xác Nhận Nhập Kho (Cộng Tồn)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. HERO HEADER PHIẾU NHẬP KHO (ẨN KHI IN) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 bg-gradient-to-r from-orange-50/60 via-amber-50/20 to-white no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
              <Warehouse size={28} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Phiếu Nhập Kho: <span className="text-[#F85606] font-mono">{receipt.code}</span>
                </h1>
                {isConfirmed ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={13} />
                    <span>ĐÃ CỘNG TỒN KHO</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <Clock size={13} />
                    <span>PHIẾU NHÁP (CHƯA GHI TỒN)</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Ngày nhập: <strong>{new Date(receipt.receiptDate).toLocaleDateString('vi-VN')}</strong> • Kho đích:{' '}
                <strong>{receipt.warehouseName}</strong> ({receipt.warehouseCode})
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 text-right shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Tổng số mặt hàng</span>
              <span className="text-base font-black text-gray-900 font-mono">
                {receipt.totalLines || receipt.lines.length} SKU
              </span>
            </div>
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 text-right shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Tổng quy đổi cơ sở</span>
              <span className="text-base font-black text-emerald-700 font-mono">
                {formatQuantity(receipt.totalBaseQuantity)} đvcs
              </span>
            </div>
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 text-right shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Tổng giá trị</span>
              <span className="text-base font-black text-[#F85606] font-mono">
                {formatCurrencyVND(receipt.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHỐI 1: THÔNG TIN CHỨNG TỪ, ĐỐI TÁC & VẬN CHUYỂN (ẨN KHI IN) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-4 no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-100">
          <Building2 size={16} className="text-[#F85606]" />
          <span>1. Thông Tin Nhà Cung Cấp & Giao Hàng</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Nhà cung cấp</span>
            <div className="font-bold text-gray-900 text-xs sm:text-sm">{receipt.supplierName}</div>
            <div className="text-[11px] font-mono font-bold text-gray-500">{receipt.supplierCode}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Số chứng từ / Hóa đơn</span>
            <div className="font-bold text-gray-900 font-mono text-sm">{receipt.documentNumber}</div>
            <div className="text-[11px] text-gray-400">Hóa đơn kèm theo lô hàng</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Kho nhận hàng</span>
            <div className="font-bold text-gray-900 text-xs sm:text-sm">{receipt.warehouseName}</div>
            <div className="text-[11px] font-mono font-bold text-orange-600">{receipt.warehouseCode}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Người lập (Thủ kho)</span>
            <div className="font-bold text-gray-900">{getUserFullName(receipt.createdByUsername)}</div>
            <div className="text-[11px] text-gray-500 font-mono">
              {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString('vi-VN') : '---'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Biển số xe giao hàng</span>
            <div className="font-bold text-gray-900 font-mono text-xs uppercase">
              {receipt.vehiclePlate || 'Chưa cập nhật'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Tài xế / Người giao hàng</span>
            <div className="font-bold text-gray-900">{receipt.driverName || 'Chưa cập nhật'}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Trạng thái xác nhận</span>
            <div className="font-bold text-gray-900">
              {receipt.confirmedByUsername ? `Duyệt bởi: ${receipt.confirmedByUsername}` : 'Chưa duyệt xác nhận'}
            </div>
            {receipt.confirmedAt && (
              <div className="text-[11px] text-emerald-600 font-mono">
                {new Date(receipt.confirmedAt).toLocaleString('vi-VN')}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-gray-400 uppercase font-bold text-[10px] block">Ghi chú</span>
            <div className="text-gray-700 italic">{receipt.note || 'Không có ghi chú thêm'}</div>
          </div>
        </div>
      </div>

      {/* 4. KHỐI 2: DANH SÁCH CHI TIẾT MẶT HÀNG NHẬP KHO (PHÂN TRANG ĐẦY ĐỦ - ẨN KHI IN) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden space-y-0 no-print">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-[#F85606]" />
            <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">
              2. Danh Sách Dòng Hàng Nhập Kho ({receipt.lines.length} sản phẩm)
            </h2>
          </div>

          {/* Công cụ tìm kiếm & Chọn số dòng / trang */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã SKU, tên hàng, số lô..."
                value={lineKeyword}
                onChange={(e) => setLineKeyword(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="font-semibold hidden sm:inline">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-xs font-semibold focus:outline-none"
              >
                <option value={5}>5 dòng/trang</option>
                <option value={10}>10 dòng/trang</option>
                <option value={20}>20 dòng/trang</option>
                <option value={50}>50 dòng/trang</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bảng chi tiết mặt hàng - Tách riêng 2 cột Số lô & Hạn dùng */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/90 font-bold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3 min-w-[200px]">Mặt hàng / SKU</th>
                <th className="py-3 px-3 text-center min-w-[120px]">ĐVT Nhập</th>
                <th className="py-3 px-3 text-center min-w-[100px]">Số lượng</th>
                <th className="py-3 px-3 text-center min-w-[120px]">Quy về cơ sở</th>
                <th className="py-3 px-3 min-w-[140px]">Số Lô</th>
                <th className="py-3 px-3 min-w-[120px]">Hạn Dùng</th>
                <th className="py-3 px-3 text-right min-w-[120px]">Đơn giá nhập</th>
                <th className="py-3 px-3 text-right min-w-[130px]">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Không có dòng hàng nào khớp với tìm kiếm &ldquo;{lineKeyword}&rdquo;
                  </td>
                </tr>
              ) : (
                paginatedLines.map((line: GoodsReceiptLine, idx: number) => {
                  const lineIndex = (currentPage - 1) * pageSize + idx + 1;
                  const baseQty = line.baseQuantity || line.quantity * (line.conversionFactor || 1);
                  const lineTotal = line.totalAmount || baseQty * (line.unitPrice || 0);

                  return (
                    <tr key={line.id || idx} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {lineIndex}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{line.productName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                            {line.productSku}
                          </span>
                          {line.category && <span className="text-[11px] text-gray-400">• {line.category}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-gray-800">
                          {line.selectedUnit}
                        </span>
                        {line.conversionFactor && line.conversionFactor > 1 && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            (x{line.conversionFactor} {line.baseUnit})
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-gray-900 font-mono text-sm">
                        {line.quantity}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-mono font-black text-xs border border-emerald-200 inline-block min-w-[70px]">
                          {formatQuantity(baseQty)} {line.baseUnit}
                        </span>
                      </td>

                      {/* Cột 1: Số Lô */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                          {line.batchNumber || '---'}
                        </span>
                      </td>

                      {/* Cột 2: Hạn Dùng */}
                      <td className="py-3 px-3 text-gray-700 font-mono">
                        {line.expiredDate ? new Date(line.expiredDate).toLocaleDateString('vi-VN') : '---'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-gray-800">
                        {formatCurrencyVND(line.unitPrice || 0)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-[#F85606]">
                        {formatCurrencyVND(lineTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG ĐẦY ĐỦ CHO DÒNG HÀNG */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-gray-500 font-medium text-center sm:text-left">
            Hiển thị từ{' '}
            <strong className="text-gray-900">
              {totalLines === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            đến{' '}
            <strong className="text-gray-900">
              {Math.min(currentPage * pageSize, totalLines)}
            </strong>{' '}
            trên tổng số <strong className="text-[#F85606] font-mono">{totalLines}</strong> dòng hàng
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-gray-400">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          currentPage === p
                            ? 'bg-[#F85606] text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-[#F85606]'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-[#F85606] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* TỔNG KẾT PHIẾU NHẬP */}
        <div className="bg-orange-50/50 p-4 sm:p-5 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-gray-500 text-center sm:text-left">
            * Toàn bộ giá trị và số lượng đã được quy đổi chính xác theo đơn vị cơ sở khi vào kho.
          </div>

          <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-orange-200 shadow-2xs">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-gray-400">Tổng quy đổi cơ sở</div>
              <div className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                {formatQuantity(receipt.totalBaseQuantity)} đvcs
              </div>
            </div>
            <div className="h-7 w-px bg-gray-200" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-gray-400">Tổng giá trị nhập</div>
              <div className="text-sm sm:text-base font-black text-[#F85606] font-mono">
                {formatCurrencyVND(receipt.totalAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BẢN IN PHIẾU NHẬP KHO CHUẨN KẾ TOÁN (CHỈ HIỆN KHI BẤM IN) */}
      <div className="hidden print:block w-full bg-white text-black font-sans leading-normal">
        {/* Header Quốc hiệu / Đơn vị */}
        <div className="flex justify-between items-start pb-2 border-b border-black mb-3">
          <div>
            <p className="font-bold text-xs uppercase tracking-wider">CÔNG TY CỔ PHẦN THƯƠNG MẠI & PHÂN PHỐI ERP</p>
            <p className="text-[11px] text-gray-700">Địa điểm nhập: {receipt.warehouseName} ({receipt.warehouseCode})</p>
            <p className="text-[11px] text-gray-700">Nhà cung cấp: {receipt.supplierName} ({receipt.supplierCode})</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs font-bold">Mẫu số: 01-VT</p>
            <p className="text-[10px] italic text-gray-600">(Ban hành theo TT 200/2014/TT-BTC)</p>
            <p className="font-mono text-xs font-bold mt-0.5">Số phiếu: {receipt.code}</p>
          </div>
        </div>

        {/* Tiêu đề chính giữa */}
        <div className="text-center my-3">
          <h1 className="text-base font-black uppercase tracking-wider">PHIẾU NHẬP KHO</h1>
          <p className="text-[11px] italic text-gray-600 mt-0.5">
            Ngày nhập hàng: {new Date(receipt.receiptDate).toLocaleDateString('vi-VN')}
          </p>
        </div>

        {/* Khối thông tin chi tiết biên bản */}
        <div className="border border-black p-2.5 rounded text-[11px] mb-3 space-y-1">
          <div className="grid grid-cols-2 gap-x-4">
            <div><strong>- Họ tên người giao:</strong> {receipt.driverName || 'Giao trực tiếp từ NCC'}</div>
            <div><strong>- Số hóa đơn / chứng từ:</strong> {receipt.documentNumber || receipt.code}</div>
            <div><strong>- Phương tiện vận chuyển:</strong> {receipt.vehiclePlate || '---'}</div>
            <div><strong>- Nhập tại kho:</strong> {receipt.warehouseName}</div>
            <div>
              <strong>- Trạng thái phiếu:</strong>{' '}
              {receipt.status === 'CONFIRMED' ? 'Đã nhập kho & cộng tồn' : 'Phiếu nháp (chưa duyệt)'}
            </div>
            <div><strong>- Người tạo phiếu (Thủ kho):</strong> {getUserFullName(receipt.createdByUsername)}</div>
          </div>
          {receipt.note && (
            <div><strong>- Ghi chú:</strong> {receipt.note}</div>
          )}
        </div>

        {/* Bảng in toàn bộ mặt hàng */}
        <table className="w-full border-collapse border-2 border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black text-center font-bold">
              <th className="border border-black py-1 px-1.5 w-7">STT</th>
              <th className="border border-black py-1 px-2 w-24 text-left">Mã SKU</th>
              <th className="border border-black py-1 px-2 text-left">Tên sản phẩm - Quy cách</th>
              <th className="border border-black py-1 px-1.5 w-14">ĐVT</th>
              <th className="border border-black py-1 px-2 w-20">Số lô</th>
              <th className="border border-black py-1 px-2 w-20">Hạn dùng</th>
              <th className="border border-black py-1 px-2 w-16 text-right">Số lượng</th>
              <th className="border border-black py-1 px-2 w-20 text-right">Đơn giá</th>
              <th className="border border-black py-1 px-2 w-24 text-right">Thành tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((line, idx) => (
              <tr key={line.id} className="border-b border-black print-avoid-break">
                <td className="border border-black py-1 px-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black py-1 px-2 font-mono font-bold">{line.productSku}</td>
                <td className="border border-black py-1 px-2 font-medium">{line.productName}</td>
                <td className="border border-black py-1 px-1 text-center font-medium">
                  {line.selectedUnit || line.baseUnit}
                </td>
                <td className="border border-black py-1 px-2 text-center font-mono">{line.batchNumber || '---'}</td>
                <td className="border border-black py-1 px-2 text-center font-mono">
                  {line.expiredDate ? new Date(line.expiredDate).toLocaleDateString('vi-VN') : '---'}
                </td>
                <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                  {formatQuantity(line.quantity)}
                </td>
                <td className="border border-black py-1 px-2 text-right font-mono">
                  {formatCurrencyVND(line.unitPrice)}
                </td>
                <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                  {formatCurrencyVND(line.totalAmount ?? line.quantity * line.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Hàng tổng cộng chốt phiếu nhập kho */}
          <tfoot className="print-avoid-break bg-gray-50 font-bold border-t-2 border-b-2 border-black">
            <tr className="font-bold border-t-2 border-b-2 border-black">
              <td colSpan={6} className="border border-black py-1.5 px-3 text-right uppercase">
                Tổng cộng ({receipt.lines.length} mặt hàng):
              </td>
              <td className="border border-black py-1.5 px-2 text-right font-mono">
                {formatQuantity(receipt.totalBaseQuantity)} đvcs
              </td>
              <td className="border border-black py-1.5 px-2 text-right"></td>
              <td className="border border-black py-1.5 px-2 text-right font-mono text-xs">
                {formatCurrencyVND(receipt.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Gạch kết thúc danh sách hàng nhập (chốt danh mục chứng từ) */}
        <div className="w-full my-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-black border-y-2 border-black py-1 print-avoid-break">
          ═══ HẾT DANH SÁCH HÀNG NHẬP (TỔNG CỘNG: {receipt.lines.length} MẶT HÀNG) ═══
        </div>

        {/* Khối chữ ký xác nhận 4 bên */}
        <div className="mt-6 pt-3 border-t border-gray-400 text-[11px] print-avoid-break">
          <div className="text-right italic mb-3">
            Ngày ...... tháng ...... năm 2026
          </div>
          <div className="grid grid-cols-4 text-center gap-2">
            <div>
              <p className="font-bold">Người giao hàng</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold">{receipt.driverName || '..............................'}</p>
            </div>
            <div>
              <p className="font-bold">Người nhận / Thủ kho</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-800">{getUserFullName(receipt.createdByUsername)}</p>
            </div>
            <div>
              <p className="font-bold">Kế toán kho</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-400">..............................</p>
            </div>
            <div>
              <p className="font-bold">Giám đốc / Trưởng kho</p>
              <p className="text-[10px] italic text-gray-600">(Ký, đóng dấu)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-800">
                {receipt.confirmedByUsername || '..............................'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
