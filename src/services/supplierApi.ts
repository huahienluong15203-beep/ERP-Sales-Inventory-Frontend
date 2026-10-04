/**
 * S2-09 / SCRUM-46: API Service & Client Layer cho Quản lý danh mục nhà cung cấp
 * Tích hợp trực tiếp với SupplierController (/api/suppliers) của Backend Spring Boot.
 * Hỗ trợ Fallback LocalStorage & Tự động khởi tạo dữ liệu mẫu.
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  Supplier,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  ChangeSupplierStatusPayload,
  SupplierFilterParams,
  SupplierPageResponse,
  SupplierStatsData
} from '../types/supplier';

const STORAGE_KEY = 'erp_suppliers_v1';

// Dữ liệu mẫu khởi tạo cho danh mục nhà cung cấp
export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    code: 'NCC-VNM',
    name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
    taxCode: '0300588569',
    contactName: 'Nguyễn Văn Toàn - P. Kinh Doanh',
    phone: '02854155555',
    email: 'vinamilk@vinamilk.com.vn',
    address: 'Số 10 Tân Trào, P. Tân Phú, Quận 7, TP. Hồ Chí Minh',
    paymentTerms: 'Thanh toán chuyển khoản sau 30 ngày kể từ ngày giao hàng',
    note: 'Nguồn hàng sữa hạt, sữa tươi thanh trùng chính hãng. Chiết khấu cao.',
    status: 'ACTIVE',
    statusReason: null,
    createdAt: '2026-09-01T08:00:00',
    updatedAt: '2026-09-01T08:00:00'
  },
  {
    id: 2,
    code: 'NCC-SABECO',
    name: 'Tổng Công ty Cổ phần Bia - Rượu - Nước giải khát Sài Gòn (SABECO)',
    taxCode: '0300583659',
    contactName: 'Trần Thị Mai Phương',
    phone: '02838294083',
    email: 'sabeco@sabeco.com.vn',
    address: '187 Nguyễn Chí Thanh, Phường 12, Quận 5, TP. Hồ Chí Minh',
    paymentTerms: 'Thanh toán trước 50%, 50% còn lại trong 15 ngày sau khi nhập kho',
    note: 'Cung cấp Bia Sài Gòn Special, Bia 333, Bia Lạc Việt. Giao hàng theo lịch cố định.',
    status: 'ACTIVE',
    statusReason: null,
    createdAt: '2026-09-05T09:30:00',
    updatedAt: '2026-09-05T09:30:00'
  },
  {
    id: 3,
    code: 'NCC-HABECO',
    name: 'Tổng Công ty Cổ phần Bia - Rượu - Nước giải khát Hà Nội (HABECO)',
    taxCode: '0100100989',
    contactName: 'Lê Hoàng Anh',
    phone: '02438453843',
    email: 'habeco@habeco.com.vn',
    address: '183 Hoàng Hoa Thám, Ba Đình, Hà Nội',
    paymentTerms: 'Thanh toán chuyển khoản trong 45 ngày',
    note: 'Nhà máy cung ứng Bia Hà Nội lon 330ml và chai 450ml.',
    status: 'ACTIVE',
    statusReason: null,
    createdAt: '2026-09-10T14:15:00',
    updatedAt: '2026-09-10T14:15:00'
  },
  {
    id: 4,
    code: 'NCC-MASAN',
    name: 'Công ty Cổ phần Hàng tiêu dùng Masan (Masan Consumer)',
    taxCode: '0302017440',
    contactName: 'Phạm Minh Đức',
    phone: '02862563862',
    email: 'contact@masan.com.vn',
    address: 'Tầng 12, Tòa nhà MPlaza Saigon, 39 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM',
    paymentTerms: 'Thanh toán gối đầu theo từng đợt nhập hàng',
    note: 'Nguồn hàng gia vị Chin-Su, Nam Ngư, Mì Omachi, Kokomi.',
    status: 'ACTIVE',
    statusReason: null,
    createdAt: '2026-09-15T10:00:00',
    updatedAt: '2026-09-15T10:00:00'
  },
  {
    id: 5,
    code: 'NCC-LAVIE',
    name: 'Công ty TNHH La Vie (Nestlé Waters)',
    taxCode: '1100115714',
    contactName: 'Đỗ Thùy Trang',
    phone: '02723871225',
    email: 'cskh@laviewater.com',
    address: 'Quốc lộ 1A, Phường Khánh Hậu, Thành phố Tân An, Tỉnh Long An',
    paymentTerms: 'Thanh toán ngay khi nhận hóa đơn GTGT điện tử',
    note: 'Tạm ngừng nhập hàng do đang đàm phán lại hạn mức công nợ.',
    status: 'INACTIVE',
    statusReason: 'Tạm ngừng giao dịch để đối soát công nợ quý 3 và ký lại hợp đồng nguyên tắc năm 2027',
    createdAt: '2026-09-20T11:20:00',
    updatedAt: '2026-10-01T16:45:00'
  }
];

function getLocalData(): Supplier[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SUPPLIERS));
      return INITIAL_SUPPLIERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SUPPLIERS;
  }
}

function saveLocalData(data: Supplier[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save suppliers to localStorage', e);
  }
}

/**
 * Tìm kiếm & phân trang danh sách nhà cung cấp
 */
