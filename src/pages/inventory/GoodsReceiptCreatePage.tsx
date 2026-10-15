import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Warehouse,
  Building2,
  Package,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Save,
  Check,
  Search,
  X,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import type { GoodsReceiptFormPayload } from '../../types/inventory';
import { SYSTEM_WAREHOUSES } from '../../types/inventory';
import { fetchSuppliers, INITIAL_SUPPLIERS } from '../../services/supplierApi';
import type { Supplier } from '../../types/supplier';
import { productService, PRODUCT_CATEGORIES } from '../../services/productService';
import type { Product } from '../../types/product';
import { createGoodsReceipt } from '../../services/inventoryReceiptApi';
import { formatCurrencyVND, formatQuantity } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from '../../routes/Router';
import { SearchSelect } from '../../components/common/SearchSelect';
import { NumberInput } from '../../components/common/NumberInput';
import { Pagination } from '../../components/common/Pagination';

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

interface ReceiptLineQuantityInputProps {
  quantity: number;
  onChange: (qty: number) => void;
}

const ReceiptLineQuantityInput: React.FC<ReceiptLineQuantityInputProps> = ({
  quantity,
  onChange
}) => {
  const [localText, setLocalText] = useState<string>(() => String(quantity));

  useEffect(() => {
    const num = parseInt(localText, 10);
    const parsed = isNaN(num) ? 0 : num;
    if (parsed !== quantity) {
      setLocalText(String(quantity));
    }
  }, [quantity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalText(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(localText, 10);
    if (isNaN(num) || num < 0) {
      setLocalText(String(quantity));
      onChange(quantity);
    } else {
      setLocalText(String(num));
      onChange(num);
    }
  };

  const handleIncrease = () => {
    const num = parseInt(localText, 10);
    const current = isNaN(num) ? 0 : num;
    const next = current + 1;
    setLocalText(String(next));
    onChange(next);
  };

  const handleDecrease = () => {
    const num = parseInt(localText, 10);
    const current = isNaN(num) ? 0 : num;
    const next = Math.max(0, current - 1);
    setLocalText(String(next));
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrease();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrease();
    }
  };

  return (
    <div className="flex items-center h-8.5 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleDecrease}
        disabled={quantity <= 0}
        className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        title="Giảm 1"
      >
        <Minus size={13} />
      </button>
      <NumberInput
        value={localText}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-14 h-full text-center text-xs font-bold font-mono focus:outline-none bg-transparent"
        min={0}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleIncrease}
        className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition cursor-pointer"
        title="Tăng 1"
      >
        <Plus size={13} />
      </button>
    </div>
  );
};

const DEFAULT_CATALOG_PAGE_SIZE = 10;

