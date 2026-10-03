/**
 * S2-10 / SCRUM-55: API Service & Client Layer cho Quản lý Bảng giá
 * Tích hợp trực tiếp với PriceListController (/api/price-lists) của Backend Spring Boot.
 * Tự động hỗ trợ Fallback LocalStorage khi chạy độc lập / Offline.
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  PriceList,
  PriceListRequest,
  PriceListItemRequest,
  PriceLookupResponse,
  CustomerGroupType,
  PriceListStatus
} from '../types/pricing';

const STORAGE_KEY = 'erp_price_lists_v1';

// Dữ liệu mẫu khởi tạo song song cho các nhóm khách hàng
const INITIAL_PRICE_LISTS: PriceList[] = [
  {
    id: 1,
    code: 'BG-DL1-2026',
    name: 'Bảng giá Đại lý Cấp 1 Toàn Quốc Q4/2026',
    customerGroup: 'DEALER_LEVEL_1',
    customerGroupLabel: 'Đại lý cấp 1',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    hasOrders: true, // Đã phát sinh đơn -> không được sửa, chỉ clone version
    version: 1,
    note: 'Chính sách giá sỉ ưu đãi lớn nhất cho NPP cấp tỉnh. Bán dưới giá sàn cần duyệt bởi GĐ Kinh Doanh.',
    itemsCount: 5,
    items: [
      { id: 101, productSku: 'BIA-HN-330', productName: 'Bia Hà Nội Lon 330ml (Thùng 24 lon)', price: 195000, floorPrice: 185000 },
      { id: 102, productSku: 'BIA-SG-330', productName: 'Bia Sài Gòn Special Lon 330ml', price: 240000, floorPrice: 228000 },
      { id: 103, productSku: 'COCA-320', productName: 'Nước ngọt Coca-Cola Lon 320ml', price: 155000, floorPrice: 148000 },
      { id: 104, productSku: 'LAVIE-500', productName: 'Nước khoáng thiên nhiên Lavie 500ml', price: 85000, floorPrice: 80000 },
      { id: 105, productSku: 'TH-TRUE-1L', productName: 'Sữa tươi tiệt trùng TH True Milk 1L', price: 295000, floorPrice: 285000 }
    ],
    createdAt: '2026-10-01T08:00:00',
    updatedAt: '2026-10-02T10:15:00'
  },
  {
    id: 2,
    code: 'BG-DL2-2026',
    name: 'Bảng giá Đại lý Cấp 2 Khu Vực Phía Bắc Q4/2026',
    customerGroup: 'DEALER_LEVEL_2',
    customerGroupLabel: 'Đại lý cấp 2',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    hasOrders: false, // Chưa phát sinh đơn -> cho phép sửa trực tiếp
    version: 1,
    note: 'Áp dụng cho các cửa hàng, điểm bán buôn vệ tinh tại Miền Bắc.',
    itemsCount: 4,
    items: [
      { id: 201, productSku: 'BIA-HN-330', productName: 'Bia Hà Nội Lon 330ml (Thùng 24 lon)', price: 215000, floorPrice: 205000 },
      { id: 202, productSku: 'BIA-SG-330', productName: 'Bia Sài Gòn Special Lon 330ml', price: 265000, floorPrice: 250000 },
      { id: 203, productSku: 'COCA-320', productName: 'Nước ngọt Coca-Cola Lon 320ml', price: 170000, floorPrice: 162000 },
      { id: 204, productSku: 'LAVIE-500', productName: 'Nước khoáng thiên nhiên Lavie 500ml', price: 95000, floorPrice: 90000 }
    ],
    createdAt: '2026-10-01T09:00:00',
    updatedAt: '2026-10-01T09:00:00'
  },
  {
    id: 3,
    code: 'BG-RETAIL-2026',
    name: 'Bảng giá Bán lẻ & Showroom Tiêu Chuẩn 2026',
    customerGroup: 'RETAIL',
    customerGroupLabel: 'Khách lẻ',
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    hasOrders: true,
    version: 1,
    note: 'Bảng giá niêm yết bán lẻ đề xuất chuẩn tại chuỗi showroom và người tiêu dùng.',
    itemsCount: 6,
    items: [
      { id: 301, productSku: 'BIA-HN-330', productName: 'Bia Hà Nội Lon 330ml (Thùng 24 lon)', price: 260000, floorPrice: 245000 },
      { id: 302, productSku: 'BIA-SG-330', productName: 'Bia Sài Gòn Special Lon 330ml', price: 320000, floorPrice: 300000 },
      { id: 303, productSku: 'COCA-320', productName: 'Nước ngọt Coca-Cola Lon 320ml', price: 195000, floorPrice: 185000 },
      { id: 304, productSku: 'LAVIE-500', productName: 'Nước khoáng thiên nhiên Lavie 500ml', price: 110000, floorPrice: 100000 },
      { id: 305, productSku: 'TH-TRUE-1L', productName: 'Sữa tươi tiệt trùng TH True Milk 1L', price: 380000, floorPrice: 360000 },
      { id: 306, productSku: 'NEPTUNE-1L', productName: 'Dầu ăn thượng hạng Neptune Gold 1L', price: 520000, floorPrice: 500000 }
    ],
    createdAt: '2026-09-01T08:00:00',
    updatedAt: '2026-09-15T14:30:00'
  },
  {
    id: 4,
    code: 'BG-DL1-TET2026',
    name: 'Bảng giá Đại lý Cấp 1 Chiến Dịch Tết 2027 (Kế hoạch)',
    customerGroup: 'DEALER_LEVEL_1',
    customerGroupLabel: 'Đại lý cấp 1',
    startDate: '2026-12-15',
    endDate: '2027-02-15',
    status: 'INACTIVE',
    hasOrders: false,
    version: 1,
    note: 'Chương trình trợ giá vụ Tết Nguyên Đán, chuẩn bị kích hoạt.',
    itemsCount: 3,
    items: [
      { id: 401, productSku: 'BIA-HN-330', productName: 'Bia Hà Nội Lon 330ml (Thùng 24 lon)', price: 190000, floorPrice: 180000 },
      { id: 402, productSku: 'BIA-TB-330', productName: 'Bia Trúc Bạch Chai Cao Cấp 330ml', price: 390000, floorPrice: 375000 },
      { id: 403, productSku: 'REDBULL-250', productName: 'Nước tăng lực Red Bull 250ml (Thái Lan)', price: 220000, floorPrice: 210000 }
    ],
    createdAt: '2026-10-02T16:00:00',
    updatedAt: '2026-10-02T16:00:00'
  }
];

function getLocalData(): PriceList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRICE_LISTS));
      return INITIAL_PRICE_LISTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PRICE_LISTS;
  }
}

function saveLocalData(data: PriceList[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save price lists to localStorage', e);
  }
}

/**
 * Lấy danh sách bảng giá (có bộ lọc nhóm khách hàng, trạng thái, từ khóa)
 */
