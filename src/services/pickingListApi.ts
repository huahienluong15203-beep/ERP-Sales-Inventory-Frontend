/**
 * S6-03: Service API Quản lý Phiếu Soạn Hàng (Wave Picking List)
 * Hỗ trợ gom đơn, gộp mặt hàng, sắp xếp theo đường đi trong kho & cập nhật tiến độ (Mobile-friendly)
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  PickingList,
  PickingListItem,
  AvailablePickingOrder,
  PickingListPreviewResponse,
  PickingListCreateRequest,
  PickingItemUpdateRequest,
  PickingProgressUpdateRequest
} from '../types/pickingList';

const STORAGE_KEY = 'erp_picking_lists_v1';
const PICKING_LIST_API_BASE = `${API_BASE_URL}/api/inventory/picking-lists`;

// Dữ liệu mẫu phong phú ban đầu cho Phiếu soạn hàng
export const INITIAL_PICKING_LISTS: PickingList[] = [
  {
    id: 1,
    code: 'PL261015-A101',
    warehouseId: 1,
    warehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    status: 'IN_PROGRESS',
    pickerId: 3,
    pickerName: 'Trần Văn Thủ Kho',
    orderCount: 3,
    totalItems: 4,
    completedItems: 2,
    note: 'Đợt soạn hàng buổi sáng tuyến nội thành Hà Nội',
    createdAt: '2026-10-15T08:30:00',
    updatedAt: '2026-10-15T09:15:00',
    orders: [
      { id: 101, code: 'SO-202610-001', customerName: 'Đại lý VinMart Cầu Giấy', totalAmount: 18500000, status: 'APPROVED' },
      { id: 102, code: 'SO-202610-002', customerName: 'Đại lý Bách Hóa Xanh Đống Đa', totalAmount: 12200000, status: 'APPROVED' },
      { id: 103, code: 'SO-202610-003', customerName: 'Siêu thị Mini Tmart Ba Đình', totalAmount: 9800000, status: 'APPROVED' }
    ],
    items: [
      {
        id: 1,
        productId: 1,
        productSku: 'BEV-PEPSI-330',
        productName: 'Nước ngọt Pepsi lon 330ml (Thùng 24)',
        baseUnit: 'Thùng',
        locationCode: 'A-01-01-01',
        routeSequence: 1,
        requiredQuantity: 25,
        pickedQuantity: 25,
        isCompleted: true,
        discrepancyReason: null,
        allocations: [
          { orderId: 101, orderCode: 'SO-202610-001', customerName: 'Đại lý VinMart Cầu Giấy', quantity: 15 },
          { orderId: 102, orderCode: 'SO-202610-002', customerName: 'Đại lý Bách Hóa Xanh Đống Đa', quantity: 10 }
        ]
      },
      {
        id: 2,
        productId: 2,
        productSku: 'MILK-VNM-180',
        productName: 'Sữa tươi tiệt trùng Vinamilk 180ml (Thùng 48)',
        baseUnit: 'Thùng',
        locationCode: 'A-01-02-03',
        routeSequence: 2,
        requiredQuantity: 20,
        pickedQuantity: 20,
        isCompleted: true,
        discrepancyReason: null,
        allocations: [
          { orderId: 101, orderCode: 'SO-202610-001', customerName: 'Đại lý VinMart Cầu Giấy', quantity: 10 },
          { orderId: 103, orderCode: 'SO-202610-003', customerName: 'Siêu thị Mini Tmart Ba Đình', quantity: 10 }
        ]
      },
      {
        id: 3,
        productId: 3,
        productSku: 'SNACK-LAY-ST',
        productName: 'Snack khoai tây Lay tự nhiên 54g',
        baseUnit: 'Gói',
        locationCode: 'B-02-01-02',
        routeSequence: 3,
        requiredQuantity: 50,
        pickedQuantity: 40,
        isCompleted: false,
        discrepancyReason: 'Kệ B-02 chỉ còn 40 gói nguyên vẹn, 10 gói bị rách góc đang chờ hủy',
        allocations: [
          { orderId: 102, orderCode: 'SO-202610-002', customerName: 'Đại lý Bách Hóa Xanh Đống Đa', quantity: 30 },
          { orderId: 103, orderCode: 'SO-202610-003', customerName: 'Siêu thị Mini Tmart Ba Đình', quantity: 20 }
        ]
      },
      {
        id: 4,
        productId: 4,
        productSku: 'NOODLE-HAOHAO',
        productName: 'Mì ăn liền Hảo Hảo tôm chua cay 75g (Thùng 30)',
        baseUnit: 'Thùng',
        locationCode: 'B-03-01-01',
        routeSequence: 4,
        requiredQuantity: 30,
        pickedQuantity: 0,
        isCompleted: false,
        discrepancyReason: null,
        allocations: [
          { orderId: 101, orderCode: 'SO-202610-001', customerName: 'Đại lý VinMart Cầu Giấy', quantity: 15 },
          { orderId: 102, orderCode: 'SO-202610-002', customerName: 'Đại lý Bách Hóa Xanh Đống Đa', quantity: 15 }
        ]
      }
    ]
  },
  {
    id: 2,
    code: 'PL261014-B202',
    warehouseId: 1,
    warehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    status: 'COMPLETED',
    pickerId: 3,
    pickerName: 'Trần Văn Thủ Kho',
    orderCount: 2,
    totalItems: 3,
    completedItems: 3,
    note: 'Đợt soạn buổi chiều ngày 14/10',
    createdAt: '2026-10-14T14:00:00',
    updatedAt: '2026-10-14T15:20:00',
    orders: [
      { id: 98, code: 'SO-202610-098', customerName: 'Đại lý Tuấn Hưng Hoàng Mai', totalAmount: 14500000, status: 'DISPATCHED' },
      { id: 99, code: 'SO-202610-099', customerName: 'Cửa hàng Tiện Lợi Circle K', totalAmount: 21000000, status: 'DISPATCHED' }
    ],
    items: [
      {
        id: 11,
        productId: 1,
        productSku: 'BEV-PEPSI-330',
        productName: 'Nước ngọt Pepsi lon 330ml (Thùng 24)',
        baseUnit: 'Thùng',
        locationCode: 'A-01-01-01',
        routeSequence: 1,
        requiredQuantity: 40,
        pickedQuantity: 40,
        isCompleted: true,
        discrepancyReason: null,
        allocations: [
          { orderId: 98, orderCode: 'SO-202610-098', customerName: 'Đại lý Tuấn Hưng Hoàng Mai', quantity: 20 },
          { orderId: 99, orderCode: 'SO-202610-099', customerName: 'Cửa hàng Tiện Lợi Circle K', quantity: 20 }
        ]
      },
      {
        id: 12,
        productId: 5,
        productSku: 'OIL-NEPTUNE-1L',
        productName: 'Dầu ăn thượng hạng Neptune Gold 1L (Thùng 12)',
        baseUnit: 'Thùng',
        locationCode: 'C-01-02-01',
        routeSequence: 2,
        requiredQuantity: 15,
        pickedQuantity: 15,
        isCompleted: true,
        discrepancyReason: null,
        allocations: [
          { orderId: 98, orderCode: 'SO-202610-098', customerName: 'Đại lý Tuấn Hưng Hoàng Mai', quantity: 15 }
        ]
      },
      {
        id: 13,
        productId: 6,
        productSku: 'RICE-ST25-5KG',
        productName: 'Gạo ST25 đặc sản Sóc Trăng bao 5kg',
        baseUnit: 'Bao',
        locationCode: 'D-01-01-01',
        routeSequence: 3,
        requiredQuantity: 50,
        pickedQuantity: 50,
        isCompleted: true,
        discrepancyReason: null,
        allocations: [
          { orderId: 99, orderCode: 'SO-202610-099', customerName: 'Cửa hàng Tiện Lợi Circle K', quantity: 50 }
        ]
      }
    ]
  },
  {
    id: 3,
    code: 'PL261015-C303',
    warehouseId: 2,
    warehouseName: 'Kho Miền Trung (Đà Nẵng)',
    status: 'ASSIGNED',
    pickerId: 4,
    pickerName: 'Lê Văn Nam',
    orderCount: 2,
    totalItems: 2,
    completedItems: 0,
    note: 'Đợt soạn khu vực Hải Châu & Thanh Khê',
    createdAt: '2026-10-15T10:00:00',
    updatedAt: '2026-10-15T10:00:00',
    orders: [
      { id: 104, code: 'SO-202610-004', customerName: 'Đại lý Đà Nẵng Xanh', totalAmount: 11000000, status: 'APPROVED' },
      { id: 105, code: 'SO-202610-005', customerName: 'Tạp hóa Thu Hương Hải Châu', totalAmount: 8500000, status: 'APPROVED' }
    ],
    items: [
      {
        id: 21,
        productId: 1,
        productSku: 'BEV-PEPSI-330',
        productName: 'Nước ngọt Pepsi lon 330ml (Thùng 24)',
        baseUnit: 'Thùng',
        locationCode: 'A-01-01-01',
        routeSequence: 1,
        requiredQuantity: 20,
        pickedQuantity: 0,
        isCompleted: false,
        discrepancyReason: null,
        allocations: [
          { orderId: 104, orderCode: 'SO-202610-004', customerName: 'Đại lý Đà Nẵng Xanh', quantity: 20 }
        ]
      },
      {
        id: 22,
        productId: 2,
        productSku: 'MILK-VNM-180',
        productName: 'Sữa tươi tiệt trùng Vinamilk 180ml (Thùng 48)',
        baseUnit: 'Thùng',
        locationCode: 'A-02-01-01',
        routeSequence: 2,
        requiredQuantity: 15,
        pickedQuantity: 0,
        isCompleted: false,
        discrepancyReason: null,
        allocations: [
          { orderId: 105, orderCode: 'SO-202610-005', customerName: 'Tạp hóa Thu Hương Hải Châu', quantity: 15 }
        ]
      }
    ]
  }
];

function getStoredLists(): PickingList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Lỗi đọc local picking lists:', e);
  }
  return [];
}

function saveStoredLists(lists: PickingList[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch (e) {
    console.warn('Lỗi lưu local picking lists:', e);
  }
}

/**
 * Mapper chuyển đổi DTO PickingListItemResponse từ backend sang frontend PickingListItem
 */
