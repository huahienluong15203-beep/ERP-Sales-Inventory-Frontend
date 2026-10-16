import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { PickingList } from '../../types/pickingList';

interface PickingListPrintModalProps {
  isOpen: boolean;
  pickingList: PickingList | null;
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
  totalModules += 20; // quiet zones

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

export const PickingListPrintModal: React.FC<PickingListPrintModalProps> = ({
  isOpen,
  pickingList,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !pickingList) return null;

  const handlePrint = () => {
    window.print();
  };

  const sortedItems = [...pickingList.items].sort((a, b) => (a.routeSequence || 0) - (b.routeSequence || 0));

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Actions header */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Xem trước & In Phiếu Soạn Hàng (A4)</h3>
              <p className="text-xs text-gray-400">Tối ưu lộ trình di chuyển trong kho (S6-03 / SCRUM-88)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              In phiếu ngay
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

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-[210mm] min-h-[297mm] p-8 bg-white shadow-lg text-gray-900 font-sans text-xs print:p-0 print:shadow-none print:w-full"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Header công ty */}
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h1 className="text-base font-extrabold text-orange-600 tracking-wide uppercase">
                  CÔNG TY CỔ PHẦN PHÂN PHỐI & BÁN LẺ TOÀN QUỐC
                </h1>
                <p className="text-gray-500 text-[11px]">Hệ thống Quản lý Bán hàng & Tồn kho ERP Pro</p>
                <div className="mt-2 text-gray-700 text-[11px] space-y-0.5">
                  <p>📍 <strong>Kho xuất:</strong> {pickingList.warehouseName}</p>
                  <p>👤 <strong>Thủ kho soạn:</strong> {pickingList.pickerName || 'Chưa gán'} | <strong>Mã NV:</strong> #{pickingList.pickerId || 'N/A'}</p>
                </div>
              </div>

              {/* Barcode & Phiếu */}
              <div className="text-right flex flex-col items-end">
                <div className="mb-1">{renderBarcodeSvg(pickingList.code)}</div>
                <div className="font-mono font-bold text-sm tracking-wider">{pickingList.code}</div>
                <div className="text-[10px] text-gray-500">
                  Ngày lập: {new Date(pickingList.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="text-center my-4">
              <h2 className="text-xl font-black uppercase tracking-wider text-gray-900">
                PHIẾU SOẠN HÀNG TỔNG HỢP (WAVE PICKING)
              </h2>
              <p className="text-gray-600 italic text-[11px] mt-0.5">
                (Liệt kê các mặt hàng gộp từ {pickingList.orderCount} đơn hàng đã duyệt, sắp xếp theo đường đi trong kho)
              </p>
            </div>

            {/* Danh sách đơn hàng gom trong phiếu */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4 text-[11px]">
              <div className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>📋 Đơn hàng trong đợt soạn ({pickingList.orders?.length || 0} đơn):</span>
                <span className="text-orange-600 font-mono">
                  Tổng tiền: {pickingList.orders?.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-gray-600">
                {pickingList.orders?.map((ord) => (
                  <div key={ord.id} className="truncate">
                    • <strong className="text-gray-800">{ord.code}</strong>: {ord.customerName}
                  </div>
                ))}
              </div>
              {pickingList.note && (
                <div className="mt-2 text-gray-500 italic">
                  Ghi chú: {pickingList.note}
                </div>
              )}
            </div>

            {/* Bảng danh sách hàng hóa sắp xếp theo đường đi */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 font-bold uppercase text-[10px]">
                    <th className="py-2 px-2 text-center w-10">Lộ trình</th>
                    <th className="py-2 px-2.5 w-24">Vị trí lưu</th>
                    <th className="py-2 px-2.5 w-28">Mã SKU</th>
                    <th className="py-2 px-3">Tên sản phẩm & Phân bổ đơn</th>
                    <th className="py-2 px-2 text-center w-14">ĐVT</th>
                    <th className="py-2 px-2 text-right w-16">Cần lấy</th>
                    <th className="py-2 px-2 text-right w-16">Thực soạn</th>
                    <th className="py-2 px-2 text-center w-12">Tích</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2 text-center font-bold text-orange-600 bg-orange-50/50">
                        #{item.routeSequence || idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono font-bold text-gray-900 bg-gray-50/80">
                        📍 {item.locationCode || 'CHỜ XẾP'}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-gray-700">
                        {item.productSku}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        {item.allocations && item.allocations.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-0.5 space-x-2">
                            {item.allocations.map((al, aIdx) => (
                              <span key={aIdx} className="inline-block bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                                {al.orderCode}: <strong>{al.quantity}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        {item.discrepancyReason && (
                          <div className="text-[10px] text-red-600 mt-0.5 italic">
                            ⚠️ Lý do thiếu: {item.discrepancyReason}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-600">
                        {item.baseUnit}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-gray-900">
                        {item.requiredQuantity}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-700">
                        {item.pickedQuantity > 0 ? item.pickedQuantity : '____'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="w-5 h-5 mx-auto border-2 border-gray-400 rounded-sm flex items-center justify-center">
                          {item.isCompleted && <span className="font-bold text-xs">✓</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ghi chú & Chữ ký */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[11px] border-t border-gray-300">
              <div>
                <p className="font-bold uppercase text-gray-800">Người lập phiếu</p>
                <p className="text-[10px] text-gray-400 italic">(Ký & ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-medium text-gray-700">Bộ phận Điều phối kho</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-800">Thủ kho soạn hàng</p>
                <p className="text-[10px] text-gray-400 italic">(Đã kiểm đếm & gom đủ)</p>
                <div className="h-16"></div>
                <p className="font-medium text-gray-700">{pickingList.pickerName || '...............................'}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-800">Trưởng ca kiểm tra</p>
                <p className="text-[10px] text-gray-400 italic">(Xác nhận xuất bãi soạn)</p>
                <div className="h-16"></div>
                <p className="font-medium text-gray-700">Quản lý kho</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
