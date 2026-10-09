import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Building2,
  Warehouse,
  AlertTriangle,
  RefreshCw,
  Package,
  Save,
  Check
} from 'lucide-react';
import type { GoodsReceipt, GoodsReceiptFormPayload } from '../../types/inventory';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import { fetchSuppliers } from '../../services/supplierApi';
import type { Supplier } from '../../types/supplier';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';
import { createGoodsReceipt } from '../../services/inventoryReceiptApi';
import { formatCurrencyVND, formatQuantity } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';

interface GoodsReceiptFormModalProps {
  isOpen: boolean;
  receiptToEdit?: GoodsReceipt | null;
  onClose: () => void;
  onSuccess: (receipt: GoodsReceipt) => void;
}

interface FormLineState {
  id: string;
  productId: number;
  productSku: string;
  productName: string;
  category?: string;
  baseUnit: string;
  selectedUnit: string;
  conversionFactor: number;
  quantity: number;
  unitPrice: number;
  batchNumber: string;
  expiredDate: string;
  hasBatchManagement: boolean;
  availableUnits: Array<{ unitName: string; conversionFactor: number }>;
}

/**
 * Trích xuất các đơn vị tính có thể dùng cho sản phẩm dựa trên ĐVT cơ sở và quy cách đóng gói (AC2)
 */
function getAvailableUnitsForProduct(prod: Product): Array<{ unitName: string; conversionFactor: number }> {
  const units: Array<{ unitName: string; conversionFactor: number }> = [
    { unitName: prod.baseUnit || 'Cái', conversionFactor: 1 }
  ];

  if (prod.packagingSpec) {
    const match = prod.packagingSpec.match(/(\d+)\s*([a-zA-ZÀ-ỹ\s]+)\s*\/\s*([a-zA-ZÀ-ỹ\s]+)/i);
    if (match) {
      const factor = parseInt(match[1], 10);
      const pkgUnit = match[3].trim();
      if (factor > 1 && pkgUnit) {
        units.push({ unitName: pkgUnit, conversionFactor: factor });
      }
    } else {
      const numMatch = prod.packagingSpec.match(/(\d+)/);
      if (numMatch) {
        const factor = parseInt(numMatch[1], 10);
        if (factor > 1) {
          units.push({ unitName: 'Thùng', conversionFactor: factor });
        }
      }
    }
  }

  if (!units.some((u) => u.unitName.toLowerCase() === 'thùng')) {
    units.push({ unitName: 'Thùng', conversionFactor: 24 });
  }
  if (
    !units.some((u) => u.unitName.toLowerCase() === 'lốc') &&
    ['lon', 'chai', 'hộp', 'gói'].includes((prod.baseUnit || '').toLowerCase())
  ) {
    units.push({ unitName: 'Lốc', conversionFactor: 6 });
  }

  return units;
}

/**
 * S5-04: Form lập phiếu nhập kho chi tiết từ nhà cung cấp
 * - AC1: Khai báo nhà cung cấp, số chứng từ, ngày nhập, kho nhập
 * - AC2: Nhập theo đơn vị tính bất kỳ, tự động quy về đơn vị cơ sở
 * - AC3: Ghi nhận số lô và hạn sử dụng cho mặt hàng quản lý lô
 * - AC4: Phân tách rõ ràng giữa Lưu nháp (không ảnh hưởng tồn) và Xác nhận (cộng tồn kho)
 */
