import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product } from '../../../types/product';
import type {
  ProductUnitConversion,
  CreateProductUnitConversionRequest,
  UpdateProductUnitConversionRequest,
  UnitConversionResult
} from '../../../types/productUnitConversion';
import { productUnitConversionService } from '../../../services/productUnitConversionService';
import { API_BASE_URL, getStoredToken } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { recordLocalAuditLog } from '../../../services/auditLogApi';
import { Icons } from '../../../components/common/Icons';

interface ProductUnitConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess?: (message: string) => void;
}

const COMMON_CONVERSION_UNITS = [
  'Thùng',
  'Lốc',
  'Két',
  'Khay',
  'Hộp',
  'Gói',
  'Vỉ',
  'Bao',
  'Túi',
  'Cây'
];

/**
 * Định dạng hệ số quy đổi theo chuẩn tiếng Việt (dùng dấu phẩy `,` cho phần thập phân, tối đa 4 chữ số).
 * Ví dụ: 15.9997 -> "15,9997", 16 -> "16", 1.5 -> "1,5".
 * Không bao giờ tự ý làm tròn 15.9997 thành 16 như hàm toLocaleString mặc định.
 */
export function formatConversionFactor(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}

export const isBaseUnitRow = (u: ProductUnitConversion, prod: Product | null): boolean => {
  if (u.isBaseUnit === true || u.baseUnit === true) return true;
  if (!prod) return false;
  return (
    u.unitName?.trim().toLowerCase() === prod.baseUnit?.trim().toLowerCase() &&
    Number(u.conversionFactor) === 1
  );
};

const sanitizeUnitsList = (rawUnits: ProductUnitConversion[], prod: Product | null): ProductUnitConversion[] => {
  if (!prod) return rawUnits;
  const baseName = (prod.baseUnit || '').trim().toLowerCase();

  const baseItem: ProductUnitConversion = {
    id: 0,
    productId: Number(prod.id) || 0,
    sku: prod.sku,
    unitName: prod.baseUnit,
    conversionFactor: 1,
    isBaseUnit: true,
    baseUnit: true,
    formula: `1 ${prod.baseUnit} = 1 ${prod.baseUnit}`,
    status: 'ACTIVE',
    description: 'Đơn vị tính cơ sở chuẩn của SKU'
  };

  const seen = new Set<string>();
  const conversions: ProductUnitConversion[] = [];

  for (const u of rawUnits) {
    if (!u.unitName) continue;
    const name = u.unitName.trim();
    const nameLower = name.toLowerCase();

    // TUYỆT ĐỐI không cho đơn vị quy đổi trùng tên với đơn vị cơ sở (vd: Thùng trùng với Thùng)
    if (nameLower === baseName) continue;

    // TUYỆT ĐỐI không cho 2 đơn vị quy đổi trùng tên nhau
    if (seen.has(nameLower)) continue;
    seen.add(nameLower);

    conversions.push({
      ...u,
      unitName: name,
      conversionFactor: Number(u.conversionFactor) || 1,
      isBaseUnit: false,
      baseUnit: false,
      formula: `1 ${name} = ${formatConversionFactor(u.conversionFactor)} ${prod.baseUnit}`
    });
  }

  return [baseItem, ...conversions];
};

