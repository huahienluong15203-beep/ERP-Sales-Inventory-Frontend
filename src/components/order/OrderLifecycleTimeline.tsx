import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  Archive,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import type { OrderApprovalHistoryResponse } from '../../types/order';

interface OrderLifecycleTimelineProps {
  status: string;
  cancelReason?: string;
  approvalHistory?: OrderApprovalHistoryResponse[];
  createdAt?: string;
  desiredDeliveryDate?: string;
  className?: string;
}

interface StepConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

// 7 nấc vòng đời đơn hàng theo AC1 của S4-06
const LIFECYCLE_STEPS: StepConfig[] = [
  {
    key: 'DRAFT',
    label: 'Nháp',
    description: 'NVKD đang lên đơn',
    icon: FileText
  },
  {
    key: 'PENDING_APPROVAL',
    label: 'Chờ duyệt',
    description: 'Chờ Quản lý duyệt',
    icon: Clock
  },
  {
    key: 'APPROVED',
    label: 'Đã duyệt',
    description: 'Giữ chỗ tồn kho',
    icon: CheckCircle2
  },
  {
    key: 'PICKING',
    label: 'Đang soạn hàng',
    description: 'Kho lấy hàng theo FEFO',
    icon: Package
  },
  {
    key: 'DISPATCHED',
    label: 'Đã xuất',
    description: 'Hàng đã rời kho',
    icon: Truck
  },
  {
    key: 'DELIVERED',
    label: 'Đã giao',
    description: 'Đại lý đã nhận hàng',
    icon: CheckCheck
  },
  {
    key: 'CLOSED',
    label: 'Đóng',
    description: 'Hoàn tất đơn hàng',
    icon: Archive
  }
];

// Mapping các mã trạng thái thực tế trong hệ thống sang vị trí nấc
function getStepIndex(status: string): number {
  switch (status?.toUpperCase()) {
    case 'DRAFT':
      return 0;
    case 'PENDING_APPROVAL':
      return 1;
    case 'APPROVED':
      return 2;
    case 'PICKING':
    case 'PREPARING':
    case 'PROCESSING':
      return 3;
    case 'DISPATCHED':
    case 'EXPORTED':
    case 'SHIPPED':
      return 4;
    case 'DELIVERED':
      return 5;
    case 'CLOSED':
    case 'COMPLETED':
      return 6;
    default:
      return 0;
  }
}

