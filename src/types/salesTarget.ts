export type SalesTargetType = 'REP' | 'REGION';

export interface SalesTargetResponse {
  id: number;
  period: string; // '2026-10'
  targetType: SalesTargetType;
  salesRepId?: number;
  salesRepCode?: string;
  salesRepName?: string;
  regionId?: number;
  regionName?: string;
  region?: string;
  targetAmount: number;
  actualAmount: number;
  achievementPercent?: number;
  completionRate: number; // Tỷ lệ hoàn thành % (ví dụ 82.5)
  locked?: boolean;
  isLocked: boolean; // Kỳ đã qua thì bị khoá
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MySalesProgressResponse {
  period: string;
  targetAmount: number;
  actualAmount: number;
  completionRate: number;
  remainingAmount: number;
  daysRemainingInMonth: number;
  salesRepName: string;
}

export interface SalesTargetCreateRequest {
  period: string;
  targetType: SalesTargetType;
  salesRepId?: number;
  regionId?: number;
  region?: string;
  targetAmount: number;
  note?: string;
  reason?: string;
}

export interface SalesTargetUpdateRequest {
  targetAmount: number;
  note?: string;
  reason: string; // Bắt buộc khi sửa chỉ tiêu (AC3)
}
