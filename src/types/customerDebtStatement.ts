/**
 * S8-10: Sổ chi tiết công nợ đại lý
 */

export type DocumentType = 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT' | 'ORDER';

export interface CustomerDebtTransaction {
  id: number;
  date: string;               // YYYY-MM-DD
  code: string;               // Mã chứng từ: HD2026-..., PT2026-..., DC-..., DH-...
  documentType: DocumentType;
  documentTypeLabel: string;  // Hoá đơn bán hàng, Phiếu thu tiền, Phiếu giảm trừ trả hàng, Đơn hàng giao
  description: string;        // Diễn giải chi tiết
  debit: number;              // Phát sinh Nợ (Tăng công nợ)
  credit: number;             // Phát sinh Có (Giảm công nợ)
  balance: number;            // Số dư luỹ kế sau phát sinh
  refId?: number;             // ID hoá đơn/phiếu thu để xem chi tiết
}

export interface CustomerDebtStatement {
  customerId: number;
  customerCode: string;
  customerName: string;
  customerAddress?: string;
  customerTaxCode?: string;
  customerPhone?: string;
  salesRepName?: string;
  creditLimit: number;
  maxDebtDays: number;
  
  fromDate: string;
  toDate: string;
  asOf: string;
  
  // Các chỉ tiêu tài chính
  openingBalance: number;     // Số dư nợ đầu kỳ
  totalDebit: number;         // Tổng phát sinh nợ trong kỳ (Mua hàng)
  totalCredit: number;        // Tổng phát sinh có trong kỳ (Đã thanh toán + Giảm trừ)
  closingBalance: number;     // Số dư nợ cuối kỳ = Đầu kỳ + Nợ - Có

  transactions: CustomerDebtTransaction[];
}

export interface CustomerDebtStatementFilterParams {
  customerId: number;
  fromDate: string;
  toDate: string;
}
