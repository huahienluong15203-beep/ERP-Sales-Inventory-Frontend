import type { ProductItem, ExcelImportRow, UnitConversion, ProductStatus } from '../types/product';
import type { RoleName } from '../types/user';

// Danh mục ngành hàng mẫu
export const PRODUCT_CATEGORIES = [
  'Bia & Đồ uống có cồn',
  'Nước giải khát & Trà',
  'Thực phẩm & Ăn liền',
  'Gia vị & Dầu thực vật',
  'Sữa & Chế phẩm từ sữa'
];

// Danh sách sản phẩm mẫu ban đầu chuẩn nghiệp vụ FMCG
const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-001',
    sku: 'BEER-SGS-330',
    name: 'Bia Sài Gòn Special Lon 330ml',
    category: 'Bia & Đồ uống có cồn',
    baseUnit: 'Lon',
    packagingSpec: '24 lon / thùng (4 lốc x 6 lon)',
    costPrice: 11500, // Giá vốn: 11.500đ / lon
    basePrice: 15000, // Giá bán lẻ: 15.000đ / lon
    imageUrl: 'https://images.unsplash.com/photo-1608270199042-4914a84d4128?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    hasTransactions: true, // Đã có đơn hàng -> Không được xoá, chỉ được ngừng KD
    units: [
      {
        id: 'u-001-base',
        unitName: 'Lon',
        conversionFactor: 1,
        barcode: '8934567010011',
        isBaseUnit: true,
        suggestedPrice: 15000,
        sellingPrice: 15000,
        costPrice: 11500
      },
      {
        id: 'u-001-loc',
        unitName: 'Lốc (6 lon)',
        conversionFactor: 6,
        barcode: '8934567010028',
        isBaseUnit: false,
        suggestedPrice: 90000,
        sellingPrice: 88000, // Ưu đãi giảm nhẹ khi mua lốc
        costPrice: 69000
      },
      {
        id: 'u-001-thung',
        unitName: 'Thùng (24 lon)',
        conversionFactor: 24,
        barcode: '8934567010035',
        isBaseUnit: false,
        suggestedPrice: 360000,
        sellingPrice: 345000, // Bán sỉ theo thùng
        costPrice: 276000
      }
    ],
    createdAt: '2026-09-15 08:30:00',
    updatedAt: '2026-09-20 14:15:00'
  },
  {
    id: 'prod-002',
    sku: 'COCA-CAN-320',
    name: 'Nước ngọt Coca-Cola Vị Nguyên Bản Lon 320ml',
    category: 'Nước giải khát & Trà',
    baseUnit: 'Lon',
    packagingSpec: '24 lon / thùng (4 lốc x 6 lon)',
    costPrice: 7200,
    basePrice: 10000,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    hasTransactions: true,
    units: [
      {
        id: 'u-002-base',
        unitName: 'Lon',
        conversionFactor: 1,
        barcode: '8935049500018',
        isBaseUnit: true,
        suggestedPrice: 10000,
        sellingPrice: 10000,
        costPrice: 7200
      },
      {
        id: 'u-002-loc',
        unitName: 'Lốc (6 lon)',
        conversionFactor: 6,
        barcode: '8935049500025',
        isBaseUnit: false,
        suggestedPrice: 60000,
        sellingPrice: 58000,
        costPrice: 43200
      },
      {
        id: 'u-002-thung',
        unitName: 'Thùng (24 lon)',
        conversionFactor: 24,
        barcode: '8935049500032',
        isBaseUnit: false,
        suggestedPrice: 240000,
        sellingPrice: 228000,
        costPrice: 172800
      }
    ],
    createdAt: '2026-09-16 09:00:00',
    updatedAt: '2026-09-22 10:00:00'
  },
  {
    id: 'prod-003',
    sku: 'NOODLE-HH-TOM',
    name: 'Mì Ăn Liền Hảo Hảo Tôm Chua Cay Gói 75g',
    category: 'Thực phẩm & Ăn liền',
    baseUnit: 'Gói',
    packagingSpec: '30 gói / thùng',
    costPrice: 3100,
    basePrice: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    hasTransactions: false, // Chưa phát sinh đơn -> Cho phép xoá thử nghiệm
    units: [
      {
        id: 'u-003-base',
        unitName: 'Gói',
        conversionFactor: 1,
        barcode: '8934561240019',
        isBaseUnit: true,
        suggestedPrice: 4500,
        sellingPrice: 4500,
        costPrice: 3100
      },
      {
        id: 'u-003-thung',
        unitName: 'Thùng (30 gói)',
        conversionFactor: 30,
        barcode: '8934561240033',
        isBaseUnit: false,
        suggestedPrice: 135000,
        sellingPrice: 125000,
        costPrice: 93000
      }
    ],
    createdAt: '2026-09-18 11:20:00',
    updatedAt: '2026-09-18 11:20:00'
  },
  {
    id: 'prod-004',
    sku: 'MILK-VNM-180',
    name: 'Sữa Tươi Tiệt Trùng Vinamilk Có Đường 180ml',
    category: 'Sữa & Chế phẩm từ sữa',
    baseUnit: 'Hộp',
    packagingSpec: '48 hộp / thùng (12 lốc x 4 hộp)',
    costPrice: 6200,
    basePrice: 8500,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    hasTransactions: true,
    units: [
      {
        id: 'u-004-base',
        unitName: 'Hộp',
        conversionFactor: 1,
        barcode: '8934673100014',
        isBaseUnit: true,
        suggestedPrice: 8500,
        sellingPrice: 8500,
        costPrice: 6200
      },
      {
        id: 'u-004-loc',
        unitName: 'Lốc (4 hộp)',
        conversionFactor: 4,
        barcode: '8934673100021',
        isBaseUnit: false,
        suggestedPrice: 34000,
        sellingPrice: 33000,
        costPrice: 24800
      },
      {
        id: 'u-004-thung',
        unitName: 'Thùng (48 hộp)',
        conversionFactor: 48,
        barcode: '8934673100038',
        isBaseUnit: false,
        suggestedPrice: 408000,
        sellingPrice: 385000,
        costPrice: 297600
      }
    ],
    createdAt: '2026-09-19 14:00:00',
    updatedAt: '2026-09-24 16:30:00'
  }
];

