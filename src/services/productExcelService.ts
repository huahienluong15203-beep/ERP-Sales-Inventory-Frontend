/**
 * S2-08 / SCRUM-44 / SCRUM-77: Dịch vụ Nhập danh mục sản phẩm hàng loạt từ Excel
 * Phân hệ: EP-02: Sản phẩm & Bảng giá
 *
 * Tính năng chính:
 * 1. downloadProductExcelTemplate: Xuất file Excel mẫu chuẩn (.xlsx) có sẵn dữ liệu ví dụ và sheet hướng dẫn.
 * 2. parseProductExcelFile: Phân tích file tải lên, kiểm tra lỗi từng dòng (row-by-row validation).
 * 3. Phân loại thông minh:
 *    - SKU mới -> Gắn cờ 'CREATE' (Tạo mới).
 *    - SKU đã có trên hệ thống -> Gắn cờ 'UPDATE' (Cập nhật), so sánh các trường thay đổi.
 *    - Dữ liệu thiếu/sai -> Gắn cờ 'ERROR' và ghi rõ lý do lỗi.
 * 4. executeProductImport: Lưu sản phẩm vào hệ thống.
 */

import * as XLSX from 'xlsx';
import type { Product, ProductStatus } from '../types/product';
import type {
  ProductImportRow,
  ImportAnalysisSummary,
  ImportExecutionResult,
  ImportExecutionOptions
} from '../types/productImport';
import {
  productService,
  PRODUCT_CATEGORIES,
  COMMON_BASE_UNITS
} from './productService';

/**
 * 1. Tải về tệp mẫu Excel chuẩn hóa
 */
