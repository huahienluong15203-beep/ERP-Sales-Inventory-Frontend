/**
 * S6-06: Service API Phân Tuyến Giao Hàng & Quản Lý Chuyến Xe (Delivery Trips & Route Dispatch)
 * Acceptance Criteria:
 * - AC1: Gom nhiều phiếu xuất vào một chuyến giao theo khu vực
 * - AC2: Gán tài xế và phương tiện cho chuyến
 * - AC3: In danh sách điểm giao của chuyến kèm địa chỉ và số điện thoại người nhận
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  DeliveryTrip,
  DeliveryTripStop,
  DeliveryTripCreateRequest,
  DeliveryTripCompleteRequest,
  InTransitSummary
} from '../types/deliveryTrip';

const STORAGE_KEY = 'erp_delivery_trips_v1';
const DISPATCHED_ORDERS_STORAGE_KEY = 'erp_dispatched_orders_for_trips_v1';

// Danh sách các phiếu xuất kho / đơn hàng đã xuất kho (DISPATCHED) chờ xếp chuyến theo khu vực
const INITIAL_DISPATCHED_ORDERS: DeliveryTripStop[] = [
  {
    orderId: 201,
    orderCode: 'SO-202610-101',
    customerId: 11,
    customerCode: 'DL-HN-001',
    customerName: 'Đại lý VinMart Cầu Giấy',
    deliveryAddress: 'Số 122 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
    receiverName: 'Anh Nguyễn Minh Tuấn',
    receiverPhone: '0988.123.456',
    district: 'Quận Cầu Giấy',
    province: 'Hà Nội',
    status: 'DISPATCHED',
    totalAmount: 18500000,
    valueOnRoad: 18500000,
    stockReturned: false
  },
  {
    orderId: 202,
    orderCode: 'SO-202610-102',
    customerId: 12,
    customerCode: 'DL-HN-002',
    customerName: 'Siêu thị Mini Tmart Ba Đình',
    deliveryAddress: 'Số 45 Đội Cấn, Phường Đội Cấn, Quận Ba Đình, Hà Nội',
    receiverName: 'Chị Lê Thị Mai',
    receiverPhone: '0912.456.789',
    district: 'Quận Ba Đình',
    province: 'Hà Nội',
    status: 'DISPATCHED',
    totalAmount: 12400000,
    valueOnRoad: 12400000,
    stockReturned: false
  },
  {
    orderId: 203,
    orderCode: 'SO-202610-103',
    customerId: 13,
    customerCode: 'DL-HN-003',
    customerName: 'Đại lý Bách Hóa Xanh Đống Đa',
    deliveryAddress: 'Số 88 Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Hà Nội',
    receiverName: 'Anh Hoàng Văn Nam',
    receiverPhone: '0903.789.123',
    district: 'Quận Đống Đa',
    province: 'Hà Nội',
    status: 'DISPATCHED',
    totalAmount: 21600000,
    valueOnRoad: 21600000,
    stockReturned: false
  },
  {
    orderId: 204,
    orderCode: 'SO-202610-104',
    customerId: 14,
    customerCode: 'DL-HN-004',
    customerName: 'Cửa hàng Tiện Lợi Circle K Thanh Xuân',
    deliveryAddress: 'Số 234 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội',
    receiverName: 'Chị Đỗ Thu Trang',
    receiverPhone: '0977.890.123',
    district: 'Quận Thanh Xuân',
    province: 'Hà Nội',
    status: 'DISPATCHED',
    totalAmount: 9800000,
    valueOnRoad: 9800000,
    stockReturned: false
  },
  {
    orderId: 205,
    orderCode: 'SO-202610-105',
    customerId: 15,
    customerCode: 'DL-HN-005',
    customerName: 'Tạp hóa Thu Hà Hai Bà Trưng',
    deliveryAddress: 'Số 15 Phố Huế, Phường Hàng Bài, Quận Hai Bà Trưng, Hà Nội',
    receiverName: 'Bác Nguyễn Thu Hà',
    receiverPhone: '0945.678.901',
    district: 'Quận Hai Bà Trưng',
    province: 'Hà Nội',
    status: 'DISPATCHED',
    totalAmount: 14200000,
    valueOnRoad: 14200000,
    stockReturned: false
  },
  {
    orderId: 206,
    orderCode: 'SO-202610-106',
    customerId: 16,
    customerCode: 'DL-HN-006',
    customerName: 'Đại lý Tuấn Hưng Hoàng Mai',
    deliveryAddress: 'Số 76 Tân Mai, Phường Tân Mai, Quận Hoàng Mai, Hà Nội',
    receiverName: 'Anh Vũ Tuấn Hưng',
    receiverPhone: '0983.222.111',
    district: 'Quận Hoàng Mai',
    province: 'Hà Nội',
    status: 'DISPATCHED',
    totalAmount: 16800000,
    valueOnRoad: 16800000,
    stockReturned: false
  }
];

// Danh sách các chuyến giao hàng mẫu ban đầu
const INITIAL_DELIVERY_TRIPS: DeliveryTrip[] = [
  {
    id: 1,
    code: 'CG261015-88A1',
    warehouseId: 1,
    warehouseCode: 'WH-MB01',
    warehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    vehiclePlate: '29C-912.45',
    driverName: 'Nguyễn Văn Mạnh',
    driverPhone: '0912.334.556',
    status: 'IN_PROGRESS',
    departedAt: '2026-10-19T14:00:00',
    expectedReturnAt: '2026-10-19T17:00:00',
    completedAt: null,
    totalStops: 3,
    deliveredStops: 1,
    failedStops: 0,
    remainingStops: 2,
    valueOnRoad: 24700000,
    overdue: false,
    overdueMinutes: 0,
    note: 'Tuyến Cầu Giấy - Ba Đình - Đống Đa chiều nay',
    stops: [
      {
        orderId: 191,
        orderCode: 'SO-202610-091',
        customerId: 101,
        customerCode: 'DL-01',
        customerName: 'Đại lý VinMart Xuân Thủy',
        deliveryAddress: '136 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
        receiverName: 'Anh Lê Hoàng',
        receiverPhone: '0988.777.666',
        district: 'Quận Cầu Giấy',
        province: 'Hà Nội',
        status: 'DELIVERED',
        totalAmount: 15300000,
        valueOnRoad: 0,
        deliveredAt: '2026-10-15T10:15:00',
        deliveryFailedReason: null,
        stockReturned: false,
        stopSequence: 1
      },
      {
        orderId: 192,
        orderCode: 'SO-202610-092',
        customerId: 102,
        customerCode: 'DL-02',
        customerName: 'Cửa hàng Bách Hóa Kim Mã',
        deliveryAddress: '280 Kim Mã, Ngọc Khánh, Ba Đình, Hà Nội',
        receiverName: 'Chị Mai Lan',
        receiverPhone: '0912.888.999',
        district: 'Quận Ba Đình',
        province: 'Hà Nội',
        status: 'DISPATCHED',
        totalAmount: 12500000,
        valueOnRoad: 12500000,
        deliveredAt: null,
        deliveryFailedReason: null,
        stockReturned: false,
        stopSequence: 2
      },
      {
        orderId: 193,
        orderCode: 'SO-202610-093',
        customerId: 103,
        customerCode: 'DL-03',
        customerName: 'Tạp hóa Thanh Tâm Thái Hà',
        deliveryAddress: '55 Thái Hà, Trung Liệt, Đống Đa, Hà Nội',
        receiverName: 'Bác Thanh Tâm',
        receiverPhone: '0903.111.222',
        district: 'Quận Đống Đa',
        province: 'Hà Nội',
        status: 'DISPATCHED',
        totalAmount: 12200000,
        valueOnRoad: 12200000,
        deliveredAt: null,
        deliveryFailedReason: null,
        stockReturned: false,
        stopSequence: 3
      }
    ]
  },
  {
    id: 2,
    code: 'CG261014-77B2',
    warehouseId: 1,
    warehouseCode: 'WH-MB01',
    warehouseName: 'Kho Tổng Miền Bắc (Hà Nội)',
    vehiclePlate: '29D-665.88',
    driverName: 'Trần Văn Long',
    driverPhone: '0988.555.444',
    status: 'COMPLETED',
    departedAt: '2026-10-14T08:30:00',
    expectedReturnAt: '2026-10-14T14:30:00',
    completedAt: '2026-10-14T14:10:00',
    totalStops: 2,
    deliveredStops: 2,
    failedStops: 0,
    remainingStops: 0,
    valueOnRoad: 0,
    overdue: false,
    overdueMinutes: 0,
    note: 'Tuyến Thanh Xuân - Hoàng Mai chiều qua hoàn thành đúng giờ',
    stops: [
      {
        orderId: 181,
        orderCode: 'SO-202610-081',
        customerName: 'Đại lý Hà Đông Star',
        deliveryAddress: '36 Quang Trung, Hà Đông, Hà Nội',
        receiverName: 'Anh Phúc',
        receiverPhone: '0912.444.333',
        district: 'Quận Hà Đông',
        province: 'Hà Nội',
        status: 'DELIVERED',
        totalAmount: 19200000,
        valueOnRoad: 0,
        deliveredAt: '2026-10-14T10:30:00',
        stockReturned: false,
        stopSequence: 1
      },
      {
        orderId: 182,
        orderCode: 'SO-202610-082',
        customerName: 'Tạp hóa Hưng Thịnh Định Công',
        deliveryAddress: '99 Định Công Thượng, Hoàng Mai, Hà Nội',
        receiverName: 'Chị Hưng',
        receiverPhone: '0977.123.789',
        district: 'Quận Hoàng Mai',
        province: 'Hà Nội',
        status: 'DELIVERED',
        totalAmount: 14800000,
        valueOnRoad: 0,
        deliveredAt: '2026-10-14T13:45:00',
        stockReturned: false,
        stopSequence: 2
      }
    ]
  }
];

function getStoredTrips(): DeliveryTrip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: DeliveryTrip[] = JSON.parse(raw);
      // Migrate các chuyến mẫu cũ ngày 15/10/2026 sang ngày hiện tại để thời gian trễ hợp lý
      let migrated = false;
      parsed.forEach((t) => {
        if (t.code === 'CG261015-88A1' && t.departedAt?.includes('2026-10-15')) {
          t.departedAt = '2026-10-19T14:00:00';
          t.expectedReturnAt = '2026-10-19T17:00:00';
          migrated = true;
        }
      });
      if (migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Lỗi đọc local trips:', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DELIVERY_TRIPS));
  return INITIAL_DELIVERY_TRIPS;
}

function saveStoredTrips(trips: DeliveryTrip[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (e) {
    console.warn('Lỗi lưu local trips:', e);
  }
}

function getStoredDispatchedOrders(): DeliveryTripStop[] {
  try {
    const raw = localStorage.getItem(DISPATCHED_ORDERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Lỗi đọc local dispatched orders:', e);
  }
  localStorage.setItem(DISPATCHED_ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_DISPATCHED_ORDERS));
  return INITIAL_DISPATCHED_ORDERS;
}

function saveStoredDispatchedOrders(orders: DeliveryTripStop[]): void {
  try {
    localStorage.setItem(DISPATCHED_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn('Lỗi lưu local dispatched orders:', e);
  }
}

/**
 * 1. Lấy danh sách phiếu xuất / đơn hàng đã xuất kho (DISPATCHED) sẵn sàng gom chuyến theo khu vực
 */
