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
  const [productSearch, setProductSearch] = useState<string>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [lines, setLines] = useState<AdjustmentFormLine[]>([]);

  // Trạng thái gửi
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Tải danh sách kho
  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/warehouses`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const activeWarehouses = (Array.isArray(data) ? data : []).filter(
          (w) => w.status === 'ACTIVE' || !w.status
        );
        setWarehouses(activeWarehouses);
        if (activeWarehouses.length > 0) {
          setSelectedWarehouseId(activeWarehouses[0].id);
        }
      })
      .catch((err) => console.warn('Lỗi tải danh sách kho:', err));
  }, []);

  // Tải danh mục sản phẩm
  useEffect(() => {
    productService
      .getProducts({ page: 0, size: 300 })
      .then((res) => setAllProducts(res.products || []))
      .catch((err) => console.warn('Lỗi tải danh mục sản phẩm:', err));
  }, []);

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

  // Chọn thêm một sản phẩm vào danh sách điều chỉnh
  const handleAddProduct = async (product: Product) => {
    setIsProductDropdownOpen(false);
    setProductSearch('');
    setItemsError(null);

    // Kiểm tra xem sản phẩm đã có trong bảng chưa
    if (lines.some((l) => l.productId === Number(product.id))) {
      alert(`Sản phẩm [${product.sku}] đã có trong phiếu. Vui lòng chỉnh sửa số lượng ở dòng tương ứng.`);
      return;
    }

    if (!selectedWarehouseId) {
      setWarehouseError('Vui lòng chọn kho hàng trước khi thêm sản phẩm');
      return;
    }

    const uniqueKey = `line_${product.id}_${Date.now()}`;
    const costPrice = Number(product.costPrice) || 0;
    const hasBatch = Boolean(product.hasBatchManagement);

    // Khởi tạo dòng mới
    const newLine: AdjustmentFormLine = {
      id: uniqueKey,
      productId: Number(product.id),
      productSku: product.sku,
      productName: product.name,
      baseUnit: product.baseUnit || 'Cái',
      currentStock: 0,
      costPrice,
      adjustmentQuantity: 1,
      lossValue: costPrice * 1,
      hasBatchManagement: hasBatch,
      availableLots: [],
      lotLoading: hasBatch,
      lineNotes: ''
    };

    setLines((prev) => [...prev, newLine]);

    // Tải tồn kho thực tế và lô của sản phẩm tại kho được chọn
    try {
      const [ledgerRes, lotData] = await Promise.all([
        authFetch(
          `${API_BASE_URL}/api/inventory/stock-ledger?warehouseId=${selectedWarehouseId}&keyword=${encodeURIComponent(
            product.sku
          )}&size=1`
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        hasBatch
          ? calculateStockByLot(product.id, selectedWarehouseId).catch(() => ({ lots: [] }))
          : Promise.resolve({ lots: [] })
      ]);

      let physicalStock = 0;
      if (ledgerRes?.content && ledgerRes.content.length > 0) {
        const row = ledgerRes.content[0];
        if (Number(row.productId) === Number(product.id)) {
          physicalStock = Number(row.physicalStock) || 0;
        }
      }

      const availableLots: ProductLotResponse[] = lotData?.lots || [];
      const firstLot = availableLots.length > 0 ? availableLots[0] : undefined;

      setLines((prev) =>
        prev.map((l) => {
          if (l.id === uniqueKey) {
            const batchNum = firstLot ? firstLot.batchNumber : undefined;
            const lotStockMax = firstLot ? Number(firstLot.quantity) : undefined;
            return {
              ...l,
              currentStock: physicalStock,
              availableLots,
              lotLoading: false,
              batchNumber: batchNum,
              lotStockMax
            };
          }
          return l;
        })
      );
    } catch (err) {
      console.warn('Lỗi nạp thông tin tồn kho cho sản phẩm:', err);
      setLines((prev) =>
        prev.map((l) => (l.id === uniqueKey ? { ...l, lotLoading: false } : l))
      );
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

  // Chọn lô hàng cho sản phẩm theo lô
  const handleLotChange = (lineId: string, batchNumber: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id === lineId) {
          const foundLot = l.availableLots.find((lot) => lot.batchNumber === batchNumber);
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
        if (!l.batchNumber) {
          setSubmitError(`Mặt hàng [${l.productSku}] quản lý theo lô, bắt buộc phải chọn số lô`);
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

  // Lọc sản phẩm tìm kiếm
  const filteredProducts = allProducts.filter((p) => {
    if (!productSearch.trim()) return true;
    const term = productSearch.toLowerCase();
    return (
      p.sku.toLowerCase().includes(term) ||
      p.name.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="erp-fade-in space-y-4 max-w-6xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/inventory/stock-adjustments')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-orange-600 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách phiếu điều chỉnh</span>
        </button>

        {totalLossValue > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
            <span className="font-semibold text-rose-700">Tổng tổn thất dự kiến:</span>
            <span className="font-bold text-rose-700 font-mono">{formatVnd(totalLossValue)}</span>
          </div>
        )}
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
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none transition ${
                    warehouseError ? 'border-rose-500 bg-rose-50/20' : 'border-gray-200 focus:border-orange-500'
                  }`}
                >
                  <option value="">-- Chọn kho hàng --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                <WarehouseIcon size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
              </div>
              {warehouseError && (
                <span className="block text-[11px] text-rose-600 font-semibold mt-1">
                  {warehouseError}
                </span>
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
              <p className="text-[11px] text-gray-500">
                Giá trị tổn thất tự động tính dựa trên Đơn giá vốn (Cost Price) × Số lượng giảm
              </p>
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

                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        Không tìm thấy sản phẩm phù hợp
                      </div>
                    ) : (
                      filteredProducts.slice(0, 30).map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddProduct(prod)}
                          className="w-full text-left p-2 hover:bg-orange-50/60 rounded-xl transition cursor-pointer flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-orange-600">{prod.sku}</span>
                            <span className="text-[11px] font-bold text-gray-700">
                              {formatVnd(Number(prod.costPrice) || 0)}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-900 truncate">{prod.name}</span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span>ĐVT: {prod.baseUnit}</span>
                            {prod.hasBatchManagement && (
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
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <tr>
                  <th className="py-3 px-3.5 w-10">#</th>
                  <th className="py-3 px-3">Sản Phẩm</th>
                  <th className="py-3 px-3 w-48">Số Lô Hàng</th>
                  <th className="py-3 px-3 text-right w-24">Tồn Kho</th>
                  <th className="py-3 px-3 text-right w-28">SL Giảm</th>
                  <th className="py-3 px-3 text-right w-28">Giá Vốn</th>
                  <th className="py-3 px-3 text-right w-36">Thành Tiền Tổn Thất</th>
                  <th className="py-3 px-3">Ghi Chú</th>
                  <th className="py-3 px-3 w-12 text-center">Xóa</th>
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
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-gray-900">{line.productSku}</div>
                        <div className="text-xs text-gray-700 font-medium truncate max-w-[220px]">
                          {line.productName}
                        </div>
                        <div className="text-[10px] text-gray-400">ĐVT: {line.baseUnit}</div>
                      </td>

                      {/* Số lô */}
                      <td className="py-3 px-3">
                        {line.hasBatchManagement ? (
                          line.lotLoading ? (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock size={12} className="animate-spin text-orange-500" />
                              <span>Tải lô...</span>
                            </div>
                          ) : line.availableLots.length === 0 ? (
                            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              Không có lô tồn
                            </span>
                          ) : (
                            <select
                              value={line.batchNumber || ''}
                              onChange={(e) => handleLotChange(line.id, e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:border-orange-500 focus:outline-none"
                            >
                              {line.availableLots.map((lot) => (
                                <option key={lot.id} value={lot.batchNumber}>
                                  Lô: {lot.batchNumber} (Tồn: {lot.quantity})
                                </option>
                              ))}
                            </select>
                          )
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Không quản lý lô</span>
                        )}
                      </td>

                      {/* Tồn kho thực tế */}
                      <td className="py-3 px-3 text-right font-medium text-gray-600">
                        {line.currentStock.toLocaleString('vi-VN')}
                      </td>

                      {/* Số lượng giảm */}
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          max={line.currentStock}
                          value={line.adjustmentQuantity || ''}
                          onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                          className={`w-24 px-2 py-1 text-right font-bold text-xs rounded-lg border focus:outline-none transition ${
                            line.adjustmentQuantity > line.currentStock
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-gray-200 bg-white focus:border-orange-500 text-gray-900'
                          }`}
                        />
                      </td>

                      {/* Giá vốn */}
                      <td className="py-3 px-3 text-right font-medium text-gray-700">
                        {formatVnd(line.costPrice)}
                      </td>

                      {/* Thành tiền tổn thất */}
                      <td className="py-3 px-3 text-right font-bold text-rose-600 font-mono">
                        {formatVnd(line.lossValue)}
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={line.lineNotes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLines((prev) =>
                              prev.map((l) => (l.id === line.id ? { ...l, lineNotes: val } : l))
                            );
                          }}
                          placeholder="Chi tiết hỏng..."
                          className="w-full px-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-orange-500 focus:outline-none"
                        />
                      </td>

                      {/* Nút xóa */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa dòng"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot className="bg-gray-50/80 font-bold border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-3.5 text-right text-gray-700">
                      TỔNG CỘNG HÀNG GIẢM:
                    </td>
                    <td className="py-3 px-3 text-right text-gray-900">
                      {totalQuantity.toLocaleString('vi-VN')}
                    </td>
                    <td></td>
                    <td className="py-3 px-3 text-right text-rose-600 text-sm font-mono font-bold">
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
