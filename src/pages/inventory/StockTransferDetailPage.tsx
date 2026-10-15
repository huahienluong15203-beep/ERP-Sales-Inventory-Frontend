import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Warehouse,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  RefreshCw,
  PackageCheck,
  Search,
  Package
} from 'lucide-react';
import type { StockTransfer, StockTransferStatus } from '../../types/stockTransfer';
import {
  fetchStockTransferById,
  dispatchStockTransfer
} from '../../services/stockTransferApi';
import { StockTransferReceiveModal } from '../../components/inventory/StockTransferReceiveModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';

export const StockTransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, showToast, currentRole } = useAuth();

  const canEditInventory = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');
  const isManagerOrAdmin =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_ADMIN'));

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lineKeyword, setLineKeyword] = useState<string>('');
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState<boolean>(false);

  const loadTransferDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchStockTransferById(id);
      setTransfer(data);
    } catch (err) {
      console.error('Lỗi tải chi tiết phiếu chuyển kho:', err);
      showToast('Lỗi tải phiếu', 'Không tìm thấy phiếu chuyển kho yêu cầu', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadTransferDetail();
  }, [loadTransferDetail]);

  // Thao tác Xuất kho vận chuyển
  const handleDispatch = async () => {
    if (!transfer) return;
    try {
      const updated = await dispatchStockTransfer(transfer.id);
      setTransfer(updated);
      showToast(
        'Đã xuất kho vận chuyển',
        `Phiếu [${updated.code}] đã bắt đầu vận chuyển. Hàng ghi nhận ĐANG ĐI ĐƯỜNG, kho đến chưa cộng tồn!`,
        'success',
        5000
      );
    } catch (err) {
      console.error('Lỗi xuất kho:', err);
      showToast('Lỗi xuất kho', err instanceof Error ? err.message : 'Không thể xuất kho', 'error');
    }
  };

  // In phiếu chuyển kho
  const handlePrint = () => {
    window.print();
  };

  // Helper render badge trạng thái
  const renderStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={13} className="text-amber-600" />
            <span>Chờ QL duyệt</span>
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 animate-pulse">
            <Truck size={14} className="text-blue-600" />
            <span>Đang đi đường</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Đã nhận đủ</span>
          </span>
        );
      case 'DISCREPANCY_RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle size={14} className="text-amber-600" />
            <span>Nhận chênh lệch</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <span>Đã hủy</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Lọc dòng hàng theo từ khóa
  const filteredLines = useMemo(() => {
    if (!transfer?.lines) return [];
    if (!lineKeyword.trim()) return transfer.lines;
    const kw = lineKeyword.trim().toLowerCase();
    return transfer.lines.filter(
      (l) =>
        l.productName.toLowerCase().includes(kw) ||
        l.productSku.toLowerCase().includes(kw) ||
        (l.batchNumber && l.batchNumber.toLowerCase().includes(kw))
    );
  }, [transfer?.lines, lineKeyword]);

  const totalTransferQty = useMemo(() => {
    if (!transfer?.lines) return 0;
    return transfer.lines.reduce((s, l) => s + Number(l.transferQuantity || 0), 0);
  }, [transfer?.lines]);

  const totalReceivedQty = useMemo(() => {
    if (!transfer?.lines) return 0;
    return transfer.lines.reduce((s, l) => s + (l.receivedQuantity != null ? Number(l.receivedQuantity) : 0), 0);
  }, [transfer?.lines]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 gap-3">
        <RefreshCw size={28} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Đang tải thông tin chi tiết phiếu chuyển kho...</span>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-lg mx-auto space-y-4">
        <ArrowRightLeft size={48} className="mx-auto text-gray-300" />
        <h2 className="text-base font-bold text-gray-800">Không tìm thấy phiếu chuyển kho</h2>
        <p className="text-xs text-gray-500">Mã phiếu không tồn tại hoặc bạn không có quyền truy cập</p>
        <button
          type="button"
          onClick={() => navigate('/inventory/transfers')}
          className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition"
        >
          Quay lại danh sách phiếu chuyển
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 max-w-6xl mx-auto">
      {/* 1. HEADER BAR & THAO TÁC CHÍNH (NO-PRINT) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/inventory/transfers')}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black font-mono text-blue-700">
                {transfer.code}
              </h1>
              {renderStatusBadge(transfer.status)}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Lập bởi: <b className="text-gray-700">{transfer.createdBy}</b> • Ngày lập: {transfer.createdAt.slice(0, 10)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <Printer size={15} />
            <span>In phiếu chuyển</span>
          </button>

          {/* Nút Duyệt & Xuất kho nếu đang DRAFT */}
          {transfer.status === 'DRAFT' && canEditInventory && isManagerOrAdmin && (
            <button
              type="button"
              onClick={handleDispatch}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Duyệt & Xuất kho vận chuyển</span>
            </button>
          )}

          {/* Nút Kho đến nhận hàng nếu IN_TRANSIT */}
          {transfer.status === 'IN_TRANSIT' && canEditInventory && (
            <button
              type="button"
              onClick={() => setIsReceiveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              <PackageCheck size={15} />
              <span>Kiểm tra & Nhận hàng tại kho đến</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THẺ THÔNG TIN LỘ TRÌNH VÀ VẬN CHUYỂN (NO-PRINT) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4 no-print">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Warehouse size={16} className="text-blue-600" />
            <span>Lộ trình điều chuyển & Thông tin xe vận chuyển</span>
          </h2>
          <span className="text-xs text-gray-400">
            Ngày chuyển: <b className="text-gray-700">{transfer.transferDate}</b>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lộ trình Kho xuất */}
          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200/80 space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-rose-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Kho xuất (Kho đi)</span>
            </div>
            <div className="text-sm font-black text-rose-950">{transfer.sourceWarehouseName}</div>
            <div className="text-xs font-mono text-rose-700">Mã kho: {transfer.sourceWarehouseCode}</div>
            {transfer.dispatchedAt && (
              <div className="text-[11px] text-gray-500 pt-1">
                Thời gian xuất kho: {transfer.dispatchedAt.replace('T', ' ')}
              </div>
            )}
          </div>

          {/* Lộ trình Kho nhận */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-emerald-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Kho nhận (Kho đến)</span>
            </div>
            <div className="text-sm font-black text-emerald-950">{transfer.destWarehouseName}</div>
            <div className="text-xs font-mono text-emerald-700">Mã kho: {transfer.destWarehouseCode}</div>
            {transfer.receivedAt ? (
              <div className="text-[11px] text-gray-500 pt-1">
                Thời gian nhận hàng: {transfer.receivedAt.replace('T', ' ')}
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 pt-1">
                Dự kiến đến: {transfer.expectedReceiveDate || '—'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-gray-500 block text-[11px]">Biển số xe:</span>
            <span className="font-mono font-bold text-gray-800 text-sm">
              {transfer.vehiclePlate || 'Chưa có biển số'}
            </span>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-gray-500 block text-[11px]">Tài xế / Vận chuyển:</span>
            <span className="font-bold text-gray-800 text-sm">
              {transfer.transporterName || '—'}
            </span>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-gray-500 block text-[11px]">Ghi chú điều chuyển:</span>
            <span className="text-gray-700 italic truncate block">
              {transfer.note || 'Không có ghi chú'}
            </span>
          </div>
        </div>

        {/* Cảnh báo biên bản chênh lệch nếu có */}
        {transfer.discrepancyGeneralReason && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>Biên bản giải trình chênh lệch khi nhận hàng:</span>
            </div>
            <p className="pl-5 text-gray-800 italic">{transfer.discrepancyGeneralReason}</p>
          </div>
        )}
      </div>

      {/* 3. BẢNG DANH SÁCH MẶT HÀNG (NO-PRINT) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden no-print">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                Danh sách hàng hóa điều chuyển
              </h3>
              <p className="text-xs text-gray-500">
                Tổng cộng {transfer.lines.length} mặt hàng trong phiếu chuyển
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={lineKeyword}
              onChange={(e) => setLineKeyword(e.target.value)}
              placeholder="Tìm theo SKU, tên sản phẩm, số lô..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-3 min-w-[200px]">Mặt hàng</th>
                <th className="py-2.5 px-3 w-32">Mã SKU</th>
                <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                <th className="py-2.5 px-3 w-28 text-center font-bold text-blue-900 bg-blue-50/50">
                  SL chuyển
                </th>
                <th className="py-2.5 px-3 w-28 text-center font-bold text-emerald-900 bg-emerald-50/50">
                  SL nhận
                </th>
                <th className="py-2.5 px-3 w-24 text-center">Chênh lệch</th>
                <th className="py-2.5 px-3 w-32">Số lô</th>
                <th className="py-2.5 px-3 w-28">Hạn dùng</th>
                <th className="py-2.5 px-3 min-w-[150px]">Lý do chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    Không tìm thấy mặt hàng nào phù hợp từ khóa
                  </td>
                </tr>
              ) : (
                filteredLines.map((line, idx) => {
                  const hasReceived = line.receivedQuantity != null;
                  const diff = line.differenceQuantity || (hasReceived ? line.transferQuantity - Number(line.receivedQuantity) : 0);

                  return (
                    <tr key={line.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-2.5 px-3 text-center text-gray-400 font-semibold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{line.productName}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{line.productSku}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600 font-medium">{line.unit}</td>
                      <td className="py-2.5 px-3 text-center font-black text-blue-700 bg-blue-50/30">
                        {line.transferQuantity.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black bg-emerald-50/30">
                        {hasReceived ? (
                          <span className="text-emerald-700">{Number(line.receivedQuantity).toLocaleString('vi-VN')}</span>
                        ) : (
                          <span className="text-gray-400 font-normal italic">Chưa nhận</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {hasReceived ? (
                          diff !== 0 ? (
                            <span className="text-rose-600">-{diff}</span>
                          ) : (
                            <span className="text-emerald-600">0</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{line.batchNumber || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-600">{line.expiredDate || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-600 italic">
                        {line.discrepancyReason || (diff === 0 && hasReceived ? 'Nhận đủ' : '—')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tổng kết bảng */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-gray-500">
            Tổng cộng: <b>{transfer.lines.length}</b> mặt hàng
          </span>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500">Tổng SL xuất chuyển:</span>{' '}
              <span className="font-mono font-black text-blue-700 bg-blue-100/60 px-2.5 py-1 rounded-lg">
                {totalTransferQty.toLocaleString('vi-VN')}
              </span>
            </div>
            {transfer.status === 'COMPLETED' || transfer.status === 'DISCREPANCY_RESOLVED' ? (
              <div>
                <span className="text-gray-500">Tổng SL thực nhận:</span>{' '}
                <span className="font-mono font-black text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                  {totalReceivedQty.toLocaleString('vi-VN')}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 4. MODAL NHẬN HÀNG KHO ĐẾN (NẾU MỞ) */}
      <StockTransferReceiveModal
        isOpen={isReceiveModalOpen}
        transfer={transfer}
        onClose={() => setIsReceiveModalOpen(false)}
        onSuccess={(updated) => {
          setTransfer(updated);
          setIsReceiveModalOpen(false);
          showToast('Nhận hàng thành công', `Phiếu [${updated.code}] đã hoàn tất kiểm tra và nhận hàng`, 'success');
        }}
      />

      {/* ========================================================================= */}
      {/* 5. KHỐI IN ẤN A4: PHIẾU XUẤT KHO KIÊM VẬN CHUYỂN NỘI BỘ (CHỈ HIỂN THỊ KHI IN) */}
      {/* ========================================================================= */}
      <div className="print-only hidden font-serif text-black p-8 bg-white max-w-4xl mx-auto">
        <div className="text-center space-y-1 mb-6 border-b-2 border-black pb-4">
          <div className="text-xs uppercase font-bold tracking-widest text-gray-700">
            CÔNG TY CỔ PHẦN PHÂN PHỐI BÁN LẺ & CHUỖI CUNG ỨNG TOÀN QUỐC
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-black pt-2">
            PHIẾU XUẤT KHO KIÊM VẬN CHUYỂN NỘI BỘ
          </h1>
          <div className="text-xs italic">
            (Liên 1: Lưu kho xuất • Liên 2: Đi đường • Liên 3: Lưu kho nhận)
          </div>
          <div className="text-xs font-mono font-bold pt-1">
            Số phiếu: {transfer.code} — Ngày: {transfer.transferDate}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div>
            <p><strong>Đơn vị xuất kho:</strong> {transfer.sourceWarehouseName} ({transfer.sourceWarehouseCode})</p>
            <p><strong>Đơn vị nhận kho:</strong> {transfer.destWarehouseName} ({transfer.destWarehouseCode})</p>
            <p><strong>Lý do điều chuyển:</strong> {transfer.note || 'Điều chuyển hàng hóa nội bộ'}</p>
          </div>
          <div>
            <p><strong>Phương tiện vận chuyển:</strong> {transfer.vehiclePlate || '—'}</p>
            <p><strong>Người vận chuyển (Tài xế):</strong> {transfer.transporterName || '—'}</p>
            <p><strong>Người lập phiếu:</strong> {transfer.createdBy}</p>
          </div>
        </div>

        <table className="w-full text-xs border border-black border-collapse mb-6">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black py-1.5 px-2 text-center w-10">STT</th>
              <th className="border border-black py-1.5 px-2 text-left">Tên hàng hóa</th>
              <th className="border border-black py-1.5 px-2 text-center w-24">Mã SKU</th>
              <th className="border border-black py-1.5 px-2 text-center w-16">ĐVT</th>
              <th className="border border-black py-1.5 px-2 text-center w-24">SL xuất</th>
              <th className="border border-black py-1.5 px-2 text-center w-24">SL nhận</th>
              <th className="border border-black py-1.5 px-2 text-center w-24">Số lô</th>
            </tr>
          </thead>
          <tbody>
            {transfer.lines.map((l, idx) => (
              <tr key={l.id}>
                <td className="border border-black py-1.5 px-2 text-center">{idx + 1}</td>
                <td className="border border-black py-1.5 px-2 font-bold">{l.productName}</td>
                <td className="border border-black py-1.5 px-2 text-center font-mono">{l.productSku}</td>
                <td className="border border-black py-1.5 px-2 text-center">{l.unit}</td>
                <td className="border border-black py-1.5 px-2 text-center font-bold">
                  {l.transferQuantity.toLocaleString('vi-VN')}
                </td>
                <td className="border border-black py-1.5 px-2 text-center font-bold">
                  {l.receivedQuantity != null ? Number(l.receivedQuantity).toLocaleString('vi-VN') : '......'}
                </td>
                <td className="border border-black py-1.5 px-2 text-center font-mono">{l.batchNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-100">
              <td colSpan={4} className="border border-black py-1.5 px-2 text-right">
                TỔNG CỘNG:
              </td>
              <td className="border border-black py-1.5 px-2 text-center font-mono">
                {totalTransferQty.toLocaleString('vi-VN')}
              </td>
              <td className="border border-black py-1.5 px-2 text-center font-mono">
                {totalReceivedQty > 0 ? totalReceivedQty.toLocaleString('vi-VN') : '......'}
              </td>
              <td className="border border-black py-1.5 px-2"></td>
            </tr>
          </tfoot>
        </table>

        {/* Khối chữ ký xác nhận 4 bên */}
        <div className="mt-8 pt-4 text-xs">
          <div className="grid grid-cols-4 text-center gap-2">
            <div>
              <p className="font-bold">Người lập phiếu</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold">{transfer.createdBy}</p>
            </div>
            <div>
              <p className="font-bold">Thủ kho xuất</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold">..........................</p>
            </div>
            <div>
              <p className="font-bold">Người vận chuyển</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold">{transfer.transporterName || '..........................'}</p>
            </div>
            <div>
              <p className="font-bold">Thủ kho nhận</p>
              <p className="text-[10px] italic text-gray-600">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold">..........................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
