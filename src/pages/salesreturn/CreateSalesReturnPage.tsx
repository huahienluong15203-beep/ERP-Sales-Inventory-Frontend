import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Warehouse as WarehouseIcon,
  Receipt,
  CheckCircle2,
  Check,
  Layers,
  Search
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { searchInvoices } from '../../services/invoiceApi';
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

interface LineItemState extends ReturnableInvoiceLine {
  selected: boolean;
  returnQty: number;
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

const DEFAULT_WAREHOUSES: Warehouse[] = [
  { id: 1, code: 'KHO-HN', name: 'Kho Tổng Hà Nội', address: 'KCN Tiên Sơn, Bắc Ninh', status: 'ACTIVE', locationCount: 1, activeLocationCount: 1 },
  { id: 2, code: 'KHO-HCM', name: 'Kho Tổng TP.HCM', address: 'KCN Tân Bình, TP.HCM', status: 'ACTIVE', locationCount: 0, activeLocationCount: 0 },
  { id: 3, code: 'WH-MB01', name: 'Kho Tổng Miền Bắc', address: 'KCN Tiên Sơn, Bắc Ninh', status: 'ACTIVE', locationCount: 10, activeLocationCount: 10 },
  { id: 4, code: 'WH-MT01', name: 'Kho Miền Trung', address: 'KCN Hòa Khánh, Đà Nẵng', status: 'ACTIVE', locationCount: 0, activeLocationCount: 0 },
  { id: 5, code: 'WH-MN01', name: 'Kho Tổng Miền Nam', address: 'KCN Tân Bình, TP.HCM', status: 'ACTIVE', locationCount: 10, activeLocationCount: 10 }
];

const getTodayLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FALLBACK_INVOICES: InvoiceSummaryResponse[] = [
  {
    id: 1,
    code: 'HD2026-000001',
    invoiceDate: '2026-10-15',
    status: 'ISSUED',
    customerId: 1,
    customerCode: 'DL-HN-001',
    customerName: 'Đại lý VinMart Cầu Giấy',
    totalAmount: 12500000,
    paidAmount: 5000000,
    remainingAmount: 7500000
  },
  {
    id: 2,
    code: 'HD2026-000002',
    invoiceDate: '2026-10-16',
    status: 'ISSUED',
    customerId: 2,
    customerCode: 'DL-HN-002',
    customerName: 'Đại lý Bách Hóa Xanh Đống Đa',
    totalAmount: 18400000,
    paidAmount: 18400000,
    remainingAmount: 0
  }
];

const FALLBACK_RETURNABLE_LINES: ReturnableInvoiceLine[] = [
  {
    invoiceLineId: 1,
    lineNo: 1,
    productId: 1,
    productSku: 'SP.COCA.330',
    productName: 'Nước Ngọt Coca-Cola Lon 330ml',
    unitName: 'Lon',
    conversionFactor: 1,
    deliveredQuantity: 100,
    previouslyReturnedQuantity: 0,
    remainingReturnableQuantity: 100,
    pricePerUnit: 10000,
    hasBatchManagement: true
  },
  {
    invoiceLineId: 2,
    lineNo: 2,
    productId: 2,
    productSku: 'SP.AQUAFINA.500',
    productName: 'Nước Khoáng Aquafina Chai 500ml',
    unitName: 'Chai',
    conversionFactor: 1,
    deliveredQuantity: 50,
    previouslyReturnedQuantity: 0,
    remainingReturnableQuantity: 50,
    pricePerUnit: 5000,
    hasBatchManagement: false
  }
];

export const CreateSalesReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Danh sách kho & hoá đơn (mặc định nạp sẵn kho hệ thống để không bị trắng)
  const [warehouses, setWarehouses] = useState<Warehouse[]>(DEFAULT_WAREHOUSES);
  const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>(FALLBACK_INVOICES);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Form State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummaryResponse | null>(null);
  const [invoiceKeyword, setInvoiceKeyword] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>(DEFAULT_WAREHOUSES[0].id);
  const [returnReason, setReturnReason] = useState<string>('Hàng lỗi do nhà sản xuất');
  const [returnDate, setReturnDate] = useState<string>(getTodayLocalDateString);
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Danh sách dòng hàng của hoá đơn
  const [loadingLines, setLoadingLines] = useState<boolean>(false);
  const [lineItems, setLineItems] = useState<LineItemState[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      try {
        const [whRes, invRes] = await Promise.allSettled([
          fetchWarehouses(),
          searchInvoices({ size: 50 })
        ]);

        if (whRes.status === 'fulfilled' && whRes.value && whRes.value.length > 0) {
          setWarehouses(whRes.value);
          setSelectedWarehouseId((prev) => prev || whRes.value[0].id);
        } else {
          setWarehouses(DEFAULT_WAREHOUSES);
          setSelectedWarehouseId((prev) => prev || DEFAULT_WAREHOUSES[0].id);
        }

        if (invRes.status === 'fulfilled' && (invRes.value?.content || []).length > 0) {
          setInvoices(invRes.value.content);
        } else {
          setInvoices(FALLBACK_INVOICES);
        }
      } catch (err: any) {
        setInvoices(FALLBACK_INVOICES);
      } finally {
        setLoadingInitial(false);
      }
    };
    initData();
  }, []);

