/**
 * Dịch vụ Quản lý Danh mục Sản phẩm (S2-05)
 * Tuân thủ 4 Acceptance Criteria:
 * 1. Khai báo đúng 8 trường: SKU, Tên, Nhóm hàng, ĐVT cơ sở, Quy cách đóng gói, Giá vốn, Ảnh, Trạng thái.
 * 2. Mã SKU duy nhất toàn hệ thống.
 * 3. Giá vốn chỉ Quản lý kinh doanh (ROLE_SALES_MANAGER) và Admin (ROLE_ADMIN) xem & sửa.
 * 4. Sản phẩm đã có giao dịch (transactionCount > 0) KHÔNG được xóa, chỉ chuyển sang Ngừng kinh doanh.
 */

import type { Product, ProductStatus, CreateProductInput, UpdateProductInput } from '../types/product';
import type { RoleName } from '../types/user';

const STORAGE_KEY = 'erp_products_s2_05';

export const PRODUCT_CATEGORIES = [
  'Nước giải khát',
  'Sữa & Sản phẩm từ sữa',
  'Gia vị & Thực phẩm',
  'Thực phẩm khô & Ăn liền',
  'Bánh kẹo & Snack',
  'Hóa phẩm & Chăm sóc gia đình',
  'Hóa mỹ phẩm & Chăm sóc cá nhân'
] as const;

export const COMMON_BASE_UNITS = [
  'Lon',
  'Chai',
  'Hộp',
  'Gói',
  'Lốc',
  'Thùng',
  'Cái',
  'Túi',
  'Kg',
  'Gram'
] as const;

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'SP-COCA-330',
    name: 'Nước ngọt có gas Coca-Cola lon 330ml',
    category: 'Nước giải khát',
    baseUnit: 'Lon',
    packagingSpec: '24 lon / thùng (4 lốc x 6 lon)',
    costPrice: 215000,
    imageUrl: '',
    status: 'ACTIVE',
    transactionCount: 42,
    createdAt: '2026-09-15 08:30:00',
    updatedAt: '2026-10-01 10:15:00'
  },
  {
    id: 'prod-002',
    sku: 'SP-PEPSI-330',
    name: 'Nước ngọt Pepsi Không Calo lon 330ml',
    category: 'Nước giải khát',
    baseUnit: 'Lon',
    packagingSpec: '24 lon / thùng',
    costPrice: 210000,
    imageUrl: '',
    status: 'ACTIVE',
    transactionCount: 18,
    createdAt: '2026-09-16 09:00:00',
    updatedAt: '2026-09-28 14:20:00'
  },
  {
    id: 'prod-003',
    sku: 'SP-MILO-180',
    name: 'Sữa lúa mạch Nestlé Milo ít đường hộp 180ml',
    category: 'Sữa & Sản phẩm từ sữa',
    baseUnit: 'Hộp',
    packagingSpec: '48 hộp / thùng (12 lốc x 4 hộp)',
    costPrice: 325000,
    imageUrl: '',
    status: 'ACTIVE',
    transactionCount: 29,
    createdAt: '2026-09-18 11:20:00',
    updatedAt: '2026-10-02 09:40:00'
  },
  {
    id: 'prod-004',
    sku: 'SP-TH-1L',
    name: 'Sữa tươi tiệt trùng TH True MILK nguyên chất 1L',
    category: 'Sữa & Sản phẩm từ sữa',
    baseUnit: 'Hộp',
    packagingSpec: '12 hộp / thùng',
    costPrice: 385000,
    imageUrl: '',
    status: 'ACTIVE',
    transactionCount: 0, // Chưa có giao dịch -> Cho phép xóa thử nghiệm
    createdAt: '2026-10-01 14:00:00',
    updatedAt: '2026-10-01 14:00:00'
  },
  {
    id: 'prod-005',
    sku: 'SP-CHINSU-500',
    name: 'Nước mắm Chinsu Nam Ngư Cá Hồi 500ml',
    category: 'Gia vị & Thực phẩm',
    baseUnit: 'Chai',
    packagingSpec: '15 chai / thùng',
    costPrice: 195000,
    imageUrl: '',
    status: 'ACTIVE',
    transactionCount: 35,
    createdAt: '2026-09-10 08:00:00',
    updatedAt: '2026-09-25 16:30:00'
  },
  {
    id: 'prod-006',
    sku: 'SP-OMACHI-SGN',
    name: 'Mì khoai tây Omachi Xốt bò hầm gói 80g',
    category: 'Thực phẩm khô & Ăn liền',
    baseUnit: 'Gói',
    packagingSpec: '30 gói / thùng',
    costPrice: 245000,
    imageUrl: '',
    status: 'ACTIVE',
    transactionCount: 16,
    createdAt: '2026-09-12 10:10:00',
    updatedAt: '2026-09-29 11:15:00'
  },
  {
    id: 'prod-007',
    sku: 'SP-LAVIE-500',
    name: 'Nước khoáng thiên nhiên La Vie chai 500ml',
    category: 'Nước giải khát',
    baseUnit: 'Chai',
    packagingSpec: '24 chai / thùng',
    costPrice: 88000,
    imageUrl: '',
    status: 'INACTIVE', // Đã ngừng kinh doanh
    transactionCount: 7,
    createdAt: '2026-08-20 09:00:00',
    updatedAt: '2026-09-30 17:00:00'
  },
  {
    id: 'prod-008',
    sku: 'SP-OMO-3KG',
    name: 'Nước giặt OMO Matic Khử Mùi Cửa Trước túi 3kg',
    category: 'Hóa phẩm & Chăm sóc gia đình',
    baseUnit: 'Túi',
    packagingSpec: '4 túi / thùng',
    costPrice: 520000,
    imageUrl: '',
    status: 'ACTIVE',
    transactionCount: 0, // Chưa có giao dịch -> Cho phép xóa thử nghiệm
    createdAt: '2026-10-02 08:30:00',
    updatedAt: '2026-10-02 08:30:00'
  }
];