export async function fetchDispatchedOrdersForRouting(
  warehouseId?: number,
  regionId?: number,
  search?: string
): Promise<DeliveryTripStop[]> {
  try {
    const q = new URLSearchParams();
    if (warehouseId) q.set('warehouseId', String(warehouseId));
    if (regionId) q.set('regionId', String(regionId));
    if (search) q.set('search', search);

    const candUrl = `${API_BASE_URL}/api/delivery-trips/candidate-orders?${q.toString()}`;
    const candRes = await authFetch(candUrl);
    if (candRes.ok) {
      const candidates = await candRes.json();
      if (Array.isArray(candidates)) {
        return candidates.map((c: any, idx: number) => ({
          orderId: c.orderId,
          orderCode: c.orderCode,
          customerId: c.customerId,
          customerCode: c.customerCode,
          customerName: c.customerName,
          deliveryAddress: c.deliveryAddress || 'Tại địa chỉ khách hàng',
          receiverName: c.receiverName || c.customerName || 'Người nhận hàng',
          receiverPhone: c.receiverPhone || '',
          district: c.district || extractDistrict(c.deliveryAddress),
          province: c.province || 'Hà Nội',
          status: c.status || 'DISPATCHED',
          totalAmount: Number(c.totalAmount || 0),
          valueOnRoad: Number(c.totalAmount || 0),
          stockReturned: false,
          stopSequence: idx + 1
        }));
      }
    } else if (candRes.status === 403) {
      const errJson = await candRes.json().catch(() => null);
      throw new Error(errJson?.message || 'Bạn không được phân công kho chỉ định');
    }
  } catch (err: any) {
    if (err?.message?.includes('không được phân công')) {
      throw err;
    }
    console.warn('Backend candidate-orders API failed, falling back to legacy/local flow:', err);
  }

  try {
    const url = `${API_BASE_URL}/api/orders?status=DISPATCHED&size=100`;
    const res = await authFetch(url);
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.content;
      if (Array.isArray(rawList) && rawList.length > 0) {
        // Lấy danh sách các đơn đã nằm trên chuyến giao hàng để loại trừ
        const assignedOrderIds = new Set<number>();
        try {
          const tripsRes = await authFetch(`${API_BASE_URL}/api/delivery-trips`);
          if (tripsRes.ok) {
            const tripsData = await tripsRes.json();
            if (Array.isArray(tripsData)) {
              await Promise.all(
                tripsData.map(async (t: any) => {
                  try {
                    const dtRes = await authFetch(`${API_BASE_URL}/api/delivery-trips/${t.id}`);
                    if (dtRes.ok) {
                      const dt = await dtRes.json();
                      if (Array.isArray(dt.stops)) {
                        dt.stops.forEach((s: any) => assignedOrderIds.add(s.orderId));
                      }
                    }
                  } catch (e) {
                    // Bỏ qua lỗi lẻ của từng chuyến
                  }
                })
              );
            }
          }
        } catch (e) {
          console.warn('Lỗi kiểm tra đơn đã nằm trên chuyến:', e);
        }

        // Chỉ giữ lại những đơn chưa nằm trên chuyến xe nào và khớp kho đã chọn (nếu có)
        const unassignedOrders = rawList.filter((o: any) => {
          if (assignedOrderIds.has(o.id)) return false;
          if (warehouseId) {
            const wh = o.reservedWarehouse?.id || o.warehouseId || o.reservedWarehouseId;
            if (wh && Number(wh) !== Number(warehouseId)) return false;
          }
          return true;
        });

        const stops = await Promise.all(
          unassignedOrders.map(async (o: any, idx: number) => {
            let addr = '';
            let rName = o.customerName || 'Người nhận hàng';
            let rPhone = '0988.xxx.xxx';
            try {
              const dRes = await authFetch(`${API_BASE_URL}/api/orders/${o.id}`);
              if (dRes.ok) {
                const detail = await dRes.json();
                if (detail.deliveryAddress) {
                  addr = detail.deliveryAddress.address || '';
                  rName = detail.deliveryAddress.receiverName || rName;
                  rPhone = detail.deliveryAddress.receiverPhone || rPhone;
                }
              }
            } catch (e) {
              console.warn('Lỗi lấy địa chỉ đơn hàng #', o.id, e);
            }

            return {
              orderId: o.id,
              orderCode: o.orderCode || o.code || `SO-202610-${o.id}`,
              customerId: o.customerId || (o.customer ? o.customer.id : null),
              customerCode: o.customerCode || (o.customer ? o.customer.code : ''),
              customerName: o.customerName || (o.customer ? o.customer.name : 'Khách hàng'),
              deliveryAddress: addr || 'Tại địa chỉ khách hàng',
              receiverName: rName,
              receiverPhone: rPhone,
              district: extractDistrict(addr),
              province: 'Hà Nội',
              status: o.status || 'DISPATCHED',
              totalAmount: Number(o.totalAmount || 0),
              valueOnRoad: Number(o.totalAmount || 0),
              stockReturned: false,
              stopSequence: idx + 1
            };
          })
        );
        return stops;
      }
    }
  } catch (err) {
    console.warn('Backend fetch dispatched orders failed, using local orders:', err);
  }

  return getStoredDispatchedOrders();
}

