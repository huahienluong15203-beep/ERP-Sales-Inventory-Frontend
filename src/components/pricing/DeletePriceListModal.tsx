import React, { useState, useEffect } from 'react';
import type { PriceList, CustomerGroupType } from '../../types/pricing';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import { Icons } from '../common/Icons';

interface DeletePriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceList: PriceList | null;
  onConfirm: (priceList: PriceList) => Promise<void>;
  onCloneVersion?: (priceList: PriceList) => void;
}

/**
 * Modal xác nhận xoá bảng giá chuẩn UI của hệ thống (thay thế hoàn toàn window.confirm/alert).
 * Làm rõ rõ ràng 2 kịch bản nghiệp vụ:
 * 1. Bảng giá đã phát sinh đơn hàng (hasOrders = true): Chặn xoá hoàn toàn để bảo toàn dữ liệu kế toán, gợi ý tạo bản mới.
 * 2. Bảng giá đang bật áp dụng (ACTIVE) nhưng chưa có đơn: Cảnh báo rõ ràng ảnh hưởng đến đơn hàng mới trước khi xoá.
 */
export const DeletePriceListModal: React.FC<DeletePriceListModalProps> = ({
  isOpen,
  onClose,
  priceList,
  onConfirm,
  onCloneVersion
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSubmitting(false);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !priceList) return null;

  const hasOrders = !!priceList.hasOrders;
  const isActive = priceList.status === 'ACTIVE';
  const groupInfo = CUSTOMER_GROUPS[priceList.customerGroup as CustomerGroupType];
  const totalSkus = priceList.itemsCount || (priceList.items ? priceList.items.length : 0);

  const handleExecuteDelete = async () => {
    if (hasOrders) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(priceList);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể xóa bảng giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-pricelist-title"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <Icons.X size={18} />
        </button>

        {/* Icon nhận diện ngữ cảnh */}
        <div
          className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center border ${
            hasOrders
              ? 'bg-amber-50 border-amber-200 text-amber-600'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          {hasOrders ? <Icons.ShieldAlert size={28} /> : <Icons.Trash2 size={28} />}
        </div>

        {/* Tiêu đề Modal */}
        <h3 id="delete-pricelist-title" className="text-lg font-bold text-gray-900 mb-1.5">
          {hasOrders ? 'Bảng giá đã bị khóa (Không thể xóa)' : 'Xác nhận xóa bảng giá'}
        </h3>

        {/* Thẻ thông tin tóm tắt bảng giá */}
        <div className="bg-gray-50/90 border border-gray-200 rounded-xl p-3.5 my-3 text-left space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 text-sm truncate">{priceList.name}</span>
            <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded text-[11px] shrink-0">
              {priceList.code} v{priceList.version || 1}
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-600 flex-wrap pt-1 border-t border-gray-200/80">
            <div>
              <span className="text-gray-400">Nhóm: </span>
              <span className="font-medium text-gray-800">{groupInfo?.shortLabel || priceList.customerGroup}</span>
            </div>
            <div>
              <span className="text-gray-400">Mặt hàng: </span>
              <span className="font-bold text-gray-800">{totalSkus} SKU</span>
            </div>
            <div>
              <span className="text-gray-400">Trạng thái: </span>
              <span
                className={`font-semibold ${
                  isActive ? 'text-emerald-600' : 'text-gray-500'
                }`}
              >
                {isActive ? '● Đang bật' : '○ Đang tắt'}
              </span>
            </div>
          </div>
        </div>

        {/* Cảnh báo chi tiết từng trường hợp nghiệp vụ */}
        {hasOrders ? (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-900 flex items-start gap-2.5 mb-4">
            <Icons.AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-bold block text-rose-900">
                Quy tắc nghiệp vụ bảo vệ chứng từ:
              </span>
              <span className="text-rose-800 block text-[11.5px]">
                Bảng giá này <strong>đã phát sinh đơn hàng</strong> trong hệ thống. Để bảo toàn lịch sử hóa đơn,
                doanh thu và phục vụ đối soát kiểm toán, bạn <strong>không thể xóa</strong> bảng giá này.
              </span>
              <span className="text-rose-700 block text-[11.5px] pt-1">
                👉 <em>Giải pháp:</em> Bạn có thể chuyển sang <strong>Ngừng áp dụng (Đang tắt)</strong> để không nhận đơn mới, hoặc bấm <strong>Tạo bản mới</strong> để điều chỉnh giá.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-4 text-left">
            {isActive && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Icons.AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-amber-900">
                    Bảng giá đang được kích hoạt áp dụng!
                  </span>
                  <span className="text-amber-800 block text-[11.5px] leading-relaxed">
                    Bảng giá này hiện đang có hiệu lực. Nếu xóa, các đơn hàng bán tạo mới cho nhóm khách hàng này sẽ <strong>không còn được tự động nhận biểu giá này</strong> nữa.
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
              <Icons.Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <span className="text-[11.5px] leading-relaxed">
                Do bảng giá này <strong>chưa phát sinh đơn hàng nào</strong>, bạn hoàn toàn có thể xóa để dọn dẹp cấu hình tạo nhầm. Thao tác xóa sẽ gỡ bỏ bảng giá cùng toàn bộ {totalSkus} dòng giá và <strong>không thể hoàn tác</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Hiển thị lỗi nếu API trả về lỗi */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-left flex items-start gap-2">
            <Icons.AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {hasOrders ? 'Đã hiểu, đóng lại' : 'Hủy bỏ'}
          </button>

          {hasOrders ? (
            onCloneVersion && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCloneVersion(priceList);
                }}
                className="flex-1 h-11 rounded-xl bg-[#F85606] hover:bg-[#E04D05] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Icons.Copy size={16} />
                <span>Tạo phiên bản mới (v{(priceList.version || 1) + 1})</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleExecuteDelete}
              disabled={submitting}
              className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <>
                  <Icons.RefreshCw size={16} className="animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Icons.Trash2 size={16} />
                  <span>Xác nhận xóa bảng giá</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
