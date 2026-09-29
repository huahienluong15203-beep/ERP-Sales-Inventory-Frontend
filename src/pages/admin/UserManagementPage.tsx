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
  type AdminUserItem,
  type AdminFormOptions,
  type CreateAdminUserPayload,
  type UpdateAdminUserPayload,
  type UpdateAssignmentsPayload
} from '../../services/api';
import type { RoleName } from '../../types/user';
import { ROLE_METADATA_MAP } from '../../types/user';
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
  ChevronLeft,
  ChevronRight,
  Filter
} from '../../components/common/Icons';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Danh sách người dùng & phân trang
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(20); // Mặc định 20 dòng theo tiêu chuẩn S1-09
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc tìm kiếm
  const [keyword, setKeyword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

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

  // Modal Thêm Tài Khoản (S1-08)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
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
        keyword: keyword.trim() || undefined,
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
  }, [keyword, selectedRole, selectedStatus, page, size]);

  // Tải danh mục vai trò/kho/địa bàn lúc khởi động
  useEffect(() => {
    fetchAdminFormOptions().then((opts) => setFormOptions(opts));
  }, []);

  // Gọi API mỗi khi thay đổi filter hoặc page
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Tìm kiếm tức thời khi nhập
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadUsers();
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setKeyword('');
    setSelectedRole('');
    setSelectedStatus('');
    setPage(0);
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
    if (createForm.roles.length === 0) {
      setCreateError('Vui lòng chọn ít nhất 1 vai trò cho người dùng.');
      return;
    }

    // Kiểm tra quy tắc kho cho thủ kho
    const isWhStaff = createForm.roles.some((r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER');
    if (isWhStaff && (!createForm.warehouseIds || createForm.warehouseIds.length === 0)) {
      setCreateError('Nhân sự thuộc vai trò Kho bắt buộc phải gán ít nhất một kho phụ trách!');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await createAdminUser(createForm);
      if (result.success) {
        setIsCreateModalOpen(false);
        setActionAlert({
          type: 'success',
          message:
            result.message ||
            'Tạo tài khoản thành công! Mật khẩu tạm và email kích hoạt đã được gửi tới nhân viên.'
        });
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
    setEditAssignmentsForm({
      roles: [...target.roles],
      warehouseIds: target.warehouses.map((w) => w.id),
      regionIds: target.regions.map((r) => r.id)
    });
    setIsEditModalOpen(true);
  };

  // Submit lưu thông tin cơ bản (S1-08)
  const handleUpdateInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await updateAdminUser(editingUser.id, editInfoForm);
      if (res.success) {
        setIsEditModalOpen(false);
        setActionAlert({
          type: 'success',
          message: 'Cập nhật thông tin tài khoản thành công!'
        });
        loadUsers();
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

    if (editAssignmentsForm.roles.length === 0) {
      setEditError('Người dùng phải có ít nhất một vai trò!');
      return;
    }

    const isWhStaff = editAssignmentsForm.roles.some(
      (r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER'
    );
    if (isWhStaff && (!editAssignmentsForm.warehouseIds || editAssignmentsForm.warehouseIds.length === 0)) {
      setEditError('Nhân sự Kho bắt buộc phải được gán ít nhất một kho hàng!');
      return;
    }

    setEditLoading(true);
    try {
      const res = await updateAdminAssignments(editingUser.id, editAssignmentsForm);
      if (res.success) {
        setIsEditModalOpen(false);
        setActionAlert({
          type: 'success',
          message: 'Cập nhật phân quyền, kho và địa bàn thành công!'
        });
        loadUsers();
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
      alert('Không thể khóa chính tài khoản của bạn đang đăng nhập!');
      return;
    }
    setLockTargetUser(target);
    setLockActionType(target.status === 'LOCKED' ? 'UNLOCK' : 'LOCK');
    setLockReason('Quản trị viên tạm khóa tài khoản để rà soát');
  };

  // Submit Khóa / Mở Khóa (S1-10)
  const handleConfirmLockToggle = async () => {
    if (!lockTargetUser) return;
    setLockLoading(true);
    try {
      if (lockActionType === 'LOCK') {
        const res = await lockAdminUser(lockTargetUser.id, lockReason);
        if (res.success) {
          setActionAlert({
            type: 'success',
            message: `Đã khóa tài khoản [${lockTargetUser.username}] thành công.`
          });
          loadUsers();
        } else {
          setActionAlert({ type: 'error', message: res.message });
        }
      } else {
        const res = await unlockAdminUser(lockTargetUser.id);
        if (res.success) {
          setActionAlert({
            type: 'success',
            message: `Đã mở khóa tài khoản [${lockTargetUser.username}] thành công.`
          });
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

  // Avatar helper
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Badge màu theo vai trò
  const getRoleBadgeClass = (role: RoleName) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ROLE_SALES_MANAGER':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ROLE_SALES_REP':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ROLE_WH_MANAGER':
      case 'ROLE_WAREHOUSE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ROLE_ACCOUNTANT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ROLE_CUSTOMER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút Tạo tài khoản */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Users size={24} />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Quản Lý Tài Khoản & Nhân Sự
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Quản trị danh sách nhân sự, phân quyền vai trò, gán kho, địa bàn và quản lý trạng thái tài khoản
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsers()}
            disabled={loading}
            title="Làm mới danh sách"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-orange-600' : ''} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium rounded-lg shadow-sm shadow-orange-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Thêm Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo thông điệp hệ thống */}
      {actionAlert && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {actionAlert.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{actionAlert.message}</div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Thanh Tìm Kiếm & Bộ Lọc (S1-09) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Ô Tìm Kiếm theo từ khóa */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, tài khoản, số điện thoại..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>

          {/* Lọc theo Vai Trò */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              >
                <option value="">Tất cả vai trò</option>
                {formOptions.roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_METADATA_MAP[r]?.label || r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lọc theo Trạng Thái */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </div>

          {/* Nút Tìm kiếm & Reset */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Filter size={16} />
              <span>Lọc</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              className="px-3 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-sm font-medium rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Danh Sách Tài Khoản (S1-09: 20 dòng/trang) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Tài Khoản / Nhân Sự</th>
                <th className="py-3.5 px-4">Thông Tin Liên Hệ</th>
                <th className="py-3.5 px-4">Vai Trò Phân Quyền</th>
                <th className="py-3.5 px-4">Kho & Địa Bàn</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-orange-600" />
                      <span>Đang tải dữ liệu danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={36} className="text-slate-300" />
                      <span className="font-medium text-slate-700">Không tìm thấy tài khoản nào</span>
                      <span className="text-xs text-slate-400">
                        Thử điều chỉnh lại từ khóa tìm kiếm hoặc bỏ chọn các điều kiện lọc
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((item) => {
                  const isLocked = item.status === 'LOCKED';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLocked ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Cột 1: Tên & Username */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                            {getInitials(item.fullName)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {item.fullName}
                              {currentUser?.username === item.username && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-normal">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">@{item.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Email & SĐT */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Mail size={14} className="text-slate-400 shrink-0" />
                            <span>{item.email}</span>
                          </div>
                          {item.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone size={14} className="text-slate-400 shrink-0" />
                              <span>{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Vai trò */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.roles.map((r) => (
                            <span
                              key={r}
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getRoleBadgeClass(
                                r
                              )}`}
                            >
                              {ROLE_METADATA_MAP[r]?.label || r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Cột 4: Kho & Địa bàn */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-1 text-xs">
                          {item.warehouses && item.warehouses.length > 0 ? (
                            <div className="flex items-start gap-1 text-slate-700">
                              <WarehouseIcon size={14} className="text-amber-600 shrink-0 mt-0.5" />
                              <span className="truncate">
                                {item.warehouses.map((w) => w.name).join(', ')}
                              </span>
                            </div>
                          ) : null}

                          {item.regions && item.regions.length > 0 ? (
                            <div className="flex items-start gap-1 text-slate-600">
                              <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
                              <span className="truncate">
                                {item.regions.map((reg) => reg.name).join(', ')}
                              </span>
                            </div>
                          ) : null}

                          {(!item.warehouses || item.warehouses.length === 0) &&
                            (!item.regions || item.regions.length === 0) && (
                              <span className="text-slate-400 italic">Trụ sở chính & Toàn quốc</span>
                            )}
                        </div>
                      </td>

                      {/* Cột 5: Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <Lock size={12} />
                            Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Sửa thông tin & Phân quyền"
                            className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenLockModal(item)}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            disabled={currentUser?.username === item.username}
                            className={`p-1.5 rounded-lg transition-colors ${
                              currentUser?.username === item.username
                                ? 'text-slate-300 cursor-not-allowed'
                                : isLocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-red-500 hover:bg-red-50'
                            }`}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-slate-900">
              {totalElements === 0 ? 0 : page * size + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-slate-900">
              {Math.min((page + 1) * size, totalElements)}
            </span>{' '}
            trên tổng <span className="font-semibold text-slate-900">{totalElements}</span> tài khoản{' '}
            <span className="text-slate-400 font-normal">(Mặc định 20 dòng/trang)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Trước</span>
            </button>

            <span className="px-3 py-1 font-medium text-slate-800">
              Trang {page + 1} / {totalPages || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TẠO TÀI KHOẢN MỚI (S1-08 / S1-09)              */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-500 text-white rounded-lg">
                  <Plus size={20} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tạo Tài Khoản Mới</h3>
                  <p className="text-xs text-slate-500">
                    Tài khoản được cấp mật khẩu tạm ngẫu nhiên và gửi qua email kích hoạt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Thông báo lỗi nếu trùng tài khoản/email/sđt (S1-08) */}
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Nhắc nhở quy trình mật khẩu tạm */}
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-start gap-2">
                <Mail size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Quy chuẩn S1-08:</strong> Hệ thống sẽ tự động tạo mật khẩu tạm bảo mật và
                  gửi email kích hoạt tới địa chỉ email của nhân viên. Khi đăng nhập lần đầu, nhân viên
                  bắt buộc phải đổi mật khẩu mới.
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đăng nhập (Username) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, username: e.target.value.toLowerCase().trim() })
                    }
                    placeholder="ví dụ: tran.minh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[11px] text-slate-400">Từ 3-50 ký tự, không dấu</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên đầy đủ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="ví dụ: Trần Văn Minh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email nhận mật khẩu tạm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value.trim() })}
                    placeholder="minh.tran@erp.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone || ''}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value.trim() })}
                    placeholder="0912345678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Chọn vai trò (S1-09) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Phân quyền vai trò <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formOptions.roles.map((r) => {
                    const isChecked = createForm.roles.includes(r);
                    return (
                      <label
                        key={r}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-orange-50/70 border-orange-300 text-orange-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm({ ...createForm, roles: [...createForm.roles, r] });
                            } else {
                              setCreateForm({
                                ...createForm,
                                roles: createForm.roles.filter((role) => role !== r)
                              });
                            }
                          }}
                          className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <div>{ROLE_METADATA_MAP[r]?.label || r}</div>
                          <div className="text-[10px] text-slate-500">
                            {ROLE_METADATA_MAP[r]?.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Gán Kho (Bắt buộc với vai trò Kho) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Kho hàng phụ trách</span>
                  {createForm.roles.some((r) => r === 'ROLE_WAREHOUSE' || r === 'ROLE_WH_MANAGER') && (
                    <span className="text-amber-600 text-[11px] font-normal">
                      * Bắt buộc ít nhất 1 kho đối với Thủ kho / Quản lý kho
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formOptions.warehouses.map((wh) => {
                    const isChecked = createForm.warehouseIds?.includes(wh.id);
                    return (
                      <label
                        key={wh.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
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
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>{wh.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Gán Địa bàn (Kinh doanh) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Địa bàn phụ trách (Nhân viên kinh doanh / Đại lý)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formOptions.regions.map((reg) => {
                    const isChecked = createForm.regionIds?.includes(reg.id);
                    return (
                      <label
                        key={reg.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
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
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{reg.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {createLoading && <RefreshCw size={16} className="animate-spin" />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Cập Nhật Tài Khoản: @{editingUser.username}
                </h3>
                <p className="text-xs text-slate-500">{editingUser.fullName}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
              <button
                onClick={() => {
                  setEditTab('info');
                  setEditError(null);
                }}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  editTab === 'info'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                1. Thông tin cá nhân (S1-08)
              </button>
              <button
                onClick={() => {
                  setEditTab('assignments');
                  setEditError(null);
                }}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  editTab === 'assignments'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                2. Phân quyền & Kho / Địa bàn (S1-09)
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Tab 1: Thông tin cơ bản */}
              {editTab === 'info' && (
                <form onSubmit={handleUpdateInfoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      required
                      value={editInfoForm.fullName}
                      onChange={(e) =>
                        setEditInfoForm({ ...editInfoForm, fullName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={editInfoForm.email}
                      onChange={(e) =>
                        setEditInfoForm({ ...editInfoForm, email: e.target.value.trim() })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={editInfoForm.phone || ''}
                      onChange={(e) =>
                        setEditInfoForm({ ...editInfoForm, phone: e.target.value.trim() })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                    >
                      {editLoading && <RefreshCw size={16} className="animate-spin" />}
                      <span>Lưu thông tin</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Phân quyền & Kho / Địa bàn */}
              {editTab === 'assignments' && (
                <form onSubmit={handleUpdateAssignmentsSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Vai trò người dùng
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formOptions.roles.map((r) => {
                        const isChecked = editAssignmentsForm.roles.includes(r);
                        return (
                          <label
                            key={r}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                              isChecked
                                ? 'bg-orange-50 border-orange-300 text-orange-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditAssignmentsForm({
                                    ...editAssignmentsForm,
                                    roles: [...editAssignmentsForm.roles, r]
                                  });
                                } else {
                                  setEditAssignmentsForm({
                                    ...editAssignmentsForm,
                                    roles: editAssignmentsForm.roles.filter((item) => item !== r)
                                  });
                                }
                              }}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span>{ROLE_METADATA_MAP[r]?.label || r}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kho phụ trách */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Kho hàng phụ trách
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formOptions.warehouses.map((wh) => {
                        const isChecked = editAssignmentsForm.warehouseIds?.includes(wh.id);
                        return (
                          <label
                            key={wh.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
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
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>{wh.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Địa bàn phụ trách */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Địa bàn phụ trách
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formOptions.regions.map((reg) => {
                        const isChecked = editAssignmentsForm.regionIds?.includes(reg.id);
                        return (
                          <label
                            key={reg.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                              isChecked
                                ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
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
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>{reg.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                    >
                      {editLoading && <RefreshCw size={16} className="animate-spin" />}
                      <span>Lưu phân quyền</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN (S1-10)       */}
      {/* ======================================================== */}
      {lockTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`p-3 rounded-full ${
                  lockActionType === 'LOCK' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {lockActionType === 'LOCK' ? <Lock size={24} /> : <Unlock size={24} />}
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lockActionType === 'LOCK' ? 'Khóa Tài Khoản Người Dùng' : 'Mở Khóa Tài Khoản'}
                </h3>
                <p className="text-xs text-slate-500">
                  Tài khoản: <strong>@{lockTargetUser.username}</strong> ({lockTargetUser.fullName})
                </p>
              </div>
            </div>

            {lockActionType === 'LOCK' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Khi bị khóa, người dùng sẽ bị từ chối đăng nhập vào hệ thống ngay lập tức và các phiên
                  làm việc hiện tại sẽ bị thu hồi.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lý do khóa tài khoản:
                  </label>
                  <input
                    type="text"
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="ví dụ: Nghỉ việc, kiểm tra bảo mật..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Bạn có chắc chắn muốn mở khóa cho tài khoản này? Người dùng sẽ có thể đăng nhập bình
                thường trở lại.
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLockTargetUser(null)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLockToggle}
                disabled={lockLoading}
                className={`flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg shadow-sm transition-all ${
                  lockActionType === 'LOCK'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {lockLoading && <RefreshCw size={16} className="animate-spin" />}
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
    </div>
  );
};
export default UserManagementPage;
