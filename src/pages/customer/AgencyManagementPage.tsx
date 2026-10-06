import React, { useState, useEffect, useCallback } from 'react';
import type {
  Agency,
  AgencyFilterParams,
  CreateAgencyPayload,
  UpdateAgencyPayload,
  RegionOption
} from '../../types/agency';
import {
  fetchAgencies,
  createAgency,
  updateAgency,
  suspendAgency,
  reactivateAgency,
  deleteAgency,
  CUSTOMER_GROUP_OPTIONS,
  fetchAgencyFormOptions,
  fetchAgencyStats
} from '../../services/agencyApi';
import { AgencyFormModal } from '../../components/customer/AgencyFormModal';
import { SuspendAgencyModal } from '../../components/customer/SuspendAgencyModal';
import { DeliveryPointsModal } from '../../components/customer/DeliveryPointsModal';
import { CreditLimitModal } from '../../components/customer/CreditLimitModal';
import { AssignSalesRepModal } from '../../components/customer/AssignSalesRepModal';
import { TransferTerritoryModal } from '../../components/customer/TransferTerritoryModal';
import { AssignmentHistoryModal } from '../../components/customer/AssignmentHistoryModal';
import { CustomerTransactionLockModal } from '../../components/customer/CustomerTransactionLockModal';
import { DeleteAgencyModal } from '../../components/customer/DeleteAgencyModal';
import { AgencyCardView } from '../../components/customer/AgencyCardView';
import { useAuth } from '../../contexts/AuthContext';
import { useServerSearch, matchesKeyword } from '../../hooks/useServerSearch';
import { useUrlPaging, useClampPage } from '../../hooks/useUrlParams';
import { Pagination } from '../../components/common/Pagination';
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Edit,
  CheckCircle2,
  X,
  Users,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  MapPin,
  Phone,
  BadgeDollarSign,
  Truck,
  History,
  Lock,
  Unlock,
  Navigation
} from '../../components/common/Icons';

