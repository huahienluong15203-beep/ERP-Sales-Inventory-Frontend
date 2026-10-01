import type { Product, UnitConversion, ExcelImportRow, ProductStatus } from '../types/product';

const STORAGE_KEY = 'erp_products_catalog';

// Dữ liệu mẫu chuẩn ngành FMCG & Tiêu dùng nhanh (Đồng bộ toàn bộ công ty)
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'BEER-TIGER-CAN-330',
    name: 'Bia Tiger Nâu Lon 330ml',
    category: 'Bia & Đồ uống có cồn',
    baseUnit: 'Lon',
    packagingSpec: '24 lon / thùng (4 lốc x 6 lon)',
    costPrice: 285000, // Giá vốn theo đơn vị thùng quy đổi (11.875đ/lon)
    imageUrl: 'https://images.unsplash.com/photo-1608270192799-59e8f8b809a7?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    categoryId: 'cat-beer-can',
    transactionCount: 42, // Đã phát sinh 42 giao dịch xuất/nhập/đơn hàng -> KHÔNG ĐƯỢC XÓA
    unitConversions: [
      {
        id: 'conv-101',
        unitName: 'Thùng',
        conversionFactor: 24,
        operator: 'MULTIPLY',
        barcode: '8934822110245',
        sellingPrice: 385000,
        isDefaultSalesUnit: true,
        note: 'Quy cách chuẩn xuất kho bán buôn'
      },
      {
        id: 'conv-102',
        unitName: 'Lốc',
        conversionFactor: 6,
        operator: 'MULTIPLY',
        barcode: '8934822110061',
        sellingPrice: 100000,
        isDefaultSalesUnit: false,
        note: 'Bán lẻ & Khuyến mại'
      }
    ],
    createdAt: '2026-09-20T08:00:00Z',
    updatedAt: '2026-09-25T10:30:00Z'
  },
  {
    id: 'prod-002',
    sku: 'BEER-HEINEKEN-CAN-330',
    name: 'Bia Heineken Silver Lon 330ml',
    category: 'Bia & Đồ uống có cồn',
    categoryId: 'cat-beer-can',
    transactionCount: 28, // Đã phát sinh 28 giao dịch -> KHÔNG ĐƯỢC XÓA
    baseUnit: 'Lon',
    packagingSpec: '24 lon / thùng',
    costPrice: 345000,
    imageUrl: 'https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    unitConversions: [
      {
        id: 'conv-201',
        unitName: 'Thùng',
        conversionFactor: 24,
        operator: 'MULTIPLY',
        barcode: '8934822220241',
        sellingPrice: 440000,
        isDefaultSalesUnit: true,
        note: 'Đóng thùng niêm phong'
      },
      {
        id: 'conv-202',
        unitName: 'Lốc',
        conversionFactor: 6,
        operator: 'MULTIPLY',
        barcode: '8934822220067',
        sellingPrice: 115000,
        isDefaultSalesUnit: false,
        note: 'Bán lẻ'
      }
    ],
    createdAt: '2026-09-20T08:30:00Z',
    updatedAt: '2026-09-25T11:00:00Z'
  },
  {
    id: 'prod-003',
    sku: 'MILK-VNM-100-SUGAR-180',
    name: 'Sữa tươi tiệt trùng Vinamilk Có đường 180ml',
    category: 'Sữa & Chế phẩm sữa',
    categoryId: 'cat-fresh-milk',
    transactionCount: 15, // Đã phát sinh 15 giao dịch -> KHÔNG ĐƯỢC XÓA
    baseUnit: 'Hộp',
    packagingSpec: '48 hộp / thùng (12 lốc x 4 hộp)',
    costPrice: 310000,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    unitConversions: [
      {
        id: 'conv-301',
        unitName: 'Thùng',
        conversionFactor: 48,
        operator: 'MULTIPLY',
        barcode: '8934673100482',
        sellingPrice: 395000,
        isDefaultSalesUnit: true,
        note: 'Tiêu chuẩn B2B phân phối đại lý'
      },
      {
        id: 'conv-302',
        unitName: 'Lốc',
        conversionFactor: 4,
        operator: 'MULTIPLY',
        barcode: '8934673100048',
        sellingPrice: 35000,
        isDefaultSalesUnit: false,
        note: 'Bán lẻ siêu thị'
      }
    ],
    createdAt: '2026-09-21T09:00:00Z',
    updatedAt: '2026-09-26T14:15:00Z'
  },
  {
    id: 'prod-004',
    sku: 'BEV-COCA-COLA-CAN-320',
    name: 'Nước ngọt Coca-Cola Nguyên Bản Lon 320ml',
    category: 'Nước ngọt & Giải khát',
    categoryId: 'cat-carbonated',
    transactionCount: 36, // Đã phát sinh 36 giao dịch -> KHÔNG ĐƯỢC XÓA
    baseUnit: 'Lon',
    packagingSpec: '24 lon / thùng (4 lốc x 6 lon)',
    costPrice: 175000,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    unitConversions: [
      {
        id: 'conv-401',
        unitName: 'Thùng',
        conversionFactor: 24,
        operator: 'MULTIPLY',
        barcode: '8935049500249',
        sellingPrice: 235000,
        isDefaultSalesUnit: true,
        note: 'Quy cách thùng phân phối'
      },
      {
        id: 'conv-402',
        unitName: 'Lốc',
        conversionFactor: 6,
        operator: 'MULTIPLY',
        barcode: '8935049500065',
        sellingPrice: 62000,
        isDefaultSalesUnit: false
      }
    ],
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-09-26T15:00:00Z'
  },
  {
    id: 'prod-005',
    sku: 'FOOD-HAOHAO-TOM-CHUA-CAY',
    name: 'Mì Ăn Liền Hảo Hảo Tôm Chua Cay 75g',
    category: 'Thực phẩm chế biến & Mì ăn liền',
    categoryId: 'cat-instant-noodles',
    transactionCount: 50, // Đã phát sinh 50 giao dịch -> KHÔNG ĐƯỢC XÓA
    baseUnit: 'Gói',
    packagingSpec: '30 gói / thùng',
    costPrice: 98000,
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    unitConversions: [
      {
        id: 'conv-501',
        unitName: 'Thùng',
        conversionFactor: 30,
        operator: 'MULTIPLY',
        barcode: '8934563138302',
        sellingPrice: 135000,
        isDefaultSalesUnit: true,
        note: '1 thùng = 30 gói mì cơ sở'
      }
    ],
    createdAt: '2026-09-23T11:00:00Z',
    updatedAt: '2026-09-27T08:30:00Z'
  },
  {
    id: 'prod-006',
    sku: 'COND-CHINSU-NUOC-MAM-500',
    name: 'Nước Mắm Nam Ngư Cá Cơm Tươi Chinsu Chai 500ml',
    category: 'Gia vị & Nước chấm',
    categoryId: 'cat-fish-sauce',
    transactionCount: 19, // Đã phát sinh 19 giao dịch -> KHÔNG ĐƯỢC XÓA
    baseUnit: 'Chai',
    packagingSpec: '15 chai / thùng',
    costPrice: 420000,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    unitConversions: [
      {
        id: 'conv-601',
        unitName: 'Thùng',
        conversionFactor: 15,
        operator: 'MULTIPLY',
        barcode: '8936017361503',
        sellingPrice: 540000,
        isDefaultSalesUnit: true,
        note: 'Quy cách đóng thùng carton'
      }
    ],
    createdAt: '2026-09-24T14:00:00Z',
    updatedAt: '2026-09-28T09:00:00Z'
  },
  {
    id: 'prod-007',
    sku: 'OIL-NEPTUNE-LIGHT-1000',
    name: 'Dầu Ăn Thượng Hạng Neptune Light Chai 1 Lít',
    category: 'Gia vị & Nước chấm',
    categoryId: 'cat-cooking-oil',
    transactionCount: 0, // CHƯA phát sinh giao dịch nào -> ĐƯỢC PHÉP XÓA
    baseUnit: 'Chai',
    packagingSpec: '12 chai / thùng',
    costPrice: 580000,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80',
    status: 'INACTIVE',
    unitConversions: [
      {
        id: 'conv-701',
        unitName: 'Thùng',
        conversionFactor: 12,
        operator: 'MULTIPLY',
        barcode: '8934988010123',
        sellingPrice: 720000,
        isDefaultSalesUnit: true
      }
    ],
    createdAt: '2026-09-24T15:30:00Z',
    updatedAt: '2026-09-28T10:00:00Z'
  }
];