/** Helper trích xuất tên Quận/Huyện từ địa chỉ */
function extractDistrict(addr: string): string {
  if (!addr) return 'Khu vực nội thành';
  const match = addr.match(/(Quận|Huyện|Thị xã)\s+([A-Za-zÀ-ỹ0-9\s]+?)(,|$)/i);
  if (match) return `${match[1]} ${match[2]}`.trim();
  return 'Khu vực nội thành';
}

/**
 * 2. Lấy danh sách các chuyến giao hàng (Delivery Trips)
 */
export async function fetchDeliveryTrips(params?: {
  status?: string;
  warehouseId?: number;
}): Promise<DeliveryTrip[]> {
  let backendTrips: DeliveryTrip[] = [];
  let backendSuccess = false;
  try {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));

    const res = await authFetch(`${API_BASE_URL}/api/delivery-trips?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        backendTrips = data;
        backendSuccess = true;
      }
    }
  } catch (err) {
    console.warn('Backend fetch delivery trips failed, using local trips:', err);
  }

  const localTrips = getStoredTrips();
  const mergedBackendTrips = backendTrips.map((bt) => {
    const matchedLocal = localTrips.find((lt) => lt.id === bt.id || lt.code === bt.code);
    if (matchedLocal && (!bt.totalValue || bt.totalValue === 0)) {
      return {
        ...bt,
        totalValue: matchedLocal.totalValue || (matchedLocal.stops ? matchedLocal.stops.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0) : undefined)
      };
    }
    return bt;
  });

  const combined = [...mergedBackendTrips];
  localTrips.forEach((lt) => {
    if (!combined.some((bt) => bt.id === lt.id || bt.code === lt.code)) {
      combined.push(lt);
    }
  });

  let trips = backendSuccess && combined.length > 0 ? combined : (backendSuccess ? mergedBackendTrips : localTrips);

  if (params?.status && params.status !== 'ALL') {
    trips = trips.filter((t) => t.status === params.status);
  }
  if (params?.warehouseId) {
    trips = trips.filter((t) => t.warehouseId === params.warehouseId);
  }

  // Cập nhật tính toán overdue dựa theo thời gian thực
  const now = new Date();
  trips.forEach((t) => {
    if (t.status === 'IN_PROGRESS' && t.expectedReturnAt) {
      const exp = new Date(t.expectedReturnAt);
      if (now > exp) {
        t.overdue = true;
        t.overdueMinutes = Math.floor((now.getTime() - exp.getTime()) / 60000);
      } else {
        t.overdue = false;
        t.overdueMinutes = 0;
      }
    }
  });

  return trips;
}

/**
 * Định dạng thời gian trễ thân thiện (quy đổi thành giờ / ngày giờ thay vì chỉ hiển thị hàng nghìn phút)
 */
export function formatOverdueTime(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) {
    return `Trễ ${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes > 0 ? `Trễ ${hours} giờ ${remMinutes} phút` : `Trễ ${hours} giờ`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0
    ? `Trễ ${days} ngày ${remHours} giờ (~${hours} giờ)`
    : `Trễ ${days} ngày (~${hours} giờ)`;
}

/**
 * 3. Lấy tóm tắt hàng đi đường (InTransit Summary)
 */
export async function fetchInTransitSummary(): Promise<InTransitSummary> {
  let backendData: any = null;
  try {
    const res = await authFetch(`${API_BASE_URL}/api/delivery-trips/summary`);
    if (res.ok) {
      backendData = await res.json();
    }
  } catch (err) {
    console.warn('Backend fetch in-transit summary failed, calculating locally:', err);
  }

  // Luôn lấy trips đã qua tính toán overdue theo thời gian thực để đồng bộ số liệu
  const trips = await fetchDeliveryTrips();
  const dispatchedOrders = getStoredDispatchedOrders();

  const runningTrips = trips.filter((t) => t.status === 'IN_PROGRESS');
  const overdueTrips = runningTrips.filter((t) => t.overdue).length;
  const ordersOnRoad = runningTrips.reduce((acc, t) => acc + (t.remainingStops || 0), 0);
  const valueOnRoad = runningTrips.reduce((acc, t) => acc + (t.valueOnRoad || 0), 0);

  const unassignedDispatchedOrders = backendData?.unassignedOrders ?? dispatchedOrders.length;
  const unassignedValue =
    backendData?.unassignedValue != null
      ? Number(backendData.unassignedValue)
      : dispatchedOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  // Nếu backend có các chuyến xe thực tế đang chạy thì ưu tiên số liệu backend
  if (backendData && backendData.activeTrips > 0) {
    return {
      runningTrips: backendData.activeTrips ?? 0,
      overdueTrips: backendData.overdueTrips ?? 0,
      ordersOnRoad: backendData.ordersOnRoad ?? 0,
      valueOnRoad: Number(backendData.valueOnRoad ?? 0),
      unassignedDispatchedOrders,
      unassignedValue
    };
  }

  // Ngược lại, lấy số liệu đồng bộ chính xác với danh sách hiển thị trên giao diện
  return {
    runningTrips: runningTrips.length,
    overdueTrips,
    ordersOnRoad,
    valueOnRoad,
    unassignedDispatchedOrders,
    unassignedValue
  };
}

/**
 * 4. Xem chi tiết một chuyến giao hàng
 */
export async function fetchDeliveryTripById(id: number): Promise<DeliveryTrip> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/delivery-trips/${id}`);
    if (res.ok) {
      const data = await res.json();
      // Nếu backend trả về { trip: {...}, stops: [...] }
      if (data.trip && data.stops) {
        const calculatedTotal = (data.stops || []).reduce(
          (sum: number, s: any) => sum + (Number(s.totalAmount) || 0),
          0
        );
        const fullTrip: DeliveryTrip = {
          ...data.trip,
          totalValue:
            data.trip.totalValue && data.trip.totalValue > 0
              ? data.trip.totalValue
              : calculatedTotal,
          stops: data.stops
        };

        // Đồng bộ ngược lại vào storage để danh sách bên ngoài cũng có totalValue
        try {
          const stored = getStoredTrips();
          const idx = stored.findIndex((t) => t.id === fullTrip.id || t.code === fullTrip.code);
          if (idx >= 0) {
            stored[idx] = { ...stored[idx], ...fullTrip };
          } else {
            stored.unshift(fullTrip);
          }
          saveStoredTrips(stored);
        } catch (e) {
          console.warn('Lỗi lưu cache chuyến giao:', e);
        }

        return fullTrip;
      }
      return data;
    }
  } catch (err) {
    console.warn('Backend fetch delivery trip by id failed:', err);
  }

  const trips = getStoredTrips();
  const found = trips.find((t) => t.id === Number(id));
  if (found) return found;

  throw new Error(`Không tìm thấy chuyến giao hàng #${id}`);
}

