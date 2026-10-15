import React from 'react';
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
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* Container phiếu thu */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Thanh công cụ / Action Bar - Ẩn khi In */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Xem và in phiếu thu tiền</h3>
              <p className="text-xs text-gray-500">Mã chứng từ: <span className="font-semibold text-gray-800">{receipt.code}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>In phiếu thu</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
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

        {/* VÙNG IN CHÍNH THỨC (A4/A5 TIÊU CHUẨN KẾ TOÁN) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100/50 print:p-0 print:bg-white print:overflow-visible">
          <div
            id="payment-receipt-print-area"
            className="w-full max-w-[800px] mx-auto bg-white p-8 sm:p-12 shadow-sm border border-gray-200 rounded-xl print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Header thông tin doanh nghiệp & mẫu số Bộ Tài Chính */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6">
              <div className="max-w-[60%]">
                <div className="flex items-center gap-2 font-black text-gray-900 text-base uppercase tracking-wider">
                  <Building size={18} className="text-gray-700 shrink-0" />
                  <span>CÔNG TY CỔ PHẦN PHÂN PHỐI NƯỚC GIẢI KHÁT TOÀN QUỐC</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Địa chỉ: Số 126 Trần Đại Nghĩa, Quận Hai Bà Trưng, TP. Hà Nội</p>
                <p className="text-xs text-gray-600">Hotline: 1900 6868 | Mã số thuế: 0108998877</p>
              </div>

              <div className="text-right text-xs text-gray-700">
                <p className="font-bold">Mẫu số 01 - TT</p>
                <p className="italic text-[11px] text-gray-500">(Ban hành theo TT số 200/2014/TT-BTC</p>
                <p className="italic text-[11px] text-gray-500">ngày 22/12/2014 của BTC)</p>
                <div className="mt-2 text-right">
                  <p className="text-xs font-semibold">Quyển số: .........</p>
                  <p className="text-xs font-semibold">
                    Số phiếu: <span className="font-bold font-mono text-gray-900">{receipt.code}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tiêu đề Phiếu Thu */}
            <div className="text-center my-6">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-wide">
                PHIẾU THU TIỀN
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 italic mt-1">
                Ngày {day} tháng {month} năm {year}
              </p>
              <div className="flex justify-center gap-8 mt-2 text-xs font-semibold text-gray-700">
                <span>Nợ: 1111 / 1121</span>
                <span>Có: 131</span>
              </div>
            </div>

            {/* Nội dung thông tin thu tiền */}
            <div className="space-y-3.5 text-sm text-gray-800 mb-8 leading-relaxed">
              <div className="flex">
                <span className="w-48 shrink-0 font-medium">Họ và tên người nộp tiền:</span>
                <span className="flex-1 font-bold text-gray-900 border-b border-dotted border-gray-400 pb-0.5">
                  {receipt.customerName}
                </span>
              </div>

              <div className="flex">
                <span className="w-48 shrink-0 font-medium">Mã đơn vị / Đại lý:</span>
                <span className="flex-1 font-semibold text-gray-900 border-b border-dotted border-gray-400 pb-0.5">
                  {receipt.customerCode}
                </span>
              </div>

              <div className="flex">
                <span className="w-48 shrink-0 font-medium">Địa chỉ:</span>
                <span className="flex-1 text-gray-800 border-b border-dotted border-gray-400 pb-0.5">
                  {receipt.customerAddress || 'Theo hợp đồng cung cấp hàng hoá đại lý'}
                </span>
              </div>

              <div className="flex">
                <span className="w-48 shrink-0 font-medium">Lý do nộp:</span>
                <span className="flex-1 text-gray-900 border-b border-dotted border-gray-400 pb-0.5">
                  {receipt.notes || 'Thu tiền thanh toán tiền hàng và đối trừ công nợ'}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="w-48 shrink-0 font-medium">Số tiền thu:</span>
                <span className="text-lg font-black text-emerald-800 font-mono border-b border-dotted border-gray-400 pb-0.5">
                  {formatCurrencyVND(receipt.amount)}
                </span>
              </div>

              <div className="flex">
                <span className="w-48 shrink-0 font-medium">Số tiền viết bằng chữ:</span>
                <span className="flex-1 italic font-semibold text-gray-900 border-b border-dotted border-gray-400 pb-0.5">
                  {numberToVietnameseWords(receipt.amount)}
                </span>
              </div>

              <div className="flex">
                <span className="w-48 shrink-0 font-medium">Hình thức thanh toán:</span>
                <span className="flex-1 font-semibold text-gray-800 border-b border-dotted border-gray-400 pb-0.5">
                  {paymentMethodLabel}
                </span>
              </div>

              <div className="flex">
                <span className="w-48 shrink-0 font-medium">Kèm theo:</span>
                <span className="flex-1 italic text-gray-600 border-b border-dotted border-gray-400 pb-0.5">
                  01 chứng từ gốc / biên nhận giao dịch
                </span>
              </div>
            </div>

            {/* Bảng phân bổ hoá đơn đối trừ nếu có */}
            {receipt.allocations && receipt.allocations.length > 0 && (
              <div className="mb-8 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-bold text-xs uppercase text-gray-700">
                  Chi tiết đối trừ hoá đơn công nợ
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">STT</th>
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

            {/* Khối chữ ký 4 bên */}
            <div className="grid grid-cols-4 gap-4 text-center mt-8 pt-4">
              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Giám đốc</p>
                <p className="text-[11px] italic text-gray-500">(Ký, đóng dấu, họ tên)</p>
                <div className="h-20" />
                <p className="text-xs text-gray-400">.................................</p>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Kế toán trưởng</p>
                <p className="text-[11px] italic text-gray-500">(Ký, họ tên)</p>
                <div className="h-20" />
                <p className="text-xs text-gray-400">.................................</p>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Người nộp tiền</p>
                <p className="text-[11px] italic text-gray-500">(Ký, họ tên)</p>
                <div className="h-20" />
                <p className="text-xs font-semibold text-gray-800">{receipt.customerName}</p>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-gray-900">Người thu tiền</p>
                <p className="text-[11px] italic text-gray-500">(Ký, họ tên)</p>
                <div className="h-20 flex items-center justify-center">
                  <CheckCircle size={28} className="text-emerald-500 opacity-60" />
                </div>
                <p className="text-xs font-bold text-gray-900">{receipt.collectorName}</p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 text-xs italic text-gray-500 text-center">
              (Đã nhận đủ số tiền viết bằng chữ: {numberToVietnameseWords(receipt.amount)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