export const GoodsReceiptCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { showToast } = useAuth();

  const searchParams = new URLSearchParams(
    search || (pathname.includes('?') ? pathname.split('?')[1] : window.location.search)
  );
  const paramWarehouseCode = searchParams.get('warehouseCode') || '';
  const paramSku = searchParams.get('sku') || '';
  const paramQty = searchParams.get('qty') ? Number(searchParams.get('qty')) : undefined;

  // Danh mục dữ liệu tham chiếu
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Form Fields
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | string>('');
  const [documentNumber, setDocumentNumber] = useState<string>(() => {
    const now = new Date();
    return `PNK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  });
  const [receiptDate, setReceiptDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>(() => paramWarehouseCode || 'WH-MB01');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [generalNote, setGeneralNote] = useState<string>('');
  const [lines, setLines] = useState<FormLineState[]>([]);

  // Danh mục sản phẩm mở rộng toàn trang (phân trang chuẩn có chọn số trang & số dòng/trang)
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogPage, setCatalogPage] = useState<number>(0);
  const [catalogPageSize, setCatalogPageSize] = useState<number>(DEFAULT_CATALOG_PAGE_SIZE);
  const [catalogTotalPages, setCatalogTotalPages] = useState<number>(1);
  const [catalogTotalElements, setCatalogTotalElements] = useState<number>(0);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
  const [catalogKeyword, setCatalogKeyword] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');

  // Tick chọn nhanh sản phẩm trong danh mục (từng sản phẩm hoặc tick all)
  const [selectedCatalogProductIds, setSelectedCatalogProductIds] = useState<Set<number>>(new Set());

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trạng thái lưu
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Tải danh mục nhà cung cấp
  useEffect(() => {
    let alive = true;
    fetchSuppliers({ size: 100 })
      .then((res) => {
        if (!alive) return;
        const sups = res.content && res.content.length > 0 ? res.content : INITIAL_SUPPLIERS;
        setSuppliers(sups);
        if (sups.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(sups[0].id);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh mục nhà cung cấp:', err);
        if (alive) {
          setSuppliers(INITIAL_SUPPLIERS);
          if (INITIAL_SUPPLIERS.length > 0 && !selectedSupplierId) {
            setSelectedSupplierId(INITIAL_SUPPLIERS[0].id);
          }
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  // Tải danh mục sản phẩm từ server theo phân trang
  const fetchCatalog = useCallback(
    async (page: number, size: number, keyword: string, category: string) => {
      setLoadingCatalog(true);

      try {
        const res = await productService.getProducts({
          page,
          size,
          keyword: keyword.trim() || undefined,
          category: category !== 'ALL' ? category : undefined,
          status: 'ACTIVE'
        });

        setCatalogProducts(res.products || []);
        setCatalogPage(page);
        setCatalogTotalPages(res.totalPages || 1);
        setCatalogTotalElements(res.totalElements || 0);
      } catch (err) {
        console.error('Lỗi tải danh mục sản phẩm nhập kho:', err);
      } finally {
        setLoadingCatalog(false);
      }
    },
    []
  );

  // Tải sản phẩm khi vào trang hoặc khi đổi danh mục
  useEffect(() => {
    setCatalogPage(0);
    fetchCatalog(0, catalogPageSize, catalogKeyword, catalogCategory);
  }, [catalogCategory]);

  // Tìm kiếm theo từ khóa có debounce
  const handleKeywordChange = (kw: string) => {
    setCatalogKeyword(kw);
    setCatalogPage(0);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchCatalog(0, catalogPageSize, kw, catalogCategory);
    }, 350);
  };

  // Chuyển trang
  const handleCatalogPageChange = (newPage: number) => {
    setCatalogPage(newPage);
    fetchCatalog(newPage, catalogPageSize, catalogKeyword, catalogCategory);
  };

  // Chọn số dòng / sản phẩm mỗi trang
  const handleCatalogSizeChange = (newSize: number) => {
    setCatalogPageSize(newSize);
    setCatalogPage(0);
    fetchCatalog(0, newSize, catalogKeyword, catalogCategory);
  };

  // Xử lý param SKU ban đầu nếu có (từ cảnh báo định mức tồn)
  useEffect(() => {
    if (!paramSku) return;

    productService
      .getProducts({ keyword: paramSku, size: 5, status: 'ACTIVE' })
      .then((res) => {
        if (res.products && res.products.length > 0) {
          const exact = res.products.find((p) => p.sku.toLowerCase() === paramSku.toLowerCase()) || res.products[0];
          const availableUnits = getAvailableUnitsForProduct(exact);
          const firstUnit = availableUnits[0];

          setLines([
            {
              id: `init-${Date.now()}`,
              productId: Number(exact.id),
              productSku: exact.sku,
              productName: exact.name,
              category: exact.category,
              baseUnit: exact.baseUnit,
              selectedUnit: firstUnit.unitName,
              conversionFactor: firstUnit.conversionFactor,
              quantity: paramQty && paramQty > 0 ? paramQty : 50,
              unitPrice: Number(exact.costPrice || 0),
              batchNumber: `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
              expiredDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
              hasBatchManagement: true,
              availableUnits
            }
          ]);
          setGeneralNote(`Nhập bù hàng dưới định mức tồn tối thiểu cho ${paramWarehouseCode || 'kho'}`);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải sản phẩm theo tham số SKU:', err);
      });
  }, [paramSku, paramWarehouseCode, paramQty]);

  // Map số lượng và đơn vị đã chọn trong phiếu để hiển thị trạng thái trên danh mục
  const productQuantityMap = useMemo(() => {
    const map = new Map<number, { qty: number; unit: string }>();
    lines.forEach((l) => {
      map.set(l.productId, { qty: l.quantity, unit: l.selectedUnit });
    });
    return map;
  }, [lines]);

  // Thêm sản phẩm trực tiếp từ Danh Mục Toàn Trang vào Phiếu Nhập
  const handleAddProductToReceipt = (prod: Product) => {
    const existingIndex = lines.findIndex((l) => l.productId === Number(prod.id));
    if (existingIndex >= 0) {
      // Đã có trong phiếu -> Tăng số lượng lên 1
      setLines((prev) =>
        prev.map((l, idx) =>
          idx === existingIndex ? { ...l, quantity: l.quantity + 1 } : l
        )
      );
      showToast('Đã tăng số lượng', `Sản phẩm [${prod.sku}] đã có trong phiếu, số lượng tăng thêm 1`, 'info', 2000);
      return;
    }

    // Chưa có trong phiếu -> Thêm dòng mới
    const availableUnits = getAvailableUnitsForProduct(prod);
    const defaultUnit = availableUnits[0];

    const newLine: FormLineState = {
      id: `line-${Date.now()}-${Math.random()}`,
      productId: Number(prod.id),
      productSku: prod.sku,
      productName: prod.name,
      category: prod.category,
      baseUnit: prod.baseUnit,
      selectedUnit: defaultUnit.unitName,
      conversionFactor: defaultUnit.conversionFactor,
      quantity: 1,
      unitPrice: Number(prod.costPrice || 0),
      batchNumber: `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      expiredDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      hasBatchManagement: true,
      availableUnits
    };

    setLines((prev) => [...prev, newLine]);
    showToast('Đã thêm sản phẩm', `Đã thêm [${prod.sku}] vào phiếu nhập kho`, 'success', 2000);
  };

  // Tick chọn nhanh từng sản phẩm hoặc tick all trong danh mục nhập kho
  const toggleSelectCatalogProduct = (id: number) => {
    setSelectedCatalogProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allCatalogSelected =
    catalogProducts.length > 0 &&
    catalogProducts.every((p) => selectedCatalogProductIds.has(Number(p.id)));

  const toggleSelectAllCatalog = () => {
    if (allCatalogSelected) {
      setSelectedCatalogProductIds((prev) => {
        const next = new Set(prev);
        catalogProducts.forEach((p) => next.delete(Number(p.id)));
        return next;
      });
    } else {
      setSelectedCatalogProductIds((prev) => {
        const next = new Set(prev);
        catalogProducts.forEach((p) => next.add(Number(p.id)));
        return next;
      });
    }
  };

  const clearCatalogSelection = () => {
    setSelectedCatalogProductIds(new Set());
  };

  // Thêm đồng loạt các sản phẩm đã tick chọn vào phiếu nhập kho
  const handleAddSelectedProductsToReceipt = () => {
    if (selectedCatalogProductIds.size === 0) return;

    const selectedProds = catalogProducts.filter((p) =>
      selectedCatalogProductIds.has(Number(p.id))
    );

    if (selectedProds.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;

    setLines((prev) => {
      const newLines = [...prev];

      selectedProds.forEach((prod) => {
        const existingIndex = newLines.findIndex(
          (l) => l.productId === Number(prod.id)
        );

        if (existingIndex >= 0) {
          newLines[existingIndex] = {
            ...newLines[existingIndex],
            quantity: newLines[existingIndex].quantity + 1
          };
          updatedCount++;
        } else {
          const availableUnits = getAvailableUnitsForProduct(prod);
          const defaultUnit = availableUnits[0];

          newLines.push({
            id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            productId: Number(prod.id),
            productSku: prod.sku,
            productName: prod.name,
            category: prod.category,
            baseUnit: prod.baseUnit,
            selectedUnit: defaultUnit.unitName,
            conversionFactor: defaultUnit.conversionFactor,
            quantity: 1,
            unitPrice: Number(prod.costPrice || 0),
            batchNumber: `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
            expiredDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            hasBatchManagement: true,
            availableUnits
          });
          addedCount++;
        }
      });

      return newLines;
    });

    setSelectedCatalogProductIds(new Set());

    showToast(
      'Thêm sản phẩm thành công',
      `Đã thêm ${addedCount} sản phẩm mới và cập nhật ${updatedCount} sản phẩm đã có vào phiếu`,
      'success',
      3000
    );
  };

  const handleUpdateLineField = (
    index: number,
    field: keyof FormLineState,
    value: unknown
  ) => {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        return { ...line, [field]: value };
      })
    );
  };

  const handleChangeUnit = (index: number, newUnitName: string) => {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const matched = line.availableUnits.find((u) => u.unitName === newUnitName);
        const factor = matched ? matched.conversionFactor : 1;
        return {
          ...line,
          selectedUnit: newUnitName,
          conversionFactor: factor
        };
      })
    );
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Tính tổng
  const totalBaseQty = useMemo(() => {
    return lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.conversionFactor || 1), 0);
  }, [lines]);

  const totalAmount = useMemo(() => {
    return lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.conversionFactor || 1) * (l.unitPrice || 0), 0);
  }, [lines]);

  // Tự động cuộn mượt xuống bảng danh mục sản phẩm bên dưới
  const scrollToProductCatalog = () => {
    const el = document.getElementById('product-catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-orange-400', 'ring-offset-2', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-orange-400', 'ring-offset-2');
      }, 1200);

      const searchInput = document.getElementById('catalog-search-input') as HTMLInputElement | null;
      if (searchInput) {
        setTimeout(() => {
          searchInput.focus();
        }, 400);
      }
    }
  };

  // Kiểm tra hợp lệ trước khi lưu
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!selectedSupplierId) {
      errors.push('Vui lòng chọn nhà cung cấp cung ứng hàng hóa.');
    }
    if (!documentNumber.trim()) {
      errors.push('Vui lòng nhập số hóa đơn / chứng từ nhập kho.');
    }
    if (!receiptDate) {
      errors.push('Vui lòng chọn ngày nhập kho.');
    }
    if (!selectedWarehouseCode) {
      errors.push('Vui lòng chọn kho đích nhận hàng.');
    }
    if (!vehiclePlate.trim()) {
      errors.push('Vui lòng nhập biển số xe giao hàng.');
    }
    if (!driverName.trim()) {
      errors.push('Vui lòng nhập tên tài xế / người giao hàng.');
    }

    if (lines.length === 0) {
      errors.push('Phiếu nhập kho phải có ít nhất 1 mặt hàng. Vui lòng chọn sản phẩm từ danh mục bên dưới.');
    }

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (line.quantity <= 0) {
        errors.push(`Dòng #${lineNum} [${line.productSku}]: Số lượng nhập phải lớn hơn 0.`);
      }
      if (!line.batchNumber.trim()) {
        errors.push(`Dòng #${lineNum} [${line.productSku}]: Vui lòng nhập số lô hàng hóa.`);
      }
      if (!line.expiredDate) {
        errors.push(`Dòng #${lineNum} [${line.productSku}]: Vui lòng chọn hạn sử dụng.`);
      }
    });

    setFormErrors(errors);
    return errors.length === 0;
  };

  // Xử lý Lưu Nháp hoặc Xác Nhận Nhập Kho (Cộng Tồn)
  const handleSave = async (status: 'DRAFT' | 'CONFIRMED') => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setFormErrors([]);

    const foundSupplier = suppliers.find((s) => String(s.id) === String(selectedSupplierId));
    const foundWarehouse = SYSTEM_WAREHOUSES.find((w) => w.code === selectedWarehouseCode);

    const payload: GoodsReceiptFormPayload = {
      supplierId: Number(selectedSupplierId),
      supplierCode: foundSupplier?.code || 'NCC-UNKNOWN',
      supplierName: foundSupplier?.name || 'Nhà cung cấp',
      warehouseCode: selectedWarehouseCode,
      warehouseName: foundWarehouse?.name || 'Kho Tổng Miền Bắc',
      documentNumber: documentNumber.trim(),
      receiptDate,
      vehiclePlate: vehiclePlate.trim(),
      driverName: driverName.trim(),
      note: generalNote.trim() || undefined,
      status,
      lines: lines.map((l) => {
        const baseQty = l.quantity * l.conversionFactor;
        const lineTotal = baseQty * l.unitPrice;
        return {
          productId: l.productId,
          productSku: l.productSku,
          productName: l.productName,
          category: l.category,
          baseUnit: l.baseUnit,
          selectedUnit: l.selectedUnit,
          conversionFactor: l.conversionFactor,
          quantity: l.quantity,
          baseQuantity: baseQty,
          unitPrice: l.unitPrice,
          totalAmount: lineTotal,
          batchNumber: l.batchNumber.trim(),
          expiredDate: l.expiredDate,
          hasBatchManagement: true
        };
      })
    };

    try {
      const result = await createGoodsReceipt(payload);
      showToast(
        status === 'CONFIRMED' ? 'Nhập kho thành công!' : 'Đã lưu phiếu nháp',
        status === 'CONFIRMED'
          ? `Phiếu nhập ${result.code} đã được xác nhận và cộng tồn kho thành công.`
          : `Phiếu nhập ${result.code} đã lưu ở trạng thái Nháp (chưa ghi tồn).`,
        'success',
        4000
      );

      navigate('/inventory/receipts');
    } catch (err: unknown) {
      console.error('Lỗi lưu phiếu nhập kho:', err);
      showToast('Lỗi lưu phiếu', err instanceof Error ? err.message : 'Không thể lưu phiếu nhập kho', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 antialiased pb-24 animate-in fade-in duration-200">
      {/* 1. THANH ĐIỀU HƯỚNG QUAY LẠI & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/inventory/receipts')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="goods-receipt-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách phiếu nhập kho</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Kho bãi & Tồn kho / Phiếu nhập kho / Lập phiếu nhập kho
          </span>
        </div>
      </div>

      {/* 2. HERO HEADER CARD CỦA TRANG */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 bg-gradient-to-r from-orange-50/60 via-amber-50/20 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
              <Warehouse size={28} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Lập Phiếu Nhập Kho Từ Nhà Cung Cấp
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Ghi nhận hàng hóa về đúng lô, đúng hạn sử dụng và tự động quy đổi về đơn vị cơ sở
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2.5 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('DRAFT')}
              className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <Save size={15} />
              <span>Lưu Phiếu Nháp</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('CONFIRMED')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check size={16} />
              <span>Xác Nhận Nhập Kho (Cộng Tồn)</span>
            </button>
          </div>
        </div>
      </div>

      {/* DANH SÁCH LỖI NẾU CÓ */}
      {formErrors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-1.5 animate-in fade-in">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>Vui lòng kiểm tra và hoàn thiện các thông tin sau:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-rose-700">
            {formErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. KHỐI 1: THÔNG TIN CHỨNG TỪ & NHÀ CUNG CẤP */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-100">
          <Building2 size={16} className="text-[#F85606]" />
          <span>1. Thông Tin Nhà Cung Cấp & Kho Nhận Hàng</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chọn Nhà Cung Cấp */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Nhà cung cấp <span className="text-rose-500">*</span>
            </label>
            <SearchSelect
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </SearchSelect>
          </div>

          {/* Số chứng từ / Hóa đơn */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
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
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
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
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Kho nhập hàng <span className="text-rose-500">*</span>
            </label>
            <SearchSelect
              value={selectedWarehouseCode}
              onChange={(e) => setSelectedWarehouseCode(e.target.value)}
              className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {SYSTEM_WAREHOUSES.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w.name}
                </option>
              ))}
            </SearchSelect>
          </div>
        </div>

        {/* Thông tin phương tiện & tài xế */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Biển số xe giao hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Vd: 29C-998.12"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Tên tài xế / Người giao <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Vd: Nguyễn Văn A"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Ghi chú bốc dỡ hàng
            </label>
            <input
              type="text"
              placeholder="Vd: Giao tại cửa số 3, kiểm đếm đủ tem niêm phong"
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>
      </div>

      {/* 4. KHỐI 2: CHI TIẾT SẢN PHẨM ĐÃ CHỌN NHẬP KHO (TÁCH 2 CỘT SỐ LÔ & HẠN DÙNG) */}
      <div id="receipt-lines-section" className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-50/90 to-white">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-[#F85606]" />
            <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider">
              2. Chi Tiết Dòng Hàng Nhập Kho ({lines.length} mặt hàng)
            </h2>
          </div>

          {lines.length > 0 && (
            <div className="text-xs font-bold text-gray-500">
              Đã chọn: <span className="text-[#F85606] font-mono">{lines.length}</span> SKU
            </div>
          )}
        </div>

        {/* BẢNG DÒNG HÀNG HOẶC BANNER HƯỚNG DẪN */}
        {lines.length === 0 ? (
          <div className="p-8 sm:p-10 text-center space-y-2 bg-gradient-to-b from-orange-50/20 to-gray-50/30 rounded-2xl border border-dashed border-orange-200 m-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#F85606] flex items-center justify-center mx-auto">
              <Package size={24} />
            </div>
            <p className="text-sm font-bold text-gray-800">Chưa có sản phẩm nào trong phiếu nhập</p>
            <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
              Vui lòng xem{' '}
              <button
                type="button"
                onClick={scrollToProductCatalog}
                className="font-bold text-gray-700 hover:text-[#F85606] underline decoration-dashed decoration-orange-300 underline-offset-4 cursor-pointer transition-colors"
              >
                Danh mục sản phẩm bên dưới
              </button>{' '}
              và bấm nút{' '}
              <button
                type="button"
                onClick={scrollToProductCatalog}
                className="inline-flex items-center gap-1 font-bold text-[#F85606] bg-orange-100/70 hover:bg-orange-200/80 px-2 py-0.5 rounded-md border border-orange-300 hover:border-[#F85606] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-2xs group align-baseline"
                title="Bấm để cuộn nhanh xuống danh mục sản phẩm"
              >
                <span>+ Thêm vào phiếu</span>
                <ArrowDown size={12} className="text-[#F85606] inline transition-transform group-hover:translate-y-0.5 animate-bounce" />
              </button>{' '}
              để đưa các mặt hàng vào phiếu nhập kho.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/90 font-bold text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 min-w-[220px]">Mặt hàng / SKU</th>
                  <th className="py-3 px-3 min-w-[150px]">ĐVT Nhập</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">Số lượng</th>
                  <th className="py-3 px-3 text-center min-w-[120px]">Quy về cơ sở</th>
                  {/* TÁCH RIÊNG CỘT SỐ LÔ THEO YÊU CẦU */}
                  <th className="py-3 px-3 min-w-[140px]">Số Lô</th>
                  {/* TÁCH RIÊNG CỘT HẠN DÙNG THEO YÊU CẦU */}
                  <th className="py-3 px-3 min-w-[140px]">Hạn Dùng</th>
                  <th className="py-3 px-3 text-center w-14">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => {
                  const baseQty = line.quantity * line.conversionFactor;

                  return (
                    <tr key={line.id} className="hover:bg-orange-50/25 transition-colors">
                      <td className="py-3 px-3 text-center text-gray-400 font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">
                          {line.productName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                            {line.productSku}
                          </span>
                          {line.category && (
                            <span className="text-[11px] text-gray-400">
                              • {line.category}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <SearchSelect
                          value={line.selectedUnit}
                          onChange={(e) => handleChangeUnit(idx, e.target.value)}
                          className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2 bg-orange-50/50 text-orange-950 focus:outline-none"
                        >
                          {line.availableUnits.map((u) => (
                            <option key={u.unitName} value={u.unitName}>
                              {u.unitName} (x{u.conversionFactor} {line.baseUnit})
                            </option>
                          ))}
                        </SearchSelect>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex justify-center">
                          <ReceiptLineQuantityInput
                            quantity={line.quantity}
                            onChange={(newQty) => handleUpdateLineField(idx, 'quantity', newQty)}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 px-2 inline-block min-w-[90px]">
                          <span className="font-black text-xs font-mono text-emerald-700">
                            {formatQuantity(baseQty)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 ml-1">
                            {line.baseUnit}
                          </span>
                        </div>
                      </td>

                      {/* CỘT 1: SỐ LÔ RIÊNG BIỆT */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Vd: LOT-202610-01"
                          value={line.batchNumber}
                          onChange={(e) => handleUpdateLineField(idx, 'batchNumber', e.target.value)}
                          className="w-full text-xs font-mono font-bold border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </td>

                      {/* CỘT 2: HẠN DÙNG RIÊNG BIỆT */}
                      <td className="py-3 px-3">
                        <input
                          type="date"
                          value={line.expiredDate}
                          onChange={(e) => handleUpdateLineField(idx, 'expiredDate', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Xóa sản phẩm này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* BẢNG TỔNG KẾT QUY ĐỔI & GHI SỔ */}
        <div className="bg-orange-50/50 p-4 sm:p-5 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="space-y-1 text-gray-600 text-center sm:text-left">
            <div>
              Tổng số mặt hàng: <strong className="text-gray-900 font-bold">{lines.length} SKU</strong>
            </div>
            <div className="text-[11px] text-gray-500">
              * Toàn bộ hàng hóa nhập kho sẽ được quy chuẩn về đơn vị cơ sở khi ghi sổ thẻ kho.
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-orange-200 shadow-2xs">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-gray-400">Tổng quy đổi cơ sở</div>
              <div className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                {formatQuantity(totalBaseQty)} đơn vị cơ sở
              </div>
            </div>
            <div className="h-7 w-px bg-gray-200" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-gray-400">Tổng giá trị nhập</div>
              <div className="text-sm sm:text-base font-black text-[#F85606] font-mono">
                {formatCurrencyVND(totalAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. KHỐI 3: DANH MỤC SẢN PHẨM MỞ TO TOÀN TRANG (BAN ĐẦU 30 SP, CUỘN XUỐNG TẢI TIẾP, CÓ PHÂN TRANG RÕ RÀNG) */}
      <div id="product-catalog-section" className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden space-y-0">
        {/* Header danh mục & phân trang */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/60 via-amber-50/20 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F85606] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  3
                </div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-tight">
                  Danh Mục Sản Phẩm Để Chọn Nhập Kho
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Bấm nút <strong className="text-[#F85606]">+ Thêm vào phiếu</strong> để đưa sản phẩm vào danh sách dòng hàng. Chọn số trang hoặc số dòng/trang bên dưới để duyệt toàn bộ danh mục.
              </p>
            </div>

            {/* Phân trang rõ ràng */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 font-bold text-xs flex items-center gap-2 shadow-2xs">
                <span>
                  Đang hiển thị:{' '}
                  <strong className="text-[#F85606] font-mono">
                    {catalogTotalElements === 0 ? 0 : catalogPage * catalogPageSize + 1}–{Math.min((catalogPage + 1) * catalogPageSize, catalogTotalElements)}
                  </strong>{' '}
                  /{' '}
                  <strong className="font-mono">{catalogTotalElements}</strong> sản phẩm
                </span>
                <span className="text-orange-300">•</span>
                <span>
                  Trang <strong className="font-mono">{catalogTotalPages > 0 ? catalogPage + 1 : 0}</strong> /{' '}
                  <strong className="font-mono">{catalogTotalPages}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Ô tìm kiếm & Bộ lọc ngành hàng */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="catalog-search-input"
                type="text"
                placeholder="Tìm kiếm nhanh theo mã SKU, tên sản phẩm..."
                value={catalogKeyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
              />
              {catalogKeyword && (
                <button
                  type="button"
                  onClick={() => handleKeywordChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Các nút ngành hàng */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setCatalogCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${catalogCategory === 'ALL'
                  ? 'bg-[#F85606] text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
              >
                Tất cả ngành hàng
              </button>
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${catalogCategory === cat
                    ? 'bg-[#F85606] text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Thanh tác vụ khi tick chọn nhiều sản phẩm */}
          {selectedCatalogProductIds.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 p-3 bg-orange-50 border border-orange-200 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#F85606] text-white text-xs font-black flex items-center justify-center shadow-xs">
                  {selectedCatalogProductIds.size}
                </span>
                <span className="text-xs font-bold text-gray-800">
                  Đã tick chọn <strong className="text-[#F85606] font-mono">{selectedCatalogProductIds.size}</strong> sản phẩm
                </span>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={clearCatalogSelection}
                  className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddSelectedProductsToReceipt}
                className="px-4 py-2 bg-gradient-to-r from-[#F85606] to-orange-500 hover:from-orange-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/20 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Plus size={15} />
                <span>Thêm {selectedCatalogProductIds.size} sản phẩm đã chọn vào phiếu</span>
              </button>
            </div>
          )}
        </div>

        {/* Thanh tiến trình tải sản phẩm */}
        <div className="w-full bg-gray-100 h-1">
          <div
            className="bg-gradient-to-r from-orange-500 to-amber-500 h-1 transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.round((catalogProducts.length / Math.max(1, catalogTotalElements)) * 100))}%`
            }}
          />
        </div>

        {/* Bảng Danh Sách Sản Phẩm Mở Rộng Toàn Trang */}
        {loadingCatalog ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-[#F85606] mx-auto" />
            <p className="text-xs text-gray-500 font-semibold">Đang tải danh mục sản phẩm...</p>
          </div>
        ) : catalogProducts.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Package size={36} className="text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">Không tìm thấy sản phẩm phù hợp</p>
            <p className="text-xs text-gray-400">Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn ngành hàng khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/90 font-bold text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allCatalogSelected}
                      onChange={toggleSelectAllCatalog}
                      className="w-4 h-4 rounded text-[#F85606] accent-[#F85606] cursor-pointer"
                      title={allCatalogSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả sản phẩm đang hiển thị'}
                    />
                  </th>
                  <th className="py-3 px-2 text-center w-10">#</th>
                  <th className="py-3 px-3 min-w-[140px]">Mã SKU</th>
                  <th className="py-3 px-3 min-w-[280px]">Tên sản phẩm</th>
                  <th className="py-3 px-3 min-w-[150px]">Ngành hàng</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">ĐVT Cơ sở</th>
                  <th className="py-3 px-3 text-right min-w-[130px]">Giá vốn tham chiếu</th>
                  <th className="py-3 px-3 text-center min-w-[180px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {catalogProducts.map((prod, idx) => {
                  const isSelected = selectedCatalogProductIds.has(Number(prod.id));
                  const selectedInfo = productQuantityMap.get(Number(prod.id));

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-orange-50/30 transition-colors ${
                        isSelected ? 'bg-orange-50/40' : selectedInfo ? 'bg-orange-50/15' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCatalogProduct(Number(prod.id))}
                          className="w-4 h-4 rounded text-[#F85606] accent-[#F85606] cursor-pointer"
                          title={`Tick chọn ${prod.name}`}
                        />
                      </td>
                      <td className="py-3 px-2 text-center text-gray-400 font-mono text-[11px]">
                        {catalogPage * catalogPageSize + idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                          {prod.sku}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{prod.name}</p>
                        {prod.packagingSpec && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Quy cách: {prod.packagingSpec}</p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-gray-600 font-medium">{prod.category || 'Chưa phân loại'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          {prod.baseUnit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-800">
                        {formatCurrencyVND(prod.costPrice || 0)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {selectedInfo ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1">
                              <Check size={12} />
                              <span>Đã chọn ({selectedInfo.qty} {selectedInfo.unit})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddProductToReceipt(prod)}
                              className="px-2.5 py-1 rounded-lg bg-[#F85606] hover:bg-orange-600 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs active:scale-95"
                              title="Tăng thêm 1 số lượng"
                            >
                              + Thêm tiếp
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddProductToReceipt(prod)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95"
                          >
                            <Plus size={14} />
                            <span>Thêm vào phiếu</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang chuẩn theo quy tắc dự án: Nút chọn trang 1, 2, ... và chọn số dòng/trang */}
        {!loadingCatalog && catalogTotalElements > 0 && (
          <Pagination
            page={catalogPage}
            totalPages={catalogTotalPages}
            totalElements={catalogTotalElements}
            size={catalogPageSize}
            onPageChange={handleCatalogPageChange}
            onSizeChange={handleCatalogSizeChange}
            itemLabel="sản phẩm"
          />
        )}
      </div>

      {/* 6. FOOTER ACTIONS DƯỚI CÙNG */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-500 italic text-center sm:text-left">
          Quy tắc ghi sổ: Xác nhận phiếu mới cộng tồn kho; Phiếu nháp không làm thay đổi tồn.
        </p>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => navigate('/inventory/receipts')}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('DRAFT')}
            className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <Save size={15} />
            <span>Lưu Phiếu Nháp</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('CONFIRMED')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Check size={16} />
            <span>Xác Nhận Nhập Kho (Cộng Tồn)</span>
          </button>
        </div>
      </div>

      {/* 7. FLOATING QUICK BAR KHI ĐÃ CHỌN SẢN PHẨM & CUỘN TRANG */}
      {lines.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl bg-gray-900/95 backdrop-blur-md text-white p-3 sm:px-6 sm:py-3.5 rounded-2xl shadow-2xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F85606] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-orange-500/30">
              {lines.length}
            </div>
            <div>
              <div className="font-bold text-white text-xs sm:text-sm">
                Đã chọn {lines.length} mặt hàng nhập kho
              </div>
              <div className="text-[11px] text-gray-300">
                Quy đổi: <strong className="text-emerald-400 font-mono">{formatQuantity(totalBaseQty)}</strong> đvcs • Tổng tiền: <strong className="text-orange-400 font-mono">{formatCurrencyVND(totalAmount)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('receipt-lines-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUp size={14} />
              <span>Xem dòng hàng ({lines.length})</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('DRAFT')}
              className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('CONFIRMED')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check size={15} />
              <span>Xác nhận nhập kho</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
