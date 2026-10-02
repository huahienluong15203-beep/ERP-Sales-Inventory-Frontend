/**
 * Định nghĩa kiểu dữ liệu cho Phân hệ Quản lý Sản phẩm, SKU & Đơn vị tính (EP-02)
 * Đáp ứng các User Stories:
 * - S2-05: Khai báo SKU, danh mục sản phẩm, bảo mật giá vốn, chống xoá khi có giao dịch
 * - S2-07: Bảng cài đặt quy đổi đơn vị (Base Unit 1 cấp trực tiếp, Barcode riêng, giá bán theo ĐVT)
 * - S2-08: Import danh mục sản phẩm hàng loạt từ Excel với lưới dữ liệu báo lỗi từng dòng
 */

export interface UnitConversion {
  id: string;
  unitName: string;          // Tên đơn vị tính (Lon, Lốc, Thùng, Két, Pallet...)
  conversionFactor: number;  // Hệ số quy đổi về ĐVT cơ sở (Lon = 1, Thùng = 24...)
  barcode: string;           // Mã vạch / GTIN riêng biệt cho từng ĐVT (quét POS / Kho)
  isBaseUnit: boolean;       // Là đơn vị tính cơ sở nhỏ nhất
  suggestedPrice: number;    // Giá bán đề xuất (= Giá cơ sở * Hệ số)
  sellingPrice: number;      // Giá bán thực tế (người dùng tự điều chỉnh theo chính sách sỉ)
  costPrice?: number;        // Giá vốn theo ĐVT (chỉ Sales Manager & Admin xem được)
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface ProductItem {
  id: string;
  sku: string;               // Mã SKU duy nhất toàn hệ thống
  name: string;              // Tên sản phẩm
  category: string;          // Nhóm ngành hàng
  baseUnit: string;          // Đơn vị tính cơ sở (Base Unit: Lon, Chai, Gói...)
  packagingSpec: string;     // Quy cách đóng gói (vd: "24 lon / thùng")
  costPrice: number;         // Giá vốn (BẢO MẬT: chỉ Sales Manager & Admin xem/sửa)
  basePrice: number;         // Giá bán ĐVT cơ sở
  imageUrl: string;          // Ảnh sản phẩm
  status: ProductStatus;     // Trạng thái kinh doanh: ACTIVE (Đang KD) | INACTIVE (Ngừng KD)
  hasTransactions: boolean;  // Đã phát sinh giao dịch (nếu true: cấm xoá, chỉ được ngừng kinh doanh)
  units: UnitConversion[];   // Danh sách các đơn vị tính và hệ số quy đổi
  createdAt: string;
  updatedAt: string;
}

export interface ExcelImportRow {
  id: string;
  rowIndex: number;          // Số thứ tự dòng trong file Excel (bắt đầu từ dòng 2 sau tiêu đề)
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  packagingSpec: string;
  costPrice: number;
  basePrice: number;
  conversionUnit: string;    // ĐVT quy đổi đi kèm
  conversionFactor: number;  // Hệ số quy đổi
  unitBarcode: string;       // Barcode của ĐVT quy đổi
  status: 'VALID' | 'UPDATE' | 'INVALID'; // VALID: Thêm mới hợp lệ, UPDATE: Đã tồn tại SKU -> Cập nhật, INVALID: Có lỗi
  isExistingSku: boolean;    // Đã tồn tại trong hệ thống (S2-08)
  errors: string[];          // Danh sách lỗi chi tiết ngăn cản import
  warnings: string[];        // Cảnh báo (ví dụ giá bán thấp hơn giá vốn)
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  updateRows: number;
  invalidRows: number;
}

/**
 * Định nghĩa cấu trúc cây nhóm hàng đa cấp (S2-06)
 * - Tối thiểu 3 cấp (Ngành hàng -> Nhóm hàng -> Phân nhóm chi tiết)
 * - Hỗ trợ kéo thả thay đổi quan hệ cha - con và sắp xếp thứ tự
 */
export interface CategoryProductItem {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  revenue: number;
}

export interface CategoryNode {
  id: string;
  name: string;
  code: string;
  level: number; // 1, 2, 3...
  parentId?: string | null;
  children?: CategoryNode[];
  productCount: number; // Số lượng SKU thuộc nhóm
  revenue: number; // Doanh số theo ngành hàng/nhóm hàng (VNĐ)
  expanded?: boolean;
  description?: string;
  products?: CategoryProductItem[]; // Danh sách các SKU trực thuộc nhóm
}