export function downloadProductExcelTemplate(): void {
  // Sheet 1: Dữ liệu mẫu
  const sampleData = [
    {
      'Mã SKU (*)': 'SP-COCA-LON-330',
      'Tên sản phẩm (*)': 'Nước ngọt Coca-Cola Lon 330ml',
      'Nhóm hàng (*)': 'Nước giải khát',
      'ĐVT cơ sở (*)': 'Lon',
      'Quy cách đóng gói': 'Thùng 24 lon (4 lốc x 6 lon)',
      'Giá vốn (VND)': 215000,
      'Trạng thái': 'Đang kinh doanh'
    },
    {
      'Mã SKU (*)': 'SP-PEPSI-ZERO-330',
      'Tên sản phẩm (*)': 'Nước ngọt Pepsi Không Calo Lon 330ml',
      'Nhóm hàng (*)': 'Nước giải khát',
      'ĐVT cơ sở (*)': 'Lon',
      'Quy cách đóng gói': 'Thùng 24 lon',
      'Giá vốn (VND)': 210000,
      'Trạng thái': 'Đang kinh doanh'
    },
    {
      'Mã SKU (*)': 'SP-TH-MILK-1L',
      'Tên sản phẩm (*)': 'Sữa tươi tiệt trùng nguyên chất TH True Milk 1L',
      'Nhóm hàng (*)': 'Sữa & Sản phẩm từ sữa',
      'ĐVT cơ sở (*)': 'Hộp',
      'Quy cách đóng gói': 'Thùng 12 hộp 1 lít',
      'Giá vốn (VND)': 340000,
      'Trạng thái': 'Đang kinh doanh'
    },
    {
      'Mã SKU (*)': 'SP-NEPTUNE-1L',
      'Tên sản phẩm (*)': 'Dầu ăn thượng hạng Neptune Gold Chai 1L',
      'Nhóm hàng (*)': 'Gia vị & Thực phẩm',
      'ĐVT cơ sở (*)': 'Chai',
      'Quy cách đóng gói': 'Thùng 12 chai 1 lít',
      'Giá vốn (VND)': 510000,
      'Trạng thái': 'Đang kinh doanh'
    },
    {
      'Mã SKU (*)': 'SP-OMACHI-BO',
      'Tên sản phẩm (*)': 'Mì khoai tây Omachi xốt bò hầm gói 80g',
      'Nhóm hàng (*)': 'Thực phẩm khô & Ăn liền',
      'ĐVT cơ sở (*)': 'Gói',
      'Quy cách đóng gói': 'Thùng 30 gói',
      'Giá vốn (VND)': 235000,
      'Trạng thái': 'Đang kinh doanh'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Định dạng độ rộng cột cho đẹp mắt
  ws['!cols'] = [
    { wch: 22 }, // Mã SKU
    { wch: 45 }, // Tên sản phẩm
    { wch: 26 }, // Nhóm hàng
    { wch: 15 }, // ĐVT cơ sở
    { wch: 32 }, // Quy cách
    { wch: 18 }, // Giá vốn
    { wch: 18 }  // Trạng thái
  ];

  // Sheet 2: Danh mục tham chiếu & Hướng dẫn
  const instructionData = [
    { 'Mục': 'Cột bắt buộc (*)', 'Quy định': 'Mã SKU, Tên sản phẩm, Nhóm hàng, ĐVT cơ sở không được để trống.' },
    { 'Mục': 'Mã SKU', 'Quy định': 'Ký tự chữ in hoa, số và dấu gạch nối (Ví dụ: SP-BIA-HN-330). Không chứa khoảng trắng.' },
    { 'Mục': 'SKU đã tồn tại', 'Quy định': 'Hệ thống sẽ tự động cập nhật thông tin mới nhất thay vì báo lỗi trùng mã.' },
    { 'Mục': 'Giá vốn (VND)', 'Quy định': 'Nhập số nguyên dương không âm. Ví dụ: 250000 (không kèm chữ đ hay dấu chấm/phẩy).' },
    { 'Mục': 'Nhóm hàng hợp lệ', 'Quy định': PRODUCT_CATEGORIES.join(' | ') },
    { 'Mục': 'ĐVT cơ sở gợi ý', 'Quy định': COMMON_BASE_UNITS.join(', ') },
    { 'Mục': 'Trạng thái', 'Quy định': '"Đang kinh doanh" (hoặc ACTIVE) | "Ngừng kinh doanh" (hoặc INACTIVE)' }
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructionData);
  wsInstructions['!cols'] = [{ wch: 25 }, { wch: 80 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Muc_San_Pham');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Huong_Dan_Nhap_Lieu');

  XLSX.writeFile(wb, 'Mau_Nhap_Danh_Muc_San_Pham_ERP.xlsx');
}

/**
 * 2. Phân tích file Excel và kiểm tra lỗi từng dòng
 */
export async function parseProductExcelFile(
  file: File,
  existingProducts: Product[]
): Promise<ImportAnalysisSummary> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Đọc sheet đầu tiên
  const firstSheetName = wb.SheetNames[0];
  const worksheet = wb.Sheets[firstSheetName];

  // Chuyển sheet sang dạng mảng object
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: ''
  });

  const parsedRows: ProductImportRow[] = [];
  const existingSkuMap = new Map<string, Product>();
  existingProducts.forEach((p) => existingSkuMap.set(p.sku.toUpperCase().trim(), p));

  const seenSkusInFile = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Dòng 1 là Header trong Excel

    // Tìm trường theo các biến thể tên cột
    const rawSku = String(
      row['Mã SKU (*)'] || row['Mã SKU'] || row['SKU'] || row['Mã sản phẩm'] || row['Mã SP'] || ''
    ).trim();

    const rawName = String(
      row['Tên sản phẩm (*)'] || row['Tên sản phẩm'] || row['Tên SP'] || row['Tên'] || ''
    ).trim();

    const rawCategory = String(
      row['Nhóm hàng (*)'] || row['Nhóm hàng'] || row['Ngành hàng'] || row['Danh mục'] || ''
    ).trim();

    const rawBaseUnit = String(
      row['ĐVT cơ sở (*)'] || row['ĐVT cơ sở'] || row['Đơn vị tính cơ sở'] || row['Đơn vị tính'] || row['ĐVT'] || ''
    ).trim();

    const rawPackagingSpec = String(
      row['Quy cách đóng gói'] || row['Quy cách'] || row['Đóng gói'] || ''
    ).trim();

    const rawCostPrice = row['Giá vốn (VND)'] ?? row['Giá vốn'] ?? row['Giá nhập'] ?? 0;
    const rawStatus = String(row['Trạng thái'] || row['Tình trạng'] || 'Đang kinh doanh').trim();

    const errors: string[] = [];

    // Kiểm tra SKU
    if (!rawSku) {
      errors.push('Mã SKU không được để trống.');
    } else if (/\s/.test(rawSku)) {
      errors.push('Mã SKU không được chứa khoảng trắng.');
    }

    const normalizedSku = rawSku.toUpperCase();

    // Kiểm tra trùng lặp SKU trong chính file này
    if (normalizedSku) {
      if (seenSkusInFile.has(normalizedSku)) {
        errors.push(`Mã SKU [${normalizedSku}] bị trùng lặp nhiều lần trong file.`);
      } else {
        seenSkusInFile.add(normalizedSku);
      }
    }

    // Kiểm tra Tên sản phẩm
    if (!rawName) {
      errors.push('Tên sản phẩm không được để trống.');
    }

    // Kiểm tra ĐVT cơ sở
    if (!rawBaseUnit) {
      errors.push('Đơn vị tính cơ sở không được để trống.');
    }

    // Kiểm tra Nhóm hàng
    let matchedCategory = rawCategory;
    if (!rawCategory) {
      errors.push('Nhóm hàng không được để trống.');
    } else {
      // Tìm nhóm hàng gần đúng nhất
      const foundCat = PRODUCT_CATEGORIES.find(
        (c) => c.toLowerCase() === rawCategory.toLowerCase()
      );
      if (foundCat) {
        matchedCategory = foundCat;
      }
    }

    // Kiểm tra Giá vốn
    let parsedCostPrice = 0;
    if (typeof rawCostPrice === 'number') {
      parsedCostPrice = rawCostPrice;
    } else {
      const cleaned = String(rawCostPrice).replace(/[^0-9.-]+/g, '');
      parsedCostPrice = parseFloat(cleaned) || 0;
    }

    if (parsedCostPrice < 0) {
      errors.push('Giá vốn không được là số âm.');
    }

    // Chuẩn hóa trạng thái
    let status: ProductStatus = 'ACTIVE';
    const lowerStatus = rawStatus.toLowerCase();
    if (
      lowerStatus.includes('ngừng') ||
      lowerStatus.includes('dừng') ||
      lowerStatus.includes('inactive') ||
      lowerStatus.includes('tạm ngừng')
    ) {
      status = 'INACTIVE';
    }

    // Kiểm tra tồn tại trên hệ thống
    const existing = normalizedSku ? existingSkuMap.get(normalizedSku) : undefined;
    let action: 'CREATE' | 'UPDATE' | 'ERROR' = 'CREATE';
    const changedFields: string[] = [];

    if (errors.length > 0) {
      action = 'ERROR';
    } else if (existing) {
      action = 'UPDATE';
      // So sánh các trường thay đổi
      if (existing.name !== rawName) changedFields.push('Tên sản phẩm');
      if (existing.category !== matchedCategory) changedFields.push('Nhóm hàng');
      if (existing.baseUnit !== rawBaseUnit) changedFields.push('ĐVT');
      if (existing.packagingSpec !== rawPackagingSpec) changedFields.push('Quy cách');
      if (existing.costPrice !== parsedCostPrice) changedFields.push('Giá vốn');
      if (existing.status !== status) changedFields.push('Trạng thái');
    } else {
      action = 'CREATE';
    }

    parsedRows.push({
      rowNumber,
      sku: normalizedSku || '(Trống SKU)',
      name: rawName || '(Trống Tên)',
      category: matchedCategory || 'Khác',
      baseUnit: rawBaseUnit || 'Đơn vị',
      packagingSpec: rawPackagingSpec || '',
      costPrice: parsedCostPrice,
      status,
      action,
      isValid: errors.length === 0,
      errors,
      existingProduct: existing,
      changedFields
    });
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const createCount = parsedRows.filter((r) => r.action === 'CREATE').length;
  const updateCount = parsedRows.filter((r) => r.action === 'UPDATE').length;
  const errorCount = parsedRows.filter((r) => r.action === 'ERROR').length;

  return {
    fileName: file.name,
    fileSize: file.size,
    totalRows: parsedRows.length,
    validCount,
    createCount,
    updateCount,
    errorCount,
    rows: parsedRows
  };
}

