import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Calendar, DollarSign, ShoppingCart, RefreshCw } from 'lucide-react';
import type { ExecutiveDailySales } from '../../types/dashboard';

ChartJS.register(...registerables);

interface ExecutiveDailySalesChartProps {
  data: ExecutiveDailySales | null;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const ExecutiveDailySalesChart: React.FC<ExecutiveDailySalesChartProps> = ({
  data,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  loading = false,
  onRefresh,
  refreshing = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);



  const formatVnd = (amount: number) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    // Hủy instance cũ trước khi vẽ lại
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const points = data.points || [];
    const labels = points.map((p) => `Ngày ${p.day}`);
    const amounts = points.map((p) => Number(p.amount) || 0);
    const orderCounts = points.map((p) => Number(p.orderCount) || 0);

    // Gradient fill cho đường doanh số
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(248, 86, 6, 0.28)');
    gradient.addColorStop(1, 'rgba(248, 86, 6, 0.01)');

    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Doanh số (đ)',
            data: amounts,
            borderColor: '#F85606',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: points.length > 20 ? 2 : 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#F85606',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'Số đơn hàng',
            data: orderCounts,
            backgroundColor: 'rgba(37, 99, 235, 0.22)',
            hoverBackgroundColor: 'rgba(37, 99, 235, 0.5)',
            borderColor: '#2563EB',
            borderWidth: 1,
            borderRadius: 4,
            barThickness: points.length > 20 ? 8 : 14,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              font: {
                size: 11,
                weight: 'bold'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            padding: 12,
            cornerRadius: 10,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                if (context.datasetIndex === 0) {
                  return `${label}: ${formatVnd(Number(context.raw))}`;
                }
                return `${label}: ${context.raw} đơn`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 15
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: {
              color: 'rgba(243, 244, 246, 0.9)'
            },
            ticks: {
              font: { size: 10 },
              callback: (val) => {
                const n = Number(val);
                if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
                if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + ' tr';
                if (n >= 1_000) return (n / 1_000).toFixed(0) + ' k';
                return n;
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              font: { size: 10 },
              stepSize: 1,
              precision: 0
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[36px]">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Doanh Số Theo Ngày Trong Tháng</h2>
        </div>

        {/* BỘ LỌC NGÀY THÁNG TRÊN BIỂU ĐỒ (AC 2 & TEST FE) */}
        <div className="flex items-center gap-2">
          {/* Chọn tháng bằng lịch */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl hover:border-orange-300 transition">
            <Calendar size={14} className="text-[#F85606] shrink-0" />
            <input
              type="month"
              id="daily-sales-month-picker"
              value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
              onChange={(e) => {
                if (!e.target.value) return;
                const [y, m] = e.target.value.split('-');
                if (y && m) {
                  onYearChange(Number(y));
                  onMonthChange(Number(m));
                }
              }}
              disabled={loading}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || refreshing}
              className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 transition cursor-pointer disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-orange-500' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Pills */}
      {data && (
        <div className="flex items-center gap-4 flex-wrap p-3 rounded-xl bg-orange-50/40 border border-orange-200/50 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block">Tổng doanh số tháng {selectedMonth}:</span>
              <span className="font-bold text-orange-600 font-mono text-sm">
                {formatVnd(data.totalMonthSales)}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-orange-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShoppingCart size={15} />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block">Tổng đơn hàng phát sinh:</span>
              <span className="font-bold text-blue-600 font-mono text-sm">
                {data.totalMonthOrders.toLocaleString('vi-VN')} đơn
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="relative flex-1 min-h-[280px] w-full flex flex-col justify-center">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-2xs z-10 text-xs font-medium text-gray-400">
            <span>Đang tải dữ liệu biểu đồ...</span>
          </div>
        ) : !data || !data.points || data.points.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-xs text-gray-400">
            <Calendar size={28} className="text-gray-300 mb-1.5" />
            <span>Chưa có phát sinh doanh số trong tháng {selectedMonth}/{selectedYear}</span>
          </div>
        ) : null}
        <canvas ref={canvasRef} className={!data || !data.points || data.points.length === 0 ? 'hidden' : 'w-full h-full'} />
      </div>
    </div>
  );
};
