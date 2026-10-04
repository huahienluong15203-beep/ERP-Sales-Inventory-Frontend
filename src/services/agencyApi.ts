/**
 * API Service & Mock Database cho Module Quản Lý Hồ Sơ Đại Lý (SCRUM-85 / S3-03 / EP-03)
 * Tuân thủ quy tắc:
 * - Mã đại lý là duy nhất.
 * - Nhóm khách hàng tự động quyết định Bảng giá được áp dụng.
 * - Đại lý đã phát sinh giao dịch không thể xóa, chỉ dừng giao dịch.
 */

import { authFetch, API_BASE_URL } from './api';
import type {
  Agency,
  CustomerGroupId,
  CustomerGroupOption,
  RegionOption,
  SalesRepOption,
  CreateAgencyPayload,
  UpdateAgencyPayload,
  AgencyFilterParams,
  AgencyListResponse,
  DeliveryPoint,
  CreateDeliveryPointPayload,
  UpdateDeliveryPointPayload,
  CreditLimitAuditLog,
  UpdateCreditLimitPayload,
  CustomerAssignmentHistory,
  AssignSalesRepPayload,
  TransferCustomersPayload
} from '../types/agency';

// Danh mục Nhóm khách hàng & Bảng giá tương ứng
export const CUSTOMER_GROUP_OPTIONS: CustomerGroupOption[] = [
  {
    id: 'TIER_1',
    name: 'Đại lý Cấp 1 (Tổng thầu / NPP Lớn)',
    description: 'Áp dụng cho các nhà phân phối độc quyền cấp tỉnh, sản lượng lớn',
    defaultPricingTier: {
      id: 'PRICE_TIER_1',
      code: 'BG-CK25',
      name: 'Bảng giá Sỉ Cấp 1 (CK 25%)',
      discountPercent: 25,
      description: 'Chiết khấu 25% trực tiếp trên giá bán niêm yết',
      badgeBg: '#FEF3C7',
      badgeColor: '#92400E'
    }
  },
  {
    id: 'TIER_2',
    name: 'Đại lý Cấp 2 (Bán buôn khu vực)',
    description: 'Áp dụng cho các cửa hàng đại lý vùng, doanh số trung bình',
    defaultPricingTier: {
      id: 'PRICE_TIER_2',
      code: 'BG-CK15',
      name: 'Bảng giá Đại lý Cấp 2 (CK 15%)',
      discountPercent: 15,
      description: 'Chiết khấu 15% trực tiếp trên giá bán niêm yết',
      badgeBg: '#E0E7FF',
      badgeColor: '#3730A3'
    }
  },
  {
    id: 'RETAIL_SHOWROOM',
    name: 'Đại lý Showroom & Bán lẻ VIP',
    description: 'Áp dụng cho các điểm giới thiệu sản phẩm và đối tác thương mại',
    defaultPricingTier: {
      id: 'PRICE_STANDARD',
      code: 'BG-STANDARD',
      name: 'Bảng giá Niêm yết Chuẩn (CK 0%)',
      discountPercent: 0,
      description: 'Bán theo đúng giá niêm yết công ty, bảo hộ giá thị trường',
      badgeBg: '#F3F4F6',
      badgeColor: '#374151'
    }
  }
];

// Danh mục Khu vực / Địa bàn
export const REGION_OPTIONS: RegionOption[] = [
  { id: 'REG_HN', code: 'MB-HN', name: 'Miền Bắc - Khu vực Hà Nội' },
  { id: 'REG_HCM', code: 'MN-HCM', name: 'Miền Nam - Khu vực TP. Hồ Chí Minh' },
  { id: 'REG_DN', code: 'MT-DN', name: 'Miền Trung - Khu vực Đà Nẵng' },
  { id: 'REG_MT', code: 'MN-TNB', name: 'Tây Nam Bộ - Khu vực Cần Thơ' }
];

// Danh mục Nhân viên kinh doanh phụ trách (Sales Reps)
export const SALES_REP_OPTIONS: SalesRepOption[] = [
  {
    id: 'REP_001',
    username: 'sales_rep_1',
    fullName: 'Lê Hoàng Nam',
    phone: '0912345678',
    email: 'nam.le@erp-system.vn',
    regionId: 'REG_HN'
  },
  {
    id: 'REP_002',
    username: 'sales_rep_2',
    fullName: 'Nguyễn Thị Minh Thư',
    phone: '0987654321',
    email: 'thu.nguyen@erp-system.vn',
    regionId: 'REG_HCM'
  },
  {
    id: 'REP_003',
    username: 'sales_rep_3',
    fullName: 'Phạm Đức Trí',
    phone: '0905123456',
    email: 'tri.pham@erp-system.vn',
    regionId: 'REG_DN'
  },
  {
    id: 'REP_NVKHO',
    username: 'nvkho',
    fullName: 'Nhân Viên Kho01',
    phone: '0904567890',
    email: 'warehouse@erp.com',
    regionId: 'REG_HN'
  }
];

/**
 * Lấy danh sách nhân viên kinh doanh đang hoạt động để phân công phụ trách.
 * Tự động đồng bộ với danh sách tài khoản thực tế trên hệ thống (User Management).
 */
