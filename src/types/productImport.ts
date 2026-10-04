/**
 * S2-08 / SCRUM-44 / SCRUM-77: Định nghĩa kiểu dữ liệu Nhập danh mục sản phẩm hàng loạt từ Excel
 * Phân hệ: EP-02: Sản phẩm & Bảng giá
 *
 * Tiêu chí nghiệp vụ:
 * 1. Tải được tệp mẫu, xem trước và báo lỗi theo từng dòng.
 * 2. SKU đã tồn tại thì cập nhật thay vì tạo mới, có đánh dấu rõ trong bản xem trước.
 */

import type { Product, ProductStatus } from './product';

export type ImportRowAction = 'CREATE' | 'UPDATE' | 'ERROR';

/**
 * Cấu trúc một dòng dữ liệu phân tích từ file Excel
 */
export interface ProductImportRow {
  rowNumber: number;            // Số thứ tự dòng trong file Excel (1, 2, 3...)
  sku: string;                  // Mã SKU
  name: string;                 // Tên sản phẩm
  category: string;             // Nhóm hàng
  baseUnit: string;             // Đơn vị tính cơ sở (Lon, Chai, Thùng...)
  packagingSpec: string;        // Quy cách đóng gói (vd: 24 lon / thùng)
  costPrice: number;            // Giá vốn (VND)
  status: ProductStatus;        // Trạng thái ('ACTIVE' | 'INACTIVE')
  action: ImportRowAction;      // 'CREATE' (Mã mới) | 'UPDATE' (Mã đã tồn tại) | 'ERROR' (Lỗi)
  isValid: boolean;             // Dòng hợp lệ để import
  errors: string[];             // Danh sách các lỗi nếu có
  existingProduct?: Product;    // Sản phẩm hiện có trên hệ thống nếu là UPDATE
  changedFields?: string[];     // Danh sách các trường có thay đổi so với sản phẩm cũ
}

/**
 * Tổng kết kết quả phân tích file Excel trước khi bấm Xác nhận nhập
 */
export interface ImportAnalysisSummary {
  fileName: string;
  fileSize: number;
  totalRows: number;
  validCount: number;
  createCount: number;
  updateCount: number;
  errorCount: number;
  rows: ProductImportRow[];
}

/**
 * Kết quả sau khi thực hiện nhập dữ liệu vào hệ thống
 */
export interface ImportExecutionResult {
  success: boolean;
  message: string;
  totalImported: number;
  createdCount: number;
  updatedCount: number;
  skippedErrorCount: number;
  errors?: { rowNumber: number; sku: string; error: string }[];
}

/**
 * Tùy chọn khi thực hiện import
 */
export interface ImportExecutionOptions {
  skipErrors: boolean;          // Bỏ qua các dòng lỗi và vẫn tiếp tục nhập các dòng hợp lệ
  overwriteExisting: boolean;   // Cho phép cập nhật sản phẩm nếu SKU đã tồn tại
}
