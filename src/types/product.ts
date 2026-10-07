/**
 * Kiểu dữ liệu Phân hệ Danh mục Sản phẩm (S2-05)
 * Tuân thủ 4 điều kiện cốt lõi:
 * 1. Khai báo mã SKU, tên, nhóm hàng, đơn vị tính cơ sở, quy cách đóng gói, giá vốn, ảnh, trạng thái.
 * 2. Mã SKU là duy nhất.
 * 3. Giá vốn chỉ Quản lý kinh doanh & Admin xem và sửa được.
 * 4. Sản phẩm đã phát sinh giao dịch thì không xoá được, chỉ ngừng kinh doanh.
 */

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface Product {
  id: string;
  sku: string;                // 1. Mã SKU duy nhất toàn hệ thống
  name: string;               // 2. Tên sản phẩm chuẩn toàn công ty
  category: string;           // 3. Nhóm hàng
  categoryId?: string;        // ID nhóm hàng trong cây (S2-06)
  baseUnit: string;           // 4. Đơn vị tính cơ sở (Base Unit: Lon, Chai, Hộp, Gói, Cái, Kg...)
  packagingSpec: string;      // 5. Quy cách đóng gói (vd: 24 lon / thùng, 12 hộp / lốc...)
  costPrice: number;          // 6. Giá vốn (BẢO MẬT: Chỉ Quản lý kinh doanh & Admin được xem và sửa)
  imageUrl?: string;          // 7. Ảnh sản phẩm
  status: ProductStatus;      // 8. Trạng thái ("ACTIVE" - Đang kinh doanh, "INACTIVE" - Ngừng kinh doanh)
  transactionCount: number;   // Số giao dịch phát sinh (Nếu > 0: KHÔNG ĐƯỢC XÓA, chỉ được ngừng kinh doanh)
  createdAt?: string;
  updatedAt?: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'transactionCount'>;
export type UpdateProductInput = Partial<CreateProductInput>;
