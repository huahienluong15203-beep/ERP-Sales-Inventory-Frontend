import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Building2,
  Save,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
  User
} from 'lucide-react';
import type { Warehouse, WarehouseCreatePayload, WarehouseUpdatePayload } from '../../types/warehouse';
import { createWarehouse, updateWarehouse } from '../../services/warehouseApi';
import { fetchAdminUsers } from '../../services/api';

interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseToEdit: Warehouse | null;
  onSuccess: (saved: Warehouse) => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

interface ManagerOption {
  id: number;
  fullName: string;
  username: string;
  email?: string;
  roles: string[];
}

export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({
  isOpen,
  onClose,
  warehouseToEdit,
  onSuccess,
  showToast
}) => {
  const isEdit = Boolean(warehouseToEdit);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [managerId, setManagerId] = useState<number | null>(null);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // S5-03: Tìm kiếm và lọc người phụ trách kho
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'WAREHOUSE' | 'ADMIN' | 'OTHER'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load danh sách nhân sự phụ trách
  const loadManagers = useCallback(async (keyword?: string) => {
    setLoadingManagers(true);
    try {
      const res = await fetchAdminUsers({
        keyword: keyword || undefined,
        size: keyword ? 50 : 100,
        status: 'ACTIVE'
      });
      const users = res.content || [];
      // Lọc bỏ tài khoản đại lý (B2B Customer)
      const list: ManagerOption[] = users
        .filter((u) => !u.roles?.includes('ROLE_CUSTOMER'))
        .map((u) => ({
          id: u.id,
          fullName: u.fullName || u.username,
          username: u.username,
          email: u.email,
          roles: (u.roles || []) as string[]
        }));

      setManagers((prev) => {
        if (!keyword) return list;
        // Hợp nhất kết quả tìm kiếm với danh sách đã có (tránh mất người đang chọn)
        const map = new Map<number, ManagerOption>();
        prev.forEach((item) => map.set(item.id, item));
        list.forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      });
    } catch {
      // Giữ nguyên danh sách nếu có lỗi mạng
    } finally {
      setLoadingManagers(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadManagers();
  }, [isOpen, loadManagers]);

  // Debounce gọi server search khi keyword thay đổi (cho trường hợp hệ thống có nhiều user)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    const timer = setTimeout(() => {
      loadManagers(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, loadManagers]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Trả về nhãn và màu sắc vai trò
  const getRoleBadge = (roles: string[] = []) => {
    if (roles.includes('ROLE_WH_MANAGER')) {
      return { label: 'Quản lý kho', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    }
    if (roles.includes('ROLE_WAREHOUSE')) {
      return { label: 'Thủ kho', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (roles.includes('ROLE_ADMIN')) {
      return { label: 'Admin', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (roles.includes('ROLE_SALES_MANAGER') || roles.includes('ROLE_SALES_REP')) {
      return { label: 'Kinh doanh', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (roles.includes('ROLE_ACCOUNTANT')) {
      return { label: 'Kế toán', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label: 'Nhân viên', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  };

  // Đếm số lượng nhân sự theo từng nhóm vai trò để hiển thị trên chip filter
  const filterCounts = useMemo(() => {
    let whCount = 0;
    let adminCount = 0;
    let otherCount = 0;
    managers.forEach((m) => {
      const isWh = m.roles.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_WAREHOUSE');
      const isAdmin = m.roles.includes('ROLE_ADMIN');
      if (isWh) whCount++;
      else if (isAdmin) adminCount++;
      else otherCount++;
    });
    return {
      all: managers.length,
      warehouse: whCount,
      admin: adminCount,
      other: otherCount
    };
  }, [managers]);

  // Danh sách nhân sự sau khi lọc vai trò & tìm kiếm
  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      // 1. Lọc theo nhóm vai trò
      if (roleFilter === 'WAREHOUSE') {
        const isWh = m.roles.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_WAREHOUSE');
        if (!isWh) return false;
      } else if (roleFilter === 'ADMIN') {
        if (!m.roles.includes('ROLE_ADMIN')) return false;
      } else if (roleFilter === 'OTHER') {
        const isWhOrAdmin = m.roles.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_WAREHOUSE' || r === 'ROLE_ADMIN');
        if (isWhOrAdmin) return false;
      }

      // 2. Tìm kiếm theo từ khóa
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchUsername = m.username.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q) ?? false;
      return matchName || matchUsername || matchEmail;
    });
  }, [managers, roleFilter, searchQuery]);

  // Thông tin nhân sự đang được gán
  const selectedManager = useMemo(() => {
    if (!managerId) return null;
    return managers.find((m) => m.id === managerId) || null;
  }, [managers, managerId]);

  useEffect(() => {
    if (warehouseToEdit) {
      setCode(warehouseToEdit.code);
      setName(warehouseToEdit.name);
      setAddress(warehouseToEdit.address || '');
      setManagerId(warehouseToEdit.manager ? warehouseToEdit.manager.id : null);
      setStatus(warehouseToEdit.status);
    } else {
      setCode('');
      setName('');
      setAddress('');
      setManagerId(null);
      setStatus('ACTIVE');
    }
    setErrorMsg('');
    setIsDropdownOpen(false);
    setSearchQuery('');
    setRoleFilter('ALL');
  }, [warehouseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!isEdit && !cleanCode) {
      setErrorMsg('Vui lòng nhập mã định danh kho hàng');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Vui lòng nhập tên kho hàng');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && warehouseToEdit) {
        const payload: WarehouseUpdatePayload = {
          name: cleanName,
          address: address.trim() || undefined,
          managerId: managerId || null,
          status
        };
        const saved = await updateWarehouse(warehouseToEdit.id, payload);
        showToast('Cập nhật thành công', `Đã lưu thông tin kho [${saved.code}] - ${saved.name}`, 'success');
        onSuccess(saved);
        onClose();
      } else {
        const payload: WarehouseCreatePayload = {
          code: cleanCode,
          name: cleanName,
          address: address.trim() || undefined,
          managerId: managerId || null,
          status: 'ACTIVE'
        };
        const saved = await createWarehouse(payload);
        showToast('Tạo mới thành công', `Đã khởi tạo kho mới [${saved.code}] - ${saved.name}`, 'success');
        onSuccess(saved);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      setErrorMsg(msg);
      showToast('Lỗi lưu kho hàng', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F85606]">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa thông tin kho' : 'Thêm mới kho hàng'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isEdit ? `Mã kho: ${warehouseToEdit?.code}` : 'Khai báo thông tin kho lưu trữ trong hệ thống'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Mã kho & Trạng thái (Trạng thái chỉ hiển thị khi Chỉnh sửa, khi Tạo mới mặc định luôn là Đang hoạt động) */}
          {isEdit ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã định danh kho <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  disabled
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-mono text-sm font-bold cursor-not-allowed"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Mã kho cố định không thể sửa
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Trạng thái hoạt động
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs font-semibold focus:outline-none focus:border-[#F85606] transition cursor-pointer"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã định danh kho <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ví dụ: WH-MB02, KHO-HN"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-mono text-sm font-semibold focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] transition"
                autoFocus
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Chỉ gồm chữ in hoa, số và dấu gạch nối
              </span>
            </div>
          )}

          {/* Tên kho */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tên kho hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Kho Tổng Miền Bắc, Kho Cầu Giấy..."
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] transition"
            />
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Địa chỉ chi tiết
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ số nhà, khu công nghiệp, đường, quận/huyện, tỉnh/thành..."
              className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] transition resize-none"
            />
          </div>

          {/* Quản lý kho phụ trách với bộ lọc và tìm kiếm */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Nhân sự phụ trách kho
              </label>
              {selectedManager && (
                <button
                  type="button"
                  onClick={() => setManagerId(null)}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-medium transition cursor-pointer"
                >
                  Gỡ bỏ người phụ trách
                </button>
              )}
            </div>

            {/* Khung hiển thị nhân sự được chọn / Trigger mở dropdown */}
            <div
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className={`w-full min-h-[42px] px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isDropdownOpen
                  ? 'border-[#F85606] ring-2 ring-orange-100 bg-white'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {selectedManager ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-[#F85606] font-bold text-xs flex items-center justify-center shrink-0">
                    {selectedManager.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {selectedManager.fullName}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      (@{selectedManager.username})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                        getRoleBadge(selectedManager.roles).color
                      }`}
                    >
                      {getRoleBadge(selectedManager.roles).label}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <User size={15} />
                  <span>-- Chưa gán người phụ trách --</span>
                </div>
              )}

              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                  isDropdownOpen ? 'rotate-180 text-[#F85606]' : ''
                }`}
              />
            </div>

            {/* Menu Popover mở lên trên để không che các nút thao tác bên dưới */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Ô tìm kiếm */}
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo họ tên, username..."
                    className="w-full h-9 pl-8 pr-7 text-xs rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:outline-none focus:border-[#F85606] transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* 2. Thanh lọc theo vai trò (Role Filters) */}
                <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                      roleFilter === 'ALL'
                        ? 'bg-[#F85606] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Tất cả ({filterCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('WAREHOUSE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                      roleFilter === 'WAREHOUSE'
                        ? 'bg-[#F85606] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Nhân sự Kho ({filterCounts.warehouse})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('ADMIN')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                      roleFilter === 'ADMIN'
                        ? 'bg-[#F85606] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Quản trị ({filterCounts.admin})
                  </button>
                  {filterCounts.other > 0 && (
                    <button
                      type="button"
                      onClick={() => setRoleFilter('OTHER')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                        roleFilter === 'OTHER'
                          ? 'bg-[#F85606] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Khác ({filterCounts.other})
                    </button>
                  )}
                </div>

                {/* 3. Danh sách người dùng cuộn mượt mà */}
                <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-gray-50 pr-0.5">
                  {/* Tùy chọn bỏ gán */}
                  <div
                    onClick={() => {
                      setManagerId(null);
                      setIsDropdownOpen(false);
                    }}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                      managerId === null
                        ? 'bg-orange-50/70 text-[#F85606] font-bold'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                        <X size={12} />
                      </div>
                      <span>-- Chưa gán người phụ trách --</span>
                    </div>
                    {managerId === null && <Check size={14} className="text-[#F85606]" />}
                  </div>

                  {filteredManagers.map((m) => {
                    const isSelected = managerId === m.id;
                    const badge = getRoleBadge(m.roles);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setManagerId(m.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition pt-2 ${
                          isSelected
                            ? 'bg-orange-50/70 text-[#F85606]'
                            : 'hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-orange-200 text-[#F85606]'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {m.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-semibold truncate ${
                                  isSelected ? 'text-[#F85606]' : 'text-gray-900'
                                }`}
                              >
                                {m.fullName}
                              </span>
                              <span className="text-[11px] text-gray-400 font-mono">
                                (@{m.username})
                              </span>
                            </div>
                            <div className="mt-0.5">
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badge.color}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check size={16} className="text-[#F85606] shrink-0 ml-2" />
                        )}
                      </div>
                    );
                  })}

                  {filteredManagers.length === 0 && (
                    <div className="py-6 text-center text-gray-400 text-xs">
                      {loadingManagers ? 'Đang tìm kiếm...' : 'Không tìm thấy nhân sự phù hợp'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {loadingManagers && !isDropdownOpen && (
              <span className="text-[10px] text-gray-400 mt-0.5 block">Đang tải danh sách nhân sự...</span>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 h-10 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{isEdit ? 'Lưu thay đổi' : 'Tạo kho hàng'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