// Khởi tạo LocalStorage để lưu giữ trạng thái khi người dùng thêm/sửa/import
const STORAGE_KEY = 'erp_products_sprint2_v1';

function getStoredProducts(): ProductItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_PRODUCTS;
  }
}

function saveStoredProducts(products: ProductItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

/**
 * Kiểm tra xem vai trò hiện tại có được xem & sửa Giá vốn không
 * Theo AGENTS.md Mục 5 & 10: Chỉ Quản lý kinh doanh (ROLE_SALES_MANAGER) và Quản trị viên (ROLE_ADMIN)
 */
export function canViewCostPrice(roles: RoleName[]): boolean {
  return roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SALES_MANAGER');
}

/**
 * Lấy danh sách sản phẩm kèm bảo mật giá vốn
 */
export async function getProducts(userRoles: RoleName[]): Promise<ProductItem[]> {
  const products = getStoredProducts();
  const allowCost = canViewCostPrice(userRoles);

  // Nếu không có quyền xem giá vốn -> Mask/bỏ giá vốn
  if (!allowCost) {
    return products.map((p) => ({
      ...p,
      costPrice: 0,
      units: p.units.map((u) => ({ ...u, costPrice: undefined }))
    }));
  }
  return products;
}

/**
 * Tạo mới hoặc cập nhật sản phẩm (S2-05, S2-07)
 */
export async function saveProduct(product: ProductItem, userRoles: RoleName[]): Promise<{ success: boolean; message: string; data?: ProductItem }> {
  const products = getStoredProducts();
  const skuTrimmed = product.sku.trim().toUpperCase();

  if (!skuTrimmed) {
    return { success: false, message: 'Mã SKU không được để trống' };
  }

  if (!product.name.trim()) {
    return { success: false, message: 'Tên sản phẩm không được để trống' };
  }

  if (!product.baseUnit.trim()) {
    return { success: false, message: 'Đơn vị tính cơ sở không được để trống' };
  }

  // Kiểm tra trùng SKU
  const existingIndex = products.findIndex((p) => p.sku.toUpperCase() === skuTrimmed);
  const isEditing = Boolean(product.id);

  if (!isEditing && existingIndex >= 0) {
    return { success: false, message: `Mã SKU [${skuTrimmed}] đã tồn tại trong hệ thống. Vui lòng chọn mã khác!` };
  }

  if (isEditing) {
    const existingSameSku = products.find((p) => p.sku.toUpperCase() === skuTrimmed && p.id !== product.id);
    if (existingSameSku) {
      return { success: false, message: `Mã SKU [${skuTrimmed}] đã thuộc về sản phẩm khác!` };
    }
  }

  // Bảo vệ giá vốn: nếu không có quyền sửa giá vốn, giữ nguyên giá vốn cũ từ DB
  const allowCost = canViewCostPrice(userRoles);
  let finalCostPrice = product.costPrice;
  if (!allowCost && isEditing) {
    const oldProduct = products.find((p) => p.id === product.id);
    if (oldProduct) {
      finalCostPrice = oldProduct.costPrice;
    }
  }

  const now = new Date().toLocaleString('vi-VN');
  let savedItem: ProductItem;

  if (isEditing) {
    const idx = products.findIndex((p) => p.id === product.id);
    savedItem = {
      ...product,
      sku: skuTrimmed,
      costPrice: finalCostPrice,
      updatedAt: now
    };
    products[idx] = savedItem;
  } else {
    savedItem = {
      ...product,
      id: `prod-${Date.now()}`,
      sku: skuTrimmed,
      costPrice: finalCostPrice,
      hasTransactions: false,
      createdAt: now,
      updatedAt: now
    };
    products.unshift(savedItem);
  }

  saveStoredProducts(products);
  return { success: true, message: isEditing ? 'Cập nhật sản phẩm thành công!' : 'Tạo mới sản phẩm thành công!', data: savedItem };
}

/**
 * Xóa sản phẩm (S2-05: Sản phẩm đã phát sinh giao dịch thì KHÔNG XOÁ ĐƯỢC, chỉ ngừng kinh doanh)
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
  const products = getStoredProducts();
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return { success: false, message: 'Không tìm thấy sản phẩm cần xoá!' };
  }

  if (product.hasTransactions) {
    return {
      success: false,
      message: `Sản phẩm [${product.sku} - ${product.name}] đã phát sinh giao dịch trên đơn hàng/sổ kho. Theo quy tắc nghiệp vụ S2-05, BẮT BUỘC chỉ được chuyển sang trạng thái "Ngừng kinh doanh" chứ không được xoá!`
    };
  }

  const updated = products.filter((p) => p.id !== productId);
  saveStoredProducts(updated);
  return { success: true, message: `Đã xoá sản phẩm [${product.sku}] thành công!` };
}

/**
 * Đổi trạng thái kinh doanh (Đang kinh doanh / Ngừng kinh doanh)
 */
export async function toggleProductStatus(productId: string, newStatus: ProductStatus): Promise<{ success: boolean; message: string }> {
  const products = getStoredProducts();
  const idx = products.findIndex((p) => p.id === productId);

  if (idx < 0) {
    return { success: false, message: 'Không tìm thấy sản phẩm!' };
  }

  products[idx].status = newStatus;
  products[idx].updatedAt = new Date().toLocaleString('vi-VN');
  saveStoredProducts(products);

  const statusLabel = newStatus === 'ACTIVE' ? 'Đang kinh doanh' : 'Ngừng kinh doanh';
  return { success: true, message: `Đã cập nhật trạng thái sản phẩm sang "${statusLabel}"` };
}

/**
 * Kiểm tra và phân tích từng dòng dữ liệu Excel (S2-08)
 * - Kiểm tra lỗi định dạng, ô trống, số âm
 * - Đánh dấu SKU đã tồn tại (UPDATE) thay vì tạo mới (S2-08)
 * - Thu thập danh sách lỗi từng dòng để hiển thị lên lưới dữ liệu
 */
export function validateExcelImportData(
  rawRows: Array<{
    sku?: string;
    name?: string;
    category?: string;
    baseUnit?: string;
    packagingSpec?: string;
    costPrice?: number | string;
    basePrice?: number | string;
    conversionUnit?: string;
    conversionFactor?: number | string;
    unitBarcode?: string;
  }>
): ExcelImportRow[] {
  const existingProducts = getStoredProducts();
  const existingSkuMap = new Map<string, ProductItem>();
  existingProducts.forEach((p) => existingSkuMap.set(p.sku.toUpperCase(), p));

  const seenSkusInFile = new Set<string>();

  return rawRows.map((row, index) => {
    const rowIndex = index + 2; // Dòng 1 là tiêu đề
    const errors: string[] = [];
    const warnings: string[] = [];

    const sku = (row.sku || '').trim().toUpperCase();
    const name = (row.name || '').trim();
    const category = (row.category || '').trim() || 'Chưa phân nhóm';
    const baseUnit = (row.baseUnit || '').trim();
    const packagingSpec = (row.packagingSpec || '').trim() || 'Tiêu chuẩn';

    const costPriceNum = Number(row.costPrice) || 0;
    const basePriceNum = Number(row.basePrice) || 0;

    const conversionUnit = (row.conversionUnit || '').trim();
    const conversionFactorNum = row.conversionFactor !== undefined && row.conversionFactor !== '' ? Number(row.conversionFactor) : 1;
    const unitBarcode = (row.unitBarcode || '').trim();

    // 1. Kiểm tra SKU
    if (!sku) {
      errors.push('Mã SKU không được để trống');
    } else if (seenSkusInFile.has(sku)) {
      errors.push(`Mã SKU [${sku}] bị lặp lại nhiều lần trong file Excel`);
    } else {
      seenSkusInFile.add(sku);
    }

    // 2. Kiểm tra Tên
    if (!name) {
      errors.push('Tên sản phẩm không được để trống');
    }

    // 3. Kiểm tra ĐVT cơ sở
    if (!baseUnit) {
      errors.push('Đơn vị tính cơ sở không được để trống');
    }

    // 4. Kiểm tra Giá
    if (isNaN(costPriceNum) || costPriceNum < 0) {
      errors.push('Giá vốn phải là số không âm (>= 0)');
    }
    if (isNaN(basePriceNum) || basePriceNum <= 0) {
      errors.push('Giá bán cơ sở phải là số dương (> 0)');
    } else if (basePriceNum < costPriceNum && costPriceNum > 0) {
      warnings.push('Cảnh báo: Giá bán cơ sở đang thấp hơn Giá vốn');
    }

    // 5. Kiểm tra ĐVT quy đổi nếu có khai báo
    if (conversionUnit) {
      if (isNaN(conversionFactorNum) || conversionFactorNum <= 0) {
        errors.push(`Hệ số quy đổi cho đơn vị [${conversionUnit}] phải là số lớn hơn 0`);
      }
      if (conversionUnit.toLowerCase() === baseUnit.toLowerCase() && conversionFactorNum !== 1) {
        errors.push('Đơn vị quy đổi trùng với ĐVT cơ sở nhưng hệ số khác 1');
      }
    }

    const isExisting = Boolean(sku && existingSkuMap.has(sku));

    let status: 'VALID' | 'UPDATE' | 'INVALID';
    if (errors.length > 0) {
      status = 'INVALID';
    } else if (isExisting) {
      status = 'UPDATE';
    } else {
      status = 'VALID';
    }

    return {
      id: `row-${rowIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rowIndex,
      sku,
      name,
      category,
      baseUnit,
      packagingSpec,
      costPrice: costPriceNum,
      basePrice: basePriceNum,
      conversionUnit: conversionUnit || '',
      conversionFactor: conversionFactorNum,
      unitBarcode: unitBarcode || '',
      status,
      isExistingSku: isExisting,
      errors,
      warnings
    };
  });
}

/**
 * Thực hiện Import danh sách dòng Excel hợp lệ vào cơ sở dữ liệu
 */
export async function commitExcelImport(
  rowsToImport: ExcelImportRow[],
  userRoles: RoleName[]
): Promise<{ success: boolean; importedCount: number; updatedCount: number; message: string }> {
  const products = getStoredProducts();
  const allowCost = canViewCostPrice(userRoles);
  const now = new Date().toLocaleString('vi-VN');

  let importedCount = 0;
  let updatedCount = 0;

  for (const row of rowsToImport) {
    if (row.status === 'INVALID') {
      continue; // Bỏ qua dòng lỗi
    }

    const existingIdx = products.findIndex((p) => p.sku.toUpperCase() === row.sku.toUpperCase());

    const unitsList: UnitConversion[] = [
      {
        id: `u-${row.sku}-base`,
        unitName: row.baseUnit,
        conversionFactor: 1,
        barcode: row.unitBarcode || `893${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        isBaseUnit: true,
        suggestedPrice: row.basePrice,
        sellingPrice: row.basePrice,
        costPrice: allowCost ? row.costPrice : undefined
      }
    ];

    if (row.conversionUnit && row.conversionFactor > 1) {
      unitsList.push({
        id: `u-${row.sku}-conv`,
        unitName: row.conversionUnit,
        conversionFactor: row.conversionFactor,
        barcode: `893${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        isBaseUnit: false,
        suggestedPrice: row.basePrice * row.conversionFactor,
        sellingPrice: row.basePrice * row.conversionFactor,
        costPrice: allowCost ? row.costPrice * row.conversionFactor : undefined
      });
    }

    if (existingIdx >= 0) {
      // Cập nhật sản phẩm cũ (S2-08)
      const oldProd = products[existingIdx];
      products[existingIdx] = {
        ...oldProd,
        name: row.name,
        category: row.category,
        baseUnit: row.baseUnit,
        packagingSpec: row.packagingSpec,
        costPrice: allowCost ? row.costPrice : oldProd.costPrice,
        basePrice: row.basePrice,
        units: unitsList,
        updatedAt: now
      };
      updatedCount++;
    } else {
      // Tạo mới sản phẩm
      products.unshift({
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku: row.sku,
        name: row.name,
        category: row.category,
        baseUnit: row.baseUnit,
        packagingSpec: row.packagingSpec,
        costPrice: allowCost ? row.costPrice : 0,
        basePrice: row.basePrice,
        imageUrl: '',
        status: 'ACTIVE',
        hasTransactions: false,
        units: unitsList,
        createdAt: now,
        updatedAt: now
      });
      importedCount++;
    }
  }

  saveStoredProducts(products);
  return {
    success: true,
    importedCount,
    updatedCount,
    message: `Đã xử lý Import thành công: ${importedCount} sản phẩm tạo mới, ${updatedCount} sản phẩm cập nhật!`
  };
}

/**
 * Trả về tập dữ liệu mẫu để thử nghiệm tính năng lưới báo lỗi dòng (S2-08)
 * Có sẵn: Dòng hợp lệ tạo mới, Dòng cập nhật SKU có sẵn, Dòng thiếu tên, Dòng giá âm, Dòng trùng SKU
 */
export function getDemoExcelData(): ExcelImportRow[] {
  const demoRaw = [
    {
      sku: 'BEER-SGS-330', // ĐÃ CÓ TRONG HỆ THỐNG -> SẼ ĐÁNH DẤU LÀ "CẬP NHẬT" (UPDATE)
      name: 'Bia Sài Gòn Special Lon 330ml (Cập nhật)',
      category: 'Bia & Đồ uống có cồn',
      baseUnit: 'Lon',
      packagingSpec: '24 lon / thùng',
      costPrice: 11800,
      basePrice: 15500,
      conversionUnit: 'Thùng (24 lon)',
      conversionFactor: 24,
      unitBarcode: '8934567010035'
    },
    {
      sku: 'WATER-AQF-500', // SẢN PHẨM MỚI HỢP LỆ
      name: 'Nước Tinh Khiết Aquafina Chai 500ml',
      category: 'Nước giải khát & Trà',
      baseUnit: 'Chai',
      packagingSpec: '24 chai / thùng',
      costPrice: 4000,
      basePrice: 6000,
      conversionUnit: 'Thùng (24 chai)',
      conversionFactor: 24,
      unitBarcode: '8934567890123'
    },
    {
      sku: 'SNACK-OMACHI', // DÒNG LỖI: Thiếu tên sản phẩm & ĐVT
      name: '',
      category: 'Thực phẩm & Ăn liền',
      baseUnit: '',
      packagingSpec: '30 gói / thùng',
      costPrice: 6500,
      basePrice: 8500,
      conversionUnit: 'Thùng',
      conversionFactor: 30,
      unitBarcode: '8934561239999'
    },
    {
      sku: 'OIL-TUONGAN-1L', // DÒNG LỖI: Giá bán âm (-50000) & Hệ số quy đổi bằng 0
      name: 'Dầu Ăn Tường An Cooking Oil Chai 1L',
      category: 'Gia vị & Dầu thực vật',
      baseUnit: 'Chai',
      packagingSpec: '12 chai / thùng',
      costPrice: 38000,
      basePrice: -50000,
      conversionUnit: 'Thùng',
      conversionFactor: 0,
      unitBarcode: '8934561238888'
    },
    {
      sku: '', // DÒNG LỖI: Thiếu SKU
      name: 'Nước Tăng Lực Sting Dâu 330ml',
      category: 'Nước giải khát & Trà',
      baseUnit: 'Chai',
      packagingSpec: '24 chai / thùng',
      costPrice: 6500,
      basePrice: 10000,
      conversionUnit: 'Thùng',
      conversionFactor: 24,
      unitBarcode: '8934561237777'
    },
    {
      sku: 'SNACK-BIMBIM-OISHI', // SẢN PHẨM MỚI HỢP LỆ KÈM CẢNH BÁO GIÁ
      name: 'Snack Bắp Ngọt Oishi Gói 40g',
      category: 'Thực phẩm & Ăn liền',
      baseUnit: 'Gói',
      packagingSpec: '20 gói / dây',
      costPrice: 5000,
      basePrice: 4800, // Cảnh báo: Giá bán < Giá vốn
      conversionUnit: 'Dây (20 gói)',
      conversionFactor: 20,
      unitBarcode: '8934561236666'
    }
  ];

  return validateExcelImportData(demoRaw);
}