export async function fetchActiveSalesReps(): Promise<SalesRepOption[]> {
  try {
    // 1. Thử gọi API admin/users để lấy đầy đủ user có ROLE_SALES_REP và status ACTIVE
    const res = await authFetch(`${API_BASE_URL}/api/admin/users?role=ROLE_SALES_REP&status=ACTIVE&size=100`);
    if (res.ok) {
      const data = await res.json();
      if (data.content && data.content.length > 0) {
        return data.content.map((u: any) => ({
          id: String(u.id),
          username: u.username,
          fullName: u.fullName,
          phone: u.phone || '',
          email: u.email || '',
          regionId: u.regions?.[0]?.code || (u.regions?.[0]?.id ? String(u.regions[0].id) : '')
        }));
      }
    }
  } catch {}

  try {
    // 2. Thử gọi API customers/form-options
    const res = await authFetch(`${API_BASE_URL}/api/customers/form-options`);
    if (res.ok) {
      const data = await res.json();
      if (data.salesReps && data.salesReps.length > 0) {
        return data.salesReps.map((u: any) => ({
          id: String(u.id),
          username: u.code || '',
          fullName: u.name,
          phone: '',
          email: '',
          regionId: ''
        }));
      }
    }
  } catch {}

  // 3. Fallback: Lấy danh sách mẫu có sẵn
  return SALES_REP_OPTIONS;
}

// Dữ liệu mẫu khởi tạo trong Storage
const STORAGE_KEY = 'erp_agencies_data_v1';

const INITIAL_MOCK_AGENCIES: Agency[] = [
  {
    id: 'AG-001',
    code: 'DL-HN-001',
    name: 'Đại Lý Phân Phối Hà Nội Phát Đạt',
    taxCode: '0101234567',
    customerGroup: 'TIER_1',
    customerGroupName: 'Đại lý Cấp 1 (Tổng thầu / NPP Lớn)',
    pricingTier: CUSTOMER_GROUP_OPTIONS[0].defaultPricingTier,
    regionId: 'REG_HN',
    regionName: 'Miền Bắc - Khu vực Hà Nội',
    assignedRepId: 'REP_001',
    assignedRepName: 'Lê Hoàng Nam',
    phone: '0243888999',
    email: 'phatdat.hanoi@gmail.com',
    address: '158 Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng, Hà Nội',
    status: 'ACTIVE',
    hasTransactions: true,
    transactionCount: 28,
    totalDebt: 45000000,
    creditLimit: 100000000,
    createdAt: '2026-08-15 08:30:00',
    updatedAt: '2026-09-20 14:15:00',
    maxDebtDays: 30,
  },
  {
    id: 'AG-002',
    code: 'DL-HCM-002',
    name: 'Công Ty TNHH Đại Lý Minh Phát (B2B)',
    taxCode: '0309876543',
    customerGroup: 'TIER_1',
    customerGroupName: 'Đại lý Cấp 1 (Tổng thầu / NPP Lớn)',
    pricingTier: CUSTOMER_GROUP_OPTIONS[0].defaultPricingTier,
    regionId: 'REG_HCM',
    regionName: 'Miền Nam - Khu vực TP. Hồ Chí Minh',
    assignedRepId: 'REP_002',
    assignedRepName: 'Nguyễn Thị Minh Thư',
    phone: '0283777888',
    email: 'contact@minhphatb2b.vn',
    address: '45 Đường Số 7, KDC Trung Sơn, Bình Hưng, Bình Chánh, TP.HCM',
    status: 'ACTIVE',
    hasTransactions: true,
    transactionCount: 42,
    totalDebt: 62000000,
    creditLimit: 120000000,
    createdAt: '2026-08-20 09:00:00',
    updatedAt: '2026-09-28 10:45:00'
  },
  {
    id: 'AG-003',
    code: 'DL-DN-003',
    name: 'Đại Lý Miền Trung Thịnh Vượng',
    taxCode: '0405556667',
    customerGroup: 'TIER_2',
    customerGroupName: 'Đại lý Cấp 2 (Bán buôn khu vực)',
    pricingTier: CUSTOMER_GROUP_OPTIONS[1].defaultPricingTier,
    regionId: 'REG_DN',
    regionName: 'Miền Trung - Khu vực Đà Nẵng',
    assignedRepId: 'REP_003',
    assignedRepName: 'Phạm Đức Trí',
    phone: '0236355588',
    email: 'thinhvuong.danang@gmail.com',
    address: '88 Nguyễn Văn Linh, P. Nam Dương, Q. Hải Châu, Đà Nẵng',
    status: 'SUSPENDED',
    suspendReason: 'Kế toán tạm dừng do quá hạn nợ 45 ngày chưa thanh toán đối soát',
    suspendedAt: '2026-09-25 16:30:00',
    hasTransactions: true,
    transactionCount: 15,
    totalDebt: 28500000,
    creditLimit: 50000000,
    createdAt: '2026-08-25 10:20:00',
    updatedAt: '2026-09-25 16:30:00'
  },
  {
    id: 'AG-004',
    code: 'DL-HN-004',
    name: 'Showroom Phân Phối Đô Thành',
    taxCode: '0108889999',
    customerGroup: 'RETAIL_SHOWROOM',
    customerGroupName: 'Đại lý Showroom & Bán lẻ VIP',
    pricingTier: CUSTOMER_GROUP_OPTIONS[2].defaultPricingTier,
    regionId: 'REG_HN',
    regionName: 'Miền Bắc - Khu vực Hà Nội',
    assignedRepId: 'REP_001',
    assignedRepName: 'Lê Hoàng Nam',
    phone: '0243999222',
    email: 'showroom.dothanh@gmail.com',
    address: '24 Hoàng Cầu, P. Ô Chợ Dừa, Q. Đống Đa, Hà Nội',
    status: 'ACTIVE',
    hasTransactions: false, // Chưa phát sinh giao dịch
    transactionCount: 0,
    totalDebt: 0,
    creditLimit: 30000000,
    createdAt: '2026-09-30 11:00:00',
    updatedAt: '2026-09-30 11:00:00'
  }
];

function getStoredAgencies(): Agency[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_AGENCIES));
      return INITIAL_MOCK_AGENCIES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOCK_AGENCIES;
  }
}

