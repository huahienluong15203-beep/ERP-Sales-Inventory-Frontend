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
  AgencyStatus,
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
  TransferCustomersPayload,
  CustomerTransactionLockPayload,
  OrderCreationCheckResponse,
  PricingTier,
  PriceListOption
} from '../types/agency';

// Danh mục Nhóm khách hàng & Bảng giá tương ứng
export const CUSTOMER_GROUP_OPTIONS: CustomerGroupOption[] = [
  {
    id: 'TIER_1',
    name: 'Đại lý Cấp 1 (Tổng thầu / NPP Lớn)',
    description: 'Áp dụng cho các nhà phân phối độc quyền cấp tỉnh, sản lượng lớn',
    defaultPricingTier: {
      id: 'BG-DL1-2026',
      code: 'BG-DL1-2026',
      name: 'Bảng giá Đại lý Cấp 1 (NPP Toàn quốc 2026)',
      description: 'Bảng giá chuẩn dành cho Nhà phân phối Cấp 1',
      badgeBg: '#FEF3C7',
      badgeColor: '#92400E'
    }
  },
  {
    id: 'TIER_2',
    name: 'Đại lý Cấp 2 (Bán buôn khu vực)',
    description: 'Áp dụng cho các cửa hàng đại lý vùng, doanh số trung bình',
    defaultPricingTier: {
      id: 'BG-DL2-2026',
      code: 'BG-DL2-2026',
      name: 'Bảng giá Đại lý Cấp 2 (Bán buôn khu vực 2026)',
      description: 'Bảng giá chuẩn dành cho Đại lý Bán buôn Cấp 2',
      badgeBg: '#E0E7FF',
      badgeColor: '#3730A3'
    }
  },
  {
    id: 'RETAIL_SHOWROOM',
    name: 'Đại lý Showroom & Bán lẻ VIP',
    description: 'Áp dụng cho các điểm giới thiệu sản phẩm và đối tác thương mại',
    defaultPricingTier: {
      id: 'BG-RETAIL-2026',
      code: 'BG-RETAIL-2026',
      name: 'Bảng giá Niêm yết Khách lẻ & Showroom 2026',
      description: 'Bảng giá bán lẻ niêm yết trực tiếp showroom',
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
export async function fetchActiveSalesReps(forceReload: boolean = false): Promise<SalesRepOption[]> {
  // Dùng /api/customers/form-options (Admin, QL kinh doanh, Kế toán, NV kinh doanh đều gọi được).
  // Không gọi /api/admin/users vì chỉ Admin có quyền -> vai trò khác bị 403 và văng ra màn đăng nhập.
  try {
    const options = await fetchAgencyFormOptions(forceReload);
    if (options.salesReps.length > 0) return options.salesReps;
  } catch {
    // dùng danh sách mẫu bên dưới
  }
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
    status: 'ACTIVE',
    transactionLocked: true,
    transactionLockReason: 'Kế toán công nợ khóa do nợ quá hạn 45 ngày và có dấu hiệu mất khả năng thanh toán',
    transactionLockedAt: '2026-09-25 16:30:00',
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

// ==========================================
// HỒ SƠ ĐẠI LÝ — GỌI BACKEND /api/customers (không còn lưu tạm trong trình duyệt)
// ==========================================

const CUSTOMERS_URL = `${API_BASE_URL}/api/customers`;

/** Nhóm khách hàng: Frontend (TIER_1...) <-> Backend (DEALER_LEVEL_1...) */
const GROUP_TO_BACKEND: Record<CustomerGroupId, string> = {
  TIER_1: 'DEALER_LEVEL_1',
  TIER_2: 'DEALER_LEVEL_2',
  RETAIL_SHOWROOM: 'RETAIL'
};

function groupFromBackend(value?: string | null): CustomerGroupId {
  if (value === 'DEALER_LEVEL_1') return 'TIER_1';
  if (value === 'DEALER_LEVEL_2') return 'TIER_2';
  return 'RETAIL_SHOWROOM';
}

/** Trạng thái: Frontend dùng SUSPENDED, Backend dùng INACTIVE (Ngừng giao dịch) */
function statusToBackend(value?: string): string | undefined {
  if (!value) return undefined;
  return value === 'SUSPENDED' ? 'INACTIVE' : value;
}

function formatBackendDate(value?: string | null): string {
  return value ? value.replace('T', ' ').substring(0, 19) : '';
}

/** Đọc lỗi chuẩn { code, message, details } của Backend thành 1 câu tiếng Việt */
async function readBackendError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.details && typeof data.details === 'object') {
    const first = Object.values(data.details as Record<string, string>)[0];
    if (first) return String(first);
  }
  return data?.message || fallback;
}

/** Dữ liệu đại lý Backend trả về (CustomerResponse) */
interface BackendCustomer {
  id: number;
  code: string;
  name: string;
  taxCode?: string | null;
  customerGroup?: string | null;
  customerGroupLabel?: string | null;
  region?: { id: number; code: string; name: string } | null;
  salesRep?: { id: number; code: string; name: string } | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  status?: string | null;
  statusReason?: string | null;
  creditLimit?: number | null;
  maxDebtDays?: number | null;
  transactionLocked?: boolean | null;
  transactionLockReason?: string | null;
  priceList?: { id: number; code: string; name: string } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function mapCustomer(c: BackendCustomer): Agency {
  const groupId = groupFromBackend(c.customerGroup);
  const groupOption = CUSTOMER_GROUP_OPTIONS.find((g) => g.id === groupId);
  const suspended = c.status === 'INACTIVE';

  // Lấy bảng giá thật từ Backend nếu có, hoặc dùng fallback theo nhóm
  const groupStyles: Record<CustomerGroupId, { badgeBg: string; badgeColor: string }> = {
    TIER_1: { badgeBg: '#FEF3C7', badgeColor: '#92400E' },
    TIER_2: { badgeBg: '#E0E7FF', badgeColor: '#3730A3' },
    RETAIL_SHOWROOM: { badgeBg: '#F3F4F6', badgeColor: '#374151' }
  };
  const style = groupStyles[groupId] || groupStyles.RETAIL_SHOWROOM;

  let pricingTier: PricingTier;
  if (c.priceList) {
    pricingTier = {
      id: String(c.priceList.id),
      code: c.priceList.code,
      name: c.priceList.name,
      description: `Bảng giá áp dụng: ${c.priceList.code}`,
      badgeBg: style.badgeBg,
      badgeColor: style.badgeColor
    };
  } else {
    pricingTier = getPricingTierByGroup(groupId);
  }

  return {
    id: String(c.id),
    code: c.code,
    name: c.name,
    taxCode: c.taxCode || '',
    customerGroup: groupId,
    customerGroupName: c.customerGroupLabel || groupOption?.name || groupId,
    pricingTier,
    priceList: c.priceList || null,
    regionId: c.region?.id != null ? String(c.region.id) : '',
    regionName: c.region?.name || 'Chưa xác định',
    assignedRepId: c.salesRep?.id != null ? String(c.salesRep.id) : '',
    assignedRepName: c.salesRep?.name || 'Chưa gán',
    phone: c.phone || '',
    email: c.email || '',
    address: c.address || '',
    status: (suspended ? 'SUSPENDED' : 'ACTIVE') as AgencyStatus,
    suspendReason: suspended ? c.statusReason || undefined : undefined,
    hasTransactions: false,
    transactionCount: 0,
    totalDebt: 0,
    creditLimit: Number(c.creditLimit ?? 0),
    maxDebtDays: c.maxDebtDays ?? undefined,
    transactionLocked: Boolean(c.transactionLocked),
    transactionLockReason: c.transactionLockReason || '',
    transactionLockedAt: c.transactionLockedAt || undefined,
    createdAt: formatBackendDate(c.createdAt),
    updatedAt: formatBackendDate(c.updatedAt)
  };
}

export interface AgencyFormOptions {
  regions: RegionOption[];
  salesReps: SalesRepOption[];
  priceLists: PriceListOption[];
}

let formOptionsCache: Promise<AgencyFormOptions> | null = null;

export function invalidateAgencyFormOptionsCache(): void {
  formOptionsCache = null;
}

/** Lấy Bảng giá thực tế khớp theo Nhóm khách hàng từ danh mục formOptions */
export function getRealPriceListForGroup(
  groupId: CustomerGroupId,
  availablePriceLists?: PriceListOption[]
): PricingTier {
  const backendGroup = GROUP_TO_BACKEND[groupId];
  const found = availablePriceLists?.find((pl) => pl.customerGroup === backendGroup && pl.status !== 'INACTIVE');
  const groupStyles: Record<CustomerGroupId, { badgeBg: string; badgeColor: string }> = {
    TIER_1: { badgeBg: '#FEF3C7', badgeColor: '#92400E' },
    TIER_2: { badgeBg: '#E0E7FF', badgeColor: '#3730A3' },
    RETAIL_SHOWROOM: { badgeBg: '#F3F4F6', badgeColor: '#374151' }
  };
  const style = groupStyles[groupId] || groupStyles.RETAIL_SHOWROOM;

  if (found) {
    return {
      id: String(found.id),
      code: found.code,
      name: found.name,
      description: `Bảng giá áp dụng: ${found.code}`,
      badgeBg: style.badgeBg,
      badgeColor: style.badgeColor
    };
  }
  return getPricingTierByGroup(groupId);
}

/** Khu vực + nhân viên kinh doanh + bảng giá thật từ Backend (GET /api/customers/form-options). */
export function fetchAgencyFormOptions(forceReload: boolean = false): Promise<AgencyFormOptions> {
  if (forceReload || !formOptionsCache) {
    formOptionsCache = authFetch(`${CUSTOMERS_URL}/form-options`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readBackendError(res, 'Không tải được danh mục khu vực'));
        const data = await res.json();
        return {
          regions: (data?.regions || []).map((r: { id: number; code: string; name: string }) => ({
            id: String(r.id),
            code: r.code,
            name: r.name
          })),
          salesReps: (data?.salesReps || []).map((u: { id: number; code: string; name: string }) => ({
            id: String(u.id),
            username: u.code || '',
            fullName: u.name,
            phone: '',
            email: '',
            regionId: ''
          })),
          priceLists: (data?.priceLists || []).map((pl: { id: number; code: string; name: string; customerGroup: string; customerGroupLabel?: string; startDate?: string; endDate?: string | null; status?: string }) => ({
            id: pl.id,
            code: pl.code,
            name: pl.name,
            customerGroup: pl.customerGroup,
            customerGroupLabel: pl.customerGroupLabel,
            startDate: pl.startDate,
            endDate: pl.endDate,
            status: pl.status
          }))
        };
      })
      .catch((err) => {
        formOptionsCache = null;
        throw err;
      });
  }
  return formOptionsCache;
}

/**
 * 1. Lấy 1 trang hồ sơ đại lý: Backend tìm kiếm + lọc + phân trang (page đếm từ 0).
 * Nhân viên kinh doanh chỉ thấy đại lý mình phụ trách (Backend tự lọc theo người đăng nhập).
 */
export async function fetchAgencies(params: AgencyFilterParams): Promise<AgencyListResponse> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const query = new URLSearchParams();
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
  if (params.customerGroup) {
    query.set('customerGroup', GROUP_TO_BACKEND[params.customerGroup as CustomerGroupId] || params.customerGroup);
  }
  if (params.regionId && /^\d+$/.test(params.regionId)) query.set('regionId', params.regionId);
  if (params.salesRepId && /^\d+$/.test(params.salesRepId)) query.set('salesRepId', params.salesRepId);
  const status = statusToBackend(params.status);
  if (status) query.set('status', status);
  if (params.transactionLocked !== undefined) query.set('transactionLocked', String(params.transactionLocked));
  query.set('page', String(page));
  query.set('size', String(size));

  const res = await authFetch(`${CUSTOMERS_URL}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không tải được danh sách đại lý'));
  }
  const data = await res.json();
  return {
    content: (data?.content || []).map(mapCustomer),
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 1,
    currentPage: page
  };
}

/** Số liệu thẻ đầu trang, đếm trên TOÀN BỘ đại lý (gọi API với size=1 chỉ để lấy tổng). */
export async function fetchAgencyStats(): Promise<{
  total: number;
  active: number;
  suspended: number;
  locked: number;
}> {
  const [all, active, suspended, locked] = await Promise.all([
    fetchAgencies({ page: 0, size: 1 }),
    fetchAgencies({ page: 0, size: 1, status: 'ACTIVE' }),
    fetchAgencies({ page: 0, size: 1, status: 'SUSPENDED' }),
    fetchAgencies({ page: 0, size: 1, transactionLocked: true })
  ]);
  return {
    total: all.totalElements,
    active: active.totalElements,
    suspended: suspended.totalElements,
    locked: locked.totalElements
  };
}

async function fetchCustomer(id: string): Promise<BackendCustomer | null> {
  const res = await authFetch(`${CUSTOMERS_URL}/${id}`);
  return res.ok ? res.json() : null;
}

/** Hạn mức công nợ đổi qua API riêng vì Backend bắt buộc lý do để ghi nhật ký (S3-05). */
async function saveCreditLimit(id: string, creditLimit: number, maxDebtDays: number, reason: string) {
  const res = await authFetch(`${CUSTOMERS_URL}/${id}/debt-limit`, {
    method: 'PUT',
    body: JSON.stringify({ creditLimit, maxDebtDays, reason })
  });
  if (!res.ok) throw new Error(await readBackendError(res, 'Không lưu được hạn mức công nợ'));
}

/** current = hồ sơ hiện tại trên Backend: giữ nguyên các trường form không có (người liên hệ, ghi chú). */
function profileBody(payload: CreateAgencyPayload | UpdateAgencyPayload, current?: BackendCustomer | null) {
  return {
    contactName: current?.contactName ?? null,
    note: current?.note ?? null,
    name: payload.name.trim(),
    taxCode: payload.taxCode.trim(),
    customerGroup: GROUP_TO_BACKEND[payload.customerGroup] || 'RETAIL',
    regionId: /^\d+$/.test(payload.regionId) ? Number(payload.regionId) : null,
    phone: payload.phone.trim(),
    email: payload.email.trim(),
    address: payload.address.trim()
  };
}

/**
 * 2. Thêm mới hồ sơ đại lý (POST /api/customers). Backend kiểm mã đại lý duy nhất.
 */
export async function createAgency(
  payload: CreateAgencyPayload
): Promise<{ success: boolean; message: string; agency?: Agency }> {
  const res = await authFetch(CUSTOMERS_URL, {
    method: 'POST',
    body: JSON.stringify({
      ...profileBody(payload),
      code: payload.code.trim().toUpperCase(),
      salesRepId: /^\d+$/.test(payload.assignedRepId) ? Number(payload.assignedRepId) : null
    })
  });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể tạo đại lý') };
  }
  const created: BackendCustomer = await res.json();
  let message = `Đã tạo hồ sơ đại lý [${created.code}] thành công!`;

  if (payload.creditLimit !== undefined && Number(payload.creditLimit) !== Number(created.creditLimit ?? 0)) {
    try {
      await saveCreditLimit(String(created.id), payload.creditLimit, created.maxDebtDays ?? 30, 'Khai báo hạn mức khi tạo đại lý');
    } catch (err) {
      message += ` Riêng hạn mức công nợ chưa lưu được: ${err instanceof Error ? err.message : ''}`;
    }
  }
  const latest = (await fetchCustomer(String(created.id))) || created;
  return { success: true, message, agency: mapCustomer(latest) };
}

/**
 * 3. Cập nhật hồ sơ đại lý (PUT /api/customers/{id}).
 * Đổi người phụ trách và hạn mức công nợ đi qua API riêng (có ghi nhật ký).
 */
export async function updateAgency(
  id: string,
  payload: UpdateAgencyPayload
): Promise<{ success: boolean; message: string; agency?: Agency }> {
  const current = await fetchCustomer(id);
  if (!current) {
    return { success: false, message: 'Không tìm thấy hồ sơ đại lý để cập nhật!' };
  }

  const res = await authFetch(`${CUSTOMERS_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(profileBody(payload, current))
  });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể cập nhật đại lý') };
  }

  const warnings: string[] = [];
  // Chỉ đổi người phụ trách khi người dùng thực sự chọn người khác (API này chỉ Admin, QL kinh doanh được gọi)
  const newRepId = payload.assignedRepId;
  if (payload.changeSalesRep && /^\d+$/.test(newRepId) && newRepId !== String(current.salesRep?.id ?? '')) {
    const repRes = await authFetch(`${CUSTOMERS_URL}/${id}/sales-rep`, {
      method: 'PUT',
      body: JSON.stringify({ salesRepId: Number(newRepId), reason: 'Đổi người phụ trách từ form hồ sơ đại lý' })
    });
    if (!repRes.ok) warnings.push(await readBackendError(repRes, 'Chưa đổi được người phụ trách'));
  }

  if (payload.creditLimit !== undefined && Number(payload.creditLimit) !== Number(current.creditLimit ?? 0)) {
    try {
      await saveCreditLimit(id, payload.creditLimit, current.maxDebtDays ?? 30, 'Cập nhật hạn mức từ form hồ sơ đại lý');
    } catch (err) {
      warnings.push(err instanceof Error ? err.message : 'Chưa lưu được hạn mức công nợ');
    }
  }

  const latest = (await fetchCustomer(id)) || current;
  return {
    success: true,
    message:
      `Đã cập nhật hồ sơ đại lý [${latest.code}].` + (warnings.length ? ` Lưu ý: ${warnings.join('; ')}` : ''),
    agency: mapCustomer(latest)
  };
}

