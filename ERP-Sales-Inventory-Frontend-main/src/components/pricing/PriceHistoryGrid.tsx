import React, { useState, useMemo } from 'react';
import type { PriceHistoryItem } from '../../types/pricing';

const SAMPLE_PRICE_HISTORY: PriceHistoryItem[] = [
  {
    id: 'HIST-001',
    changedAt: '2026-10-02 08:30',
    productSku: 'SP-BIA-001',
    productName: 'Bia Saigon Special 330ml (Thùng 24 lon)',
    priceListCode: 'BG-2026-DL1',
    priceListName: 'Bảng giá Đại lý Cấp 1',
    oldPrice: 325000,
    newPrice: 315000,
    changeAmount: -10000,
    changePercent: -3.08,
    changedBy: 'Lê Đắc Lộc',
    role: 'Quản lý kinh doanh',
    reason: 'Hỗ trợ chiết khấu thúc đẩy doanh số mở rộng thị trường miền Tây',
    referenceDoc: 'QĐ-GIA-2026/102',
    status: 'EFFECTIVE'
  },
  {
    id: 'HIST-002',
    changedAt: '2026-09-28 14:15',
    productSku: 'SP-BIA-002',
    productName: 'Bia Heineken Silver 330ml (Thùng 24 lon)',
    priceListCode: 'BG-2026-DL1',
    priceListName: 'Bảng giá Đại lý Cấp 1',
    oldPrice: 390000,
    newPrice: 395000,
    changeAmount: 5000,
    changePercent: 1.28,
    changedBy: 'Nguyễn Thiên',
    role: 'Giám đốc kinh doanh',
    reason: 'Điều chỉnh theo biến động giá nguyên vật liệu từ nhà sản xuất',
    referenceDoc: 'TB-NSX-2026/09',
    status: 'EFFECTIVE'
  },
  {
    id: 'HIST-003',
    changedAt: '2026-09-20 10:00',
    productSku: 'SP-NGK-003',
    productName: 'Nước ngọt Coca-Cola 320ml (Thùng 24 lon)',
    priceListCode: 'BG-2026-DL2',
    priceListName: 'Bảng giá Đại lý Cấp 2',
    oldPrice: 205000,
    newPrice: 198000,
    changeAmount: -7000,
    changePercent: -3.41,
    changedBy: 'Hứa Hiền Lương',
    role: 'Tech Lead / Admin',
    reason: 'Đồng bộ lại bảng giá chuẩn từ hợp đồng khung',
    referenceDoc: 'HĐ-KPP-2026/45',
    status: 'EFFECTIVE'
  },
  {
    id: 'HIST-004',
    changedAt: '2026-09-15 16:45',
    productSku: 'SP-KHO-004',
    productName: 'Mì Hảo Hảo Tôm Chua Cay (Thùng 30 gói)',
    priceListCode: 'BG-2026-BL',
    priceListName: 'Bảng giá Bán lẻ trực tiếp',
    oldPrice: 120000,
    newPrice: 125000,
    changeAmount: 5000,
    changePercent: 4.17,
    changedBy: 'Lê Đắc Lộc',
    role: 'Quản lý kinh doanh',
    reason: 'Cập nhật giá bán lẻ đề xuất toàn hệ thống',
    referenceDoc: 'QĐ-GIA-2026/088',
    status: 'EFFECTIVE'
  },
  {
    id: 'HIST-005',
    changedAt: '2026-10-02 11:20',
    productSku: 'SP-SUA-005',
    productName: 'Sữa tươi Vinamilk 180ml (Lốc 4 hộp)',
    priceListCode: 'BG-2026-KM',
    priceListName: 'Bảng giá Khuyến mãi mùa tựu trường',
    oldPrice: 34000,
    newPrice: 31000,
    changeAmount: -3000,
    changePercent: -8.82,
    changedBy: 'Vũ Ngọc Phong',
    role: 'Chuyên viên kinh doanh',
    reason: 'Đề xuất giảm giá kích cầu tiêu thụ',
    referenceDoc: 'DX-KM-2026/15',
    status: 'PENDING_APPROVAL'
  }
];

