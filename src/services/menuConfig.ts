import type { MenuItem, RoleName } from '../types/user';

/**
 * Danh mục toàn bộ các phân hệ và mục chức năng của hệ thống ERP Sales & Inventory (Sprint 1)
 * Tuân thủ phạm vi Sprint 1: Bàn làm việc, Quản lý tài khoản (Admin), Hồ sơ cá nhân.
 */
export const ALL_SYSTEM_MENUS: (MenuItem & { allowedRoles: RoleName[] })[] = [
  // Sắp theo nhóm chức năng: mỗi "group" là 1 tiêu đề trên Sidebar
  {
    title: 'Bàn làm việc',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    epic: 'Hệ Thống & Tài Khoản',
    description: 'Tổng quan chỉ số hoạt động theo vai trò',
    allowedRoles: [
      'ROLE_ADMIN',
      'ROLE_SALES_REP',
      'ROLE_SALES_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ACCOUNTANT'
    ]
  },

  {
    title: 'Cổng đặt hàng đại lý',
    path: '/portal',
    group: 'Bán hàng',
    icon: 'ShoppingBag',
    epic: 'Đặt hàng & Duyệt ngoại lệ',
    description: 'Cổng đại lý tự đặt hàng trực tuyến B2B, quản lý công nợ',
    allowedRoles: ['ROLE_CUSTOMER']
  },

  {
    title: 'Hồ sơ đại lý',
    path: '/customers',
    group: 'Bán hàng',
    icon: 'Building2',
    epic: 'Đại lý & Hạn mức nợ',
    description: '',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  {
    title: 'Danh sách đơn hàng',
    path: '/orders',
    group: 'Bán hàng',
    icon: 'ShoppingCart',
    epic: 'Đặt hàng & Duyệt ngoại lệ',
    description: '',
    allowedRoles: ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_WAREHOUSE', 'ROLE_WH_MANAGER']
  },

  {
    title: 'Tạo đơn mới',
    path: '/orders/create',
    group: 'Bán hàng',
    icon: 'ShoppingBag',
    epic: 'Đặt hàng & Duyệt ngoại lệ',
    description: '',
    allowedRoles: ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN']
  },

  {
    title: 'Duyệt giảm trừ công nợ',
    path: '/payments/adjustments',
    group: 'Bán hàng',
    icon: 'FileCheck',
    epic: 'Đại lý & Hạn mức nợ',
    description: 'Duyệt chứng từ giảm trừ công nợ khi trả hàng theo đúng giá bán hoá đơn gốc',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN']
  },

  {
    title: 'Hóa đơn bán hàng',
    path: '/invoices',
    group: 'Bán hàng',
    icon: 'Receipt',
    epic: 'Bán hàng & Hóa đơn',
    description: 'Phát hành hoá đơn từ phiếu đã giao (POD), gộp nhiều phiếu, xuất mẫu in A4',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  {
    title: 'Trả hàng đại lý',
    path: '/sales-returns',
    group: 'Bán hàng',
    icon: 'RotateCcw',
    epic: 'Bán hàng & Kho vận',
    description: 'Lập phiếu hoàn hàng từ đại lý theo hoá đơn, nhập kho theo lô & kiểm duyệt nhập kho (S8-01)',
    allowedRoles: [
      'ROLE_SALES_REP',
      'ROLE_SALES_MANAGER',
      'ROLE_ADMIN',
      'ROLE_WH_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_ACCOUNTANT'
    ]
  },

  {
    title: 'Đối chiếu thu tiền tuyến',
    path: '/payments/reconciliation',
    group: 'Bán hàng',
    icon: 'Receipt',
    epic: 'Đại lý & Hạn mức nợ',
    description: 'Đối chiếu tiền đã thu trên tuyến với tiền đã nộp về công ty mà không tranh cãi ',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  {
    title: 'Sổ công nợ & Tuổi nợ',
    path: '/debts/ledger',
    group: 'Bán hàng',
    icon: 'Table',
    epic: 'Đại lý & Hạn mức nợ',
    description: 'Sổ công nợ theo đại lý với phân tích tuổi nợ 0-30, 31-60, 61-90, trên 90 ngày',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  {
    title: 'Sổ chi tiết công nợ',
    path: '/debts/statement',
    group: 'Bán hàng',
    icon: 'BookOpenCheck',
    epic: 'Đại lý & Hạn mức nợ',
    description: '',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP', 'ROLE_CUSTOMER']
  },

  {
    title: 'Báo cáo nợ quá hạn',
    path: '/reports/overdue-debts',
    group: 'Bán hàng',
    icon: 'AlertTriangle',
    epic: 'Đại lý & Hạn mức nợ',
    description: '',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  {
    title: 'Đối chiếu công nợ',
    path: '/debts/reconciliation',
    group: 'Bán hàng',
    icon: 'FileText',
    epic: 'Đại lý & Hạn mức nợ',
    description: 'Biên bản đối chiếu công nợ định kỳ với đại lý, chốt số dư và xuất mẫu A4',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_CUSTOMER']
  },

  {
    title: 'Chỉ tiêu doanh số ',
    path: '/kpi/targets',
    group: 'Bán hàng',
    icon: 'TrendingUp',
    epic: 'Bán hàng & Doanh số',
    description: '',
    allowedRoles: ['ROLE_SALES_MANAGER', 'ROLE_SALES_REP', 'ROLE_ADMIN']
  },

  {
    title: 'Báo cáo doanh số',
    path: '/reports/sales',
    group: 'Bán hàng',
    icon: 'BarChart3',
    epic: 'Bán hàng & Doanh số',
    description: '',
    allowedRoles: ['ROLE_SALES_MANAGER', 'ROLE_ADMIN']
  },

  {
    title: 'Danh mục sản phẩm',
    path: '/products',
    group: 'Sản phẩm & Kho',
    icon: 'Package',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: [
      'ROLE_SALES_MANAGER',
      'ROLE_ADMIN',
      'ROLE_SALES_REP',
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ACCOUNTANT'
    ]
  },

  {
    title: 'Quản lý nhóm hàng',
    path: '/categories',
    group: 'Sản phẩm & Kho',
    icon: 'Boxes',
    epic: 'Sản phẩm & Bảng giá',
    description: 'Cấu trúc nhóm hàng ≥ 3 cấp & xem doanh số theo ngành hàng',
    allowedRoles: ['ROLE_SALES_MANAGER', 'ROLE_ADMIN']
  },

  {
    title: 'Danh mục nhà cung cấp',
    path: '/suppliers',
    group: 'Sản phẩm & Kho',
    icon: 'Truck',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: [
      'ROLE_ADMIN',
      'ROLE_WH_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_SALES_MANAGER',
      'ROLE_ACCOUNTANT'
    ]
  },

  {
    title: 'Phiếu nhập kho',
    path: '/inventory/receipts',
    group: 'Sản phẩm & Kho',
    icon: 'ClipboardList',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Phiếu chuyển kho',
    path: '/inventory/transfers',
    group: 'Sản phẩm & Kho',
    icon: 'ArrowLeftRight',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Quản lý tồn kho',
    path: '/inventory/ledger',
    group: 'Sản phẩm & Kho',
    icon: 'Warehouse',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER']
  },

  {
    title: 'Thẻ kho chi tiết',
    path: '/inventory/stock-card',
    group: 'Sản phẩm & Kho',
    icon: 'BookOpenCheck',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER']
  },

  {
    title: 'Kiểm kê kho',
    path: '/inventory/stocktakes',
    group: 'Sản phẩm & Kho',
    icon: 'CheckSquare',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Điều chỉnh tồn kho',
    path: '/inventory/stock-adjustments',
    group: 'Sản phẩm & Kho',
    icon: 'FileText',
    epic: 'Sản phẩm & Tồn kho',
    description: 'Xử lý hàng hỏng, mất hoặc hết hạn huỷ bỏ có quy trình 2 bước phê duyệt minh bạch (S8-03)',
    allowedRoles: ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Phiếu soạn hàng',
    path: '/inventory/picking-lists',
    group: 'Sản phẩm & Kho',
    icon: 'ClipboardCheck',
    epic: 'Sản phẩm & Tồn kho',
    description: '',
    allowedRoles: ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER']
  },

  {
    title: 'Chuyến giao hàng',
    path: '/inventory/delivery-trips',
    group: 'Sản phẩm & Kho',
    icon: 'Truck',
    epic: 'Sản phẩm & Tồn kho',
    description: 'Phân tuyến giao hàng theo khu vực, gán tài xế & phương tiện, in danh sách điểm giao',
    allowedRoles: ['ROLE_WH_MANAGER', 'ROLE_WAREHOUSE', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER']
  },

  {
    title: 'Danh mục kho & vị trí',
    path: '/inventory/warehouses',
    group: 'Sản phẩm & Kho',
    icon: 'Layers',
    epic: 'Sản phẩm & Tồn kho',
    description: 'Quản lý danh sách kho hàng, phân khu (Zone), kệ (Rack), tầng (Shelf) và ô chứa (Bin)',
    allowedRoles: [
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ADMIN',
      'ROLE_ACCOUNTANT',
      'ROLE_SALES_MANAGER'
    ]
  },

  {
    title: 'Quản lý lô hàng',
    path: '/inventory/lots',
    group: 'Sản phẩm & Kho',
    icon: 'Boxes',
    epic: 'Sản phẩm & Tồn kho',
    description: 'Theo dõi lô sản xuất, hạn sử dụng, cảnh báo cận date và quy tắc xuất FEFO',
    allowedRoles: [
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ADMIN',
      'ROLE_ACCOUNTANT',
      'ROLE_SALES_MANAGER'
    ]
  },

  {
    title: 'Luân chuyển kho & Tuổi',
    path: '/inventory/aging',
    group: 'Sản phẩm & Kho',
    icon: 'Clock',
    epic: 'Sản phẩm & Tồn kho',
    description: 'Báo cáo vòng quay hàng tồn, số ngày lưu kho bình quân và cảnh báo hàng chậm luân chuyển',
    allowedRoles: [
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ADMIN',
      'ROLE_ACCOUNTANT',
      'ROLE_SALES_MANAGER'
    ]
  },

  {
    title: 'Hàng đang đi đường',
    path: '/inventory/in-transit',
    group: 'Sản phẩm & Kho',
    icon: 'Truck',
    epic: 'Sản phẩm & Tồn kho',
    description: 'Theo dõi hàng đã xuất kho nhưng đang trên đường giao, cảnh báo giao trễ',
    allowedRoles: [
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ADMIN',
      'ROLE_ACCOUNTANT',
      'ROLE_SALES_MANAGER'
    ]
  },

  {
    title: 'Bảng giá sản phẩm',
    path: '/pricing',
    group: 'Giá & Chiết khấu',
    icon: 'Tags',
    epic: 'Sản phẩm & Bảng giá',
    description: '',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Chiết khấu sản lượng',
    path: '/pricing/discounts',
    group: 'Giá & Chiết khấu',
    icon: 'Percent',
    epic: 'Sản phẩm & Bảng giá',
    description: '',
    allowedRoles: ['ROLE_SALES_MANAGER', 'ROLE_ADMIN', 'ROLE_SALES_REP', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Quản lý tài khoản',
    path: '/users',
    group: 'Hệ thống',
    icon: 'Users',
    epic: 'Hệ Thống & Tài Khoản',
    description: '',
    allowedRoles: ['ROLE_ADMIN']
  },

  {
    title: 'Nhật ký hệ thống',
    path: '/logs',
    group: 'Hệ thống',
    icon: 'ShieldCheck',
    epic: 'Hệ Thống & Tài Khoản',
    description: 'Nhật ký thao tác và lịch sử thay đổi giá trong một trang, lọc theo loại nhật ký',
    // Hợp quyền của 2 tab; trong trang chỉ hiện tab đúng quyền
    // (Nhật ký thao tác S2-04: Admin, Kế toán, QL kho, QL KD; Lịch sử giá S3-02: Admin, Kế toán, QL KD, NV KD)
    allowedRoles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_WH_MANAGER', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  {
    title: 'Hồ sơ cá nhân',
    path: '/profile',
    icon: 'User',
    epic: 'Hệ Thống & Tài Khoản',
    description: 'Thông tin nhân sự, vị trí công tác và đổi mật khẩu',
    allowedRoles: [
      'ROLE_ADMIN',
      'ROLE_SALES_REP',
      'ROLE_SALES_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ACCOUNTANT',
      'ROLE_CUSTOMER'
    ]
  }
];

/**
 * Hàm lọc danh sách menu theo vai trò người dùng (Tiêu chuẩn S1-06)
 * "Mục menu không thuộc quyền thì không hiển thị"
 * Hỗ trợ một hoặc nhiều vai trò cùng lúc
 * Luôn bảo đảm "Hồ sơ cá nhân" ở vị trí cuối cùng trong danh sách
 */
export function getAuthorizedMenus(roles: RoleName | RoleName[]): MenuItem[] {
  const roleList = Array.isArray(roles) ? roles : [roles];
  const list = ALL_SYSTEM_MENUS.filter((item) =>
    item.allowedRoles.some((r) => roleList.includes(r))
  ).map((item) => ({
    title: item.title,
    path: item.path,
    icon: item.icon,
    epic: item.epic,
    group: item.group,
    description: item.description,
    badge: item.badge
  }));

  // Đảm bảo "Hồ sơ cá nhân" (/profile) luôn nằm ở vị trí cuối cùng của Sidebar
  const nonProfile = list.filter((m) => m.path !== '/profile');
  const profileItem = list.find((m) => m.path === '/profile');
  if (profileItem) {
    return [...nonProfile, profileItem];
  }
  return nonProfile;
}

/**
 * Danh sách phân quyền chi tiết cho các trang con / tác vụ đặc thù (khớp với AppRoutes.tsx)
 */
export const SPECIFIC_SUBROUTE_ROLES: Record<string, RoleName[]> = {
  '/sales-returns': ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT'],
  '/sales-returns/create': ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN', 'ROLE_ACCOUNTANT'],
  '/customers/create': ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER'],
  '/customers/transfer': ['ROLE_ADMIN', 'ROLE_SALES_MANAGER'],
  '/products/import': ['ROLE_SALES_MANAGER', 'ROLE_ADMIN'],
  '/pricing/create': ['ROLE_ADMIN', 'ROLE_SALES_MANAGER'],
  '/price-lists/create': ['ROLE_ADMIN', 'ROLE_SALES_MANAGER'],
  '/orders/create': ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN'],
  '/invoices/create': ['ROLE_ACCOUNTANT', 'ROLE_ADMIN'],
  '/payments/adjustments': ['ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN'],
  '/inventory/receipts/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/goods-receipts/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/transfers/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/transfers/create/products': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/stocktakes/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/stock-takes/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/stock-adjustments/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/lots/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/picking-lists/create': ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'],
  '/inventory/delivery-trips/create': ['ROLE_WH_MANAGER', 'ROLE_WAREHOUSE', 'ROLE_ADMIN'],
  '/reports/sales': ['ROLE_SALES_MANAGER', 'ROLE_ADMIN'],
  '/categories': ['ROLE_SALES_MANAGER', 'ROLE_ADMIN'],
};

/**
 * Kiểm tra xem người dùng (với 1 hoặc nhiều vai trò) có quyền truy cập vào một đường dẫn hay không
 */
export function checkPathPermission(path: string, roles: RoleName | RoleName[]): boolean {
  const roleList = Array.isArray(roles) ? roles : [roles];
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === '/' || cleanPath === '/dashboard' || cleanPath === '/profile') {
    return true;
  }

  if (
    cleanPath === '/admin/users' ||
    cleanPath === '/users' ||
    cleanPath.startsWith('/admin/users/') ||
    cleanPath.startsWith('/users/')
  ) {
    return roleList.includes('ROLE_ADMIN');
  }

  // Tuyến đường chỉnh sửa bảng giá
  if (/^\/(pricing|price-lists)\/[^/]+\/edit$/.test(cleanPath)) {
    return roleList.some((r) => ['ROLE_ADMIN', 'ROLE_SALES_MANAGER'].includes(r));
  }

  // Kiểm tra trước danh sách tuyến con đặc thù
  if (SPECIFIC_SUBROUTE_ROLES[cleanPath]) {
    return SPECIFIC_SUBROUTE_ROLES[cleanPath].some((r) => roleList.includes(r));
  }

  const targetMenu = ALL_SYSTEM_MENUS.find((item) => {
    const itemClean = item.path.replace(/\/+$/, '');
    return itemClean === cleanPath || cleanPath.startsWith(itemClean + '/');
  });

  if (!targetMenu) {
    return false;
  }

  return targetMenu.allowedRoles.some((r) => roleList.includes(r));
}

/**
 * Lấy danh sách các vai trò được phép truy cập vào một đường dẫn
 */
export function getAllowedRolesForPath(path: string): RoleName[] {
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === '/admin/users' || cleanPath.startsWith('/admin/users/')) {
    return ['ROLE_ADMIN'];
  }

  if (/^\/(pricing|price-lists)\/[^/]+\/edit$/.test(cleanPath)) {
    return ['ROLE_ADMIN', 'ROLE_SALES_MANAGER'];
  }

  if (SPECIFIC_SUBROUTE_ROLES[cleanPath]) {
    return SPECIFIC_SUBROUTE_ROLES[cleanPath];
  }

  const targetMenu = ALL_SYSTEM_MENUS.find((item) => {
    const itemClean = item.path.replace(/\/+$/, '');
    return itemClean === cleanPath || cleanPath.startsWith(itemClean + '/');
  });
  return targetMenu ? targetMenu.allowedRoles : [];
}