/**
 * 4. Dừng giao dịch đại lý (PATCH /api/customers/{id}/status -> INACTIVE, bắt buộc lý do)
 */
export async function suspendAgency(
  id: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  if (!reason || !reason.trim()) {
    return { success: false, message: 'Bắt buộc phải nhập lý do dừng giao dịch đại lý!' };
  }
  const res = await authFetch(`${CUSTOMERS_URL}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'INACTIVE', reason: reason.trim() })
  });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể dừng giao dịch đại lý') };
  }
  const data: BackendCustomer = await res.json();
  return {
    success: true,
    message: `Đã chuyển đại lý [${data.code} - ${data.name}] sang "Dừng giao dịch". Lý do: ${reason.trim()}`
  };
}

/**
 * 5. Mở lại giao dịch cho đại lý (PATCH status -> ACTIVE)
 */
export async function reactivateAgency(id: string): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(`${CUSTOMERS_URL}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'ACTIVE', reason: 'Mở lại giao dịch' })
  });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể mở lại giao dịch') };
  }
  const data: BackendCustomer = await res.json();
  return { success: true, message: `Đã mở lại giao dịch bình thường cho đại lý [${data.code} - ${data.name}].` };
}

/**
 * 6. Đại lý KHÔNG xoá cứng khỏi hệ thống (quy tắc 8: dữ liệu đã phát sinh giao dịch chỉ chuyển trạng thái).
 */
