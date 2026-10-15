import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Printer,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import { SearchSelect } from '../../components/common/SearchSelect';
import {
  fetchCustomerCreditStatus,
  createRouteCashCollection,
  confirmRouteCashCollection,
  fetchPaymentReceipts
} from '../../services/paymentApi';
import { fetchAgencies, fetchAgencyFormOptions } from '../../services/agencyApi';
import type { Agency, CreditStatusResponse } from '../../types/agency';
import type { PaymentReceipt, PaymentMethod } from '../../types/payment';
import { PaymentReceiptPrintModal } from '../../components/payment/PaymentReceiptPrintModal';

export const RouteCashCollectionPage: React.FC = () => {
  const { user, showToast } = useAuth();

  // Active tab: 'mobile-collect' (Ghi nhận thu tiền tại điểm bán) hoặc 'reconciliation' (Bảng đối chiếu thu tiền)
  const [activeTab, setActiveTab] = useState<'mobile-collect' | 'reconciliation'>('reconciliation');

  // Danh mục đại lý & NVKD
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [salesReps, setSalesReps] = useState<Array<{ id: string; fullName: string; username: string }>>([]);

  // TAB 1: FORM GHI NHẬN THU TIỀN TẠI ĐIỂM BÁN (Mobile First)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerCredit, setCustomerCredit] = useState<CreditStatusResponse | null>(null);
  const [loadingCustomerCredit, setLoadingCustomerCredit] = useState<boolean>(false);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectAmountStr, setCollectAmountStr] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('CASH');
  const [collectDate, setCollectDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>('');
  const [submittingCollection, setSubmittingCollection] = useState<boolean>(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  // TAB 2: BẢNG ĐỐI CHIẾU THU TIỀN THEO TUYẾN
  const [filterDateFrom, setFilterDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [filterDateTo, setFilterDateTo] = useState<string>(new Date().toISOString().slice(0, 10));
  const [filterSalesRep, setFilterSalesRep] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [receiptsList, setReceiptsList] = useState<PaymentReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState<boolean>(false);

  // Modal preview ảnh biên lai
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);

  // Modal in phiếu thu
  const [receiptForPrint, setReceiptForPrint] = useState<PaymentReceipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Kế toán xác nhận nộp quỹ
  const [confirmingId, setConfirmingId] = useState<string | number | null>(null);

  // 1. Tải danh mục đại lý và NVKD ban đầu
  useEffect(() => {
    Promise.all([
      fetchAgencies({ size: 200 }),
      fetchAgencyFormOptions().catch(() => ({ salesReps: [] }))
    ])
      .then(([agencyRes, formOpt]) => {
        setAgencies(agencyRes.content || []);
        if (formOpt?.salesReps) {
          setSalesReps(formOpt.salesReps);
        }
      })
      .catch((err: unknown) => {
        console.warn('Lỗi tải danh mục ban đầu:', err);
      });
  }, []);

  // 2. Tải công nợ đại lý khi chọn đại lý ở Form mobile
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerCredit(null);
      return;
    }
    setLoadingCustomerCredit(true);
    fetchCustomerCreditStatus(selectedCustomerId)
      .then((credit: CreditStatusResponse | null) => {
        setCustomerCredit(credit);
      })
      .catch((err: unknown) => {
        console.warn('Lỗi tải công nợ khách hàng:', err);
      })
      .finally(() => {
        setLoadingCustomerCredit(false);
      });
  }, [selectedCustomerId]);

  // 3. Tải danh sách phiếu thu đối chiếu
  const loadReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const res = await fetchPaymentReceipts({
        fromDate: filterDateFrom || undefined,
        toDate: filterDateTo || undefined,
        salesRepId: filterSalesRep || undefined,
        customerId: filterCustomer || undefined,
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        size: 100
      });
      setReceiptsList(res.content || []);
    } catch (err: unknown) {
      console.warn('Lỗi tải danh sách phiếu thu đối chiếu:', err);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [filterDateFrom, filterDateTo, filterSalesRep, filterCustomer, filterStatus]);

  // Thống kê đối chiếu
  const stats = useMemo(() => {
    let totalCollected = 0;
    let confirmedAmount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    for (const r of receiptsList) {
      totalCollected += r.amount;
      if (r.status === 'CONFIRMED') {
        confirmedAmount += r.amount;
      } else if (r.status === 'PENDING_SUBMISSION') {
        pendingAmount += r.amount;
        pendingCount += 1;
      }
    }

    return {
      totalCollected,
      confirmedAmount,
      pendingAmount,
      pendingCount,
      totalCount: receiptsList.length
    };
  }, [receiptsList]);

  // Xử lý đổi số tiền thu form mobile
  const handleCollectAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = Number(rawVal) || 0;
    setCollectAmount(num);
    setCollectAmountStr(rawVal ? num.toLocaleString('vi-VN') : '');
    setCollectError(null);
  };

  // Xử lý chọn ảnh biên lai
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setCollectError('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit form thu tiền tại điểm bán
  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      setCollectError('Vui lòng chọn đại lý cần thu tiền');
      return;
    }

    if (collectAmount <= 0) {
      setCollectError('Vui lòng nhập số tiền thu lớn hơn 0');
      return;
    }

    setSubmittingCollection(true);
    setCollectError(null);

    try {
      const created = await createRouteCashCollection(
        {
          customerId: Number(selectedCustomerId),
          amount: collectAmount,
          paymentMethod: collectMethod,
          paymentDate: collectDate,
          notes: collectNotes.trim(),
          receiptImageBase64: receiptImageBase64 || undefined
        },
        {
          id: user?.id ? Number(user.id) : 1,
          username: user?.username || 'sales_rep',
          fullName: user?.fullName || 'Nhân viên kinh doanh'
        }
      );

      showToast('Ghi nhận khoản thu thành công! Trạng thái: Chờ nộp quỹ.', 'success');

      // Reset form
      setSelectedCustomerId('');
      setCollectAmount(0);
      setCollectAmountStr('');
      setCollectNotes('');
      setReceiptImageBase64('');
      setCustomerCredit(null);

      // Reload danh sách đối chiếu và chuyển sang tab đối chiếu
      loadReceipts();
      setActiveTab('reconciliation');

      // Tùy chọn in ngay
      setReceiptForPrint(created);
      setShowPrintModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi ghi nhận khoản thu';
      setCollectError(msg);
    } finally {
      setSubmittingCollection(false);
    }
  };

  // Kế toán xác nhận nộp quỹ
  const handleConfirmSubmission = async (receipt: PaymentReceipt) => {
    if (!window.confirm(`Xác nhận đã nhận đủ số tiền ${formatCurrencyVND(receipt.amount)} từ ${receipt.collectorName} vào quỹ công ty?`)) {
      return;
    }

    setConfirmingId(receipt.id);
    try {
      const updated = await confirmRouteCashCollection(receipt.id, {
        username: user?.username || 'accountant',
        fullName: user?.fullName || 'Kế toán công nợ'
      });

      showToast(`Đã xác nhận nộp quỹ thành công cho phiếu ${updated.code}!`, 'success');
      loadReceipts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xác nhận nộp quỹ';
      showToast(msg, 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Thu tiền theo tuyến & Bảng đối chiếu</h1>
              <p className="text-xs text-gray-500">
                Ghi nhận tiền thu tại điểm bán kèm ảnh biên lai và đối chiếu tiền nộp quỹ giữa NVKD & Kế toán
              </p>
            </div>
          </div>
        </div>

        {/* Nút chuyển đổi Tab */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'reconciliation'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Bảng đối chiếu nộp quỹ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mobile-collect')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'mobile-collect'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plus size={16} />
            <span>Thu tiền tại điểm bán</span>
          </button>
        </div>
      </div>

      {/* 2. NỘI DUNG THEO TAB */}
      {activeTab === 'mobile-collect' ? (
        /* ================= TAB 1: FORM GHI NHẬN TẠI ĐIỂM BÁN (MOBILE FIRST) ================= */
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Camera size={18} />
              <span>Phiếu thu tiền tại cửa hàng / đại lý</span>
            </h2>
            <p className="text-xs text-emerald-100">
              Dành cho nhân viên kinh doanh đi tuyến ghé thăm điểm bán
            </p>
          </div>

          <form onSubmit={handleSubmitCollection} className="p-6 space-y-5">
            {collectError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            {/* Chọn Đại lý trên tuyến bằng SearchSelect */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={15} className="text-emerald-600" />
                <span>Chọn đại lý / Cửa hàng ghé thăm *</span>
              </label>

              <SearchSelect
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                searchPlaceholder="Gõ để tìm đại lý theo tên, mã..."
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Chọn đại lý trên tuyến --</option>
                {agencies.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.code} - {ag.name} ({ag.customerGroupName || 'Đại lý'})
                  </option>
                ))}
              </SearchSelect>

              {/* Thông tin nợ nhanh của đại lý */}
              {loadingCustomerCredit ? (
                <p className="text-xs text-gray-400 italic">Đang tải công nợ đại lý...</p>
              ) : customerCredit ? (
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs mt-2">
                  <div>
                    <span className="text-gray-500 block">Nợ hiện tại của đại lý:</span>
                    <span className="font-bold text-rose-600 font-mono text-sm">
                      {formatCurrencyVND(customerCredit.currentDebt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 block">Hạn mức còn lại:</span>
                    <span className="font-bold text-emerald-600 font-mono text-sm">
                      {formatCurrencyVND(customerCredit.availableCredit)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Số tiền thu & đọc bằng chữ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign size={15} className="text-emerald-600" />
                  <span>Số tiền thực thu (VNĐ) *</span>
                </span>
                {collectAmount > 0 && (
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {formatCurrencyVND(collectAmount)}
                  </span>
                )}
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={collectAmountStr}
                onChange={handleCollectAmountChange}
                placeholder="Nhập số tiền thu (Ví dụ: 10,000,000)"
                className="w-full px-4 py-3 bg-white border-2 border-emerald-500/80 rounded-xl text-lg font-black text-emerald-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {collectAmount > 0 && (
                <p className="text-xs text-gray-600 italic">
                  Bằng chữ: <span className="font-semibold text-gray-900">{numberToVietnameseWords(collectAmount)}</span>
                </p>
              )}
            </div>

            {/* Hình thức thanh toán & Ngày thu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={15} className="text-emerald-600" />
                  <span>Hình thức thu *</span>
                </label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="CASH">Tiền mặt tại cửa hàng</option>
                  <option value="BANK_TRANSFER">Chuyển khoản trực tiếp</option>
                  <option value="OTHER">Hình thức khác</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={15} className="text-emerald-600" />
                  <span>Ngày thu tiền *</span>
                </label>
                <input
                  type="date"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Chụp / Tải ảnh biên lai biên nhận thanh toán */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera size={15} className="text-emerald-600" />
                  <span>Ảnh chụp biên nhận / Phiếu thu viết tay / Giấy chuyển tiền</span>
                </span>
                {receiptImageBase64 && (
                  <button
                    type="button"
                    onClick={() => setReceiptImageBase64('')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Xoá ảnh</span>
                  </button>
                )}
              </label>

              {receiptImageBase64 ? (
                <div className="relative rounded-xl border border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                  <img
                    src={receiptImageBase64}
                    alt="Biên lai thanh toán"
                    className="max-h-56 object-contain rounded-lg shadow-xs"
                  />
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-gray-50/50 hover:bg-emerald-50/20">
                  <Camera size={32} className="text-gray-400 mb-2" />
                  <span className="text-xs sm:text-sm font-bold text-gray-700">
                    Chụp ảnh biên lai hoặc chọn từ thiết bị
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">Hỗ trợ JPG, PNG, WEBP (Tối đa 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Ghi chú */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-emerald-600" />
                <span>Ghi chú khoản thu</span>
              </label>
              <textarea
                rows={2}
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                placeholder="Nhập ghi chú hoặc lý do thu tiền..."
                className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Thông báo trạng thái: Chờ nộp quỹ */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
              <Clock size={16} className="text-amber-600 shrink-0" />
              <span>
                Khoản thu sau khi lưu sẽ ở trạng thái <strong className="font-bold">"Chờ nộp quỹ"</strong> cho tới khi kế toán công ty xác nhận đã nhận đủ tiền nộp về quỹ.
              </span>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('reconciliation')}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={submittingCollection || collectAmount <= 0}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {submittingCollection ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang ghi nhận...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Lưu khoản thu & Chờ nộp quỹ</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ================= TAB 2: BẢNG ĐỐI CHIẾU THU TIỀN THEO TUYẾN ================= */
        <div className="space-y-6">
          {/* 4 Thẻ KPI thống kê đối chiếu */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 block">Tổng tiền NVKD đã thu:</span>
              <div className="text-lg sm:text-xl font-black text-gray-900 font-mono mt-1">
                {formatCurrencyVND(stats.totalCollected)}
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">
                Tổng {stats.totalCount} lượt thu tiền
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
              <span className="text-xs font-semibold text-emerald-800 block">Đã xác nhận nộp vào quỹ:</span>
              <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-1">
                {formatCurrencyVND(stats.confirmedAmount)}
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                Kế toán đã nhận đủ tiền
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
              <span className="text-xs font-semibold text-amber-800 block">Tiền chờ nộp quỹ (NVKD giữ):</span>
              <div className="text-lg sm:text-xl font-black text-amber-700 font-mono mt-1">
                {formatCurrencyVND(stats.pendingAmount)}
              </div>
              <span className="text-[11px] text-amber-600 mt-1 block font-semibold">
                {stats.pendingCount} khoản đang chờ nộp
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 block">Tỷ lệ hoàn thành nộp quỹ:</span>
              <div className="text-lg sm:text-xl font-black text-gray-800 font-mono mt-1">
                {stats.totalCollected > 0
                  ? `${Math.round((stats.confirmedAmount / stats.totalCollected) * 100)}%`
                  : '100%'}
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{
                    width: stats.totalCollected > 0 ? `${(stats.confirmedAmount / stats.totalCollected) * 100}%` : '100%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bộ lọc đối chiếu: Ngày, Nhân viên kinh doanh, Đại lý, Trạng thái */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Lọc từ ngày */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Từ ngày:</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Lọc đến ngày */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Đến ngày:</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Lọc theo Nhân viên kinh doanh với SearchSelect */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Nhân viên thu tiền:</label>
                <SearchSelect
                  value={filterSalesRep}
                  onChange={(e) => setFilterSalesRep(e.target.value)}
                  searchPlaceholder="Gõ để tìm nhân viên kinh doanh..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Tất cả nhân viên</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.fullName} ({rep.username})
                    </option>
                  ))}
                </SearchSelect>
              </div>

              {/* Lọc theo Đại lý với SearchSelect */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Đại lý nộp tiền:</label>
                <SearchSelect
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  searchPlaceholder="Gõ để tìm đại lý..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Tất cả đại lý</option>
                  {agencies.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.code} - {ag.name}
                    </option>
                  ))}
                </SearchSelect>
              </div>
            </div>

            {/* Tabs trạng thái */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {[
                  { id: 'ALL', label: 'Tất cả trạng thái' },
                  { id: 'PENDING_SUBMISSION', label: 'Chờ nộp quỹ' },
                  { id: 'CONFIRMED', label: 'Đã nộp quỹ' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFilterStatus(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterStatus === st.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={loadReceipts}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw size={13} className={loadingReceipts ? 'animate-spin' : ''} />
                <span>Làm mới danh sách</span>
              </button>
            </div>
          </div>

          {/* Bảng chi tiết danh sách đối chiếu */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Mã phiếu</th>
                    <th className="px-4 py-3">Ngày thu</th>
                    <th className="px-4 py-3">Đại lý nộp tiền</th>
                    <th className="px-4 py-3">Nhân viên thu</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                    <th className="px-4 py-3">Hình thức</th>
                    <th className="px-4 py-3 text-center">Biên lai</th>
                    <th className="px-4 py-3 text-center">Trạng thái nộp quỹ</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loadingReceipts ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        <span className="inline-block w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                        <p>Đang tải dữ liệu đối chiếu...</p>
                      </td>
                    </tr>
                  ) : receiptsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        Không tìm thấy khoản thu nào trong khoảng thời gian đã chọn.
                      </td>
                    </tr>
                  ) : (
                    receiptsList.map((receipt) => {
                      const isPending = receipt.status === 'PENDING_SUBMISSION';
                      return (
                        <tr key={receipt.id} className="hover:bg-gray-50/80 transition">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">
                            {receipt.code}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {receipt.paymentDate}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-900 block">{receipt.customerName}</span>
                            <span className="text-[11px] text-gray-500 font-mono">{receipt.customerCode}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            <span className="font-semibold block">{receipt.collectorName}</span>
                            <span className="text-[11px] text-gray-500 font-mono">@{receipt.collectorUsername}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-sm text-emerald-800">
                            {formatCurrencyVND(receipt.amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {receipt.paymentMethod === 'CASH'
                              ? 'Tiền mặt'
                              : receipt.paymentMethod === 'BANK_TRANSFER'
                              ? 'Chuyển khoản'
                              : 'Khác'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {receipt.receiptImageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImageModalUrl(receipt.receiptImageUrl!)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition cursor-pointer"
                                title="Xem ảnh chụp biên lai"
                              >
                                <ImageIcon size={13} />
                                <span>Xem ảnh</span>
                              </button>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock size={12} />
                                <span>Chờ nộp quỹ</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 size={12} />
                                <span>Đã nộp quỹ</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Nút Kế toán xác nhận nộp quỹ */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmSubmission(receipt)}
                                  disabled={confirmingId === receipt.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                                  title="Kế toán xác nhận đã nhận đủ tiền nộp về quỹ"
                                >
                                  {confirmingId === receipt.id ? (
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <ShieldCheck size={14} />
                                  )}
                                  <span>Xác nhận nộp quỹ</span>
                                </button>
                              )}

                              {/* Nút in phiếu thu */}
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptForPrint(receipt);
                                  setShowPrintModal(true);
                                }}
                                className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 transition cursor-pointer"
                                title="In hoặc tải PDF phiếu thu"
                              >
                                <Printer size={15} />
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
        </div>
      )}

      {/* Modal xem ảnh biên lai */}
      {previewImageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl p-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon size={18} className="text-emerald-600" />
                <span>Ảnh chụp biên nhận / Chứng từ thanh toán</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewImageModalUrl(null)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto flex items-center justify-center bg-gray-100 rounded-xl p-2">
              <img
                src={previewImageModalUrl}
                alt="Biên lai phóng to"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal In/Tải phiếu thu */}
      {showPrintModal && (
        <PaymentReceiptPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          receipt={receiptForPrint}
        />
      )}
    </div>
  );
};