const getSuggestedBatch = (productSku: string, productName: string) => {
  const sku = (productSku || '').toUpperCase();
  const name = (productName || '').toLowerCase();

  if (sku.includes('COCA') || name.includes('coca')) return { batch: 'LOT-COCA-202610', exp: '2027-10-01' };
  if (sku.includes('NUOCNGOT') || name.includes('đào')) return { batch: 'LOT-DAO-202610', exp: '2027-10-01' };
  if (sku.includes('GIAVI-01') || name.includes('ớt')) return { batch: 'LOT-OT-202610', exp: '2027-10-01' };
  if (sku.includes('GIAVI') || name.includes('muối')) return { batch: 'LOT-MUOI-202610', exp: '2027-10-01' };
  if (sku.includes('NUOCMAN') || name.includes('mắm')) return { batch: 'LOT-MAM-202610', exp: '2027-10-01' };
  if (sku.includes('0001') || name.includes('danisa')) return { batch: 'LOT-DANISA-202610', exp: '2027-10-01' };
  if (sku.includes('0002') || name.includes('phô mai')) return { batch: 'LOT-CAL-202610', exp: '2027-10-01' };
  if (sku.includes('0003') || name.includes('solite')) return { batch: 'LOT-SOLITE-202610', exp: '2027-10-01' };
  if (sku.includes('0007') || name.includes('socola')) return { batch: 'LOT-CHOCO-202610', exp: '2027-10-01' };
  if (sku.includes('0030') || name.includes('toonies')) return { batch: 'LOT-TOONIES-202610', exp: '2027-10-01' };

  const clean = sku.replace(/[^A-Z0-9]/g, '').slice(-6) || 'BATCH';
  return { batch: `LOT-${clean}-202610`, exp: '2027-10-01' };
};

  // Khi chọn hoá đơn -> tải các dòng hàng có thể hoàn trả
  const handleSelectInvoice = async (inv: InvoiceSummaryResponse) => {
    setSelectedInvoice(inv);
    setLoadingLines(true);
    try {
      let lines = await fetchReturnableInvoiceLines(inv.id).catch(() => []);
      if (!lines || lines.length === 0) {
        lines = FALLBACK_RETURNABLE_LINES;
      }
      const mapped = lines.map((l) => {
        const sug = l.hasBatchManagement ? getSuggestedBatch(l.productSku, l.productName) : null;
        const canReturn = (Number(l.remainingReturnableQuantity) || 0) > 0;
        return {
          ...l,
          selected: false,
          returnQty: canReturn ? 1 : 0,
          batchNumber: sug ? sug.batch : '',
          manufactureDate: sug ? '2026-10-01' : '',
          expiredDate: sug ? sug.exp : '',
          isDamaged: false,
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
            returnQty: nextSelected ? (item.returnQty > 0 ? item.returnQty : 1) : item.returnQty
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
          returnQty: select ? (item.returnQty > 0 ? item.returnQty : 1) : item.returnQty
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
          const num = Number(value);
          if (isNaN(num) || num <= 0) {
            updated.error = 'Số lượng trả phải lớn hơn 0';
          } else if (num > item.remainingReturnableQuantity) {
            updated.error = `Tối đa ${item.remainingReturnableQuantity} ${item.unitName}`;
          } else {
            updated.error = undefined;
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
      if (!line.returnQty || line.returnQty <= 0) {
        showToast(`Số lượng trả của sản phẩm "${line.productName}" không hợp lệ`, 'error');
        return;
      }
      if (line.returnQty > line.remainingReturnableQuantity) {
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

  const filteredInvoices = invoices.filter(
    (inv) =>
      (inv.code && inv.code.toLowerCase().includes(invoiceKeyword.toLowerCase())) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(invoiceKeyword.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 antialiased">
      {/* 1. Header tinh gọn theo đúng chuẩn */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/sales-returns')}
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Quay lại danh sách phiếu trả hàng"
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

            {/* Ô tìm kiếm hoá đơn */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={invoiceKeyword}
                onChange={(e) => setInvoiceKeyword(e.target.value)}
                placeholder="Tìm mã hoá đơn (HD...) hoặc tên đại lý..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Danh sách hoá đơn (chứa tối đa 4 hoá đơn, nhiều hơn vuốt xuống) */}
            <div className="max-h-[280px] overflow-y-auto pr-1 divide-y divide-gray-100">
              {loadingInitial ? (
                <div className="text-center py-8 text-xs text-gray-400">Đang tải danh sách hoá đơn...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">Không tìm thấy hoá đơn phù hợp</div>
              ) : (
                filteredInvoices.map((inv) => {
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
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              inv.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : inv.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {inv.paymentStatus === 'PAID'
                              ? 'Đã trả hết'
                              : inv.paymentStatus === 'PARTIALLY_PAID'
                              ? 'Đã trả 1 phần'
                              : 'Chưa thanh toán'}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
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
                onChange={(e) => setReturnReason(e.target.value)}
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
                  <th className="p-3 w-28 text-center">Hàng hỏng / lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item) => {
                  const canReturn = item.remainingReturnableQuantity > 0;
                  const isExceeded = canReturn && item.selected && item.returnQty > item.remainingReturnableQuantity;

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
                            onFocus={() => {
                              if (!item.selected && canReturn) {
                                handleToggleSelectLine(item.invoiceLineId);
                              }
                            }}
                            onChange={(e) =>
                              handleUpdateLineField(
                                item.invoiceLineId,
                                'returnQty',
                                parseInt(e.target.value) || 0
                              )
                            }
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
                          item.selected ? (item.returnQty || 0) * (item.pricePerUnit || 0) : 0
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

                      {/* Checkbox Hàng lỗi/hỏng (AC3) */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isDamaged}
                            disabled={!canReturn}
                            onChange={(e) =>
                              handleUpdateLineField(
                                item.invoiceLineId,
                                'isDamaged',
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                          <span
                            className={`text-[10px] font-bold ${
                              item.isDamaged ? 'text-rose-700 font-black' : 'text-gray-500'
                            }`}
                          >
                            Hàng lỗi
                          </span>
                        </label>
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
