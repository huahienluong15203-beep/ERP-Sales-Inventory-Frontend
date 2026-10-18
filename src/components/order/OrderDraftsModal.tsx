import React, { useState, useEffect, useMemo } from 'react';
import type { OrderDraft } from '../../types/order';
import { formatCurrencyVND } from '../../services/orderService';
import { FileText, X, Trash2, ArrowRight, Clock, Building2, ShoppingBag, RefreshCw, ChevronLeft, ChevronRight } from '../common/Icons';
import { Search } from 'lucide-react';
import { buildPageItems } from '../common/Pagination';

const PAGE_SIZE = 20;

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
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Lọc theo từ khóa tìm kiếm nếu có
  const filteredDrafts = useMemo(() => {
    if (!searchKeyword.trim()) return drafts;
    const kw = searchKeyword.toLowerCase().trim();
    return drafts.filter(
      (d) =>
        (d.agencyName && d.agencyName.toLowerCase().includes(kw)) ||
        (d.orderNumber && d.orderNumber.toLowerCase().includes(kw)) ||
        (d.id && d.id.toLowerCase().includes(kw)) ||
        (d.agencyCode && d.agencyCode.toLowerCase().includes(kw))
    );
  }, [drafts, searchKeyword]);

  const totalPages = Math.ceil(filteredDrafts.length / PAGE_SIZE) || 1;
  const currentDisplay = Math.min(currentPage, totalPages - 1) + 1;
  const from = filteredDrafts.length === 0 ? 0 : (currentDisplay - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentDisplay * PAGE_SIZE, filteredDrafts.length);

  // Đảm bảo không bị kẹt ở trang rỗng khi xoá bớt đơn hoặc tìm kiếm
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [filteredDrafts.length, totalPages, currentPage]);

  // Reset về trang đầu khi mở modal
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
      setSearchKeyword('');
    }
  }, [isOpen]);

  const paginatedDrafts = useMemo(() => {
    const start = (currentDisplay - 1) * PAGE_SIZE;
    return filteredDrafts.slice(start, start + PAGE_SIZE);
  }, [filteredDrafts, currentDisplay]);

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-5xl xl:max-w-6xl h-[720px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#F85606] flex items-center justify-center font-bold shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                  Danh Sách Đơn Hàng Nháp
                </h3>
                {drafts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#F85606]">
                    {drafts.length} đơn
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Các đơn gõ dở được lưu tạm thời trên máy hoặc máy chủ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {drafts.length > 4 && (
              <div className="relative hidden sm:block w-60">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setCurrentPage(0);
                  }}
                  placeholder="Tìm đại lý, mã đơn..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#F85606] transition-colors"
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKeyword('');
                      setCurrentPage(0);
                    }}
                    className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Danh sách đơn nháp */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 bg-slate-50/40">
          {filteredDrafts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-gray-400 space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-300 mb-1">
                <ShoppingBag size={32} />
              </div>
              <p className="text-sm font-bold text-gray-700">
                {searchKeyword ? 'Không tìm thấy đơn nháp phù hợp' : 'Chưa có đơn nháp nào'}
              </p>
              <span className="text-xs text-gray-400 max-w-xs leading-relaxed">
                {searchKeyword
                  ? 'Thử tìm với từ khóa khác hoặc xóa ô tìm kiếm'
                  : 'Khi đang tạo đơn hàng, nhấn nút "Lưu Nháp" để lưu tiến trình tại đây.'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {paginatedDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-gray-200/90 hover:border-orange-300 bg-white hover:bg-orange-50/15 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 size={14} className="text-[#F85606] shrink-0" />
                        <strong className="text-xs sm:text-sm text-gray-900 truncate block" title={draft.agencyName}>
                          {draft.agencyName || 'Chưa chọn đại lý'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 flex-wrap">
                        <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          {draft.orderNumber || draft.id}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock size={11} />{' '}
                          {new Date(draft.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                          - {new Date(draft.updatedAt).toLocaleDateString('vi-VN')}
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
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Xóa đơn nháp này"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                      <ShoppingBag size={13} className="text-gray-400" />
                      <span>
                        {draft.totalItemsCount} mặt hàng{draft.totalQuantity > 0 ? ` (${draft.totalQuantity} kiện)` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <strong className="font-mono font-bold text-sm text-[#F85606]">
                        {formatCurrencyVND(draft.totalPayable)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDraft(draft);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-[#F85606] text-[#F85606] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group-hover:bg-[#F85606] group-hover:text-white"
                      >
                        <span>Mở lại gõ</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thanh phân trang chân modal: 20 đơn 1 trang */}
        {filteredDrafts.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs text-gray-500 select-none">
            <div>
              Hiển thị <strong className="text-gray-900 font-semibold">{from}</strong>–
              <strong className="text-gray-900 font-semibold">{to}</strong> /{' '}
              <strong className="text-gray-900 font-semibold">{filteredDrafts.length}</strong> đơn nháp
              {filteredDrafts.length !== drafts.length && (
                <span className="text-gray-400 ml-1">(lọc từ {drafts.length} đơn)</span>
              )}
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
