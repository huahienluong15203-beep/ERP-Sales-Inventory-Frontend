import React, { useState, useEffect } from 'react';
import { X, Layers, Save, RefreshCw } from '../common/Icons';
import type {
  Warehouse,
  WarehouseLocation,
  LocationType,
  WarehouseLocationCreatePayload,
  WarehouseLocationUpdatePayload
} from '../../types/warehouse';
import { createWarehouseLocation, updateWarehouseLocation } from '../../services/warehouseApi';

interface WarehouseLocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse;
  locationToEdit: WarehouseLocation | null;
  onSuccess: (saved: WarehouseLocation) => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string; desc: string }[] = [
  { value: 'ZONE', label: 'Phân khu (Khu vực)', desc: 'Khu vực lớn trong kho, ví dụ: Khu Hàng Khô, Khu Đóng Gói' },
  { value: 'RACK', label: 'Kệ hàng', desc: 'Dãy kệ đứng chứa hàng, ví dụ: Kệ 01, Dãy Kệ B' },
  { value: 'SHELF', label: 'Tầng giá', desc: 'Tầng trên kệ đỡ, ví dụ: Tầng 1, Tầng 2' },
  { value: 'BIN', label: 'Ô / Ngăn chứa', desc: 'Vị trí ngăn/ô cụ thể để nhặt hàng, ví dụ: Ô A1-01' }
];

export const WarehouseLocationFormModal: React.FC<WarehouseLocationFormModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  locationToEdit,
  onSuccess,
  showToast
}) => {
  const isEdit = Boolean(locationToEdit);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('ZONE');
  const [zone, setZone] = useState('');
  const [shelf, setShelf] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (locationToEdit) {
      setCode(locationToEdit.code);
      setName(locationToEdit.name);
      setLocationType(locationToEdit.locationType || 'ZONE');
      setZone(locationToEdit.zone || '');
      setShelf(locationToEdit.shelf || '');
      setDescription(locationToEdit.description || '');
      setStatus(locationToEdit.status);
    } else {
      setCode('');
      setName('');
      setLocationType('ZONE');
      setZone('');
      setShelf('');
      setDescription('');
      setStatus('ACTIVE');
    }
    setErrorMsg('');
  }, [locationToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!isEdit && !cleanCode) {
      setErrorMsg('Vui lòng nhập mã vị trí lưu trữ');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Vui lòng nhập tên vị trí lưu trữ');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && locationToEdit) {
        const payload: WarehouseLocationUpdatePayload = {
          name: cleanName,
          locationType,
          zone: zone.trim() || undefined,
          shelf: shelf.trim() || undefined,
          description: description.trim() || undefined,
          status
        };
        const saved = await updateWarehouseLocation(warehouse.id, locationToEdit.id, payload);
        showToast('Cập nhật thành công', `Đã lưu vị trí [${saved.code}] - ${saved.name}`, 'success');
        onSuccess(saved);
        onClose();
      } else {
        const payload: WarehouseLocationCreatePayload = {
          code: cleanCode,
          name: cleanName,
          locationType,
          zone: zone.trim() || undefined,
          shelf: shelf.trim() || undefined,
          description: description.trim() || undefined,
          status: 'ACTIVE'
        };
        const saved = await createWarehouseLocation(warehouse.id, payload);
        showToast('Tạo mới thành công', `Đã thêm vị trí [${saved.code}] vào kho ${warehouse.name}`, 'success');
        onSuccess(saved);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      setErrorMsg(msg);
      showToast('Lỗi lưu vị trí', msg, 'error');
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
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa vị trí lưu kho' : 'Thêm mới vị trí lưu kho'}
              </h3>
              <p className="text-[11px] text-gray-500">
                Kho: <strong className="text-gray-700">{warehouse.name}</strong>
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

          {/* Phân loại vị trí */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phân loại vị trí <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOCATION_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLocationType(opt.value)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    locationType === opt.value
                      ? 'border-[#F85606] bg-orange-50/50 text-[#F85606] font-bold shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mã vị trí & Trạng thái (Trạng thái chỉ hiển thị khi Chỉnh sửa, khi Tạo mới mặc định luôn là Đang sử dụng) */}
          {isEdit ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã vị trí <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  disabled
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-mono text-sm font-bold cursor-not-allowed"
                />
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
                  <option value="ACTIVE">Đang sử dụng</option>
                  <option value="INACTIVE">Tạm khóa / Ngừng dùng</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã vị trí <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ví dụ: A-01-01, KHU-A"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-mono text-sm font-semibold focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] transition"
                autoFocus
              />
            </div>
          )}

          {/* Tên vị trí */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tên vị trí chi tiết <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Khu Hàng Khô, Kệ Sữa Bột Dãy 1, Ô Chứa A-01..."
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] transition"
            />
          </div>

          {/* Phân khu & Tên kệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên phân khu (Zone)
              </label>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Ví dụ: Khu A, Khu Hàng Nặng"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#F85606] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên kệ đỡ (Shelf/Rack)
              </label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                placeholder="Ví dụ: Kệ 01, Dãy B"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#F85606] transition"
              />
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ghi chú mô tả vị trí
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm về sức chứa, mặt hàng ưu tiên xếp tại đây..."
              className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#F85606] transition resize-none"
            />
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
                  <span>{isEdit ? 'Lưu thay đổi' : 'Thêm vị trí'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
