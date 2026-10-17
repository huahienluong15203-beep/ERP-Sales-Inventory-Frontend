import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { formatCurrencyVND } from '../../services/orderService';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import type { CustomerDebtStatement } from '../../types/customerDebtStatement';
import { exportCustomerDebtStatementExcel } from '../../services/customerDebtStatementApi';

interface CustomerDebtStatementPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  statement: CustomerDebtStatement | null;
}

export const CustomerDebtStatementPrintModal: React.FC<CustomerDebtStatementPrintModalProps> = ({
  isOpen,
  onClose,
  statement
}) => {
  if (!isOpen || !statement) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    exportCustomerDebtStatementExcel(statement);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh] my-auto print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Header điều khiển (Ẩn khi in ấn / xuất PDF) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              Xem trước Mẫu in Sổ chi tiết công nợ A4
            </span>
            <span className="text-xs font-mono text-gray-500">
              ({statement.customerCode})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Tải về file Excel"
            >
              <Download size={14} />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              title="Mở hộp thoại in để In hoặc Lưu dưới dạng PDF"
            >
              <Printer size={14} />
              <span>In sổ / Lưu PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 text-gray-600 rounded-xl transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Thân biểu mẫu in khổ giấy A4 */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 text-gray-900 bg-white print:p-0">
          <div className="max-w-[760px] mx-auto space-y-4 text-xs font-sans leading-normal">
            {/* 1. Header công ty & Tiêu ngữ */}
            <div className="grid grid-cols-2 gap-4 border-b border-gray-300 pb-3">
              <div className="space-y-0.5">
                <div className="font-black text-gray-950 uppercase text-[11px]">
                  CÔNG TY CỔ PHẦN PHÂN PHỐI TIÊU DÙNG TOÀN CẦU
                </div>
                <div className="text-[11px] text-gray-600">
                  Địa chỉ: Tòa nhà Discovery, 302 Cầu Giấy, Hà Nội
                </div>
                <div className="text-[11px] text-gray-600">
                  Mã số thuế: <strong>0108888888</strong> · Hotline: (024) 3888 9999
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="font-bold text-[11px] text-gray-800 uppercase">
                  MẪU SỐ S31-DN
                </div>
                <div className="text-[10px] text-gray-500 italic">
                  (Ban hành theo Thông tư 200/2014/TT-BTC của Bộ Tài chính)
                </div>
                <div className="text-[11px] text-gray-500 pt-1">
                  Ngày xuất: <strong>{statement.asOf}</strong>
                </div>
              </div>
            </div>

            {/* 2. Tiêu đề sổ */}
            <div className="text-center pt-2 pb-1 space-y-1">
              <h1 className="text-base sm:text-lg font-black uppercase text-gray-950 tracking-wide">
                SỔ CHI TIẾT CÔNG NỢ PHẢI THU KHÁCH HÀNG
              </h1>
              <p className="text-xs font-semibold text-gray-700">
                Tài khoản: <strong className="font-mono">131 - Phải thu của khách hàng</strong>
              </p>
              <p className="text-xs italic text-gray-600">
                Khoảng thời gian: Từ ngày <strong>{statement.fromDate}</strong> đến ngày{' '}
                <strong>{statement.toDate}</strong>
              </p>
            </div>

            {/* 3. Thông tin đại lý */}
            <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500">Đại lý / Khách hàng: </span>
                  <strong className="text-gray-950">{statement.customerName}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Mã đại lý: </span>
                  <strong className="font-mono text-gray-900">{statement.customerCode}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-gray-500">Địa chỉ: </span>
                  <span className="text-gray-800">{statement.customerAddress || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Mã số thuế: </span>
                  <span className="font-mono font-semibold text-gray-800">
                    {statement.customerTaxCode || 'Chưa cập nhật'}
                  </span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-gray-500">SĐT: </span>
                  <span className="font-semibold text-gray-800">
                    {statement.customerPhone || 'Chưa cập nhật'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] pt-0.5 border-t border-gray-200">
                <div>
                  <span className="text-gray-500">Hạn mức tín dụng: </span>
                  <strong className="font-mono text-gray-900">
                    {formatCurrencyVND(statement.creditLimit)}
                  </strong>
                  <span className="text-gray-400 mx-1.5">•</span>
                  <span className="text-gray-500">Số ngày nợ tối đa: </span>
                  <strong className="text-gray-900">{statement.maxDebtDays} ngày</strong>
                </div>
                <div>
                  <span className="text-gray-500">Nhân viên kinh doanh phụ trách: </span>
                  <strong className="text-gray-900">
                    {statement.salesRepName || 'Chưa phân công'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 4. Bảng phát sinh tăng giảm kèm số dư luỹ kế (AC 1) */}
            <div className="space-y-1 pt-1">
              <table className="w-full border-collapse border border-gray-300 text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800">
                    <th className="p-1.5 text-center w-8 border-r border-gray-300">STT</th>
                    <th className="p-1.5 text-center w-20 border-r border-gray-300">Ngày</th>
                    <th className="p-1.5 text-left w-24 border-r border-gray-300">Số chứng từ</th>
                    <th className="p-1.5 text-left border-r border-gray-300">Diễn giải nội dung</th>
                    <th className="p-1.5 text-right w-24 border-r border-gray-300">Phát sinh Nợ (Mua hàng)</th>
                    <th className="p-1.5 text-right w-24 border-r border-gray-300">Phát sinh Có (Thanh toán)</th>
                    <th className="p-1.5 text-right w-24">Số dư luỹ kế (Nợ)</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Dòng Số dư đầu kỳ */}
                  <tr className="bg-amber-50/40 border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5 text-center border-r border-gray-300"></td>
                    <td className="p-1.5 text-center border-r border-gray-300 font-mono">
                      {statement.fromDate}
                    </td>
                    <td className="p-1.5 border-r border-gray-300 font-bold uppercase text-[10px]">
                      SỐ DƯ ĐẦU KỲ
                    </td>
                    <td className="p-1.5 border-r border-gray-300 italic text-gray-600">
                      Số dư nợ tính đến trước ngày {statement.fromDate}
                    </td>
                    <td className="p-1.5 text-right border-r border-gray-300">-</td>
                    <td className="p-1.5 text-right border-r border-gray-300">-</td>
                    <td className="p-1.5 text-right font-mono font-black text-gray-900">
                      {formatCurrencyVND(statement.openingBalance)}
                    </td>
                  </tr>

                  {/* Các dòng phát sinh trong kỳ */}
                  {statement.transactions.map((t, idx) => (
                    <tr key={t.id || idx} className="border-b border-gray-200">
                      <td className="p-1.5 text-center border-r border-gray-300 text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="p-1.5 text-center border-r border-gray-300 font-mono text-gray-700">
                        {t.date}
                      </td>
                      <td className="p-1.5 font-mono font-bold border-r border-gray-300 text-gray-900">
                        {t.code}
                      </td>
                      <td className="p-1.5 border-r border-gray-300">
                        <span className="font-semibold text-gray-900">{t.documentTypeLabel}: </span>
                        <span className="text-gray-700">{t.description}</span>
                      </td>
                      <td className="p-1.5 text-right font-mono border-r border-gray-300 text-gray-900">
                        {t.debit > 0 ? formatCurrencyVND(t.debit) : '-'}
                      </td>
                      <td className="p-1.5 text-right font-mono border-r border-gray-300 text-emerald-700">
                        {t.credit > 0 ? formatCurrencyVND(t.credit) : '-'}
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold text-gray-950 bg-gray-50/50">
                        {formatCurrencyVND(t.balance)}
                      </td>
                    </tr>
                  ))}

                  {/* Dòng Tổng phát sinh */}
                  <tr className="bg-gray-100 font-bold border-b border-gray-300 text-gray-950">
                    <td colSpan={4} className="p-2 text-right border-r border-gray-300 uppercase text-[10px]">
                      CỘNG PHÁT SINH TRONG KỲ:
                    </td>
                    <td className="p-2 text-right font-mono border-r border-gray-300 text-[#F85606]">
                      {formatCurrencyVND(statement.totalDebit)}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-gray-300 text-emerald-800">
                      {formatCurrencyVND(statement.totalCredit)}
                    </td>
                    <td className="p-2 text-right font-mono">-</td>
                  </tr>

                  {/* Dòng Số dư cuối kỳ */}
                  <tr className="bg-orange-50 border-t-2 border-gray-400 font-black text-gray-950">
                    <td colSpan={4} className="p-2.5 text-right border-r border-gray-300 uppercase text-xs">
                      SỐ DƯ CÔNG NỢ CUỐI KỲ CÒN PHẢI THU (đến {statement.toDate}):
                    </td>
                    <td colSpan={2} className="p-2.5 border-r border-gray-300 italic text-[11px] text-gray-600 font-normal">
                      = Dư đầu kỳ + Phát sinh Nợ - Phát sinh Có
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-sm text-[#F85606]">
                      {formatCurrencyVND(statement.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Số tiền bằng chữ */}
              <div className="p-2.5 bg-gray-50 rounded-xl text-xs italic text-gray-800 border border-gray-200">
                Số tiền còn phải thanh toán bằng chữ:{' '}
                <strong className="text-gray-950 not-italic font-bold">
                  {numberToVietnameseWords(statement.closingBalance)}
                </strong>
              </div>
            </div>

            {/* 5. Ghi chú & Chữ ký */}
            <div className="pt-2 space-y-3">
              <p className="text-[11px] text-justify leading-relaxed text-gray-600">
                Sổ chi tiết công nợ này được trích xuất từ hệ thống ERP làm căn cứ đối soát số liệu mua bán hàng
                hóa giữa hai bên. Mọi thắc mắc về số dư, đề nghị Quý đại lý liên hệ với Bộ phận Kế toán công nợ
                hoặc Nhân viên phụ trách trong vòng 05 ngày kể từ ngày nhận được sổ.
              </p>

              <div className="grid grid-cols-3 gap-4 text-center pt-4 pb-14 text-xs">
                <div className="space-y-1">
                  <div className="font-bold uppercase text-gray-900 text-[11px]">NGƯỜI LẬP BIỂU</div>
                  <div className="text-[10px] italic text-gray-500">(Ký, ghi rõ họ tên)</div>
                  <div className="pt-16 font-bold text-gray-900">
                    {statement.salesRepName || 'Kế toán viên'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-gray-900 text-[11px]">KẾ TOÁN CÔNG NỢ</div>
                  <div className="text-[10px] italic text-gray-500">(Ký, ghi rõ họ tên)</div>
                  <div className="pt-16 font-bold text-gray-900">
                    Phạm Thị Kế Toán
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-gray-900 text-[11px]">ĐẠI DIỆN ĐẠI LÝ</div>
                  <div className="text-[10px] italic text-gray-500">(Ký, đóng dấu, họ tên)</div>
                  <div className="pt-16 font-bold text-gray-900">
                    Đại diện pháp luật
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDebtStatementPrintModal;
