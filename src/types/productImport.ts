/**
 * S2-08 / SCRUM-44 / SCRUM-77: Định nghĩa kiểu dữ liệu Nhập danh mục sản phẩm hàng loạt từ Excel
 * Phân hệ: EP-02: Sản phẩm & Bảng giá
 *
 * Tiêu chí nghiệp vụ:
 * 1. Tải được tệp mẫu, xem trước và báo lỗi theo từng dòng.
 * 2. SKU đã tồn tại thì cập nhật thay vì tạo mới, có đánh dấu rõ trong bản xem trước.
 * 3. Hỗ trợ import mượt mà danh mục lớn lên tới 5.000 SKU.
 */

import type { Product, ProductStatus } from './product';

export type ImportRowAction = 'CREATE' | 'UPDATE' | 'ERROR';

/**
 * DTO đại diện cho 1 dòng dữ liệu từ API Backend (ProductImportRowDto)
 */
export interface ProductImportRowDto {
  rowNumber: number;
  sku: string;
  name: string;
  category?: string;
  baseUnit: string;
  packaging?: string;
  costPrice?: number;
  barcode?: string;
  status?: string;
  description?: string;
  action: 'CREATE' | 'UPDATE';
  isUpdate?: boolean;
  update?: boolean;
  valid: boolean;
  errors: string[];
}

/**
 * Phản hồi xem trước từ Backend API (ProductImportPreviewResponse)
 */
export interface ProductImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createCount: number;
  updateCount: number;
  rows: ProductImportRowDto[];
}

/**
 * Báo cáo tổng kết kết quả thực thi từ Backend API (ProductImportSummaryResponse)
 */
export interface ProductImportSummaryResponse {
  totalRows: number;
  successCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  importedAt: string;
  message: string;
  errorRows: ProductImportRowDto[];
}

/**
 * Cấu trúc một dòng dữ liệu hiển thị trên bảng Preview Modal
 */
export interface ProductImportRow {
  rowNumber: number;            // Số thứ tự dòng trong file Excel (1, 2, 3...)
  sku: string;                  // Mã SKU
  name: string;                 // Tên sản phẩm
  category: string;             // Nhóm hàng
  baseUnit: string;             // Đơn vị tính cơ sở (Lon, Chai, Thùng...)
  packagingSpec: string;        // Quy cách đóng gói (vd: 24 lon / thùng)
  costPrice: number;            // Giá vốn (VND)
  barcode?: string;             // Mã vạch
  status: ProductStatus;        // Trạng thái ('ACTIVE' | 'INACTIVE')
  description?: string;         // Mô tả / ghi chú
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
  /** Các dòng lỗi bị bỏ qua (để người dùng sửa file và nhập lại) */
  errorRows?: Array<{ rowNumber: number; sku: string; name: string; errors: string[] }>;
}
