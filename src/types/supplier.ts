/**
 * S2-09 / SCRUM-46: Quản lý danh mục nhà cung cấp
 * Định nghĩa kiểu dữ liệu cho phân hệ Kho & Nhà cung cấp
 */

export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface Supplier {
  id: number;
  code: string;
  name: string;
  taxCode: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  note?: string | null;
  status: SupplierStatus;
  statusReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  code: string;
  name: string;
  taxCode: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  note?: string;
}

export interface UpdateSupplierPayload {
  name: string;
  taxCode: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  note?: string;
}

export interface ChangeSupplierStatusPayload {
  status: SupplierStatus;
  reason?: string;
}

export interface SupplierFilterParams {
  keyword?: string;
  status?: string;
  page?: number;
  size?: number;
}

export interface SupplierPageResponse {
  content: Supplier[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface SupplierStatsData {
  total: number;
  activeCount: number;
  inactiveCount: number;
  hasPaymentTermsCount: number;
}
