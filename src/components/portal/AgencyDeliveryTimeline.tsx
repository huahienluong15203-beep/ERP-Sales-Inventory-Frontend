import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  CheckCheck,
  AlertTriangle,
  MapPin,
  XCircle
} from 'lucide-react';
import type { OrderBackendResponse, OrderApprovalHistoryResponse } from '../../types/order';

interface AgencyDeliveryTimelineProps {
  order: OrderBackendResponse;
  approvalHistory?: OrderApprovalHistoryResponse[];
  className?: string;
  hideStepper?: boolean;
}

interface TimelineStep {
  key: string;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  time?: string | null;
  actor?: string | null;
  note?: string | null;
}

export const AgencyDeliveryTimeline: React.FC<AgencyDeliveryTimelineProps> = ({
  order,
  approvalHistory = [],
  className = '',
  hideStepper = false
}) => {
  // Mapping chỉ số bước hiện tại của đơn hàng đối với Đại lý (1 -> 5)
  // 1: Đã duyệt, 2: Đang soạn, 3: Đã xuất, 4: Đang giao, 5: Đã giao
  const currentStep = useMemo(() => {
    switch (order.status?.toUpperCase()) {
      case 'APPROVED':
        return 1;
      case 'PICKING':
      case 'PREPARING':
        return 2;
      case 'DISPATCHED':
        return 3;
      case 'IN_TRANSIT':
      case 'SHIPPING':
        return 4;
      case 'DELIVERED':
      case 'CLOSED':
      case 'COMPLETED':
        return 5;
      default:
        return 0; // Chưa duyệt (DRAFT / PENDING_APPROVAL)
    }
  }, [order.status]);

  // Trích xuất mốc thời gian và người xử lý cho từng bước
  const stepDetails = useMemo(() => {
    const formatTime = (iso?: string | null) => {
      if (!iso) return null;
      try {
        const d = new Date(iso);
        return d.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return iso;
      }
    };

    // 1. Mốc Đã duyệt
    const approveEvent = approvalHistory.find((h) => h.toStatus === 'APPROVED' || h.action === 'APPROVE');
    const approveTime = formatTime(order.approvedAt || approveEvent?.createdAt);
    const approveActor = order.approvedByUsername || approveEvent?.actorFullName || approveEvent?.actorUsername;

    // 2. Mốc Đang soạn hàng
    const pickingEvent = approvalHistory.find((h) => h.toStatus === 'PICKING' || h.action === 'PICKING');
    const pickingTime = formatTime(pickingEvent?.createdAt);

    // 3. Mốc Đã xuất kho
    const dispatchTime = formatTime(order.fulfillment?.dispatchedAt);
    const dispatchActor = order.fulfillment?.dispatchedByUsername;
    const dispatchNote = order.fulfillment?.dispatchNote;

    // 4. Mốc Đang giao hàng
    // Đang giao sau khi đã xuất kho
    const shippingTime = dispatchTime;

    // 5. Mốc Đã giao hàng
    const deliverTime = formatTime(order.fulfillment?.deliveredAt || order.fulfillment?.deliveryConfirmedAt);
    const receiver = order.fulfillment?.receiverName;

    return {
      approveTime,
      approveActor,
      pickingTime,
      dispatchTime,
      dispatchActor,
      dispatchNote,
      shippingTime,
      deliverTime,
      receiver
    };
  }, [order, approvalHistory]);

  const steps: TimelineStep[] = [
    {
      key: 'APPROVED',
      label: 'Đã duyệt đơn',
      subLabel: 'Kho giữ chỗ hàng',
      icon: CheckCircle2,
      time: stepDetails.approveTime,
      actor: stepDetails.approveActor ? `Người duyệt: ${stepDetails.approveActor}` : undefined
    },
    {
      key: 'PICKING',
      label: 'Đang soạn hàng',
      subLabel: 'Nhân viên lấy hàng tại kho',
      icon: Package,
      time: stepDetails.pickingTime
    },
    {
      key: 'DISPATCHED',
      label: 'Đã xuất kho',
      subLabel: 'Bàn giao xe vận chuyển',
      icon: Truck,
      time: stepDetails.dispatchTime,
      actor: stepDetails.dispatchActor ? `Xuất bởi: ${stepDetails.dispatchActor}` : undefined,
      note: stepDetails.dispatchNote
    },
    {
      key: 'SHIPPING',
      label: 'Đang giao hàng',
      subLabel: 'Xe đang trên đường đến đại lý',
      icon: MapPin,
      time: currentStep >= 4 ? stepDetails.shippingTime : null
    },
    {
      key: 'DELIVERED',
      label: 'Đã giao hàng',
      subLabel: 'Đại lý ký nhận biên bản',
      icon: CheckCheck,
      time: stepDetails.deliverTime,
      actor: stepDetails.receiver ? `Người nhận: ${stepDetails.receiver}` : undefined
    }
  ];

  return (
    <div className={`p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-5 ${className}`}>
      {/* Header trạng thái */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold">
            <Truck size={17} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Trạng thái & Tiến độ giao hàng
            </h4>
            <p className="text-xs text-gray-500">
              Theo dõi lộ trình giao hàng trực tuyến theo thời gian thực
            </p>
          </div>
        </div>

        {/* Badge nấc hiện tại */}
        <div>
          {order.status === 'DELIVERY_FAILED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <AlertTriangle size={14} />
              <span>Giao hàng không thành công (Đã quay về kho)</span>
            </span>
          ) : order.status === 'CANCELLED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <XCircle size={14} />
              <span>Đơn hàng đã hủy</span>
            </span>
          ) : currentStep === 5 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCheck size={14} />
              <span>Giao hàng hoàn tất</span>
            </span>
          ) : currentStep === 4 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
              <MapPin size={14} />
              <span>Xe đang trên đường giao</span>
            </span>
          ) : currentStep === 3 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
              <Truck size={14} />
              <span>Đã xuất kho</span>
            </span>
          ) : currentStep === 2 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
              <Package size={14} />
              <span>Đang soạn hàng tại kho</span>
            </span>
          ) : currentStep === 1 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Clock size={14} />
              <span>Đã duyệt — Chờ soạn kho</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
              <span>Đang chờ xử lý</span>
            </span>
          )}
        </div>
      </div>

      {/* THANH TIMELINE 5 MỐC THỜI GIAN (AC 1) - Ẩn nếu hideStepper = true để tránh trùng lặp */}
      {!hideStepper && (
      <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
        <div className="min-w-[620px] px-2 flex items-start justify-between relative">
          {/* Thanh nối ngầm */}
          <div className="absolute top-4.5 left-8 right-8 h-1 bg-gray-100 z-0" />

          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center text-center relative z-10 w-28 shrink-0">
                {/* Vòng tròn biểu tượng */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                      : isCurrent
                      ? 'bg-[#F85606] text-white ring-4 ring-orange-200 shadow-md shadow-orange-500/30 scale-110'
                      : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}
                >
                  <Icon size={16} />
                </div>

                {/* Tiêu đề nấc */}
                <span
                  className={`mt-2 text-xs font-bold leading-tight ${
                    isCurrent
                      ? 'text-[#F85606]'
                      : isCompleted
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>

                {/* Mô tả phụ */}
                <span className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-1">
                  {step.subLabel}
                </span>

                {/* MỐC THỜI GIAN (HIỂN THỊ RÕ RÀNG AC 1) */}
                {step.time ? (
                  <span className="mt-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                    {step.time}
                  </span>
                ) : isCurrent ? (
                  <span className="mt-1 text-[10px] font-bold text-orange-600 animate-pulse">
                    Đang thực hiện
                  </span>
                ) : (
                  <span className="mt-1 text-[10px] text-gray-300">
                    Chưa tới
                  </span>
                )}

                {/* Người phụ trách / Người nhận nếu có */}
                {step.actor && (
                  <span className="text-[9px] text-gray-500 mt-0.5 max-w-[110px] truncate" title={step.actor}>
                    {step.actor}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* THÔNG TIN BIÊN BẢN GIAO HÀNG / NGƯỜI NHẬN NẾU ĐÃ GIAO */}
      {order.fulfillment && (order.fulfillment.receiverName || order.fulfillment.dispatchedByUsername) && (
        <div className="p-3.5 rounded-xl bg-orange-50/40 border border-orange-200/80 text-xs text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {order.fulfillment.dispatchedByUsername && (
            <div>
              <span className="text-gray-500 block text-[11px]">Nhân viên xuất kho phụ trách:</span>
              <strong className="text-gray-900">{order.fulfillment.dispatchedByUsername}</strong>
              {order.fulfillment.dispatchNote && (
                <p className="text-[11px] text-gray-600 mt-0.5 italic">
                  &ldquo;{order.fulfillment.dispatchNote}&rdquo;
                </p>
              )}
            </div>
          )}

          {order.fulfillment.receiverName && (
            <div>
              <span className="text-gray-500 block text-[11px]">Người đại diện ký nhận hàng:</span>
              <strong className="text-gray-900">{order.fulfillment.receiverName}</strong>
              {order.fulfillment.deliveredAt && (
                <span className="text-gray-500 text-[11px] block mt-0.5">
                  Thời điểm ký nhận: {stepDetails.deliverTime}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* BẢNG THEO DÕI SỐ LƯỢNG THỰC GIAO TỪNG DÒNG HÀNG (AC 2) */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Package size={14} className="text-orange-500" />
            <span>Chi tiết số lượng thực giao từng mặt hàng</span>
          </h5>
          {order.hasShortage && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertTriangle size={12} />
              Đơn hàng có mặt hàng giao thiếu
            </span>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 w-24 text-right">Số lượng đặt</th>
                  <th className="py-2.5 px-3 w-28 text-right">Số thực giao</th>
                  <th className="py-2.5 px-3 w-28 text-center">Tình trạng</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Lý do nếu thiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(order.lines || []).map((line, idx) => {
                  const orderedQty = Number(line.quantity) || 0;
                  const deliveredQty =
                    line.deliveredQuantity !== undefined && line.deliveredQuantity !== null
                      ? Number(line.deliveredQuantity)
                      : currentStep >= 3
                      ? orderedQty // Nếu đã xuất mà chưa ghi nhận số riêng thì coi như theo số xuất
                      : null;

                  const shortageQty =
                    line.shortageQuantity !== undefined && Number(line.shortageQuantity) > 0
                      ? Number(line.shortageQuantity)
                      : deliveredQty !== null && deliveredQty < orderedQty
                      ? orderedQty - deliveredQty
                      : 0;

                  const isShortage = shortageQty > 0;

                  return (
                    <tr
                      key={line.id || idx}
                      className={`hover:bg-orange-50/20 transition-colors ${
                        isShortage ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-gray-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        <div>{line.productName}</div>
                        <div className="font-mono text-[10px] text-orange-700">{line.productSku}</div>
                      </td>

                      <td className="py-2.5 px-3 text-center text-gray-600">
                        {line.unitName}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                        {orderedQty}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {deliveredQty !== null ? (
                          <span className={isShortage ? 'text-amber-800' : 'text-emerald-700'}>
                            {deliveredQty}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic font-normal">Chờ xuất</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isShortage ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle size={11} className="text-amber-600" />
                            <span>Thiếu {shortageQty}</span>
                          </span>
                        ) : deliveredQty !== null ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Giao đủ</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">Chờ xuất kho</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-gray-600 text-[11px]">
                        {line.shortageReason ? (
                          <span className="text-amber-900 italic font-medium">
                            {line.shortageReason}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
