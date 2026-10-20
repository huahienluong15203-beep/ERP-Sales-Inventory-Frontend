import React, { useState, useEffect, useMemo } from 'react';
import type { GoodsReceipt } from '../../types/inventory';
import { formatQuantity } from '../../services/orderService';
import {
  FileText,
  X,
  Edit,
  Trash2,
  Clock,
  Building2,
  Package,
  Search,
  Warehouse,
  ChevronLeft,
  ChevronRight
} from '../../components/common/Icons';
import { useConfirmDialog } from '../common/useConfirmDialog';

const PAGE_SIZE = 10;

interface GoodsReceiptDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: GoodsReceipt[];
  onEdit: (receiptId: number | string) => void;
  onDeleteDraft?: (receiptId: number | string) => Promise<void>;
  canEdit?: boolean;
}

export const GoodsReceiptDraftsModal: React.FC<GoodsReceiptDraftsModalProps> = ({
  isOpen,
  onClose,
  drafts,
  onEdit,
  onDeleteDraft,
  canEdit = true
}) => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  // Lọc theo từ khóa tìm kiếm (mã phiếu, nhà cung cấp, số chứng từ, kho)
  const filteredDrafts = useMemo(() => {
    if (!searchKeyword.trim()) return drafts;
    const kw = searchKeyword.toLowerCase().trim();
    return drafts.filter(
      (d) =>
        d.code.toLowerCase().includes(kw) ||
        d.supplierName.toLowerCase().includes(kw) ||
        (d.supplierCode && d.supplierCode.toLowerCase().includes(kw)) ||
        d.documentNumber.toLowerCase().includes(kw) ||
        (d.warehouseName && d.warehouseName.toLowerCase().includes(kw))
    );
  }, [drafts, searchKeyword]);

  const totalPages = Math.ceil(filteredDrafts.length / PAGE_SIZE) || 1;
  const currentDisplay = Math.min(currentPage, totalPages - 1) + 1;
  const from = filteredDrafts.length === 0 ? 0 : (currentDisplay - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentDisplay * PAGE_SIZE, filteredDrafts.length);

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [filteredDrafts.length, totalPages, currentPage]);

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

  const handleDelete = async (receiptId: number | string, code: string) => {
    if (!onDeleteDraft) return;
    const ok = await confirm({
      title: 'Xoá phiếu nhập kho nháp',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn phiếu nhập kho nháp ${code} không?`,
      variant: 'danger',
      confirmLabel: 'Xoá phiếu nháp'
    });
    if (!ok) {
      return;
    }
    setDeletingId(receiptId);
    try {
      await onDeleteDraft(receiptId);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-gray-900/20 backdrop-blur-sm animate-in fade-in">
      {confirmDialog}
      <div
        className="w-full max-w-5xl xl:max-w-6xl h-[720px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-orange-50/70 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center font-bold shrink-0 shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                  Danh Sách Phiếu Nhập Kho Nháp
                </h3>
                {drafts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F85606] text-white">
                    {drafts.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Các phiếu nhập hàng tạm lưu đang chờ kiểm đếm hoặc xác nhận cộng tồn kho
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="p-3 sm:px-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-lg">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Tìm theo mã phiếu, nhà cung cấp, số chứng từ, kho..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#F85606] shadow-2xs"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium hidden sm:inline">
            Hiển thị {from}–{to} / {filteredDrafts.length} phiếu nháp
          </span>
        </div>

        {/* Danh sách phiếu nháp */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gray-50/30">
          {filteredDrafts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mb-1">
                <Package size={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-800">
                {searchKeyword ? 'Không tìm thấy phiếu nháp nào phù hợp' : 'Hiện không có phiếu nhập kho nháp nào'}
              </h4>
              <p className="text-xs text-gray-400 max-w-sm">
                {searchKeyword
                  ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc bấm xóa để xem toàn bộ danh sách.'
                  : 'Tất cả các phiếu nhập kho đều đã được xác nhận và ghi nhận tăng tồn kho thành công.'}
              </p>
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="mt-2 px-3 py-1.5 bg-orange-50 text-[#F85606] hover:bg-orange-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Xóa từ khóa tìm kiếm
                </button>
              )}
            </div>
          ) : (
            paginatedDrafts.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-gray-200/80 hover:border-orange-200 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#F85606] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      {r.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                      <Clock size={11} />
                      <span>Phiếu nháp (Chưa cộng tồn)</span>
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Chứng từ: <strong className="text-gray-700">{r.documentNumber}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-gray-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {r.supplierName}
                    </span>
                    {r.supplierCode && (
                      <span className="text-[10px] text-gray-400 font-mono">({r.supplierCode})</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Warehouse size={12} className="text-gray-400" />
                      <span>Kho nhập: <strong>{r.warehouseName}</strong></span>
                    </span>
                    <span>
                      Ngày nhập: <strong className="font-mono text-gray-700">{new Date(r.receiptDate).toLocaleDateString('vi-VN')}</strong>
                    </span>
                    <span>
                      Số SKU: <strong className="text-gray-800">{r.totalLines}</strong>
                    </span>
                    <span>
                      Tổng cơ sở: <strong className="text-emerald-700 font-black">{formatQuantity(r.totalBaseQuantity)}</strong>
                    </span>
                  </div>

                  {r.note && (
                    <p className="text-[11px] text-gray-400 italic line-clamp-1">
                      Ghi chú: {r.note}
                    </p>
                  )}
                </div>

                {/* Nút hành động: Chỉ có Chỉnh sửa và Xóa */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(r.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-[#F85606] hover:bg-orange-50/60 hover:border-orange-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
                    title="Chỉnh sửa phiếu nhập kho nháp"
                  >
                    <Edit size={13} />
                    <span>Chỉnh sửa</span>
                  </button>

                  {canEdit && onDeleteDraft && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id, r.code)}
                      disabled={deletingId === r.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600 text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Xóa phiếu nhập kho nháp"
                    >
                      <Trash2 size={13} className={deletingId === r.id ? 'animate-spin' : ''} />
                      <span>{deletingId === r.id ? 'Đang xóa...' : 'Xóa'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Phân trang */}
        <div className="p-3 sm:px-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0 text-xs text-gray-500">
          <div>
            Tổng số: <strong className="text-[#F85606] font-bold">{filteredDrafts.length}</strong> phiếu nháp
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs font-medium">
                {currentDisplay} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-200 transition text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
