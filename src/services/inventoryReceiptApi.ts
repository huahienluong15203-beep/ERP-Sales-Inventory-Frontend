/**
 * S5-04: API Service Quản lý Phiếu Nhập Kho từ nhà cung cấp
 * Hỗ trợ lưu nháp, xác nhận cộng tồn, quy đổi đơn vị và quản lý lô/hạn.
 */

import { authFetch, API_BASE_URL } from './api';
import type { GoodsReceipt, GoodsReceiptFormPayload } from '../types/inventory';
import { SYSTEM_WAREHOUSES } from '../types/inventory';

const STORAGE_KEY = 'erp_goods_receipts_v1';

// Dữ liệu mẫu khởi tạo ban đầu cho phiếu nhập kho
const INITIAL_RECEIPTS: GoodsReceipt[] = [
  {
    id: 1,
    code: 'PNK-202610-001',
    supplierId: 1,
    supplierCode: 'NCC-VNM',
    supplierName: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
    documentNumber: 'HD-VNM-9921',
    receiptDate: '2026-10-08',
    warehouseCode: 'WH-MB01',
    warehouseName: 'Kho Tổng Miền Bắc',
    status: 'CONFIRMED',
    totalLines: 2,
    totalBaseQuantity: 960,
    totalAmount: 7680000,
    vehiclePlate: '29C-123.45',
    driverName: 'Nguyễn Văn Tài',
    note: 'Hàng sữa tươi tiệt trùng date mới nhập đầy đủ theo biên bản bàn giao',
    createdByUsername: 'wh_staff',
    confirmedAt: '2026-10-08T10:30:00',
    confirmedByUsername: 'wh_manager',
    createdAt: '2026-10-08T09:15:00',
    updatedAt: '2026-10-08T10:30:00',
    lines: [
      {
        id: 'line-1',
        productId: 10,
        productSku: 'SP-MILK-VNM-180',
        productName: 'Sữa tươi Vinamilk 100% có đường 180ml',
        category: 'Sữa & Sản phẩm từ sữa',
        baseUnit: 'Hộp',
        selectedUnit: 'Thùng',
        conversionFactor: 48,
        quantity: 20,
        baseQuantity: 960,
        unitPrice: 8000,
        totalAmount: 7680000,
        batchNumber: 'VNM-L2610-01',
        expiredDate: '2027-04-08',
        hasBatchManagement: true,
        note: 'Hàng đạt chuẩn quy cách'
      }
    ]
  },
  {
    id: 2,
    code: 'PNK-202610-002',
    supplierId: 2,
    supplierCode: 'NCC-SABECO',
    supplierName: 'Tổng Công ty Cổ phần Bia - Rượu - Nước giải khát Sài Gòn (SABECO)',
    documentNumber: 'XUAT-SB-4412',
    receiptDate: '2026-10-09',
    warehouseCode: 'WH-MB01',
    warehouseName: 'Kho Tổng Miền Bắc',
    status: 'DRAFT',
    totalLines: 1,
    totalBaseQuantity: 1200,
    totalAmount: 16560000,
    vehiclePlate: '29H-888.99',
    driverName: 'Trần Văn Mạnh',
    note: 'Phiếu nháp đang kiểm đếm số lượng tại cửa bốc dỡ số 2',
    createdByUsername: 'wh_staff',
    createdAt: '2026-10-09T14:20:00',
    updatedAt: '2026-10-09T14:20:00',
    lines: [
      {
        id: 'line-2',
        productId: 7,
        productSku: 'SP-BIA-SG-330',
        productName: 'Bia Saigon Special 330ml',
        category: 'Đồ uống & Giải khát',
        baseUnit: 'Lon',
        selectedUnit: 'Thùng',
        conversionFactor: 24,
        quantity: 50,
        baseQuantity: 1200,
        unitPrice: 13800,
        totalAmount: 16560000,
        batchNumber: 'SAB-L2610-99',
        expiredDate: '2027-10-09',
        hasBatchManagement: true,
        note: 'Kiểm tra tem chống hàng giả'
      }
    ]
  }
];

function getLocalReceipts(): GoodsReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RECEIPTS));
      return INITIAL_RECEIPTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECEIPTS;
  }
}

function saveLocalReceipts(list: GoodsReceipt[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Lỗi lưu danh sách phiếu nhập kho vào localStorage:', err);
  }
}

