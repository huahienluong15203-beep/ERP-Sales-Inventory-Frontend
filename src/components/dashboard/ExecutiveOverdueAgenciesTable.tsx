import React from 'react';
import { useNavigate } from '../../routes/Router';
import { AlertCircle, ChevronRight, Phone, UserCheck, ShieldAlert } from 'lucide-react';
import type { ExecutiveOverdueAgencies } from '../../types/dashboard';

interface ExecutiveOverdueAgenciesTableProps {
  data: ExecutiveOverdueAgencies | null;
  loading?: boolean;
}

export const ExecutiveOverdueAgenciesTable: React.FC<ExecutiveOverdueAgenciesTableProps> = ({
  data,
  loading = false
}) => {
  const navigate = useNavigate();

  const formatVnd = (amount: number) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-5 h-5 rounded-full bg-gray-400 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
          3
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-bold text-[11px] flex items-center justify-center">
        {rank}
      </span>
    );
  };

  const agencies = data?.agencies || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">
              Đại Lý Quá Hạn Công Nợ
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/debts/ledger')}
          className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
        >
          <span>Xem sổ công nợ toàn diện</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                <th className="py-2.5 px-3">Đại Lý</th>
                <th className="py-2.5 px-3">NVKD Phụ Trách</th>
                <th className="py-2.5 px-3 text-right">Hạn Mức</th>
                <th className="py-2.5 px-3 text-right">Tổng Nợ</th>
                <th className="py-2.5 px-3 text-right">Nợ Quá Hạn</th>
                <th className="py-2.5 px-3 text-center">Quá Hạn</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Đang tải danh sách đại lý nợ quá hạn...
                  </td>
                </tr>
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    <AlertCircle size={24} className="mx-auto mb-1 text-emerald-500" />
                    <span className="font-semibold text-emerald-700">Tuyệt vời! Không có đại lý nào bị quá hạn công nợ.</span>
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.customerId} className="hover:bg-rose-50/20 transition">
                    {/* Hạng */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">{getRankBadge(agency.rank)}</div>
                    </td>

                    {/* Đại lý */}
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-gray-900">{agency.customerCode}</div>
                      <div className="font-semibold text-gray-800 truncate max-w-[200px]">
                        {agency.customerName}
                      </div>
                      {agency.phone && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} />
                          <span>{agency.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* NVKD phụ trách */}
                    <td className="py-2.5 px-3 text-gray-700">
                      <div className="flex items-center gap-1">
                        <UserCheck size={12} className="text-gray-400" />
                        <span>{agency.salesRepName || '—'}</span>
                      </div>
                    </td>

                    {/* Hạn mức */}
                    <td className="py-2.5 px-3 text-right text-gray-500 font-mono">
                      {formatVnd(agency.creditLimit)}
                    </td>

                    {/* Tổng nợ */}
                    <td className="py-2.5 px-3 text-right font-medium text-gray-800 font-mono">
                      {formatVnd(agency.currentDebt)}
                    </td>

                    {/* Nợ quá hạn (AC 3) */}
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-mono">
                      {formatVnd(agency.overdueAmount)}
                    </td>

                    {/* Số ngày quá hạn */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {agency.oldestOverdueDays} ngày
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/debts/ledger?customerId=${agency.customerId}`)}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] transition cursor-pointer"
                      >
                        Sổ nợ &gt;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
