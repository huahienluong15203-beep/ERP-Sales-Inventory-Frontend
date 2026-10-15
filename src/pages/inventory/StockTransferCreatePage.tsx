import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Warehouse,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import type { WarehouseOption } from '../../types/inventory';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import type { CreateStockTransferPayload } from '../../types/stockTransfer';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';
import { createStockTransfer } from '../../services/stockTransferApi';
import { fetchMinStockConfigs } from '../../services/stockAlertApi';
import { fetchStockLedgerWarehouses } from '../../services/stockLedgerApi';
import { fetchWarehouses } from '../../services/warehouseApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { SearchSelect } from '../../components/common/SearchSelect';
import { NumberInput } from '../../components/common/NumberInput';

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

export const StockTransferCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast, currentRole } = useAuth();

  // Phân quyền: Chỉ Quản lý kho hoặc Admin mới có quyền duyệt & xuất kho ngay
  const isManagerOrAdmin =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_ADMIN'));

  // Danh mục kho xuất & kho nhận
  const [sourceWarehouses, setSourceWarehouses] = useState<WarehouseOption[]>(SYSTEM_WAREHOUSES);
  const [destWarehouses, setDestWarehouses] = useState<WarehouseOption[]>(SYSTEM_WAREHOUSES);

  // Danh mục sản phẩm
  const [products, setProducts] = useState<Product[]>([]);

  // Key lưu nháp điều chuyển kho vào sessionStorage khi chuyển qua lại trang chọn sản phẩm
  const DRAFT_STORAGE_KEY = 'erp_stock_transfer_draft';

  // Form Fields (Khôi phục nếu có draft từ trang chọn sản phẩm)
  const [sourceWarehouseCode, setSourceWarehouseCode] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.sourceWarehouseCode) return d.sourceWarehouseCode;
      }
    } catch {
      // ignore
    }
    return 'WH-MB01';
  });

  const [destWarehouseCode, setDestWarehouseCode] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.destWarehouseCode) return d.destWarehouseCode;
      }
    } catch {
      // ignore
    }
    return 'WH-MT01';
  });

  const [transferDate, setTransferDate] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.transferDate) return d.transferDate;
      }
    } catch {
      // ignore
    }
    return new Date().toISOString().slice(0, 10);
  });

  const [expectedReceiveDate, setExpectedReceiveDate] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.expectedReceiveDate) return d.expectedReceiveDate;
      }
    } catch {
      // ignore
    }
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });

  const [vehiclePlate, setVehiclePlate] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.vehiclePlate != null) return d.vehiclePlate;
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [transporterName, setTransporterName] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.transporterName != null) return d.transporterName;
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [generalNote, setGeneralNote] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.generalNote != null) return d.generalNote;
      }
    } catch {
      // ignore
    }
    return '';
  });

  // Tồn kho khả dụng thực tế của kho nguồn
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [loadingStock, setLoadingStock] = useState<boolean>(false);

  // Danh sách dòng sản phẩm
  const [lines, setLines] = useState<TransferLineDraft[]>(() => {
    try {
      const saved = sessionStorage.getItem('erp_stock_transfer_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (Array.isArray(d.lines) && d.lines.length > 0) return d.lines;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tự động xóa cảnh báo đỏ mặt hàng khi người dùng đã thêm sản phẩm
  useEffect(() => {
    if (lines.length > 0) {
      setFieldErrors((prev) => {
        if (!prev.lines) return prev;
        const next = { ...prev };
        delete next.lines;
        return next;
      });
    }
  }, [lines.length]);

  // Tải danh mục kho thực tế
  useEffect(() => {
    fetchStockLedgerWarehouses()
      .then((data) => {
        if (data && data.length > 0) {
          setSourceWarehouses(
            data.map((w) => ({
              id: w.id,
              code: w.code,
              name: w.name,
              address: w.address,
              status: w.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách kho xuất từ backend, dùng fallback:', err);
      });

    fetchWarehouses({ status: 'ACTIVE' })
      .then((data) => {
        if (data && data.length > 0) {
          setDestWarehouses(
            data.map((w) => ({
              id: w.id,
              code: w.code,
              name: w.name,
              address: w.address || undefined,
              status: w.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách kho nhận từ backend, dùng fallback:', err);
      });
  }, []);

  // Tải danh mục sản phẩm ban đầu để fallback dropdown
  useEffect(() => {
    productService
      .getProducts({ size: 200, status: 'ACTIVE' })
      .then((res) => {
        setProducts(res.products);
      })
      .catch((err) => {
        console.error('Lỗi tải sản phẩm:', err);
      });
  }, []);

  // Tải tồn kho khả dụng của kho nguồn khi đổi kho nguồn
  useEffect(() => {
    if (!sourceWarehouseCode) return;

    let isMounted = true;
    setLoadingStock(true);

    fetchMinStockConfigs({ warehouseCode: sourceWarehouseCode })
      .then((configs) => {
        if (!isMounted) return;
        const map: Record<number, number> = {};
        (configs || []).forEach((c) => {
          if (c.productId != null) {
            map[Number(c.productId)] = Number(c.availableStock ?? 0);
          }
        });
        setStockMap(map);
        setLoadingStock(false);

        // Cập nhật tồn cho các dòng hàng hiện tại
        setLines((prev) =>
          prev.map((line) => ({
            ...line,
            sourceAvailableStock: map[line.productId] ?? 0
          }))
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Lỗi tải tồn kho khả dụng kho đi:', err);
        setLoadingStock(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sourceWarehouseCode]);

  // Xử lý đổi kho nguồn
  const handleSourceWarehouseChange = (newCode: string) => {
    setSourceWarehouseCode(newCode);
    if (destWarehouseCode === newCode) {
      const other = destWarehouses.find((w) => w.code !== newCode);
      if (other) {
        setDestWarehouseCode(other.code);
      }
    }
  };

  // Đổi sản phẩm trên dòng
  const handleChangeProduct = (lineIndex: number, newProductId: number) => {
    const p = products.find((item) => Number(item.id) === newProductId);
    if (!p) return;

    const availStock = stockMap[newProductId] ?? 0;

    setLines((prev) => {
      const next = [...prev];
      next[lineIndex] = {
        ...next[lineIndex],
        productId: Number(p.id),
        productSku: p.sku,
        productName: p.name,
        category: p.category,
        unit: p.baseUnit || 'Thùng',
        sourceAvailableStock: availStock,
        transferQuantity:
          next[lineIndex].transferQuantity > availStock && availStock > 0
            ? availStock
            : next[lineIndex].transferQuantity
      };
      return next;
    });
  };

  // Lưu danh sách lines vào sessionStorage
  const saveLinesToDraft = (newLines: TransferLineDraft[]) => {
    try {
      const draft = {
        sourceWarehouseCode,
        destWarehouseCode,
        transferDate,
        expectedReceiveDate,
        vehiclePlate,
        transporterName,
        generalNote,
        lines: newLines
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Lỗi lưu draft chuyển kho:', e);
    }
  };

  // Mở trang riêng để chọn sản phẩm
  const handleOpenPickerPage = () => {
    saveLinesToDraft(lines);
    navigate('/inventory/transfers/create/products');
  };

  // Cập nhật trường dòng hàng
  const handleUpdateLine = (lineIndex: number, field: keyof TransferLineDraft, val: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[lineIndex] = { ...next[lineIndex], [field]: val };
      saveLinesToDraft(next);
      return next;
    });
  };

  // Xóa 1 dòng hàng theo vị trí
  const handleRemoveLine = (lineIndex: number) => {
    setLines((prev) => {
      const next = prev.filter((_, idx) => idx !== lineIndex);
      saveLinesToDraft(next);
      return next;
    });
  };

  // Xóa 1 sản phẩm theo productId (gọi từ Modal)
  // Xóa toàn bộ mặt hàng
  const handleRemoveAllLines = () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${lines.length} mặt hàng khỏi phiếu chuyển kho?`)) {
      setLines([]);
      saveLinesToDraft([]);
      showToast('Đã xóa tất cả', 'Đã làm trống danh sách mặt hàng', 'info', 2000);
    }
  };

  // Kiểm tra hợp lệ dữ liệu
  const validateForm = (): { isValid: boolean; errors: string[]; fields: Record<string, string> } => {
    const errors: string[] = [];
    const fields: Record<string, string> = {};

    if (!sourceWarehouseCode) {
      errors.push('Vui lòng chọn Kho đi (Kho xuất hàng).');
      fields.sourceWarehouse = 'Vui lòng chọn Kho xuất hàng';
    }
    if (!destWarehouseCode) {
      errors.push('Vui lòng chọn Kho đến (Kho nhận hàng).');
      fields.destWarehouse = 'Vui lòng chọn Kho nhận hàng';
    }
    if (sourceWarehouseCode && destWarehouseCode && sourceWarehouseCode === destWarehouseCode) {
      errors.push('Kho đi và Kho đến không được trùng nhau! Vui lòng chọn hai kho khác nhau.');
      fields.destWarehouse = 'Kho đến không được trùng với Kho xuất';
    }
    if (!transferDate) {
      errors.push('Vui lòng chọn Ngày điều chuyển.');
      fields.transferDate = 'Vui lòng chọn ngày điều chuyển';
    }
    if (lines.length === 0) {
      errors.push('Phiếu chuyển kho phải có ít nhất 1 dòng mặt hàng cần điều chuyển.');
      fields.lines = 'Phiếu chuyển kho phải có ít nhất 1 dòng mặt hàng';
    }

    lines.forEach((l, idx) => {
      if (l.transferQuantity <= 0) {
        errors.push(`Dòng ${idx + 1} (${l.productName}): Số lượng chuyển phải lớn hơn 0.`);
        fields[`line_${idx}_qty`] = 'Số lượng chuyển phải > 0';
      }
      if (l.transferQuantity > l.sourceAvailableStock) {
        errors.push(
          `Dòng ${idx + 1} (${l.productName}): Số lượng chuyển (${l.transferQuantity}) vượt quá tồn khả dụng tại kho đi (${l.sourceAvailableStock} ${l.unit}).`
        );
        fields[`line_${idx}_qty`] = `Tối đa ${l.sourceAvailableStock} ${l.unit}`;
      }
    });

    setFormErrors(errors);
    setFieldErrors(fields);
    return { isValid: errors.length === 0, errors, fields };
  };

  // Xử lý gửi form
  const handleSubmit = async (targetStatus: 'DRAFT' | 'IN_TRANSIT') => {
    setHasAttemptedSubmit(true);
    const { isValid, errors } = validateForm();
    if (!isValid) {
      if (lines.length === 0) {
        showToast(
          'Chưa có mặt hàng',
          'Phiếu chuyển kho phải có ít nhất 1 dòng mặt hàng! Vui lòng bấm "+ Thêm mặt hàng" để chọn sản phẩm.',
          'error',
          5000
        );
        const sec2 = document.getElementById('section-transfer-lines');
        if (sec2) {
          sec2.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        const firstError = errors[0] || 'Vui lòng kiểm tra lại các trường thông tin có viền đỏ.';
        showToast('Thông tin chưa hợp lệ', firstError, 'error', 4500);
      }
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
          'Xuất kho & Vận chuyển thành công',
          `Phiếu [${created.code}] đã trừ kho đi và ghi nhận trạng thái Đang trên đường.`,
          'success',
          5000
        );
      } else {
        showToast(
          'Lập phiếu nháp thành công',
          `Phiếu nháp [${created.code}] đã được lưu ở trạng thái Chờ QL duyệt.`,
          'success',
          4000
        );
      }
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      navigate('/inventory/transfers');
    } catch (err: unknown) {
      console.error('Lỗi tạo phiếu chuyển kho:', err);
      showToast('Lỗi tạo phiếu', err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTransferQty = useMemo(() => {
    return lines.reduce((s, l) => s + Number(l.transferQuantity || 0), 0);
  }, [lines]);

  return (
    <div className="space-y-4 pb-12 max-w-6xl mx-auto">
      {/* HEADER BAR & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/inventory/transfers')}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ArrowRightLeft size={18} />
              </span>
              <span>Lập Phiếu Chuyển Kho Nội Bộ</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Điều chuyển hàng hóa giữa các kho chi nhánh, ghi nhận hàng đi đường chính xác
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              try { sessionStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
              navigate('/inventory/transfers');
            }}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
            <span>Lập phiếu chuyển (Chờ QL duyệt)</span>
          </button>
          {isManagerOrAdmin && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('IN_TRANSIT')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>Duyệt & Xuất kho ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* CẢNH BÁO LỖI VALIDATION NẾU CÓ */}
      {formErrors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <AlertTriangle size={16} className="shrink-0 text-rose-600" />
            <span>Vui lòng kiểm tra lại thông tin phiếu chuyển:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-700 pl-1 space-y-0.5">
            {formErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KHỐI 1: CHỌN KHO ĐI & KHO ĐẾN */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Warehouse size={16} className="text-blue-600" />
            <span>1. Lộ trình điều chuyển & Phương tiện vận chuyển</span>
          </h2>
          {sourceWarehouseCode === destWarehouseCode && (
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <AlertTriangle size={12} /> Kho đi và kho đến không được trùng nhau!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kho Đi (Kho xuất) */}
          <div
            className={`p-4 rounded-xl space-y-2 transition-all ${
              hasAttemptedSubmit && fieldErrors.sourceWarehouse
                ? 'bg-rose-50/40 border-2 border-rose-400 ring-2 ring-rose-100'
                : 'bg-gray-50/70 border border-gray-200'
            }`}
          >
            <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Kho Đi (Kho xuất hàng)</span>
              <span className="text-rose-500">*</span>
            </label>
            <SearchSelect
              value={sourceWarehouseCode}
              onChange={(e) => {
                handleSourceWarehouseChange(e.target.value);
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n.sourceWarehouse;
                  return n;
                });
              }}
              className={`w-full text-xs font-bold rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 ${
                hasAttemptedSubmit && fieldErrors.sourceWarehouse
                  ? 'border-2 border-rose-400 focus:ring-rose-200'
                  : 'border border-gray-300 focus:ring-blue-500/20'
              }`}
            >
              {sourceWarehouses.map((wh) => (
                <option key={wh.code} value={wh.code}>
                  [{wh.code}] {wh.name} {wh.address ? `(${wh.address})` : ''}
                </option>
              ))}
            </SearchSelect>
            {hasAttemptedSubmit && fieldErrors.sourceWarehouse ? (
              <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                <AlertTriangle size={12} /> {fieldErrors.sourceWarehouse}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 italic">
                Số lượng xuất chuyển sẽ được trừ khỏi tồn khả dụng của kho này khi xuất kho
              </p>
            )}
          </div>

          {/* Kho Đến (Kho nhận) */}
          <div
            className={`p-4 rounded-xl space-y-2 transition-all ${
              hasAttemptedSubmit && fieldErrors.destWarehouse
                ? 'bg-rose-50/40 border-2 border-rose-400 ring-2 ring-rose-100'
                : 'bg-gray-50/70 border border-gray-200'
            }`}
          >
            <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Kho Đến (Kho nhận hàng)</span>
              <span className="text-rose-500">*</span>
            </label>
            <SearchSelect
              value={destWarehouseCode}
              onChange={(e) => {
                setDestWarehouseCode(e.target.value);
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n.destWarehouse;
                  return n;
                });
              }}
              className={`w-full text-xs font-bold rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 ${
                hasAttemptedSubmit && fieldErrors.destWarehouse
                  ? 'border-2 border-rose-400 focus:ring-rose-200'
                  : 'border border-gray-300 focus:ring-emerald-500/20'
              }`}
            >
              {destWarehouses.map((wh) => (
                <option key={wh.code} value={wh.code}>
                  [{wh.code}] {wh.name} {wh.address ? `(${wh.address})` : ''}
                </option>
              ))}
            </SearchSelect>
            {hasAttemptedSubmit && fieldErrors.destWarehouse ? (
              <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                <AlertTriangle size={12} /> {fieldErrors.destWarehouse}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 italic">
                Tồn kho chỉ được CỘNG THỰC TẾ sau khi kho đến xác nhận nhận đủ
              </p>
            )}
          </div>
        </div>

        {/* Thông tin vận chuyển & ngày tháng */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Ngày chuyển <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => {
                setTransferDate(e.target.value);
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n.transferDate;
                  return n;
                });
              }}
              className={`w-full text-xs rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 ${
                hasAttemptedSubmit && fieldErrors.transferDate
                  ? 'border-2 border-rose-500 ring-2 ring-rose-100 bg-rose-50/20'
                  : 'border border-gray-200 focus:ring-blue-500/20'
              }`}
            />
            {hasAttemptedSubmit && fieldErrors.transferDate && (
              <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <AlertTriangle size={12} /> {fieldErrors.transferDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Ngày dự kiến đến
            </label>
            <input
              type="date"
              value={expectedReceiveDate}
              onChange={(e) => setExpectedReceiveDate(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

      {/* KHỐI 2: DANH SÁCH HÀNG HÓA & SỐ LƯỢNG */}
      <div
        id="section-transfer-lines"
        className={`bg-white rounded-2xl shadow-xs p-5 space-y-4 ${
          hasAttemptedSubmit && fieldErrors.lines
            ? 'border-2 border-rose-400 ring-2 ring-rose-100'
            : 'border border-gray-200/80'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Package
              size={16}
              className={hasAttemptedSubmit && fieldErrors.lines ? 'text-rose-600' : 'text-blue-600'}
            />
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              2. Danh sách hàng hóa & Số lượng điều chuyển
            </h2>
            <span className="text-xs text-gray-400">
              ({lines.length} mặt hàng — Tổng SL: {totalTransferQty.toLocaleString('vi-VN')})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {lines.length > 0 && (
              <button
                type="button"
                onClick={handleRemoveAllLines}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
                title="Xóa toàn bộ mặt hàng khỏi phiếu chuyển"
              >
                <Trash2 size={13} />
                <span>Xóa tất cả ({lines.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenPickerPage}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              title="Chọn sản phẩm điều chuyển"
            >
              <Plus size={14} />
              <span>Thêm mặt hàng</span>
            </button>
          </div>
        </div>

        {lines.length === 0 ? (
          <div
            className={`rounded-2xl p-8 text-center ${
              hasAttemptedSubmit && fieldErrors.lines
                ? 'border-2 border-dashed border-rose-400 bg-rose-50/50'
                : 'border-2 border-dashed border-gray-200 bg-gray-50/50'
            }`}
          >
            <Package
              size={42}
              className={`mx-auto mb-2 ${
                hasAttemptedSubmit && fieldErrors.lines ? 'text-rose-500' : 'text-gray-300'
              }`}
            />
            <p
              className={`text-sm font-bold ${
                hasAttemptedSubmit && fieldErrors.lines ? 'text-rose-700' : 'text-gray-700'
              }`}
            >
              Chưa có mặt hàng nào trong phiếu chuyển kho
            </p>
            {hasAttemptedSubmit && fieldErrors.lines ? (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold shadow-2xs">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <span>Bắt buộc: Vui lòng bấm &ldquo;+ Thêm mặt hàng&rdquo; ở góc trên để chọn ít nhất 1 sản phẩm!</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleOpenPickerPage}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus size={14} />
                  <span>Thêm mặt hàng</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Mặt hàng / Mã SKU</th>
                    <th className="py-2.5 px-3 w-36 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>Tồn khả dụng kho đi</span>
                        {loadingStock && <Loader2 size={12} className="animate-spin text-blue-500" />}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 w-32 text-center">Số lượng chuyển</th>
                    <th className="py-2.5 px-3 w-24 text-center">Đơn vị</th>
                    <th className="py-2.5 px-3 w-36">Số lô điều chuyển</th>
                    <th className="py-2.5 px-3 w-32">Hạn sử dụng</th>
                    <th className="py-2.5 px-3 w-24 text-center sticky right-0 bg-gray-100 z-10 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, idx) => {
                    const isExceeded = line.transferQuantity > line.sourceAvailableStock;

                    return (
                      <tr
                        key={line.id}
                        className={`hover:bg-gray-50/80 transition ${isExceeded ? 'bg-rose-50/40' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-center text-gray-400 font-semibold">{idx + 1}</td>

                        {/* Chọn Sản phẩm */}
                        <td className="py-2.5 px-3">
                          <SearchSelect
                            value={String(line.productId)}
                            onChange={(e) => handleChangeProduct(idx, Number(e.target.value))}
                            className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-1.5 bg-white"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </SearchSelect>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            SKU: <span className="font-mono font-semibold">{line.productSku}</span> • {line.category || 'Mặc định'}
                          </div>
                        </td>

                        {/* Tồn khả dụng kho nguồn */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block font-mono font-black text-xs px-2.5 py-1 rounded-full ${
                              line.sourceAvailableStock > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {line.sourceAvailableStock.toLocaleString('vi-VN')} {line.unit}
                          </span>
                        </td>

                        {/* Số lượng chuyển */}
                        <td className="py-2.5 px-3">
                          <NumberInput
                            value={line.transferQuantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleUpdateLine(idx, 'transferQuantity', isNaN(val) ? 0 : Math.max(1, val));
                            }}
                            min={1}
                            max={line.sourceAvailableStock > 0 ? line.sourceAvailableStock : 999999}
                            className={`w-full text-center font-bold text-xs p-1.5 rounded-lg border ${
                              isExceeded ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 bg-white'
                            }`}
                          />
                          {isExceeded && (
                            <span className="text-[10px] text-rose-600 block mt-0.5 text-center font-semibold">
                              Vượt tồn khả dụng!
                            </span>
                          )}
                        </td>

                        {/* ĐVT */}
                        <td className="py-2.5 px-3 text-center text-gray-600 font-bold">{line.unit}</td>

                        {/* Số lô */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={line.batchNumber}
                            onChange={(e) => handleUpdateLine(idx, 'batchNumber', e.target.value)}
                            placeholder="LOT-..."
                            className="w-full text-xs font-mono border border-gray-200 rounded-lg p-1.5 bg-white"
                          />
                        </td>

                        {/* Hạn sử dụng */}
                        <td className="py-2.5 px-3">
                          <input
                            type="date"
                            value={line.expiredDate}
                            onChange={(e) => handleUpdateLine(idx, 'expiredDate', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg p-1.5 bg-white"
                          />
                        </td>

                        {/* Nút Xóa */}
                        <td className="py-2.5 px-3 text-center sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Xóa mặt hàng này khỏi phiếu chuyển"
                          >
                            <Trash2 size={13} />
                            <span>Xóa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer tổng kết bảng */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Tổng cộng: <b>{lines.length}</b> mặt hàng điều chuyển
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Tổng số lượng chuyển:</span>
                <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                  {totalTransferQty.toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTION BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
            navigate('/inventory/transfers');
          }}
          className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition cursor-pointer"
        >
          ← Quay lại danh sách
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
            <span>Lập phiếu chuyển (Chờ QL duyệt)</span>
          </button>
          {isManagerOrAdmin && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('IN_TRANSIT')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              <span>Duyệt & Xuất kho ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL XỔ DANH SÁCH SẢN PHẨM CÓ PHÂN TRANG & CUỘN INFINITE SCROLL */}
    </div>
  );
};