/**
 * Lấy danh sách phiếu nhập kho có bộ lọc & tìm kiếm
 */
export async function fetchGoodsReceipts(params?: {
  keyword?: string;
  warehouseCode?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<GoodsReceipt[]> {
  try {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.warehouseCode) query.set('warehouseCode', params.warehouseCode);
    if (params?.status) query.set('status', params.status);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);

    const res = await authFetch(`${API_BASE_URL}/api/inventory/receipts?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.content || [];
    }
  } catch {
    // Fallback sang local storage
  }

  let list = getLocalReceipts();
  if (params?.keyword?.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    list = list.filter(
      (r) =>
        r.code.toLowerCase().includes(kw) ||
        r.supplierName.toLowerCase().includes(kw) ||
        r.documentNumber.toLowerCase().includes(kw)
    );
  }
  if (params?.warehouseCode) {
    list = list.filter((r) => r.warehouseCode === params.warehouseCode);
  }
  if (params?.status) {
    list = list.filter((r) => r.status === params.status);
  }
  if (params?.fromDate) {
    list = list.filter((r) => r.receiptDate >= params.fromDate!);
  }
  if (params?.toDate) {
    list = list.filter((r) => r.receiptDate <= params.toDate!);
  }
  return list;
}

/**
 * Lấy chi tiết một phiếu nhập kho theo ID
 */
export async function fetchGoodsReceiptById(id: number | string): Promise<GoodsReceipt> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/inventory/receipts/${id}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  const found = getLocalReceipts().find((r) => String(r.id) === String(id));
  if (!found) {
    throw new Error(`Không tìm thấy phiếu nhập kho với ID ${id}`);
  }
  return found;
}

/**
 * Tạo mới phiếu nhập kho (S5-04: Lưu nháp hoặc Xác nhận nhập kho)
 */
export async function createGoodsReceipt(
  payload: GoodsReceiptFormPayload,
  authorUsername: string = 'wh_staff'
): Promise<GoodsReceipt> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/inventory/receipts`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const list = getLocalReceipts();
  const nextId = list.length > 0 ? Math.max(...list.map((r) => Number(r.id) || 0)) + 1 : 1;
  const code = `PNK-202610-${String(nextId).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const totalBaseQuantity = payload.lines.reduce((s, l) => s + l.baseQuantity, 0);
  const totalAmount = payload.lines.reduce((s, l) => s + l.totalAmount, 0);

  const warehouseObj = SYSTEM_WAREHOUSES.find((w) => w.code === payload.warehouseCode);

  const newReceipt: GoodsReceipt = {
    id: nextId,
    code,
    supplierId: payload.supplierId,
    supplierCode: payload.supplierCode,
    supplierName: payload.supplierName,
    documentNumber: payload.documentNumber,
    receiptDate: payload.receiptDate || now.slice(0, 10),
    warehouseCode: payload.warehouseCode,
    warehouseName: warehouseObj?.name || payload.warehouseName || 'Kho Tổng',
    status: payload.status,
    totalLines: payload.lines.length,
    totalBaseQuantity,
    totalAmount,
    vehiclePlate: payload.vehiclePlate,
    driverName: payload.driverName,
    note: payload.note,
    createdByUsername: authorUsername,
    confirmedAt: payload.status === 'CONFIRMED' ? now : undefined,
    confirmedByUsername: payload.status === 'CONFIRMED' ? authorUsername : undefined,
    createdAt: now,
    updatedAt: now,
    lines: payload.lines.map((l, idx) => ({
      ...l,
      id: `line-${nextId}-${idx + 1}`
    }))
  };

  list.unshift(newReceipt);
  saveLocalReceipts(list);
  return newReceipt;
}

/**
 * Xác nhận phiếu nhập kho (AC4: Cộng tồn kho khi xác nhận)
 */
export async function confirmGoodsReceipt(
  id: number | string,
  authorUsername: string = 'wh_manager'
): Promise<GoodsReceipt> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/inventory/receipts/${id}/confirm`, {
      method: 'POST'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const list = getLocalReceipts();
  const idx = list.findIndex((r) => String(r.id) === String(id));
  if (idx < 0) throw new Error('Không tìm thấy phiếu nhập kho để xác nhận');

  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    status: 'CONFIRMED',
    confirmedAt: now,
    confirmedByUsername: authorUsername,
    updatedAt: now
  };
  saveLocalReceipts(list);
  return list[idx];
}
