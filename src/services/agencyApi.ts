/**
 * API Service & Mock Database cho Module Quản Lý Hồ Sơ Đại Lý (SCRUM-85 / S3-03 / EP-03)
 * Tuân thủ quy tắc:
 * - Mã đại lý là duy nhất.
 * - Nhóm khách hàng tự động quyết định Bảng giá được áp dụng.
 * - Đại lý đã phát sinh giao dịch không thể xóa, chỉ dừng giao dịch.
 */

import type {
  Agency,
  CustomerGroupId,
  CustomerGroupOption,
  RegionOption,
  SalesRepOption,
  CreateAgencyPayload,
  UpdateAgencyPayload,
  AgencyFilterParams,
  AgencyListResponse
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
  }
];

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
    updatedAt: '2026-09-20 14:15:00'
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
