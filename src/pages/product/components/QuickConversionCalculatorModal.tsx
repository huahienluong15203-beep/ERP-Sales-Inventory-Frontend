import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '../../../types/product';
import type { ProductUnitConversion, UnitConversionResult } from '../../../types/unitConversion';
import { unitConversionService } from '../../../services/unitConversionService';
import {
  Calculator,
  X,
  Scale,
  CheckCircle2,
  Copy,
  Info,
  Check,
  RefreshCw,
  Boxes
} from '../../../components/common/Icons';

interface QuickConversionCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
}

export const QuickConversionCalculatorModal: React.FC<QuickConversionCalculatorModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProduct
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [availableUnits, setAvailableUnits] = useState<ProductUnitConversion[]>([]);
  const [selectedUnitName, setSelectedUnitName] = useState<string>('');
  const [inputQuantity, setInputQuantity] = useState<number | string>(10);
  const [result, setResult] = useState<UnitConversionResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Khi mở modal, khởi tạo sản phẩm đã chọn
  useEffect(() => {
    if (isOpen) {
      const activeProd = initialProduct || products[0];
      if (activeProd) {
        setSelectedProductId(activeProd.id);
      }
      setCopied(false);
    }
  }, [isOpen, initialProduct, products]);

  // Khi thay đổi sản phẩm, tải danh sách đơn vị tính của sản phẩm đó
  useEffect(() => {
    if (!selectedProductId) return;
    const currentProd = products.find((p) => p.id === selectedProductId);
    if (!currentProd) return;

    let isMounted = true;
    unitConversionService
      .getUnits(currentProd.id, currentProd.sku, currentProd.baseUnit)
      .then((units) => {
        if (!isMounted) return;
        setAvailableUnits(units);

        // Mặc định chọn đơn vị nhập kho hoặc đơn vị quy đổi đầu tiên nếu có
        const defaultUnit =
          units.find((u) => u.isDefaultPurchase) ||
          units.find((u) => !u.isBaseUnit) ||
          units[0];

        if (defaultUnit) {
          setSelectedUnitName(defaultUnit.unitName);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProductId, products]);

  // Tự động tính toán quy đổi khi inputQuantity hoặc selectedUnitName thay đổi
  useEffect(() => {
    if (!selectedProductId || !selectedUnitName || Number(inputQuantity) <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(null);
      return;
    }

    const currentProd = products.find((p) => p.id === selectedProductId);
    if (!currentProd) return;

    setIsCalculating(true);
    const numId = parseInt(currentProd.id.replace(/\D/g, ''), 10) || 1;

    unitConversionService
      .calculateConversion({
        productId: numId,
        sku: currentProd.sku,
        unitName: selectedUnitName,
        quantity: Number(inputQuantity)
      })
      .then((res) => {
        setResult(res);
      })
      .finally(() => {
        setIsCalculating(false);
      });
  }, [selectedProductId, selectedUnitName, inputQuantity, products]);

  if (!isOpen) return null;

  const currentProd = products.find((p) => p.id === selectedProductId);

  const handleCopyFormula = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Calculator size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Tiện Ích Quy Đổi Nhanh Cho Nhân Viên Kho</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30">
                  S2-07 AC2
                </span>
              </div>
              <p className="text-xs text-orange-100">
                Nhập số lượng theo thùng/lốc kho đang gọi, tự động tính số đơn vị cơ sở chuẩn để ghi sổ kho.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung form tính toán */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Chọn sản phẩm (SKU) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              1. Chọn SKU / Sản phẩm cần quy đổi
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] - {p.name} (ĐVT cơ sở: {p.baseUnit})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Nhập số lượng và chọn đơn vị kho đang gọi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                2. Số lượng kho đang gọi hàng
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value)}
                placeholder="VD: 10"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                3. Đơn vị tính kho đang gọi
              </label>
              <select
                value={selectedUnitName}
                onChange={(e) => setSelectedUnitName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
              >
                {availableUnits.map((u) => (
                  <option key={u.id || u.unitName} value={u.unitName}>
                    {u.unitName} (Hệ số: {u.conversionFactor} {currentProd?.baseUnit || ''}){' '}
                    {u.isBaseUnit ? '[Cơ sở]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Khối kết quả quy đổi thời gian thực */}
          {result && (
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-orange-800 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-orange-600" />
                  Kết Quả Quy Đổi Cơ Sở Ghi Sổ Kho
                </span>
                {isCalculating && <RefreshCw size={13} className="animate-spin text-orange-600" />}
              </div>

              {/* Tấm thẻ số lượng cơ sở to rõ */}
              <div className="bg-white p-4 rounded-xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-xs text-gray-500 block">Số lượng cơ sở ghi nhận thẻ kho:</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-orange-600 font-mono">
                      {result.baseQuantity.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-base font-bold text-gray-800">
                      {result.baseUnit}
                    </span>
                  </div>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                  <span className="text-xs text-gray-500 block">Quy cách gọi hàng:</span>
                  <span className="text-sm font-bold text-gray-800 font-mono">
                    {result.inputQuantity} {result.inputUnit}
                  </span>
                </div>
              </div>

              {/* Công thức quy đổi & Nút copy */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-white/80 rounded-xl border border-orange-100 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-orange-500 shrink-0" />
                  <span className="font-bold text-gray-900">{result.formula}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyFormula}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-900 font-semibold text-[11px] transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Chép công thức</span>
                    </>
                  )}
                </button>
              </div>

              {/* Snapshot Đóng Băng Bất Biến (AC3) */}
              {result.snapshot && (
                <div className="p-3 bg-white/90 rounded-xl border border-orange-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                    <span className="flex items-center gap-1 text-orange-800">
                      <Boxes size={14} className="text-orange-600" />
                      Snapshot Giao Dịch Đóng Băng Vào Phiếu (Immutable Snapshot)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      Chống sai lệch lịch sử
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Đơn vị trên phiếu:</span>
                      <strong className="text-gray-900">{result.snapshot.transactionUnit}</strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Số lượng trên phiếu:</span>
                      <strong className="text-gray-900 font-mono">{result.snapshot.transactionQuantity}</strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Hệ số chốt:</span>
                      <strong className="text-gray-900 font-mono">x {result.snapshot.conversionFactor}</strong>
                    </div>
                    <div className="bg-orange-50 p-2 rounded-lg border border-orange-200">
                      <span className="text-orange-600 block text-[10px]">Số cơ sở chốt sổ:</span>
                      <strong className="text-orange-900 font-mono">{result.snapshot.baseQuantity} {result.snapshot.baseUnit}</strong>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 italic pt-0.5">
                    * Thẻ kho và đơn hàng lưu giữ bản Snapshot này. Nếu sau này hệ số đóng thùng đổi sang con số khác, giao dịch này vẫn được giữ nguyên vẹn 100%.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Info size={14} className="text-gray-400" />
            Nhập theo bất kỳ đơn vị nào, sổ cái kế toán & kho luôn ghi theo ĐVT cơ sở.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Hoàn Tất
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