function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return parsed;
  } catch (error) {
    console.error('Lỗi đọc danh sách sản phẩm từ localStorage:', error);
    return INITIAL_PRODUCTS;
  }
}

function saveStoredProducts(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error('Lỗi lưu danh sách sản phẩm vào localStorage:', error);
  }
}

export function canManageCostPrice(role?: RoleName | null): boolean {
  if (!role) return false;
  return role === 'ROLE_SALES_MANAGER' || role === 'ROLE_ADMIN';
}

export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

export interface ProductFilterParams {
  keyword?: string;
  category?: string;
  status?: ProductStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  products: Product[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export const productService = {
  async getProducts(params: ProductFilterParams = {}): Promise<ProductListResult> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let list = getStoredProducts();

    const keyword = params.keyword?.trim().toLowerCase();
    if (keyword) {
      list = list.filter(
        (p) =>
          p.sku.toLowerCase().includes(keyword) ||
          p.name.toLowerCase().includes(keyword) ||
          p.category.toLowerCase().includes(keyword) ||
          p.packagingSpec.toLowerCase().includes(keyword) ||
          p.baseUnit.toLowerCase().includes(keyword)
      );
    }

    if (params.category && params.category !== 'ALL') {
      list = list.filter((p) => p.category === params.category);
    }

    if (params.status && params.status !== 'ALL') {
      list = list.filter((p) => p.status === params.status);
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const totalElements = list.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginatedProducts = list.slice(start, start + pageSize);

    return {
      products: paginatedProducts,
      totalElements,
      totalPages,
      currentPage: page
    };
  },

  async getProductById(id: string): Promise<Product | null> {
    const list = getStoredProducts();
    return list.find((p) => p.id === id) || null;
  },

  async checkSkuExists(sku: string, excludeId?: string): Promise<boolean> {
    const list = getStoredProducts();
    const cleanSku = sku.trim().toUpperCase();
    return list.some((p) => p.sku.toUpperCase() === cleanSku && p.id !== excludeId);
  },

  async createProduct(
    input: CreateProductInput,
    userRole?: RoleName | null
  ): Promise<{ success: boolean; message: string; product?: Product }> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const list = getStoredProducts();

    const cleanSku = input.sku.trim().toUpperCase();
    if (!cleanSku) {
      return { success: false, message: 'Mã SKU không được để trống!' };
    }
    if (!input.name.trim()) {
      return { success: false, message: 'Tên sản phẩm không được để trống!' };
    }
    if (!input.baseUnit.trim()) {
      return { success: false, message: 'Đơn vị tính cơ sở không được để trống!' };
    }

    const isExisted = list.some((p) => p.sku.toUpperCase() === cleanSku);
    if (isExisted) {
      return {
        success: false,
        message: `Mã SKU "${cleanSku}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác!`
      };
    }

    let safeCostPrice = Number(input.costPrice) || 0;
    if (!canManageCostPrice(userRole)) {
      safeCostPrice = 0;
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sku: cleanSku,
      name: input.name.trim(),
      category: input.category || 'Nước giải khát',
      baseUnit: input.baseUnit.trim(),
      packagingSpec: input.packagingSpec?.trim() || 'Thùng tiêu chuẩn',
      costPrice: safeCostPrice,
      imageUrl: input.imageUrl?.trim() || '',
      status: input.status || 'ACTIVE',
      transactionCount: 0,
      createdAt: now,
      updatedAt: now
    };

    list.unshift(newProduct);
    saveStoredProducts(list);

    return {
      success: true,
      message: `Đã tạo thành công sản phẩm "${newProduct.name}" (SKU: ${newProduct.sku})`,
      product: newProduct
    };
  },

  async updateProduct(
    id: string,
    input: UpdateProductInput,
    userRole?: RoleName | null
  ): Promise<{ success: boolean; message: string; product?: Product }> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const list = getStoredProducts();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      return { success: false, message: 'Không tìm thấy sản phẩm cần cập nhật!' };
    }