function saveStoredAgencies(data: Agency[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Không thể lưu danh sách đại lý vào localStorage', e);
  }
}

// ==========================================
// Dữ liệu mẫu Điểm giao hàng (S3-04 / SCRUM-15)
// ==========================================
const DELIVERY_POINTS_STORAGE_KEY = 'erp_delivery_points_v1';

const INITIAL_MOCK_DELIVERY_POINTS: DeliveryPoint[] = [
  {
    id: 'DP-001',
    agencyId: 'AG-001',
    name: 'Kho Tổng Gia Lâm',
    address: 'Lô C2, Cụm Công Nghiệp Ninh Hiệp, Gia Lâm, Hà Nội',
    contactPerson: 'Nguyễn Văn Hùng (Thủ kho chính)',
    phone: '0912111222',
    routeNotes: 'Đường lớn xe container 40 feet ra vào 24/7, bốc dỡ cửa nhận hàng số 2',
    isDefault: true,
    createdAt: '2026-08-15 09:00:00',
    updatedAt: '2026-08-15 09:00:00'
  },
  {
    id: 'DP-002',
    agencyId: 'AG-001',
    name: 'Kho Trung Chuyển Hai Bà Trưng',
    address: '158 Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng, Hà Nội',
    contactPerson: 'Trần Đức Tuấn (Phụ trách kho phố)',
    phone: '0983333444',
    routeNotes: 'Đường hẹp phố cổ, chỉ cho xe tải dưới 2.5 tấn vào trước 6h sáng hoặc sau 20h',
    isDefault: false,
    createdAt: '2026-08-16 10:30:00',
    updatedAt: '2026-08-16 10:30:00'
  },
  {
    id: 'DP-003',
    agencyId: 'AG-002',
    name: 'Kho Sóng Thần - Dĩ An',
    address: 'Đường Số 3, KCN Sóng Thần 1, TP. Dĩ An, Bình Dương',
    contactPerson: 'Phạm Thị Thảo (Điều phối kho)',
    phone: '0908888999',
    routeNotes: 'Có sàn nâng dock leveler tự động, yêu cầu tài xế gọi điện trước 30 phút để mở cổng phụ',
    isDefault: true,
    createdAt: '2026-08-20 09:30:00',
    updatedAt: '2026-08-20 09:30:00'
  },
  {
    id: 'DP-004',
    agencyId: 'AG-002',
    name: 'Showroom & Điểm Giao Trung Sơn',
    address: '45 Đường Số 7, KDC Trung Sơn, Bình Hưng, Bình Chánh, TP.HCM',
    contactPerson: 'Lê Văn Nam (Quản lý cửa hàng)',
    phone: '0977666555',
    routeNotes: 'Chỉ nhận hàng giờ hành chính (8h30 - 17h00), không giao vào Chủ Nhật',
    isDefault: false,
    createdAt: '2026-08-22 14:00:00',
    updatedAt: '2026-08-22 14:00:00'
  },
  {
    id: 'DP-005',
    agencyId: 'AG-003',
    name: 'Kho Trung Tâm Cẩm Lệ',
    address: 'Đường Số 4, KCN Hòa Cầm, P. Hòa Thọ Tây, Q. Cẩm Lệ, Đà Nẵng',
    contactPerson: 'Nguyễn Quốc Cường',
    phone: '0905111333',
    routeNotes: 'Xe tải trọng lớn đỗ thoải mái, giờ làm việc từ 7h30 đến 17h30 từ Thứ 2 đến Thứ 7',
    isDefault: true,
    createdAt: '2026-08-25 11:00:00',
    updatedAt: '2026-08-25 11:00:00'
  },
  {
    id: 'DP-006',
    agencyId: 'AG-004',
    name: 'Kho Cửa Hàng Hoàng Cầu',
    address: '24 Hoàng Cầu, P. Ô Chợ Dừa, Q. Đống Đa, Hà Nội',
    contactPerson: 'Đặng Mai Lan',
    phone: '0945678999',
    routeNotes: 'Mặt đường Hoàng Cầu, xe tải 3.5 tấn có vị trí đỗ trước cửa để bốc hàng',
    isDefault: true,
    createdAt: '2026-09-30 11:15:00',
    updatedAt: '2026-09-30 11:15:00'
  }
];

export function getStoredDeliveryPoints(): DeliveryPoint[] {
  try {
    const raw = localStorage.getItem(DELIVERY_POINTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DELIVERY_POINTS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DELIVERY_POINTS));
      return INITIAL_MOCK_DELIVERY_POINTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOCK_DELIVERY_POINTS;
  }
}

