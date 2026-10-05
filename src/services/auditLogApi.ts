/**
 * API Service cho Nhật Ký Thao Tác Hệ Thống (S2-04 / Audit Log)
 * Kết nối với Spring Boot Backend: /api/audit-logs
 * Có bộ dữ liệu mẫu dự phòng chuẩn hóa nghiệp vụ để demo và kiểm thử độc lập.
 */

import * as XLSX from 'xlsx';
import type {
  AuditLogItem,
  AuditLogFilterParams,
  AuditLogPageResponse,
  AuditModuleKey,
  AuditModuleOption,
  AuditStatsSummary
} from '../types/auditLog';
import { API_BASE_URL, getStoredToken } from './api';

export const AUDIT_MODULE_OPTIONS: AuditModuleOption[] = [
  {
    value: 'INVENTORY',
    label: 'Tồn kho & Kiểm kê',
    badgeBg: '#FEF3C7',
    badgeColor: '#B45309',
    iconName: 'Package',
    description: 'Điều chỉnh kiểm kê cuối tháng, nhập/xuất kho, hao hụt hư hỏng'
  },
  {
    value: 'DEBT_LIMIT',
    label: 'Hạn mức công nợ',
    badgeBg: '#DBEAFE',
    badgeColor: '#1E40AF',
    iconName: 'Building2',
    description: 'Thay đổi hạn mức tiền nợ, số ngày nợ tối đa và khóa giao dịch đại lý'
  },
  {
    value: 'PRICING',
    label: 'Bảng giá sản phẩm',
    badgeBg: '#DCFCE7',
    badgeColor: '#166534',
    iconName: 'Tags',
    description: 'Cập nhật giá bán sỉ/lẻ, giá sàn và thời hạn áp dụng biểu giá'
  },
  {
    value: 'INVOICE',
    label: 'Hóa đơn & Thanh toán',
    badgeBg: '#F3E8FF',
    badgeColor: '#6B21A8',
    iconName: 'FileText',
    description: 'Điều chỉnh giảm trừ hóa đơn, đối trừ công nợ và hủy hóa đơn'
  },
  {
    value: 'CUSTOMER',
    label: 'Hồ sơ đại lý',
    badgeBg: '#FCE7F3',
    badgeColor: '#9D174D',
    iconName: 'Users',
    description: 'Cập nhật phân loại đại lý cấp 1/cấp 2, thông tin pháp lý và mã số thuế'
  }
];

