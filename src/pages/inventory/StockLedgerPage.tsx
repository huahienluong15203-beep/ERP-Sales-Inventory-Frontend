import React from 'react';
import { StockLedgerThreeColumnsTab } from '../../components/inventory/StockLedgerThreeColumnsTab';

/**
 * Trang Quản lý tồn kho (S5-05: Sổ tồn kho 3 cột)
 * - Tách bạch 3 cột: Tồn thực tế, Đang giữ chỗ, Tồn khả dụng
 * - Bộ lọc theo Kho, Nhóm hàng, Trạng thái tồn & Tìm kiếm
 * - Tinh gọn, dữ liệu thuần túy, phong cách đồng bộ hệ thống
 */
export const StockLedgerPage: React.FC = () => {
  return (
    <div className="pb-8 antialiased">
      <StockLedgerThreeColumnsTab />
    </div>
  );
};
