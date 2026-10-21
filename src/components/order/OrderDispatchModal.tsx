import React, { useState } from 'react';
import {
  X,
  Truck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import type { OrderBackendResponse, OrderDispatchRequest, OrderDispatchResponse } from '../../types/order';
import { dispatchOrder } from '../../services/orderService';
import { LotSelectorDropdown } from '../inventory/LotSelectorDropdown';

interface OrderDispatchModalProps {
  isOpen: boolean;
  order: OrderBackendResponse;
  onClose: () => void;
  onSuccess: (result: OrderDispatchResponse) => void;
}

interface LineDispatchState {
  lineId: number;
  dispatchedQuantity: number | string;
  shortageReason: string;
  selectedBatchNumber?: string;
  lotReason?: string;
}

export const OrderDispatchModal: React.FC<OrderDispatchModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess
}) => {
  // Khởi tạo số lượng thực xuất mặc định bằng đúng số lượng đặt của đơn
  const [lineStates, setLineStates] = useState<Record<number, LineDispatchState>>(() => {
    const init: Record<number, LineDispatchState> = {};
    (order.lines || []).forEach((line) => {
      if (line.id) {
        init[line.id] = {
          lineId: line.id,
          dispatchedQuantity: Number(line.quantity) || 0,
          shortageReason: ''
        };
      }
    });
    return init;
  });

  const [createBackorder, setCreateBackorder] = useState<boolean>(true);
  const [dispatchNote, setDispatchNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Tính xem có dòng nào bị xuất thiếu không
  const hasAnyShortage = (order.lines || []).some((line) => {
    if (!line.id) return false;
    const state = lineStates[line.id];
    const num = state ? (state.dispatchedQuantity === '' ? 0 : Number(state.dispatchedQuantity)) : 0;
    return num < Number(line.quantity);
  });

  const handleQuantityChange = (lineId: number, maxQty: number, val: string) => {
    if (val === '') {
      setLineStates((prev) => ({
        ...prev,
        [lineId]: {
          ...(prev[lineId] || { lineId, shortageReason: '' }),
          dispatchedQuantity: ''
        }
      }));
      return;
    }
    const num = parseFloat(val);
    const validNum = isNaN(num) ? 0 : Math.max(0, Math.min(num, maxQty));
    setLineStates((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] || { lineId, shortageReason: '' }),
        dispatchedQuantity: validNum
      }
    }));
  };

  const handleReasonChange = (lineId: number, reason: string) => {
    setLineStates((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] || { lineId, dispatchedQuantity: 0 }),
        shortageReason: reason
      }
    }));
  };

  const handleLotChange = (lineId: number, batchNumber: string, reason?: string) => {
    setLineStates((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] || { lineId, dispatchedQuantity: 0, shortageReason: '' }),
        selectedBatchNumber: batchNumber,
        lotReason: reason
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Kiểm tra hợp lệ các dòng xuất thiếu (bắt buộc phải có lý do)
    const linesPayload: Array<{
      lineId: number;
      dispatchedQuantity: number;
      shortageReason?: string;
      batchNumber?: string;
      lotChangeReason?: string;
    }> = [];
    let hasMissingReason = false;
    let totalDispatched = 0;

    for (const line of order.lines || []) {
      if (!line.id) continue;
      const state = lineStates[line.id];
      const dispatchedQty = state ? (state.dispatchedQuantity === '' ? 0 : Number(state.dispatchedQuantity)) : Number(line.quantity);
      totalDispatched += dispatchedQty;

      const orderedQty = Number(line.quantity);
      const chosenBatch = state?.selectedBatchNumber || line.batchNumber || undefined;
      const lotReason = state?.lotReason || line.lotChangeReason || undefined;

      if (dispatchedQty < orderedQty) {
        if (!state?.shortageReason?.trim() && !dispatchNote.trim()) {
          hasMissingReason = true;
          break;
        }
        linesPayload.push({
          lineId: line.id,
          dispatchedQuantity: dispatchedQty,
          shortageReason: state?.shortageReason?.trim() || dispatchNote.trim(),
          batchNumber: chosenBatch,
          lotChangeReason: lotReason
        });
      } else {
        // Xuất đủ
        linesPayload.push({
          lineId: line.id,
          dispatchedQuantity: dispatchedQty,
          batchNumber: chosenBatch,
          lotChangeReason: lotReason
        });
      }
    }

    if (totalDispatched === 0) {
      setError('Số lượng thực xuất của toàn bộ đơn không thể bằng 0. Nếu không thể xuất hàng, vui lòng hủy đơn.');
      return;
    }

    if (hasMissingReason) {
      setError('Vui lòng nhập lý do xuất thiếu cho các mặt hàng chưa giao đủ.');
      return;
    }

    try {
      setSubmitting(true);
      const request: OrderDispatchRequest = {
        lines: linesPayload,
        note: dispatchNote.trim() || undefined,
        createBackorder
      };

      const result = await dispatchOrder(order.id!, request);
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xác nhận xuất kho thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* 1. Header Phiếu Xuất */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Truck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Phiếu xác nhận xuất kho</h3>
                <span className="font-mono text-xs font-bold text-orange-700 bg-orange-100/70 border border-orange-200 px-2 py-0.5 rounded">
                  {order.code}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Kiểm đếm số lượng thực xuất, gợi ý lô FEFO và tự động xử lý hàng nợ nếu giao thiếu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Thông tin đơn hàng tóm tắt */}
        <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-200/80 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div>
            <span className="text-gray-400 block text-[11px]">Khách hàng / Đại lý:</span>
            <strong className="text-gray-900 truncate block">{order.customerName}</strong>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Điểm nhận hàng:</span>
            <span className="text-gray-800 font-medium truncate block">
              {order.deliveryAddress?.address || 'Địa chỉ đăng ký'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Ngày hẹn giao:</span>
            <span className="text-gray-800 font-medium">
              {order.desiredDeliveryDate || 'Giao tiêu chuẩn'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Trạng thái chuyển tiếp:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 size={11} />
              Đang soạn hàng &rarr; Đã xuất kho
            </span>
          </div>
        </div>

        {/* 3. Form danh sách dòng hàng & xuất thiếu */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Bảng danh sách sản phẩm */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Mặt hàng / SKU</th>
                    <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 w-24 text-right">Số đặt</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Gợi ý lô (FEFO)</th>
                    <th className="py-2.5 px-3 w-28 text-center">Số thực xuất</th>
                    <th className="py-2.5 px-3 w-20 text-center">Thiếu</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Lý do nếu thiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(order.lines || []).map((line, idx) => {
                    const lineId = line.id || idx;
                    const state = lineStates[lineId] || {
                      lineId,
                      dispatchedQuantity: Number(line.quantity),
                      shortageReason: ''
                    };
                    const orderedQty = Number(line.quantity);
                    const numericDispatched = state.dispatchedQuantity === '' ? 0 : Number(state.dispatchedQuantity);
                    const shortageQty = Math.max(0, orderedQty - numericDispatched);
                    const isShortage = shortageQty > 0;

                    return (
                      <tr
                        key={lineId}
                        className={`transition-colors ${
                          isShortage ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3 px-3 text-center text-gray-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Tên SP */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-gray-900">{line.productName}</div>
                          <div className="font-mono text-[11px] text-orange-700">{line.productSku}</div>
                        </td>

                        {/* ĐVT */}
                        <td className="py-3 px-3 text-center text-gray-700 whitespace-nowrap">
                          {line.unitName}
                        </td>

                        {/* Số đặt */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                          {line.quantity}
                        </td>

                        {/* Gợi ý lô FEFO */}
                        <td className="py-3 px-3">
                          <LotSelectorDropdown
                            productId={line.productId}
                            requiredQuantity={numericDispatched}
                            baseUnit={line.baseUnit}
                            selectedBatchNumber={state.selectedBatchNumber}
                            onChange={(batch, reason) => handleLotChange(lineId, batch, reason)}
                            disabled={submitting}
                          />
                        </td>

                        {/* Số thực xuất (Input) */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={orderedQty}
                            step="any"
                            value={state.dispatchedQuantity}
                            disabled={submitting}
                            onChange={(e) => handleQuantityChange(lineId, orderedQty, e.target.value)}
                            className={`w-20 px-2.5 py-1 text-center font-mono font-bold text-xs rounded-lg border transition ${
                              isShortage
                                ? 'bg-amber-100 text-amber-950 border-amber-400 focus:ring-amber-500'
                                : 'bg-white text-gray-900 border-gray-300 focus:ring-orange-500/20 focus:border-orange-500'
                            }`}
                          />
                        </td>

                        {/* Số lượng thiếu */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isShortage ? (
                            <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              -{shortageQty}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Đủ</span>
                          )}
                        </td>

                        {/* Lý do xuất thiếu */}
                        <td className="py-3 px-3">
                          {isShortage ? (
                            <input
                              type="text"
                              value={state.shortageReason}
                              disabled={submitting}
                              required={!dispatchNote.trim()}
                              onChange={(e) => handleReasonChange(lineId, e.target.value)}
                              placeholder="Nhập lý do thiếu (vd: Kho hết hàng)..."
                              className="w-full px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                          ) : (
                            <span className="text-gray-400 text-[11px] italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Tùy chọn xử lý phần nợ hàng (Luồng Giao Thiếu) */}
          {hasAnyShortage && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-xs">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>Phát hiện đơn hàng có xuất thiếu so với số lượng đặt</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed pl-6">
                Bạn có thể lựa chọn tự động tách các mặt hàng còn thiếu thành một <strong>Đơn nợ hàng mới</strong> để theo dõi và xuất giao bổ sung ở lượt tiếp theo.
              </p>

              <div className="pl-6 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createBackorder}
                    disabled={submitting}
                    onChange={(e) => setCreateBackorder(e.target.checked)}
                    className="rounded border-amber-400 text-orange-600 focus:ring-orange-500 w-4 h-4 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      Tách phần thiếu thành đơn nợ hàng mới (Backorder)
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Đơn nợ hàng sẽ xuất hiện riêng trong danh sách đơn để kho xử lý ở đợt giao tiếp theo. Nếu bỏ chọn, phần thiếu sẽ bị hủy và tiền đơn hàng giảm theo số thực xuất.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* 5. Ghi chú xuất kho */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <FileText size={13} className="text-gray-400" />
              <span>Ghi chú xuất kho & Biên bản bàn giao xe</span>
            </label>
            <textarea
              rows={2}
              value={dispatchNote}
              disabled={submitting}
              onChange={(e) => setDispatchNote(e.target.value)}
              placeholder="VD: Xe tải biển số 29C-123.45 tài xế Nguyễn Văn A nhận đủ hàng..."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </form>

        {/* 6. Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-gray-400" />
            <span>Lưu ý: Phiếu xuất sau khi xác nhận sẽ được khóa và không thể chỉnh sửa.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang xử lý xuất kho...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Xác nhận xuất kho</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
