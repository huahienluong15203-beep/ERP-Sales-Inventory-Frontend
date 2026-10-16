import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Warehouse as WarehouseIcon,
  Receipt,
  CheckCircle2,
  Check,
  Layers,
  Info,
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

export const CreateSalesReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Danh sách kho & hoá đơn
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Form State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummaryResponse | null>(null);
  const [invoiceKeyword, setInvoiceKeyword] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [returnReason, setReturnReason] = useState<string>('Hàng lỗi do nhà sản xuất');
  const [reasonDescription, setReasonDescription] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
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
        const [whList, invPage] = await Promise.all([
          fetchWarehouses(),
          searchInvoices({ size: 50 })
        ]);
        setWarehouses(whList);
        if (whList.length > 0) {
          setSelectedWarehouseId(whList[0].id);
        }
        setInvoices(invPage?.content || []);
      } catch (err: any) {
        showToast(err?.message || 'Lỗi tải dữ liệu ban đầu', 'error');
      } finally {
        setLoadingInitial(false);
      }
    };
    initData();
  }, []);

  // Khi chọn hoá đơn -> tải các dòng hàng có thể hoàn trả
  const handleSelectInvoice = async (inv: InvoiceSummaryResponse) => {
    setSelectedInvoice(inv);
    setLoadingLines(true);
    try {
      const lines = await fetchReturnableInvoiceLines(inv.id);
      setLineItems(
        lines.map((l) => ({
          ...l,
          selected: false,
          returnQty: 1,
          batchNumber: '',
          manufactureDate: '',
          expiredDate: '',
          isDamaged: false,
          lineNotes: ''
        }))
      );
    } catch (err: any) {
      showToast(err?.message || 'Không thể tải chi tiết dòng hàng của hoá đơn', 'error');
      setLineItems([]);
    } finally {
      setLoadingLines(false);
    }
  };

  // Cập nhật dòng hàng
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

  const handleUpdateLineField = (
    invoiceLineId: number,
    field: keyof LineItemState,
    value: any
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.invoiceLineId !== invoiceLineId) return item;

        const updated = { ...item, [field]: value };

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
          if (!value?.trim()) {
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
      showToast('Vui lòng chọn hoá đơn gốc cần trả hàng', 'error');
      return;
    }
    if (!selectedWarehouseId) {
      showToast('Vui lòng chọn kho tiếp nhận hàng hoàn', 'error');
      return;
    }
    if (!returnReason.trim()) {
      showToast('Bắt buộc chọn lý do trả hàng (AC1)', 'error');
      return;
    }
    if (selectedLines.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 dòng sản phẩm muốn trả', 'error');
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
      reasonDescription: reasonDescription.trim() || undefined,
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
      inv.code.toLowerCase().includes(invoiceKeyword.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(invoiceKeyword.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 antialiased">
      {/* 1. Header tinh gọn theo đúng chuẩn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales-returns')}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="Quay lại danh sách phiếu trả hàng"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#F85606]" />
              <span>Lập Phiếu Trả Hàng Từ Đại Lý</span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={submitting || selectedLines.length === 0}
          className="px-5 py-2.5 rounded-xl bg-[#F85606] hover:bg-[#E04D05] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={15} />
          <span>{submitting ? 'Đang tạo phiếu...' : 'Lập Phiếu Trả Hàng'}</span>
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

            {/* Danh sách hoá đơn */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50">
              {loadingInitial ? (
                <div className="text-center py-8 text-xs text-gray-400">Đang tải danh sách hoá đơn...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">Không tìm thấy hoá đơn phù hợp</div>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  return (
                    <button
                      key={inv.id}
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
                  );
                })
              )}
            </div>
          </div>

          {/* Chi tiết đại lý đã chọn */}
          {selectedInvoice ? (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-xs space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-[11px]">
                <span>Đại lý:</span>
                <span className="font-bold text-gray-900">{selectedInvoice.customerName}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500 text-[11px]">
                <span>Mã hoá đơn gốc:</span>
                <span className="font-mono font-bold text-[#F85606]">{selectedInvoice.code}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500 text-[11px]">
                <span>Tổng giá trị hoá đơn:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrencyVND(selectedInvoice.totalAmount || 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
              <Info size={16} className="text-amber-600 shrink-0" />
              <span>Vui lòng chọn 1 hoá đơn ở trên để nạp danh sách dòng sản phẩm</span>
            </div>
          )}
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

            {/* Diễn giải chi tiết lý do */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Mô tả chi tiết nguyên nhân</label>
              <input
                type="text"
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                placeholder="VD: Bao bì rách 3 thùng, sản phẩm hết hạn tháng 10..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
              />
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
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
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
            * Lưu ý: Phiếu trả sau khi lập cần được <strong>Quản lý kho xác nhận nhận hàng</strong> thì tồn kho mới chính thức được cộng lại vào hệ thống (AC4).
          </div>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH DÒNG HÀNG HOÀN TRẢ */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#F85606]" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              3. Chọn Dòng Hàng & Số Lượng Trả ({selectedLines.length}/{lineItems.length} dòng đã chọn)
            </h3>
          </div>
          {selectedLines.length > 0 && (
            <div className="text-xs font-bold text-[#F85606]">
              Tổng SL trả: {totalReturnQty} • Thành tiền: {formatCurrencyVND(totalReturnAmount)}
            </div>
          )}
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
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold">
                  <th className="p-3 w-10 text-center">Chọn</th>
                  <th className="p-3 min-w-[200px]">Sản phẩm / SKU</th>
                  <th className="p-3 w-20 text-center">ĐVT</th>
                  <th className="p-3 w-24 text-right">Đã giao</th>
                  <th className="p-3 w-24 text-right">Đã trả</th>
                  <th className="p-3 w-28 text-right text-emerald-700">Còn được trả</th>
                  <th className="p-3 w-32 text-center text-[#F85606]">SL trả lần này *</th>
                  <th className="p-3 w-28 text-right">Đơn giá</th>
                  <th className="p-3 w-32 text-right">Thành tiền</th>
                  <th className="p-3 min-w-[160px]">Thông tin Lô (nếu có)</th>
                  <th className="p-3 w-28 text-center">Hàng hỏng / lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item) => {
                  const isExceeded = item.returnQty > item.remainingReturnableQuantity;
                  const canReturn = item.remainingReturnableQuantity > 0;

                  return (
                    <tr
                      key={item.invoiceLineId}
                      className={`hover:bg-gray-50/60 transition ${
                        item.selected ? 'bg-orange-50/30' : ''
                      } ${!canReturn ? 'opacity-50' : ''}`}
                    >
                      {/* Checkbox chọn */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          disabled={!canReturn}
                          onChange={() => handleToggleSelectLine(item.invoiceLineId)}
                          className="w-4 h-4 rounded text-[#F85606] focus:ring-[#F85606] cursor-pointer"
                        />
                      </td>

                      {/* Tên sản phẩm & SKU */}
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.productSku}
                          </span>
                          {item.hasBatchManagement && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Quản lý lô
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

                      {/* Còn được trả tối đa */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {item.remainingReturnableQuantity}
                      </td>

                      {/* Số lượng trả lần này (AC2) */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <input
                            type="number"
                            min={1}
                            max={item.remainingReturnableQuantity}
                            value={item.returnQty}
                            disabled={!item.selected}
                            onChange={(e) =>
                              handleUpdateLineField(
                                item.invoiceLineId,
                                'returnQty',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className={`w-full px-2.5 py-1.5 text-xs text-center font-bold font-mono rounded-lg border transition ${
                              isExceeded || item.error
                                ? 'border-rose-400 bg-rose-50 text-rose-800'
                                : 'border-gray-300 bg-white focus:border-[#F85606]'
                            } ${!item.selected ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}`}
                          />
                          {item.error && (
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

                      {/* Số Lô / Date (AC3) */}
                      <td className="p-3">
                        {item.hasBatchManagement ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              placeholder="Số lô (Bắt buộc)..."
                              value={item.batchNumber}
                              disabled={!item.selected}
                              onChange={(e) =>
                                handleUpdateLineField(
                                  item.invoiceLineId,
                                  'batchNumber',
                                  e.target.value
                                )
                              }
                              className={`w-full px-2 py-1 text-xs rounded border ${
                                !item.batchNumber?.trim() && item.selected
                                  ? 'border-amber-300 bg-amber-50/50'
                                  : 'border-gray-200 bg-white'
                              }`}
                            />
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <input
                                type="date"
                                title="Hạn sử dụng"
                                value={item.expiredDate}
                                disabled={!item.selected}
                                onChange={(e) =>
                                  handleUpdateLineField(
                                    item.invoiceLineId,
                                    'expiredDate',
                                    e.target.value
                                  )
                                }
                                className="px-1 py-0.5 rounded border border-gray-200 text-[10px]"
                              />
                              <input
                                type="text"
                                placeholder="Ghi chú dòng"
                                value={item.lineNotes}
                                disabled={!item.selected}
                                onChange={(e) =>
                                  handleUpdateLineField(
                                    item.invoiceLineId,
                                    'lineNotes',
                                    e.target.value
                                  )
                                }
                                className="px-1 py-0.5 rounded border border-gray-200 text-[10px]"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Không quản lý lô</span>
                        )}
                      </td>

                      {/* Checkbox Hàng lỗi/hỏng (AC3) */}
                      <td className="p-3 text-center">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isDamaged}
                            disabled={!item.selected}
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
                className="px-4 py-2 rounded-xl bg-[#F85606] hover:bg-[#E04D05] text-white font-bold transition cursor-pointer shadow-xs"
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