export async function fetchSuppliers(params?: SupplierFilterParams): Promise<SupplierPageResponse> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const query = new URLSearchParams();
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  query.set('page', String(page));
  query.set('size', String(size));

  const url = `${API_BASE_URL}/api/suppliers?${query.toString()}`;

  try {
    const res = await authFetch(url);
    if (res.ok) {
      const data: SupplierPageResponse = await res.json();

      // Nếu backend đang rỗng (chưa có NCC nào) và không tìm kiếm gì, tự động nạp mẫu để người dùng test ngay
      if (data.totalElements === 0 && !params?.keyword && (!params?.status || params.status === 'ALL')) {
        for (const s of INITIAL_SUPPLIERS) {
          try {
            await authFetch(`${API_BASE_URL}/api/suppliers`, {
              method: 'POST',
              body: JSON.stringify({
                code: s.code,
                name: s.name,
                taxCode: s.taxCode,
                contactName: s.contactName,
                phone: s.phone,
                email: s.email,
                address: s.address,
                paymentTerms: s.paymentTerms,
                note: s.note
              })
            });
          } catch {
            // bỏ qua nếu đã có
          }
        }
        const refetch = await authFetch(url);
        if (refetch.ok) return await refetch.json();
      }

      return data;
    }
  } catch (err) {
    console.warn('API error fetching suppliers, fallback to local storage', err);
  }

  // Fallback Local Storage
  let list = getLocalData();
  if (params?.status && params.status !== 'ALL') {
    list = list.filter((s) => s.status === params.status);
  }
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.code.toLowerCase().includes(kw) ||
        s.name.toLowerCase().includes(kw) ||
        s.taxCode.toLowerCase().includes(kw) ||
        (s.phone && s.phone.includes(kw)) ||
        (s.contactName && s.contactName.toLowerCase().includes(kw))
    );
  }

  const totalElements = list.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const startIndex = page * size;
  const content = list.slice(startIndex, startIndex + size);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1
  };
}

/**
 * Nạp lại 5 nhà cung cấp mẫu
 */
export async function seedSampleSuppliers(): Promise<void> {
  for (const s of INITIAL_SUPPLIERS) {
    try {
      await createSupplier({
        code: s.code,
        name: s.name,
        taxCode: s.taxCode,
        contactName: s.contactName || undefined,
        phone: s.phone || undefined,
        email: s.email || undefined,
        address: s.address || undefined,
        paymentTerms: s.paymentTerms || undefined,
        note: s.note || undefined
      });
    } catch {
      // bỏ qua lỗi nếu đã tồn tại
    }
  }
}

/**
 * Lấy chi tiết nhà cung cấp theo ID
 */
export async function fetchSupplierById(id: number): Promise<Supplier> {
  const url = `${API_BASE_URL}/api/suppliers/${id}`;
  try {
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`API error fetching supplier ${id}, fallback to local storage`, err);
  }

  const list = getLocalData();
  const item = list.find((s) => s.id === id);
  if (!item) {
    throw new Error(`Không tìm thấy nhà cung cấp ID ${id}`);
  }
  return item;
}

/**
 * Thêm mới nhà cung cấp (S2-09)
 */
export async function createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
  const url = `${API_BASE_URL}/api/suppliers`;
  let isApiCall = false;
  try {
    const res = await authFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    isApiCall = true;
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    const errorMsg =
      errData?.message ||
      (errData?.details && (Object.values(errData.details)[0] as string)) ||
      `Lỗi ${res.status}: Không thể tạo nhà cung cấp`;
    throw new Error(errorMsg);
  } catch (err: unknown) {
    if (isApiCall) {
      // API backend phản hồi lỗi (trùng mã số thuế, trùng mã NCC...), ném lỗi thẳng lên UI
      throw err;
    }
    console.warn('Network error creating supplier, fallback to local storage', err);
  }

  // Fallback Local Storage chỉ khi hoàn toàn mất kết nối mạng
  const list = getLocalData();
  const normalizedCode = payload.code.trim().toUpperCase();
  const normalizedTax = payload.taxCode.trim();

  if (list.some((s) => s.code.toUpperCase() === normalizedCode)) {
    throw new Error(`Mã nhà cung cấp '${normalizedCode}' đã tồn tại!`);
  }
  if (list.some((s) => s.taxCode === normalizedTax)) {
    throw new Error(`Mã số thuế '${normalizedTax}' đã được sử dụng cho nhà cung cấp khác!`);
  }

  const newSupplier: Supplier = {
    id: Date.now(),
    code: normalizedCode,
    name: payload.name.trim(),
    taxCode: normalizedTax,
    contactName: payload.contactName?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    address: payload.address?.trim() || null,
    paymentTerms: payload.paymentTerms?.trim() || null,
    note: payload.note?.trim() || null,
    status: 'ACTIVE',
    statusReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  list.unshift(newSupplier);
  saveLocalData(list);
  return newSupplier;
}

