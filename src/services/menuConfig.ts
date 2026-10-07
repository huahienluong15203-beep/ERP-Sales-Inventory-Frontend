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
      'ROLE_ACCOUNTANT',
      'ROLE_CUSTOMER'
    ]
  },

  {
    title: 'Hồ sơ đại lý',
    path: '/customers',
    group: 'Bán hàng',
    icon: 'Building2',
    epic: 'Đại lý & Hạn mức nợ',
    description: 'Quản lý danh sách khách hàng chuẩn hóa, bảng giá và trạng thái giao dịch',
    allowedRoles: ['ROLE_ACCOUNTANT', 'ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },

  {
    title: 'Đơn hàng đại lý',
    path: '/orders/create',
    group: 'Bán hàng',
    icon: 'ShoppingCart',
    epic: 'Đặt hàng & Duyệt ngoại lệ',
    description: 'Lên đơn nhanh tại điểm bán, tự động áp giá & chiết khấu sản lượng',
    // Kế toán không tạo đơn (Backend chặn) -> không hiện menu để tránh bị văng ra màn đăng nhập
    allowedRoles: ['ROLE_SALES_REP', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN']
  },

  {
    title: 'Danh mục sản phẩm',
    path: '/products',
    group: 'Sản phẩm & Kho',
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
    description: 'Quản lý nguồn hàng và đối tác cung ứng, gắn vào phiếu nhập kho để truy nguyên lô lỗi',
    allowedRoles: [
      'ROLE_ADMIN',
      'ROLE_WH_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_SALES_MANAGER',
      'ROLE_ACCOUNTANT'
    ]
  },

  {
    title: 'Bảng giá sản phẩm',
    path: '/pricing',
    group: 'Giá & Chiết khấu',
    icon: 'Tags',
    epic: 'Sản phẩm & Bảng giá',
    description: 'Khai báo bảng giá theo nhóm khách hàng, thời gian hiệu lực và giá sàn',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Chiết khấu sản lượng',
    path: '/pricing/discounts',
    group: 'Giá & Chiết khấu',
    icon: 'Percent',
    epic: 'Sản phẩm & Bảng giá',
    description: 'Khai báo bậc chiết khấu theo số lượng SKU/nhóm hàng và quy tắc có lợi nhất cho khách',
    allowedRoles: ['ROLE_SALES_MANAGER', 'ROLE_ADMIN', 'ROLE_SALES_REP', 'ROLE_ACCOUNTANT']
  },

  {
    title: 'Quản lý tài khoản',
    path: '/users',
    group: 'Hệ thống',
    icon: 'Users',
    epic: 'Hệ Thống & Tài Khoản',
    description: 'Quản lý danh sách nhân sự, phân quyền và khóa tài khoản',
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