// Danh sách dữ liệu mẫu kiểm kê & điều chỉnh tồn kho, công nợ chuẩn hóa phục vụ Story S2-04
export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 101,
    module: 'INVENTORY',
    moduleLabel: 'Tồn kho & Kiểm kê',
    action: 'ADJUST_STOCK_DEVIATION',
    actionLabel: 'Điều chỉnh lệch kiểm kê',
    targetType: 'PRODUCT_INVENTORY',
    targetId: 1,
    targetCode: 'SKU-BEER-SG-330',
    targetName: 'Bia Saigon Special Lon 330ml (Thùng 24)',
    actorId: 4,
    actorUsername: 'wh_staff',
    actorFullName: 'Nguyễn Văn Thủ Kho',
    actorRole: 'Thủ kho tổng (KHO-HCM-01)',
    oldValue: '1,200 thùng',
    newValue: '1,150 thùng',
    deltaFormatted: '-50 thùng',
    deltaType: 'decrease',
    reason: 'Biên bản kiểm kê cuối tháng 09/2026 (BB-KK-09/26): Lệch 50 thùng do va chạm vỡ nát khi vận chuyển hạ bãi kệ B2.',
    ipAddress: '192.168.1.104',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    httpMethod: 'POST',
    requestUri: '/api/inventory/adjust',
    createdAt: '2026-09-30T17:45:20'
  },
  {
    id: 102,
    module: 'INVENTORY',
    moduleLabel: 'Tồn kho & Kiểm kê',
    action: 'ADJUST_STOCK_SURPLUS',
    actionLabel: 'Ghi nhận thừa kiểm kê',
    targetType: 'PRODUCT_INVENTORY',
    targetId: 2,
    targetCode: 'SKU-BEER-TIGER-330',
    targetName: 'Bia Tiger Crystal 330ml (Thùng 24)',
    actorId: 5,
    actorUsername: 'wh_manager',
    actorFullName: 'Hoàng Quản Lý Kho',
    actorRole: 'Quản lý kho vận',
    oldValue: '850 thùng',
    newValue: '862 thùng',
    deltaFormatted: '+12 thùng',
    deltaType: 'increase',
    reason: 'Kiểm kê định kỳ cuối tháng: Đếm bù dư 12 thùng do thủ kho trước xếp nhầm sang line hàng Tiger Thường.',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    httpMethod: 'POST',
    requestUri: '/api/inventory/adjust',
    createdAt: '2026-09-30T16:20:15'
  },
  {
    id: 103,
    module: 'DEBT_LIMIT',
    moduleLabel: 'Hạn mức công nợ',
    action: 'INCREASE_CREDIT_LIMIT',
    actionLabel: 'Tăng hạn mức nợ',
    targetType: 'CUSTOMER',
    targetId: 201,
    targetCode: 'DL-001',
    targetName: 'Công Ty TNHH Thương Mại & Phân Phối Toàn Cầu',
    actorId: 6,
    actorUsername: 'accountant',
    actorFullName: 'Phạm Thị Kế Toán',
    actorRole: 'Kế toán công nợ',
    oldValue: '500,000,000 đ (Thời hạn: 30 ngày)',
    newValue: '800,000,000 đ (Thời hạn: 45 ngày)',
    deltaFormatted: '+300,000,000 đ',
    deltaType: 'increase',
    reason: 'Đại lý bổ sung thư bảo lãnh thanh toán của Vietcombank số BL-VCB-2026-88. Giám đốc tài chính đã phê duyệt.',
    ipAddress: '192.168.1.115',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    httpMethod: 'PUT',
    requestUri: '/api/customers/201/credit-limit',
    createdAt: '2026-09-29T10:15:30'
  },
  {
    id: 104,
    module: 'DEBT_LIMIT',
    moduleLabel: 'Hạn mức công nợ',
    action: 'RESTRICT_CREDIT_DAYS',
    actionLabel: 'Siết chặt ngày nợ',
    targetType: 'CUSTOMER',
    targetId: 205,
    targetCode: 'DL-005',
    targetName: 'Đại Lý Tạp Hóa Hoàng Mai - Chi Nhánh 2',
    actorId: 6,
    actorUsername: 'accountant',
    actorFullName: 'Phạm Thị Kế Toán',
    actorRole: 'Kế toán công nợ',
    oldValue: 'Hạn mức: 150,000,000 đ • 30 ngày nợ',
    newValue: 'Hạn mức: 100,000,000 đ • 15 ngày nợ',
    deltaFormatted: '-50,000,000 đ (Giảm 15 ngày)',
    deltaType: 'decrease',
    reason: 'Đại lý để nợ quá hạn trên 20 ngày trong 2 kỳ liên tiếp. Hạ hạn mức và giảm số ngày nợ để phòng ngừa rủi ro.',
    ipAddress: '192.168.1.115',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    httpMethod: 'PUT',
    requestUri: '/api/customers/205/credit-limit',
    createdAt: '2026-09-28T14:40:00'
  },
  {
    id: 105,
    module: 'INVENTORY',
    moduleLabel: 'Tồn kho & Kiểm kê',
    action: 'ADJUST_EXPIRED_STOCK',
    actionLabel: 'Hủy hàng hết hạn / cận date',
    targetType: 'PRODUCT_INVENTORY',
    targetId: 3,
    targetCode: 'SKU-BEER-HN-450',
    targetName: 'Bia Hà Nội Nhãn Vàng Chai 450ml (Két 20 chai)',
    actorId: 4,
    actorUsername: 'wh_staff',
    actorFullName: 'Nguyễn Văn Thủ Kho',
    actorRole: 'Thủ kho tổng (KHO-HCM-01)',
    oldValue: '620 két',
    newValue: '595 két',
    deltaFormatted: '-25 két',
    deltaType: 'decrease',
    reason: 'Biên bản hủy hàng cận date dưới 15 ngày (BBH-2026-09): 25 két bia chai bị đóng cặn do nhiệt độ kho bãi ẩm.',
    ipAddress: '192.168.1.104',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    httpMethod: 'POST',
    requestUri: '/api/inventory/adjust',
    createdAt: '2026-09-25T09:30:10'
  },
  {
    id: 106,
    module: 'PRICING',
    moduleLabel: 'Bảng giá sản phẩm',
    action: 'UPDATE_PRICE_LIST_ITEM',
    actionLabel: 'Điều chỉnh giá sỉ đại lý',
    targetType: 'PRICE_LIST',
    targetId: 301,
    targetCode: 'PL-WHOLESALE-2026',
    targetName: 'Bảng giá Đại lý Cấp 1 Toàn Quốc (Q3/2026)',
    actorId: 2,
    actorUsername: 'sales_manager',
    actorFullName: 'Trần Quản Lý Kinh Doanh',
    actorRole: 'Quản lý kinh doanh',
    oldValue: '385,000 đ/thùng (Giá sàn: 370,000 đ)',
    newValue: '405,000 đ/thùng (Giá sàn: 390,000 đ)',
    deltaFormatted: '+20,000 đ (+5.19%)',
    deltaType: 'increase',
    reason: 'Quyết định tăng giá số QĐ-TG-2026/09 do biến động giá nhập nguyên liệu men bia và vỏ lon nhôm tăng 8%.',
    ipAddress: '192.168.1.108',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/130.0',
    httpMethod: 'PUT',
    requestUri: '/api/price-lists/301/items',
    createdAt: '2026-09-20T11:00:00'
  },
  {
    id: 107,
    module: 'INVOICE',
    moduleLabel: 'Hóa đơn & Thanh toán',
    action: 'ADJUST_INVOICE_DISCOUNT',
    actionLabel: 'Chiết khấu bổ sung hóa đơn',
    targetType: 'INVOICE',
    targetId: 401,
    targetCode: 'HD-2026-09-088',
    targetName: 'Hóa đơn bán hàng xuất kho đợt 3 - NPP Miền Đông',
    actorId: 6,
    actorUsername: 'accountant',
    actorFullName: 'Phạm Thị Kế Toán',
    actorRole: 'Kế toán công nợ',
    oldValue: 'Tổng tiền: 245,000,000 đ',
    newValue: 'Tổng tiền: 232,750,000 đ',
    deltaFormatted: '-12,250,000 đ (-5%)',
    deltaType: 'decrease',
    reason: 'Áp dụng chiết khấu thương mại đạt chỉ tiêu doanh số tháng 9 theo phụ lục hợp đồng thương mại số PL-09/2026.',
    ipAddress: '192.168.1.115',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    httpMethod: 'PUT',
    requestUri: '/api/invoices/401/discount',
    createdAt: '2026-09-18T15:20:00'
  },
  {
    id: 108,
    module: 'INVENTORY',
    moduleLabel: 'Tồn kho & Kiểm kê',
    action: 'INITIAL_STOCK_COUNT',
    actionLabel: 'Chốt số liệu kiểm kê đầu kỳ',
    targetType: 'WAREHOUSE',
    targetId: 1,
    targetCode: 'KHO-HCM-01',
    targetName: 'Kho Tổng Trung Tâm Tân Bình (TP.HCM)',
    actorId: 1,
    actorUsername: 'admin',
    actorFullName: 'Quản Trị Viên Hệ Thống',
    actorRole: 'Quản trị hệ thống (ROLE_ADMIN)',
    oldValue: 'Chưa đối soát',
    newValue: 'Đã khóa sổ kiểm kê kỳ 08/2026',
    deltaFormatted: 'Khóa sổ kiểm toán',
    deltaType: 'neutral',
    reason: 'Chốt khóa số dư thẻ kho và hoàn tất biên bản kiểm kê tháng 8 phục vụ kiểm toán tài chính.',
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    httpMethod: 'POST',
    requestUri: '/api/inventory/reconcile-close',
    createdAt: '2026-08-31T23:59:00'
  }
];

