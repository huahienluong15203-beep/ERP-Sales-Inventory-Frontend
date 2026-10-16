import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  RefreshCw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import type { InvoiceSummaryResponse } from '../../types/invoice';
import { searchInvoices } from '../../services/invoiceApi';
import { fetchAgencies } from '../../services/agencyApi';
import type { Agency } from '../../types/agency';
import { InvoicePrintModal } from '../../components/payment/InvoicePrintModal';

export const InvoiceManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, currentRole } = useAuth();

  const isAccountantOrAdmin = ['ROLE_ACCOUNTANT', 'ROLE_ADMIN'].includes(currentRole ?? '');

  // Dữ liệu bảng & phân trang
  const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Bộ lọc
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Danh sách đại lý cho filter
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // Modal in hoá đơn
  const [printModalInvoiceId, setPrintModalInvoiceId] = useState<number | null>(null);

  // Tải danh sách đại lý
  useEffect(() => {
    fetchAgencies({ page: 0, size: 100 })
      .then((res) => setAgencies(res.content || []))
      .catch(() => {});
  }, []);

  // Tải danh sách hoá đơn
  const loadInvoices = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await searchInvoices({
        customerId: selectedCustomerId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        keyword: keyword.trim() || undefined,
        page: targetPage,
        size: pageSize
      });
      setInvoices(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
      setPage(res.page || 0);
    } catch (err: any) {
      showToast('Lỗi tải danh sách', err.message || 'Không thể tải hoá đơn', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices(0);
  }, [selectedCustomerId, fromDate, toDate, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices(0);
  };

  const handleResetFilter = () => {
    setKeyword('');
    setSelectedCustomerId(undefined);
    setFromDate('');
    setToDate('');
  };

  // Tính tổng tiền các hoá đơn trong trang hiện tại
  const currentPageTotal = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto pb-16">
      {/* 1. Header & Actions - Tinh gọn theo yêu cầu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center font-black">
            <Receipt className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Quản lý hoá đơn bán hàng
          </h1>
        </div>

        {/* Nút hành động cùng hàng: Tải lại, Lập chứng từ điều chỉnh, Lập HĐ mới */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadInvoices(page)}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAccountantOrAdmin && (
            <>
              <button
                onClick={() => navigate('/payments/adjustments')}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition cursor-pointer"
                title="Lập chứng từ điều chỉnh công nợ khi có sai lệch hoặc trả hàng"
              >
                <FileText className="w-4 h-4 text-[#F85606]" />
                <span>Lập chứng từ điều chỉnh</span>
              </button>

              <button
                onClick={() => navigate('/invoices/create')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Lập hoá đơn mới (Gộp đơn)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. KPI Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F85606] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
              Tổng số hoá đơn
            </div>
            <div className="text-lg font-black text-gray-900">{totalElements} bản ghi</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
              Doanh số trang hiện tại
            </div>
            <div className="text-lg font-black text-[#F85606] font-mono">
              {currentPageTotal.toLocaleString('vi-VN')} đ
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
              Trạng thái hệ thống
            </div>
            <div className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Đồng bộ số thực giao (AC1)
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bộ Lọc Tìm Kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo số HĐ (HD2026-...), tên hoặc mã đại lý..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-[#F85606] focus:outline-none"
            />
          </div>

          {/* Customer select */}
          <div>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-[#F85606] focus:outline-none bg-white"
            >
              <option value="">Tất cả đại lý</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-[#F85606] focus:outline-none font-mono"
              placeholder="Từ ngày"
            />
          </div>

          {/* To date */}
          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-[#F85606] focus:outline-none font-mono"
              placeholder="Đến ngày"
            />
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span>Tìm thấy {totalElements} hoá đơn</span>
          {(keyword || selectedCustomerId || fromDate || toDate) && (
            <button
              onClick={handleResetFilter}
              className="text-[#F85606] font-bold hover:underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 5. Bảng Danh Sách Hoá Đơn */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 w-36">Số hoá đơn (AC2)</th>
                <th className="py-3 px-3 w-28">Ngày lập</th>
                <th className="py-3 px-4">Đại lý / Khách hàng</th>
                <th className="py-3 px-3 text-center w-24">Số dòng</th>
                <th className="py-3 px-4 text-right w-36">Tổng tiền (VND)</th>
                <th className="py-3 px-4 w-40">Người phát hành</th>
                <th className="py-3 px-3 text-center w-28">Trạng thái</th>
                <th className="py-3 px-4 text-center w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F85606]" />
                    Đang tải danh sách hoá đơn...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-700">Chưa có hoá đơn nào phù hợp</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Hãy bấm &ldquo;+ Lập Hoá Đơn Mới&rdquo; để xuất hoá đơn cho các phiếu giao đã hoàn tất.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-black text-[#F85606]">
                      {inv.code}
                    </td>
                    <td className="py-3 px-3 text-gray-600 font-mono">
                      {inv.invoiceDate || ''}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{inv.customerName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">Mã: {inv.customerCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-700 font-medium">
                      {inv.lineCount} dòng
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-gray-900 text-sm">
                      {inv.totalAmount?.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div className="font-semibold text-gray-800">{inv.issuedByUsername}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {inv.issuedAt ? new Date(inv.issuedAt).toLocaleString('vi-VN') : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đã phát hành
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPrintModalInvoiceId(inv.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                          title="Xem chi tiết & In hoá đơn A4 / Lưu PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In / PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <div>
              Trang <strong className="text-gray-900">{page + 1}</strong> / {totalPages} (Tổng{' '}
              {totalElements} hoá đơn)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadInvoices(page - 1)}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadInvoices(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal In Hoá Đơn A4 */}
      <InvoicePrintModal
        isOpen={Boolean(printModalInvoiceId)}
        onClose={() => setPrintModalInvoiceId(null)}
        invoiceId={printModalInvoiceId}
      />
    </div>
  );
};