/**
 * 5. Tạo mới Chuyến giao hàng (Gom phiếu xuất, gán tài xế & phương tiện)
 */
export async function createDeliveryTrip(req: DeliveryTripCreateRequest): Promise<DeliveryTrip> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/delivery-trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds: req.orderIds,
        vehiclePlate: req.vehiclePlate,
        driverName: req.driverName,
        driverPhone: req.driverPhone,
        expectedReturnAt: req.expectedReturnAt,
        note: req.note
      })
    });
    if (res.ok) {
      const data = await res.json();
      const tripObj = data.trip ? { ...data.trip, stops: data.stops } : data;
      const trips = getStoredTrips();
      trips.unshift(tripObj);
      saveStoredTrips(trips);

      // Cập nhật loại bỏ các đơn đã xếp chuyến khỏi danh sách chờ
      const unassigned = getStoredDispatchedOrders();
      const filtered = unassigned.filter((o) => !req.orderIds.includes(o.orderId));
      saveStoredDispatchedOrders(filtered);

      return tripObj;
    } else {
      const errJson = await res.json().catch(() => null);
      if (res.status === 400 || res.status === 409 || res.status === 403) {
        throw new Error(errJson?.message || errJson?.error || `Lỗi máy chủ (${res.status})`);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    console.warn('Backend create delivery trip failed, saving locally:', err);
  }

  // Local fallback
  const trips = getStoredTrips();
  const allDispatched = getStoredDispatchedOrders();
  const selectedStops = allDispatched
    .filter((o) => req.orderIds.includes(o.orderId))
    .map((o, idx) => ({ ...o, stopSequence: idx + 1 }));

  const now = new Date().toISOString();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString(36).toUpperCase();
  const newCode = `CG${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${randomSuffix}`;
  const totalValue = selectedStops.reduce((sum, s) => sum + s.totalAmount, 0);

  const newTrip: DeliveryTrip = {
    id: Date.now(),
    code: newCode,
    warehouseId: req.warehouseId || 1,
    warehouseCode: 'WH-MB01',
    warehouseName: req.warehouseId === 2 ? 'Kho Miền Trung (Đà Nẵng)' : 'Kho Tổng Miền Bắc (Hà Nội)',
    vehiclePlate: req.vehiclePlate?.trim() || '',
    driverName: req.driverName?.trim() || '',
    driverPhone: req.driverPhone?.trim() || null,
    status: 'IN_PROGRESS',
    departedAt: now,
    expectedReturnAt: req.expectedReturnAt,
    completedAt: null,
    totalStops: selectedStops.length,
    deliveredStops: 0,
    failedStops: 0,
    remainingStops: selectedStops.length,
    valueOnRoad: totalValue,
    overdue: false,
    overdueMinutes: 0,
    note: req.note || '',
    stops: selectedStops
  };

  trips.unshift(newTrip);
  saveStoredTrips(trips);

  // Loại bỏ các đơn đã gán khỏi danh sách chờ
  const remainingDispatched = allDispatched.filter((o) => !req.orderIds.includes(o.orderId));
  saveStoredDispatchedOrders(remainingDispatched);

  return newTrip;
}