export async function fetchPriceLists(params?: {
  customerGroup?: CustomerGroupType;
  status?: string;
  keyword?: string;
}): Promise<PriceList[]> {
  const query = new URLSearchParams();
  if (params?.customerGroup) query.set('customerGroup', params.customerGroup);
  if (params?.status) query.set('status', params.status);
  if (params?.keyword) query.set('keyword', params.keyword);

  const url = `${API_BASE_URL}/api/price-lists${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const res = await authFetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('API error fetching price lists, fallback to local storage', err);
  }

  // Fallback lọc dữ liệu local
  let list = getLocalData();
  if (params?.customerGroup) {
    list = list.filter((p) => p.customerGroup === params.customerGroup);
  }
  if (params?.status) {
    list = list.filter((p) => p.status === params.status);
  }
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.code.toLowerCase().includes(kw) ||
        p.name.toLowerCase().includes(kw) ||
        (p.note && p.note.toLowerCase().includes(kw))
    );
  }
  return list;
}

/**
 * Lấy chi tiết một bảng giá kèm toàn bộ danh sách dòng giá
 */
export async function fetchPriceListById(id: number): Promise<PriceList> {
  const url = `${API_BASE_URL}/api/price-lists/${id}`;
  try {
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`API error fetching price list ${id}, fallback to local storage`, err);
  }

  const list = getLocalData();
  const item = list.find((p) => p.id === id);
  if (!item) {
    throw new Error(`Không tìm thấy bảng giá ID ${id}`);
  }
  return item;
}

/**
 * Tạo bảng giá mới (kèm danh sách dòng giá & giá sàn)
 */
export async function createPriceList(payload: PriceListRequest): Promise<PriceList> {
  const url = `${API_BASE_URL}/api/price-lists`;
  try {
    const res = await authFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData?.message) throw new Error(errData.message);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('tồn tại') || message.includes('trống') || message.includes('giá sàn')) {
      throw err;
    }
    console.warn('Backend unavailable, creating in local storage', err);
  }

  const list = getLocalData();
  const code = payload.code.trim().toUpperCase();
  if (list.some((p) => p.code.toUpperCase() === code)) {
    throw new Error(`Mã bảng giá '${code}' đã tồn tại trong hệ thống!`);
  }

  const newId = Date.now();
  const items = (payload.items || []).map((it, idx) => ({
    id: newId + idx + 1,
    productSku: it.productSku.toUpperCase().trim(),
    productName: it.productName || it.productSku,
    price: it.price,
    floorPrice: it.floorPrice,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  const customerGroupLabels: Record<CustomerGroupType, string> = {
    DEALER_LEVEL_1: 'Đại lý cấp 1',
    DEALER_LEVEL_2: 'Đại lý cấp 2',
    RETAIL: 'Khách lẻ'
  };

  const newPriceList: PriceList = {
    id: newId,
    code,
    name: payload.name.trim(),
    customerGroup: payload.customerGroup,
    customerGroupLabel: customerGroupLabels[payload.customerGroup],
    startDate: payload.startDate,
    endDate: payload.endDate || null,
    status: 'ACTIVE',
    hasOrders: false,
    version: 1,
    note: payload.note || null,
    itemsCount: items.length,
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  list.unshift(newPriceList);
  saveLocalData(list);
  return newPriceList;
}

/**
 * Cập nhật bảng giá (Chỉ cho phép khi chưa phát sinh đơn)
 */
export async function updatePriceList(id: number, payload: PriceListRequest): Promise<PriceList> {
  const url = `${API_BASE_URL}/api/price-lists/${id}`;
  try {
    const res = await authFetch(url, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData?.message) throw new Error(errData.message);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('phát sinh đơn') || message.includes('tồn tại') || message.includes('giá sàn')) {
      throw err;
    }
    console.warn(`Backend unavailable, updating local storage ${id}`, err);
  }

  const list = getLocalData();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Không tìm thấy bảng giá ID ${id}`);

  if (list[index].hasOrders) {
    throw new Error('Bảng giá đã phát sinh đơn hàng nên không thể chỉnh sửa. Vui lòng tạo phiên bản mới.');
  }

  const customerGroupLabels: Record<CustomerGroupType, string> = {
    DEALER_LEVEL_1: 'Đại lý cấp 1',
    DEALER_LEVEL_2: 'Đại lý cấp 2',
    RETAIL: 'Khách lẻ'
  };

  const items = (payload.items || []).map((it, idx) => ({
    id: id * 1000 + idx + 1,
    productSku: it.productSku.toUpperCase().trim(),
    productName: it.productName || it.productSku,
    price: it.price,
    floorPrice: it.floorPrice,
    createdAt: list[index].createdAt,
    updatedAt: new Date().toISOString()
  }));

  const updated: PriceList = {
    ...list[index],
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    customerGroup: payload.customerGroup,
    customerGroupLabel: customerGroupLabels[payload.customerGroup],
    startDate: payload.startDate,
    endDate: payload.endDate || null,
    note: payload.note || null,
    itemsCount: items.length,
    items,
    updatedAt: new Date().toISOString()
  };

  list[index] = updated;
  saveLocalData(list);
  return updated;
}

