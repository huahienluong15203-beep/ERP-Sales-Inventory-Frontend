import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  ListOrdered,
  ShieldAlert,
  Search,
  Camera,
  Trash2,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import {
  fetchCustomerInvoicesForDebt,
  fetchCustomerCreditStatus,
  createPaymentReceipt,
  submitRouteCashCollection
} from '../../services/paymentApi';
import { fetchAgencies } from '../../services/agencyApi';
import type { Agency, CreditStatusResponse } from '../../types/agency';
import type {
  PaymentReceipt,
  PaymentMethod,
  AllocationType,
  CustomerInvoiceDebtItem
} from '../../types/payment';
import { SearchSelect } from '../common/SearchSelect';
import { PaymentReceiptPrintModal } from './PaymentReceiptPrintModal';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: number | string;
  onSuccess?: (receipt: PaymentReceipt) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
  onSuccess
}) => {
  const { user, showToast } = useAuth();

  // Danh sách đại lý để chọn nếu chưa truyền initialCustomerId
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId ? String(initialCustomerId) : ''
  );
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);

  // Dữ liệu công nợ & hoá đơn của khách hàng được chọn
  const [creditStatus, setCreditStatus] = useState<CreditStatusResponse | null>(null);
  const [invoices, setInvoices] = useState<CustomerInvoiceDebtItem[]>([]);
  const [loadingDebtData, setLoadingDebtData] = useState<boolean>(false);

  // Form fields
  const [amount, setAmount] = useState<number>(0);
  const [amountInputStr, setAmountInputStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [collectorName, setCollectorName] = useState<string>(
    user?.fullName || 'Kế toán công nợ'
  );
  const [notes, setNotes] = useState<string>('');

  // Cơ chế đối trừ công nợ: FIFO hoặc Chỉ định cụ thể
  const [allocationType, setAllocationType] = useState<AllocationType>('FIFO');

  // Phân bổ chỉ định: record invoiceId -> allocated amount
  const [specificAllocations, setSpecificAllocations] = useState<Record<number, number>>({});
  const [invoiceSearchText, setInvoiceSearchText] = useState<string>('');

  // Submitting state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // S7-05: Chế độ thu tiền theo tuyến kèm ảnh biên lai (Chờ nộp quỹ)
  const isSalesRep = user?.role === 'ROLE_SALES_REP';
  const [isRouteCashMode, setIsRouteCashMode] = useState<boolean>(isSalesRep);
  const [receiptImage, setReceiptImage] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setValidationError('Kích thước ảnh biên lai không được vượt quá 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setReceiptImage(String(uploadEvent.target?.result || ''));
      setValidationError(null);
    };
    reader.readAsDataURL(file);
  };

  // Modal in phiếu thu sau khi lưu thành công
  const [savedReceiptForPrint, setSavedReceiptForPrint] = useState<PaymentReceipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Tải danh sách đại lý khi modal mở
  useEffect(() => {
    if (!isOpen) return;
    setIsRouteCashMode(user?.role === 'ROLE_SALES_REP');
    setReceiptImage('');
    setValidationError(null);

    if (initialCustomerId) {
      setSelectedCustomerId(String(initialCustomerId));
    }

    setLoadingAgencies(true);
    fetchAgencies({ size: 100 })
      .then((res) => {
        setAgencies(res.content || []);
        if (!initialCustomerId && res.content?.length > 0) {
          setSelectedCustomerId(String(res.content[0].id));
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh mục đại lý:', err);
      })
      .finally(() => {
        setLoadingAgencies(false);
      });
  }, [isOpen, initialCustomerId]);

  // Tải công nợ và hoá đơn khi đổi khách hàng
  useEffect(() => {
    if (!isOpen || !selectedCustomerId) {
      setInvoices([]);
      setCreditStatus(null);
      return;
    }

    setLoadingDebtData(true);
    setValidationError(null);

    Promise.all([
      fetchCustomerCreditStatus(selectedCustomerId),
      fetchCustomerInvoicesForDebt(selectedCustomerId)
    ])
      .then(([credit, invs]) => {
        setCreditStatus(credit);
        setInvoices(invs);
        // Reset phân bổ chỉ định
        setSpecificAllocations({});
      })
      .catch((err) => {
        console.warn('Lỗi tải hoá đơn công nợ của khách hàng:', err);
      })
      .finally(() => {
        setLoadingDebtData(false);
      });
  }, [isOpen, selectedCustomerId]);

  // Tổng công nợ còn lại từ danh sách hoá đơn chưa trả hết
  const totalRemainingDebt = useMemo(() => {
    return invoices.reduce((sum, item) => sum + (item.remainingAmount || 0), 0);
  }, [invoices]);

  // Tính toán tự động phân bổ FIFO preview
  const fifoAllocationsPreview = useMemo(() => {
    if (allocationType !== 'FIFO' || amount <= 0) return [];

    const unpaid = [...invoices]
      .filter((i) => i.remainingAmount > 0)
      .sort((a, b) => (a.invoiceDate > b.invoiceDate ? 1 : -1));

    let moneyLeft = amount;
    return unpaid.map((inv) => {
      if (moneyLeft <= 0) {
        return {
          invoice: inv,
          allocated: 0,
          remainingAfter: inv.remainingAmount
        };
      }
      const allocated = Math.min(moneyLeft, inv.remainingAmount);
      moneyLeft -= allocated;
      return {
        invoice: inv,
        allocated,
        remainingAfter: inv.remainingAmount - allocated
      };
    });
  }, [allocationType, amount, invoices]);

  // Tổng số tiền đã phân bổ trong chế độ chỉ định
  const totalSpecificAllocated = useMemo(() => {
    return Object.values(specificAllocations).reduce((sum, val) => sum + (val || 0), 0);
  }, [specificAllocations]);

  // Danh sách hoá đơn đã lọc tìm kiếm trong chế độ chỉ định (phục vụ tìm kiếm khi có nhiều hoá đơn)
  const filteredInvoicesForSpecific = useMemo(() => {
    const unpaid = invoices.filter((i) => i.remainingAmount > 0);
    if (!invoiceSearchText.trim()) return unpaid;
    const kw = invoiceSearchText.trim().toLowerCase();
    return unpaid.filter(
      (i) => i.code.toLowerCase().includes(kw) || i.invoiceDate.includes(kw)
    );
  }, [invoices, invoiceSearchText]);

  // Xử lý thay đổi số tiền nhập
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = Number(rawVal) || 0;
    setAmount(num);
    setAmountInputStr(rawVal ? num.toLocaleString('vi-VN') : '');
    setValidationError(null);

    // Nếu đang ở chế độ FIFO và số tiền thay đổi, không cần làm gì thêm
    // Nếu chuyển chế độ sang SPECIFIC, ta có thể gợi ý
  };

  // Nút điền nhanh: Thu toàn bộ công nợ
  const handleSelectFullDebt = () => {
    setAmount(totalRemainingDebt);
    setAmountInputStr(totalRemainingDebt.toLocaleString('vi-VN'));
    setValidationError(null);
  };

  // Xử lý nhập số tiền phân bổ cho từng hoá đơn ở chế độ chỉ định
  const handleSpecificAmountChange = (invoiceId: number, val: number, maxAllowed: number) => {
    const safeVal = Math.max(0, Math.min(val, maxAllowed));
    setSpecificAllocations((prev) => ({
      ...prev,
      [invoiceId]: safeVal
    }));
    setValidationError(null);
  };

  // Nút phân bổ tối đa cho một hoá đơn cụ thể
  const handleAllocateMaxForInvoice = (inv: CustomerInvoiceDebtItem) => {
    const currentAlloc = specificAllocations[inv.id] || 0;
    const remainingToPay = amount - (totalSpecificAllocated - currentAlloc);
    const canAlloc = Math.max(0, Math.min(inv.remainingAmount, remainingToPay));

    setSpecificAllocations((prev) => ({
      ...prev,
      [inv.id]: canAlloc
    }));
    setValidationError(null);
  };

  // Xử lý Lưu phiếu thu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      setValidationError('Vui lòng chọn đại lý thanh toán');
      return;
    }

    if (amount <= 0) {
      setValidationError('Vui lòng nhập số tiền thu lớn hơn 0');
      return;
    }

    // Tiêu chí: Không cho thu vượt tổng công nợ còn lại
    if (amount > totalRemainingDebt) {
      setValidationError(
        `Số tiền thu (${formatCurrencyVND(amount)}) không được vượt quá tổng công nợ còn lại của đại lý (${formatCurrencyVND(totalRemainingDebt)})`
      );
      return;
    }

    // Nếu chọn chỉ định: kiểm tra tổng phân bổ có khớp với số tiền thu không (chỉ khi không ở chế độ thu tiền theo tuyến)
    if (!isRouteCashMode && allocationType === 'SPECIFIC') {
      if (totalSpecificAllocated !== amount) {
        setValidationError(
          `Tổng số tiền phân bổ vào các hoá đơn (${formatCurrencyVND(totalSpecificAllocated)}) chưa khớp với tổng số tiền thu (${formatCurrencyVND(amount)})`
        );
        return;
      }
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const selectedAgency = agencies.find((a) => String(a.id) === String(selectedCustomerId));
      let created: PaymentReceipt;

      if (isRouteCashMode) {
        created = await submitRouteCashCollection(
          {
            customerId: Number(selectedCustomerId),
            amount,
            paymentMethod,
            paymentDate,
            notes: notes.trim(),
            receiptImageUrl: receiptImage.startsWith('http') ? receiptImage : undefined,
            receiptImageBase64: receiptImage.startsWith('data:') ? receiptImage : (receiptImage || undefined)
          },
          {
            code: selectedAgency?.code || `DL-${selectedCustomerId}`,
            name: selectedAgency?.name || `Đại lý #${selectedCustomerId}`,
            address: selectedAgency?.address,
            phone: selectedAgency?.phone
          },
          {
            username: user?.username || 'sales_rep',
            fullName: user?.fullName || collectorName.trim() || 'Nhân viên kinh doanh'
          }
        );
        showToast('Ghi nhận thu tiền tại tuyến thành công! Trạng thái: Chờ nộp quỹ.', 'success');
      } else {
        const specificArray =
          allocationType === 'SPECIFIC'
            ? Object.entries(specificAllocations)
                .filter(([, val]) => val > 0)
                .map(([idStr, val]) => ({
                  invoiceId: Number(idStr),
                  amount: val
                }))
            : undefined;

        created = await createPaymentReceipt(
          {
            customerId: Number(selectedCustomerId),
            amount,
            paymentMethod,
            paymentDate,
            collectorName: collectorName.trim() || 'Kế toán công nợ',
            notes: notes.trim(),
            allocationType,
            specificAllocations: specificArray
          },
          {
            code: selectedAgency?.code || `DL-${selectedCustomerId}`,
            name: selectedAgency?.name || `Đại lý #${selectedCustomerId}`,
            address: selectedAgency?.address,
            phone: selectedAgency?.phone
          },
          {
            username: user?.username || 'accountant',
            fullName: user?.fullName || 'Kế toán'
          }
        );
        showToast('Ghi nhận phiếu thu và đối trừ công nợ thành công!', 'success');
      }

      if (onSuccess) {
        onSuccess(created);
      }

      // Mở modal in phiếu thu
      setSavedReceiptForPrint(created);
      setShowPrintModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi ghi nhận phiếu thu';
      setValidationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintModalClose = () => {
    setShowPrintModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs text-white">
                <CreditCard size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Lập phiếu thu tiền & Đối trừ công nợ</h2>
                <p className="text-xs text-emerald-100">
                  Ghi nhận thanh toán đa phương thức, tự động hoặc chỉ định đối trừ từng hoá đơn
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Cảnh báo lỗi xác thực */}
            {validationError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-fade-in">
                <ShieldAlert size={20} className="shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1 font-medium">{validationError}</div>
              </div>
            )}

            {/* Khối 1: Chọn Khách hàng & Tóm tắt nợ */}
            <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={15} className="text-emerald-600" />
                  <span>Khách hàng / Đại lý thanh toán *</span>
                </label>

                {totalRemainingDebt > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectFullDebt}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer self-start sm:self-auto"
                  >
                    Thu toàn bộ nợ còn lại ({formatCurrencyVND(totalRemainingDebt)})
                  </button>
                )}
              </div>

              <SearchSelect
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={loadingAgencies || !!initialCustomerId}
                searchPlaceholder="Gõ để tìm kiếm đại lý..."
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Chọn đại lý thanh toán --</option>
                {agencies.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.code} - {ag.name} ({ag.customerGroupName || 'Đại lý'})
                  </option>
                ))}
              </SearchSelect>

              {/* Thẻ trạng thái công nợ nhanh */}
              {loadingDebtData ? (
                <div className="text-xs text-gray-500 italic py-1">Đang tải thông tin công nợ...</div>
              ) : creditStatus ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-200 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Tổng công nợ còn lại:</span>
                    <span className="font-bold text-rose-600 font-mono text-sm">
                      {formatCurrencyVND(totalRemainingDebt)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Hạn mức tín dụng:</span>
                    <span className="font-semibold text-gray-800 font-mono text-sm">
                      {formatCurrencyVND(creditStatus.creditLimit)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Hạn mức khả dụng:</span>
                    <span className="font-bold text-emerald-600 font-mono text-sm">
                      {formatCurrencyVND(creditStatus.availableCredit)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Hoá đơn chưa thanh toán:</span>
                    <span className="font-bold text-gray-800 font-mono text-sm">
                      {invoices.filter((i) => i.remainingAmount > 0).length} hoá đơn
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Khối 2: Thông tin khoản tiền thu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Số tiền thu */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={15} className="text-emerald-600" />
                    <span>Số tiền thu thực tế (VNĐ) *</span>
                  </span>
                  {amount > 0 && (
                    <span className="text-xs text-emerald-700 font-bold font-mono">
                      {formatCurrencyVND(amount)}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số tiền thu (Ví dụ: 20,000,000)"
                  value={amountInputStr}
                  onChange={handleAmountChange}
                  className="w-full px-4 py-3 bg-white border-2 border-emerald-500/80 rounded-xl text-lg font-black text-emerald-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {amount > 0 && (
                  <p className="text-xs text-gray-600 italic mt-1">
                    Bằng chữ: <span className="font-semibold text-gray-900">{numberToVietnameseWords(amount)}</span>
                  </p>
                )}
              </div>

              {/* Hình thức thanh toán */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={15} className="text-emerald-600" />
                  <span>Hình thức thanh toán *</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="BANK_TRANSFER">Chuyển khoản qua ngân hàng</option>
                  <option value="CASH">Tiền mặt tại quỹ / điểm bán</option>
                  <option value="OTHER">Hình thức thanh toán khác</option>
                </select>
              </div>

              {/* Ngày thu tiền */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={15} className="text-emerald-600" />
                  <span>Ngày thu tiền *</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Người thu tiền */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={15} className="text-emerald-600" />
                  <span>Người thu tiền / Kế toán lập phiếu *</span>
                </label>
                <input
                  type="text"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Nhập họ tên người thu tiền"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-emerald-600" />
                  <span>Ghi chú / Diễn giải chứng từ</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Thanh toán tiền hàng đợt 2 theo hợp đồng"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* S7-05: Chế độ thu tiền theo tuyến kèm ảnh biên lai */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRouteCashMode}
                    onChange={(e) => {
                      setIsRouteCashMode(e.target.checked);
                      if (e.target.checked) {
                        setAllocationType('FIFO');
                      }
                    }}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      <span>Thu tiền theo tuyến (Chờ nộp quỹ - S7-05)</span>
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5">
                      Ghi nhận thu tiền tại cửa hàng kèm ảnh biên lai, khoản thu chờ kế toán xác nhận nộp quỹ
                    </span>
                  </div>
                </label>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-200/80 text-amber-900 border border-amber-300">
                  {isRouteCashMode ? 'Chờ nộp quỹ' : 'Ghi nhận trực tiếp'}
                </span>
              </div>

              {isRouteCashMode && (
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Camera size={14} className="text-amber-700" />
                    <span>Ảnh biên lai thu tiền chụp tại cửa hàng *</span>
                  </label>

                  {receiptImage ? (
                    <div className="relative inline-block border-2 border-emerald-500 rounded-xl overflow-hidden shadow-sm">
                      <img src={receiptImage} alt="Ảnh biên lai" className="h-32 w-auto object-cover" />
                      <button
                        type="button"
                        onClick={() => setReceiptImage('')}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black transition cursor-pointer"
                        title="Xoá ảnh biên lai"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs">
                        <Camera size={15} className="text-amber-700" />
                        <span>Chụp hoặc chọn ảnh biên lai</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-amber-700 italic">
                        (Lưu vết ảnh biên lai để đối chiếu tiền đã thu với tiền đã nộp không tranh cãi)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Khối 3: Cơ chế đối trừ công nợ (FIFO hoặc Chỉ định cụ thể) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered size={15} className="text-emerald-600" />
                  <span>Phương thức đối trừ vào hoá đơn</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setAllocationType('FIFO')}
                  className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${
                    allocationType === 'FIFO'
                      ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocationType"
                    checked={allocationType === 'FIFO'}
                    onChange={() => setAllocationType('FIFO')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-sm block">Tự động đối trừ hoá đơn cũ nhất trước (FIFO)</span>
                    <span className="text-xs text-gray-500 mt-0.5 block">
                      Hệ thống tự phân bổ số tiền thu vào các hoá đơn phát hành sớm nhất trước, phần dư chuyển tiếp hoá đơn kế tiếp.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setAllocationType('SPECIFIC')}
                  className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${
                    allocationType === 'SPECIFIC'
                      ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocationType"
                    checked={allocationType === 'SPECIFIC'}
                    onChange={() => setAllocationType('SPECIFIC')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-sm block">Chỉ định đối trừ vào từng hoá đơn cụ thể</span>
                    <span className="text-xs text-gray-500 mt-0.5 block">
                      Kế toán chủ động chọn từng hoá đơn và nhập số tiền thu tương ứng cho từng hoá đơn cần cấn trừ.
                    </span>
                  </div>
                </label>
              </div>

              {/* Chi tiết bảng đối trừ theo chế độ đã chọn */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mt-3">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase">
                    {allocationType === 'FIFO'
                      ? 'Xem trước phân bổ tự động theo thứ tự hoá đơn cũ nhất (FIFO)'
                      : `Danh sách hoá đơn cần phân bổ (${formatCurrencyVND(totalSpecificAllocated)} / ${formatCurrencyVND(amount)})`}
                  </span>
                  {allocationType === 'SPECIFIC' && (
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        totalSpecificAllocated === amount
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {totalSpecificAllocated === amount ? 'Đã phân bổ khớp 100%' : 'Chưa phân bổ khớp'}
                    </span>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {invoices.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500">
                      Đại lý hiện không có hoá đơn nào còn nợ.
                    </div>
                  ) : allocationType === 'FIFO' ? (
                    /* FIFO Table Preview */
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100/70 text-gray-600 font-semibold border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Mã hoá đơn</th>
                          <th className="px-3 py-2">Ngày phát hành</th>
                          <th className="px-3 py-2 text-right">Tổng tiền</th>
                          <th className="px-3 py-2 text-right">Nợ hiện tại</th>
                          <th className="px-3 py-2 text-right">Dự kiến thu</th>
                          <th className="px-3 py-2 text-right">Nợ còn lại</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {fifoAllocationsPreview.map(({ invoice: inv, allocated, remainingAfter }) => (
                          <tr
                            key={inv.id}
                            className={allocated > 0 ? 'bg-emerald-50/40 font-medium' : 'hover:bg-gray-50'}
                          >
                            <td className="px-3 py-2 font-mono font-bold text-gray-900">{inv.code}</td>
                            <td className="px-3 py-2 text-gray-600">{inv.invoiceDate}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-600">
                              {formatCurrencyVND(inv.totalAmount)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-rose-600 font-bold">
                              {formatCurrencyVND(inv.remainingAmount)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                              {allocated > 0 ? `-${formatCurrencyVND(allocated)}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-800">
                              {formatCurrencyVND(remainingAfter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Specific Allocations Table */
                    <div>
                      {/* Ô tìm kiếm hoá đơn khi số lượng hoá đơn nhiều */}
                      <div className="p-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={invoiceSearchText}
                          onChange={(e) => setInvoiceSearchText(e.target.value)}
                          placeholder="Gõ để tìm mã hoá đơn, ngày lập..."
                          className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-gray-800"
                        />
                      </div>
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100/70 text-gray-600 font-semibold border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Mã hoá đơn</th>
                            <th className="px-3 py-2">Ngày lập</th>
                            <th className="px-3 py-2 text-right">Nợ hiện tại</th>
                            <th className="px-3 py-2 text-right w-44">Số tiền thu vào HĐ này</th>
                            <th className="px-3 py-2 text-center w-20">Tối đa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredInvoicesForSpecific.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                                Không tìm thấy hoá đơn phù hợp với từ khoá
                              </td>
                            </tr>
                          ) : (
                            filteredInvoicesForSpecific.map((inv) => {
                              const curVal = specificAllocations[inv.id] || 0;
                              return (
                                <tr key={inv.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-mono font-bold text-gray-900">{inv.code}</td>
                                  <td className="px-3 py-2 text-gray-600">{inv.invoiceDate}</td>
                                  <td className="px-3 py-2 text-right font-mono text-rose-600 font-bold">
                                    {formatCurrencyVND(inv.remainingAmount)}
                                  </td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    max={inv.remainingAmount}
                                    value={curVal || ''}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleSpecificAmountChange(
                                        inv.id,
                                        Number(e.target.value) || 0,
                                        inv.remainingAmount
                                      )
                                    }
                                    className="w-full px-2 py-1 text-right font-mono font-bold text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleAllocateMaxForInvoice(inv)}
                                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition cursor-pointer"
                                  >
                                    Điền hết
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={submitting || amount <= 0}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang ghi nhận...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isRouteCashMode ? 'Ghi nhận thu tiền tại tuyến' : 'Xác nhận thu tiền & In phiếu'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal in phiếu thu sau khi tạo thành công */}
      {showPrintModal && (
        <PaymentReceiptPrintModal
          isOpen={showPrintModal}
          onClose={handlePrintModalClose}
          receipt={savedReceiptForPrint}
        />
      )}
    </>
  );
};
