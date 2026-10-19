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
  RefreshCw,
  Truck,
  Package,
  Compass,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from '../../routes/Router';
import type { PickingList, PickingListItem } from '../../types/pickingList';
import {
  fetchPickingListById,
  updateItemProgress,
  completePickingList
} from '../../services/pickingListApi';
import { updateOrderStatus } from '../../services/orderService';
import { PickingDiscrepancyModal } from '../../components/inventory/PickingDiscrepancyModal';
import { PickingBatchShortageModal } from '../../components/inventory/PickingBatchShortageModal';
import { PickingCompleteConfirmModal } from '../../components/inventory/PickingCompleteConfirmModal';
import { PickingListPrintModal } from '../../components/inventory/PickingListPrintModal';
import { LotSelectorDropdown } from '../../components/inventory/LotSelectorDropdown';

/**
 * Phân tích và hiển thị đường dẫn vị trí chi tiết từ Khu vực -> Dãy kệ -> Ô lưu kho (Zone -> Rack -> Shelf -> Bin)
 */
export function parseLocationHierarchy(item: PickingListItem): {
  zoneText: string;
  rackText: string;
  binText: string;
  fullPath: string;
} {
  if (item.zone && item.shelf) {
    return {
      zoneText: item.zone,
      rackText: item.shelf,
      binText: item.locationCode,
      fullPath: `${item.zone} ➔ ${item.shelf} ➔ ${item.locationCode}`
    };
  }

  // Tách từ mã dạng: BIN-MB-B1-01 hoặc BIN-MN-B2-02
  const match = (item.locationCode || '').match(/BIN-[A-Z]+-([A-Z])(\d+)-(\d+)/i);
  if (match) {
    const zoneLetter = match[1].toUpperCase();
    const rackNumber = match[2];
    const binNumber = match[3];
    return {
      zoneText: `Khu ${zoneLetter}`,
      rackText: `Kệ ${zoneLetter}${rackNumber}`,
      binText: `Ô ${binNumber}`,
      fullPath: `Khu ${zoneLetter} ➔ Kệ ${zoneLetter}${rackNumber} ➔ Ô ${binNumber}`
    };
  }

  // Tách từ mã dạng: A-01-01-01
  const matchStandard = (item.locationCode || '').match(/^([A-Z])-?(\d+)-?(\d+)-?(\d+)$/i);
  if (matchStandard) {
    return {
      zoneText: `Khu ${matchStandard[1].toUpperCase()}`,
      rackText: `Dãy ${matchStandard[2]}`,
      binText: `Tầng ${matchStandard[3]} - Ô ${matchStandard[4]}`,
      fullPath: `Khu ${matchStandard[1].toUpperCase()} ➔ Dãy ${matchStandard[2]} ➔ Ô ${matchStandard[4]}`
    };
  }

  return {
    zoneText: 'Khu lưu trữ',
    rackText: 'Kệ kho',
    binText: item.locationCode || 'Chưa gán',
    fullPath: item.locationCode || 'Chưa gán vị trí'
  };
}

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

  // Popup Modals thay thế window.confirm & bắt buộc lý do soạn thiếu (S6-03 AC4)
  const [isBatchShortageModalOpen, setIsBatchShortageModalOpen] = useState<boolean>(false);
  const [isCompleteConfirmModalOpen, setIsCompleteConfirmModalOpen] = useState<boolean>(false);

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
    discrepancyReason?: string | null,
    actualBatchNumber?: string,
    lotChangeReason?: string
  ) => {
    if (!pickingList) return;
    setSavingItemIds((prev) => ({ ...prev, [itemId]: true }));

    const currentItem = pickingList.items.find((i) => i.id === itemId);
    const chosenBatch =
      actualBatchNumber !== undefined
        ? actualBatchNumber
        : (currentItem?.actualBatchNumber || currentItem?.suggestedBatchNumber);
    const chosenReason =
      lotChangeReason !== undefined ? lotChangeReason : currentItem?.lotChangeReason;

    try {
      const updatedList = await updateItemProgress(pickingList.id, itemId, {
        pickedQuantity,
        isCompleted,
        discrepancyReason: discrepancyReason || undefined,
        actualBatchNumber: chosenBatch,
        lotChangeReason: chosenReason
      });
      setPickingList(updatedList);
    } catch (err: any) {
      showToast('Lỗi cập nhật', err.message || 'Không thể lưu tiến độ', 'error');
    } finally {
      setSavingItemIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Thủ kho chọn lô xuất hàng (S6-04 AC1 & AC2)
  const handleLotChange = async (item: PickingListItem, batchNumber: string, reason?: string) => {
    if (!pickingList || isReadOnly) return;
    await saveItemUpdate(
      item.id,
      item.pickedQuantity,
      item.isCompleted,
      item.discrepancyReason,
      batchNumber,
      reason
    );
  };

  // Xác nhận lý do soạn thiếu từ Modal (AC4)
  const handleConfirmDiscrepancy = async (reason: string) => {
    if (!discrepancyTargetItem) return;
    const { item, tempPickedQty } = discrepancyTargetItem;

    await saveItemUpdate(item.id, tempPickedQty, true, reason);
    setDiscrepancyTargetItem(null);
  };

  // Bấm nút "Chốt hoàn thành đợt soạn": Kiểm tra mặt hàng thiếu và mở Popup tương ứng
  const handleCompletePicking = () => {
    if (!pickingList) return;

    // Tìm tất cả các mặt hàng soạn thiếu so với yêu cầu
    const shortageItems = pickingList.items.filter(
      (i) => i.pickedQuantity < i.requiredQuantity
    );

    // Nếu có bất kỳ mặt hàng nào thiếu mà chưa có lý do hoặc lý do chưa đủ chuẩn -> Mở Popup bắt buộc nhập lý do (S6-03 AC4)
    if (shortageItems.length > 0) {
      setIsBatchShortageModalOpen(true);
      return;
    }

    // Nếu tất cả đã soạn đủ 100% -> Mở Popup xác nhận hoàn tất (không dùng window.confirm)
    setIsCompleteConfirmModalOpen(true);
  };

  // Xác nhận lý do từ Batch Shortage Modal và tiến hành chốt phiếu
  const handleConfirmBatchShortage = async (
    updates: Array<{ itemId: number; pickedQuantity: number; discrepancyReason: string }>
  ) => {
    if (!pickingList) return;
    setCompleting(true);
    try {
      // 1. Lưu đồng bộ lý do và số lượng của các mặt hàng thiếu
      for (const up of updates) {
        await saveItemUpdate(up.itemId, up.pickedQuantity, true, up.discrepancyReason);
      }

      // 2. Chốt hoàn thành phiếu soạn hàng
      await executeCompletePickingList();
      setIsBatchShortageModalOpen(false);
    } catch (err: any) {
      showToast('Lỗi chốt thiếu', err.message || 'Không thể lưu lý do và hoàn tất phiếu', 'error');
    } finally {
      setCompleting(false);
    }
  };

  // Thực hiện gọi API chốt hoàn thành phiếu và tự động chuyển đơn sang DISPATCHED
  const executeCompletePickingList = async () => {
    if (!pickingList) return;
    setCompleting(true);
    try {
      const updated = await completePickingList(pickingList.id);
      setPickingList(updated);
      setShowConfirmModal(false);

      // Tự động xuất kho các đơn hàng trong phiếu để Quản lý kho xếp xe ngay
      const ordersToDispatch = updated.orders || pickingList.orders || [];
      let dispatchedCount = 0;
      for (const ord of ordersToDispatch) {
        const ordId = (ord as any).orderId || ord.id;
        if (ordId) {
          try {
            await updateOrderStatus(ordId, 'DISPATCHED', `Tự động xuất kho sau đợt soạn ${updated.code}`);
            dispatchedCount++;
          } catch (e: any) {
            console.warn(`Lỗi xuất kho đơn ${ord.code}:`, e);
          }
        }
      }

      if (dispatchedCount > 0) {
        showToast(
          'Đã hoàn thành & Xuất kho',
          `Đã chốt đợt soạn ${updated.code} và tự động chuyển ${dispatchedCount} đơn hàng sang ĐÃ XUẤT KHO. Quản lý kho có thể xếp xe ngay!`,
          'success'
        );
      } else {
        showToast('Chúc mừng', `Đã hoàn thành toàn bộ đợt soạn hàng ${updated.code}!`, 'success');
      }
      setIsCompleteConfirmModalOpen(false);
      await loadData();
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

      {/* Progress Sticky Header (Nền trắng, thanh cam nhẹ theo yêu cầu) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#F85606]" />
              <span>Tiến độ soạn hàng</span>
            </div>
            <div className="text-lg font-black text-gray-900 mt-1">
              {pickingList.completedItems} / {pickingList.totalItems} mặt hàng đã gom xong{' '}
              <span className="text-[#F85606]">({percent}%)</span>
            </div>
          </div>

          {!isReadOnly && isWarehouseStaff && (
            <button
              onClick={handleCompletePicking}
              disabled={completing}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {completing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-white" />
              )}
              Chốt hoàn thành đợt soạn
            </button>
          )}

          {pickingList.status === 'COMPLETED' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/inventory/delivery-trips/create')}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                <Truck className="w-4 h-4 text-white" />
                <span>Xếp chuyến xe ngay →</span>
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar (Nền nhạt, thanh cam nhẹ) */}
        <div className="w-full bg-orange-100/60 rounded-full h-2.5 mt-3.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-orange-400 to-amber-400 h-2.5 rounded-full transition-all duration-300"
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-orange-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                          #{item.routeSequence}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-white font-mono font-bold text-xs flex items-center gap-1">
                          📍 {item.locationCode || 'CHỜ XẾP'}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60 inline-flex items-center gap-1">
                        <span>{parseLocationHierarchy(item).fullPath}</span>
                      </div>
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

                    {/* Lựa chọn lô xuất hàng (FEFO) S6-04 */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1">
                      <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-orange-600" />
                        <span>Lô xuất hàng (Ưu tiên FEFO):</span>
                      </div>
                      <LotSelectorDropdown
                        productId={item.productId}
                        warehouseId={pickingList.warehouseId}
                        requiredQuantity={item.requiredQuantity}
                        baseUnit={item.baseUnit}
                        selectedBatchNumber={item.actualBatchNumber || item.suggestedBatchNumber}
                        onChange={(batchNumber, reason) => handleLotChange(item, batchNumber, reason)}
                        disabled={isReadOnly || !isWarehouseStaff}
                      />
                    </div>
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
        <div className="space-y-4">
          {/* Visual Route Pathway Header (AC2: Chỉ dẫn thứ tự đường đi từ Khu vực -> Kệ -> Ô) */}
          <div className="bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-white p-4 rounded-2xl border border-orange-200/80 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#F85606] text-white rounded-lg shadow-2xs">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                    <span>Lộ trình đường đi tối ưu trong kho</span>
                    <span className="text-[11px] font-normal text-gray-500">
                      (Sắp xếp theo thứ tự: Khu vực (Zone) ➔ Dãy kệ (Rack) ➔ Ô chứa (Bin))
                    </span>
                  </h4>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-orange-700 bg-orange-100/80 px-2.5 py-0.5 rounded-full border border-orange-200 self-start sm:self-auto">
                {sortedItems.length} điểm dừng gom hàng
              </span>
            </div>

            {/* Route Steps Stepper */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-xs">
              {sortedItems.map((item, idx) => {
                const hier = parseLocationHierarchy(item);
                return (
                  <React.Fragment key={item.id}>
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 transition-all ${
                        item.isCompleted
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                          : 'bg-white border-orange-200/90 text-gray-800 shadow-2xs hover:border-[#F85606]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                          item.isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#F85606] text-white'
                        }`}
                      >
                        {item.isCompleted ? '✓' : idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1">
                          <span className="text-[#F85606]">{hier.zoneText}</span>
                          <span className="text-gray-400">➔</span>
                          <span>{hier.rackText}</span>
                          <span className="text-gray-400">➔</span>
                          <span className="font-mono text-gray-900 bg-gray-100 px-1 rounded text-[10px]">
                            {hier.binText}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                          {item.productName} ({item.requiredQuantity} {item.baseUnit})
                        </div>
                      </div>
                    </div>
                    {idx < sortedItems.length - 1 && (
                      <span className="text-gray-300 font-bold text-sm shrink-0">➔</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Table Container (Mở rộng chiều cao min-h-[380px] pb-32 để dropdown danh sách lô mở dài xuống không bị che khuất) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                Danh Sách Mặt Hàng Đã Gộp Theo Lộ Trình Trong Kho ({sortedItems.length} mặt hàng)
              </h2>
              <span className="text-xs text-gray-500">
                Sắp xếp theo thứ tự tối ưu đường đi: Zone → Rack → Shelf → Bin
              </span>
            </div>

            <div className="overflow-x-auto min-h-[380px] pb-32">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3 text-center w-14">Lộ trình</th>
                    <th className="py-3 px-3 w-44">Vị trí lưu kho (Khu ➔ Kệ ➔ Ô)</th>
                    <th className="py-3 px-3 w-28">Mã SKU</th>
                    <th className="py-3 px-4 min-w-[200px]">Tên sản phẩm & Phân bổ đơn hàng</th>
                    <th className="py-3 px-3 w-64 min-w-[240px]">Lô hàng xuất (Gợi ý FEFO)</th>
                    <th className="py-3 px-3 text-center w-14">ĐVT</th>
                    <th className="py-3 px-3 text-right w-16">Yêu cầu</th>
                    <th className="py-3 px-4 text-center w-36">Thực soạn</th>
                    <th className="py-3 px-3 text-center w-20">Hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedItems.map((item, idx) => {
                    const isSaving = savingItemIds[item.id];
                    const hier = parseLocationHierarchy(item);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-orange-50/20 transition-colors ${
                          item.isCompleted ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-black text-orange-600 bg-orange-50/40 align-top pt-4">
                          #{item.routeSequence || idx + 1}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-orange-50 text-orange-900 border border-orange-200 shadow-2xs">
                              <MapPin className="w-3 h-3 text-[#F85606]" />
                              {item.locationCode || 'CHỜ XẾP'}
                            </span>
                            {/* Phân cấp lộ trình đường đi (Khu vực -> Kệ -> Ô) */}
                            <div className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                              <span className="text-[#F85606] font-bold">{hier.zoneText}</span>
                              <span className="text-gray-400">➔</span>
                              <span className="text-gray-800">{hier.rackText}</span>
                              <span className="text-gray-400">➔</span>
                              <span className="text-gray-600 bg-gray-100 px-1 rounded text-[10px] font-mono">
                                {hier.binText}
                              </span>
                            </div>
                            {item.locationName && (
                              <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                {item.locationName}
                              </div>
                            )}
                          </div>
                        </td>
                      <td className="py-3 px-3 font-mono text-gray-600 align-top pt-4">
                        {item.productSku}
                      </td>
                      <td className="py-3 px-4 align-top">
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
                      <td className="py-3 px-3 align-top">
                        <LotSelectorDropdown
                          productId={item.productId}
                          warehouseId={pickingList.warehouseId}
                          requiredQuantity={item.requiredQuantity}
                          baseUnit={item.baseUnit}
                          selectedBatchNumber={item.actualBatchNumber || item.suggestedBatchNumber}
                          onChange={(batchNumber, reason) => handleLotChange(item, batchNumber, reason)}
                          disabled={isReadOnly || !isWarehouseStaff}
                        />
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600 align-top pt-4">
                        {item.baseUnit}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-gray-900 text-sm align-top pt-4">
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

      {/* Popup Bắt buộc ghi nhận lý do soạn thiếu hàng (S6-03 AC4) */}
      <PickingBatchShortageModal
        isOpen={isBatchShortageModalOpen}
        shortageItems={pickingList.items.filter((i) => i.pickedQuantity < i.requiredQuantity)}
        onConfirm={handleConfirmBatchShortage}
        onClose={() => setIsBatchShortageModalOpen(false)}
        isSubmitting={completing}
      />

      {/* Popup Xác nhận chốt hoàn thành phiếu soạn (thay thế window.confirm) */}
      <PickingCompleteConfirmModal
        isOpen={isCompleteConfirmModalOpen}
        pickingList={pickingList}
        onConfirm={executeCompletePickingList}
        onClose={() => setIsCompleteConfirmModalOpen(false)}
        isSubmitting={completing}
      />
    </div>
  );
};
