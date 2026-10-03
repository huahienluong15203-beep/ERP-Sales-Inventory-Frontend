export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  level: number; // 1: Ngành hàng (Division), 2: Nhóm hàng (Group), 3: Phân nhóm (Subgroup)
  parentId: string | null;
  description?: string;
}

export interface CategoryProduct {
  id: string;
  sku: string;
  name: string;
  baseUnit: string; // lon, chai, gói, hộp...
  categoryId: string;
  unitPrice: number; // Giá bán tiêu chuẩn (VND)
  salesQuantity: number; // Sản lượng bán tích lũy
  revenue: number; // Doanh số thực tế (VND)
}

export interface CategoryRollup {
  categoryId: string;
  directProductCount: number;
  totalProductCount: number;
  directRevenue: number;
  totalRevenue: number;
  directQuantity: number;
  totalQuantity: number;
}
