import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Agency, CustomerAssignmentHistory } from '../../types/agency';
import { fetchAssignmentHistory } from '../../services/agencyApi';
import {
  History,
  X,
  RefreshCw,
  Building2,
  ArrowRight,
  User,
  Clock,
  MapPin,
  Info
} from '../common/Icons';

interface AssignmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
}

export const AssignmentHistoryModal: React.FC<AssignmentHistoryModalProps> = ({
  isOpen,
  onClose,
  agency
}) => {
  const [histories, setHistories] = useState<CustomerAssignmentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && agency) {
      setLoading(true);
      fetchAssignmentHistory(agency.id)
        .then((data) => setHistories(data))
        .catch(() => setHistories([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, agency]);

  if (!isOpen || !agency) return null;

  const getBadge = (type: string) => {
    switch (type) {
      case 'CREATE':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Khởi tạo ban đầu
          </span>
        );
      case 'ASSIGN':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-[#F85606] border border-orange-200">
            Điều chuyển phụ trách
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Bàn giao hàng loạt
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
            {type}
          </span>
        );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center shadow-xs">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Lịch Sử Phân Công Phụ Trách</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông tin đại lý */}
        <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#F85606]" />
            <strong className="text-sm text-gray-900 font-semibold">{agency.name}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <MapPin size={13} className="text-blue-500" />
            <span>{agency.regionName}</span>
          </div>
        </div>

        {/* Nội dung danh sách Timeline */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
              <RefreshCw size={24} className="animate-spin text-[#F85606]" />
              <span>Đang tải lịch sử phân công...</span>
            </div>
          ) : histories.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
              <Info size={32} className="text-gray-300" />
              <span>Chưa có dữ liệu lịch sử phân công cho đại lý này</span>
            </div>
          ) : (
            <div className="relative border-l-2 border-orange-200 ml-4 pl-6 space-y-6">
              {histories.map((h, idx) => (
                <div key={h.id || idx} className="relative group">
                  {/* Chấm tròn mốc thời gian */}
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#F85606] shadow-xs flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F85606]" />
                  </div>

                  <div className="p-4 bg-gray-50/90 hover:bg-orange-50/30 transition-colors border border-gray-200/90 rounded-xl space-y-2.5">
                    {/* Hàng 1: Loại thay đổi & Thời gian */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getBadge(h.changeType)}
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock size={12} />
                          {h.changedAt}
                        </span>
                      </div>
                      {h.changedBy && (
                        <span className="text-[11px] text-gray-500">
                          Thực hiện bởi: <strong className="text-gray-700">{h.changedBy.fullName || h.changedBy.username}</strong>
                        </span>
                      )}
                    </div>

                    {/* Hàng 2: Người cũ -> Người mới */}
                    <div className="flex items-center gap-2 text-xs pt-1">
                      {h.fromSalesRep ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700">
                          <User size={13} className="text-gray-400" />
                          <span className="line-through text-gray-400">{h.fromSalesRep.fullName}</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 italic text-[11px]">
                          (Chưa phân công)
                        </div>
                      )}

                      <ArrowRight size={14} className="text-[#F85606] shrink-0" />

                      {h.toSalesRep ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                          <User size={13} className="text-emerald-600" />
                          <span>{h.toSalesRep.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Trống</span>
                      )}
                    </div>

                    {/* Hàng 3: Lý do */}
                    {h.reason && (
                      <div className="text-[11px] text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200/70 italic">
                        "{h.reason}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
          <span>Hệ thống chỉ lưu vết, không cho phép sửa đổi hoặc xóa nhật ký phân công.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
