import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  CheckCircle2
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

  const buildInvoiceHtml = (inv: InvoiceResponse, _isPreviewMode = false): string => {
    const formatVnd = (num?: number | null) => {
      if (num == null) return '0 đ';
      return `${Number(num).toLocaleString('vi-VN')} đ`;
    };

    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '—';
      try {
        const parts = dateStr.slice(0, 10).split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    const escapeHtml = (str?: string | null) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const lines = inv.lines || [];
    const rows = lines.length > 0
      ? lines.map((l, idx) => `
        <tr>
          <td class="c">${l.lineNo || idx + 1}</td>
          <td>${escapeHtml(l.orderCode)}</td>
          <td>${escapeHtml(l.productSku)}</td>
          <td>${escapeHtml(l.productName)}</td>
          <td class="c">${escapeHtml(l.unitName || 'Thùng')}</td>
          <td class="r" style="font-weight: bold;">${Number(l.quantity || 0).toLocaleString('vi-VN')}</td>
          <td class="r">${Number(l.pricePerUnit || 0).toLocaleString('vi-VN')} đ</td>
          <td class="r">${Number(l.grossAmount || 0).toLocaleString('vi-VN')} đ</td>
          <td class="r">${l.discountAmount ? `-${Number(l.discountAmount).toLocaleString('vi-VN')} đ` : '0 đ'}</td>
          <td class="r" style="font-weight: bold;">${Number(l.netAmount || 0).toLocaleString('vi-VN')} đ</td>
        </tr>
      `).join('')
      : '<tr><td colspan="10" class="c">Hoá đơn không có dòng hàng</td></tr>';

    const orders = inv.orderCodes?.join(', ') || '';

    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hoá đơn ${escapeHtml(inv.code || 'Bản xem trước')}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, 'Segoe UI', sans-serif; font-size: 13px; color: #111; margin: 0; padding: 16px; line-height: 1.4; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 10px; }
    h1 { font-size: 20px; margin: 6px 0 2px; text-transform: uppercase; font-weight: bold; }
    .muted { color: #555; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 14px 0; }
    .box { border: 1px solid #bbb; border-radius: 6px; padding: 8px 10px; font-size: 12px; }
    .box b { display: block; margin-bottom: 4px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #999; padding: 6px 7px; vertical-align: top; }
    th { background: #f0f0f0; font-weight: bold; }
    .c { text-align: center; }
    .r { text-align: right; white-space: nowrap; }
    .tot { width: 340px; margin-left: auto; margin-top: 12px; }
    .tot td { border: none; padding: 3px 6px; }
    .tot .big td { font-size: 15px; font-weight: bold; border-top: 1px solid #111; padding-top: 6px; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 40px; }
    .sign i { display: block; color: #666; font-size: 12px; margin-top: 2px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <div class="muted">CÔNG TY CP BÁN LẺ & PHÂN PHỐI TOÀN CẦU</div>
      <h1>HOÁ ĐƠN BÁN HÀNG</h1>
      <div>Số: <b>${escapeHtml(inv.code || 'HD2026-XXXXXX (Bản xem trước)')}</b></div>
      <div>Ngày hoá đơn: ${formatDate(inv.invoiceDate || new Date().toISOString())}</div>
    </div>
    <div class="muted" style="text-align: right;">
      ${inv.issuedAt ? `Phát hành: ${formatDate(inv.issuedAt)}<br>` : ''}
      Người lập: ${escapeHtml(inv.issuedByUsername || 'Phạm Thị Kế Toán')}
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <b>Người mua (đại lý)</b>
      ${escapeHtml(inv.customerName || '')} (${escapeHtml(inv.customerCode || '')})<br>
      Mã số thuế: ${escapeHtml(inv.customerTaxCode || 'Chưa cập nhật')}<br>
      Địa chỉ: ${escapeHtml(inv.customerAddress || 'Theo hồ sơ đại lý')}
    </div>
    <div class="box">
      <b>Kỳ giao hàng</b>
      ${formatDate(inv.periodFrom)} – ${formatDate(inv.periodTo)}<br>
      Đơn hàng: ${escapeHtml(orders)}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px;">STT</th>
        <th>Đơn hàng</th>
        <th>Mã SKU</th>
        <th>Tên hàng</th>
        <th style="width: 50px;">ĐVT</th>
        <th style="width: 65px;">SL thực giao</th>
        <th>Đơn giá</th>
        <th>Tiền hàng</th>
        <th>Chiết khấu</th>
        <th>Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <table class="tot">
    <tr>
      <td>Tổng tiền hàng</td>
      <td class="r">${formatVnd(inv.subtotal)}</td>
    </tr>
    <tr>
      <td>Chiết khấu</td>
      <td class="r">- ${formatVnd(inv.discountTotal || 0)}</td>
    </tr>
    <tr class="big">
      <td>Tổng thanh toán</td>
      <td class="r" style="color: #111;">${formatVnd(inv.totalAmount)}</td>
    </tr>
  </table>

  ${inv.note ? `<p style="margin-top: 10px; font-size: 12px;"><b>Ghi chú:</b> ${escapeHtml(inv.note)}</p>` : ''}

  <div class="sign">
    <div>Người mua hàng<i>(Ký, ghi rõ họ tên)</i></div>
    <div>Người bán hàng<i>(Ký, ghi rõ họ tên)</i></div>
  </div>
</body>
</html>`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal - Đã tinh gọn không còn dòng chữ phụ rườm rà */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
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

        {/* Modal Body / Paper Sheet - Dùng cùng định dạng HTML chuẩn in ấn cho cả xem trước và đã phát hành */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100/70 flex justify-center">
          {loading ? (
            <div className="py-24 text-center text-sm font-semibold text-gray-500 animate-pulse">
              Đang kết xuất hoá đơn A4...
            </div>
          ) : (printHtml || invoice) ? (
            <div className="w-full max-w-[840px] bg-white rounded-xl shadow-md overflow-hidden min-h-[720px] border border-gray-200">
              <iframe
                ref={iframeRef}
                title="Invoice HTML Print"
                srcDoc={printHtml || (invoice ? buildInvoiceHtml(invoice, isPreview) : '')}
                className="w-full h-[760px] border-none"
              />
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">Không có dữ liệu hoá đơn</div>
          )}
        </div>

        {/* Modal Footer - Đã bỏ chữ AC4 thừa */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-xs cursor-pointer transition"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