    const current = list[index];

    if (input.sku) {
      const cleanSku = input.sku.trim().toUpperCase();
      const isExisted = list.some((p) => p.sku.toUpperCase() === cleanSku && p.id !== id);
      if (isExisted) {
        return {
          success: false,
          message: `Mã SKU "${cleanSku}" đã được sử dụng bởi sản phẩm khác!`
        };
      }
      current.sku = cleanSku;
    }

    if (input.name !== undefined) current.name = input.name.trim();
    if (input.category !== undefined) current.category = input.category;
    if (input.baseUnit !== undefined) current.baseUnit = input.baseUnit.trim();
    if (input.packagingSpec !== undefined) current.packagingSpec = input.packagingSpec.trim();
    if (input.imageUrl !== undefined) current.imageUrl = input.imageUrl.trim();
    if (input.status !== undefined) current.status = input.status;

    if (input.costPrice !== undefined) {
      if (canManageCostPrice(userRole)) {
        current.costPrice = Number(input.costPrice) || 0;
      }
    }

    current.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    list[index] = current;
    saveStoredProducts(list);

    return {
      success: true,
      message: `Đã cập nhật thông tin sản phẩm "${current.name}"`,
      product: current
    };
  },

  async deleteProduct(id: string): Promise<{
    success: boolean;
    message: string;
    canOnlyDeactivate?: boolean;
    product?: Product;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const list = getStoredProducts();
    const target = list.find((p) => p.id === id);

    if (!target) {
      return { success: false, message: 'Không tìm thấy sản phẩm cần xóa!' };
    }

    // ĐIỀU KIỆN 4: Nếu đã có giao dịch (> 0) thì CHẶN XÓA
    if (target.transactionCount > 0) {
      return {
        success: false,
        canOnlyDeactivate: true,
        product: target,
        message: `Sản phẩm "${target.sku} - ${target.name}" đã phát sinh ${target.transactionCount} giao dịch. Theo quy định, không thể xóa sản phẩm này khỏi hệ thống để bảo đảm toàn vẹn dữ liệu kế toán & kho. Vui lòng chuyển trạng thái sang "Ngừng kinh doanh".`
      };
    }

    // Nếu chưa phát sinh giao dịch (=== 0) thì cho phép xóa
    const filtered = list.filter((p) => p.id !== id);
    saveStoredProducts(filtered);

    return {
      success: true,
      message: `Đã xóa thành công sản phẩm "${target.sku} - ${target.name}"!`
    };
  },

  async deactivateProduct(id: string): Promise<{ success: boolean; message: string; product?: Product }> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const list = getStoredProducts();
    const target = list.find((p) => p.id === id);

    if (!target) {
      return { success: false, message: 'Không tìm thấy sản phẩm!' };
    }

    target.status = 'INACTIVE';
    target.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    saveStoredProducts(list);

    return {
      success: true,
      message: `Đã chuyển sản phẩm "${target.sku}" sang trạng thái "Ngừng kinh doanh".`,
      product: target
    };
  },

  async activateProduct(id: string): Promise<{ success: boolean; message: string; product?: Product }> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const list = getStoredProducts();
    const target = list.find((p) => p.id === id);

    if (!target) {
      return { success: false, message: 'Không tìm thấy sản phẩm!' };
    }

    target.status = 'ACTIVE';
    target.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    saveStoredProducts(list);

    return {
      success: true,
      message: `Đã mở lại kinh doanh cho sản phẩm "${target.sku}".`,
      product: target
    };
  }
};
