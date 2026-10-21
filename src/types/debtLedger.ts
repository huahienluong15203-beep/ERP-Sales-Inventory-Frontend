/**
 * S7-03: Sổ công nợ & tuổi nợ theo đại lý
 */

export interface DebtAgingRow {
  customerId: number;
  customerCode: string;
  customerName: string;
  salesRepId?: number | null;
  salesRepName?: string | null;
  creditLimit: number;
  maxDebtDays: number;
  receivable: number;      // Phải thu
  collected: number;       // Đã thu
  outstanding: number;     // Còn nợ
  uninvoiced: number;      // Chưa xuất HĐ
  d0To30: number;          // 0-30 ngày
  d31To60: number;         // 31-60 ngày
  d61To90: number;         // 61-90 ngày
  over90: number;          // Trên 90 ngày
  overdueAmount: number;   // Quá hạn
  oldestDebtDays: number;  // Tuổi nợ lâu nhất
  latestActivity?: string | null;
}

export interface DebtAgingTotals {
  customerCount: number;
  receivable: number;
  collected: number;
  outstanding: number;
  uninvoiced: number;
  d0To30: number;
  d31To60: number;
  d61To90: number;
  over90: number;
  overdueAmount: number;
}

export interface DebtLedgerResponse {
  asOf: string;
  rows: DebtAgingRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  totals: DebtAgingTotals;
}

export interface DebtLedgerFilterParams {
  keyword?: string;
  salesRepId?: number;
  bucket?: 'ALL' | 'D0_30' | 'D31_60' | 'D61_90' | 'D90_PLUS';
  overdueOnly?: boolean;
  includeSettled?: boolean;
  sort?: 'NEWEST' | 'OLDEST' | 'OUTSTANDING' | 'OVERDUE' | 'CODE';
  page?: number;
  size?: number;
}
