import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Agency, DeliveryPoint } from '../../types/agency';
import type { OrderDraft, OrderItem, OrderBackendResponse } from '../../types/order';
import type { OrderProductCatalogItem } from '../../services/orderService';
import {
  createOrderItemFromCatalog,
  recalculateOrderItem,
  calculateOrderTotals,
  applyBackendLines,
  buildBackendRequest,
  getActiveDraft,
  setActiveDraft,
  clearActiveDraft,
  formatCurrencyVND,
  previewOrderOnBackend,
  saveDraftToBackend,
  fetchBackendDrafts,
  fetchBackendDraftById
} from '../../services/orderService';
import { fetchAgencies, fetchDeliveryPointsByAgency } from '../../services/agencyApi';
import { useAuth } from '../../contexts/AuthContext';
import { OrderHeaderCard } from '../../components/order/OrderHeaderCard';
import { OrderItemRow } from '../../components/order/OrderItemRow';
import { ProductPickerModal } from '../../components/order/ProductPickerModal';
import { OrderDraftsModal } from '../../components/order/OrderDraftsModal';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  FileText,
  RefreshCw,
  Tag,
  AlertTriangle,
  AlertCircle,
  Save
} from '../../components/common/Icons';

/** Kết quả Backend tính tiền cho đơn đang gõ (S3-09: tiền hàng, chiết khấu, tổng phải thu) */
type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; order: OrderBackendResponse }
  | { status: 'error'; message: string };

const isBackendId = (id?: string | null) => Boolean(id && /^\d+$/.test(id));

