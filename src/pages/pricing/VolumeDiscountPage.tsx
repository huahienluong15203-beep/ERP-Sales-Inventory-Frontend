import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/Icons';
import { VolumeDiscountStats } from '../../components/pricing/VolumeDiscountStats';
import { BestDealSimulatorWidget } from '../../components/pricing/BestDealSimulatorWidget';
import { VolumeDiscountFormModal } from '../../components/pricing/VolumeDiscountFormModal';
import type {
  VolumeDiscountPolicy,
  VolumeDiscountPolicyRequest,
  DiscountScopeType,
  DiscountPolicyStatus
} from '../../types/discount';
import type { CustomerGroupType } from '../../types/pricing';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import {
  getVolumeDiscountPolicies,
  createVolumeDiscountPolicy,
  updateVolumeDiscountPolicy,
  deleteVolumeDiscountPolicy,
  togglePolicyStatus,
  exportPoliciesToCsv,
  BEST_DEAL_RULE_STATEMENT
} from '../../services/volumeDiscountApi';

export const VolumeDiscountPage: React.FC = () => {
  // Trạng thái dữ liệu
  const [policies, setPolicies] = useState<VolumeDiscountPolicy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Bộ lọc
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | DiscountScopeType>('ALL');
  const [customerFilter, setCustomerFilter] = useState<'ALL' | CustomerGroupType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DiscountPolicyStatus>('ALL');

  // Điều khiển UI Modals & Simulator
  const [showSimulator, setShowSimulator] = useState<boolean>(true);
  const [simulatorInitialSku, setSimulatorInitialSku] = useState<string>('BIA-HN-330');
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPolicy, setSelectedPolicy] = useState<VolumeDiscountPolicy | null>(null);

  // Modal xem chi tiết
  const [detailPolicy, setDetailPolicy] = useState<VolumeDiscountPolicy | null>(null);

  // Modal xác nhận xóa
  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState<VolumeDiscountPolicy | null>(null);

  // Tải danh sách chính sách
  const loadPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await getVolumeDiscountPolicies({
        keyword: searchKeyword,
        scopeType: scopeFilter,
        customerGroup: customerFilter,
        status: statusFilter
      });
      setPolicies(res.data);
    } catch (err) {
      console.error('Lỗi tải danh sách chính sách:', err);
      showToast('Không thể tải danh sách chính sách chiết khấu!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [searchKeyword, scopeFilter, customerFilter, statusFilter]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setSelectedPolicy(null);
    setModalMode('create');
    setIsFormModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (policy: VolumeDiscountPolicy) => {
    setSelectedPolicy(policy);
    setModalMode('edit');
    setIsFormModalOpen(true);
  };

  // Nhân bản chính sách (Clone)
  const handleClonePolicy = async (policy: VolumeDiscountPolicy) => {
    try {
      const clonedReq: VolumeDiscountPolicyRequest = {
        code: `${policy.code}-COPY`,
        name: `${policy.name} (Bản sao)`,
        scopeType: policy.scopeType,
        targetId: policy.targetId,
        targetName: policy.targetName,
        customerGroup: policy.customerGroup,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: policy.endDate,
        status: 'ACTIVE',
        priority: policy.priority + 1,
        description: policy.description ? `Bản sao từ ${policy.code}: ${policy.description}` : '',
        tiers: policy.tiers.map((t, idx) => ({
          tierOrder: idx + 1,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          discountType: t.discountType,
          discountValue: t.discountValue,
          note: t.note
        }))
      };
      await createVolumeDiscountPolicy(clonedReq);
      showToast(`Đã nhân bản chính sách "${policy.code}" thành công!`);
      loadPolicies();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('Nhân bản thất bại!', 'error');
      }
    }
  };

  // Lưu form (Tạo hoặc Sửa)
  const handleFormSubmit = async (data: VolumeDiscountPolicyRequest) => {
    if (modalMode === 'create') {
      await createVolumeDiscountPolicy(data);
      showToast('Khai báo chính sách chiết khấu sản lượng thành công!');
    } else if (selectedPolicy) {
      await updateVolumeDiscountPolicy(selectedPolicy.id, data);
      showToast('Cập nhật chính sách chiết khấu thành công!');
    }
    loadPolicies();
  };

  // Bật/tắt trạng thái
  const handleToggleStatus = async (policy: VolumeDiscountPolicy) => {
    try {
      const updated = await togglePolicyStatus(policy.id);
      showToast(
        `Đã chuyển trạng thái chính sách "${policy.code}" sang ${
          updated.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Tạm dừng'
        }`
      );
      loadPolicies();
    } catch {
      showToast('Không thể đổi trạng thái chính sách!', 'error');
    }
  };

  // Xóa chính sách
  const handleConfirmDelete = async () => {
    if (!deleteTargetPolicy) return;
    try {
      await deleteVolumeDiscountPolicy(deleteTargetPolicy.id);
      showToast(`Đã xóa chính sách "${deleteTargetPolicy.code}"!`);
      setDeleteTargetPolicy(null);
      loadPolicies();
    } catch {
      showToast('Xóa chính sách thất bại!', 'error');
    }
  };

  // Chạy mô phỏng cho sản phẩm của chính sách này
  const handleTestInSimulator = (policy: VolumeDiscountPolicy) => {
    if (policy.scopeType === 'SKU') {
      setSimulatorInitialSku(policy.targetId);
    }
    setShowSimulator(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Xuất file CSV/Excel
  const handleExportCsv = () => {
    if (policies.length === 0) {
      showToast('Không có dữ liệu chính sách để xuất!', 'error');
      return;
    }
    exportPoliciesToCsv(policies);
    showToast('Đã xuất danh sách chính sách chiết khấu ra file CSV!');
  };

  // Đặt lại bộ lọc
  const handleResetFilters = () => {
    setSearchKeyword('');
    setScopeFilter('ALL');
    setCustomerFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed right-6 top-20 z-50 flex items-center space-x-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          {toastMsg.type === 'success' ? (
            <Icons.CheckSquare size={16} className="text-emerald-400" />
          ) : (
            <Icons.ShieldAlert size={16} className="text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & Tiêu đề trang */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Quản lý Bảng giá & Chiết khấu</span>
            <span>/</span>
            <span className="font-semibold text-[#F85606]">
              Chiết khấu theo Sản lượng
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            <span>Chính sách Chiết khấu theo Sản lượng</span>
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Khai báo bậc số lượng theo từng SKU hoặc nhóm hàng. Tự động áp dụng chính sách có lợi nhất cho khách hàng.
          </p>
        </div>

        {/* Nút hành động chính */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={`flex items-center space-x-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
              showSimulator
                ? 'border-[#F85606] bg-orange-50 text-[#F85606]'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icons.ShieldCheck size={16} className={showSimulator ? 'text-[#F85606]' : 'text-gray-500'} />
            <span>{showSimulator ? 'Ẩn công cụ Best-Deal' : 'Mô phỏng Best-Deal'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50"
          >
            <Icons.ClipboardList size={16} className="text-gray-500" />
            <span>Xuất CSV / Excel</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 rounded-xl bg-[#F85606] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#E04D05]"
          >
            <span className="text-sm font-bold">+</span>
            <span>Khai báo chính sách mới</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulator (Công cụ mô phỏng Best-Deal Rule) */}
      {showSimulator && (
        <BestDealSimulatorWidget
          initialSku={simulatorInitialSku}
          onClose={() => setShowSimulator(false)}
        />
      )}

      {/* KPI Cards Thống kê */}
      <VolumeDiscountStats policies={policies} />

      {/* Banner Quy tắc nghiệp vụ Best-Deal */}
      <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50/90 via-amber-50/50 to-white p-4 text-xs text-orange-950 shadow-2xs">
        <div className="flex items-start space-x-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F85606] text-white shadow-xs">
            <Icons.BookOpenCheck size={18} />
          </div>
          <div>
            <h4 className="font-bold text-orange-950">
              Cam kết quy tắc bán buôn minh bạch (Best-Deal Rule)
            </h4>
            <p className="mt-0.5 text-gray-600 leading-relaxed">
              {BEST_DEAL_RULE_STATEMENT}
            </p>
          </div>
        </div>
      </div>

      {/* Bộ lọc và Tìm kiếm */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Tìm kiếm từ khóa */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">
              Tìm kiếm chính sách
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập mã CK, tên chính sách, SKU hoặc nhóm hàng..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Lọc theo Phạm vi */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">
              Phạm vi áp dụng
            </label>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'ALL' | DiscountScopeType)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="ALL">Tất cả phạm vi</option>
              <option value="SKU">Theo SKU cụ thể</option>
              <option value="CATEGORY">Theo Nhóm hàng</option>
            </select>
          </div>

          {/* Lọc theo Đối tượng khách */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">
              Đối tượng khách hàng
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value as 'ALL' | CustomerGroupType)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="ALL">Tất cả đối tượng</option>
              {Object.entries(CUSTOMER_GROUPS).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.shortLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Trạng thái & Reset */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">
              Trạng thái
            </label>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | DiscountPolicyStatus)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-2xs focus:border-[#F85606] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Đang hiệu lực</option>
                <option value="INACTIVE">Tạm dừng</option>
                <option value="EXPIRED">Đã hết hạn</option>
              </select>
              {(searchKeyword || scopeFilter !== 'ALL' || customerFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  onClick={handleResetFilters}
                  title="Đặt lại bộ lọc"
                  className="rounded-xl border border-gray-300 p-2 text-gray-500 hover:bg-orange-50 hover:text-[#F85606]"
                >
                  <Icons.RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bảng danh sách chính sách chiết khấu */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Mã & Tên chính sách</th>
                <th className="px-4 py-3.5">Phạm vi áp dụng</th>
                <th className="px-4 py-3.5">Đối tượng khách</th>
                <th className="px-4 py-3.5">Bậc chiết khấu sản lượng</th>
                <th className="px-4 py-3.5">Thời hạn hiệu lực</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <Icons.RotateCcw size={16} className="animate-spin text-[#F85606]" />
                      <span>Đang tải danh sách chính sách chiết khấu...</span>
                    </div>
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <p className="font-semibold text-gray-700">
                      Không tìm thấy chính sách chiết khấu nào phù hợp!
                    </p>
                    <p className="mt-1 text-xs">Thử thay đổi bộ lọc hoặc khai báo chính sách mới.</p>
                  </td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr
                    key={policy.id}
                    className="transition-colors hover:bg-orange-50/30"
                  >
                    {/* Mã & Tên */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-[#F85606] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {policy.code}
                        </span>
                      </div>
                      <div className="mt-1 font-bold text-gray-900">
                        {policy.name}
                      </div>
                      {policy.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
                          {policy.description}
                        </p>
                      )}
                    </td>

                    {/* Phạm vi áp dụng */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <span
                          className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            policy.scopeType === 'SKU'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {policy.scopeType === 'SKU' ? 'Theo SKU' : 'Theo Nhóm hàng'}
                        </span>
                        <span className="font-semibold text-gray-800">
                          {policy.targetName}
                        </span>
                        <span className="text-[10px] text-gray-400">Mã: {policy.targetId}</span>
                      </div>
                    </td>

                    {/* Đối tượng */}
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {policy.customerGroupLabel || policy.customerGroup}
                      </span>
                    </td>

                    {/* Bậc chiết khấu sản lượng */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {policy.tiers.map((tier, idx) => (
                          <div
                            key={idx}
                            className="flex items-center rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] shadow-2xs"
                          >
                            <span className="font-bold text-gray-600">
                              ≥ {tier.minQuantity} {tier.maxQuantity ? `- ${tier.maxQuantity}` : '+'}:
                            </span>
                            <span className="ml-1 font-extrabold text-emerald-600">
                              {tier.discountType === 'PERCENT'
                                ? `${tier.discountValue}%`
                                : `${tier.discountValue.toLocaleString('vi-VN')} đ`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {policy.tiers.length} bậc chiết khấu được định cấu hình
                      </div>
                    </td>

                    {/* Thời hạn */}
                    <td className="px-4 py-4">
                      <div className="text-gray-700 font-medium">
                        Từ: {policy.startDate}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Đến: {policy.endDate || 'Vô thời hạn'}
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(policy)}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                          policy.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : policy.status === 'EXPIRED'
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                        title="Bấm để bật / tắt trạng thái"
                      >
                        <span
                          className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            policy.status === 'ACTIVE'
                              ? 'bg-emerald-500 animate-pulse'
                              : policy.status === 'EXPIRED'
                              ? 'bg-gray-400'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span>
                          {policy.status === 'ACTIVE'
                            ? 'Đang hiệu lực'
                            : policy.status === 'EXPIRED'
                            ? 'Đã hết hạn'
                            : 'Tạm dừng'}
                        </span>
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Nút test trong simulator */}
                        <button
                          onClick={() => handleTestInSimulator(policy)}
                          title="Thử nghiệm chính sách này trong bộ tính Best-Deal"
                          className="rounded-lg p-1.5 text-[#F85606] hover:bg-orange-50"
                        >
                          <Icons.ShieldCheck size={16} />
                        </button>

                        {/* Nút xem chi tiết */}
                        <button
                          onClick={() => setDetailPolicy(policy)}
                          title="Xem chi tiết chính sách"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <Icons.ClipboardList size={16} />
                        </button>

                        {/* Nút sửa */}
                        <button
                          onClick={() => handleOpenEditModal(policy)}
                          title="Chỉnh sửa chính sách"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <Icons.CheckSquare size={16} />
                        </button>

                        {/* Nút nhân bản */}
                        <button
                          onClick={() => handleClonePolicy(policy)}
                          title="Nhân bản chính sách (Clone)"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <Icons.Boxes size={16} />
                        </button>

                        {/* Nút xóa */}
                        <button
                          onClick={() => setDeleteTargetPolicy(policy)}
                          title="Xóa chính sách"
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Icons.ShieldAlert size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Thêm / Sửa */}
      <VolumeDiscountFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedPolicy}
        mode={modalMode}
      />

      {/* Modal Xem chi tiết chính sách */}
      {detailPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center space-x-2">
                <span className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#F85606] border border-orange-200 font-mono">
                  {detailPolicy.code}
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {detailPolicy.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailPolicy(null)}
                className="text-lg font-bold text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
                <div>
                  <span className="text-gray-400">Phạm vi:</span>
                  <p className="font-semibold text-gray-800">
                    {detailPolicy.scopeType === 'SKU' ? 'Theo SKU riêng lẻ' : 'Theo toàn nhóm hàng'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Đối tượng áp dụng:</span>
                  <p className="font-semibold text-gray-800">
                    {detailPolicy.targetName} ({detailPolicy.targetId})
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Nhóm khách hàng:</span>
                  <p className="font-semibold text-gray-800">
                    {detailPolicy.customerGroupLabel || detailPolicy.customerGroup}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Thời gian:</span>
                  <p className="font-semibold text-gray-800">
                    {detailPolicy.startDate} &rarr; {detailPolicy.endDate || 'Vô thời hạn'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-bold uppercase tracking-wider text-gray-500">
                  Các bậc chiết khấu sản lượng
                </h4>
                <div className="space-y-2">
                  {detailPolicy.tiers.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-[#F85606] px-2 py-0.5 text-[11px] font-bold text-white">
                          Bậc {t.tierOrder}
                        </span>
                        <span className="font-semibold text-gray-700">
                          Từ {t.minQuantity} {t.maxQuantity ? `đến ${t.maxQuantity}` : 'trở lên'}
                        </span>
                        {t.note && <span className="text-gray-400">({t.note})</span>}
                      </div>
                      <span className="text-sm font-bold text-emerald-600">
                        {t.discountType === 'PERCENT'
                          ? `Giảm ${t.discountValue}%`
                          : `Giảm ${t.discountValue.toLocaleString('vi-VN')} đ/đơn vị`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 text-orange-950">
                <strong className="font-semibold text-orange-900">Quy tắc Best-Deal: </strong>
                {BEST_DEAL_RULE_STATEMENT}
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-gray-200 pt-3">
              <button
                onClick={() => setDetailPolicy(null)}
                className="rounded-xl bg-[#F85606] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#E04D05]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa */}
      {deleteTargetPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <Icons.ShieldAlert size={28} />
              <h3 className="text-base font-bold">Xác nhận xóa chính sách chiết khấu</h3>
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Bạn có chắc chắn muốn xóa chính sách{' '}
              <strong className="text-gray-900">
                "{deleteTargetPolicy.code} - {deleteTargetPolicy.name}"
              </strong>
              ? Hành động này sẽ không thể khôi phục.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteTargetPolicy(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
