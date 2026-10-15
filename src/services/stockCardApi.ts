/**
 * S6-02: Service API Thẻ kho chi tiết (Stock Card)
 * - Truy vấn biến động kho theo thứ tự thời gian từ backend
 * - Lọc theo kho, sản phẩm (SKU), khoảng thời gian và loại nghiệp vụ
 * - Xuất Excel Thẻ kho theo biểu mẫu chuẩn kế toán quản trị kho Việt Nam
 */

import { authFetch, API_BASE_URL } from './api';
import type { StockCardFilterParams, StockCardResponse, StockCardRow } from '../types/stockCard';
import * as XLSX from 'xlsx';

const STOCK_CARD_URL = `${API_BASE_URL}/api/inventory/stock-card`;

/**
 * Gọi API Backend truy vấn Thẻ kho chi tiết (S6-02)
 */
export async function fetchStockCard(params?: StockCardFilterParams): Promise<StockCardResponse> {
  const query = new URLSearchParams();

  if (params?.warehouseId !== undefined && params.warehouseId !== '' && params.warehouseId !== 'ALL') {
    query.set('warehouseId', String(params.warehouseId));
  }
  if (params?.productId !== undefined && params.productId !== '' && params.productId !== 'ALL') {
    query.set('productId', String(params.productId));
  }
  if (params?.fromDate) {
    query.set('fromDate', params.fromDate);
  }
  if (params?.toDate) {
    query.set('toDate', params.toDate);
  }
  if (params?.type && params.type !== 'ALL') {
    query.set('type', params.type.trim());
  }
  if (params?.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params?.size !== undefined) {
    query.set('size', String(params.size));
  }

  const url = `${STOCK_CARD_URL}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await authFetch(url, { method: 'GET' });

  if (!res.ok) {
    let errMsg = `Không thể tải thẻ kho (Mã lỗi: ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.message) {
        errMsg = errorData.message;
      }
      if (errorData?.details && typeof errorData.details === 'object') {
        const detailVals = Object.values(errorData.details);
        if (detailVals.length > 0 && typeof detailVals[0] === 'string') {
          errMsg = detailVals[0];
        }
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errMsg);
  }

  return await res.json();
}

/**
 * Xuất dữ liệu Thẻ kho ra tệp Excel (.xlsx) theo mẫu chuẩn quản trị kho Việt Nam
 */
