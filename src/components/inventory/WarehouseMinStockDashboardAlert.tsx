import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  ChevronRight,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { getDashboardMinStockSummary } from '../../services/stockAlertApi';
import type { MinStockThresholdConfig } from '../../types/stockAlert';
import { useNavigate } from '../../routes/Router';

interface WarehouseMinStockDashboardAlertProps {
  warehouseCode?: string;
}

/**
 * Subtask S5-09 (Nguyễn Văn Minh): FE: Code cảnh báo nổi bật trên UI
 * Acceptance Criteria (AC2):
 * - Hàng dưới ngưỡng hiển thị nổi bật trong sổ tồn và trên dashboard kho
 * - Hiển thị THÔNG BÁO ĐỎ phục vụ kịch bản kiểm thử của QA (Ngô Thị Ánh Ngọc)
 */
export const WarehouseMinStockDashboardAlert: React.FC<WarehouseMinStockDashboardAlertProps> = ({
  warehouseCode
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [criticalItems, setCriticalItems] = useState<MinStockThresholdConfig[]>([]);
  const [totalAlerts, setTotalAlerts] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getDashboardMinStockSummary(warehouseCode)
      .then((res) => {
        if (!isMounted) return;
        setTotalAlerts(res.totalAlerts);
        setCriticalCount(res.criticalCount);
        setCriticalItems(res.criticalItems.slice(0, 4));
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Lỗi tải cảnh báo tồn tối thiểu:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [warehouseCode]);

  // Nếu không có mặt hàng nào dưới định mức thì không hiện cảnh báo đỏ
  if (!loading && totalAlerts === 0) {
    return null;
  }

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-rose-600/20 border border-rose-500/40 relative overflow-hidden">
        {/* Họa tiết trang trí nền */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* HEADER THÔNG BÁO ĐỎ (AC2) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white animate-bounce">
                <BellRing size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg tracking-tight uppercase flex items-center gap-2">
                    <span>Cảnh Báo Tồn Kho Dưới Định Mức Tối Thiểu</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white text-rose-700 tracking-wider">
                      S5-09: BÁO ĐỎ
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-rose-100 mt-0.5">
                  Phát hiện <b>{totalAlerts} mặt hàng</b> đang ở dưới ngưỡng tồn tối thiểu, trong đó có{' '}
                  <b>{criticalCount} mặt hàng báo động đỏ nghiêm trọng</b> cần đặt hàng gấp từ nhà cung ứng!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/inventory/receipts')}
                className="px-4 py-2.5 rounded-xl bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 transition shadow-md shadow-black/10 flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart size={14} />
                <span>Lập Phiếu Nhập NCC</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/inventory/ledger')}
                className="px-4 py-2.5 rounded-xl bg-rose-800/80 hover:bg-rose-800 text-white font-bold text-xs transition border border-rose-400/50 flex items-center gap-1 cursor-pointer"
              >
                <span>Xem Sổ Tồn</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* DANH SÁCH CÁC MẶT HÀNG BÁO ĐỎ TIÊU BIỂU */}
          {loading ? (
            <div className="p-4 bg-white/10 rounded-2xl text-center text-xs text-rose-100 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              <span>Đang kiểm tra ngưỡng tồn kho...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {criticalItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 hover:bg-white/20 transition space-y-2 text-white"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="font-mono text-[10px] uppercase font-bold text-rose-200">
                        {item.productSku}
                      </div>
                      <div className="font-bold text-xs line-clamp-1 text-white" title={item.productName}>
                        {item.productName}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white text-rose-700">
                      -{item.deficitQuantity} {item.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/15">
                    <div>
                      <div className="text-[10px] text-rose-200">Tồn hiện tại:</div>
                      <div className="font-black text-sm text-yellow-300">
                        {item.currentStock} {item.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-rose-200">Mức tối thiểu:</div>
                      <div className="font-bold text-xs text-white">
                        {item.minThreshold} {item.unit}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-rose-200 flex items-center justify-between">
                    <span>Kho: {item.warehouseName.replace(/Kho Tổng |Kho /g, '')}</span>
                    <span className="text-yellow-200 font-semibold">Đề xuất: +{item.suggestedReorderQuantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
