import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Agency, DeliveryPoint } from '../../types/agency';
import type { OrderDraft, OrderItem } from '../../types/order';
import type { OrderProductCatalogItem } from '../../services/orderService';
import {
  createOrderItemFromCatalog,
  recalculateOrderItem,
  calculateOrderTotals,
  saveDraft,
  getSavedDrafts,
  deleteDraft,
  confirmOrder,
  getActiveDraft,
  setActiveDraft,
  clearActiveDraft,
  formatCurrencyVND
} from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { OrderHeaderCard } from '../../components/order/OrderHeaderCard';
import { OrderItemRow } from '../../components/order/OrderItemRow';
import { ProductPickerModal } from '../../components/order/ProductPickerModal';
import { OrderSummaryStickyBar } from '../../components/order/OrderSummaryStickyBar';
import { OrderDraftsModal } from '../../components/order/OrderDraftsModal';
import {
  ShoppingCart,
  Plus,
  Save,
  CheckCircle2,
  FileText,
  Smartphone,
  Monitor,
  RefreshCw,
  AlertTriangle,
  Lock,
  Tag,
  ArrowLeft
} from '../../components/common/Icons';

export const OrderCreatePage: React.FC = () => {
  const { user, showToast } = useAuth();

  // Dữ liệu đơn hàng hiện tại
  const [currentDraftId, setCurrentDraftId] = useState<string>(() => `DRAFT-${Date.now()}`);
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
  const [savedDrafts, setSavedDrafts] = useState<OrderDraft[]>(() => getSavedDrafts());
  const [isSimulating360Mobile, setIsSimulating360Mobile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);

  // Modal thông báo chốt đơn thành công
  const [confirmedOrderResult, setConfirmedOrderResult] = useState<{
    orderNumber: string;
    agencyName: string;
    totalPayable: number;
  } | null>(null);

  // Tính tổng kết tài chính tức thì (Real-time)
  const totals = useMemo(() => calculateOrderTotals(items), [items]);

  // Danh sách SKU đã có trong đơn
  const addedSkuList = useMemo(() => items.map((i) => i.sku), [items]);

  // Khôi phục đơn dở (Auto-restore) khi vào trang
  useEffect(() => {
    const active = getActiveDraft();
    if (active && active.items && active.items.length > 0) {
      setCurrentDraftId(active.id);
      setExpectedDeliveryDate(active.expectedDeliveryDate || expectedDeliveryDate);
      setOrderNote(active.note || '');
      setItems(active.items || []);
    }
  }, []);

  // Tự động lưu tạm thời khi gõ dở (Auto-save tiến trình)
  useEffect(() => {
    if (items.length > 0 || selectedAgency) {
      const draftObj: OrderDraft = {
        id: currentDraftId,
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
        subtotalAmount: totals.subtotalAmount,
        discountAmount: totals.discountAmount,
        totalPayable: totals.totalPayable,
        salesRepId: String(user?.id || 'REP_001'),
        salesRepName: user?.fullName || 'Nhân viên kinh doanh',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setActiveDraft(draftObj);
    }
  }, [selectedAgency, selectedDeliveryPoint, expectedDeliveryDate, orderNote, items, totals, currentDraftId, user]);

  // Cập nhật lại giá cho toàn bộ items khi thay đổi đại lý (theo bảng giá S2-10)
  const handleSelectAgency = (agency: Agency) => {
    setSelectedAgency(agency);
    setSelectedDeliveryPoint(null);

    // Cập nhật lại đơn giá theo nhóm khách hàng mới
    if (items.length > 0) {
      setItems((prev) =>
        prev.map((item) => {
          // Tìm sản phẩm gốc tương ứng để lấy lại đơn giá
          const productMock: OrderProductCatalogItem = {
            id: String(item.productId),
            sku: item.sku,
            name: item.name,
            category: item.category || '',
            baseUnit: item.baseUnit,
            basePrice: item.availableUnits.find((u) => u.isBaseUnit)?.unitPrice || item.unitPrice,
            stockAvailable: 1000,
            availableUnits: item.availableUnits
          };
          return createOrderItemFromCatalog(productMock, agency.customerGroup, item.quantity);
        })
      );
    }
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
      } else {
        // Chưa có -> Tạo mới dòng hàng theo nhóm khách hàng của đại lý
        const newItem = createOrderItemFromCatalog(
          product,
          selectedAgency?.customerGroup,
          1
        );
        return [...prev, newItem];
      }
    });

    showToast('Đã thêm sản phẩm vào đơn', `Đã thêm ${product.name} vào danh sách`, 'success');
  };

  // Cập nhật số lượng
  const handleUpdateQuantity = (id: string, newQty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? recalculateOrderItem(item, newQty) : item))
    );
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
    setSelectedAgency(null);
    setSelectedDeliveryPoint(null);
    setOrderNote('');
    setItems([]);
    clearActiveDraft();
    showToast('Tạo đơn mới', 'Đã khởi tạo form đặt hàng mới', 'info');
  };

  // Xử lý Lưu Nháp (Draft)
  const handleSaveDraft = () => {
    if (!selectedAgency && items.length === 0) {
      showToast('Chưa có thông tin', 'Vui lòng chọn đại lý hoặc thêm sản phẩm trước khi lưu nháp', 'error');
      return;
    }

    setIsSavingDraft(true);
    const draftObj: OrderDraft = {
      id: currentDraftId,
      status: 'DRAFT',
      agencyId: selectedAgency?.id || '',
      agencyCode: selectedAgency?.code || '',
      agencyName: selectedAgency?.name || 'Đơn chưa gán đại lý',
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
      subtotalAmount: totals.subtotalAmount,
      discountAmount: totals.discountAmount,
      totalPayable: totals.totalPayable,
      salesRepId: String(user?.id || 'REP_001'),
      salesRepName: user?.fullName || 'Nhân viên kinh doanh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveDraft(draftObj);
    setSavedDrafts(getSavedDrafts());
    setIsSavingDraft(false);
    showToast('Đã lưu nháp', `Đã lưu đơn nháp [${draftObj.id}]. Bạn có thể mở lại gõ bất cứ lúc nào!`, 'success');
  };

  // Mở lại đơn nháp đã lưu
  const handleSelectSavedDraft = (draft: OrderDraft) => {
    setCurrentDraftId(draft.id);
    setExpectedDeliveryDate(draft.expectedDeliveryDate || expectedDeliveryDate);
    setOrderNote(draft.note || '');
    setItems(draft.items || []);

    // Khôi phục đại lý
    if (draft.agencyId) {
      setSelectedAgency({
        id: draft.agencyId,
        code: draft.agencyCode,
        name: draft.agencyName,
        taxCode: '',
        customerGroup: draft.customerGroup,
        customerGroupName: draft.customerGroupName,
        pricingTier: {
          id: 'tier',
          code: draft.pricingTierCode,
          name: draft.pricingTierName,
          discountPercent: 0,
          description: '',
          badgeBg: '#FFF7ED',
          badgeColor: '#C2410C'
        },
        regionId: '',
        regionName: '',
        assignedRepId: '',
        assignedRepName: '',
        phone: '',
        email: '',
        address: draft.deliveryAddress,
        status: 'ACTIVE',
        hasTransactions: true,
        transactionCount: 1,
        totalDebt: 0,
        creditLimit: 100000000,
        createdAt: '',
        updatedAt: ''
      });
    }

    if (draft.deliveryPointId) {
      setSelectedDeliveryPoint({
        id: draft.deliveryPointId,
        agencyId: draft.agencyId,
        name: draft.deliveryPointName,
        address: draft.deliveryAddress,
        contactPerson: '',
        phone: '',
        isDefault: true,
        createdAt: '',
        updatedAt: ''
      });
    }

    showToast('Đã mở đơn nháp', `Đã tải lại đơn nháp [${draft.id}]`, 'info');
  };

  // Xóa đơn nháp
  const handleDeleteDraft = (draftId: string) => {
    deleteDraft(draftId);
    setSavedDrafts(getSavedDrafts());
    showToast('Đã xóa nháp', 'Đã xóa đơn nháp thành công', 'info');
  };

  // Điều kiện kiểm tra trước khi chốt đơn
  const isAgencyLocked = Boolean(selectedAgency?.transactionLocked);
  const hasNoItems = items.length === 0;
  const hasNoAgency = !selectedAgency;

  let disabledReason = '';
  if (hasNoAgency) disabledReason = 'Vui lòng chọn đại lý đặt hàng';
  else if (isAgencyLocked) disabledReason = 'Đại lý bị khóa nợ xấu - Chặn tạo đơn mới (S3-07)';
  else if (hasNoItems) disabledReason = 'Vui lòng thêm ít nhất 1 sản phẩm';

  // Chốt đơn hàng chính thức
  const handleSubmitOrder = () => {
    if (disabledReason) {
      showToast('Chưa thể chốt đơn', disabledReason, 'error');
      return;
    }

    setIsSubmitting(true);
    const draftObj: OrderDraft = {
      id: currentDraftId,
      status: 'CONFIRMED',
      agencyId: selectedAgency!.id,
      agencyCode: selectedAgency!.code,
      agencyName: selectedAgency!.name,
      customerGroup: selectedAgency!.customerGroup,
      customerGroupName: selectedAgency!.customerGroupName,
      pricingTierCode: selectedAgency!.pricingTier.code,
      pricingTierName: selectedAgency!.pricingTier.name,
      deliveryPointId: selectedDeliveryPoint?.id || '',
      deliveryPointName: selectedDeliveryPoint?.name || 'Kho chính đại lý',
      deliveryAddress: selectedDeliveryPoint?.address || selectedAgency!.address,
      expectedDeliveryDate,
      note: orderNote,
      items,
      totalItemsCount: totals.totalItemsCount,
      totalQuantity: totals.totalQuantity,
      subtotalAmount: totals.subtotalAmount,
      discountAmount: totals.discountAmount,
      totalPayable: totals.totalPayable,
      salesRepId: String(user?.id || 'REP_001'),
      salesRepName: user?.fullName || 'Nhân viên kinh doanh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = confirmOrder(draftObj);
    setIsSubmitting(false);

    if (result.success) {
      setConfirmedOrderResult({
        orderNumber: result.orderNumber,
        agencyName: draftObj.agencyName,
        totalPayable: draftObj.totalPayable
      });
      // Reset form sau khi chốt
      setCurrentDraftId(`DRAFT-${Date.now()}`);
      setSelectedAgency(null);
      setSelectedDeliveryPoint(null);
      setOrderNote('');
      setItems([]);
      setSavedDrafts(getSavedDrafts());
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-28">
      {/* 1. Header Trang & Các Phím Thao Tác Nhanh */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-[#EE4D2D] text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
            <ShoppingCart size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                Tạo Đơn Hàng Cho Đại Lý
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 font-mono">
                S3-09 / EP-04
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Gõ đơn nhanh tại cửa hàng đại lý, tự động áp bảng giá & chiết khấu sản lượng
            </p>
          </div>
        </div>

        {/* Nút thao tác góc phải */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Nút giả lập màn hình 360px cho Tester / Reviewer */}
          <button
            type="button"
            onClick={() => setIsSimulating360Mobile(!isSimulating360Mobile)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSimulating360Mobile
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Bật/Tắt chế độ mô phỏng khung nhìn di động 360px"
          >
            {isSimulating360Mobile ? <Smartphone size={15} /> : <Monitor size={15} />}
            <span>{isSimulating360Mobile ? 'Đang bật 360px' : 'Mô phỏng 360px'}</span>
          </button>

          {/* Nút Xem danh sách đơn nháp */}
          <button
            type="button"
            onClick={() => setIsDraftsModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:text-[#F85606] hover:bg-orange-50/50 flex items-center gap-1.5 transition-all relative"
            title="Xem các đơn nháp đã lưu trên máy"
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

      {/* Bọc trong khung mô phỏng 360px nếu người dùng kích hoạt */}
      <div
        className={`transition-all duration-300 mx-auto ${
          isSimulating360Mobile
            ? 'max-w-[360px] p-2 bg-slate-900/10 rounded-3xl border-4 border-slate-700 shadow-2xl space-y-4'
            : 'space-y-5'
        }`}
      >
        {isSimulating360Mobile && (
          <div className="bg-slate-800 text-white text-center py-1 rounded-t-xl text-[11px] font-mono flex items-center justify-center gap-1">
            <Smartphone size={12} />
            <span>Khung nhìn điện thoại chuẩn 360px</span>
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
              onClick={() => setIsProductPickerOpen(true)}
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
                onClick={() => setIsProductPickerOpen(true)}
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
                  onClick={() => setIsProductPickerOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-orange-300 hover:border-[#F85606] bg-orange-50/40 hover:bg-orange-50 text-[#F85606] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus size={15} />
                  <span>Thêm mặt hàng khác vào đơn</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. KHỐI 3: TỔNG KẾT TÀI CHÍNH & QUY TẮC CHIẾT KHẤU REAL-TIME */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              3. Bảng Tóm Tắt Thanh Toán Đơn Hàng
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Tổng tiền hàng (niêm yết):</span>
                <span className="font-mono font-medium">{formatCurrencyVND(totals.subtotalAmount)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-medium">
                <span className="flex items-center gap-1">
                  <Tag size={12} />
                  <span>Chiết khấu sản lượng (Best-Deal Rule S3-01):</span>
                </span>
                <span className="font-mono font-bold">
                  -{formatCurrencyVND(totals.discountAmount)}
                </span>
              </div>

              <div className="flex justify-between items-baseline text-sm sm:text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1.5">
                  <span className="text-[#F85606]">●</span>
                  <span>Tổng tiền phải thu:</span>
                </span>
                <strong className="text-lg sm:text-xl font-black text-[#F85606] font-mono">
                  {formatCurrencyVND(totals.totalPayable)}
                </strong>
              </div>
            </div>

            {/* Banner quy chuẩn Best-Deal */}
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <Tag size={14} className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Quy chuẩn chiết khấu sản lượng (S3-01): </strong>
                Hệ thống tự động áp dụng bậc chiết khấu cao nhất theo tổng số lượng cơ sở (≥20: 3%, ≥50: 5%, ≥100: 8%). Không cần thương lượng miệng từng lần.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. THANH STICKY ACTION BAR Ở ĐÁY MÀN HÌNH (Tối ưu 360px) */}
      <OrderSummaryStickyBar
        totalItemsCount={totals.totalItemsCount}
        totalQuantity={totals.totalQuantity}
        subtotalAmount={totals.subtotalAmount}
        discountAmount={totals.discountAmount}
        totalPayable={totals.totalPayable}
        isSavingDraft={isSavingDraft}
        isSubmittingOrder={isSubmitting}
        onSaveDraft={handleSaveDraft}
        onSubmitOrder={handleSubmitOrder}
        disabledSubmit={Boolean(disabledReason)}
        disabledReason={disabledReason}
      />

      {/* MODAL 1: CHỌN SẢN PHẨM */}
      <ProductPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onSelectProduct={handleAddProduct}
        addedSkuList={addedSkuList}
      />

      {/* MODAL 2: XEM VÀ MỞ LẠI ĐƠN NHÁP */}
      <OrderDraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        drafts={savedDrafts}
        onSelectDraft={handleSelectSavedDraft}
        onDeleteDraft={handleDeleteDraft}
      />

      {/* MODAL 3: CHÚC MỪNG CHỐT ĐƠN THÀNH CÔNG */}
      {confirmedOrderResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 text-center shadow-2xl border border-gray-100 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Tạo Đơn Hàng Thành Công!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Đơn hàng đã được lưu chính thức vào hệ thống phân phối
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-gray-500">Số hiệu đơn:</span>
                <span className="font-mono font-bold text-blue-600">
                  {confirmedOrderResult.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Đại lý:</span>
                <strong className="text-gray-800">{confirmedOrderResult.agencyName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tổng phải thu:</span>
                <strong className="font-mono font-bold text-[#F85606]">
                  {formatCurrencyVND(confirmedOrderResult.totalPayable)}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmedOrderResult(null)}
                className="w-full py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition"
              >
                Tiếp Tục Lên Đơn Mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
