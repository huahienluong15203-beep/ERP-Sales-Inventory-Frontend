import React from 'react';
import { X, Printer } from 'lucide-react';
import { formatCurrencyVND } from '../../services/orderService';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import type { PeriodicReconciliationStatement } from '../../types/debtReconciliation';

interface ReconciliationPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  statement: PeriodicReconciliationStatement | null;
}

export const ReconciliationPrintModal: React.FC<ReconciliationPrintModalProps> = ({
  isOpen,
  onClose,
  statement
}) => {
  if (!isOpen || !statement) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh] my-auto print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Header điều khiển (Ẩn khi in) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">
              Xem trước Biên bản đối chiếu công nợ A4
            </span>
            <span className="text-xs font-mono text-gray-500">({statement.statementCode})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer size={15} />
              <span>In biên bản (A4)</span>
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

        {/* Thân biên bản mẫu in A4 */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 text-gray-900 bg-white print:p-0">
          <div className="max-w-[760px] mx-auto space-y-4 text-xs font-sans leading-normal">
            {/* Quốc hiệu tiêu ngữ */}
            <div className="text-center space-y-0.5 border-b border-gray-300 pb-3">
              <div className="font-bold uppercase tracking-wider text-sm">
                CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="font-semibold text-xs italic">Độc lập - Tự do - Hạnh phúc</div>
              <div className="text-[11px] text-gray-500 pt-1">
                Số: <span className="font-mono font-bold text-gray-800">{statement.statementCode}</span>
                {' • '}
                Ngày lập: {statement.statementDate}
              </div>
            </div>

            {/* Tiêu đề biên bản */}
            <div className="text-center pt-2 pb-1">
              <h1 className="text-base sm:text-lg font-black uppercase text-gray-950 tracking-wide">
                BIÊN BẢN ĐỐI CHIẾU VÀ XÁC NHẬN CÔNG NỢ
              </h1>
              <p className="text-xs italic text-gray-600 mt-0.5">
                Kỳ đối chiếu: Từ ngày <strong>{statement.fromDate}</strong> đến ngày{' '}
                <strong>{statement.toDate}</strong>
              </p>
            </div>

            {/* Căn cứ pháp lý */}
            <p className="text-[11px] italic text-gray-600 text-justify">
              Căn cứ vào hợp đồng nguyên tắc phân phối hàng hoá và sổ sách theo dõi công nợ giữa hai bên,
              hôm nay ngày {statement.statementDate}, chúng tôi gồm có:
            </p>

            {/* Thông tin 2 bên */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
              <div className="space-y-1">
                <div className="font-bold uppercase text-gray-900 text-[11px] border-b border-gray-200 pb-1">
                  BÊN A (BÊN BÁN):
                </div>
                <div className="font-bold text-gray-900">CÔNG TY CỔ PHẦN PHÂN PHỐI TIÊU DÙNG TOÀN CẦU</div>
                <div className="text-[11px] text-gray-600">MST: 0108888888</div>
                <div className="text-[11px] text-gray-600">Địa chỉ: Tòa nhà Discovery, 302 Cầu Giấy, Hà Nội</div>
                <div className="text-[11px] text-gray-600">Đại diện: <strong>Phạm Thị Kế Toán</strong> - Kế toán công nợ</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold uppercase text-gray-900 text-[11px] border-b border-gray-200 pb-1">
                  BÊN B (BÊN MUA):
                </div>
                <div className="font-bold text-gray-900">{statement.customerName}</div>
                <div className="text-[11px] text-gray-600">
                  Mã đại lý: <span className="font-mono font-bold text-gray-800">{statement.customerCode}</span>
                  {statement.customerTaxCode ? ` • MST: ${statement.customerTaxCode}` : ''}
                </div>
                <div className="text-[11px] text-gray-600">
                  Địa chỉ: {statement.customerAddress || 'Chưa cập nhật'}
                </div>
                <div className="text-[11px] text-gray-600">
                  Đại diện: <strong>{statement.agencySignedBy || 'Chủ cơ sở đại lý'}</strong>
                </div>
              </div>
            </div>

            {/* Nội dung đối chiếu tổng hợp */}
            <div className="space-y-2 pt-1">
              <div className="font-bold uppercase text-[11px] text-gray-800">
                1. TỔNG HỢP SỐ LIỆU CÔNG NỢ TRONG KỲ:
              </div>
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-2 font-semibold w-2/3">I. Số dư nợ đầu kỳ (tính đến ngày {statement.fromDate}):</td>
                    <td className="p-2 text-right font-mono font-bold text-gray-900">
                      {formatCurrencyVND(statement.openingBalance)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td className="p-2 font-semibold text-orange-950">
                      II. Tổng số tiền mua hàng phát sinh trong kỳ (Hoá đơn bán hàng):
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-[#F85606]">
                      +{formatCurrencyVND(statement.totalDebit)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-2 font-semibold text-emerald-950">
                      III. Tổng số tiền đã thanh toán & giảm trừ trong kỳ:
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
                      -{formatCurrencyVND(statement.totalCredit)}
                    </td>
                  </tr>
                  <tr className="bg-orange-50/70 border-t-2 border-gray-400">
                    <td className="p-2.5 font-black text-gray-950 uppercase text-xs">
                      IV. SỐ DƯ CÔNG NỢ CUỐI KỲ CÒN PHẢI THANH TOÁN (đến ngày {statement.toDate}):
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-sm text-[#F85606]">
                      {formatCurrencyVND(statement.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 bg-gray-50 rounded-lg text-[11px] italic text-gray-700">
                Bằng chữ: <strong>{numberToVietnameseWords(statement.closingBalance)}</strong>
              </div>
            </div>

            {/* Bảng kê chi tiết chứng từ phát sinh */}
            {statement.transactions && statement.transactions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="font-bold uppercase text-[11px] text-gray-800">
                  2. CHI TIẾT CÁC CHỨNG TỪ PHÁT SINH TRONG KỲ:
                </div>
                <table className="w-full border-collapse border border-gray-300 text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800">
                      <th className="p-1.5 text-center w-10 border-r border-gray-300">STT</th>
                      <th className="p-1.5 text-center w-20 border-r border-gray-300">Ngày</th>
                      <th className="p-1.5 text-left w-28 border-r border-gray-300">Mã chứng từ</th>
                      <th className="p-1.5 text-left border-r border-gray-300">Nội dung</th>
                      <th className="p-1.5 text-right w-24 border-r border-gray-300">Phát sinh Nợ</th>
                      <th className="p-1.5 text-right w-24 border-r border-gray-300">Phát sinh Có</th>
                      <th className="p-1.5 text-right w-24">Số dư luỹ kế</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.transactions.map((t, idx) => (
                      <tr key={t.id || idx} className="border-b border-gray-200">
                        <td className="p-1.5 text-center border-r border-gray-300">{idx + 1}</td>
                        <td className="p-1.5 text-center border-r border-gray-300">{t.date}</td>
                        <td className="p-1.5 font-mono font-bold border-r border-gray-300">{t.code}</td>
                        <td className="p-1.5 border-r border-gray-300">
                          <span className="font-semibold">{t.typeLabel}</span>
                          {t.notes && <span className="text-gray-500 block text-[10px]">{t.notes}</span>}
                        </td>
                        <td className="p-1.5 text-right font-mono border-r border-gray-300 text-gray-900">
                          {t.debit > 0 ? formatCurrencyVND(t.debit) : '-'}
                        </td>
                        <td className="p-1.5 text-right font-mono border-r border-gray-300 text-gray-900">
                          {t.credit > 0 ? formatCurrencyVND(t.credit) : '-'}
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-gray-900">
                          {formatCurrencyVND(t.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Kết luận & Chữ ký hai bên */}
            <div className="pt-2 space-y-2">
              <p className="text-[11px] text-justify leading-relaxed text-gray-700">
                Hai bên cùng nhau kiểm tra, đối chiếu và thống nhất số liệu công nợ nêu trên là hoàn toàn chính xác.
                Biên bản này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ
                thanh toán và hạch toán kế toán.
              </p>

              {statement.agencyFeedback && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px]">
                  <strong>Ý kiến phản hồi lệch của đại lý:</strong> &ldquo;{statement.agencyFeedback}&rdquo;
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-center pt-4 pb-12">
                <div className="space-y-1">
                  <div className="font-bold uppercase text-xs">ĐẠI DIỆN BÊN A (BÊN BÁN)</div>
                  <div className="text-[10px] italic text-gray-500">(Ký, đóng dấu, ghi rõ họ tên)</div>
                  <div className="pt-16 font-bold text-gray-900">
                    {statement.confirmedBy || 'Phạm Thị Kế Toán'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-xs">ĐẠI DIỆN BÊN B (BÊN MUA)</div>
                  <div className="text-[10px] italic text-gray-500">(Ký, đóng dấu, ghi rõ họ tên)</div>
                  <div className="pt-16 font-bold text-gray-900">
                    {statement.agencySignedBy || 'Đại diện theo pháp luật'}
                  </div>
                  {statement.agencySignedAt && (
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      Đã ký điện tử lúc {statement.agencySignedAt}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationPrintModal;
