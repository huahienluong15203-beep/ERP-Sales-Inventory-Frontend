import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Agency, DeliveryPoint, CreateDeliveryPointPayload, UpdateDeliveryPointPayload } from '../../types/agency';
import {
  fetchDeliveryPointsByAgency,
  createDeliveryPoint,
  updateDeliveryPoint,
  setDefaultDeliveryPoint,
  deleteDeliveryPoint
} from '../../services/agencyApi';
import {
  Truck,
  MapPin,
  User,
  Phone,
  Plus,
  Edit,
  Trash2,
  Star,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Building2,
  ShoppingCart,
  Info
} from '../common/Icons';
import { AddressPicker } from '../common/AddressPicker';

interface DeliveryPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onPointsUpdated?: () => void;
}

export const DeliveryPointsModal: React.FC<DeliveryPointsModalProps> = ({
  isOpen,
  onClose,
  agency,
  onPointsUpdated
}) => {
  // Tab chế độ: Danh sách (LIST) | Thêm/Sửa (FORM) | Mô phỏng đơn hàng (SIMULATION)
  const [activeTab, setActiveTab] = useState<'LIST' | 'FORM' | 'SIMULATION'>('LIST');

  // Dữ liệu điểm giao hàng
  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Thông báo phản hồi
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [editingPoint, setEditingPoint] = useState<DeliveryPoint | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [addressComplete, setAddressComplete] = useState(false);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [routeNotes, setRouteNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Xác nhận xóa
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Mô phỏng lên đơn hàng (AC 3)
  const [simulatedSelectedPointId, setSimulatedSelectedPointId] = useState<string>('');
  const [simulatedOrderCreated, setSimulatedOrderCreated] = useState(false);

  // Tải danh sách điểm giao hàng của đại lý
  const loadPoints = useCallback(async () => {
    if (!agency) return;
    setLoading(true);
    try {
      const data = await fetchDeliveryPointsByAgency(agency.id);
      setPoints(data);
      // Đặt mặc định cho dropdown mô phỏng lên đơn
      const def = data.find((p) => p.isDefault) || data[0];
      if (def) {
        setSimulatedSelectedPointId(def.id);
      }
    } catch {
      setNotice({ type: 'error', message: 'Không thể tải danh sách điểm giao hàng!' });
    } finally {
      setLoading(false);
    }
  }, [agency]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isOpen && agency) {
      loadPoints();
      setActiveTab('LIST');
      setNotice(null);
      setFormError(null);
      setConfirmDeleteId(null);
      setSimulatedOrderCreated(false);
    }
  }, [isOpen, agency, loadPoints]);

  if (!isOpen || !agency) return null;

  // Reset form khi mở thêm mới
  const handleOpenAddForm = () => {
    setEditingPoint(null);
    setName('');
    setAddress('');
    setContactPerson('');
    setPhone('');
    setRouteNotes('');
    // Nếu chưa có điểm giao hàng nào, điểm đầu tiên bắt buộc làm mặc định
    setIsDefault(points.length === 0);
    setFormError(null);
    setActiveTab('FORM');
  };

  // Mở form chỉnh sửa
  const handleOpenEditForm = (point: DeliveryPoint) => {
    setEditingPoint(point);
    setName(point.name);
    setAddress(point.address);
    setContactPerson(point.contactPerson);
    setPhone(point.phone);
    setRouteNotes(point.routeNotes || '');
    setIsDefault(point.isDefault);
    setFormError(null);
    setActiveTab('FORM');
  };

  // Quay lại danh sách
  const handleBackToList = () => {
    setEditingPoint(null);
    setFormError(null);
    setActiveTab('LIST');
  };

  // Đổi điểm mặc định (AC 2)
  const handleSetDefault = async (point: DeliveryPoint) => {
    if (point.isDefault) return;
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await setDefaultDeliveryPoint(point.id, agency.id);
      if (res.success) {
        setNotice({ type: 'success', message: `Đã đặt "${point.name}" làm điểm giao hàng mặc định.` });
        await loadPoints();
        onPointsUpdated?.();
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch {
      setNotice({ type: 'error', message: 'Lỗi khi cập nhật điểm mặc định.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Xóa điểm giao hàng
  const handleDeletePoint = async (pointId: string) => {
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await deleteDeliveryPoint(pointId, agency.id);
      if (res.success) {
        setNotice({ type: 'success', message: res.message });
        setConfirmDeleteId(null);
        await loadPoints();
        onPointsUpdated?.();
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch {
      setNotice({ type: 'error', message: 'Lỗi khi xóa điểm giao hàng.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit form Thêm mới / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate bắt buộc (AC 1)
    if (!name.trim()) {
      setFormError('Vui lòng nhập Tên điểm giao hàng (ví dụ: Kho Tổng, Kho Phụ, Showroom...)');
      return;
    }
    // Địa chỉ cũ (chưa theo đơn vị hành chính mới) mà người dùng không sửa thì vẫn cho lưu các trường khác
    const unchangedLegacyAddress = Boolean(editingPoint && address.trim() && address === editingPoint.address);
    if (!addressComplete && !unchangedLegacyAddress) {
      setFormError('Vui lòng chọn Tỉnh/Thành, Xã/Phường và nhập số nhà, tên đường của điểm giao hàng');
      return;
    }
    if (!contactPerson.trim()) {
      setFormError('Vui lòng nhập Tên người nhận hàng tại điểm giao (thủ kho / đại diện)');
      return;
    }
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) {
      setFormError('Vui lòng nhập Số điện thoại người nhận hàng');
      return;
    }
    if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(cleanPhone)) {
      setFormError('Số điện thoại người nhận không hợp lệ! Vui lòng nhập đúng định dạng 10 chữ số (VD: 0912345678).');
      return;
    }

    setActionLoading(true);
    try {
      if (editingPoint) {
        // Cập nhật
        const payload: UpdateDeliveryPointPayload = {
          name: name.trim(),
          address: address.trim(),
          contactPerson: contactPerson.trim(),
          phone: cleanPhone,
          routeNotes: routeNotes.trim() || undefined,
          isDefault: isDefault || points.length === 1 // nếu chỉ có 1 điểm thì luôn là mặc định
        };
        const res = await updateDeliveryPoint(editingPoint.id, payload, agency.id);
        if (res.success) {
          setNotice({ type: 'success', message: res.message });
          await loadPoints();
          onPointsUpdated?.();
          setActiveTab('LIST');
        } else {
          setFormError(res.message);
        }
      } else {
        // Thêm mới
        const payload: CreateDeliveryPointPayload = {
          agencyId: agency.id,
          name: name.trim(),
          address: address.trim(),
          contactPerson: contactPerson.trim(),
          phone: cleanPhone,
          routeNotes: routeNotes.trim() || undefined,
          isDefault: isDefault || points.length === 0
        };
        const res = await createDeliveryPoint(payload);
        if (res.success) {
          setNotice({ type: 'success', message: res.message });
          await loadPoints();
          onPointsUpdated?.();
          setActiveTab('LIST');
        } else {
          setFormError(res.message);
        }
      }
    } catch {
      setFormError('Lỗi kết nối khi lưu điểm giao hàng. Vui lòng thử lại!');
    } finally {
      setActionLoading(false);
    }
  };

  // Điểm giao hàng được chọn trong mô phỏng lên đơn
  const simulatedSelectedPoint = points.find((p) => p.id === simulatedSelectedPointId) || points.find((p) => p.isDefault) || points[0];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* ======================================================== */}
        {/* HEADER MODAL */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-orange-50/60 via-white to-orange-50/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#F85606]/10 text-[#F85606] flex items-center justify-center shadow-xs">
              <Truck size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Quản Lý Điểm Giao Hàng Đại Lý
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Building2 size={13} className="text-gray-400" />
                <span className="font-semibold text-gray-700">{agency.name}</span>
                <span>•</span>
                <span>{points.length} điểm giao hàng đã khai báo</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* ======================================================== */}
        {/* BANNER TAB NAVIGATION */}
        {/* ======================================================== */}
        <div className="px-6 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'LIST'
                  ? 'border-[#F85606] text-[#F85606]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Truck size={14} />
              <span>Danh Sách Điểm Giao ({points.length})</span>
            </button>

            <button
              onClick={() => {
                if (activeTab !== 'FORM') handleOpenAddForm();
              }}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'FORM'
                  ? 'border-[#F85606] text-[#F85606]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Plus size={14} />
              <span>{editingPoint ? `Sửa: ${editingPoint.name}` : 'Thêm Điểm Giao Mới'}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('SIMULATION');
                setSimulatedOrderCreated(false);
              }}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'SIMULATION'
                  ? 'border-[#F85606] text-[#F85606]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
              title="Kiểm chứng AC 3: Khi lên đơn hàng chỉ chọn điểm giao trong danh sách của đúng đại lý đó"
            >
              <ShoppingCart size={14} />
              <span>Mô Phỏng Lên Đơn (AC 3)</span>
            </button>
          </div>

          {activeTab === 'LIST' && (
            <button
              onClick={handleOpenAddForm}
              className="my-1.5 px-3 py-1.5 rounded-lg bg-[#F85606] hover:bg-[#d04602] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm Kho Mới</span>
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* TOAST / NOTICE POP-UP (Cố định ở trên, không trôi khi cuộn) */}
        {/* ======================================================== */}
        {notice && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 shrink-0 ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
              )}
              <span className="font-medium">{notice.message}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-gray-400 hover:text-gray-700 cursor-pointer ml-2"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* BODY NỘI DUNG CUỘN ĐƯỢC */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* TAB 1: DANH SÁCH ĐIỂM GIAO HÀNG */}
          {activeTab === 'LIST' && (
            <div>
              {loading ? (
                <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={26} className="animate-spin text-[#F85606]" />
                  <span className="text-xs">Đang tải danh sách điểm giao hàng của đại lý...</span>
                </div>
              ) : points.length === 0 ? (
                <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-gray-200 text-center bg-gray-50/50">
                  <Truck size={42} className="mx-auto text-gray-300 mb-2" />
                  <h4 className="text-sm font-bold text-gray-700">Chưa có điểm giao hàng nào</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                    Đại lý này hiện chưa được cấu hình điểm giao hàng. Vui lòng khai báo kho nhận hàng để phục vụ xuất kho giao hàng chính xác.
                  </p>
                  <button
                    onClick={handleOpenAddForm}
                    className="px-4 py-2 bg-[#F85606] hover:bg-[#d04602] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Khai Báo Điểm Giao Hàng Đầu Tiên</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {points.map((point) => (
                    <div
                      key={point.id}
                      className={`relative rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                        point.isDefault
                          ? 'border-amber-300 bg-linear-to-br from-amber-50/40 via-white to-amber-50/20 shadow-xs ring-1 ring-amber-200'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Header Card */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs shrink-0">
                              <Truck size={15} />
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                                {point.name}
                              </h4>
                              <span className="text-[10px] text-gray-400 font-mono">
                                ID: {point.id}
                              </span>
                            </div>
                          </div>

                          {/* Default Badge */}
                          {point.isDefault ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0">
                              <Star size={12} color="#D97706" fill="#F59E0B" />
                              Mặc Định
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(point)}
                              disabled={actionLoading}
                              title="Đặt làm điểm giao hàng mặc định cho đại lý này"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-amber-800 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
                            >
                              <Star size={11} />
                              Đặt mặc định
                            </button>
                          )}
                        </div>

                        {/* Chi tiết người nhận & Địa chỉ */}
                        <div className="space-y-1.5 pt-1 text-xs">
                          {/* Địa chỉ */}
                          <div className="flex items-start gap-2 text-gray-700">
                            <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
                            <span className="text-gray-800 leading-snug">{point.address}</span>
                          </div>

                          {/* Người nhận & SĐT */}
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-gray-600 text-[11px] pt-0.5">
                            <span className="flex items-center gap-1 text-gray-800 font-medium">
                              <User size={13} className="text-blue-500" />
                              {point.contactPerson}
                            </span>
                            <span className="flex items-center gap-1 text-gray-700 font-mono">
                              <Phone size={13} className="text-emerald-500" />
                              {point.phone}
                            </span>
                          </div>

                          {/* Ghi chú đường đi cho tài xế xe tải (AC 1) */}
                          {point.routeNotes && (
                            <div className="mt-2 p-2 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-1.5">
                              <Navigation size={13} className="text-blue-600 shrink-0 mt-0.5" />
                              <div className="leading-tight">
                                <strong className="font-semibold text-blue-800">Dặn dò tài xế xe tải: </strong>
                                <span>{point.routeNotes}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          Cập nhật: {point.updatedAt.split(' ')[0]}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Nút Sửa */}
                          <button
                            onClick={() => handleOpenEditForm(point)}
                            title="Sửa điểm giao hàng này"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-[#F85606] hover:border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Nút Xóa */}
                          {confirmDeleteId === point.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <button
                                onClick={() => handleDeletePoint(point.id)}
                                disabled={actionLoading}
                                className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-md hover:bg-red-700 transition-colors cursor-pointer"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(point.id)}
                              disabled={actionLoading}
                              title="Xóa điểm giao hàng này"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FORM THÊM MỚI / CHỈNH SỬA ĐIỂM GIAO */}
          {activeTab === 'FORM' && (
            <form onSubmit={handleSubmitForm} className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center font-bold text-xs">
                    {editingPoint ? <Edit size={16} /> : <Plus size={16} />}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {editingPoint ? `Chỉnh sửa: ${editingPoint.name}` : 'Khai Báo Điểm Giao Hàng Mới'}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Thiết lập thông tin kho và ghi chú chỉ dẫn cho tài xế giao hàng
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBackToList}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Quay lại danh sách
                </button>
              </div>

              {/* Lỗi validation tại form */}
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-in slide-in-from-top-1">
                  <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tên điểm giao */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Điểm Giao / Tên Kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Kho Tổng Gia Lâm, Kho KCN Sóng Thần, Showroom Chi Nhánh 1..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] outline-none"
                  autoFocus
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Tên gợi nhớ để nhân viên kinh doanh chọn nhanh khi lên đơn
                </span>
              </div>

              {/* Địa chỉ giao hàng chi tiết */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Địa Chỉ Nhận Hàng Chi Tiết <span className="text-red-500">*</span>
                </label>
                <AddressPicker
                  compact
                  value={address}
                  onChange={(value, complete) => {
                    setAddress(value);
                    setAddressComplete(complete);
                  }}
                />
              </div>

              {/* Người nhận & Số điện thoại (2 cột) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Người Nhận Hàng (Thủ kho / Đại diện) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="VD: Nguyễn Văn A (Thủ kho)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Số Điện Thoại Người Nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] outline-none"
                  />
                </div>
              </div>

              {/* Ghi chú đường đi cho tài xế xe tải (AC 1) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Navigation size={13} className="text-blue-600" />
                  <span>Ghi Chú Đường Đi Cho Tài Xế Xe Tải</span>
                </label>
                <textarea
                  rows={2}
                  value={routeNotes}
                  onChange={(e) => setRouteNotes(e.target.value)}
                  placeholder="VD: Xe container vào thoải mái / Cấm xe tải trên 3.5 tấn từ 6h-9h / Vào ngõ rẽ trái cửa kho số 2 / Gọi trước 30 phút..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] outline-none resize-none"
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Thông tin này sẽ được in trên Phiếu xuất kho & Lệnh giao hàng cho bác tài
                </span>
              </div>

              {/* Checkbox Đặt làm mặc định (AC 2) */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault || points.length === 0}
                    disabled={points.length === 0 || (editingPoint?.isDefault && points.length === 1)}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="accent-[#F85606] rounded cursor-pointer"
                  />
                  <strong className="text-xs text-amber-900 font-semibold">
                    Đặt làm Điểm Giao Hàng Mặc Định
                  </strong>
                </label>
              </div>

              {/* Nút Submit & Hủy */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleBackToList}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#F85606] hover:bg-[#d04602] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{editingPoint ? 'Cập Nhật Điểm Giao' : 'Lưu Điểm Giao Hàng'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MÔ PHỎNG LÊN ĐƠN HÀNG (AC 3) */}
          {activeTab === 'SIMULATION' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-3.5 rounded-2xl bg-linear-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200 text-xs space-y-1">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <Info size={16} className="text-blue-600 shrink-0" />
                  <span>Tiêu Chí Nghiệm Thu (AC 3): Lên Đơn Hàng Chọn Điểm Giao Thuộc Đại Lý</span>
                </div>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Khi nhân viên kinh doanh lên đơn cho đại lý <strong>[{agency.name}]</strong>, danh sách chọn điểm giao chỉ hiển thị <strong>đúng các kho của đại lý này</strong> (không bị lẫn kho của đại lý khác), và <strong>tự động chọn trước điểm mặc định</strong>.
                </p>
              </div>

              {/* Form giả lập màn hình tạo đơn hàng */}
              <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-[#F85606]" />
                    <strong className="text-sm text-gray-900 font-bold">
                      Phiếu Đặt Hàng (Mô phỏng thực tế)
                    </strong>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 font-mono">
                    ĐƠN #DH-882910
                  </span>
                </div>

                {/* Khách hàng / Đại lý mua hàng */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Đại Lý Đặt Hàng
                  </label>
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 flex items-center justify-between">
                    <span>{agency.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {agency.customerGroupName}
                    </span>
                  </div>
                </div>

                {/* Dropdown Điểm Giao Hàng của riêng Đại lý này (AC 3) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Truck size={13} className="text-[#F85606]" />
                      <span>Chọn Điểm Giao Hàng Của Khách</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      (Chỉ hiển thị {points.length} kho của đại lý này)
                    </span>
                  </label>

                  {points.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      ⚠️ Đại lý này chưa có điểm giao hàng nào! Vui lòng khai báo ít nhất 1 điểm giao trước khi lên đơn.
                    </div>
                  ) : (
                    <select
                      value={simulatedSelectedPointId}
                      onChange={(e) => {
                        setSimulatedSelectedPointId(e.target.value);
                        setSimulatedOrderCreated(false);
                      }}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] outline-none font-medium"
                    >
                      {points.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.isDefault ? '⭐ [MẶC ĐỊNH]' : ''} — {p.address}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Chi tiết điểm giao đang được chọn */}
                {simulatedSelectedPoint && (
                  <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 flex items-center gap-1.5">
                        <MapPin size={13} className="text-red-500" />
                        {simulatedSelectedPoint.name}
                      </span>
                      {simulatedSelectedPoint.isDefault && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                          ⭐ Điểm mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-[11px]">
                      <strong>Địa chỉ giao: </strong>{simulatedSelectedPoint.address}
                    </p>
                    <p className="text-gray-700 text-[11px]">
                      <strong>Người nhận: </strong>{simulatedSelectedPoint.contactPerson} ({simulatedSelectedPoint.phone})
                    </p>
                    {simulatedSelectedPoint.routeNotes && (
                      <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[10px] text-blue-900 flex items-start gap-1">
                        <Navigation size={12} className="text-blue-600 shrink-0 mt-0.5" />
                        <span><strong>Lưu ý tài xế: </strong>{simulatedSelectedPoint.routeNotes}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Kết quả mô phỏng */}
                {simulatedOrderCreated ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-in zoom-in-95">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Đơn hàng đã tiếp nhận thành công với địa chỉ giao đúng kho!</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Hàng hóa sẽ được xuất kho và giao thẳng đến <strong>"{simulatedSelectedPoint?.name}"</strong> thay vì trụ sở chính, giúp tiết kiệm chi phí bốc dỡ chuyển tiếp cho đại lý.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={points.length === 0}
                    onClick={() => setSimulatedOrderCreated(true)}
                    className="w-full py-2.5 bg-[#F85606] hover:bg-[#d04602] disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <ShoppingCart size={15} />
                    <span>Xác Nhận Tạo Đơn Thử Nghiệm</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* FOOTER MODAL */}
        {/* ======================================================== */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-end shrink-0 text-xs text-gray-500">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
