import React from 'react';
import type { OrderDraft } from '../../types/order';
import { formatCurrencyVND } from '../../services/orderService';
import { FileText, X, Trash2, ArrowRight, Clock, Building2, ShoppingBag } from '../common/Icons';

interface OrderDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: OrderDraft[];
  onSelectDraft: (draft: OrderDraft) => void;
  onDeleteDraft: (draftId: string) => void;
}

export const OrderDraftsModal: React.FC<OrderDraftsModalProps> = ({
  isOpen,
  onClose,
  drafts,
  onSelectDraft,
  onDeleteDraft
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
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
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {drafts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <ShoppingBag size={36} className="mx-auto text-gray-300" />
              <p className="text-xs font-semibold text-gray-600">
                Chưa có đơn nháp nào
              </p>
              <span className="text-[11px]">
                Khi đang lên đơn, nhấn nút "Lưu Nháp" để lưu tiến trình tại đây
              </span>
            </div>
          ) : (
            drafts.map((draft) => (
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

                  <button
                    type="button"
                    onClick={() => onDeleteDraft(draft.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa đơn nháp này"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-500 text-[11px]">
                    {draft.totalItemsCount} mặt hàng ({draft.totalQuantity} kiện)
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
      </div>
    </div>
  );
};