const LOCAL_STORAGE_KEY = 'erp_audit_logs_db_v1';

export function getLocalAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore error
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
  return INITIAL_AUDIT_LOGS;
}

/**
 * Ghi nhận một bản ghi nhật ký thao tác cục bộ (dùng khi thao tác offline hoặc dự phòng fallback)
 */
export function recordLocalAuditLog(entry: Partial<AuditLogItem>): AuditLogItem {
  const currentLogs = getLocalAuditLogs();
  const id = Date.now();
  const moduleMeta = AUDIT_MODULE_OPTIONS.find((m) => m.value === entry.module);

  const newLog: AuditLogItem = {
    id,
    module: entry.module || 'INVENTORY',
    moduleLabel: entry.moduleLabel || moduleMeta?.label || 'Tồn kho & Kiểm kê',
    action: entry.action || 'UPDATE_UNIT_CONVERSION',
    actionLabel: entry.actionLabel || 'Cập nhật hệ số quy đổi',
    targetType: entry.targetType || 'PRODUCT_UNIT',
    targetId: entry.targetId,
    targetCode: entry.targetCode || 'SP-SKU',
    targetName: entry.targetName,
    actorId: entry.actorId || 1,
    actorUsername: entry.actorUsername || 'user',
    actorFullName: entry.actorFullName || 'Người thực hiện',
    actorRole: entry.actorRole || 'Thủ kho',
    actorAvatarUrl: entry.actorAvatarUrl,
    actorAvatarThumbnailUrl: entry.actorAvatarThumbnailUrl,
    oldValue: entry.oldValue || '—',
    newValue: entry.newValue || '—',
    deltaFormatted: entry.deltaFormatted || (entry.oldValue && entry.newValue ? `${entry.oldValue} ➔ ${entry.newValue}` : undefined),
    deltaType: entry.deltaType || 'neutral',
    reason: entry.reason || 'Cập nhật hệ số quy đổi qua giao diện',
    ipAddress: entry.ipAddress || '127.0.0.1',
    userAgent: navigator.userAgent,
    httpMethod: entry.httpMethod || 'PUT',
    requestUri: entry.requestUri || '/api/products/units',
    createdAt: new Date().toISOString()
  };

  const updatedLogs = [newLog, ...currentLogs];
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLogs));
  } catch (err) {
    console.error('Lỗi lưu audit log cục bộ:', err);
  }
  return newLog;
}

