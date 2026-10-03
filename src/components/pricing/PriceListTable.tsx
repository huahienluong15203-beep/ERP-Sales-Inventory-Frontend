import React, { useState } from 'react';
import type { PriceList, CustomerGroupType } from '../../types/pricing';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import { Icons } from '../common/Icons';

interface PriceListTableProps {
  priceLists: PriceList[];
  canManage: boolean;
  onViewDetail: (priceList: PriceList) => void;
  onEdit: (priceList: PriceList) => void;
  onCloneVersion: (priceList: PriceList) => void;
  onToggleStatus: (priceList: PriceList) => void;
}

export const PriceListTable: React.FC<PriceListTableProps> = ({
  priceLists,
  canManage,
  onViewDetail,
  onEdit,
  onCloneVersion,
  onToggleStatus
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  const nowStr = new Date().toISOString().split('T')[0];

  const filteredLists = priceLists.filter((item) => {
    if (selectedGroup !== 'ALL' && item.customerGroup !== selectedGroup) {
      return false;
    }
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
      return false;
    }
    if (keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      const codeMatch = item.code.toLowerCase().includes(kw);
      const nameMatch = item.name.toLowerCase().includes(kw);
      const noteMatch = item.note ? item.note.toLowerCase().includes(kw) : false;
      if (!codeMatch && !nameMatch && !noteMatch) return false;
    }
    return true;
  });

  const getValidityBadge = (startDate: string, endDate?: string | null) => {
    if (startDate > nowStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Chưa đến ngày
        </span>
      );
    }
    if (endDate && endDate < nowStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
          Đã hết hạn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        Đang hiệu lực
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã bảng giá, tên bảng giá hoặc ghi chú..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="absolute left-3 top-2.5 text-slate-400">
            <Icons.Search size={16} />
          </div>
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tất cả nhóm khách hàng</option>
            <option value="DEALER_LEVEL_1">Đại lý cấp 1 (NPP)</option>
            <option value="DEALER_LEVEL_2">Đại lý cấp 2</option>
            <option value="RETAIL">Khách lẻ / Showroom</option>
          </select>

          {/* Trạng thái */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang áp dụng (Active)</option>
            <option value="INACTIVE">Ngừng áp dụng (Inactive)</option>
          </select>

          {/* Đếm số lượng */}
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
            Hiển thị <strong>{filteredLists.length}</strong> / {priceLists.length}
          </span>
        </div>
      </div>

      {/* Bảng danh sách */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
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
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {filteredLists.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Icons.Tags size={36} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Không tìm thấy bảng giá nào phù hợp
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
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
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Mã & Phiên bản */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {item.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                          v{item.version || 1}
                        </span>
                      </div>
                    </td>

                    {/* Tên bảng giá */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                        {item.name}
                      </div>
                      {item.note && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
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
                        <span className="text-slate-400">{item.customerGroup}</span>
                      )}
                    </td>

                    {/* Thời gian hiệu lực */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          <span>{item.startDate}</span>
                          <span>{item.endDate ? ` → ${item.endDate}` : ' → Vô thời hạn'}</span>
                        </div>
                        <div>{getValidityBadge(item.startDate, item.endDate)}</div>
                      </div>
                    </td>

                    {/* Số SKU */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                        {item.itemsCount || (item.items ? item.items.length : 0)} SKU
                      </span>
                    </td>

                    {/* Ràng buộc đơn hàng (Quy tắc S2-10) */}
                    <td className="py-3.5 px-4 text-center">
                      {item.hasOrders ? (
                        <span
                          title="Bảng giá đã phát sinh đơn thì không sửa, chỉ tạo phiên bản mới"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 cursor-help"
                        >
                          <Icons.ShieldAlert size={12} />
                          Đã có đơn (Khóa sửa)
                        </span>
                      ) : (
                        <span
                          title="Chưa phát sinh đơn hàng, cho phép chỉnh sửa trực tiếp"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          <Icons.CheckSquare size={12} />
                          Chưa có đơn
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
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {item.status === 'ACTIVE' ? 'Đang bật' : 'Đang tắt'}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {item.status === 'ACTIVE' ? 'Đang bật' : 'Đang tắt'}
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => onViewDetail(item)}
                          title="Xem danh sách dòng giá & giá sàn"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Icons.Eye size={16} />
                        </button>

                        {/* Sửa bảng giá */}
                        {canManage && (
                          <button
                            onClick={() => onEdit(item)}
                            disabled={item.hasOrders}
                            title={
                              item.hasOrders
                                ? 'Bảng giá đã phát sinh đơn thì không sửa, chỉ tạo phiên bản mới'
                                : 'Chỉnh sửa bảng giá và các dòng giá'
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.hasOrders
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-300 dark:hover:bg-slate-800 cursor-pointer'
                            }`}
                          >
                            <Icons.Edit size={16} />
                          </button>
                        )}

                        {/* Tạo phiên bản mới (Clone version) */}
                        {canManage && (
                          <button
                            onClick={() => onCloneVersion(item)}
                            title="Tạo phiên bản mới từ bảng giá này (v2, v3...)"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 dark:text-slate-400 dark:hover:text-purple-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Icons.Copy size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
