import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowRightLeft,
  Warehouse,
  AlertTriangle,
  Package,
  Truck,
  Layers
} from 'lucide-react';
import type { StockTransfer, CreateStockTransferPayload } from '../../types/stockTransfer';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';
import { createStockTransfer } from '../../services/stockTransferApi';
import { useAuth } from '../../contexts/AuthContext';

interface StockTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transfer: StockTransfer) => void;
}

interface TransferLineDraft {
  id: string;
  productId: number;
  productSku: string;
  productName: string;
  category?: string;
  unit: string;
  sourceAvailableStock: number;
  transferQuantity: number;
  batchNumber: string;
  expiredDate: string;
}

/**
 * Subtask S5-07 (Nguyễn Văn Minh): FE: Form chọn Kho đi/đến
 * Acceptance Criteria:
 * - AC1: Chọn kho đi, kho đến, danh sách hàng và số lượng
 * - AC2: Hàng đang chuyển được ghi nhận là đang trên đường, chưa cộng vào kho đến
 * - Validate chặt chẽ: Kho đi khác Kho đến, không chuyển vượt tồn khả dụng
 */
export const StockTransferFormModal: React.FC<StockTransferFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, showToast } = useAuth();

  // Danh mục sản phẩm hệ thống
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Form Fields thông tin chuyển kho (AC1)
  const [sourceWarehouseCode, setSourceWarehouseCode] = useState<string>('WH-MB01');
  const [destWarehouseCode, setDestWarehouseCode] = useState<string>('WH-MT01');
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expectedReceiveDate, setExpectedReceiveDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [transporterName, setTransporterName] = useState<string>('');
  const [generalNote, setGeneralNote] = useState<string>('');

  // Danh sách dòng sản phẩm điều chuyển (AC1)
  const [lines, setLines] = useState<TransferLineDraft[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tải danh mục sản phẩm khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    setLoadingProducts(true);
    productService
      .getProducts({ size: 100, status: 'ACTIVE' })
      .then((res) => {
        setProducts(res.products);
        setLoadingProducts(false);
      })
      .catch((err) => {
        console.error('Lỗi tải sản phẩm:', err);
        setLoadingProducts(false);
      });

    // Reset form state
    setLines([]);
    setFormErrors([]);
    setVehiclePlate('');
    setTransporterName('');
    setGeneralNote('');
  }, [isOpen]);

  if (!isOpen) return null;

  // Thêm dòng hàng hóa mới
  const handleAddLine = () => {
    if (products.length === 0) return;
    const defaultP = products[0];

    // Mock tồn khả dụng giả định từ 50 - 500 theo sản phẩm
    const mockStock = Math.floor(Math.random() * 200) + 50;

    const newLine: TransferLineDraft = {
      id: `draft-line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: Number(defaultP.id),
      productSku: defaultP.sku,
      productName: defaultP.name,
      category: defaultP.category,
      unit: defaultP.baseUnit || 'Thùng',
      sourceAvailableStock: mockStock,
      transferQuantity: 10,
      batchNumber: `LOT-TRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      expiredDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    };

    setLines((prev) => [...prev, newLine]);
  };

  // Đổi sản phẩm trên dòng
  const handleChangeProduct = (lineIndex: number, newProductId: number) => {
    const p = products.find((item) => Number(item.id) === newProductId);
    if (!p) return;

    const mockStock = Math.floor(Math.random() * 200) + 50;

    setLines((prev) => {
      const next = [...prev];
      next[lineIndex] = {
        ...next[lineIndex],
        productId: Number(p.id),
        productSku: p.sku,
        productName: p.name,
        category: p.category,
        unit: p.baseUnit || 'Thùng',
        sourceAvailableStock: mockStock,
        transferQuantity: Math.min(next[lineIndex].transferQuantity, mockStock)
      };
      return next;
    });
  };

  // Cập nhật trường bất kỳ của dòng
  const handleUpdateLine = (lineIndex: number, field: keyof TransferLineDraft, val: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[lineIndex] = { ...next[lineIndex], [field]: val };
      return next;
    });
  };

  // Xóa dòng
  const handleRemoveLine = (lineIndex: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== lineIndex));
  };

  // Kiểm tra hợp lệ dữ liệu
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // AC1: Kiểm tra Kho đi và Kho đến
    if (!sourceWarehouseCode) {
      errors.push('Vui lòng chọn Kho đi (Kho nguồn xuất hàng).');
    }
    if (!destWarehouseCode) {
      errors.push('Vui lòng chọn Kho đến (Kho đích nhận hàng).');
    }
    if (sourceWarehouseCode && destWarehouseCode && sourceWarehouseCode === destWarehouseCode) {
      errors.push('Kho đi và Kho đến không được trùng nhau! Vui lòng chọn hai kho khác nhau.');
    }
    if (!transferDate) {
      errors.push('Vui lòng chọn Ngày điều chuyển.');
    }
    if (lines.length === 0) {
      errors.push('Phiếu chuyển kho phải có ít nhất 1 dòng mặt hàng cần điều chuyển.');
    }

    // Kiểm tra từng dòng hàng
    lines.forEach((l, idx) => {
      if (l.transferQuantity <= 0) {
        errors.push(`Dòng ${idx + 1} (${l.productName}): Số lượng chuyển phải lớn hơn 0.`);
      }
      if (l.transferQuantity > l.sourceAvailableStock) {
        errors.push(
          `Dòng ${idx + 1} (${l.productName}): Số lượng chuyển (${l.transferQuantity}) vượt quá tồn khả dụng tại kho đi (${l.sourceAvailableStock} ${l.unit}).`
        );
      }
    });

    setFormErrors(errors);
    return errors.length === 0;
  };

  // Xử lý gửi form (Lưu nháp hoặc Xuất kho vận chuyển)
  const handleSubmit = async (targetStatus: 'DRAFT' | 'IN_TRANSIT') => {
    if (!validateForm()) {
      showToast('Thông tin chưa hợp lệ', 'Vui lòng kiểm tra lại các trường cảnh báo màu đỏ', 'error');
      return;
    }

    const payload: CreateStockTransferPayload = {
      sourceWarehouseCode,
      destWarehouseCode,
      transferDate,
      expectedReceiveDate: expectedReceiveDate || undefined,
      vehiclePlate: vehiclePlate.trim() || undefined,
      transporterName: transporterName.trim() || undefined,
      note: generalNote.trim() || undefined,
      status: targetStatus,
      lines: lines.map((l) => ({
        productId: l.productId,
        productSku: l.productSku,
        productName: l.productName,
        category: l.category,
        unit: l.unit,
        sourceAvailableStock: l.sourceAvailableStock,
        transferQuantity: l.transferQuantity,
        batchNumber: l.batchNumber || undefined,
        expiredDate: l.expiredDate || undefined
      }))
    };

    setIsSubmitting(true);
    try {
      const created = await createStockTransfer(payload, user?.username || 'thukho');
      if (targetStatus === 'IN_TRANSIT') {
        showToast(
          'Xuất kho & Vận chuyển thành công (AC2)',
          `Phiếu [${created.code}] đã trừ kho đi và ghi nhận trạng thái Đang trên đường. Kho đến chưa được cộng tồn.`,
          'success',
          5000
        );
      } else {
        showToast(
          'Lưu phiếu nháp thành công',
          `Phiếu nháp [${created.code}] đã được lưu. Chưa trừ tồn kho đi và chưa vận chuyển.`,
          'info',
          4000
        );
      }
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      console.error('Lỗi tạo phiếu chuyển kho:', err);
      showToast('Lỗi tạo phiếu', err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTransferQty = lines.reduce((s, l) => s + Number(l.transferQuantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <span>Lập Phiếu Chuyển Kho Nội Bộ</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Sprint 5: S5-07
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Điều chuyển hàng giữa các kho chi nhánh, ghi nhận hàng đi đường chính xác
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
          {/* Cảnh báo lỗi validation */}
          {formErrors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>Vui lòng kiểm tra lại thông tin phiếu chuyển:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-700 pl-1 space-y-0.5">
                {formErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* PHẦN 1: CHỌN KHO ĐI / KHO ĐẾN (AC1 cốt lõi của Subtask) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Warehouse size={15} className="text-blue-600" />
                <span>1. Chọn Kho Đi & Kho Đến (AC1)</span>
              </div>
              {sourceWarehouseCode === destWarehouseCode && (
                <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  <AlertTriangle size={12} /> Kho đi và kho đến không được trùng nhau!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chọn Kho Đi (Kho Nguồn) */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span>Kho Đi (Kho xuất hàng)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceWarehouseCode}
                  onChange={(e) => setSourceWarehouseCode(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {SYSTEM_WAREHOUSES.map((wh) => (
                    <option key={wh.code} value={wh.code}>
                      [{wh.code}] {wh.name} ({wh.address})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 italic">
                  Số lượng xuất chuyển sẽ được trừ khỏi tồn khả dụng của kho này khi xuất kho
                </p>
              </div>

              {/* Chọn Kho Đến (Kho Đích) */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Kho Đến (Kho nhận hàng)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destWarehouseCode}
                  onChange={(e) => setDestWarehouseCode(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {SYSTEM_WAREHOUSES.map((wh) => (
                    <option key={wh.code} value={wh.code}>
                      [{wh.code}] {wh.name} ({wh.address})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 italic">
                  Tồn kho chỉ được CỘNG THỰC TẾ sau khi kho đến xác nhận nhận đủ (AC2, AC3)
                </p>
              </div>
            </div>

            {/* Thông tin vận chuyển & ngày tháng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Ngày chuyển <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Ngày dự kiến đến
                </label>
                <input
                  type="date"
                  value={expectedReceiveDate}
                  onChange={(e) => setExpectedReceiveDate(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Biển số xe vận chuyển
                </label>
                <input
                  type="text"
                  placeholder="Vd: 29C-781.99"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Tài xế / Đơn vị vận chuyển
                </label>
                <input
                  type="text"
                  placeholder="Vd: Nguyễn Văn A (Nhà xe Hưng Phát)"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Ghi chú điều chuyển
              </label>
              <input
                type="text"
                placeholder="Vd: Điều chuyển cấp bách đáp ứng đơn đại lý chi nhánh miền Trung..."
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* PHẦN 2: DANH SÁCH HÀNG HÓA & SỐ LƯỢNG (AC1) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Package size={15} className="text-blue-600" />
                <span>2. Danh Sách Hàng Hóa & Số Lượng Điều Chuyển (AC1)</span>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                disabled={loadingProducts || products.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200 cursor-pointer disabled:opacity-50"
              >
                <Plus size={14} />
                <span>Thêm mặt hàng</span>
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50/50">
                <Package size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-bold text-gray-600">Chưa có mặt hàng nào trong phiếu chuyển kho</p>
                <p className="text-[11px] text-gray-400 mt-1 mb-4">
                  Nhấn "Thêm mặt hàng" để chọn sản phẩm và khai báo số lượng cần điều chuyển
                </p>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Plus size={14} /> Thêm dòng hàng
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">STT</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Mặt hàng / SKU</th>
                        <th className="py-2.5 px-3 w-28 text-center">Tồn khả dụng kho đi</th>
                        <th className="py-2.5 px-3 w-32 text-center">Số lượng chuyển</th>
                        <th className="py-2.5 px-3 w-24 text-center">Đơn vị</th>
                        <th className="py-2.5 px-3 w-36">Số lô điều chuyển</th>
                        <th className="py-2.5 px-3 w-32">Hạn sử dụng</th>
                        <th className="py-2.5 px-2 w-12 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, idx) => {
                        const isOverStock = line.transferQuantity > line.sourceAvailableStock;

                        return (
                          <tr key={line.id} className={isOverStock ? 'bg-rose-50/50' : 'hover:bg-gray-50/80'}>
                            <td className="py-2.5 px-3 text-center font-bold text-gray-400">
                              {idx + 1}
                            </td>

                            {/* Chọn sản phẩm */}
                            <td className="py-2.5 px-3">
                              <select
                                value={line.productId}
                                onChange={(e) => handleChangeProduct(idx, Number(e.target.value))}
                                className="w-full text-xs font-bold border border-gray-200 rounded-lg p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.sku}] {p.name}
                                  </option>
                                ))}
                              </select>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Nhóm: {line.category || 'Mặc định'}
                              </div>
                            </td>

                            {/* Tồn khả dụng tại kho đi */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-[11px]">
                                {line.sourceAvailableStock.toLocaleString('vi-VN')} {line.unit}
                              </span>
                            </td>

                            {/* Số lượng chuyển */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={line.transferQuantity}
                                onChange={(e) =>
                                  handleUpdateLine(idx, 'transferQuantity', Math.max(0, Number(e.target.value)))
                                }
                                className={`w-full text-center font-black text-xs border rounded-lg p-1.5 bg-white focus:outline-none focus:ring-1 ${
                                  isOverStock
                                    ? 'border-rose-400 text-rose-600 focus:ring-rose-500 bg-rose-50'
                                    : 'border-gray-200 text-gray-900 focus:ring-blue-500'
                                }`}
                              />
                              {isOverStock && (
                                <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                                  Vượt tồn khả dụng!
                                </div>
                              )}
                            </td>

                            {/* Đơn vị tính */}
                            <td className="py-2.5 px-3 text-center font-semibold text-gray-600">
                              {line.unit}
                            </td>

                            {/* Số lô */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Số lô..."
                                value={line.batchNumber}
                                onChange={(e) => handleUpdateLine(idx, 'batchNumber', e.target.value)}
                                className="w-full text-[11px] font-mono border border-gray-200 rounded-lg p-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* Hạn sử dụng */}
                            <td className="py-2.5 px-3">
                              <input
                                type="date"
                                value={line.expiredDate}
                                onChange={(e) => handleUpdateLine(idx, 'expiredDate', e.target.value)}
                                className="w-full text-[11px] border border-gray-200 rounded-lg p-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* Nút xóa */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="text-gray-300 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer tổng kết danh sách */}
                <div className="bg-gray-50 p-3 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="text-gray-500 flex items-center gap-2">
                    <Layers size={14} className="text-gray-400" />
                    <span>Số loại mặt hàng: <b>{lines.length}</b></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">
                      Tổng số lượng điều chuyển:
                      <b className="ml-1.5 text-blue-700 text-sm">
                        {totalTransferQty.toLocaleString('vi-VN')}
                      </b>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Banner giải thích trạng thái theo AC2 & AC3 */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 text-xs text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-800">
              <Truck size={14} className="text-blue-600" />
              <span>Quy trình ghi nhận điều chuyển hàng kho (S5-07):</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-blue-800/90 space-y-1 pl-1">
              <li>
                <b>Lưu nháp:</b> Phiếu được lưu ở trạng thái nháp, chưa trừ kho xuất và chưa vận chuyển.
              </li>
              <li>
                <b>Xuất kho & Vận chuyển (AC2):</b> Hệ thống trừ tồn kho đi và đánh dấu là <b>"Đang đi đường (IN_TRANSIT)"</b>. Kho đến <b>chưa được cộng tồn</b>.
              </li>
              <li>
                <b>Nhận hàng tại kho đến (AC3, AC4):</b> Khi xe đến nơi, thủ kho đến mở phiếu để xác nhận nhận đủ hoặc nhập lý do giải trình nếu phát hiện chênh lệch.
              </li>
            </ul>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {/* Nút 1: Lưu nháp */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Lưu nháp (Chưa xuất kho)
            </button>

            {/* Nút 2: Xuất kho & Chuyển (AC2) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('IN_TRANSIT')}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Truck size={15} />
              <span>{isSubmitting ? 'Đang xử lý...' : 'Xuất kho & Vận chuyển (Ghi nhận Đang đi đường)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
