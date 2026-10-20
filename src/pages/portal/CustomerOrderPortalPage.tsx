import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Send,
  Eye,
  X,
  ShieldAlert,
  RotateCcw,
  Layers,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { CustomerPortalLayout } from '../../layouts/CustomerPortalLayout';
import type { Agency, DeliveryPoint, CreditStatusResponse } from '../../types/agency';
import type { OrderSummaryItem } from '../../types/order';
import type { OrderProductCatalogItem } from '../../services/orderService';
import { formatCurrencyVND, formatQuantity } from '../../services/orderService';
import {
  fetchPortalMe,
  fetchPortalProducts,
  fetchPortalCreditStatus,
  fetchPortalDeliveryPoints,
  previewPortalOrder,
  placePortalOrder,
  fetchPortalOrders,
  type PortalOrderResult,
  type PortalOrderLine
} from '../../services/portalApi';
import { CustomerOrderDetailView } from './CustomerOrderDetailView';
import { CustomerDebtPortalView } from './CustomerDebtPortalView';
import { CustomerReorderModal, type ReorderItemDraft } from '../../components/order/CustomerReorderModal';
import { SearchSelect } from '../../components/common/SearchSelect';
import { NumberInput } from '../../components/common/NumberInput';

// Giao diện một món trong giỏ hàng đại lý B2B
interface CartItem {
  productId: string;
  sku: string;
  name: string;
  selectedUnit: string;
  conversionFactor: number;
  unitPrice: number;
  quantity: number;
  availableUnits: Array<{ unitName: string; conversionFactor: number }>;
}

const HISTORY_STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { id: 'APPROVED', label: 'Đã duyệt' },
  { id: 'PICKING', label: 'Đang soạn hàng' },
  { id: 'DISPATCHED', label: 'Đã xuất kho' },
  { id: 'DELIVERED', label: 'Đã giao hàng' },
  { id: 'CLOSED', label: 'Hoàn tất' },
  { id: 'CANCELLED', label: 'Đã hủy' }
];

function getMinDeliveryDateString(): string {
  const now = new Date();
  // Đặt sau 12h trưa: tối thiểu N+2 ngày; đặt trước 12h trưa: tối thiểu N+1 (ngày mai)
  const daysToAdd = now.getHours() >= 12 ? 2 : 1;
  const target = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return target.toISOString().split('T')[0];
}

