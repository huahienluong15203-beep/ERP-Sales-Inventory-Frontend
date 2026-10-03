import type { MenuItem, RoleName } from '../types/user';

/**
 * Danh mục toàn bộ các phân hệ và mục chức năng của hệ thống ERP Sales & Inventory (Sprint 1)
 * Tuân thủ phạm vi Sprint 1: Bàn làm việc, Quản lý tài khoản (Admin), Hồ sơ cá nhân.
 */
export const ALL_SYSTEM_MENUS: (MenuItem & { allowedRoles: RoleName[] })[] = [
  // 1. Dashboard chung
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
      'ROLE_ACCOUNTANT',
      'ROLE_CUSTOMER'
    ]
  },

  // 2. Quản lý tài khoản (Chỉ Quản trị viên hệ thống - Sprint 1 S1-08 / S1-09 / S1-10)
  {
    title: 'Quản lý tài khoản',
    path: '/users',
    icon: 'Users',
    epic: 'Hệ Thống & Tài Khoản',
    description: 'Quản lý danh sách nhân sự, phân quyền và khóa tài khoản',
    allowedRoles: ['ROLE_ADMIN']
  },

  // 3. Quản lý hồ sơ đại lý (Sprint 3: S3-03 / SCRUM-85 / EP-03 - Kế toán công nợ & Quản lý KD)
  {
    title: 'Hồ sơ đại lý',
    path: '/customers',
    icon: 'Building2',
    epic: 'Đại lý & Hạn mức nợ',
    description: 'Quản lý danh sách khách hàng chuẩn hóa, bảng giá và trạng thái giao dịch',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  // 4. Quản lý danh mục sản phẩm (Sprint 2: S2-05)
  {
    title: 'Danh mục sản phẩm',
    path: '/products',
    icon: 'Package',
    epic: 'Sản phẩm & Tồn kho',
    description: 'Quản lý chuẩn hóa danh mục sản phẩm, mã SKU và bảo mật giá vốn',
    allowedRoles: [
      'ROLE_SALES_MANAGER',
      'ROLE_ADMIN',
      'ROLE_SALES_REP',
      'ROLE_WAREHOUSE',
      'ROLE_WH_MANAGER',
      'ROLE_ACCOUNTANT'
    ]
  },

  // 5. Bảng giá sản phẩm (S2-10 / SCRUM-55: EP-02 Sản phẩm & Bảng giá)
  {
    title: 'Bảng giá sản phẩm',
    path: '/pricing',
    icon: 'Tags',
    epic: 'Sản phẩm & Bảng giá',
    description: 'Khai báo bảng giá theo nhóm khách hàng, thời gian hiệu lực và giá sàn',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP', 'ROLE_ACCOUNTANT']
  },

  // 6. Lịch sử thay đổi giá (Sprint 3: S3-02 / SCRUM-13 / EP-02 - Quản lý kinh doanh & Admin)
  {
    title: 'Lịch sử thay đổi giá',
    path: '/pricing/history',
    icon: 'History',
    epic: 'Sản phẩm & Bảng giá',
    description: 'Xem lịch sử thay đổi giá cũ - mới, người sửa và căn cứ giải thích cho đại lý',
    allowedRoles: ['ROLE_SALES_MANAGER', 'ROLE_ADMIN', 'ROLE_SALES_REP', 'ROLE_ACCOUNTANT']
  },

  // 3. Hồ sơ cá nhân
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
  },

  // 4. Quản lý nhóm hàng nhiều cấp (EP-02: Dành cho Quản lý kinh doanh & Admin)
  {
    title: 'Quản lý nhóm hàng',
    path: '/categories',
    icon: 'Boxes',
    epic: 'Sản phẩm & Bảng giá',
    description: 'Cấu trúc nhóm hàng ≥ 3 cấp & xem doanh số theo ngành hàng',
    allowedRoles: ['ROLE_SALES_MANAGER', 'ROLE_ADMIN']
  }
];

/**
 * Hàm lọc danh sách menu theo vai trò người dùng (Tiêu chuẩn S1-06)
 * "Mục menu không thuộc quyền thì không hiển thị"
 * Hỗ trợ một hoặc nhiều vai trò cùng lúc
 */
export function getAuthorizedMenus(roles: RoleName | RoleName[]): MenuItem[] {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return ALL_SYSTEM_MENUS.filter((item) =>
    item.allowedRoles.some((r) => roleList.includes(r))
  ).map((item) => ({
    title: item.title,
    path: item.path,
    icon: item.icon,
    epic: item.epic,
    description: item.description,
    badge: item.badge
  }));
}

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

  const targetMenu = ALL_SYSTEM_MENUS.find((item) => {
    const itemClean = item.path.replace(/\/+$/, '');
    return itemClean === cleanPath || cleanPath.startsWith(itemClean + '/');
  });
  return targetMenu ? targetMenu.allowedRoles : [];
}
