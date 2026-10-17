import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Layers,
  Calendar,
  Building2,
  Package,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { createProductLot, toggleProductBatchManagement } from '../../services/productLotApi';
import { productService } from '../../services/productService';
import { fetchWarehouses } from '../../services/warehouseApi';
import { fetchSuppliers } from '../../services/supplierApi';
import { ProductSelectDropdown } from '../../components/inventory/ProductSelectDropdown';
import { WarehouseSelectDropdown } from '../../components/inventory/WarehouseSelectDropdown';
import { SupplierSelectDropdown } from '../../components/inventory/SupplierSelectDropdown';
import type { ProductLotCreateRequest } from '../../types/productLot';
import type { Product } from '../../types/product';
import type { Warehouse } from '../../types/warehouse';
import type { Supplier } from '../../types/supplier';

export const ProductLotCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Form states - Khởi tạo toàn bộ rỗng để người dùng chủ động chọn
  const [productId, setProductId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tải danh mục sản phẩm, kho hàng, nhà cung cấp
  useEffect(() => {
    setLoadingOptions(true);
    setError(null);

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
      .catch((err) => {
        console.error('Lỗi tải danh mục tạo lô:', err);
        setError('Không thể tải danh sách sản phẩm, kho hoặc nhà cung cấp');
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const selectedProduct = products.find((p) => String(p.id) === productId);

  // Form validation: tất cả 7 trường có dấu * đều bắt buộc
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

      // S6-01: Nếu sản phẩm chưa bật quản lý lô, tự động kích hoạt trước khi tạo lô
      if (selectedProduct && !selectedProduct.hasBatchManagement) {
        try {
          await toggleProductBatchManagement(Number(productId), true);
        } catch (toggleErr) {
          console.warn('Không thể tự động bật quản lý lô:', toggleErr);
        }
      }

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

      try {
        await createProductLot(payload);
      } catch (createErr: any) {
        // Nếu lỗi trả về báo chưa bật quản lý lô, kích hoạt và thử lại một lần nữa
        if (createErr?.message && createErr.message.includes('chưa được bật quản lý theo lô hàng')) {
          await toggleProductBatchManagement(Number(productId), true);
          await createProductLot(payload);
        } else {
          throw createErr;
        }
      }

      showToast?.('Khai báo lô hàng mới thành công', 'success');
      navigate('/inventory/lots');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Khai báo lô hàng thất bại';
      if (msg.includes('ACCESS_DENIED') || msg.includes('không có quyền thao tác')) {
        msg = 'Bạn không có quyền thao tác trên kho hàng đã chọn. Vui lòng chọn kho hàng bạn được phân quyền phụ trách.';
      }
      setError(msg);
      showToast?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. Header Bar: Nút Back ở góc trên bên trái theo đúng yêu cầu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/inventory/lots')}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
            title="Quay lại danh sách quản lý lô hàng"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <div className="h-7 w-px bg-gray-200 shrink-0" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F85606] text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Khai báo Lô hàng mới</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Khởi tạo thông tin số lô, ngày sản xuất, hạn sử dụng và phân bổ vào kho hàng
              </p>
            </div>
          </div>
        </div>

        {/* Nút thao tác nhanh phía trên */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate('/inventory/lots')}
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={submitting || !isFormValid}
            onClick={handleSubmit}
            title={!isFormValid ? 'Vui lòng điền đầy đủ các trường bắt buộc (*)' : 'Khai báo lô hàng'}
            className="px-5 py-2 bg-[#F85606] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-orange-500/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Khai báo lô hàng</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start gap-3 shadow-2xs">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Lỗi không thể tạo lô:</span>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Form Card chính */}
      <div className="bg-white rounded-3xl shadow-xs border border-gray-200/80 p-6 sm:p-8 space-y-7">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-800">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>Thông tin chi tiết lô hàng</span>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Các trường có dấu <strong className="text-orange-500">*</strong> là bắt buộc
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                disabled={loadingOptions}
                placeholder="-- Chọn sản phẩm --"
                loading={loadingOptions}
              />
              {selectedProduct && !selectedProduct.hasBatchManagement && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
                  <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Sản phẩm <strong>{selectedProduct.sku}</strong> chưa kích hoạt cờ quản lý theo lô. Hệ thống sẽ <strong>tự động kích hoạt</strong> quản lý lô cho sản phẩm này khi bạn bấm "Khai báo lô hàng".
                  </p>
                </div>
              )}
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
                disabled={loadingOptions}
                placeholder="-- Chọn kho hàng --"
                loading={loadingOptions}
              />
            </div>
          </div>

          {/* Hàng 2: Nhà cung cấp & Số lô sản xuất */}
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

          {/* Hàng 4: Số lượng tồn ban đầu & Ghi chú */}
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

          {/* Gợi ý quy trình */}
          <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 flex items-start gap-3 text-xs text-orange-950">
            <Info size={16} className="text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <strong className="font-bold text-orange-900">Quy tắc quản lý số lô (Batch Management):</strong>
              <p className="text-orange-800">
                Lô hàng sau khi khởi tạo sẽ ở trạng thái <strong className="text-emerald-700">HOẠT ĐỘNG (ACTIVE)</strong> và sẵn sàng phục vụ xuất kho hoặc luân chuyển nội bộ. Hệ thống sẽ tự động kích hoạt tính năng kiểm tra hạn sử dụng và cảnh báo cận date theo chu kỳ kho.
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {!isFormValid && (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0 text-amber-500" />
                  <span>Vui lòng điền đủ tất cả các trường bắt buộc (*) để kích hoạt nút Khai báo</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() => navigate('/inventory/lots')}
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