export const PriceHistoryGrid: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriceList, setFilterPriceList] = useState('ALL');
  const [filterTrend, setFilterTrend] = useState<'ALL' | 'INCREASE' | 'DECREASE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Lọc dữ liệu
  const filteredData = useMemo(() => {
    return SAMPLE_PRICE_HISTORY.filter((item) => {
      // Tìm kiếm theo SKU, tên sản phẩm, người đổi, số quyết định
      const matchesSearch =
        item.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.changedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.referenceDoc && item.referenceDoc.toLowerCase().includes(searchTerm.toLowerCase()));

      // Lọc theo bảng giá
      const matchesPriceList = filterPriceList === 'ALL' || item.priceListCode === filterPriceList;

      // Lọc theo xu hướng tăng / giảm
      const matchesTrend =
        filterTrend === 'ALL' ||
        (filterTrend === 'INCREASE' && item.changeAmount > 0) ||
        (filterTrend === 'DECREASE' && item.changeAmount < 0);

      // Lọc theo trạng thái
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;

      return matchesSearch && matchesPriceList && matchesTrend && matchesStatus;
    });
  }, [searchTerm, filterPriceList, filterTrend, filterStatus]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalChanges = SAMPLE_PRICE_HISTORY.length;
    const priceIncreases = SAMPLE_PRICE_HISTORY.filter((i) => i.changeAmount > 0).length;
    const priceDecreases = SAMPLE_PRICE_HISTORY.filter((i) => i.changeAmount < 0).length;
    const pendingApproval = SAMPLE_PRICE_HISTORY.filter((i) => i.status === 'PENDING_APPROVAL').length;
    return { totalChanges, priceIncreases, priceDecreases, pendingApproval };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/50 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F85606]" />
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Lưới Hiển Thị Lịch Sử Thay Đổi Giá</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Nhật ký kiểm toán biến động giá bán (Audit Trail) - Theo dõi người thực hiện, lý do và chứng từ phê duyệt
            </p>
          </div>

          {/* Quick mini tags */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ↓ {stats.priceDecreases} Lần Giảm
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ↑ {stats.priceIncreases} Lần Tăng
            </span>
            {stats.pendingApproval > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                ● {stats.pendingApproval} Chờ Duyệt
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Bộ lọc thanh công cụ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm SKU, tên sản phẩm, người đổi..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606]"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Lọc theo Bảng giá */}
          <div>
            <select
              value={filterPriceList}
              onChange={(e) => setFilterPriceList(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] bg-white"
            >
              <option value="ALL">-- Tất cả bảng giá --</option>
              <option value="BG-2026-DL1">BG-2026-DL1 (Đại lý Cấp 1)</option>
              <option value="BG-2026-DL2">BG-2026-DL2 (Đại lý Cấp 2)</option>
              <option value="BG-2026-BL">BG-2026-BL (Bán lẻ)</option>
              <option value="BG-2026-KM">BG-2026-KM (Khuyến mãi)</option>
            </select>
          </div>

          {/* Lọc theo Xu hướng biến động */}
          <div>
            <select
              value={filterTrend}
              onChange={(e) => setFilterTrend(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] bg-white"
            >
              <option value="ALL">-- Mọi biến động giá --</option>
              <option value="DECREASE">Chỉ xem Giảm giá</option>
              <option value="INCREASE">Chỉ xem Tăng giá</option>
            </select>
          </div>

          {/* Lọc theo Trạng thái duyệt */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] bg-white"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="EFFECTIVE">Đang hiệu lực</option>
              <option value="PENDING_APPROVAL">Chờ cấp quản lý duyệt</option>
              <option value="EXPIRED">Đã hết hiệu lực</option>
            </select>
          </div>
        </div>

        {/* Lưới hiển thị (Data Table) */}
        <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-xs">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10 text-center">STT</th>
                <th className="px-3 py-3 min-w-[130px]">Thời gian (UTC+7)</th>
                <th className="px-3 py-3 min-w-[200px]">Mã SKU & Sản phẩm</th>
                <th className="px-3 py-3 min-w-[150px]">Bảng giá áp dụng</th>
                <th className="px-3 py-3 text-right min-w-[110px]">Giá cũ</th>
                <th className="px-3 py-3 text-right min-w-[120px]">Giá mới</th>
                <th className="px-3 py-3 text-center min-w-[130px]">Chênh lệch</th>
                <th className="px-3 py-3 min-w-[150px]">Người thực hiện</th>
                <th className="px-3 py-3 min-w-[200px]">Lý do & Chứng từ</th>
                <th className="px-3 py-3 text-center min-w-[110px]">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Không tìm thấy bản ghi lịch sử thay đổi giá nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isDecrease = item.changeAmount < 0;
                  const isIncrease = item.changeAmount > 0;

                  return (
                    <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="px-3 py-3 text-center text-gray-400 font-medium">{index + 1}</td>

                      {/* Thời gian */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{item.changedAt}</div>
                        <div className="text-[11px] text-gray-400">{item.id}</div>
                      </td>

                      {/* Sản phẩm */}
                      <td className="px-3 py-3">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        <div className="text-[11px] text-gray-500 font-mono">SKU: {item.productSku}</div>
                      </td>

                      {/* Bảng giá */}
                      <td className="px-3 py-3">
                        <span className="font-semibold text-gray-800">{item.priceListName}</span>
                        <div className="text-[11px] text-gray-400 font-mono">{item.priceListCode}</div>
                      </td>

                      {/* Giá cũ */}
                      <td className="px-3 py-3 text-right text-gray-500 line-through">
                        {formatVND(item.oldPrice)}
                      </td>

                      {/* Giá mới */}
                      <td className="px-3 py-3 text-right font-extrabold text-gray-900">
                        {formatVND(item.newPrice)}
                      </td>

                      {/* Biến động */}
                      <td className="px-3 py-3 text-center">
                        {isDecrease && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ↓ {formatVND(Math.abs(item.changeAmount))} ({Math.abs(item.changePercent).toFixed(1)}%)
                          </span>
                        )}
                        {isIncrease && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ↑ +{formatVND(item.changeAmount)} (+{item.changePercent.toFixed(1)}%)
                          </span>
                        )}
                        {!isDecrease && !isIncrease && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            0 ₫
                          </span>
                        )}
                      </td>

                      {/* Người thực hiện */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{item.changedBy}</div>
                        <div className="text-[11px] text-gray-400">{item.role}</div>
                      </td>

                      {/* Lý do & Chứng từ */}
                      <td className="px-3 py-3">
                        <div className="text-gray-800 text-xs leading-relaxed">{item.reason}</div>
                        {item.referenceDoc && (
                          <div className="mt-0.5 inline-block text-[10px] font-mono text-[#F85606] bg-[#FFF2EE] px-1.5 py-0.5 rounded border border-[#FFD8CC]">
                            CT: {item.referenceDoc}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-3 py-3 text-center">
                        {item.status === 'EFFECTIVE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đã Hiệu Lực
                          </span>
                        )}
                        {item.status === 'PENDING_APPROVAL' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Chờ Duyệt
                          </span>
                        )}
                        {item.status === 'EXPIRED' && (
                          <span className="inline-flex items-center text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Hết hạn
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer tóm tắt */}
        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2">
          <div>
            Hiển thị <strong>{filteredData.length}</strong> / <strong>{SAMPLE_PRICE_HISTORY.length}</strong> bản ghi lịch sử
          </div>
          <div className="text-[11px] text-gray-400">
            * Dữ liệu lịch sử thay đổi giá được tự động lưu vết và chống can thiệp (Audit Trail ERP)
          </div>
        </div>
      </div>
    </div>
  );
};
