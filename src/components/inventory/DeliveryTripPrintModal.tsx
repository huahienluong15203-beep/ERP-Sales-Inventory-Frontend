import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { DeliveryTrip } from '../../types/deliveryTrip';

interface DeliveryTripPrintModalProps {
  isOpen: boolean;
  trip: DeliveryTrip | null;
  onClose: () => void;
}

// Bảng Code 128
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

function code128Symbols(data: string): number[] | null {
  if (!data) return null;
  const values = [104];
  let checksum = 104;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    if (c < 32 || c > 126) return null;
    values.push(c - 32);
    checksum += (c - 32) * (i + 1);
  }
  values.push(checksum % 103, 106);
  return values;
}

function renderBarcodeSvg(code: string): React.ReactNode {
  const symbols = code128Symbols(code);
  if (!symbols) return null;

  let totalModules = 0;
  for (const s of symbols) {
    const pat = CODE128_PATTERNS[s] || '';
    for (let i = 0; i < pat.length; i++) totalModules += parseInt(pat[i], 10);
  }
  totalModules += 20;

  const moduleWidth = 1.3;
  const height = 45;
  const width = totalModules * moduleWidth;

  const rects: React.ReactNode[] = [];
  let currentX = 10 * moduleWidth;

  symbols.forEach((sym, symIdx) => {
    const pat = CODE128_PATTERNS[sym] || '';
    let isBar = true;
    for (let i = 0; i < pat.length; i++) {
      const w = parseInt(pat[i], 10) * moduleWidth;
      if (isBar) {
        rects.push(
          <rect
            key={`${symIdx}-${i}`}
            x={currentX}
            y={0}
            width={w}
            height={height}
            fill="#000"
          />
        );
      }
      currentX += w;
      isBar = !isBar;
    }
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {rects}
    </svg>
  );
}

export const DeliveryTripPrintModal: React.FC<DeliveryTripPrintModalProps> = ({
  isOpen,
  trip,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !trip) return null;

  const handlePrint = () => {
    window.print();
  };

  const sortedStops = [...(trip.stops || [])].sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));
  const totalTripAmount = sortedStops.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Actions */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">In Danh Sách Điểm Giao Hàng & Phân Tuyến</h3>
              <p className="text-xs text-gray-400">Đáp ứng tiêu chuẩn AC3: Kèm địa chỉ, số điện thoại người nhận & cột ký nhận</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              In danh sách ngay
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper A4 */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-[210mm] min-h-[297mm] p-8 bg-white shadow-lg text-gray-900 font-sans text-xs print:p-0 print:shadow-none print:w-full"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Header Doanh Nghiệp */}
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h1 className="text-base font-extrabold text-blue-700 tracking-wide uppercase">
                  CÔNG TY CỔ PHẦN PHÂN PHỐI & BÁN LẺ TOÀN QUỐC
                </h1>
                <p className="text-gray-500 text-[11px]">Trung Tâm Vận Tải & Điều Phối Tuyến Giao Hàng</p>
                <div className="mt-2 text-gray-700 text-[11px] space-y-0.5">
                  <p>📍 <strong>Kho xuất phát:</strong> {trip.warehouseName || 'Kho Tổng Miền Bắc'}</p>
                  <p>🚛 <strong>Phương tiện / Biển số:</strong> <span className="font-mono font-bold text-gray-900">{trip.vehiclePlate || 'Xe giao hàng'}</span></p>
                  <p>👤 <strong>Tài xế phụ trách:</strong> <strong>{trip.driverName}</strong> | 📞 SĐT: <strong>{trip.driverPhone || '0988.xxx.xxx'}</strong></p>
                </div>
              </div>

              {/* Barcode & Thông tin chuyến */}
              <div className="text-right flex flex-col items-end">
                <div className="mb-1">{renderBarcodeSvg(trip.code)}</div>
                <div className="font-mono font-bold text-sm tracking-wider">{trip.code}</div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Khởi hành: {trip.departedAt ? new Date(trip.departedAt).toLocaleString('vi-VN') : 'Đang chuẩn bị'}
                </div>
                <div className="text-[10px] text-gray-500">
                  Dự kiến về: {new Date(trip.expectedReturnAt).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="text-center my-4">
              <h2 className="text-xl font-black uppercase tracking-wider text-gray-900">
                BẢNG KÊ ĐIỂM GIAO HÀNG (DELIVERY MANIFEST)
              </h2>
              <p className="text-gray-600 italic text-[11px] mt-0.5">
                (Phân tuyến vận chuyển gồm {sortedStops.length} điểm giao • Tài xế có trách nhiệm kiểm tra ký nhận tại từng điểm)
              </p>
            </div>

            {/* Bảng danh sách điểm giao kèm Địa chỉ và Số điện thoại người nhận (AC3) */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 font-bold uppercase text-[10px]">
                    <th className="py-2 px-2 text-center w-8">STT</th>
                    <th className="py-2 px-2.5 w-24">Mã đơn hàng</th>
                    <th className="py-2 px-3 w-40">Khách hàng / Đại lý</th>
                    <th className="py-2 px-3">Địa chỉ giao hàng chi tiết</th>
                    <th className="py-2 px-3 w-36">Người nhận & SĐT</th>
                    <th className="py-2 px-2.5 text-right w-24">Tiền thu (COD)</th>
                    <th className="py-2 px-3 text-center w-28">Ký nhận của khách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedStops.map((stop, idx) => (
                    <tr key={stop.orderId || idx} className="hover:bg-gray-50">
                      <td className="py-3 px-2 text-center font-bold text-blue-700 bg-blue-50/50">
                        #{stop.stopSequence || idx + 1}
                      </td>
                      <td className="py-3 px-2.5 font-mono font-bold text-gray-900">
                        {stop.orderCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{stop.customerName}</div>
                        {stop.customerCode && (
                          <div className="text-[10px] text-gray-400 font-mono">Mã: {stop.customerCode}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-gray-800 leading-snug">{stop.deliveryAddress}</div>
                        {stop.district && (
                          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            📍 {stop.district}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">{stop.receiverName || 'Chủ đại lý'}</div>
                        <div className="font-mono text-blue-700 font-bold text-[11px]">
                          📞 {stop.receiverPhone || '0988.xxx.xxx'}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-right font-black text-gray-900">
                        {stop.totalAmount?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="h-10 border border-dashed border-gray-300 rounded flex flex-col justify-end p-1">
                          <span className="text-[9px] text-gray-400 italic">Ký & ghi họ tên</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold text-gray-900 border-t border-gray-300">
                    <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[10px]">
                      Tổng tiền hàng trên chuyến xe ({sortedStops.length} điểm):
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-black text-blue-700 text-sm">
                      {totalTripAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Ghi chú lộ trình */}
            {trip.note && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-6 text-[11px] text-gray-700">
                <strong>Ghi chú lộ trình / Dặn dò tài xế:</strong> {trip.note}
              </div>
            )}

            {/* Khối chữ ký 3 bên */}
            <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[11px] border-t border-gray-300">
              <div>
                <p className="font-bold uppercase text-gray-800">Người Điều Phối Chuyến</p>
                <p className="text-[10px] text-gray-400 italic">(Lập lộ trình & phân xe)</p>
                <div className="h-16"></div>
                <p className="font-medium text-gray-700">Bộ phận Điều vận</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-800">Thủ Kho Xuất Hàng</p>
                <p className="text-[10px] text-gray-400 italic">(Đã bàn giao hàng lên xe)</p>
                <div className="h-16"></div>
                <p className="font-medium text-gray-700">Thủ kho ca trực</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-800">Tài Xế Nhận Bàn Giao</p>
                <p className="text-[10px] text-gray-400 italic">(Cam kết giao đủ các điểm)</p>
                <div className="h-16"></div>
                <p className="font-medium text-gray-700">{trip.driverName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