/**
 * 6. Kết thúc chuyến giao hàng (xe về kho)
 */
export async function completeDeliveryTrip(id: number, req?: DeliveryTripCompleteRequest): Promise<DeliveryTrip> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/delivery-trips/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req || {})
    });
    if (res.ok) {
      const data = await res.json();
      const tripObj = data.trip ? { ...data.trip, stops: data.stops } : data;
      const trips = getStoredTrips();
      const idx = trips.findIndex((t) => t.id === id);
      if (idx >= 0) trips[idx] = tripObj;
      saveStoredTrips(trips);
      return tripObj;
    } else {
      const errJson = await res.json().catch(() => null);
      if (res.status === 400 || res.status === 409 || res.status === 403 || res.status === 404) {
        throw new Error(errJson?.message || errJson?.error || `Lỗi máy chủ (${res.status})`);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    console.warn('Backend complete delivery trip failed, updating locally:', err);
  }

  const trips = getStoredTrips();
  const trip = trips.find((t) => t.id === id);
  if (!trip) throw new Error('Không tìm thấy chuyến');

  trip.status = 'COMPLETED';
  trip.completedAt = new Date().toISOString();
  trip.remainingStops = 0;
  trip.deliveredStops = trip.totalStops;
  trip.valueOnRoad = 0;
  trip.overdue = false;
  trip.overdueMinutes = 0;
  if (trip.stops) {
    trip.stops.forEach((s) => {
      if (s.status === 'DISPATCHED') {
        s.status = 'DELIVERED';
        s.deliveredAt = trip.completedAt;
        s.valueOnRoad = 0;
      }
    });
  }

  saveStoredTrips(trips);
  return { ...trip };
}

