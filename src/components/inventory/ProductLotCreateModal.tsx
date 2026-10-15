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
  const [initialQuantity, setInitialQuantity] = useState<number | string>(100);
  const [supplierId, setSupplierId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
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
        if (!warehouseId && whList.length > 0) {
          setWarehouseId(String(whList[0].id));
        }
      })
      .finally(() => setLoadingOptions(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => String(p.id) === productId);

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
    if (!batchNumber.trim()) {
      setError('Vui lòng nhập số lô hàng');
      return;
    }
    if (!expiredDate) {
      setError('Vui lòng chọn hạn sử dụng');
      return;
    }
    if (manufactureDate && expiredDate && manufactureDate > expiredDate) {
      setError('Hạn sử dụng phải sau ngày sản xuất');
      return;
    }
    const qty = Number(initialQuantity);
    if (isNaN(qty) || qty < 0) {
      setError('Số lượng tồn ban đầu không được âm');
      return;
    }

    try {
      setSubmitting(true);
      const payload: ProductLotCreateRequest = {
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        batchNumber: batchNumber.trim().toUpperCase(),
        manufactureDate: manufactureDate || null,
        expiredDate,
        initialQuantity: qty,
        supplierId: supplierId ? Number(supplierId) : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F85606] text-white flex items-center justify-center shadow-xs">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Khai báo Lô hàng mới</h3>
              <p className="text-xs text-gray-500">Khởi tạo thông tin số lô, ngày sản xuất và hạn sử dụng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sản phẩm */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Package size={13} className="text-orange-500" />
                <span>Sản phẩm (SKU) *</span>
              </label>
              <select
                value={productId}
                disabled={loadingOptions || Boolean(defaultProductId)}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">-- Chọn sản phẩm --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kho lưu trữ */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Building2 size={13} className="text-orange-500" />
                <span>Kho lưu trữ *</span>
              </label>
              <select
                value={warehouseId}
                disabled={loadingOptions || Boolean(defaultWarehouseId)}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">-- Chọn kho hàng --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    [{w.code}] {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Số lô */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Số lô sản xuất (Batch / Lot) *
              </label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="VD: LOT-202610-01"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Số lượng tồn ban đầu */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Số lượng tồn ban đầu ({selectedProduct?.baseUnit || 'đơn vị cơ sở'}) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ngày sản xuất */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Calendar size={13} className="text-gray-400" />
                <span>Ngày sản xuất</span>
              </label>
              <input
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Hạn sử dụng */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Calendar size={13} className="text-orange-500" />
                <span>Hạn sử dụng (HSD) *</span>
              </label>
              <input
                type="date"
                required
                value={expiredDate}
                onChange={(e) => setExpiredDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Nhà cung cấp */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Nhà cung cấp / Nguồn gốc
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="">-- Không xác định hoặc Nhập nội bộ --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <FileText size={13} className="text-gray-400" />
              <span>Ghi chú lô hàng</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Hàng mới về kèm chứng từ kiểm nghiệm số..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#F85606] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-orange-500/20 flex items-center gap-1.5 disabled:opacity-50"
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
        </form>
      </div>
    </div>
  );
};