export const ProductUnitConversionModal: React.FC<ProductUnitConversionModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess
}) => {
  const { user } = useAuth();
  const [units, setUnits] = useState<ProductUnitConversion[]>([]);
  const conversionUnits = useMemo(
    () => units.filter((u) => !isBaseUnitRow(u, product)),
    [units, product]
  );
  const [resolvedProductId, setResolvedProductId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'LIST' | 'CALCULATOR'>('LIST');

  // Banner thông báo lỗi / thành công trong Modal
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form Thêm / Sửa
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnitConversion | null>(null);
  const [formUnitName, setFormUnitName] = useState<string>('');
  const [formFactor, setFormFactor] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formDefaultPurchase, setFormDefaultPurchase] = useState<boolean>(false);
  const [formDefaultSale, setFormDefaultSale] = useState<boolean>(false);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formChangeReason, setFormChangeReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Xóa đơn vị
  const [deletingUnit, setDeletingUnit] = useState<ProductUnitConversion | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Máy tính quy đổi kho
  const [calcUnitName, setCalcUnitName] = useState<string>('');
  const [calcQuantity, setCalcQuantity] = useState<string>('1');
  const [calcResult, setCalcResult] = useState<UnitConversionResult | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Local storage fallback key
  const storageKey = product ? `erp_unit_conversions_${product.sku}` : '';

  const getStoredUnitsFallback = useCallback((prod: Product): ProductUnitConversion[] => {
    const raw = localStorage.getItem(`erp_unit_conversions_${prod.sku}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeUnitsList(parsed, prod);
          localStorage.setItem(`erp_unit_conversions_${prod.sku}`, JSON.stringify(sanitized));
          return sanitized;
        }
      } catch {
        // ignore
      }
    }
    // Mặc định khởi tạo ít nhất đơn vị cơ sở hệ số 1
    const base: ProductUnitConversion = {
      id: 0,
      productId: 0,
      sku: prod.sku,
      unitName: prod.baseUnit || 'Lon',
      conversionFactor: 1,
      isBaseUnit: true,
      baseUnit: true,
      formula: `1 ${prod.baseUnit || 'Lon'} = 1 ${prod.baseUnit || 'Lon'}`,
      isDefaultPurchase: false,
      isDefaultSale: false,
      status: 'ACTIVE',
      description: 'Đơn vị tính cơ sở chuẩn của SKU'
    };

    const sampleUnits: ProductUnitConversion[] = [base];
    localStorage.setItem(`erp_unit_conversions_${prod.sku}`, JSON.stringify(sampleUnits));
    return sampleUnits;
  }, []);

  // Tải danh sách đơn vị tính từ Backend hoặc fallback
  const fetchUnits = useCallback(async () => {
    if (!product) return;
    setIsLoading(true);
    setErrorBanner(null);

    let realId: number | null = null;
    const numericId = Number(product.id);
    if (!isNaN(numericId) && numericId > 0) {
      realId = numericId;
    } else {
      // Tra cứu ID qua API GET /api/products/sku/{sku}
      try {
        const token = getStoredToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/api/products/sku/${encodeURIComponent(product.sku)}`, {
          headers
        });
        if (res.ok) {
          const detail = await res.json();
          if (detail && detail.id) {
            realId = detail.id;
          }
        }
      } catch {
        // network issue
      }
    }

    setResolvedProductId(realId);

    // Gọi API lấy danh sách đơn vị quy đổi
    if (realId) {
      try {
        const data = await productUnitConversionService.getUnits(realId);
        if (Array.isArray(data) && data.length > 0) {
          const sanitized = sanitizeUnitsList(data, product);
          setUnits(sanitized);
          const nonBase = sanitized.find((u) => !isBaseUnitRow(u, product)) || sanitized[0];
          setCalcUnitName(nonBase ? nonBase.unitName : product.baseUnit);
          setIsLoading(false);
          return;
        }
      } catch (err: unknown) {
        console.warn('Lỗi gọi API /units, chuyển sang chế độ dự phòng:', err);
      }
    }

    // Dự phòng fallback
    const fallbackList = getStoredUnitsFallback(product);
    setUnits(fallbackList);
    const nonBase = fallbackList.find((u) => !isBaseUnitRow(u, product)) || fallbackList[0];
    setCalcUnitName(nonBase ? nonBase.unitName : product.baseUnit);
    setIsLoading(false);
  }, [product, getStoredUnitsFallback]);

  useEffect(() => {
    if (isOpen && product) {
      fetchUnits();
      setIsFormOpen(false);
      setEditingUnit(null);
      setErrorBanner(null);
      setSuccessBanner(null);
      setActiveTab('LIST');
    }
  }, [isOpen, product, fetchUnits]);

  // Mở form thêm mới
  const handleOpenAdd = () => {
    setEditingUnit(null);
    setFormUnitName('');
    setFormFactor('');
    setFormBarcode('');
    setFormDefaultPurchase(false);
    setFormDefaultSale(false);
    setFormDescription('');
    setFormStatus('ACTIVE');
    setFormChangeReason('');
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsFormOpen(true);
  };

  // Mở form chỉnh sửa
  const handleOpenEdit = (unit: ProductUnitConversion) => {
    if (isBaseUnitRow(unit, product)) {
      setErrorBanner(`Đơn vị cơ sở chuẩn (${product?.baseUnit}) được quản lý cố định trên thông tin sản phẩm và không thể sửa tại đây.`);
      return;
    }
    setEditingUnit(unit);
    setFormUnitName(unit.unitName);
    // Hiển thị hệ số với dấu phẩy hoặc giữ nguyên để người dùng dễ chỉnh sửa dạng số thập phân
    setFormFactor(unit.conversionFactor.toString().replace('.', ','));
    setFormBarcode(unit.barcode || '');
    setFormDefaultPurchase(Boolean(unit.isDefaultPurchase));
    setFormDefaultSale(Boolean(unit.isDefaultSale));
    setFormDescription(unit.description || '');
    setFormStatus(unit.status || 'ACTIVE');
    setFormChangeReason('');
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsFormOpen(true);
  };

  // Đóng form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUnit(null);
    setErrorBanner(null);
  };

  // Lưu form (Thêm hoặc Cập nhật)
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const name = formUnitName.trim();
    if (!name) {
      setErrorBanner('Tên đơn vị quy đổi không được để trống.');
      return;
    }

    const sanitizedFactorStr = formFactor.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(sanitizedFactorStr)) {
      setErrorBanner('Hệ số quy đổi không hợp lệ. Vui lòng nhập số lớn hơn 0 (VD: 24 hoặc 15,5).');
      return;
    }

    const factor = parseFloat(sanitizedFactorStr);
    if (isNaN(factor) || factor <= 0) {
      setErrorBanner('Hệ số quy đổi phải là một số lớn hơn 0.');
      return;
    }

    const parts = sanitizedFactorStr.split('.');
    if (parts[1] && parts[1].length > 4) {
      setErrorBanner('Hệ số quy đổi hỗ trợ tối đa 4 chữ số thập phân (VD: 15,9997).');
      return;
    }

    if (name.toLowerCase() === (product?.baseUnit || '').toLowerCase()) {
      setErrorBanner(`"${name}" trùng với Đơn vị tính cơ sở (${product?.baseUnit}). Vui lòng nhập tên đơn vị khác.`);
      return;
    }

    // Kiểm tra trùng tên với đơn vị đã có (nếu thêm mới hoặc đổi tên)
    const duplicate = units.find(
      (u) =>
        u.unitName.toLowerCase() === name.toLowerCase() &&
        (!editingUnit || (editingUnit.id && u.id !== editingUnit.id))
    );
    if (duplicate) {
      setErrorBanner(`Đơn vị "${name}" đã được khai báo trên SKU này.`);
      return;
    }

    if (editingUnit && isBaseUnitRow(editingUnit, product)) {
      setErrorBanner(`Không thể chỉnh sửa đơn vị tính cơ sở chuẩn (${product?.baseUnit}) tại đây.`);
      return;
    }

    setIsSubmitting(true);

    try {
      let backendSuccess = false;

      if (editingUnit && editingUnit.id && resolvedProductId) {
        // CẬP NHẬT QUA BACKEND API
        try {
          const updateData: UpdateProductUnitConversionRequest = {
            unitName: name,
            conversionFactor: factor,
            barcode: formBarcode.trim() || undefined,
            isDefaultPurchase: formDefaultPurchase,
            isDefaultSale: formDefaultSale,
            description: formDescription.trim() || undefined,
            status: formStatus,
            changeReason: formChangeReason.trim() || 'Cập nhật hệ số quy đổi qua giao diện'
          };

          await productUnitConversionService.updateUnit(resolvedProductId, editingUnit.id, updateData);
          setSuccessBanner(`Đã cập nhật đơn vị tính "${name}" (Hệ số: ${factor}) thành công!`);
          setIsFormOpen(false);
          fetchUnits();
          backendSuccess = true;
        } catch (apiErr) {
          console.warn('Backend updateUnit không khả dụng, lưu vào bộ nhớ cục bộ:', apiErr);
        }
      } else if (!editingUnit && resolvedProductId) {
        // TẠO MỚI QUA BACKEND API
        try {
          const createData: CreateProductUnitConversionRequest = {
            unitName: name,
            conversionFactor: factor,
            barcode: formBarcode.trim() || undefined,
            isDefaultPurchase: formDefaultPurchase,
            isDefaultSale: formDefaultSale,
            description: formDescription.trim() || undefined
          };

          await productUnitConversionService.addUnit(resolvedProductId, createData);
          setSuccessBanner(`Đã thêm mới đơn vị quy đổi "${name}" (1 ${name} = ${factor} ${product?.baseUnit})!`);
          setIsFormOpen(false);
          fetchUnits();
          backendSuccess = true;
        } catch (apiErr) {
          console.warn('Backend addUnit không khả dụng, lưu vào bộ nhớ cục bộ:', apiErr);
        }
      }

      if (!backendSuccess) {
        // FALLBACK LOCAL STORAGE NẾU KHÔNG CÓ KẾT NỐI DB HOẶC ID MOCK
        let updatedList = [...units];
        if (editingUnit) {
          updatedList = updatedList.map((u) => {
            if ((editingUnit.id && u.id === editingUnit.id) || u.unitName === editingUnit.unitName) {
              return {
                ...u,
                unitName: name,
                conversionFactor: factor,
                formula: `1 ${name} = ${factor} ${product?.baseUnit}`,
                barcode: formBarcode.trim() || '',
                isDefaultPurchase: formDefaultPurchase,
                isDefaultSale: formDefaultSale,
                description: formDescription.trim(),
                status: formStatus,
                updatedAt: new Date().toISOString()
              };
            }
            return u;
          });
        } else {
          const newUnit: ProductUnitConversion = {
            id: Date.now(),
            productId: resolvedProductId || 0,
            sku: product?.sku || '',
            unitName: name,
            conversionFactor: factor,
            isBaseUnit: false,
            baseUnit: false,
            formula: `1 ${name} = ${factor} ${product?.baseUnit}`,
            barcode: formBarcode.trim() || '',
            isDefaultPurchase: formDefaultPurchase,
            isDefaultSale: formDefaultSale,
            description: formDescription.trim(),
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          };
          updatedList.push(newUnit);
        }

        const sanitized = sanitizeUnitsList(updatedList, product);
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(sanitized));
        }
        setUnits(sanitized);
        setSuccessBanner(editingUnit ? `Đã cập nhật đơn vị tính "${name}"!` : `Đã thêm đơn vị tính "${name}"!`);
        setIsFormOpen(false);
      }

      // S2-04 / S2-07: LUÔN GHI NHẬN VÀO NHẬT KÝ THAO TÁC VỚI AVATAR NGƯỜI THỰC HIỆN
      const oldValStr = editingUnit ? `1 ${editingUnit.unitName} = ${formatConversionFactor(editingUnit.conversionFactor)} ${product?.baseUnit}` : '—';
      const newValStr = `1 ${name} = ${formatConversionFactor(factor)} ${product?.baseUnit}`;
      const deltaStr = editingUnit ? `${formatConversionFactor(editingUnit.conversionFactor)} ➔ ${formatConversionFactor(factor)}` : `+${formatConversionFactor(factor)} ${product?.baseUnit}`;
      const changeReasonText = formChangeReason.trim() || (editingUnit ? `Cập nhật hệ số quy đổi đơn vị ${name} từ ${formatConversionFactor(editingUnit.conversionFactor)} sang ${formatConversionFactor(factor)}` : `Khai báo thêm đơn vị quy đổi ${name} với hệ số ${formatConversionFactor(factor)}`);

      recordLocalAuditLog({
        module: 'INVENTORY',
        action: editingUnit ? 'UPDATE_UNIT_CONVERSION' : 'ADD_UNIT_CONVERSION',
        actionLabel: editingUnit ? 'Cập nhật hệ số quy đổi' : 'Thêm đơn vị quy đổi',
        targetType: 'PRODUCT_UNIT',
        targetId: editingUnit?.id || Date.now(),
        targetCode: product?.sku || 'SKU',
        targetName: product?.name || 'Sản phẩm',
        actorId: user?.id || 1,
        actorUsername: user?.username || 'admin',
        actorFullName: user?.fullName || 'Người quản trị',
        actorRole: user?.role || 'Quản trị hệ thống',
        actorAvatarUrl: user?.avatarUrl,
        actorAvatarThumbnailUrl: user?.avatarThumbnailUrl,
        oldValue: oldValStr,
        newValue: newValStr,
        deltaFormatted: deltaStr,
        deltaType: 'neutral',
        reason: changeReasonText,
        httpMethod: editingUnit ? 'PUT' : 'POST',
        requestUri: `/api/products/${resolvedProductId || product?.id || 'sku'}/units`
      });

      // Đồng bộ bản ghi nhật ký lên Backend nếu có phiên đăng nhập
      try {
        const token = getStoredToken();
        if (token) {
          fetch(`${API_BASE_URL}/api/audit-logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              module: 'INVENTORY',
              action: editingUnit ? 'UPDATE_UNIT_CONVERSION' : 'ADD_UNIT_CONVERSION',
              targetType: 'PRODUCT_UNIT',
              targetId: typeof editingUnit?.id === 'number' && editingUnit.id < 9000000000 ? editingUnit.id : null,
              targetCode: product?.sku || 'SKU',
              actorId: user?.id,
              actorUsername: user?.username,
              actorFullName: user?.fullName,
              actorAvatarUrl: user?.avatarThumbnailUrl || user?.avatarUrl,
              oldValue: oldValStr,
              newValue: newValStr,
              reason: changeReasonText,
              httpMethod: editingUnit ? 'PUT' : 'POST',
              requestUri: `/api/products/${resolvedProductId || product?.id || 'sku'}/units`
            })
          }).catch(() => {});
        }
      } catch {
        // ignore network error
      }

      if (onSuccess) {
        onSuccess(`Cập nhật đơn vị quy đổi cho SKU ${product?.sku} thành công!`);
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Lỗi khi lưu đơn vị tính quy đổi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xác nhận Xóa đơn vị
  const handleConfirmDelete = async () => {
    if (!deletingUnit) return;
    if (isBaseUnitRow(deletingUnit, product)) {
      setErrorBanner('Không thể xóa đơn vị tính cơ sở chuẩn.');
      setDeletingUnit(null);
      return;
    }
    setIsDeleting(true);
    setErrorBanner(null);

    try {
      let backendSuccess = false;
      if (deletingUnit.id && resolvedProductId) {
        try {
          await productUnitConversionService.deleteUnit(resolvedProductId, deletingUnit.id);
          backendSuccess = true;
        } catch (apiErr) {
          console.warn('Backend deleteUnit không khả dụng, xóa cục bộ:', apiErr);
        }
      }

      if (!backendSuccess) {
        // Fallback local
        const updatedList = units.filter(
          (u) => !(u.id === deletingUnit.id && u.unitName === deletingUnit.unitName)
        );
        const sanitized = sanitizeUnitsList(updatedList, product);
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(sanitized));
        }
        setUnits(sanitized);
      }

      // S2-04 / S2-07: Ghi nhận thao tác XÓA vào Nhật ký thao tác kèm Avatar
      const delReason = `Xóa đơn vị quy đổi "${deletingUnit.unitName}" khỏi SKU ${product?.sku}`;
      recordLocalAuditLog({
        module: 'INVENTORY',
        action: 'DELETE_UNIT_CONVERSION',
        actionLabel: 'Xóa đơn vị quy đổi',
        targetType: 'PRODUCT_UNIT',
        targetId: deletingUnit.id,
        targetCode: product?.sku || 'SKU',
        targetName: product?.name || 'Sản phẩm',
        actorId: user?.id || 1,
        actorUsername: user?.username || 'admin',
        actorFullName: user?.fullName || 'Người quản trị',
        actorRole: user?.role || 'Quản trị hệ thống',
        actorAvatarUrl: user?.avatarUrl,
        actorAvatarThumbnailUrl: user?.avatarThumbnailUrl,
        oldValue: `1 ${deletingUnit.unitName} = ${formatConversionFactor(deletingUnit.conversionFactor)} ${product?.baseUnit}`,
        newValue: 'Đã xóa',
        deltaFormatted: `Xóa đơn vị ${deletingUnit.unitName}`,
        deltaType: 'decrease',
        reason: delReason,
        httpMethod: 'DELETE',
        requestUri: `/api/products/${resolvedProductId || product?.id || 'sku'}/units/${deletingUnit.id}`
      });

      try {
        const token = getStoredToken();
        if (token) {
          fetch(`${API_BASE_URL}/api/audit-logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              module: 'INVENTORY',
              action: 'DELETE_UNIT_CONVERSION',
              targetType: 'PRODUCT_UNIT',
              targetId: typeof deletingUnit.id === 'number' && deletingUnit.id < 9000000000 ? deletingUnit.id : null,
              targetCode: product?.sku || 'SKU',
              actorId: user?.id,
              actorUsername: user?.username,
              actorFullName: user?.fullName,
              actorAvatarUrl: user?.avatarThumbnailUrl || user?.avatarUrl,
              oldValue: `1 ${deletingUnit.unitName} = ${formatConversionFactor(deletingUnit.conversionFactor)} ${product?.baseUnit}`,
              newValue: 'Đã xóa',
              reason: delReason,
              httpMethod: 'DELETE',
              requestUri: `/api/products/${resolvedProductId || product?.id || 'sku'}/units/${deletingUnit.id}`
            })
          }).catch(() => {});
        }
      } catch {
        // ignore
      }

      setSuccessBanner(`Đã xóa đơn vị quy đổi "${deletingUnit.unitName}" khỏi SKU.`);
      setDeletingUnit(null);
      fetchUnits();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Lỗi khi xóa đơn vị tính.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Tính toán quy đổi nhanh
  const handleCalculateConversion = async (unitName: string, qtyStr: string) => {
    setCalcUnitName(unitName);
    setCalcQuantity(qtyStr);

    const sanitizedQty = qtyStr.trim().replace(',', '.');
    const qty = parseFloat(sanitizedQty);
    if (isNaN(qty) || qty <= 0 || !product) {
      setCalcResult(null);
      return;
    }

    // 1. Luôn tính toán tức thời từ danh sách đơn vị hiện có trong modal
    const targetUnit = units.find(
      (u) => u.unitName.trim().toLowerCase() === unitName.trim().toLowerCase()
    );
    const factor = targetUnit ? Number(targetUnit.conversionFactor) : 1;
    const resolvedName = targetUnit ? targetUnit.unitName : unitName;
    const baseQty = Math.round(qty * factor * 10000) / 10000;

    const immediateResult: UnitConversionResult = {
      productId: resolvedProductId || 0,
      sku: product.sku,
      productName: product.name,
      inputUnit: resolvedName,
      inputQuantity: qty,
      conversionFactor: factor,
      baseUnit: product.baseUnit,
      baseQuantity: baseQty,
      formula: `${formatConversionFactor(qty)} ${resolvedName} × ${formatConversionFactor(factor)} = ${formatConversionFactor(baseQty)} ${product.baseUnit}`
    };
    setCalcResult(immediateResult);

    // 2. Nếu có resolvedProductId hợp lệ, đồng bộ qua backend
    if (resolvedProductId && resolvedProductId < 9000) {
      setCalcLoading(true);
      try {
        const res = await productUnitConversionService.calculateConversion({
          productId: resolvedProductId,
          sku: product.sku,
          unitName: resolvedName,
          quantity: qty
        });
        if (res && res.conversionFactor === factor) {
          setCalcResult(res);
        }
      } catch {
        // Fallback tức thời đã hiển thị chính xác
      } finally {
        setCalcLoading(false);
      }
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 via-white to-amber-50/40 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#F85606] border border-orange-200/60 shadow-xs">
              <Icons.Scale size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Đơn vị tính quy đổi của sản phẩm
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span className="font-mono font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                  {product.sku}
                </span>
                <span>•</span>
                <span className="font-medium text-gray-700 truncate max-w-md">
                  {product.name}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            title="Đóng modal"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorBanner && (
          <div className="mx-6 mt-3.5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 shrink-0 animate-in fade-in duration-200">
            <Icons.AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-400 hover:text-red-700 cursor-pointer"
            >
              <Icons.X size={14} />
            </button>
          </div>
        )}

        {/* Thông báo thành công nếu có */}
        {successBanner && (
          <div className="mx-6 mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 shrink-0 animate-in fade-in duration-200">
            <Icons.CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{successBanner}</span>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-400 hover:text-emerald-700 cursor-pointer"
            >
              <Icons.X size={14} />
            </button>
          </div>
        )}

        {/* Thanh tóm tắt Đơn vị cơ sở & Tabs */}
        <div className="px-6 pt-3 pb-0 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-200/70 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-gray-600 font-medium">Đơn vị cơ sở chuẩn (Base Unit):</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
                <span>{product.baseUnit}</span>
                <span className="text-[10px] opacity-80">(Hệ số = 1.0)</span>
              </span>
              {product.packagingSpec && (
                <span className="text-gray-500 hidden sm:inline">
                  Quy cách gốc: <strong className="text-gray-700">{product.packagingSpec}</strong>
                </span>
              )}
            </div>

            {/* Chuyển Tab */}
            <div className="flex items-center rounded-lg bg-white p-1 border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LIST');
                  setIsFormOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'LIST'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icons.ClipboardList size={14} />
                <span>Đơn vị quy đổi ({conversionUnits.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('CALCULATOR');
                  setIsFormOpen(false);
                  const validUnit =
                    (units.some((u) => u.unitName === calcUnitName) ? calcUnitName : null) ||
                    (units.find((u) => !isBaseUnitRow(u, product))?.unitName) ||
                    units[0]?.unitName ||
                    product.baseUnit;
                  setCalcUnitName(validUnit);
                  handleCalculateConversion(validUnit, calcQuantity || '1');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'CALCULATOR'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icons.Calculator size={14} />
                <span>Máy tính quy đổi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Nội dung chính cuộn dọc */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: DANH SÁCH ĐƠN VỊ TÍNH QUY ĐỔI */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              {/* Thanh thao tác */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Bảng cấu hình đơn vị tính quy đổi
                  </h4>
                  <p className="text-xs text-gray-500">
                    Nhập xuất theo thùng/lốc mà sổ sách và tồn kho vẫn tự động ghi đúng số {product.baseUnit}.
                  </p>
                </div>

                {!isFormOpen && (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer"
                  >
                    <Icons.Plus size={15} />
                    <span>Thêm đơn vị quy đổi</span>
                  </button>
                )}
              </div>

              {/* Form Khai báo / Chỉnh sửa (Nếu đang mở) */}
              {isFormOpen && (
                <form
                  onSubmit={handleSaveUnit}
                  className="p-4 rounded-xl border border-orange-200 bg-orange-50/20 space-y-3.5 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center justify-between border-b border-orange-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                        {editingUnit ? '✎' : '+'}
                      </div>
                      <h5 className="font-bold text-gray-900 text-sm">
                        {editingUnit
                          ? `Chỉnh sửa đơn vị quy đổi "${editingUnit.unitName}"`
                          : 'Khai báo thêm đơn vị quy đổi mới'}
                      </h5>
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="text-gray-400 hover:text-gray-600 text-xs font-semibold cursor-pointer"
                    >
                      ✕ Đóng form
                    </button>
                  </div>

                  {/* Gợi ý chọn nhanh tên đơn vị */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                      Chọn nhanh tên đơn vị:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_CONVERSION_UNITS.filter((u) => u.toLowerCase() !== (product.baseUnit || '').toLowerCase()).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setFormUnitName(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            formUnitName === u
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50 hover:border-orange-300'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2 cột nhập liệu chính */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tên đơn vị quy đổi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formUnitName}
                        onChange={(e) => setFormUnitName(e.target.value)}
                        placeholder="VD: Thùng, Lốc, Két, Khay..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Hệ số quy đổi về {product.baseUnit} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formFactor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^[\d.,]*$/.test(val)) {
                              setFormFactor(val);
                            }
                          }}
                          placeholder="VD: 24 hoặc 15,5 (1 Thùng = 15,5 Lon)"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 pr-16"
                          required
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">
                          {product.baseUnit}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Ví dụ: 1 Thùng = 24 {product.baseUnit} (có thể nhập số thập phân dạng dấu phẩy hoặc chấm: 15,5)
                      </p>
                    </div>
                  </div>

                  {/* Mã vạch & Mô tả */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Mã vạch bao bì (Barcode thùng/lốc nếu có)
                      </label>
                      <input
                        type="text"
                        value={formBarcode}
                        onChange={(e) => setFormBarcode(e.target.value)}
                        placeholder="VD: 8934567890123"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Mô tả quy cách đóng gói chi tiết
                      </label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="VD: Thùng carton 24 lon 330ml (4 lốc x 6 lon)"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* Checkbox mặc định & Trạng thái */}
                  <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-gray-700">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formDefaultPurchase}
                        onChange={(e) => setFormDefaultPurchase(e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 accent-orange-600"
                      />
                      <span>Mặc định khi lập phiếu nhập kho</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formDefaultSale}
                        onChange={(e) => setFormDefaultSale(e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 accent-orange-600"
                      />
                      <span>Mặc định khi xuất bán hàng</span>
                    </label>

                    {editingUnit && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="font-semibold text-gray-600">Trạng thái:</span>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs font-medium"
                        >
                          <option value="ACTIVE">Đang áp dụng</option>
                          <option value="INACTIVE">Ngừng áp dụng</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Quy tắc AC3 khi chỉnh sửa hệ số */}
                  {editingUnit && (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Icons.AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="font-semibold">
                          Quy tắc hệ thống: Đổi hệ số quy đổi không làm sai lệch các giao dịch kho đã ghi nhận trước đó.
                        </p>
                      </div>
                      <div>
                        <label className="block font-semibold text-amber-800 mb-1">
                          Lý do thay đổi hệ số (ghi nhật ký hệ thống):
                        </label>
                        <input
                          type="text"
                          value={formChangeReason}
                          onChange={(e) => setFormChangeReason(e.target.value)}
                          placeholder="VD: Nhà cung cấp thay đổi quy cách đóng gói thùng từ 24 lên 30..."
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Nút hành động form */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Icons.RotateCcw size={14} className="animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <Icons.Check size={14} />
                          <span>{editingUnit ? 'Lưu cập nhật' : 'Thêm đơn vị tính'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Bảng danh sách đơn vị tính */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-700">
                    <tr>
                      <th className="px-4 py-3">Tên đơn vị tính</th>
                      <th className="px-4 py-3 text-right">Hệ số quy đổi</th>
                      <th className="px-4 py-3">Công thức trực quan</th>
                      <th className="px-4 py-3">Mã vạch (Barcode)</th>
                      <th className="px-4 py-3 text-center">Mặc định</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          <div className="flex items-center justify-center space-x-2">
                            <Icons.RotateCcw size={16} className="animate-spin text-orange-600" />
                            <span>Đang tải danh sách đơn vị tính...</span>
                          </div>
                        </td>
                      </tr>
                    ) : conversionUnits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          <p className="font-semibold text-gray-700">Chưa có đơn vị quy đổi nào được cấu hình cho SKU này.</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Mọi giao dịch mua hàng, bán hàng và xuất nhập kho đang sử dụng trực tiếp đơn vị cơ sở chuẩn: <strong className="text-gray-800 font-semibold">{product.baseUnit}</strong>.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      conversionUnits.map((u, idx) => (
                        <tr
                          key={u.id || idx}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          {/* Tên đơn vị */}
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-900 text-sm">
                              {u.unitName}
                            </span>
                            {u.description && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {u.description}
                              </p>
                            )}
                          </td>

                          {/* Hệ số */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                            {formatConversionFactor(u.conversionFactor)}
                          </td>

                          {/* Công thức */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                              <span>1 {u.unitName}</span>
                              <span className="text-orange-600 font-bold">=</span>
                              <span>
                                {formatConversionFactor(u.conversionFactor)} {product.baseUnit}
                              </span>
                            </span>
                          </td>

                          {/* Barcode */}
                          <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                            {u.barcode ? (
                              <span className="bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                                {u.barcode}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Mặc định nhập / bán */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {u.isDefaultPurchase && (
                                <span
                                  title="Mặc định khi nhập kho"
                                  className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700"
                                >
                                  Nhập
                                </span>
                              )}
                              {u.isDefaultSale && (
                                <span
                                  title="Mặc định khi bán hàng"
                                  className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                                >
                                  Bán
                                </span>
                              )}
                              {!u.isDefaultPurchase && !u.isDefaultSale && (
                                <span className="text-gray-300">—</span>
                              )}
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="px-4 py-3 text-center">
                            {u.status === 'INACTIVE' ? (
                              <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                Ngừng áp dụng
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                Hoạt động
                              </span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                title="Chỉnh sửa đơn vị quy đổi"
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              >
                                <Icons.Edit size={15} />
                              </button>
                              <button
                                type="button"
                                title="Xóa đơn vị quy đổi"
                                onClick={() => setDeletingUnit(u)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Icons.Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Hướng dẫn nghiệp vụ */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs text-gray-600 space-y-1">
                <p>
                  <strong className="text-gray-800">Quy tắc quy đổi: </strong>
                  Mỗi SKU được khai báo nhiều đơn vị quy đổi (Thùng, Lốc, Két...). Khi phát sinh đơn hàng hoặc phiếu nhập/xuất kho, thủ kho có thể chọn đơn vị bất kỳ; hệ thống sẽ tự động nhân hệ số quy đổi về số lượng đơn vị cơ sở chuẩn (<strong>{product.baseUnit}</strong>) để ghi vào thẻ kho và sổ kế toán.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MÁY TÍNH QUY ĐỔI KHO */}
          {activeTab === 'CALCULATOR' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/40">
                <div className="flex items-start space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-xs">
                    <Icons.Calculator size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">
                      Tiện ích tính toán quy đổi tức thời
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Mô phỏng nhập xuất theo thùng/lốc: Hệ thống tự động nhân hệ số để tính ra số lượng đơn vị cơ sở chuẩn ghi sổ kho.
                    </p>
                  </div>
                </div>
              </div>

              {/* Khung máy tính nhập liệu */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      1. Chọn đơn vị tính trên phiếu
                    </label>
                    <select
                      value={calcUnitName}
                      onChange={(e) => handleCalculateConversion(e.target.value, calcQuantity)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      <option value={product.baseUnit}>
                        {product.baseUnit} (Đơn vị cơ sở chuẩn - Hệ số: 1)
                      </option>
                      {conversionUnits.map((u) => (
                        <option key={u.unitName} value={u.unitName}>
                          {u.unitName} (Hệ số: {formatConversionFactor(u.conversionFactor)} {product.baseUnit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      2. Nhập số lượng thực tế
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={calcQuantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^[\d.,]*$/.test(val)) {
                          handleCalculateConversion(calcUnitName, val);
                        }
                      }}
                      placeholder="VD: 10 hoặc 2,5"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Kết quả quy đổi hiển thị to & rõ ràng */}
                {calcLoading ? (
                  <div className="mt-4 p-5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center space-x-2 text-xs text-orange-600">
                    <Icons.RotateCcw size={16} className="animate-spin" />
                    <span>Đang tính toán quy đổi theo đơn vị tính...</span>
                  </div>
                ) : calcResult && (
                  <div className="mt-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                        Kết quả quy đổi ghi sổ kho:
                      </span>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <span className="text-3xl font-extrabold text-emerald-700 font-mono">
                          {formatConversionFactor(calcResult.baseQuantity)}
                        </span>
                        <span className="text-lg font-bold text-emerald-900">
                          {calcResult.baseUnit}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1 font-mono">
                        Diễn giải: <strong>{calcResult.formula}</strong>
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:border-emerald-200 sm:pl-6 text-xs space-y-1">
                      <div className="text-gray-500">
                        Số lượng phiếu:{' '}
                        <strong className="text-gray-900">
                          {formatConversionFactor(calcResult.inputQuantity)} {calcResult.inputUnit}
                        </strong>
                      </div>
                      <div className="text-gray-500">
                        Hệ số áp dụng:{' '}
                        <strong className="text-gray-900">
                          × {formatConversionFactor(calcResult.conversionFactor)}
                        </strong>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        <span>✓ Sẵn sàng ghi sổ tồn kho</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Xác nhận Xóa */}
        {deletingUnit && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Icons.Trash2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    Xác nhận xóa đơn vị quy đổi?
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Bạn có chắc chắn muốn xóa đơn vị quy đổi{' '}
                    <strong className="text-gray-900">"{deletingUnit.unitName}"</strong> (Hệ số: {formatConversionFactor(deletingUnit.conversionFactor)} {product.baseUnit}) khỏi SKU {product.sku}?
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingUnit(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Icons.RotateCcw size={14} className="animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <span>Xác nhận xóa</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50 shrink-0">
          <div className="text-xs text-gray-500">
            Số đơn vị quy đổi: <strong className="text-gray-900">{conversionUnits.length}</strong> (Đơn vị tính cơ sở chuẩn: <strong className="text-gray-900">{product.baseUnit}</strong>)
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
