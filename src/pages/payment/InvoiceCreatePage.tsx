import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Search,
  Check,
  PackageCheck,
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAgencies } from '../../services/agencyApi';
import type { Agency } from '../../types/agency';
import type { UninvoicedOrderResponse, InvoiceResponse } from '../../types/invoice';
import { fetchUninvoicedOrders, previewInvoice, issueInvoice } from '../../services/invoiceApi';
import { InvoicePrintModal } from '../../components/payment/InvoicePrintModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  // Danh sách đại lý phân trang theo cuộn (infinite scroll) & tìm kiếm động BE/FE
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyPage, setAgencyPage] = useState<number>(0);
  const [hasMoreAgencies, setHasMoreAgencies] = useState<boolean>(true);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);
  const [loadingMoreAgencies, setLoadingMoreAgencies] = useState<boolean>(false);
  const [agencyKeyword, setAgencyKeyword] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const selectedAgencyRef = useRef<Agency | null>(null);
  const searchAgencyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bộ lọc kỳ giao hàng
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Danh sách đơn chưa lập hoá đơn (DELIVERED)
  const [uninvoicedOrders, setUninvoicedOrders] = useState<UninvoicedOrderResponse[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // Thông tin phát hành hoá đơn
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [note, setNote] = useState<string>('');

  // Xem trước & Kết quả phát hành
  const [previewData, setPreviewData] = useState<InvoiceResponse | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [issuedInvoiceId, setIssuedInvoiceId] = useState<number | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isConfirmIssueOpen, setIsConfirmIssueOpen] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [previewing, setPreviewing] = useState<boolean>(false);

  // Tải danh sách đại lý (hỗ trợ phân trang vô tận khi cuộn & tìm kiếm động BE/FE)
  const loadAgenciesData = async (targetPage: number, kw: string, isAppend: boolean) => {
    if (isAppend) {
      setLoadingMoreAgencies(true);
    } else {
      setLoadingAgencies(true);
    }
    try {
      const res = await fetchAgencies({
        page: targetPage,
        size: 20,
        keyword: kw.trim() || undefined,
        status: 'ACTIVE'
      });
      const items = res.content || [];
      setAgencies((prev) => {
        let nextList: Agency[];
        if (!isAppend) {
          nextList = items;
        } else {
          const existingIds = new Set(prev.map((a) => a.id));
          nextList = [...prev, ...items.filter((a) => !existingIds.has(a.id))];
        }
        // Giữ đại lý đã chọn nếu nó không nằm trong danh sách hiện tại
        if (selectedAgencyRef.current && !nextList.some((a) => a.id === selectedAgencyRef.current?.id)) {
          nextList = [selectedAgencyRef.current, ...nextList];
        }
        return nextList;
      });
      setAgencyPage(targetPage);
      setHasMoreAgencies(targetPage + 1 < res.totalPages);
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể tải danh sách đại lý', 'error');
    } finally {
      setLoadingAgencies(false);
      setLoadingMoreAgencies(false);
    }
  };

  useEffect(() => {
    loadAgenciesData(0, '', false);
    return () => {
      if (searchAgencyTimerRef.current) {
        clearTimeout(searchAgencyTimerRef.current);
      }
    };
  }, []);

  const handleAgencyKeywordChange = (val: string) => {
    setAgencyKeyword(val);
    if (searchAgencyTimerRef.current) {
      clearTimeout(searchAgencyTimerRef.current);
    }
    searchAgencyTimerRef.current = setTimeout(() => {
      loadAgenciesData(0, val, false);
    }, 300);
  };

  const handleAgencyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (loadingAgencies || loadingMoreAgencies || !hasMoreAgencies) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 40) {
      loadAgenciesData(agencyPage + 1, agencyKeyword, true);
    }
  };

  // Tải các đơn đã giao chưa lập hoá đơn khi chọn đại lý hoặc đổi kỳ
  const loadUninvoicedOrders = async (customerId: number) => {
    setLoadingOrders(true);
    setSelectedOrderIds([]);
    try {
      const orders = await fetchUninvoicedOrders(customerId, fromDate, toDate);
      setUninvoicedOrders(orders || []);
      // Mặc định chọn tất cả để hỗ trợ gộp nhanh (AC3)
      if (orders && orders.length > 0) {
        setSelectedOrderIds(orders.map((o) => o.orderId));
      }
    } catch (err: any) {
      showToast('Lỗi tải đơn giao', err.message || 'Không thể tải đơn chưa lập hoá đơn', 'error');
      setUninvoicedOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectCustomer = (customerId: number) => {
    const found = agencies.find((a) => Number(a.id) === customerId);
    if (found) {
      selectedAgencyRef.current = found;
    }
    setSelectedCustomerId(customerId);
    loadUninvoicedOrders(customerId);
  };

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === uninvoicedOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(uninvoicedOrders.map((o) => o.orderId));
    }
  };

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Tính tổng tiền theo số thực giao của các đơn được chọn (AC1)
  const selectedDeliveredTotal = uninvoicedOrders
    .filter((o) => selectedOrderIds.includes(o.orderId))
    .reduce((sum, o) => sum + (o.deliveredAmount || 0), 0);

  const selectedOrderedTotal = uninvoicedOrders
    .filter((o) => selectedOrderIds.includes(o.orderId))
    .reduce((sum, o) => sum + (o.orderTotalAmount || 0), 0);

  const selectedAgency = agencies.find((a) => Number(a.id) === selectedCustomerId);

  // Xem trước hoá đơn (Preview)
  const handlePreview = async () => {
    if (!selectedCustomerId) {
      showToast('Cảnh báo', 'Vui lòng chọn đại lý cần lập hoá đơn', 'info');
      return;
    }
    if (selectedOrderIds.length === 0) {
      showToast('Cảnh báo', 'Vui lòng chọn ít nhất một phiếu giao hàng để lập hoá đơn', 'info');
      return;
    }

    setPreviewing(true);
    try {
      const data = await previewInvoice({
        customerId: selectedCustomerId,
        orderIds: selectedOrderIds,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        invoiceDate: invoiceDate || undefined,
        note: note.trim() || undefined
      });
      setPreviewData(data);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      showToast('Lỗi xem trước', err.message || 'Không thể xem trước hoá đơn', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  // Mở popup xác nhận phát hành hoá đơn chính thức (chuẩn giao diện hệ thống)
  const handleOpenConfirmIssue = () => {
    if (!selectedCustomerId) {
      showToast('Cảnh báo', 'Vui lòng chọn đại lý', 'info');
      return;
    }
    if (selectedOrderIds.length === 0) {
      showToast('Cảnh báo', 'Vui lòng chọn ít nhất một phiếu giao hàng để lập hoá đơn gộp', 'info');
      return;
    }
    setIsConfirmIssueOpen(true);
  };

  // Thực thi phát hành hoá đơn chính thức khi người dùng xác nhận trên modal
  const handleExecuteIssue = async () => {
    if (!selectedCustomerId || selectedOrderIds.length === 0) return;

    setSubmitting(true);
    try {
      const result = await issueInvoice({
        customerId: selectedCustomerId,
        orderIds: selectedOrderIds,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        invoiceDate: invoiceDate || undefined,
        note: note.trim() || undefined
      });

      setIsConfirmIssueOpen(false);

      showToast(
        'Phát hành thành công!',
        `Hoá đơn số ${result.code} đã được cấp thành công cho ${result.customerName}`,
        'success'
      );

      // Mở modal in hoá đơn A4
      if (result.id) {
        setIssuedInvoiceId(result.id);
        setIsPrintModalOpen(true);
      }
    } catch (err: any) {
      showToast('Lỗi phát hành', err.message || 'Không thể phát hành hoá đơn', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAgencies = agencies.filter(
    (a) =>
      !agencyKeyword.trim() ||
      a.name.toLowerCase().includes(agencyKeyword.toLowerCase()) ||
      a.code.toLowerCase().includes(agencyKeyword.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 antialiased">
      {/* 1. Header tinh gọn chỉ nút Quay lại */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Quay lại danh sách hoá đơn"
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* 2. Hai cột nằm ngang cao bằng nhau */}
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
                  <span>Đã chọn</span>
                </span>
              )}
            </div>

            {/* Ô tìm kiếm đại lý có nút Lọc cho mobile */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchAgencyTimerRef.current) clearTimeout(searchAgencyTimerRef.current);
                loadAgenciesData(0, agencyKeyword, false);
              }}
              className="relative flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={agencyKeyword}
                  onChange={(e) => handleAgencyKeywordChange(e.target.value)}
                  placeholder="Tìm mã hoặc tên đại lý..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F85606] focus:bg-white focus:outline-none transition"
                />
                {loadingAgencies && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F85606] absolute right-3 top-3" />
                )}
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-[#F85606] hover:bg-[#E04D05] active:scale-95 text-white text-xs font-semibold rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
                title="Lọc kết quả tìm kiếm"
              >
                Lọc
              </button>
            </form>

            {/* Danh sách đại lý có cuộn tải thêm (infinite scroll) & thanh cuộn trực quan */}
            <div
              onScroll={handleAgencyScroll}
              className="max-h-48 overflow-y-auto space-y-1.5 pr-1.5 divide-y divide-gray-50 [scrollbar-width:thin] [scrollbar-color:#F85606_#f3f4f6] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-orange-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 hover:[&::-webkit-scrollbar-thumb]:bg-[#F85606]"
            >
              {loadingAgencies && agencies.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#F85606]" />
                  <span>Đang tải danh sách đại lý...</span>
                </div>
              ) : filteredAgencies.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">Không tìm thấy đại lý phù hợp</div>
              ) : (
                <>
                  {filteredAgencies.map((agency) => {
                    const custId = Number(agency.id);
                    const isSelected = selectedCustomerId === custId;
                    return (
                      <button
                        key={agency.id}
                        type="button"
                        onClick={() => handleSelectCustomer(custId)}
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
                  })}

                  {loadingMoreAgencies && (
                    <div className="py-2.5 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-[#F85606]" />
                      <span>Đang tải thêm đại lý...</span>
                    </div>
                  )}

                  {!hasMoreAgencies && agencies.length > 10 && (
                    <div className="py-2 text-center text-[10px] text-gray-400">
                      Đã hiển thị toàn bộ đại lý
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* CỘT 2: KỲ GIAO HÀNG & NGÀY LẬP HĐ */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2.5">
              <Calendar className="w-4 h-4 text-[#F85606]" />
              <span>2. Kỳ Giao Hàng & Ngày Lập HĐ</span>
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

              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => loadUninvoicedOrders(selectedCustomerId)}
                  disabled={loadingOrders}
                  className="w-full py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                  <span>Cập nhật phiếu giao trong kỳ</span>
                </button>
              )}

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Ngày ghi nhận hoá đơn:
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:border-[#F85606] focus:bg-white focus:outline-none transition"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Không được chọn ngày trong tương lai
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Ghi chú trên hoá đơn (nếu có):
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ghi chú chiết khấu, đối trừ hoặc số hợp đồng..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:border-[#F85606] focus:bg-white focus:outline-none transition resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHỐI CHỌN PHIẾU GIAO ĐỂ GỘP: CHỈ XUẤT HIỆN KHI ĐÃ CHỌN ĐẠI LÝ */}
      {selectedCustomerId && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-[#F85606]" />
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                  3. Chọn Phiếu Giao Để Gộp Hoá Đơn
                </h3>
              </div>

              {uninvoicedOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  {selectedOrderIds.length === uninvoicedOrders.length
                    ? 'Bỏ chọn tất cả'
                    : `Chọn tất cả (${uninvoicedOrders.length})`}
                </button>
              )}
            </div>

            {/* Bảng danh sách phiếu giao */}
            <div className="overflow-x-auto">
              {loadingOrders ? (
                <div className="py-16 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-[#F85606] animate-spin mx-auto" />
                  <p className="text-xs text-gray-500">Đang quét các đơn đã giao trong kỳ...</p>
                </div>
              ) : uninvoicedOrders.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-gray-800">Không có phiếu giao tồn đọng</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Đại lý này hiện không có đơn nào ở trạng thái &ldquo;Đã giao&rdquo; chưa lập hoá đơn trong kỳ từ{' '}
                    {fromDate} đến {toDate}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                      <th className="py-3 px-3 text-center w-10">Chọn</th>
                      <th className="py-3 px-3 w-28">Mã đơn hàng</th>
                      <th className="py-3 px-3">Thời điểm giao</th>
                      <th className="py-3 px-3 text-center w-20">Số dòng</th>
                      <th className="py-3 px-3 text-right w-28">Tiền đặt hàng</th>
                      <th className="py-3 px-3 text-right w-32 bg-orange-50/50 text-[#F85606]">
                        Tiền thực giao
                      </th>
                      <th className="py-3 px-3 text-center w-16">Xem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uninvoicedOrders.map((order) => {
                      const isSelected = selectedOrderIds.includes(order.orderId);
                      const hasDiscrepancy =
                        order.orderTotalAmount !== order.deliveredAmount &&
                        order.deliveredAmount !== undefined &&
                        order.deliveredAmount !== null;

                      return (
                        <tr
                          key={order.orderId}
                          onClick={() => handleToggleOrder(order.orderId)}
                          className={`hover:bg-orange-50/30 transition-colors cursor-pointer ${
                            isSelected ? 'bg-orange-50/20' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleOrder(order.orderId)}
                              className="w-4 h-4 accent-[#F85606] text-[#F85606] rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900">
                            {order.orderCode}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {order.deliveredAt
                              ? new Date(order.deliveredAt).toLocaleString('vi-VN')
                              : 'Đã giao'}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-700 font-medium">
                            {order.lineCount} dòng
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-gray-500">
                            {order.orderTotalAmount?.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3 px-3 text-right font-black font-mono text-[#F85606] bg-orange-50/30">
                            {order.deliveredAmount?.toLocaleString('vi-VN')} đ
                            {hasDiscrepancy && (
                              <div
                                className="text-[10px] text-amber-700 font-bold"
                                title="Tiền thực giao khác tiền đặt do có dòng hàng giao thiếu"
                              >
                                Chênh lệch:{' '}
                                {((order.deliveredAmount || 0) - (order.orderTotalAmount || 0)).toLocaleString(
                                  'vi-VN'
                                )}{' '}
                                đ
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`/orders/${order.orderId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-gray-400 hover:text-[#F85606] inline-block"
                              title="Mở chi tiết đơn hàng tab mới"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Thanh tổng kết tài chính trước khi xuất */}
            {uninvoicedOrders.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-gray-600">
                  Đã chọn: <strong className="text-gray-900">{selectedOrderIds.length}</strong> /{' '}
                  {uninvoicedOrders.length} phiếu giao
                  {selectedOrderedTotal !== selectedDeliveredTotal && (
                    <span className="ml-2 text-amber-700 font-semibold">
                      (Có chênh lệch số lượng thực giao)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 block">Tổng tiền hoá đơn thực giao:</span>
                    <span className="text-base font-black text-[#F85606] font-mono">
                      {selectedDeliveredTotal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || selectedOrderIds.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{previewing ? 'Đang tạo bản xem trước...' : 'Xem trước hoá đơn (A4 Preview)'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenConfirmIssue}
              disabled={submitting || selectedOrderIds.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>{submitting ? 'Đang phát hành hoá đơn...' : 'Phát Hành Hoá Đơn Bán Hàng'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Xác nhận phát hành hoá đơn bán hàng chuẩn hệ thống (thay thế window.confirm) */}
      <ConfirmModal
        open={isConfirmIssueOpen}
        variant="primary"
        icon={<Receipt size={24} className="text-[#F85606]" />}
        title="Xác nhận phát hành hoá đơn"
        confirmLabel="Xác nhận phát hành"
        cancelLabel="Hủy bỏ"
        loading={submitting}
        onConfirm={handleExecuteIssue}
        onCancel={() => {
          if (!submitting) setIsConfirmIssueOpen(false);
        }}
        message={
          <div className="space-y-3">
            <p className="text-gray-700 text-xs leading-relaxed">
              Bạn có chắc chắn muốn lập và phát hành hoá đơn bán hàng cho{' '}
              <strong className="text-gray-900 font-bold">{selectedOrderIds.length}</strong> phiếu giao hàng đã chọn?
            </p>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-xs space-y-2 shadow-2xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-500 font-medium shrink-0">Đại lý / Khách hàng:</span>
                <span className="font-semibold text-gray-900 text-right">
                  {selectedAgency ? `${selectedAgency.name} (${selectedAgency.code})` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Số phiếu giao gộp:</span>
                <span className="font-bold text-gray-800">
                  {selectedOrderIds.length} phiếu giao hàng
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Ngày phát hành:</span>
                <span className="font-mono text-gray-700 font-medium">
                  {invoiceDate || new Date().toISOString().slice(0, 10)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-gray-600 font-semibold">Tổng tiền thực giao:</span>
                <span className="font-mono font-black text-[#F85606] text-sm">
                  {selectedDeliveredTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>LƯU Ý:</strong> Theo quy định kế toán, hoá đơn sau khi phát hành sẽ có mã số liên tục và <strong>KHÔNG THỂ SỬA HOẶC XOÁ!</strong>
              </span>
            </div>
          </div>
        }
      />

      {/* Modal Xem Trước Hoá Đơn (Preview) */}
      <InvoicePrintModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        previewData={previewData}
      />

      {/* Modal In Hoá Đơn Chính Thức Sau Khi Phát Hành (Issued) */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          navigate('/invoices');
        }}
        invoiceId={issuedInvoiceId}
      />
    </div>
  );
};
