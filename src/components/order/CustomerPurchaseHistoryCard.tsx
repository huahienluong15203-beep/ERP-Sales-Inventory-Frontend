import React, { useState, useEffect, useMemo } from 'react';
import type { Agency } from '../../types/agency';
import type { UserProfile } from '../../types/user';
import type {
  CustomerPurchaseHistoryData,
  CustomerPurchaseHistoryItem,
  CustomerLastOrderItem,
  OrderItem
} from '../../types/order';
import {
  canViewCustomerPurchaseHistory,
  fetchCustomerPurchaseHistory,
  formatCurrencyVND,
  formatQuantity
} from '../../services/orderService';
import {
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  ShoppingCart,
  Lock,
  Package,
  Boxes,
  CheckCircle2,
  Search,
  RefreshCw
} from '../common/Icons';

interface CustomerPurchaseHistoryCardProps {
  selectedAgency: Agency | null;
  currentUser: UserProfile | null;
  servingWarehouse?: { code: string; name: string };
  existingCartItems: OrderItem[];
  onQuickAddAllLastOrder: (items: CustomerLastOrderItem[]) => void;
  onQuickAddSingleProduct: (historyItem: CustomerPurchaseHistoryItem) => void;
}

export const CustomerPurchaseHistoryCard: React.FC<CustomerPurchaseHistoryCardProps> = ({
  selectedAgency,
  currentUser,
  servingWarehouse,
  existingCartItems,
  onQuickAddAllLastOrder,
  onQuickAddSingleProduct
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [historyData, setHistoryData] = useState<CustomerPurchaseHistoryData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isAddingAll, setIsAddingAll] = useState<boolean>(false);

  // S4-04 AC3: Kiểm tra quyền xem lịch sử mua hàng của nhân viên phụ trách
  const accessCheck = useMemo(() => {
    return canViewCustomerPurchaseHistory(currentUser, selectedAgency);
  }, [currentUser, selectedAgency]);

  // Tải dữ liệu lịch sử mua hàng khi đại lý thay đổi và có quyền truy cập
  useEffect(() => {
    if (!selectedAgency || !accessCheck.allowed) {
      return;
    }

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) {
        setLoading(true);
        setLoadError(null);
      }
    }, 0);

    // servingWarehouse đổi thì tải lại để số tồn khả dụng theo đúng kho đang phục vụ
    fetchCustomerPurchaseHistory(selectedAgency)
      .then((data) => {
        if (isSubscribed) {
          setHistoryData(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isSubscribed) {
          setHistoryData(null);
          setLoadError(err instanceof Error ? err.message : 'Không tải được lịch sử mua hàng của đại lý.');
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [selectedAgency, accessCheck.allowed, servingWarehouse]);

  // Chỉ hiển thị dữ liệu lịch sử nếu đúng đại lý hiện tại đang chọn
  const activeHistoryData = useMemo(() => {
    if (!selectedAgency || !accessCheck.allowed) return null;
    if (historyData && String(historyData.customerId) !== String(selectedAgency.id)) return null;
    return historyData;
  }, [selectedAgency, accessCheck.allowed, historyData]);

  // Bộ lọc sản phẩm gợi ý theo từ khóa
  const filteredProducts = useMemo(() => {
    if (!activeHistoryData?.frequentProducts) return [];
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return activeHistoryData.frequentProducts;
    return activeHistoryData.frequentProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        p.sku.toLowerCase().includes(kw) ||
        (p.category && p.category.toLowerCase().includes(kw))
    );
  }, [activeHistoryData, searchKeyword]);

  // Danh sách SKU đã có trong giỏ hàng hiện tại kèm số lượng
  const cartSkuMap = useMemo(() => {
    const map = new Map<string, number>();
    existingCartItems.forEach((it) => {
      map.set(it.sku, (map.get(it.sku) || 0) + it.quantity);
    });
    return map;
  }, [existingCartItems]);

  // Nếu chưa chọn đại lý, không hiển thị card này
  if (!selectedAgency) {
    return null;
  }

  // S4-04 AC3: Nhân viên không được phân công phụ trách đại lý này
  if (!accessCheck.allowed) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200/90 shadow-xs p-4 sm:p-5 animate-in fade-in transition-all">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={20} />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                Lịch Sử Mua Hàng & Gợi Ý Mặt Hàng (S4-04)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                Giới hạn quyền xem
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {accessCheck.reason}
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-gray-500">
              <span>Đại lý: <strong>{selectedAgency.name}</strong></span>
              <span>•</span>
              <span>NVKD phụ trách: <strong>{selectedAgency.assignedRepName || 'Chưa phân công'}</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const lastOrder = activeHistoryData?.lastOrder;

  const handleQuickAddAllClick = () => {
    if (!lastOrder || lastOrder.items.length === 0) return;
    setIsAddingAll(true);
    try {
      onQuickAddAllLastOrder(lastOrder.items);
    } finally {
      setTimeout(() => setIsAddingAll(false), 500);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-orange-200/90 shadow-xs overflow-hidden transition-all duration-200">
      {/* 1. HEADER CARD: HỢP NHẤT TIÊU ĐỀ BÊN TRÁI VÀ NÚT THÊM NHANH BÊN PHẢI (MỖI CÁI 1 ĐẦU) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-gradient-to-r from-orange-50/60 via-amber-50/30 to-white hover:bg-orange-50/90 transition-colors border-b border-orange-100"
      >
        {/* ĐẦU BÊN TRÁI: ICON + TIÊU ĐỀ */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
            <History size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
              Gợi Ý & Lịch Sử Mua Hàng 3 Tháng Của Đại Lý
            </h2>
          </div>
        </div>

        {/* ĐẦU BÊN PHẢI: NÚT THÊM NHANH CẢ NHÓM HÀNG + MŨI TÊN THU GỌN */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {lastOrder && lastOrder.items.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAddAllClick();
              }}
              disabled={isAddingAll}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-orange-500/25 transition cursor-pointer"
              title="Tự động điền đầy đủ cả nhóm mặt hàng đã lấy lần trước vào đơn mới"
            >
              <ShoppingCart size={15} />
              <span>
                {isAddingAll
                  ? 'Đang thêm...'
                  : '⚡ Thêm nhanh cả nhóm hàng đã mua lần trước vào đơn mới'}
              </span>
            </button>
          )}

          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white/80 transition"
            aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* 2. NỘI DUNG CHI TIẾT KHI MỞ RỘNG */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* TRẠNG THÁI ĐANG TẢI */}
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-500">
              <RefreshCw size={24} className="animate-spin text-[#F85606]" />
              <span className="text-xs">Đang tải lịch sử mua hàng 3 tháng gần nhất...</span>
            </div>
          )}

          {!loading && activeHistoryData && (
            <>

              {/* S4-04 AC1: DANH SÁCH MẶT HÀNG ĐẠI LÝ ĐÃ MUA TRONG 3 THÁNG GẦN NHẤT KÈM SỐ LƯỢNG BÌNH QUÂN */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Boxes size={16} className="text-[#F85606]" />
                      <span>Các Mặt Hàng Thường Mua (3 Tháng Gần Nhất)</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
                      {filteredProducts.length} sản phẩm
                    </span>
                  </div>

                  {/* Thanh tìm kiếm nhanh mặt hàng lịch sử */}
                  {activeHistoryData.frequentProducts.length > 3 && (
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="Lọc nhanh mã SKU, tên..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:bg-white transition"
                      />
                    </div>
                  )}
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="py-6 px-4 text-center rounded-xl border border-dashed border-gray-200 text-gray-500 space-y-1 bg-gray-50/50">
                    <p className="text-xs font-medium">Không tìm thấy mặt hàng nào trong lịch sử phù hợp với từ khóa.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredProducts.map((prod) => {
                      const inCartQty = cartSkuMap.get(prod.sku);
                      const isAlreadyInCart = inCartQty !== undefined && inCartQty > 0;
                      const hasStock = (prod.availableInPreferredUnit ?? 10) > 0;

                      return (
                        <div
                          key={prod.sku}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                            isAlreadyInCart
                              ? 'bg-orange-50/30 border-orange-200 shadow-xs'
                              : 'bg-white border-gray-200/90 hover:border-orange-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="space-y-2">
                            {/* Tiêu đề & Mã SKU */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4
                                  className="text-xs font-bold text-gray-900 leading-snug line-clamp-2"
                                  title={prod.name}
                                >
                                  {prod.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                                  <span className="font-mono font-semibold text-gray-700">{prod.sku}</span>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium text-[10px]">
                                    ĐVT: {prod.preferredUnit}
                                  </span>
                                </div>
                              </div>

                              {isAlreadyInCart && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                                  <CheckCircle2 size={11} />
                                  <span>Trong đơn (x{inCartQty})</span>
                                </span>
                              )}
                            </div>

                            {/* Khối số liệu thống kê 3 tháng & Số lượng bình quân (AC1) */}
                            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5 text-xs">
                              {/* Số lượng bình quân tháng & bình quân đơn */}
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-500">Bình quân tháng:</span>
                                <span className="font-bold text-[#F85606] text-xs px-1.5 py-0.2 rounded bg-orange-100/70">
                                  ~{formatQuantity(prod.avgQuantityPerMonth)} {prod.preferredUnit} / tháng
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-500">Mỗi lần lấy:</span>
                                <span className="font-semibold text-gray-700">
                                  ~{formatQuantity(prod.avgQuantityPerOrder)} {prod.preferredUnit} / đơn
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-gray-200/60">
                                <span className="text-gray-500">Tổng 3 tháng:</span>
                                <span className="font-medium text-gray-700">
                                  {formatQuantity(prod.totalQuantity3M)} {prod.preferredUnit} ({prod.orderCount3M} đơn)
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-500">Đơn giá gần nhất:</span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrencyVND(prod.lastUnitPrice)}
                                </span>
                              </div>
                            </div>

                            {/* Tồn kho khả dụng hiện tại */}
                            <div className="flex items-center justify-between text-[11px] px-1">
                              <span className="text-gray-500">Tồn kho khả dụng:</span>
                              <span
                                className={`font-bold ${
                                  !hasStock
                                    ? 'text-rose-600'
                                    : (prod.availableInPreferredUnit ?? 99) < 20
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {!hasStock
                                  ? 'Hết hàng'
                                  : `Còn ~${formatQuantity(prod.availableInPreferredUnit || 0)} ${prod.preferredUnit}`}
                              </span>
                            </div>
                          </div>

                          {/* Nút thêm vào đơn */}
                          <button
                            type="button"
                            onClick={() => onQuickAddSingleProduct(prod)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              isAlreadyInCart
                                ? 'bg-orange-100 hover:bg-orange-200 text-[#F85606]'
                                : 'bg-gray-900 hover:bg-[#F85606] text-white shadow-xs'
                            }`}
                            title={`Thêm ${prod.name} (${prod.preferredUnit}) vào đơn`}
                          >
                            <Plus size={14} />
                            <span>
                              {isAlreadyInCart
                                ? `Thêm tiếp (+${Math.max(1, Math.round(prod.avgQuantityPerOrder))})`
                                : `+ Gợi ý thêm (${Math.max(1, Math.round(prod.avgQuantityPerOrder))} ${prod.preferredUnit})`}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && loadError && (
            <div className="py-4 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
              {loadError}
            </div>
          )}

          {!loading && !loadError && (!activeHistoryData || activeHistoryData.frequentProducts.length === 0) && (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-gray-200 text-gray-500 space-y-2 bg-gray-50/50">
              <Package size={28} className="mx-auto text-gray-400" />
              <p className="text-xs font-semibold text-gray-700">
                Đại lý chưa phát sinh đơn hàng nào trong 3 tháng gần nhất.
              </p>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                Khi đại lý phát sinh đơn hàng, hệ thống sẽ tự động tổng hợp số lượng bình quân và gợi ý đơn hàng cũ tại đây.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