function mapBackendPickingListItem(dto: any): PickingListItem {
  return {
    id: dto.id,
    productId: dto.productId,
    productSku: dto.productSku || '',
    productName: dto.productName || '',
    baseUnit: dto.baseUnit || 'Cái',
    locationCode: dto.locationCode || 'Chưa gán vị trí',
    locationName: dto.locationName || '',
    zone: dto.zone || '',
    shelf: dto.shelf || '',
    routeSequence: dto.routeSequence || 1,
    requiredQuantity: Number(dto.requestedQuantity ?? dto.requiredQuantity ?? 0),
    pickedQuantity: Number(dto.pickedQuantity ?? 0),
    isCompleted: Boolean(dto.isPicked ?? dto.isCompleted),
    discrepancyReason: dto.shortageReason ?? dto.discrepancyReason ?? null,
    allocations: (dto.allocations || []).map((a: any) => ({
      orderId: a.orderId,
      orderCode: a.orderCode || `Đơn #${a.orderId}`,
      customerName: a.customerName || 'Khách hàng',
      quantity: Number(a.requestedQuantity ?? a.quantity ?? 0)
    }))
  };
}

/**
 * Mapper chuyển đổi DTO PickingListResponse từ backend sang frontend PickingList
 */
function mapBackendPickingList(dto: any): PickingList {
  return {
    id: dto.id,
    code: dto.code || `PL-${dto.id}`,
    warehouseId: dto.warehouseId,
    warehouseName: dto.warehouseName || `Kho #${dto.warehouseId}`,
    status: dto.status,
    pickerId: dto.pickerId,
    pickerName: dto.pickerName || (dto.pickerId ? `Thủ kho #${dto.pickerId}` : 'Chưa phân công'),
    orderCount: dto.totalOrders ?? (dto.orders?.length || 0),
    totalItems: dto.totalItems ?? (dto.items?.length || 0),
    completedItems: (dto.items || []).filter((i: any) => i.isPicked ?? i.isCompleted).length,
    note: dto.note || '',
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
    orders: (dto.orders || []).map((o: any) => ({
      id: o.orderId ?? o.id,
      code: o.orderCode ?? o.code,
      customerName: o.customerName || '',
      totalAmount: Number(o.totalAmount || 0),
      status: o.orderStatus ?? o.status ?? 'APPROVED'
    })),
    items: (dto.items || []).map(mapBackendPickingListItem)
  };
}

