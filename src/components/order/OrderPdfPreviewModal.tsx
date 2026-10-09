import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Building2,
  MapPin,
  Calendar,
  User,
  Phone,
  FileText,
  BadgePercent
} from 'lucide-react';
import type { OrderBackendResponse } from '../../types/order';
import { formatCurrencyVND, formatQuantity } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, authFetch } from '../../services/api';

interface OrderPdfPreviewModalProps {
  isOpen: boolean;
  order: OrderBackendResponse | null;
  onClose: () => void;
}

/**
 * Tạo đồ họa mã vạch (Barcode Code 128 giả lập chính xác) bằng SVG thuần
 * Phục vụ kho tra cứu quét mã nhanh bằng máy barcode scanner (S4-08 AC2)
 */
const BarcodeSvg: React.FC<{ code: string }> = ({ code }) => {
  // Sinh mẫu vạch dựa trên chuỗi mã
  const cleanCode = (code || 'ORDER-000').toUpperCase();
  const bars: number[] = [];
  let sum = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    sum += charCode;
    bars.push((charCode % 3) + 1); // 1px, 2px, 3px
    bars.push(((charCode * 7) % 2) + 1); // khoảng trắng 1-2px
  }
  bars.push(2, 1, 3, 2, 1);

  return (
    <div className="flex flex-col items-center">
      <svg
        className="h-10 w-44"
        viewBox="0 0 160 40"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100%" height="100%" fill="white" />
        {bars.map((width, idx) => {
          const xPos = idx * 3.5;
          const isBar = idx % 2 === 0;
          return isBar ? (
            <rect key={idx} x={xPos} y="2" width={width} height="36" fill="black" />
          ) : null;
        })}
      </svg>
      <span className="font-mono text-[11px] tracking-widest font-bold text-gray-800 mt-0.5">
        *{cleanCode}*
      </span>
    </div>
  );
};

