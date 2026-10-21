import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Warehouse as WarehouseIcon,
  Receipt,
  CheckCircle2,
  Check,
  AlertTriangle,
  Layers,
  Search,
  Building2
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { searchInvoices, fetchInvoiceById } from '../../services/invoiceApi';
import { fetchWarehouses } from '../../services/warehouseApi';
import {
  fetchReturnableInvoiceLines,
  createSalesReturn,
  type ReturnableInvoiceLine,
  type CreateSalesReturnPayload
} from '../../services/salesReturnApi';
import type { InvoiceSummaryResponse } from '../../types/invoice';
import type { Warehouse } from '../../types/warehouse';
import { formatCurrencyVND } from '../../services/orderService';
import { fetchAgencies } from '../../services/agencyApi';
import type { Agency } from '../../types/agency';
import { SearchSelect } from '../../components/common/SearchSelect';
import { useServerSearch } from '../../hooks/useServerSearch';

const INVOICE_PAGE_SIZE = 20;
const AGENCY_PAGE_SIZE = 20;

interface LineItemState extends ReturnableInvoiceLine {
  selected: boolean;
  returnQty: number | string;
  batchNumber: string;
  manufactureDate: string;
  expiredDate: string;
  isDamaged: boolean;
  lineNotes: string;
  error?: string;
}

const RETURN_REASONS = [
  'Hàng lỗi do nhà sản xuất',
  'Hàng cận date / Hết hạn sử dụng',
  'Giao sai quy cách / Mã sản phẩm',
  'Đại lý chậm luân chuyển hàng tồn',
  'Bao bì móp méo / Hỏng khi vận chuyển',
  'Lý do khác'
];

const isDamagedReturnReason = (reason: string): boolean => {
  const lower = (reason || '').toLowerCase();
  return (
    lower.includes('lỗi') ||
    lower.includes('hỏng') ||
    lower.includes('móp méo') ||
    lower.includes('hết hạn') ||
    lower.includes('cận date')
  );
};

const getTodayLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CreateSalesReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Danh sách kho & hoá đơn: chỉ lấy dữ liệu thật từ API (không dùng dữ liệu mẫu khi lỗi)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
  const [invoicePage, setInvoicePage] = useState<number>(0);
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0);
  const [invoiceHasMore, setInvoiceHasMore] = useState<boolean>(false);

  // Đại lý: tìm trên server + cuộn tải thêm (không giới hạn trong vài chục hoá đơn đầu)
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyPage, setAgencyPage] = useState<number>(0);
  const [agencyHasMore, setAgencyHasMore] = useState<boolean>(true);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);
  const [agencyKeyword, setAgencyKeyword] = useState<string>('');
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState<string>('');

  // Form State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummaryResponse | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'ALL'>('ALL');
  const [invoiceKeyword, setInvoiceKeyword] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [returnReason, setReturnReason] = useState<string>('Hàng lỗi do nhà sản xuất');
  const [returnDate, setReturnDate] = useState<string>(getTodayLocalDateString);
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const { serverKeyword: invoiceServerKeyword, flush: flushInvoiceSearch } = useServerSearch(invoiceKeyword);

  // Danh sách dòng hàng của hoá đơn
  const [loadingLines, setLoadingLines] = useState<boolean>(false);
  const [lineItems, setLineItems] = useState<LineItemState[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Khi chọn hoá đơn -> tải các dòng hàng có thể hoàn trả
  const handleSelectInvoice = useCallback(async (inv: InvoiceSummaryResponse) => {
    setSelectedInvoice(inv);
    setLoadingLines(true);
    try {
      const lines = (await fetchReturnableInvoiceLines(inv.id)) || [];
      if (lines.length === 0) {
        showToast(`Hoá đơn ${inv.code} không còn mặt hàng nào trả được`, 'warning');
      }
      const mapped = lines.map((l) => {
        const canReturn = (Number(l.remainingReturnableQuantity) || 0) > 0;
        return {
          ...l,
          selected: false,
          returnQty: canReturn ? 1 : 0,
          batchNumber: l.batchNumber || '',
          manufactureDate: l.manufactureDate || '',
          expiredDate: l.expiredDate || '',
          isDamaged: isDamagedReturnReason(returnReason),
          lineNotes: '',
          error: undefined
        };
      });
      // Sắp xếp mặt hàng còn được chọn lên đầu (remainingReturnableQuantity > 0)
      mapped.sort((a, b) => {
        const aCan = (Number(a.remainingReturnableQuantity) || 0) > 0 ? 1 : 0;
        const bCan = (Number(b.remainingReturnableQuantity) || 0) > 0 ? 1 : 0;
        return bCan - aCan;
      });
      setLineItems(mapped);
    } catch (err: any) {
      showToast(err?.message || 'Không thể tải chi tiết dòng hàng của hoá đơn', 'error');
      setLineItems([]);
    } finally {
      setLoadingLines(false);
    }
  }, [showToast]);

  // Tải danh sách đại lý (tìm trên server + cuộn tải thêm)
  const loadAgencies = useCallback(async (targetPage: number, kw: string, append: boolean) => {
    setLoadingAgencies(true);
    try {
      const res = await fetchAgencies({ page: targetPage, size: AGENCY_PAGE_SIZE, keyword: kw.trim() || undefined });
      const items = res.content || [];
      setAgencies((prev) => {
        if (!append) return items;
        const ids = new Set(prev.map((a) => a.id));
        return [...prev, ...items.filter((a) => !ids.has(a.id))];
      });
      setAgencyPage(targetPage);
      setAgencyHasMore(targetPage + 1 < (res.totalPages || 0));
    } catch (err: any) {
      showToast(err?.message || 'Không tải được danh sách đại lý', 'error');
    } finally {
      setLoadingAgencies(false);
    }
  }, [showToast]);

  // Tải hoá đơn theo đại lý + từ khoá (lọc trên server, có phân trang)
  const loadInvoices = useCallback(async (targetPage: number, append: boolean) => {
    setLoadingInvoices(true);
    try {
      const res = await searchInvoices({
        customerId: selectedCustomerId === 'ALL' ? undefined : selectedCustomerId,
        keyword: invoiceServerKeyword || undefined,
        page: targetPage,
        size: INVOICE_PAGE_SIZE
      });
      const items = res.content || [];
      setInvoices((prev) => {
        if (!append) return items;
        const ids = new Set(prev.map((i) => i.id));
        return [...prev, ...items.filter((i) => !ids.has(i.id))];
      });
      setInvoicePage(targetPage);
      setInvoiceTotal(res.totalElements || 0);
      setInvoiceHasMore(targetPage + 1 < (res.totalPages || 0));
    } catch (err: any) {
      showToast(err?.message || 'Không tải được danh sách hoá đơn', 'error');
      if (!append) setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [selectedCustomerId, invoiceServerKeyword, showToast]);

  useEffect(() => {
    loadInvoices(0, false);
  }, [loadInvoices]);

  // Tải dữ liệu ban đầu: kho tiếp nhận, đại lý, hoá đơn truyền qua ?invoiceId=
  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      try {
        try {
          const whs = await fetchWarehouses();
          setWarehouses(whs || []);
          if (whs && whs.length > 0) {
            setSelectedWarehouseId((prev) => prev || whs[0].id);
          }
        } catch (err: any) {
          showToast(err?.message || 'Không tải được danh sách kho tiếp nhận', 'error');
        }
        loadAgencies(0, '', false);

        // Tự động chọn hoá đơn nếu được truyền từ trang hoá đơn qua query param ?invoiceId=...
        const paramInvoiceIdStr = new URLSearchParams(window.location.search).get('invoiceId');
        if (paramInvoiceIdStr) {
          const paramInvoiceId = Number(paramInvoiceIdStr);
          try {
            const singleInv = await fetchInvoiceById(paramInvoiceId);
            if (singleInv) {
              const singleSummary: InvoiceSummaryResponse = {
                id: singleInv.id ?? paramInvoiceId,
                code: singleInv.code ?? `HD-${paramInvoiceId}`,
                invoiceDate: singleInv.invoiceDate,
                status: singleInv.status,
                customerId: singleInv.customerId,
                customerCode: singleInv.customerCode,
                customerName: singleInv.customerName,
                totalAmount: singleInv.totalAmount,
                notes: singleInv.note,
                issuedAt: singleInv.issuedAt,
                issuedByUsername: singleInv.issuedByUsername
              };
              if (singleSummary.customerId) {
                setSelectedCustomerId(singleSummary.customerId);
                setSelectedCustomerLabel(`[${singleSummary.customerCode ?? ''}] ${singleSummary.customerName ?? ''}`);
              }
              handleSelectInvoice(singleSummary);
            }
          } catch (err: any) {
            showToast(err?.message || 'Không tải được hoá đơn được chọn', 'error');
          }
        }
      } finally {
        setLoadingInitial(false);
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectCustomer = (value: string) => {
    if (!value || value === 'ALL') {
      setSelectedCustomerId('ALL');
      setSelectedCustomerLabel('');
    } else {
      const id = Number(value);
      const ag = agencies.find((a) => String(a.id) === value);
      setSelectedCustomerId(id);
      setSelectedCustomerLabel(ag ? `[${ag.code}] ${ag.name}` : '');
    }
    setSelectedInvoice(null);
    setLineItems([]);
  };

  // Cập nhật chọn/bỏ chọn dòng hàng
  const handleToggleSelectLine = (invoiceLineId: number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.invoiceLineId === invoiceLineId) {
          const nextSelected = !item.selected;
          return {
            ...item,
            selected: nextSelected,
            returnQty: nextSelected ? (Number(item.returnQty) > 0 ? item.returnQty : 1) : item.returnQty
          };
        }
        return item;
      })
    );
  };

  // Chọn tất cả hoặc bỏ chọn tất cả
  const handleToggleSelectAll = (select: boolean) => {
    setLineItems((prev) =>
      prev.map((item) => {
        const canReturn = item.remainingReturnableQuantity > 0;
        if (!canReturn) return item;
        return {
          ...item,
          selected: select,
          returnQty: select ? (Number(item.returnQty) > 0 ? item.returnQty : 1) : item.returnQty
        };
      })
    );
  };

  // Cập nhật giá trị một trường trong dòng hàng (tự động kích hoạt chọn dòng nếu chưa chọn)
  const handleUpdateLineField = (
    invoiceLineId: number,
    field: keyof LineItemState,
    value: any
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.invoiceLineId !== invoiceLineId) return item;

        // Tự động kích hoạt chọn dòng
        const updated: LineItemState = { ...item, selected: true, [field]: value };

        // Kiểm tra số lượng trả không vượt quá số còn được trả (AC2)
        if (field === 'returnQty') {
          if (value === '') {
            updated.returnQty = '';
            updated.error = undefined;
          } else {
            const num = Number(value);
            if (isNaN(num) || num <= 0) {
              updated.error = 'Số lượng trả phải lớn hơn 0';
            } else if (num > item.remainingReturnableQuantity) {
              updated.error = `Tối đa ${item.remainingReturnableQuantity} ${item.unitName}`;
            } else {
              updated.error = undefined;
            }
          }
        }

        // Kiểm tra số lô nếu SKU quản lý lô (AC3)
        if (field === 'batchNumber' && item.hasBatchManagement) {
          if (!value?.toString().trim()) {
            updated.error = 'SKU có quản lý lô, vui lòng nhập số lô';
          } else {
            updated.error = undefined;
          }
        }

        return updated;
      })
    );
  };

  // Tính tổng
  const selectedLines = lineItems.filter((i) => i.selected);
  const totalReturnQty = selectedLines.reduce((acc, i) => acc + (Number(i.returnQty) || 0), 0);
  const totalReturnAmount = selectedLines.reduce(
    (acc, i) => acc + (Number(i.returnQty) || 0) * (Number(i.pricePerUnit) || 0),
    0
  );

  // Submit lập phiếu
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedInvoice) {
      showToast('Vui lòng chọn hoá đơn gốc cần trả hàng', 'warning');
      return;
    }
    if (!selectedWarehouseId) {
      showToast('Vui lòng chọn kho tiếp nhận hàng hoàn', 'warning');
      return;
    }
    if (!returnReason.trim()) {
      showToast('Bắt buộc chọn lý do trả hàng (AC1)', 'warning');
      return;
    }
    if (selectedLines.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 dòng sản phẩm muốn trả hàng', 'warning');
      return;
    }

    // Kiểm tra validate từng dòng
    for (const line of selectedLines) {
      const qty = Number(line.returnQty);
      if (isNaN(qty) || qty <= 0) {
        showToast(`Số lượng trả của sản phẩm "${line.productName}" phải lớn hơn 0`, 'error');
        return;
      }
      if (qty > line.remainingReturnableQuantity) {
        showToast(
          `Sản phẩm "${line.productName}" vượt quá số lượng cho phép trả (${line.remainingReturnableQuantity})`,
          'error'
        );
        return;
      }
      if (line.hasBatchManagement && !line.batchNumber?.trim()) {
        showToast(`Sản phẩm "${line.productName}" quản lý theo lô, bắt buộc nhập số lô`, 'error');
        return;
      }
    }

    const payload: CreateSalesReturnPayload = {
      invoiceId: selectedInvoice.id,
      receivingWarehouseId: Number(selectedWarehouseId),
      returnReason,
      returnDate,
      notes: generalNotes.trim() || undefined,
      items: selectedLines.map((line) => ({
        invoiceLineId: line.invoiceLineId,
        returnQuantity: Number(line.returnQty),
        batchNumber: line.batchNumber?.trim() || undefined,
        manufactureDate: line.manufactureDate || undefined,
        expiredDate: line.expiredDate || undefined,
        isDamaged: Boolean(line.isDamaged),
        lineNotes: line.lineNotes?.trim() || undefined
      }))
    };

    setSubmitting(true);
    try {
      const created = await createSalesReturn(payload);
      showToast(`Lập phiếu trả hàng ${created.code} thành công! Đang chờ Quản lý kho xác nhận.`, 'success');
      navigate('/sales-returns');
    } catch (err: any) {
      showToast(err?.message || 'Không thể lập phiếu trả hàng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnReasonChange = (newReason: string) => {
    setReturnReason(newReason);
    const damaged = isDamagedReturnReason(newReason);
    setLineItems((prev) =>
      prev.map((item) => ({
        ...item,
        isDamaged: damaged
      }))
    );
  };

  // Hoá đơn đang chọn luôn hiện trong danh sách (kể cả khi được mở qua ?invoiceId= và nằm ở trang sau)
  const displayedInvoices =
    selectedInvoice && !invoices.some((i) => i.id === selectedInvoice.id) ? [selectedInvoice, ...invoices] : invoices;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 antialiased">
      {/* 1. Header tinh gọn theo đúng chuẩn */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate('/sales-returns');
            }
          }}
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Quay lại"
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={submitting}
          className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95 ${
            selectedLines.length === 0
              ? 'bg-[#F85606]/80 hover:bg-[#F85606]'
              : 'bg-[#F85606] hover:bg-[#E04D05]'
          }`}
          title={selectedLines.length === 0 ? 'Bấm để lập phiếu (sẽ nhắc chọn dòng hàng nếu chưa chọn)' : 'Lập phiếu trả hàng'}
        >
          <RotateCcw size={15} />
          <span>
            {submitting
              ? 'Đang tạo phiếu...'
              : selectedLines.length === 0
              ? 'Lập Phiếu Trả Hàng'
              : `Lập Phiếu Trả Hàng (${selectedLines.length} dòng)`}
          </span>
        </button>
      </div>

      {/* 2. Hai cột nằm ngang cao bằng nhau */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* CỘT 1: CHỌN HOÁ ĐƠN GỐC & THÔNG TIN ĐẠI LÝ */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <Receipt className="w-4 h-4 text-[#F85606]" />
                <span>1. Chọn Hoá Đơn Bán Hàng Gốc</span>
              </div>
              {selectedInvoice && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check size={12} />
                  <span>Đã chọn</span>
                </span>
              )}
            </div>

            {/* Bộ chọn / đổi đại lý trả hàng */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#F85606]" />
                  <span>Đại lý trả hàng:</span>
                </label>
                {selectedCustomerId !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handleSelectCustomer('ALL')}
                    className="text-[11px] text-[#F85606] hover:underline font-semibold cursor-pointer"
                  >
                    Xem tất cả đại lý
                  </button>
                )}
              </div>
              <SearchSelect
                value={selectedCustomerId === 'ALL' ? 'ALL' : String(selectedCustomerId)}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                selectedLabel={selectedCustomerLabel || undefined}
                searchPlaceholder="Gõ tên, mã đại lý, SĐT..."
                onSearchChange={(val) => {
                  setAgencyKeyword(val);
                  loadAgencies(0, val, false);
                }}
                onLoadMore={() => {
                  if (!loadingAgencies && agencyHasMore) loadAgencies(agencyPage + 1, agencyKeyword, true);
                }}
                hasMore={agencyHasMore}
                isLoading={loadingAgencies}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition cursor-pointer font-medium"
              >
                <option value="ALL">-- Tất cả đại lý --</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </SearchSelect>
            </div>

            {/* Ô tìm kiếm hoá đơn */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={invoiceKeyword}
                onChange={(e) => setInvoiceKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    flushInvoiceSearch();
                  }
                }}
                placeholder="Tìm mã hoá đơn (HD...) hoặc tên đại lý..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Danh sách hoá đơn (chứa tối đa 4 hoá đơn, nhiều hơn vuốt xuống) */}
            <div className="max-h-[280px] overflow-y-auto pr-1 divide-y divide-gray-100">
              {(loadingInitial || loadingInvoices) && displayedInvoices.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">Đang tải danh sách hoá đơn...</div>
              ) : displayedInvoices.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">Không tìm thấy hoá đơn phù hợp</div>
              ) : (
                displayedInvoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  return (
                    <div key={inv.id} className="py-1">
                      <button
                        type="button"
                        onClick={() => handleSelectInvoice(inv)}
                        className={`w-full text-left p-2.5 rounded-xl transition cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-orange-50/80 border border-orange-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-900">
                              {inv.code}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {inv.invoiceDate ? inv.invoiceDate.split('T')[0] : ''}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 truncate font-medium">
                            {inv.customerName}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-gray-900">
                            {formatCurrencyVND(inv.totalAmount || 0)}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              inv.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : inv.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {inv.paymentStatus === 'PAID'
                              ? 'Đã thanh toán đủ'
                              : inv.paymentStatus === 'PARTIALLY_PAID'
                              ? 'Thanh toán 1 phần'
                              : 'Chưa thanh toán'}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
              {invoiceHasMore && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={loadingInvoices}
                    onClick={() => loadInvoices(invoicePage + 1, true)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:border-orange-300 hover:text-[#F85606] cursor-pointer disabled:opacity-50"
                  >
                    {loadingInvoices ? 'Đang tải...' : 'Tải thêm hoá đơn'}
                  </button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              Đang hiển thị {invoices.length} / {invoiceTotal} hoá đơn
            </p>
          </div>
        </div>

        {/* CỘT 2: THÔNG TIN HOÀN TRẢ & KHO NHẬP */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <WarehouseIcon className="w-4 h-4 text-[#F85606]" />
                <span>2. Lý Do & Kho Tiếp Nhận Hàng</span>
              </div>
            </div>

            {/* Bắt buộc chọn lý do trả (AC1) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <span>Lý do hoàn trả</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={returnReason}
                onChange={(e) => handleReturnReasonChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition cursor-pointer"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn kho tiếp nhận & Ngày trả */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>Kho tiếp nhận</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition cursor-pointer"
                >
                  {warehouses.length === 0 ? (
                    <option value="">-- Chưa có kho tiếp nhận --</option>
                  ) : (
                    warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Ngày lập phiếu</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            {/* Ghi chú chung */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Ghi chú phiếu trả</label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={2}
                placeholder="Ghi chú thêm cho thủ kho khi kiểm đếm nhận hàng..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-[11px] text-gray-500">
            * Lưu ý: Phiếu trả sau khi lập cần được <strong>Quản lý kho xác nhận nhận hàng</strong> thì tồn kho mới chính thức được cộng lại vào hệ thống.
          </div>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH DÒNG HÀNG HOÀN TRẢ */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#F85606]" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              3. Chọn Dòng Hàng & Số Lượng Trả ({selectedLines.length}/{lineItems.length} dòng đã chọn)
            </h3>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {lineItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(true)}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#F85606] bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition cursor-pointer"
                >
                  Chọn tất cả ({lineItems.filter((i) => i.remainingReturnableQuantity > 0).length})
                </button>
                {selectedLines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            )}
            {selectedLines.length > 0 && (
              <div className="text-xs font-bold text-[#F85606] bg-orange-50/80 px-2.5 py-1 rounded-lg border border-orange-200">
                Tổng SL trả: {totalReturnQty} • Thành tiền: {formatCurrencyVND(totalReturnAmount)}
              </div>
            )}
          </div>
        </div>

        {loadingLines ? (
          <div className="py-16 text-center text-xs text-gray-400">
            Đang tải danh sách sản phẩm của hoá đơn...
          </div>
        ) : !selectedInvoice ? (
          <div className="py-16 text-center text-xs text-gray-400 space-y-2">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto" />
            <div>Chưa chọn hoá đơn. Vui lòng chọn hoá đơn gốc ở Bước 1.</div>
          </div>
        ) : lineItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div>Hoá đơn này không có dòng hàng nào còn có thể hoàn trả.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold select-none">
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        lineItems.length > 0 &&
                        lineItems.filter((i) => i.remainingReturnableQuantity > 0).length > 0 &&
                        lineItems.filter((i) => i.remainingReturnableQuantity > 0).every((i) => i.selected)
                      }
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded text-[#F85606] focus:ring-[#F85606] cursor-pointer"
                      title="Chọn hoặc bỏ chọn tất cả"
                    />
                  </th>
                  <th className="p-3 min-w-[200px]">Sản phẩm / SKU</th>
                  <th className="p-3 w-20 text-center">ĐVT</th>
                  <th className="p-3 w-24 text-right">Đã giao</th>
                  <th className="p-3 w-24 text-right">Đã trả</th>
                  <th className="p-3 w-32 text-center text-[#F85606]">SL trả lần này *</th>
                  <th className="p-3 w-28 text-right">Đơn giá</th>
                  <th className="p-3 w-32 text-right">Thành tiền</th>
                  <th className="p-3 min-w-[160px]">Thông tin Lô (nếu có)</th>
                  <th className="p-3 w-36 text-center">Tình trạng hàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item) => {
                  const canReturn = item.remainingReturnableQuantity > 0;
                  const isExceeded = canReturn && item.selected && Number(item.returnQty) > item.remainingReturnableQuantity;

                  return (
                    <tr
                      key={item.invoiceLineId}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(target.tagName) && canReturn) {
                          handleToggleSelectLine(item.invoiceLineId);
                        }
                      }}
                      className={`transition ${
                        canReturn ? 'cursor-pointer hover:bg-orange-50/40' : 'opacity-50 cursor-not-allowed bg-gray-50/50'
                      } ${item.selected ? 'bg-orange-50/40' : 'bg-white'}`}
                    >
                      {/* Checkbox chọn */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          disabled={!canReturn}
                          onChange={() => handleToggleSelectLine(item.invoiceLineId)}
                          className="w-4 h-4 rounded text-[#F85606] focus:ring-[#F85606] cursor-pointer"
                          title={
                            canReturn
                              ? 'Tích chọn để hoàn trả mặt hàng này'
                              : 'Mặt hàng này đã được hoàn trả hết số lượng theo hoá đơn (Còn được trả = 0)'
                          }
                        />
                      </td>

                      {/* Tên sản phẩm & SKU */}
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.productSku}
                          </span>
                          {item.hasBatchManagement && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Quản lý lô
                            </span>
                          )}
                          {!canReturn && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Đã trả hết 100%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Đơn vị tính */}
                      <td className="p-3 text-center text-gray-600 font-medium">{item.unitName}</td>

                      {/* Đã giao */}
                      <td className="p-3 text-right text-gray-700 font-mono">
                        {item.deliveredQuantity}
                      </td>

                      {/* Đã trả trước đó */}
                      <td className="p-3 text-right text-gray-400 font-mono">
                        {item.previouslyReturnedQuantity}
                      </td>

                      {/* Số lượng trả lần này (AC2) - Luôn có thể bấm nhập và tự kích hoạt chọn dòng */}
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <input
                            type="number"
                            min={1}
                            max={item.remainingReturnableQuantity}
                            value={canReturn ? item.returnQty : 0}
                            disabled={!canReturn}
                            onFocus={(e) => {
                              e.target.select();
                              if (!item.selected && canReturn) {
                                handleToggleSelectLine(item.invoiceLineId);
                              }
                            }}
                            onBlur={() => {
                              const num = Number(item.returnQty);
                              if (isNaN(num) || num <= 0) {
                                handleUpdateLineField(item.invoiceLineId, 'returnQty', 1);
                              } else if (num > item.remainingReturnableQuantity) {
                                handleUpdateLineField(
                                  item.invoiceLineId,
                                  'returnQty',
                                  item.remainingReturnableQuantity
                                );
                              }
                            }}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                handleUpdateLineField(item.invoiceLineId, 'returnQty', '');
                              } else {
                                const parsed = parseInt(raw, 10);
                                handleUpdateLineField(
                                  item.invoiceLineId,
                                  'returnQty',
                                  isNaN(parsed) ? '' : parsed
                                );
                              }
                            }}
                            className={`w-full px-2.5 py-1.5 text-xs text-center font-bold font-mono rounded-lg border transition ${
                              item.selected && (isExceeded || item.error)
                                ? 'border-rose-400 bg-rose-50 text-rose-800'
                                : item.selected
                                ? 'border-[#F85606] bg-white text-gray-900 shadow-2xs'
                                : 'border-gray-300 bg-white hover:border-gray-400 text-gray-700'
                            } ${!canReturn ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-200' : ''}`}
                          />
                          {item.selected && item.error && (
                            <div className="text-[10px] text-rose-600 font-medium">{item.error}</div>
                          )}
                        </div>
                      </td>

                      {/* Đơn giá */}
                      <td className="p-3 text-right font-mono text-gray-700">
                        {formatCurrencyVND(item.pricePerUnit)}
                      </td>

                      {/* Thành tiền hoàn */}
                      <td className="p-3 text-right font-mono font-bold text-gray-900">
                        {formatCurrencyVND(
                          item.selected ? (Number(item.returnQty) || 0) * (item.pricePerUnit || 0) : 0
                        )}
                      </td>

                      {/* Số Lô (AC3) */}
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {item.hasBatchManagement ? (
                          <input
                            type="text"
                            placeholder="Số lô (nếu có)..."
                            value={item.batchNumber}
                            disabled={!canReturn}
                            onFocus={() => {
                              if (!item.selected && canReturn) {
                                handleToggleSelectLine(item.invoiceLineId);
                              }
                            }}
                            onChange={(e) =>
                              handleUpdateLineField(
                                item.invoiceLineId,
                                'batchNumber',
                                e.target.value
                              )
                            }
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border transition font-mono ${
                              !item.batchNumber?.trim() && item.selected
                                ? 'border-amber-400 bg-amber-50/50'
                                : 'border-gray-200 bg-white focus:border-[#F85606]'
                            } ${!canReturn ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}`}
                          />
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Không quản lý lô</span>
                        )}
                      </td>

                      {/* Tình trạng hàng (AC3) - Bấm chuyển đổi trạng thái thay vì ô tích để tránh nhầm lẫn tích 2 đầu */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={!canReturn}
                          onClick={() => {
                            if (!item.selected && canReturn) {
                              handleToggleSelectLine(item.invoiceLineId);
                            }
                            handleUpdateLineField(
                              item.invoiceLineId,
                              'isDamaged',
                              !item.isDamaged
                            );
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-2xs ${
                            item.isDamaged
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          } ${!canReturn ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={
                            item.isDamaged
                              ? 'Hàng lỗi / hỏng: Sẽ nhập vào kho hàng hỏng cách ly'
                              : 'Hàng còn nguyên vẹn: Sẽ được cộng lại vào tồn kho bán'
                          }
                        >
                          {item.isDamaged ? (
                            <>
                              <AlertTriangle size={13} className="text-rose-600" />
                              <span>Hàng lỗi / hỏng</span>
                            </>
                          ) : (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span>Còn nguyên vẹn</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Thanh tổng kết dưới bảng */}
        {selectedLines.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-gray-600">
              Đã chọn: <strong>{selectedLines.length}</strong> sản phẩm | Tổng số lượng hoàn trả:{' '}
              <strong className="text-[#F85606]">{totalReturnQty}</strong>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500 mr-2">Tổng giá trị hoàn trả:</span>
                <span className="text-sm font-black text-[#F85606]">
                  {formatCurrencyVND(totalReturnAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-[#F85606] hover:bg-[#E04D05] text-white font-bold transition cursor-pointer shadow-xs active:scale-95"
              >
                {submitting ? 'Đang tạo...' : 'Lập Phiếu Trả Hàng'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
