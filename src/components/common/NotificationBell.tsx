import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ShoppingCart,
  Boxes,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from '../../routes/Router';
import { fetchMinStockConfigs } from '../../services/stockAlertApi';
import type { MinStockThresholdConfig } from '../../types/stockAlert';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<MinStockThresholdConfig[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Chỉ hiển thị dữ liệu cảnh báo tồn cho vai trò kho và admin
  const isWarehouseOrAdmin =
    currentRole === 'ROLE_ADMIN' ||
    currentRole === 'ROLE_WH_MANAGER' ||
    currentRole === 'ROLE_WAREHOUSE';

  const loadAlerts = async () => {
    if (!isWarehouseOrAdmin) {
      setAlerts([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchMinStockConfigs({
        onlyBelowThreshold: true
      });
      setAlerts(data);
    } catch (err) {
      console.warn('Lỗi tải thông báo cảnh báo kho:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // Lắng nghe sự kiện cập nhật định mức từ các trang khác
    const handleUpdate = () => {
      loadAlerts();
    };
    window.addEventListener('min_stock_updated', handleUpdate);

    return () => {
      window.removeEventListener('min_stock_updated', handleUpdate);
    };
  }, [isWarehouseOrAdmin]);

  // Đóng khi click ngoài hoặc ấn ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const totalCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  const handleOpenLedger = (productSku?: string) => {
    setIsOpen(false);
    if (productSku) {
      navigate(`/inventory/ledger?sku=${encodeURIComponent(productSku)}`);
    } else {
      navigate('/inventory/ledger');
    }
  };

  const handleOpenReceipts = () => {
    setIsOpen(false);
    navigate('/inventory/receipts');
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* NÚT CHUÔNG THÔNG BÁO TẠI HEADER */}
      <button
        type="button"
        id="btn-header-notification-bell"
        aria-label="Thông báo và cảnh báo hệ thống"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
          isOpen
            ? isDark
              ? 'bg-[#202024] border-rose-500/50 text-rose-400 shadow-sm'
              : 'bg-rose-50 border-rose-200 text-rose-600 shadow-2xs'
            : isDark
              ? 'bg-transparent border-transparent text-zinc-300 hover:bg-[#202024] hover:text-white'
              : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
        }`}
        title="Cảnh báo & Thông báo"
      >
        <Bell size={20} className={criticalCount > 0 ? 'text-rose-500' : ''} />

        {/* BADGE SỐ LƯỢNG CẢNH BÁO */}
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[18px]">
            {criticalCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            )}
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[18px] px-1 bg-rose-600 text-[10px] font-black text-white shadow-xs">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          </span>
        )}
      </button>

      {/* DROPDOWN DANH SÁCH CẢNH BÁO */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-[340px] sm:w-[410px] max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
            isDark
              ? 'bg-[#18181b] border-zinc-800 text-zinc-100 shadow-black/60'
              : 'bg-white border-gray-200 text-gray-900 shadow-xl'
          }`}
        >
          {/* HEADER DROPDOWN */}
          <div
            className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
              isDark ? 'border-zinc-800 bg-[#202024]/60' : 'border-gray-100 bg-gray-50/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <Bell size={15} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight">Cảnh Báo & Thông Báo</h4>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                  {totalCount > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      {totalCount} mặt hàng dưới định mức tồn
                    </span>
                  ) : (
                    <span>Tồn kho an toàn, không có cảnh báo</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadAlerts}
              disabled={loading}
              className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50 transition cursor-pointer ${
                loading ? 'animate-spin text-rose-600' : ''
              }`}
              title="Làm mới cảnh báo"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* DANH SÁCH NỘI DUNG */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/80">
            {loading && alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin text-rose-500" />
                <span>Đang kiểm tra ngưỡng tồn kho...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                  Tồn kho an toàn tuyệt đối
                </div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 max-w-[260px] mx-auto">
                  Tất cả SKU tại các điểm kho đều đạt và vượt định mức dự trữ tối thiểu.
                </div>
              </div>
            ) : (
              alerts.map((item) => {
                const isCritical = item.severity === 'CRITICAL';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenLedger(item.productSku)}
                    className={`p-3.5 transition cursor-pointer group flex items-start gap-3 ${
                      isDark
                        ? 'hover:bg-[#202024]/70 active:bg-[#202024]'
                        : 'hover:bg-rose-50/50 active:bg-rose-100/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <AlertTriangle size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-mono text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">
                          {item.productSku}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isCritical
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isCritical ? 'Báo Đỏ' : 'Cảnh Báo'}
                        </span>
                      </div>

                      <div
                        className="text-xs font-bold truncate text-gray-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition"
                        title={item.productName}
                      >
                        {item.productName}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                        <span className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-zinc-800 text-[10px] font-medium text-gray-700 dark:text-zinc-300">
                          📍 {item.warehouseName.replace(/Kho Tổng |Kho /g, '')}
                        </span>
                        <span>•</span>
                        <span>
                          Tồn: <b className="text-rose-600 dark:text-rose-400">{item.currentStock}</b> / Định mức:{' '}
                          <b>{item.minThreshold}</b> {item.unit}
                        </span>
                      </div>

                      <div className="mt-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                        <span>Thiếu hụt: -{item.deficitQuantity} {item.unit}</span>
                        <span className="text-[10px] font-semibold text-gray-400 group-hover:text-rose-600 flex items-center gap-0.5">
                          Xem chi tiết <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER DROPDOWN */}
          <div
            className={`p-2.5 border-t grid grid-cols-2 gap-2 text-xs font-bold ${
              isDark ? 'border-zinc-800 bg-[#202024]/40' : 'border-gray-100 bg-gray-50/60'
            }`}
          >
            <button
              type="button"
              onClick={() => handleOpenLedger()}
              className="py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Boxes size={13} className="text-rose-600" />
              <span>Đến Sổ Tồn Kho</span>
            </button>

            <button
              type="button"
              onClick={handleOpenReceipts}
              className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <ShoppingCart size={13} />
              <span>Phiếu Nhập NCC</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
