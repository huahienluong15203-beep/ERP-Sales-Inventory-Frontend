import React, { useState, useEffect } from 'react';
import { X, Building2, Save, RefreshCw } from '../common/Icons';
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

  // Load danh sách nhân sự phụ trách
  useEffect(() => {
    if (!isOpen) return;
    setLoadingManagers(true);
    fetchAdminUsers({ size: 100 })
      .then((res) => {
        const users = res.content || [];
        // Lấy những user có vai trò quản lý / kho hoặc active
        const list = users.map((u) => ({
          id: u.id,
          fullName: u.fullName || u.username,
          username: u.username
        }));
        setManagers(list);
      })
      .catch(() => {
        setManagers([]);
      })
      .finally(() => setLoadingManagers(false));
  }, [isOpen]);

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

          {/* Mã kho & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã định danh kho <span className="text-rose-500">*</span>
              </label>
              {isEdit ? (
                <input
                  type="text"
                  value={code}
                  disabled
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-mono text-sm font-bold cursor-not-allowed"
                />
              ) : (
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: WH-MB02, KHO-HN"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-mono text-sm font-semibold focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] transition"
                  autoFocus
                />
              )}
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Chỉ gồm chữ in hoa, số và dấu gạch nối
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Trạng thái hoạt động
              </label>
              {isEdit ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs font-semibold focus:outline-none focus:border-[#F85606] transition cursor-pointer"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              ) : (
                <div
                  className="w-full h-10 px-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-700 text-xs font-semibold flex items-center justify-between cursor-not-allowed select-none"
                  title="Kho mới tạo luôn mặc định ở trạng thái Đang hoạt động"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>Đang hoạt động</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                    Mặc định
                  </span>
                </div>
              )}
            </div>
          </div>

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

          {/* Quản lý kho phụ trách */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nhân sự phụ trách kho
            </label>
            <select
              value={managerId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setManagerId(val ? Number(val) : null);
              }}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#F85606] transition cursor-pointer"
            >
              <option value="">-- Chưa gán người phụ trách --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.username})
                </option>
              ))}
            </select>
            {loadingManagers && (
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
