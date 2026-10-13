import React, { useState, useEffect, useMemo } from 'react';
import type { OrderDraft } from '../../types/order';
import { formatCurrencyVND } from '../../services/orderService';
import { FileText, X, Trash2, ArrowRight, Clock, Building2, ShoppingBag, RefreshCw, ChevronLeft, ChevronRight } from '../common/Icons';
import { buildPageItems } from '../common/Pagination';

const PAGE_SIZE = 10;

interface OrderDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: OrderDraft[];
  onSelectDraft: (draft: OrderDraft) => void;
  /** Hàm xóa / hủy đơn hàng nháp */
  onDeleteDraft?: (draftId: string) => Promise<void> | void;
}

export const OrderDraftsModal: React.FC<OrderDraftsModalProps> = ({
  isOpen,
  onClose,
  drafts,
  onSelectDraft,
  onDeleteDraft
}) => {
  const [draftPendingDelete, setDraftPendingDelete] = useState<OrderDraft | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const totalPages = Math.ceil(drafts.length / PAGE_SIZE) || 1;
  const currentDisplay = Math.min(currentPage, totalPages - 1) + 1;
  const from = drafts.length === 0 ? 0 : (currentDisplay - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentDisplay * PAGE_SIZE, drafts.length);

  // Đảm bảo không bị kẹt ở trang rỗng khi xoá bớt đơn
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [drafts.length, totalPages, currentPage]);

  // Reset về trang đầu khi mở modal
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen]);

  const paginatedDrafts = useMemo(() => {
    const start = (currentDisplay - 1) * PAGE_SIZE;
    return drafts.slice(start, start + PAGE_SIZE);
  }, [drafts, currentDisplay]);

  useEffect(() => {
    if (!draftPendingDelete) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setDraftPendingDelete(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [draftPendingDelete, isDeleting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Danh Sách Đơn Hàng Nháp
              </h3>
              <p className="text-[11px] text-gray-500">
                Các đơn gõ dở được lưu tạm thời trên thiết bị này
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Danh sách đơn nháp */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 flex flex-col min-h-0">
          {drafts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-gray-400 space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-1">
                <ShoppingBag size={32} />
              </div>
              <p className="text-sm font-bold text-gray-700">
                Chưa có đơn nháp nào
              </p>
              <span className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Khi đang tạo đơn hàng, nhấn nút "Lưu Nháp" để lưu tiến trình tại đây.
              </span>
            </div>
          ) : (
            paginatedDrafts.map((draft) => (
              <div
                key={draft.id}
                className="p-3.5 rounded-xl border border-gray-200 hover:border-orange-300 bg-white hover:bg-orange-50/20 transition-all space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-[#F85606]" />
                      <strong className="text-xs text-gray-900">
                        {draft.agencyName || 'Chưa chọn đại lý'}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span className="font-mono text-gray-600">{draft.id}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} /> {new Date(draft.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(draft.updatedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {onDeleteDraft && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftPendingDelete(draft);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Xóa đơn nháp này"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-500 text-[11px]">
                    {draft.totalItemsCount} mặt hàng{draft.totalQuantity > 0 ? ` (${draft.totalQuantity} kiện)` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <strong className="font-mono font-bold text-[#F85606]">
                      {formatCurrencyVND(draft.totalPayable)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDraft(draft);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#F85606] font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <span>Mở lại gõ</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Thanh phân trang chân modal */}
        {drafts.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between shrink-0 text-xs text-gray-500 select-none">
            <div>
              Hiển thị <strong className="text-gray-900 font-semibold">{from}</strong>–
              <strong className="text-gray-900 font-semibold">{to}</strong> /{' '}
              <strong className="text-gray-900 font-semibold">{drafts.length}</strong> đơn nháp
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft size={14} />
                </button>

                {buildPageItems(currentDisplay, totalPages).map((item, idx) =>
                  item === '…' ? (
                    <span key={`dots-${idx}`} className="px-1 text-gray-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(Number(item) - 1)}
                      className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                        currentDisplay === item
                          ? 'bg-[#F85606] text-white shadow-2xs'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POPUP XÁC NHẬN XÓA ĐƠN NHÁP Ở CHÍNH GIỮA MÀN HÌNH */}
      {draftPendingDelete && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeleting) setDraftPendingDelete(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
              <Trash2 size={26} />
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1.5">
              Xác nhận xóa đơn nháp?
            </h3>

            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa đơn nháp{' '}
              <strong className="text-gray-900 font-semibold font-mono">
                {draftPendingDelete.orderNumber || draftPendingDelete.id}
              </strong>
              {draftPendingDelete.agencyName ? ` của "${draftPendingDelete.agencyName}"` : ''}?
              <br />
              <span className="text-rose-500 text-[11px] font-medium block mt-1.5">
                Đơn hàng nháp sẽ được hủy bỏ và không thể khôi phục.
              </span>
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDraftPendingDelete(null)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteDraft || !draftPendingDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteDraft(draftPendingDelete.id);
                    setDraftPendingDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer shadow-xs shadow-rose-200"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Xóa đơn nháp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