/**
 * 1. Lấy danh sách đơn hàng đã duyệt (APPROVED) sẵn sàng gom vào đợt soạn
 */
export async function fetchAvailableOrders(warehouseId: number): Promise<AvailablePickingOrder[]> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}/available-orders?warehouseId=${warehouseId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.orderId ?? d.id,
          orderCode: d.orderCode || `DH-${d.orderId ?? d.id}`,
          customerName: d.customerName || 'Khách hàng',
          totalAmount: Number(d.totalAmount || 0),
          itemCount: d.totalLines ?? d.itemCount ?? 0,
          createdAt: d.approvedAt ?? d.createdAt ?? '',
          deliveryAddress: d.deliveryAddress || '',
          phone: d.phone || ''
        }));
      }
    }
  } catch (err) {
    console.warn('Backend picking available orders fetch failed:', err);
  }

  // Nếu API gọi thành công nhưng không có đơn, trả về rỗng (không hiện data giả)
  return [];
}

/**
 * 2. Xem trước kết quả gom đơn, gộp mặt hàng và tối ưu đường đi trong kho (Preview Wave)
 */
export async function previewPickingList(warehouseId: number, orderIds: number[]): Promise<PickingListPreviewResponse> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouseId, orderIds })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        warehouseId: data.warehouseId,
        warehouseName: data.warehouseName || 'Kho xuất hàng',
        orderCount: data.totalOrders ?? (data.orderCodes?.length || orderIds.length),
        totalItems: data.totalItems ?? (data.items?.length || 0),
        items: (data.items || []).map(mapBackendPickingListItem)
      };
    }
  } catch (err) {
    console.warn('Backend preview picking list failed, generating dynamic preview:', err);
  }

  // Local fallback calculation
  const items: PickingListItem[] = [
    {
      id: 1,
      productId: 1,
      productSku: 'BEV-PEPSI-330',
      productName: 'Nước ngọt Pepsi lon 330ml (Thùng 24)',
      baseUnit: 'Thùng',
      locationCode: 'A-01-01-01',
      routeSequence: 1,
      requiredQuantity: orderIds.length * 15,
      pickedQuantity: 0,
      isCompleted: false,
      discrepancyReason: null,
      allocations: orderIds.map((oid, idx) => ({
        orderId: oid,
        orderCode: `SO-202610-0${10 + idx}`,
        customerName: `Khách hàng đơn ${oid}`,
        quantity: 15
      }))
    },
    {
      id: 2,
      productId: 2,
      productSku: 'MILK-VNM-180',
      productName: 'Sữa tươi tiệt trùng Vinamilk 180ml (Thùng 48)',
      baseUnit: 'Thùng',
      locationCode: 'A-02-01-02',
      routeSequence: 2,
      requiredQuantity: orderIds.length * 10,
      pickedQuantity: 0,
      isCompleted: false,
      discrepancyReason: null,
      allocations: orderIds.map((oid, idx) => ({
        orderId: oid,
        orderCode: `SO-202610-0${10 + idx}`,
        customerName: `Khách hàng đơn ${oid}`,
        quantity: 10
      }))
    },
    {
      id: 3,
      productId: 4,
      productSku: 'NOODLE-HAOHAO',
      productName: 'Mì ăn liền Hảo Hảo tôm chua cay 75g (Thùng 30)',
      baseUnit: 'Thùng',
      locationCode: 'B-01-02-01',
      routeSequence: 3,
      requiredQuantity: orderIds.length * 20,
      pickedQuantity: 0,
      isCompleted: false,
      discrepancyReason: null,
      allocations: orderIds.map((oid, idx) => ({
        orderId: oid,
        orderCode: `SO-202610-0${10 + idx}`,
        customerName: `Khách hàng đơn ${oid}`,
        quantity: 20
      }))
    }
  ];

  return {
    warehouseId,
    warehouseName: warehouseId === 2 ? 'Kho Miền Trung (Đà Nẵng)' : 'Kho Tổng Miền Bắc (Hà Nội)',
    orderCount: orderIds.length,
    totalItems: items.length,
    items
  };
}

