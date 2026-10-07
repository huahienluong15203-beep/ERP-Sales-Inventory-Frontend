import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Agency, SalesRepOption, RegionOption } from '../../types/agency';
import {
  SALES_REP_OPTIONS,
  fetchAgencyFormOptions,
  fetchAgencies,
  transferAgencyTerritory
} from '../../services/agencyApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowRight,
  Building2
} from '../common/Icons';

interface TransferTerritoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Không còn dùng: danh sách đại lý bị ảnh hưởng lấy thẳng từ Backend (toàn bộ, không chỉ trang đang xem) */
  agencies?: Agency[];
  onSuccess: () => void;
}

export const TransferTerritoryModal: React.FC<TransferTerritoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>(SALES_REP_OPTIONS);
  const [fromRepId, setFromRepId] = useState(SALES_REP_OPTIONS[0]?.id || '');
  const [toRepId, setToRepId] = useState(SALES_REP_OPTIONS[1]?.id || '');
  const [selectedRegionId, setSelectedRegionId] = useState<string>(''); // Rỗng = Tất cả khu vực
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Khu vực thật trong DB (id số) thay cho danh sách khu vực giả trước đây
  const [regions, setRegions] = useState<RegionOption[]>([]);
  // Đại lý sẽ bị chuyển giao: hỏi Backend theo người bàn giao + khu vực (toàn bộ DB)
  const [affectedAgencies, setAffectedAgencies] = useState<Agency[]>([]);
  const [affectedTotal, setAffectedTotal] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAgencyFormOptions()
        .then((options) => {
          setRegions(options.regions);
          if (options.salesReps.length > 0) {
            setSalesReps(options.salesReps);
            setFromRepId(options.salesReps[0]?.id || '');
            setToRepId(options.salesReps[1]?.id || options.salesReps[0]?.id || '');
          }
        })
        .catch(() => setError('Không tải được danh sách khu vực và nhân viên kinh doanh.'));
      setSelectedRegionId('');
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !/^\d+$/.test(fromRepId)) {
      setAffectedAgencies([]);
      setAffectedTotal(0);
      return;
    }
    let ignore = false;
    setLoadingPreview(true);
    fetchAgencies({ salesRepId: fromRepId, regionId: selectedRegionId || undefined, page: 0, size: 100 })
      .then((res) => {
        if (ignore) return;
        setAffectedAgencies(res.content);
        setAffectedTotal(res.totalElements);
      })
      .catch(() => {
        if (ignore) return;
        setAffectedAgencies([]);
        setAffectedTotal(0);
      })
      .finally(() => {
        if (!ignore) setLoadingPreview(false);
      });
    return () => {
      ignore = true;
    };
  }, [isOpen, fromRepId, selectedRegionId]);

  if (!isOpen) return null;

  const fromRep = salesReps.find((r) => r.id === fromRepId) || SALES_REP_OPTIONS.find((r) => r.id === fromRepId);
  const isSameRep = fromRepId === toRepId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSameRep) {
      setError('Nhân viên nhận bàn giao phải khác nhân viên bàn giao!');
      return;
    }

    if (!reason.trim()) {
      setError('Bắt buộc phải nhập lý do chuyển giao địa bàn!');
      return;
    }

    if (affectedTotal === 0) {
      setError('Không có đại lý nào thỏa mãn điều kiện để chuyển giao.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await transferAgencyTerritory(
        {
          fromSalesRepId: fromRepId,
          toSalesRepId: toRepId,
          regionId: selectedRegionId || undefined,
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
      setError('Lỗi kết nối đến máy chủ khi thực hiện chuyển giao hàng loạt.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F85606] flex items-center justify-center shadow-xs">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Chuyển Giao Địa Bàn Hàng Loạt</h2>
              <p className="text-xs text-gray-500">
                Bàn giao toàn bộ hoặc theo khu vực cho nhân viên mới (nhân viên nghỉ việc / luân chuyển)
              </p>
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

          {/* Chọn người chuyển giao & Người nhận */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Người bàn giao (nghỉ việc / chuyển công tác) */}
            <div className="p-3.5 bg-red-50/60 border border-red-100 rounded-xl">
              <label className="block text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1.5">
                Nhân Viên Bàn Giao <span className="text-red-500">*</span>
              </label>
              <select
                value={fromRepId}
                onChange={(e) => setFromRepId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-red-200 focus:border-red-400 outline-none font-medium"
              >
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName} {rep.phone ? `(${rep.phone})` : ''}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-red-500 mt-1 block">Nhân viên sắp nghỉ hoặc luân chuyển</span>
            </div>

            {/* Người tiếp nhận */}
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <label className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                Nhân Viên Tiếp Nhận <span className="text-red-500">*</span>
              </label>
              <select
                value={toRepId}
                onChange={(e) => setToRepId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-emerald-200 focus:border-emerald-400 outline-none font-medium"
              >
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id} disabled={rep.id === fromRepId}>
                    {rep.fullName} {rep.phone ? `(${rep.phone})` : ''} {rep.id === fromRepId ? '(Trùng)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-emerald-600 mt-1 block">Người chịu trách nhiệm chăm sóc mới</span>
            </div>
          </div>

          {/* Chọn phạm vi khu vực */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Phạm Vi Khu Vực Áp Dụng
            </label>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none font-medium"
            >
              <option value="">-- Tất cả các khu vực (Chuyển giao toàn bộ đại lý) --</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hộp xem trước số lượng đại lý sẽ chuyển */}
          <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                <Building2 size={15} className="text-[#F85606]" />
                <span>Số đại lý sẽ được chuyển giao:</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#F85606] text-white font-bold text-xs">
                {loadingPreview ? '…' : `${affectedTotal} đại lý`}
              </span>
            </div>

            {affectedAgencies.length > 0 ? (
              <div className="max-h-28 overflow-y-auto space-y-1 pt-1 border-t border-orange-200/70 text-[11px] text-gray-600">
                {affectedAgencies.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-0.5">
                    <span className="font-medium text-gray-800 line-clamp-1">{a.name} ({a.code})</span>
                    <span className="text-gray-500 shrink-0 ml-2">{a.regionName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 italic pt-1">
                Không tìm thấy đại lý nào của <strong>{fromRep?.fullName}</strong>{' '}
                {selectedRegionId ? 'trong khu vực này' : 'đang quản lý'}.
              </p>
            )}
          </div>

          {/* Lý do chuyển giao hàng loạt */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Lý Do Chuyển Giao <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Bàn giao lại đại lý do nhân viên nghỉ việc theo quyết định số..."
              className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Mỗi đại lý được chuyển sẽ được tự động ghi 1 dòng lịch sử loại TRANSFER với lý do này.
            </span>
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
              disabled={submitting || isSameRep || loadingPreview || affectedTotal === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#F85606] hover:bg-[#d64700] rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang chuyển giao...</span>
                </>
              ) : (
                <>
                  <ArrowRight size={14} />
                  <span>Xác Nhận Chuyển Giao ({affectedTotal})</span>
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