/**
 * Cập nhật thông tin nhà cung cấp (Mã không đổi sau khi tạo)
 */
export async function updateSupplier(id: number, payload: UpdateSupplierPayload): Promise<Supplier> {
  const url = `${API_BASE_URL}/api/suppliers/${id}`;
  let isApiCall = false;
  try {
    const res = await authFetch(url, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    isApiCall = true;
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    const errorMsg =
      errData?.message ||
      (errData?.details && (Object.values(errData.details)[0] as string)) ||
      `Lỗi ${res.status}: Không thể cập nhật thông tin`;
    throw new Error(errorMsg);
  } catch (err: unknown) {
    if (isApiCall) throw err;
    console.warn('API error updating supplier, fallback to local storage', err);
  }

  // Fallback Local Storage
  const list = getLocalData();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error('Không tìm thấy nhà cung cấp để cập nhật!');
  }

  const normalizedTax = payload.taxCode.trim();
  if (list.some((s) => s.id !== id && s.taxCode === normalizedTax)) {
    throw new Error(`Mã số thuế '${normalizedTax}' đã được sử dụng cho nhà cung cấp khác!`);
  }

  const current = list[idx];
  const updated: Supplier = {
    ...current,
    name: payload.name.trim(),
    taxCode: normalizedTax,
    contactName: payload.contactName?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    address: payload.address?.trim() || null,
    paymentTerms: payload.paymentTerms?.trim() || null,
    note: payload.note?.trim() || null,
    updatedAt: new Date().toISOString()
  };

  list[idx] = updated;
  saveLocalData(list);
  return updated;
}

/**
 * Thay đổi trạng thái: Ngừng giao dịch (bắt buộc lý do) hoặc Tiếp tục giao dịch
 */
export async function changeSupplierStatus(id: number, payload: ChangeSupplierStatusPayload): Promise<Supplier> {
  const url = `${API_BASE_URL}/api/suppliers/${id}/status`;
  let isApiCall = false;
  try {
    const res = await authFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    isApiCall = true;
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    const errorMsg =
      errData?.message ||
      (errData?.details && (Object.values(errData.details)[0] as string)) ||
      `Lỗi ${res.status}: Không thể thay đổi trạng thái`;
    throw new Error(errorMsg);
  } catch (err: unknown) {
    if (isApiCall) throw err;
    console.warn('API error changing supplier status, fallback to local storage', err);
  }

  // Fallback Local Storage
  const list = getLocalData();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error('Không tìm thấy nhà cung cấp!');
  }

  const current = list[idx];
  if (payload.status === 'INACTIVE' && (!payload.reason || !payload.reason.trim())) {
    throw new Error('Vui lòng nhập lý do khi ngừng giao dịch với nhà cung cấp!');
  }

  if (current.status === payload.status) {
    throw new Error(
      payload.status === 'INACTIVE'
        ? 'Nhà cung cấp đã ở trạng thái ngừng giao dịch'
        : 'Nhà cung cấp đang ở trạng thái giao dịch'
    );
  }

  const updated: Supplier = {
    ...current,
    status: payload.status,
    statusReason: payload.status === 'INACTIVE' ? payload.reason!.trim() : null,
    updatedAt: new Date().toISOString()
  };

  list[idx] = updated;
  saveLocalData(list);
  return updated;
}

/**
 * Xóa nhà cung cấp (chỉ cho phép xóa khi chưa phát sinh giao dịch nhập kho)
 */
export async function deleteSupplier(id: number): Promise<void> {
  const url = `${API_BASE_URL}/api/suppliers/${id}`;
  let isApiCall = false;
  try {
    const res = await authFetch(url, {
      method: 'DELETE'
    });
    isApiCall = true;
    if (res.ok) {
      return;
    }
    const errData = await res.json().catch(() => null);
    const errorMsg =
      errData?.message ||
      (errData?.details && (Object.values(errData.details)[0] as string)) ||
      `Lỗi ${res.status}: Không thể xoá nhà cung cấp`;
    throw new Error(errorMsg);
  } catch (err: unknown) {
    if (isApiCall) throw err;
    console.warn('API error deleting supplier, fallback to local storage', err);
  }

  const list = getLocalData();
  const filtered = list.filter((s) => s.id !== id);
  saveLocalData(filtered);
}

/**
 * Tính toán thống kê nhanh số lượng nhà cung cấp
 */
export function calculateSupplierStats(suppliers: Supplier[]): SupplierStatsData {
  const total = suppliers.length;
  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE').length;
  const hasPaymentTermsCount = suppliers.filter((s) => Boolean(s.paymentTerms && s.paymentTerms.trim())).length;

  return {
    total,
    activeCount,
    inactiveCount,
    hasPaymentTermsCount
  };
}
