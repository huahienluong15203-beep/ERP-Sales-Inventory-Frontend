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
  ChevronsRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import { CustomerPortalLayout } from '../../layouts/CustomerPortalLayout';
import type { Agency, DeliveryPoint, CreditStatusResponse } from '../../types/agency';
import type { OrderSummaryItem } from '../../types/order';
import type { OrderProductCatalogItem } from '../../services/orderService';
import { formatCurrencyVND, formatQuantity, fetchOrders } from '../../services/orderService';
import {
  fetchPortalMe,
  fetchPortalProducts,
  fetchPortalCreditStatus,
  fetchPortalDeliveryPoints,
  previewPortalOrder,
  placePortalOrder,
  type PortalOrderResult,
  type PortalOrderLine
} from '../../services/portalApi';
import { OrderDetailModal } from '../../components/order/OrderDetailModal';
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

export const CustomerOrderPortalPage: React.FC = () => {
  const { user, currentRole, showToast } = useAuth();
  const navigate = useNavigate();

  // Tab: 'catalog' (Đặt hàng) hoặc 'history' (Đơn hàng của tôi)
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');

  // Thông tin đại lý hiện tại
  const [agency, setAgency] = useState<Agency | null>(null);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
  const [selectedDeliveryPointId, setSelectedDeliveryPointId] = useState<number | string>('');
  const [orderNote, setOrderNote] = useState<string>('');
  const [creditStatus, setCreditStatus] = useState<CreditStatusResponse | null>(null);

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

  // Giỏ hàng
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartPreview, setCartPreview] = useState<PortalOrderResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal thông báo đặt hàng thành công
  const [successOrder, setSuccessOrder] = useState<PortalOrderResult | null>(null);
  // Lỗi tải thông tin đại lý (vd: tài khoản chưa được gắn với đại lý nào)
  const [agencyError, setAgencyError] = useState<string | null>(null);

  // Lịch sử đơn hàng của đại lý
  const [ordersHistory, setOrdersHistory] = useState<OrderSummaryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // S5-02: Modal mua lại đơn cũ & UI cảnh báo
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

    setIsCartDrawerOpen(true);
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

  // 3. TẢI LỊCH SỬ ĐƠN HÀNG CỦA ĐẠI LÝ (Tab History)
  const loadOrderHistory = useCallback(async () => {
    if (!agency?.id) return;
    setLoadingHistory(true);
    try {
      const res = await fetchOrders({
        customerId: String(agency.id),
        page: 0,
        size: 30
      });
      setOrdersHistory(res.content || []);
    } catch (err) {
      console.error('Lỗi tải lịch sử đơn hàng của đại lý:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [agency?.id]);

  useEffect(() => {
    if (activeTab === 'history' && agency?.id) {
      loadOrderHistory();
    }
  }, [activeTab, agency?.id, loadOrderHistory]);

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

  // THAO TÁC GIỎ HÀNG
  const handleAddToCart = (product: OrderProductCatalogItem, unitName?: string, qtyToAdd: number = 1) => {
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
  }, [cart, selectedDeliveryPointId, orderNote]);

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
  const isOverCreditLimit = remainingAfterOrder < 0;
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

    setIsSubmitting(true);
    try {
      // S4-10: POST /api/portal/orders – chỉ gửi SKU / ĐVT / số lượng; Backend tính giá theo bảng giá hiện hành,
      // kiểm tồn, hạn mức và luôn đưa đơn về trạng thái Chờ duyệt (AC3) để nhân viên phụ trách xác nhận.
      const submittedOrder = await placePortalOrder({
        deliveryAddressId: selectedDeliveryPointId ? Number(selectedDeliveryPointId) : null,
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
      setIsCartDrawerOpen(false);
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
      onOpenCart={() => setIsCartDrawerOpen(true)}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
    >
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
          {(currentRole !== 'ROLE_CUSTOMER' || (user?.roles && user.roles.some((r) => r !== 'ROLE_CUSTOMER'))) && (
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
          {/* BANNER THÔNG TIN ĐẠI LÝ & TÀI CHÍNH TRÊN ĐẦU TRANG */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 rounded-2xl p-4 sm:p-6 text-white shadow-lg shadow-orange-500/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider">
                    {agency?.customerGroupName || 'Đại Lý Cấp 1'}
                  </span>
                  <span className="text-orange-100 text-xs font-mono font-medium">
                    Mã ĐL: {agency?.code || '—'}
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                  {agency?.name || 'Đại Lý Phân Phối'}
                </h1>
                <p className="text-orange-100 text-xs mt-1 flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0" />
                  <span className="truncate">{agency?.address || '—'}</span>
                </p>
              </div>

              {/* Bảng chỉ số công nợ trực quan (AC2) */}
              <div className="grid grid-cols-3 gap-2 bg-black/15 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center sm:text-right sm:min-w-[340px]">
                <div>
                  <div className="text-[10px] uppercase font-bold text-orange-200">Hạn mức</div>
                  <div className="text-xs sm:text-sm font-black font-mono mt-0.5">
                    {formatCurrencyVND(creditLimit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-orange-200">Nợ hiện tại</div>
                  <div className="text-xs sm:text-sm font-black font-mono text-rose-200 mt-0.5">
                    {formatCurrencyVND(currentDebt)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-300">Còn lại</div>
                  <div className="text-xs sm:text-sm font-black font-mono text-emerald-300 mt-0.5">
                    {formatCurrencyVND(remainingBeforeOrder)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cảnh báo nợ quá hạn nếu có */}
            {hasOverdueDebt && (
              <div className="mt-3 bg-rose-900/90 border border-rose-300/30 rounded-xl p-2.5 flex items-center gap-2 text-rose-100 text-xs">
                <ShieldAlert size={16} className="text-rose-300 shrink-0" />
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
                      onAddToCart={handleAddToCart}
                    />
                  );
                })}
              </div>

              {/* THANH PHÂN TRANG DANH MỤC SẢN PHẨM (30-50 SẢN PHẨM/TRANG) */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Thông tin số lượng & Chọn cỡ trang */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-600">
                  <span>
                    Hiển thị{' '}
                    <strong className="text-gray-900 font-bold font-mono">
                      {totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
                    </strong>
                    {' - '}
                    <strong className="text-gray-900 font-bold font-mono">
                      {Math.min(safeCurrentPage * pageSize, totalItems)}
                    </strong>
                    {' trên tổng số '}
                    <strong className="text-[#F85606] font-bold font-mono">{totalItems}</strong> sản phẩm
                  </span>

                  <span className="text-gray-300 hidden sm:inline">|</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-[11px]">Hiển thị:</span>
                    <SearchSelect
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold bg-gray-50 text-gray-700 focus:bg-white focus:border-[#F85606] outline-none cursor-pointer"
                    >
                      <option value={30}>30 / trang</option>
                      <option value={40}>40 / trang</option>
                      <option value={50}>50 / trang</option>
                    </SearchSelect>
                  </div>
                </div>

                {/* Các nút chuyển trang */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage(1);
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      disabled={safeCurrentPage === 1}
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
                      disabled={safeCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Trang trước"
                    >
                      <ChevronLeft size={15} />
                    </button>

                    <div className="flex items-center gap-1 mx-1">
                      {pageNumbers.map((p, idx) =>
                        typeof p === 'number' ? (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setCurrentPage(p);
                              window.scrollTo({ top: 380, behavior: 'smooth' });
                            }}
                            className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer font-mono ${
                              safeCurrentPage === p
                                ? 'bg-[#F85606] text-white shadow-xs'
                                : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                            }`}
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs font-bold">
                            ...
                          </span>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      disabled={safeCurrentPage === totalPages}
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
                      disabled={safeCurrentPage === totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Trang cuối"
                    >
                      <ChevronsRight size={15} />
                    </button>
                  </div>
                )}
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
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              Đơn Hàng Đã Gửi Của Đại Lý
            </h2>
            <button
              type="button"
              onClick={loadOrderHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Làm mới</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-20 text-center text-gray-500">
              <RefreshCw size={28} className="animate-spin text-[#F85606] mx-auto mb-2" />
              <p className="text-xs font-semibold">Đang tải lịch sử đơn hàng...</p>
            </div>
          ) : ordersHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 space-y-2">
              <Clock size={36} className="mx-auto text-gray-300" />
              <p className="text-sm font-bold text-gray-700">Chưa có đơn hàng nào</p>
              <p className="text-xs text-gray-500">
                Hãy quay lại danh mục sản phẩm và gửi đơn đặt hàng đầu tiên của bạn!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#F85606] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Đặt hàng ngay</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {ordersHistory.map((o) => (
                <div
                  key={o.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-orange-200 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-[#F85606]">
                        {o.code}
                      </span>
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
                    <div className="flex items-center gap-2">
                      {o.hasShortage && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1" title="Đơn hàng được ghi nhận có mặt hàng giao thiếu">
                          <AlertTriangle size={12} className="text-amber-600" />
                          <span>Giao thiếu hàng</span>
                        </span>
                      )}
                      {renderStatusBadge(o.status)}
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
                    <div className="text-right flex items-center justify-end gap-1.5">
                      {/* S5-02: Nút Mua lại đơn cũ - chỉ áp dụng khi đơn đã giao xong hoặc hoàn tất */}
                      {['DELIVERED', 'CLOSED', 'COMPLETED'].includes(o.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setReorderModalOrderId(o.id);
                            setIsReorderModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F85606] border border-orange-200 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                          title="Đặt lại các mặt hàng trong đơn này"
                        >
                          <RotateCcw size={13} />
                          <span>Mua lại</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailOrderId(o.id);
                          setIsDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Chi tiết</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER GIỎ HÀNG & TÍNH TOÁN CÔNG NỢ (CART DRAWER - AC2) */}
      {/* ============================================================== */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Header Drawer */}
              <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-orange-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F85606] text-white flex items-center justify-center shadow-xs">
                    <ShoppingCart size={17} />
                  </div>
                  <div>
                    <h2 className="font-black text-sm sm:text-base text-gray-900">
                      Giỏ Hàng Đặt Của Đại Lý
                    </h2>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {cart.length} mặt hàng • {cartTotalCount} đơn vị
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Danh sách mặt hàng trong giỏ */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
                {cart.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 space-y-2">
                    <ShoppingCart size={40} className="mx-auto text-gray-300" />
                    <p className="font-bold text-gray-700 text-sm">Giỏ hàng của bạn đang trống</p>
                    <p className="text-xs text-gray-500">
                      Hãy chọn các sản phẩm từ danh mục để bắt đầu đặt hàng.
                    </p>
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const previewLine = cartPreview?.lines?.find(
                      (l) => l.productSku === item.sku && l.unitName === item.selectedUnit
                    );
                    return (
                      <PortalCartItemRow
                        key={`${item.productId}-${item.selectedUnit}`}
                        item={item}
                        index={idx}
                        previewLine={previewLine}
                        onUpdateQuantity={handleUpdateCartQuantity}
                        onRemoveItem={handleRemoveCartItem}
                      />
                    );
                  })
                )}
              </div>

              {/* Thông tin giao hàng & Ghi chú */}
              {cart.length > 0 && (
                <div className="p-4 bg-gray-50/80 border-t border-gray-200 space-y-3">
                  {/* Điểm nhận hàng */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Điểm nhận hàng của đại lý
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
                      <div className="text-xs text-gray-500 bg-white p-2 rounded-xl border border-gray-200">
                        {agency?.address || 'Giao theo địa chỉ mặc định trong hồ sơ đại lý'}
                      </div>
                    )}
                  </div>

                  {/* Ghi chú đơn */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Ghi chú đơn hàng (Thời gian giao, yêu cầu đặc biệt)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Giao trước 10h sáng mai..."
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  {/* BẢNG TỔNG KẾT TÀI CHÍNH & CÔNG NỢ TRƯỚC KHI GỬI (AC2 & CHIẾT KHẤU) */}
                  <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng tạm tính:</span>
                      <span className={`font-bold font-mono ${discountTotal > 0 ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {formatCurrencyVND(cartGrossAmount)}
                      </span>
                    </div>

                    {discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200">
                        <span className="flex items-center gap-1">
                          <span>🎯 Chiết khấu sản lượng:</span>
                        </span>
                        <span className="font-mono font-bold">
                          -{formatCurrencyVND(discountTotal)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-900 font-bold pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <span>Tổng thanh toán thực tế:</span>
                        {loadingPreview && <RefreshCw size={11} className="animate-spin text-orange-500" />}
                      </span>
                      <span className="font-black font-mono text-[#F85606] text-sm sm:text-base">
                        {formatCurrencyVND(cartPayableAmount)}
                      </span>
                    </div>

                    <div className="h-px bg-gray-100 my-1" />

                    <div className="flex justify-between text-gray-600">
                      <span>Hạn mức tín dụng:</span>
                      <span className="font-bold font-mono text-gray-700">
                        {formatCurrencyVND(creditLimit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Công nợ hiện tại:</span>
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

                    {/* Cảnh báo nếu vượt hạn mức */}
                    {isOverCreditLimit && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-1.5">
                        <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          <strong>Đơn vượt hạn mức:</strong> Đơn hàng sẽ được chuyển vào danh sách Chờ duyệt để Quản lý kinh doanh phê duyệt trước khi giao.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nút gửi đơn hàng đặt (AC3) */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={handleSubmitCustomerOrder}
                  disabled={cart.length === 0 || isSubmitting || hasOverdueDebt}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-500 hover:from-orange-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Đang gửi đơn hàng lên hệ thống...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>GỬI ĐƠN HÀNG (CHỜ DUYỆT)</span>
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

      {/* ============================================================== */}
      {/* 4. FIXED BOTTOM BAR TRÊN ĐIỆN THOẠI (MOBILE RESPONSIVE 360px - AC4) */}
      {/* ============================================================== */}
      {cart.length > 0 && !isCartDrawerOpen && (
        <div className="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">
                {cartTotalCount} món trong giỏ
              </div>
              <div className="font-black text-[#F85606] font-mono text-sm">
                {formatCurrencyVND(cartPayableAmount)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#F85606] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/30 cursor-pointer"
            >
              <ShoppingCart size={15} />
              <span>Xem giỏ & Gửi đơn</span>
            </button>
          </div>
        </div>
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
                Trạng thái: Chờ duyệt (PENDING_APPROVAL)
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

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      <OrderDetailModal
        orderId={selectedDetailOrderId}
        isOpen={isDetailModalOpen}
        onCloneOrder={(id) => {
          setIsDetailModalOpen(false);
          setSelectedDetailOrderId(null);
          setReorderModalOrderId(id);
          setIsReorderModalOpen(true);
        }}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailOrderId(null);
        }}
        onOrderUpdated={loadOrderHistory}
      />

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
  onAddToCart: (product: OrderProductCatalogItem, unitName?: string, qty?: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, inCartCount, onAddToCart }) => {
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

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setQtyText(raw);
  };

  const handleQtyBlur = () => {
    // Nếu là "0" hoặc chuỗi rỗng thì giữ "0" (không tự ép thành 1 để tránh lỗi khi bấm +)
    if (qtyText === '' || parseInt(qtyText, 10) === 0) {
      setQtyText('0');
    } else {
      const num = parseInt(qtyText, 10);
      setQtyText(String(num));
    }
  };

  const handleDecrease = () => {
    const num = parseInt(qtyText, 10);
    const current = isNaN(num) ? 0 : num;
    const next = Math.max(0, current - 1);
    setQtyText(String(next));
  };

  const handleIncrease = () => {
    const num = parseInt(qtyText, 10);
    const current = isNaN(num) ? 0 : num;
    const next = current + 1;
    setQtyText(String(next));
  };

  const handleAdd = () => {
    const num = parseInt(qtyText, 10);
    if (isNaN(num) || num <= 0) {
      showToast('Số lượng chưa hợp lệ', 'Vui lòng chọn số lượng từ 1 trở lên để thêm vào giỏ', 'info', 2500);
      return;
    }
    onAddToCart(product, selectedUnitName, num);
    setQtyText('1');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md hover:border-orange-300 transition flex flex-col justify-between space-y-3 group">
      <div>
        {/* Header thẻ: SKU & Tồn kho */}
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            {product.sku}
          </span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${(product.availableStock ?? 0) > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
              }`}
          >
            {(product.availableStock ?? 0) > 0 ? `Tồn: ${formatQuantity(product.availableStock ?? 0)} ${product.baseUnit}` : 'Tạm hết'}
          </span>
        </div>

        {/* Tên sản phẩm */}
        <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#F85606] transition line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {/* Bảng giá đại lý áp dụng theo nhóm khách hàng (AC1) */}
        <div className="mt-2.5">
          <span className="text-[11px] text-gray-400 font-medium block">Giá đại lý B2B:</span>
          <div className="font-black text-base text-[#F85606] font-mono">
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
                  onClick={() => setSelectedUnitName(u.unitName)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${selectedUnitName === u.unitName
                      ? 'bg-orange-100 text-[#F85606] border border-orange-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                >
                  {u.unitName} (x{u.conversionFactor})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hành động: Số lượng cho nhập tự do & Nút Thêm vào giỏ */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        {/* Bộ tăng giảm số lượng với ô input cho nhập tự do */}
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDecrease}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition cursor-pointer"
            title="Giảm 1"
          >
            <Minus size={13} />
          </button>
          <NumberInput
            value={qtyText}
            onChange={handleQtyChange}
            onBlur={handleQtyBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            className="w-11 h-8 text-center font-bold text-xs text-gray-900 bg-transparent outline-none font-mono"
            title="Nhập số lượng tự do"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleIncrease}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition cursor-pointer"
            title="Tăng 1"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Nút thêm giỏ */}
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
          id={`add-btn-${product.sku}`}
        >
          <ShoppingCart size={14} />
          <span>Thêm</span>
          {inCartCount > 0 && (
            <span className="bg-white/25 px-1.5 py-0.2 rounded-full text-[10px]">
              +{inCartCount}
            </span>
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
function renderStatusBadge(status: string) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
          <Clock size={12} />
          <span>Chờ duyệt</span>
        </span>
      );
    case 'APPROVED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
          <CheckCircle2 size={12} />
          <span>Đã duyệt</span>
        </span>
      );
    case 'PICKING':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 inline-flex items-center gap-1">
          <span>Đang soạn hàng</span>
        </span>
      );
    case 'DISPATCHED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 inline-flex items-center gap-1">
          <span>Đã xuất kho</span>
        </span>
      );
    case 'DELIVERED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 inline-flex items-center gap-1">
          <span>Đã giao hàng</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
          <span>Từ chối</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 inline-flex items-center gap-1">
          <span>Đã hủy</span>
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
          {status}
        </span>
      );
  }
}
