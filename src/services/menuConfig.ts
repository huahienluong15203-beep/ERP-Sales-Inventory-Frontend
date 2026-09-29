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
  ).map(({ allowedRoles: _allowedRoles, ...menuItem }) => menuItem);
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