export const OrderLifecycleTimeline: React.FC<OrderLifecycleTimelineProps> = ({
  status,
  cancelReason,
  approvalHistory = [],
  className = ''
}) => {
  const isCancelled = status === 'CANCELLED';
  const isRejected = status === 'REJECTED';
  const isTerminated = isCancelled || isRejected;

  const currentStepIdx = getStepIndex(status);

  // Tìm thông tin thời gian bước đã qua từ approvalHistory
  const findStepTime = (stepKey: string): string | null => {
    if (stepKey === 'DRAFT') {
      const draftEvent = approvalHistory.find((h) => h.action === 'CREATE_DRAFT' || h.fromStatus === 'DRAFT');
      if (draftEvent?.createdAt) return new Date(draftEvent.createdAt).toLocaleDateString('vi-VN');
    }
    if (stepKey === 'PENDING_APPROVAL') {
      const submitEvent = approvalHistory.find((h) => h.toStatus === 'PENDING_APPROVAL' || h.action === 'SUBMIT');
      if (submitEvent?.createdAt) return new Date(submitEvent.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    if (stepKey === 'APPROVED') {
      const approveEvent = approvalHistory.find((h) => h.toStatus === 'APPROVED' || h.action === 'APPROVE');
      if (approveEvent?.createdAt) return new Date(approveEvent.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return null;
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30 border border-gray-200/90 shadow-2xs space-y-3.5 ${className}`}>
      {/* Tiêu đề & Thông báo nấc hiện tại */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F85606] animate-pulse"></div>
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Timeline Hành Trình Đơn Hàng (S4-06)
          </h4>
        </div>

        <div>
          {isCancelled ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              <XCircle size={13} />
              <span>Nhánh Hủy Đơn</span>
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              <XCircle size={13} />
              <span>Bị Quản Lý Từ Chối</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">
              <span>Đang ở khâu: </span>
              <strong>{LIFECYCLE_STEPS[currentStepIdx]?.label || status}</strong>
            </span>
          )}
        </div>
      </div>

      {/* CẢNH BÁO NẾU ĐƠN BỊ HỦY HOẶC TỪ CHỐI */}
      {isCancelled && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-rose-950">
            <XCircle size={15} className="text-rose-600 shrink-0" />
            <span>Đơn hàng đã bị hủy bỏ (S4-06 AC2)</span>
          </div>
          {cancelReason && (
            <p className="text-[11px] text-rose-800 pl-5">
              Lý do hủy: <strong>&ldquo;{cancelReason}&rdquo;</strong>
            </p>
          )}
          <p className="text-[10px] text-rose-700 italic pl-5">
            * Tồn kho giữ chỗ của đơn này đã được tự động hoàn trả (nhả tồn) về kho khả dụng theo nguyên tắc S4-06.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-rose-950">
            <XCircle size={15} className="text-rose-600 shrink-0" />
            <span>Đơn hàng bị Quản lý kinh doanh từ chối duyệt</span>
          </div>
          <p className="text-[10px] text-rose-700 italic pl-5">
            * Không đủ điều kiện phê duyệt vượt hạn mức hoặc bán dưới giá sàn. Đơn dừng tiến trình.
          </p>
        </div>
      )}

      {/* CẢNH BÁO NẾU ĐÃ XUẤT KHO THÌ KHÔNG ĐƯỢC HỦY (S4-06 AC3) */}
      {currentStepIdx >= 4 && !isTerminated && (
        <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
          <AlertTriangle size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Quy chuẩn S4-06 AC3:</strong> Đơn hàng đã xuất kho (khâu <em>Đã xuất</em> trở đi) thì <strong>nghiêm cấm hủy đơn</strong>.
            Nếu khách không nhận hàng, bắt buộc phải làm thủ tục <strong>Trả hàng & Điều chỉnh kho (Phân hệ EP-08)</strong>.
          </div>
        </div>
      )}

      {/* THANH TIMELINE STEPPER (Hỗ trợ cuộn ngang trên màn hình di động 360px) */}
      <div className="overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <div className="min-w-[680px] px-2 flex items-center justify-between relative">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = !isTerminated && idx < currentStepIdx;
            const isCurrent = !isTerminated && idx === currentStepIdx;

            const timeStr = findStepTime(step.key);

            return (
              <React.Fragment key={step.key}>
                {/* Node của nấc */}
                <div className="flex flex-col items-center text-center relative z-10 w-24 shrink-0">
                  {/* Circle Icon */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                        : isCurrent
                        ? 'bg-[#F85606] text-white ring-4 ring-orange-200 shadow-md shadow-orange-500/30 scale-110'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    <Icon size={16} />
                  </div>

                  {/* Nhãn nấc */}
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

                  {/* Mô tả khâu */}
                  <span className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-2 px-1">
                    {step.description}
                  </span>

                  {/* Thời gian nếu có */}
                  {timeStr && (
                    <span className="text-[9px] text-emerald-700 font-mono mt-0.5">
                      {timeStr}
                    </span>
                  )}

                  {/* Badge "Hiện tại" */}
                  {isCurrent && (
                    <span className="mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-100 text-[#F85606] border border-orange-200">
                      Hiện tại
                    </span>
                  )}
                </div>

                {/* Đường nối giữa các nấc */}
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-1 rounded-full transition-all ${
                      !isTerminated && idx < currentStepIdx
                        ? 'bg-emerald-500'
                        : !isTerminated && idx === currentStepIdx
                        ? 'bg-gradient-to-r from-[#F85606] to-gray-200'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