/**
 * Tra cứu danh sách nhật ký thao tác hệ thống (S2-04)
 * - Tự động gọi Backend /api/audit-logs nếu có server
 * - Fallback về local dataset phong phú nếu backend chưa bật hoặc rỗng
 */
export async function fetchAuditLogs(
  params: AuditLogFilterParams = {}
): Promise<AuditLogPageResponse> {
  const token = getStoredToken();
  const page = params.page ?? 0;
  const size = params.size ?? 15;

  if (token) {
    try {
      const query = new URLSearchParams();
      if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
      if (params.module && params.module !== 'ALL') query.set('module', params.module);
      if (params.targetType) query.set('targetType', params.targetType);
      if (params.actorId && params.actorId !== 'ALL') query.set('actorId', String(params.actorId));
      if (params.startDate) query.set('startDate', `${params.startDate}T00:00:00`);
      if (params.endDate) query.set('endDate', `${params.endDate}T23:59:59`);
      if (params.action) query.set('action', params.action);
      query.set('page', String(page));
      query.set('size', String(size));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${API_BASE_URL}/api/audit-logs?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        interface BackendAuditLogItem {
          id: number;
          module: AuditModuleKey;
          moduleLabel?: string;
          action?: string;
          targetType?: string;
          targetId?: number;
          targetCode?: string;
          actorId?: number;
          actorUsername?: string;
          actorFullName?: string;
          actorAvatarUrl?: string;
          oldValue?: string;
          newValue?: string;
          reason?: string;
          ipAddress?: string;
          userAgent?: string;
          httpMethod?: string;
          requestUri?: string;
          createdAt: string;
        }

        if (json && Array.isArray(json.content) && json.content.length > 0) {
          const mappedContent: AuditLogItem[] = (json.content as BackendAuditLogItem[]).map((item) => {
            const moduleMeta = AUDIT_MODULE_OPTIONS.find((m) => m.value === item.module);
            return {
              id: item.id,
              module: item.module,
              moduleLabel: item.moduleLabel || moduleMeta?.label || item.module,
              action: item.action || 'MODIFY',
              actionLabel: item.action,
              targetType: item.targetType || 'TARGET',
              targetId: item.targetId,
              targetCode: item.targetCode || `#${item.targetId || item.id}`,
              targetName: item.targetType,
              actorId: item.actorId,
              actorUsername: item.actorUsername || 'user',
              actorFullName: item.actorFullName || item.actorUsername || 'Người dùng',
              actorRole: item.actorUsername?.includes('wh')
                ? 'Kho vận'
                : item.actorUsername?.includes('acc')
                ? 'Kế toán'
                : 'Hệ thống',
              actorAvatarUrl: item.actorAvatarUrl,
              oldValue: item.oldValue || '—',
              newValue: item.newValue || '—',
              deltaFormatted: item.oldValue && item.newValue ? `${item.oldValue} ➔ ${item.newValue}` : undefined,
              deltaType: 'neutral',
              reason: item.reason || 'Cập nhật hệ thống',
              ipAddress: item.ipAddress || '127.0.0.1',
              userAgent: item.userAgent,
              httpMethod: item.httpMethod || 'POST',
              requestUri: item.requestUri || '/api',
              createdAt: item.createdAt
            };
          });

          // Trộn thêm các log cục bộ phát sinh gần đây (nếu có log mock hoặc fallback chưa kịp lên server)
          const localLogs = getLocalAuditLogs().filter((l) => l.id > 1700000000000);
          const combined = [...localLogs.filter((l) => !mappedContent.some((m) => m.id === l.id)), ...mappedContent];

          return {
            content: combined,
            totalElements: (json.totalElements || mappedContent.length) + localLogs.length,
            totalPages: json.totalPages || Math.ceil(mappedContent.length / size),
            page: json.page || page,
            size: json.size || size
          };
        }
      }
    } catch {
      // Backend offline hoặc timeout, chuyển tiếp sang local dataset
    }
  }

  // Lọc từ local dataset
  let logs = getLocalAuditLogs();

  // 1. Lọc theo Phân hệ
  if (params.module && params.module !== 'ALL') {
    logs = logs.filter((log) => log.module === params.module);
  }

  // 2. Lọc theo Người dùng
  if (params.actorId && params.actorId !== 'ALL') {
    logs = logs.filter((log) => log.actorId === params.actorId);
  }
  if (params.actorUsername && params.actorUsername !== 'ALL') {
    logs = logs.filter((log) => log.actorUsername === params.actorUsername);
  }

  // 3. Lọc theo từ khóa (Mã SKU, Mã phiếu, Người sửa, Lý do, Tên đối tượng)
  if (params.keyword && params.keyword.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    logs = logs.filter(
      (log) =>
        log.targetCode.toLowerCase().includes(kw) ||
        (log.targetName && log.targetName.toLowerCase().includes(kw)) ||
        log.actorFullName.toLowerCase().includes(kw) ||
        log.actorUsername.toLowerCase().includes(kw) ||
        log.reason.toLowerCase().includes(kw) ||
        log.action.toLowerCase().includes(kw)
    );
  }

  // 4. Lọc theo khoảng thời gian
  if (params.startDate) {
    logs = logs.filter((log) => log.createdAt >= params.startDate!);
  }
  if (params.endDate) {
    const endISO = `${params.endDate}T23:59:59`;
    logs = logs.filter((log) => log.createdAt <= endISO);
  }

  // Sắp xếp thời gian mới nhất lên đầu
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalElements = logs.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const pagedLogs = logs.slice(page * size, (page + 1) * size);

  return {
    content: pagedLogs,
    page,
    size,
    totalElements,
    totalPages
  };
}