/**
 * 3. Thực thi nhập danh mục sản phẩm vào hệ thống
 */
export async function executeProductImport(
  rows: ProductImportRow[],
  options: ImportExecutionOptions = { skipErrors: true, overwriteExisting: true }
): Promise<ImportExecutionResult> {
  const eligibleRows = rows.filter((r) => {
    if (!r.isValid) {
      return false; // Bỏ qua dòng lỗi
    }
    if (r.action === 'UPDATE' && !options.overwriteExisting) {
      return false; // Người dùng không cho phép ghi đè
    }
    return true;
  });

  if (eligibleRows.length === 0) {
    return {
      success: false,
      message: 'Không có dòng dữ liệu hợp lệ nào để nhập vào hệ thống!',
      totalImported: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedErrorCount: rows.filter((r) => !r.isValid).length
    };
  }

  // Lấy danh sách sản phẩm hiện tại
  const { products: currentProducts } = await productService.getProducts({ pageSize: 10000 });
  const productMap = new Map<string, Product>();
  currentProducts.forEach((p) => productMap.set(p.sku.toUpperCase().trim(), p));

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of eligibleRows) {
    const existing = productMap.get(row.sku);

    if (existing && options.overwriteExisting) {
      // Cập nhật sản phẩm
      const updated: Product = {
        ...existing,
        name: row.name,
        category: row.category as Product['category'],
        baseUnit: row.baseUnit,
        packagingSpec: row.packagingSpec,
        costPrice: row.costPrice,
        status: row.status,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      await productService.updateProduct(existing.id, updated);
      updatedCount++;
    } else if (!existing) {
      // Thêm mới sản phẩm
      await productService.createProduct({
        sku: row.sku,
        name: row.name,
        category: row.category as Product['category'],
        baseUnit: row.baseUnit,
        packagingSpec: row.packagingSpec,
        costPrice: row.costPrice,
        imageUrl: '',
        status: row.status
      });
      createdCount++;
    }
  }

  const skippedErrorCount = rows.length - (createdCount + updatedCount);

  return {
    success: true,
    message: `Nhập thành công ${createdCount + updatedCount} sản phẩm (Thêm mới: ${createdCount}, Cập nhật: ${updatedCount}${
      skippedErrorCount > 0 ? `, Bỏ qua: ${skippedErrorCount} dòng lỗi` : ''
    }).`,
    totalImported: createdCount + updatedCount,
    createdCount,
    updatedCount,
    skippedErrorCount
  };
}