export function saveStoredDeliveryPoints(data: DeliveryPoint[]) {
  try {
    localStorage.setItem(DELIVERY_POINTS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Không thể lưu danh sách điểm giao hàng vào localStorage', e);
  }
}

/** Lấy Bảng giá tương ứng theo Nhóm khách hàng */
export function getPricingTierByGroup(groupId: CustomerGroupId) {
  const group = CUSTOMER_GROUP_OPTIONS.find((g) => g.id === groupId);
  return group ? group.defaultPricingTier : CUSTOMER_GROUP_OPTIONS[2].defaultPricingTier;
}

/**
 * 1. Lấy danh sách hồ sơ đại lý kèm tìm kiếm và lọc
 */
export async function fetchAgencies(params: AgencyFilterParams): Promise<AgencyListResponse> {
  // Giả lập trễ mạng nhẹ để tạo UX mượt mà
  await new Promise((resolve) => setTimeout(resolve, 200));

  let list = getStoredAgencies();
  const allPoints = getStoredDeliveryPoints();

  // Đính kèm số lượng điểm giao hàng động
  list = list.map((a) => ({
    ...a,
    deliveryPointCount: allPoints.filter((dp) => dp.agencyId === a.id).length
  }));

  // Tìm kiếm từ khóa (Mã, Tên, Mã số thuế, SĐT)
  if (params.keyword && params.keyword.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.code.toLowerCase().includes(kw) ||
        a.name.toLowerCase().includes(kw) ||
        a.taxCode.toLowerCase().includes(kw) ||
        a.phone.toLowerCase().includes(kw) ||
        a.assignedRepName.toLowerCase().includes(kw)
    );
  }

  // Lọc theo nhóm khách hàng
  if (params.customerGroup) {
    list = list.filter((a) => a.customerGroup === params.customerGroup);
  }

  // Lọc theo khu vực
  if (params.regionId) {
    list = list.filter((a) => a.regionId === params.regionId);
  }

  // Lọc theo trạng thái (ACTIVE / SUSPENDED)
  if (params.status) {
    list = list.filter((a) => a.status === params.status);
  }

  const page = params.page || 0;
  const size = params.size || 20;
  const totalElements = list.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const paginatedContent = list.slice(page * size, (page + 1) * size);

  return {
    content: paginatedContent,
    totalElements,
    totalPages,
    currentPage: page
  };
}

/**
 * 2. Thêm mới Hồ sơ đại lý
 * - Kiểm tra Mã đại lý duy nhất
 * - Tự động map Bảng giá từ Nhóm khách hàng
 */
export async function createAgency(
  payload: CreateAgencyPayload
): Promise<{ success: boolean; message: string; agency?: Agency }> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const list = getStoredAgencies();

  const cleanCode = payload.code.trim().toUpperCase();

  // Kiểm tra tính duy nhất của Mã đại lý
  const existed = list.find((a) => a.code.toUpperCase() === cleanCode);
  if (existed) {
    return {
      success: false,
      message: `Mã đại lý "${cleanCode}" đã tồn tại trong hệ thống! Vui lòng chọn mã khác.`
    };
  }

  const group = CUSTOMER_GROUP_OPTIONS.find((g) => g.id === payload.customerGroup);
  const region = REGION_OPTIONS.find((r) => r.id === payload.regionId);
  const rep = SALES_REP_OPTIONS.find((r) => r.id === payload.assignedRepId);

  const pricingTier = group ? group.defaultPricingTier : CUSTOMER_GROUP_OPTIONS[2].defaultPricingTier;

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const newAgency: Agency = {
    id: `AG-${Date.now().toString().slice(-4)}`,
    code: cleanCode,
    name: payload.name.trim(),
    taxCode: payload.taxCode.trim(),
    customerGroup: payload.customerGroup,
    customerGroupName: group?.name || payload.customerGroup,
    pricingTier,
    regionId: payload.regionId,
    regionName: region?.name || 'Chưa xác định',
    assignedRepId: payload.assignedRepId,
    assignedRepName: rep?.fullName || 'Chưa gán',
    phone: payload.phone.trim(),
    email: payload.email.trim(),
    address: payload.address.trim(),
    status: 'ACTIVE',
    hasTransactions: false,
    transactionCount: 0,
    totalDebt: 0,
    creditLimit: payload.creditLimit || 50000000,
    createdAt: nowStr,
    updatedAt: nowStr
  };

  list.unshift(newAgency);
  saveStoredAgencies(list);

  return {
    success: true,
    message: `Khai báo hồ sơ đại lý [${newAgency.code} - ${newAgency.name}] thành công! Bảng giá áp dụng: ${pricingTier.name}.`,
    agency: newAgency
  };
}

/**
 * 3. Cập nhật thông tin đại lý
 * - Tự động cập nhật Bảng giá nếu người dùng đổi Nhóm khách hàng
 */
export async function updateAgency(
  id: string,
  payload: UpdateAgencyPayload
): Promise<{ success: boolean; message: string; agency?: Agency }> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const list = getStoredAgencies();
  const index = list.findIndex((a) => a.id === id);

  if (index === -1) {
    return { success: false, message: 'Không tìm thấy hồ sơ đại lý để cập nhật!' };
  }

  const current = list[index];
  const group = CUSTOMER_GROUP_OPTIONS.find((g) => g.id === payload.customerGroup);
  const region = REGION_OPTIONS.find((r) => r.id === payload.regionId);
  const rep = SALES_REP_OPTIONS.find((r) => r.id === payload.assignedRepId);
  const pricingTier = group ? group.defaultPricingTier : current.pricingTier;

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const updatedAgency: Agency = {
    ...current,
    name: payload.name.trim(),
    taxCode: payload.taxCode.trim(),
    customerGroup: payload.customerGroup,
    customerGroupName: group?.name || current.customerGroupName,
    pricingTier,
    regionId: payload.regionId,
    regionName: region?.name || current.regionName,
    assignedRepId: payload.assignedRepId,
    assignedRepName: rep?.fullName || current.assignedRepName,
    phone: payload.phone.trim(),
    email: payload.email.trim(),
    address: payload.address.trim(),
    creditLimit: payload.creditLimit !== undefined ? payload.creditLimit : current.creditLimit,
    updatedAt: nowStr
  };

  list[index] = updatedAgency;
  saveStoredAgencies(list);

  return {
    success: true,
    message: `Cập nhật hồ sơ đại lý [${updatedAgency.code}] thành công!`,
    agency: updatedAgency
  };
}

/**
 * 4. Dừng giao dịch đại lý (S3-03: Đại lý có giao dịch KHÔNG ĐƯỢC XÓA, chỉ dừng giao dịch)
 */
