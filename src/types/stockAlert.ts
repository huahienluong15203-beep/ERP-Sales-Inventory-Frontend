/**
 * S5-09: Kiểu dữ liệu Cảnh báo tồn tối thiểu theo SKU và theo kho
 * Acceptance Criteria:
 * - AC1: Khai báo tồn tối thiểu theo SKU và theo kho
 * - AC2: Hàng dưới ngưỡng hiển thị nổi bật trong sổ tồn và trên dashboard kho
 */

export type StockAlertSeverity = 'CRITICAL' | 'WARNING' | 'SAFE';

export interface MinStockThresholdConfig {
  id: string;
  productId: number;
  productSku: string;
  productName: string;
  category: string;
  unit: string;
  warehouseCode: string;
  warehouseName: string;
  minThreshold: number;          // Ngưỡng tồn tối thiểu khai báo (AC1)
  currentStock: number;          // Tồn kho thực tế hiện tại
  availableStock: number;        // Tồn khả dụng
  isBelowThreshold: boolean;     // Cờ báo hiệu dưới ngưỡng (AC2)
  deficitQuantity: number;       // Số lượng thiếu hụt (minThreshold - currentStock)
  severity: StockAlertSeverity;  // CRITICAL: tồn = 0 hoặc < 50% min; WARNING: < min; SAFE: >= min
  suggestedReorderQuantity: number; // Số lượng đề xuất nhập thêm
  supplierCode?: string;
  supplierName?: string;
  lastRestockedDate?: string;
  updatedAt: string;
}

export interface UpdateMinThresholdPayload {
  productSku: string;
  warehouseCode: string;
  minThreshold: number;
}
