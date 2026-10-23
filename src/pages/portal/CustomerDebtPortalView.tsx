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
  ChevronsRight,
  X,
  Package
} from 'lucide-react';
import { formatCurrencyVND } from '../../services/orderService';
import { SearchSelect } from '../../components/common/SearchSelect';
import {
  fetchPortalDebtSummary,
  fetchPortalDebtInvoices,
  type PortalDebtSummary,
  type PortalInvoiceDebtItem
} from '../../services/portalApi';
import { fetchInvoiceById } from '../../services/invoiceApi';
import type { InvoiceResponse } from '../../types/invoice';
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
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<number | null>(null);

  // Tải chi tiết hoá đơn (gồm danh sách sản phẩm) khi mở modal
  useEffect(() => {
    if (selectedInvoice?.id) {
      setLoadingDetail(true);
      fetchInvoiceById(selectedInvoice.id)
        .then((detail) => setInvoiceDetail(detail))
        .catch((err) => {
          console.warn('Lỗi tải chi tiết hoá đơn:', err);
          setInvoiceDetail(null);
        })
        .finally(() => setLoadingDetail(false));
    } else {
      setInvoiceDetail(null);
    }
  }, [selectedInvoice]);

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

  const currentDebtVal = summary?.currentDebt ?? summary?.invoicedDebt ?? 0;
  const invoicedDebtVal = summary?.invoicedDebt ?? 0;
  const uninvoicedDebtVal = summary?.uninvoicedDebt ?? 0;
  const creditLimitVal = summary?.creditLimit ?? 0;
  const availableCreditVal = summary?.availableCredit ?? 0;
  const isOverLimit = availableCreditVal < 0;

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
            {formatCurrencyVND(currentDebtVal)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex flex-col gap-0.5">
            <span>Nợ hoá đơn: <strong className="text-gray-800">{formatCurrencyVND(invoicedDebtVal)}</strong></span>
            {uninvoicedDebtVal > 0 && (
              <span>Đơn chưa xuất HĐ: <strong className="text-gray-800">{formatCurrencyVND(uninvoicedDebtVal)}</strong></span>
            )}
          </div>
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
            {formatCurrencyVND(creditLimitVal)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Hạn mức tín dụng tối đa</p>
        </div>

        {/* Hạn mức còn lại được lấy hàng */}
        <div
          className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-xs ${
            isOverLimit
              ? 'border-rose-200 bg-rose-50/20'
              : 'border-emerald-200 bg-emerald-50/20'
          }`}
        >
          <div className={`flex items-center justify-between mb-1 ${isOverLimit ? 'text-rose-700' : 'text-emerald-800'}`}>
            <span className="text-xs font-bold uppercase tracking-wider">Còn được lấy hàng</span>
            <div className={`p-1.5 rounded-lg ${isOverLimit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isOverLimit ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              isOverLimit ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {formatCurrencyVND(availableCreditVal)}
          </div>
          <p className={`text-[11px] mt-1 font-medium ${isOverLimit ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isOverLimit ? 'Đã vượt hạn mức tín dụng' : 'Hạn mức khả dụng để lên đơn mới'}
          </p>
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
              ? `${summary.overdueCount ?? 0} hoá đơn quá hạn${summary?.overdueDays ? ` (${summary.overdueDays} ngày)` : ''}`
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
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    <span className="inline-block w-5 h-5 border-2 border-[#F85606] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Đang tải danh sách hoá đơn...</p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
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
                      <td className="px-4 py-3">
                        {inv.orderCodes && inv.orderCodes.length > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {inv.orderCodes.slice(0, 4).map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px]"
                              >
                                {code}
                              </span>
                            ))}
                            {inv.orderCodes.length > 4 && (
                              <span
                                className="text-gray-400 font-bold tracking-widest text-[11px] px-1 select-none"
                                title={`Còn ${inv.orderCodes.length - 4} đơn hàng khác (bấm biểu tượng con mắt để xem chi tiết đầy đủ)`}
                              >
                                .......
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">-</span>
                        )}
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

      {/* Modal xem chi tiết hoá đơn (To chiếm khoảng 60% diện tích màn hình, hiện chi tiết đầy đủ mặt hàng) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full md:w-[60%] max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 text-[#F85606] rounded-xl">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-gray-900">
                      Hoá đơn: <span className="font-mono text-[#F85606]">{selectedInvoice.code}</span>
                    </h3>
                    {selectedInvoice.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={12} />
                        <span>Đã thanh toán đủ</span>
                      </span>
                    ) : selectedInvoice.status === 'PARTIALLY_PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        <Clock size={12} />
                        <span>Trả một phần</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        <AlertTriangle size={12} />
                        <span>Chưa thanh toán</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Thông tin chứng từ hoá đơn bán hàng và danh sách sản phẩm giao
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition cursor-pointer"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* 4 Thẻ KPI Tóm Tắt Thông Tin Hoá Đơn */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-1">Ngày phát hành</span>
                  <span className="font-bold text-gray-800 text-sm font-mono">
                    {selectedInvoice.invoiceDate || 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-1">Hạn thanh toán</span>
                  <span className={`font-bold text-sm font-mono ${
                    selectedInvoice.isOverdue && selectedInvoice.remainingAmount > 0
                      ? 'text-rose-600'
                      : 'text-gray-800'
                  }`}>
                    {selectedInvoice.dueDate || 'N/A'}
                  </span>
                  {selectedInvoice.isOverdue && selectedInvoice.remainingAmount > 0 && (
                    <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                      ⚠️ Quá hạn {selectedInvoice.overdueDays} ngày
                    </span>
                  )}
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-1">Tổng tiền hoá đơn</span>
                  <span className="font-bold font-mono text-gray-900 text-sm">
                    {formatCurrencyVND(selectedInvoice.totalAmount)}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${
                  selectedInvoice.remainingAmount > 0
                    ? 'bg-rose-50/50 border-rose-100'
                    : 'bg-emerald-50/50 border-emerald-100'
                }`}>
                  <span className="text-[11px] text-gray-500 block mb-1">
                    {selectedInvoice.remainingAmount > 0 ? 'Số tiền còn nợ' : 'Đã thanh toán xong'}
                  </span>
                  <span className={`font-bold font-mono text-sm ${
                    selectedInvoice.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}>
                    {formatCurrencyVND(selectedInvoice.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Thông tin thanh toán & đối soát */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200">
                  <span className="text-gray-400 text-[11px] block mb-1">Tiến độ thanh toán</span>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span>Đã trả: <strong className="font-mono text-emerald-700">{formatCurrencyVND(selectedInvoice.paidAmount)}</strong></span>
                    <span>Tổng: <strong className="font-mono text-gray-800">{formatCurrencyVND(selectedInvoice.totalAmount)}</strong></span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          selectedInvoice.totalAmount > 0
                            ? (selectedInvoice.paidAmount / selectedInvoice.totalAmount) * 100
                            : 0
                        )}%`
                      }}
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <span className="text-gray-400 text-[11px] block mb-1">Kỳ mua hàng</span>
                  <div className="text-xs text-gray-800 font-medium">
                    {invoiceDetail?.periodFrom && invoiceDetail?.periodTo ? (
                      <span>Từ <strong className="font-mono">{invoiceDetail.periodFrom}</strong> đến <strong className="font-mono">{invoiceDetail.periodTo}</strong></span>
                    ) : (
                      <span>Theo các đơn hàng thực giao</span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1">
                    Người phát hành: <strong className="text-gray-700">{invoiceDetail?.issuedByUsername || 'Kế toán hệ thống'}</strong>
                  </span>
                </div>
              </div>

              {/* Các đơn hàng liên quan */}
              <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                    <span>Đơn hàng liên quan</span>
                    <span className="text-gray-400 font-normal">
                      ({(selectedInvoice.orderCodes || []).length} đơn)
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {(selectedInvoice.orderCodes || []).length > 0 ? (
                    selectedInvoice.orderCodes.map((code) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-mono text-[11px] shadow-2xs"
                      >
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">Không có mã đơn hàng</span>
                  )}
                </div>
              </div>

              {/* Chi tiết danh sách mặt hàng / sản phẩm */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Package size={15} className="text-[#F85606]" />
                    <span>Chi tiết các mặt hàng trên hoá đơn</span>
                    {invoiceDetail?.lines && (
                      <span className="text-xs text-gray-500 font-normal">
                        ({invoiceDetail.lines.length} dòng hàng)
                      </span>
                    )}
                  </h4>
                </div>

                {loadingDetail ? (
                  <div className="py-10 text-center text-gray-400 border border-gray-200 rounded-xl bg-gray-50/50">
                    <span className="inline-block w-5 h-5 border-2 border-[#F85606] border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs">Đang tải danh sách mặt hàng chi tiết...</p>
                  </div>
                ) : invoiceDetail?.lines && invoiceDetail.lines.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-10">STT</th>
                          <th className="px-3 py-2.5">Mã đơn</th>
                          <th className="px-3 py-2.5">Mã SKU</th>
                          <th className="px-3 py-2.5">Tên sản phẩm</th>
                          <th className="px-3 py-2.5 text-center">ĐVT</th>
                          <th className="px-3 py-2.5 text-right">Số lượng</th>
                          <th className="px-3 py-2.5 text-right">Đơn giá</th>
                          <th className="px-3 py-2.5 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoiceDetail.lines.map((line, idx) => (
                          <tr key={line.orderLineId || idx} className="hover:bg-gray-50/80">
                            <td className="px-3 py-2.5 text-center text-gray-400">{line.lineNo || idx + 1}</td>
                            <td className="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap">{line.orderCode}</td>
                            <td className="px-3 py-2.5 font-mono font-medium text-gray-800 whitespace-nowrap">{line.productSku}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-900">{line.productName}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">{line.unitName}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900">{line.quantity}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-700">{formatCurrencyVND(line.pricePerUnit)}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900">{formatCurrencyVND(line.netAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                        <tr>
                          <td colSpan={7} className="px-3 py-2.5 text-right text-gray-700">
                            Tổng cộng tiền hàng:
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-gray-900 text-xs">
                            {formatCurrencyVND(invoiceDetail.subtotal || selectedInvoice.totalAmount)}
                          </td>
                        </tr>
                        {invoiceDetail.discountTotal > 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-2 text-right text-gray-600">
                              Tổng chiết khấu:
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-700 text-xs">
                              -{formatCurrencyVND(invoiceDetail.discountTotal)}
                            </td>
                          </tr>
                        )}
                        <tr className="bg-orange-50/50 text-[#F85606]">
                          <td colSpan={7} className="px-3 py-2.5 text-right font-black">
                            Tổng thanh toán hoá đơn:
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-[#F85606]">
                            {formatCurrencyVND(selectedInvoice.totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-gray-500">
                    Không có dòng sản phẩm chi tiết cho hoá đơn này.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50 border-t border-gray-200 shrink-0">
              <div className="text-xs text-gray-500 hidden sm:block">
                Hoá đơn tài chính hợp lệ do Công ty phát hành
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  className="px-4 py-2 bg-[#F85606] hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Printer size={15} />
                  <span>In / Tải PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-300 text-xs cursor-pointer transition"
                >
                  Đóng
                </button>
              </div>
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
