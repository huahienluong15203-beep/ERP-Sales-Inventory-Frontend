import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Truck,
  PackageCheck
} from 'lucide-react';
import type { StockTransfer } from '../../types/stockTransfer';
import { receiveStockTransfer } from '../../services/stockTransferApi';
import { useAuth } from '../../contexts/AuthContext';

interface StockTransferReceiveModalProps {
  isOpen: boolean;
  transfer: StockTransfer | null;
  onClose: () => void;
  onSuccess: (updated: StockTransfer) => void;
}

interface ReceiveLineInput {
  lineId: string;
  transferQuantity: number;
  receivedQuantity: number;
  unit: string;
  productName: string;
  productSku: string;
  discrepancyReason: string;
}

/**
 * Subtask S5-07 (Nguyễn Văn Minh): Modal nhận hàng tại Kho Đến
 * - AC3: Kho đến xác nhận nhận đủ thì tồn mới được cộng
 * - AC4: Chênh lệch khi nhận phải nhập lý do
 */
export const StockTransferReceiveModal: React.FC<StockTransferReceiveModalProps> = ({
  isOpen,
  transfer,
  onClose,
  onSuccess
}) => {
  const { showToast } = useAuth();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [generalReason, setGeneralReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [receiveLines, setReceiveLines] = useState<ReceiveLineInput[]>(() => {
    if (!transfer) return [];
    return transfer.lines.map((l) => ({
      lineId: l.id,
      transferQuantity: l.transferQuantity,
      receivedQuantity: l.receivedQuantity !== undefined ? l.receivedQuantity : l.transferQuantity,
      unit: l.unit,
      productName: l.productName,
      productSku: l.productSku,
      discrepancyReason: l.discrepancyReason || ''
    }));
  });

  // Đồng bộ khi modal mở với phiếu mới
  React.useEffect(() => {
    if (transfer) {
      setReceiveLines(
        transfer.lines.map((l) => ({
          lineId: l.id,
          transferQuantity: l.transferQuantity,
          receivedQuantity: l.receivedQuantity !== undefined ? l.receivedQuantity : l.transferQuantity,
          unit: l.unit,
          productName: l.productName,
          productSku: l.productSku,
          discrepancyReason: l.discrepancyReason || ''
        }))
      );
      setGeneralReason(transfer.discrepancyGeneralReason || '');
      setErrorMsg('');
    }
  }, [transfer, isOpen]);

  if (!isOpen || !transfer) return null;

  const handleUpdateQuantity = (lineId: string, val: number) => {
    setReceiveLines((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, receivedQuantity: Math.max(0, val) } : item))
    );
  };

  const handleUpdateReason = (lineId: string, val: string) => {
    setReceiveLines((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, discrepancyReason: val } : item))
    );
  };

  // Kiểm tra có dòng nào bị chênh lệch không
  const hasAnyDiscrepancy = receiveLines.some(
    (l) => Number(l.receivedQuantity) !== Number(l.transferQuantity)
  );

  const handleSubmitReceive = async () => {
    setErrorMsg('');

    // AC4: Nếu có chênh lệch thì bắt buộc phải nhập lý do
    if (hasAnyDiscrepancy) {
      const lineMissingReason = receiveLines.find(
        (l) => Number(l.receivedQuantity) !== Number(l.transferQuantity) && !l.discrepancyReason.trim()
      );
      if (lineMissingReason && !generalReason.trim()) {
        const msg = `Mặt hàng [${lineMissingReason.productName}] bị chênh lệch số lượng (${lineMissingReason.receivedQuantity}/${lineMissingReason.transferQuantity}). Vui lòng nhập lý do chênh lệch cụ thể hoặc lý do giải trình chung theo AC4.`;
        setErrorMsg(msg);
        showToast('Bắt buộc nhập lý do chênh lệch (AC4)', msg, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await receiveStockTransfer({
        transferId: transfer.id,
        receivedLines: receiveLines.map((l) => ({
          lineId: l.lineId,
          receivedQuantity: l.receivedQuantity,
          discrepancyReason: l.discrepancyReason.trim() || undefined
        })),
        generalReason: generalReason.trim() || undefined
      });

      if (result.status === 'COMPLETED') {
        showToast(
          'Đã nhận đủ hàng (AC3)',
          `Phiếu [${transfer.code}] đã hoàn tất nhận đủ 100%. Tồn kho tại [${transfer.destWarehouseName}] đã được CỘNG CHÍNH THỨC!`,
          'success',
          5000
        );
      } else {
        showToast(
          'Đã ghi nhận nhận hàng chênh lệch (AC4)',
          `Phiếu [${transfer.code}] đã được ghi sổ kèm lý do giải trình. Tồn kho đến được cộng theo số lượng thực nhận.`,
          'info',
          5000
        );
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      console.error('Lỗi nhận hàng:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi không xác định khi xác nhận nhận hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <PackageCheck size={22} />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <span>Kho Đến Xác Nhận Nhận Hàng</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {transfer.code}
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Kho nhận: <b>{transfer.destWarehouseName}</b> (Từ: {transfer.sourceWarehouseName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Banner thông tin xe vận chuyển */}
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-700">
              <Truck size={15} className="text-emerald-600" />
              <span>Xe vận chuyển: <b className="font-mono">{transfer.vehiclePlate || 'Chưa cập nhật'}</b></span>
            </div>
            <div className="text-gray-500">
              Tài xế: <b>{transfer.transporterName || 'Chưa rõ'}</b>
            </div>
            <div className="text-gray-500">
              Ngày xuất chuyển: <b>{transfer.transferDate}</b>
            </div>
          </div>

          {/* Bảng kiểm đếm hàng nhận */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Mặt hàng</th>
                  <th className="py-2.5 px-3 text-center w-28">Số lượng chuyển</th>
                  <th className="py-2.5 px-3 text-center w-36">Thực nhận tại kho</th>
                  <th className="py-2.5 px-3 text-center w-24">Chênh lệch</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Lý do chênh lệch (AC4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receiveLines.map((line) => {
                  const diff = line.transferQuantity - line.receivedQuantity;
                  const isDiff = diff !== 0;

                  return (
                    <tr key={line.lineId} className={isDiff ? 'bg-amber-50/50' : 'hover:bg-gray-50'}>
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{line.productName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{line.productSku}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-gray-700">
                          {line.transferQuantity} {line.unit}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={line.receivedQuantity}
                          onChange={(e) => handleUpdateQuantity(line.lineId, Number(e.target.value))}
                          className={`w-24 text-center font-black text-xs border rounded-lg p-1.5 focus:outline-none focus:ring-2 ${
                            isDiff
                              ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:ring-amber-500/20'
                              : 'border-gray-300 bg-white text-gray-900 focus:ring-emerald-500/20'
                          }`}
                        />
                      </td>

                      <td className="py-3 px-3 text-center">
                        {diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Đủ
                          </span>
                        ) : diff > 0 ? (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            Thiếu {diff} {line.unit}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Thừa {Math.abs(diff)} {line.unit}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isDiff ? (
                          <input
                            type="text"
                            placeholder="Nhập lý do chênh lệch (bắt buộc theo AC4)..."
                            value={line.discrepancyReason}
                            onChange={(e) => handleUpdateReason(line.lineId, e.target.value)}
                            className="w-full text-xs border border-amber-300 rounded-lg p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Khớp đúng 100%</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lý do giải trình chung khi có chênh lệch (AC4) */}
          {hasAnyDiscrepancy && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle size={15} className="text-amber-600" />
                <span>Giải trình chênh lệch kiểm nhận (Tiêu chí AC4):</span>
              </div>
              <textarea
                rows={2}
                placeholder="Nhập ghi chú / biên bản kiểm nhận hàng chênh lệch (vd: Hàng rơi vỡ trên đường, đơn vị vận chuyển làm thất lạc, nhà xe giao thiếu thùng...)"
                value={generalReason}
                onChange={(e) => setGeneralReason(e.target.value)}
                className="w-full text-xs border border-amber-300 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-[11px] text-amber-700 italic">
                * Bắt buộc có lý do giải trình để bộ phận Kế toán kho & Quản lý kiểm toán xử lý bù trừ.
              </p>
            </div>
          )}

          {/* Ghi chú cộng tồn (AC3) */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b>Quy tắc cộng tồn kho (AC3):</b> Sau khi bấm "Xác nhận nhận hàng", hệ thống sẽ chính thức cộng số lượng thực nhận vào tồn kho đích <b>[{transfer.destWarehouseName}]</b>.
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitReceive}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={15} />
            <span>{submitting ? 'Đang xác nhận...' : 'Xác nhận nhận hàng & Cộng tồn (AC3)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
