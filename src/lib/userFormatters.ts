/**
 * Chuyển đổi mã đăng nhập / username hệ thống sang Họ và tên đầy đủ chuẩn hóa
 * Dùng cho các chứng từ, biên bản in ấn kế toán & kho vận (phiếu nhập kho, biên bản kiểm kê, phiếu xuất)
 */
export const USER_FULL_NAMES: Record<string, string> = {
  wh_staff: 'Nguyễn Văn Thủ Kho',
  wh_manager: 'Hoàng Quản Lý Kho',
  accountant: 'Phạm Thị Kế Toán',
  sales_rep: 'Lê Văn Bán Hàng',
  sales_manager: 'Trần Quản Lý Kinh Doanh',
  admin: 'Quản Trị Viên Hệ Thống',
  tran_minh: 'Trần Minh',
  'tran.minh': 'Trần Đức Minh',
  customer_agent: 'Đại Lý Minh Phát (B2B)',
};

export const getUserFullName = (username?: string | null, fallback = 'Nguyễn Văn Thủ Kho'): string => {
  if (!username || username.trim() === '') return fallback;
  const clean = username.trim().toLowerCase();
  return USER_FULL_NAMES[clean] || username;
};
