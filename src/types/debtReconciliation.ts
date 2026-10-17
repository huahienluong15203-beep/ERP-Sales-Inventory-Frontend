/**
 * S7-06: Đối chiếu công nợ định kỳ
 */

export type ReconciliationStatus =
  | 'DRAFT'            // Nháp / Chưa gửi
  | 'CONFIRMED'        // Kế toán đã chốt biên bản, chờ đại lý ký
  | 'AGENCY_ACCEPTED'  // Đại lý đã xác nhận đồng ý số liệu
  | 'AGENCY_DISPUTED'; // Đại lý phản hồi sai lệch số liệu

export interface ReconciliationTransaction {
  id: number;
  date: string;
  code: string;         // Mã hoá đơn / Mã phiếu thu / Mã phiếu cấn trừ
  type: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT';
  typeLabel: string;
  debit: number;        // Phát sinh nợ (Mua hàng)
  credit: number;       // Phát sinh có (Trả tiền / Giảm trừ)
  balance: number;      // Số dư luỹ kế sau giao dịch
  notes?: string;
}

export interface PeriodicReconciliationStatement {
  id: number;
  statementCode: string; // VD: BB-DC-202610-001
  customerId: number;
  customerCode: string;
  customerName: string;
  customerAddress?: string;
  customerTaxCode?: string;
  customerPhone?: string;
  fromDate: string;
  toDate: string;
  statementDate: string;
  
  // Các chỉ số tài chính của biên bản
  openingBalance: number;     // Số dư đầu kỳ
  totalDebit: number;          // Tổng phát sinh nợ (Mua hàng)
  totalCredit: number;         // Tổng phát sinh có (Thanh toán + Giảm trừ)
  closingBalance: number;     // Số dư cuối kỳ = Đầu kỳ + Nợ - Có

  status: ReconciliationStatus;
  notes?: string;

  // Lịch sử ký & phản hồi
  confirmedBy?: string;
  confirmedAt?: string;
  agencySignedBy?: string;
  agencySignedAt?: string;
  agencyFeedback?: string;     // Lý do lệch số liệu nếu đại lý từ chối

  transactions: ReconciliationTransaction[];
}

export interface CreateReconciliationParams {
  customerId: number;
  fromDate: string;
  toDate: string;
  statementDate: string;
  notes?: string;
}
