import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchAdminUsers,
  fetchAdminFormOptions,
  createAdminUser,
  updateAdminUser,
  updateAdminAssignments,
  lockAdminUser,
  unlockAdminUser,
  getAvatarFullUrl,
  type AdminUserItem,
  type AdminFormOptions,
  type CreateAdminUserPayload,
  type UpdateAdminUserPayload,
  type UpdateAssignmentsPayload
} from '../../services/api';
import type { RoleName } from '../../types/user';
import { ROLE_METADATA_MAP, getUserAvatarInitials } from '../../types/user';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  Edit,
  Mail,
  Phone,
  Warehouse as WarehouseIcon,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  Filter,
  Info,
  FileSpreadsheet
} from '../../components/common/Icons';
import { UserImportModal } from './UserImportModal';
import { useServerSearch, matchesKeyword } from '../../hooks/useServerSearch';
import { useUrlPaging } from '../../hooks/useUrlParams';
import { Pagination } from '../../components/common/Pagination';
import { fetchAuditLogs } from '../../services/auditLogApi';

/**
 * Kiểm tra số điện thoại Việt Nam: để trống HOẶC đủ 10 số, bắt đầu bằng 03/05/07/08/09.
 * Trả về câu báo lỗi, hoặc null nếu hợp lệ.
 */
function getPhoneError(phone?: string): string | null {
  const value = (phone || '').trim();
  if (!value) return null;
  if (!/^\d+$/.test(value)) return 'Số điện thoại chỉ được gồm chữ số.';
  if (value.length !== 10) return `Số điện thoại phải đủ 10 số (đang có ${value.length} số).`;
  if (!/^0(3|5|7|8|9)\d{8}$/.test(value)) return 'Đầu số không hợp lệ (phải bắt đầu bằng 03, 05, 07, 08 hoặc 09).';
  return null;
}

/** Chỉ giữ lại chữ số, tối đa 10 số. */
function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}

