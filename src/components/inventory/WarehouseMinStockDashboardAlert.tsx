import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ArrowRightLeft,
  CheckCircle2,
  PackageCheck,
  TrendingUp,
  Sparkles,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardMinStockSummary } from '../../services/stockAlertApi';
import type { MinStockThresholdConfig } from '../../types/stockAlert';
import { useNavigate } from '../../routes/Router';

interface WarehouseMinStockDashboardAlertProps {
  warehouseCode?: string;
  hideLedgerButton?: boolean;
}

/**
 * Cảnh báo định mức tồn kho tối thiểu & nguy cơ thiếu hụt hàng hóa
 * Hiển thị trên Dashboard cho: Quản lý kho (ROLE_WH_MANAGER) và Quản trị viên (ROLE_ADMIN)
 */
export const WarehouseMinStockDashboardAlert: React.FC<WarehouseMinStockDashboardAlertProps> = ({
  warehouseCode,
  hideLedgerButton = false
}) => {
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [criticalItems, setCriticalItems] = useState<MinStockThresholdConfig[]>([]);
  const [totalAlerts, setTotalAlerts] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [demoSafeView, setDemoSafeView] = useState<boolean>(false);

  // Chỉ hiển thị trên Dashboard cho Quản lý kho (ROLE_WH_MANAGER) và Quản trị viên (ROLE_ADMIN)
  const isWarehouseManager =
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => r === 'ROLE_WH_MANAGER' || r === 'ROLE_ADMIN'));

  const loadAlertData = () => {
    if (!isWarehouseManager) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getDashboardMinStockSummary(warehouseCode)
      .then((res) => {
        setTotalAlerts(res.totalAlerts);
        setCriticalCount(res.criticalCount);
        setCriticalItems(res.criticalItems);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Lỗi tải cảnh báo tồn tối thiểu:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlertData();

    const handleUpdated = () => {
      loadAlertData();
    };
    window.addEventListener('min_stock_updated', handleUpdated);
    return () => {
      window.removeEventListener('min_stock_updated', handleUpdated);
    };
  }, [warehouseCode, isWarehouseManager]);

  // Bấm vào thẻ cảnh báo -> chuyển sang trang Phiếu nhập kho NCC và tự động kích hoạt tạo phiếu
  const handleCardClick = (item: MinStockThresholdConfig) => {
    navigate(
      `/inventory/receipts?create=1&warehouseCode=${encodeURIComponent(item.warehouseCode)}&sku=${encodeURIComponent(item.productSku)}&qty=${encodeURIComponent(item.suggestedReorderQuantity)}`
    );
  };

  // Nếu không thuộc vai trò quản lý kho/admin thì không hiển thị cảnh báo
  if (!isWarehouseManager) {
    return null;
  }

  // Khi không có hàng nào dưới định mức (hoặc bấm xem thử giao diện an toàn)
  if (!loading && (totalAlerts === 0 || demoSafeView)) {
    return (
      <div className="mb-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-4 sm:p-5 text-white shadow-xl shadow-emerald-700/15 border border-emerald-400/30 relative overflow-hidden">
          {/* Họa tiết trang trí nền phát sáng */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 translate-y-8 w-48 h-48 bg-emerald-300/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            {/* HEADER TRẠNG THÁI TỒN KHO AN TOÀN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white shadow-sm">
                  <ShieldCheck size={22} className="text-emerald-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base tracking-tight uppercase flex items-center gap-2 text-white">
                      <span>Tất Cả Kho Hàng Đạt Định Mức Dự Trữ An Toàn</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-200/40 text-[10px] font-black uppercase tracking-wider text-emerald-100">
                      100% Đạt Chuẩn
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    Toàn bộ mặt hàng tại các kho đều đang duy trì trên ngưỡng tồn tối thiểu. Không phát hiện nguy cơ thiếu hụt hay gián đoạn cung ứng!
                  </p>
                </div>
              </div>

              {/* CÁC NÚT THAO TÁC NGHIỆP VỤ NHANH */}
              <div className="flex items-center gap-2 shrink-0">
                {demoSafeView && totalAlerts > 0 && (
                  <button
                    type="button"
                    onClick={() => setDemoSafeView(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition border border-white/30 flex items-center gap-1.5 cursor-pointer h-9 backdrop-blur-xs"
                    title="Trở về xem cảnh báo thực tế từ hệ thống"
                  >
                    <Eye size={13} />
                    <span>Dữ liệu thực ({totalAlerts} cảnh báo)</span>
                  </button>
                )}

                {isWarehouseManager && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/inventory/receipts?create=1')}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer h-9"
                    >
                      <ShoppingCart size={14} className="text-emerald-600" />
                      <span>Lập Phiếu Nhập NCC</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/inventory/transfers')}
                      className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition border border-white/30 flex items-center gap-1.5 cursor-pointer h-9 backdrop-blur-xs"
                    >
                      <ArrowRightLeft size={14} />
                      <span>Lập Phiếu Chuyển Kho</span>
                    </button>
                  </>
                )}

                {!hideLedgerButton && (
                  <button
                    type="button"
                    onClick={() => navigate('/inventory/ledger')}
                    className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition border border-white/30 flex items-center gap-1.5 cursor-pointer h-9 backdrop-blur-xs"
                    title="Chuyển sang trang Quản lý tồn kho để kiểm tra toàn bộ danh mục"
                  >
                    <span>Xem sổ thẻ kho</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* 3 THẺ TỔNG QUAN CHỈ SỐ AN TOÀN TỒN KHO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-emerald-200">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-100">Cảnh báo thiếu hụt</div>
                  <div className="text-sm font-black text-white">0 Mặt hàng</div>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-teal-200">
                  <PackageCheck size={18} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-100">Định mức an toàn</div>
                  <div className="text-sm font-black text-white">100% Đạt định mức</div>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-cyan-200">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-100">Tình trạng đáp ứng</div>
                  <div className="text-sm font-black text-white">Sẵn sàng xuất kho</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="bg-gradient-to-r from-[#F85606] via-orange-500 to-amber-500 rounded-2xl p-4 sm:p-5 text-white shadow-xl shadow-orange-500/20 border border-orange-400/40 relative overflow-hidden">
          {/* Họa tiết trang trí nền */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            {/* HEADER THÔNG BÁO CẢNH BÁO TỒN KHO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base tracking-tight uppercase flex items-center gap-2">
                      <span>Cảnh Báo Tồn Kho Dưới Định Mức Tối Thiểu</span>
                    </h3>
                  </div>
                  <p className="text-xs text-orange-100 mt-0.5">
                    Phát hiện <b>{totalAlerts} cảnh báo theo kho</b> đang ở dưới ngưỡng tồn tối thiểu, trong đó có{' '}
                    <b>{criticalCount} điểm kho cần bổ sung khẩn cấp</b> từ nhà cung ứng!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDemoSafeView(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition border border-white/25 flex items-center gap-1.5 cursor-pointer h-9 backdrop-blur-xs"
                  title="Bấm để xem trước giao diện khi toàn bộ kho hàng đều đạt định mức an toàn (0 cảnh báo)"
                >
                  <Sparkles size={13} className="text-yellow-300" />
                  <span>Xem khi an toàn</span>
                </button>

                {isWarehouseManager && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/inventory/receipts?create=1')}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-[#F85606] hover:bg-orange-50 font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer h-9"
                    >
                      <ShoppingCart size={14} />
                      <span>Lập Phiếu Nhập NCC</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/inventory/transfers')}
                      className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition border border-white/30 flex items-center gap-1.5 cursor-pointer h-9 backdrop-blur-xs"
                    >
                      <ArrowRightLeft size={14} />
                      <span>Lập Phiếu Chuyển Kho</span>
                    </button>
                  </>
                )}

                {!hideLedgerButton && (
                  <button
                    type="button"
                    onClick={() => navigate('/inventory/ledger?status=BELOW')}
                    className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition border border-white/30 flex items-center gap-1.5 cursor-pointer h-9 backdrop-blur-xs"
                    title="Chuyển sang trang Quản lý tồn kho để xem đầy đủ"
                  >
                    <span>Xem tất cả ({totalAlerts})</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* DANH SÁCH CÁC MẶT HÀNG BÁO ĐỎ TIÊU BIỂU */}
            {loading ? (
              <div className="p-4 bg-white/10 rounded-2xl text-center text-xs text-orange-100 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Đang kiểm tra ngưỡng tồn kho...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(totalAlerts > 3 ? criticalItems.slice(0, 3) : criticalItems.slice(0, 4)).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className="group/card bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 hover:bg-white/25 hover:border-white/50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 space-y-2 text-white cursor-pointer relative"
                    title={`Nhấp để mở phiếu nhập NCC cho kho ${item.warehouseName}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        {/* Badge Tên Kho nổi bật để phân biệt rõ ràng từng kho lưu trữ */}
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/25 text-[10px] font-black text-yellow-300 uppercase tracking-wide mb-1 border border-white/20 shadow-xs">
                          <span>📍 Kho {item.warehouseName.replace(/Kho Tổng |Kho /g, '')}</span>
                        </div>
                        <div className="font-mono text-[10px] uppercase font-bold text-orange-100">
                          {item.productSku}
                        </div>
                        <div className="font-bold text-xs line-clamp-1 text-white" title={item.productName}>
                          {item.productName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/15">
                      <div>
                        <div className="text-[10px] text-orange-100">Tồn hiện tại:</div>
                        <div className="font-black text-sm text-yellow-300">
                          {item.currentStock} {item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-orange-100">Mức tối thiểu:</div>
                        <div className="font-bold text-xs text-white">
                          {item.minThreshold} {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-white/15 flex items-center justify-between text-[10px]">
                      <span className="text-yellow-200 font-bold">
                        Đề xuất: +{item.suggestedReorderQuantity} {item.unit}
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-white bg-white/20 group-hover/card:bg-white group-hover/card:text-[#F85606] px-2 py-0.5 rounded-md transition-colors">
                        <ShoppingCart size={11} />
                        <span>Nhập kho này &gt;</span>
                      </span>
                    </div>
                  </div>
                ))}

                {/* Thẻ xem thêm khi có nhiều hơn 3 mặt hàng dưới định mức */}
                {totalAlerts > 3 && (
                  <div
                    onClick={() => navigate('/inventory/ledger?status=BELOW')}
                    className="group/more bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white/50 rounded-2xl p-3.5 backdrop-blur-md flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] text-white space-y-2 min-h-[140px]"
                    title="Xem toàn bộ mặt hàng dưới định mức trên trang Quản lý tồn kho"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover/more:bg-white group-hover/more:text-[#F85606] transition-colors">
                      <ChevronRight size={18} />
                    </div>
                    <div>
                      <div className="font-black text-xs sm:text-sm text-yellow-300">
                        +{totalAlerts - 3} mặt hàng khác
                      </div>
                      <div className="text-[10px] text-orange-100 mt-0.5">
                        Đang dưới định mức tối thiểu
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-white group-hover/more:text-yellow-200 flex items-center gap-1 underline underline-offset-2">
                      Xem chi tiết sổ tồn &gt;
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