export async function deleteAgency(id: string): Promise<{ success: boolean; message: string }> {
  void id;
  return {
    success: false,
    message:
      'Hồ sơ đại lý không xoá khỏi hệ thống để giữ lịch sử đơn hàng và công nợ. Vui lòng dùng "Dừng giao dịch" thay cho xoá.'
  };
}

// ==========================================
// CÁC HÀM XỬ LÝ ĐIỂM GIAO HÀNG (S3-04 / SCRUM-15)
// ==========================================

interface BackendDeliveryAddress {
  id: number;
  customerId?: number;
  label?: string | null;
  address?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  note?: string | null;
  isDefault?: boolean;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function mapDeliveryAddress(addr: BackendDeliveryAddress, agencyId: string): DeliveryPoint {
  return {
    id: String(addr.id),
    agencyId: String(addr.customerId ?? agencyId),
    name: addr.label || 'Kho nhận hàng',
    address: addr.address || '',
    contactPerson: addr.receiverName || '',
    phone: addr.receiverPhone || '',
    routeNotes: addr.note || '',
    isDefault: Boolean(addr.isDefault),
    createdAt: formatBackendDate(addr.createdAt),
    updatedAt: formatBackendDate(addr.updatedAt || addr.createdAt)
  };
}

function deliveryUrl(agencyId: string, suffix = ''): string {
  return `${CUSTOMERS_URL}/${agencyId}/delivery-addresses${suffix}`;
}

function deliveryBody(payload: CreateDeliveryPointPayload | UpdateDeliveryPointPayload) {
  return {
    label: payload.name.trim(),
    address: payload.address.trim(),
    receiverName: payload.contactPerson.trim(),
    receiverPhone: payload.phone.trim(),
    note: payload.routeNotes?.trim() || null,
    isDefault: Boolean(payload.isDefault)
  };
}

/**
 * 7. Lấy danh sách điểm giao hàng của một đại lý (GET /api/customers/{id}/delivery-addresses).
 * Điểm mặc định lên đầu, sau đó theo ngày tạo mới nhất.
 */
export async function fetchDeliveryPointsByAgency(agencyId: string): Promise<DeliveryPoint[]> {
  if (!/^\d+$/.test(agencyId)) return [];
  const res = await authFetch(deliveryUrl(agencyId));
  if (!res.ok) {
    throw new Error(await readBackendError(res, 'Không tải được danh sách điểm giao hàng'));
  }
  const data: BackendDeliveryAddress[] = await res.json();
  return (Array.isArray(data) ? data : [])
    .filter((addr) => !addr.status || addr.status === 'ACTIVE')
    .map((addr) => mapDeliveryAddress(addr, agencyId))
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export const fetchDeliveryPoints = fetchDeliveryPointsByAgency;

/**
 * 8. Thêm điểm giao hàng (POST). Backend tự đặt điểm đầu tiên làm mặc định và bỏ mặc định các điểm khác.
 */
export async function createDeliveryPoint(
  payload: CreateDeliveryPointPayload
): Promise<{ success: boolean; message: string; deliveryPoint?: DeliveryPoint }> {
  if (!payload.name?.trim()) {
    return { success: false, message: 'Tên điểm giao hàng không được để trống!' };
  }
  if (!payload.address?.trim()) {
    return { success: false, message: 'Địa chỉ điểm giao hàng không được để trống!' };
  }
  const res = await authFetch(deliveryUrl(payload.agencyId), {
    method: 'POST',
    body: JSON.stringify(deliveryBody(payload))
  });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể thêm điểm giao hàng') };
  }
  const point = mapDeliveryAddress(await res.json(), payload.agencyId);
  return { success: true, message: `Đã thêm điểm giao hàng "${point.name}" thành công!`, deliveryPoint: point };
}

/**
 * 9. Sửa điểm giao hàng (PUT /api/customers/{agencyId}/delivery-addresses/{id})
 */
export async function updateDeliveryPoint(
  id: string,
  payload: UpdateDeliveryPointPayload,
  agencyId?: string
): Promise<{ success: boolean; message: string; deliveryPoint?: DeliveryPoint }> {
  if (!agencyId) {
    return { success: false, message: 'Thiếu thông tin đại lý của điểm giao hàng!' };
  }
  const res = await authFetch(deliveryUrl(agencyId, `/${id}`), {
    method: 'PUT',
    body: JSON.stringify(deliveryBody(payload))
  });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể cập nhật điểm giao hàng') };
  }
  const point = mapDeliveryAddress(await res.json(), agencyId);
  return { success: true, message: `Đã cập nhật điểm giao hàng "${point.name}".`, deliveryPoint: point };
}

