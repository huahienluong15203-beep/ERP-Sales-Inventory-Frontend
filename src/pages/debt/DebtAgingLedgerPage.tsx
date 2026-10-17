import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { fetchDebtLedger, downloadDebtLedgerExcel } from '../../services/debtLedgerApi';
import type { DebtLedgerResponse, DebtLedgerFilterParams } from '../../types/debtLedger';
import { PaymentReminderPopupModal } from '../../components/debt/PaymentReminderPopupModal';

export const DebtAgingLedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [data, setData] = useState<DebtLedgerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);

  // Bộ lọc
  const [keyword, setKeyword] = useState<string>('');
  const [bucket, setBucket] = useState<'ALL' | 'D0_30' | 'D31_60' | 'D61_90' | 'D90_PLUS'>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [includeSettled, setIncludeSettled] = useState<boolean>(false);
  const [sort, setSort] = useState<'OLDEST' | 'OUTSTANDING' | 'OVERDUE' | 'CODE'>('OLDEST');
  const [page, setPage] = useState<number>(0);

  const loadData = async (newPage: number = page) => {
    setLoading(true);
    try {
      const params: DebtLedgerFilterParams = {
        keyword: keyword.trim() || undefined,
        bucket,
        overdueOnly,
        includeSettled,
        sort,
        page: newPage,
        size: 50
      };
      const res = await fetchDebtLedger(params);
      setData(res);
      setPage(newPage);
    } catch (err: any) {
      showToast('Lỗi tải sổ công nợ', err.message || 'Không thể tải sổ công nợ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(0);
  }, [bucket, overdueOnly, includeSettled, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadDebtLedgerExcel({
        keyword: keyword.trim() || undefined,
        bucket,
        overdueOnly,
        includeSettled,
        sort
      });
      showToast('Xuất Excel thành công', 'Tệp sổ công nợ và tuổi nợ đã được tải về', 'success');
    } catch (err: any) {
      showToast('Lỗi xuất Excel', err.message || 'Không thể xuất tệp', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 antialiased max-w-7xl mx-auto pb-16">
      {/* 1. Header tinh gọn chỉ nút Quay lại và nút thao tác */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Quay lại danh sách hoá đơn"
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(page)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Xuất bảng Excel sổ công nợ & tuổi nợ"
          >
            <FileSpreadsheet size={15} className={exporting ? 'animate-spin' : 'text-emerald-600'} />
            <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className="px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="Xem danh sách nhắc nợ đại lý"
          >
            <Clock size={15} />
            <span>Nhắc nợ</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/debts/reconciliation')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <FileText size={15} />
            <span>Đối chiếu công nợ</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ thống kê KPI tổng quan công nợ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={13} className="text-gray-400" />
            <span>Tổng phải thu</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
            {formatCurrencyVND(data?.totals.receivable || 0)}
          </div>
          <div className="text-[11px] text-gray-500">Bao gồm cả đơn đã duyệt chưa xuất HĐ</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Đã thu hồi</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {formatCurrencyVND(data?.totals.collected || 0)}
          </div>
          <div className="text-[11px] text-gray-500">Tiền đã thanh toán thực tế</div>
        </div>

        <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} className="text-[#F85606]" />
            <span>Tổng nợ còn lại</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#F85606] font-mono">
            {formatCurrencyVND(data?.totals.outstanding || 0)}
          </div>
          <div className="text-[11px] text-orange-900">
            {data?.totals.customerCount || 0} đại lý đang phát sinh công nợ
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={13} className="text-rose-600" />
            <span>Nợ quá hạn</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            {formatCurrencyVND(data?.totals.overdueAmount || 0)}
          </div>
          <div className="text-[11px] text-rose-900">Vượt số ngày nợ quy định của đại lý</div>
        </div>
      </div>

      {/* 3. Bộ lọc tìm kiếm & Phân tích tuổi nợ */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo mã hoặc tên đại lý..."
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606] focus:bg-white transition"
            />
          </form>

          {/* Sắp xếp */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e: any) => setSort(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#F85606]"
            >
              <option value="OLDEST">Nợ lâu nhất trước (Mặc định)</option>
              <option value="OUTSTANDING">Còn nợ nhiều nhất</option>
              <option value="OVERDUE">Nợ quá hạn nhiều nhất</option>
              <option value="CODE">Mã đại lý (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Nhóm tuổi nợ & Checkboxes */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          {/* Nhóm tuổi nợ */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs text-gray-500 font-semibold mr-1 flex items-center gap-1">
              <Filter size={13} /> Tuổi nợ:
            </span>
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'D0_30', label: '0–30 ngày' },
              { key: 'D31_60', label: '31–60 ngày' },
              { key: 'D61_90', label: '61–90 ngày' },
              { key: 'D90_PLUS', label: 'Trên 90 ngày' }
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setBucket(f.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  bucket === f.key
                    ? 'bg-[#F85606] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Checkbox lọc riêng quá hạn & tất toán */}
          <div className="flex items-center gap-4 text-xs font-medium text-gray-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="w-4 h-4 accent-[#F85606] rounded border-gray-300 focus:ring-orange-500"
              />
              <span className={overdueOnly ? 'font-bold text-rose-700' : ''}>
                Chỉ xem nợ quá hạn
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSettled}
                onChange={(e) => setIncludeSettled(e.target.checked)}
                className="w-4 h-4 accent-[#F85606] rounded border-gray-300 focus:ring-orange-500"
              />
              <span>Bao gồm đại lý đã tất toán</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. Data Grid Sổ công nợ & Tuổi nợ (Kèm hàng tổng cộng ở chân bảng) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-44">Đại lý / Khách hàng</th>
                <th className="py-3 px-2 w-28">NVKD</th>
                <th className="py-3 px-2 text-right w-24">Hạn mức</th>
                <th className="py-3 px-2 text-right w-24">Phải thu</th>
                <th className="py-3 px-2 text-right w-24">Đã thu</th>
                <th className="py-3 px-2 text-right w-28 bg-orange-50/40 text-[#F85606]">
                  Còn nợ
                </th>
                <th className="py-3 px-2 text-right w-24">0–30 ngày</th>
                <th className="py-3 px-2 text-right w-24">31–60 ngày</th>
                <th className="py-3 px-2 text-right w-24">61–90 ngày</th>
                <th className="py-3 px-2 text-right w-24 text-rose-700">&gt;90 ngày</th>
                <th className="py-3 px-2 text-right w-28 text-rose-700 bg-rose-50/30">
                  Quá hạn
                </th>
                <th className="py-3 px-2 text-center w-20">Đối chiếu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F85606]" />
                    Đang tính toán sổ công nợ & phân loại tuổi nợ...
                  </td>
                </tr>
              ) : !data || data.rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-gray-400">
                    Không có đại lý nào phù hợp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => {
                  const isOverdue = row.overdueAmount > 0;
                  return (
                    <tr
                      key={row.customerId}
                      className={`hover:bg-orange-50/20 transition-colors ${
                        isOverdue ? 'bg-rose-50/10' : ''
                      }`}
                    >
                      {/* Đại lý */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{row.customerName}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          Mã: <span className="font-semibold text-gray-600">{row.customerCode}</span>
                          {row.maxDebtDays ? ` • Tối đa ${row.maxDebtDays} ngày` : ''}
                        </div>
                      </td>

                      {/* NVKD */}
                      <td className="py-3 px-2 text-gray-600 truncate max-w-[110px]" title={row.salesRepName || ''}>
                        {row.salesRepName || '-'}
                      </td>

                      {/* Hạn mức */}
                      <td className="py-3 px-2 text-right font-mono text-gray-500">
                        {row.creditLimit ? formatCurrencyVND(row.creditLimit) : '0 đ'}
                      </td>

                      {/* Phải thu */}
                      <td className="py-3 px-2 text-right font-mono text-gray-700">
                        {formatCurrencyVND(row.receivable)}
                      </td>

                      {/* Đã thu */}
                      <td className="py-3 px-2 text-right font-mono text-emerald-700">
                        {formatCurrencyVND(row.collected)}
                      </td>

                      {/* Còn nợ */}
                      <td className="py-3 px-2 text-right font-mono font-black text-[#F85606] bg-orange-50/30">
                        {formatCurrencyVND(row.outstanding)}
                      </td>

                      {/* 0-30 ngày */}
                      <td className="py-3 px-2 text-right font-mono text-gray-700">
                        {row.d0To30 > 0 ? formatCurrencyVND(row.d0To30) : '-'}
                      </td>

                      {/* 31-60 ngày */}
                      <td className="py-3 px-2 text-right font-mono text-gray-700">
                        {row.d31To60 > 0 ? formatCurrencyVND(row.d31To60) : '-'}
                      </td>

                      {/* 61-90 ngày */}
                      <td className="py-3 px-2 text-right font-mono text-amber-800">
                        {row.d61To90 > 0 ? formatCurrencyVND(row.d61To90) : '-'}
                      </td>

                      {/* >90 ngày */}
                      <td className="py-3 px-2 text-right font-mono font-bold text-rose-700">
                        {row.over90 > 0 ? formatCurrencyVND(row.over90) : '-'}
                      </td>

                      {/* Nợ quá hạn */}
                      <td className="py-3 px-2 text-right font-mono font-black text-rose-700 bg-rose-50/30">
                        {row.overdueAmount > 0 ? formatCurrencyVND(row.overdueAmount) : '-'}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/debts/reconciliation?customerId=${row.customerId}`)}
                          className="p-1.5 hover:bg-orange-50 text-[#F85606] rounded-lg transition cursor-pointer"
                          title="Lập biên bản đối chiếu công nợ cho đại lý này"
                        >
                          <FileText size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* 5. Chân bảng: Hiển thị dòng TỔNG CỘNG (AC) */}
            {data && data.totals && (
              <tfoot className="bg-gray-100/90 border-t-2 border-gray-300 font-bold text-[11px] text-gray-900">
                <tr>
                  <td colSpan={3} className="py-3 px-3 uppercase font-black text-gray-950">
                    TỔNG CỘNG ({data.totals.customerCount} đại lý):
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {formatCurrencyVND(data.totals.receivable)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-emerald-800">
                    {formatCurrencyVND(data.totals.collected)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-[#F85606] bg-orange-100/40">
                    {formatCurrencyVND(data.totals.outstanding)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {formatCurrencyVND(data.totals.d0To30)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {formatCurrencyVND(data.totals.d31To60)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-900">
                    {formatCurrencyVND(data.totals.d61To90)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-rose-800">
                    {formatCurrencyVND(data.totals.over90)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-rose-800 bg-rose-100/40">
                    {formatCurrencyVND(data.totals.overdueAmount)}
                  </td>
                  <td className="py-3 px-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Phân trang */}
        {data && data.totalPages > 1 && (
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Trang <strong className="text-gray-900">{page + 1}</strong> / {data.totalPages} (Tổng{' '}
              {data.totalElements} đại lý)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => loadData(page - 1)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages - 1}
                onClick={() => loadData(page + 1)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Popup Nhắc Hạn Thanh Toán Tự Động */}
      <PaymentReminderPopupModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        activeDebtRows={data?.rows?.filter((r) => r.outstanding > 0)}
      />
    </div>
  );
};

export default DebtAgingLedgerPage;
