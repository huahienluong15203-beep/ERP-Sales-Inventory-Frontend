import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import type { InvoiceResponse } from '../../types/invoice';
import { fetchInvoicePrintHtml, fetchInvoiceById } from '../../services/invoiceApi';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: number | null;
  previewData?: InvoiceResponse | null;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  previewData
}) => {
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(previewData || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (previewData) {
      setInvoice(previewData);
      setPrintHtml(null);
      return;
    }

    if (invoiceId) {
      setLoading(true);
      Promise.all([
        fetchInvoiceById(invoiceId).catch(() => null),
        fetchInvoicePrintHtml(invoiceId, false).catch(() => null)
      ])
        .then(([inv, html]) => {
          if (inv) setInvoice(inv);
          if (html) setPrintHtml(html);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, invoiceId, previewData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const isPreview = !invoice?.id || !invoice?.code;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  {isPreview ? 'Xem trước Hoá đơn bán hàng' : `Hoá đơn điện tử: ${invoice?.code}`}
                </h3>
                {isPreview ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Bản nháp xem trước
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã phát hành
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {isPreview
                  ? 'Kiểm tra kỹ các dòng hàng thực giao & tổng tiền trước khi bấm phát hành'
                  : 'Mẫu hoá đơn GTGT kiêm phiếu xuất kho tiêu chuẩn A4'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Paper Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center">
          {loading ? (
            <div className="py-24 text-center text-sm font-semibold text-gray-500 animate-pulse">
              Đang kết xuất hoá đơn A4...
            </div>
          ) : printHtml && !isPreview ? (
            <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden min-h-[700px] border border-gray-200">
              <iframe
                ref={iframeRef}
                title="Invoice HTML Print"
                srcDoc={printHtml}
                className="w-full h-[750px] border-none"
              />
            </div>
          ) : invoice ? (
            /* Styled A4 Sheet Preview */
            <div
              id="invoice-a4-preview"
              className="w-full max-w-[800px] bg-white rounded-lg shadow-md border border-gray-300 p-8 sm:p-10 space-y-6 text-gray-800 relative font-sans text-xs leading-relaxed"
            >
              {isPreview && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-25deg]">
                  <span className="text-7xl font-black text-gray-900 border-8 border-gray-900 p-6 rounded-2xl">
                    BẢN XEM TRƯỚC
                  </span>
                </div>
              )}

              {/* Thông tin bên bán & Ký hiệu hoá đơn */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 border-b-2 border-gray-900 pb-4">
                <div className="space-y-1">
                  <h4 className="font-black text-base uppercase text-gray-900 tracking-wide">
                    CÔNG TY CP BÁN LẺ & PHÂN PHỐI TOÀN CẦU
                  </h4>
                  <p className="text-gray-600">
                    Mã số thuế: <strong className="font-mono text-gray-900">0109988776</strong>
                  </p>
                  <p className="text-gray-600">
                    Địa chỉ: Tầng 8, Toà nhà Horizon Tower, Q. Cầu Giấy, TP. Hà Nội
                  </p>
                  <p className="text-gray-600">Điện thoại: 024.3888.9999 | Hotline: 1900.6868</p>
                </div>

                <div className="sm:text-right space-y-1 bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                  <div className="text-sm font-bold text-gray-900">
                    Mẫu số: <span className="font-mono">01GTKT0/001</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    Ký hiệu: <span className="font-mono text-[#F85606]">TT/26E</span>
                  </div>
                  <div className="text-base font-black text-[#F85606]">
                    Số: {invoice.code || 'HD2026-XXXXXX'}
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    Ngày lập: {invoice.invoiceDate || new Date().toISOString().slice(0, 10)}
                  </div>
                </div>
              </div>

              {/* Tiêu đề hoá đơn */}
              <div className="text-center py-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-gray-900 uppercase">
                  HÓA ĐƠN BÁN HÀNG
                </h2>
                <p className="text-gray-500 italic text-[11px]">
                  (Kiêm phiếu xuất kho theo số lượng thực giao)
                </p>
              </div>

              {/* Thông tin khách hàng / Đại lý */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Đơn vị mua hàng: </span>
                    <strong className="text-gray-900">{invoice.customerName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Mã khách hàng: </span>
                    <strong className="font-mono text-gray-900">{invoice.customerCode}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Mã số thuế: </span>
                    <strong className="font-mono text-gray-900">
                      {invoice.customerTaxCode || 'Chưa cập nhật'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Kỳ đối soát: </span>
                    <span className="text-gray-900 font-semibold">
                      {invoice.periodFrom && invoice.periodTo
                        ? `${invoice.periodFrom} đến ${invoice.periodTo}`
                        : 'Các đơn trong kỳ'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Địa chỉ: </span>
                  <span className="text-gray-900">{invoice.customerAddress || 'Theo hồ sơ đại lý'}</span>
                </div>
                {invoice.orderCodes && invoice.orderCodes.length > 0 && (
                  <div className="pt-1 border-t border-gray-200/60 text-[11px]">
                    <span className="text-gray-500">Gộp từ các phiếu giao: </span>
                    <span className="font-mono font-bold text-[#F85606]">
                      {invoice.orderCodes.join(', ')}
                    </span>
                    <span className="text-gray-400 ml-1">({invoice.orderCodes.length} đơn)</span>
                  </div>
                )}
              </div>

              {/* Bảng kê hàng hóa */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-center">
                      <th className="py-2 px-2 w-10">STT</th>
                      <th className="py-2 px-2 text-left w-24">Phiếu giao</th>
                      <th className="py-2 px-2 text-left">Tên hàng hóa / SKU</th>
                      <th className="py-2 px-2 w-14">ĐVT</th>
                      <th className="py-2 px-2 text-right w-16">SL thực</th>
                      <th className="py-2 px-2 text-right w-24">Đơn giá</th>
                      <th className="py-2 px-2 text-right w-24">Tiền hàng</th>
                      <th className="py-2 px-2 text-right w-20">CK</th>
                      <th className="py-2 px-2 text-right w-24">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.lines?.map((line, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-2 text-center text-gray-500">{line.lineNo || idx + 1}</td>
                        <td className="py-2 px-2 font-mono font-semibold text-gray-700">
                          {line.orderCode}
                        </td>
                        <td className="py-2 px-2">
                          <div className="font-semibold text-gray-900">{line.productName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{line.productSku}</div>
                        </td>
                        <td className="py-2 px-2 text-center">{line.unitName || 'Thùng'}</td>
                        <td className="py-2 px-2 text-right font-black text-emerald-700">
                          {line.quantity?.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700 font-mono">
                          {line.pricePerUnit?.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700 font-mono">
                          {line.grossAmount?.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-2 text-right text-orange-600 font-mono">
                          {line.discountAmount ? `-${line.discountAmount.toLocaleString('vi-VN')}` : '0'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-gray-900 font-mono">
                          {line.netAmount?.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tổng cộng tài chính */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                <div className="text-xs text-gray-500 italic max-w-sm">
                  {invoice.note && <p>Ghi chú: {invoice.note}</p>}
                  <p className="mt-1">
                    * Hóa đơn được phát hành dựa trên số lượng thực tế nhận tại biên bản bàn giao (POD).
                  </p>
                </div>

                <div className="w-full sm:w-72 space-y-1.5 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-mono">{invoice.subtotal?.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Tổng chiết khấu:</span>
                    <span className="font-mono">
                      -{invoice.discountTotal?.toLocaleString('vi-VN') || 0} đ
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>Tổng thanh toán:</span>
                    <span className="text-[#F85606] font-mono">
                      {invoice.totalAmount?.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Chữ ký các bên */}
              <div className="grid grid-cols-3 text-center pt-8 border-t border-gray-200 text-xs">
                <div>
                  <div className="font-bold text-gray-900 uppercase">Người mua hàng</div>
                  <div className="text-gray-400 text-[10px] italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 uppercase">Thủ kho giao</div>
                  <div className="text-gray-400 text-[10px] italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 uppercase">Người lập hoá đơn</div>
                  <div className="text-gray-400 text-[10px] italic mt-0.5">(Ký điện tử)</div>
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {invoice.issuedByUsername || 'Kế toán công nợ'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">Không có dữ liệu hoá đơn</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-white text-xs text-gray-500">
          <div className="flex items-center gap-1 text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AC4: Hóa đơn sau khi phát hành sẽ được khoá bảo vệ, không sửa và không xoá.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold cursor-pointer transition"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
