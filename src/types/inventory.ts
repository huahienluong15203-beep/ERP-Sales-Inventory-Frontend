/**
 * Định nghĩa kiểu dữ liệu Phân hệ Quản lý Kho & Tồn kho (Sprint 5)
 * S5-04: Phiếu nhập kho từ nhà cung cấp
 * S5-07: Phiếu chuyển kho nội bộ
 * S5-09: Cảnh báo tồn tối thiểu
 */

export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface WarehouseOption {
  id: number | string;
  code: string;
  name: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export const SYSTEM_WAREHOUSES: WarehouseOption[] = [
  {
    id: 1,
    code: 'WH-MB01',
    name: 'Kho Tổng Miền Bắc',
    address: 'KCN Sài Đồng B, Long Biên, Hà Nội',
    status: 'ACTIVE'
  },
  {
    id: 2,
    code: 'WH-MT01',
    name: 'Kho Miền Trung',
    address: 'KCN Hòa Khánh, Liên Chiểu, Đà Nẵng',
    status: 'ACTIVE'
  },
  {
    id: 3,
    code: 'WH-MN01',
    name: 'Kho Tổng Miền Nam',
    address: 'KCN Sóng Thần 1, Dĩ An, Bình Dương',
    status: 'ACTIVE'
  }
];

/**
 * Một dòng hàng trong Phiếu nhập kho (S5-04)
 */
export interface GoodsReceiptLine {
  id: string;
  productId: number;
  productSku: string;
  productName: string;
  category?: string;
  baseUnit: string;
  selectedUnit: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
  totalAmount: number;
  batchNumber?: string;
  expiredDate?: string;
  hasBatchManagement?: boolean;
  note?: string;
}

/**
 * Phiếu nhập kho từ nhà cung cấp (S5-04)
 */
export interface GoodsReceipt {
  id: number | string;
  code: string;
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  documentNumber: string;
  receiptDate: string;
  warehouseCode: string;
  warehouseName: string;
  status: GoodsReceiptStatus;
  lines: GoodsReceiptLine[];
  totalLines: number;
  totalBaseQuantity: number;
  totalAmount: number;
  vehiclePlate?: string;
  driverName?: string;
  note?: string;
  createdByUsername: string;
  confirmedAt?: string;
  confirmedByUsername?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dữ liệu payload tạo/sửa phiếu nhập kho (S5-04)
 */
export interface GoodsReceiptFormPayload {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  documentNumber: string;
  receiptDate: string;
  warehouseCode: string;
  warehouseName: string;
  vehiclePlate?: string;
  driverName?: string;
  note?: string;
  status: GoodsReceiptStatus;
  lines: Array<{
    productId: number;
    productSku: string;
    productName: string;
    category?: string;
    baseUnit: string;
    selectedUnit: string;
    conversionFactor: number;
    quantity: number;
    baseQuantity: number;
    unitPrice: number;
    totalAmount: number;
    batchNumber?: string;
    expiredDate?: string;
    hasBatchManagement?: boolean;
    note?: string;
  }>;
}
