import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  Save,
  RefreshCw,
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

  // S5-03: Ô nhập trực tiếp kiêm chọn dropdown người phụ trách kho
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MANAGER' | 'STAFF'>('ALL');
  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const inputContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);

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
      // S5-03: Chỉ lọc các nhân sự thuộc bộ phận Kho (Quản lý kho hoặc Thủ kho)
      // Loại trừ Admin (toàn quyền hệ thống) và các vai trò không liên quan (Kế toán, Sales, Đại lý)
      const list: ManagerOption[] = users
        .filter((u) => u.roles?.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_WAREHOUSE'))
        .map((u) => ({
          id: u.id,
          fullName: u.fullName || u.username,
          username: u.username,
          email: u.email,
          roles: (u.roles || []) as string[]
        }));

      // Nếu kho đang sửa đã có người phụ trách từ trước thì đảm bảo người đó luôn hiện diện
      if (warehouseToEdit?.manager) {
        const cur = warehouseToEdit.manager;
        const curName = cur.name || cur.fullName || cur.code || cur.username || `Nhân sự #${cur.id}`;
        const curUser = cur.code || cur.username || '';
        if (!list.some((item) => item.id === cur.id)) {
          list.unshift({
            id: cur.id,
            fullName: curName,
            username: curUser,
            roles: []
          });
        }
      }

      setManagers((prev) => {
        if (!keyword) return list;
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

  // Cập nhật vị trí hiển thị của portal dropdown: LUÔN XỔ XUỐNG DƯỚI (DOWNWARD) theo yêu cầu
  const updateDropdownPosition = useCallback(() => {
    if (!inputContainerRef.current) return;
    const rect = inputContainerRef.current.getBoundingClientRect();

    setDropdownPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width
    });
  }, []);

  const openDropdown = () => {
    updateDropdownPosition();
    setIsDropdownOpen(true);
  };

  // Thông tin nhân sự đang được gán
  const selectedManager = useMemo(() => {
    if (!managerId) return null;
    return managers.find((m) => m.id === managerId) || null;
  }, [managers, managerId]);

  // Kiểm tra xem người dùng đang gõ tìm kiếm mới hay đang hiển thị tên người đã chọn
  const isTypingSearch = useMemo(() => {
    if (!selectedManager) return Boolean(inputValue.trim());
    const selectedText = `${selectedManager.fullName} (@${selectedManager.username})`;
    return inputValue.trim() !== selectedText;
  }, [inputValue, selectedManager]);

  const searchKeyword = isTypingSearch ? inputValue.trim().toLowerCase() : '';

  // Debounce gọi server search khi keyword gõ thay đổi
  useEffect(() => {
    if (!searchKeyword || searchKeyword.length < 2) return;
    const timer = setTimeout(() => {
      loadManagers(searchKeyword);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKeyword, loadManagers]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(target) &&
        dropdownPanelRef.current &&
        !dropdownPanelRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isDropdownOpen) {
        updateDropdownPosition();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isDropdownOpen, updateDropdownPosition]);

  // Trả về nhãn và màu sắc vai trò
  const getRoleBadge = (roles: string[] = []) => {
    if (roles.includes('ROLE_WH_MANAGER')) {
      return { label: 'Quản lý kho', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    }
    if (roles.includes('ROLE_WAREHOUSE')) {
      return { label: 'Thủ kho', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: 'Nhân sự kho', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  };

  // Đếm số lượng nhân sự theo từng nhóm vai trò kho để hiển thị trên chip filter
  const filterCounts = useMemo(() => {
    let managerCount = 0;
    let staffCount = 0;
    managers.forEach((m) => {
      if (m.roles.includes('ROLE_WH_MANAGER')) managerCount++;
      else if (m.roles.includes('ROLE_WAREHOUSE')) staffCount++;
    });
    return {
      all: managers.length,
      manager: managerCount,
      staff: staffCount
    };
  }, [managers]);

  // Danh sách nhân sự sau khi lọc vai trò & tìm kiếm
  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      // 1. Lọc theo nhóm chức danh kho
      if (roleFilter === 'MANAGER') {
        if (!m.roles.includes('ROLE_WH_MANAGER')) return false;
      } else if (roleFilter === 'STAFF') {
        if (m.roles.includes('ROLE_WH_MANAGER') || !m.roles.includes('ROLE_WAREHOUSE')) return false;
      }

      // 2. Tìm kiếm theo từ khóa đang gõ
      if (!searchKeyword) return true;
      const matchName = m.fullName.toLowerCase().includes(searchKeyword);
      const matchUsername = m.username.toLowerCase().includes(searchKeyword);
      const matchEmail = m.email?.toLowerCase().includes(searchKeyword) ?? false;
      return matchName || matchUsername || matchEmail;
    });
  }, [managers, roleFilter, searchKeyword]);

  const handleSelectManager = (m: ManagerOption) => {
    setManagerId(m.id);
    setInputValue(`${m.fullName} (@${m.username})`);
    setIsDropdownOpen(false);
  };

  const handleClearManager = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setManagerId(null);
    setInputValue('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (warehouseToEdit) {
      setCode(warehouseToEdit.code);
      setName(warehouseToEdit.name);
      setAddress(warehouseToEdit.address || '');
      const mId = warehouseToEdit.manager ? warehouseToEdit.manager.id : null;
      setManagerId(mId);
      setStatus(warehouseToEdit.status);
      if (warehouseToEdit.manager) {
        const curName = warehouseToEdit.manager.name || warehouseToEdit.manager.fullName || '';
        const curUser = warehouseToEdit.manager.code || warehouseToEdit.manager.username || '';
        setInputValue(curUser && curName ? `${curName} (@${curUser})` : (curName || curUser));
      } else {
        setInputValue('');
      }
    } else {
      setCode('');
      setName('');
      setAddress('');
      setManagerId(null);
      setStatus('ACTIVE');
      setInputValue('');
    }
    setErrorMsg('');
    setIsDropdownOpen(false);
    setRoleFilter('ALL');
  }, [warehouseToEdit, isOpen]);

  // Đồng bộ lại text nếu danh sách managers được nạp sau
  useEffect(() => {
    if (managerId && managers.length > 0 && !isDropdownOpen) {
      const found = managers.find((m) => m.id === managerId);
      if (found) {
        setInputValue(`${found.fullName} (@${found.username})`);
      }
    }
  }, [managerId, managers, isDropdownOpen]);

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
    if (!managerId) {
      setErrorMsg('Vui lòng phân công nhân sự phụ trách kho (Thủ kho / Quản lý)');
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
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 via-white to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100/80 border border-orange-200 flex items-center justify-center text-[#F85606] shadow-xs">
              <Building2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa thông tin kho hàng' : 'Thêm mới kho hàng'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEdit ? `Mã kho: ${warehouseToEdit?.code}` : 'Khai báo thông tin kho lưu trữ trong hệ thống'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Mã kho & Tên kho (hoặc Trạng thái nếu Chỉnh sửa) - Dàn 2 cột rộng rãi */}
          {isEdit ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Mã định danh kho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    disabled
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-mono text-xs sm:text-sm font-bold cursor-not-allowed"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Mã kho cố định không thể sửa
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 transition cursor-pointer shadow-2xs"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tên kho hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Kho Tổng Miền Bắc, Kho Cầu Giấy..."
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs sm:text-sm focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 transition shadow-2xs"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mã định danh kho <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: WH-MB02, KHO-HN"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 font-mono text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 transition shadow-2xs"
                  autoFocus
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Chỉ gồm chữ in hoa, số và dấu gạch nối (-)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tên kho hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Kho Tổng Miền Bắc, Kho Cầu Giấy..."
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs sm:text-sm focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 transition shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Địa chỉ */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Địa chỉ chi tiết
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ số nhà, khu công nghiệp, đường, quận/huyện, tỉnh/thành..."
              className="w-full p-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs sm:text-sm focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 transition resize-none shadow-2xs"
            />
          </div>

          {/* Quản lý kho phụ trách: Bắt buộc chọn nhân sự kho */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Nhân sự phụ trách kho (Thủ kho / Quản lý) <span className="text-rose-500">*</span>
              </label>
              {managerId && (
                <button
                  type="button"
                  onClick={handleClearManager}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold transition cursor-pointer"
                >
                  Đổi người khác
                </button>
              )}
            </div>

            {/* Ô input chính: Cho phép nhập trực tiếp VÀ click chọn */}
            <div
              ref={inputContainerRef}
              className={`w-full min-h-[44px] px-3.5 rounded-xl border transition-all flex items-center gap-2.5 bg-white shadow-2xs ${
                isDropdownOpen
                  ? 'border-[#F85606] ring-2 ring-orange-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <User size={18} className={selectedManager ? 'text-[#F85606] shrink-0' : 'text-gray-400 shrink-0'} />

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onFocus={openDropdown}
                onClick={openDropdown}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (!isDropdownOpen) openDropdown();
                }}
                placeholder="Bấm để chọn thủ kho / quản lý phụ trách kho..."
                className="flex-1 h-9 text-xs text-gray-900 bg-transparent outline-none placeholder:text-gray-400 font-medium cursor-pointer"
              />

              {/* Badge vai trò nếu đã chọn một người */}
              {selectedManager && !isTypingSearch && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-semibold shrink-0 hidden sm:inline-block ${
                    getRoleBadge(selectedManager.roles).color
                  }`}
                >
                  {getRoleBadge(selectedManager.roles).label}
                </span>
              )}

              {/* Nút X xóa nhanh */}
              {(inputValue || managerId) && (
                <button
                  type="button"
                  onClick={handleClearManager}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0"
                  title="Xóa lựa chọn"
                >
                  <X size={14} />
                </button>
              )}

              {/* Mũi tên toggle mở/đóng */}
              <button
                type="button"
                onClick={() => {
                  if (isDropdownOpen) {
                    setIsDropdownOpen(false);
                  } else {
                    openDropdown();
                    inputRef.current?.focus();
                  }
                }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition cursor-pointer shrink-0"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180 text-[#F85606]' : ''
                  }`}
                />
              </button>
            </div>

            {loadingManagers && !isDropdownOpen && (
              <span className="text-[10px] text-gray-400 mt-0.5 block">Đang tải danh sách nhân sự...</span>
            )}
          </div>

          {/* Portal Dropdown Menu hiển thị nổi toàn cục - luôn xổ xuống dưới theo yêu cầu */}
          {isDropdownOpen &&
            dropdownPosition &&
            createPortal(
              <div
                ref={dropdownPanelRef}
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                  zIndex: 100002
                }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-2.5 animate-in fade-in-0 slide-in-from-top-2 duration-150 text-xs"
              >
                {/* 1. Các chip lọc nhanh theo chức danh kho */}
                <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar border-b border-gray-100 pt-0.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setRoleFilter('ALL')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer shrink-0 ${
                      roleFilter === 'ALL'
                        ? 'bg-[#F85606] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Tất cả kho ({filterCounts.all})
                  </button>
                  {filterCounts.manager > 0 && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setRoleFilter('MANAGER')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer shrink-0 ${
                        roleFilter === 'MANAGER'
                          ? 'bg-[#F85606] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Quản lý kho ({filterCounts.manager})
                    </button>
                  )}
                  {filterCounts.staff > 0 && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setRoleFilter('STAFF')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer shrink-0 ${
                        roleFilter === 'STAFF'
                          ? 'bg-[#F85606] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Thủ kho ({filterCounts.staff})
                    </button>
                  )}
                </div>

                {/* 2. Danh sách nhân sự kho */}
                <div className="max-h-56 overflow-y-auto space-y-0.5 divide-y divide-gray-50 pr-0.5">
                  {filteredManagers.map((m) => {
                    const isSelected = managerId === m.id;
                    const badge = getRoleBadge(m.roles);
                    return (
                      <div
                        key={m.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectManager(m)}
                        className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition pt-1.5 ${
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
                      {loadingManagers ? 'Đang truy vấn...' : 'Không tìm thấy nhân sự kho phù hợp'}
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}

          {/* Buttons */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 h-11 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-100 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-[#F85606] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-orange-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
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
