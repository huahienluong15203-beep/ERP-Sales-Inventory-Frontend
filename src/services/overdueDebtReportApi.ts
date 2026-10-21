import { downloadXlsx } from '../utils/styledExcel';
import { authFetch, API_BASE_URL } from './api';
import type {
  OverdueReportResponse,
  OverdueReportFilterParams
} from '../types/overdueDebtReport';

const REPORT_URL = `${API_BASE_URL}/api/reports/overdue-debts`;

/**
 * Lấy dữ liệu báo cáo công nợ quá hạn từ Backend (S8-09) - 100% dữ liệu thật từ cơ sở dữ liệu
 */
export async function fetchOverdueDebtReport(
  params?: OverdueReportFilterParams
): Promise<OverdueReportResponse> {
  const query = new URLSearchParams();
  if (params?.salesRepId) query.append('salesRepId', String(params.salesRepId));
  if (params?.top) query.append('top', String(params.top));

  try {
    const res = await authFetch(`${REPORT_URL}?${query.toString()}`);
    if (res.ok) {
      const data: OverdueReportResponse = await res.json();
      let finalData: OverdueReportResponse = data;

      // Lọc từ khóa tìm kiếm (mã đại lý, tên đại lý, tên nhân viên)
      if (params?.keyword?.trim()) {
        const kw = params.keyword.trim().toLowerCase();
        let filtered = (finalData.customers || []).filter(
          r =>
            r.customerCode.toLowerCase().includes(kw) ||
            r.customerName.toLowerCase().includes(kw) ||
            (r.salesRepName && r.salesRepName.toLowerCase().includes(kw))
        );
        finalData = {
          ...finalData,
          customers: filtered,
          topRisks: filtered.slice(0, params.top || 10)
        };
      }

      return finalData;
    }
    throw new Error(`Máy chủ trả về mã lỗi ${res.status}`);
  } catch (err: any) {
    console.error('Lỗi khi tải báo cáo công nợ quá hạn:', err);
    throw err;
  }
}

/**
 * Hàm hỗ trợ tạo tệp Excel 3 sheet chuẩn S8-09 từ dữ liệu thực tế
 */
export function exportOverdueReportToXlsx(report: OverdueReportResponse): void {
  // Sheet 1: Xếp hạng rủi ro
  const s1Data: any[] = [
    ['BÁO CÁO CÔNG NỢ QUÁ HẠN – XẾP HẠNG RỦI RO'],
    [`Tính đến ngày: ${report.asOf} · ${report.overdueCustomerCount} đại lý nợ quá hạn, ${report.highRiskCount} đại lý rủi ro cao`],
    [],
    [
      'Hạng',
      'Mã đại lý',
      'Tên đại lý',
      'NV phụ trách',
      'Mức rủi ro',
      'Lý do cảnh báo',
      'Hạn mức (₫)',
      'Còn nợ (₫)',
      'Quá hạn (₫)',
      'Trên 90 ngày (₫)',
      'Tuổi nợ lâu nhất (ngày)'
    ]
  ];

  (report.customers || []).forEach(x => {
    s1Data.push([
      x.rank,
      x.customerCode,
      x.customerName,
      x.salesRepName || 'Chưa phân công',
      x.riskLevel === 'HIGH' ? 'Cao' : 'Trung bình',
      (x.reasons || []).join('; '),
      x.creditLimit,
      x.outstanding,
      x.overdueAmount,
      x.over90,
      x.oldestDebtDays
    ]);
  });

  s1Data.push([
    '',
    '',
    'TỔNG CỘNG',
    '',
    '',
    '',
    '',
    report.totalOutstanding,
    report.totalOverdue,
    (report.customers || []).reduce((s, r) => s + (r.over90 || 0), 0),
    ''
  ]);


  // Sheet 2: Theo nhóm tuổi nợ
  const s2Data: any[] = [
    ['NỢ QUÁ HẠN THEO NHÓM TUỔI NỢ'],
    [`Tính đến ngày: ${report.asOf}`],
    [],
    ['Nhóm tuổi nợ', 'Số đại lý', 'Số tiền (₫)']
  ];

  (report.byBucket || []).forEach(b => {
    s2Data.push([b.label, b.customerCount, b.amount]);
  });
  s2Data.push(['TỔNG CỘNG', '', (report.byBucket || []).reduce((s, b) => s + b.amount, 0)]);


  // Sheet 3: Theo NV phụ trách
  const s3Data: any[] = [
    ['NỢ QUÁ HẠN THEO NHÂN VIÊN PHỤ TRÁCH'],
    [`Tính đến ngày: ${report.asOf}`],
    [],
    [
      'NV phụ trách',
      'Số đại lý quá hạn',
      'Số đại lý rủi ro cao',
      'Còn nợ (₫)',
      'Quá hạn (₫)',
      '0–30 ngày (₫)',
      '31–60 ngày (₫)',
      '61–90 ngày (₫)',
      'Trên 90 ngày (₫)'
    ]
  ];

  (report.byRep || []).forEach(p => {
    s3Data.push([
      p.salesRepName,
      p.customerCount,
      p.highRiskCount,
      p.outstanding,
      p.overdueAmount,
      p.d0To30,
      p.d31To60,
      p.d61To90,
      p.over90
    ]);
  });

  s3Data.push([
    'TỔNG CỘNG',
    '',
    '',
    report.totalOutstanding,
    report.totalOverdue,
    '',
    '',
    '',
    ''
  ]);

  // Dòng 4 (chỉ số 3) mỗi sheet là tên cột: in đậm + tô nền; tiêu đề và dòng TỔNG CỘNG in đậm
  downloadXlsx(`bao-cao-no-qua-han-${report.asOf}.xlsx`, [
    { name: 'XepHangRuiRo', rows: s1Data, headerRows: [3], boldRows: [0, s1Data.length - 1], colWidths: [7, 14, 30, 22, 12, 40, 16, 16, 16, 16, 14] },
    { name: 'TheoNhomTuoiNo', rows: s2Data, headerRows: [3], boldRows: [0, s2Data.length - 1], colWidths: [24, 12, 18] },
    { name: 'TheoNhanVien', rows: s3Data, headerRows: [3], boldRows: [0, s3Data.length - 1], colWidths: [24, 14, 14, 16, 16, 16, 16, 16, 16] }
  ]);
}

/**
 * Xuất file Excel báo cáo công nợ quá hạn (3 sheet) chuẩn S8-09
 */
export async function downloadOverdueDebtExcel(
  salesRepId?: number,
  currentData?: OverdueReportResponse
): Promise<void> {
  // 1. Nếu đang hiển thị dữ liệu thực tế trên màn hình, xuất trực tiếp dữ liệu đó:
  if (currentData && currentData.customers && currentData.customers.length > 0) {
    exportOverdueReportToXlsx(currentData);
    return;
  }

  // 2. Tải tệp Excel xuất từ Backend
  const query = new URLSearchParams();
  if (salesRepId) query.append('salesRepId', String(salesRepId));

  const res = await authFetch(`${REPORT_URL}/export?${query.toString()}`);
  if (res.ok) {
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-no-qua-han-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return;
  }

  throw new Error('Không thể xuất tệp Excel báo cáo nợ quá hạn');
}