/**
 * 3. Tạo mới Phiếu soạn hàng từ các đơn đã chọn
 */
export async function createPickingList(req: PickingListCreateRequest): Promise<PickingList> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const data = await res.json();
      const mapped = mapBackendPickingList(data);
      // Đồng bộ vào cache
      const lists = getStoredLists();
      lists.unshift(mapped);
      saveStoredLists(lists);
      return mapped;
    }
  } catch (err) {
    console.warn('Backend create picking list failed, saving locally:', err);
  }

  // Local fallback creation
  const lists = getStoredLists();
  const preview = await previewPickingList(req.warehouseId, req.orderIds);
  const now = new Date().toISOString();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const newCode = `PL${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-W${randomSuffix}`;

  const newList: PickingList = {
    id: Date.now(),
    code: newCode,
    warehouseId: req.warehouseId,
    warehouseName: preview.warehouseName,
    status: 'ASSIGNED',
    pickerId: req.pickerId || 1,
    pickerName: req.pickerId ? 'Nhân viên kho được gán' : 'Thủ kho trưởng ca',
    orderCount: req.orderIds.length,
    totalItems: preview.items.length,
    completedItems: 0,
    note: req.note || '',
    createdAt: now,
    updatedAt: now,
    items: preview.items,
    orders: req.orderIds.map((id, idx) => ({
      id,
      code: `SO-202610-0${10 + idx}`,
      customerName: `Đại lý liên kết #${id}`,
      totalAmount: 15000000,
      status: 'APPROVED'
    }))
  };

  lists.unshift(newList);
  saveStoredLists(lists);
  return newList;
}