export const AgencyManagementPage: React.FC = () => {

  // Dữ liệu danh sách đại lý
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bộ lọc + trang lưu trên URL (vd: /customers?group=TIER_1&status=ACTIVE&page=2), mặc định 20 dòng/trang
  const { params: urlParams, setParams: setUrlParams, page, size, setPage, setSize, setFilters } = useUrlPaging({
    keyword: '',
    group: '',
    region: '',
    status: '',
    lock: ''
  });
  const selectedGroup = urlParams.group;
  const selectedRegion = urlParams.region;
  const selectedStatus = urlParams.status;
  const selectedLockFilter = urlParams.lock;
  const setSelectedGroup = (value: string) => setFilters({ group: value });
  const setSelectedRegion = (value: string) => setFilters({ region: value });
  const setSelectedStatus = (value: string) => setFilters({ status: value });
  const setSelectedLockFilter = (value: string) => setFilters({ lock: value });

  const [keyword, setKeyword] = useState(urlParams.keyword);
  // Gõ từ 2 ký tự mới gọi API (đợi ngừng gõ 0,4 giây); 1 ký tự thì lọc tại chỗ
  const resetToFirstPage = useCallback(() => setPage(0), [setPage]);
  const { serverKeyword, localKeyword, flush: flushSearch } = useServerSearch(
    keyword,
    resetToFirstPage,
    urlParams.keyword
  );
  useEffect(() => {
    setUrlParams({ keyword: serverKeyword });
  }, [serverKeyword, setUrlParams]);

  // Phân quyền người dùng hiện tại
  const { currentRole, user, showToast } = useAuth();
  const canManageAssignments = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER';
  const canManageAgency = currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER' || currentRole === 'ROLE_ACCOUNTANT';
  const isSalesRep = currentRole === 'ROLE_SALES_REP';

  // Modal Thêm Mới / Chỉnh Sửa Đại Lý (S3-03)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  // Modal Dừng Giao Dịch / Mở Lại (S3-03)
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [targetSuspendAgency, setTargetSuspendAgency] = useState<Agency | null>(null);

  // Modal Quản Lý Điểm Giao Hàng (S3-04 / SCRUM-15)
  const [isDeliveryPointsModalOpen, setIsDeliveryPointsModalOpen] = useState(false);
  const [selectedAgencyForPoints, setSelectedAgencyForPoints] = useState<Agency | null>(null);

  const handleOpenDeliveryPoints = (agency: Agency) => {
    setSelectedAgencyForPoints(agency);
    setIsDeliveryPointsModalOpen(true);
  };

  // Modal Thiết Lập Hạn Mức Nợ (S3-05 / SCRUM-16)
  const [isCreditLimitModalOpen, setIsCreditLimitModalOpen] = useState(false);
  const [selectedAgencyForCredit, setSelectedAgencyForCredit] = useState<Agency | null>(null);

  const handleOpenCreditLimit = (agency: Agency) => {
    setSelectedAgencyForCredit(agency);
    setIsCreditLimitModalOpen(true);
  };

  // Modal Xóa Đại Lý (Cảnh báo màn hình khi có giao dịch & Xác nhận xóa)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteAgency, setTargetDeleteAgency] = useState<Agency | null>(null);

  const handleOpenDeleteModal = (agency: Agency) => {
    setTargetDeleteAgency(agency);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (agency: Agency) => {
    const res = await deleteAgency(agency.id);
    if (res.success) {
      showToast('Đã xóa đại lý', res.message || 'Xóa đại lý thành công', 'success');
      reloadAll();
    } else {
      showToast('Không thể xóa đại lý', res.message || 'Có lỗi xảy ra khi xóa đại lý', 'error');
    }
  };

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

  // Modal Khóa / Mở giao dịch (S3-07 / SCRUM-19)
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [selectedAgencyForLock, setSelectedAgencyForLock] = useState<Agency | null>(null);

  const handleOpenLockModal = (agency: Agency) => {
    setSelectedAgencyForLock(agency);
    setIsLockModalOpen(true);
  };

  // Bộ lọc trạng thái khóa giao dịch (S3-07): '' (Tất cả), 'LOCKED' (Bị khóa), 'UNLOCKED' (Đang mở) — lưu trên URL (?lock=)

  // S3-08 / SCRUM-21: Chế độ xem: Bảng máy tính ('table') hoặc Thẻ tuyến ngoài đường ('cards')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  // S3-08: Tab lọc nhanh trạng thái trong tuyến
  const [routeQuickFilter, setRouteQuickFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED' | 'SUSPENDED'>('ALL');

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

  // Số liệu thẻ đầu trang (toàn bộ đại lý, không phụ thuộc trang đang xem)
  const [agencyStats, setAgencyStats] = useState({ total: 0, active: 0, suspended: 0, locked: 0 });

  // Khu vực thật từ Backend cho ô lọc
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  useEffect(() => {
    fetchAgencyFormOptions()
      .then((options) => setRegionOptions(options.regions))
      .catch(() => setRegionOptions([]));
  }, []);

  // Tải dữ liệu danh sách đại lý (Backend lọc + phân trang)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: AgencyFilterParams = {
        keyword: serverKeyword || undefined,
        customerGroup: selectedGroup || undefined,
        regionId: selectedRegion || undefined,
        status: selectedStatus || undefined,
        // S3-07: lọc khoá giao dịch ở Backend (toàn bộ DB), không lọc trên trang đang xem
        transactionLocked:
          selectedLockFilter === 'LOCKED' ? true : selectedLockFilter === 'UNLOCKED' ? false : undefined,
        page,
        size
      };
      // Tab lọc nhanh (S3-08) cũng gửi lên Backend
      if (routeQuickFilter === 'LOCKED') {
        params.transactionLocked = true;
      } else if (routeQuickFilter === 'ACTIVE') {
        params.status = 'ACTIVE';
        params.transactionLocked = false;
      } else if (routeQuickFilter === 'SUSPENDED') {
        params.status = 'SUSPENDED';
      }
      const res = await fetchAgencies(params);
      setAgencies(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setAgencies([]);
      showToast(
        'Lỗi tải dữ liệu',
        err instanceof Error ? err.message : 'Không thể tải danh sách đại lý. Vui lòng thử lại!',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [serverKeyword, selectedGroup, selectedRegion, selectedStatus, selectedLockFilter, routeQuickFilter, page, size]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Số liệu thẻ đầu trang: chỉ tải khi mở trang và sau khi thêm/sửa/khoá/dừng giao dịch (không tải lại mỗi lần đổi trang)
  const loadStats = useCallback(() => {
    fetchAgencyStats()
      .then(setAgencyStats)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const reloadAll = () => {
    loadData();
    loadStats();
  };

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
          (user?.id != null && String(a.assignedRepId) === String(user.id)) ||
          (user?.fullName && a.assignedRepName?.toLowerCase() === user.fullName.toLowerCase()) ||
          (user?.username === 'sales_rep' ? a.assignedRepId === 'REP_001' : false) ||
          (user?.username === 'sales_rep_1' && a.assignedRepId === 'REP_001') ||
          (user?.username === 'sales_rep_2' && a.assignedRepId === 'REP_002') ||
          (user?.username === 'sales_rep_3' && a.assignedRepId === 'REP_003')
      )
    : agencies;

  // Lọc khoá giao dịch và tab lọc nhanh đã làm ở Backend (xem loadData)
  const quickTabFilteredAgencies = roleFilteredAgencies;

  // Mới gõ 1 ký tự: lọc tại chỗ trên danh sách đang hiển thị, không gọi API (hỗ trợ tìm cả địa chỉ khi đứng ngoài đường)
  const visibleAgencies = localKeyword
    ? quickTabFilteredAgencies.filter((a) =>
        matchesKeyword(localKeyword, a.code, a.name, a.taxCode, a.phone, a.assignedRepName, a.address)
      )
    : quickTabFilteredAgencies;

  // Reset bộ lọc
  const handleResetFilter = () => {
    setKeyword('');
    setFilters({ group: '', region: '', status: '', lock: '' });
    setRouteQuickFilter('ALL');
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
        showToast('Thành công', res.message || 'Cập nhật đại lý thành công', 'success');
        reloadAll();
      } else {
        showToast('Không thể cập nhật', res.message || 'Có lỗi xảy ra', 'error');
      }
      return res;
    } else {
      const res = await createAgency(payload as CreateAgencyPayload);
      if (res.success) {
        showToast('Thành công', res.message || 'Tạo mới đại lý thành công', 'success');
        setPage(0);
        reloadAll();
      } else {
        showToast('Không thể tạo mới', res.message || 'Có lỗi xảy ra', 'error');
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
      showToast('Thành công', res.message, 'success');
      reloadAll();
    } else {
      showToast('Lỗi', res.message, 'error');
    }
    return res;
  };

  // Xác nhận Mở lại giao dịch
  const handleConfirmReactivate = async (agencyId: string) => {
    const res = await reactivateAgency(agencyId);
    if (res.success) {
      showToast('Thành công', res.message, 'success');
      reloadAll();
    } else {
      showToast('Lỗi', res.message, 'error');
    }
    return res;
  };

  // Thống kê nhanh
  const activeCount = agencyStats.active;
  const suspendedCount = agencyStats.suspended;
  const totalDebtSum = agencies.reduce((acc, a) => acc + (a.totalDebt || 0), 0);
  const lockedCount = agencyStats.locked;

  // Đang ở trang vượt quá số trang -> tự lùi về trang cuối
  useClampPage(page, totalPages, setPage, loading);

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


      {/* Cảnh báo S3-07 / SCRUM-19: Có đại lý bị khóa giao dịch do rủi ro công nợ */}
      {lockedCount > 0 && (
        <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-900 text-sm">
                  CẢNH BÁO RỦI RO CÔNG NỢ
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800 text-[11px] font-bold">
                  {lockedCount} đại lý bị khóa
                </span>
              </div>
              <p className="text-rose-700 text-xs mt-0.5">
                Các đại lý bị khóa giao dịch đang <strong>bị chặn tạo đơn mới trên toàn bộ hệ thống</strong> (kể cả cổng đặt hàng B2B). Đơn dở dang vẫn xử lý được nhưng có cảnh báo rủi ro.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedLockFilter(selectedLockFilter === 'LOCKED' ? '' : 'LOCKED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              selectedLockFilter === 'LOCKED'
                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-100/50'
            }`}
          >
            {selectedLockFilter === 'LOCKED' ? '✕ Bỏ lọc khóa' : '🔍 Lọc đại lý bị khóa'}
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
              {agencyStats.total}
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
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
              onChange={(e) => setSelectedGroup(e.target.value)}
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
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
            >
              <option value="">Tất cả Khu vực</option>
              {regionOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* S3-07: Lọc Khóa giao dịch rủi ro nợ */}
          <div>
            <select
              value={selectedLockFilter}
              onChange={(e) => setSelectedLockFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
            >
              <option value="">Tất cả giao dịch</option>
              <option value="LOCKED">🔒 Bị khóa giao dịch</option>
              <option value="UNLOCKED">✅ Đang mở giao dịch</option>
            </select>
          </div>

          {/* Lọc Trạng thái & Nút thao tác */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="SUSPENDED">Dừng giao dịch</option>
            </select>

            {(keyword || selectedGroup || selectedRegion || selectedStatus || selectedLockFilter) && (
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

      {/* S3-08 / SCRUM-21: Thanh công cụ xem nhanh theo tuyến cho Nhân viên kinh doanh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab lọc nhanh trạng thái */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => { setRouteQuickFilter('ALL'); setPage(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              routeQuickFilter === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Tất cả ({totalElements})
          </button>

          <button
            type="button"
            onClick={() => { setRouteQuickFilter('ACTIVE'); setPage(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              routeQuickFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Đang hoạt động ({activeCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setRouteQuickFilter('LOCKED'); setPage(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              routeQuickFilter === 'LOCKED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <Lock size={13} />
            <span>Khóa giao dịch ({lockedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setRouteQuickFilter('SUSPENDED'); setPage(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              routeQuickFilter === 'SUSPENDED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <ShieldAlert size={13} />
            <span>Dừng giao dịch ({suspendedCount})</span>
          </button>
        </div>

        {/* Nút chuyển đổi giao diện: Dạng Bảng Máy Tính vs Dạng Thẻ Đi Đường (S3-08) */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-orange-50 text-[#F85606] border border-orange-200/80 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
            title="Xem dạng bảng chi tiết (Desktop Table)"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span>Dạng Bảng</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-orange-50 text-[#F85606] border border-orange-200/80 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
            title="Chế độ danh thiếp / Tuyến ngoài đường cho Nhân viên kinh doanh (S3-08)"
          >
            <Navigation size={13} />
            <span>Tuyến Đi Đường (Thẻ)</span>
          </button>
        </div>
      </div>

      {/* 4. Nội Dung Danh Sách Đại Lý: Thẻ Tuyến Đi Đường (S3-08) hoặc Bảng Máy Tính (S3-03) */}
      {viewMode === 'cards' ? (
        visibleAgencies.length === 0 && !loading ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-xs text-center text-gray-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <Building2 size={36} className="text-gray-300" />
              <strong className="text-gray-700 text-sm">Không tìm thấy đại lý nào phù hợp trong tuyến</strong>
              <span className="text-xs">Thử điều chỉnh lại từ khóa hoặc xóa bộ lọc</span>
            </div>
          </div>
        ) : (
          <AgencyCardView
            agencies={visibleAgencies}
            loading={loading}
            canManageAgency={canManageAgency}
            canManageAssignments={canManageAssignments}
            onEdit={handleOpenEdit}
            onAssignRep={handleOpenAssignRep}
            onDeliveryPoints={handleOpenDeliveryPoints}
            onCreditLimit={handleOpenCreditLimit}
            onHistory={handleOpenHistory}
            onLockModal={handleOpenLockModal}
            onSuspendModal={handleOpenSuspendModal}
            onDeleteModal={handleOpenDeleteModal}
          />
        )
      ) : (
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

                      {/* Cột 5: Trạng thái (S3-03 & S3-07) */}
                      <td className="py-4 px-4 text-center">
                        {agency.transactionLocked ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              <Lock size={12} className="text-rose-600" />
                              Khóa Giao Dịch
                            </span>
                            {agency.transactionLockReason && (
                              <span
                                className="text-[10px] text-rose-700 italic max-w-40 truncate block font-medium"
                                title={`Lý do khóa: ${agency.transactionLockReason}`}
                              >
                                "{agency.transactionLockReason}"
                              </span>
                            )}
                          </div>
                        ) : isSuspended ? (
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
                                  {/* Khóa / Mở giao dịch (S3-07 / SCRUM-19 - Kế toán & Quản lý) */}
                                  {canManageAgency && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuAgencyId(null);
                                        handleOpenLockModal(agency);
                                      }}
                                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                                        agency.transactionLocked
                                          ? 'text-emerald-700 hover:bg-emerald-50'
                                          : 'text-rose-700 hover:bg-rose-50'
                                      }`}
                                    >
                                      {agency.transactionLocked ? (
                                        <>
                                          <Unlock size={14} className="text-emerald-600" />
                                          <span className="font-semibold">Mở khóa giao dịch</span>
                                        </>
                                      ) : (
                                        <>
                                          <Lock size={14} className="text-rose-600" />
                                          <span className="font-semibold">Khóa giao dịch (Nợ)</span>
                                        </>
                                      )}
                                    </button>
                                  )}

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

                                  {/* Không có "Xóa đại lý": hồ sơ đại lý không xoá cứng, dùng Dừng giao dịch */}
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
      </div>
      )}

      {/* Phân trang chung cho cả dạng Bảng và dạng Thẻ Tuyến */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
          itemLabel="đại lý"
          disabled={loading}
        />
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
          reloadAll();
          showToast('Thành công', 'Đã phân công lại nhân viên phụ trách đại lý thành công!', 'success');
        }}
      />

      {/* Modal Chuyển Giao Địa Bàn Hàng Loạt (S3-06 / SCRUM-17) */}
      <TransferTerritoryModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        agencies={agencies}
        onSuccess={() => {
          reloadAll();
          showToast('Thành công', 'Đã chuyển giao địa bàn hàng loạt thành công!', 'success');
        }}
      />

      {/* Modal Lịch Sử Phân Công (S3-06 / SCRUM-17) */}
      <AssignmentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        agency={selectedAgencyForHistory}
      />

      {/* Modal Khóa / Mở Giao Dịch Kiểm Soát Rủi Ro Nợ (S3-07 / SCRUM-19) */}
      <CustomerTransactionLockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        agency={selectedAgencyForLock}
        onSuccess={() => {
          reloadAll();
          showToast(
            'Thành công',
            selectedAgencyForLock?.transactionLocked
              ? `Đã mở khóa giao dịch cho đại lý [${selectedAgencyForLock.code}] thành công!`
              : `Đã khóa giao dịch đại lý [${selectedAgencyForLock?.code}] do rủi ro công nợ!`,
            'success'
          );
        }}
      />

      {/* Modal Xóa Đại Lý (Cảnh báo màn hình khi có giao dịch & Xác nhận xóa) */}
      <DeleteAgencyModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        agency={targetDeleteAgency}
        onConfirmDelete={handleConfirmDelete}
        onOpenSuspend={handleOpenSuspendModal}
      />
    </div>
  );
};
