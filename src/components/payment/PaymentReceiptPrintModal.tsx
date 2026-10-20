import React, { useRef, useEffect, useState } from 'react';
import { Printer, Download, X, Building, CheckCircle, FileText } from 'lucide-react';
import type { PaymentReceipt } from '../../types/payment';
import { formatCurrencyVND } from '../../services/orderService';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';

interface PaymentReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceipt | null;
}

export const PaymentReceiptPrintModal: React.FC<PaymentReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  receipt
}) => {
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isFitPage, setIsFitPage] = useState<boolean>(true);

  // Dọn dẹp iframe khi unmount
  useEffect(() => {
    return () => {
      if (printIframeRef.current && printIframeRef.current.parentNode) {
        printIframeRef.current.parentNode.removeChild(printIframeRef.current);
        printIframeRef.current = null;
      }
    };
  }, []);

  if (!isOpen || !receipt) return null;

  // Tách ngày tháng năm từ paymentDate (YYYY-MM-DD)
  const dateObj = receipt.paymentDate ? new Date(receipt.paymentDate) : new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  const paymentMethodLabel =
    receipt.paymentMethod === 'CASH'
      ? 'Tiền mặt'
      : receipt.paymentMethod === 'BANK_TRANSFER'
      ? 'Chuyển khoản qua ngân hàng'
      : 'Hình thức khác';

  const escapeHtml = (str?: string | null) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Tạo tài liệu HTML in ấn chuẩn A4/A5, độc lập không dính background hay backdrop modal
  const generateReceiptHtml = (): string => {
    const allocationsHtml =
      receipt.allocations && receipt.allocations.length > 0
        ? `
        <div style="margin: 16px 0; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden;">
          <div style="background: #f9fafb; padding: 6px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #d1d5db; color: #374151;">
            Chi tiết đối trừ hoá đơn công nợ
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f3f4f6; color: #374151;">
                <th style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: center; width: 35px;">STT</th>
                <th style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: left;">Mã hoá đơn</th>
                <th style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: right;">Tổng hoá đơn</th>
                <th style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: right;">Số tiền đối trừ</th>
                <th style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: right;">Nợ còn lại</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.allocations
                .map(
                  (a, idx) => `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: center; color: #6b7280;">${idx + 1}</td>
                  <td style="border: 1px solid #d1d5db; padding: 5px 8px; font-weight: bold; font-family: monospace;">${escapeHtml(a.invoiceCode)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: right; font-family: monospace;">${formatCurrencyVND(a.invoiceTotal)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: right; font-weight: bold; color: #047857; font-family: monospace;">${formatCurrencyVND(a.allocatedAmount)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: right; font-family: monospace;">${formatCurrencyVND(a.remainingAfter)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
        : '';

    const receiptImageHtml = receipt.receiptImageUrl
      ? `
        <div style="margin: 14px 0; padding: 10px; background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px;">
          <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: #374151; margin-bottom: 6px;">Ảnh biên lai thu tiền tại điểm bán:</div>
          <img src="${receipt.receiptImageUrl}" alt="Biên lai" style="max-height: 180px; width: auto; border: 1px solid #e5e7eb; border-radius: 4px;" />
        </div>
      `
      : '';

    const statusBadgeText =
      receipt.status === 'PENDING_SUBMISSION'
        ? 'Chờ nộp quỹ (Kế toán chưa duyệt)'
        : receipt.status === 'CONFIRMED'
        ? 'Đã nộp quỹ & đối trừ nợ'
        : receipt.status === 'VOIDED'
        ? 'Đã điều chỉnh (Huỷ cấn trừ nợ)'
        : `Từ chối nhận tiền ${receipt.rejectionReason ? `(${escapeHtml(receipt.rejectionReason)})` : ''}`;

    const statusBadgeStyle =
      receipt.status === 'PENDING_SUBMISSION'
        ? 'background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;'
        : receipt.status === 'CONFIRMED'
        ? 'background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;'
        : receipt.status === 'VOIDED'
        ? 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;'
        : 'background: #ffe4e6; color: #9f1239; border: 1px solid #fca5a5;';

    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Phiếu thu ${escapeHtml(receipt.code)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: Arial, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 8px 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .company-name {
            font-weight: 900;
            font-size: 13px;
            text-transform: uppercase;
            color: #111827;
            letter-spacing: 0.3px;
          }
          .company-info {
            font-size: 11px;
            color: #4b5563;
            margin-top: 3px;
            line-height: 1.4;
          }
          .standard-box {
            text-align: right;
            font-size: 11px;
            color: #374151;
          }
          .title-area {
            text-align: center;
            margin: 16px 0;
          }
          .title-area h1 {
            font-size: 22px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 4px 0;
          }
          .title-area .date {
            font-size: 12px;
            font-style: italic;
            color: #4b5563;
            margin: 0;
          }
          .accounts {
            display: flex;
            justify-content: center;
            gap: 24px;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            margin-top: 4px;
          }
          .status-badge {
            display: inline-block;
            margin-top: 6px;
            padding: 2px 10px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            ${statusBadgeStyle}
          }
          .info-list {
            margin: 16px 0;
            font-size: 13px;
          }
          .info-row {
            display: flex;
            margin-bottom: 8px;
            align-items: baseline;
          }
          .info-label {
            width: 190px;
            flex-shrink: 0;
            color: #374151;
            font-weight: 500;
          }
          .info-value {
            flex: 1;
            border-bottom: 1px dotted #9ca3af;
            padding-bottom: 1px;
          }
          .amount-val {
            font-size: 16px;
            font-weight: 900;
            color: #047857;
            font-family: Consolas, monospace;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            padding-top: 8px;
            text-align: center;
          }
          .sign-col {
            flex: 1;
            padding: 0 4px;
          }
          .sign-col .title {
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            color: #111827;
            margin: 0;
          }
          .sign-col .sub {
            font-size: 10px;
            font-style: italic;
            color: #6b7280;
            margin: 2px 0 0 0;
          }
          .sign-col .space {
            height: 60px;
          }
          .sign-col .dots {
            color: #9ca3af;
            font-size: 11px;
          }
          .sign-col .signer-name {
            font-weight: 700;
            font-size: 11px;
            color: #111827;
          }
          .footer-note {
            margin-top: 18px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            font-style: italic;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="max-width: 62%;">
            <div class="company-name">CÔNG TY CỔ PHẦN PHÂN PHỐI NƯỚC GIẢI KHÁT TOÀN QUỐC</div>
            <div class="company-info">
              Địa chỉ: Số 126 Trần Đại Nghĩa, Quận Hai Bà Trưng, TP. Hà Nội<br>
              Hotline: 1900 6868 | Mã số thuế: 0108998877
            </div>
          </div>
          <div class="standard-box">
            <div style="font-weight: bold;">Mẫu số 01 - TT</div>
            <div style="font-style: italic; font-size: 10px; color: #6b7280;">(Ban hành theo TT số 200/2014/TT-BTC ngày 22/12/2014 của BTC)</div>
            <div style="margin-top: 4px;">Quyển số: .........</div>
            <div style="font-weight: bold; font-family: monospace;">Số phiếu: ${escapeHtml(receipt.code)}</div>
          </div>
        </div>

        <div class="title-area">
          <h1>PHIẾU THU TIỀN</h1>
          <p class="date">Ngày ${day} tháng ${month} năm ${year}</p>
          <div class="accounts">
            <span>Nợ: 1111 / 1121</span>
            <span>Có: 131</span>
          </div>
          <div>
            <span class="status-badge">Trạng thái: ${statusBadgeText}</span>
          </div>
        </div>

        <div class="info-list">
          <div class="info-row">
            <span class="info-label">Họ và tên người nộp tiền:</span>
            <span class="info-value" style="font-weight: bold;">${escapeHtml(
              receipt.payerName && receipt.payerName !== receipt.customerName
                ? `${receipt.payerName} (Nộp thay cho: ${receipt.customerName})`
                : (receipt.payerName || receipt.customerName)
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mã đơn vị / Đại lý:</span>
            <span class="info-value" style="font-weight: 600;">${escapeHtml(receipt.customerCode)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Địa chỉ:</span>
            <span class="info-value">${escapeHtml(receipt.customerAddress || 'Theo hợp đồng cung cấp hàng hoá đại lý')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Lý do nộp:</span>
            <span class="info-value">${escapeHtml(receipt.notes || 'Thu tiền thanh toán tiền hàng và đối trừ công nợ')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Số tiền thu:</span>
            <span class="info-value amount-val">${formatCurrencyVND(receipt.amount)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Số tiền viết bằng chữ:</span>
            <span class="info-value" style="font-style: italic; font-weight: 600;">${escapeHtml(numberToVietnameseWords(receipt.amount))}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Hình thức thanh toán:</span>
            <span class="info-value" style="font-weight: 600;">${escapeHtml(paymentMethodLabel)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kèm theo:</span>
            <span class="info-value" style="font-style: italic; color: #4b5563;">01 chứng từ gốc / biên nhận giao dịch</span>
          </div>
        </div>

        ${allocationsHtml}
        ${receiptImageHtml}

        <div class="signatures">
          <div class="sign-col">
            <p class="title">Giám đốc</p>
            <p class="sub">(Ký, đóng dấu, họ tên)</p>
            <div class="space"></div>
            <p class="dots">.................................</p>
          </div>
          <div class="sign-col">
            <p class="title">Kế toán trưởng</p>
            <p class="sub">(Ký, họ tên)</p>
            <div class="space"></div>
            <p class="dots">.................................</p>
          </div>
          <div class="sign-col">
            <p class="title">Người nộp tiền</p>
            <p class="sub">(Ký, họ tên)</p>
            <div class="space"></div>
            <p class="signer-name">${escapeHtml(receipt.payerName || receipt.customerName)}</p>
          </div>
          <div class="sign-col">
            <p class="title">Người thu tiền</p>
            <p class="sub">(Ký, họ tên)</p>
            <div class="space" style="display: flex; align-items: center; justify-content: center;">
              <span style="color: #059669; font-size: 20px;">&#10004;</span>
            </div>
            <p class="signer-name">${escapeHtml(receipt.collectorName)}</p>
          </div>
        </div>

        <div class="footer-note">
          (Đã nhận đủ số tiền viết bằng chữ: ${escapeHtml(numberToVietnameseWords(receipt.amount))})
        </div>
      </body>
      </html>
    `;
  };

  // In phiếu thông qua iframe độc lập, đảm bảo 100% nội dung không bị dính background hay cắt xén
  const handlePrint = () => {
    let iframe = printIframeRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
      printIframeRef.current = iframe;
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(generateReceiptHtml());
    doc.close();

    setTimeout(() => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      {/* Container phiếu thu */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh] my-auto">
        {/* Thanh công cụ / Action Bar - Ẩn khi In */}
        <div className="print:hidden flex items-center justify-between px-5 sm:px-6 py-3 bg-slate-50 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Xem và in phiếu thu tiền</h3>
              <p className="text-xs text-gray-500">
                Mã chứng từ: <span className="font-semibold text-gray-800 font-mono">{receipt.code}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFitPage(!isFitPage)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isFitPage
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Thu nhỏ để xem trọn vẹn 1 trang không cần cuộn"
            >
              {isFitPage ? '🔍 Xem vừa 1 trang' : '↔️ Kích thước 100%'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>In phiếu thu</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              title="Xuất file hoặc lưu dưới dạng PDF"
            >
              <Download size={16} />
              <span>Tải / Lưu PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-200 text-gray-500 rounded-xl transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* VÙNG XEM TRƯỚC PHIẾU THU (Hỗ trợ thu gọn trọn vẹn 1 trang xem liền mạch) */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/70 ${isFitPage ? 'flex items-center justify-center' : 'pb-12'}`}>
          <div
            id="payment-receipt-print-area"
            className={`w-full max-w-[800px] mx-auto bg-white p-5 sm:p-7 shadow-sm border border-gray-200 rounded-xl transition-all duration-200 ${
              isFitPage ? 'scale-[0.92] origin-top my-auto' : ''
            }`}
          >
            {/* Header thông tin doanh nghiệp & mẫu số Bộ Tài Chính */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6 gap-4">
              <div className="max-w-[62%]">
                <div className="flex items-center gap-2 font-black text-gray-900 text-xs sm:text-sm uppercase tracking-wide">
                  <Building size={16} className="text-gray-700 shrink-0" />
                  <span>CÔNG TY CỔ PHẦN PHÂN PHỐI NƯỚC GIẢI KHÁT TOÀN QUỐC</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  Địa chỉ: Số 126 Trần Đại Nghĩa, Quận Hai Bà Trưng, TP. Hà Nội
                </p>
                <p className="text-[11px] text-gray-600">Hotline: 1900 6868 | Mã số thuế: 0108998877</p>
              </div>

              <div className="text-right text-[11px] text-gray-700 shrink-0">
                <p className="font-bold">Mẫu số 01 - TT</p>
                <p className="italic text-[10px] text-gray-500">(Ban hành theo TT số 200/2014/TT-BTC</p>
                <p className="italic text-[10px] text-gray-500">ngày 22/12/2014 của BTC)</p>
                <div className="mt-1.5 text-right">
                  <p className="text-[11px] font-semibold">Quyển số: .........</p>
                  <p className="text-[11px] font-semibold">
                    Số phiếu: <span className="font-bold font-mono text-gray-900">{receipt.code}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tiêu đề Phiếu Thu */}
            <div className="text-center my-4">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide">
                PHIẾU THU TIỀN
              </h1>
              <p className="text-xs text-gray-600 italic mt-0.5">
                Ngày {day} tháng {month} năm {year}
              </p>
              <div className="flex justify-center gap-6 mt-1.5 text-xs font-semibold text-gray-700">
                <span>Nợ: 1111 / 1121</span>
                <span>Có: 131</span>
              </div>
              <div className="mt-2 flex justify-center">
                {receipt.status === 'PENDING_SUBMISSION' && (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                    Trạng thái: Chờ nộp quỹ (Kế toán chưa duyệt)
                  </span>
                )}
                {receipt.status === 'CONFIRMED' && (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Trạng thái: Đã nộp quỹ & đối trừ nợ
                  </span>
                )}
                {receipt.status === 'REJECTED' && (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                    Trạng thái: Từ chối nhận tiền {receipt.rejectionReason ? `(${receipt.rejectionReason})` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Nội dung thông tin thu tiền */}
            <div className="space-y-2.5 text-xs sm:text-sm text-gray-800 mb-6 leading-relaxed">
              <div className="flex">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Họ và tên người nộp tiền:</span>
                <span className="flex-1 font-bold text-gray-900 border-b border-dotted border-gray-400 pb-0.5">
                  {receipt.payerName && receipt.payerName !== receipt.customerName ? (
                    <span>
                      {receipt.payerName}{' '}
                      <span className="font-normal text-xs text-gray-500">
                        (Nộp thay cho: {receipt.customerName})
                      </span>
                    </span>
                  ) : (
                    receipt.payerName || receipt.customerName
                  )}
                </span>
              </div>

              <div className="flex">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Mã đơn vị / Đại lý:</span>
                <span className="flex-1 font-semibold text-gray-900 border-b border-dotted border-gray-400 pb-0.5 font-mono">
                  {receipt.customerCode}
                </span>
              </div>

              <div className="flex">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Địa chỉ:</span>
                <span className="flex-1 text-gray-800 border-b border-dotted border-gray-400 pb-0.5">
                  {receipt.customerAddress || 'Theo hợp đồng cung cấp hàng hoá đại lý'}
                </span>
              </div>

              <div className="flex">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Lý do nộp:</span>
                <span className="flex-1 text-gray-900 border-b border-dotted border-gray-400 pb-0.5">
                  {receipt.notes || 'Thu tiền thanh toán tiền hàng và đối trừ công nợ'}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Số tiền thu:</span>
                <span className="text-base sm:text-lg font-black text-emerald-800 font-mono border-b border-dotted border-gray-400 pb-0.5">
                  {formatCurrencyVND(receipt.amount)}
                </span>
              </div>

              <div className="flex">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Số tiền viết bằng chữ:</span>
                <span className="flex-1 italic font-semibold text-gray-900 border-b border-dotted border-gray-400 pb-0.5">
                  {numberToVietnameseWords(receipt.amount)}
                </span>
              </div>

              <div className="flex">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Hình thức thanh toán:</span>
                <span className="flex-1 font-semibold text-gray-800 border-b border-dotted border-gray-400 pb-0.5">
                  {paymentMethodLabel}
                </span>
              </div>

              <div className="flex">
                <span className="w-44 sm:w-48 shrink-0 font-medium text-gray-600">Kèm theo:</span>
                <span className="flex-1 italic text-gray-600 border-b border-dotted border-gray-400 pb-0.5">
                  01 chứng từ gốc / biên nhận giao dịch
                </span>
              </div>
            </div>

            {/* Bảng phân bổ hoá đơn đối trừ nếu có */}
            {receipt.allocations && receipt.allocations.length > 0 && (
              <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3.5 py-1.5 border-b border-gray-300 font-bold text-xs uppercase text-gray-700">
                  Chi tiết đối trừ hoá đơn công nợ
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-center w-12">STT</th>
                      <th className="px-3 py-2">Mã hoá đơn</th>
                      <th className="px-3 py-2 text-right">Tổng tiền hoá đơn</th>
                      <th className="px-3 py-2 text-right">Số tiền đối trừ</th>
                      <th className="px-3 py-2 text-right">Nợ còn lại sau thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    {receipt.allocations.map((alloc, idx) => (
                      <tr key={alloc.invoiceId || idx}>
                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-bold text-gray-900">{alloc.invoiceCode}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrencyVND(alloc.invoiceTotal)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          {formatCurrencyVND(alloc.allocatedAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700">
                          {formatCurrencyVND(alloc.remainingAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ảnh biên lai nếu có */}
            {receipt.receiptImageUrl && (
              <div className="mb-6 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="font-bold text-xs uppercase text-gray-700 mb-2">Ảnh biên lai thu tiền tại điểm bán:</p>
                <img
                  src={receipt.receiptImageUrl}
                  alt="Biên lai"
                  className="max-h-48 w-auto rounded border border-gray-200 shadow-xs"
                />
              </div>
            )}

            {/* Khối chữ ký 4 bên */}
            <div className="grid grid-cols-4 gap-2 text-center mt-6 pt-3">
              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Giám đốc</p>
                <p className="text-[10px] italic text-gray-500">(Ký, đóng dấu, họ tên)</p>
                <div className="h-16" />
                <p className="text-xs text-gray-400">.................................</p>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Kế toán trưởng</p>
                <p className="text-[10px] italic text-gray-500">(Ký, họ tên)</p>
                <div className="h-16" />
                <p className="text-xs text-gray-400">.................................</p>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Người nộp tiền</p>
                <p className="text-[10px] italic text-gray-500">(Ký, họ tên)</p>
                <div className="h-16" />
                <p className="text-xs font-semibold text-gray-800">
                  {receipt.payerName || receipt.customerName}
                </p>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Người thu tiền</p>
                <p className="text-[10px] italic text-gray-500">(Ký, họ tên)</p>
                <div className="h-16 flex items-center justify-center">
                  <CheckCircle size={26} className="text-emerald-500 opacity-60" />
                </div>
                <p className="text-xs font-bold text-gray-900">{receipt.collectorName}</p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-200 text-xs italic text-gray-500 text-center">
              (Đã nhận đủ số tiền viết bằng chữ: {numberToVietnameseWords(receipt.amount)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
