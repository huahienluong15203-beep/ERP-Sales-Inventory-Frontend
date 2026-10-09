import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Agency, DeliveryPoint } from '../../types/agency';
import type {
  OrderDraft,
  OrderItem,
  OrderBackendResponse,
  CustomerPurchaseHistoryItem,
  CustomerLastOrderItem
} from '../../types/order';
import type { OrderProductCatalogItem } from '../../services/orderService';
import {
  createOrderItemFromCatalog,
  createOrderItemFromHistory,
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
  fetchBackendDraftById,
  fetchBackendProductOptions,
  getServingWarehouseInfo
} from '../../services/orderService';
import { fetchAgencies, fetchDeliveryPointsByAgency } from '../../services/agencyApi';
import { useAuth } from '../../contexts/AuthContext';
import { OrderHeaderCard } from '../../components/order/OrderHeaderCard';
import { OrderItemRow } from '../../components/order/OrderItemRow';
import { ProductPickerModal } from '../../components/order/ProductPickerModal';
import { OrderDraftsModal } from '../../components/order/OrderDraftsModal';
import { CustomerPurchaseHistoryCard } from '../../components/order/CustomerPurchaseHistoryCard';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  FileText,
  RefreshCw,
  Tag,
  AlertTriangle,
  AlertCircle,
  Save,
  Check
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

  // Đổi đại lý: xử lý làm mới đơn hàng và bảng giá
  const handleSelectAgency = (agency: Agency) => {
    if (selectedAgency && agency.id === selectedAgency.id) {
      return;
    }

    const hadItems = items.length > 0;
    setSelectedAgency(agency);
    setSelectedDeliveryPoint(null);

    // Khi đổi sang đại lý khác: Luôn làm mới danh sách mặt hàng để tránh lưu sản phẩm & giá cũ của đại lý trước
    if (hadItems) {
      setItems([]);
      setPreview({ status: 'idle' });
      setBackendWarnings([]);
      setBackendDraftId(null);

      if (!agency.priceList) {
        showToast(
          'Đại lý chưa có bảng giá',
          `Đại lý "${agency.name}" chưa có bảng giá hiệu lực. Đã làm mới danh sách sản phẩm.`,
          'error'
        );
      } else {
        showToast(
          'Đã đổi đại lý',
          `Đã chuyển sang đại lý "${agency.name}". Danh sách sản phẩm được làm mới theo bảng giá mới.`,
          'info'
        );
      }
    } else {
      if (!agency.priceList) {
        showToast(
          'Đại lý chưa có bảng giá',
          `Đại lý "${agency.name}" chưa có bảng giá hiệu lực trong hệ thống.`,
          'error'
        );
      }
    }
  };

  const openProductPicker = () => {
    if (!selectedAgency) {
      showToast('Chưa chọn đại lý', 'Vui lòng chọn đại lý trước để lấy đúng bảng giá', 'error');
      return;
    }
    if (!selectedAgency.priceList) {
      showToast(
        'Đại lý chưa có bảng giá',
        `Đại lý "${selectedAgency.name}" chưa có bảng giá hiệu lực. Vui lòng thiết lập bảng giá trước khi lên đơn.`,
        'error'
      );
      return;
    }
    setIsProductPickerOpen(true);
  };

  // Xác định kho phục vụ đại lý (S4-03 AC1)
  const servingWarehouse = useMemo(() => getServingWarehouseInfo(selectedAgency), [selectedAgency]);

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
      return [...prev, createOrderItemFromCatalog(product, 1, servingWarehouse)];
    });

    showToast('Đã thêm sản phẩm vào đơn', `Đã thêm ${product.name} vào danh sách`, 'success');
  };

  // S4-04 AC2: Thêm nhanh cả nhóm hàng đã mua lần trước vào đơn mới
  const handleQuickAddAllLastOrder = async (lastOrderItems: CustomerLastOrderItem[]) => {
    if (!selectedAgency) {
      showToast('Chưa chọn đại lý', 'Vui lòng chọn đại lý trước khi thêm hàng', 'error');
      return;
    }
    if (!selectedAgency.priceList) {
      showToast(
        'Đại lý chưa có bảng giá',
        `Đại lý "${selectedAgency.name}" chưa có bảng giá hiệu lực để tính tiền.`,
        'error'
      );
      return;
    }

    try {
      let catalog: OrderProductCatalogItem[] = [];
      if (isBackendId(selectedAgency.id)) {
        try {
          catalog = await fetchBackendProductOptions(selectedAgency.id, '', servingWarehouse);
        } catch {
          // Bỏ qua lỗi mạng
        }
      }
      if (catalog.length === 0) {
        try {
          catalog = await fetchBackendProductOptions(1, '', servingWarehouse);
        } catch {
          // Bỏ qua
        }
      }

      setItems((prev) => {
        const updated = [...prev];

        lastOrderItems.forEach((lastItem) => {
          const catItem = catalog.find((c) => c.sku === lastItem.sku);
          const existingIdx = updated.findIndex((it) => it.sku === lastItem.sku);

          if (existingIdx >= 0) {
            const curr = updated[existingIdx];
            updated[existingIdx] = recalculateOrderItem(
              curr,
              lastItem.quantity,
              lastItem.unitName || curr.selectedUnit
            );
          } else if (catItem) {
            const newItem = createOrderItemFromCatalog(catItem, lastItem.quantity, servingWarehouse);
            updated.push(recalculateOrderItem(newItem, lastItem.quantity, lastItem.unitName));
          } else {
            const fallbackHistory: CustomerPurchaseHistoryItem = {
              productId: lastItem.productId,
              sku: lastItem.sku,
              name: lastItem.name,
              baseUnit: lastItem.unitName,
              preferredUnit: lastItem.unitName,
              preferredConversionFactor: lastItem.conversionFactor || 1,
              totalQuantity3M: lastItem.quantity * 3,
              orderCount3M: 3,
              avgQuantityPerMonth: lastItem.quantity,
              avgQuantityPerOrder: lastItem.quantity,
              lastOrderedDate: new Date().toISOString().slice(0, 10),
              lastUnitPrice: lastItem.unitPrice
            };
            updated.push(createOrderItemFromHistory(fallbackHistory, undefined, lastItem.quantity, servingWarehouse));
          }
        });

        return updated;
      });

      showToast(
        'Đã thêm nhóm hàng lần trước',
        `Đã thêm nhanh ${lastOrderItems.length} mặt hàng từ đơn trước vào đơn mới thành công!`,
        'success'
      );
    } catch (err) {
      console.error('Lỗi khi thêm nhanh đơn cũ:', err);
      showToast('Có lỗi xảy ra', 'Không thể thêm nhóm hàng đã mua lần trước', 'error');
    }
  };

  // S4-04 AC1: Thêm nhanh 1 mặt hàng từ danh sách thường mua
  const handleQuickAddSingleProduct = async (historyItem: CustomerPurchaseHistoryItem) => {
    if (!selectedAgency) {
      showToast('Chưa chọn đại lý', 'Vui lòng chọn đại lý trước', 'error');
      return;
    }

    try {
      let catalogItem: OrderProductCatalogItem | undefined;
      if (isBackendId(selectedAgency.id)) {
        try {
          const catalog = await fetchBackendProductOptions(selectedAgency.id, historyItem.sku, servingWarehouse);
          catalogItem = catalog.find((c) => c.sku === historyItem.sku);
        } catch {
          // Bỏ qua
        }
      }
      if (!catalogItem) {
        try {
          const catalog = await fetchBackendProductOptions(1, historyItem.sku, servingWarehouse);
          catalogItem = catalog.find((c) => c.sku === historyItem.sku);
        } catch {
          // Bỏ qua
        }
      }

      const suggestedQty = Math.max(1, Math.round(historyItem.avgQuantityPerOrder) || 1);

      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.sku === historyItem.sku);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          updated[existingIdx] = recalculateOrderItem(curr, curr.quantity + suggestedQty, curr.selectedUnit);
          return updated;
        }

        const newItem = createOrderItemFromHistory(historyItem, catalogItem, suggestedQty, servingWarehouse);
        return [...prev, newItem];
      });

      showToast(
        'Đã thêm sản phẩm gợi ý',
        `Đã thêm ${historyItem.name} (${suggestedQty} ${historyItem.preferredUnit}) vào đơn hàng`,
        'success'
      );
    } catch (err) {
      console.error('Lỗi khi thêm sản phẩm gợi ý:', err);
      showToast('Có lỗi xảy ra', 'Không thể thêm sản phẩm gợi ý', 'error');
    }
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

  // S4-01: Cập nhật đơn giá thủ công / khôi phục giá niêm yết
  const handleUpdatePrice = (id: string, newPrice: number, resetToOriginal?: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? recalculateOrderItem(item, undefined, undefined, newPrice, resetToOriginal) : item
      )
    );
    if (resetToOriginal) {
      showToast('Đã khôi phục giá', 'Đơn giá đã được đặt lại theo giá niêm yết của bảng giá', 'info');
    } else {
      showToast('Đã cập nhật đơn giá', 'Đơn giá mới đã áp dụng, hệ thống đang tính lại tiền', 'success');
    }
  };

  // Danh sách các dòng bán dưới giá sàn (S4-01 AC3)
  const belowFloorItems = useMemo(() => items.filter((i) => i.isBelowFloor), [items]);

  // S4-03 AC3: Danh sách các dòng đặt vượt tồn khả dụng
  const overStockItems = useMemo(() => items.filter((i) => i.isOverStock), [items]);

  // S4-03 AC3: Tự động điều chỉnh tất cả mặt hàng vượt tồn về mức tồn tối đa còn đặt được
  const handleAutoFixOverStock = () => {
    setItems((prev) =>
      prev.map((item) => {
        if (!item.isOverStock) return item;
        const maxAllowed = item.maxAllowedQuantity ?? item.availableInSelectedUnit ?? 0;
        return recalculateOrderItem(item, Math.max(1, maxAllowed));
      })
    );
    showToast('Đã chỉnh về tồn tối đa', 'Đã tự động điều chỉnh số lượng các mặt hàng về mức tồn khả dụng', 'success');
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
    if (!selectedAgency.priceList) {
      showToast('Chưa có bảng giá', 'Đại lý chưa có bảng giá hiệu lực, không thể lưu nháp đơn hàng', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Chưa có sản phẩm', 'Vui lòng thêm ít nhất 1 sản phẩm trước khi lưu nháp', 'error');
      return;
    }

    if (overStockItems.length > 0) {
      showToast(
        'Vượt tồn khả dụng',
        `Có ${overStockItems.length} mặt hàng đặt vượt tồn khả dụng tại ${servingWarehouse.name}. Vui lòng chỉnh số lượng trước khi lưu.`,
        'error'
      );
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

  const isAgencyLocked = Boolean(selectedAgency?.transactionLocked);
  const money = preview.status === 'ok' ? preview.order : null;

  // S4-03 AC3: Chặn chốt đơn nếu có mặt hàng vượt tồn kho khả dụng
  const submitBlockedReason = useMemo(() => {
    if (overStockItems.length > 0) {
      return `Chặn chốt đơn: Có ${overStockItems.length} mặt hàng vượt quá tồn khả dụng tại kho ${servingWarehouse.name}. Vui lòng chỉnh số lượng.`;
    }
    if (isAgencyLocked) {
      return 'Đại lý đang bị khóa giao dịch - chặn tạo đơn mới (S3-07).';
    }
    return undefined;
  }, [overStockItems.length, servingWarehouse.name, isAgencyLocked]);

  return (
    <div className="w-full min-w-0 space-y-5 animate-in fade-in duration-300 pb-10">
      {/* 1. Header Trang & Các Phím Thao Tác Nhanh */}
      <div className="flex items-center justify-end gap-2 pb-1">
        {/* Nút thao tác góc phải */}
        <div className="flex items-center gap-2">
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

        {/* CẢNH BÁO VƯỢT TỒN KHẢ DỤNG - CHẶN ĐẶT HÀNG (S4-03 AC3) */}
        {overStockItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle size={22} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                    Chặn đặt hàng: Có {overStockItems.length} mặt hàng vượt quá tồn khả dụng tại {servingWarehouse.name}!
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">
                    CHẶN LƯU & CHỐT ĐƠN
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-rose-800 leading-relaxed">
                  Các sản phẩm ({overStockItems.map((i) => `${i.name} [Đang đặt: ${i.quantity} ${i.selectedUnit} / Tồn: ${i.maxAllowedQuantity ?? 0} ${i.selectedUnit}]`).join('; ')}) vượt quá khả năng xuất kho. Hệ thống chặn lưu và chốt đơn để không thất hứa với đại lý.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoFixOverStock}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 shadow-sm cursor-pointer transition active:scale-95 flex items-center gap-1.5 self-end sm:self-center"
              title="Tự động chỉnh số lượng tất cả mặt hàng về mức tồn khả dụng tối đa"
            >
              <Check size={14} />
              <span>Chỉnh tất cả về tồn tối đa</span>
            </button>
          </div>
        )}

        {/* CẢNH BÁO ĐƠN GIÁ DƯỚI GIÁ SÀN - CẦN QUẢN LÝ DUYỆT (S4-01 AC3) */}
        {belowFloorItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-900 shadow-xs flex items-start gap-3 animate-in fade-in">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                  Cảnh báo: Có {belowFloorItems.length} mặt hàng bán dưới giá sàn!
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                  Trạng thái đơn: CẦN DUYỆT
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 leading-relaxed">
                Các sản phẩm ({belowFloorItems.map((i) => `${i.name} [${i.sku}]`).join(', ')}) có đơn giá thấp hơn giá sàn quy định.
                Đơn hàng khi chốt sẽ chuyển sang trạng thái <strong>"Chờ duyệt" (Pending Approval)</strong> và cần Quản lý kinh doanh phê duyệt trước khi xuất kho.
              </p>
            </div>
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

        {/* S4-04: GỢI Ý & LỊCH SỬ MUA HÀNG 3 THÁNG CỦA ĐẠI LÝ */}
        {selectedAgency && (
          <CustomerPurchaseHistoryCard
            selectedAgency={selectedAgency}
            currentUser={user}
            servingWarehouse={servingWarehouse}
            existingCartItems={items}
            onQuickAddAllLastOrder={handleQuickAddAllLastOrder}
            onQuickAddSingleProduct={handleQuickAddSingleProduct}
          />
        )}

        {/* 3. KHỐI 2: DANH SÁCH DÒNG SẢN PHẨM ĐẶT HÀNG */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
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

            {/* Nút mở Picker thêm sản phẩm duy nhất */}
            <button
              type="button"
              onClick={openProductPicker}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer self-start sm:self-auto shrink-0 ${
                selectedAgency && !selectedAgency.priceList
                  ? 'bg-gray-400 hover:bg-gray-500 shadow-none'
                  : 'bg-[#F85606] hover:bg-orange-600 shadow-orange-500/20 active:scale-98'
              }`}
            >
              <Plus size={16} />
              <span>Thêm Sản Phẩm</span>
            </button>
          </div>

          {/* Vùng hiển thị các dòng hàng */}
          {items.length === 0 ? (
            <div
              onClick={openProductPicker}
              className={`py-12 px-4 rounded-xl border border-dashed text-center space-y-3 cursor-pointer transition-colors group ${
                selectedAgency && !selectedAgency.priceList
                  ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/60'
                  : 'border-gray-200 hover:border-orange-300 bg-gray-50/50 hover:bg-orange-50/20'
              }`}
              title="Nhấn để tìm và thêm sản phẩm vào đơn hàng"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-colors ${
                  selectedAgency && !selectedAgency.priceList
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-orange-50 group-hover:bg-orange-100 text-[#F85606]'
                }`}
              >
                {selectedAgency && !selectedAgency.priceList ? (
                  <AlertTriangle size={28} />
                ) : (
                  <ShoppingCart size={28} />
                )}
              </div>
              <div>
                <strong
                  className={`text-sm font-bold block transition-colors ${
                    selectedAgency && !selectedAgency.priceList
                      ? 'text-amber-900'
                      : 'text-gray-800 group-hover:text-[#F85606]'
                  }`}
                >
                  {selectedAgency && !selectedAgency.priceList
                    ? 'Đại lý chưa có bảng giá hiệu lực'
                    : 'Đơn hàng chưa có sản phẩm nào'}
                </strong>
                <span className="text-xs text-gray-500 max-w-sm block mx-auto mt-0.5">
                  {selectedAgency && !selectedAgency.priceList
                    ? `Nhóm khách hàng "${selectedAgency.customerGroupName}" chưa có bảng giá nào đang hoạt động. Vui lòng thiết lập bảng giá trước khi lên đơn.`
                    : 'Nhấn nút "+ Thêm Sản Phẩm" để tìm nhanh SKU theo danh mục và chọn đơn vị quy đổi (thùng/lốc/lon).'}
                </span>
              </div>
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
                  onUpdatePrice={handleUpdatePrice}
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

          {/* Tiền do Backend tính theo bảng giá + chính sách chiết khấu sản lượng đang hiệu lực (Nhảy số tức thì trên client) */}
          {!selectedAgency ? (
            <p className="text-xs text-gray-500">Chọn đại lý và thêm sản phẩm để hệ thống tính tiền.</p>
          ) : !selectedAgency.priceList ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong className="block">Đại lý chưa có bảng giá hiệu lực</strong>
                <span>Cần có bảng giá đang áp dụng để tính tiền hàng và chiết khấu.</span>
              </div>
            </div>
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
            <div className={`space-y-2.5 text-xs transition-opacity ${preview.status === 'loading' ? 'opacity-75' : ''}`}>
              <div className="flex justify-between text-gray-600">
                <span>Tổng tiền hàng (trước chiết khấu):</span>
                <span className="font-mono font-bold text-gray-900">
                  {formatCurrencyVND(money ? Number(money.subtotal) : totals.subtotalAmount)}
                </span>
              </div>

              {(money ? Number(money.discountTotal) > 0 : totals.discountAmount > 0) && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    <span>Chiết khấu sản lượng tự động:</span>
                  </span>
                  <span className="font-mono font-bold">
                    -{formatCurrencyVND(money ? Number(money.discountTotal) : totals.discountAmount)}
                  </span>
                </div>
              )}

              {/* Dòng cảnh báo mặt hàng vượt tồn khả dụng (S4-03 AC3) */}
              {overStockItems.length > 0 && (
                <div className="flex justify-between items-center text-rose-950 font-semibold bg-rose-100/90 p-2.5 rounded-xl border border-rose-300">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                    <span>Mặt hàng vượt tồn khả dụng:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                      {overStockItems.length} mặt hàng (Bị chặn)
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFixOverStock}
                      className="text-[11px] text-rose-700 underline font-bold hover:text-rose-900 cursor-pointer"
                    >
                      Tự động chỉnh
                    </button>
                  </div>
                </div>
              )}

              {/* Dòng cảnh báo mặt hàng dưới giá sàn (AC3) */}
              {belowFloorItems.length > 0 && (
                <div className="flex justify-between items-center text-amber-900 font-semibold bg-amber-100/80 p-2 rounded-xl border border-amber-300">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <span>Mặt hàng bán dưới giá sàn:</span>
                  </span>
                  <span className="font-bold text-xs bg-amber-200 px-2 py-0.5 rounded-full text-amber-900">
                    {belowFloorItems.length} mặt hàng (Cần Quản lý duyệt)
                  </span>
                </div>
              )}

              <div className="flex justify-between items-baseline text-sm sm:text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1.5">
                  <span className="text-[#F85606]">●</span>
                  <span>Tổng tiền phải thu:</span>
                </span>
                <strong className="text-lg sm:text-xl font-black text-[#F85606] font-mono">
                  {formatCurrencyVND(money ? Number(money.totalAmount) : totals.totalPayable)}
                </strong>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
            <Tag size={14} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              Đơn giá lấy từ <strong>bảng giá đang hiệu lực</strong> của nhóm khách hàng mà đại lý thuộc về; chiết khấu sản lượng
              tự động nhảy lại theo <strong>chính sách chiết khấu</strong> mỗi khi số lượng hoặc đơn giá thay đổi. Nếu sửa giá dưới giá sàn, đơn sẽ được chuyển sang <strong>Chờ Quản lý duyệt</strong>.
            </div>
          </div>

          {/* Hàng nút bấm Lưu Nháp & Chốt Đơn (Nằm gọn trong trang, không bám theo taskbar/sidebar) */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || overStockItems.length > 0}
              className={`h-10 px-4 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
                overStockItems.length > 0
                  ? 'border-rose-300 bg-rose-50 text-rose-800 cursor-not-allowed opacity-60'
                  : belowFloorItems.length > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
              }`}
              title={
                overStockItems.length > 0
                  ? 'Không thể lưu nháp khi có mặt hàng vượt tồn khả dụng'
                  : belowFloorItems.length > 0
                  ? 'Lưu đơn nháp (đơn có dòng dưới giá sàn sẽ ở trạng thái cần duyệt)'
                  : 'Lưu nháp đơn hàng để tiếp tục sau'
              }
            >
              {overStockItems.length > 0 ? (
                <AlertTriangle size={15} className="text-rose-600" />
              ) : belowFloorItems.length > 0 ? (
                <AlertTriangle size={15} className="text-amber-600" />
              ) : (
                <Save size={15} className="text-gray-600" />
              )}
              <span>
                {isSavingDraft
                  ? 'Đang lưu...'
                  : overStockItems.length > 0
                  ? 'Bị Chặn (Vượt Tồn Kho)'
                  : belowFloorItems.length > 0
                  ? 'Lưu Đơn (Cần Duyệt Giá)'
                  : 'Lưu Nháp'}
              </span>
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
        cartItems={items}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
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
