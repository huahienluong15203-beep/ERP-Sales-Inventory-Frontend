import type { MenuItem, RoleName } from '../types/user';

/**
 * Danh mục toàn bộ các phân hệ và mục chức năng của hệ thống ERP Sales & Inventory
 * Được phân chia theo 9 Epics (EP-01 đến EP-09) và gán quyền chặt chẽ cho 7 vai trò
 */
export const ALL_SYSTEM_MENUS: (MenuItem & { allowedRoles: RoleName[] })[] = [
  // 1. Dashboard chung
  {
    title: 'Bàn làm việc',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    epic: 'EP-09',
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

  // 2. EP-01 Tài khoản & Phân quyền
  {
    title: 'Quản lý tài khoản',
    path: '/users',
    icon: 'Users',
    epic: 'EP-01',
    description: 'Quản lý danh sách nhân sự và tài khoản hệ thống',
    allowedRoles: ['ROLE_ADMIN']
  },
  {
    title: 'Phân quyền hệ thống',
    path: '/roles',
    icon: 'ShieldCheck',
    epic: 'EP-01',
    description: 'Cấu hình ma trận phân quyền 7 vai trò (RBAC)',
    allowedRoles: ['ROLE_ADMIN']
  },

  // 3. EP-02 Sản phẩm & Bảng giá
  {
    title: 'Danh mục sản phẩm',
    path: '/products',
    icon: 'Package',
    epic: 'EP-02',
    description: 'Tra cứu 5.000 SKU sản phẩm và đơn vị quy đổi',
    allowedRoles: [
      'ROLE_ADMIN',
      'ROLE_SALES_MANAGER',
      'ROLE_SALES_REP',
      'ROLE_WH_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_CUSTOMER'
    ]
  },
  {
    title: 'Bảng giá & Chiết khấu',
    path: '/price-books',
    icon: 'Tags',
    epic: 'EP-02',
    description: 'Chính sách giá bán buôn và chiết khấu bậc thang',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_ACCOUNTANT']
  },

  // 4. EP-03 Đại lý & Hạn mức nợ
  {
    title: 'Danh sách đại lý',
    path: '/customers',
    icon: 'Building2',
    epic: 'EP-03',
    description: 'Hồ sơ đại lý phân phối B2B và kênh bán hàng',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP', 'ROLE_ACCOUNTANT']
  },
  {
    title: 'Hạn mức công nợ',
    path: '/debt-limits',
    icon: 'CreditCard',
    epic: 'EP-03',
    description: 'Cấu hình và kiểm soát hạn mức tín dụng theo đại lý',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER', 'ROLE_ACCOUNTANT']
  },

  // 5. EP-04 Đặt hàng & Duyệt ngoại lệ
  {
    title: 'Tạo đơn đặt hàng',
    path: '/orders/create',
    icon: 'ShoppingCart',
    epic: 'EP-04',
    description: 'Nhập đơn hàng nhanh, hỗ trợ tối ưu trên mobile 360px',
    badge: '360px',
    allowedRoles: ['ROLE_SALES_REP', 'ROLE_CUSTOMER', 'ROLE_SALES_MANAGER', 'ROLE_ADMIN']
  },
  {
    title: 'Danh sách đơn hàng',
    path: '/orders',
    icon: 'ClipboardList',
    epic: 'EP-04',
    description: 'Theo dõi tiến trình xử lý đơn hàng toàn trình',
    allowedRoles: [
      'ROLE_ADMIN',
      'ROLE_SALES_MANAGER',
      'ROLE_SALES_REP',
      'ROLE_ACCOUNTANT',
      'ROLE_CUSTOMER'
    ]
  },
  {
    title: 'Duyệt đơn ngoại lệ',
    path: '/orders/approvals',
    icon: 'CheckSquare',
    epic: 'EP-04',
    description: 'Phê duyệt đơn hàng vượt hạn mức công nợ hoặc nợ quá hạn',
    badge: 'Quan trọng',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER']
  },

  // 6. EP-05 Kho & Tồn theo lô/hạn
  {
    title: 'Tra cứu tồn kho',
    path: '/inventory',
    icon: 'Boxes',
    epic: 'EP-05',
    description: 'Theo dõi Tồn thực tế vs Tồn khả dụng theo từng kho',
    allowedRoles: [
      'ROLE_ADMIN',
      'ROLE_WH_MANAGER',
      'ROLE_WAREHOUSE',
      'ROLE_SALES_REP',
      'ROLE_SALES_MANAGER'
    ]
  },
  {
    title: 'Quản lý lô & Hạn dùng',
    path: '/batches',
    icon: 'CalendarClock',
    epic: 'EP-05',
    description: 'Quản lý lô sản xuất, cảnh báo cận hạn dưới 30 ngày',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_WH_MANAGER', 'ROLE_WAREHOUSE']
  },
  {
    title: 'Danh mục kho hàng',
    path: '/warehouses',
    icon: 'Warehouse',
    epic: 'EP-05',
    description: 'Quản lý thông tin cụm kho, sức chứa và vị trí lưu trữ',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_WH_MANAGER']
  },

  // 7. EP-06 Xuất kho FEFO & Giao hàng
  {
    title: 'Lập phiếu xuất kho',
    path: '/shipping/create',
    icon: 'Truck',
    epic: 'EP-06',
    description: 'Tự động gợi ý xuất lô theo nguyên tắc FEFO',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_WH_MANAGER', 'ROLE_WAREHOUSE']
  },
  {
    title: 'Lệnh giao hàng',
    path: '/shipping',
    icon: 'Send',
    epic: 'EP-06',
    description: 'Theo dõi quá trình vận chuyển và biên bản bàn giao',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_WH_MANAGER', 'ROLE_WAREHOUSE', 'ROLE_SALES_REP']
  },

  // 8. EP-07 Hoá đơn & Công nợ
  {
    title: 'Hoá đơn tài chính',
    path: '/invoices',
    icon: 'Receipt',
    epic: 'EP-07',
    description: 'Lập và theo dõi hoá đơn VAT theo đơn xuất',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER']
  },
  {
    title: 'Thu tiền & Thanh toán',
    path: '/payments',
    icon: 'BadgeDollarSign',
    epic: 'EP-07',
    description: 'Ghi nhận chứng từ thanh toán và cấn trừ công nợ',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT']
  },
  {
    title: 'Sổ theo dõi công nợ',
    path: '/debts',
    icon: 'BookOpenCheck',
    epic: 'EP-07',
    description: 'Đối soát công nợ đại lý chi tiết theo hạn nợ',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER', 'ROLE_CUSTOMER']
  },

  // 9. EP-08 Trả hàng & Điều chỉnh kho (SoD)
  {
    title: 'Yêu cầu trả hàng',
    path: '/returns',
    icon: 'RotateCcw',
    epic: 'EP-08',
    description: 'Tiếp nhận hàng trả do lỗi kỹ thuật hoặc đổi trả',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_REP', 'ROLE_WH_MANAGER', 'ROLE_ACCOUNTANT']
  },
  {
    title: 'Điều chỉnh tồn kho',
    path: '/adjustments',
    icon: 'SlidersHorizontal',
    epic: 'EP-08',
    description: 'Cân đối kho sau kiểm kê (Tuân thủ SoD: lập != duyệt)',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_WH_MANAGER']
  },

  // 10. EP-09 Báo cáo & Dashboard
  {
    title: 'Báo cáo doanh thu & Lãi',
    path: '/reports/sales',
    icon: 'TrendingUp',
    epic: 'EP-09',
    description: 'Bảo mật: Doanh số & Biên lãi gộp (Chỉ Sales Manager & Admin)',
    badge: 'Bảo mật',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER']
  },
  {
    title: 'Báo cáo xuất nhập tồn',
    path: '/reports/inventory',
    icon: 'BarChart3',
    epic: 'EP-09',
    description: 'Biến động thẻ kho chi tiết theo kỳ báo cáo',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_WH_MANAGER', 'ROLE_ACCOUNTANT']
  },
  {
    title: 'Báo cáo tuổi nợ',
    path: '/reports/debts',
    icon: 'PieChart',
    epic: 'EP-09',
    description: 'Phân tích tuổi nợ đại lý và nợ khó đòi',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER']
  }
];

/**
 * Hàm lọc danh sách menu theo vai trò người dùng (Tiêu chuẩn S1-06)
 * "Mục menu không thuộc quyền thì không hiển thị"
 */
export function getAuthorizedMenus(role: RoleName): MenuItem[] {
  return ALL_SYSTEM_MENUS.filter((item) => item.allowedRoles.includes(role)).map(
    ({ allowedRoles: _allowedRoles, ...menuItem }) => menuItem
  );
}

/**
 * Kiểm tra xem một vai trò có quyền truy cập vào một đường dẫn hay không
 */
export function checkPathPermission(path: string, role: RoleName): boolean {
  // Chuẩn hóa path (bỏ query param và trailing slash)
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  
  // Các trang công khai/mặc định mà mọi vai trò đăng nhập đều vào được
  if (cleanPath === '/' || cleanPath === '/dashboard' || cleanPath === '/profile') {
    return true;
  }

  // Tìm menu tương ứng
  const targetMenu = ALL_SYSTEM_MENUS.find((item) => {
    const itemClean = item.path.replace(/\/+$/, '');
    return itemClean === cleanPath || cleanPath.startsWith(itemClean + '/');
  });

  // Nếu không tìm thấy trong danh mục quyền hạn, mặc định cho phép hoặc cần 404
  if (!targetMenu) {
    return false;
  }

  return targetMenu.allowedRoles.includes(role);
}

/**
 * Lấy danh sách các vai trò được phép truy cập vào một đường dẫn
 */
export function getAllowedRolesForPath(path: string): RoleName[] {
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  const targetMenu = ALL_SYSTEM_MENUS.find((item) => {
    const itemClean = item.path.replace(/\/+$/, '');
    return itemClean === cleanPath || cleanPath.startsWith(itemClean + '/');
  });
  return targetMenu ? targetMenu.allowedRoles : [];
}
