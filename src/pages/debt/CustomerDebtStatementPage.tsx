import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { fetchAgencies } from '../../services/agencyApi';
import type { Agency } from '../../types/agency';
import type { CustomerDebtStatement } from '../../types/customerDebtStatement';
import {
  fetchCustomerDebtStatement,
  exportCustomerDebtStatementExcel
} from '../../services/customerDebtStatementApi';
import { CustomerDebtStatementPrintModal } from '../../components/debt/CustomerDebtStatementPrintModal';

export const CustomerDebtStatementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Danh sách đại lý phục vụ chọn nhanh
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('customerId');
    return cid && /^\d+$/.test(cid) ? Number(cid) : 1;
  });

  // Bộ lọc khoảng ngày (Mặc định: từ đầu tháng hiện tại đến hôm nay)
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Dữ liệu sổ chi tiết
  const [statement, setStatement] = useState<CustomerDebtStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Tải danh sách đại lý khi vào trang
  useEffect(() => {
    const loadAgencies = async () => {
      setLoadingAgencies(true);
      try {
        const res = await fetchAgencies({ page: 0, size: 100, status: 'ACTIVE' });
        setAgencies(res.content || []);
      } catch {
        // ignore
      } finally {
        setLoadingAgencies(false);
      }
    };
    loadAgencies();
  }, []);

  // Tải dữ liệu sổ chi tiết công nợ
  const loadStatementData = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      const data = await fetchCustomerDebtStatement({
        customerId: selectedCustomerId,
        fromDate,
        toDate
      });
      setStatement(data);
    } catch (err: any) {
      showToast('Lỗi tải sổ chi tiết', err.message || 'Không thể tải sổ chi tiết công nợ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatementData();
  }, [selectedCustomerId, fromDate, toDate]);

  // Thiết lập nhanh khoảng ngày
  const setQuickDateRange = (type: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR') => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (type === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'THIS_QUARTER') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      end = new Date(now.getFullYear(), qMonth + 3, 0);
    } else {
      // THIS_YEAR
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    if (!statement) return;
    try {
      exportCustomerDebtStatementExcel(statement);
      showToast('Xuất Excel thành công', 'Tệp sổ chi tiết công nợ đã được tải về', 'success');
    } catch (err: any) {
      showToast('Lỗi xuất Excel', err.message || 'Không thể xuất file Excel', 'error');
    }
  };

  return (
    <div className="space-y-5 antialiased max-w-7xl mx-auto pb-16">
      {/* 1. Thanh thao tác trên cùng */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={loadStatementData}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={!statement || loading}
          className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
          title="Xuất file Excel sổ chi tiết công nợ"
        >
          <FileSpreadsheet size={15} className="text-emerald-700" />
          <span>Xuất Excel</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          disabled={!statement || loading}
          className="px-4 py-2 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
          title="Xem trước mẫu in chuẩn A4 và in ra PDF"
        >
          <Printer size={15} />
          <span>In sổ / Xuất PDF (A4)</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/debts/reconciliation?customerId=${selectedCustomerId}`)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Lập biên bản đối chiếu công nợ có chữ ký"
        >
          <span>Biên bản đối chiếu</span>
        </button>
      </div>

      {/* 2. Thanh lọc: Chọn Đại lý & Khoảng thời gian (AC 2) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Chọn đại lý */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 h-5">
              <Building2 size={13} className="text-[#F85606]" />
              <span>Chọn đại lý / Khách hàng:</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
              disabled={loadingAgencies}
              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#F85606] focus:bg-white transition cursor-pointer"
            >
              {agencies.length > 0 ? (
                agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))
              ) : (
                <>
                  <option value={1}>Đại lý Bia Nước Giải Khát Tuấn Hưng (DL-001)</option>
                  <option value={2}>Đại lý Thực phẩm & Bách hóa Mai Linh (DL-002)</option>
                  <option value={3}>KhoMega - Trung tâm phân phối Miền Bắc (DN-HN-003)</option>
                  <option value={4}>Công ty TNHH Water Thành Công (DL-TN-THANHCONG)</option>
                  <option value={5}>Kho Đài Tư - Tổng kho Thực phẩm (DL-HN-001)</option>
                </>
              )}
            </select>
          </div>

          {/* Chọn khoảng ngày */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 h-5">
              <Calendar size={13} className="text-[#F85606]" />
              <span>Khoảng thời gian đối soát:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-[#F85606]"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-[#F85606]"
              />
            </div>
          </div>

          {/* Các nút chọn nhanh kỳ đối soát */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 h-5">
              <Clock size={13} className="text-[#F85606]" />
              <span>Chọn nhanh:</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5 h-9">
              <button
                type="button"
                onClick={() => setQuickDateRange('THIS_MONTH')}
                className="h-9 px-1 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-[#F85606] hover:border-orange-200 border border-gray-200 text-gray-700 text-xs font-medium transition cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95 shadow-2xs"
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('LAST_MONTH')}
                className="h-9 px-1 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-[#F85606] hover:border-orange-200 border border-gray-200 text-gray-700 text-xs font-medium transition cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95 shadow-2xs"
              >
                Tháng trước
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('THIS_QUARTER')}
                className="h-9 px-1 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-[#F85606] hover:border-orange-200 border border-gray-200 text-gray-700 text-xs font-medium transition cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95 shadow-2xs"
              >
                Quý này
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('THIS_YEAR')}
                className="h-9 px-1 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-[#F85606] hover:border-orange-200 border border-gray-200 text-gray-700 text-xs font-medium transition cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95 shadow-2xs"
              >
                Năm nay
              </button>
            </div>
          </div>
        </div>

        {/* Thông tin đại lý hiện tại */}
        {statement && (
          <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-gray-600 bg-gray-50/60 p-3 rounded-xl">
            <div>
              <span className="text-gray-400">Địa chỉ: </span>
              <span className="text-gray-800 font-medium">{statement.customerAddress || 'Chưa cập nhật'}</span>
            </div>
            <div>
              <span className="text-gray-400">MST: </span>
              <span className="font-mono font-semibold text-gray-800">
                {statement.customerTaxCode || 'Chưa cập nhật'}
              </span>
              <span className="text-gray-300 mx-2">|</span>
              <span className="text-gray-400">SĐT: </span>
              <span className="text-gray-800 font-semibold">{statement.customerPhone || 'Chưa cập nhật'}</span>
            </div>
            <div>
              <span className="text-gray-400">Hạn mức: </span>
              <strong className="text-gray-900 font-mono">
                {formatCurrencyVND(statement.creditLimit)}
              </strong>
              <span className="text-gray-300 mx-2">|</span>
              <span className="text-gray-400">Hạn nợ: </span>
              <strong className="text-gray-900">{statement.maxDebtDays} ngày</strong>
            </div>
          </div>
        )}
      </div>

      {/* 3. Thẻ KPI tổng kết 4 chỉ số tài chính trong kỳ đối chiếu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Số dư đầu kỳ */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} className="text-gray-400" />
            <span>I. Dư nợ đầu kỳ</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
            {formatCurrencyVND(statement?.openingBalance || 0)}
          </div>
          <div className="text-[11px] text-gray-500">Tính đến ngày {fromDate}</div>
        </div>

        {/* Phát sinh Nợ (Mua hàng) */}
        <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={13} className="text-[#F85606]" />
            <span>II. Phát sinh Nợ (Mua hàng)</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#F85606] font-mono">
            {(statement?.totalDebit || 0) > 0 ? '+' : ''}{formatCurrencyVND(statement?.totalDebit || 0)}
          </div>
          <div className="text-[11px] text-orange-900">
            Tổng giá trị đơn hàng / hoá đơn phát sinh
          </div>
        </div>

        {/* Phát sinh Có (Thanh toán & Giảm trừ) */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <TrendingDown size={13} className="text-emerald-600" />
            <span>III. Phát sinh Có (Đã trả & Giảm trừ)</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {(statement?.totalCredit || 0) > 0 ? '-' : ''}{formatCurrencyVND(statement?.totalCredit || 0)}
          </div>
          <div className="text-[11px] text-emerald-900">
            Đại lý thanh toán hoặc chứng từ giảm trừ
          </div>
        </div>

        {/* Số dư cuối kỳ */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-100 to-white border border-orange-300 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-orange-950 uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={13} className="text-[#F85606]" />
            <span>IV. Dư nợ cuối kỳ</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#F85606] font-mono">
            {formatCurrencyVND(statement?.closingBalance || 0)}
          </div>
          <div className="text-[11px] text-orange-950 font-medium">
            Số tiền còn phải thanh toán đến {toDate}
          </div>
        </div>
      </div>

      {/* 4. Bảng Sổ chi tiết công nợ phát sinh theo thời gian (AC 1) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Bảng kê chi tiết chứng từ phát sinh và số dư luỹ kế
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#F85606]">
              {statement?.transactions?.length || 0} chứng từ
            </span>
          </div>
          <div className="text-[11px] text-gray-500 italic">
            Số dư luỹ kế = Dư trước + Phát sinh Nợ - Phát sinh Có
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 w-24">Ngày</th>
                <th className="py-3 px-3 w-32">Số chứng từ</th>
                <th className="py-3 px-3 w-40">Loại nghiệp vụ</th>
                <th className="py-3 px-3">Diễn giải nội dung</th>
                <th className="py-3 px-3 text-right w-36">Phát sinh Nợ (+)</th>
                <th className="py-3 px-3 text-right w-36">Phát sinh Có (-)</th>
                <th className="py-3 px-3 text-right w-36">Số dư luỹ kế (₫)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                    Đang tính toán sổ chi tiết công nợ và số dư luỹ kế...
                  </td>
                </tr>
              ) : !statement ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Chưa có dữ liệu sổ chi tiết.
                  </td>
                </tr>
              ) : (
                <>
                  {/* Dòng Số dư đầu kỳ */}
                  <tr className="bg-amber-50/50 font-bold text-gray-900 border-b border-amber-200">
                    <td className="py-3 px-3 text-center text-gray-400">#</td>
                    <td className="py-3 px-3 font-mono text-gray-700">{statement.fromDate}</td>
                    <td className="py-3 px-3 font-mono font-bold uppercase text-[11px] text-amber-900">
                      SỐ DƯ ĐẦU KỲ
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Đầu kỳ
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 italic">
                      Số dư nợ công nợ tính đến trước ngày {statement.fromDate}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-400">-</td>
                    <td className="py-3 px-3 text-right font-mono text-gray-400">-</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-gray-950 bg-amber-100/40">
                      {formatCurrencyVND(statement.openingBalance)}
                    </td>
                  </tr>

                  {/* Các dòng chứng từ phát sinh */}
                  {statement.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 italic">
                        Trong kỳ từ ngày {statement.fromDate} đến ngày {statement.toDate} không phát sinh giao dịch mới.
                      </td>
                    </tr>
                  ) : (
                    statement.transactions.map((t, idx) => {
                      const isInvoice = t.documentType === 'INVOICE';
                      const isPayment = t.documentType === 'PAYMENT';
                      const isAdjustment = t.documentType === 'ADJUSTMENT';

                      return (
                        <tr key={t.id || idx} className="hover:bg-orange-50/20 transition">
                          <td className="py-3 px-3 text-center text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono text-gray-700 whitespace-nowrap">
                            {t.date}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                            {t.code}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isInvoice && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#F85606] border border-orange-200">
                                Hoá đơn bán hàng
                              </span>
                            )}
                            {isPayment && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Phiếu thu tiền
                              </span>
                            )}
                            {isAdjustment && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Giảm trừ công nợ
                              </span>
                            )}
                            {!isInvoice && !isPayment && !isAdjustment && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                                {t.documentTypeLabel}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-800">{t.description}</td>
                          <td className="py-3 px-3 text-right font-mono text-gray-900">
                            {t.debit > 0 ? (
                              <span className="text-[#F85606] font-bold">
                                +{formatCurrencyVND(t.debit)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                            {t.credit > 0 ? `-${formatCurrencyVND(t.credit)}` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-gray-950 bg-gray-50/50">
                            {formatCurrencyVND(t.balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Xem trước in & xuất PDF A4 */}
      <CustomerDebtStatementPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        statement={statement}
      />
    </div>
  );
};

export default CustomerDebtStatementPage;
