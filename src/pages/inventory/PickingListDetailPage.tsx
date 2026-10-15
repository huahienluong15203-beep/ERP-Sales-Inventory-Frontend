import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Printer,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Plus,
  Minus,
  Check,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';
import type { PickingList, PickingListItem } from '../../types/pickingList';
import {
  fetchPickingListById,
  updateItemProgress,
  completePickingList
} from '../../services/pickingListApi';
import { PickingDiscrepancyModal } from '../../components/inventory/PickingDiscrepancyModal';
import { PickingListPrintModal } from '../../components/inventory/PickingListPrintModal';

export const PickingListDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast, currentRole } = useAuth();

  const isWarehouseStaff = ['ROLE_WAREHOUSE', 'ROLE_WH_MANAGER', 'ROLE_ADMIN'].includes(currentRole ?? '');

  const [pickingList, setPickingList] = useState<PickingList | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // View Mode: Desktop table vs Mobile Picking Touch Interface
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isMobileQuery = window.location.search.includes('mode=mobile');
      return isMobileQuery || window.innerWidth < 768;
    }
    return false;
  });

  // Mobile filter: All, Pending, Completed
  const [mobileFilter, setMobileFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');

  // Discrepancy Reason Modal State
  const [discrepancyTargetItem, setDiscrepancyTargetItem] = useState<{
    item: PickingListItem;
    tempPickedQty: number;
  } | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [savingItemIds, setSavingItemIds] = useState<Record<number, boolean>>({});
  const [completing, setCompleting] = useState<boolean>(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchPickingListById(Number(id));
      setPickingList(data);
    } catch (err: any) {
      showToast('Lỗi tải phiếu', err.message || 'Không thể tải chi tiết phiếu soạn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Cập nhật số lượng thực soạn
  const handleQuantityChange = async (item: PickingListItem, newQty: number) => {
    if (!pickingList || pickingList.status === 'COMPLETED' || pickingList.status === 'CANCELLED') return;
    const validQty = Math.max(0, Math.min(item.requiredQuantity, newQty));

    // Nếu soạn đủ số lượng yêu cầu -> Tự động đánh dấu hoàn thành
    if (validQty === item.requiredQuantity) {
      await saveItemUpdate(item.id, validQty, true, null);
      return;
    }

    // Nếu số lượng nhỏ hơn yêu cầu -> Cập nhật số lượng thực soạn, chưa đánh dấu xong
    // (Chỉ bật Modal khi thủ kho bấm tick Hoàn thành hoặc bấm Báo thiếu)
    await saveItemUpdate(item.id, validQty, false, item.discrepancyReason);
  };

  // Toggle tick hoàn thành cho một dòng hàng (Checkbox di động AC5)
  const handleToggleCompleted = async (item: PickingListItem) => {
    if (!pickingList || pickingList.status === 'COMPLETED' || pickingList.status === 'CANCELLED') return;

    if (!item.isCompleted) {
      // Đang muốn đánh dấu ĐÃ SOẠN
      const currentPicked = item.pickedQuantity > 0 ? item.pickedQuantity : item.requiredQuantity;

      if (currentPicked < item.requiredQuantity && !item.discrepancyReason) {
        // Soạn thiếu mà chưa có lý do -> Bật modal bắt buộc nhập lý do (AC4)
        setDiscrepancyTargetItem({
          item,
          tempPickedQty: currentPicked
        });
        return;
      }

      await saveItemUpdate(item.id, currentPicked, true, item.discrepancyReason);
    } else {
      // Bỏ đánh dấu hoàn thành -> Trả về chưa xong
      await saveItemUpdate(item.id, item.pickedQuantity, false, item.discrepancyReason);
    }
  };

  // Nút nhanh: "Soạn đủ" (Quick Match: Đặt pickedQuantity = requiredQuantity và tick xong)
  const handleQuickMatch = async (item: PickingListItem) => {
    if (!pickingList || pickingList.status === 'COMPLETED' || pickingList.status === 'CANCELLED') return;
    await saveItemUpdate(item.id, item.requiredQuantity, true, null);
  };

  // Lưu cập nhật item vào backend
  const saveItemUpdate = async (
    itemId: number,
    pickedQuantity: number,
    isCompleted: boolean,
    discrepancyReason?: string | null
  ) => {
    if (!pickingList) return;
    setSavingItemIds((prev) => ({ ...prev, [itemId]: true }));

    try {
      const updatedList = await updateItemProgress(pickingList.id, itemId, {
        pickedQuantity,
        isCompleted,
        discrepancyReason: discrepancyReason || undefined
      });
      setPickingList(updatedList);
    } catch (err: any) {
      showToast('Lỗi cập nhật', err.message || 'Không thể lưu tiến độ', 'error');
    } finally {
      setSavingItemIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Xác nhận lý do soạn thiếu từ Modal (AC4)
  const handleConfirmDiscrepancy = async (reason: string) => {
    if (!discrepancyTargetItem) return;
    const { item, tempPickedQty } = discrepancyTargetItem;

    await saveItemUpdate(item.id, tempPickedQty, true, reason);
    setDiscrepancyTargetItem(null);
  };

  // Hoàn thành phiếu soạn hàng
  const handleCompletePicking = async () => {
    if (!pickingList) return;

    // Kiểm tra tất cả mặt hàng
    const uncompleted = pickingList.items.filter((i) => !i.isCompleted);
    if (uncompleted.length > 0) {
      const confirmContinue = window.confirm(
        `Còn ${uncompleted.length} mặt hàng chưa được đánh dấu đã soạn. Bạn có chắc muốn chốt hoàn thành phiếu không?`
      );
      if (!confirmContinue) return;
    }

    // Kiểm tra các dòng thiếu có lý do chưa (AC4)
    const missingReason = pickingList.items.find(
      (i) => i.pickedQuantity < i.requiredQuantity && !i.discrepancyReason
    );
    if (missingReason) {
      showToast(
        'Không thể hoàn thành (AC4)',
        `Mặt hàng "${missingReason.productName}" soạn thiếu nhưng chưa có lý do!`,
        'error'
      );
      return;
    }

    setCompleting(true);
    try {
      const updated = await completePickingList(pickingList.id);
      setPickingList(updated);
      showToast('Chúc mừng', `Đã hoàn thành toàn bộ đợt soạn hàng ${updated.code}!`, 'success');
    } catch (err: any) {
      showToast('Lỗi hoàn thành', err.message || 'Chốt phiếu soạn hàng thất bại', 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
        <p className="text-sm font-semibold">Đang tải phiếu soạn hàng...</p>
      </div>
    );
  }

  if (!pickingList) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-gray-900">Không tìm thấy phiếu soạn hàng</h3>
        <button
          onClick={() => navigate('/inventory/picking-lists')}
          className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const sortedItems = [...pickingList.items].sort((a, b) => (a.routeSequence || 0) - (b.routeSequence || 0));
  const filteredItems = sortedItems.filter((i) => {
    if (mobileFilter === 'PENDING') return !i.isCompleted;
    if (mobileFilter === 'DONE') return i.isCompleted;
    return true;
  });

  const percent = pickingList.totalItems > 0 ? Math.round((pickingList.completedItems / pickingList.totalItems) * 100) : 0;
  const isReadOnly = pickingList.status === 'COMPLETED' || pickingList.status === 'CANCELLED';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & THAO TÁC (Gọn gàng như các tab khác) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/inventory/picking-lists')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="picking-detail-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-900 shadow-2xs">
            {pickingList.code}
          </span>
          {pickingList.status === 'COMPLETED' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              ✓ ĐÃ HOÀN THÀNH
            </span>
          ) : pickingList.status === 'IN_PROGRESS' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
              ĐANG SOẠN HÀNG
            </span>
          ) : pickingList.status === 'CANCELLED' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
              ĐÃ HỦY
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              ĐÃ GIAO VIỆC
            </span>
          )}
          <span className="text-gray-300 hidden md:inline">•</span>
          <span className="text-xs text-gray-500 hidden md:inline">
            Kho: <strong>{pickingList.warehouseName}</strong> • Người soạn:{' '}
            <strong>{pickingList.pickerName || 'Chưa gán'}</strong>
          </span>
        </div>

        {/* View mode toggle & Print button */}
        <div className="flex items-center gap-2">
          {/* Switch giữa Máy tính và Di động */}
          <div className="bg-white border border-gray-200 p-0.5 rounded-xl flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMobileMode(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                !isMobileMode ? 'bg-orange-50 text-[#F85606] font-bold shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Bàn làm việc</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMode(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                isMobileMode
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Thủ kho Mobile (AC5)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-orange-50 hover:border-orange-200 border border-gray-200 text-gray-700 hover:text-[#F85606] font-bold text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>In phiếu A4</span>
          </button>
        </div>
      </div>

      {/* Progress Sticky Header */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-4 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-orange-100 uppercase tracking-wider font-semibold">
              Tiến độ soạn hàng theo đường đi trong kho (Route Sequence)
            </div>
            <div className="text-lg font-black mt-0.5">
              {pickingList.completedItems} / {pickingList.totalItems} mặt hàng đã gom xong ({percent}%)
            </div>
          </div>

          {!isReadOnly && isWarehouseStaff && (
            <button
              onClick={handleCompletePicking}
              disabled={completing}
              className="px-5 py-2.5 bg-white text-orange-600 hover:bg-orange-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              {completing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              Chốt hoàn thành đợt soạn
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/20 rounded-full h-2.5 mt-3 overflow-hidden">
          <div
            className="bg-white h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. CHẾ ĐỘ THỦ KHO DI ĐỘNG (MOBILE PICKING MODE - AC5) */}
      {/* ======================================================== */}
      {isMobileMode ? (
        <div className="space-y-4">
          {/* Quick Filter Bar for Mobile */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
            <span className="text-xs font-semibold text-gray-700">Lọc dòng soạn:</span>
            <div className="flex gap-1.5">
              {[
                { key: 'ALL', label: `Tất cả (${sortedItems.length})` },
                { key: 'PENDING', label: `Chưa xong (${sortedItems.filter((i) => !i.isCompleted).length})` },
                { key: 'DONE', label: `Đã soạn (${sortedItems.filter((i) => i.isCompleted).length})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMobileFilter(tab.key as any)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    mobileFilter === tab.key
                      ? 'bg-orange-500 text-white font-bold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards for each item sorted by routeSequence */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isSaving = savingItemIds[item.id];

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                    item.isCompleted
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-orange-200 hover:border-orange-400'
                  }`}
                >
                  {/* Top line: Route Sequence & Location Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-orange-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                        #{item.routeSequence}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-white font-mono font-bold text-xs flex items-center gap-1">
                        📍 {item.locationCode || 'CHỜ XẾP'}
                      </span>
                    </div>

                    {/* Touch Checkbox */}
                    <button
                      type="button"
                      disabled={isReadOnly || isSaving}
                      onClick={() => handleToggleCompleted(item)}
                      className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all ${
                        item.isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-white border-gray-300 text-transparent hover:border-orange-500'
                      }`}
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                    </button>
                  </div>

                  {/* Product Details */}
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug">
                      {item.productName}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="font-mono">SKU: {item.productSku}</span>
                      <span>ĐVT: <strong className="text-gray-800">{item.baseUnit}</strong></span>
                    </div>

                    {/* Allocations breakdown */}
                    {item.allocations && item.allocations.length > 0 && (
                      <div className="mt-2 text-[11px] text-gray-600 flex flex-wrap gap-1.5">
                        <span className="font-semibold text-gray-700">Giao cho:</span>
                        {item.allocations.map((al, aIdx) => (
                          <span
                            key={aIdx}
                            className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md border border-gray-200"
                          >
                            {al.orderCode} (<strong>{al.quantity} {item.baseUnit}</strong>)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Shortage Reason Alert if any */}
                  {item.discrepancyReason && (
                    <div className="mb-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Lý do soạn thiếu:</strong> {item.discrepancyReason}
                      </div>
                    </div>
                  )}

                  {/* Bottom: Quantity Stepper & Quick Match Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xs">
                      <span className="text-gray-500">Cần soạn:</span>{' '}
                      <strong className="text-sm text-gray-900">{item.requiredQuantity}</strong> {item.baseUnit}
                    </div>

                    {!isReadOnly && isWarehouseStaff ? (
                      <div className="flex items-center gap-2">
                        {/* Stepper buttons */}
                        <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 p-0.5">
                          <button
                            type="button"
                            disabled={item.pickedQuantity <= 0 || isSaving}
                            onClick={() => handleQuantityChange(item, item.pickedQuantity - 1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm shadow-xs disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-12 text-center font-black text-sm text-gray-900">
                            {item.pickedQuantity}
                          </span>
                          <button
                            type="button"
                            disabled={item.pickedQuantity >= item.requiredQuantity || isSaving}
                            onClick={() => handleQuantityChange(item, item.pickedQuantity + 1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm shadow-xs disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Soạn đủ button */}
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleQuickMatch(item)}
                          className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold rounded-xl transition-colors"
                        >
                          Soạn đủ ({item.requiredQuantity})
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-emerald-700">
                        Thực soạn: {item.pickedQuantity} {item.baseUnit}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. CHẾ ĐỘ BÀN LÀM VIỆC (DESKTOP TABLE VIEW) */
        /* ======================================================== */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              Danh Sách Mặt Hàng Đã Gộp Theo Lộ Trình Trong Kho ({sortedItems.length} mặt hàng)
            </h2>
            <span className="text-xs text-gray-500">
              Sắp xếp theo thứ tự tối ưu đường đi: Zone → Rack → Shelf → Bin
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3 text-center w-12">Lộ trình</th>
                  <th className="py-3 px-3 w-28">Vị trí lưu kho</th>
                  <th className="py-3 px-3 w-28">Mã SKU</th>
                  <th className="py-3 px-4">Tên sản phẩm & Phân bổ đơn hàng</th>
                  <th className="py-3 px-3 text-center w-14">ĐVT</th>
                  <th className="py-3 px-3 text-right w-20">Yêu cầu</th>
                  <th className="py-3 px-4 text-center w-36">Thực soạn</th>
                  <th className="py-3 px-3 text-center w-24">Hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedItems.map((item, idx) => {
                  const isSaving = savingItemIds[item.id];
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-orange-50/20 transition-colors ${
                        item.isCompleted ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-black text-orange-600 bg-orange-50/40">
                        #{item.routeSequence || idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-900">
                        <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                          📍 {item.locationCode || 'CHỜ XẾP'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">
                        {item.productSku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{item.productName}</div>
                        {item.allocations && (
                          <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-1.5">
                            {item.allocations.map((al, aIdx) => (
                              <span key={aIdx} className="bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                                {al.orderCode}: <strong>{al.quantity}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        {item.discrepancyReason && (
                          <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                            ⚠️ <strong>Lý do thiếu:</strong> {item.discrepancyReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600">
                        {item.baseUnit}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-gray-900 text-sm">
                        {item.requiredQuantity}
                      </td>
                      <td className="py-3 px-4">
                        {!isReadOnly && isWarehouseStaff ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              disabled={item.pickedQuantity <= 0 || isSaving}
                              onClick={() => handleQuantityChange(item, item.pickedQuantity - 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={item.requiredQuantity}
                              value={item.pickedQuantity}
                              onChange={(e) => handleQuantityChange(item, Number(e.target.value))}
                              className="w-14 text-center font-bold border border-gray-300 rounded-lg py-1 text-xs outline-none focus:border-orange-500"
                            />
                            <button
                              type="button"
                              disabled={item.pickedQuantity >= item.requiredQuantity || isSaving}
                              onClick={() => handleQuantityChange(item, item.pickedQuantity + 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="text-center font-bold text-emerald-700">
                            {item.pickedQuantity}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={isReadOnly || isSaving}
                          onClick={() => handleToggleCompleted(item)}
                          className={`w-7 h-7 mx-auto rounded-lg border flex items-center justify-center transition-all ${
                            item.isCompleted
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-gray-300 text-transparent hover:border-orange-500'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal ghi nhận lý do soạn thiếu (AC4) */}
      {discrepancyTargetItem && (
        <PickingDiscrepancyModal
          isOpen={Boolean(discrepancyTargetItem)}
          productName={discrepancyTargetItem.item.productName}
          productSku={discrepancyTargetItem.item.productSku}
          locationCode={discrepancyTargetItem.item.locationCode}
          requiredQuantity={discrepancyTargetItem.item.requiredQuantity}
          pickedQuantity={discrepancyTargetItem.tempPickedQty}
          baseUnit={discrepancyTargetItem.item.baseUnit}
          initialReason={discrepancyTargetItem.item.discrepancyReason || ''}
          onConfirm={handleConfirmDiscrepancy}
          onClose={() => setDiscrepancyTargetItem(null)}
        />
      )}

      {/* Modal In Phiếu Soạn Hàng */}
      <PickingListPrintModal
        isOpen={isPrintModalOpen}
        pickingList={pickingList}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
