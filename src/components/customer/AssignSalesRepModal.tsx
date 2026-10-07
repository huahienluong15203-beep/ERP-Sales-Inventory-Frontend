import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Agency, SalesRepOption } from '../../types/agency';
import { SALES_REP_OPTIONS, fetchActiveSalesReps, assignAgencySalesRep } from '../../services/agencyApi';
import { useAuth } from '../../contexts/AuthContext';
import { Users, AlertTriangle, CheckCircle2, X, RefreshCw, MapPin, Building2 } from '../common/Icons';

interface AssignSalesRepModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onSuccess: () => void;
}

export const AssignSalesRepModal: React.FC<AssignSalesRepModalProps> = ({
  isOpen,
  onClose,
  agency,
  onSuccess
}) => {
  const { user } = useAuth();
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>(SALES_REP_OPTIONS);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchActiveSalesReps(true).then((reps) => {
        if (reps && reps.length > 0) {
          setSalesReps(reps);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (agency) {
      const matched = salesReps.find(
        (r) => r.id === agency.assignedRepId || r.fullName === agency.assignedRepName
      );
      setSelectedRepId(matched ? matched.id : (salesReps[0]?.id || ''));
      setReason('');
      setError(null);
    }
  }, [agency, isOpen, salesReps]);

  if (!isOpen || !agency) return null;

  const currentRep =
    salesReps.find((r) => r.id === agency.assignedRepId || r.fullName === agency.assignedRepName) ||
    SALES_REP_OPTIONS.find((r) => r.id === agency.assignedRepId);
  const isSameRep = selectedRepId === agency.assignedRepId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSameRep) {
      setError('Nhân viên này đang phụ trách đại lý rồi. Vui lòng chọn nhân viên khác!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignAgencySalesRep(
        {
          agencyId: agency.id,
          salesRepId: selectedRepId,
          reason: reason.trim()
        },
        user ? { fullName: user.fullName, username: user.username, role: user.role } : undefined
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError('Có lỗi kết nối đến máy chủ khi cập nhật nhân viên phụ trách.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center shadow-xs">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Phân Công Nhân Viên Phụ Trách</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Thông tin đại lý */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[#F85606]" />
              <strong className="text-sm text-gray-900 font-semibold">{agency.name}</strong>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-600 pt-1 border-t border-gray-200">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-blue-500" />
                <span>Khu vực: <strong>{agency.regionName}</strong></span>
              </div>
              <div>
                <span>Người phụ trách hiện tại: <strong className="text-gray-900">{currentRep?.fullName || agency.assignedRepName || 'Chưa gán'}</strong></span>
              </div>
            </div>
          </div>

          {/* Chọn nhân viên kinh doanh mới */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Chọn Nhân Viên Kinh Doanh Mới <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium"
            >
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.fullName} {rep.phone ? `- SĐT: ${rep.phone}` : ''} {rep.email ? `(${rep.email})` : ''}
                </option>
              ))}
            </select>
            {isSameRep && (
              <span className="text-[11px] text-amber-600 mt-1 block">
                Nhân viên này đang là người phụ trách hiện tại của đại lý.
              </span>
            )}
          </div>

          {/* Lý do phân công */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Lý Do Phân Công
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Điều chỉnh địa bàn phụ trách kinh doanh theo kế hoạch quý mới..."
              className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition-all"
            />
          </div>

          {/* Nút thao tác */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || isSameRep}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#F85606] hover:bg-[#d64700] rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Lưu Phân Công</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