export const UserManagementPage: React.FC = () => {
  const { user: currentUser, refreshContext, showToast } = useAuth();

  // Danh sách người dùng & phân trang
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc + trang lưu trên URL (vd: /users?role=ROLE_ADMIN&page=2). Mặc định 20 dòng/trang (S1-08)
  const { params: urlParams, setParams: setUrlParams, page, size, setPage, setSize, setFilters } = useUrlPaging({
    keyword: '',
    role: '',
    status: ''
  });
  const selectedRole = urlParams.role;
  const selectedStatus = urlParams.status;
  const setSelectedRole = (value: string) => setFilters({ role: value });
  const setSelectedStatus = (value: string) => setFilters({ status: value });

  // Bộ lọc tìm kiếm
  const [keyword, setKeyword] = useState<string>(urlParams.keyword);
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

  // Tùy chọn form (vai trò, kho, địa bàn)
  const [formOptions, setFormOptions] = useState<AdminFormOptions>({
    roles: [],
    warehouses: [],
    regions: []
  });

  // Thông báo phản hồi chung
  const [actionAlert, setActionAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Bản đồ đồng bộ avatar người dùng (kết hợp cache cục bộ và Nhật ký thao tác để đồng bộ tức thì)
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('erp_avatar_cache');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    // Tự động thu thập avatar người dùng từ Nhật ký thao tác để đồng bộ ngay lập tức
    fetchAuditLogs({ size: 100 })
      .then((res) => {
        if (res && res.logs) {
          const map: Record<string, string> = {};
          res.logs.forEach((log) => {
            if (log.actorUsername && log.actorAvatarUrl) {
              map[log.actorUsername.toLowerCase()] = log.actorAvatarUrl;
            }
          });
          setAvatarMap((prev) => {
            const next = { ...map, ...prev };
            try {
              localStorage.setItem('erp_avatar_cache', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Modal Thêm Tài Khoản (S1-08)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  // Modal Nhập Tài Khoản Hàng Loạt Từ Excel (S2-01 / SCRUM-18)
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateAdminUserPayload>({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    roles: ['ROLE_SALES_REP'],
    warehouseIds: [],
    regionIds: []
  });

  // Modal Sửa & Phân Quyền (S1-08 / S1-09)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'assignments'>('info');
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editInfoForm, setEditInfoForm] = useState<UpdateAdminUserPayload>({
    fullName: '',
    email: '',
    phone: ''
  });
  const [editAssignmentsForm, setEditAssignmentsForm] = useState<UpdateAssignmentsPayload>({
    roles: [],
    warehouseIds: [],
    regionIds: []
  });

  // Modal Khóa / Mở Khóa (S1-10)
  const [lockTargetUser, setLockTargetUser] = useState<AdminUserItem | null>(null);
  const [lockActionType, setLockActionType] = useState<'LOCK' | 'UNLOCK'>('LOCK');
  const [lockReason, setLockReason] = useState<string>('Quản trị viên tạm khóa để rà soát');
  const [lockLoading, setLockLoading] = useState<boolean>(false);

  // Tải danh sách người dùng từ API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setActionAlert(null);
    try {
      const res = await fetchAdminUsers({
        keyword: serverKeyword || undefined,
        role: selectedRole || undefined,
        status: selectedStatus || undefined,
        page,
        size
      });
      setUsers(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      setActionAlert({
        type: 'error',
        message: 'Lỗi tải danh sách người dùng. Vui lòng thử lại!'
      });
    } finally {
      setLoading(false);
    }
  }, [serverKeyword, selectedRole, selectedStatus, page, size]);

  // Tải danh mục vai trò/kho/địa bàn lúc khởi động
  useEffect(() => {
    fetchAdminFormOptions().then((opts) => setFormOptions(opts));
  }, []);

  // Gọi API mỗi khi thay đổi filter hoặc page
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Bấm Enter / nút Lọc: tìm ngay không cần đợi
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const changed = flushSearch();
    setPage(0);
    if (!changed) loadUsers();
  };

  // Mới gõ 1 ký tự: lọc tại chỗ trên danh sách đang hiển thị, không gọi API
  const visibleUsers = localKeyword
    ? users.filter((u) => matchesKeyword(localKeyword, u.fullName, u.username, u.phone, u.email))
    : users;

  // Reset bộ lọc
  const handleResetFilters = () => {
    setKeyword('');
    setFilters({ role: '', status: '' });
  };

  // Mở modal tạo tài khoản
  const handleOpenCreateModal = () => {
    setCreateForm({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      roles: ['ROLE_SALES_REP'],
      warehouseIds: [],
      regionIds: []
    });
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  // Submit tạo tài khoản (S1-08)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validate client trước
    if (!createForm.username || !createForm.fullName || !createForm.email) {
      setCreateError('Vui lòng điền đầy đủ Tên tài khoản, Họ tên và Email.');
      return;
    }

    // Kiểm tra định dạng số điện thoại nếu người dùng có nhập
    const createPhoneError = getPhoneError(createForm.phone);
    if (createPhoneError) {
      setCreateError(createPhoneError);
      return;
    }

    // Quy tắc 1: Một người dùng có thể giữ nhiều vai trò, nhưng phải có ít nhất 1 vai trò
    if (!createForm.roles || createForm.roles.length === 0) {
      setCreateError('Phải chọn ít nhất một vai trò cho người dùng.');
      return;
    }

    // Quy tắc 2: Người dùng thuộc vai trò kho phải gắn với ít nhất một kho cụ thể
    const isWhStaff = createForm.roles.some((r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER');
    if (isWhStaff && (!createForm.warehouseIds || createForm.warehouseIds.length === 0)) {
      setCreateError('Người dùng thuộc vai trò kho (Thủ kho / Quản lý kho) phải được gắn với ít nhất một kho cụ thể!');
      return;
    }

    const isSalesStaff = createForm.roles.some((r) => r === 'ROLE_SALES_REP' || r === 'ROLE_SALES_MANAGER');
    const sanitizedPayload: CreateAdminUserPayload = {
      ...createForm,
      warehouseIds: isWhStaff ? createForm.warehouseIds : [],
      regionIds: isSalesStaff ? createForm.regionIds : []
    };

    setCreateLoading(true);
    try {
      const result = await createAdminUser(sanitizedPayload);
      if (result.success) {
        setIsCreateModalOpen(false);
        showToast(
          'Tạo tài khoản thành công!',
          result.message || 'Mật khẩu tạm và email kích hoạt đã được gửi tới nhân viên.'
        );
        setPage(0);
        loadUsers();
      } else {
        setCreateError(result.message || 'Tạo tài khoản thất bại.');
      }
    } catch {
      setCreateError('Lỗi kết nối máy chủ. Vui lòng thử lại!');
    } finally {
      setCreateLoading(false);
    }
  };

  // Mở modal Sửa & Phân quyền
  const handleOpenEditModal = (target: AdminUserItem) => {
    setEditingUser(target);
    setEditTab('info');
    setEditError(null);
    setEditInfoForm({
      fullName: target.fullName,
      email: target.email,
      phone: target.phone || ''
    });
    const hasWh = target.roles.some((r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER');
    const hasSales = target.roles.some((r) => r === 'ROLE_SALES_REP' || r === 'ROLE_SALES_MANAGER');
    setEditAssignmentsForm({
      roles: [...target.roles],
      warehouseIds: hasWh ? target.warehouses.map((w) => w.id) : [],
      regionIds: hasSales ? target.regions.map((r) => r.id) : []
    });
    setIsEditModalOpen(true);
  };

  // Submit lưu thông tin cơ bản
  const handleUpdateInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditLoading(true);
    try {
      const editPhoneError = getPhoneError(editInfoForm.phone);
      if (editPhoneError) {
        setEditError(editPhoneError);
        setEditLoading(false);
        return;
      }
      const payload: UpdateAdminUserPayload = {
        fullName: editInfoForm.fullName.trim(),
        email: editInfoForm.email.trim(),
        phone: editInfoForm.phone ? editInfoForm.phone.trim() : ''
      };
      const res = await updateAdminUser(editingUser.id, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        showToast(
          'Cập nhật thành công!',
          'Thông tin tài khoản người dùng đã được lưu lại.'
        );
        loadUsers();
        if (currentUser && (currentUser.id === editingUser.id || currentUser.username === editingUser.username)) {
          refreshContext();
        }
      } else {
        setEditError(res.message);
      }
    } catch {
      setEditError('Không thể cập nhật thông tin.');
    } finally {
      setEditLoading(false);
    }
  };

  // Submit lưu phân quyền, kho & địa bàn (S1-09)
  const handleUpdateAssignmentsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    // Quy tắc 1: Phải có ít nhất một vai trò
    if (!editAssignmentsForm.roles || editAssignmentsForm.roles.length === 0) {
      setEditError('Người dùng phải có ít nhất một vai trò!');
      return;
    }

    // Quy tắc 3: Không thể tự thu hồi vai trò quản trị của chính mình
    const isSelf =
      currentUser &&
      (currentUser.id === editingUser.id || currentUser.username === editingUser.username);
    const wasAdmin = editingUser.roles.includes('ROLE_ADMIN');
    if (isSelf && wasAdmin && !editAssignmentsForm.roles.includes('ROLE_ADMIN')) {
      setEditError('Không thể tự thu hồi vai trò Quản trị hệ thống của chính mình!');
      return;
    }

    // Quy tắc 2: Người dùng thuộc vai trò kho phải gắn với ít nhất một kho cụ thể
    const isWhStaff = editAssignmentsForm.roles.some(
      (r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER'
    );
    if (
      isWhStaff &&
      (!editAssignmentsForm.warehouseIds || editAssignmentsForm.warehouseIds.length === 0)
    ) {
      setEditError('Người dùng thuộc vai trò kho (Thủ kho / Quản lý kho) phải được gắn với ít nhất một kho cụ thể!');
      return;
    }

    const isSalesStaff = editAssignmentsForm.roles.some(
      (r) => r === 'ROLE_SALES_REP' || r === 'ROLE_SALES_MANAGER'
    );

    const sanitizedPayload: UpdateAssignmentsPayload = {
      ...editAssignmentsForm,
      warehouseIds: isWhStaff ? editAssignmentsForm.warehouseIds : [],
      regionIds: isSalesStaff ? editAssignmentsForm.regionIds : []
    };

    setEditLoading(true);
    try {
      const res = await updateAdminAssignments(editingUser.id, sanitizedPayload);
      if (res.success) {
        setIsEditModalOpen(false);
        showToast(
          'Phân quyền thành công!',
          'Phân quyền vai trò, kho và địa bàn đã được cập nhật.'
        );
        loadUsers();
        if (currentUser && (currentUser.id === editingUser.id || currentUser.username === editingUser.username)) {
          refreshContext();
        }
      } else {
        setEditError(res.message);
      }
    } catch {
      setEditError('Không thể cập nhật phân quyền.');
    } finally {
      setEditLoading(false);
    }
  };

  // Mở modal Khóa / Mở Khóa (S1-10)
  const handleOpenLockModal = (target: AdminUserItem) => {
    if (currentUser && currentUser.username === target.username) {
      setActionAlert({ type: 'error', message: 'Bạn không thể tự khóa chính tài khoản đang đăng nhập của mình!' });
      return;
    }
    setLockTargetUser(target);
    setLockActionType(target.status === 'LOCKED' ? 'UNLOCK' : 'LOCK');
    setLockReason(''); // Bắt buộc admin phải nhập lý do khóa
  };

  // Submit Khóa / Mở Khóa (S1-10)
  const handleConfirmLockToggle = async () => {
    if (!lockTargetUser) return;

    // Bắt buộc ghi lý do khi khóa tài khoản
    if (lockActionType === 'LOCK') {
      if (!lockReason || lockReason.trim().length === 0) {
        setActionAlert({
          type: 'error',
          message: 'Bắt buộc phải ghi rõ lý do khóa tài khoản!'
        });
        return;
      }
    }

    setLockLoading(true);
    try {
      if (lockActionType === 'LOCK') {
        const res = await lockAdminUser(lockTargetUser.id, lockReason.trim());
        if (res.success) {
          const isSales = lockTargetUser.roles.includes('ROLE_SALES_REP') || lockTargetUser.roles.includes('ROLE_SALES_MANAGER');
          showToast(
            'Đã khóa tài khoản!',
            `Tài khoản [${lockTargetUser.username}] đã bị khóa và thu hồi phiên.${isSales ? ' (Cần bàn giao đại lý)' : ''}`,
            'error'
          );
          loadUsers();
        } else {
          setActionAlert({ type: 'error', message: res.message });
        }
      } else {
        const res = await unlockAdminUser(lockTargetUser.id);
        if (res.success) {
          showToast(
            'Đã mở khóa tài khoản!',
            `Tài khoản [${lockTargetUser.username}] đã được kích hoạt lại.`
          );
          loadUsers();
        } else {
          setActionAlert({ type: 'error', message: res.message });
        }
      }
    } catch {
      setActionAlert({ type: 'error', message: 'Lỗi thực thi yêu cầu khóa/mở khóa.' });
    } finally {
      setLockLoading(false);
      setLockTargetUser(null);
    }
  };

  // Avatar initials đồng bộ toàn hệ thống
  const getInitials = (name?: string) => getUserAvatarInitials(name);

  // Class badge màu theo vai trò
  const getRoleBadgeClass = (role: RoleName): string => {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'role-badge-admin';
      case 'ROLE_SALES_MANAGER':
        return 'role-badge-sales-manager';
      case 'ROLE_SALES_REP':
        return 'role-badge-sales-rep';
      case 'ROLE_WH_MANAGER':
        return 'role-badge-wh-manager';
      case 'ROLE_WAREHOUSE':
        return 'role-badge-warehouse';
      case 'ROLE_ACCOUNTANT':
        return 'role-badge-accountant';
      case 'ROLE_CUSTOMER':
        return 'role-badge-customer';
      default:
        return '';
    }
  };

  return (
    <div className="user-mgmt-container">
      {/* 1. Tiêu đề Phân hệ & Nút Tạo tài khoản */}
      <div className="user-mgmt-header">
        <div className="user-mgmt-header-left">
          <div className="user-mgmt-header-icon">
            <Users size={24} />
          </div>
          <div>
            <h1 className="user-mgmt-title">Quản Lý Tài Khoản & Nhân Sự</h1>
            <p className="user-mgmt-subtitle">
              Quản trị nhân sự, đa vai trò (RBAC), gán kho, địa bàn và kiểm soát trạng thái tài khoản
            </p>
          </div>
        </div>

        <div className="user-mgmt-header-actions">
          <button
            onClick={() => loadUsers()}
            disabled={loading}
            title="Làm mới danh sách"
            className="user-mgmt-btn-refresh"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="user-mgmt-btn-create"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
            }}
            title="Nhập danh sách người dùng hàng loạt từ tệp Excel"
          >
            <FileSpreadsheet size={18} />
            <span>Nhập Từ Excel</span>
          </button>

          <button onClick={handleOpenCreateModal} className="user-mgmt-btn-create">
            <Plus size={18} />
            <span>Thêm Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {actionAlert && actionAlert.type === 'error' && (
        <div className="user-mgmt-alert user-mgmt-alert-error">
          <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>{actionAlert.message}</div>
          <button
            onClick={() => setActionAlert(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Thanh Tìm Kiếm & Bộ Lọc (S1-09) */}
      <div className="user-mgmt-filter-card">
        <form onSubmit={handleSearchSubmit} className="user-mgmt-filter-grid">
          {/* Ô Tìm Kiếm theo từ khóa */}
          <div className="user-mgmt-search-box">
            <Search size={17} className="user-mgmt-search-icon" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, tài khoản, số điện thoại..."
              className="user-mgmt-search-input"
            />
          </div>

          {/* Lọc theo Vai Trò */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="user-mgmt-select"
            >
              <option value="">Tất cả vai trò</option>
              {formOptions.roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_METADATA_MAP[r]?.label || r}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Trạng Thái */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="user-mgmt-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </div>

          {/* Nút Lọc & Reset */}
          <div className="user-mgmt-filter-actions">
            <button type="submit" className="user-mgmt-btn-filter">
              <Filter size={15} />
              <span>Lọc</span>
            </button>
            {(keyword || selectedRole || selectedStatus) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="user-mgmt-btn-cancel"
                style={{ padding: '8px 12px', height: '38px', borderRadius: '8px', cursor: 'pointer' }}
                title="Xóa bộ lọc"
              >
                <RefreshCw size={14} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 3. Bảng Danh Sách Tài Khoản (S1-09: Phân trang 20 dòng / trang) */}
      <div className="user-mgmt-table-card">
        <div className="user-mgmt-table-wrapper">
          <table className="user-mgmt-table">
            <thead className="user-mgmt-thead">
              <tr>
                <th className="user-mgmt-th">Tài Khoản / Nhân Sự</th>
                <th className="user-mgmt-th">Thông Tin Liên Hệ</th>
                <th className="user-mgmt-th">Vai Trò Phân Quyền</th>
                <th className="user-mgmt-th">Kho & Địa Bàn</th>
                <th className="user-mgmt-th" style={{ textAlign: 'center' }}>
                  Trạng Thái
                </th>
                <th className="user-mgmt-th" style={{ textAlign: 'right' }}>
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="user-mgmt-tbody">
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={24} className="animate-spin" style={{ color: '#F85606' }} />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Users size={36} style={{ color: '#CBD5E1' }} />
                      <span style={{ fontWeight: 700, color: '#374151' }}>Không tìm thấy tài khoản nào</span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        Thử điều chỉnh lại từ khóa tìm kiếm hoặc bỏ chọn bộ lọc
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleUsers.map((item) => {
                  const isLocked = item.status === 'LOCKED';
                  const isCurrentUser = currentUser?.username === item.username;
                  const displayAvatar = (isCurrentUser ? (currentUser?.avatarThumbnailUrl || currentUser?.avatarUrl) : null)
                    || item.avatarThumbnailUrl
                    || item.avatarUrl
                    || avatarMap[item.username.toLowerCase()];

                  return (
                    <tr key={item.id} className={isLocked ? 'row-locked' : ''}>
                      {/* Cột 1: Tên & Username */}
                      <td className="user-mgmt-td">
                        <div className="user-mgmt-user-cell">
                          <div className="user-mgmt-avatar">
                            {displayAvatar ? (
                              <img
                                src={getAvatarFullUrl(displayAvatar)}
                                alt={item.fullName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback về text initials nếu ảnh bị lỗi
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  if (target.nextElementSibling) {
                                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <span style={{ display: displayAvatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                              {getInitials(item.fullName)}
                            </span>
                          </div>
                          <div className="user-mgmt-user-info">
                            <span className="user-mgmt-fullname">
                              {item.fullName}
                              {isCurrentUser && (
                                <span className="user-mgmt-self-badge">Bạn</span>
                              )}
                            </span>
                            <span className="user-mgmt-username">@{item.username}</span>

                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Email & SĐT */}
                      <td className="user-mgmt-td">
                        <div className="user-mgmt-contact-cell">
                          <div className="user-mgmt-contact-row">
                            <Mail size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            <span>{item.email}</span>
                          </div>
                          {item.phone && (
                            <div className="user-mgmt-contact-row phone">
                              <Phone size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                              <span>{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Vai trò (Một người dùng có thể giữ nhiều vai trò cùng lúc) */}
                      <td className="user-mgmt-td">
                        <div className="user-mgmt-roles-wrap">
                          {item.roles.map((r) => (
                            <span
                              key={r}
                              className={`user-mgmt-role-badge ${getRoleBadgeClass(r)}`}
                            >
                              {ROLE_METADATA_MAP[r]?.label || r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Cột 4: Kho & Địa bàn */}
                      <td className="user-mgmt-td">
                        <div className="user-mgmt-location-cell">
                          {item.warehouses && item.warehouses.length > 0 ? (
                            <div className="user-mgmt-location-row">
                              <WarehouseIcon size={14} style={{ color: '#D97706', flexShrink: 0 }} />
                              <span>{item.warehouses.map((w) => w.name).join(', ')}</span>
                            </div>
                          ) : null}

                          {item.regions && item.regions.length > 0 ? (
                            <div className="user-mgmt-location-row">
                              <MapPin size={14} style={{ color: '#2563EB', flexShrink: 0 }} />
                              <span>{item.regions.map((reg) => reg.name).join(', ')}</span>
                            </div>
                          ) : null}

                          {(!item.warehouses || item.warehouses.length === 0) &&
                            (!item.regions || item.regions.length === 0) && (
                              <span className="user-mgmt-location-empty">
                                Chưa có
                              </span>
                            )}

                          {isLocked && (item.handoverRequired || item.roles.includes('ROLE_SALES_REP') || item.roles.includes('ROLE_SALES_MANAGER')) && (
                            <div style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#B45309',
                              background: '#FFFBEB',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #FDE68A',
                              marginTop: 4
                            }}>
                              ⚠️ Đại lý địa bàn cần bàn giao
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột 5: Trạng thái */}
                      <td className="user-mgmt-td" style={{ textAlign: 'center' }}>
                        {isLocked ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <span className="user-mgmt-status-badge locked">
                              <Lock size={12} />
                              Đã khóa
                            </span>
                            {item.lockReason && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: '#DC2626',
                                  fontStyle: 'italic',
                                  maxWidth: 140,
                                  textAlign: 'center',
                                  lineHeight: 1.2
                                }}
                                title={item.lockReason}
                              >
                                "{item.lockReason}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="user-mgmt-status-badge active">
                            <CheckCircle2 size={12} />
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="user-mgmt-td">
                        <div className="user-mgmt-actions">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Sửa thông tin & Phân quyền"
                            className="user-mgmt-action-btn edit"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenLockModal(item)}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            disabled={isCurrentUser}
                            className={`user-mgmt-action-btn ${isLocked ? 'unlock' : 'lock'}`}
                          >
                            {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân Trang (S1-09: Mặc định 20 dòng / trang) */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
          itemLabel="tài khoản"
          disabled={loading}
        />
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TẠO TÀI KHOẢN MỚI (S1-08 / S1-09)              */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="user-mgmt-modal-overlay">
          <div className="user-mgmt-modal-dialog">
            {/* Header */}
            <div className="user-mgmt-modal-header">
              <div>
                <h3 className="user-mgmt-modal-title">Tạo Tài Khoản Mới</h3>
                <p className="user-mgmt-modal-desc">
                  Hệ thống tự động cấp mật khẩu tạm ngẫu nhiên và gửi email kích hoạt
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="user-mgmt-modal-close"
                disabled={createLoading}
                style={createLoading ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: 'contents' }}>
              <div className="user-mgmt-modal-body">
                {/* Đang gọi API tạo tài khoản + gửi mail -> khoá toàn bộ ô nhập */}
                <fieldset
                  disabled={createLoading}
                  style={{
                    border: 'none',
                    margin: 0,
                    padding: 0,
                    minWidth: 0,
                    opacity: createLoading ? 0.6 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                {/* Báo lỗi trùng username/email/phone (S1-08) */}
                {createError && (
                  <div className="user-mgmt-alert user-mgmt-alert-error">
                    <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{createError}</span>
                  </div>
                )}

                {/* Banner hướng dẫn */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1E40AF',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                  }}
                >
                  <Mail size={16} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong>Lưu ý:</strong> Sau khi tạo, email chứa mật khẩu tạm sẽ được gửi
                    tới người dùng. Đăng nhập lần đầu bắt buộc đổi mật khẩu mới.
                  </div>
                </div>

                {/* Thông tin cơ bản */}
                <div className="user-mgmt-form-grid">
                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">
                      Tên đăng nhập (Username) <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          username: e.target.value.toLowerCase().trim()
                        })
                      }
                      placeholder="ví dụ: tran.minh"
                      className="user-mgmt-form-input"
                    />
                  </div>

                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">
                      Họ và tên đầy đủ <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      placeholder="ví dụ: Trần Văn Minh"
                      className="user-mgmt-form-input"
                    />
                  </div>

                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">
                      Email nhận mật khẩu tạm <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value.trim() })
                      }
                      placeholder="minh.tran@erp.com"
                      className="user-mgmt-form-input"
                    />
                  </div>

                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">
                      Số điện thoại <span style={{ color: '#6B7280', fontSize: '11px', fontWeight: 'normal' }}>(10 số: 03/05/07/08/09 hoặc để trống)</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={createForm.phone || ''}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, phone: sanitizePhoneInput(e.target.value) })
                      }
                      placeholder="Ví dụ: 0912345678"
                      className="user-mgmt-form-input"
                      style={getPhoneError(createForm.phone) ? { borderColor: '#DC2626' } : undefined}
                    />
                    {getPhoneError(createForm.phone) && (
                      <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                        {getPhoneError(createForm.phone)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quy tắc 1: Một người dùng có thể giữ nhiều vai trò cùng lúc */}
                <div className="user-mgmt-form-group">
                  <label className="user-mgmt-form-label">
                    Phân quyền vai trò <span style={{ color: '#DC2626' }}>*</span>{' '}
                    <span style={{ color: '#6B7280', fontWeight: 'normal' }}>
                      (Có thể chọn nhiều vai trò cùng lúc)
                    </span>
                  </label>
                  <div className="user-mgmt-checkbox-grid">
                    {formOptions.roles.map((r) => {
                      const isSelected = createForm.roles.includes(r);
                      return (
                        <label
                          key={r}
                          className={`user-mgmt-checkbox-card ${isSelected ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newRoles = e.target.checked
                                ? [...createForm.roles, r]
                                : createForm.roles.filter((role) => role !== r);
                              const hasWh = newRoles.some((role) => role === 'ROLE_WAREHOUSE' || role === 'ROLE_WH_MANAGER');
                              const hasSales = newRoles.some((role) => role === 'ROLE_SALES_REP' || role === 'ROLE_SALES_MANAGER');
                              setCreateForm({
                                ...createForm,
                                roles: newRoles,
                                warehouseIds: hasWh ? createForm.warehouseIds : [],
                                regionIds: hasSales ? createForm.regionIds : []
                              });
                            }}
                            style={{ marginTop: 2, accentColor: '#F85606' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {ROLE_METADATA_MAP[r]?.label || r}
                            </div>
                            <div style={{ fontSize: 11, color: '#6B7280' }}>
                              {ROLE_METADATA_MAP[r]?.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Quy tắc 2: Phân công kho hàng (Chỉ dành cho nhân sự thuộc bộ phận Kho) */}
                {(() => {
                  const isCreateWarehouseRole = createForm.roles.some((r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER');
                  const isCreateSalesRole = createForm.roles.some((r) => r === 'ROLE_SALES_REP' || r === 'ROLE_SALES_MANAGER');
                  return (
                    <>
                      <div className="user-mgmt-form-group">
                        <label
                          className="user-mgmt-form-label"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <span>Kho hàng phụ trách</span>
                          {isCreateWarehouseRole && (
                            <span
                              style={{
                                fontSize: 11,
                                color: '#B45309',
                                fontWeight: 700,
                                background: '#FEF3C7',
                                padding: '2px 8px',
                                borderRadius: 4
                              }}
                            >
                              * Bắt buộc chọn ít nhất 1 kho cho vai trò Kho!
                            </span>
                          )}
                        </label>
                        {isCreateWarehouseRole ? (
                          <div className="user-mgmt-checkbox-grid">
                            {formOptions.warehouses.map((wh) => {
                              const isSelected = createForm.warehouseIds?.includes(wh.id);
                              return (
                                <label
                                  key={wh.id}
                                  className={`user-mgmt-checkbox-card ${isSelected ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const cur = createForm.warehouseIds || [];
                                      if (e.target.checked) {
                                        setCreateForm({ ...createForm, warehouseIds: [...cur, wh.id] });
                                      } else {
                                        setCreateForm({
                                          ...createForm,
                                          warehouseIds: cur.filter((id) => id !== wh.id)
                                        });
                                      }
                                    }}
                                    style={{ accentColor: '#F85606' }}
                                  />
                                  <span style={{ fontSize: 12.5 }}>{wh.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="user-mgmt-assignment-note">
                            <Info size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            <span>Không áp dụng. Chỉ nhân sự thuộc bộ phận Kho (Quản lý kho / Thủ kho) mới được phân công quản lý kho hàng.</span>
                          </div>
                        )}
                      </div>

                      {/* Địa bàn phụ trách (Chỉ dành cho nhân sự thuộc bộ phận Kinh doanh) */}
                      <div className="user-mgmt-form-group">
                        <label className="user-mgmt-form-label">Địa bàn phụ trách (Kinh doanh)</label>
                        {isCreateSalesRole ? (
                          <div className="user-mgmt-checkbox-grid">
                            {formOptions.regions.map((reg) => {
                              const isSelected = createForm.regionIds?.includes(reg.id);
                              return (
                                <label
                                  key={reg.id}
                                  className={`user-mgmt-checkbox-card ${isSelected ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const cur = createForm.regionIds || [];
                                      if (e.target.checked) {
                                        setCreateForm({ ...createForm, regionIds: [...cur, reg.id] });
                                      } else {
                                        setCreateForm({
                                          ...createForm,
                                          regionIds: cur.filter((id) => id !== reg.id)
                                        });
                                      }
                                    }}
                                    style={{ accentColor: '#2563EB' }}
                                  />
                                  <span style={{ fontSize: 12.5 }}>{reg.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="user-mgmt-assignment-note">
                            <Info size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            <span>Không áp dụng. Chỉ nhân sự thuộc bộ phận Kinh doanh (Quản lý kinh doanh / Nhân viên kinh doanh) mới được phân công địa bàn.</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
                </fieldset>
              </div>

              {/* Footer */}
              <div className="user-mgmt-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="user-mgmt-btn-cancel"
                  disabled={createLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading || Boolean(getPhoneError(createForm.phone))}
                  className="user-mgmt-btn-submit"
                  style={getPhoneError(createForm.phone) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  {createLoading && <RefreshCw size={15} className="animate-spin" />}
                  <span>{createLoading ? 'Đang tạo...' : 'Tạo Tài Khoản & Gửi Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SỬA THÔNG TIN & PHÂN QUYỀN (S1-08 / S1-09)      */}
      {/* ======================================================== */}
      {isEditModalOpen && editingUser && (
        <div className="user-mgmt-modal-overlay">
          <div className="user-mgmt-modal-dialog">
            <div className="user-mgmt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="user-mgmt-avatar" style={{ width: 42, height: 42 }}>
                  {(() => {
                    const isCurrent = currentUser?.username === editingUser.username;
                    const editAvatar = (isCurrent ? (currentUser?.avatarThumbnailUrl || currentUser?.avatarUrl) : null)
                      || editingUser.avatarThumbnailUrl
                      || editingUser.avatarUrl
                      || avatarMap[editingUser.username.toLowerCase()];
                    return (
                      <>
                        {editAvatar ? (
                          <img
                            src={getAvatarFullUrl(editAvatar)}
                            alt={editingUser.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <span style={{ display: editAvatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          {getInitials(editingUser.fullName)}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div>
                  <h3 className="user-mgmt-modal-title">
                    Cập Nhật Tài Khoản: @{editingUser.username}
                  </h3>
                  <p className="user-mgmt-modal-desc">{editingUser.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="user-mgmt-modal-close"
                disabled={editLoading}
                style={editLoading ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                background: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
                padding: '0 24px'
              }}
            >
              <button
                type="button"
                disabled={editLoading}
                onClick={() => {
                  setEditTab('info');
                  setEditError(null);
                }}
                style={{
                  padding: '10px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: 'none',
                  background: 'transparent',
                  borderBottom: editTab === 'info' ? '2px solid #F85606' : '2px solid transparent',
                  color: editTab === 'info' ? '#F85606' : '#6B7280',
                  cursor: 'pointer'
                }}
              >
                1. Thông tin cá nhân
              </button>
              <button
                type="button"
                disabled={editLoading}
                onClick={() => {
                  setEditTab('assignments');
                  setEditError(null);
                }}
                style={{
                  padding: '10px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: 'none',
                  background: 'transparent',
                  borderBottom:
                    editTab === 'assignments' ? '2px solid #F85606' : '2px solid transparent',
                  color: editTab === 'assignments' ? '#F85606' : '#6B7280',
                  cursor: 'pointer'
                }}
              >
                2. Phân quyền & Kho / Địa bàn
              </button>
            </div>

            {/* Tab Body */}
            <div className="user-mgmt-modal-body">
              {/* Đang lưu -> khoá toàn bộ ô nhập và nút trong 2 tab */}
              <fieldset
                disabled={editLoading}
                style={{
                  border: 'none',
                  margin: 0,
                  padding: 0,
                  minWidth: 0,
                  opacity: editLoading ? 0.6 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
              {editError && (
                <div className="user-mgmt-alert user-mgmt-alert-error">
                  <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{editError}</span>
                </div>
              )}

              {/* Tab 1: Sửa thông tin cơ bản */}
              {editTab === 'info' && (
                <form onSubmit={handleUpdateInfoSubmit} style={{ display: 'contents' }}>
                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">Họ và tên</label>
                    <input
                      type="text"
                      required
                      value={editInfoForm.fullName}
                      onChange={(e) =>
                        setEditInfoForm({ ...editInfoForm, fullName: e.target.value })
                      }
                      className="user-mgmt-form-input"
                    />
                  </div>

                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">Email liên hệ</label>
                    <input
                      type="email"
                      required
                      value={editInfoForm.email}
                      onChange={(e) =>
                        setEditInfoForm({ ...editInfoForm, email: e.target.value.trim() })
                      }
                      className="user-mgmt-form-input"
                    />
                  </div>

                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">Số điện thoại</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={editInfoForm.phone || ''}
                      onChange={(e) =>
                        setEditInfoForm({ ...editInfoForm, phone: sanitizePhoneInput(e.target.value) })
                      }
                      placeholder="Ví dụ: 0912345678 (hoặc để trống)"
                      className="user-mgmt-form-input"
                      style={getPhoneError(editInfoForm.phone) ? { borderColor: '#DC2626' } : undefined}
                    />
                    {getPhoneError(editInfoForm.phone) && (
                      <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                        {getPhoneError(editInfoForm.phone)}
                      </p>
                    )}
                  </div>

                  <div className="user-mgmt-modal-footer" style={{ margin: '16px -24px -22px', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="user-mgmt-btn-cancel"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading || Boolean(getPhoneError(editInfoForm.phone))}
                      className="user-mgmt-btn-submit"
                      style={getPhoneError(editInfoForm.phone) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                    >
                      {editLoading && <RefreshCw size={15} className="animate-spin" />}
                      <span>Lưu thông tin</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Phân quyền & Kho / Địa bàn */}
              {editTab === 'assignments' && (
                <form onSubmit={handleUpdateAssignmentsSubmit} style={{ display: 'contents' }}>
                  {/* Quy tắc 1 & 3: Đa vai trò + Không thể tự thu hồi vai trò admin của chính mình */}
                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">
                      Vai trò người dùng{' '}
                      <span style={{ color: '#6B7280', fontWeight: 'normal' }}>
                        (Một người dùng có thể giữ nhiều vai trò cùng lúc)
                      </span>
                    </label>

                    <div className="user-mgmt-checkbox-grid">
                      {formOptions.roles.map((r) => {
                        const isSelected = editAssignmentsForm.roles.includes(r);
                        const isSelf = Boolean(
                          currentUser &&
                          (currentUser.id === editingUser.id ||
                            currentUser.username === editingUser.username)
                        );
                        const isLockedAdmin = isSelf && r === 'ROLE_ADMIN';

                        return (
                          <label
                            key={r}
                            className={`user-mgmt-checkbox-card ${isSelected ? 'selected' : ''
                              } ${isLockedAdmin ? 'disabled' : ''}`}
                            title={
                              isLockedAdmin
                                ? 'Không thể tự thu hồi vai trò Quản trị hệ thống của chính mình!'
                                : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isLockedAdmin}
                              onChange={(e) => {
                                const newRoles = e.target.checked
                                  ? [...editAssignmentsForm.roles, r]
                                  : editAssignmentsForm.roles.filter((role) => role !== r);
                                const hasWh = newRoles.some((role) => role === 'ROLE_WAREHOUSE' || role === 'ROLE_WH_MANAGER');
                                const hasSales = newRoles.some((role) => role === 'ROLE_SALES_REP' || role === 'ROLE_SALES_MANAGER');
                                setEditAssignmentsForm({
                                  ...editAssignmentsForm,
                                  roles: newRoles,
                                  warehouseIds: hasWh ? editAssignmentsForm.warehouseIds : [],
                                  regionIds: hasSales ? editAssignmentsForm.regionIds : []
                                });
                              }}
                              style={{ marginTop: 2, accentColor: '#F85606' }}
                            />
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                {ROLE_METADATA_MAP[r]?.label || r}
                                {isLockedAdmin && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: '#7E22CE',
                                      background: '#F3E8FF',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3
                                    }}
                                  >
                                    <Lock size={10} /> Không thể tự thu hồi
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: '#6B7280' }}>
                                {ROLE_METADATA_MAP[r]?.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quy tắc 2: Phân công kho hàng & Địa bàn theo đúng chức năng nhiệm vụ */}
                  {(() => {
                    const isEditWarehouseRole = editAssignmentsForm.roles.some((r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER');
                    const isEditSalesRole = editAssignmentsForm.roles.some((r) => r === 'ROLE_SALES_REP' || r === 'ROLE_SALES_MANAGER');
                    return (
                      <>
                        <div className="user-mgmt-form-group">
                          <label
                            className="user-mgmt-form-label"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <span>Kho hàng phụ trách</span>
                            {isEditWarehouseRole && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: '#B45309',
                                  fontWeight: 700,
                                  background: '#FEF3C7',
                                  padding: '2px 8px',
                                  borderRadius: 4
                                }}
                              >
                                * Bắt buộc gắn ít nhất 1 kho cho nhân sự Kho!
                              </span>
                            )}
                          </label>
                          {isEditWarehouseRole ? (
                            <div className="user-mgmt-checkbox-grid">
                              {formOptions.warehouses.map((wh) => {
                                const isSelected = editAssignmentsForm.warehouseIds?.includes(wh.id);
                                return (
                                  <label
                                    key={wh.id}
                                    className={`user-mgmt-checkbox-card ${isSelected ? 'selected' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const cur = editAssignmentsForm.warehouseIds || [];
                                        if (e.target.checked) {
                                          setEditAssignmentsForm({
                                            ...editAssignmentsForm,
                                            warehouseIds: [...cur, wh.id]
                                          });
                                        } else {
                                          setEditAssignmentsForm({
                                            ...editAssignmentsForm,
                                            warehouseIds: cur.filter((id) => id !== wh.id)
                                          });
                                        }
                                      }}
                                      style={{ accentColor: '#F85606' }}
                                    />
                                    <span style={{ fontSize: 12.5 }}>{wh.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="user-mgmt-assignment-note">
                              <Info size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                              <span>Không áp dụng. Chỉ nhân sự thuộc bộ phận Kho (Quản lý kho / Thủ kho) mới được phân công quản lý kho hàng.</span>
                            </div>
                          )}
                        </div>

                        {/* Địa bàn phụ trách (Chỉ dành cho nhân sự thuộc bộ phận Kinh doanh) */}
                        <div className="user-mgmt-form-group">
                          <label className="user-mgmt-form-label">Địa bàn phụ trách (Kinh doanh)</label>
                          {isEditSalesRole ? (
                            <div className="user-mgmt-checkbox-grid">
                              {formOptions.regions.map((reg) => {
                                const isSelected = editAssignmentsForm.regionIds?.includes(reg.id);
                                return (
                                  <label
                                    key={reg.id}
                                    className={`user-mgmt-checkbox-card ${isSelected ? 'selected' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const cur = editAssignmentsForm.regionIds || [];
                                        if (e.target.checked) {
                                          setEditAssignmentsForm({
                                            ...editAssignmentsForm,
                                            regionIds: [...cur, reg.id]
                                          });
                                        } else {
                                          setEditAssignmentsForm({
                                            ...editAssignmentsForm,
                                            regionIds: cur.filter((id) => id !== reg.id)
                                          });
                                        }
                                      }}
                                      style={{ accentColor: '#2563EB' }}
                                    />
                                    <span style={{ fontSize: 12.5 }}>{reg.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="user-mgmt-assignment-note">
                              <Info size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                              <span>Không áp dụng. Chỉ nhân sự thuộc bộ phận Kinh doanh (Quản lý kinh doanh / Nhân viên kinh doanh) mới được phân công địa bàn.</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  <div className="user-mgmt-modal-footer" style={{ margin: '16px -24px -22px', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="user-mgmt-btn-cancel"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="user-mgmt-btn-submit"
                    >
                      {editLoading && <RefreshCw size={15} className="animate-spin" />}
                      <span>Lưu phân quyền</span>
                    </button>
                  </div>
                </form>
              )}
              </fieldset>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN (S1-10)       */}
      {/* ======================================================== */}
      {lockTargetUser && (
        <div className="user-mgmt-modal-overlay">
          <div className="user-mgmt-modal-dialog" style={{ maxWidth: 440 }}>
            <div
              style={{
                padding: '24px 24px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: lockActionType === 'LOCK' ? '#FEF2F2' : '#ECFDF5',
                  color: lockActionType === 'LOCK' ? '#DC2626' : '#059669',
                  flexShrink: 0
                }}
              >
                {lockActionType === 'LOCK' ? <Lock size={24} /> : <Unlock size={24} />}
              </div>
              <div>
                <h3 className="user-mgmt-modal-title" style={{ fontSize: 16 }}>
                  {lockActionType === 'LOCK' ? 'Khóa Tài Khoản Người Dùng' : 'Mở Khóa Tài Khoản'}
                </h3>
                <p className="user-mgmt-modal-desc">
                  Tài khoản: <strong>@{lockTargetUser.username}</strong> ({lockTargetUser.fullName})
                </p>
              </div>
            </div>

            <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lockActionType === 'LOCK' ? (
                <>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                  }}>
                    <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Thu hồi phiên mở ngay lập tức:</strong> Khi bị khóa, tài khoản này sẽ bị thu hồi phiên làm việc (JWT) tức thì và bị từ chối đăng nhập cho đến khi được mở khóa.
                    </div>
                  </div>

                  {/* Cảnh báo bàn giao đại lý cho Sales */}
                  {(lockTargetUser.roles.includes('ROLE_SALES_REP') || lockTargetUser.roles.includes('ROLE_SALES_MANAGER')) && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#FFFBEB',
                      border: '1px solid #FCD34D',
                      color: '#92400E',
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8
                    }}>
                      <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ color: '#B45309' }}>⚠️ CẢNH BÁO BÀN GIAO ĐẠI LÝ:</strong> Nhân viên này thuộc khối <strong>Kinh doanh (Sales)</strong> đang phụ trách mạng lưới đại lý. Khi tài khoản bị khóa, hệ thống sẽ tự động kích hoạt cảnh báo <strong>cần bàn giao đại lý</strong> để cấp quản lý kịp thời phân công người phụ trách mới!
                      </div>
                    </div>
                  )}

                  <div className="user-mgmt-form-group">
                    <label className="user-mgmt-form-label">
                      Lý do khóa tài khoản <span style={{ color: '#DC2626' }}>* (Bắt buộc)</span>:
                    </label>
                    <input
                      type="text"
                      required
                      value={lockReason}
                      disabled={lockLoading}
                      onChange={(e) => setLockReason(e.target.value)}
                      placeholder="Nhập lý do khóa cụ thể (ví dụ: Nghỉ việc, vi phạm bảo mật...)"
                      className="user-mgmt-form-input"
                      autoFocus
                    />
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn mở khóa cho tài khoản này? Người dùng sẽ có thể đăng nhập bình
                  thường trở lại vào hệ thống.
                </p>
              )}
            </div>

            <div className="user-mgmt-modal-footer">
              <button
                type="button"
                onClick={() => setLockTargetUser(null)}
                className="user-mgmt-btn-cancel"
                disabled={lockLoading}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLockToggle}
                disabled={lockLoading || (lockActionType === 'LOCK' && !lockReason.trim())}
                className="user-mgmt-btn-submit"
                style={{
                  background:
                    lockActionType === 'LOCK'
                      ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                      : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                }}
              >
                {lockLoading && <RefreshCw size={15} className="animate-spin" />}
                <span>
                  {lockLoading
                    ? 'Đang xử lý...'
                    : lockActionType === 'LOCK'
                      ? 'Xác nhận khóa'
                      : 'Xác nhận mở khóa'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Người Dùng Hàng Loạt Từ Excel (SCRUM-18 / S2-01) */}
      <UserImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingUsers={users}
        onSuccess={(msg) => {
          loadUsers();
          showToast(
            'Nhập dữ liệu thành công!',
            msg || 'Đã hoàn tất nhập danh sách người dùng từ tệp Excel!'
          );
        }}
      />
    </div>
  );
};

export default UserManagementPage;