function formatDateVN(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const CustomerOrderPortalPage: React.FC = () => {
  const { user, currentRole, showToast } = useAuth();
  const navigate = useNavigate();

  // Tab: 'catalog' (Đặt hàng), 'history' (Đơn hàng của tôi), 'debt' (Công nợ & Hoá đơn) hoặc 'cart' (Giỏ hàng & Xác nhận đơn riêng biệt)
  const [activeTab, setActiveTab] = useState<'catalog' | 'history' | 'debt' | 'cart'>('catalog');

  // Thông tin đại lý hiện tại
  const [agency, setAgency] = useState<Agency | null>(null);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
  const [selectedDeliveryPointId, setSelectedDeliveryPointId] = useState<number | string>('');
  const [orderNote, setOrderNote] = useState<string>('');
  const [creditStatus, setCreditStatus] = useState<CreditStatusResponse | null>(null);

  // Ngày mong muốn nhận hàng (Ràng buộc Lead-time tối thiểu 24h - 48h theo quy chuẩn kho)
  const minDeliveryDate = useMemo(() => getMinDeliveryDateString(), []);
  const [desiredDeliveryDate, setDesiredDeliveryDate] = useState<string>(() => getMinDeliveryDateString());

  // Danh mục sản phẩm & tìm kiếm
  const [products, setProducts] = useState<OrderProductCatalogItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Phân trang danh mục sản phẩm (mặc định 30 sản phẩm/trang, hỗ trợ 30-50 theo S4-10)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Reset trang về 1 khi tìm kiếm hoặc thay đổi nhóm ngành hàng
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, selectedCategory]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartPreview, setCartPreview] = useState<PortalOrderResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal thông báo đặt hàng thành công
  const [successOrder, setSuccessOrder] = useState<PortalOrderResult | null>(null);
  // Lỗi tải thông tin đại lý (vd: tài khoản chưa được gắn với đại lý nào)
  const [agencyError, setAgencyError] = useState<string | null>(null);

  // Lịch sử đơn hàng của đại lý & Xem chi tiết đơn hàng toàn trang
  const [ordersHistory, setOrdersHistory] = useState<OrderSummaryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [viewingDetailOrderId, setViewingDetailOrderId] = useState<number | string | null>(null);

  // Bộ lọc lịch sử đơn hàng đại lý (S4-10 / S5-01: Lọc FE + BE tối ưu tốc độ tải)
  const [historyKeyword, setHistoryKeyword] = useState<string>('');
  const [debouncedHistoryKeyword, setDebouncedHistoryKeyword] = useState<string>('');
  const [historyStatus, setHistoryStatus] = useState<string>('ALL');
  const [historyFromDate, setHistoryFromDate] = useState<string>('');
  const [historyToDate, setHistoryToDate] = useState<string>('');

  // Phân trang lịch sử đơn hàng (0-indexed cho Backend)
  const [historyPage, setHistoryPage] = useState<number>(0);
  const [historyPageSize, setHistoryPageSize] = useState<number>(10);
  const [historyTotalElements, setHistoryTotalElements] = useState<number>(0);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);

  // Tick chọn nhanh sản phẩm trong danh mục để thêm nhanh vào giỏ hàng
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const [reorderModalOrderId, setReorderModalOrderId] = useState<number | string | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState<boolean>(false);

  const handleConfirmReorder = (items: ReorderItemDraft[]) => {
    if (items.length === 0) return;
    setCart((prev) => {
      const next = [...prev];
      items.forEach((item) => {
        const existingIdx = next.findIndex(
          (c) => c.productId === item.productId && c.selectedUnit === item.selectedUnit
        );
        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + item.quantity
          };
        } else {
          next.push({
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            selectedUnit: item.selectedUnit,
            conversionFactor: item.conversionFactor,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            availableUnits: item.availableUnits
          });
        }
      });
      return next;
    });

    setActiveTab('cart');
    showToast(
      'Đã đưa vào giỏ hàng',
      `Đã lấy lại ${items.length} mặt hàng theo bảng giá hiện hành!`,
      'success',
      4000
    );
  };

  // 1. TẢI THÔNG TIN ĐẠI LÝ LIÊN KẾT VỚI TÀI KHOẢN ĐĂNG NHẬP (S4-10: GET /api/portal/me)
  // Backend tự xác định đại lý theo tài khoản đăng nhập, không chọn đại lý ở Frontend.
  useEffect(() => {
    let cancelled = false;
    const loadCustomerData = async () => {
      try {
        const me = await fetchPortalMe();
        if (cancelled) return;
        setAgency(me);
        setAgencyError(null);

        // Tải hạn mức & công nợ hiện tại
        fetchPortalCreditStatus()
          .then((cs) => !cancelled && setCreditStatus(cs))
          .catch(() => !cancelled && setCreditStatus(null));

        // Tải danh sách điểm giao hàng
        fetchPortalDeliveryPoints()
          .then((pts) => {
            if (cancelled) return;
            setDeliveryPoints(pts);
            const defaultPt = pts.find((p) => p.isDefault) || pts[0];
            if (defaultPt) setSelectedDeliveryPointId(defaultPt.id);
          })
          .catch(() => !cancelled && setDeliveryPoints([]));
      } catch (err) {
        if (cancelled) return;
        setAgency(null);
        setLoadingProducts(false);
        setAgencyError(err instanceof Error ? err.message : 'Không tải được thông tin đại lý');
      }
    };

    loadCustomerData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 2. TẢI DANH MỤC SẢN PHẨM THEO NHÓM BẢNG GIÁ CỦA ĐẠI LÝ (AC1)
  const loadProducts = useCallback(async () => {
    if (!agency?.id) return;
    setLoadingProducts(true);
    try {
      // Backend GET /api/portal/products: giá theo bảng giá hiệu lực của nhóm khách hàng đại lý
      const items = await fetchPortalProducts();
      setProducts(items);
    } catch (err) {
      console.error('Lỗi tải sản phẩm theo bảng giá đại lý:', err);
      showToast(
        'Lỗi tải sản phẩm',
        err instanceof Error ? err.message : 'Không thể tải danh sách sản phẩm theo bảng giá',
        'error'
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [agency?.id, showToast]);

  useEffect(() => {
    if (agency?.id) {
      loadProducts();
    }
  }, [agency?.id, loadProducts]);

  // Debounce tìm kiếm từ khóa mã đơn hàng
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHistoryKeyword(historyKeyword);
    }, 350);
    return () => clearTimeout(timer);
  }, [historyKeyword]);

  const handleHistoryStatusChange = (status: string) => {
    setHistoryStatus(status);
    setHistoryPage(0);
  };

  const handleHistoryKeywordChange = (keyword: string) => {
    setHistoryKeyword(keyword);
    setHistoryPage(0);
  };

  const handleHistoryFromDateChange = (date: string) => {
    setHistoryFromDate(date);
    setHistoryPage(0);
  };

  const handleHistoryToDateChange = (date: string) => {
    setHistoryToDate(date);
    setHistoryPage(0);
  };

  // Kiểm tra tính hợp lệ của khoảng ngày
  const historyDateError = useMemo(() => {
    if (historyFromDate && historyToDate) {
      const d1 = new Date(historyFromDate);
      const d2 = new Date(historyToDate);
      if (d1 > d2) {
        return 'Từ ngày không được lớn hơn đến ngày';
      }
    }
    return null;
  }, [historyFromDate, historyToDate]);

  // 3. TẢI LỊCH SỬ ĐƠN HÀNG CỦA ĐẠI LÝ (Tab History) - Lọc cả FE & BE để tối ưu tốc độ load
  const loadOrderHistory = useCallback(async () => {
    if (!agency?.id) return;
    if (historyDateError) return;
    setLoadingHistory(true);
    try {
      const res = await fetchPortalOrders({
        status: historyStatus !== 'ALL' ? historyStatus : undefined,
        keyword: debouncedHistoryKeyword.trim() || undefined,
        fromDate: historyFromDate || undefined,
        toDate: historyToDate || undefined,
        page: historyPage,
        size: historyPageSize
      });
      setOrdersHistory(res.content || []);
      setHistoryTotalElements(res.totalElements ?? (res.content || []).length);
      setHistoryTotalPages(Math.max(1, res.totalPages ?? 1));
    } catch (err) {
      console.error('Lỗi tải lịch sử đơn hàng của đại lý:', err);
      showToast(
        'Lỗi tải đơn hàng',
        err instanceof Error ? err.message : 'Không tải được lịch sử đơn hàng của đại lý',
        'error'
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [
    agency?.id,
    historyStatus,
    debouncedHistoryKeyword,
    historyFromDate,
    historyToDate,
    historyPage,
    historyPageSize,
    historyDateError,
    showToast
  ]);

  useEffect(() => {
    if (activeTab === 'history' && agency?.id) {
      loadOrderHistory();
    }
  }, [activeTab, agency?.id, loadOrderHistory]);



  const handleQuickDateFilter = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
    setHistoryPage(0);
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setHistoryFromDate('');
      setHistoryToDate('');
      return;
    }

    if (preset === 'today') {
      setHistoryFromDate(toStr);
      setHistoryToDate(toStr);
      return;
    }

    if (preset === '7days') {
      const from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setHistoryFromDate(from.toISOString().split('T')[0]);
      setHistoryToDate(toStr);
      return;
    }

    if (preset === '30days') {
      const from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setHistoryFromDate(from.toISOString().split('T')[0]);
      setHistoryToDate(toStr);
      return;
    }

    if (preset === 'thisMonth') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setHistoryFromDate(`${year}-${month}-01`);
      setHistoryToDate(toStr);
      return;
    }
  };

  const hasActiveHistoryFilters = Boolean(
    historyKeyword ||
    historyStatus !== 'ALL' ||
    historyFromDate ||
    historyToDate
  );

  const handleResetHistoryFilters = () => {
    setHistoryKeyword('');
    setDebouncedHistoryKeyword('');
    setHistoryStatus('ALL');
    setHistoryFromDate('');
    setHistoryToDate('');
    setHistoryPage(0);
  };

  // Tính các số trang hiển thị của lịch sử đơn hàng
  const historyPageNumbers = useMemo(() => {
    const total = historyTotalPages;
    const current = historyPage + 1;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }, [historyPage, historyTotalPages]);

  // Danh mục nhóm hàng độc nhất để làm bộ lọc
  const categoryList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Danh sách sản phẩm sau lọc
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Chỉ hiển thị sản phẩm có bảng giá cho nhóm đại lý này (AC1)
      if (p.priceAvailable === false) return false;

      // Lọc từ khóa
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(kw);
        const matchSku = p.sku.toLowerCase().includes(kw);
        if (!matchName && !matchSku) return false;
      }

      // Lọc nhóm hàng
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [products, searchKeyword, selectedCategory]);

  // TÍNH TOÁN PHÂN TRANG DANH MỤC SẢN PHẨM (30-50 SẢN PHẨM/TRANG)
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safeCurrentPage, pageSize]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (safeCurrentPage > 3) {
      pages.push('...');
    }
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (safeCurrentPage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  }, [safeCurrentPage, totalPages]);

  // Thao tác tick chọn nhanh sản phẩm trong danh mục đặt hàng
  const toggleSelectProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (target && (target.availableStock ?? 0) <= 0) {
      showToast(
        'Sản phẩm tạm hết hàng',
        `Sản phẩm [${target.sku}] ${target.name} hiện đang tạm hết tồn kho, không thể chọn đặt mua!`,
        'error',
        3000
      );
      return;
    }
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const availableProductsOnPage = useMemo(() => {
    return paginatedProducts.filter((p) => (p.availableStock ?? 0) > 0);
  }, [paginatedProducts]);

  const allProductsOnPageSelected = useMemo(() => {
    return (
      availableProductsOnPage.length > 0 &&
      availableProductsOnPage.every((p) => selectedProductIds.has(p.id))
    );
  }, [availableProductsOnPage, selectedProductIds]);

  const toggleSelectAllProductsOnPage = () => {
    if (availableProductsOnPage.length === 0) {
      showToast('Không có sản phẩm khả dụng', 'Tất cả sản phẩm trên trang này đều đang tạm hết hàng.', 'info', 2500);
      return;
    }
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (allProductsOnPageSelected) {
        availableProductsOnPage.forEach((p) => next.delete(p.id));
      } else {
        availableProductsOnPage.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelectedProducts = () => {
    setSelectedProductIds(new Set());
  };

  // Thêm nhanh tất cả các sản phẩm đã tick chọn vào giỏ hàng
  const handleAddSelectedProductsToCart = () => {
    if (selectedProductIds.size === 0) return;

    const prodsToAdd = products.filter((p) => selectedProductIds.has(p.id) && (p.availableStock ?? 0) > 0);
    if (prodsToAdd.length === 0) {
      showToast('Sản phẩm đã hết hàng', 'Các sản phẩm đã chọn đều tạm hết tồn kho trong hệ thống.', 'error', 3000);
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      prodsToAdd.forEach((p) => {
        const defaultUnit = p.availableUnits[0]?.unitName || p.baseUnit;
        const factor = p.availableUnits[0]?.conversionFactor || 1;
        const unitPrice = p.basePrice * factor;

        const existingIdx = next.findIndex(
          (c) => c.productId === p.id && c.selectedUnit === defaultUnit
        );
        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + 1
          };
        } else {
          next.push({
            productId: p.id,
            sku: p.sku,
            name: p.name,
            selectedUnit: defaultUnit,
            conversionFactor: factor,
            unitPrice: unitPrice,
            quantity: 1,
            availableUnits: p.availableUnits
          });
        }
      });
      return next;
    });

    setSelectedProductIds(new Set());
    setActiveTab('cart');
    showToast(
      'Đã chọn xong mặt hàng',
      `Đã thêm ${prodsToAdd.length} sản phẩm và sẵn sàng gửi đơn đặt hàng!`,
      'success',
      3000
    );
  };

  // THAO TÁC GIỎ HÀNG
  const handleAddToCart = (product: OrderProductCatalogItem, unitName?: string, qtyToAdd: number = 1) => {
    const availableStock = product.availableStock ?? 0;
    if (availableStock <= 0) {
      showToast(
        'Sản phẩm tạm hết hàng',
        `Sản phẩm [${product.sku}] ${product.name} hiện đang tạm hết tồn kho, không thể thêm vào giỏ!`,
        'error',
        3500
      );
      return;
    }

    // Tìm đơn vị tính được chọn
    const activeUnit = product.availableUnits.find((u) => u.unitName === unitName) || product.availableUnits[0];
    const unit = activeUnit?.unitName || product.baseUnit;
    const factor = activeUnit?.conversionFactor || 1;
    const price = product.basePrice * factor;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id && item.selectedUnit === unit);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + qtyToAdd
        };
        return next;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            selectedUnit: unit,
            conversionFactor: factor,
            unitPrice: price,
            quantity: qtyToAdd,
            availableUnits: product.availableUnits
          }
        ];
      }
    });

    showToast('Đã thêm vào giỏ', `${product.name} (${qtyToAdd} ${unit})`, 'success', 2000);
  };

  const handleQuickBuy = (product: OrderProductCatalogItem, unitName?: string, qtyToAdd: number = 1) => {
    const availableStock = product.availableStock ?? 0;
    if (availableStock <= 0) {
      showToast(
        'Sản phẩm tạm hết hàng',
        `Sản phẩm [${product.sku}] ${product.name} hiện đang tạm hết tồn kho, không thể đặt mua!`,
        'error',
        3500
      );
      return;
    }
    handleAddToCart(product, unitName, qtyToAdd);
    setActiveTab('cart');
  };

  const handleUpdateCartQuantity = (index: number, newQty: number) => {
    setCart((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], quantity: Math.max(0, newQty) };
      }
      return next;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // TÍNH TOÁN CÔNG NỢ, CHIẾT KHẤU SẢN LƯỢNG & TỔNG TIỀN (AC2 & S4-10)
  // Tự động gọi API POST /api/portal/orders/preview từ Backend để lấy chiết khấu theo bậc sản lượng thời gian thực
  useEffect(() => {
    const validLines = cart.filter((c) => c.quantity > 0);
    if (validLines.length === 0) {
      setCartPreview(null);
      setLoadingPreview(false);
      return;
    }
    let alive = true;
    setLoadingPreview(true);
    const timer = setTimeout(() => {
      previewPortalOrder({
        deliveryAddressId: selectedDeliveryPointId ? Number(selectedDeliveryPointId) : null,
        desiredDeliveryDate: desiredDeliveryDate || null,
        note: orderNote.trim() || null,
        lines: validLines.map((c) => ({
          productSku: c.sku,
          unitName: c.selectedUnit,
          quantity: c.quantity
        }))
      })
        .then((res) => {
          if (alive) setCartPreview(res);
        })
        .catch((err) => {
          console.warn('Lỗi tính xem trước giỏ hàng:', err);
        })
        .finally(() => {
          if (alive) setLoadingPreview(false);
        });
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [cart, selectedDeliveryPointId, orderNote, desiredDeliveryDate]);

  const cartGrossAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const discountTotal = cartPreview ? cartPreview.discountTotal : 0;
  const cartPayableAmount = cartPreview ? cartPreview.totalAmount : cartGrossAmount;

  const cartTotalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Hạn mức, nợ hiện tại và công nợ còn lại sau đơn này (tính theo số tiền thanh toán thực tế sau chiết khấu)
  const creditLimit = Number(creditStatus?.creditLimit ?? agency?.creditLimit ?? 0);
  const currentDebt = Number(creditStatus?.currentDebt ?? agency?.totalDebt ?? 0);
  const remainingBeforeOrder = Number(creditStatus?.availableCredit ?? Math.max(0, creditLimit - currentDebt));
  const remainingAfterOrder = remainingBeforeOrder - cartPayableAmount;
  const hasOverdueDebt = Boolean(creditStatus?.overdue);

  // 4. GỬI ĐƠN HÀNG (AC3: ĐƠN GỬI LÊN LUÔN Ở TRẠNG THÁI CHỜ DUYỆT)
  const handleSubmitCustomerOrder = async () => {
    if (!agency?.id) {
      showToast('Lỗi đại lý', 'Không tìm thấy thông tin đại lý đặt hàng', 'error');
      return;
    }
    if (cart.length === 0) {
      showToast('Giỏ hàng trống', 'Vui lòng chọn ít nhất một sản phẩm để gửi đơn', 'info');
      return;
    }

    // Kiểm tra chặn nếu nợ quá hạn
    if (hasOverdueDebt) {
      showToast(
        'Đại lý có nợ quá hạn',
        'Tài khoản đang có khoản nợ quá hạn thanh toán. Vui lòng liên hệ kế toán để được mở khóa đặt hàng!',
        'error',
        6000
      );
      return;
    }

    // Kiểm tra ngày mong muốn nhận hàng & Ràng buộc Lead-time tối thiểu
    if (!desiredDeliveryDate) {
      showToast('Thiếu ngày nhận hàng', 'Vui lòng chọn ngày mong muốn nhận hàng', 'info');
      return;
    }
    if (desiredDeliveryDate < minDeliveryDate) {
      showToast(
        'Thời gian nhận hàng quá gấp',
        `Kho cần tối thiểu 24h-48h để điều phối và xếp lịch xe giao. Vui lòng chọn ngày từ ${formatDateVN(minDeliveryDate)} trở đi!`,
        'info',
        3500
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // S4-10: POST /api/portal/orders – chỉ gửi SKU / ĐVT / số lượng; Backend tính giá theo bảng giá hiện hành,
      // kiểm tồn, hạn mức và luôn đưa đơn về trạng thái Chờ duyệt (AC3) để nhân viên phụ trách xác nhận.
      const submittedOrder = await placePortalOrder({
        deliveryAddressId: selectedDeliveryPointId ? Number(selectedDeliveryPointId) : null,
        desiredDeliveryDate: desiredDeliveryDate || null,
        note: orderNote.trim() || null,
        lines: cart.map((c) => ({
          productSku: c.sku,
          unitName: c.selectedUnit,
          quantity: c.quantity
        }))
      });

      // Làm trống giỏ hàng & hiển thị kết quả
      setCart([]);
      setOrderNote('');
      setDesiredDeliveryDate(getMinDeliveryDateString());
      setSuccessOrder(submittedOrder);
      showToast(
        'Gửi đơn hàng thành công',
        `Đơn hàng [${submittedOrder.code || submittedOrder.id}] đã được gửi ở trạng thái Chờ duyệt!`,
        'success',
        6000
      );

      // Cập nhật lại hạn mức công nợ & lịch sử
      fetchPortalCreditStatus().then(setCreditStatus).catch(() => { });
      loadOrderHistory();
    } catch (err: unknown) {
      console.error('Lỗi gửi đơn hàng đại lý:', err);
      showToast('Không thể gửi đơn', err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi đơn hàng', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerPortalLayout
      agency={agency}
      creditStatus={creditStatus}
      cartItemCount={cartTotalCount}
      cartTotalAmount={cartPayableAmount}
      onOpenCart={() => setActiveTab('cart')}
      activeTab={activeTab}
      onChangeTab={(tab) => {
        setViewingDetailOrderId(null);
        setActiveTab(tab);
      }}
    >
      {/* ============================================================== */}
      {/* TRANG RIÊNG CHI TIẾT ĐƠN HÀNG TO RỘNG (ẢNH 1) */}
      {/* ============================================================== */}
      {viewingDetailOrderId ? (
        <CustomerOrderDetailView
          orderId={viewingDetailOrderId}
          onBack={() => {
            setViewingDetailOrderId(null);
            loadOrderHistory();
          }}
          onReorder={(id) => {
            setReorderModalOrderId(id);
            setIsReorderModalOpen(true);
          }}
          onOrderUpdated={loadOrderHistory}
        />
      ) : (
        <>
          {/* ============================================================== */}
          {/* TAB 1: DANH MỤC SẢN PHẨM VÀ ĐẶT HÀNG (CATALOG & ORDERING) */}
          {/* ============================================================== */}
          {/* S4-10: TRƯỜNG HỢP TÀI KHOẢN CHƯA ĐƯỢC GẮN VỚI HỒ SƠ ĐẠI LÝ NÀO */}
          {agencyError && !agency ? (
            <div className="bg-white rounded-3xl border border-rose-200/90 shadow-sm p-6 sm:p-10 max-w-2xl mx-auto my-6 text-center space-y-6 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldAlert size={36} />
              </div>
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                  Chưa Kết Nối Dữ Liệu Đại Lý
                </span>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  Tài Khoản Chưa Được Gán Cho Đại Lý Nào
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-lg mx-auto">
                  Tài khoản <strong className="text-gray-900 font-mono">@{user?.username}</strong> ({user?.fullName || 'Người dùng'}) hiện chưa được liên kết với hồ sơ Đại lý nào trong hệ thống ERP.
                </p>
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 space-y-2 mt-2">
                  <p className="font-bold text-amber-950 flex items-center gap-1.5">
                    <span>💡 Hướng dẫn xử lý:</span>
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5 text-amber-900/90">
                    <li>
                      <strong>Nếu bạn là Quản trị viên / Quản lý kinh doanh:</strong> Truy cập <em>Bán hàng → Hồ sơ đại lý</em>, bấm sửa đại lý cần liên kết và chọn tài khoản này tại mục <em>"Tài Khoản Đăng Nhập Cổng Đại Lý (ROLE_CUSTOMER)"</em>.
                    </li>
                    <li>
                      <strong>Nếu bạn là Khách hàng / Đại lý mới:</strong> Vui lòng liên hệ Hotline hỗ trợ đại lý <strong>1900 6868</strong> hoặc nhân viên kinh doanh phụ trách để kích hoạt liên kết tài khoản.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Phím tắt điều hướng dành cho quản trị viên / nhân viên nội bộ (nếu có quyền) */}
              {currentRole !== 'ROLE_CUSTOMER' && (
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
                  >
                    <Layers size={16} />
                    <span>Về Bàn làm việc ERP</span>
                  </button>

                  {user?.roles?.some((r) => r === 'ROLE_ADMIN' || r === 'ROLE_SALES_MANAGER') && (
                    <button
                      type="button"
                      onClick={() => navigate('/customers')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
                    >
                      <Building2 size={16} />
                      <span>Đến Hồ sơ đại lý để gán</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* CẢNH BÁO PHỤ NẾU CÓ LỖI NHƯNG VẪN CÓ DỮ LIỆU ĐẠI LÝ */}
          {agencyError && agency && (
            <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700 text-sm">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Lưu ý dữ liệu đại lý</div>
                <div className="text-xs mt-0.5 text-rose-600">{agencyError}</div>
              </div>
            </div>
          )}

          {/* CHỈ RENDER NỘI DUNG ĐẶT HÀNG KHI ĐÃ CÓ DỮ LIỆU ĐẠI LÝ */}
          {agency && activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* BANNER 3 CHỈ SỐ TÀI CHÍNH CHIA ĐỀU Ở GIỮA */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 text-gray-900 border border-gray-200/90 shadow-2xs">
                <div className="grid grid-cols-3 divide-x divide-gray-200 text-center">
                  <div className="px-3 sm:px-6">
                    <div className="text-[11px] sm:text-xs uppercase font-bold text-gray-500 tracking-wider">Hạn mức</div>
                    <div className="text-base sm:text-xl font-black font-mono text-gray-900 mt-1">
                      {formatCurrencyVND(creditLimit)}
                    </div>
                  </div>
                  <div className="px-3 sm:px-6">
                    <div className="text-[11px] sm:text-xs uppercase font-bold text-gray-500 tracking-wider">Nợ hiện tại</div>
                    <div className="text-base sm:text-xl font-black font-mono text-rose-600 mt-1">
                      {formatCurrencyVND(currentDebt)}
                    </div>
                  </div>
                  <div className="px-3 sm:px-6">
                    <div className="text-[11px] sm:text-xs uppercase font-bold text-gray-500 tracking-wider">Còn lại</div>
                    <div
                      className={`text-base sm:text-xl font-black font-mono mt-1 ${
                        remainingBeforeOrder < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrencyVND(remainingBeforeOrder)}
                    </div>
                  </div>
                </div>

                {/* Cảnh báo nợ quá hạn nếu có */}
                {hasOverdueDebt && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center justify-center gap-2 text-rose-800 text-xs">
                    <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                    <span>
                      <strong>Cảnh báo tài chính:</strong> Đại lý có khoản nợ quá hạn ({creditStatus?.overdueDays || 30} ngày). Đơn hàng sẽ bị chặn gửi cho đến khi hoàn tất thanh toán.
                    </span>
                  </div>
                )}
              </div>

              {/* BỘ LỌC TÌM KIẾM SẢN PHẨM */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-2">
                  <div className="relative w-full sm:max-w-sm shrink-0">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm sản phẩm theo tên, mã SKU..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                    />
                    {searchKeyword && (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Lọc theo nhóm hàng */}
                  {categoryList.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${selectedCategory === 'ALL'
                          ? 'bg-[#F85606] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        Tất cả
                      </button>
                      {categoryList.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${selectedCategory === cat
                            ? 'bg-[#F85606] text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* LƯỚI DANH MỤC SẢN PHẨM (AC1: CHỈ THẤY SẢN PHẨM VÀ GIÁ THUỘC NHÓM CỦA MÌNH) */}
              {loadingProducts ? (
                <div className="py-20 text-center text-gray-500">
                  <RefreshCw size={28} className="animate-spin text-[#F85606] mx-auto mb-2" />
                  <p className="text-xs font-semibold">Đang tải bảng giá và danh mục sản phẩm cho đại lý...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 space-y-2">
                  <Sparkles size={36} className="mx-auto text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">Không tìm thấy sản phẩm nào</p>
                  <p className="text-xs text-gray-500">
                    Thử thay đổi từ khóa tìm kiếm hoặc chọn nhóm ngành hàng khác.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* THANH TICK NHANH SẢN PHẨM ĐỂ THÊM NHANH */}
                  {paginatedProducts.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allProductsOnPageSelected}
                            onChange={toggleSelectAllProductsOnPage}
                            className="w-4 h-4 rounded text-[#F85606] accent-[#F85606] cursor-pointer"
                          />
                          <span className="text-xs font-bold text-gray-700">
                            Chọn tất cả ({paginatedProducts.length} sản phẩm trên trang này)
                          </span>
                        </label>
                        {selectedProductIds.size > 0 && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#F85606] border border-orange-200">
                            Đã tick: {selectedProductIds.size} sản phẩm
                          </span>
                        )}
                      </div>

                      {selectedProductIds.size > 0 && (
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={clearSelectedProducts}
                            className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer underline mr-1"
                          >
                            Bỏ chọn tất cả
                          </button>
                          <button
                            type="button"
                            onClick={handleAddSelectedProductsToCart}
                            className="px-3.5 py-1.5 rounded-xl bg-[#F85606] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
                            title="Đặt mua ngay các sản phẩm đã tick chọn"
                          >
                            <Send size={13} />
                            <span>Đặt hàng ngay ({selectedProductIds.size} SP)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {paginatedProducts.map((p) => {
                      // Kiểm tra xem sản phẩm này đã có trong giỏ chưa
                      const inCart = cart.filter((c) => c.productId === p.id);
                      const totalInCartQty = inCart.reduce((s, c) => s + c.quantity, 0);

                      return (
                        <ProductCard
                          key={p.id}
                          product={p}
                          inCartCount={totalInCartQty}
                          isSelected={selectedProductIds.has(p.id)}
                          onToggleSelect={toggleSelectProduct}
                          onAddToCart={handleAddToCart}
                          onQuickBuy={handleQuickBuy}
                        />
                      );
                    })}
                  </div>

                  {/* THANH PHÂN TRANG DANH MỤC SẢN PHẨM (ĐỒNG BỘ KIỂU ẢNH 2) */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
                    <div className="text-gray-500">
                      Hiển thị{' '}
                      <strong className="text-gray-800 font-mono">
                        {totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
                      </strong>{' '}
                      -{' '}
                      <strong className="text-gray-800 font-mono">
                        {Math.min(safeCurrentPage * pageSize, totalItems)}
                      </strong>{' '}
                      trên tổng số <strong className="text-[#F85606] font-mono">{totalItems}</strong> sản phẩm
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <span>Hiển thị:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="border border-gray-200 rounded-lg px-2 py-1 bg-white font-semibold text-gray-700 focus:outline-none focus:border-[#F85606] cursor-pointer"
                        >
                          <option value={10}>10 sản phẩm/trang</option>
                          <option value={20}>20 sản phẩm/trang</option>
                          <option value={30}>30 sản phẩm/trang</option>
                          <option value={50}>50 sản phẩm/trang</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(1);
                            window.scrollTo({ top: 380, behavior: 'smooth' });
                          }}
                          disabled={safeCurrentPage <= 1}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          title="Trang đầu"
                        >
                          <ChevronsLeft size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage((p) => Math.max(1, p - 1));
                            window.scrollTo({ top: 380, behavior: 'smooth' });
                          }}
                          disabled={safeCurrentPage <= 1}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          title="Trang trước"
                        >
                          <ChevronLeft size={15} />
                        </button>

                        {pageNumbers.map((p, idx) =>
                          typeof p === 'number' ? (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setCurrentPage(p);
                                window.scrollTo({ top: 380, behavior: 'smooth' });
                              }}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer font-mono ${safeCurrentPage === p
                                  ? 'bg-[#F85606] text-white shadow-xs'
                                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              {p}
                            </button>
                          ) : (
                            <span key={`ellipsis-${idx}`} className="w-5 text-center text-gray-400 font-bold">
                              {p}
                            </span>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage((p) => Math.min(totalPages, p + 1));
                            window.scrollTo({ top: 380, behavior: 'smooth' });
                          }}
                          disabled={safeCurrentPage >= totalPages}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          title="Trang sau"
                        >
                          <ChevronRight size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(totalPages);
                            window.scrollTo({ top: 380, behavior: 'smooth' });
                          }}
                          disabled={safeCurrentPage >= totalPages}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          title="Trang cuối"
                        >
                          <ChevronsRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ĐƠN HÀNG CỦA TÔI (MY ORDERS HISTORY) */}
          {/* ============================================================== */}
          {agency && activeTab === 'history' && (
            <div className="space-y-4">
              {/* BỘ LỌC TỐC ĐỘ CAO (LỌC TRẠNG THÁI + TỪ KHÓA + KHOẢNG NGÀY) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-2xs space-y-3">
                {/* Lọc nhanh theo trạng thái */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {HISTORY_STATUS_TABS.map((tab) => {
                    const isActive = historyStatus === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleHistoryStatusChange(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${isActive
                            ? 'bg-[#F85606] text-white shadow-xs'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Hàng tìm kiếm từ khóa và khoảng ngày */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-1 border-t border-gray-100">
                  {/* Tìm mã đơn */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={historyKeyword}
                      onChange={(e) => handleHistoryKeywordChange(e.target.value)}
                      placeholder="Tìm theo mã đơn hàng (vd: DH2610...)..."
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-[#F85606] transition"
                    />
                    {historyKeyword && (
                      <button
                        type="button"
                        onClick={() => handleHistoryKeywordChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Chọn ngày từ - đến */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-600">
                      <Calendar size={13} className="text-gray-400" />
                      <span className="text-[11px] text-gray-400">Từ:</span>
                      <input
                        type="date"
                        value={historyFromDate}
                        onChange={(e) => handleHistoryFromDateChange(e.target.value)}
                        className="text-xs text-gray-700 bg-transparent focus:outline-none cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-600">
                      <Calendar size={13} className="text-gray-400" />
                      <span className="text-[11px] text-gray-400">Đến:</span>
                      <input
                        type="date"
                        value={historyToDate}
                        onChange={(e) => handleHistoryToDateChange(e.target.value)}
                        className="text-xs text-gray-700 bg-transparent focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Phím tắt chọn ngày nhanh */}
                  <div className="flex items-center gap-1 text-[11px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleQuickDateFilter('today')}
                      className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold cursor-pointer"
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDateFilter('7days')}
                      className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold cursor-pointer"
                    >
                      7 ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDateFilter('30days')}
                      className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold cursor-pointer"
                    >
                      30 ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDateFilter('thisMonth')}
                      className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold cursor-pointer"
                    >
                      Tháng này
                    </button>
                    <button
                      type="button"
                      onClick={loadOrderHistory}
                      disabled={loadingHistory}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold cursor-pointer inline-flex items-center gap-1 sm:ml-auto"
                      title="Làm mới danh sách đơn hàng"
                    >
                      <RefreshCw size={12} className={loadingHistory ? 'animate-spin text-[#F85606]' : ''} />
                      <span>Làm mới</span>
                    </button>
                    {hasActiveHistoryFilters && (
                      <button
                        type="button"
                        onClick={handleResetHistoryFilters}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold cursor-pointer inline-flex items-center gap-1"
                        title="Xóa tất cả bộ lọc tìm kiếm"
                      >
                        <X size={12} />
                        <span>Đặt lại</span>
                      </button>
                    )}
                  </div>
                </div>

                {historyDateError && (
                  <div className="text-xs text-rose-600 font-medium flex items-center gap-1 pt-1">
                    <AlertTriangle size={13} />
                    <span>{historyDateError}</span>
                  </div>
                )}
              </div>

              {/* DANH SÁCH ĐƠN HÀNG */}
              {loadingHistory ? (
                <div className="py-20 text-center text-gray-500">
                  <RefreshCw size={28} className="animate-spin text-[#F85606] mx-auto mb-2" />
                  <p className="text-xs font-semibold">Đang tải lịch sử đơn hàng...</p>
                </div>
              ) : ordersHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 space-y-2">
                  <Clock size={36} className="mx-auto text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">
                    {hasActiveHistoryFilters
                      ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc'
                      : 'Chưa có đơn hàng nào'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {hasActiveHistoryFilters
                      ? 'Vui lòng thử thay đổi từ khóa hoặc điều kiện lọc ngày / trạng thái.'
                      : 'Hãy quay lại danh mục sản phẩm và gửi đơn đặt hàng đầu tiên của bạn!'}
                  </p>
                  {hasActiveHistoryFilters ? (
                    <button
                      type="button"
                      onClick={handleResetHistoryFilters}
                      className="mt-3 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <X size={14} />
                      <span>Xóa bộ lọc</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      className="mt-3 px-4 py-2 rounded-xl bg-[#F85606] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>Đặt hàng ngay</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {ordersHistory.map((o) => (
                    <div
                      key={o.id}
                      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-orange-200 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setViewingDetailOrderId(o.id)}
                            className="font-mono font-black text-sm text-[#F85606] hover:underline cursor-pointer"
                            title="Bấm để xem chi tiết đơn hàng"
                          >
                            {o.code}
                          </button>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1" title="Ngày đặt hàng">
                            <Clock size={13} />
                            {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                          {o.desiredDeliveryDate && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold" title="Ngày giao dự kiến">
                                <Calendar size={12} className="text-blue-600" />
                                <span>Giao dự kiến: {new Date(o.desiredDeliveryDate).toLocaleDateString('vi-VN')}</span>
                              </span>
                            </>
                          )}
                        </div>
                        {/* Gom nhãn cảnh báo giao thiếu hàng và trạng thái đơn vào 1 badge duy nhất */}
                        <div className="flex items-center gap-2">
                          {o.hasShortage ? (
                            <span
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs"
                              title="Đơn hàng được ghi nhận có mặt hàng giao thiếu"
                            >
                              <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                              <span>
                                {o.status === 'DELIVERED'
                                  ? 'Đã giao hàng (Thiếu hàng)'
                                  : `${STATUS_VI_TRANSLATIONS[o.status] || o.status} (Thiếu hàng)`}
                              </span>
                            </span>
                          ) : (
                            renderStatusBadge(o.status)
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Số mặt hàng</span>
                          <span className="font-bold text-gray-800">{o.lineCount} SKU</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Ngày giao dự kiến</span>
                          <span className="font-semibold text-gray-800 flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            <span>{o.desiredDeliveryDate ? new Date(o.desiredDeliveryDate).toLocaleDateString('vi-VN') : 'Chưa xếp lịch'}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Tổng giá trị</span>
                          <span className="font-black text-[#F85606] font-mono">
                            {formatCurrencyVND(o.totalAmount)}
                          </span>
                        </div>
                        <div className="text-right flex items-center justify-end gap-2">
                          {/* S5-02: Nút Mua lại đơn cũ - chỉ áp dụng khi đơn đã giao xong hoặc hoàn tất */}
                          {['DELIVERED', 'CLOSED', 'COMPLETED'].includes(o.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                setReorderModalOrderId(o.id);
                                setIsReorderModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F85606] border border-orange-200 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                              title="Đặt lại các mặt hàng trong đơn này"
                            >
                              <RotateCcw size={13} />
                              <span>Mua lại</span>
                            </button>
                          )}

                          {/* Chi tiết đơn */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingDetailOrderId(o.id);
                            }}
                            className="p-1.5 sm:p-2 rounded-xl border border-gray-200 bg-white hover:bg-orange-50 hover:border-orange-300 text-gray-600 hover:text-[#F85606] transition cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center"
                            title="Xem chi tiết đơn hàng"
                            aria-label="Xem chi tiết đơn hàng"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PHÂN TRANG DANH SÁCH ĐƠN HÀNG ĐÃ ĐẶT */}
              {!loadingHistory && historyTotalElements > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="text-gray-500">
                    Hiển thị{' '}
                    <strong className="text-gray-800">
                      {historyTotalElements === 0 ? 0 : historyPage * historyPageSize + 1}
                    </strong>{' '}
                    -{' '}
                    <strong className="text-gray-800">
                      {Math.min((historyPage + 1) * historyPageSize, historyTotalElements)}
                    </strong>{' '}
                    trên tổng số <strong className="text-[#F85606]">{historyTotalElements}</strong> đơn hàng
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span>Hiển thị:</span>
                      <select
                        value={historyPageSize}
                        onChange={(e) => {
                          setHistoryPageSize(Number(e.target.value));
                          setHistoryPage(0);
                        }}
                        className="border border-gray-200 rounded-lg px-2 py-1 bg-white font-semibold text-gray-700 focus:outline-none focus:border-[#F85606] cursor-pointer"
                      >
                        <option value={10}>10 đơn/trang</option>
                        <option value={20}>20 đơn/trang</option>
                        <option value={30}>30 đơn/trang</option>
                        <option value={50}>50 đơn/trang</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryPage(0);
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={historyPage === 0}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Trang đầu"
                      >
                        <ChevronsLeft size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryPage((p) => Math.max(0, p - 1));
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={historyPage === 0}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Trang trước"
                      >
                        <ChevronLeft size={15} />
                      </button>

                      {historyPageNumbers.map((p, idx) =>
                        typeof p === 'number' ? (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setHistoryPage(p - 1);
                              window.scrollTo({ top: 380, behavior: 'smooth' });
                            }}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${historyPage === p - 1
                                ? 'bg-[#F85606] text-white shadow-xs'
                                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={idx} className="w-5 text-center text-gray-400">
                            {p}
                          </span>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setHistoryPage((p) => Math.min(historyTotalPages - 1, p + 1));
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={historyPage >= historyTotalPages - 1}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Trang sau"
                      >
                        <ChevronRight size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryPage(historyTotalPages - 1);
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={historyPage >= historyTotalPages - 1}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Trang cuối"
                      >
                        <ChevronsRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CÔNG NỢ & HOÁ ĐƠN ĐẠI LÝ */}
          {/* ============================================================== */}
          {agency && activeTab === 'debt' && (
            <CustomerDebtPortalView />
          )}

          {/* ============================================================== */}
          {/* TAB 4: TRANG GIỎ HÀNG & XÁC NHẬN ĐẶT HÀNG RIÊNG BIỆT VÀ TO (ẢNH 1) */}
          {/* ============================================================== */}
          {agency && activeTab === 'cart' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {cart.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200 p-12 sm:p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                  <div className="w-20 h-20 rounded-3xl bg-orange-50 text-[#F85606] flex items-center justify-center mx-auto shadow-inner">
                    <ShoppingCart size={40} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-gray-900">
                      Giỏ hàng của đại lý đang trống
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Quý đại lý chưa chọn sản phẩm nào. Hãy quay lại danh mục sản phẩm để bắt đầu đặt hàng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="px-5 py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-orange-500/25 transition cursor-pointer active:scale-95"
                  >
                    <Sparkles size={16} />
                    <span>Khám phá danh mục sản phẩm ngay</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* CỘT TRÁI: BẢNG SẢN PHẨM RỘNG RÃI */}
                  <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                        <button
                          type="button"
                          onClick={() => setCart([])}
                          className="text-xs text-gray-400 hover:text-rose-600 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          title="Xóa toàn bộ các món trong giỏ hàng"
                        >
                          <Trash2 size={15} />
                          <span>Xóa sạch giỏ hàng</span>
                        </button>
                        <span className="text-xs text-gray-500">
                          Tổng số lượng: <strong className="text-gray-900 font-mono">{cartTotalCount}</strong>
                        </span>
                      </div>

                      <div className="p-4 divide-y divide-gray-100 space-y-4">
                        {cart.map((item, idx) => {
                          const previewLine = cartPreview?.lines?.find(
                            (l) => l.productSku === item.sku && l.unitName === item.selectedUnit
                          );
                          return (
                            <div key={`${item.productId}-${item.selectedUnit}`} className="pt-4 first:pt-0">
                              <PortalCartItemRow
                                item={item}
                                index={idx}
                                previewLine={previewLine}
                                onUpdateQuantity={handleUpdateCartQuantity}
                                onRemoveItem={handleRemoveCartItem}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('catalog')}
                        className="text-[#F85606] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft size={14} />
                        <span>Chọn thêm mặt hàng khác</span>
                      </button>
                    </div>
                  </div>

                  {/* CỘT PHẢI: THÔNG TIN GIAO HÀNG & TÀI CHÍNH CHỐT ĐƠN */}
                  <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-4">
                    {/* Khối Điểm nhận hàng & Ghi chú */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
                      <h3 className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-2">
                        <MapPin size={15} className="text-[#F85606]" />
                        <span>Thông tin nhận hàng</span>
                      </h3>

                      {/* Điểm nhận hàng */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                          Địa điểm giao hàng
                        </label>
                        {deliveryPoints.length > 0 ? (
                          <SearchSelect
                            value={selectedDeliveryPointId}
                            onChange={(e) => setSelectedDeliveryPointId(e.target.value)}
                            className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          >
                            {deliveryPoints.map((pt) => (
                              <option key={pt.id} value={pt.id}>
                                {pt.name} — {pt.address}
                              </option>
                            ))}
                          </SearchSelect>
                        ) : (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                            {agency?.address || 'Giao theo địa chỉ mặc định trong hồ sơ đại lý'}
                          </div>
                        )}
                      </div>

                      {/* Ngày mong muốn nhận hàng */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-[#F85606]" />
                            <span>Ngày nhận hàng mong muốn <span className="text-rose-500">*</span></span>
                          </span>
                        </label>
                        <input
                          type="date"
                          min={minDeliveryDate}
                          value={desiredDeliveryDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && val < minDeliveryDate) {
                              showToast('Thời gian nhận quá gấp', `Kho cần tối thiểu 24h-48h để điều phối. Vui lòng chọn ngày từ ${formatDateVN(minDeliveryDate)} trở đi!`, 'info', 3000);
                              setDesiredDeliveryDate(minDeliveryDate);
                            } else {
                              setDesiredDeliveryDate(val);
                            }
                          }}
                          className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-gray-800"
                        />
                      </div>

                      {/* Ghi chú đơn */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                          Ghi chú đơn hàng (Thời gian giao, lưu ý bốc xếp)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ví dụ: Giao trước 10h sáng, liên hệ thủ kho trước khi tới..."
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                        />
                      </div>
                    </div>

                    {/* Khối Tóm tắt thanh toán & Hạn mức tín dụng */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-3">
                      <h3 className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                        Thanh toán & Hạn mức
                      </h3>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-gray-600">
                          <span>Tổng tiền hàng tạm tính:</span>
                          <span className="font-mono font-bold text-gray-900">
                            {formatCurrencyVND(cartGrossAmount)}
                          </span>
                        </div>

                        {discountTotal > 0 && (
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              <span>Chiết khấu sản lượng:</span>
                            </span>
                            <span className="font-mono font-bold">
                              -{formatCurrencyVND(discountTotal)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-gray-900 font-bold pt-1 border-t border-gray-100">
                          <span className="flex items-center gap-1.5 text-sm">
                            <span>Tổng thanh toán thực tế:</span>
                            {loadingPreview && <RefreshCw size={12} className="animate-spin text-orange-500" />}
                          </span>
                          <span className="font-black font-mono text-[#F85606] text-base">
                            {formatCurrencyVND(cartPayableAmount)}
                          </span>
                        </div>

                        <div className="h-px bg-gray-100 my-1" />

                        <div className="flex justify-between text-gray-500">
                          <span>Hạn mức tín dụng:</span>
                          <span className="font-bold font-mono text-gray-800">
                            {formatCurrencyVND(creditLimit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Nợ hiện tại:</span>
                          <span className="font-bold font-mono text-rose-600">
                            {formatCurrencyVND(currentDebt)}
                          </span>
                        </div>

                        <div className="h-px bg-gray-100 my-1" />
                        <div className="flex justify-between text-gray-900 font-bold">
                          <span>Công nợ còn lại sau đơn này:</span>
                          <span
                            className={`font-black font-mono text-sm ${remainingAfterOrder < 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                          >
                            {formatCurrencyVND(remainingAfterOrder)}
                          </span>
                        </div>
                      </div>

                      {/* Nút gửi đơn hàng */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSubmitCustomerOrder}
                          disabled={cart.length === 0 || isSubmitting || hasOverdueDebt}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-500 hover:from-orange-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition cursor-pointer active:scale-98"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" />
                              <span>Đang gửi đơn hàng lên hệ thống...</span>
                            </>
                          ) : (
                            <>
                              <Send size={18} />
                              <span>GỬI ĐƠN HÀNG</span>
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                          * Đơn hàng gửi lên sẽ ở trạng thái <strong>Chờ duyệt</strong> để NVKD phụ trách xác nhận.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}




      {/* ============================================================== */}
      {/* 5. MODAL CHÚC MỪNG GỬI ĐƠN HÀNG THÀNH CÔNG (AC3) */}
      {/* ============================================================== */}
      {successOrder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase mb-1">
                Trạng thái: Chờ duyệt
              </span>
              <h3 className="text-lg font-black text-gray-900">
                Gửi Đơn Hàng Thành Công!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Mã đơn hàng của quý đại lý là:
              </p>
              <div className="font-mono text-xl font-black text-[#F85606] mt-1 bg-orange-50 py-1 px-3 rounded-xl border border-orange-200 inline-block">
                {successOrder.code || successOrder.id}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 text-left text-xs space-y-1.5 text-gray-600 border border-gray-100">
              <div className="flex justify-between">
                <span>Số dòng hàng:</span>
                <span className="font-bold text-gray-800">{successOrder.lines?.length || 0} SKU</span>
              </div>
              <div className="flex justify-between">
                <span>Ngày mong muốn nhận:</span>
                <span className="font-bold text-gray-900 font-mono">
                  {formatDateVN(desiredDeliveryDate) || 'Theo kế hoạch'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tổng tiền hàng:</span>
                <span className="font-black text-gray-900 font-mono">
                  {formatCurrencyVND(successOrder.totalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200">
                Nhân viên kinh doanh phụ trách địa bàn sẽ liên hệ xác nhận và tiến hành giữ chỗ kho cho quý khách.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessOrder(null);
                  setActiveTab('history');
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Xem lịch sử đơn
              </button>
              <button
                type="button"
                onClick={() => setSuccessOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F85606] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
              >
                Tiếp tục đặt hàng
              </button>
            </div>
          </div>
        </div>
      )}



      {/* S5-02: MODAL MUA LẠI ĐƠN HÀNG CŨ & UI CẢNH BÁO MẶT HÀNG NGỪNG KINH DOANH */}
      <CustomerReorderModal
        isOpen={isReorderModalOpen}
        orderId={reorderModalOrderId}
        agencyId={agency?.id || null}
        onClose={() => {
          setIsReorderModalOpen(false);
          setReorderModalOrderId(null);
        }}
        onConfirmReorder={handleConfirmReorder}
      />
    </CustomerPortalLayout>
  );
};

// ==============================================================
// SUB-COMPONENT: THẺ SẢN PHẨM TRỰC QUAN (PRODUCT CARD)
// ==============================================================
interface ProductCardProps {
  product: OrderProductCatalogItem;
  inCartCount: number;
  isSelected?: boolean;
  onToggleSelect?: (productId: string) => void;
  onAddToCart: (product: OrderProductCatalogItem, unitName?: string, qty?: number) => void;
  onQuickBuy?: (product: OrderProductCatalogItem, unitName?: string, qty?: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  inCartCount,
  isSelected = false,
  onToggleSelect,
  onAddToCart,
  onQuickBuy
}) => {
  const [selectedUnitName, setSelectedUnitName] = useState<string>(() => {
    return product.availableUnits[0]?.unitName || product.baseUnit;
  });
  // Số lượng gõ tự do (giống OrderItemRow bên NVKD)
  const [qtyText, setQtyText] = useState<string>('1');

  const currentUnit =
    product.availableUnits.find((u) => u.unitName === selectedUnitName) ||
    product.availableUnits[0];
  const factor = currentUnit?.conversionFactor || 1;
  const currentPrice = product.basePrice * factor;

  const { showToast } = useAuth();
  const isOutOfStock = (product.availableStock ?? 0) <= 0;

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isOutOfStock) return;
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setQtyText(raw);
  };

  const handleQtyBlur = () => {
    if (isOutOfStock) return;
    // Nếu là "0" hoặc chuỗi rỗng thì giữ "0" (không tự ép thành 1 để tránh lỗi khi bấm +)
    if (qtyText === '' || parseInt(qtyText, 10) === 0) {
      setQtyText('0');
    } else {
      const num = parseInt(qtyText, 10);
      setQtyText(String(num));
    }
  };

  const handleDecrease = () => {
    if (isOutOfStock) return;
    const num = parseInt(qtyText, 10);
    const current = isNaN(num) ? 0 : num;
    const next = Math.max(0, current - 1);
    setQtyText(String(next));
  };

  const handleIncrease = () => {
    if (isOutOfStock) return;
    const num = parseInt(qtyText, 10);
    const current = isNaN(num) ? 0 : num;
    const next = current + 1;
    setQtyText(String(next));
  };

  const handleAdd = () => {
    if (isOutOfStock) {
      showToast(
        'Sản phẩm tạm hết hàng',
        `Sản phẩm [${product.sku}] ${product.name} hiện đang tạm hết tồn kho, không thể thêm vào giỏ hàng!`,
        'error',
        3000
      );
      return;
    }
    const num = parseInt(qtyText, 10);
    if (isNaN(num) || num <= 0) {
      showToast('Số lượng chưa hợp lệ', 'Vui lòng chọn số lượng từ 1 trở lên để thêm vào giỏ', 'info', 2500);
      return;
    }
    onAddToCart(product, selectedUnitName, num);
    setQtyText('1');
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3 group ${
        isOutOfStock
          ? 'bg-gray-50/70 border-gray-200'
          : isSelected
          ? 'border-orange-400 bg-orange-50/25 ring-2 ring-orange-200'
          : 'bg-white border-gray-200 hover:border-orange-300'
        }`}
    >
      <div>
        {/* Header thẻ: Checkbox tick chọn, SKU & Tồn kho */}
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              disabled={isOutOfStock}
              onChange={(e) => {
                e.stopPropagation();
                if (isOutOfStock) {
                  showToast(
                    'Sản phẩm tạm hết hàng',
                    `Sản phẩm [${product.sku}] đã hết hàng trong kho, không thể chọn đặt mua!`,
                    'error',
                    2500
                  );
                  return;
                }
                onToggleSelect?.(product.id);
              }}
              className={`w-4 h-4 rounded text-[#F85606] accent-[#F85606] ${
                isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={isOutOfStock ? `Sản phẩm ${product.name} đã hết hàng` : `Tick chọn ${product.name} để thêm nhanh`}
            />
            <span className="font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              {product.sku}
            </span>
          </div>
          <span
            className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
              !isOutOfStock
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {!isOutOfStock ? `Tồn: ${formatQuantity(product.availableStock ?? 0)} ${product.baseUnit}` : 'Tạm hết'}
          </span>
        </div>

        {/* Tên sản phẩm */}
        <h3 className={`font-bold text-sm transition line-clamp-2 leading-snug ${
          isOutOfStock ? 'text-gray-500' : 'text-gray-900 group-hover:text-[#F85606]'
        }`}>
          {product.name}
        </h3>

        {/* Bảng giá đại lý áp dụng theo nhóm khách hàng (AC1) */}
        <div className="mt-2.5">
          <span className="text-[11px] text-gray-400 font-medium block">Giá đại lý B2B:</span>
          <div className={`font-black text-base font-mono ${isOutOfStock ? 'text-gray-400' : 'text-[#F85606]'}`}>
            {formatCurrencyVND(currentPrice)}
            <span className="text-xs font-semibold text-gray-500 ml-1">/ {selectedUnitName}</span>
          </div>
        </div>

        {/* Chọn đơn vị tính nếu có nhiều đơn vị (Thùng, Lốc, Lon) */}
        {product.availableUnits.length > 1 && (
          <div className="mt-2.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
              Đơn vị đóng gói:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {product.availableUnits.map((u) => (
                <button
                  key={u.unitName}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => setSelectedUnitName(u.unitName)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    isOutOfStock
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : selectedUnitName === u.unitName
                      ? 'bg-orange-100 text-[#F85606] border border-orange-300 cursor-pointer'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {u.unitName} (x{u.conversionFactor})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hành động: Số lượng cho nhập tự do & Nút Đặt ngay / Thêm vào giỏ */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
        {/* Bộ tăng giảm số lượng với ô input cho nhập tự do */}
        <div
          className={`flex items-center border rounded-xl overflow-hidden transition-all shrink-0 ${
            isOutOfStock
              ? 'border-gray-200 bg-gray-100 opacity-60'
              : 'border-gray-200 bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20'
          }`}
        >
          <button
            type="button"
            disabled={isOutOfStock}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDecrease}
            className={`w-7 h-8 flex items-center justify-center transition ${
              isOutOfStock
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200 cursor-pointer'
            }`}
            title="Giảm 1"
          >
            <Minus size={12} />
          </button>
          <NumberInput
            disabled={isOutOfStock}
            value={isOutOfStock ? '0' : qtyText}
            onChange={handleQtyChange}
            onBlur={handleQtyBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            className={`w-9 h-8 text-center font-bold text-xs bg-transparent outline-none font-mono ${
              isOutOfStock ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900'
            }`}
            title={isOutOfStock ? 'Sản phẩm tạm hết hàng' : 'Nhập số lượng tự do'}
          />
          <button
            type="button"
            disabled={isOutOfStock}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleIncrease}
            className={`w-7 h-8 flex items-center justify-center transition ${
              isOutOfStock
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200 cursor-pointer'
            }`}
            title="Tăng 1"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Nút thêm giỏ (icon nhỏ) */}
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAdd}
          title={isOutOfStock ? 'Sản phẩm tạm hết hàng' : 'Thêm vào giỏ hàng'}
          className={`h-8 px-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition shrink-0 ${
            isOutOfStock
              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60 select-none shadow-none pointer-events-none'
              : 'border-orange-200 bg-orange-50/80 hover:bg-orange-100 text-[#F85606] cursor-pointer active:scale-95'
          }`}
          id={`add-btn-${product.sku}`}
        >
          <ShoppingCart size={14} className={isOutOfStock ? 'text-gray-400' : 'text-[#F85606]'} />
          <span className="hidden xl:inline text-[11px]">Thêm</span>
          {inCartCount > 0 && (
            <span className={`${isOutOfStock ? 'bg-gray-400 text-white' : 'bg-[#F85606] text-white'} px-1.5 py-0.2 rounded-full text-[9px] font-black`}>
              {inCartCount}
            </span>
          )}
        </button>

        {/* Nút đặt ngay (Mở ngay giỏ/đơn để gửi luôn - AC) */}
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={() => {
            if (isOutOfStock) return;
            const num = parseInt(qtyText, 10);
            if (isNaN(num) || num <= 0) {
              showToast('Số lượng chưa hợp lệ', 'Vui lòng chọn số lượng từ 1 trở lên để đặt hàng', 'info', 2500);
              return;
            }
            if (onQuickBuy) {
              onQuickBuy(product, selectedUnitName, num);
            } else {
              onAddToCart(product, selectedUnitName, num);
            }
          }}
          className={`flex-1 h-8 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap ${
            isOutOfStock
              ? 'bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed shadow-none opacity-70 select-none pointer-events-none'
              : 'bg-[#F85606] hover:bg-orange-600 active:scale-95 text-white shadow-md shadow-orange-500/20 cursor-pointer'
          }`}
          id={`quick-buy-btn-${product.sku}`}
          title={isOutOfStock ? 'Sản phẩm tạm hết hàng' : 'Đặt mua sản phẩm này ngay'}
        >
          {isOutOfStock ? (
            <span className="text-gray-500 font-semibold">Tạm hết hàng</span>
          ) : (
            <>
              <Send size={12} />
              <span>Đặt ngay</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ==============================================================
// SUB-COMPONENT: DÒNG MẶT HÀNG TRONG GIỎ HÀNG (PORTAL CART ITEM ROW)
// ==============================================================
interface PortalCartItemRowProps {
  item: CartItem;
  index: number;
  previewLine?: PortalOrderLine;
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
}

const PortalCartItemRow: React.FC<PortalCartItemRowProps> = ({
  item,
  index,
  previewLine,
  onUpdateQuantity,
  onRemoveItem
}) => {
  const [localQtyText, setLocalQtyText] = useState<string>(() => String(item.quantity));

  useEffect(() => {
    setLocalQtyText(String(item.quantity));
  }, [item.quantity]);

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setLocalQtyText(raw);

    if (raw !== '') {
      const num = parseInt(raw, 10);
      onUpdateQuantity(index, isNaN(num) ? 0 : num);
    }
  };

  const handleQtyBlur = () => {
    if (localQtyText === '' || parseInt(localQtyText, 10) === 0) {
      setLocalQtyText('0');
      onUpdateQuantity(index, 0);
    } else {
      const num = parseInt(localQtyText, 10);
      setLocalQtyText(String(num));
      onUpdateQuantity(index, num);
    }
  };

  const handleDecrease = () => {
    const num = parseInt(localQtyText, 10);
    const current = isNaN(num) ? 0 : num;
    if (current <= 1) {
      onRemoveItem(index);
    } else {
      const next = current - 1;
      setLocalQtyText(String(next));
      onUpdateQuantity(index, next);
    }
  };

  const handleIncrease = () => {
    const num = parseInt(localQtyText, 10);
    const current = isNaN(num) ? 0 : num;
    const next = current + 1;
    setLocalQtyText(String(next));
    onUpdateQuantity(index, next);
  };

  const hasDiscount = Boolean(previewLine && previewLine.discountAmount && previewLine.discountAmount > 0);

  return (
    <div className="pt-3 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-xs text-gray-900 leading-snug line-clamp-2">
            {item.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 font-medium">
            <span className="font-mono text-gray-400">{item.sku}</span>
            <span>•</span>
            <span className="font-bold text-orange-600">{item.selectedUnit}</span>
            <span>•</span>
            <span className="font-mono font-bold text-gray-700">
              {formatCurrencyVND(item.unitPrice)}
            </span>
          </div>
        </div>

        {/* Nút xóa */}
        <button
          type="button"
          onClick={() => onRemoveItem(index)}
          className="text-gray-400 hover:text-rose-600 p-1 transition cursor-pointer shrink-0"
          title="Xóa khỏi giỏ"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Bộ điều khiển số lượng (cho nhập tự do) và thành tiền */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDecrease}
            className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition cursor-pointer"
            title={item.quantity <= 1 ? 'Xóa khỏi giỏ' : 'Giảm 1'}
          >
            <Minus size={13} />
          </button>
          <NumberInput
            value={localQtyText}
            onChange={handleQtyChange}
            onBlur={handleQtyBlur}
            className="w-12 py-1 text-center font-bold text-xs text-gray-800 bg-transparent outline-none font-mono"
            title="Nhập số lượng tự do"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleIncrease}
            className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition cursor-pointer"
            title="Tăng 1"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="text-right">
          {hasDiscount && previewLine ? (
            <div>
              <div className="text-[10px] text-gray-400 line-through font-mono">
                {formatCurrencyVND(previewLine.grossAmount || item.quantity * item.unitPrice)}
              </div>
              <div className="font-black text-xs sm:text-sm font-mono text-[#F85606]">
                {formatCurrencyVND(previewLine.netAmount)}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">
                🎯 -{formatCurrencyVND(previewLine.discountAmount || 0)}
              </div>
            </div>
          ) : (
            <div className="font-black text-xs sm:text-sm font-mono text-[#F85606]">
              {formatCurrencyVND(item.quantity * item.unitPrice)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// HELPER: BADGE TRẠNG THÁI ĐƠN HÀNG BẰNG TIẾNG VIỆT
// ==============================================================
// Bản đồ dịch dự phòng cho các mã trạng thái đơn hàng sang Tiếng Việt
const STATUS_VI_TRANSLATIONS: Record<string, string> = {
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PICKING: 'Đang soạn hàng',
  DISPATCHED: 'Đã xuất kho',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn thành',
  CLOSED: 'Đã hoàn tất',
  DRAFT: 'Đơn nháp',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao hàng',
  DELIVERING: 'Đang giao hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  PROCESSING: 'Đang xử lý'
};

function renderStatusBadge(status: string) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1 border border-amber-200">
          <Clock size={12} />
          <span>Chờ duyệt</span>
        </span>
      );
    case 'APPROVED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1 border border-emerald-200">
          <CheckCircle2 size={12} />
          <span>Đã duyệt</span>
        </span>
      );
    case 'PICKING':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 inline-flex items-center gap-1 border border-blue-200">
          <span>Đang soạn hàng</span>
        </span>
      );
    case 'DISPATCHED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 inline-flex items-center gap-1 border border-indigo-200">
          <span>Đã xuất kho</span>
        </span>
      );
    case 'DELIVERED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 inline-flex items-center gap-1 border border-teal-200">
          <CheckCircle2 size={12} />
          <span>Đã giao hàng</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1 border border-emerald-200">
          <CheckCircle2 size={12} />
          <span>Hoàn thành</span>
        </span>
      );
    case 'CLOSED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 inline-flex items-center gap-1 border border-slate-200">
          <CheckCircle2 size={12} />
          <span>Đã hoàn tất</span>
        </span>
      );
    case 'DRAFT':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 inline-flex items-center gap-1 border border-gray-200">
          <span>Đơn nháp</span>
        </span>
      );
    case 'SHIPPING':
    case 'DELIVERING':
    case 'IN_TRANSIT':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 inline-flex items-center gap-1 border border-sky-200">
          <span>Đang giao hàng</span>
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1 border border-emerald-200">
          <CheckCircle2 size={12} />
          <span>Đã xác nhận</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1 border border-rose-200">
          <span>Từ chối</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 inline-flex items-center gap-1 border border-gray-200">
          <span>Đã hủy</span>
        </span>
      );
    default: {
      const viLabel = STATUS_VI_TRANSLATIONS[status] || status;
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
          {viLabel}
        </span>
      );
    }
  }
}
