/**
 * S5-07: Service gọi API và quản lý dữ liệu Phiếu chuyển kho nội bộ
 * Acceptance Criteria:
 * - AC1: Chọn kho đi, kho đến, danh sách hàng và số lượng
 * - AC2: Hàng đang chuyển ghi nhận là Đang trên đường, chưa cộng vào kho đến
 * - AC3: Kho đến xác nhận nhận đủ thì tồn mới được cộng
 * - AC4: Chênh lệch khi nhận phải nhập lý do
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  StockTransfer,
  CreateStockTransferPayload,
  ReceiveTransferPayload
} from '../types/stockTransfer';
import { SYSTEM_WAREHOUSES } from '../types/inventory';

const STORAGE_KEY = 'erp_stock_transfers_v1';

// Dữ liệu mẫu khởi tạo phong phú phục vụ kiểm thử phân hệ điều chuyển kho
export const INITIAL_STOCK_TRANSFERS: StockTransfer[] = [
  {
    id: 'trf-101',
    code: 'TRF-202610-001',
    sourceWarehouseCode: 'WH-MB01',
    sourceWarehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    destWarehouseCode: 'WH-MT01',
    destWarehouseName: 'Kho Miền Trung (Đà Nẵng)',
    transferDate: '2026-10-08',
    expectedReceiveDate: '2026-10-10',
    status: 'IN_TRANSIT', // AC2: Đang đi đường, chưa cộng kho đến
    vehiclePlate: '29H-882.19',
    transporterName: 'Nguyễn Văn Tiến - Đội xe liên tỉnh số 1',
    note: 'Điều chuyển bổ sung nước giải khát giải nhiệt cho khu vực miền Trung',
    createdBy: 'thukho_mienbac',
    dispatchedAt: '2026-10-08T09:30:00',
    createdAt: '2026-10-08T09:00:00',
    updatedAt: '2026-10-08T09:30:00',
    lines: [
      {
        id: 'line-101-1',
        productId: 1,
        productSku: 'BEV-PEPSI-330',
        productName: 'Nước ngọt Pepsi lon 330ml',
        category: 'Nước giải khát',
        unit: 'Thùng',
        sourceAvailableStock: 500,
        transferQuantity: 150,
        batchNumber: 'LOT-202610-P01',
        expiredDate: '2027-10-01'
      },
      {
        id: 'line-101-2',
        productId: 2,
        productSku: 'MILK-VNM-180',
        productName: 'Sữa tươi tiệt trùng Vinamilk 180ml',
        category: 'Sữa & Sản phẩm từ sữa',
        unit: 'Thùng',
        sourceAvailableStock: 300,
        transferQuantity: 80,
        batchNumber: 'LOT-202609-V02',
        expiredDate: '2027-03-15'
      }
    ]
  },
  {
    id: 'trf-102',
    code: 'TRF-202610-002',
    sourceWarehouseCode: 'WH-MN01',
    sourceWarehouseName: 'Kho Tổng Miền Nam (Bình Dương)',
    destWarehouseCode: 'WH-MK01',
    destWarehouseName: 'Kho Miền Tây (Cần Thơ)',
    transferDate: '2026-10-05',
    expectedReceiveDate: '2026-10-06',
    status: 'COMPLETED', // AC3: Kho đến đã nhận đủ
    vehiclePlate: '61C-451.22',
    transporterName: 'Trần Văn Sang - Xe trung chuyển',
    note: 'Điều chuyển hàng thiết yếu cho chi nhánh Cần Thơ',
    createdBy: 'thukho_miennam',
    dispatchedAt: '2026-10-05T08:00:00',
    receivedAt: '2026-10-06T15:30:00',
    createdAt: '2026-10-05T07:45:00',
    updatedAt: '2026-10-06T15:30:00',
    lines: [
      {
        id: 'line-102-1',
        productId: 3,
        productSku: 'FOOD-CHINSU-500',
        productName: 'Nước mắm Chinsu Cá Hồi 500ml',
        category: 'Gia vị & Thực phẩm',
        unit: 'Thùng',
        sourceAvailableStock: 250,
        transferQuantity: 50,
        receivedQuantity: 50,
        differenceQuantity: 0,
        batchNumber: 'LOT-202608-CS',
        expiredDate: '2027-08-20'
      }
    ]
  },
  {
    id: 'trf-103',
    code: 'TRF-202610-003',
    sourceWarehouseCode: 'WH-MN01',
    sourceWarehouseName: 'Kho Tổng Miền Nam (Bình Dương)',
    destWarehouseCode: 'WH-MB01',
    destWarehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    transferDate: '2026-10-02',
    expectedReceiveDate: '2026-10-05',
    status: 'DISCREPANCY_RESOLVED', // AC4: Đã nhận có chênh lệch và có lý do
    vehiclePlate: '51D-921.03',
    transporterName: 'Logistics Hưng Phát Bắc Nam',
    note: 'Chuyển hàng khô dự trữ',
    discrepancyGeneralReason: 'Thùng hàng bị va chạm nhẹ trong quá trình bốc dỡ gây vỡ 2 chai mắm, đã lập biên bản giám định hiện trường với tài xế.',
    createdBy: 'thukho_miennam',
    dispatchedAt: '2026-10-02T10:00:00',
    receivedAt: '2026-10-05T14:15:00',
    createdAt: '2026-10-02T09:30:00',
    updatedAt: '2026-10-05T14:15:00',
    lines: [
      {
        id: 'line-103-1',
        productId: 3,
        productSku: 'FOOD-CHINSU-500',
        productName: 'Nước mắm Chinsu Cá Hồi 500ml',
        category: 'Gia vị & Thực phẩm',
        unit: 'Thùng',
        sourceAvailableStock: 100,
        transferQuantity: 40,
        receivedQuantity: 38,
        differenceQuantity: 2,
        discrepancyReason: 'Vỡ 2 thùng trong lúc dỡ hàng tại sàn kho, đã xử lý tiêu hủy và lưu mẫu biên bản',
        batchNumber: 'LOT-202608-CS',
        expiredDate: '2027-08-20'
      }
    ]
  }
];

function getLocalTransfers(): StockTransfer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STOCK_TRANSFERS));
      return INITIAL_STOCK_TRANSFERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_STOCK_TRANSFERS;
  }
}

function saveLocalTransfers(data: StockTransfer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Lỗi lưu danh sách phiếu chuyển kho vào localStorage:', e);
  }
}

/**
 * Lấy danh sách phiếu chuyển kho (hỗ trợ lọc theo trạng thái, kho đi, kho đến)
 */
