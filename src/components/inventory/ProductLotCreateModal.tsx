import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Calendar,
  Building2,
  Package,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { createProductLot } from '../../services/productLotApi';
import { productService } from '../../services/productService';
import { fetchWarehouses } from '../../services/warehouseApi';
import { fetchSuppliers } from '../../services/supplierApi';
import { ProductSelectDropdown } from './ProductSelectDropdown';
import { WarehouseSelectDropdown } from './WarehouseSelectDropdown';
import { SupplierSelectDropdown } from './SupplierSelectDropdown';
import type { ProductLotCreateRequest } from '../../types/productLot';
import type { Product } from '../../types/product';
import type { Warehouse } from '../../types/warehouse';
import type { Supplier } from '../../types/supplier';

interface ProductLotCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultProductId?: number;
  defaultWarehouseId?: number;
}

export const ProductLotCreateModal: React.FC<ProductLotCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultProductId,
  defaultWarehouseId
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [productId, setProductId] = useState<string>(defaultProductId ? String(defaultProductId) : '');
  const [warehouseId, setWarehouseId] = useState<string>(defaultWarehouseId ? String(defaultWarehouseId) : '');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number | string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingOptions(true);
    setError(null);

    // Đặt lại các trường về rỗng khi mở modal mới (không chọn sẵn kho hay điền sẵn số lượng)
    setProductId(defaultProductId ? String(defaultProductId) : '');
    setWarehouseId(defaultWarehouseId ? String(defaultWarehouseId) : '');
    setBatchNumber('');
    setManufactureDate('');
    setExpiredDate('');
    setInitialQuantity('');
    setSupplierId('');
    setNotes('');

    Promise.all([
      productService.getProducts({ page: 0, size: 200 }).then((res) => res.products).catch(() => []),
      fetchWarehouses().catch(() => []),
      fetchSuppliers({ page: 0, size: 100 }).then((res) => res.content || []).catch(() => [])
    ])
      .then(([prodList, whList, supList]) => {
        setProducts(prodList);
        setWarehouses(whList);
        setSuppliers(supList);
      })
      .finally(() => setLoadingOptions(false));
  }, [isOpen, defaultProductId, defaultWarehouseId]);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => String(p.id) === productId);

  const isFormValid = Boolean(
    productId &&
    warehouseId &&
    supplierId &&
    batchNumber.trim() &&
    manufactureDate &&
    expiredDate &&
    initialQuantity !== '' &&
    !isNaN(Number(initialQuantity)) &&
    Number(initialQuantity) >= 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productId) {
      setError('Vui lòng chọn sản phẩm');
      return;
    }
    if (!warehouseId) {
      setError('Vui lòng chọn kho lưu trữ');
      return;
    }
    if (!supplierId) {
      setError('Vui lòng chọn nhà cung cấp / nguồn gốc');
      return;
    }
    if (!batchNumber.trim()) {
      setError('Vui lòng nhập số lô sản xuất');
      return;
    }
    if (!manufactureDate) {
      setError('Vui lòng chọn ngày sản xuất');
      return;
    }
    if (!expiredDate) {
      setError('Vui lòng chọn hạn sử dụng');
      return;
    }
    if (manufactureDate > expiredDate) {
      setError('Hạn sử dụng phải sau ngày sản xuất');
      return;
    }
    const qty = Number(initialQuantity);
    if (initialQuantity === '' || isNaN(qty) || qty < 0) {
      setError('Số lượng tồn ban đầu không được âm');
      return;
    }

    try {
      setSubmitting(true);
      const payload: ProductLotCreateRequest = {
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        batchNumber: batchNumber.trim().toUpperCase(),
        manufactureDate,
        expiredDate,
        initialQuantity: qty,
        supplierId: Number(supplierId),
        notes: notes.trim() || null
      };

      await createProductLot(payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Khai báo lô hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-visible my-auto min-h-[580px] sm:min-h-[620px] flex flex-col justify-between">
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 via-white to-amber-50/40 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F85606] text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Khai báo Lô hàng mới</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Khởi tạo thông tin số lô, ngày sản xuất, hạn sử dụng và phân bổ vào kho hàng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Body: Nâng chiều cao form với flex-1, space-y-6 và padding đáy thoáng đãng */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 rounded-b-3xl flex-1 flex flex-col justify-between pb-8">
          <div className="space-y-5 sm:space-y-6">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Hàng 1: Sản phẩm & Kho lưu trữ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Sản phẩm (SKU) có Tìm kiếm & Phân trang */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Package size={15} className="text-orange-500" />
                  <span>Sản phẩm (SKU) *</span>
                </label>
                <ProductSelectDropdown
                  products={products}
                  selectedProductId={productId}
                  onSelect={(id) => setProductId(id)}
                  disabled={loadingOptions || Boolean(defaultProductId)}
                  placeholder="-- Chọn sản phẩm --"
                  loading={loadingOptions}
                />
              </div>

              {/* Kho lưu trữ */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Building2 size={15} className="text-orange-500" />
                  <span>Kho lưu trữ *</span>
                </label>
                <WarehouseSelectDropdown
                  warehouses={warehouses}
                  selectedWarehouseId={warehouseId}
                  onSelect={(id) => setWarehouseId(id)}
                  disabled={loadingOptions || Boolean(defaultWarehouseId)}
                  placeholder="-- Chọn kho hàng --"
                  loading={loadingOptions}
                />
              </div>
            </div>

            {/* Hàng 2: Nhà cung cấp & Số lô sản xuất (Đặt Nhà cung cấp ở hàng 2 để khi mở menu xổ xuống còn nguyên 2 hàng phía dưới, hoàn toàn không bị tràn) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Nhà cung cấp */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Building2 size={15} className="text-orange-500" />
                  <span>Nhà cung cấp / Nguồn gốc *</span>
                </label>
                <SupplierSelectDropdown
                  suppliers={suppliers}
                  selectedSupplierId={supplierId}
                  onSelect={(id) => setSupplierId(id)}
                  disabled={loadingOptions}
                  placeholder="-- Chọn nhà cung cấp --"
                  loading={loadingOptions}
                />
              </div>

              {/* Số lô */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Layers size={15} className="text-orange-500" />
                  <span>Số lô sản xuất (Batch / Lot) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="VD: LOT-202610-01"
                  className="w-full min-h-[46px] px-4 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Hàng 3: Ngày sản xuất & Hạn sử dụng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Ngày sản xuất */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar size={15} className="text-orange-500" />
                  <span>Ngày sản xuất *</span>
                </label>
                <input
                  type="date"
                  required
                  value={manufactureDate}
                  onChange={(e) => setManufactureDate(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                />
              </div>

              {/* Hạn sử dụng */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar size={15} className="text-orange-500" />
                  <span>Hạn sử dụng (HSD) *</span>
                </label>
                <input
                  type="date"
                  required
                  value={expiredDate}
                  onChange={(e) => setExpiredDate(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold"
                />
              </div>
            </div>

            {/* Hàng 4: Số lượng tồn ban đầu & Ghi chú (Các ô nhập text/số không có menu xổ xuống, đặt ở hàng cuối cực kỳ an toàn và sạch đẹp) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Số lượng tồn ban đầu */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Package size={15} className="text-orange-500" />
                  <span>Số lượng tồn ban đầu ({selectedProduct?.baseUnit || 'đơn vị cơ sở'}) *</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  placeholder="VD: 100"
                  className="w-full min-h-[46px] px-4 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <FileText size={15} className="text-gray-400" />
                  <span>Ghi chú lô hàng (Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Hàng mới về kèm chứng từ kiểm nghiệm số..."
                  className="w-full min-h-[46px] px-4 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Buttons: Có khoảng cách đệm phía trên và phía dưới tạo sự thông thoáng */}
          <div className="pt-6 pb-1 flex flex-col sm:flex-row items-center justify-between gap-3.5 border-t border-gray-100 shrink-0">
            <div>
              {!isFormValid && (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0 text-amber-500" />
                  <span>Vui lòng điền đủ tất cả các trường bắt buộc (*)</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition cursor-pointer shadow-2xs"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                title={!isFormValid ? 'Vui lòng điền đầy đủ các trường bắt buộc (*)' : 'Khai báo lô hàng'}
                className="px-8 py-2.5 bg-[#F85606] hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-lg shadow-orange-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Khai báo lô hàng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
