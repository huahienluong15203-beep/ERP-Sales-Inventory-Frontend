/**
 * Định nghĩa kiểu dữ liệu Phân hệ Sản phẩm & Bảng giá (EP-02)
 * Tuân thủ quy chuẩn DoR/DoD:
 * - Mã SKU, Tên, Nhóm hàng, Đơn vị tính cơ sở, Quy cách đóng gói, Giá vốn, Ảnh, Trạng thái.
 * - Bảng cài đặt quy đổi đơn vị (Base Unit Rule: Thùng, Lốc -> ĐVT cơ sở).
 * - Cấu trúc dữ liệu lưới kiểm tra lỗi từng dòng khi Import Excel.
 */

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';

export interface UnitConversion {
  id: string;
  unitName: string;           // Tên đơn vị quy đổi (ví dụ: "Thùng", "Lốc", "Két", "Hộp")
  conversionFactor: number;   // Hệ số quy đổi so với ĐVT cơ sở (ví dụ: 24, 6)
  operator: 'MULTIPLY' | 'DIVIDE'; // Phép tính (1 Thùng = 24 Chai cơ sở -> MULTIPLY)
  barcode?: string;           // Mã vạch theo đơn vị quy đổi
  sellingPrice?: number;      // Giá bán theo đơn vị quy đổi (VND)
  isDefaultSalesUnit?: boolean; // Đơn vị bán mặc định
  note?: string;              // Ghi chú quy cách
}

export interface ProductCategoryNode {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  children?: ProductCategoryNode[];
  description?: string;
  order?: number;
}

export interface Product {
  id: string;
  sku: string;                // Mã SKU định danh duy nhất (ví dụ: "BEER-TIGER-330", "MILK-VNM-180")
  name: string;               // Tên sản phẩm chuẩn toàn công ty
  category: string;           // Nhóm hàng (ví dụ: "Bia & Đồ uống", "Sữa & Chế phẩm", "Gia vị & Đồ khô")
  categoryId?: string;        // ID của nhóm hàng trong cây đa cấp
  baseUnit: string;           // Đơn vị tính cơ sở (Base Unit: Lon, Chai, Hộp, Gói, Cái, Kg...)
  packagingSpec: string;      // Quy cách đóng gói (ví dụ: "24 lon/thùng", "48 hộp/thùng")
  costPrice: number;          // Giá vốn (BẢO MẬT: Chỉ Quản lý kinh doanh & Admin được xem và sửa)
  imageUrl: string;           // Ảnh sản phẩm
  status: ProductStatus;      // Trạng thái ('ACTIVE': Đang kinh doanh, 'INACTIVE': Tạm ngưng, 'OUT_OF_STOCK': Hết hàng)
  unitConversions: UnitConversion[]; // Bảng cài đặt quy đổi đơn vị tính
  transactionCount?: number;  // Số giao dịch đã phát sinh (nếu > 0 thì KHÔNG được xóa, chỉ được ngừng kinh doanh)
  createdAt: string;
  updatedAt: string;
}

export interface ExcelImportRow {
  rowNumber: number;          // Vị trí dòng trong file Excel (bắt đầu từ dòng 2 sau tiêu đề)
  sku: string;                // Mã SKU
  name: string;               // Tên sản phẩm
  category: string;           // Nhóm hàng
  baseUnit: string;           // Đơn vị tính cơ sở
  packagingSpec: string;      // Quy cách đóng gói
  costPrice: number | string; // Giá vốn
  imageUrl: string;           // Link ảnh
  status: string;             // Trạng thái (ACTIVE / INACTIVE / OUT_OF_STOCK)
  conversionsText?: string;   // Chuỗi quy đổi đơn vị (ví dụ: "Thùng:24, Lốc:6")
  isValid: boolean;           // Dòng dữ liệu có hợp lệ hay không
  errors: string[];           // Danh sách lỗi chi tiết của từng dòng
}