export async function fetchStockTransfers(filter?: {
  status?: string;
  sourceWarehouse?: string;
  destWarehouse?: string;
  keyword?: string;
}): Promise<StockTransfer[]> {
  try {
    const query = new URLSearchParams();
    if (filter?.status && filter.status !== 'ALL') query.set('status', filter.status);
    if (filter?.sourceWarehouse && filter.sourceWarehouse !== 'ALL') query.set('sourceWarehouse', filter.sourceWarehouse);
    if (filter?.destWarehouse && filter.destWarehouse !== 'ALL') query.set('destWarehouse', filter.destWarehouse);
    if (filter?.keyword?.trim()) query.set('keyword', filter.keyword.trim());

    const res = await authFetch(`${API_BASE_URL}/api/inventory/transfers?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray(data.content)) {
        return data.content;
      }
    }
  } catch {
    // Backend API chưa sẵn sàng hoặc ngoại lệ -> fallback localStorage
  }

  let list = getLocalTransfers();
  if (filter?.status && filter.status !== 'ALL') {
    list = list.filter((t) => t.status === filter.status);
  }
  if (filter?.sourceWarehouse && filter.sourceWarehouse !== 'ALL') {
    list = list.filter((t) => t.sourceWarehouseCode === filter.sourceWarehouse);
  }
  if (filter?.destWarehouse && filter.destWarehouse !== 'ALL') {
    list = list.filter((t) => t.destWarehouseCode === filter.destWarehouse);
  }
  if (filter?.keyword?.trim()) {
    const q = filter.keyword.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.vehiclePlate?.toLowerCase().includes(q) ||
        t.transporterName?.toLowerCase().includes(q) ||
        t.lines.some((l) => l.productName.toLowerCase().includes(q) || l.productSku.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Tạo phiếu chuyển kho mới (AC1)
 */
export async function createStockTransfer(
  payload: CreateStockTransferPayload,
  creatorUsername: string = 'wh_staff'
): Promise<StockTransfer> {
  const sourceWh = SYSTEM_WAREHOUSES.find((w) => w.code === payload.sourceWarehouseCode);
  const destWh = SYSTEM_WAREHOUSES.find((w) => w.code === payload.destWarehouseCode);

  try {
    const res = await authFetch(`${API_BASE_URL}/api/inventory/transfers`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Lỗi máy chủ (${res.status}) khi lập phiếu chuyển kho`);
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  const existing = getLocalTransfers();
  const nextNumber = existing.length + 1;
  const now = new Date().toISOString();
  const code = `TRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(nextNumber).padStart(3, '0')}`;

  const newTransfer: StockTransfer = {
    id: `trf-${Date.now()}`,
    code,
    sourceWarehouseCode: payload.sourceWarehouseCode,
    sourceWarehouseName: sourceWh?.name || payload.sourceWarehouseCode,
    destWarehouseCode: payload.destWarehouseCode,
    destWarehouseName: destWh?.name || payload.destWarehouseCode,
    transferDate: payload.transferDate,
    expectedReceiveDate: payload.expectedReceiveDate,
    status: payload.status || 'DRAFT',
    vehiclePlate: payload.vehiclePlate,
    transporterName: payload.transporterName,
    note: payload.note,
    createdBy: creatorUsername,
    dispatchedAt: payload.status === 'IN_TRANSIT' ? now : undefined,
    createdAt: now,
    updatedAt: now,
    lines: payload.lines.map((l, idx) => ({
      id: `line-${Date.now()}-${idx}`,
      productId: l.productId,
      productSku: l.productSku,
      productName: l.productName,
      category: l.category,
      unit: l.unit,
      sourceAvailableStock: l.sourceAvailableStock,
      transferQuantity: l.transferQuantity,
      batchNumber: l.batchNumber,
      expiredDate: l.expiredDate
    }))
  };

  saveLocalTransfers([newTransfer, ...existing]);
  return newTransfer;
}

/**
 * Kho đi xuất kho: chuyển trạng thái phiếu sang IN_TRANSIT (AC2)
 * Hàng đang chuyển ghi nhận là Đang trên đường, CHƯA cộng vào kho đến
 */
export async function dispatchStockTransfer(id: string): Promise<StockTransfer> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/inventory/transfers/${id}/dispatch`, {
      method: 'PUT'
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Lỗi máy chủ (${res.status}) khi xuất chuyển kho`);
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  const list = getLocalTransfers();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error('Không tìm thấy phiếu chuyển kho.');
  }

  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    status: 'IN_TRANSIT',
    dispatchedAt: now,
    updatedAt: now
  };
  saveLocalTransfers(list);
  return list[idx];
}

