import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { formatCurrencyVND } from '../../services/orderService';
import { SearchSelect } from '../../components/common/SearchSelect';
import {
  fetchCustomerInvoicesForDebt,
  fetchCustomerPortalCreditStatus
} from '../../services/paymentApi';
import type { CustomerInvoiceDebtItem } from '../../types/payment';
import type { CreditStatusResponse } from '../../types/agency';
import { InvoicePrintModal } from '../../components/payment/InvoicePrintModal';

export const CustomerDebtPortalView: React.FC = () => {

  // Dữ liệu công nợ & hoá đơn của chính đại lý
  const [creditStatus, setCreditStatus] = useState<CreditStatusResponse | null>(null);
  const [invoices, setInvoices] = useState<CustomerInvoiceDebtItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc & tìm kiếm
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal xem chi tiết hoá đơn
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoiceDebtItem | null>(null);
  const [printInvoiceId, setPrintInvoiceId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [credit, invList] = await Promise.all([
        fetchCustomerPortalCreditStatus(),
        fetchCustomerInvoicesForDebt('me')
      ]);
      setCreditStatus(credit);
      setInvoices(invList);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu công nợ đại lý:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lọc hoá đơn theo từ khoá và trạng thái
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Lọc trạng thái
      if (filterStatus !== 'ALL' && inv.status !== filterStatus) {
        return false;
      }

      // Tìm kiếm từ khoá theo mã hoá đơn, mã đơn hàng
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const codeMatch = inv.code.toLowerCase().includes(kw);
        const orderMatch = (inv.orderCodes || []).some((o) => o.toLowerCase().includes(kw));
        if (!codeMatch && !orderMatch) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, searchKeyword, filterStatus]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let totalDebt = 0;
    let overdueDebt = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      totalDebt += inv.remainingAmount || 0;
      if (inv.isOverdue && inv.remainingAmount > 0) {
        overdueDebt += inv.remainingAmount;
        overdueCount += 1;
      }
    }

    const creditLimit = creditStatus?.creditLimit || 100000000;
    const availableLimit = Math.max(0, creditLimit - totalDebt);

    return {
      totalDebt,
      overdueDebt,
      overdueCount,
      creditLimit,
      availableLimit,
      totalInvoices: invoices.length
    };
  }, [invoices, creditStatus]);

  // Hành động tải / in lại hoá đơn qua InvoicePrintModal chuẩn A4
  const handlePrintInvoice = (inv: CustomerInvoiceDebtItem) => {
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
            {formatCurrencyVND(stats.totalDebt)}
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
            {formatCurrencyVND(stats.creditLimit)}
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
            {formatCurrencyVND(stats.availableLimit)}
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
            {stats.overdueCount > 0 ? (
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
            {stats.overdueCount > 0 ? `${stats.overdueCount} hoá đơn quá hạn` : 'Không có nợ quá hạn'}
          </p>
        </div>
      </div>

      {/* 3. Bảng Danh Sách Hoá Đơn Kèm Tìm Kiếm & Lọc */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-orange-600" />
              <span>Danh sách hoá đơn bán hàng</span>
            </h3>
            <p className="text-xs text-gray-500">
              Tra cứu thông tin chi tiết từng hoá đơn, số tiền đã trả và tải lại chứng từ
            </p>
          </div>

          {/* Ô Tìm kiếm từ khoá (Gõ để tìm mã hoá đơn, đơn hàng) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Gõ để tìm mã hoá đơn, đơn hàng..."
                className="w-full pl-9 pr-3.5 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              />
            </div>

            {/* Dropdown Lọc trạng thái bằng SearchSelect */}
            <div className="min-w-[180px]">
              <SearchSelect
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                searchPlaceholder="Gõ để tìm trạng thái..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    <span className="inline-block w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Đang tải danh sách hoá đơn...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Không tìm thấy hoá đơn nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
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
                            className="p-1.5 rounded-lg border border-orange-300 hover:bg-orange-50 text-orange-700 transition cursor-pointer"
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
      </div>

      {/* Modal xem chi tiết hoá đơn */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative max-w-lg w-full bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-orange-600" />
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
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
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
