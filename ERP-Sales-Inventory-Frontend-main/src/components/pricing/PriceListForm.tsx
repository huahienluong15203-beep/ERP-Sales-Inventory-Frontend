import React, { useState } from 'react';
import type { PriceListFormData, PriceListItem, PriceListType, PriceListStatus } from '../../types/pricing';

// Dữ liệu mẫu sản phẩm gợi ý để thêm nhanh vào bảng giá
const AVAILABLE_PRODUCTS = [
  { sku: 'SP-BIA-001', name: 'Bia Saigon Special 330ml', baseUnit: 'Lon', saleUnit: 'Thùng (24 lon)', conversionRate: 24, standardPrice: 340000 },
  { sku: 'SP-BIA-002', name: 'Bia Heineken Silver 330ml', baseUnit: 'Lon', saleUnit: 'Thùng (24 lon)', conversionRate: 24, standardPrice: 420000 },
  { sku: 'SP-NGK-003', name: 'Nước ngọt Coca-Cola 320ml', baseUnit: 'Lon', saleUnit: 'Thùng (24 lon)', conversionRate: 24, standardPrice: 210000 },
  { sku: 'SP-KHO-004', name: 'Mì Hảo Hảo Tôm Chua Cay', baseUnit: 'Gói', saleUnit: 'Thùng (30 gói)', conversionRate: 30, standardPrice: 125000 },
  { sku: 'SP-SUA-005', name: 'Sữa tươi Vinamilk 180ml', baseUnit: 'Hộp', saleUnit: 'Lốc (4 hộp)', conversionRate: 4, standardPrice: 34000 }
];

interface PriceListFormProps {
  initialData?: Partial<PriceListFormData>;
  onSave?: (data: PriceListFormData) => void;
  onCancel?: () => void;
}

