import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Search,
  Printer,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { formatCurrencyVND } from '../../services/orderService';
import { SearchSelect } from '../../components/common/SearchSelect';
import {
  fetchPortalDebtSummary,
  fetchPortalDebtInvoices,
  type PortalDebtSummary,
  type PortalInvoiceDebtItem
} from '../../services/portalApi';
import { InvoicePrintModal } from '../../components/payment/InvoicePrintModal';
import { AgencyReconciliationPanel } from '../../components/debt/AgencyReconciliationPanel';

export const CustomerDebtPortalView: React.FC = () => {
  // Dữ liệu tóm tắt công nợ & hạn mức từ Backend (/api/portal/debt)
  const [summary, setSummary] = useState<PortalDebtSummary | null>(null);

  // Danh sách hoá đơn theo trang (Backend phân trang & tìm kiếm)
  const [invoices, setInvoices] = useState<PortalInvoiceDebtItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tìm kiếm và bộ lọc (lọc cả FE & BE để tối ưu tốc độ và chính xác)
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Phân trang danh sách hoá đơn (0-indexed cho Backend)
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal xem chi tiết hoá đơn & in phiếu
  const [selectedInvoice, setSelectedInvoice] = useState<PortalInvoiceDebtItem | null>(null);
  const [printInvoiceId, setPrintInvoiceId] = useState<number | null>(null);

  // Debounce tìm kiếm từ khoá 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Reset trang về 0 khi từ khóa debounced hoặc trạng thái thay đổi
  useEffect(() => {
    setPage(0);
  }, [debouncedKeyword, filterStatus]);

  // 1. Tải tóm tắt công nợ đại lý
  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchPortalDebtSummary();
      setSummary(data);
    } catch (err) {
      console.warn('Lỗi tải tóm tắt công nợ đại lý:', err);
    }
  }, []);

  // 2. Tải danh sách hoá đơn có phân trang & tìm kiếm cả BE/FE
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPortalDebtInvoices({
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        keyword: debouncedKeyword.trim() || undefined,
        page,
        size: pageSize,
      });
      setInvoices(res.content || []);
      setTotalElements(res.totalElements ?? (res.content || []).length);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
    } catch (err) {
      console.warn('Lỗi tải danh sách hoá đơn công nợ:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, debouncedKeyword, page, pageSize]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Tính toán danh sách số trang hiển thị (chuẩn style phân trang lịch sử đơn)
  const pageNumbers = useMemo(() => {
    const total = totalPages;
    const current = page + 1;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }, [page, totalPages]);

  // Hành động tải / in lại hoá đơn qua InvoicePrintModal chuẩn A4
  const handlePrintInvoice = (inv: PortalInvoiceDebtItem) => {
    setPrintInvoiceId(inv.id);
  };

  return (
    <div className="space-y-6">
      {/* 4 Thẻ KPI Tóm tắt Công nợ & Hạn mức */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tổng còn nợ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng còn nợ</span>
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">
            {formatCurrencyVND(summary?.invoicedDebt ?? summary?.currentDebt ?? 0)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Số tiền đại lý cần thanh toán</p>
        </div>

        {/* Hạn mức công nợ được cấp */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Hạn mức được cấp</span>
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-gray-900">
            {formatCurrencyVND(summary?.creditLimit ?? 0)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Hạn mức tín dụng tối đa</p>
        </div>

        {/* Hạn mức còn lại được lấy hàng */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Còn được lấy hàng</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
            {formatCurrencyVND(summary?.availableCredit ?? 0)}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Hạn mức khả dụng để lên đơn mới</p>
        </div>

        {/* Tình trạng thanh toán */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tình trạng nợ</span>
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-sm sm:text-base font-bold mt-1">
            {summary?.overdue ? (
              <span className="text-rose-600 flex items-center gap-1 font-semibold">
                <AlertTriangle size={15} />
                <span>Có nợ quá hạn</span>
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 size={15} />
                <span>Bình thường</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {summary?.overdue
              ? `${summary.overdueCount ?? 0} hoá đơn quá hạn`
              : 'Không có nợ quá hạn'}
          </p>
        </div>
      </div>

      {/* S7-06: Biên bản đối chiếu công nợ - đại lý xác nhận hoặc báo lệch */}
      <AgencyReconciliationPanel />

      {/* 3. Bảng Danh Sách Hoá Đơn Kèm Tìm Kiếm & Lọc */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-[#F85606]" />
              <span>Danh sách hoá đơn bán hàng</span>
            </h3>
            <p className="text-xs text-gray-500">
              Tra cứu thông tin chi tiết từng hoá đơn, số tiền đã trả và tải lại chứng từ
            </p>
          </div>

          {/* Ô Tìm kiếm từ khoá (Gõ để tìm mã hoá đơn, đơn hàng) & Lọc trạng thái */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Gõ để tìm mã hoá đơn, đơn hàng..."
                className="w-full pl-9 pr-3.5 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F85606] transition"
              />
            </div>

            {/* Dropdown Lọc trạng thái bằng SearchSelect (bỏ ô search bên trong vì các trạng thái đã cố định) */}
            <div className="min-w-[180px]">
              <SearchSelect
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                searchable={false}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F85606]"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PARTIALLY_PAID">Thanh toán một phần</option>
                <option value="PAID">Đã thanh toán đủ</option>
              </SearchSelect>
            </div>
          </div>
        </div>

        {/* Bảng hoá đơn */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã hoá đơn</th>
                <th className="px-4 py-3">Ngày phát hành</th>
                <th className="px-4 py-3">Hạn thanh toán</th>
                <th className="px-4 py-3">Đơn hàng</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-right">Đã trả</th>
                <th className="px-4 py-3 text-right">Còn nợ</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    <span className="inline-block w-5 h-5 border-2 border-[#F85606] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Đang tải danh sách hoá đơn...</p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Không tìm thấy hoá đơn nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {inv.code}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {inv.invoiceDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${inv.isOverdue && inv.remainingAmount > 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                          {inv.dueDate}
                        </span>
                        {inv.isOverdue && inv.remainingAmount > 0 && (
                          <span className="block text-[10px] text-rose-600 font-bold">
                            Quá hạn {inv.overdueDays} ngày
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(inv.orderCodes || []).map((code) => (
                            <span
                              key={code}
                              className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px]"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        {formatCurrencyVND(inv.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {formatCurrencyVND(inv.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-rose-700">
                        {formatCurrencyVND(inv.remainingAmount)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            <span>Đã thanh toán</span>
                          </span>
                        ) : inv.status === 'PARTIALLY_PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock size={12} />
                            <span>Trả một phần</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <AlertTriangle size={12} />
                            <span>Chưa thanh toán</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 transition cursor-pointer"
                            title="Xem chi tiết hoá đơn"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Nút tải / in lại hoá đơn */}
                          <button
                            type="button"
                            onClick={() => handlePrintInvoice(inv)}
                            className="p-1.5 rounded-lg border border-orange-300 hover:bg-orange-50 text-[#F85606] transition cursor-pointer"
                            title="In hoặc tải lại hoá đơn PDF"
                          >
                            <Download size={15} />
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

        {/* PHÂN TRANG DANH SÁCH HOÁ ĐƠN (CHUẨN STYLE LỊCH SỬ ĐƠN HÀNG) */}
        {!loading && totalElements > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="text-gray-500">
              Hiển thị{' '}
              <strong className="text-gray-800">
                {totalElements === 0 ? 0 : page * pageSize + 1}
              </strong>{' '}
              -{' '}
              <strong className="text-gray-800">
                {Math.min((page + 1) * pageSize, totalElements)}
              </strong>{' '}
              trên tổng số <strong className="text-[#F85606]">{totalElements}</strong> hoá đơn
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-gray-500">
                <span>Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1 bg-white font-semibold text-gray-700 focus:outline-none focus:border-[#F85606] cursor-pointer"
                >
                  <option value={10}>10 hoá đơn/trang</option>
                  <option value={20}>20 hoá đơn/trang</option>
                  <option value={30}>30 hoá đơn/trang</option>
                  <option value={50}>50 hoá đơn/trang</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPage(0);
                  }}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Trang đầu"
                >
                  <ChevronsLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                  }}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft size={15} />
                </button>

                {pageNumbers.map((p, idx) =>
                  typeof p === 'number' ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPage(p - 1);
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        page === p - 1
                          ? 'bg-[#F85606] text-white shadow-xs'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={idx} className="w-5 text-center text-gray-400">
                      {p}
                    </span>
                  )
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                  }}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPage(totalPages - 1);
                  }}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Trang cuối"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal xem chi tiết hoá đơn */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative max-w-lg w-full bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[#F85606]" />
                <h3 className="text-base font-bold text-gray-900">
                  Hoá đơn: <span className="font-mono">{selectedInvoice.code}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Ngày phát hành:</span>
                <span className="font-semibold text-gray-800">{selectedInvoice.invoiceDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Hạn thanh toán:</span>
                <span className="font-semibold text-gray-800">{selectedInvoice.dueDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Đơn hàng liên quan:</span>
                <span className="font-mono font-semibold text-gray-800">
                  {(selectedInvoice.orderCodes || []).join(', ') || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Tổng tiền hoá đơn:</span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {formatCurrencyVND(selectedInvoice.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Số tiền đã trả:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatCurrencyVND(selectedInvoice.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Số tiền còn nợ:</span>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  {formatCurrencyVND(selectedInvoice.remainingAmount)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handlePrintInvoice(selectedInvoice)}
                className="px-4 py-2 bg-[#F85606] hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>In / Tải PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal in hoá đơn VAT chuẩn A4 */}
      <InvoicePrintModal
        isOpen={Boolean(printInvoiceId)}
        onClose={() => setPrintInvoiceId(null)}
        invoiceId={printInvoiceId}
      />
    </div>
  );
};
