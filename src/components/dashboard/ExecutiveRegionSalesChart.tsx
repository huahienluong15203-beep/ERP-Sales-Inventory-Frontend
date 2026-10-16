import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { MapPin } from 'lucide-react';
import type { ExecutiveRegionSales } from '../../types/dashboard';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExecutiveRegionSalesChartProps {
  data: ExecutiveRegionSales | null;
  loading?: boolean;
}

const REGION_COLORS = [
  '#F85606', // Lazada Orange
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4'  // Cyan
];

export const ExecutiveRegionSalesChart: React.FC<ExecutiveRegionSalesChartProps> = ({
  data,
  loading = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  const formatVnd = (amount: number) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const regions = data.regions || [];
    const labels = regions.map((r) => r.regionName || r.regionCode || 'Khác');
    const amounts = regions.map((r) => Number(r.amount) || 0);

    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: amounts,
            backgroundColor: REGION_COLORS.slice(0, regions.length),
            borderWidth: 2,
            borderColor: '#FFFFFF',
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                const r = regions[idx];
                const amt = formatVnd(Number(context.raw));
                const pct = r?.percentage ? ` (${r.percentage.toFixed(1)}%)` : '';
                return `${amt}${pct}`;
              }
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
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">Cơ Cấu Doanh Số Theo Khu Vực</h2>
          {data?.fromCache && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Cache Hit
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Tỷ trọng phân bổ doanh thu theo từng địa bàn bán hàng
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Doughnut Chart */}
        <div className="sm:col-span-5 relative h-52 flex items-center justify-center">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
              Đang tải...
            </div>
          ) : !data || !data.regions || data.regions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-xs text-gray-400">
              <MapPin size={24} className="text-gray-300 mb-1" />
              <span>Chưa có doanh số theo khu vực</span>
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Tổng Doanh Số
                </span>
                <span className="text-xs font-bold text-gray-800 font-mono mt-0.5">
                  {formatVnd(data.totalSales || 0)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Region Breakdown List */}
        <div className="sm:col-span-7 space-y-2 max-h-56 overflow-y-auto pr-1">
          {data?.regions?.map((r, idx) => {
            const color = REGION_COLORS[idx % REGION_COLORS.length];
            return (
              <div key={r.regionId || idx} className="p-2 rounded-xl bg-gray-50/70 border border-gray-100 text-xs space-y-1">
                <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-gray-800">{r.regionName}</span>
                    <span className="text-[10px] text-gray-400">({r.orderCount} đơn)</span>
                  </div>
                  <div className="font-mono font-bold text-gray-900">
                    {formatVnd(r.amount)}
                  </div>
                </div>

                {/* Progress bar percentage */}
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, r.percentage))}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 shrink-0 w-10 text-right">
                    {r.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