export const OrderCreatePage: React.FC = () => {
  const { user, showToast } = useAuth();

  // Dữ liệu đơn hàng hiện tại
  const [currentDraftId, setCurrentDraftId] = useState<string>(() => `DRAFT-${Date.now()}`);
  const [backendDraftId, setBackendDraftId] = useState<number | null>(null);
  const [backendWarnings, setBackendWarnings] = useState<string[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<DeliveryPoint | null>(null);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Mặc định ngày mai
    return d.toISOString().slice(0, 10);
  });
  const [orderNote, setOrderNote] = useState<string>('');
  const [items, setItems] = useState<OrderItem[]>([]);

  // Trạng thái giao diện
  const [isProductPickerOpen, setIsProductPickerOpen] = useState<boolean>(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState<boolean>(false);
  const [savedDrafts, setSavedDrafts] = useState<OrderDraft[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });

  // Đếm số mặt hàng / số lượng (tiền lấy từ Backend, xem `preview`)
  const totals = useMemo(() => calculateOrderTotals(items), [items]);

  // Danh sách SKU đã có trong đơn
  const addedSkuList = useMemo(() => items.map((i) => i.sku), [items]);

  /** Khôi phục đại lý (và điểm giao) thật từ Backend theo mã đã lưu */
  const restoreAgency = async (agencyId: string, agencyCode: string, agencyName: string, deliveryPointId?: string) => {
    if (!isBackendId(agencyId)) return;
    try {
      const agencyRes = await fetchAgencies({ keyword: agencyCode || agencyName });
      const matched = agencyRes.content.find((a) => a.id === agencyId || a.code === agencyCode);
      if (!matched) return;
      setSelectedAgency(matched);
      if (deliveryPointId) {
        const points = await fetchDeliveryPointsByAgency(matched.id);
        const p = points.find((pt: DeliveryPoint) => pt.id === deliveryPointId);
        if (p) setSelectedDeliveryPoint(p);
      }
    } catch (err) {
      console.warn('Không khôi phục được đại lý:', err);
    }
  };

  // Khôi phục đơn đang gõ dở trên máy này khi vào lại trang (giá sẽ được Backend tính lại)
  useEffect(() => {
    const active = getActiveDraft();
    if (active && active.items && active.items.length > 0) {
      setCurrentDraftId(active.id);
      setBackendDraftId(active.backendDraftId || null);
      setExpectedDeliveryDate(active.expectedDeliveryDate || expectedDeliveryDate);
      setOrderNote(active.note || '');
      setItems(active.items || []);
      restoreAgency(active.agencyId, active.agencyCode, active.agencyName, active.deliveryPointId);
    }
    // Số đơn nháp trên máy chủ (hiện ở nút "Đơn Nháp")
    fetchBackendDrafts()
      .then(setSavedDrafts)
      .catch(() => setSavedDrafts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDraftObj = (): OrderDraft => {
    const money = preview.status === 'ok' ? preview.order : null;
    return {
      id: currentDraftId,
      backendDraftId: backendDraftId || undefined,
      status: 'DRAFT',
      agencyId: selectedAgency?.id || '',
      agencyCode: selectedAgency?.code || '',
      agencyName: selectedAgency?.name || '',
      customerGroup: selectedAgency?.customerGroup || 'RETAIL_SHOWROOM',
      customerGroupName: selectedAgency?.customerGroupName || '',
      pricingTierCode: selectedAgency?.pricingTier?.code || '',
      pricingTierName: selectedAgency?.pricingTier?.name || '',
      deliveryPointId: selectedDeliveryPoint?.id || '',
      deliveryPointName: selectedDeliveryPoint?.name || '',
      deliveryAddress: selectedDeliveryPoint?.address || selectedAgency?.address || '',
      expectedDeliveryDate,
      note: orderNote,
      items,
      totalItemsCount: totals.totalItemsCount,
      totalQuantity: totals.totalQuantity,
      subtotalAmount: Number(money?.subtotal ?? 0),
      discountAmount: Number(money?.discountTotal ?? 0),
      totalPayable: Number(money?.totalAmount ?? 0),
      salesRepId: String(user?.id || ''),
      salesRepName: user?.fullName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Tự động giữ tạm đơn đang gõ trên máy này (chưa phải lưu nháp, mất khi xoá dữ liệu trình duyệt)
  useEffect(() => {
    if (items.length > 0 || selectedAgency) {
      setActiveDraft(buildDraftObj());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgency, selectedDeliveryPoint, expectedDeliveryDate, orderNote, items, currentDraftId, backendDraftId]);

  // Đổi đại lý: giữ các dòng hàng, Backend sẽ tính lại giá theo bảng giá của nhóm khách hàng mới
  const handleSelectAgency = (agency: Agency) => {
    setSelectedAgency(agency);
    setSelectedDeliveryPoint(null);
  };

  const openProductPicker = () => {
    if (!selectedAgency) {
      showToast('Chưa chọn đại lý', 'Vui lòng chọn đại lý trước để lấy đúng bảng giá', 'error');
      return;
    }
    setIsProductPickerOpen(true);
  };

  // Thêm sản phẩm từ picker vào đơn hàng
  const handleAddProduct = (product: OrderProductCatalogItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.sku === product.sku);
      if (existingIdx >= 0) {
        // Đã có -> Tăng số lượng lên 1
        const updated = [...prev];
        const curr = updated[existingIdx];
        updated[existingIdx] = recalculateOrderItem(curr, curr.quantity + 1, curr.selectedUnit);
        return updated;
      }
      return [...prev, createOrderItemFromCatalog(product, 1)];
    });

    showToast('Đã thêm sản phẩm vào đơn', `Đã thêm ${product.name} vào danh sách`, 'success');
  };

  // Cập nhật số lượng
  const handleUpdateQuantity = (id: string, newQty: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? recalculateOrderItem(item, newQty) : item)));
  };

  // Cập nhật đơn vị tính
  const handleUpdateUnit = (id: string, newUnitName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? recalculateOrderItem(item, item.quantity, newUnitName) : item))
    );
  };

  // Xóa dòng hàng
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Tạo mới hoàn toàn (reset form)
  const handleResetOrder = () => {
    setCurrentDraftId(`DRAFT-${Date.now()}`);
    setBackendDraftId(null);
    setSelectedAgency(null);
    setSelectedDeliveryPoint(null);
    setOrderNote('');
    setItems([]);
    clearActiveDraft();
    showToast('Tạo đơn mới', 'Đã khởi tạo form đặt hàng mới', 'info');
  };

  // Yêu cầu tính tiền gửi Backend: chỉ đổi khi đại lý / điểm giao / ngày / ghi chú / SKU-ĐVT-số lượng đổi
  const previewKey = useMemo(() => {
    if (!selectedAgency || !isBackendId(selectedAgency.id) || items.length === 0) return '';
    return JSON.stringify(
      buildBackendRequest({
        draftId: backendDraftId,
        agencyId: selectedAgency.id,
        deliveryPointId: selectedDeliveryPoint?.id,
        expectedDeliveryDate,
        note: orderNote,
        items
      })
    );
  }, [selectedAgency, selectedDeliveryPoint?.id, expectedDeliveryDate, orderNote, items, backendDraftId]);

  // S3-09: Backend tính tiền hàng, chiết khấu, tổng phải thu ngay khi thêm / sửa dòng (chờ 350ms sau lần gõ cuối)
  const previewSeq = useRef(0);
  useEffect(() => {
    if (!previewKey) {
      setPreview({ status: 'idle' });
      setBackendWarnings([]);
      return;
    }
    const seq = ++previewSeq.current;
    setPreview({ status: 'loading' });
    const timer = setTimeout(() => {
      previewOrderOnBackend(JSON.parse(previewKey))
        .then((order) => {
          if (seq !== previewSeq.current) return;
          setPreview({ status: 'ok', order });
          setBackendWarnings(order.warnings || []);
          setItems((prev) => applyBackendLines(prev, order));
        })
        .catch((err: unknown) => {
          if (seq !== previewSeq.current) return;
          setPreview({
            status: 'error',
            message: err instanceof Error ? err.message : 'Không tính được tiền đơn hàng'
          });
          setBackendWarnings([]);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [previewKey]);

  // Xử lý Lưu Nháp lên máy chủ (không còn lưu tạm trên trình duyệt rồi báo "đã lưu")
  const handleSaveDraft = async () => {
    if (!selectedAgency) {
      showToast('Chưa chọn đại lý', 'Vui lòng chọn đại lý trước khi lưu nháp', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Chưa có sản phẩm', 'Vui lòng thêm ít nhất 1 sản phẩm trước khi lưu nháp', 'error');
      return;
    }

    setIsSavingDraft(true);
    try {
      const request = buildBackendRequest({
        draftId: backendDraftId,
        agencyId: selectedAgency.id,
        deliveryPointId: selectedDeliveryPoint?.id,
        expectedDeliveryDate,
        note: orderNote,
        items
      });
      const saved = await saveDraftToBackend(request, backendDraftId);
      if (saved.id) {
        setBackendDraftId(saved.id);
        setCurrentDraftId(`BACKEND-DRAFT-${saved.id}`);
      }
      setItems((prev) => applyBackendLines(prev, saved));
      showToast('Đã lưu nháp', `Đã lưu đơn nháp lên máy chủ [Mã: ${saved.code}]`, 'success');
      fetchBackendDrafts()
        .then(setSavedDrafts)
        .catch(() => undefined);
    } catch (err: unknown) {
      showToast('Lưu nháp thất bại', err instanceof Error ? err.message : 'Không lưu được đơn nháp', 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Mở danh sách đơn nháp trên máy chủ
  const handleOpenDraftsModal = async () => {
    setIsDraftsModalOpen(true);
    try {
      setSavedDrafts(await fetchBackendDrafts());
    } catch (err: unknown) {
      showToast('Lỗi tải đơn nháp', err instanceof Error ? err.message : 'Không tải được danh sách đơn nháp', 'error');
    }
  };

  // Mở lại đơn nháp đã lưu trên máy chủ
  const handleSelectSavedDraft = async (draft: OrderDraft) => {
    if (!draft.backendDraftId) return;
    try {
      const full = await fetchBackendDraftById(draft.backendDraftId);
      setBackendDraftId(full.backendDraftId || null);
      setCurrentDraftId(full.id);
      setExpectedDeliveryDate(full.expectedDeliveryDate || expectedDeliveryDate);
      setOrderNote(full.note || '');
      setItems(full.items || []);
      setSelectedAgency(null);
      setSelectedDeliveryPoint(null);
      await restoreAgency(full.agencyId, full.agencyCode, full.agencyName, full.deliveryPointId);
      showToast('Đã mở đơn nháp', `Đã tải lại đơn nháp [${full.orderNumber || full.id}] từ máy chủ`, 'info');
      setIsDraftsModalOpen(false);
    } catch (err: unknown) {
      showToast('Không mở được đơn nháp', err instanceof Error ? err.message : 'Vui lòng thử lại', 'error');
    }
  };

  // Chốt đơn chính thức (giữ chỗ tồn, kiểm hạn mức, duyệt giá sàn) thuộc Sprint 4 (S4-02, S4-03, S4-05, S4-06):
  // Backend chưa có API chốt đơn nên KHÔNG giả lập "tạo đơn thành công" ở trình duyệt.
  const submitBlockedReason = 'Chốt đơn chính thức làm ở Sprint 4 (kiểm tồn, hạn mức công nợ, duyệt giá sàn). Hiện tại hãy bấm Lưu Nháp.';

  const isAgencyLocked = Boolean(selectedAgency?.transactionLocked);
  const money = preview.status === 'ok' ? preview.order : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
      {/* 1. Header Trang & Các Phím Thao Tác Nhanh */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-[#EE4D2D] text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
            <ShoppingCart size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
              Tạo Đơn Hàng Cho Đại Lý
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Gõ đơn nhanh tại cửa hàng đại lý, tự động áp bảng giá & chiết khấu sản lượng
            </p>
          </div>
        </div>

        {/* Nút thao tác góc phải */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Nút Xem danh sách đơn nháp */}
          <button
            type="button"
            onClick={handleOpenDraftsModal}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:text-[#F85606] hover:bg-orange-50/50 flex items-center gap-1.5 transition-all relative"
            title="Xem các đơn nháp đã lưu trên máy hoặc máy chủ"
          >
            <FileText size={15} />
            <span>Đơn Nháp</span>
            {savedDrafts.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#F85606] text-white text-[10px] font-bold flex items-center justify-center">
                {savedDrafts.length}
              </span>
            )}
          </button>

          {/* Nút làm mới / đơn mới */}
          <button
            type="button"
            onClick={handleResetOrder}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
            title="Xóa form và tạo đơn mới"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Nội dung tạo đơn */}
      <div className="space-y-5">

        {/* CẢNH BÁO TỪ BACKEND NẾU CÓ (S3-07 / S3-09) */}
        {backendWarnings.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1.5 animate-in fade-in">
            {backendWarnings.map((warn, wIdx) => (
              <div key={wIdx} className="flex items-start gap-2 text-xs font-semibold">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}

        {/* 2. KHỐI 1: CHỌN ĐẠI LÝ & ĐIỂM GIAO HÀNG */}
        <OrderHeaderCard
          selectedAgency={selectedAgency}
          onSelectAgency={handleSelectAgency}
          selectedDeliveryPoint={selectedDeliveryPoint}
          onSelectDeliveryPoint={setSelectedDeliveryPoint}
          expectedDeliveryDate={expectedDeliveryDate}
          onChangeExpectedDeliveryDate={setExpectedDeliveryDate}
          orderNote={orderNote}
          onChangeOrderNote={setOrderNote}
        />

        {/* 3. KHỐI 2: DANH SÁCH DÒNG SẢN PHẨM ĐẶT HÀNG */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight flex items-center gap-2">
                <span>2. Danh Sách Sản Phẩm Đặt Hàng</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {items.length} món
                </span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Tìm kiếm mã SKU, chọn ĐVT (thùng/lốc/lon) và nhập số lượng
              </p>
            </div>

            {/* Nút mở Picker thêm sản phẩm */}
            <button
              type="button"
              onClick={openProductPicker}
              className="px-3.5 py-2 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-98 transition cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Thêm Sản Phẩm</span>
            </button>
          </div>

          {/* Vùng hiển thị các dòng hàng */}
          {items.length === 0 ? (
            <div className="py-12 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#F85606] flex items-center justify-center mx-auto">
                <ShoppingCart size={28} />
              </div>
              <div>
                <strong className="text-sm text-gray-800 font-bold block">
                  Đơn hàng chưa có sản phẩm nào
                </strong>
                <span className="text-xs text-gray-500 max-w-sm block mx-auto mt-0.5">
                  Nhấn nút "+ Thêm Sản Phẩm" để tìm nhanh SKU theo danh mục và chọn đơn vị quy đổi (thùng/lốc/lon).
                </span>
              </div>
              <button
                type="button"
                onClick={openProductPicker}
                className="px-4 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#F85606] font-bold text-xs inline-flex items-center gap-1.5 transition"
              >
                <Plus size={15} />
                <span>Thêm sản phẩm đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  itemIndex={idx}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateUnit={handleUpdateUnit}
                  onRemoveItem={handleRemoveItem}
                />
              ))}

              {/* Nút thêm dòng tiếp theo ở cuối danh sách */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={openProductPicker}
                  className="w-full py-2.5 rounded-xl border border-dashed border-orange-300 hover:border-[#F85606] bg-orange-50/40 hover:bg-orange-50 text-[#F85606] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus size={15} />
                  <span>Thêm mặt hàng khác vào đơn</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. KHỐI 3: TỔNG KẾT TÀI CHÍNH & XÁC NHẬN ĐƠN HÀNG (TRONG TRANG, KHÔNG ĂN THEO TASKBAR) */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>3. Bảng Tóm Tắt Thanh Toán & Xác Nhận Đơn Hàng</span>
            </h3>
            <span className="text-xs text-gray-500">
              {totals.totalItemsCount} mặt hàng ({totals.totalQuantity} kiện)
            </span>
          </div>

          {/* Tiền do Backend tính theo bảng giá + chính sách chiết khấu sản lượng đang hiệu lực */}
          {!selectedAgency ? (
            <p className="text-xs text-gray-500">Chọn đại lý và thêm sản phẩm để hệ thống tính tiền.</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-500">Thêm sản phẩm để hệ thống tính tiền.</p>
          ) : preview.status === 'error' ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <strong className="block">Chưa tính được tiền đơn hàng</strong>
                <span>{preview.message}</span>
              </div>
            </div>
          ) : (
            <div className={`space-y-2 text-xs ${preview.status === 'loading' ? 'opacity-60' : ''}`}>
              <div className="flex justify-between text-gray-600">
                <span>Tổng tiền hàng (theo bảng giá):</span>
                <span className="font-mono font-medium">{money ? formatCurrencyVND(Number(money.subtotal)) : '—'}</span>
              </div>

              {money && Number(money.discountTotal) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    <span>Chiết khấu sản lượng:</span>
                  </span>
                  <span className="font-mono font-bold">-{formatCurrencyVND(Number(money.discountTotal))}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline text-sm sm:text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1.5">
                  <span className="text-[#F85606]">●</span>
                  <span>Tổng tiền phải thu:</span>
                </span>
                <strong className="text-lg sm:text-xl font-black text-[#F85606] font-mono">
                  {money ? formatCurrencyVND(Number(money.totalAmount)) : 'Đang tính...'}
                </strong>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
            <Tag size={14} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              Đơn giá lấy từ <strong>bảng giá đang hiệu lực</strong> của nhóm khách hàng mà đại lý thuộc về; chiết khấu sản lượng
              theo <strong>chính sách chiết khấu</strong> đang áp dụng. Hệ thống tự tính lại mỗi khi đổi số lượng hoặc đơn vị tính.
            </div>
          </div>

          {/* Hàng nút bấm Lưu Nháp & Chốt Đơn (Nằm gọn trong trang, không bám theo taskbar/sidebar) */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="h-10 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              title="Lưu nháp đơn hàng để tiếp tục sau"
            >
              <Save size={15} className="text-gray-600" />
              <span>{isSavingDraft ? 'Đang lưu...' : 'Lưu Nháp'}</span>
            </button>

            <button
              type="button"
              disabled
              title={submitBlockedReason}
              className="h-10 px-5 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 bg-gray-400 cursor-not-allowed opacity-70"
            >
              <CheckCircle2 size={16} />
              <span>Chốt Đơn Đặt Hàng</span>
            </button>
          </div>
          <p className="text-[11px] text-gray-500 text-right">
            {isAgencyLocked ? 'Đại lý đang bị khóa giao dịch - chặn tạo đơn mới (S3-07). ' : ''}
            {submitBlockedReason}
          </p>
        </div>
      </div>

      {/* MODAL 1: CHỌN SẢN PHẨM */}
      <ProductPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onSelectProduct={handleAddProduct}
        addedSkuList={addedSkuList}
        agency={selectedAgency}
      />

      {/* MODAL 2: XEM VÀ MỞ LẠI ĐƠN NHÁP */}
      <OrderDraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        drafts={savedDrafts}
        onSelectDraft={handleSelectSavedDraft}
      />

    </div>
  );
};