export async function suspendAgency(
  id: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const list = getStoredAgencies();
  const target = list.find((a) => a.id === id);

  if (!target) {
    return { success: false, message: 'Không tìm thấy đại lý trong hệ thống.' };
  }

  if (!reason || !reason.trim()) {
    return { success: false, message: 'Bắt buộc phải nhập lý do dừng giao dịch đại lý!' };
  }

  target.status = 'SUSPENDED';
  target.suspendReason = reason.trim();
  target.suspendedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  target.updatedAt = target.suspendedAt;

  saveStoredAgencies(list);

  return {
    success: true,
    message: `Đã chuyển trạng thái đại lý [${target.code} - ${target.name}] sang "Dừng giao dịch". Lý do: ${target.suspendReason}`
  };
}

/**
 * 5. Kích hoạt lại giao dịch cho đại lý
 */
export async function reactivateAgency(id: string): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const list = getStoredAgencies();
  const target = list.find((a) => a.id === id);

  if (!target) {
    return { success: false, message: 'Không tìm thấy đại lý trong hệ thống.' };
  }

  target.status = 'ACTIVE';
  target.suspendReason = undefined;
  target.suspendedAt = undefined;
  target.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

  saveStoredAgencies(list);

  return {
    success: true,
    message: `Đã mở lại hoạt động giao dịch bình thường cho đại lý [${target.code} - ${target.name}].`
  };
}

/**
 * 6. Kiểm tra xóa đại lý:
 * "Đại lý đã phát sinh giao dịch sẽ KHÔNG BỊ XÓA, chỉ dừng giao dịch"
 */
export async function deleteAgency(id: string): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const list = getStoredAgencies();
  const target = list.find((a) => a.id === id);

  if (!target) {
    return { success: false, message: 'Không tìm thấy đại lý để xóa.' };
  }

  if (target.hasTransactions || target.transactionCount > 0) {
    return {
      success: false,
      message: `NGHIỆP VỤ BẢO VỆ: Đại lý [${target.code}] đã phát sinh ${target.transactionCount} giao dịch / đơn hàng. Hệ thống TUYỆT ĐỐI KHÔNG CHO PHÉP XÓA để bảo toàn lịch sử sổ sách kế toán, bạn chỉ có thể chuyển sang trạng thái "Dừng giao dịch"!`
    };
  }

  const filtered = list.filter((a) => a.id !== id);
  saveStoredAgencies(filtered);

  return {
    success: true,
    message: `Đã xóa hồ sơ đại lý mới [${target.code}] (chưa có lịch sử giao dịch).`
  };
}

// ==========================================
// CÁC HÀM XỬ LÝ ĐIỂM GIAO HÀNG (S3-04 / SCRUM-15)
// ==========================================

/**
 * 7. Lấy danh sách điểm giao hàng của một đại lý
 * Sắp xếp: Điểm mặc định lên đầu, sau đó theo ngày tạo mới nhất
 */
export async function fetchDeliveryPointsByAgency(agencyId: string): Promise<DeliveryPoint[]> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const list = getStoredDeliveryPoints();
  const agencyPoints = list.filter((p) => p.agencyId === agencyId);
  return agencyPoints.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * 8. Thêm mới một điểm giao hàng cho đại lý
 * Nghiệp vụ S3-04:
 * - Nếu là điểm giao hàng đầu tiên của đại lý, tự động gán isDefault = true.
 * - Nếu người dùng chọn đặt làm mặc định (isDefault = true), tự động hủy mặc định của các điểm khác.
 */
export async function createDeliveryPoint(
  payload: CreateDeliveryPointPayload
): Promise<{ success: boolean; message: string; deliveryPoint?: DeliveryPoint }> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (!payload.name?.trim()) {
    return { success: false, message: 'Tên điểm giao hàng không được để trống!' };
  }
  if (!payload.address?.trim()) {
    return { success: false, message: 'Địa chỉ điểm giao hàng không được để trống!' };
  }
  if (!payload.contactPerson?.trim()) {
    return { success: false, message: 'Tên người nhận hàng không được để trống!' };
  }
  if (!payload.phone?.trim()) {
    return { success: false, message: 'Số điện thoại người nhận không được để trống!' };
  }

  let list = getStoredDeliveryPoints();
  const agencyPoints = list.filter((p) => p.agencyId === payload.agencyId);
  const isFirstPoint = agencyPoints.length === 0;
  const shouldBeDefault = isFirstPoint || !!payload.isDefault;

  // Nếu điểm mới là mặc định, các điểm khác của cùng đại lý phải bỏ cờ mặc định
  if (shouldBeDefault) {
    list = list.map((p) => {
      if (p.agencyId === payload.agencyId) {
        return { ...p, isDefault: false };
      }
      return p;
    });
  }

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const newPoint: DeliveryPoint = {
    id: `DP-${Date.now().toString().slice(-4)}`,
    agencyId: payload.agencyId,
    name: payload.name.trim(),
    address: payload.address.trim(),
    contactPerson: payload.contactPerson.trim(),
    phone: payload.phone.trim(),
    routeNotes: payload.routeNotes?.trim() || undefined,
    isDefault: shouldBeDefault,
    createdAt: nowStr,
    updatedAt: nowStr
  };

  list.push(newPoint);
  saveStoredDeliveryPoints(list);

  return {
    success: true,
    message: `Đã thêm điểm giao hàng "${newPoint.name}" thành công!${shouldBeDefault ? ' (Được đặt làm mặc định)' : ''}`,
    deliveryPoint: newPoint
  };
}

/**
 * 9. Cập nhật thông tin điểm giao hàng
 */
