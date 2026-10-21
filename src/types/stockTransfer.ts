/**
 * S5-07: Kiểu dữ liệu Phiếu chuyển kho nội bộ (Stock Transfer)
 * Acceptance Criteria:
 * - AC1: Chọn kho đi, kho đến, danh sách hàng và số lượng
 * - AC2: Hàng đang chuyển được ghi nhận là đang trên đường, chưa cộng vào kho đến
 * - AC3: Kho đến xác nhận nhận đủ thì tồn mới được cộng
 * - AC4: Chênh lệch khi nhận phải nhập lý do
 */

export type StockTransferStatus =
  | 'DRAFT'                // Phiếu nháp (chưa xuất khỏi kho đi)
  | 'IN_TRANSIT'            // Đang đi đường (Đã trừ kho đi, CHƯA cộng kho đến) - AC2
  | 'COMPLETED'             // Đã nhận đủ (Kho đến đã nhận đủ, tồn đã cộng) - AC3
  | 'DISCREPANCY_RESOLVED'  // Đã nhận có chênh lệch và đã ghi nhận lý do - AC4
  | 'CANCELLED';            // Đã hủy

export interface StockTransferLine {
  id: string;
  productId: number;
  productSku: string;
  productName: string;
  category?: string;
  unit: string;
  sourceAvailableStock: number; // Tồn khả dụng tại kho đi để kiểm tra
  transferQuantity: number;     // Số lượng điều chuyển xuất đi
  receivedQuantity?: number;    // Số lượng thực tế kho đến nhận
  differenceQuantity?: number;  // Chênh lệch (transfer - received)
  discrepancyReason?: string;   // Lý do chênh lệch cho từng dòng (AC4)
  batchNumber?: string;
  expiredDate?: string;
}

export interface StockTransfer {
  id: string;
  code: string;                 // Mã phiếu vd: TRF-202610-001
  sourceWarehouseCode: string;  // Kho đi (AC1)
  sourceWarehouseName: string;
  destWarehouseCode: string;    // Kho đến (AC1)
  destWarehouseName: string;
  transferDate: string;         // Ngày điều chuyển
  expectedReceiveDate?: string; // Ngày dự kiến đến
  status: StockTransferStatus;
  lines: StockTransferLine[];
  vehiclePlate?: string;        // Biển số xe vận chuyển
  transporterName?: string;     // Tài xế / Đơn vị vận chuyển
  note?: string;                // Ghi chú chung
  discrepancyGeneralReason?: string; // Lý do giải trình chung khi nhận chênh lệch (AC4)
  createdBy: string;
  dispatchedAt?: string;        // Thời gian bắt đầu đi đường
  receivedAt?: string;          // Thời gian kho đến hoàn tất nhận
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockTransferPayload {
  sourceWarehouseCode: string;
  destWarehouseCode: string;
  transferDate: string;
  expectedReceiveDate?: string;
  vehiclePlate?: string;
  transporterName?: string;
  note?: string;
  status?: 'DRAFT' | 'IN_TRANSIT';
  lines: Array<{
    productId: number;
    productSku: string;
    productName: string;
    category?: string;
    unit: string;
    sourceAvailableStock: number;
    transferQuantity: number;
    batchNumber?: string;
    expiredDate?: string;
  }>;
}

export interface ReceiveTransferPayload {
  transferId: string;
  receivedLines: Array<{
    lineId: string;
    receivedQuantity: number;
    discrepancyReason?: string;
  }>;
  generalReason?: string;
}
