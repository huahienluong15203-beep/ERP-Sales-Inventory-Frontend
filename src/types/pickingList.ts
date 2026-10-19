/**
 * S6-03: Types for Order Picking List (Phiếu Soạn Hàng / Wave Picking)
 * Acceptance Criteria:
 * - AC1: Phiếu liệt kê dòng hàng kèm vị trí lưu, sắp xếp theo đường đi trong kho
 * - AC2: Gộp nhiều đơn thành một lượt soạn được
 * - AC3: Đánh dấu đã soạn từng dòng, ghi số lượng thực soạn
 * - AC4: Soạn thiếu bắt buộc nhập lý do
 * - AC5: Dùng được trên điện thoại vì thủ kho đi trong kho (UI Mobile có checkbox)
 */

export type PickingStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface AvailablePickingOrder {
  id: number;
  orderCode: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  deliveryAddress?: string;
  phone?: string;
}

export interface PickingOrderAllocation {
  orderId: number;
  orderCode: string;
  customerName: string;
  quantity: number;
}

export interface PickingListItem {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  baseUnit: string;
  locationCode: string; // Vị trí lưu kho (Zone-Rack-Shelf-Bin)
  locationName?: string; // Tên chi tiết vị trí (vd: Ô Chứa B1-01)
  zone?: string; // Khu vực (vd: Khu B)
  shelf?: string; // Giá/Kệ (vd: Kệ B1)
  routeSequence: number; // Thứ tự đường đi trong kho (1, 2, 3...)
  requiredQuantity: number;
  pickedQuantity: number;
  isCompleted: boolean;
  discrepancyReason?: string | null;
  allocations: PickingOrderAllocation[];
}

export interface PickingOrderSummary {
  id: number;
  code: string;
  customerName: string;
  totalAmount: number;
  status: string;
}

export interface PickingList {
  id: number;
  code: string;
  warehouseId: number;
  warehouseName: string;
  status: PickingStatus;
  pickerId?: number | null;
  pickerName?: string | null;
  orderCount: number;
  totalItems: number;
  completedItems: number;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PickingListItem[];
  orders: PickingOrderSummary[];
}

export interface PickingListPreviewResponse {
  warehouseId: number;
  warehouseName: string;
  orderCount: number;
  totalItems: number;
  items: PickingListItem[];
}

export interface PickingListCreateRequest {
  warehouseId: number;
  orderIds: number[];
  pickerId?: number | null;
  note?: string;
}

export interface PickingItemUpdateRequest {
  pickedQuantity: number;
  isCompleted: boolean;
  discrepancyReason?: string;
}

export interface PickingProgressUpdateRequest {
  items: {
    itemId: number;
    pickedQuantity: number;
    isCompleted: boolean;
    discrepancyReason?: string;
  }[];
  autoCompleteIfAllDone?: boolean;
}
