import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '../../../types/product';
import type {
  ProductUnitConversion,
  CreateProductUnitConversionPayload,
  UpdateProductUnitConversionPayload
} from '../../../types/unitConversion';
import { unitConversionService } from '../../../services/unitConversionService';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Scale,
  X,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Barcode,
  Layers,
  Check,
  RefreshCw
} from '../../../components/common/Icons';

interface UnitConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdated?: () => void;
}

const COMMON_CONVERSION_UNITS = [
  'Thùng',
  'Lốc',
  'Két',
  'Khay',
  'Hộp',
  'Bao',
  'Kiện',
  'Thùng carton',
  'Túi lớn',
  'Vỉ'
];

export const UnitConversionModal: React.FC<UnitConversionModalProps> = ({
  isOpen,
  onClose,
  product,
  onUpdated
}) => {
  const { currentRole } = useAuth();

  // Kiểm tra quyền thêm/sửa/xóa đơn vị quy đổi (S2-07)
  const canManageUnits =
    currentRole === 'ROLE_ADMIN' ||
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_WAREHOUSE' ||
    currentRole === 'ROLE_SALES_MANAGER';

  const [units, setUnits] = useState<ProductUnitConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Thêm mới
  const [isAdding, setIsAdding] = useState(false);
  const [newUnitName, setNewUnitName] = useState('Thùng');
  const [newCustomUnitName, setNewCustomUnitName] = useState('');
  const [newFactor, setNewFactor] = useState<number | string>(24);
  const [newBarcode, setNewBarcode] = useState('');
  const [newIsDefaultPurchase, setNewIsDefaultPurchase] = useState(false);
  const [newIsDefaultSale, setNewIsDefaultSale] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Chỉnh sửa hệ số (AC3)
  const [editingUnit, setEditingUnit] = useState<ProductUnitConversion | null>(null);
  const [editFactor, setEditFactor] = useState<number | string>(1);
  const [editBarcode, setEditBarcode] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editIsDefaultPurchase, setEditIsDefaultPurchase] = useState(false);
  const [editIsDefaultSale, setEditIsDefaultSale] = useState(false);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Xác nhận xóa
  const [deletingUnit, setDeletingUnit] = useState<ProductUnitConversion | null>(null);

  const loadUnits = useCallback(async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const data = await unitConversionService.getUnits(product.id, product.sku, product.baseUnit);
      setUnits(data);
    } catch {
      setError('Không thể tải danh sách đơn vị quy đổi của sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen && product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadUnits();
      setIsAdding(false);
      setEditingUnit(null);
      setDeletingUnit(null);
      setError(null);
      setSuccessMsg(null);
      setNewUnitName('Thùng');
      setNewCustomUnitName('');
      setNewFactor(24);
      setNewBarcode('');
      setNewIsDefaultPurchase(false);
      setNewIsDefaultSale(false);
      setNewDescription('');
    }
  }, [isOpen, product, loadUnits]);

  if (!isOpen || !product) return null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const getEffectiveUnitName = () => {
    if (newUnitName === '__OTHER__') {
      return newCustomUnitName.trim();
    }
    return newUnitName.trim();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const unitName = getEffectiveUnitName();
    if (!unitName) {
      setError('Vui lòng chọn hoặc nhập tên đơn vị quy đổi!');
      return;
    }

    const factor = Number(newFactor);
    if (!factor || factor <= 0) {
      setError('Hệ số quy đổi phải là số lớn hơn 0!');
      return;
    }

    if (unitName.toLowerCase() === product.baseUnit.toLowerCase()) {
      setError(`Đơn vị quy đổi '${unitName}' không được trùng với đơn vị cơ sở '${product.baseUnit}'!`);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: CreateProductUnitConversionPayload = {
        unitName,
        conversionFactor: factor,
        barcode: newBarcode.trim() || undefined,
        isDefaultPurchase: newIsDefaultPurchase,
        isDefaultSale: newIsDefaultSale,
        description: newDescription.trim() || undefined
      };

      await unitConversionService.addUnit(product.id, product.sku, product.baseUnit, payload);
      showSuccess(`Đã khai báo đơn vị quy đổi "${unitName}" (Hệ số: ${factor}) thành công!`);
      setIsAdding(false);
      setNewCustomUnitName('');
      loadUnits();
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi khai báo đơn vị quy đổi mới.';
      setError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStartEdit = (u: ProductUnitConversion) => {
    setEditingUnit(u);
    setEditFactor(u.conversionFactor);
    setEditBarcode(u.barcode || '');
    setEditIsDefaultPurchase(Boolean(u.isDefaultPurchase));
    setEditIsDefaultSale(Boolean(u.isDefaultSale));
    setEditStatus(u.status);
    setEditReason('');
    setError(null);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setError(null);

    const factor = Number(editFactor);
    if (!factor || factor <= 0) {
      setError('Hệ số quy đổi phải lớn hơn 0!');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: UpdateProductUnitConversionPayload = {
        conversionFactor: factor,
        barcode: editBarcode.trim() || undefined,
        isDefaultPurchase: editIsDefaultPurchase,
        isDefaultSale: editIsDefaultSale,
        status: editStatus,
        changeReason: editReason.trim() || 'Cập nhật hệ số quy đổi theo quy chuẩn kho'
      };

      await unitConversionService.updateUnit(product.id, editingUnit.id, product.baseUnit, payload);
      showSuccess(`Đã cập nhật hệ số quy đổi đơn vị "${editingUnit.unitName}" thành ${factor}!`);
      setEditingUnit(null);
      loadUnits();
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật hệ số quy đổi.';
      setError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUnit) return;
    setFormSubmitting(true);
    try {
      await unitConversionService.deleteUnit(product.id, deletingUnit.id);
      showSuccess(`Đã xóa đơn vị quy đổi "${deletingUnit.unitName}"!`);
      setDeletingUnit(null);
      loadUnits();
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa đơn vị quy đổi.';
      setError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Scale size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Cài Đặt Đơn Vị Tính Quy Đổi (S2-07)</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30">
                  SCRUM-43
                </span>
              </div>
              <p className="text-xs text-orange-100">
                Cho phép kho gọi hàng theo Thùng/Lốc mà sổ sách luôn quy về đúng Đơn vị tính cơ sở.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông tin SKU & Banners quy tắc */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500 uppercase tracking-wide">Mã SKU:</span>
            <span className="font-mono font-bold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-300">
              {product.sku}
            </span>
            <span className="font-semibold text-gray-800 line-clamp-1 max-w-[280px]" title={product.name}>
              {product.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500">Đơn vị cơ sở chuẩn:</span>
            <span className="font-bold px-2.5 py-1 rounded-lg bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
              {product.baseUnit} (Hệ số: 1.0)
            </span>
          </div>
        </div>

        {/* Thông báo Alert */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Nội dung chính cuộn */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Card nguyên tắc nghiệp vụ cốt lõi (Base Unit Rule) */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Quy tắc Đơn Vị Tính Cơ Sở (Base Unit Rule) & Snapshot Bất Biến:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-blue-800 text-[11px]">
                <li>Mọi số liệu tồn kho, thẻ kho và giao dịch BẮT BUỘC lưu trữ theo <strong>Đơn vị cơ sở ({product.baseUnit})</strong>.</li>
                <li>Đơn vị quy đổi (Thùng, Lốc) chỉ là lớp trình bày khi nhập xuất hàng hoặc giao dịch đại lý.</li>
                <li>Khi chỉnh sửa hệ số quy đổi, hệ thống sẽ lưu AuditLog và giữ nguyên Snapshot lịch sử, <strong>không làm sai lệch các giao dịch cũ đã ghi sổ</strong>.</li>
              </ul>
            </div>
          </div>

          {/* Tiêu đề & Nút Thêm mới */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers size={17} className="text-orange-500" />
                Danh Sách Đơn Vị Tính Khả Dụng ({units.length})
              </h3>
              <p className="text-xs text-gray-500">
                Bao gồm đơn vị tính cơ sở chuẩn và các quy cách quy đổi thùng/lốc của SKU này.
              </p>
            </div>

            {canManageUnits && !isAdding && !editingUnit && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>Khai báo đơn vị mới</span>
              </button>
            )}
          </div>

          {/* Form Thêm Đơn Vị Mới (Inline panel) */}
          {isAdding && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-4 bg-orange-50/50 border-2 border-orange-200 rounded-2xl space-y-3.5 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-orange-200">
                <span className="font-bold text-sm text-orange-950 flex items-center gap-1.5">
                  <Plus size={16} className="text-orange-600" />
                  Khai Báo Đơn Vị Quy Đổi Mới (S2-07 AC1)
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Tên đơn vị */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tên Đơn Vị Quy Đổi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {COMMON_CONVERSION_UNITS.filter((u) => u.toLowerCase() !== product.baseUnit.toLowerCase()).map(
                      (u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      )
                    )}
                    <option value="__OTHER__">Khác (tự nhập tên)...</option>
                  </select>

                  {newUnitName === '__OTHER__' && (
                    <input
                      type="text"
                      required
                      placeholder="VD: Kiện lớn, Khay 12..."
                      value={newCustomUnitName}
                      onChange={(e) => setNewCustomUnitName(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  )}
                </div>

                {/* 2. Hệ số quy đổi về đơn vị cơ sở */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Hệ Số Quy Đổi <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      required
                      placeholder="VD: 24"
                      value={newFactor}
                      onChange={(e) => setNewFactor(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent text-xs font-bold text-gray-900 focus:outline-none"
                    />
                    <span className="bg-gray-100 px-2.5 py-2 text-xs font-semibold text-gray-600 border-l border-gray-200 shrink-0">
                      {product.baseUnit}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    1 {getEffectiveUnitName() || 'đơn vị'} = {newFactor || 0} {product.baseUnit}
                  </span>
                </div>

                {/* 3. Barcode mã vạch quy cách */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mã Vạch Quy Cách (Barcode)
                  </label>
                  <div className="flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                    <input
                      type="text"
                      placeholder="VD: 8934567890123"
                      value={newBarcode}
                      onChange={(e) => setNewBarcode(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent text-xs text-gray-900 focus:outline-none"
                    />
                    <span className="bg-gray-100 px-2.5 py-2 text-gray-400 border-l border-gray-200 shrink-0">
                      <Barcode size={15} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Mô tả & Cài đặt mặc định */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả quy cách đóng gói</label>
                  <input
                    type="text"
                    placeholder="VD: Thùng carton 24 lon 330ml (4 lốc x 6 lon)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 sm:pt-0">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={newIsDefaultPurchase}
                      onChange={(e) => setNewIsDefaultPurchase(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Mặc định khi Nhập kho</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={newIsDefaultSale}
                      onChange={(e) => setNewIsDefaultSale(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Mặc định khi Xuất bán</span>
                  </label>
                </div>
              </div>

              {/* Live Preview Công Thức Quy Đổi */}
              <div className="p-2.5 bg-white border border-orange-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600">Công thức quy đổi tự động:</span>
                <span className="font-mono font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">
                  1 {getEffectiveUnitName() || 'Đơn vị'} = {newFactor || 1} {product.baseUnit}
                </span>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {formSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Lưu Đơn Vị Quy Đổi</span>
                </button>
              </div>
            </form>
          )}

          {/* Form Chỉnh sửa hệ số (AC3 inline modal) */}
          {editingUnit && (
            <form
              onSubmit={handleUpdateSubmit}
              className="p-4 bg-amber-50/70 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <span className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                  <Edit size={16} className="text-amber-700" />
                  Chỉnh Sửa Hệ Số Quy Đổi Đơn Vị: <span className="underline">{editingUnit.unitName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Hệ số quy đổi mới <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      required
                      value={editFactor}
                      onChange={(e) => setEditFactor(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent text-xs font-bold text-gray-900 focus:outline-none"
                    />
                    <span className="bg-gray-100 px-2.5 py-2 text-xs font-semibold text-gray-600 border-l border-gray-200 shrink-0">
                      {product.baseUnit}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Cũ: {editingUnit.conversionFactor} {product.baseUnit} ➔ Mới: {editFactor} {product.baseUnit}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mã Vạch Quy Cách</label>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái áp dụng</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="ACTIVE">Đang áp dụng</option>
                    <option value="INACTIVE">Tạm ngưng sử dụng</option>
                  </select>
                </div>
              </div>

              {/* Bắt buộc lý do thay đổi theo tiêu chuẩn Audit Log S2-04 / S2-07 */}
              <div>
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  Lý Do Thay Đổi Hệ Số Quy Đổi <span className="text-red-500">* (Ghi Audit Log)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nhà cung cấp thay đổi quy cách đóng thùng từ 20 lon sang 24 lon..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-amber-800 mt-1 block italic">
                  * Yên tâm: Thay đổi hệ số này sẽ không ảnh hưởng đến số liệu các phiếu kho/đơn hàng đã phát sinh trước đó.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {formSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Cập Nhật Hệ Số & Ghi Nhật Ký</span>
                </button>
              </div>
            </form>
          )}

          {/* Bảng Danh Sách Đơn Vị Tính */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-3.5">Đơn Vị Tính</th>
                  <th className="py-3 px-3.5 text-center">Loại Đơn Vị</th>
                  <th className="py-3 px-3.5 text-right">Hệ Số Quy Đổi</th>
                  <th className="py-3 px-3.5">Công Thức Quy Đổi</th>
                  <th className="py-3 px-3.5">Mã Vạch</th>
                  <th className="py-3 px-3.5 text-center">Mặc Định</th>
                  <th className="py-3 px-3.5 text-center">Trạng Thái</th>
                  {canManageUnits && <th className="py-3 px-3.5 text-center w-20">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={canManageUnits ? 8 : 7} className="py-8 text-center text-gray-400">
                      Đang tải danh sách đơn vị quy đổi...
                    </td>
                  </tr>
                ) : units.length === 0 ? (
                  <tr>
                    <td colSpan={canManageUnits ? 8 : 7} className="py-8 text-center text-gray-500">
                      Chưa có đơn vị tính nào được khai báo cho SKU này.
                    </td>
                  </tr>
                ) : (
                  units.map((u) => {
                    const isBase = u.isBaseUnit;
                    return (
                      <tr
                        key={u.id || u.unitName}
                        className={`transition-colors hover:bg-orange-50/40 ${
                          isBase ? 'bg-orange-50/20 font-semibold' : 'bg-white'
                        }`}
                      >
                        {/* 1. Tên đơn vị */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{u.unitName}</span>
                            {isBase && (
                              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-[10px] font-bold">
                                ĐVT Cơ Sở
                              </span>
                            )}
                          </div>
                          {u.description && <p className="text-[11px] text-gray-500 mt-0.5">{u.description}</p>}
                        </td>

                        {/* 2. Loại đơn vị */}
                        <td className="py-3 px-3.5 text-center">
                          {isBase ? (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
                              Cơ sở chuẩn (1.0)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-medium">
                              Quy đổi
                            </span>
                          )}
                        </td>

                        {/* 3. Hệ số */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-gray-900 text-sm">
                          {u.conversionFactor}
                        </td>

                        {/* 4. Công thức */}
                        <td className="py-3 px-3.5 font-mono text-xs text-gray-700">
                          {u.formula || `1 ${u.unitName} = ${u.conversionFactor} ${product.baseUnit}`}
                        </td>

                        {/* 5. Mã vạch */}
                        <td className="py-3 px-3.5 font-mono text-gray-500 text-[11px]">
                          {u.barcode || <span className="text-gray-300 italic">Chưa có</span>}
                        </td>

                        {/* 6. Mặc định */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex flex-col items-center gap-1 text-[10px]">
                            {u.isDefaultPurchase && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                Nhập kho
                              </span>
                            )}
                            {u.isDefaultSale && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                Xuất bán
                              </span>
                            )}
                            {!u.isDefaultPurchase && !u.isDefaultSale && (
                              <span className="text-gray-300">—</span>
                            )}
                          </div>
                        </td>

                        {/* 7. Trạng thái */}
                        <td className="py-3 px-3.5 text-center">
                          {u.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                              <Check size={11} />
                              Áp dụng
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px]">
                              Tạm ngưng
                            </span>
                          )}
                        </td>

                        {/* 8. Thao tác */}
                        {canManageUnits && (
                          <td className="py-3 px-3.5 text-center">
                            {isBase ? (
                              <span className="text-gray-400 text-[11px] italic" title="Đơn vị cơ sở không được sửa hoặc xóa">
                                Cố định
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  title="Chỉnh sửa hệ số (Ghi Audit Log)"
                                  onClick={() => handleStartEdit(u)}
                                  className="p-1 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Xóa đơn vị quy đổi"
                                  onClick={() => setDeletingUnit(u)}
                                  className="p-1 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500">
            Tổng cộng: <strong className="text-gray-900">{units.length}</strong> đơn vị khả dụng của SKU {product.sku}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* Modal Xác Nhận Xóa Đơn Vị Quy Đổi */}
        {deletingUnit && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 space-y-3 animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
                <Trash2 size={20} />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-gray-900">Xác Nhận Xóa Đơn Vị Quy Đổi?</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Bạn có chắc chắn muốn xóa đơn vị <strong>"{deletingUnit.unitName}"</strong> (Hệ số: {deletingUnit.conversionFactor}) khỏi SKU {product.sku}?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingUnit(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
                >
                  {formSubmitting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