/**
 * 10. Đặt điểm giao hàng mặc định (PATCH .../{id}/default)
 */
export async function setDefaultDeliveryPoint(
  id: string,
  agencyId: string
): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(deliveryUrl(agencyId, `/${id}/default`), { method: 'PATCH' });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể đặt điểm giao mặc định') };
  }
  const point = mapDeliveryAddress(await res.json(), agencyId);
  return { success: true, message: `Đã đặt "${point.name}" làm điểm giao hàng mặc định.` };
}

/**
 * 11. Ngừng sử dụng điểm giao hàng (PATCH .../{id}/deactivate). Không xoá cứng vì đơn hàng cũ còn tham chiếu.
 */
export async function deleteDeliveryPoint(
  id: string,
  agencyId: string
): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(deliveryUrl(agencyId, `/${id}/deactivate`), { method: 'PATCH' });
  if (!res.ok) {
    return { success: false, message: await readBackendError(res, 'Không thể xoá điểm giao hàng') };
  }
  return { success: true, message: 'Đã ngừng sử dụng điểm giao hàng.' };
}

/**
 * Lịch sử thay đổi hạn mức công nợ của 1 đại lý: đọc Nhật ký thao tác (module DEBT_LIMIT) trên Backend.
 */
export async function fetchCreditLimitLogs(agencyId: string, agencyCode?: string): Promise<CreditLimitAuditLog[]> {
  // Nhật ký chỉ Admin, Kế toán, QL kinh doanh, QL kho được xem; vai trò khác gọi sẽ bị 403 và bị đăng xuất -> bỏ qua
  let role: string | null = null;
  try {
    role = localStorage.getItem('erp_active_role') || sessionStorage.getItem('erp_active_role');
  } catch {
    role = null;
  }
  if (!role || !['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER', 'ROLE_WH_MANAGER'].includes(role)) {
    return [];
  }
  // Chỉ lấy thao tác đổi hạn mức (bỏ khoá/mở giao dịch cùng module), lọc theo mã đại lý để không bị đẩy mất bởi đại lý khác
  const query = new URLSearchParams({
    module: 'DEBT_LIMIT',
    action: 'UPDATE_DEBT_LIMIT',
    targetType: 'CUSTOMER',
    page: '0',
    size: '100'
  });
  if (agencyCode) query.set('keyword', agencyCode);
  const res = await authFetch(`${API_BASE_URL}/api/audit-logs?${query.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  const parse = (value?: string | null): { creditLimit?: number; maxDebtDays?: number } => {
    try {
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  };
  return (data?.content || [])
    .filter((log: { targetId?: number }) => String(log.targetId) === String(agencyId))
    .map(
      (log: {
        id: number;
        oldValue?: string;
        newValue?: string;
        reason?: string;
        actorFullName?: string;
        actorUsername?: string;
        createdAt?: string;
      }) => {
        const oldV = parse(log.oldValue);
        const newV = parse(log.newValue);
        return {
          id: String(log.id),
          agencyId: String(agencyId),
          oldCreditLimit: Number(oldV.creditLimit ?? 0),
          newCreditLimit: Number(newV.creditLimit ?? 0),
          oldMaxDebtDays: Number(oldV.maxDebtDays ?? 0),
          newMaxDebtDays: Number(newV.maxDebtDays ?? 0),
          reason: log.reason || '',
          updatedBy: log.actorFullName || log.actorUsername || '',
          updatedByRole: '',
          updatedAt: formatBackendDate(log.createdAt)
        } as CreditLimitAuditLog;
      }
    );
}

/**
 * Cập nhật hạn mức công nợ (PUT /api/customers/{id}/debt-limit). Backend bắt buộc lý do và tự ghi nhật ký.
 */
export async function updateCreditLimit(
  payload: UpdateCreditLimitPayload,
  currentUser?: { fullName: string; role: string }
): Promise<{ success: boolean; message: string }> {
  void currentUser;
  if (!payload.reason || !payload.reason.trim()) {
    return { success: false, message: 'Bắt buộc phải nhập lý do điều chỉnh hạn mức!' };
  }
  if (payload.creditLimit < 0 || payload.maxDebtDays < 0) {
    return { success: false, message: 'Hạn mức tiền và số ngày nợ không được âm!' };
  }
  try {
    await saveCreditLimit(payload.agencyId, payload.creditLimit, payload.maxDebtDays, payload.reason.trim());
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Không lưu được hạn mức công nợ' };
  }
  return { success: true, message: 'Đã cập nhật hạn mức công nợ thành công!' };
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
        // Backend trả TransferCustomersResponse { transferredCount, message }
        const count = Number(data.transferredCount ?? data.count ?? 0);
        return { success: true, message: data.message || `Đã chuyển giao ${count} đại lý.`, count };
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

/**
 * Khóa hoặc Mở khóa giao dịch với đại lý (S3-07 / SCRUM-19)
 * Dành cho: Kế toán công nợ (ROLE_ACCOUNTANT), Quản lý kinh doanh (ROLE_SALES_MANAGER), Admin
 * - Bắt buộc nhập lý do khi khóa hoặc mở giao dịch.
 * - Đại lý bị khóa không tạo được đơn mới trên mọi nền tảng (chặn tại S3-09 & S4-02).
 * - Đơn dở dang vẫn xử lý được nhưng có cảnh báo.
 */
export async function setCustomerTransactionLock(
  payload: CustomerTransactionLockPayload
): Promise<{ success: boolean; message: string; agency?: Agency }> {
  if (!payload.reason || !payload.reason.trim()) {
    return {
      success: false,
      message: 'Bắt buộc phải nhập lý do khi khóa hoặc mở giao dịch với đại lý!'
    };
  }

  // 1. Thử gọi backend PATCH /api/customers/{id}/transaction-lock nếu id là số
  if (/^\d+$/.test(payload.agencyId)) {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/customers/${payload.agencyId}/transaction-lock`, {
        method: 'PATCH',
        body: JSON.stringify({
          locked: payload.locked,
          reason: payload.reason.trim()
        })
      });

      if (res.ok) {
        const backendCustomer = await res.json();
        const list = getStoredAgencies();
        const item = list.find((a) => a.id === payload.agencyId);
        if (item) {
          item.transactionLocked = backendCustomer.transactionLocked;
          item.transactionLockReason = backendCustomer.transactionLockReason;
          item.transactionLockedAt = backendCustomer.transactionLockedAt;
          item.updatedAt = backendCustomer.updatedAt;
          saveStoredAgencies(list);
        }
        return {
          success: true,
          message: payload.locked
            ? `Đã khóa giao dịch đại lý [${backendCustomer.code}] thành công do rủi ro công nợ!`
            : `Đã mở khóa giao dịch cho đại lý [${backendCustomer.code}] thành công!`
        };
      }
      const err = await res.json().catch(() => null);
      return {
        success: false,
        message: err?.message || 'Không thể cập nhật trạng thái khóa giao dịch'
      };
    } catch {
      // Fallback xuống mock nếu backend offline
    }
  }

  // 2. Mock / offline
  await new Promise((resolve) => setTimeout(resolve, 250));
  const list = getStoredAgencies();
  const target = list.find((a) => a.id === payload.agencyId);

  if (!target) {
    return { success: false, message: 'Không tìm thấy thông tin đại lý!' };
  }

  if (Boolean(target.transactionLocked) === payload.locked) {
    return {
      success: false,
      message: payload.locked
        ? 'Đại lý đã ở trạng thái bị khóa giao dịch rồi!'
        : 'Đại lý đang ở trạng thái mở giao dịch bình thường rồi!'
    };
  }

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  target.transactionLocked = payload.locked;
  target.transactionLockReason = payload.reason.trim();
  target.transactionLockedAt = payload.locked ? nowStr : undefined;
  target.updatedAt = nowStr;

  saveStoredAgencies(list);

  return {
    success: true,
    message: payload.locked
      ? `Đã khóa giao dịch đại lý [${target.code} - ${target.name}]. Chặn tạo đơn mới trên toàn hệ thống!`
      : `Đã mở khóa giao dịch cho đại lý [${target.code} - ${target.name}]. Đại lý có thể giao dịch bình thường.`,
    agency: target
  };
}

