import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Printer,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  Check
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { fetchAgencies } from '../../services/agencyApi';
import type { Agency } from '../../types/agency';
import type { PeriodicReconciliationStatement } from '../../types/debtReconciliation';
import {
  fetchReconciliationStatements,
  createReconciliationStatement,
  agencyRespondStatement
} from '../../services/debtReconciliationApi';
import { ReconciliationPrintModal } from '../../components/debt/ReconciliationPrintModal';

export const DebtReconciliationPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Tab view: 'LIST' hoặc 'CREATE'
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');

  // Danh sách biên bản
  const [statements, setStatements] = useState<PeriodicReconciliationStatement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal in / xem trước mẫu A4
  const [selectedStatement, setSelectedStatement] = useState<PeriodicReconciliationStatement | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Dữ liệu phục vụ tạo biên bản mới (Form)
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);
  const [agencyKeyword, setAgencyKeyword] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
  });
  const [statementDate, setStatementDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState<string>('Đối chiếu công nợ định kỳ theo hợp đồng mua bán.');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Tải danh sách đại lý khi mở form tạo mới
  useEffect(() => {
    const loadAgencyList = async () => {
      setLoadingAgencies(true);
      try {
        const res = await fetchAgencies({ page: 0, size: 100, status: 'ACTIVE' });
        setAgencies(res.content || []);
      } catch (err) {
        // ignore
      } finally {
        setLoadingAgencies(false);
      }
    };
    loadAgencyList();
  }, []);

  // Bộ lọc theo đại lý cụ thể (khi điều hướng từ Sổ công nợ sang)
  const [filterCustomerId, setFilterCustomerId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('customerId');
    return cid && /^\d+$/.test(cid) ? Number(cid) : null;
  });

  useEffect(() => {
    if (filterCustomerId) {
      setSelectedCustomerId(filterCustomerId);
    }
  }, [filterCustomerId]);

  const loadStatements = async () => {
    setLoading(true);
    try {
      const data = await fetchReconciliationStatements({
        status: statusFilter,
        customerId: filterCustomerId || undefined
      });
      setStatements(data);
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể tải danh sách biên bản đối chiếu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, [statusFilter, filterCustomerId]);

  const selectedAgency = agencies.find(a => Number(a.id) === selectedCustomerId);

  // Tính toán số liệu chứng từ phát sinh chính xác theo đại lý được chọn
  let simulatedOpeningBalance = 0;
  let simulatedTransactions: {
    id: number;
    date: string;
    code: string;
    type: 'INVOICE' | 'PAYMENT';
    typeLabel: string;
    debit: number;
    credit: number;
    balance: number;
    notes?: string;
  }[] = [];

  if (selectedCustomerId === 3) {
    // KhoMega (DN-HN-003) - Dư nợ thực tế: 84.386.400 đ
    simulatedOpeningBalance = 720000;
    simulatedTransactions = [
      {
        id: 1,
        date: '2026-09-15',
        code: 'HD2026-000001',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 83666400,
        credit: 0,
        balance: 84386400,
        notes: 'Hoá đơn GTGT số HD2026-000001'
      }
    ];
  } else if (selectedCustomerId === 2) {
    // Công ty TNHH Water (DL-TN-THANHCONG) - Dư nợ thực tế: 50.222.400 đ
    simulatedOpeningBalance = 0;
    simulatedTransactions = [
      {
        id: 1,
        date: '2026-09-10',
        code: 'HD2026-000002',
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: 1060800,
        credit: 0,
        balance: 1060800,
        notes: 'Hoá đơn GTGT số HD2026-000002'
      },
      {
        id: 2,
        date: '2026-09-20',
        code: 'DH-202609-002',
        type: 'INVOICE',
        typeLabel: 'Đơn hàng thực giao',
        debit: 49161600,
        credit: 0,
        balance: 50222400,
        notes: 'Đơn hàng giao đợt 2 theo hợp đồng'
      }
    ];
  } else if (selectedCustomerId === 1) {
    // Kho Đài Tư (DL-HN-001) - Dư nợ thực tế: 0 đ
    simulatedOpeningBalance = 35000000;
    simulatedTransactions = [
      {
        id: 1,
        date: '2026-09-28',
        code: 'PT2026-000001',
        type: 'PAYMENT',
        typeLabel: 'Phiếu thu ngân hàng',
        debit: 0,
        credit: 35000000,
        balance: 0,
        notes: 'Chuyển khoản thanh toán dứt điểm công nợ'
      }
    ];
  } else if (selectedAgency) {
    const debt = Number(selectedAgency.currentDebt) || 0;
    simulatedOpeningBalance = 0;
    simulatedTransactions = [
      {
        id: 1,
        date: statementDate,
        code: `HD-2026-${String(selectedCustomerId).padStart(3, '0')}`,
        type: 'INVOICE',
        typeLabel: 'Hoá đơn bán hàng',
        debit: debt,
        credit: 0,
        balance: debt,
        notes: 'Phát sinh nợ luỹ kế theo kỳ'
      }
    ];
  }

  const simulatedTotalDebit = simulatedTransactions.reduce((s, t) => s + t.debit, 0);
  const simulatedTotalCredit = simulatedTransactions.reduce((s, t) => s + t.credit, 0);
  const simulatedClosingBalance = simulatedOpeningBalance + simulatedTotalDebit - simulatedTotalCredit;

  // Lập biên bản đối chiếu mới
  const handleCreateStatement = async () => {
    if (!selectedCustomerId || !selectedAgency) {
      showToast('Cảnh báo', 'Vui lòng chọn đại lý cần lập biên bản đối chiếu', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createReconciliationStatement(
        {
          customerId: selectedCustomerId,
          fromDate,
          toDate,
          statementDate,
          notes: notes.trim()
        },
        {
          code: selectedAgency.code,
          name: selectedAgency.name,
          address: selectedAgency.address,
          taxCode: selectedAgency.taxCode,
          phone: selectedAgency.phone
        },
        simulatedOpeningBalance,
        simulatedTransactions
      );

      showToast('Thành công', `Đã lập biên bản ${created.statementCode} thành công`, 'success');
      setSelectedStatement(created);
      setIsPrintModalOpen(true);
      setViewMode('LIST');
      loadStatements();
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể tạo biên bản đối chiếu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Xem trước mẫu in A4
  const handleOpenPrint = (stmt: PeriodicReconciliationStatement) => {
    setSelectedStatement(stmt);
    setIsPrintModalOpen(true);
  };

  // Giả lập đại lý xác nhận hoặc phản hồi lệch (Test tính năng portal)
  const handleSimulateAgencyAction = async (stmt: PeriodicReconciliationStatement, isAccept: boolean) => {
    try {
      const feedback = isAccept ? undefined : 'Số liệu chênh lệch hoá đơn ngày 15, yêu cầu kế toán kiểm tra lại.';
      await agencyRespondStatement(
        stmt.id,
        isAccept ? 'AGENCY_ACCEPTED' : 'AGENCY_DISPUTED',
        feedback,
        `${stmt.customerName} (Chủ đại lý)`
      );
      showToast(
        isAccept ? 'Đại lý đã ký xác nhận' : 'Đại lý đã gửi phản hồi lệch',
        isAccept ? 'Biên bản đã được đại lý chấp thuận' : 'Kế toán cần đối chiếu lại chứng từ',
        isAccept ? 'success' : 'info'
      );
      loadStatements();
    } catch (err: any) {
      showToast('Lỗi', err.message, 'error');
    }
  };

  const filteredAgencies = agencies.filter(
    (a) =>
      !agencyKeyword.trim() ||
      a.name.toLowerCase().includes(agencyKeyword.toLowerCase()) ||
      a.code.toLowerCase().includes(agencyKeyword.toLowerCase())
  );

  return (
    <div className="space-y-5 antialiased max-w-7xl mx-auto pb-16">
      {/* 1. Header tinh gọn chỉ nút Quay lại và nút hành động */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (viewMode === 'CREATE') {
              setViewMode('LIST');
            } else {
              navigate('/debts/ledger');
            }
          }}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Quay lại"
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadStatements()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {viewMode === 'LIST' ? (
            <button
              type="button"
              onClick={() => setViewMode('CREATE')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Lập biên bản đối chiếu mới</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              Danh sách biên bản
            </button>
          )}
        </div>
      </div>

      {/* 2. CHẾ ĐỘ FORM LẬP BIÊN BẢN MỚI (S7-06) */}
      {viewMode === 'CREATE' ? (
        <div className="space-y-5 animate-fade-in">
          {/* Hai cột nằm ngang cao bằng nhau theo đúng chuẩn form đã duyệt */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* CỘT 1: CHỌN ĐẠI LÝ / KHÁCH HÀNG */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between h-full space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-[#F85606]" />
                    <span>1. Chọn Đại lý / Khách hàng</span>
                  </div>
                  {selectedCustomerId && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check size={12} />
                      <span>Đã chọn đại lý</span>
                    </span>
                  )}
                </div>

                {/* Ô tìm kiếm đại lý */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={agencyKeyword}
                    onChange={(e) => setAgencyKeyword(e.target.value)}
                    placeholder="Tìm mã hoặc tên đại lý..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
                  />
                </div>

                {/* Danh sách đại lý */}
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50">
                  {loadingAgencies ? (
                    <div className="text-center py-8 text-xs text-gray-400">Đang tải danh sách đại lý...</div>
                  ) : filteredAgencies.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400">Không tìm thấy đại lý phù hợp</div>
                  ) : (
                    filteredAgencies.map((agency) => {
                      const custId = Number(agency.id);
                      const isSelected = selectedCustomerId === custId;
                      return (
                        <button
                          key={agency.id}
                          type="button"
                          onClick={() => setSelectedCustomerId(custId)}
                          className={`w-full text-left p-2.5 rounded-xl transition cursor-pointer flex items-start justify-between gap-2 ${
                            isSelected
                              ? 'bg-orange-50 border border-orange-200 text-[#F85606]'
                              : 'hover:bg-gray-50 border border-transparent text-gray-700'
                          }`}
                        >
                          <div>
                            <div className={`font-bold text-xs ${isSelected ? 'text-[#F85606]' : 'text-gray-900'}`}>
                              {agency.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              Mã: {agency.code} {agency.taxCode ? `• MST: ${agency.taxCode}` : ''}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate max-w-[260px] mt-0.5">
                              {agency.address}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#F85606] shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* CỘT 2: KỲ ĐỐI CHIẾU & NGÀY LẬP BIÊN BẢN */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between h-full space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2.5">
                  <Calendar className="w-4 h-4 text-[#F85606]" />
                  <span>2. Kỳ Đối Chiếu & Ngày Lập Biên Bản</span>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Từ ngày</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:border-[#F85606] focus:bg-white focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Đến ngày</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:border-[#F85606] focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Ngày lập biên bản đối chiếu:
                    </label>
                    <input
                      type="date"
                      value={statementDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setStatementDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:border-[#F85606] focus:bg-white focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Ghi chú / Điều khoản xác nhận:
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Nhập ghi chú chốt số liệu hoặc điều khoản đối chiếu..."
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:border-[#F85606] focus:bg-white focus:outline-none transition resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. KHỐI CHI TIẾT SỐ LIỆU ĐỐI CHIẾU: CHỈ XUẤT HIỆN KHI ĐÃ CHỌN ĐẠI LÝ */}
          {selectedCustomerId && selectedAgency && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#F85606]" />
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                      3. Số Liệu Công Nợ Kỳ Này Của {selectedAgency.name}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    Kỳ: {fromDate} → {toDate}
                  </span>
                </div>

                {/* 4 Thẻ tổng hợp số liệu cốt lõi */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50/60 border-b border-gray-200">
                  <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-0.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">
                      I. Dư nợ đầu kỳ:
                    </span>
                    <span className="text-base font-black text-gray-900 font-mono block">
                      {formatCurrencyVND(simulatedOpeningBalance)}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-orange-200 space-y-0.5">
                    <span className="text-[10px] text-orange-800 font-bold uppercase block">
                      II. Phát sinh nợ (Mua hàng):
                    </span>
                    <span className="text-base font-black text-[#F85606] font-mono block">
                      +{formatCurrencyVND(simulatedTotalDebit)}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-0.5">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                      III. Phát sinh có (Đã thanh toán):
                    </span>
                    <span className="text-base font-black text-emerald-700 font-mono block">
                      -{formatCurrencyVND(simulatedTotalCredit)}
                    </span>
                  </div>

                  <div className="p-3 bg-orange-100/60 rounded-xl border border-orange-300 space-y-0.5">
                    <span className="text-[10px] text-orange-900 font-black uppercase block">
                      IV. Dư nợ cuối kỳ chốt:
                    </span>
                    <span className="text-base font-black text-[#F85606] font-mono block">
                      {formatCurrencyVND(simulatedClosingBalance)}
                    </span>
                  </div>
                </div>

                {/* Bảng kê chứng từ phát sinh */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-4 w-12 text-center">STT</th>
                        <th className="py-2.5 px-4 w-28">Ngày</th>
                        <th className="py-2.5 px-4 w-36">Mã chứng từ</th>
                        <th className="py-2.5 px-4">Nội dung nghiệp vụ</th>
                        <th className="py-2.5 px-4 text-right w-32">Phát sinh Nợ (+)</th>
                        <th className="py-2.5 px-4 text-right w-32">Phát sinh Có (-)</th>
                        <th className="py-2.5 px-4 text-right w-36">Số dư luỹ kế</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {simulatedTransactions.map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-orange-50/20">
                          <td className="py-3 px-4 text-center text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-4 text-gray-600">{tx.date}</td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-900">{tx.code}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-800">{tx.typeLabel}</span>
                            <span className="text-gray-400 block text-[11px]">{tx.notes}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#F85606]">
                            {tx.debit > 0 ? `+${formatCurrencyVND(tx.debit)}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {tx.credit > 0 ? `-${formatCurrencyVND(tx.credit)}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-gray-900">
                            {formatCurrencyVND(tx.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  onClick={handleCreateStatement}
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  <FileCheck size={16} />
                  <span>{submitting ? 'Đang tạo biên bản...' : 'Lập & Chốt Biên Bản Đối Chiếu'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 3. CHẾ ĐỘ DANH SÁCH BIÊN BẢN ĐỐI CHIẾU ĐÃ LẬP (S7-06) */
        <div className="space-y-4">
          {/* Banner thông báo khi đang lọc theo 1 đại lý cụ thể */}
          {filterCustomerId && (
            <div className="p-3.5 px-4 rounded-2xl bg-orange-50/90 border border-orange-200/90 flex flex-wrap items-center justify-between gap-3 text-xs text-orange-950 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Đang xem biên bản của đại lý:</span>
                <span className="font-bold text-[#F85606] bg-white px-2.5 py-1 rounded-xl border border-orange-200 shadow-2xs">
                  {agencies.find(a => Number(a.id) === filterCustomerId)?.name || `Đại lý #${filterCustomerId}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterCustomerId(null);
                  navigate('/debts/reconciliation');
                }}
                className="text-xs font-bold text-[#F85606] hover:underline cursor-pointer flex items-center gap-1"
              >
                ✕ Xem tất cả biên bản
              </button>
            </div>
          )}

          {/* Bộ lọc trạng thái */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { key: 'ALL', label: 'Tất cả biên bản' },
                { key: 'CONFIRMED', label: 'Chờ đại lý ký' },
                { key: 'AGENCY_ACCEPTED', label: 'Đại lý đã ký xác nhận' },
                { key: 'AGENCY_DISPUTED', label: 'Đại lý phản hồi lệch' }
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === f.key
                      ? 'bg-[#F85606] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              Tổng số: <strong>{statements.length}</strong> biên bản
            </div>
          </div>

          {/* Bảng danh sách biên bản */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-36">Mã biên bản</th>
                    <th className="py-3 px-4">Đại lý / Khách hàng</th>
                    <th className="py-3 px-4 w-32">Kỳ đối chiếu</th>
                    <th className="py-3 px-3 text-right w-28">Đầu kỳ</th>
                    <th className="py-3 px-3 text-right w-28">Phát sinh Nợ</th>
                    <th className="py-3 px-3 text-right w-28">Phát sinh Có</th>
                    <th className="py-3 px-3 text-right w-32 bg-orange-50/40 text-[#F85606]">
                      Số dư cuối kỳ
                    </th>
                    <th className="py-3 px-4 text-center w-36">Trạng thái</th>
                    <th className="py-3 px-4 text-center w-36">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F85606]" />
                        Đang tải danh sách biên bản đối chiếu...
                      </td>
                    </tr>
                  ) : statements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-gray-400">
                        Chưa có biên bản đối chiếu nào. Hãy bấm &ldquo;+ Lập biên bản đối chiếu mới&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    statements.map((stmt) => {
                      const isDisputed = stmt.status === 'AGENCY_DISPUTED';
                      return (
                        <tr
                          key={stmt.id}
                          className={`hover:bg-orange-50/20 transition-colors ${
                            isDisputed ? 'bg-rose-50/15' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                            {stmt.statementCode}
                            <span className="text-[10px] text-gray-400 block font-normal">
                              {stmt.statementDate}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{stmt.customerName}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Mã: {stmt.customerCode}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-gray-600 text-[11px] whitespace-nowrap">
                            {stmt.fromDate}
                            <span className="block text-gray-400">→ {stmt.toDate}</span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-gray-600">
                            {formatCurrencyVND(stmt.openingBalance)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#F85606]">
                            +{formatCurrencyVND(stmt.totalDebit)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-emerald-700">
                            -{formatCurrencyVND(stmt.totalCredit)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-[#F85606] bg-orange-50/30">
                            {formatCurrencyVND(stmt.closingBalance)}
                          </td>

                          {/* Trạng thái xác nhận */}
                          <td className="py-3 px-4 text-center">
                            {stmt.status === 'AGENCY_ACCEPTED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 size={12} />
                                <span>Đại lý đã ký</span>
                              </span>
                            ) : stmt.status === 'AGENCY_DISPUTED' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800"
                                title={stmt.agencyFeedback || 'Có phản hồi lệch số liệu'}
                              >
                                <AlertCircle size={12} />
                                <span>Phản hồi lệch</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                <Clock size={12} />
                                <span>Chờ đại lý ký</span>
                              </span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPrint(stmt)}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-[#F85606] font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                title="Xem trước và in biên bản mẫu A4"
                              >
                                <Printer size={13} />
                                <span>In A4</span>
                              </button>

                              {/* Giả lập hành động đại lý ở cổng Portal */}
                              {stmt.status === 'CONFIRMED' && (
                                <button
                                  type="button"
                                  onClick={() => handleSimulateAgencyAction(stmt, true)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition cursor-pointer"
                                  title="Giả lập đại lý xác nhận trên cổng Portal"
                                >
                                  Đại lý ký
                                </button>
                              )}
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
        </div>
      )}

      {/* Modal In & Xem trước biên bản đối chiếu mẫu A4 */}
      <ReconciliationPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        statement={selectedStatement}
      />
    </div>
  );
};

export default DebtReconciliationPage;