export const GoodsReceiptFormModal: React.FC<GoodsReceiptFormModalProps> = ({
  isOpen,
  receiptToEdit,
  onClose,
  onSuccess
}) => {
  const { user, showToast } = useAuth();

  // Dữ liệu danh mục hỗ trợ chọn
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [systemProducts, setSystemProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Form Fields Thông tin chung (AC1)
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>('WH-MB01');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [generalNote, setGeneralNote] = useState<string>('');

  // Danh sách dòng hàng nhập kho (AC2, AC3)
  const [lines, setLines] = useState<FormLineState[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Tải danh sách nhà cung cấp & danh mục sản phẩm
  useEffect(() => {
    if (!isOpen) return;

    setLoadingData(true);
    Promise.all([
      fetchSuppliers({ size: 100 }),
      productService.getProducts({ size: 200, status: 'ACTIVE' })
    ])
      .then(([supRes, prodRes]) => {
        const sups = supRes.content || [];
        setSuppliers(sups);
        if (!selectedSupplierId && sups.length > 0) {
          setSelectedSupplierId(sups[0].id);
        }

        const prods = prodRes.products || [];
        setSystemProducts(prods);
        setLoadingData(false);
      })
      .catch((err) => {
        console.error('Lỗi tải danh mục NCC và sản phẩm:', err);
        setLoadingData(false);
      });
  }, [isOpen]);

  // Khởi tạo dòng hàng mẫu ban đầu nếu form mới
  useEffect(() => {
    if (!isOpen) return;

    if (receiptToEdit) {
      setSelectedSupplierId(receiptToEdit.supplierId);
      setDocumentNumber(receiptToEdit.documentNumber);
      setReceiptDate(receiptToEdit.receiptDate);
      setSelectedWarehouseCode(receiptToEdit.warehouseCode);
      setVehiclePlate(receiptToEdit.vehiclePlate || '');
      setDriverName(receiptToEdit.driverName || '');
      setGeneralNote(receiptToEdit.note || '');
      setLines(
        receiptToEdit.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          productSku: l.productSku,
          productName: l.productName,
          category: l.category,
          baseUnit: l.baseUnit,
          selectedUnit: l.selectedUnit,
          conversionFactor: l.conversionFactor,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          batchNumber: l.batchNumber || '',
          expiredDate: l.expiredDate || '',
          hasBatchManagement: Boolean(l.hasBatchManagement),
          availableUnits: [{ unitName: l.selectedUnit, conversionFactor: l.conversionFactor }]
        }))
      );
    } else {
      setDocumentNumber('');
      setGeneralNote('');
      setVehiclePlate('');
      setDriverName('');
      setLines([]);
    }
  }, [isOpen, receiptToEdit]);

  if (!isOpen) return null;

  // Thêm một dòng hàng mới
  const handleAddNewLine = () => {
    if (systemProducts.length === 0) return;
    const defaultProd = systemProducts[0];
    const availableUnits = getAvailableUnitsForProduct(defaultProd);
    const firstUnit = availableUnits[0];

    const newLine: FormLineState = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: Number(defaultProd.id),
      productSku: defaultProd.sku,
      productName: defaultProd.name,
      category: defaultProd.category,
      baseUnit: defaultProd.baseUnit,
      selectedUnit: firstUnit.unitName,
      conversionFactor: firstUnit.conversionFactor,
      quantity: 1,
      unitPrice: Number(defaultProd.costPrice || 0),
      batchNumber: `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      expiredDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      hasBatchManagement: true,
      availableUnits
    };

    setLines((prev) => [...prev, newLine]);
  };

  // Thay đổi sản phẩm của một dòng
  const handleChangeProduct = (lineIndex: number, newProductId: number) => {
    const prod = systemProducts.find((p) => Number(p.id) === newProductId);
    if (!prod) return;

    const availableUnits = getAvailableUnitsForProduct(prod);
    const firstUnit = availableUnits[0];

    setLines((prev) => {
      const next = [...prev];
      next[lineIndex] = {
        ...next[lineIndex],
        productId: Number(prod.id),
        productSku: prod.sku,
        productName: prod.name,
        category: prod.category,
        baseUnit: prod.baseUnit,
        selectedUnit: firstUnit.unitName,
        conversionFactor: firstUnit.conversionFactor,
        unitPrice: Number(prod.costPrice || 0),
        availableUnits
      };
      return next;
    });
  };

  // Thay đổi đơn vị tính (AC2: Tự động cập nhật hệ số quy đổi ra đơn vị cơ sở)
  const handleChangeUnit = (lineIndex: number, newUnitName: string) => {
    setLines((prev) => {
      const next = [...prev];
      const targetLine = next[lineIndex];
      const matchedUnit = targetLine.availableUnits.find((u) => u.unitName === newUnitName);
      const factor = matchedUnit?.conversionFactor || 1;

      next[lineIndex] = {
        ...targetLine,
        selectedUnit: newUnitName,
        conversionFactor: factor
      };
      return next;
    });
  };

  // Thay đổi số lượng, số lô, hạn dùng
  const handleUpdateLineField = (
    lineIndex: number,
    field: keyof FormLineState,
    value: string | number | boolean
  ) => {
    setLines((prev) => {
      const next = [...prev];
      next[lineIndex] = { ...next[lineIndex], [field]: value };
      return next;
    });
  };

  const handleRemoveLine = (lineIndex: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== lineIndex));
  };

  // Tính tổng tiền & tổng số lượng cơ sở (AC2)
  const totalBaseQty = lines.reduce((s, l) => s + l.quantity * l.conversionFactor, 0);
  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * l.conversionFactor, 0);

  // Validate form trước khi lưu
  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!selectedSupplierId) errors.push('Vui lòng chọn Nhà cung cấp giao hàng (AC1).');
    if (!documentNumber.trim()) errors.push('Vui lòng nhập Số chứng từ / hóa đơn giao hàng của NCC (AC1).');
    if (!receiptDate) errors.push('Vui lòng chọn Ngày nhập kho (AC1).');
    if (!selectedWarehouseCode) errors.push('Vui lòng chọn Kho nhận hàng (AC1).');

    if (lines.length === 0) {
      errors.push('Phiếu nhập kho phải có ít nhất 1 dòng hàng hóa.');
    }

    lines.forEach((l, idx) => {
      if (l.quantity <= 0) {
        errors.push(`Dòng ${idx + 1} (${l.productName}): Số lượng nhập phải lớn hơn 0.`);
      }
      if (l.hasBatchManagement && !l.batchNumber.trim()) {
        errors.push(`Dòng ${idx + 1} (${l.productName}): Bắt buộc nhập Số lô sản xuất (AC3).`);
      }
      if (l.hasBatchManagement && !l.expiredDate) {
        errors.push(`Dòng ${idx + 1} (${l.productName}): Bắt buộc chọn Hạn sử dụng (AC3).`);
      }
    });

    setFormErrors(errors);
    return errors.length === 0;
  };

  // Xử lý Lưu Phiếu (DRAFT hoặc CONFIRMED - AC4)
  const handleSaveReceipt = async (targetStatus: 'DRAFT' | 'CONFIRMED') => {
    if (!validateForm()) {
      showToast('Dữ liệu chưa hợp lệ', 'Vui lòng kiểm tra lại các trường thông tin bắt buộc', 'error');
      return;
    }

    const sup = suppliers.find((s) => String(s.id) === String(selectedSupplierId));
    const wh = SYSTEM_WAREHOUSES.find((w) => w.code === selectedWarehouseCode);

    const payload: GoodsReceiptFormPayload = {
      supplierId: Number(selectedSupplierId),
      supplierCode: sup?.code || 'NCC-UNKNOWN',
      supplierName: sup?.name || 'Nhà cung cấp',
      documentNumber: documentNumber.trim(),
      receiptDate,
      warehouseCode: selectedWarehouseCode,
      warehouseName: wh?.name || 'Kho Tổng',
      vehiclePlate: vehiclePlate.trim() || undefined,
      driverName: driverName.trim() || undefined,
      note: generalNote.trim() || undefined,
      status: targetStatus,
      lines: lines.map((l) => ({
        productId: l.productId,
        productSku: l.productSku,
        productName: l.productName,
        category: l.category,
        baseUnit: l.baseUnit,
        selectedUnit: l.selectedUnit,
        conversionFactor: l.conversionFactor,
        quantity: l.quantity,
        baseQuantity: l.quantity * l.conversionFactor,
        unitPrice: l.unitPrice,
        totalAmount: l.quantity * l.unitPrice * l.conversionFactor,
        batchNumber: l.batchNumber.trim() || undefined,
        expiredDate: l.expiredDate || undefined,
        hasBatchManagement: l.hasBatchManagement
      }))
    };

    setSubmitting(true);
    try {
      const saved = await createGoodsReceipt(payload, user?.username || 'wh_staff');
      if (targetStatus === 'CONFIRMED') {
        showToast(
          'Đã xác nhận nhập kho (AC4)',
          `Phiếu [${saved.code}] đã được ghi sổ thành công. Tồn kho đã được CỘNG THÊM ${totalBaseQty.toLocaleString('vi-VN')} đơn vị cơ sở!`,
          'success',
          5000
        );
      } else {
        showToast(
          'Đã lưu phiếu nháp (AC4)',
          `Phiếu nháp [${saved.code}] đã được lưu an toàn. Phiếu chưa ghi sổ và KHÔNG làm thay đổi số lượng tồn kho.`,
          'info',
          5000
        );
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      console.error('Lỗi lưu phiếu nhập kho:', err);
      showToast('Lỗi lưu phiếu', err instanceof Error ? err.message : 'Không thể lưu phiếu nhập kho', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Warehouse size={22} />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <span>Lập Phiếu Nhập Kho Từ Nhà Cung Cấp</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Sprint 5: S5-04
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Ghi nhận hàng hóa về đúng lô, đúng hạn sử dụng và tự động quy đổi về đơn vị cơ sở
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* NỘI DUNG FORM */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loadingData && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-amber-800">
              <RefreshCw size={15} className="animate-spin text-amber-600" />
              <span>Đang tải danh mục nhà cung cấp và sản phẩm...</span>
            </div>
          )}

          {formErrors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>Vui lòng hoàn thiện các thông tin sau:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-700 pl-1 space-y-0.5">
                {formErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* PHẦN 1: THÔNG TIN CHỨNG TỪ & NHÀ CUNG CẤP (AC1) */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Building2 size={15} className="text-[#F85606]" />
              <span>1. Thông Tin Nhà Cung Cấp & Kho Nhận Hàng (AC1)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Chọn Nhà Cung Cấp */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Nhà cung cấp <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Số chứng từ / Hóa đơn NCC */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Số chứng từ / Hóa đơn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Vd: HD-2026-9912"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono font-bold"
                />
              </div>

              {/* Ngày nhập kho */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Ngày nhập kho <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Kho nhận hàng */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Kho nhập hàng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedWarehouseCode}
                  onChange={(e) => setSelectedWarehouseCode(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  {SYSTEM_WAREHOUSES.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thông tin phương tiện & tài xế */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Biển số xe giao hàng
                </label>
                <input
                  type="text"
                  placeholder="Vd: 29C-998.12"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Tên tài xế / Người giao
                </label>
                <input
                  type="text"
                  placeholder="Vd: Nguyễn Văn A"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Ghi chú bốc dỡ hàng
                </label>
                <input
                  type="text"
                  placeholder="Vd: Giao tại cửa số 3, kiểm đếm đủ tem"
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white"
                />
              </div>
            </div>
          </div>

          {/* PHẦN 2: CHI TIẾT DÒNG HÀNG, QUY ĐỔI ĐƠN VỊ & LÔ/HẠN (AC2, AC3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Package size={15} className="text-[#F85606]" />
                <span>2. Chi Tiết Dòng Hàng Nhập Kho (AC2: Quy Đổi Đơn Vị & AC3: Số Lô/Hạn Dùng)</span>
              </div>
              <button
                type="button"
                onClick={handleAddNewLine}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm dòng hàng</span>
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center space-y-2">
                <Package size={36} className="mx-auto text-gray-300" />
                <p className="text-xs font-bold text-gray-600">Chưa có mặt hàng nào trong phiếu nhập</p>
                <p className="text-[11px] text-gray-400">
                  Bấm &quot;Thêm dòng hàng&quot; ở trên để chọn sản phẩm từ xe dỡ hàng xuống kho.
                </p>
                <button
                  type="button"
                  onClick={handleAddNewLine}
                  className="px-3.5 py-2 rounded-xl bg-[#F85606] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Thêm dòng đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-gray-100">
                <div className="hidden lg:grid lg:grid-cols-12 gap-2 bg-gray-50/90 p-3 text-[11px] font-bold text-gray-600 uppercase">
                  <div className="col-span-4">Mặt hàng / SKU</div>
                  <div className="col-span-2 text-center">ĐVT Nhập (AC2)</div>
                  <div className="col-span-1 text-center">Số lượng</div>
                  <div className="col-span-2 text-center">Quy về Cơ sở (AC2)</div>
                  <div className="col-span-2">Số Lô & Hạn Dùng (AC3)</div>
                  <div className="col-span-1 text-center">Xóa</div>
                </div>

                {lines.map((line, idx) => {
                  const baseQty = line.quantity * line.conversionFactor;

                  return (
                    <div
                      key={line.id}
                      className="p-3 lg:p-2.5 flex flex-col lg:grid lg:grid-cols-12 gap-2.5 items-stretch lg:items-center hover:bg-orange-50/15 transition"
                    >
                      {/* Cột 1: Sản phẩm */}
                      <div className="lg:col-span-4">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Sản phẩm
                        </span>
                        <select
                          value={line.productId}
                          onChange={(e) => handleChangeProduct(idx, Number(e.target.value))}
                          className="w-full text-xs font-bold border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          {systemProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cột 2: Đơn vị tính nhập (AC2) */}
                      <div className="lg:col-span-2">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Đơn vị tính nhập
                        </span>
                        <select
                          value={line.selectedUnit}
                          onChange={(e) => handleChangeUnit(idx, e.target.value)}
                          className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2 bg-orange-50/50 text-orange-950 focus:outline-none"
                        >
                          {line.availableUnits.map((u) => (
                            <option key={u.unitName} value={u.unitName}>
                              {u.unitName} (x{u.conversionFactor} {line.baseUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cột 3: Số lượng nhập */}
                      <div className="lg:col-span-1">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Số lượng nhập
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleUpdateLineField(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))
                          }
                          className="w-full text-xs font-mono font-bold text-center border border-gray-200 rounded-xl p-2 bg-white"
                        />
                      </div>

                      {/* Cột 4: Quy đổi về đơn vị cơ sở khi ghi sổ (AC2) */}
                      <div className="lg:col-span-2 text-center">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Quy về Cơ sở (AC2)
                        </span>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 px-2 text-center">
                          <span className="font-black text-xs font-mono text-emerald-700">
                            {formatQuantity(baseQty)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 ml-1">
                            {line.baseUnit}
                          </span>
                        </div>
                      </div>

                      {/* Cột 5: Số lô & Hạn sử dụng (AC3) */}
                      <div className="lg:col-span-2 space-y-1">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Số lô & Hạn dùng (AC3)
                        </span>
                        <input
                          type="text"
                          placeholder="Số lô: vd LOT-01"
                          value={line.batchNumber}
                          onChange={(e) => handleUpdateLineField(idx, 'batchNumber', e.target.value)}
                          className="w-full text-[11px] font-mono border border-gray-200 rounded-lg p-1 bg-white"
                        />
                        <input
                          type="date"
                          value={line.expiredDate}
                          onChange={(e) => handleUpdateLineField(idx, 'expiredDate', e.target.value)}
                          className="w-full text-[11px] border border-gray-200 rounded-lg p-1 bg-white"
                          title="Hạn sử dụng"
                        />
                      </div>

                      {/* Cột 6: Nút xóa dòng */}
                      <div className="lg:col-span-1 text-center flex justify-end lg:justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa dòng"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PHẦN 3: BẢNG TỔNG KẾT QUY ĐỔI & GHI SỔ */}
          <div className="bg-orange-50/60 rounded-2xl p-4 border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-1 text-gray-600 text-center sm:text-left">
              <div>
                Tổng số dòng mặt hàng: <strong className="text-gray-900">{lines.length} SKU</strong>
              </div>
              <div className="text-[11px] text-gray-500">
                * Toàn bộ hàng hóa nhập kho sẽ được quy chuẩn về đơn vị cơ sở khi ghi sổ thẻ kho.
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-orange-200 shadow-2xs">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-gray-400">Tổng quy đổi cơ sở (AC2)</div>
                <div className="text-sm font-black text-emerald-700 font-mono">
                  {formatQuantity(totalBaseQty)} đơn vị cơ sở
                </div>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-gray-400">Tổng giá trị nhập</div>
                <div className="text-sm font-black text-[#F85606] font-mono">
                  {formatCurrencyVND(totalAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER MODAL: 2 NÚT THAO TÁC RÕ RÀNG (AC4) */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500">
            <strong>Quy tắc ghi sổ (AC4):</strong> Xác nhận phiếu mới cộng tồn kho; Phiếu nháp không ảnh hưởng tồn.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy
            </button>

            {/* Nút 1: Lưu Phiếu Nháp (AC4: Không ảnh hưởng tồn) */}
            <button
              type="button"
              onClick={() => handleSaveReceipt('DRAFT')}
              disabled={submitting || lines.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
              title="Lưu nháp để kiểm đếm tiếp, không cộng tồn"
            >
              <Save size={14} />
              <span>Lưu Phiếu Nháp (AC4)</span>
            </button>

            {/* Nút 2: Xác Nhận Nhập Kho (AC4: Cộng tồn kho ngay) */}
            <button
              type="button"
              onClick={() => handleSaveReceipt('CONFIRMED')}
              disabled={submitting || lines.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition cursor-pointer disabled:opacity-40"
              title="Xác nhận ghi sổ và cộng tồn kho thực tế"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>XÁC NHẬN NHẬP KHO (CỘNG TỒN)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
