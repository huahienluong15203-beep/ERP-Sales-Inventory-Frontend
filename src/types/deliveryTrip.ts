/**
 * S6-06: Types for Delivery Route / Delivery Trip (Phân Tuyến Giao Hàng)
 * Acceptance Criteria:
 * - AC1: Gom nhiều phiếu xuất vào một chuyến giao theo khu vực
 * - AC2: Gán tài xế và phương tiện cho chuyến
 * - AC3: In danh sách điểm giao của chuyến kèm địa chỉ và số điện thoại người nhận
 */

export type DeliveryTripStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface DeliveryTripStop {
  orderId: number;
  orderCode: string;
  customerId?: number | null;
  customerCode?: string | null;
  customerName: string;
  deliveryAddress: string;
  receiverName?: string | null;
  receiverPhone?: string | null;
  district?: string | null;
  province?: string | null;
  status: string; // DISPATCHED, DELIVERED, DELIVERY_FAILED, etc.
  totalAmount: number;
  valueOnRoad?: number;
  deliveredAt?: string | null;
  deliveryFailedReason?: string | null;
  stockReturned?: boolean;
  stopSequence?: number;
}

export interface DeliveryTrip {
  id: number;
  code: string;
  warehouseId?: number | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  vehiclePlate?: string | null;
  driverName: string;
  driverPhone?: string | null;
  status: DeliveryTripStatus;
  departedAt?: string | null;
  expectedReturnAt: string;
  completedAt?: string | null;
  totalStops: number;
  deliveredStops: number;
  failedStops: number;
  remainingStops: number;
  totalValue?: number;
  valueOnRoad: number;
  overdue: boolean;
  overdueMinutes: number;
  note?: string | null;
  stops?: DeliveryTripStop[];
}

export interface InTransitSummary {
  runningTrips: number;
  overdueTrips: number;
  ordersOnRoad: number;
  valueOnRoad: number;
  unassignedDispatchedOrders: number;
  unassignedValue: number;
}

export interface DeliveryTripCreateRequest {
  warehouseId?: number;
  orderIds: number[];
  vehiclePlate?: string;
  driverName: string;
  driverPhone?: string;
  expectedReturnAt: string;
  note?: string;
}

export interface DeliveryTripCompleteRequest {
  note?: string;
}
