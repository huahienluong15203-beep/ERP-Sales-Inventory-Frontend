import React, { useState, useEffect, useCallback } from 'react';
import type {
  Agency,
  AgencyFilterParams,
  CreateAgencyPayload,
  UpdateAgencyPayload
} from '../../types/agency';
import {
  fetchAgencies,
  createAgency,
  updateAgency,
  suspendAgency,
  reactivateAgency,
  deleteAgency,
  CUSTOMER_GROUP_OPTIONS,
  REGION_OPTIONS
} from '../../services/agencyApi';
import { AgencyFormModal } from '../../components/customer/AgencyFormModal';
import { SuspendAgencyModal } from '../../components/customer/SuspendAgencyModal';
import { DeliveryPointsModal } from '../../components/customer/DeliveryPointsModal';
import { CreditLimitModal } from '../../components/customer/CreditLimitModal';
import { AssignSalesRepModal } from '../../components/customer/AssignSalesRepModal';
import { TransferTerritoryModal } from '../../components/customer/TransferTerritoryModal';
import { AssignmentHistoryModal } from '../../components/customer/AssignmentHistoryModal';
import { useAuth } from '../../contexts/AuthContext';
import { useServerSearch, matchesKeyword } from '../../hooks/useServerSearch';
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Edit,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  MapPin,
  Phone,
  BadgeDollarSign,
  Truck,
  History,
  ArrowRight
} from '../../components/common/Icons';