/**
 * Kiểm tra điều kiện tạo đơn mới của đại lý (S3-07 & S4-02)
 * Gọi endpoint: GET /api/customers/{id}/check-order-creation
 */
export async function checkCustomerOrderCreation(
  agencyId: string
): Promise<OrderCreationCheckResponse> {
  if (/^\d+$/.test(agencyId)) {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/customers/${agencyId}/check-order-creation`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback xuống mock
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
  const list = getStoredAgencies();
  const target = list.find((a) => a.id === agencyId);

  if (!target) {
    return {
      customerId: agencyId,
      customerCode: '',
      customerName: '',
      allowed: false,
      blockReason: 'Không tìm thấy hồ sơ đại lý trong hệ thống',
      transactionLocked: false
    };
  }

  if (target.transactionLocked) {
    return {
      customerId: target.id,
      customerCode: target.code,
      customerName: target.name,
      allowed: false,
      blockReason: `Đại lý đang bị khóa giao dịch: ${target.transactionLockReason || 'Có dấu hiệu mất khả năng thanh toán'}. Chặn tạo đơn mới trên mọi nền tảng.`,
      creditLimit: target.creditLimit,
      maxDebtDays: target.maxDebtDays || 30,
      transactionLocked: true
    };
  }

  if (target.status === 'SUSPENDED') {
    return {
      customerId: target.id,
      customerCode: target.code,
      customerName: target.name,
      allowed: false,
      blockReason: `Đại lý đang tạm dừng hoạt động: ${target.suspendReason || 'Dừng giao dịch'}. Không thể tạo đơn mới.`,
      creditLimit: target.creditLimit,
      maxDebtDays: target.maxDebtDays || 30,
      transactionLocked: false
    };
  }

  return {
    customerId: target.id,
    customerCode: target.code,
    customerName: target.name,
    allowed: true,
    creditLimit: target.creditLimit,
    maxDebtDays: target.maxDebtDays || 30,
    transactionLocked: false
  };
}