export const PriceListForm: React.FC<PriceListFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<PriceListFormData>({
    code: initialData?.code || 'BG-2026-DL1',
    name: initialData?.name || 'Bảng giá Đại lý Cấp 1 - Quý 4/2026',
    type: initialData?.type || 'WHOLESALE_T1',
    effectiveFrom: initialData?.effectiveFrom || '2026-10-01',
    effectiveTo: initialData?.effectiveTo || '2026-12-31',
    status: initialData?.status || 'ACTIVE',
    currency: 'VND',
    description: initialData?.description || 'Áp dụng cho các nhà phân phối và đại lý cấp 1 khu vực miền Nam.',
    items: initialData?.items || [
      {
        id: '1',
        sku: 'SP-BIA-001',
        productName: 'Bia Saigon Special 330ml',
        baseUnit: 'Lon',
        saleUnit: 'Thùng (24 lon)',
        conversionRate: 24,
        standardPrice: 340000,
        appliedPrice: 315000,
        note: 'Ưu đãi đại lý cấp 1'
      },
      {
        id: '2',
        sku: 'SP-BIA-002',
        productName: 'Bia Heineken Silver 330ml',
        baseUnit: 'Lon',
        saleUnit: 'Thùng (24 lon)',
        conversionRate: 24,
        standardPrice: 420000,
        appliedPrice: 395000,
        note: 'Chiết khấu đầu vụ'
      },
      {
        id: '3',
        sku: 'SP-NGK-003',
        productName: 'Nước ngọt Coca-Cola 320ml',
        baseUnit: 'Lon',
        saleUnit: 'Thùng (24 lon)',
        conversionRate: 24,
        standardPrice: 210000,
        appliedPrice: 198000,
        note: 'Giá đại lý chính thức'
      }
    ]
  });

  const [selectedProductSku, setSelectedProductSku] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleInputChange = (field: keyof PriceListFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleItemPriceChange = (id: string, newAppliedPrice: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, appliedPrice: Math.max(0, newAppliedPrice) } : item
      )
    }));
  };

  const handleItemNoteChange = (id: string, note: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, note } : item))
    }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id)
    }));
  };

  const handleAddProduct = () => {
    if (!selectedProductSku) return;
    const prod = AVAILABLE_PRODUCTS.find((p) => p.sku === selectedProductSku);
    if (!prod) return;

    if (formData.items.some((item) => item.sku === prod.sku)) {
      setToastMessage(`Sản phẩm [${prod.sku}] đã có trong bảng giá.`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const newItem: PriceListItem = {
      id: Date.now().toString(),
      sku: prod.sku,
      productName: prod.name,
      baseUnit: prod.baseUnit,
      saleUnit: prod.saleUnit,
      conversionRate: prod.conversionRate,
      standardPrice: prod.standardPrice,
      appliedPrice: prod.standardPrice,
      note: ''
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setSelectedProductSku('');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = 'Mã bảng giá không được để trống';
    if (!formData.name.trim()) newErrors.name = 'Tên bảng giá không được để trống';
    if (!formData.effectiveFrom) newErrors.effectiveFrom = 'Vui lòng chọn ngày hiệu lực từ';
    if (formData.effectiveTo && formData.effectiveTo < formData.effectiveFrom) {
      newErrors.effectiveTo = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
    }
    if (formData.items.length === 0) {
      newErrors.items = 'Bảng giá phải có ít nhất 1 sản phẩm áp dụng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (onSave) {
      onSave(formData);
    }
    setToastMessage('Đã lưu thông tin bảng giá thành công!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Toast thông báo nhẹ */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold px-2 py-1"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Header Form */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/50 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F85606]" />
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Form Nhập Bảng Giá Bán</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Thiết lập thông tin chung, thời gian hiệu lực và đơn giá bán theo đơn vị tính quy chuẩn (Base Unit)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                formData.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : formData.status === 'DRAFT'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {formData.status === 'ACTIVE' ? 'Đang Áp Dụng' : formData.status === 'DRAFT' ? 'Bản Nháp' : 'Tạm Dừng'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* Khối 1: Thông tin chung bảng giá */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">1. Thông tin chung bảng giá</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mã bảng giá */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Mã bảng giá <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="VD: BG-2026-DL1"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
                  errors.code ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606]'
                }`}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
            </div>

            {/* Tên bảng giá */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Tên bảng giá <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="VD: Bảng giá Đại lý Cấp 1"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
                  errors.name ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606]'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Loại bảng giá / Kênh */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Phân loại khách hàng
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as PriceListType)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] bg-white"
              >
                <option value="WHOLESALE_T1">Đại lý Cấp 1 (Phân phối lớn)</option>
                <option value="WHOLESALE_T2">Đại lý Cấp 2 (Cửa hàng vừa)</option>
                <option value="RETAIL">Bán lẻ (Điểm bán trực tiếp)</option>
                <option value="SPECIAL_PROMO">Chương trình khuyến mãi mùa</option>
              </select>
            </div>

            {/* Ngày hiệu lực từ */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Hiệu lực từ ngày <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
                  errors.effectiveFrom ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606]'
                }`}
              />
              {errors.effectiveFrom && <p className="text-xs text-red-500 mt-1">{errors.effectiveFrom}</p>}
            </div>

            {/* Ngày hết hạn */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Đến ngày (Tùy chọn)
              </label>
              <input
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
                  errors.effectiveTo ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606]'
                }`}
              />
              {errors.effectiveTo && <p className="text-xs text-red-500 mt-1">{errors.effectiveTo}</p>}
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Trạng thái áp dụng
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as PriceListStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] bg-white"
              >
                <option value="ACTIVE">Áp dụng ngay</option>
                <option value="DRAFT">Lưu nháp (Chưa hiệu lực)</option>
                <option value="PAUSED">Tạm dừng áp dụng</option>
              </select>
            </div>

            {/* Đồng tiền */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Đơn vị tiền tệ
              </label>
              <input
                type="text"
                value="VND (Việt Nam Đồng)"
                disabled
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-medium cursor-not-allowed"
              />
            </div>

            {/* Mô tả / Ghi chú */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Ghi chú điều khoản bảng giá
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Nhập điều kiện thanh toán hoặc phạm vi áp dụng cụ thể..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606]"
              />
            </div>
          </div>
        </div>

        {/* Khối 2: Danh sách sản phẩm và đơn giá áp dụng */}
        <div className="border-t border-gray-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                2. Danh mục sản phẩm & Đơn giá áp dụng ({formData.items.length} mặt hàng)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Căn cứ theo Đơn vị tính cơ sở & Đơn vị bán quy đổi để xác định giá niêm yết và giá bán
              </p>
            </div>

            {/* Thêm sản phẩm nhanh */}
            <div className="flex items-center gap-2">
              <select
                value={selectedProductSku}
                onChange={(e) => setSelectedProductSku(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] bg-white min-w-[200px]"
              >
                <option value="">-- Chọn sản phẩm thêm vào --</option>
                {AVAILABLE_PRODUCTS.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductSku}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF2EE] hover:bg-[#FFE3D9] text-[#F85606] border border-[#FFD8CC] text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Thêm sản phẩm
              </button>
            </div>
          </div>

          {errors.items && <p className="text-xs text-red-500 mb-2 font-medium">{errors.items}</p>}

          {/* Bảng danh sách sản phẩm */}
          <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-xs">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">STT</th>
                  <th className="px-3 py-3 min-w-[120px]">Mã SKU</th>
                  <th className="px-3 py-3 min-w-[180px]">Tên sản phẩm</th>
                  <th className="px-3 py-3 min-w-[130px]">ĐVT bán / Cơ sở</th>
                  <th className="px-3 py-3 text-right min-w-[130px]">Giá chuẩn (Niêm yết)</th>
                  <th className="px-3 py-3 min-w-[150px] text-right">Giá áp dụng (VND)</th>
                  <th className="px-3 py-3 text-center min-w-[100px]">Mức chênh lệch</th>
                  <th className="px-3 py-3 min-w-[160px]">Ghi chú</th>
                  <th className="px-3 py-3 w-12 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {formData.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      Chưa có sản phẩm nào trong bảng giá này. Vui lòng chọn sản phẩm ở trên và nhấn "Thêm sản phẩm".
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item, index) => {
                    const diff = item.appliedPrice - item.standardPrice;
                    const diffPercent = item.standardPrice > 0 ? (diff / item.standardPrice) * 100 : 0;

                    return (
                      <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-3 py-2.5 text-center text-gray-400 font-medium">{index + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800">{item.sku}</td>
                        <td className="px-3 py-2.5 text-gray-900 font-medium">{item.productName}</td>
                        <td className="px-3 py-2.5 text-gray-600">
                          <div>
                            <span className="font-semibold text-gray-900">{item.saleUnit}</span>
                            <div className="text-[11px] text-gray-400">
                              (1 {item.saleUnit.split(' ')[0]} = {item.conversionRate} {item.baseUnit})
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-600">
                          {formatVND(item.standardPrice)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={item.appliedPrice}
                            onChange={(e) => handleItemPriceChange(item.id, Number(e.target.value))}
                            className="w-32 px-2.5 py-1 text-right text-xs font-bold text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606]"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {diff === 0 ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">Bằng giá</span>
                          ) : diff < 0 ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Giảm {Math.abs(diffPercent).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              Tăng {diffPercent.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={item.note || ''}
                            placeholder="Ghi chú áp dụng..."
                            onChange={(e) => handleItemNoteChange(item.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-200 focus:border-[#F85606] rounded focus:outline-none bg-transparent"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                            title="Xóa khỏi bảng giá"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nút hành động Form */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Tổng cộng: <strong className="text-gray-900 font-semibold">{formData.items.length}</strong> sản phẩm áp dụng
          </div>
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
            )}
            <button
              type="button"
              onClick={() => handleInputChange('status', 'DRAFT')}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Lưu nháp
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-95 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Lưu Bảng Giá
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
