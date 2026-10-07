import React, { useState, useEffect } from 'react';
import type { CustomerGroupType, PriceLookupResponse } from '../../types/pricing';
import { CUSTOMER_GROUPS } from '../../types/pricing';
import { lookupPrice } from '../../services/pricingApi';
import { productService, ProductOptionItem } from '../../services/productService';
import { Icons } from '../common/Icons';

export const PriceLookupWidget: React.FC = () => {
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupType>('DEALER_LEVEL_1');
  const [productSku, setProductSku] = useState<string>('');
  const [realProducts, setRealProducts] = useState<ProductOptionItem[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PriceLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSimulatedPrice, setTestSimulatedPrice] = useState<string>('');

  useEffect(() => {
    productService
      .searchProductOptions('', 50)
      .then(setRealProducts)
      .catch(() => {});
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productSku.trim()) {
      setError('Vui lòng nhập hoặc chọn mã SKU sản phẩm');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await lookupPrice({
        customerGroup,
        productSku: productSku.trim().toUpperCase(),
        date: date || undefined
      });
      setResult(data);
      setTestSimulatedPrice(data.price.toString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tra cứu giá');
    } finally {
      setLoading(false);
    }
  };

  const simPriceNum = parseFloat(testSimulatedPrice) || 0;
  const isBelowFloor = result ? simPriceNum > 0 && simPriceNum < result.floorPrice : false;
  const isOverPrice = result ? simPriceNum > result.price : false;

  return (
    <div className="bg-white text-gray-900 rounded-2xl p-5 mb-6 shadow-xs border border-gray-100">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 text-[#F85606] rounded-lg">
              <Icons.BadgeDollarSign size={20} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 tracking-wide">
              Công cụ tra cứu giá & Mức giá sàn tức thời
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Dành cho Nhân viên kinh doanh & Kế toán khi chốt đơn: tự động nhận đúng giá theo nhóm khách hàng và cảnh báo xét duyệt giá sàn
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
          <Icons.CheckSquare size={14} />
          <span>Tự động áp dụng giá</span>
        </div>
      </div>

      <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Nhóm khách hàng */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nhóm khách hàng
          </label>
          <select
            value={customerGroup}
            onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100"
          >
            {Object.values(CUSTOMER_GROUPS).map((group) => (
              <option key={group.key} value={group.key} className="bg-white text-gray-900">
                {group.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mã SKU hoặc chọn nhanh */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">
              Sản phẩm / Mã SKU
            </label>
            <span className="text-[10px] text-gray-500">
              Gợi ý F&B FMCG
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              list="catalog-sku-options"
              value={productSku}
              onChange={(e) => setProductSku(e.target.value)}
              placeholder="VD: BIA-0001, NGK-0002..."
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 uppercase font-mono"
            />
            <datalist id="catalog-sku-options">
              {realProducts.map((prod) => (
                <option key={prod.id} value={prod.sku}>
                  {prod.name} {prod.packaging ? `(${prod.packaging})` : ''}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        {/* Ngày áp dụng */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Thời điểm hiệu lực
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* Nút tra cứu */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F85606] hover:bg-[#E04D05] text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang tra cứu...</span>
              </>
            ) : (
              <>
                <Icons.BadgeDollarSign size={16} />
                <span>Tra cứu giá</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <Icons.ShieldAlert size={16} className="text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hiển thị kết quả tra cứu */}
      {result && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Cột 1: Thông tin bảng giá */}
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-gray-200 pb-3 md:pb-0 md:pr-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Bảng giá đang áp dụng
              </span>
              <div className="mt-1 font-bold text-gray-900 text-base">
                {result.priceListCode}
              </div>
              <div className="text-xs text-gray-500 line-clamp-1">
                {result.priceListName}
              </div>
              <div className="mt-1.5 inline-block text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-[#F85606] border border-orange-200">
                {result.customerGroupLabel}
              </div>
            </div>

            {/* Cột 2: Sản phẩm */}
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-gray-200 pb-3 md:pb-0 md:pr-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Sản phẩm
              </span>
              <div className="mt-1 font-mono font-bold text-amber-600 text-sm">
                {result.productSku}
              </div>
              <div className="text-xs text-gray-700 line-clamp-2 mt-0.5">
                {result.productName}
              </div>
            </div>

            {/* Cột 3: Giá bán & Giá sàn */}
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-gray-200 pb-3 md:pb-0 md:pr-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-medium">
                    Giá niêm yết
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    {result.price.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-600 uppercase block font-medium">
                    Mức giá sàn
                  </span>
                  <span className="text-lg font-bold text-amber-600">
                    {result.floorPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Biên độ đàm phán: {(result.price - result.floorPrice).toLocaleString('vi-VN')} đ (
                {Math.round(((result.price - result.floorPrice) / result.price) * 100)}%)
              </div>
            </div>

            {/* Cột 4: Mô phỏng kiểm tra giá đặt hàng */}
            <div className="md:col-span-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 block mb-1">
                Thử giá báo khách (Simulate)
              </label>
              <input
                type="number"
                value={testSimulatedPrice}
                onChange={(e) => setTestSimulatedPrice(e.target.value)}
                placeholder="Nhập giá dự kiến báo..."
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#F85606] focus:outline-none"
              />
              <div className="mt-1.5">
                {isBelowFloor ? (
                  <span className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1 font-medium">
                    <Icons.ShieldAlert size={12} className="shrink-0" />
                    Bán dưới giá sàn: Cần QLKD duyệt!
                  </span>
                ) : isOverPrice ? (
                  <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Giá bán vượt giá niêm yết
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-medium">
                    <Icons.CheckSquare size={12} className="shrink-0" />
                    Hợp lệ (Tự động duyệt)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