/**
 * Tạo phiên bản mới từ bảng giá đã có (Đặc biệt hữu ích khi bảng giá cũ đã phát sinh đơn)
 */
export async function clonePriceListVersion(
  id: number,
  payload?: Partial<PriceListRequest>
): Promise<PriceList> {
  const url = `${API_BASE_URL}/api/price-lists/${id}/clone-version`;
  try {
    const res = await authFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData?.message) throw new Error(errData.message);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('tồn tại') || message.includes('giá sàn')) {
      throw err;
    }
    console.warn(`Backend unavailable, cloning version locally for ${id}`, err);
  }

  const list = getLocalData();
  const original = list.find((p) => p.id === id);
  if (!original) throw new Error(`Không tìm thấy bảng giá ID ${id} để nhân bản`);

  const nextVersion = (original.version || 1) + 1;
  const newCode = payload?.code ? payload.code.trim().toUpperCase() : `${original.code}-V${nextVersion}`;
  const newName = payload?.name ? payload.name.trim() : `${original.name} (v${nextVersion})`;
  const newId = Date.now();

  const clonedItems = payload?.items && payload.items.length > 0
    ? payload.items.map((it, idx) => ({
        id: newId + idx + 1,
        productSku: it.productSku.toUpperCase().trim(),
        productName: it.productName || it.productSku,
        price: it.price,
        floorPrice: it.floorPrice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    : (original.items || []).map((it, idx) => ({
        ...it,
        id: newId + idx + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

  const cloned: PriceList = {
    ...original,
    id: newId,
    code: newCode,
    name: newName,
    customerGroup: payload?.customerGroup || original.customerGroup,
    startDate: payload?.startDate || new Date().toISOString().split('T')[0],
    endDate: payload?.endDate ?? original.endDate,
    status: 'ACTIVE',
    hasOrders: false, // Phiên bản mới ban đầu chưa phát sinh đơn
    version: nextVersion,
    note: payload?.note || `Nhân bản từ phiên bản ${original.code} (v${original.version})`,
    itemsCount: clonedItems.length,
    items: clonedItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  list.unshift(cloned);
  saveLocalData(list);
  return cloned;
}

/**
 * Bật/Tắt trạng thái bảng giá (ACTIVE | INACTIVE)
 */
export async function changePriceListStatus(id: number, status: PriceListStatus): Promise<PriceList> {
  const url = `${API_BASE_URL}/api/price-lists/${id}/status?status=${status}`;
  try {
    const res = await authFetch(url, { method: 'PATCH' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Backend unavailable, updating status locally for ${id}`, err);
  }

  const list = getLocalData();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Không tìm thấy bảng giá ID ${id}`);

  list[index].status = status;
  list[index].updatedAt = new Date().toISOString();
  saveLocalData(list);
  return list[index];
}

/**
 * Thêm hoặc cập nhật một dòng sản phẩm kèm giá sàn
 */
export async function addOrUpdatePriceListItem(id: number, itemReq: PriceListItemRequest): Promise<PriceList> {
  const url = `${API_BASE_URL}/api/price-lists/${id}/items`;
  try {
    const res = await authFetch(url, {
      method: 'POST',
      body: JSON.stringify(itemReq)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData?.message) throw new Error(errData.message);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('phát sinh đơn') || message.includes('giá sàn')) {
      throw err;
    }
    console.warn(`Backend unavailable, adding item locally for ${id}`, err);
  }

  const list = getLocalData();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Không tìm thấy bảng giá ID ${id}`);

  if (list[index].hasOrders) {
    throw new Error('Bảng giá đã phát sinh đơn hàng, không thể thay đổi dòng giá. Vui lòng tạo phiên bản mới.');
  }

  if (itemReq.floorPrice > itemReq.price) {
    throw new Error(`Mức giá sàn (${itemReq.floorPrice.toLocaleString()} đ) không được lớn hơn giá bán (${itemReq.price.toLocaleString()} đ)!`);
  }

  const items = list[index].items || [];
  const sku = itemReq.productSku.toUpperCase().trim();
  const existingItemIdx = items.findIndex((it) => it.productSku.toUpperCase() === sku);

  if (existingItemIdx >= 0) {
    items[existingItemIdx] = {
      ...items[existingItemIdx],
      productName: itemReq.productName || items[existingItemIdx].productName,
      price: itemReq.price,
      floorPrice: itemReq.floorPrice,
      updatedAt: new Date().toISOString()
    };
  } else {
    items.push({
      id: Date.now(),
      productSku: sku,
      productName: itemReq.productName || sku,
      price: itemReq.price,
      floorPrice: itemReq.floorPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  list[index].items = items;
  list[index].itemsCount = items.length;
  list[index].updatedAt = new Date().toISOString();
  saveLocalData(list);
  return list[index];
}

/**
 * Xóa một dòng sản phẩm khỏi bảng giá
 */
export async function deletePriceListItem(id: number, itemId: number): Promise<PriceList> {
  const url = `${API_BASE_URL}/api/price-lists/${id}/items/${itemId}`;
  try {
    const res = await authFetch(url, { method: 'DELETE' });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData?.message) throw new Error(errData.message);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('phát sinh đơn')) {
      throw err;
    }
    console.warn(`Backend unavailable, deleting item locally for ${id}`, err);
  }

  const list = getLocalData();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Không tìm thấy bảng giá ID ${id}`);

  if (list[index].hasOrders) {
    throw new Error('Bảng giá đã phát sinh đơn hàng, không thể xóa dòng giá. Vui lòng tạo phiên bản mới.');
  }

  list[index].items = (list[index].items || []).filter((it) => it.id !== itemId);
  list[index].itemsCount = list[index].items.length;
  list[index].updatedAt = new Date().toISOString();
  saveLocalData(list);
  return list[index];
}

/**
 * S2-10 Tra cứu nhanh giá bán niêm yết và mức giá sàn theo Nhóm khách hàng + SKU + Ngày
 */
export async function lookupPrice(params: {
  customerGroup: CustomerGroupType;
  productSku: string;
  date?: string;
}): Promise<PriceLookupResponse> {
  const query = new URLSearchParams({
    customerGroup: params.customerGroup,
    productSku: params.productSku
  });
  if (params.date) query.set('date', params.date);

  const url = `${API_BASE_URL}/api/price-lists/lookup?${query.toString()}`;
  try {
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData?.message) throw new Error(errData.message);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Không tìm thấy') || message.includes('hiệu lực')) {
      throw err;
    }
    console.warn('Backend lookup unavailable, querying locally', err);
  }

  const targetDate = params.date || new Date().toISOString().split('T')[0];
  const list = getLocalData();
  const sku = params.productSku.toUpperCase().trim();

  // Tìm bảng giá ACTIVE phù hợp với nhóm khách hàng và thời gian hiệu lực
  const matchedList = list.find((p) => {
    if (p.status !== 'ACTIVE') return false;
    if (p.customerGroup !== params.customerGroup) return false;
    if (p.startDate && p.startDate > targetDate) return false;
    if (p.endDate && p.endDate < targetDate) return false;
    return true;
  });

  if (!matchedList) {
    throw new Error(
      `Không có bảng giá nào đang áp dụng cho nhóm '${params.customerGroup}' vào ngày ${targetDate}`
    );
  }

  const matchedItem = (matchedList.items || []).find(
    (i) => i.productSku.toUpperCase() === sku
  );

  if (!matchedItem) {
    throw new Error(
      `Sản phẩm SKU '${sku}' chưa được định giá trong bảng giá '${matchedList.code}'`
    );
  }

  const customerGroupLabels: Record<CustomerGroupType, string> = {
    DEALER_LEVEL_1: 'Đại lý cấp 1',
    DEALER_LEVEL_2: 'Đại lý cấp 2',
    RETAIL: 'Khách lẻ'
  };

  return {
    priceListId: matchedList.id,
    priceListCode: matchedList.code,
    priceListName: matchedList.name,
    customerGroup: matchedList.customerGroup,
    customerGroupLabel: customerGroupLabels[matchedList.customerGroup],
    effectiveDate: targetDate,
    productSku: matchedItem.productSku,
    productName: matchedItem.productName,
    price: matchedItem.price,
    floorPrice: matchedItem.floorPrice
  };
}
