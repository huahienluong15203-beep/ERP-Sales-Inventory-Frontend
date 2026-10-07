/**
 * S2-08 / SCRUM-44 / SCRUM-77: Dịch vụ Nhập danh mục sản phẩm hàng loạt từ Excel
 * Phân hệ: EP-02: Sản phẩm & Bảng giá
 *
 * Kết nối trực tiếp với 3 API Spring Boot Backend tối ưu cho 5.000 SKU:
 * 1. downloadProductExcelTemplate: GET /api/products/import/template (Tải tệp mẫu chuẩn 2 sheet kèm hướng dẫn).
 * 2. parseProductExcelFile: POST /api/products/import/preview (Xem trước, kiểm tra lỗi và phân loại CREATE/UPDATE).
 * 3. executeProductImport: POST /api/products/import/execute (Nhập danh mục sản phẩm theo batch 500 records trong 1 transaction).
 */

import { API_BASE_URL, getStoredToken } from './api';
import type { Product, ProductStatus } from '../types/product';
import type {
  ProductImportPreviewResponse,
  ProductImportSummaryResponse,
  ImportAnalysisSummary,
  ImportExecutionResult,
  ProductImportRow
} from '../types/productImport';

/**
 * Helper gọi API có gắn token xác thực
 */
async function importSafeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

/**
 * 1. Tải về tệp mẫu Excel chuẩn hóa từ máy chủ Backend (GET /api/products/import/template)
 */
export async function downloadProductExcelTemplate(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await importSafeFetch(`${API_BASE_URL}/api/products/import/template`, {
      method: 'GET'
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mau_Nhap_SanPham_ERP.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    } else {
      const err = await res.json().catch(() => null);
      return { success: false, message: err?.message || 'Không thể tải tệp mẫu từ máy chủ.' };
    }
  } catch (err: unknown) {
    console.error('Lỗi khi tải tệp mẫu sản phẩm:', err);
    return { success: false, message: 'Lỗi kết nối máy chủ khi tải tệp mẫu.' };
  }
}

/**
 * 2. Gửi tệp Excel lên Backend để xem trước và kiểm tra hợp lệ từng dòng (POST /api/products/import/preview)
 * Phân loại chính xác CREATE cho SKU mới và UPDATE cho SKU đã có trên DB.
 */
export async function parseProductExcelFile(
  file: File,
  existingProducts: Product[] = []
): Promise<ImportAnalysisSummary> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await importSafeFetch(`${API_BASE_URL}/api/products/import/preview`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Không thể xem trước tệp Excel. Vui lòng kiểm tra lại định dạng tệp!');
  }

  const data: ProductImportPreviewResponse = await res.json();

  // Tạo map tra cứu sản phẩm hiện tại để hiển thị các trường thay đổi (nếu có)
  const existingMap = new Map<string, Product>();
  existingProducts.forEach((p) => existingMap.set(p.sku.toUpperCase().trim(), p));

  const mappedRows: ProductImportRow[] = data.rows.map((r) => {
    const existing = existingMap.get(r.sku.toUpperCase().trim());
    const changedFields: string[] = [];

    const isRowUpdate = r.action === 'UPDATE' || Boolean(r.isUpdate) || Boolean((r as any).update);

    if (existing && isRowUpdate) {
      if (existing.name !== r.name) changedFields.push('Tên sản phẩm');
      if (r.category && existing.category !== r.category) changedFields.push('Nhóm hàng');
      if (existing.baseUnit !== r.baseUnit) changedFields.push('ĐVT');
      if (r.packaging && existing.packagingSpec !== r.packaging) changedFields.push('Quy cách');
      if (r.costPrice != null && existing.costPrice !== r.costPrice) changedFields.push('Giá vốn');
      if (r.status && existing.status !== r.status) changedFields.push('Trạng thái');
    }

    return {
      rowNumber: r.rowNumber,
      sku: r.sku,
      name: r.name,
      category: r.category || 'Chưa phân loại',
      baseUnit: r.baseUnit,
      packagingSpec: r.packaging || '',
      costPrice: r.costPrice != null ? r.costPrice : 0,
      barcode: r.barcode || '',
      status: (r.status as ProductStatus) || 'ACTIVE',
      description: r.description || '',
      action: !r.valid ? 'ERROR' : isRowUpdate ? 'UPDATE' : 'CREATE',
      isValid: r.valid,
      errors: r.errors || [],
      existingProduct: existing,
      changedFields
    };
  });

  return {
    fileName: file.name,
    fileSize: file.size,
    totalRows: data.totalRows,
    validCount: data.validRows,
    createCount: data.createCount,
    updateCount: data.updateCount,
    errorCount: data.invalidRows,
    rows: mappedRows
  };
}

/**
 * 3. Thực thi nhập danh mục sản phẩm hàng loạt qua Backend API (POST /api/products/import/execute)
 * Xử lý lưu Batch 500 records trong 1 Transaction, hỗ trợ mượt mà lên tới 5.000 SKU.
 */
export async function executeProductImport(
  file: File
): Promise<ImportExecutionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await importSafeFetch(`${API_BASE_URL}/api/products/import/execute`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return {
      success: false,
      message: err?.message || 'Lỗi khi thực thi nhập dữ liệu vào hệ thống!',
      totalImported: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedErrorCount: 0
    };
  }

  const data: ProductImportSummaryResponse = await res.json();

  return {
    success: true,
    message: data.message,
    totalImported: data.successCount,
    createdCount: data.createdCount,
    updatedCount: data.updatedCount,
    skippedErrorCount: data.errorCount,
    errorRows: (data.errorRows || []).map((r) => ({
      rowNumber: r.rowNumber,
      sku: r.sku || '',
      name: r.name || '',
      errors: r.errors || []
    }))
  };
}
