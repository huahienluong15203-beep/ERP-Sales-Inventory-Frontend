import React, { useState, useEffect } from 'react';
import type { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../../types/supplier';
import { createSupplier, updateSupplier } from '../../services/supplierApi';
import { Icons } from '../common/Icons';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null; // null = tạo mới, khác null = chỉnh sửa
  onSuccess: (saved: Supplier) => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess
}) => {
  const isEdit = Boolean(supplier);

  const [formData, setFormData] = useState<CreateSupplierPayload>({
    code: '',
    name: '',
    taxCode: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: '',
    note: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setFormData({
        code: supplier.code,
        name: supplier.name,
        taxCode: supplier.taxCode,
        contactName: supplier.contactName || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        paymentTerms: supplier.paymentTerms || '',
        note: supplier.note || ''
      });
    } else {
      setFormData({
        code: '',
        name: '',
        taxCode: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        paymentTerms: '',
        note: ''
      });
    }
    setErrors({});
    setApiError(null);
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // Mã NCC (chỉ validate khi tạo mới)
    if (!isEdit) {
      const codeRegex = /^[A-Za-z0-9_-]{2,30}$/;
      if (!formData.code.trim()) {
        errs.code = 'Mã nhà cung cấp không được để trống';
      } else if (!codeRegex.test(formData.code.trim())) {
        errs.code = 'Mã từ 2–30 ký tự (chữ cái, chữ số, dấu - hoặc _, không dấu cách)';
      }
    }

    // Tên nhà cung cấp
    if (!formData.name.trim()) {
      errs.name = 'Tên nhà cung cấp không được để trống';
    } else if (formData.name.trim().length > 200) {
      errs.name = 'Tên nhà cung cấp tối đa 200 ký tự';
    }

    // Mã số thuế (Chuẩn VN: 10 chữ số hoặc 10 chữ số kèm -3 chữ số chi nhánh)
    const taxRegex = /^[0-9]{10}(-[0-9]{3})?$/;
    if (!formData.taxCode.trim()) {
      errs.taxCode = 'Mã số thuế không được để trống';
    } else if (!taxRegex.test(formData.taxCode.trim())) {
      errs.taxCode = 'Mã số thuế gồm 10 chữ số hoặc 10 số kèm -3 số chi nhánh (vd: 0300588569 hoặc 0100100989-001)';
    }

    // Số điện thoại
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^0[0-9]{9,10}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errs.phone = 'Số điện thoại gồm 10–11 chữ số và bắt đầu bằng số 0';
      }
    }

    // Email
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Địa chỉ email không đúng định dạng';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      if (isEdit && supplier) {
        const payload: UpdateSupplierPayload = {
          name: formData.name.trim(),
          taxCode: formData.taxCode.trim(),
          contactName: formData.contactName?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          paymentTerms: formData.paymentTerms?.trim() || undefined,
          note: formData.note?.trim() || undefined
        };
        const updated = await updateSupplier(supplier.id, payload);
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreateSupplierPayload = {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          taxCode: formData.taxCode.trim(),
          contactName: formData.contactName?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          paymentTerms: formData.paymentTerms?.trim() || undefined,
          note: formData.note?.trim() || undefined
        };
        const created = await createSupplier(payload);
        onSuccess(created);
        onClose();
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thông tin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-orange-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Icons.Truck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? 'Cập nhật Thông tin Nhà Cung Cấp' : 'Khai báo Nhà Cung Cấp Mới'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEdit
                  ? `Mã: ${supplier?.code} (Mã không thay đổi sau khi tạo)`
                  : 'Nguồn hàng chuẩn để gắn đúng vào phiếu nhập kho truy nguyên lô lỗi'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {apiError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <Icons.AlertCircle size={16} className="shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Hàng 1: Mã & Tên nhà cung cấp */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã nhà cung cấp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={isEdit}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VD: NCC-VNM"
                className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px] ${
                  isEdit ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''
                } ${errors.code ? 'border-red-400 ring-red-100' : 'border-gray-200'}`}
              />
              {errors.code && <p className="mt-1 text-[11px] text-red-500">{errors.code}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên nhà cung cấp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Công ty Cổ phần Sữa Việt Nam"
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px] ${
                  errors.name ? 'border-red-400 ring-red-100' : 'border-gray-200'
                }`}
              />
              {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
            </div>
          </div>

          {/* Hàng 2: Mã số thuế & Điều khoản thanh toán */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã số thuế (MST) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value.trim() })}
                placeholder="VD: 0300588569 hoặc 0100100989-001"
                className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px] ${
                  errors.taxCode ? 'border-red-400 ring-red-100' : 'border-gray-200'
                }`}
              />
              {errors.taxCode ? (
                <p className="mt-1 text-[11px] text-red-500">{errors.taxCode}</p>
              ) : (
                <p className="mt-1 text-[11px] text-gray-400">Chuẩn 10 số hoặc 10 số kèm 3 số chi nhánh</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Điều khoản thanh toán
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="VD: Thanh toán sau 30 ngày kể từ ngày nhận hàng"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px]"
              />
              <p className="mt-1 text-[11px] text-gray-400">Căn cứ hạch toán công nợ và đối soát hóa đơn</p>
            </div>
          </div>

          {/* Hàng 3: Người liên hệ, SĐT, Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Người liên hệ đại diện
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="VD: Nguyễn Văn A (P. Kinh Doanh)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.trim() })}
                placeholder="VD: 02854155555"
                className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px] ${
                  errors.phone ? 'border-red-400 ring-red-100' : 'border-gray-200'
                }`}
              />
              {errors.phone && <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email liên hệ
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                placeholder="VD: contact@vinamilk.com.vn"
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px] ${
                  errors.email ? 'border-red-400 ring-red-100' : 'border-gray-200'
                }`}
              />
              {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
            </div>
          </div>

          {/* Địa chỉ trụ sở / kho nguồn */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Địa chỉ kho / trụ sở nhà cung cấp
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="VD: Số 10 Tân Trào, P. Tân Phú, Quận 7, TP. Hồ Chí Minh"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all min-h-[40px]"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ghi chú nội bộ
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Ghi chú về năng lực cung ứng, chất lượng hàng hóa, cam kết đổi trả lô lỗi..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#F85606] transition-all"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:from-orange-700 active:to-amber-700 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
            >
              {submitting ? (
                <>
                  <Icons.RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Icons.Check size={14} />
                  <span>{isEdit ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