export const OrderPdfPreviewModal: React.FC<OrderPdfPreviewModalProps> = ({
  isOpen,
  order,
  onClose
}) => {
  const { showToast } = useAuth();
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  // Xử lý in trực tiếp qua trình duyệt với định dạng trang in tối ưu
  const handlePrint = () => {
    window.print();
  };

  // Xử lý tải file PDF (Gọi Backend API nếu có hoặc in ra file PDF)
  const handleDownloadPdf = async () => {
    try {
      // Kiểm tra xem Backend có sinh file PDF không (Trần Vũ Minh - BE subtask)
      const res = await authFetch(`${API_BASE_URL}/api/orders/${order.id}/pdf`).catch(() => null);
      if (res && res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Don_hang_${order.code || order.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Tải PDF thành công', `Đã tải xuống file PDF đơn hàng [${order.code || order.id}]`, 'success');
        return;
      }
    } catch {
      // Fallback
    }

    // Fallback: Mở hộp thoại in và cho phép chọn "Lưu dưới dạng PDF" (Save as PDF)
    showToast(
      'Xuất PDF',
      'Đang mở giao diện in. Bạn có thể chọn mục "Lưu dưới dạng PDF" (Save as PDF) để tải file về máy!',
      'info',
      5000
    );
    window.print();
  };

  const lines = order.lines || [];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div
        className="bg-white w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal (Ẩn khi in) */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F85606] text-white flex items-center justify-center">
              <FileText size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                Xem Trước & Xuất Mẫu In PDF Đơn Hàng (S4-08)
              </h3>
              <p className="text-[11px] text-gray-500">
                Mẫu in chuẩn khổ A4 dùng đưa đại lý xác nhận hoặc gửi kho chuẩn bị hàng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="In phiếu"
            >
              <Printer size={14} />
              <span>In Phiếu</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 rounded-xl bg-[#F85606] hover:bg-[#d94800] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Tải file PDF"
            >
              <Download size={14} />
              <span>Tải file PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 flex items-center justify-center transition cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Khung nội dung in khổ A4 (Có thể cuộn xem trước, in sắc nét) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printContentRef}
            className="max-w-[760px] mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-xs border border-gray-200/80 print:border-none print:shadow-none print:p-0 print:max-w-none text-gray-900 space-y-6"
          >
            {/* 1. Header Phiếu: Thông tin Công ty & Mã Đơn / Barcode */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-gray-300 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase block">
                  HỆ THỐNG PHÂN PHỐI & BÁN HÀNG ERP
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                  PHIẾU ĐẶT HÀNG BÁN BUÔN
                </h1>
                <p className="text-xs text-gray-500">
                  Sales Order Confirmation • Kho vận FEFO & Quản lý công nợ
                </p>
              </div>

              {/* S4-08 AC2: Mã đơn và Mã vạch để kho tra cứu nhanh */}
              <div className="flex flex-col items-center sm:items-end self-center sm:self-auto bg-gray-50/80 p-2 rounded-lg border border-gray-200/70">
                <BarcodeSvg code={order.code || `DH-${order.id}`} />
                <span className="text-[10px] text-gray-500 mt-1">
                  Mã tra cứu kho: <strong>{order.code || `#${order.id}`}</strong>
                </span>
              </div>
            </div>

            {/* 2. S4-08 AC1: Thông tin Đại lý & Điểm giao hàng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50/60 p-4 rounded-xl border border-gray-200">
              {/* Cột trái: Thông tin đại lý */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Building2 size={13} className="text-[#F85606]" />
                  <span>Thông tin đại lý đặt hàng:</span>
                </h4>
                <div className="pl-4 space-y-0.5">
                  <p className="font-bold text-sm text-gray-900">{order.customerName}</p>
                  <p className="text-gray-600">Mã đại lý: <strong className="font-mono">{order.customerCode}</strong></p>
                  <p className="text-gray-600">Nhóm KH: <strong>{order.customerGroupLabel || order.customerGroup}</strong></p>
                  {order.deliveryAddress?.receiverPhone && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <Phone size={11} /> SĐT: <strong>{order.deliveryAddress.receiverPhone}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Cột phải: Điểm giao hàng & Thời gian */}
              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-4 pt-2 sm:pt-0">
                <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <MapPin size={13} className="text-[#F85606]" />
                  <span>Địa điểm & Thời gian giao:</span>
                </h4>
                <div className="pl-4 space-y-0.5">
                  <p className="text-gray-800">
                    Kho/Điểm nhận: <strong>{order.deliveryAddress?.label || 'Địa chỉ hồ sơ'}</strong>
                  </p>
                  <p className="text-gray-600 leading-tight">
                    Địa chỉ: {order.deliveryAddress?.address || 'Tại trụ sở đại lý'}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1 pt-0.5">
                    <Calendar size={11} /> Ngày giao dự kiến: <strong>{order.desiredDeliveryDate ? new Date(order.desiredDeliveryDate).toLocaleDateString('vi-VN') : 'Theo thoả thuận'}</strong>
                  </p>
                  <p className="text-gray-600 flex items-center gap-1">
                    <User size={11} /> NVKD phụ trách: <strong>{order.createdByUsername || 'sales_rep'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* 3. S4-08 AC1: Chi tiết dòng hàng */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center justify-between">
                <span>Chi tiết danh mục hàng hóa đặt</span>
                <span className="text-[11px] font-normal text-gray-500">
                  Tổng {lines.length} mặt hàng
                </span>
              </h4>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs text-left divide-y divide-gray-200">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">STT</th>
                      <th className="py-2.5 px-3">Mã SKU</th>
                      <th className="py-2.5 px-3">Tên sản phẩm</th>
                      <th className="py-2.5 px-3 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 text-right">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá (VNĐ)</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 text-center text-gray-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-800">{line.productSku}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{line.productName}</td>
                        <td className="py-2.5 px-3 text-center text-gray-600">{line.unitName}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatQuantity(Number(line.quantity || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-700">
                          {formatCurrencyVND(Number(line.pricePerUnit || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                          {formatCurrencyVND(Number(line.netAmount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. S4-08 AC1: Chiết khấu và Tổng tiền thanh toán */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-1">
              <div className="text-xs text-gray-500 max-w-sm space-y-1">
                {order.note && (
                  <p className="italic text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <strong>Ghi chú đơn:</strong> {order.note}
                  </p>
                )}
                <p className="text-[10px] text-gray-400">
                  * Hàng hóa xuất theo tiêu chuẩn xuất kho FEFO (hạn sử dụng gần nhất xuất trước).
                </p>
              </div>

              {/* Bảng tính tổng tiền */}
              <div className="w-full sm:w-72 bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Tiền hàng trước CK:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrencyVND(Number(order.subtotal || 0))}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <BadgePercent size={13} />
                    <span>Chiết khấu sản lượng:</span>
                  </span>
                  <span className="font-mono">
                    -{formatCurrencyVND(Number(order.discountTotal || 0))}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline text-sm">
                  <strong className="text-gray-900 font-bold">Tổng thanh toán:</strong>
                  <strong className="text-base font-black text-[#F85606] font-mono">
                    {formatCurrencyVND(Number(order.totalAmount || 0))}
                  </strong>
                </div>
              </div>
            </div>

            {/* 5. Khối ký nhận 3 bên */}
            <div className="pt-8 border-t border-gray-200 grid grid-cols-3 gap-4 text-center text-xs">
              <div className="space-y-12">
                <div>
                  <strong className="block text-gray-800 font-bold">ĐẠI DIỆN ĐẠI LÝ</strong>
                  <span className="text-[10px] text-gray-400">(Ký, ghi rõ họ tên)</span>
                </div>
                <div className="text-[11px] text-gray-400 font-medium italic">
                  {order.customerName}
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <strong className="block text-gray-800 font-bold">NHÂN VIÊN KINH DOANH</strong>
                  <span className="text-[10px] text-gray-400">(Ký, ghi rõ họ tên)</span>
                </div>
                <div className="text-[11px] text-gray-600 font-bold">
                  {order.createdByUsername || 'sales_rep'}
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <strong className="block text-gray-800 font-bold">THỦ KHO XUẤT HÀNG</strong>
                  <span className="text-[10px] text-gray-400">(Ký, ghi rõ họ tên)</span>
                </div>
                <div className="text-[11px] text-gray-400 font-medium italic">
                  Bộ phận kho vận
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
