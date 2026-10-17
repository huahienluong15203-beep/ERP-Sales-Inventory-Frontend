import React, { useState, useEffect } from 'react';
import { useNavigate } from '../../routes/Router';
import {
  ArrowLeft,
  Warehouse as WarehouseIcon,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Package,
  Info,
  Clock
} from 'lucide-react';
import { authFetch, API_BASE_URL } from '../../services/api';
import { productService } from '../../services/productService';
import { calculateStockByLot } from '../../services/productLotApi';
import { createStockAdjustment } from '../../services/stockAdjustmentApi';
import type { Product } from '../../types/product';
import type { ProductLotResponse } from '../../types/productLot';
import type { StockAdjustmentCreateRequest } from '../../types/stockAdjustment';

interface AdjustmentFormLine {
  id: string; // unique key for form
  productId: number;
  productSku: string;
  productName: string;
  baseUnit: string;
  currentStock: number;
  costPrice: number;
  adjustmentQuantity: number;
  lossValue: number;
  hasBatchManagement: boolean;
  batchNumber?: string;
  availableLots: ProductLotResponse[];
  lotLoading: boolean;
  lotStockMax?: number;
  lineNotes?: string;
}

export const StockAdjustmentCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Kho hàng & Thông tin chung
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState<boolean>(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [reasonDescription, setReasonDescription] = useState<string>('');
  const [adjustmentDate, setAdjustmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  // Validation errors
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Danh mục sản phẩm & Dòng điều chỉnh
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [costMap, setCostMap] = useState<Record<number, number>>({});
  const [warehouseStockItems, setWarehouseStockItems] = useState<{
    productId: number;
    sku: string;
    name: string;
    baseUnit: string;
    physicalStock: number;
    hasBatchManagement: boolean;
    costPrice: number;
  }[]>([]);
  const [loadingWarehouseStock, setLoadingWarehouseStock] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [lines, setLines] = useState<AdjustmentFormLine[]>([]);

  // Trạng thái gửi
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // 1. Tải danh sách kho và CHỈ giữ lại các kho có sản phẩm tồn kho thực tế (> 0)
  useEffect(() => {
    async function loadWarehousesWithStock() {
      setLoadingWarehouses(true);
      try {
        const res = await authFetch(`${API_BASE_URL}/api/warehouses`);
        const data = res.ok ? await res.json() : [];
        const activeWarehouses = (Array.isArray(data) ? data : []).filter(
          (w: any) => w.status === 'ACTIVE' || !w.status
        );

        // Kiểm tra từng kho xem có sản phẩm trong sổ tồn kho không
        const checkResults = await Promise.all(
          activeWarehouses.map(async (w: any) => {
            try {
              const ledgerRes = await authFetch(
                `${API_BASE_URL}/api/inventory/stock-ledger?warehouseId=${w.id}&size=1`
              );
              if (ledgerRes.ok) {
                const ledgerData = await ledgerRes.json();
                const total = Number(ledgerData?.totalElements) || 0;
                return { warehouse: w, hasStock: total > 0 };
              }
            } catch {
              // ignore
            }
            return { warehouse: w, hasStock: false };
          })
        );

        const validWarehouses = checkResults
          .filter((r) => r.hasStock)
          .map((r) => r.warehouse);

        setWarehouses(validWarehouses);
        if (validWarehouses.length > 0) {
          setSelectedWarehouseId(validWarehouses[0].id);
        } else {
          setSelectedWarehouseId('');
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách kho:', err);
      } finally {
        setLoadingWarehouses(false);
      }
    }

    loadWarehousesWithStock();
  }, []);

  // 2. Tải bảng giá vốn (costPrice) từ backend phục vụ tính toán tổn thất
  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/stock-adjustments/product-costs`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (data && typeof data === 'object') {
          const map: Record<number, number> = {};
          Object.entries(data).forEach(([k, v]) => {
            map[Number(k)] = Number(v) || 0;
          });
          setCostMap(map);
        }
      })
      .catch((err) => console.warn('Lỗi tải bảng giá vốn:', err));
  }, []);

  // 3. Tải danh mục sản phẩm toàn hệ thống (để lấy thông tin quản lý lô)
  useEffect(() => {
    productService
      .getProducts({ page: 0, size: 300 })
      .then((res) => setAllProducts(res.products || []))
      .catch((err) => console.warn('Lỗi tải danh mục sản phẩm:', err));
  }, []);

  // 4. Khi kho được chọn thay đổi: tải danh sách các mặt hàng có tồn kho > 0 tại kho đó
  useEffect(() => {
    if (!selectedWarehouseId) {
      setWarehouseStockItems([]);
      return;
    }

    setLoadingWarehouseStock(true);
    authFetch(
      `${API_BASE_URL}/api/inventory/stock-ledger?warehouseId=${selectedWarehouseId}&size=500`
    )
      .then((res) => (res.ok ? res.json() : { content: [] }))
      .then((data) => {
        const content = Array.isArray(data?.content) ? data.content : [];
        const itemsWithStock = content
          .filter((row: any) => Number(row.physicalStock) > 0)
          .map((row: any) => {
            const pId = Number(row.productId);
            const globalProduct = allProducts.find((p) => Number(p.id) === pId);
            const cost = costMap[pId] ?? (Number(globalProduct?.costPrice) || 0);
            return {
              productId: pId,
              sku: row.sku,
              name: row.productName,
              baseUnit: row.baseUnit || 'Cái',
              physicalStock: Number(row.physicalStock) || 0,
              hasBatchManagement: Boolean(globalProduct?.hasBatchManagement),
              costPrice: cost
            };
          });

        setWarehouseStockItems(itemsWithStock);
      })
      .catch((err) => {
        console.warn('Lỗi tải tồn kho của kho đã chọn:', err);
        setWarehouseStockItems([]);
      })
      .finally(() => setLoadingWarehouseStock(false));
  }, [selectedWarehouseId, allProducts, costMap]);

  // Xóa danh sách sản phẩm khi đổi kho để tránh lệch tồn kho
  const handleWarehouseChange = (newWarehouseId: number) => {
    if (lines.length > 0) {
      if (
        window.confirm(
          'Đổi kho hàng sẽ làm mới lại danh sách mặt hàng để đảm bảo tồn kho chính xác. Bạn có chắc chắn muốn đổi kho?'
        )
      ) {
        setSelectedWarehouseId(newWarehouseId);
        setLines([]);
        setWarehouseError(null);
      }
    } else {
      setSelectedWarehouseId(newWarehouseId);
      setWarehouseError(null);
    }
  };

  // Chọn thêm một sản phẩm có tồn kho thực tế vào danh sách điều chỉnh
  const handleAddStockItem = async (item: {
    productId: number;
    sku: string;
    name: string;
    baseUnit: string;
    physicalStock: number;
    hasBatchManagement: boolean;
    costPrice: number;
  }) => {
    setIsProductDropdownOpen(false);
    setProductSearch('');
    setItemsError(null);

    // Kiểm tra xem sản phẩm đã có trong bảng chưa
    if (lines.some((l) => l.productId === item.productId)) {
      alert(`Sản phẩm [${item.sku}] đã có trong phiếu. Vui lòng chỉnh sửa số lượng ở dòng tương ứng.`);
      return;
    }

    if (!selectedWarehouseId) {
      setWarehouseError('Vui lòng chọn kho hàng trước khi thêm sản phẩm');
      return;
    }

    const uniqueKey = `line_${item.productId}_${Date.now()}`;
    const costPrice = item.costPrice || costMap[item.productId] || 0;
    const hasBatch = item.hasBatchManagement;

    // Khởi tạo dòng mới
    const newLine: AdjustmentFormLine = {
      id: uniqueKey,
      productId: item.productId,
      productSku: item.sku,
      productName: item.name,
      baseUnit: item.baseUnit,
      currentStock: item.physicalStock,
      costPrice,
      adjustmentQuantity: 1,
      lossValue: costPrice * 1,
      hasBatchManagement: hasBatch,
      availableLots: [],
      lotLoading: hasBatch,
      lineNotes: ''
    };

    setLines((prev) => [...prev, newLine]);

    // Nếu quản lý theo lô, tải danh sách lô của sản phẩm tại kho này
    if (hasBatch) {
      try {
        const lotData = await calculateStockByLot(item.productId, selectedWarehouseId).catch(() => ({ lots: [] }));
        const availableLots: ProductLotResponse[] = lotData?.lots || [];
        const firstLot = availableLots.length > 0 ? availableLots[0] : undefined;

        setLines((prev) =>
          prev.map((l) => {
            if (l.id === uniqueKey) {
              return {
                ...l,
                availableLots,
                lotLoading: false,
                batchNumber: firstLot ? firstLot.batchNumber : undefined,
                lotStockMax: firstLot ? Number(firstLot.quantity) : undefined
              };
            }
            return l;
          })
        );
      } catch (err) {
        console.warn('Lỗi nạp lô sản phẩm:', err);
        setLines((prev) =>
          prev.map((l) => (l.id === uniqueKey ? { ...l, lotLoading: false } : l))
        );
      }
    }
  };

  // Thay đổi số lượng giảm
  const handleQuantityChange = (lineId: string, qtyStr: string) => {
    const qty = parseFloat(qtyStr);
    const validQty = isNaN(qty) || qty < 0 ? 0 : qty;

    setLines((prev) =>
      prev.map((l) => {
        if (l.id === lineId) {
          const lossValue = validQty * l.costPrice;
          return {
            ...l,
            adjustmentQuantity: validQty,
            lossValue
          };
        }
        return l;
      })
    );
  };

  // Chọn hoặc nhập số lô hàng cho sản phẩm theo lô
  const handleLotChange = (lineId: string, batchNumber: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id === lineId) {
          const foundLot = l.availableLots.find(
            (lot) => lot.batchNumber.trim().toLowerCase() === batchNumber.trim().toLowerCase()
          );
          return {
            ...l,
            batchNumber,
            lotStockMax: foundLot ? Number(foundLot.quantity) : undefined
          };
        }
        return l;
      })
    );
  };

  // Xóa một dòng
  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Tổng hợp giá trị
  const totalQuantity = lines.reduce((sum, l) => sum + (Number(l.adjustmentQuantity) || 0), 0);
  const totalLossValue = lines.reduce((sum, l) => sum + (Number(l.lossValue) || 0), 0);

  const formatVnd = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  // Gửi tạo phiếu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation 1: Bắt buộc chọn lý do điều chỉnh (Test FE: Test UI hiển thị lỗi nếu chưa có lý do)
    if (!adjustmentReason || !adjustmentReason.trim()) {
      setReasonError('Bắt buộc phải chọn lý do điều chỉnh tồn kho (Hàng hỏng, hàng mất, hết hạn...)');
      // Scroll to reason select
      const el = document.getElementById('adjustment-reason-select');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
      return;
    } else {
      setReasonError(null);
    }

    // Validation 2: Bắt buộc chọn kho hàng
    if (!selectedWarehouseId) {
      setWarehouseError('Vui lòng chọn kho hàng áp dụng điều chỉnh');
      return;
    } else {
      setWarehouseError(null);
    }

    // Validation 3: Bắt buộc có ít nhất 1 dòng mặt hàng
    if (lines.length === 0) {
      setItemsError('Phiếu điều chỉnh phải có ít nhất một dòng mặt hàng');
      return;
    } else {
      setItemsError(null);
    }

    // Validation 4: Kiểm tra số lượng và số lô từng dòng
    for (const l of lines) {
      if (l.adjustmentQuantity <= 0) {
        setSubmitError(`Số lượng giảm của sản phẩm [${l.productSku}] phải lớn hơn 0`);
        return;
      }
      if (l.adjustmentQuantity > l.currentStock) {
        setSubmitError(
          `Số lượng giảm (${l.adjustmentQuantity}) của [${l.productSku}] vượt quá tồn kho thực tế hiện tại (${l.currentStock})`
        );
        return;
      }
      if (l.hasBatchManagement) {
        if (!l.batchNumber || !l.batchNumber.trim()) {
          setSubmitError(`Mặt hàng [${l.productSku}] quản lý theo lô, bắt buộc phải nhập hoặc chọn số lô`);
          return;
        }
        if (l.lotStockMax !== undefined && l.adjustmentQuantity > l.lotStockMax) {
          setSubmitError(
            `Số lượng giảm (${l.adjustmentQuantity}) vượt quá tồn trong lô ${l.batchNumber} (${l.lotStockMax}) của [${l.productSku}]`
          );
          return;
        }
      }
    }

    const payload: StockAdjustmentCreateRequest = {
      warehouseId: Number(selectedWarehouseId),
      adjustmentReason: adjustmentReason.trim(),
      reasonDescription: reasonDescription.trim() || undefined,
      adjustmentDate: adjustmentDate || undefined,
      notes: notes.trim() || undefined,
      items: lines.map((l) => ({
        productId: l.productId,
        adjustmentQuantity: l.adjustmentQuantity,
        batchNumber: l.batchNumber || undefined,
        lineNotes: l.lineNotes?.trim() || undefined
      }))
    };

    setSubmitting(true);
    try {
      await createStockAdjustment(payload);
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/inventory/stock-adjustments');
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Lỗi khi lập phiếu điều chỉnh tồn kho');
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc danh sách sản phẩm hiển thị trong dropdown "+ Thêm Mặt Hàng"
  // CHỈ hiển thị những mặt hàng có tồn kho > 0 tại kho đã chọn
  const filteredAvailableItems = warehouseStockItems.filter((item) => {
    if (lines.some((l) => l.productId === item.productId)) return false;
    if (!productSearch.trim()) return true;
    const term = productSearch.toLowerCase().trim();
    return (
      item.sku.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="erp-fade-in space-y-4 w-full pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/inventory/stock-adjustments')}
          className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
          id="stock-adjustment-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>
            Lập phiếu điều chỉnh thành công! Phiếu đã chuyển sang trạng thái <strong>Chờ duyệt</strong>. Đang chuyển hướng...
          </span>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in shake">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* THÔNG TIN CHUNG PHIẾU ĐIỀU CHỈNH */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Info size={14} className="text-orange-600" />
            <span>Thông Tin Điều Chỉnh Tồn Kho</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kho hàng */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <span>Kho hàng áp dụng</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => handleWarehouseChange(Number(e.target.value))}
                  disabled={loadingWarehouses}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none transition appearance-none ${
                    warehouseError ? 'border-rose-500 bg-rose-50/20' : 'border-gray-200 focus:border-orange-500'
                  }`}
                >
                  {loadingWarehouses ? (
                    <option value="">-- Đang kiểm tra tồn kho các kho hàng... --</option>
                  ) : warehouses.length === 0 ? (
                    <option value="">-- Không có kho nào có sản phẩm tồn kho khả dụng --</option>
                  ) : (
                    <>
                      <option value="">-- Chọn kho hàng --</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <WarehouseIcon size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
              </div>
              {warehouseError && (
                <span className="block text-[11px] text-rose-600 font-semibold mt-1">
                  {warehouseError}
                </span>
              )}
              {warehouses.length === 0 && !loadingWarehouses && (
                <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] flex items-center gap-1.5">
                  <Info size={13} className="shrink-0" />
                  <span>Không tìm thấy kho hàng nào có sản phẩm khả dụng với tài khoản hiện tại.</span>
                </div>
              )}
            </div>

            {/* BẮT BUỘC CHỌN LÝ DO ĐIỀU CHỈNH (AC 1 & TEST FE UI ERROR) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <span>Lý do điều chỉnh / hao hụt</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                id="adjustment-reason-select"
                value={adjustmentReason}
                onChange={(e) => {
                  setAdjustmentReason(e.target.value);
                  if (e.target.value) setReasonError(null);
                }}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-bold transition focus:outline-none ${
                  reasonError
                    ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-orange-500'
                }`}
              >
                <option value="">-- Bắt buộc chọn lý do --</option>
                <option value="DAMAGED_GOODS">Hàng hỏng / hư hại trong kho</option>
                <option value="LOST_GOODS">Hàng mất / thất thoát khi kiểm kê</option>
                <option value="EXPIRED_DISPOSAL">Hàng hết hạn sử dụng phải tiêu huỷ</option>
                <option value="OTHER">Lý do điều chỉnh khác</option>
              </select>

              {/* Thông báo lỗi validation nếu chưa chọn lý do */}
              {reasonError && (
                <span className="block text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{reasonError}</span>
                </span>
              )}
            </div>

            {/* Ngày điều chỉnh */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <span>Ngày lập phiếu</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                />
                <Calendar size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Mô tả chi tiết lý do */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mô tả chi tiết nguyên nhân tổn thất (nếu có)
              </label>
              <input
                type="text"
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                placeholder="Ví dụ: Rơi vỡ pallet khi bốc xếp, chuột cắn bao bì góc kho B..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            {/* Ghi chú chung */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Ghi chú nội bộ
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú thêm gửi Quản lý kho xem xét..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* BẢNG MẶT HÀNG ĐIỀU CHỈNH & TỔN THẤT */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Package size={15} className="text-orange-600" />
                <span>Danh Sách Mặt Hàng Điều Chỉnh Giảm Tồn Kho</span>
              </h2>
            </div>

            {/* Dropdown Thêm sản phẩm */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm Mặt Hàng</span>
              </button>

              {isProductDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-2.5 z-40 animate-in fade-in zoom-in-95">
                  <div className="mb-2">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Tìm theo SKU hoặc tên..."
                      className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {loadingWarehouseStock ? (
                      <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
                        <Clock size={14} className="animate-spin text-orange-500" />
                        <span>Đang tải danh sách tồn kho...</span>
                      </div>
                    ) : filteredAvailableItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        {warehouseStockItems.length === 0
                          ? 'Kho này hiện chưa có mặt hàng nào có tồn kho (> 0) để điều chỉnh'
                          : 'Không tìm thấy sản phẩm phù hợp'}
                      </div>
                    ) : (
                      filteredAvailableItems.slice(0, 40).map((item) => (
                        <button
                          key={item.productId}
                          type="button"
                          onClick={() => handleAddStockItem(item)}
                          className="w-full text-left p-2.5 hover:bg-orange-50/70 rounded-xl transition cursor-pointer flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-orange-600">{item.sku}</span>
                            <span className="text-[11px] font-bold text-gray-700 font-mono">
                              {formatVnd(item.costPrice)}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-900 truncate">{item.name}</span>
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                            <span className="font-semibold text-gray-600">
                              ĐVT: {item.baseUnit} • Tồn: <span className="text-emerald-600 font-bold">{item.physicalStock.toLocaleString('vi-VN')}</span>
                            </span>
                            {item.hasBatchManagement && (
                              <span className="text-orange-600 font-semibold">• Theo dõi lô</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {itemsError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>{itemsError}</span>
            </div>
          )}

          {/* Table */}
          <div className="border border-gray-200 rounded-2xl overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-left">#</th>
                  <th className="py-3 px-3 text-left min-w-[190px]">Sản Phẩm</th>
                  <th className="py-3 px-3 text-left w-56 min-w-[210px]">Số Lô Hàng</th>
                  <th className="py-3 px-3 text-right w-20 whitespace-nowrap">Tồn Kho</th>
                  <th className="py-3 px-3 text-center w-24 whitespace-nowrap">SL Giảm</th>
                  <th className="py-3 px-3 text-right w-32 min-w-[115px] whitespace-nowrap">Giá Vốn</th>
                  <th className="py-3 px-3 text-right w-36 min-w-[125px] whitespace-nowrap">Thành Tiền</th>
                  <th className="py-3 px-3 text-left min-w-[160px]">Ghi Chú</th>
                  <th className="py-3 px-2 w-12 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <Package size={30} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-bold text-gray-700">Chưa có sản phẩm nào trong phiếu điều chỉnh</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Bấm nút <strong>"Thêm Mặt Hàng"</strong> ở trên để chọn các sản phẩm bị hao hụt.
                      </p>
                    </td>
                  </tr>
                ) : (
                  lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3.5 text-gray-400 font-medium">{idx + 1}</td>

                      {/* Thông tin sản phẩm */}
                      <td className="py-3 px-3 min-w-[190px]">
                        <div className="font-mono font-bold text-gray-900">{line.productSku}</div>
                        <div className="text-xs text-gray-700 font-medium truncate max-w-[240px]">
                          {line.productName}
                        </div>
                        <div className="text-[10px] text-gray-400">ĐVT: {line.baseUnit}</div>
                      </td>

                      {/* Số lô: cột vừa vặn không làm tràn bảng */}
                      <td className="py-3 px-3 w-56 min-w-[210px]">
                        {line.hasBatchManagement ? (
                          line.lotLoading ? (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock size={12} className="animate-spin text-orange-500" />
                              <span>Tải lô...</span>
                            </div>
                          ) : (
                            <div className="relative w-full">
                              <input
                                type="text"
                                list={`lot-datalist-${line.id}`}
                                value={line.batchNumber || ''}
                                onChange={(e) => handleLotChange(line.id, e.target.value)}
                                placeholder="Nhập / chọn số lô..."
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:border-orange-500 focus:outline-none placeholder:text-gray-400 placeholder:font-sans placeholder:font-normal transition shadow-2xs"
                              />
                              <datalist id={`lot-datalist-${line.id}`}>
                                {line.availableLots.map((lot) => (
                                  <option key={lot.id} value={lot.batchNumber}>
                                    Lô: {lot.batchNumber} (Tồn: {lot.quantity})
                                  </option>
                                ))}
                              </datalist>
                            </div>
                          )
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Không quản lý lô</span>
                        )}
                      </td>

                      {/* Tồn kho thực tế */}
                      <td className="py-3 px-3 text-right font-medium text-gray-600 whitespace-nowrap">
                        {line.currentStock.toLocaleString('vi-VN')}
                      </td>

                      {/* Số lượng giảm: căn giữa thẳng hàng tuyệt đối */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          max={line.currentStock}
                          value={line.adjustmentQuantity || ''}
                          onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                          className={`w-20 mx-auto px-2 py-1.5 text-center font-bold text-xs rounded-xl border focus:outline-none transition ${
                            line.adjustmentQuantity > line.currentStock
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-gray-200 bg-white focus:border-orange-500 text-gray-900'
                          }`}
                        />
                      </td>

                      {/* Giá vốn: to ra và 1 hàng duy nhất */}
                      <td className="py-3 px-3 text-right font-medium text-gray-700 font-mono whitespace-nowrap">
                        {formatVnd(line.costPrice)}
                      </td>

                      {/* Thành tiền: to ra và 1 hàng duy nhất */}
                      <td className="py-3 px-3 text-right font-bold text-rose-600 font-mono whitespace-nowrap">
                        {formatVnd(line.lossValue)}
                      </td>

                      {/* Ghi chú: co giãn linh hoạt */}
                      <td className="py-3 px-3 min-w-[160px]">
                        <input
                          type="text"
                          value={line.lineNotes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLines((prev) =>
                              prev.map((l) => (l.id === line.id ? { ...l, lineNotes: val } : l))
                            );
                          }}
                          placeholder="Chi tiết lý do hỏng, vỡ, mất..."
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition placeholder:text-gray-400"
                        />
                      </td>

                      {/* Nút xóa */}
                      <td className="py-3 px-2 text-center w-12">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer inline-flex items-center justify-center"
                          title="Xóa dòng"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot className="bg-gray-50/80 font-bold border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-3.5 text-left text-gray-800 text-xs uppercase tracking-wider font-bold">
                      TỔNG
                    </td>
                    <td className="py-3 px-3 text-center text-gray-900 font-mono font-bold text-xs whitespace-nowrap">
                      {totalQuantity.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-right text-rose-600 text-xs font-mono font-bold whitespace-nowrap">
                      {formatVnd(totalLossValue)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/inventory/stock-adjustments')}
            className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition cursor-pointer"
          >
            Quay lại
          </button>

          <button
            type="submit"
            disabled={submitting || lines.length === 0}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={16} />
            <span>{submitting ? 'Đang gửi phê duyệt...' : 'Gửi Phê Duyệt Phiếu Điều Chỉnh'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
