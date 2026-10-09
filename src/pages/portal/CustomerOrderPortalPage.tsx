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
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerPortalLayout } from '../../layouts/CustomerPortalLayout';
import type { Agency, DeliveryPoint, CreditStatusResponse } from '../../types/agency';
import type { OrderSummaryItem, OrderBackendResponse } from '../../types/order';
import type { OrderProductCatalogItem } from '../../services/orderService';
import {
  fetchBackendProductOptions,
  saveDraftToBackend,
  submitOrderToBackend,
  formatCurrencyVND,
  formatQuantity,
  fetchOrders
} from '../../services/orderService';
import {
  fetchAgencies,
  fetchDeliveryPointsByAgency,
  fetchCustomerCreditStatus
} from '../../services/agencyApi';
import { OrderDetailModal } from '../../components/order/OrderDetailModal';

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
  const { user, showToast } = useAuth();

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

  // Giỏ hàng
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal thông báo đặt hàng thành công
  const [successOrder, setSuccessOrder] = useState<OrderBackendResponse | null>(null);

  // Lịch sử đơn hàng của đại lý
  const [ordersHistory, setOrdersHistory] = useState<OrderSummaryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // 1. TẢI THÔNG TIN ĐẠI LÝ LIÊN KẾT VỚI TÀI KHOẢN ĐĂNG NHẬP
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const agencyRes = await fetchAgencies({ size: 50 });
        const list = agencyRes.content || [];

        // Tìm đại lý tương ứng với user
        // Đối với tài khoản mẫu 'customer_agent' (Đại Lý Minh Phát), gắn với DL-HN-001 (id: 3)
        let matched = list.find(
          (a) =>
            a.code === 'DL-HN-001' ||
            a.name.toLowerCase().includes('minh phát') ||
            (user?.username && a.code.toLowerCase().includes(user.username.toLowerCase()))
        );

        if (!matched && list.length > 0) {
          matched = list[0]; // Fallback đại lý đầu tiên
        }

        if (matched) {
          setAgency(matched);

          // Tải hạn mức & công nợ hiện tại
          fetchCustomerCreditStatus(matched.id)
            .then(setCreditStatus)
            .catch(() => setCreditStatus(null));

          // Tải danh sách điểm giao hàng
          fetchDeliveryPointsByAgency(matched.id)
            .then((pts) => {
              setDeliveryPoints(pts);
              const defaultPt = pts.find((p) => p.isDefault) || pts[0];
              if (defaultPt) setSelectedDeliveryPointId(defaultPt.id);
            })
            .catch(() => setDeliveryPoints([]));
        }
      } catch (err) {
        console.error('Lỗi tải thông tin đại lý:', err);
      }
    };

    loadCustomerData();
  }, [user]);

  // 2. TẢI DANH MỤC SẢN PHẨM THEO NHÓM BẢNG GIÁ CỦA ĐẠI LÝ (AC1)
  const loadProducts = useCallback(async () => {
    if (!agency?.id) return;
    setLoadingProducts(true);
    try {
      // Backend /api/orders/product-options?customerId={agency.id}
      // Tự động áp dụng bảng giá hiệu lực thuộc nhóm khách hàng của đại lý đó
      const items = await fetchBackendProductOptions(agency.id);
      setProducts(items);
    } catch (err) {
      console.error('Lỗi tải sản phẩm theo bảng giá đại lý:', err);
      showToast('Lỗi tải sản phẩm', 'Không thể tải danh sách sản phẩm theo bảng giá', 'error');
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
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // TÍNH TOÁN CÔNG NỢ & TỔNG TIỀN (AC2)
  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const cartTotalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Hạn mức, nợ hiện tại và công nợ còn lại sau đơn này
  const creditLimit = Number(creditStatus?.creditLimit ?? agency?.creditLimit ?? 0);
  const currentDebt = Number(creditStatus?.currentDebt ?? agency?.totalDebt ?? 0);
  const remainingBeforeOrder = Number(creditStatus?.availableCredit ?? Math.max(0, creditLimit - currentDebt));
  const remainingAfterOrder = remainingBeforeOrder - cartTotalAmount;
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
      // 1. Tạo đơn nháp
      const draftPayload = {
        customerId: Number(agency.id),
        deliveryAddressId: selectedDeliveryPointId ? Number(selectedDeliveryPointId) : null,
        note: orderNote.trim() ? `[Đại lý tự đặt qua B2B Portal] ${orderNote.trim()}` : '[Đại lý tự đặt qua B2B Portal]',
        lines: cart.map((c) => ({
          productSku: c.sku,
          unitName: c.selectedUnit,
          quantity: c.quantity,
          unitPrice: c.unitPrice
        }))
      };

      const savedDraft = await saveDraftToBackend(draftPayload);
      if (!savedDraft?.id) {
        throw new Error('Không thể tạo mã đơn hàng từ máy chủ');
      }

      // 2. Chốt đơn hàng gửi lên máy chủ -> Chuyển sang PENDING_APPROVAL (Chờ duyệt) (AC3)
      const submittedOrder = await submitOrderToBackend(savedDraft.id);

      // 3. Làm trống giỏ hàng & hiển thị kết quả
      setCart([]);
      setIsCartDrawerOpen(false);
      setSuccessOrder(submittedOrder);
      showToast(
        'Gửi đơn hàng thành công',
        `Đơn hàng [${submittedOrder.code || submittedOrder.id}] đã được gửi ở trạng thái Chờ duyệt!`,
        'success',
        6000
      );

      // Cập nhật lại hạn mức công nợ & lịch sử
      fetchCustomerCreditStatus(agency.id).then(setCreditStatus).catch(() => {});
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
      cartTotalAmount={cartTotalAmount}
      onOpenCart={() => setIsCartDrawerOpen(true)}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
    >
      {/* ============================================================== */}
      {/* TAB 1: DANH MỤC SẢN PHẨM VÀ ĐẶT HÀNG (CATALOG & ORDERING) */}
      {/* ============================================================== */}
      {activeTab === 'catalog' && (
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
                    Mã ĐL: {agency?.code || 'DL-HN-001'}
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                  {agency?.name || 'Đại Lý Phân Phối'}
                </h1>
                <p className="text-orange-100 text-xs mt-1 flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0" />
                  <span className="truncate">{agency?.address || 'Khu đô thị Định Công, Hà Nội'}</span>
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                      selectedCategory === 'ALL'
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                        selectedCategory === cat
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((p) => {
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
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ĐƠN HÀNG CỦA TÔI (MY ORDERS HISTORY) */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
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
              <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
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
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#F85606]">
                        {o.code}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div>
                      {renderStatusBadge(o.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Số mặt hàng</span>
                      <span className="font-bold text-gray-800">{o.lineCount} SKU</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Tổng giá trị</span>
                      <span className="font-black text-[#F85606] font-mono">
                        {formatCurrencyVND(o.totalAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">NVKD Phụ trách</span>
                      <span className="font-semibold text-gray-700">{o.salesRepName || 'Chưa gán'}</span>
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailOrderId(o.id);
                          setIsDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-orange-200 text-[#F85606] hover:bg-orange-50 font-bold text-xs inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Xem chi tiết & Timeline</span>
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
        <div className="fixed inset-0 z-50 overflow-hidden">
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
                  cart.map((item, idx) => (
                    <div key={`${item.productId}-${item.selectedUnit}`} className="pt-3 first:pt-0">
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
                          onClick={() => handleRemoveCartItem(idx)}
                          className="text-gray-400 hover:text-rose-600 p-1 transition cursor-pointer shrink-0"
                          title="Xóa khỏi giỏ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Bộ điều khiển số lượng và thành tiền */}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(idx, item.quantity - 1)}
                            className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 transition cursor-pointer"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-10 text-center font-bold text-xs text-gray-800 font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(idx, item.quantity + 1)}
                            className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 transition cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <div className="font-black text-xs sm:text-sm font-mono text-[#F85606]">
                          {formatCurrencyVND(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                    </div>
                  ))
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
                      <select
                        value={selectedDeliveryPointId}
                        onChange={(e) => setSelectedDeliveryPointId(e.target.value)}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        {deliveryPoints.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.name} — {pt.address}
                          </option>
                        ))}
                      </select>
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

                  {/* BẢNG TỔNG KẾT TÀI CHÍNH & CÔNG NỢ TRƯỚC KHI GỬI (AC2) */}
                  <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng tạm tính:</span>
                      <span className="font-bold font-mono text-gray-900">
                        {formatCurrencyVND(cartTotalAmount)}
                      </span>
                    </div>
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
                        className={`font-black font-mono text-sm ${
                          remainingAfterOrder < 0 ? 'text-rose-600' : 'text-emerald-600'
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
                  * Đơn hàng gửi lên sẽ luôn ở trạng thái <strong>Chờ duyệt</strong> để NVKD phụ trách xác nhận (S4-10 AC3).
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
                {formatCurrencyVND(cartTotalAmount)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
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

      {/* MODAL CHI TIẾT ĐƠN HÀNG & TIMELINE VÒNG ĐỜI (S4-06 & S4-08) */}
      <OrderDetailModal
        orderId={selectedDetailOrderId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailOrderId(null);
        }}
        onOrderUpdated={loadOrderHistory}
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
  const [qty, setQty] = useState<number>(1);

  const currentUnit =
    product.availableUnits.find((u) => u.unitName === selectedUnitName) ||
    product.availableUnits[0];
  const factor = currentUnit?.conversionFactor || 1;
  const currentPrice = product.basePrice * factor;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md hover:border-orange-300 transition flex flex-col justify-between space-y-3 group">
      <div>
        {/* Header thẻ: SKU & Tồn kho */}
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            {product.sku}
          </span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
              (product.availableStock ?? 0) > 0
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedUnitName === u.unitName
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

      {/* Hành động: Số lượng & Nút Thêm vào giỏ */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        {/* Bộ tăng giảm số lượng */}
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition cursor-pointer"
          >
            <Minus size={13} />
          </button>
          <span className="w-8 text-center font-bold text-xs text-gray-800 font-mono">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition cursor-pointer"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Nút thêm giỏ */}
        <button
          type="button"
          onClick={() => {
            onAddToCart(product, selectedUnitName, qty);
            setQty(1);
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95"
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
