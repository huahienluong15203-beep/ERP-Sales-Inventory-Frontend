import React from 'react';
import type { PriceList, CustomerGroupType } from '../../types/pricing';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import { Icons } from '../common/Icons';
import { Pagination } from '../common/Pagination';

interface PriceListTableProps {
  /** Các bảng giá của TRANG hiện tại (Backend đã lọc + phân trang). */
  priceLists: PriceList[];
  canManage: boolean;
  onViewDetail: (priceList: PriceList) => void;
  onEdit: (priceList: PriceList) => void;
  onCloneVersion: (priceList: PriceList) => void;
  onToggleStatus: (priceList: PriceList) => void;
  // Bộ lọc (lưu trên URL ở trang cha)
  keyword: string;
  onKeywordChange: (value: string) => void;
  selectedGroup: string;
  onGroupChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  // Phân trang
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  loading?: boolean;
}

export const PriceListTable: React.FC<PriceListTableProps> = ({
  priceLists,
  canManage,
  onViewDetail,
  onEdit,
  onCloneVersion,
  onToggleStatus,
  keyword,
  onKeywordChange,
  selectedGroup,
  onGroupChange,
  selectedStatus,
  onStatusChange,
  page,
  size,
  totalPages,
  totalElements,
  onPageChange,
  onSizeChange,
  loading = false
}) => {
  const nowStr = new Date().toISOString().split('T')[0];

  // Backend đã lọc sẵn, Frontend không lọc lại
  const filteredLists = priceLists;

  const getValidityBadge = (startDate: string, endDate?: string | null) => {
    if (startDate > nowStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          Chưa đến ngày
        </span>
      );
    }
    if (endDate && endDate < nowStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
          Đã hết hạn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        Đang hiệu lực
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Tìm theo mã bảng giá, tên bảng giá hoặc ghi chú..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <Icons.Search size={16} />
          </div>
          {keyword && (
            <button
              onClick={() => onKeywordChange('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <Icons.X size={14} />
            </button>
          )}
        </div>

        {/* Bộ lọc nhóm khách hàng & trạng thái */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nhóm khách hàng */}
          <select
            value={selectedGroup}
            onChange={(e) => onGroupChange(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="ALL">Tất cả nhóm khách hàng</option>
            <option value="DEALER_LEVEL_1">Đại lý cấp 1 (NPP)</option>
            <option value="DEALER_LEVEL_2">Đại lý cấp 2</option>
            <option value="RETAIL">Khách lẻ / Showroom</option>
          </select>

          {/* Trạng thái */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang áp dụng (Active)</option>
            <option value="INACTIVE">Ngừng áp dụng (Inactive)</option>
          </select>

          {/* Đếm số lượng */}
          <span className="text-xs text-gray-500 ml-1">
            Tìm thấy <strong>{totalElements}</strong> bảng giá
          </span>
        </div>
      </div>

      {/* Bảng danh sách */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
              <th className="py-3 px-4">Mã & Phiên bản</th>
              <th className="py-3 px-4">Tên bảng giá & Mô tả</th>
              <th className="py-3 px-4">Nhóm khách hàng</th>
              <th className="py-3 px-4">Thời gian hiệu lực</th>
              <th className="py-3 px-4 text-center">Số SKU</th>
              <th className="py-3 px-4 text-center">Đơn hàng</th>
              <th className="py-3 px-4 text-center">Trạng thái</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
            {filteredLists.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Icons.Tags size={36} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">
                      Không tìm thấy bảng giá nào phù hợp
                    </p>
                    <p className="text-xs text-gray-400">
                      Vui lòng thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLists.map((item) => {
                const groupInfo = CUSTOMER_GROUPS[item.customerGroup as CustomerGroupType];
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Mã & Phiên bản */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 text-xs">
                          {item.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orange-100 text-[#F85606] font-semibold border border-orange-200">
                          v{item.version || 1}
                        </span>
                      </div>
                    </td>

                    {/* Tên bảng giá */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-gray-900 line-clamp-1">
                        {item.name}
                      </div>
                      {item.note && (
                        <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                          {item.note}
                        </div>
                      )}
                    </td>

                    {/* Nhóm khách hàng */}
                    <td className="py-3.5 px-4">
                      {groupInfo ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${groupInfo.badgeBg} ${groupInfo.badgeText} ${groupInfo.badgeBorder}`}
                        >
                          {groupInfo.shortLabel}
                        </span>
                      ) : (
                        <span className="text-gray-400">{item.customerGroup}</span>
                      )}
                    </td>

                    {/* Thời gian hiệu lực */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-gray-800 font-medium">
                          <span>{item.startDate}</span>
                          <span>{item.endDate ? ` → ${item.endDate}` : ' → Vô thời hạn'}</span>
                        </div>
                        <div>{getValidityBadge(item.startDate, item.endDate)}</div>
                      </div>
                    </td>

                    {/* Số SKU */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs">
                        {item.itemsCount || (item.items ? item.items.length : 0)} SKU
                      </span>
                    </td>

                    {/* Ràng buộc đơn hàng (Quy tắc S2-10) */}
                    <td className="py-3.5 px-4 text-center">
                      {item.hasOrders ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCloneVersion(item);
                          }}
                          title="Bảng giá đã phát sinh đơn thì không sửa. Bấm vào đây để tạo phiên bản mới (v2, v3...)!"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 hover:border-rose-400 active:scale-95 transition-all cursor-pointer shadow-xs"
                        >
                          <Icons.ShieldAlert size={14} className="text-rose-600 shrink-0" />
                          <span>Đã có đơn (Bấm tạo bản mới)</span>
                        </button>
                      ) : (
                        <span
                          title="Chưa phát sinh đơn hàng, cho phép chỉnh sửa trực tiếp"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                          <Icons.CheckSquare size={12} />
                          <span>Chưa có đơn</span>
                        </span>
                      )}
                    </td>

                    {/* Trạng thái Kích hoạt */}
                    <td className="py-3.5 px-4 text-center">
                      {canManage ? (
                        <button
                          onClick={() => onToggleStatus(item)}
                          title={`Nhấn để chuyển sang ${item.status === 'ACTIVE' ? 'NGỪNG ÁP DỤNG' : 'ÁP DỤNG'}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          <span>{item.status === 'ACTIVE' ? 'Đang bật' : 'Đang tắt'}</span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span>{item.status === 'ACTIVE' ? 'Đang bật' : 'Đang tắt'}</span>
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => onViewDetail(item)}
                          title="Xem danh sách dòng giá & giá sàn"
                          className="p-1.5 rounded-lg text-gray-600 hover:text-[#F85606] hover:bg-orange-50 transition-colors cursor-pointer"
                        >
                          <Icons.Eye size={16} />
                        </button>

                        {/* Sửa bảng giá */}
                        <button
                          onClick={() => {
                            if (item.hasOrders) {
                              if (
                                window.confirm(
                                  `Bảng giá ${item.code} đã phát sinh đơn hàng nên không thể sửa trực tiếp. Bạn có muốn tạo phiên bản mới (v${(item.version || 1) + 1}) không?`
                                )
                              ) {
                                onCloneVersion(item);
                              }
                            } else {
                              onEdit(item);
                            }
                          }}
                          title={
                            item.hasOrders
                              ? 'Bảng giá đã có đơn hàng (bấm để tạo phiên bản mới)'
                              : 'Chỉnh sửa bảng giá và các dòng giá'
                          }
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            item.hasOrders
                              ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <Icons.Edit size={16} />
                        </button>

                        {/* Nút Tạo phiên bản mới luôn khả dụng */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCloneVersion(item);
                          }}
                          title="Tạo phiên bản mới từ bảng giá này (v2, v3...)"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                            item.hasOrders
                              ? 'bg-[#F85606] hover:bg-[#E04D05] text-white shadow-sm hover:shadow-md'
                              : 'bg-orange-50 hover:bg-orange-100 text-[#F85606] border border-orange-200'
                          }`}
                        >
                          <Icons.Copy size={13} />
                          <span>Tạo bản mới</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang: ‹ 1 2 … n › */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        size={size}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
        itemLabel="bảng giá"
        disabled={loading}
      />
    </div>
  );
};
