import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Eye,
  DollarSign
} from 'lucide-react';
import { formatCurrencyVND } from '../../services/orderService';
import { fetchDebtAdjustments } from '../../services/debtAdjustmentApi';
import { fetchAgencies } from '../../services/agencyApi';
import type { DebtAdjustment } from '../../types/debtAdjustment';
import type { Agency } from '../../types/agency';
import { SearchSelect } from '../../components/common/SearchSelect';
import { DebtAdjustmentModal } from '../../components/payment/DebtAdjustmentModal';

export const DebtAdjustmentPage: React.FC = () => {
  const [adjustments, setAdjustments] = useState<DebtAdjustment[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Modal duyệt
  const [selectedAdjustment, setSelectedAdjustment] = useState<DebtAdjustment | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    fetchAgencies({ size: 100 })
      .then((res) => setAgencies(res.content || []))
      .catch((err) => console.warn('Lỗi tải đại lý:', err));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDebtAdjustments({
        status: statusFilter,
        customerId: selectedCustomerId,
        keyword
      });
      setAdjustments(data);
    } catch (err) {
      console.error('Lỗi tải danh sách chứng từ điều chỉnh:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedCustomerId, keyword]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê nhanh
  const pendingCount = adjustments.filter((i) => i.status === 'PENDING_APPROVAL').length;
  const approvedCount = adjustments.filter((i) => i.status === 'APPROVED').length;
  const totalApprovedAmount = adjustments
    .filter((i) => i.status === 'APPROVED')
    .reduce((sum, i) => sum + i.totalAdjustmentAmount, 0);

  const openReviewModal = (adj: DebtAdjustment) => {
    setSelectedAdjustment(adj);
    setShowModal(true);
  };

  return (
    <div className="space-y-4 antialiased p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      {/* 1. Header Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <FileCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Chứng từ Giảm trừ Công nợ khi Trả hàng
            </h1>
            <p className="text-xs text-gray-500">
              Xử lý và duyệt giảm trừ công nợ đại lý từ phiếu trả hàng nhập lại kho theo đúng giá hoá đơn gốc
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs self-end sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Thẻ KPI Thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} className="text-amber-600" />
            <span>Chờ kế toán duyệt</span>
          </span>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {pendingCount} <span className="text-xs font-normal text-amber-800">chứng từ</span>
          </div>
          <div className="text-[11px] text-amber-800">Cần kiểm tra đối chiếu để cấn trừ nợ</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Đã duyệt giảm trừ</span>
          </span>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {approvedCount} <span className="text-xs font-normal text-emerald-800">chứng từ</span>
          </div>
          <div className="text-[11px] text-emerald-800">Đã cập nhật vào hạn mức của đại lý</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={13} className="text-blue-600" />
            <span>Tổng tiền đã cấn trừ nợ</span>
          </span>
          <div className="text-2xl font-black text-blue-700 font-mono">
            {formatCurrencyVND(totalApprovedAmount)}
          </div>
          <div className="text-[11px] text-gray-500">Giảm trừ theo giá gốc bán hàng</div>
        </div>
      </div>

      {/* 3. Bộ lọc tìm kiếm có SearchSelect */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã chứng từ, mã trả hàng, hoá đơn gốc..."
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition min-h-[38px]"
            />
          </div>

          {/* SearchSelect Đại lý */}
          <div>
            <SearchSelect
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              searchPlaceholder="Gõ để tìm đại lý..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Tất cả đại lý / Khách hàng</option>
              {agencies.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  [{ag.code}] {ag.name}
                </option>
              ))}
            </SearchSelect>
          </div>

          {/* Lọc trạng thái (Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
              { key: 'APPROVED', label: 'Đã duyệt' }
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bảng danh sách chứng từ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Mã chứng từ</th>
                <th className="py-3 px-4">Đại lý / Khách hàng</th>
                <th className="py-3 px-4 whitespace-nowrap">Phiếu trả hàng gốc</th>
                <th className="py-3 px-4 whitespace-nowrap">Hoá đơn bán hàng gốc</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Số tiền giảm trừ</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-blue-600" />
                      <span>Đang tải danh sách chứng từ điều chỉnh...</span>
                    </div>
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    Không có chứng từ điều chỉnh công nợ nào.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-blue-50/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {adj.adjustmentCode}
                      <span className="text-[10px] text-gray-400 block font-normal">{adj.createdAt}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{adj.customerName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{adj.customerCode}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-700 whitespace-nowrap">
                      {adj.returnOrderCode}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {adj.originalInvoiceCode}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                      -{formatCurrencyVND(adj.totalAdjustmentAmount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          adj.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : adj.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {adj.status === 'APPROVED' ? 'Đã duyệt' : adj.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openReviewModal(adj)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          adj.status === 'PENDING_APPROVAL'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <Eye size={13} />
                        <span>{adj.status === 'PENDING_APPROVAL' ? 'Duyệt chứng từ' : 'Xem chi tiết'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal duyệt chứng từ điều chỉnh */}
      <DebtAdjustmentModal
        isOpen={showModal}
        adjustment={selectedAdjustment}
        onClose={() => setShowModal(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};

export default DebtAdjustmentPage;
