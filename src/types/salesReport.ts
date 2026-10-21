/**
 * S8-06: Báo cáo doanh số đa chiều & Biên lợi nhuận gộp
 * AC1: Nhóm theo nhân viên (REP), khu vực (REGION), đại lý (CUSTOMER), nhóm hàng (CATEGORY), hoặc SKU
 * AC2: Hiển thị doanh số, sản lượng và biên lợi nhuận gộp
 * AC3: Biên lợi nhuận chỉ Quản lý kinh doanh xem được (marginVisible: true)
 * AC4: So sánh với kỳ trước (PREVIOUS/LAST_YEAR) và xuất Excel
 */

export type SalesReportGroupBy = 'REP' | 'REGION' | 'CUSTOMER' | 'CATEGORY' | 'SKU';

export type SalesReportCompare = 'PREVIOUS' | 'LAST_YEAR' | 'NONE';

export interface SalesReportRow {
  key: string;
  id?: number | null;
  code?: string | null;
  name: string;
  revenue: number;
  quantity: number;
  orderCount: number;
  previousRevenue?: number | null;
  previousQuantity?: number | null;
  revenueChangePercent?: number | null;
  costOfGoods?: number | null;
  grossMargin?: number | null;
  grossMarginPercent?: number | null;
  previousGrossMargin?: number | null;
}

export interface SalesReportResponse {
  groupBy: SalesReportGroupBy | string;
  fromDate: string;
  toDate: string;
  compare: SalesReportCompare | string;
  compareFromDate?: string | null;
  compareToDate?: string | null;
  marginVisible: boolean;
  rows: SalesReportRow[];
  total: SalesReportRow;
}

export interface SalesReportFilterParams {
  groupBy?: SalesReportGroupBy | string;
  fromDate?: string;
  toDate?: string;
  compare?: SalesReportCompare | string;
}