/**
 * Thống kê tổng hợp số liệu Audit Logs phục vụ KPI Cards
 */
export function calculateAuditStats(logs: AuditLogItem[]): AuditStatsSummary {
  const inventoryCount = logs.filter((l) => l.module === 'INVENTORY').length;
  const debtCount = logs.filter((l) => l.module === 'DEBT_LIMIT').length;
  const pricingCount = logs.filter((l) => l.module === 'PRICING').length;
  const invoiceCount = logs.filter((l) => l.module === 'INVOICE').length;
  const actors = new Set(logs.map((l) => l.actorUsername));

  return {
    totalCount: logs.length,
    inventoryCount,
    debtCount,
    pricingCount,
    invoiceCount,
    actorCount: actors.size
  };
}

/**
 * Xuất dữ liệu nhật ký thao tác ra file Excel (.xlsx)
 */
export function exportAuditLogsToExcel(logs: AuditLogItem[], fileName = 'Nhat_Ky_Kiem_Toan_ERP_S2_04') {
  const exportData = logs.map((item, idx) => ({
    'STT': idx + 1,
    'Mã Nhật Ký': `#${item.id}`,
    'Thời Điểm': formatDateTime(item.createdAt),
    'Phân Hệ': item.moduleLabel,
    'Hành Động': item.actionLabel || item.action,
    'Mã Đối Tượng (SKU / Phiếu / KH)': item.targetCode,
    'Tên Đối Tượng': item.targetName || '—',
    'Người Thực Hiện': `${item.actorFullName} (@${item.actorUsername})`,
    'Chức Danh / Bộ Phận': item.actorRole || '—',
    'Giá Trị Trước (Cũ)': item.oldValue,
    'Giá Trị Sau (Mới)': item.newValue,
    'Biến Động (Chênh Lệch)': item.deltaFormatted || '—',
    'Lý Do & Căn Cứ Điều Chỉnh': item.reason,
    'Địa Chỉ IP': item.ipAddress || '—',
    'Giao Thức & URI': `${item.httpMethod || 'POST'} ${item.requestUri || ''}`,
    'Tính Bất Biến': 'Bất biến (Chỉ đọc - Cấm sửa/xóa)'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Nhat_Ky_Audit_Log');

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 30 },
    { wch: 26 },
    { wch: 24 },
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
    { wch: 45 },
    { wch: 16 },
    { wch: 28 },
    { wch: 25 }
  ];

  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}