export async function updateDeliveryPoint(
  id: string,
  payload: UpdateDeliveryPointPayload
): Promise<{ success: boolean; message: string; deliveryPoint?: DeliveryPoint }> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  let list = getStoredDeliveryPoints();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) {
    return { success: false, message: 'Không tìm thấy điểm giao hàng để cập nhật!' };
  }

  const current = list[index];
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Nếu đặt làm mặc định, hủy mặc định của các điểm khác thuộc cùng đại lý
  if (payload.isDefault) {
    list = list.map((p) => {
      if (p.agencyId === current.agencyId && p.id !== id) {
        return { ...p, isDefault: false };
      }
      return p;
    });
  }

  const updated: DeliveryPoint = {
    ...current,
    name: payload.name.trim(),
    address: payload.address.trim(),
    contactPerson: payload.contactPerson.trim(),
    phone: payload.phone.trim(),
    routeNotes: payload.routeNotes?.trim() || undefined,
    isDefault: payload.isDefault !== undefined ? payload.isDefault : current.isDefault,
    updatedAt: nowStr
  };

  list[index] = updated;
  saveStoredDeliveryPoints(list);

  return {
    success: true,
    message: `Cập nhật điểm giao hàng "${updated.name}" thành công!`,
    deliveryPoint: updated
  };
}

/**
 * 10. Đặt một điểm giao hàng làm mặc định (S3-04 AC 2)
 */
export async function setDefaultDeliveryPoint(
  id: string,
  agencyId: string
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  let list = getStoredDeliveryPoints();
  let found = false;

  list = list.map((p) => {
    if (p.agencyId === agencyId) {
      if (p.id === id) {
        found = true;
        return { ...p, isDefault: true, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) };
      }
      return { ...p, isDefault: false };
    }
    return p;
  });

  if (!found) {
    return { success: false, message: 'Không tìm thấy điểm giao hàng cần đặt mặc định!' };
  }

  saveStoredDeliveryPoints(list);
  return {
    success: true,
    message: 'Đã thay đổi điểm giao hàng mặc định cho đại lý thành công!'
  };
}

/**
 * 11. Xóa một điểm giao hàng
 * Nếu xóa điểm mặc định mà đại lý vẫn còn các điểm khác, tự động chọn điểm đầu tiên còn lại làm mặc định
 */
export async function deleteDeliveryPoint(
  id: string,
  agencyId: string
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  let list = getStoredDeliveryPoints();
  const target = list.find((p) => p.id === id);
  if (!target) {
    return { success: false, message: 'Không tìm thấy điểm giao hàng để xóa!' };
  }

  const wasDefault = target.isDefault;
  list = list.filter((p) => p.id !== id);

  // Nếu điểm vừa xóa là mặc định, tự động chuyển mặc định cho điểm kế tiếp
  if (wasDefault) {
    const remainingForAgency = list.filter((p) => p.agencyId === agencyId);
    if (remainingForAgency.length > 0) {
      const newDefaultId = remainingForAgency[0].id;
      list = list.map((p) => (p.id === newDefaultId ? { ...p, isDefault: true } : p));
    }
  }

  saveStoredDeliveryPoints(list);
  return {
    success: true,
    message: `Đã xóa điểm giao hàng "${target.name}".${wasDefault ? ' Điểm kế tiếp đã được tự động chọn làm mặc định.' : ''}`
  };
}

const CREDIT_LIMIT_LOGS_KEY = 'erp_credit_limit_logs_v1';