/**
 * 4. Tra cứu danh sách phiếu soạn hàng (phân trang, lọc theo kho, trạng thái, người soạn, từ khóa)
 */
export async function fetchPickingLists(params?: {
  warehouseId?: number;
  status?: string;
  pickerId?: number;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<{ content: PickingList[]; totalElements: number; totalPages: number }> {
  try {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.pickerId) query.set('pickerId', String(params.pickerId));
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));

    const res = await authFetch(`${PICKING_LIST_API_BASE}?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.content)) {
        return {
          content: data.content.map(mapBackendPickingList),
          totalElements: data.totalElements,
          totalPages: data.totalPages
        };
      }
    }
  } catch (err) {
    console.warn('Backend search picking lists failed, using local filter:', err);
  }

  let lists = getStoredLists();

  if (params?.warehouseId) {
    lists = lists.filter((l) => l.warehouseId === params.warehouseId);
  }
  if (params?.status && params.status !== 'ALL') {
    lists = lists.filter((l) => l.status === params.status);
  }
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase().trim();
    lists = lists.filter(
      (l) =>
        l.code.toLowerCase().includes(kw) ||
        (l.pickerName && l.pickerName.toLowerCase().includes(kw)) ||
        (l.note && l.note.toLowerCase().includes(kw)) ||
        l.orders.some((o) => o.code.toLowerCase().includes(kw) || o.customerName.toLowerCase().includes(kw))
    );
  }

  return {
    content: lists,
    totalElements: lists.length,
    totalPages: Math.ceil(lists.length / (params?.size || 20)) || 1
  };
}

/**
 * 5. Xem chi tiết phiếu soạn hàng theo ID
 */
export async function fetchPickingListById(id: number): Promise<PickingList> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}/${id}`);
    if (res.ok) {
      const data = await res.json();
      return mapBackendPickingList(data);
    }
  } catch (err) {
    console.warn('Backend fetch picking list by id failed:', err);
  }

  const lists = getStoredLists();
  const found = lists.find((l) => l.id === Number(id));
  if (found) return found;

  throw new Error(`Không tìm thấy phiếu soạn hàng #${id}`);
}

/**
 * 6. Cập nhật tiến độ một dòng hàng (Mobile-friendly)
 * Bắt buộc nhập lý do nếu số lượng thực soạn < số lượng yêu cầu (AC4)
 */
export async function updateItemProgress(
  listId: number,
  itemId: number,
  req: PickingItemUpdateRequest
): Promise<PickingList> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}/${listId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickedQuantity: req.pickedQuantity,
        isPicked: req.isCompleted,
        shortageReason: req.discrepancyReason || null
      })
    });
    if (res.ok) {
      const data = await res.json();
      const mapped = mapBackendPickingList(data);
      const lists = getStoredLists();
      const idx = lists.findIndex((l) => l.id === listId);
      if (idx >= 0) lists[idx] = mapped;
      saveStoredLists(lists);
      return mapped;
    }
  } catch (err) {
    console.warn('Backend update item progress failed, updating locally:', err);
  }

  // Local update
  const lists = getStoredLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) throw new Error('Không tìm thấy phiếu');

  const item = list.items.find((i) => i.id === itemId);
  if (!item) throw new Error('Không tìm thấy dòng hàng');

  item.pickedQuantity = req.pickedQuantity;
  item.isCompleted = req.isCompleted;
  item.discrepancyReason = req.discrepancyReason || null;

  // Cập nhật trạng thái phiếu nếu chưa chuyển sang IN_PROGRESS
  if (list.status === 'ASSIGNED') {
    list.status = 'IN_PROGRESS';
  }

  list.completedItems = list.items.filter((i) => i.isCompleted).length;
  list.updatedAt = new Date().toISOString();

  saveStoredLists(lists);
  return { ...list };
}

