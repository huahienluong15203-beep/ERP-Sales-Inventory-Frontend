export interface ExecutiveDashboardSummary {
  revenueToday: number;
  revenueThisMonth: number;
  pendingApprovalOrders: number;
  pendingDispatchOrders: number;
  overdueDebtAmount: number;
  skusBelowMinStock: number;
  fromCache: boolean;
  computedAt: string;
}

export interface ExecutiveDailySalesPoint {
  date: string;
  day: number;
  amount: number;
  orderCount: number;
}

export interface ExecutiveDailySales {
  month: number;
  year: number;
  totalMonthSales: number;
  totalMonthOrders: number;
  points: ExecutiveDailySalesPoint[];
  fromCache: boolean;
}

export interface ExecutiveRegionSalesItem {
  regionId: number;
  regionCode: string;
  regionName: string;
  amount: number;
  orderCount: number;
  percentage: number;
}

export interface ExecutiveRegionSales {
  month: number;
  year: number;
  totalSales: number;
  regions: ExecutiveRegionSalesItem[];
  fromCache: boolean;
}

export interface ExecutiveOverdueAgencyItem {
  rank: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  contactName: string;
  phone: string;
  salesRepId: number;
  salesRepName: string;
  creditLimit: number;
  currentDebt: number;
  overdueAmount: number;
  oldestOverdueDays: number;
}

export interface ExecutiveOverdueAgencies {
  totalOverdueAmount: number;
  totalOverdueAgencies: number;
  agencies: ExecutiveOverdueAgencyItem[];
  fromCache: boolean;
}

export interface ExecutiveDashboardOverview {
  summary: ExecutiveDashboardSummary;
  dailySales: ExecutiveDailySales;
  regionSales: ExecutiveRegionSales;
  overdueAgencies: ExecutiveOverdueAgencies;
  responseTimeMs: number;
  fromCache: boolean;
  timestamp: string;
}