export function exportStockCardToExcel(
  data: StockCardResponse,
  meta?: {
    warehouseName?: string;
    warehouseCode?: string;
    productName?: string;
    productSku?: string;
    baseUnit?: string;
  }
): void {
  const rows = data.movements?.content || [];
  const fromDate = data.fromDate || '';
  const toDate = data.toDate || '';

  const exportData: Array<Record<string, string | number>> = [];

  // Dòng Tồn đầu kỳ (nếu xem 1 SKU tại 1 kho)
  if (data.openingBalance !== null && data.openingBalance !== undefined) {
    exportData.push({
      STT: '',
      'Thời gian phát sinh': fromDate ? `${fromDate} 00:00:00` : '',
      'Số chứng từ': 'ĐẦU KỲ',
      'Loại nghiệp vụ': 'Số dư đầu kỳ',
      'Kho hàng': meta?.warehouseCode || rows[0]?.warehouseCode || '',
      'Mã SKU': meta?.productSku || rows[0]?.productSku || '',
      'Tên sản phẩm': meta?.productName || rows[0]?.productName || '',
      'Đơn vị tính': meta?.baseUnit || rows[0]?.baseUnit || '',
      'Nhập (+)': '',
      'Xuất (-)': '',
      'Tồn lũy kế': Number(data.openingBalance),
      'Diễn giải / Ghi chú': 'Số dư tồn kho đầu kỳ báo cáo',
      'Người thực hiện': ''
    });
  }

  // Các dòng phát sinh trong kỳ
  rows.forEach((r: StockCardRow, idx: number) => {
    const formattedTime = r.movementAt ? r.movementAt.replace('T', ' ').substring(0, 19) : '';
    exportData.push({
      STT: idx + 1,
      'Thời gian phát sinh': formattedTime,
      'Số chứng từ': r.docCode || '',
      'Loại nghiệp vụ': r.movementTypeLabel || r.movementType,
      'Kho hàng': r.warehouseCode || meta?.warehouseCode || '',
      'Mã SKU': r.productSku || meta?.productSku || '',
      'Tên sản phẩm': r.productName || meta?.productName || '',
      'Đơn vị tính': r.baseUnit || meta?.baseUnit || '',
      'Nhập (+)': Number(r.quantityIn) > 0 ? Number(r.quantityIn) : '',
      'Xuất (-)': Number(r.quantityOut) > 0 ? Number(r.quantityOut) : '',
      'Tồn lũy kế': Number(r.balanceAfter),
      'Diễn giải / Ghi chú': r.note || '',
      'Người thực hiện': r.actorUsername || ''
    });
  });

  // Dòng tổng cộng phát sinh trong kỳ
  exportData.push({
    STT: '',
    'Thời gian phát sinh': '',
    'Số chứng từ': 'TỔNG PHÁT SINH',
    'Loại nghiệp vụ': 'Tổng cộng trong kỳ',
    'Kho hàng': '',
    'Mã SKU': '',
    'Tên sản phẩm': '',
    'Đơn vị tính': meta?.baseUnit || rows[0]?.baseUnit || '',
    'Nhập (+)': data.totalIn !== null && data.totalIn !== undefined ? Number(data.totalIn) : rows.reduce((s, r) => s + Number(r.quantityIn), 0),
    'Xuất (-)': data.totalOut !== null && data.totalOut !== undefined ? Number(data.totalOut) : rows.reduce((s, r) => s + Number(r.quantityOut), 0),
    'Tồn lũy kế': data.closingBalance !== null && data.closingBalance !== undefined ? Number(data.closingBalance) : '',
    'Diễn giải / Ghi chú': `Tổng cộng phát sinh từ ${fromDate} đến ${toDate}`,
    'Người thực hiện': ''
  });

  // Dòng Tồn cuối kỳ
  if (data.closingBalance !== null && data.closingBalance !== undefined) {
    exportData.push({
      STT: '',
      'Thời gian phát sinh': toDate ? `${toDate} 23:59:59` : '',
      'Số chứng từ': 'CUỐI KỲ',
      'Loại nghiệp vụ': 'Số dư cuối kỳ',
      'Kho hàng': meta?.warehouseCode || rows[0]?.warehouseCode || '',
      'Mã SKU': meta?.productSku || rows[0]?.productSku || '',
      'Tên sản phẩm': meta?.productName || rows[0]?.productName || '',
      'Đơn vị tính': meta?.baseUnit || rows[0]?.baseUnit || '',
      'Nhập (+)': '',
      'Xuất (-)': '',
      'Tồn lũy kế': Number(data.closingBalance),
      'Diễn giải / Ghi chú': 'Số dư tồn kho cuối kỳ báo cáo',
      'Người thực hiện': ''
    });
  }

  // Dòng Tồn thực tế hiện tại
  if (data.currentPhysicalStock !== null && data.currentPhysicalStock !== undefined) {
    exportData.push({
      STT: '',
      'Thời gian phát sinh': 'HIỆN TẠI',
      'Số chứng từ': 'THỰC TẾ',
      'Loại nghiệp vụ': 'Tồn kho hiện tại',
      'Kho hàng': meta?.warehouseCode || rows[0]?.warehouseCode || '',
      'Mã SKU': meta?.productSku || rows[0]?.productSku || '',
      'Tên sản phẩm': meta?.productName || rows[0]?.productName || '',
      'Đơn vị tính': meta?.baseUnit || rows[0]?.baseUnit || '',
      'Nhập (+)': '',
      'Xuất (-)': '',
      'Tồn lũy kế': Number(data.currentPhysicalStock),
      'Diễn giải / Ghi chú': 'Tồn kho thực tế tức thời trên hệ thống',
      'Người thực hiện': ''
    });
  }

  // Tạo Sheet & Workbook
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Định dạng độ rộng cột (Column Widths)
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 20 }, // Thời gian phát sinh
    { wch: 20 }, // Số chứng từ
    { wch: 22 }, // Loại nghiệp vụ
    { wch: 14 }, // Kho hàng
    { wch: 18 }, // Mã SKU
    { wch: 30 }, // Tên sản phẩm
    { wch: 12 }, // Đơn vị tính
    { wch: 14 }, // Nhập (+)
    { wch: 14 }, // Xuất (-)
    { wch: 14 }, // Tồn lũy kế
    { wch: 35 }, // Diễn giải / Ghi chú
    { wch: 18 }  // Người thực hiện
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'The_Kho');

  const skuPart = meta?.productSku ? `_${meta.productSku}` : '';
  const whPart = meta?.warehouseCode ? `_${meta.warehouseCode}` : '';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `TheKho${skuPart}${whPart}_${datePart}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
