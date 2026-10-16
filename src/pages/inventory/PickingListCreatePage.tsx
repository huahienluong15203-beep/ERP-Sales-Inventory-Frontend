import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  ArrowLeft,
  User,
  RefreshCw,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import type { AvailablePickingOrder, PickingListPreviewResponse } from '../../types/pickingList';
import { fetchAvailableOrders, previewPickingList, createPickingList } from '../../services/pickingListApi';

export const PickingListCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, user, currentRole } = useAuth();

  // Lọc danh sách kho mà người dùng được phân công phụ trách
  const allowedWarehouses = React.useMemo(() => {
    if (currentRole === 'ROLE_ADMIN' || user?.roles?.includes('ROLE_ADMIN')) {
      return SYSTEM_WAREHOUSES;
    }
    if (user?.warehouseCodes && user.warehouseCodes.length > 0) {
      const filtered = SYSTEM_WAREHOUSES.filter((wh) => user.warehouseCodes!.includes(wh.code));
      if (filtered.length > 0) return filtered;
    }
    if (user?.warehouse) {
      const filtered = SYSTEM_WAREHOUSES.filter(
        (wh) => user.warehouse!.includes(wh.code) || user.warehouse!.includes(wh.name)
      );
      if (filtered.length > 0) return filtered;
    }
    return SYSTEM_WAREHOUSES;
  }, [user, currentRole]);

  // Warehouse selection: Mặc định chọn kho user phụ trách
  const [warehouseId, setWarehouseId] = useState<number>(() => {
    if (user?.warehouseCodes && user.warehouseCodes.length > 0) {
      const found = SYSTEM_WAREHOUSES.find((wh) => user.warehouseCodes!.includes(wh.code));
      if (found) return Number(found.id);
    }
    if (user?.warehouse) {
      const found = SYSTEM_WAREHOUSES.find((wh) => user.warehouse!.includes(wh.code) || user.warehouse!.includes(wh.name));
      if (found) return Number(found.id);
    }
    return Number(SYSTEM_WAREHOUSES[0]?.id || 3);
  });
  const [availableOrders, setAvailableOrders] = useState<AvailablePickingOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  // Preview State
  const [previewData, setPreviewData] = useState<PickingListPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Form State
  const [note, setNote] = useState<string>('');
  const [pickerName, setPickerName] = useState<string>(() => user?.fullName || 'Nhân Viên Kho01');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Đảm bảo warehouseId luôn đồng bộ với kho nhân viên phụ trách khi user load xong
  useEffect(() => {
    if (allowedWarehouses.length > 0 && !allowedWarehouses.some((w) => Number(w.id) === warehouseId)) {
      setWarehouseId(Number(allowedWarehouses[0].id));
    }
  }, [allowedWarehouses, warehouseId]);

  useEffect(() => {
    if (user?.fullName && (pickerName === 'Trần Văn Thủ Kho' || !pickerName)) {
      setPickerName(user.fullName);
    }
  }, [user]);

  // Load available orders whenever warehouseId changes
  useEffect(() => {
    loadOrders(warehouseId);
  }, [warehouseId]);

  const loadOrders = async (whId: number) => {
    setLoadingOrders(true);
    setSelectedOrderIds([]);
    setPreviewData(null);
    try {
      const orders = await fetchAvailableOrders(whId);
      setAvailableOrders(orders);
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể tải đơn hàng khả dụng', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleToggleOrder = (id: number) => {
    setSelectedOrderIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      return next;
    });
    setPreviewData(null); // Reset preview when selection changes
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === availableOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(availableOrders.map((o) => o.id));
    }
    setPreviewData(null);
  };

  // Xem trước lộ trình gom đơn
  const handlePreviewRoute = async () => {
    if (selectedOrderIds.length === 0) {
      showToast('Cảnh báo', 'Vui lòng chọn ít nhất 1 đơn hàng để xem trước lộ trình!', 'info');
      return;
    }
    setLoadingPreview(true);
    try {
      const preview = await previewPickingList(warehouseId, selectedOrderIds);
      setPreviewData(preview);
      showToast('Xem trước thành công', `Đã gộp ${preview.totalItems} mặt hàng theo đường đi tối ưu`, 'success');
    } catch (err: any) {
      showToast('Lỗi xem trước', err.message || 'Không thể xem trước lộ trình', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Submit tạo phiếu
  const handleCreatePickingList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      showToast('Cảnh báo', 'Vui lòng chọn ít nhất 1 đơn hàng để tạo đợt soạn!', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const newList = await createPickingList({
        warehouseId,
        orderIds: selectedOrderIds,
        pickerId: user?.id ? Number(user.id) : 1,
        note: note.trim() || undefined
      });

      showToast('Thành công', `Đã tạo phiếu soạn hàng ${newList.code}`, 'success');
      // Chuyển hướng ngay đến chi tiết hoặc chế độ di động
      navigate(`/inventory/picking-lists/${newList.id}`);
    } catch (err: any) {
      showToast('Lỗi tạo phiếu', err.message || 'Tạo phiếu soạn hàng thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTotalAmount = availableOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Nút quay lại */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/inventory/picking-lists')}
          className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
          id="picking-create-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái & giữa: Chọn đơn & Xem trước lộ trình (2 phần) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bước 1: Chọn Kho & Đơn Hàng */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Đơn hàng đã duyệt
                </h2>
              </div>

              {/* Warehouse selector */}
              <div className="w-full sm:w-64">
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(Number(e.target.value))}
                  className="w-full text-xs font-semibold border border-orange-300 rounded-xl px-3 py-2 bg-orange-50/50 text-orange-950 focus:ring-2 focus:ring-orange-200 outline-none"
                >
                  {allowedWarehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      📍 {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table of Available Orders */}
            {loadingOrders ? (
              <div className="p-8 text-center text-gray-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                <p className="text-xs">Đang tải danh sách đơn đã duyệt tại kho...</p>
              </div>
            ) : availableOrders.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-semibold text-gray-700">Không có đơn hàng nào chờ soạn tại kho này</p>
                <p className="text-[11px] text-gray-500">
                  Tất cả các đơn đã được soạn hoặc chưa được duyệt (APPROVED).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length > 0 && selectedOrderIds.length === availableOrders.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span>Chọn tất cả ({availableOrders.length} đơn)</span>
                  </label>
                  <span className="font-semibold text-orange-600">
                    Đã chọn: {selectedOrderIds.length} đơn | Trị giá:{' '}
                    {selectedTotalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold sticky top-0 uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                        <th className="py-2.5 px-3">Mã đơn</th>
                        <th className="py-2.5 px-3">Khách hàng & Địa chỉ</th>
                        <th className="py-2.5 px-3 text-center">Số mặt hàng</th>
                        <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                        <th className="py-2.5 px-3">Ngày duyệt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {availableOrders.map((ord) => {
                        const isSelected = selectedOrderIds.includes(ord.id);
                        return (
                          <tr
                            key={ord.id}
                            onClick={() => handleToggleOrder(ord.id)}
                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-orange-50/70' : 'hover:bg-gray-50'
                              }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleOrder(ord.id)}
                                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                              {ord.orderCode}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-gray-900">{ord.customerName}</div>
                              {ord.deliveryAddress && (
                                <div className="text-[11px] text-gray-500 truncate max-w-xs">
                                  📍 {ord.deliveryAddress}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 font-semibold text-gray-700">
                                {ord.itemCount} SKUs
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                              {ord.totalAmount?.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                              {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Preview Trigger Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={selectedOrderIds.length === 0 || loadingPreview}
                    onClick={handlePreviewRoute}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    {loadingPreview ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Xem trước Lộ trình Gom đơn & Đường đi kho
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bước 2: Bảng xem trước gộp mặt hàng & đường đi (AC1 & AC2) */}
          {previewData && (
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-amber-200 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Lộ Trình Soạn Hàng Đã Tối Ưu Theo Vị Trí (Route Sequence)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Hệ thống đã tự động gộp số lượng và sắp xếp thứ tự đi qua từng kệ ({previewData.totalItems} mặt hàng)
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full">
                  {previewData.orderCount} đơn gom lại
                </span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-800 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 text-center w-12">Thứ tự</th>
                      <th className="py-2.5 px-3 w-28">Vị trí lưu kho</th>
                      <th className="py-2.5 px-3 w-28">Mã SKU</th>
                      <th className="py-2.5 px-3">Sản phẩm</th>
                      <th className="py-2.5 px-3 text-center w-14">ĐVT</th>
                      <th className="py-2.5 px-3 text-right w-20">Tổng gom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-amber-50/40">
                        <td className="py-2.5 px-3 text-center font-bold text-orange-600 bg-orange-50/50">
                          #{item.routeSequence || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                          📍 {item.locationCode || 'A-01-01'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">
                          {item.productSku}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {item.productName}
                          {item.allocations && (
                            <div className="text-[10px] text-gray-500 mt-0.5 flex flex-wrap gap-1">
                              {item.allocations.map((al, aIdx) => (
                                <span key={aIdx} className="bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                                  {al.orderCode}: <strong>{al.quantity}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-600">
                          {item.baseUnit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-orange-600 text-sm">
                          {item.requiredQuantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: Thông tin phân công & Xác nhận tạo phiếu */}
        <div className="space-y-6">
          <form onSubmit={handleCreatePickingList} className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-5">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3">
              Thông Tin Phân Công & Tạo Phiếu
            </h2>

            {/* Picker assignment */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <User className="w-4 h-4 text-orange-500" />
                Người chịu trách nhiệm soạn: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pickerName}
                onChange={(e) => setPickerName(e.target.value)}
                placeholder="Nhập tên thủ kho..."
                className="w-full text-xs font-medium border border-gray-300 rounded-xl px-3 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none"
                required
              />
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-orange-500" />
                Ghi chú đợt soạn:
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Đợt soạn ưu tiên giao sáng cho các siêu thị nội thành..."
                className="w-full text-xs border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none"
              />
            </div>

            {/* Tóm tắt nhanh */}
            <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200/60 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Số đơn đã gom:</span>
                <strong className="text-gray-900">{selectedOrderIds.length} đơn hàng</strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tổng giá trị đơn:</span>
                <strong className="text-orange-600">{selectedTotalAmount.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Trạng thái ban đầu:</span>
                <strong className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[10px]">ĐÃ GIAO VIỆC</strong>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={selectedOrderIds.length === 0 || submitting}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang lập phiếu...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-5 h-5" />
                  Xác nhận Tạo Phiếu Soạn Hàng
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