/**
 * Kho đến xác nhận nhận hàng (AC3, AC4)
 * - Nhận đủ (COMPLETED): Tồn kho đến được cộng (AC3)
 * - Chênh lệch (DISCREPANCY_RESOLVED): Bắt buộc nhập lý do chênh lệch (AC4)
 */
export async function receiveStockTransfer(payload: ReceiveTransferPayload): Promise<StockTransfer> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/inventory/transfers/${payload.transferId}/receive`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Lỗi máy chủ (${res.status}) khi xác nhận nhận hàng`);
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  const list = getLocalTransfers();
  const idx = list.findIndex((t) => t.id === payload.transferId);
  if (idx === -1) {
    throw new Error('Không tìm thấy phiếu chuyển kho để xác nhận nhận hàng.');
  }

  const transfer = list[idx];
  let hasDiscrepancy = false;

  const updatedLines = transfer.lines.map((line) => {
    const receivedItem = payload.receivedLines.find((r) => r.lineId === line.id);
    const receivedQty = receivedItem !== undefined ? receivedItem.receivedQuantity : line.transferQuantity;
    const diff = line.transferQuantity - receivedQty;
    if (diff !== 0) {
      hasDiscrepancy = true;
    }
    return {
      ...line,
      receivedQuantity: receivedQty,
      differenceQuantity: diff,
      discrepancyReason: receivedItem?.discrepancyReason || ''
    };
  });

  if (hasDiscrepancy && !payload.generalReason?.trim()) {
    const lineMissingReason = updatedLines.find((l) => (l.differenceQuantity || 0) !== 0 && !l.discrepancyReason?.trim());
    if (lineMissingReason) {
      throw new Error(`Phát hiện chênh lệch tại mặt hàng ${lineMissingReason.productName}. Bắt buộc nhập lý do chênh lệch theo AC4.`);
    }
  }

  const now = new Date().toISOString();
  const updatedTransfer: StockTransfer = {
    ...transfer,
    status: hasDiscrepancy ? 'DISCREPANCY_RESOLVED' : 'COMPLETED',
    receivedAt: now,
    updatedAt: now,
    discrepancyGeneralReason: payload.generalReason?.trim() || undefined,
    lines: updatedLines
  };

  list[idx] = updatedTransfer;
  saveLocalTransfers(list);
  return updatedTransfer;
}
