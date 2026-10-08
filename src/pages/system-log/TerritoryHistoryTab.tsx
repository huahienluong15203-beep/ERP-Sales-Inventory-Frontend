import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CustomerAssignmentHistory } from '../../types/agency';
import { fetchAllAssignmentHistories } from '../../services/agencyApi';
import { useAuth } from '../../contexts/AuthContext';
import { TransferTerritoryModal } from '../../components/customer/TransferTerritoryModal';
import { formatDateTime } from '../../services/auditLogApi';
import { getUserAvatarInitials } from '../../types/user';
import {
  History,
  Users,
  Search,
  RefreshCw,
  Building2,
  MapPin,
  Info,
  CheckCircle2
} from '../../components/common/Icons';
import { Pagination } from '../../components/common/Pagination';

export const TerritoryHistoryTab: React.FC = () => {
  const { currentRole } = useAuth();
  const canTransfer = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER';

  // Dữ liệu danh sách & phân trang
  const [histories, setHistories] = useState<CustomerAssignmentHistory[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [keyword, setKeyword] = useState('');
  const [changeType, setChangeType] = useState<string>('ALL');

  // Modal chuyển giao địa bàn ("lựa chọn để thêm")
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Tải danh sách lịch sử chuyển giao
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAllAssignmentHistories({
        keyword: keyword.trim() || undefined,
        changeType: changeType !== 'ALL' ? changeType : undefined,
        page,
        size
      });
      setHistories(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử chuyển địa bàn:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword, changeType, page, size]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let transferCount = 0;
    let assignCount = 0;
    let createCount = 0;
    histories.forEach((h) => {
      if (h.changeType === 'TRANSFER') transferCount++;
      else if (h.changeType === 'ASSIGN') assignCount++;
      else if (h.changeType === 'CREATE') createCount++;
    });
    return { transferCount, assignCount, createCount };
  }, [histories]);

  const renderBadge = (type: string) => {
    switch (type) {
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Bàn giao hàng loạt
          </span>
        );
      case 'ASSIGN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-50 text-[#F85606] border border-orange-200">
            Điều chuyển phụ trách
          </span>
        );
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Khởi tạo ban đầu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* 1. Header tác vụ & Thao tác chuyển giao */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History size={20} className="text-[#F85606]" />
            Lịch Sử Phân Công & Chuyển Giao Địa Bàn
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Truy vết bàn giao đại lý khi nhân viên nghỉ việc hoặc điều chuyển khu vực kinh doanh
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-[#F85606] rounded-xl hover:bg-slate-50 text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer min-h-[44px]"
            title="Làm mới lịch sử chuyển địa bàn"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          {canTransfer && (
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F85606] hover:bg-[#e04d05] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition hover:shadow-md cursor-pointer min-h-[44px]"
              title="Thực hiện chuyển giao đại lý giữa các nhân viên"
            >
              <Users size={16} />
              <span>Chuyển Giao Địa Bàn</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Thẻ KPI thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold">
            <History size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Tổng lượt ghi nhận</span>
            <div className="text-lg font-bold text-slate-900">{totalElements}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Users size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Bàn giao hàng loạt</span>
            <div className="text-lg font-bold text-purple-700">{stats.transferCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Điều chuyển phụ trách</span>
            <div className="text-lg font-bold text-orange-700">{stats.assignCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Gán khi tạo mới</span>
            <div className="text-lg font-bold text-blue-700">{stats.createCount}</div>
          </div>
        </div>
      </div>

      {/* 3. Thanh tìm kiếm và bộ lọc */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo mã/tên đại lý, lý do, người chuyển, người nhận..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#F85606] transition"
            />
          </div>

          {/* Lọc loại thao tác */}
          <select
            value={changeType}
            onChange={(e) => {
              setChangeType(e.target.value);
              setPage(0);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:bg-white focus:outline-none focus:border-[#F85606] cursor-pointer"
          >
            <option value="ALL">-- Tất cả loại thao tác --</option>
            <option value="TRANSFER">Bàn giao hàng loạt (TRANSFER)</option>
            <option value="ASSIGN">Điều chuyển phụ trách (ASSIGN)</option>
            <option value="CREATE">Khởi tạo ban đầu (CREATE)</option>
          </select>
        </div>

        {(keyword || changeType !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setChangeType('ALL');
              setPage(0);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-[#F85606] transition px-3 py-2 cursor-pointer"
          >
            Đặt lại lọc
          </button>
        )}
      </div>

      {/* 4. Bảng dữ liệu Sổ Ghi Lịch Sử Chuyển Địa Bàn */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Danh Sách Bàn Giao & Điều Chuyển</h3>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800">
              {totalElements} bản ghi
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3">Thời Điểm</th>
                <th className="py-3.5 px-3">Đại Lý & Khu Vực</th>
                <th className="py-3.5 px-3">Loại Thao Tác</th>
                <th className="py-3.5 px-3">Người Bàn Giao</th>
                <th className="py-3.5 px-3">Người Tiếp Nhận</th>
                <th className="py-3.5 px-3">Lý Do / Căn Cứ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-orange-600" />
                      <span>Đang truy xuất lịch sử phân công đại lý...</span>
                    </div>
                  </td>
                </tr>
              ) : histories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Info size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-medium text-slate-700">Chưa có lịch sử chuyển giao địa bàn</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Các lượt phân công và bàn giao địa bàn sẽ được lưu vết tự động tại đây
                    </p>
                  </td>
                </tr>
              ) : (
                histories.map((h) => {
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition">
                      {/* 1. Thời điểm */}
                      <td className="py-3.5 px-3 overflow-hidden">
                        <div className="font-semibold text-slate-900 text-xs truncate" title={formatDateTime(h.changedAt)}>
                          {formatDateTime(h.changedAt)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono truncate block mt-0.5">
                          #ID {h.id}
                        </span>
                      </td>

                      {/* 2. Đại lý & Khu vực */}
                      <td className="py-3.5 px-3 overflow-hidden">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs truncate">
                          <span className="font-mono text-[#F85606] font-bold">
                            {h.customer?.code || 'DL'}
                          </span>
                          <span>•</span>
                          <span className="truncate" title={h.customer?.name}>
                            {h.customer?.name || 'Đại lý'}
                          </span>
                        </div>
                        {h.region?.name && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <MapPin size={11} className="text-blue-500" />
                            <span className="truncate">{h.region.name}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Loại thao tác */}
                      <td className="py-3.5 px-3 overflow-hidden">
                        {renderBadge(h.changeType)}
                      </td>

                      {/* 4. Người bàn giao */}
                      <td className="py-3.5 px-3 overflow-hidden">
                        {h.fromSalesRep ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[11px] shrink-0">
                              {getUserAvatarInitials(h.fromSalesRep.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800 text-xs truncate" title={h.fromSalesRep.fullName}>
                                {h.fromSalesRep.fullName}
                              </div>
                              {h.fromSalesRep.username && (
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  @{h.fromSalesRep.username}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">— (Khởi tạo)</span>
                        )}
                      </td>

                      {/* 5. Người tiếp nhận */}
                      <td className="py-3.5 px-3 overflow-hidden">
                        {h.toSalesRep ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-[#F85606] font-bold text-[11px] shrink-0">
                              {getUserAvatarInitials(h.toSalesRep.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 text-xs truncate" title={h.toSalesRep.fullName}>
                                {h.toSalesRep.fullName}
                              </div>
                              {h.toSalesRep.username && (
                                <div className="text-[10px] text-orange-600 font-mono truncate">
                                  @{h.toSalesRep.username}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">— Chưa gán</span>
                        )}
                      </td>

                      {/* 6. Lý do / Căn cứ */}
                      <td className="py-3.5 px-3 overflow-hidden">
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed" title={h.reason || ''}>
                          {h.reason || '—'}
                        </p>
                        {h.changedBy && (
                          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                            Thực hiện bởi: {h.changedBy.fullName}
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

        {/* Phân trang */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
          itemLabel="lượt chuyển giao"
          disabled={loading}
        />
      </div>

      {/* Modal Chuyển Giao Địa Bàn (mở khi bấm nút "+ Chuyển Giao Địa Bàn") */}
      {isTransferModalOpen && (
        <TransferTerritoryModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onSuccess={() => {
            setIsTransferModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};