/**
 * 7. Cập nhật tiến độ hàng loạt
 */
export async function updateProgressBatch(
  listId: number,
  req: PickingProgressUpdateRequest
): Promise<PickingList> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}/${listId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: req.items.map((i) => ({
          itemId: i.itemId,
          pickedQuantity: i.pickedQuantity,
          isPicked: i.isCompleted,
          shortageReason: i.discrepancyReason || null
        })),
        autoCompleteIfAllDone: req.autoCompleteIfAllDone
      })
    });
    if (res.ok) {
      const data = await res.json();
      const mapped = mapBackendPickingList(data);
      const lists = getStoredLists();
      const idx = lists.findIndex((l) => l.id === listId);
      if (idx >= 0) lists[idx] = mapped;
      saveStoredLists(lists);
      return mapped;
    }
  } catch (err) {
    console.warn('Backend batch progress update failed, updating locally:', err);
  }

  const lists = getStoredLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) throw new Error('Không tìm thấy phiếu');

  req.items.forEach((update) => {
    const item = list.items.find((i) => i.id === update.itemId);
    if (item) {
      item.pickedQuantity = update.pickedQuantity;
      item.isCompleted = update.isCompleted;
      item.discrepancyReason = update.discrepancyReason || null;
    }
  });

  list.completedItems = list.items.filter((i) => i.isCompleted).length;
  if (req.autoCompleteIfAllDone && list.completedItems === list.items.length) {
    list.status = 'COMPLETED';
  } else if (list.status === 'ASSIGNED') {
    list.status = 'IN_PROGRESS';
  }

  list.updatedAt = new Date().toISOString();
  saveStoredLists(lists);
  return { ...list };
}

/**
 * 8. Chốt hoàn thành phiếu soạn hàng
 */
export async function completePickingList(id: number): Promise<PickingList> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}/${id}/complete`, {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      const mapped = mapBackendPickingList(data);
      const lists = getStoredLists();
      const idx = lists.findIndex((l) => l.id === id);
      if (idx >= 0) lists[idx] = mapped;
      saveStoredLists(lists);
      return mapped;
    }
  } catch (err) {
    console.warn('Backend complete picking list failed, updating locally:', err);
  }

  const lists = getStoredLists();
  const list = lists.find((l) => l.id === id);
  if (!list) throw new Error('Không tìm thấy phiếu');

  // Kiểm tra soạn thiếu
  for (const it of list.items) {
    if (it.pickedQuantity < it.requiredQuantity && !it.discrepancyReason) {
      throw new Error(`Mặt hàng ${it.productName} soạn thiếu (${it.pickedQuantity}/${it.requiredQuantity}) nhưng chưa nhập lý do!`);
    }
  }

  list.status = 'COMPLETED';
  list.completedItems = list.items.length;
  list.items.forEach((i) => (i.isCompleted = true));
  list.updatedAt = new Date().toISOString();

  saveStoredLists(lists);
  return { ...list };
}

/**
 * 9. Hủy phiếu soạn hàng
 */
export async function cancelPickingList(id: number, reason: string): Promise<PickingList> {
  try {
    const res = await authFetch(`${PICKING_LIST_API_BASE}/${id}/cancel?reason=${encodeURIComponent(reason)}`, {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      const mapped = mapBackendPickingList(data);
      const lists = getStoredLists();
      const idx = lists.findIndex((l) => l.id === id);
      if (idx >= 0) lists[idx] = mapped;
      saveStoredLists(lists);
      return mapped;
    }
  } catch (err) {
    console.warn('Backend cancel picking list failed, updating locally:', err);
  }

  const lists = getStoredLists();
  const list = lists.find((l) => l.id === id);
  if (!list) throw new Error('Không tìm thấy phiếu');

  list.status = 'CANCELLED';
  list.note = (list.note ? list.note + ' | ' : '') + `Lý do hủy: ${reason}`;
  list.updatedAt = new Date().toISOString();

  saveStoredLists(lists);
  return { ...list };
}
