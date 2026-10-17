import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileSpreadsheet,
  Search,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  ShieldAlert,
  BellRing
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import {
  fetchOverdueDebtReport,
  downloadOverdueDebtExcel
} from '../../services/overdueDebtReportApi';
import type {
  OverdueReportResponse,
  OverdueRiskRow,
  OverdueRepSummary
} from '../../types/overdueDebtReport';
import { PaymentReminderPopupModal } from '../../components/debt/PaymentReminderPopupModal';

export const OverdueDebtReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [data, setData] = useState<OverdueReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);

  // Tab chuyển đổi góc nhìn: 'RANKING' (Xếp hạng rủi ro), 'BY_REP' (Theo nhân viên)
  const [activeTab, setActiveTab] = useState<'RANKING' | 'BY_BUCKET' | 'BY_REP'>('RANKING');

  // Ô tìm kiếm
  const [keyword, setKeyword] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchOverdueDebtReport({
        keyword: keyword.trim() || undefined
      });
      setData(res);
    } catch (err: any) {
      showToast('Lỗi tải báo cáo', err.message || 'Không thể tải báo cáo nợ quá hạn', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await downloadOverdueDebtExcel(undefined, data || undefined);
      showToast(
        'Xuất Excel thành công',
        'Tệp báo cáo công nợ quá hạn 3 sheet đã được tải về',
        'success'
      );
    } catch (err: any) {
      showToast('Lỗi xuất Excel', err.message || 'Không thể xuất tệp Excel', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 antialiased max-w-7xl mx-auto pb-16">
      {/* 1. Thanh thao tác trên cùng */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>

        <button
          type="button"
          onClick={() => setShowReminderModal(true)}
          className="px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Xem danh sách nhắc nợ đại lý"
        >
          <BellRing size={15} />
          <span>Nhắc nợ</span>
        </button>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
          title="Xuất file Excel gồm 3 Sheet theo quy chuẩn"
        >
          <FileSpreadsheet size={15} className={exporting ? 'animate-spin' : ''} />
          <span>{exporting ? 'Đang xuất Excel...' : 'Xuất Excel (3 Sheet)'}</span>
        </button>
      </div>

      {/* 2. Thẻ KPI tổng quan nợ quá hạn & rủi ro cao */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tổng nợ quá hạn */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-white border border-rose-200/80 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={13} className="text-rose-600" />
              <span>Tổng nợ quá hạn</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            {formatCurrencyVND(data?.totalOverdue || 0)}
          </div>
          <div className="text-[11px] text-rose-900 font-medium">
            Khoản nợ đã vượt số ngày nợ cho phép
          </div>
        </div>

        {/* Đại lý rủi ro cao */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-red-50 to-white border border-red-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert size={13} className="text-red-600" />
            <span>Đại lý rủi ro cao (HIGH)</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-red-700 font-mono">
            {data?.highRiskCount || 0}{' '}
            <span className="text-xs font-semibold text-gray-500">đại lý</span>
          </div>
          <div className="text-[11px] text-red-800">
            Nợ trên 90 ngày hoặc vượt hạn mức tín dụng
          </div>
        </div>

        {/* Tổng số đại lý quá hạn */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Building2 size={13} className="text-amber-600" />
            <span>Số đại lý nợ quá hạn</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
            {data?.overdueCustomerCount || 0}{' '}
            <span className="text-xs font-semibold text-gray-500">đại lý</span>
          </div>
          <div className="text-[11px] text-amber-800">
            Chiếm {(data?.customers?.length || 0)} đại lý trong danh mục theo dõi
          </div>
        </div>

        {/* Tổng nợ còn lại */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} className="text-[#F85606]" />
            <span>Tổng còn nợ</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#F85606] font-mono">
            {formatCurrencyVND(data?.totalOutstanding || 0)}
          </div>
          <div className="text-[11px] text-orange-950">
            Bao gồm cả nợ trong hạn và quá hạn
          </div>
        </div>
      </div>

      {/* 3. Phân bổ nợ theo nhóm tuổi nợ (Xếp thẳng hàng thẳng cột với 4 thẻ KPI ở trên) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {(data?.byBucket || []).map((b) => {
          const isDanger = b.bucket === 'D90_PLUS';
          const isWarning = b.bucket === 'D61_90';
          const totalDebt = (data?.byBucket || []).reduce((s, x) => s + x.amount, 0) || data?.totalOutstanding || 1;
          const percentage = totalDebt > 0 ? Math.round((b.amount / totalDebt) * 100) : 0;

          return (
            <div
              key={b.bucket}
              className={`p-4 rounded-2xl border shadow-2xs flex flex-col justify-between transition ${
                isDanger
                  ? 'bg-gradient-to-br from-rose-50 to-white border-rose-200/80'
                  : isWarning
                  ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200/80'
                  : 'bg-gradient-to-br from-gray-50 to-white border-gray-200/80'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isDanger ? 'text-rose-900' : isWarning ? 'text-amber-900' : 'text-gray-800'}`}>
                    {b.label}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {b.customerCount} đại lý
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-black font-mono ${isDanger ? 'text-rose-700' : isWarning ? 'text-amber-800' : 'text-gray-900'}`}>
                  {formatCurrencyVND(b.amount)}
                </div>
              </div>

              {/* Progress bar tỷ trọng */}
              <div className="mt-2.5 space-y-1">
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDanger ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>Tỷ trọng nợ</span>
                  <span className="font-bold text-gray-700">{percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Điều hướng Tab hiển thị chi tiết */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('RANKING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'RANKING'
                ? 'bg-[#F85606] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ShieldAlert size={14} />
            <span>Xếp hạng rủi ro cao nhất</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BY_REP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'BY_REP'
                ? 'bg-[#F85606] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users size={14} />
            <span>Tổng hợp theo NV phụ trách</span>
          </button>
        </div>

        {/* Ô tìm kiếm ở góc bên phải */}
        <form onSubmit={handleSearchSubmit} className="relative w-64 sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm đại lý, nhân viên..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#F85606] shadow-2xs transition"
          />
        </form>
      </div>

      {/* 5. Nội dung Tab 1: BẢNG XẾP HẠNG ĐẠI LÝ RỦI RO CAO NHẤT */}
      {activeTab === 'RANKING' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3 text-center w-12">Hạng</th>
                  <th className="py-3 px-3">Đại lý</th>
                  <th className="py-3 px-3">NV phụ trách</th>
                  <th className="py-3 px-3 text-center">Mức rủi ro</th>
                  <th className="py-3 px-3">Lý do cảnh báo</th>
                  <th className="py-3 px-3 text-right">Hạn mức (₫)</th>
                  <th className="py-3 px-3 text-right">Còn nợ (₫)</th>
                  <th className="py-3 px-3 text-right">Quá hạn (₫)</th>
                  <th className="py-3 px-3 text-right">&gt; 90 ngày (₫)</th>
                  <th className="py-3 px-3 text-center">Tuổi nợ max</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                      Đang phân tích dữ liệu tuổi nợ và xếp hạng rủi ro...
                    </td>
                  </tr>
                ) : !data || data.customers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      Không có đại lý nào có nợ quá hạn theo điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  data.customers.map((row: OverdueRiskRow) => {
                    const isHigh = row.riskLevel === 'HIGH';

                    return (
                      <tr
                        key={row.customerId}
                        onClick={() => navigate(`/debts/statement?customerId=${row.customerId}`)}
                        className={`cursor-pointer transition-colors duration-150 hover:bg-orange-50/50 ${
                          isHigh ? 'bg-rose-50/20' : ''
                        }`}
                        title={`Bấm vào hàng để mở Sổ chi tiết công nợ của ${row.customerName}`}
                      >
                        {/* Cột Hạng */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                              row.rank === 1
                                ? 'bg-amber-400 text-amber-950 shadow-xs'
                                : row.rank === 2
                                ? 'bg-slate-300 text-slate-800'
                                : row.rank === 3
                                ? 'bg-orange-300 text-orange-950'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {row.rank}
                          </span>
                        </td>

                        {/* Thông tin đại lý */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900 hover:text-[#F85606] transition">
                            {row.customerName}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500">
                            {row.customerCode}
                          </div>
                        </td>

                        {/* NV phụ trách */}
                        <td className="py-3 px-3 text-gray-700 whitespace-nowrap">
                          {row.salesRepName || (
                            <span className="text-gray-400 italic">Chưa phân công</span>
                          )}
                        </td>

                        {/* Mức rủi ro */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isHigh ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                              <ShieldAlert size={11} />
                              <span>RỦI RO CAO</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <span>TRUNG BÌNH</span>
                            </span>
                          )}
                        </td>

                        {/* Lý do cảnh báo */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 max-w-xs">
                            {row.reasons.map((r, i) => (
                              <div
                                key={i}
                                className="text-[11px] text-gray-700 flex items-start gap-1"
                              >
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Hạn mức */}
                        <td className="py-3 px-3 text-right font-mono text-gray-600">
                          {formatCurrencyVND(row.creditLimit)}
                        </td>

                        {/* Còn nợ */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                          {formatCurrencyVND(row.outstanding)}
                        </td>

                        {/* Quá hạn */}
                        <td className="py-3 px-3 text-right font-mono font-black text-rose-700 bg-rose-50/40">
                          {formatCurrencyVND(row.overdueAmount)}
                        </td>

                        {/* Nợ > 90 ngày */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-800">
                          {row.over90 > 0 ? formatCurrencyVND(row.over90) : '-'}
                        </td>

                        {/* Tuổi nợ lâu nhất */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-gray-800">
                          <span
                            className={`px-2 py-0.5 rounded-lg ${
                              row.oldestDebtDays > 90
                                ? 'bg-rose-100 text-rose-800 font-black'
                                : row.oldestDebtDays > 60
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {row.oldestDebtDays} ngày
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Chân bảng tổng cộng */}
              {data && data.customers.length > 0 && (
                <tfoot className="bg-gray-100/90 border-t-2 border-gray-300 font-bold text-[11px] text-gray-900">
                  <tr>
                    <td colSpan={6} className="py-3 px-3 uppercase font-black text-gray-950">
                      TỔNG CỘNG ({data.customers.length} đại lý nợ quá hạn):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-900">
                      {formatCurrencyVND(data.totalOutstanding)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-700 bg-rose-100/50">
                      {formatCurrencyVND(data.totalOverdue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-800">
                      {formatCurrencyVND(
                        data.customers.reduce((s, r) => s + r.over90, 0)
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 6. Nội dung Tab 2: TỔNG HỢP THEO NHÂN VIÊN PHỤ TRÁCH (AC 1) */}
      {activeTab === 'BY_REP' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Bảng tổng hợp công nợ quá hạn theo nhân viên kinh doanh phụ trách
            </span>
            <span className="text-xs text-gray-500">
              {data?.byRep?.length || 0} nhân sự phụ trách
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3">Nhân viên phụ trách</th>
                  <th className="py-3 px-3 text-center">Đại lý quá hạn</th>
                  <th className="py-3 px-3 text-center">Đại lý rủi ro cao</th>
                  <th className="py-3 px-3 text-right">Tổng còn nợ (₫)</th>
                  <th className="py-3 px-3 text-right">Tổng quá hạn (₫)</th>
                  <th className="py-3 px-3 text-right">0–30 ngày (₫)</th>
                  <th className="py-3 px-3 text-right">31–60 ngày (₫)</th>
                  <th className="py-3 px-3 text-right">61–90 ngày (₫)</th>
                  <th className="py-3 px-3 text-right">&gt; 90 ngày (₫)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 font-medium">
                {!data || data.byRep.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-gray-400">
                      Không có số liệu nhân viên phụ trách.
                    </td>
                  </tr>
                ) : (
                  data.byRep.map((rep: OverdueRepSummary, idx: number) => (
                    <tr key={rep.salesRepId ?? idx} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-3 font-bold text-gray-900">
                        {rep.salesRepName}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-gray-800">
                        {rep.customerCount}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rep.highRiskCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700">
                            {rep.highRiskCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        {formatCurrencyVND(rep.outstanding)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-rose-700 bg-rose-50/30">
                        {formatCurrencyVND(rep.overdueAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        {rep.d0To30 > 0 ? formatCurrencyVND(rep.d0To30) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        {rep.d31To60 > 0 ? formatCurrencyVND(rep.d31To60) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-800">
                        {rep.d61To90 > 0 ? formatCurrencyVND(rep.d61To90) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-800">
                        {rep.over90 > 0 ? formatCurrencyVND(rep.over90) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Chân bảng tổng cộng */}
              {data && data.byRep.length > 0 && (
                <tfoot className="bg-gray-100/90 border-t-2 border-gray-300 font-bold text-[11px] text-gray-900">
                  <tr>
                    <td className="py-3 px-3 uppercase font-black text-gray-950">TỔNG CỘNG:</td>
                    <td className="py-3 px-3 text-center">
                      {data.byRep.reduce((s, r) => s + r.customerCount, 0)}
                    </td>
                    <td className="py-3 px-3 text-center text-rose-700 font-black">
                      {data.byRep.reduce((s, r) => s + r.highRiskCount, 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatCurrencyVND(data.totalOutstanding)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-700 bg-rose-100/50">
                      {formatCurrencyVND(data.totalOverdue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatCurrencyVND(data.byRep.reduce((s, r) => s + r.d0To30, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatCurrencyVND(data.byRep.reduce((s, r) => s + r.d31To60, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-900">
                      {formatCurrencyVND(data.byRep.reduce((s, r) => s + r.d61To90, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-800">
                      {formatCurrencyVND(data.byRep.reduce((s, r) => s + r.over90, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Popup Nhắc nợ */}
      <PaymentReminderPopupModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        activeDebtRows={data?.customers?.map(c => ({
          customerId: c.customerId,
          customerCode: c.customerCode,
          customerName: c.customerName,
          salesRepId: c.salesRepId,
          salesRepName: c.salesRepName,
          creditLimit: c.creditLimit,
          maxDebtDays: 30,
          receivable: c.outstanding,
          collected: 0,
          outstanding: c.outstanding,
          uninvoiced: 0,
          d0To30: 0,
          d31To60: 0,
          d61To90: 0,
          over90: c.over90,
          overdueAmount: c.overdueAmount,
          oldestDebtDays: c.oldestDebtDays
        }))}
      />
    </div>
  );
};

export default OverdueDebtReportPage;