export class ProductService {
  /**
   * Lấy toàn bộ danh sách sản phẩm từ kho lưu trữ
   */
  static async getProducts(): Promise<Product[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Lỗi khi đọc danh mục sản phẩm từ localStorage:', e);
    }
    // Khởi tạo dữ liệu mặc định ban đầu nếu chưa có
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return [...INITIAL_PRODUCTS];
  }

  /**
   * Thêm mới một sản phẩm SKU vào danh mục
   */
  static async createProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    const products = await this.getProducts();

    const normalizedSku = productData.sku.trim().toUpperCase();

    // Kiểm tra trùng mã SKU
    const isDuplicate = products.some(
      (p) => p.sku.trim().toUpperCase() === normalizedSku
    );
    if (isDuplicate) {
      throw new Error(`Mã SKU "${normalizedSku}" đã tồn tại trong danh mục! Vui lòng chọn mã khác.`);
    }

    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      sku: normalizedSku,
      name: productData.name.trim(),
      category: productData.category.trim(),
      baseUnit: productData.baseUnit.trim(),
      packagingSpec: productData.packagingSpec.trim(),
      costPrice: Number(productData.costPrice) || 0,
      status: productData.status || 'ACTIVE',
      unitConversions: productData.unitConversions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.unshift(newProduct);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return newProduct;
  }

  /**
   * Cập nhật thông tin SKU và bảng cài đặt quy đổi đơn vị
   */
  static async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const products = await this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy sản phẩm cần cập nhật!');
    }

    if (updates.sku) {
      const normalizedSku = updates.sku.trim().toUpperCase();
      const isDuplicate = products.some(
        (p) => p.id !== id && p.sku.trim().toUpperCase() === normalizedSku
      );
      if (isDuplicate) {
        throw new Error(`Mã SKU "${normalizedSku}" đã được sử dụng bởi sản phẩm khác!`);
      }
      updates.sku = normalizedSku;
    }

    const updatedProduct: Product = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    products[index] = updatedProduct;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return updatedProduct;
  }

  /**
   * Xóa sản phẩm khỏi danh mục
   * QUY TẮC NGHIỆP VỤ: Sản phẩm đã phát sinh giao dịch thì KHÔNG ĐƯỢC XÓA, chỉ ngừng kinh doanh!
   */
  static async deleteProduct(id: string): Promise<boolean> {
    const products = await this.getProducts();
    const product = products.find((p) => p.id === id);
    if (!product) {
      return false;
    }

    if (product.transactionCount && product.transactionCount > 0) {
      throw new Error(
        `Sản phẩm "${product.name}" (${product.sku}) đã phát sinh ${product.transactionCount} giao dịch thực tế trong hệ thống! Quy định hệ thống: Không thể xóa sản phẩm đã có giao dịch, chỉ được phép chuyển sang trạng thái "Ngừng kinh doanh".`
      );
    }

    const filtered = products.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  /**
   * Chuyển trạng thái sản phẩm sang Ngừng kinh doanh (INACTIVE) khi không thể xóa
   */
  static async deactivateProduct(id: string): Promise<Product> {
    return this.updateProduct(id, { status: 'INACTIVE' });
  }

  /**
   * Chuyển sản phẩm sang nhóm hàng khác
   */
  static async moveProductToCategory(
    productId: string,
    targetCategoryId: string,
    targetCategoryName: string
  ): Promise<Product> {
    return this.updateProduct(productId, {
      categoryId: targetCategoryId,
      category: targetCategoryName
    });
  }

  /**
   * KIỂM TRA & BÁO LỖI TỪNG DÒNG KHI IMPORT FILE EXCEL SẢN PHẨM
   * Trả về danh sách chi tiết kèm lỗi từng dòng và trạng thái hợp lệ.
   */
  static validateExcelImportRows(
    rows: Array<Record<string, any>>,
    existingProducts: Product[]
  ): ExcelImportRow[] {
    const existingSkuSet = new Set(existingProducts.map((p) => p.sku.trim().toUpperCase()));
    const fileSkuTracker = new Map<string, number>(); // Lưu vết SKU trong file để báo trùng giữa các dòng trong cùng 1 file

    return rows.map((raw, index) => {
      const rowNumber = raw.rowNumber || index + 2; // Dòng 1 thường là tiêu đề cột
      const sku = String(raw.sku || raw['Mã SKU'] || '').trim().toUpperCase();
      const name = String(raw.name || raw['Tên sản phẩm'] || raw['Tên hàng'] || '').trim();
      const category = String(raw.category || raw['Nhóm hàng'] || raw['Ngành hàng'] || '').trim();
      const baseUnit = String(raw.baseUnit || raw['ĐVT cơ sở'] || raw['Đơn vị tính cơ sở'] || '').trim();
      const packagingSpec = String(raw.packagingSpec || raw['Quy cách đóng gói'] || raw['Quy cách'] || '').trim();
      const rawCostPrice = raw.costPrice ?? raw['Giá vốn'] ?? raw['Giá nhập'];
      const imageUrl = String(raw.imageUrl || raw['Ảnh'] || raw['Hình ảnh'] || '').trim();
      const statusRaw = String(raw.status || raw['Trạng thái'] || 'ACTIVE').trim().toUpperCase();
      const conversionsText = String(raw.conversionsText || raw['Quy đổi đơn vị'] || '').trim();

      const errors: string[] = [];

      // 1. Kiểm tra Mã SKU
      if (!sku) {
        errors.push('Mã SKU không được để trống.');
      } else if (sku.length < 3) {
        errors.push('Mã SKU quá ngắn (tối thiểu 3 ký tự).');
      } else if (!/^[A-Z0-9_\-]+$/.test(sku)) {
        errors.push('Mã SKU chỉ được chứa chữ in hoa, số và dấu gạch nối (- hoặc _).');
      } else if (existingSkuSet.has(sku)) {
        errors.push(`Mã SKU "${sku}" đã tồn tại trên hệ thống.`);
      } else if (fileSkuTracker.has(sku)) {
        errors.push(`Mã SKU bị trùng lặp với dòng ${fileSkuTracker.get(sku)} trong cùng file.`);
      } else {
        fileSkuTracker.set(sku, rowNumber);
      }

      // 2. Kiểm tra Tên sản phẩm
      if (!name) {
        errors.push('Tên sản phẩm không được để trống.');
      } else if (name.length < 4) {
        errors.push('Tên sản phẩm phải có ít nhất 4 ký tự.');
      }

      // 3. Kiểm tra Nhóm hàng
      if (!category) {
        errors.push('Nhóm hàng không được để trống.');
      }

      // 4. Kiểm tra Đơn vị tính cơ sở (Base Unit Rule)
      if (!baseUnit) {
        errors.push('Đơn vị tính cơ sở bắt buộc phải khai báo (Lon, Chai, Hộp, Gói...).');
      }

      // 5. Kiểm tra Quy cách đóng gói
      if (!packagingSpec) {
        errors.push('Vui lòng khai báo quy cách đóng gói (vd: 24 lon/thùng).');
      }

      // 6. Kiểm tra Giá vốn
      let costPriceNumber = 0;
      if (rawCostPrice === undefined || rawCostPrice === null || rawCostPrice === '') {
        errors.push('Giá vốn không được để trống.');
      } else {
        const parsed = Number(String(rawCostPrice).replace(/[^0-9.-]+/g, ''));
        if (isNaN(parsed) || parsed < 0) {
          errors.push('Giá vốn phải là số dương hợp lệ (>= 0 đ).');
        } else {
          costPriceNumber = parsed;
        }
      }

      // 7. Chuẩn hóa trạng thái
      let validStatus: ProductStatus = 'ACTIVE';
      if (statusRaw.includes('NGƯNG') || statusRaw === 'INACTIVE' || statusRaw === 'TAM_NGUNG') {
        validStatus = 'INACTIVE';
      } else if (statusRaw.includes('HẾT') || statusRaw === 'OUT_OF_STOCK' || statusRaw === 'HET_HANG') {
        validStatus = 'OUT_OF_STOCK';
      }

      return {
        rowNumber,
        sku,
        name,
        category,
        baseUnit,
        packagingSpec,
        costPrice: costPriceNumber,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
        status: validStatus,
        conversionsText,
        isValid: errors.length === 0,
        errors
      };
    });
  }

  /**
   * Lưu các dòng hợp lệ vào cơ sở dữ liệu
   */
  static async importProducts(validRows: ExcelImportRow[]): Promise<{ count: number; products: Product[] }> {
    const products = await this.getProducts();
    const importedProducts: Product[] = [];

    for (const row of validRows) {
      if (!row.isValid) continue;

      // Phân tích chuỗi quy đổi nếu có (vd: "Thùng:24, Lốc:6")
      const unitConversions: UnitConversion[] = [];
      if (row.conversionsText) {
        const parts = row.conversionsText.split(/[,;]/);
        parts.forEach((p, idx) => {
          const [uName, factorStr] = p.split(/[:=]/).map((s) => s.trim());
          const factor = Number(factorStr);
          if (uName && !isNaN(factor) && factor > 0) {
            unitConversions.push({
              id: `conv-imp-${Date.now()}-${idx}`,
              unitName: uName,
              conversionFactor: factor,
              operator: 'MULTIPLY',
              isDefaultSalesUnit: idx === 0,
              note: `Quy đổi 1 ${uName} = ${factor} ${row.baseUnit}`
            });
          }
        });
      }

      // Nếu không nhập quy đổi, tự động tạo 1 đơn vị quy đổi Thùng nếu quy cách có số
      if (unitConversions.length === 0 && row.packagingSpec) {
        const match = row.packagingSpec.match(/(\d+)\s*(lon|chai|hộp|gói|cái)/i);
        const factor = match ? Number(match[1]) : 24;
        unitConversions.push({
          id: `conv-auto-${Date.now()}`,
          unitName: 'Thùng',
          conversionFactor: factor,
          operator: 'MULTIPLY',
          isDefaultSalesUnit: true,
          note: `Tự động tạo theo quy cách ${row.packagingSpec}`
        });
      }

      const newProduct: Product = {
        id: `prod-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sku: row.sku,
        name: row.name,
        category: row.category,
        baseUnit: row.baseUnit,
        packagingSpec: row.packagingSpec,
        costPrice: Number(row.costPrice) || 0,
        imageUrl: row.imageUrl,
        status: (row.status as ProductStatus) || 'ACTIVE',
        unitConversions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      importedProducts.push(newProduct);
    }

    const updatedCatalog = [...importedProducts, ...products];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCatalog));

    return {
      count: importedProducts.length,
      products: updatedCatalog
    };
  }

  /**
   * Tạo bộ dữ liệu mẫu kiểm thử Import Excel (Có sẵn cả dòng hợp lệ và dòng lỗi để demo kiểm thử ngay)
   */
  static getSampleImportExcelData(): Array<Record<string, any>> {
    return [
      {
        rowNumber: 2,
        sku: 'BEER-CORONA-EXTRA-355',
        name: 'Bia Corona Extra Chai Thủy Tinh 355ml',
        category: 'Bia & Đồ uống có cồn',
        baseUnit: 'Chai',
        packagingSpec: '24 chai / thùng (4 lốc x 6 chai)',
        costPrice: 620000,
        imageUrl: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=300&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        conversionsText: 'Thùng:24, Lốc:6'
      },
      {
        rowNumber: 3,
        sku: 'BEER-TIGER-CAN-330', // LỖI 1: Trùng SKU đã có trong hệ thống
        name: 'Bia Tiger Nâu Lon 330ml Nhập Lại',
        category: 'Bia & Đồ uống có cồn',
        baseUnit: 'Lon',
        packagingSpec: '24 lon / thùng',
        costPrice: 280000,
        imageUrl: '',
        status: 'ACTIVE',
        conversionsText: 'Thùng:24'
      },
      {
        rowNumber: 4,
        sku: 'BEV-PEPSI-ZERO-CAN-320',
        name: 'Nước Ngọt Pepsi Không Calo Lon 320ml',
        category: 'Nước ngọt & Giải khát',
        baseUnit: 'Lon',
        packagingSpec: '24 lon / thùng',
        costPrice: 170000,
        imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        conversionsText: 'Thùng:24, Lốc:6'
      },
      {
        rowNumber: 5,
        sku: '', // LỖI 2: Thiếu mã SKU
        name: 'Bánh Quy Bơ Danisa Hộp Thiếc 454g',
        category: 'Bánh kẹo & Đồ ăn vặt',
        baseUnit: 'Hộp',
        packagingSpec: '12 hộp / thùng',
        costPrice: 1450000,
        imageUrl: '',
        status: 'ACTIVE',
        conversionsText: 'Thùng:12'
      },
      {
        rowNumber: 6,
        sku: 'MILK-TH-TRUE-MILK-LESS-180',
        name: 'Sữa Tươi Tiệt Trùng TH True Milk Ít Đường 180ml',
        category: 'Sữa & Chế phẩm sữa',
        baseUnit: 'Hộp',
        packagingSpec: '48 hộp / thùng',
        costPrice: 325000,
        imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        conversionsText: 'Thùng:48, Lốc:4'
      },
      {
        rowNumber: 7,
        sku: 'SNACK-OISHI-TOM-CAY-40G',
        name: 'Bánh Snack Phồng Tôm Cay Oishi 40g',
        category: 'Bánh kẹo & Đồ ăn vặt',
        baseUnit: 'Gói',
        packagingSpec: '80 gói / thùng',
        costPrice: -15000, // LỖI 3: Giá vốn âm (< 0)
        imageUrl: '',
        status: 'ACTIVE',
        conversionsText: 'Thùng:80'
      },
      {
        rowNumber: 8,
        sku: 'WATER-AQUAFINA-500ML',
        name: 'Nước Khoáng Tinh Khiết Aquafina Chai 500ml',
        category: 'Nước ngọt & Giải khát',
        baseUnit: '', // LỖI 4: Thiếu đơn vị tính cơ sở
        packagingSpec: '24 chai / thùng',
        costPrice: 85000,
        imageUrl: '',
        status: 'ACTIVE',
        conversionsText: 'Thùng:24'
      },
      {
        rowNumber: 9,
        sku: 'BEER-CORONA-EXTRA-355', // LỖI 5: Trùng SKU với dòng 2 trong cùng file
        name: 'Bia Corona Extra (Dòng nhập trùng lặp)',
        category: 'Bia & Đồ uống có cồn',
        baseUnit: 'Chai',
        packagingSpec: '24 chai / thùng',
        costPrice: 620000,
        imageUrl: '',
        status: 'ACTIVE',
        conversionsText: 'Thùng:24'
      }
    ];
  }

  /**
   * Tạo và tải về file mẫu Excel/CSV chuẩn
   */
  static downloadExcelTemplate(): void {
    const headers = [
      'STT',
      'Mã SKU (*)',
      'Tên sản phẩm (*)',
      'Nhóm hàng (*)',
      'ĐVT cơ sở (*)',
      'Quy cách đóng gói (*)',
      'Giá vốn (VNĐ) (*)',
      'Trạng thái',
      'Quy đổi đơn vị (Ví dụ Thùng:24, Lốc:6)'
    ];

    const sampleRows = [
      ['1', 'BEER-TIGER-CRYSTAL-330', 'Bia Tiger Crystal Lon 330ml', 'Bia & Đồ uống có cồn', 'Lon', '24 lon / thùng', '310000', 'ACTIVE', 'Thùng:24, Lốc:6'],
      ['2', 'MILK-DUTCH-LADY-180', 'Sữa Cô Gái Hà Lan Có Đường 180ml', 'Sữa & Chế phẩm sữa', 'Hộp', '48 hộp / thùng', '290000', 'ACTIVE', 'Thùng:48, Lốc:4'],
      ['3', 'OIL-COOKING-SIMPLY-1L', 'Dầu Đậu Nành Simply Chai 1L', 'Gia vị & Nước chấm', 'Chai', '12 chai / thùng', '520000', 'ACTIVE', 'Thùng:12']
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mau_Import_Danh_Muc_SanPham_SKU.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