/**
 * 7. Xác nhận giao hàng thành công cho một điểm giao (Sales Order)
 * POST /api/orders/{id}/status với { status: 'DELIVERED', note }
 */
export async function confirmStopDelivery(orderId: number, note?: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'DELIVERED',
      note: note || 'Đại lý đã nhận đủ hàng thành công'
    })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.message || errJson?.error || 'Không thể xác nhận giao hàng cho đơn này');
  }
  return await res.json();
}

/**
 * 8. Ghi nhận giao hàng không thành công cho một điểm giao (Sales Order)
 * POST /api/orders/{id}/delivery-failed với { reason }
 */
export async function failStopDelivery(orderId: number, reason: string): Promise<any> {
  const cleanReason = (reason || '').trim();
  if (!cleanReason) {
    throw new Error('Bắt buộc nhập lý do giao hàng không thành công');
  }
  const res = await authFetch(`${API_BASE_URL}/api/orders/${orderId}/delivery-failed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: cleanReason })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.message || errJson?.error || 'Không thể ghi nhận giao thất bại cho đơn này');
  }
  return await res.json();
}

/**
 * 9. Tự động xác nhận giao thành công tất cả điểm còn lại và kết thúc chuyến (Xe về kho)
 */
export async function completeTripWithAutoResolve(
  tripId: number,
  note?: string
): Promise<DeliveryTrip> {
  // Lấy chi tiết các điểm giao hiện tại
  const trip = await fetchDeliveryTripById(tripId);
  if (trip.stops && trip.stops.length > 0) {
    const pendingStops = trip.stops.filter((s) => s.status === 'DISPATCHED');
    for (const stop of pendingStops) {
      try {
        await confirmStopDelivery(stop.orderId, note || 'Tự động xác nhận giao hàng khi xe về kho');
      } catch (err) {
        console.warn(`Lỗi xác nhận đơn ${stop.orderCode}:`, err);
      }
    }
  }

  // Kết thúc chuyến xe về kho
  return await completeDeliveryTrip(tripId, { note });
}

/**
 * 10. AC3: In bảng kê điểm giao (Delivery Manifest) kèm địa chỉ và số điện thoại người nhận
 */
export async function fetchDeliveryTripManifest(tripId: number): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/delivery-trips/${tripId}/manifest`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetch delivery manifest failed:', err);
  }
  return null;
}

