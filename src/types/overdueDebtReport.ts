/**
 * S8-09: Báo cáo công nợ quá hạn
 * Khớp chuẩn cấu trúc DTO Backend:
 * - OverdueReportResponse
 * - OverdueBucketSummary
 * - OverdueRepSummary
 * - OverdueRiskRow
 */

export interface OverdueBucketSummary {
  bucket: 'D0_30' | 'D31_60' | 'D61_90' | 'D90_PLUS' | string;
  label: string;
  customerCount: number;
  amount: number;
}

export interface OverdueRepSummary {
  salesRepId: number | null;
  salesRepName: string;
  customerCount: number;
  highRiskCount: number;
  outstanding: number;
  overdueAmount: number;
  d0To30: number;
  d31To60: number;
  d61To90: number;
  over90: number;
}

export interface OverdueRiskRow {
  rank: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  salesRepId: number | null;
  salesRepName: string | null;
  riskLevel: 'HIGH' | 'MEDIUM';
  reasons: string[];
  creditLimit: number;
  outstanding: number;
  overdueAmount: number;
  over90: number;
  oldestDebtDays: number;
}

export interface OverdueReportResponse {
  asOf: string;
  overdueCustomerCount: number;
  highRiskCount: number;
  totalOutstanding: number;
  totalOverdue: number;
  byBucket: OverdueBucketSummary[];
  byRep: OverdueRepSummary[];
  topRisks: OverdueRiskRow[];
  customers: OverdueRiskRow[];
}

export interface OverdueReportFilterParams {
  salesRepId?: number;
  top?: number;
  keyword?: string;
  riskLevel?: 'ALL' | 'HIGH' | 'MEDIUM';
}