export const AgencyManagementPage: React.FC = () => {

  // Dữ liệu danh sách đại lý
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  // Bộ lọc
  const [keyword, setKeyword] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  // Gõ từ 2 ký tự mới gọi API (đợi ngừng gõ 0,4 giây); 1 ký tự thì lọc tại chỗ
  const resetToFirstPage = useCallback(() => setPage(0), []);
  const { serverKeyword, localKeyword, flush: flushSearch } = useServerSearch(keyword, resetToFirstPage);

  // Thông báo phản hồi
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Thêm / Sửa
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  // Modal Dừng giao dịch / Mở lại
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [targetSuspendAgency, setTargetSuspendAgency] = useState<Agency | null>(null);

  // Modal Quản lý Điểm giao hàng (S3-04 / SCRUM-15)
  const [isDeliveryPointsModalOpen, setIsDeliveryPointsModalOpen] = useState(false);
  const [selectedAgencyForPoints, setSelectedAgencyForPoints] = useState<Agency | null>(null);

  const handleOpenDeliveryPoints = (agency: Agency) => {
    setSelectedAgencyForPoints(agency);
    setIsDeliveryPointsModalOpen(true);
  };

  // Modal Thiết lập Hạn mức nợ (S3-05 / SCRUM-16)
  const [isCreditLimitModalOpen, setIsCreditLimitModalOpen] = useState(false);
  const [selectedAgencyForCredit, setSelectedAgencyForCredit] = useState<Agency | null>(null);

  const handleOpenCreditLimit = (agency: Agency) => {
    setSelectedAgencyForCredit(agency);
    setIsCreditLimitModalOpen(true);
  };

  // Phân quyền người dùng hiện tại
  const { currentRole, user } = useAuth();
  const canManageAssignments = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER';
  const canManageAgency = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER' || currentRole === 'ROLE_ACCOUNTANT';
  const isSalesRep = currentRole === 'ROLE_SALES_REP';

  // Modal Phân công nhân viên phụ trách (S3-06 / SCRUM-17)
  const [isAssignRepModalOpen, setIsAssignRepModalOpen] = useState(false);
  const [selectedAgencyForAssign, setSelectedAgencyForAssign] = useState<Agency | null>(null);

  const handleOpenAssignRep = (agency: Agency) => {
    setSelectedAgencyForAssign(agency);
    setIsAssignRepModalOpen(true);
  };

  // Modal Chuyển giao địa bàn hàng loạt (S3-06 / SCRUM-17)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Modal Xem lịch sử phân công (S3-06 / SCRUM-17)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedAgencyForHistory, setSelectedAgencyForHistory] = useState<Agency | null>(null);

  const handleOpenHistory = (agency: Agency) => {
    setSelectedAgencyForHistory(agency);
    setIsHistoryModalOpen(true);
  };

  // State menu thả xuống thao tác khác trên từng dòng
  const [openMenuAgencyId, setOpenMenuAgencyId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.agency-action-dropdown')) {
        setOpenMenuAgencyId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải dữ liệu danh sách đại lý
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: AgencyFilterParams = {
        keyword: serverKeyword || undefined,
        customerGroup: selectedGroup || undefined,
        regionId: selectedRegion || undefined,
        status: selectedStatus || undefined,
        page,
        size
      };
      const res = await fetchAgencies(params);
      setAgencies(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      setAlert({ type: 'error', message: 'Không thể tải danh sách đại lý. Vui lòng thử lại!' });
    } finally {
      setLoading(false);
    }
  }, [serverKeyword, selectedGroup, selectedRegion, selectedStatus, page, size]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Submit form tìm kiếm
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const changed = flushSearch();
    setPage(0);
    if (!changed) loadData();
  };

  // S3-06: Nhân viên kinh doanh chỉ nhìn thấy đại lý mình phụ trách
  const roleFilteredAgencies = isSalesRep
    ? agencies.filter(
        (a) =>
          a.assignedRepId === user?.id ||
          (user?.fullName && a.assignedRepName?.toLowerCase() === user.fullName.toLowerCase()) ||
          (user?.username === 'sales_rep' ? a.assignedRepId === 'REP_001' : false) ||
          (user?.username === 'sales_rep_1' && a.assignedRepId === 'REP_001') ||
          (user?.username === 'sales_rep_2' && a.assignedRepId === 'REP_002') ||
          (user?.username === 'sales_rep_3' && a.assignedRepId === 'REP_003')
      )
    : agencies;

  // Mới gõ 1 ký tự: lọc tại chỗ trên danh sách đang hiển thị, không gọi API
  const visibleAgencies = localKeyword
    ? roleFilteredAgencies.filter((a) =>
        matchesKeyword(localKeyword, a.code, a.name, a.taxCode, a.phone, a.assignedRepName)
      )
    : roleFilteredAgencies;

  // Reset bộ lọc
  const handleResetFilter = () => {
    setKeyword('');
    setSelectedGroup('');
    setSelectedRegion('');
    setSelectedStatus('');
    setPage(0);
  };

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingAgency(null);
    setIsFormModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEdit = (item: Agency) => {
    setEditingAgency(item);
    setIsFormModalOpen(true);
  };

  // Submit Lưu (Tạo mới hoặc Cập nhật)
  const handleFormSubmit = async (payload: CreateAgencyPayload | UpdateAgencyPayload) => {
    if (editingAgency) {
      const res = await updateAgency(editingAgency.id, payload as UpdateAgencyPayload);
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
        loadData();
      }
      return res;
    } else {
      const res = await createAgency(payload as CreateAgencyPayload);
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
        setPage(0);
        loadData();
      }
      return res;
    }
  };

  // Mở modal Dừng/Mở giao dịch
  const handleOpenSuspendModal = (item: Agency) => {
    setTargetSuspendAgency(item);
    setIsSuspendModalOpen(true);
  };

  // Xác nhận Dừng giao dịch
  const handleConfirmSuspend = async (agencyId: string, reason: string) => {
    const res = await suspendAgency(agencyId, reason);
    if (res.success) {
      setAlert({ type: 'success', message: res.message });
      loadData();
    }
    return res;
  };

  // Xác nhận Mở lại giao dịch
  const handleConfirmReactivate = async (agencyId: string) => {
    const res = await reactivateAgency(agencyId);
    if (res.success) {
      setAlert({ type: 'success', message: res.message });
      loadData();
    }
    return res;
  };

  // Thử xóa đại lý (Kiểm chứng quy tắc S3-03: Có giao dịch thì không được xóa)
  const handleDeleteAttempt = async (item: Agency) => {
    if (item.hasTransactions) {
      setAlert({
        type: 'error',
        message: `BẢO VỆ DỮ LIỆU: Đại lý [${item.code}] đã phát sinh ${item.transactionCount} giao dịch / đơn hàng. Hệ thống nghiêm cấm xóa vĩnh viễn để bảo toàn sổ sách kế toán, bạn chỉ có thể chọn Dừng giao dịch!`
      });
      return;
    }

    if (window.confirm(`Bạn có chắc muốn xóa vĩnh viễn đại lý mới [${item.code} - ${item.name}] chưa có giao dịch?`)) {
      const res = await deleteAgency(item.id);
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
        loadData();
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    }
  };

  // Thống kê nhanh
  const activeCount = agencies.filter((a) => a.status === 'ACTIVE').length;
  const suspendedCount = agencies.filter((a) => a.status === 'SUSPENDED').length;
  const totalDebtSum = agencies.reduce((acc, a) => acc + (a.totalDebt || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-orange-500 to-[#EE4D2D] text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Building2 size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Quản Lý Hồ Sơ Đại Lý</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Danh sách khách hàng & đại lý chuẩn hóa tập trung cho Kế toán công nợ & Quản lý bán hàng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={() => loadData()}
            disabled={loading}
            title="Làm mới danh sách"
            className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* S3-06: Chuyển giao địa bàn hàng loạt (chỉ Quản lý kinh doanh & Admin) */}
          {canManageAssignments && (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-white text-sm font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
              title="Chuyển giao địa bàn hàng loạt khi nhân viên nghỉ việc hoặc điều chuyển"
            >
              <Users size={18} />
              <span>Chuyển Giao Địa Bàn</span>
            </button>
          )}

          {canManageAgency && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-gradient-to-r from-[#FF6A00] to-[#EE4D2D] hover:opacity-95 text-white text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>Khai Báo Đại Lý Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Thông báo Alert */}
      {alert && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between gap-3 border shadow-xs animate-in fade-in ${alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}
        >
          <div className="flex items-center gap-2.5">
            {alert.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
            )}
            <span className="font-medium">{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Thẻ Thống Kê Nhanh (Stat Cards) chuẩn Lazada Orange & Crisp White */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng đại lý */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Tổng số đại lý
            </span>
            <span className="text-2xl font-black text-gray-900 mt-1 block font-mono">
              {totalElements}
            </span>
            <span className="text-[11px] text-gray-500 mt-0.5 block">Hồ sơ đã chuẩn hóa</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#F85606] flex items-center justify-center">
            <Building2 size={24} />
          </div>
        </div>

        {/* Thẻ 2: Đang hoạt động */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Đang giao dịch
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
              {activeCount}
            </span>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">Đủ điều kiện xuất đơn</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Thẻ 3: Tạm dừng giao dịch */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Dừng giao dịch
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block font-mono">
              {suspendedCount}
            </span>
            <span className="text-[11px] text-amber-600 mt-0.5 block">Chặn đơn để đối soát</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
        </div>

        {/* Thẻ 4: Tổng công nợ */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Tổng công nợ
            </span>
            <span className="text-xl font-black text-red-600 mt-1 block font-mono">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(totalDebtSum)}
            </span>
            <span className="text-[11px] text-gray-500 mt-0.5 block">Kế toán đang theo dõi</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* 3. Thanh Tìm Kiếm & Bộ Lọc */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Ô tìm kiếm */}
          <div className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo Mã, Tên đại lý, MST, SĐT, Người phụ trách..."
              className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none transition-all"
            />
          </div>

          {/* Lọc Nhóm khách hàng */}
          <div>
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
            >
              <option value="">Tất cả Nhóm Khách Hàng</option>
              {CUSTOMER_GROUP_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Khu vực */}
          <div>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
            >
              <option value="">Tất cả Khu vực</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng thái & Nút thao tác */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="SUSPENDED">Dừng giao dịch</option>
            </select>

            {(keyword || selectedGroup || selectedRegion || selectedStatus) && (
              <button
                type="button"
                onClick={handleResetFilter}
                title="Xóa bộ lọc"
                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 4. Bảng Dữ Liệu Hồ Sơ Đại Lý (Chuẩn DoR/DoD Story S3-03) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã & Tên Đại Lý</th>
                <th className="py-3.5 px-4">Nhóm Khách Hàng / Bảng Giá</th>
                <th className="py-3.5 px-4">Khu Vực & Phụ Trách</th>
                <th className="py-3.5 px-4">Giao Dịch & Công Nợ</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-[#F85606]" />
                      <span>Đang tải danh sách hồ sơ đại lý...</span>
                    </div>
                  </td>
                </tr>
              ) : visibleAgencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 size={36} className="text-gray-300" />
                      <strong className="text-gray-700 text-sm">Không tìm thấy đại lý nào phù hợp</strong>
                      <span className="text-xs">Thử điều chỉnh lại từ khóa hoặc xóa bộ lọc</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleAgencies.map((agency, index) => {
                  const isSuspended = agency.status === 'SUSPENDED';

                  return (
                    <tr
                      key={agency.id}
                      className={`hover:bg-gray-50/70 transition-colors ${isSuspended ? 'bg-amber-50/20' : ''
                        }`}
                    >
                      {/* Cột 1: Mã & Tên đại lý */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-gray-100 text-gray-800 border border-gray-200">
                              {agency.code}
                            </span>
                            <strong className="text-gray-900 text-sm font-semibold">
                              {agency.name}
                            </strong>
                          </div>
                          <div className="flex items-center gap-3 text-gray-500 text-[11px]">
                            <span>MST: <strong className="text-gray-700 font-mono">{agency.taxCode}</strong></span>
                            {agency.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} className="text-gray-400" />
                                {agency.phone}
                              </span>
                            )}
                          </div>
                          {agency.address && (
                            <p className="text-[11px] text-gray-400 line-clamp-1 max-w-sm">
                              {agency.address}
                            </p>
                          )}
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDeliveryPoints(agency)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-[#F85606] hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
                              title="Xem và quản lý các điểm giao hàng của đại lý"
                            >
                              <Truck size={12} />
                              <span>{agency.deliveryPointCount ?? 0} kho / điểm giao</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Nhóm khách hàng & Bảng giá áp dụng tự động */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div className="text-gray-800 font-medium text-[11px]">
                            {agency.customerGroupName}
                          </div>

                          {/* Bảng giá tự động ánh xạ */}
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                            style={{
                              backgroundColor: agency.pricingTier.badgeBg,
                              color: agency.pricingTier.badgeColor,
                              borderColor: 'currentColor'
                            }}
                          >
                            <BadgeDollarSign size={13} />
                            <span>{agency.pricingTier.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Khu vực & Người phụ trách (S3-06) */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                            <MapPin size={13} className="text-blue-500 shrink-0" />
                            <span>{agency.regionName}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-gray-500 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-1.5">
                              <Users size={12} className="text-[#F85606] shrink-0" />
                              <span>Sales: <strong className="text-gray-800">{agency.assignedRepName || 'Chưa gán'}</strong></span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(agency)}
                              className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                              title="Xem lịch sử phân công người phụ trách"
                            >
                              <History size={11} />
                              <span>Lịch sử</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Lịch sử giao dịch & Công nợ */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Đơn hàng:</span>
                            <span className={`font-bold ${agency.transactionCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                              {agency.transactionCount} giao dịch
                            </span>
                            {agency.hasTransactions && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                title="Đã có phát sinh giao dịch - Hệ thống bảo vệ không cho phép xóa"
                              >
                                Đã có GD
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-gray-500">Công nợ: </span>
                            <strong className="text-red-600 font-mono">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(agency.totalDebt)}
                            </strong>
                          </div>
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCreditLimit(agency)}
                              className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#F85606] cursor-pointer hover:underline text-left"
                              title="Nhấn để xem lịch sử và điều chỉnh hạn mức nợ"
                            >
                              <span>Hạn mức: <strong className="font-mono text-gray-700">{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(agency.creditLimit)}đ</strong></span>
                              <span>•</span>
                              <span>Tối đa: <strong className="text-blue-600 font-semibold">{agency.maxDebtDays || 30} ngày</strong></span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Cột 5: Trạng thái */}
                      <td className="py-4 px-4 text-center">
                        {isSuspended ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <ShieldAlert size={12} />
                              Dừng Giao Dịch
                            </span>
                            {agency.suspendReason && (
                              <span
                                className="text-[10px] text-amber-700 italic max-w-36 truncate block"
                                title={agency.suspendReason}
                              >
                                "{agency.suspendReason}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            Đang Hoạt Động
                          </span>
                        )}
                      </td>

                      {/* Cột 6: Thao tác - Rút gọn chỉ còn 2-3 nút gọn gàng */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 agency-action-dropdown relative">
                          {/* 1. Nút Sửa thông tin hồ sơ */}
                          {canManageAgency && (
                            <button
                              onClick={() => handleOpenEdit(agency)}
                              title="Sửa thông tin hồ sơ đại lý"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-[#F85606] hover:border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              <Edit size={15} />
                            </button>
                          )}

                          {/* 2. Nút Phân công người phụ trách (S3-06) */}
                          {canManageAssignments && (
                            <button
                              onClick={() => handleOpenAssignRep(agency)}
                              title="Phân công / Đổi nhân viên kinh doanh phụ trách"
                              className="p-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer"
                            >
                              <Users size={15} />
                            </button>
                          )}

                          {/* 3. Nút Menu Thao Tác Khác (...) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuAgencyId(openMenuAgencyId === agency.id ? null : agency.id)}
                              title="Thao tác khác"
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                openMenuAgencyId === agency.id
                                  ? 'bg-orange-50 border-orange-300 text-[#F85606]'
                                  : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                              }`}
                            >
                              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="19" cy="12" r="1.5" />
                                <circle cx="5" cy="12" r="1.5" />
                              </svg>
                            </button>

                            {/* Dropdown menu nổi */}
                            {openMenuAgencyId === agency.id && (
                              <div
                                className={`absolute right-0 ${
                                  index >= visibleAgencies.length - 2 ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                } w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-xs divide-y divide-gray-100 text-left animate-in fade-in duration-100`}
                              >
                                <div className="py-1">
                                  {/* Quản lý điểm giao hàng */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuAgencyId(null);
                                      handleOpenDeliveryPoints(agency);
                                    }}
                                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 hover:bg-orange-50/60 hover:text-[#F85606] transition-colors cursor-pointer"
                                  >
                                    <Truck size={14} className="text-[#F85606]" />
                                    <span>Điểm giao hàng ({agency.deliveryPointCount ?? 0})</span>
                                  </button>

                                  {/* Lịch sử phân công */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuAgencyId(null);
                                      handleOpenHistory(agency);
                                    }}
                                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 hover:bg-blue-50/60 hover:text-blue-600 transition-colors cursor-pointer"
                                  >
                                    <History size={14} className="text-blue-500" />
                                    <span>Lịch sử phân công</span>
                                  </button>

                                  {/* Thiết lập hạn mức công nợ */}
                                  {canManageAgency && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuAgencyId(null);
                                        handleOpenCreditLimit(agency);
                                      }}
                                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 hover:bg-blue-50/60 hover:text-blue-600 transition-colors cursor-pointer"
                                    >
                                      <CreditCard size={14} className="text-blue-500" />
                                      <span>Hạn mức công nợ</span>
                                    </button>
                                  )}
                                </div>

                                <div className="py-1">
                                  {/* Dừng / Mở lại giao dịch */}
                                  {canManageAgency && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuAgencyId(null);
                                        handleOpenSuspendModal(agency);
                                      }}
                                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                                        isSuspended
                                          ? 'text-emerald-700 hover:bg-emerald-50'
                                          : 'text-amber-700 hover:bg-amber-50'
                                      }`}
                                    >
                                      {isSuspended ? (
                                        <>
                                          <CheckCircle2 size={14} className="text-emerald-600" />
                                          <span>Mở lại giao dịch</span>
                                        </>
                                      ) : (
                                        <>
                                          <ShieldAlert size={14} className="text-amber-600" />
                                          <span>Dừng giao dịch</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* Xóa đại lý */}
                                  {canManageAgency && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuAgencyId(null);
                                        handleDeleteAttempt(agency);
                                      }}
                                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                      <X size={14} className="text-red-500" />
                                      <span>Xóa đại lý</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Hiển thị{' '}
            <strong className="text-gray-900">
              {totalElements === 0 ? 0 : page * size + 1}
            </strong>{' '}
            -{' '}
            <strong className="text-gray-900">
              {Math.min((page + 1) * size, totalElements)}
            </strong>{' '}
            trên tổng <strong className="text-gray-900">{totalElements}</strong> hồ sơ đại lý
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 font-semibold text-gray-700">
              Trang {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Thêm Mới / Cập Nhật */}
      <AgencyFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingAgency}
      />

      {/* Modal Dừng Giao Dịch / Mở Lại */}
      <SuspendAgencyModal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        agency={targetSuspendAgency}
        onConfirmSuspend={handleConfirmSuspend}
        onConfirmReactivate={handleConfirmReactivate}
      />

      {/* Modal Quản Lý Điểm Giao Hàng (S3-04 / SCRUM-15) */}
      <DeliveryPointsModal
        isOpen={isDeliveryPointsModalOpen}
        onClose={() => setIsDeliveryPointsModalOpen(false)}
        agency={selectedAgencyForPoints}
        onPointsUpdated={loadData}
      />

      {/* Modal Thiết Lập Hạn Mức Nợ (S3-05 / SCRUM-16) */}
      <CreditLimitModal
        isOpen={isCreditLimitModalOpen}
        onClose={() => setIsCreditLimitModalOpen(false)}
        agency={selectedAgencyForCredit}
        onSuccess={loadData}
      />

      {/* Modal Phân Công Người Phụ Trách (S3-06 / SCRUM-17) */}
      <AssignSalesRepModal
        isOpen={isAssignRepModalOpen}
        onClose={() => setIsAssignRepModalOpen(false)}
        agency={selectedAgencyForAssign}
        onSuccess={() => {
          loadData();
          setAlert({ type: 'success', message: 'Đã phân công lại nhân viên phụ trách đại lý thành công!' });
        }}
      />

      {/* Modal Chuyển Giao Địa Bàn Hàng Loạt (S3-06 / SCRUM-17) */}
      <TransferTerritoryModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        agencies={agencies}
        onSuccess={() => {
          loadData();
          setAlert({ type: 'success', message: 'Đã chuyển giao địa bàn hàng loạt thành công!' });
        }}
      />

      {/* Modal Lịch Sử Phân Công (S3-06 / SCRUM-17) */}
      <AssignmentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        agency={selectedAgencyForHistory}
      />
    </div>
  );
};
