import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardMinStockSummary } from '../../services/stockAlertApi';
import type { MinStockThresholdConfig } from '../../types/stockAlert';
import { useNavigate } from '../../routes/Router';
import { GoodsReceiptFormModal } from './GoodsReceiptFormModal';

interface WarehouseMinStockDashboardAlertProps {
  warehouseCode?: string;
  hideLedgerButton?: boolean;
}

/**
 * Subtask S5-09 (Nguyễn Văn Minh): FE: Code cảnh báo nổi bật trên UI
 * Acceptance Criteria (AC2):
 * - Hàng dưới ngưỡng hiển thị nổi bật trong sổ tồn và trên dashboard kho
 * - Hiển thị THÔNG BÁO ĐỎ phục vụ kịch bản kiểm thử của QA (Ngô Thị Ánh Ngọc)
 * - Phân quyền hiển thị: Chỉ hiển thị cho Quản lý kho (ROLE_WH_MANAGER), Thủ kho (ROLE_WAREHOUSE) và Quản trị viên (ROLE_ADMIN)
 */
export const WarehouseMinStockDashboardAlert: React.FC<WarehouseMinStockDashboardAlertProps> = ({
  warehouseCode,
  hideLedgerButton = false
}) => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [criticalItems, setCriticalItems] = useState<MinStockThresholdConfig[]>([]);
  const [totalAlerts, setTotalAlerts] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);

  // Modal lập phiếu nhập NCC trực tiếp theo kho & sản phẩm được click
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [selectedAlertForReceipt, setSelectedAlertForReceipt] = useState<MinStockThresholdConfig | null>(null);

  // Chỉ hiển thị trên Dashboard cho các vai trò quản lý / phụ trách kho và admin
  const isWarehouseOrAdmin =
    currentRole === 'ROLE_ADMIN' ||
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_WAREHOUSE';

  const loadAlertData = () => {
    if (!isWarehouseOrAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getDashboardMinStockSummary(warehouseCode)
      .then((res) => {
        setTotalAlerts(res.totalAlerts);
        setCriticalCount(res.criticalCount);
        setCriticalItems(res.criticalItems.slice(0, 4));
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Lỗi tải cảnh báo tồn tối thiểu:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlertData();
  }, [warehouseCode, isWarehouseOrAdmin]);

  // Bấm vào thẻ cảnh báo -> mở phiếu nhập kho NCC theo kho đó
  const handleCardClick = (item: MinStockThresholdConfig) => {
    setSelectedAlertForReceipt(item);
    setIsReceiptModalOpen(true);
  };

  // Nếu không thuộc vai trò kho/admin thì không hiển thị cảnh báo
  if (!isWarehouseOrAdmin) {
    return null;
  }

  // Nếu không có mặt hàng nào dưới định mức thì hiện banner trạng thái an toàn kèm nút thao tác
  if (!loading && totalAlerts === 0) {
    return (
      <div className="mb-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <span>Tất cả kho hàng đều đạt định mức dự trữ an toàn</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Không có sản phẩm nào ở dưới ngưỡng tồn tối thiểu đã thiết lập.
              </p>
            </div>
          </div>
          {isWarehouseOrAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedAlertForReceipt(null);
                  setIsReceiptModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer h-9"
              >
                <ShoppingCart size={14} />
                <span>Lập Phiếu Nhập NCC</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory/transfers')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer h-9"
              >
                <ArrowRightLeft size={14} />
                <span>Lập Phiếu Chuyển Kho</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 rounded-2xl p-4 sm:p-5 text-white shadow-xl shadow-rose-600/20 border border-rose-500/40 relative overflow-hidden">
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
                  <p className="text-xs text-rose-100 mt-0.5">
                    Phát hiện <b>{totalAlerts} cảnh báo theo kho</b> đang ở dưới ngưỡng tồn tối thiểu, trong đó có{' '}
                    <b>{criticalCount} điểm kho cần bổ sung khẩn cấp</b> từ nhà cung ứng!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isWarehouseOrAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAlertForReceipt(null);
                        setIsReceiptModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer h-9"
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
                    onClick={() => navigate('/inventory/ledger')}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-800/80 hover:bg-rose-800 text-white font-bold text-xs transition border border-rose-400/50 flex items-center gap-1 cursor-pointer h-9"
                  >
                    <span>Xem Sổ Tồn</span>
                    <ChevronRight size={14} />
                  </button>
                )}
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
                        <div className="font-mono text-[10px] uppercase font-bold text-rose-200">
                          {item.productSku}
                        </div>
                        <div className="font-bold text-xs line-clamp-1 text-white" title={item.productName}>
                          {item.productName}
                        </div>
                      </div>

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

                    <div className="pt-1.5 border-t border-white/15 flex items-center justify-between text-[10px]">
                      <span className="text-yellow-200 font-bold">
                        Đề xuất: +{item.suggestedReorderQuantity} {item.unit}
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-white bg-white/20 group-hover/card:bg-white group-hover/card:text-rose-700 px-2 py-0.5 rounded-md transition-colors">
                        <ShoppingCart size={11} />
                        <span>Nhập kho này &gt;</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL LẬP PHIẾU NHẬP NCC TRỰC TIẾP THEO KHO & MẶT HÀNG ĐƯỢC CHỌN (S5-04 / S5-09) */}
      <GoodsReceiptFormModal
        isOpen={isReceiptModalOpen}
        initialWarehouseCode={selectedAlertForReceipt?.warehouseCode}
        initialProductSku={selectedAlertForReceipt?.productSku}
        initialProductName={selectedAlertForReceipt?.productName}
        initialQuantity={selectedAlertForReceipt?.suggestedReorderQuantity}
        initialNote={
          selectedAlertForReceipt
            ? `Nhập bù hàng dưới định mức tồn tối thiểu cho ${selectedAlertForReceipt.warehouseName || selectedAlertForReceipt.warehouseCode} (Đề xuất: +${selectedAlertForReceipt.suggestedReorderQuantity} ${selectedAlertForReceipt.unit})`
            : undefined
        }
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedAlertForReceipt(null);
        }}
        onSuccess={() => {
          setIsReceiptModalOpen(false);
          setSelectedAlertForReceipt(null);
          loadAlertData();
        }}
      />
    </>
  );
};
