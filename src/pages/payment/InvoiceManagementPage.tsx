import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  RefreshCw,
  CheckCircle2,
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
import { SearchSelect } from '../../components/common/SearchSelect';
import { Pagination } from '../../components/common/Pagination';
import { RowActionMenu } from '../../components/common/RowActionMenu';

export const InvoiceManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, currentRole, user } = useAuth();

  const isAccountantOrAdmin =
    ['ROLE_ACCOUNTANT', 'ROLE_ADMIN'].includes(currentRole ?? '') ||
    Boolean(user?.roles?.some((r) => ['ROLE_ACCOUNTANT', 'ROLE_ADMIN'].includes(r)));

  // Dữ liệu bảng & phân trang
  const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Bộ lọc
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Danh sách đại lý cho filter (hỗ trợ tìm kiếm FE & BE + tải phân trang theo cuộn)
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyPage, setAgencyPage] = useState<number>(0);
  const [hasMoreAgencies, setHasMoreAgencies] = useState<boolean>(true);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);
  const [agencySearchKeyword, setAgencySearchKeyword] = useState<string>('');

  // Modal in hoá đơn
  const [printModalInvoiceId, setPrintModalInvoiceId] = useState<number | null>(null);

  // Tải danh sách đại lý (FE & BE search + cuộn load thêm)
  const loadFilterAgencies = async (targetPage: number, kw: string, isAppend: boolean) => {
    setLoadingAgencies(true);
    try {
      const res = await fetchAgencies({
        page: targetPage,
        size: 20,
        keyword: kw.trim() || undefined,
        status: 'ACTIVE'
      });
      const items = res.content || [];
      setAgencies((prev) => {
        if (!isAppend) return items;
        const existingIds = new Set(prev.map((a) => a.id));
        return [...prev, ...items.filter((a) => !existingIds.has(a.id))];
      });
      setAgencyPage(targetPage);
      setHasMoreAgencies(targetPage + 1 < res.totalPages);
    } catch {
      // Giữ nguyên danh sách hiện tại nếu có lỗi
    } finally {
      setLoadingAgencies(false);
    }
  };

  useEffect(() => {
    loadFilterAgencies(0, '', false);
  }, []);

  const handleAgencySearch = (val: string) => {
    setAgencySearchKeyword(val);
    loadFilterAgencies(0, val, false);
  };

  const handleAgencyLoadMore = () => {
    if (loadingAgencies || !hasMoreAgencies) return;
    loadFilterAgencies(agencyPage + 1, agencySearchKeyword, true);
  };

  // Tải danh sách hoá đơn
  const loadInvoices = async (targetPage = page, currentSize = pageSize) => {
    setLoading(true);
    try {
      const res = await searchInvoices({
        customerId: selectedCustomerId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        keyword: keyword.trim() || undefined,
        page: targetPage,
        size: currentSize
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
    loadInvoices(0, pageSize);
  }, [selectedCustomerId, fromDate, toDate, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices(0, pageSize);
  };

  const handleResetFilter = () => {
    setKeyword('');
    setSelectedCustomerId(undefined);
    setFromDate('');
    setToDate('');
    setAgencySearchKeyword('');
    loadFilterAgencies(0, '', false);
  };

  // Tính tổng tiền các hoá đơn trong trang hiện tại
  const currentPageTotal = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto pb-16">
      {/* 1. Header & Actions - Tinh gọn chỉ nút thao tác */}
      <div className="flex items-center justify-end gap-2.5 flex-wrap">
        <button
          onClick={() => loadInvoices(page)}
          className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
          title="Tải lại danh sách"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {isAccountantOrAdmin && (
          <button
            onClick={() => navigate('/invoices/create')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span> Lập hoá đơn mới</span>
          </button>
        )}
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
              Đồng bộ số thực giao
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

          {/* Customer select có tìm kiếm FE & BE + cuộn load thêm */}
          <div>
            <SearchSelect
              value={selectedCustomerId ?? ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-[#F85606] focus:outline-none bg-white"
              searchPlaceholder="Tìm tên hoặc mã đại lý..."
              onSearchChange={handleAgencySearch}
              onLoadMore={handleAgencyLoadMore}
              hasMore={hasMoreAgencies}
              isLoading={loadingAgencies}
            >
              <option value="">Tất cả đại lý</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </SearchSelect>
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
                <th className="py-3 px-4 w-36">Số hoá đơn </th>
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
                      <div className="flex items-center justify-center">
                        <RowActionMenu
                          title="Thao tác hoá đơn"
                          items={[
                            {
                              label: 'In / Xuất PDF',
                              icon: <Printer size={14} className="text-[#F85606]" />,
                              onClick: () => setPrintModalInvoiceId(inv.id),
                              title: 'Xem chi tiết & In hoá đơn A4 / Lưu PDF'
                            },
                            {
                              label: 'Lập chứng từ điều chỉnh',
                              icon: <FileText size={14} className="text-orange-600" />,
                              onClick: () => navigate(`/sales-returns/create?invoiceId=${inv.id}`),
                              title: 'Lập chứng từ điều chỉnh / trả hàng cho hoá đơn này',
                              hidden: !isAccountantOrAdmin
                            }
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang chuẩn hệ thống */}
        <div className="p-4 border-t border-gray-100">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={pageSize}
            itemLabel="hoá đơn"
            onPageChange={(p) => loadInvoices(p, pageSize)}
            onSizeChange={(s) => {
              setPageSize(s);
              loadInvoices(0, s);
            }}
            disabled={loading}
          />
        </div>
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
