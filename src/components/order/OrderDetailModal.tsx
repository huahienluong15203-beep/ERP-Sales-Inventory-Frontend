import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Calendar,
  Building2,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Edit,
  Phone,
  RefreshCw
} from 'lucide-react';
import type { OrderBackendResponse } from '../../types/order';
import { fetchOrderDetail, formatCurrencyVND, formatQuantity } from '../../services/orderService';
import { useNavigate } from '../../routes/Router';

interface OrderDetailModalProps {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [order, setOrder] = useState<OrderBackendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orderId) {
      return;
    }

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) {
        setLoading(true);
        setError(null);
      }
    }, 0);

    fetchOrderDetail(orderId)
      .then((data) => {
        if (isSubscribed) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error('Lỗi tải chi tiết đơn hàng:', err);
          setError(err.message || 'Không thể tải thông tin chi tiết đơn hàng');
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isOpen, orderId]);

  const activeOrder = (!isOpen || !orderId) ? null : order;

  if (!isOpen) return null;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} />
            <span>Đã duyệt</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={13} />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <FileText size={13} />
            <span>Đơn nháp</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={13} />
            <span>Từ chối</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <XCircle size={13} />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 via-amber-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-gray-900 font-mono">
                  {activeOrder?.code || `Đơn hàng #${orderId}`}
                </h3>
                {activeOrder && renderStatusBadge(activeOrder.status)}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Chi tiết dòng hàng và thông tin đặt hàng của đại lý
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-500">
              <RefreshCw size={26} className="animate-spin text-[#F85606]" />
              <span className="text-sm font-medium">Đang tải chi tiết đơn hàng...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Không thể hiển thị đơn hàng</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && activeOrder && (
            <>
              {/* Khối 1: Thông tin đại lý & Người phụ trách */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#F85606]" />
                    <span>Thông tin đại lý</span>
                  </h4>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900">{activeOrder.customerName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                        {activeOrder.customerCode}
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-orange-100/70 text-[#F85606] font-semibold text-[11px]">
                        {activeOrder.customerGroupLabel || activeOrder.customerGroup}
                      </span>
                    </div>
                  </div>
                  {activeOrder.deliveryAddress && (
                    <div className="pt-2 border-t border-gray-200/60 text-xs text-gray-600 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          <strong>{activeOrder.deliveryAddress.label}:</strong> {activeOrder.deliveryAddress.address}
                        </span>
                      </div>
                      {activeOrder.deliveryAddress.receiverName && (
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 pl-4.5">
                          <span>Người nhận: {activeOrder.deliveryAddress.receiverName}</span>
                          {activeOrder.deliveryAddress.receiverPhone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone size={10} /> {activeOrder.deliveryAddress.receiverPhone}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#F85606]" />
                    <span>Thời gian & Người lập đơn</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Ngày tạo:</span>
                      <span className="font-semibold text-gray-800">
                        {activeOrder.createdAt ? new Date(activeOrder.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Ngày giao dự kiến:</span>
                      <span className="font-semibold text-gray-800">
                        {activeOrder.desiredDeliveryDate
                          ? new Date(activeOrder.desiredDeliveryDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Người tạo:</span>
                      <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                        <User size={12} className="text-gray-400" />
                        <span>{activeOrder.createdByUsername || 'sales_rep'}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Cập nhật lúc:</span>
                      <span className="font-semibold text-gray-800">
                        {activeOrder.updatedAt ? new Date(activeOrder.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </div>
                  {activeOrder.note && (
                    <div className="pt-2 border-t border-gray-200/60 text-xs text-gray-600">
                      <strong>Ghi chú:</strong> <em>{activeOrder.note}</em>
                    </div>
                  )}
                </div>
              </div>

              {/* Khối Cảnh báo vi phạm / Cần phê duyệt (nếu có) */}
              {activeOrder.warnings && activeOrder.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle size={14} />
                    <span>Cảnh báo duyệt ngoại lệ:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {activeOrder.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Khối 2: Danh sách dòng hàng */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-[#F85606]" />
                    <span>Danh sách sản phẩm đặt hàng ({activeOrder.lines?.length || 0})</span>
                  </h4>
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50/80 text-gray-700 font-bold border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">#</th>
                          <th className="py-2.5 px-3">Mã SKU</th>
                          <th className="py-2.5 px-3">Tên sản phẩm</th>
                          <th className="py-2.5 px-3 text-center">ĐVT</th>
                          <th className="py-2.5 px-3 text-right">Số lượng</th>
                          <th className="py-2.5 px-3 text-right">Đơn giá</th>
                          <th className="py-2.5 px-3 text-right">Chiết khấu</th>
                          <th className="py-2.5 px-3 text-right font-bold">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeOrder.lines && activeOrder.lines.length > 0 ? (
                          activeOrder.lines.map((line, index) => (
                            <tr key={line.id || index} className="hover:bg-orange-50/25 transition-colors">
                              <td className="py-2.5 px-3 text-center text-gray-500">{line.lineNo || index + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-800">{line.productSku}</td>
                              <td className="py-2.5 px-3 font-medium text-gray-900">{line.productName}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-semibold">
                                  {line.unitName || line.baseUnit}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                                {formatQuantity(line.quantity)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-700">
                                {formatCurrencyVND(line.pricePerUnit || line.unitPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                                {line.discountAmount > 0 ? `-${formatCurrencyVND(line.discountAmount)}` : '0 đ'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[#F85606]">
                                {formatCurrencyVND(line.netAmount || line.grossAmount - line.discountAmount)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-gray-400">
                              Đơn hàng chưa có dòng sản phẩm nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Khối 3: Bảng tổng kết tiền */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-80 rounded-xl bg-orange-50/50 border border-orange-100 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrencyVND(Number(activeOrder.subtotal || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng chiết khấu:</span>
                    <span className="font-semibold text-rose-600">
                      -{formatCurrencyVND(Number(activeOrder.discountTotal || 0))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-orange-200/60 flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-900">Tổng thanh toán:</span>
                    <span className="text-base font-extrabold text-[#F85606]">
                      {formatCurrencyVND(Number(activeOrder.totalAmount || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            {activeOrder?.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/orders/create?draftId=${activeOrder.id}`);
                }}
                className="px-4 py-2 rounded-xl bg-white border border-orange-300 text-[#F85606] hover:bg-orange-50 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <Edit size={14} />
                <span>Tiếp tục chỉnh sửa đơn nháp</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