// Lấy danh sách lịch sử thay đổi của đại lý
export async function fetchCreditLimitLogs(agencyId: string): Promise<CreditLimitAuditLog[]> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  try {
    const raw = localStorage.getItem(CREDIT_LIMIT_LOGS_KEY);
    const allLogs: CreditLimitAuditLog[] = raw ? JSON.parse(raw) : [];
    return allLogs
      .filter((log) => log.agencyId === agencyId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

// Cập nhật hạn mức & Tự động ghi nhật ký
export async function updateCreditLimit(
  payload: UpdateCreditLimitPayload,
  currentUser: { fullName: string; role: string }
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (!payload.reason || !payload.reason.trim()) {
    return { success: false, message: 'Bắt buộc phải nhập lý do điều chỉnh hạn mức!' };
  }
  if (payload.creditLimit < 0 || payload.maxDebtDays < 0) {
    return { success: false, message: 'Hạn mức tiền và số ngày nợ không được âm!' };
  }

  // 1. Cập nhật hồ sơ đại lý
  const agencies = getStoredAgencies();
  const agencyIndex = agencies.findIndex((a) => a.id === payload.agencyId);
  if (agencyIndex === -1) {
    return { success: false, message: 'Không tìm thấy hồ sơ đại lý!' };
  }

  const agency = agencies[agencyIndex];
  const oldLimit = agency.creditLimit;
  const oldDays = agency.maxDebtDays || 30;

  agency.creditLimit = payload.creditLimit;
  agency.maxDebtDays = payload.maxDebtDays;
  agency.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  saveStoredAgencies(agencies);

  // 2. Ghi một dòng vào Nhật ký kiểm toán (Audit Log)
  const rawLogs = localStorage.getItem(CREDIT_LIMIT_LOGS_KEY);
  const allLogs: CreditLimitAuditLog[] = rawLogs ? JSON.parse(rawLogs) : [];

  const newLog: CreditLimitAuditLog = {
    id: `LOG-${Date.now()}`,
    agencyId: payload.agencyId,
    oldCreditLimit: oldLimit,
    newCreditLimit: payload.creditLimit,
    oldMaxDebtDays: oldDays,
    newMaxDebtDays: payload.maxDebtDays,
    reason: payload.reason.trim(),
    updatedBy: currentUser.fullName || 'Kế toán viên',
    updatedByRole: currentUser.role,
    updatedAt: agency.updatedAt
  };

  allLogs.unshift(newLog);
  localStorage.setItem(CREDIT_LIMIT_LOGS_KEY, JSON.stringify(allLogs));

  return { success: true, message: `Đã cập nhật hạn mức cho đại lý [${agency.name}] thành công!` };
}

// ==========================================
// PHÂN CÔNG & CHUYỂN GIAO ĐỊA BÀN (S3-06 / SCRUM-17)
// ==========================================
const ASSIGNMENT_HISTORIES_KEY = 'erp_assignment_histories_v1';

const INITIAL_ASSIGNMENT_HISTORIES: Record<string, CustomerAssignmentHistory[]> = {
  'AG-001': [
    {
      id: 'HIST-001-2',
      changeType: 'ASSIGN',
      fromSalesRep: { id: 'REP_003', fullName: 'Phạm Đức Trí', username: 'sales_rep_3' },
      toSalesRep: { id: 'REP_001', fullName: 'Lê Hoàng Nam', username: 'sales_rep_1' },
      changedBy: { id: '1', fullName: 'Quản lý kinh doanh', username: 'sales_manager' },
      reason: 'Phân bổ lại địa bàn miền Bắc theo kế hoạch quý 3',
      changedAt: '2026-09-01 09:30:00'
    },
    {
      id: 'HIST-001-1',
      changeType: 'CREATE',
      fromSalesRep: null,
      toSalesRep: { id: 'REP_003', fullName: 'Phạm Đức Trí', username: 'sales_rep_3' },
      changedBy: { id: '1', fullName: 'Lưu Thanh Nguyên', username: 'admin' },
      reason: 'Gán người phụ trách khi tạo hồ sơ đại lý mới',
      changedAt: '2026-08-15 08:30:00'
    }
  ],
  'AG-002': [
    {
      id: 'HIST-002-1',
      changeType: 'CREATE',
      fromSalesRep: null,
      toSalesRep: { id: 'REP_002', fullName: 'Nguyễn Thị Minh Thư', username: 'sales_rep_2' },
      changedBy: { id: '1', fullName: 'Lưu Thanh Nguyên', username: 'admin' },
      reason: 'Gán người phụ trách khi tạo hồ sơ đại lý mới',
      changedAt: '2026-08-20 09:00:00'
    }
  ],
  'AG-003': [
    {
      id: 'HIST-003-1',
      changeType: 'CREATE',
      fromSalesRep: null,
      toSalesRep: { id: 'REP_003', fullName: 'Phạm Đức Trí', username: 'sales_rep_3' },
      changedBy: { id: '1', fullName: 'Lưu Thanh Nguyên', username: 'admin' },
      reason: 'Gán người phụ trách khi tạo hồ sơ đại lý mới',
      changedAt: '2026-08-25 10:20:00'
    }
  ],
  'AG-004': [
    {
      id: 'HIST-004-1',
      changeType: 'CREATE',
      fromSalesRep: null,
      toSalesRep: { id: 'REP_001', fullName: 'Lê Hoàng Nam', username: 'sales_rep_1' },
      changedBy: { id: '1', fullName: 'Lưu Thanh Nguyên', username: 'admin' },
      reason: 'Gán người phụ trách khi tạo hồ sơ đại lý mới',
      changedAt: '2026-09-30 11:00:00'
    }
  ]
};

function getStoredAssignmentHistories(): Record<string, CustomerAssignmentHistory[]> {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_HISTORIES_KEY);
    if (!raw) {
      localStorage.setItem(ASSIGNMENT_HISTORIES_KEY, JSON.stringify(INITIAL_ASSIGNMENT_HISTORIES));
      return INITIAL_ASSIGNMENT_HISTORIES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ASSIGNMENT_HISTORIES;
  }
}

function saveStoredAssignmentHistories(data: Record<string, CustomerAssignmentHistory[]>) {
  try {
    localStorage.setItem(ASSIGNMENT_HISTORIES_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Không thể lưu lịch sử phân công vào localStorage', e);
  }
}

/**
 * Lấy lịch sử phân công nhân viên phụ trách của một đại lý (S3-06)
 */
export async function fetchAssignmentHistory(agencyId: string): Promise<CustomerAssignmentHistory[]> {
  // Thử gọi backend nếu ID là số
  if (/^\d+$/.test(agencyId)) {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/customers/${agencyId}/assignment-history`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback xuống mock
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
  const allHistories = getStoredAssignmentHistories();
  return (allHistories[agencyId] || []).sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );
}

/**
 * Đổi nhân viên phụ trách chính cho một đại lý (S3-06)
 */
export async function assignAgencySalesRep(
  payload: AssignSalesRepPayload,
  currentUser?: { fullName?: string; username?: string; role?: string }
): Promise<{ success: boolean; message: string }> {
  // Thử gọi backend nếu ID là số
  if (/^\d+$/.test(payload.agencyId)) {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/customers/${payload.agencyId}/sales-rep`, {
        method: 'PUT',
        body: JSON.stringify({
          salesRepId: Number(payload.salesRepId),
          reason: payload.reason?.trim() || null
        })
      });
      if (res.ok) {
        return { success: true, message: 'Đã cập nhật nhân viên phụ trách đại lý thành công!' };
      }
      const err = await res.json().catch(() => null);
      return { success: false, message: err?.message || 'Không thể đổi nhân viên phụ trách' };
    } catch {
      // Fallback xuống mock
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  const agencies = getStoredAgencies();
  const agencyIndex = agencies.findIndex((a) => a.id === payload.agencyId);
  if (agencyIndex === -1) {
    return { success: false, message: 'Không tìm thấy hồ sơ đại lý cần phân công!' };
  }

  const agency = agencies[agencyIndex];
  const allReps = await fetchActiveSalesReps();
  const newRep = allReps.find((r) => r.id === payload.salesRepId || r.username === payload.salesRepId) || SALES_REP_OPTIONS.find((r) => r.id === payload.salesRepId);
  if (!newRep) {
    return { success: false, message: 'Nhân viên kinh doanh được chọn không tồn tại hoặc đã ngừng hoạt động!' };
  }

  if (agency.assignedRepId === newRep.id) {
    return { success: false, message: 'Nhân viên này đang phụ trách đại lý này rồi!' };
  }

  const oldRep = SALES_REP_OPTIONS.find((r) => r.id === agency.assignedRepId);
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Cập nhật đại lý
  agency.assignedRepId = newRep.id;
  agency.assignedRepName = newRep.fullName;
  agency.updatedAt = nowStr;
  saveStoredAgencies(agencies);

  // Ghi nhận lịch sử phân công
  const allHistories = getStoredAssignmentHistories();
  const agencyHistories = allHistories[payload.agencyId] || [];

  const newHistory: CustomerAssignmentHistory = {
    id: `HIST-${Date.now()}`,
    changeType: 'ASSIGN',
    fromSalesRep: oldRep ? { id: oldRep.id, fullName: oldRep.fullName, username: oldRep.username } : null,
    toSalesRep: { id: newRep.id, fullName: newRep.fullName, username: newRep.username },
    changedBy: {
      id: 'CURRENT_USER',
      fullName: currentUser?.fullName || 'Quản lý kinh doanh',
      username: currentUser?.username || 'manager'
    },
    reason: payload.reason?.trim() || 'Điều chuyển người phụ trách',
    changedAt: nowStr
  };

  agencyHistories.unshift(newHistory);
  allHistories[payload.agencyId] = agencyHistories;
  saveStoredAssignmentHistories(allHistories);

  return {
    success: true,
    message: `Đã phân công nhân viên ${newRep.fullName} phụ trách đại lý [${agency.name}]!`
  };
}

/**
 * Chuyển giao địa bàn hàng loạt khi nhân viên nghỉ việc hoặc điều chuyển (S3-06)
 */
export async function transferAgencyTerritory(
  payload: TransferCustomersPayload,
  currentUser?: { fullName?: string; username?: string; role?: string }
): Promise<{ success: boolean; message: string; count: number }> {
  if (payload.fromSalesRepId === payload.toSalesRepId) {
    return {
      success: false,
      message: 'Nhân viên nhận bàn giao phải khác nhân viên bàn giao!',
      count: 0
    };
  }

  if (!payload.reason || !payload.reason.trim()) {
    return {
      success: false,
      message: 'Bắt buộc phải nhập lý do chuyển giao địa bàn!',
      count: 0
    };
  }

  // Thử gọi backend nếu các ID là số
  if (/^\d+$/.test(payload.fromSalesRepId) && /^\d+$/.test(payload.toSalesRepId)) {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/customers/transfer`, {
        method: 'POST',
        body: JSON.stringify({
          fromSalesRepId: Number(payload.fromSalesRepId),
          toSalesRepId: Number(payload.toSalesRepId),
          regionId: payload.regionId ? Number(payload.regionId) : null,
          reason: payload.reason.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message, count: data.count };
      }
      const err = await res.json().catch(() => null);
      return { success: false, message: err?.message || 'Chuyển giao thất bại', count: 0 };
    } catch {
      // Fallback xuống mock
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  const fromRep = SALES_REP_OPTIONS.find((r) => r.id === payload.fromSalesRepId);
  const toRep = SALES_REP_OPTIONS.find((r) => r.id === payload.toSalesRepId);

  if (!fromRep || !toRep) {
    return { success: false, message: 'Thông tin nhân viên kinh doanh không hợp lệ!', count: 0 };
  }

  const agencies = getStoredAgencies();
  // Lọc các đại lý đang do fromRep phụ trách, nếu có regionId thì lọc thêm theo khu vực
  const targetAgencies = agencies.filter((a) => {
    if (a.assignedRepId !== fromRep.id) return false;
    if (payload.regionId && a.regionId !== payload.regionId) return false;
    return true;
  });

  if (targetAgencies.length === 0) {
    const regionObj = REGION_OPTIONS.find((r) => r.id === payload.regionId);
    return {
      success: false,
      message: `Nhân viên ${fromRep.fullName} không phụ trách đại lý nào${regionObj ? ` tại khu vực ${regionObj.name}` : ''}!`,
      count: 0
    };
  }

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const allHistories = getStoredAssignmentHistories();

  // Cập nhật từng đại lý và ghi lịch sử TRANSFER
  targetAgencies.forEach((agency) => {
    agency.assignedRepId = toRep.id;
    agency.assignedRepName = toRep.fullName;
    agency.updatedAt = nowStr;

    const agencyHistories = allHistories[agency.id] || [];
    agencyHistories.unshift({
      id: `HIST-${Date.now()}-${agency.id}`,
      changeType: 'TRANSFER',
      fromSalesRep: { id: fromRep.id, fullName: fromRep.fullName, username: fromRep.username },
      toSalesRep: { id: toRep.id, fullName: toRep.fullName, username: toRep.username },
      changedBy: {
        id: 'CURRENT_USER',
        fullName: currentUser?.fullName || 'Quản lý kinh doanh',
        username: currentUser?.username || 'manager'
      },
      reason: payload.reason.trim(),
      changedAt: nowStr
    });
    allHistories[agency.id] = agencyHistories;
  });

  saveStoredAgencies(agencies);
  saveStoredAssignmentHistories(allHistories);

  return {
    success: true,
    message: `Đã chuyển giao thành công ${targetAgencies.length} đại lý từ [${fromRep.fullName}] sang [${toRep.fullName}]!`,
    count: targetAgencies.length
  };
}
