import React, { useMemo, useRef, useState } from 'react';
import { Icons } from '../../components/common/Icons';
import { Pagination } from '../../components/common/Pagination';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { matchesKeyword } from '../../hooks/useServerSearch';
import {
  downloadUserImportTemplateApi,
  previewUserImportApi,
  executeUserImportApi,
  type UserImportPreviewResponse,
  type UserImportSummaryResponse
} from '../../services/api';

/** Giới hạn dung lượng file của Backend (spring.servlet.multipart.max-file-size) */
const MAX_FILE_MB = 10;

type FilterTab = 'ALL' | 'VALID' | 'INVALID';

const FILTER_LABELS: Record<FilterTab, string> = {
  ALL: 'Tất cả',
  VALID: 'Chỉ dòng hợp lệ',
  INVALID: 'Chỉ dòng lỗi'
};

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Quản trị',
  ROLE_SALES_MANAGER: 'QL kinh doanh',
  ROLE_SALES_REP: 'NV kinh doanh',
  ROLE_WAREHOUSE: 'NV kho',
  ROLE_WH_MANAGER: 'QL kho',
  ROLE_ACCOUNTANT: 'Kế toán',
  ROLE_CUSTOMER: 'Đại lý'
};

const roleLabel = (code: string) => ROLE_LABELS[code] || code;

/** Xuất danh sách dòng lỗi ra file CSV (mở được bằng Excel) để người dùng sửa và nhập lại. */
function downloadErrorRowsCsv(
  rows: Array<{ rowNumber: number; username?: string; email?: string; errors: string[] }>,
  fileName: string
) {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Dòng trong file', 'Tên đăng nhập', 'Email', 'Lỗi'].map(escape).join(','),
    ...rows.map((r) =>
      [String(r.rowNumber), r.username || '', r.email || '', r.errors.join('; ')].map(escape).join(',')
    )
  ];
  // BOM để Excel đọc đúng tiếng Việt
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * S2-01: Trang riêng (toàn màn hình) nhập người dùng hàng loạt từ Excel — thay cho hộp thoại nhỏ trước đây.
 * Bước 1: tải mẫu + chọn file -> Bước 2: Backend kiểm từng dòng, xem trước có tìm kiếm/lọc/phân trang
 * -> Bước 3: Backend tạo tài khoản dòng hợp lệ, bỏ qua dòng lỗi, trả báo cáo.
 */
export const UserImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [preview, setPreview] = useState<UserImportPreviewResponse | null>(null);
  const [result, setResult] = useState<UserImportSummaryResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
    setFilterTab('ALL');
    setKeyword('');
    setPage(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = async () => {
    setErrorMessage(null);
    const res = await downloadUserImportTemplateApi();
    if (!res.success) setErrorMessage(res.message || 'Không tải được tệp mẫu từ máy chủ. Vui lòng thử lại!');
  };

  const handleFileChange = async (file: File) => {
    setErrorMessage(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setErrorMessage('Vui lòng chọn tệp bảng tính định dạng Excel (.xlsx hoặc .xls).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMessage(`Tệp quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Dung lượng tối đa ${MAX_FILE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    try {
      const res = await previewUserImportApi(file);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể kiểm tra tệp Excel. Vui lòng thử lại!');
      }
      if (!res.data.rows || res.data.rows.length === 0) {
        throw new Error('Tệp Excel không có dòng dữ liệu nào (chỉ có dòng tiêu đề hoặc tệp rỗng).');
      }
      setPreview(res.data);
      setFilterTab(res.data.invalidRowsCount > 0 ? 'INVALID' : 'ALL');
      setKeyword('');
      setPage(0);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể kiểm tra tệp Excel.');
      setPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]);
  };

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((r) => {
      if (filterTab === 'VALID' && !r.valid) return false;
      if (filterTab === 'INVALID' && r.valid) return false;
      return matchesKeyword(
        keyword,
        r.username,
        r.fullName,
        r.email,
        r.phone || '',
        (r.errors || []).join(' '),
        String(r.rowNumber)
      );
    });
  }, [preview, filterTab, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / size));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filteredRows.slice(safePage * size, (safePage + 1) * size);
  const readyCount = preview?.validRowsCount ?? 0;

  const handleConfirmImport = async () => {
    if (!selectedFile || !preview) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await executeUserImportApi(selectedFile);
      if (!res.success || !res.data) {
        setErrorMessage(res.message || 'Không thể nhập dữ liệu. Chưa có tài khoản nào được tạo, vui lòng thử lại!');
        return;
      }
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (res.data.successCount > 0) {
        showToast(
          'Nhập dữ liệu thành công!',
          `Đã tạo ${res.data.successCount} tài khoản` +
            (res.data.failedCount ? ` (bỏ qua ${res.data.failedCount} dòng lỗi).` : '.')
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeFilter = (value: FilterTab) => {
    setFilterTab(value);
    setPage(0);
  };

  const kpiCard = (value: FilterTab, label: string, count: number, hint: string, active: string, text: string) => (
    <button
      type="button"
      onClick={() => changeFilter(value)}
      className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
        filterTab === value ? active : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <span className={`text-xs font-semibold ${text}`}>{label}</span>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className={`text-2xl font-bold ${text}`}>{count.toLocaleString('vi-VN')}</span>
        <span className="text-[11px] text-gray-500 whitespace-nowrap">{hint}</span>
      </div>
    </button>
  );

  const chips = (items: string[] | undefined, cls: string) =>
    items && items.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <span key={it} className={`inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
            {it}
          </span>
        ))}
      </div>
    ) : (
      <span className="text-gray-300">—</span>
    );

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#F85606] border border-orange-200/60">
            <Icons.Users size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              Nhập người dùng từ Excel
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Tạo tài khoản hàng loạt. Hệ thống kiểm từng dòng, dòng lỗi bị bỏ qua, mỗi tài khoản mới nhận email mật khẩu tạm.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px] shrink-0"
        >
          <Icons.ChevronLeft size={16} />
          <span>Về quản lý tài khoản</span>
        </button>
      </div>

      {/* Các bước */}
      <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {['Chọn file', 'Xem trước & kiểm tra', 'Kết quả'].map((label, idx) => {
          const step = result ? 2 : preview ? 1 : 0;
          const done = idx < step;
          const current = idx === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                  current
                    ? 'bg-[#F85606] border-[#F85606] text-white'
                    : done
                    ? 'bg-orange-50 border-orange-300 text-[#F85606]'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {idx + 1}
              </span>
              <span className={current ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
              {idx < 2 && <span className="mx-1 text-gray-300">—</span>}
            </li>
          );
        })}
      </ol>

      {/* Thông báo lỗi */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700">
          <Icons.AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <p className="flex-1 font-medium">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-100"
            title="Đóng thông báo"
          >
            <Icons.X size={15} />
          </button>
        </div>
      )}

      {/* ================= BƯỚC 3: KẾT QUẢ ================= */}
      {result ? (
        <div className="space-y-5">
          {result.successCount > 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Icons.CheckCircle2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-900">Đã nhập xong file {preview?.fileName}</h2>
                <p className="mt-0.5 text-sm text-emerald-800">
                  Đã tạo {result.successCount.toLocaleString('vi-VN')} tài khoản và gửi email mật khẩu tạm.
                  {result.failedCount > 0 && ` Bỏ qua ${result.failedCount.toLocaleString('vi-VN')} dòng lỗi.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                <Icons.AlertCircle size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-red-900">Chưa tạo được tài khoản nào</h2>
                <p className="mt-0.5 text-sm text-red-800">
                  Cả {result.failedCount.toLocaleString('vi-VN')} dòng đều bị bỏ qua. Xem lý do bên dưới, sửa file rồi nhập lại.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-xs font-semibold text-gray-500">Tổng dòng đã xử lý</span>
              <p className="mt-1 text-2xl font-bold text-gray-900">{result.totalProcessed.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-xs font-semibold text-emerald-700">Tạo thành công</span>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{result.successCount.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-xs font-semibold text-red-600">Bỏ qua (lỗi)</span>
              <p className="mt-1 text-2xl font-bold text-red-600">{result.failedCount.toLocaleString('vi-VN')}</p>
            </div>
          </div>

          {result.createdUsers.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <h3 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-emerald-700">
                Tài khoản đã tạo ({result.createdUsers.length})
              </h3>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-2.5">Tên đăng nhập</th>
                      <th className="px-4 py-2.5">Họ và tên</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Số điện thoại</th>
                      <th className="px-4 py-2.5">Vai trò</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.createdUsers.map((u) => (
                      <tr key={u.id ?? u.username}>
                        <td className="px-4 py-2.5 font-mono font-bold text-gray-900">{u.username}</td>
                        <td className="px-4 py-2.5 text-gray-800">{u.fullName}</td>
                        <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                        <td className="px-4 py-2.5 text-gray-600">{u.phone || '—'}</td>
                        <td className="px-4 py-2.5">
                          {chips((u.roles || []).map(roleLabel), 'border-orange-200 bg-orange-50 text-orange-700')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.failedRows.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-white overflow-hidden">
              <h3 className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                Dòng bị bỏ qua ({result.failedRows.length})
              </h3>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-16">Dòng</th>
                      <th className="px-4 py-2.5">Tên đăng nhập</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.failedRows.map((r) => (
                      <tr key={r.rowNumber} className="bg-red-50/40">
                        <td className="px-3 py-2.5 text-center font-mono text-gray-500">{r.rowNumber}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-900">{r.username || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.email || '—'}</td>
                        <td className="px-4 py-2.5">
                          <ul className="space-y-0.5 text-xs font-semibold text-red-600">
                            {(r.reasons || []).map((reason, i) => (
                              <li key={i}>• {reason}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-4 py-2.5 text-sm font-semibold text-white min-h-[44px]"
            >
              <Icons.Users size={16} />
              <span>Xem danh sách tài khoản</span>
            </button>
            {result.failedRows.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  downloadErrorRowsCsv(
                    result.failedRows.map((r) => ({ ...r, errors: r.reasons || [] })),
                    'Dong_loi_nhap_nguoi_dung.csv'
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 min-h-[44px]"
              >
                <Icons.FileSpreadsheet size={16} />
                <span>Tải {result.failedRows.length} dòng lỗi (CSV)</span>
              </button>
            )}
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              <Icons.RotateCcw size={16} />
              <span>Nhập file khác</span>
            </button>
          </div>
        </div>
      ) : !preview ? (
        /* ================= BƯỚC 1: CHỌN FILE ================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50/50 p-5 text-sm text-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Icons.BookOpenCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Tệp mẫu nhập người dùng</h4>
                <p className="text-gray-600 mt-0.5 text-xs sm:text-sm">
                  Có sẵn các cột: Tên đăng nhập, Họ tên, Email, SĐT, Mã vai trò, Mã kho, Mã địa bàn, kèm sheet hướng dẫn mã hợp lệ.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-4 py-2.5 font-bold text-white shrink-0 min-h-[44px]"
            >
              ↓ Tải tệp mẫu (.xlsx)
            </button>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all ${
              dragActive
                ? 'border-orange-500 bg-orange-50/60'
                : 'border-gray-300 bg-white hover:bg-orange-50/20 hover:border-orange-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFileChange(e.target.files[0]);
              }}
              className="hidden"
              id="user-import-file"
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-[#F85606] border border-orange-200/60 mb-4">
              <Icons.Upload size={32} />
            </div>
            <h4 className="text-base font-bold text-gray-900">Kéo thả file Excel vào đây hoặc bấm để chọn tệp</h4>
            <p className="mt-1 text-sm text-gray-500">Định dạng .xlsx / .xls, dung lượng tối đa {MAX_FILE_MB} MB.</p>
            <label
              htmlFor="user-import-file"
              className="mt-5 cursor-pointer rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-5 py-2.5 text-sm font-bold text-white"
            >
              Chọn file từ máy tính
            </label>
            {isParsing && (
              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-orange-600">
                <Icons.RotateCcw size={16} className="animate-spin" />
                <span>Đang gửi file lên máy chủ và kiểm tra từng dòng...</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs sm:text-sm text-gray-600">
            <p className="font-bold text-gray-800 mb-1.5">Quy tắc kiểm tra trước khi nhập</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Tên đăng nhập, Email, Số điện thoại không được trùng với tài khoản đã có hoặc trùng giữa các dòng trong file.</li>
              <li>Số điện thoại (nếu có) phải đủ 10 số di động Việt Nam (đầu 03, 05, 07, 08, 09).</li>
              <li>Nhân viên kho / Quản lý kho bắt buộc phải gắn ít nhất một mã kho hợp lệ.</li>
              <li>Dòng có lỗi bị bỏ qua, dòng hợp lệ vẫn được nhập.</li>
            </ul>
          </div>
        </div>
      ) : (
        /* ================= BƯỚC 2: XEM TRƯỚC ================= */
        <div className="space-y-4">
          {/* Thông tin file */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Icons.FileSpreadsheet size={18} />
              </div>
              <div>
                <h5 className="font-bold text-gray-900 text-sm">{preview.fileName || selectedFile?.name}</h5>
                <span className="text-xs text-gray-500">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB • ` : ''}
                  {preview.totalRows.toLocaleString('vi-VN')} dòng dữ liệu
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              Chọn file khác
            </button>
          </div>

          {/* 3 thẻ phân loại (bấm để lọc) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {kpiCard('ALL', 'Tổng dữ liệu', preview.totalRows, 'Tất cả', 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500', 'text-gray-900')}
            {kpiCard('VALID', '✓ Hợp lệ', preview.validRowsCount, 'Sẽ tạo tài khoản', 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500', 'text-emerald-700')}
            {kpiCard('INVALID', '✕ Dòng lỗi', preview.invalidRowsCount, 'Sẽ bị bỏ qua', 'border-red-500 bg-red-50/60 ring-1 ring-red-500', 'text-red-600')}
          </div>

          {/* Bảng xem trước */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="relative flex-1 max-w-md">
                <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Tìm theo số dòng, tài khoản, họ tên, email, SĐT hoặc nội dung lỗi..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 min-h-[40px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(FILTER_LABELS) as FilterTab[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeFilter(key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border whitespace-nowrap ${
                      filterTab === key
                        ? key === 'INVALID'
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-[#F85606] border-[#F85606] text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-orange-50'
                    }`}
                  >
                    {FILTER_LABELS[key]}
                  </button>
                ))}
                {preview.invalidRowsCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadErrorRowsCsv(
                        preview.rows.filter((r) => !r.valid),
                        `Dong_loi_${(preview.fileName || 'nguoi_dung').replace(/\.xlsx?$/i, '')}.csv`
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 whitespace-nowrap"
                  >
                    ↓ Tải dòng lỗi (CSV)
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-3 text-center w-16">Dòng</th>
                    <th className="px-3 py-3 text-center w-28">Kết quả</th>
                    <th className="px-3 py-3">Tên đăng nhập</th>
                    <th className="px-3 py-3">Họ và tên</th>
                    <th className="px-3 py-3">Email / SĐT</th>
                    <th className="px-3 py-3">Vai trò</th>
                    <th className="px-3 py-3">Kho / Địa bàn</th>
                    <th className="px-4 py-3">Chi tiết / Báo lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        Không có dòng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.rowNumber} className={row.valid ? 'hover:bg-gray-50' : 'bg-red-50/50'}>
                        <td className="px-3 py-2.5 text-center font-mono text-gray-500">{row.rowNumber}</td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {row.valid ? (
                            <span className="inline-flex rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                              ✓ HỢP LỆ
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
                              ✕ LỖI
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-gray-900 whitespace-nowrap">{row.username || '—'}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{row.fullName || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">
                          <div>{row.email || '—'}</div>
                          {row.phone && <div className="text-xs text-gray-400">{row.phone}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          {chips((row.roles || []).map(roleLabel), 'border-orange-200 bg-orange-50 text-orange-700')}
                        </td>
                        <td className="px-3 py-2.5 space-y-1">
                          {chips(row.warehouseCodes, 'border-sky-200 bg-sky-50 text-sky-700')}
                          {(row.regionCodes || []).length > 0 &&
                            chips(row.regionCodes, 'border-violet-200 bg-violet-50 text-violet-700')}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.valid ? (
                            <span className="text-xs text-emerald-600">Sẽ tạo tài khoản + gửi email mật khẩu tạm</span>
                          ) : (
                            <ul className="space-y-0.5 text-xs font-semibold text-red-600">
                              {(row.errors || []).map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalElements={filteredRows.length}
              size={size}
              onPageChange={setPage}
              onSizeChange={(s) => {
                setSize(s);
                setPage(0);
              }}
              itemLabel="dòng"
            />
          </div>

          {preview.invalidRowsCount > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700">
              <strong>{preview.invalidRowsCount.toLocaleString('vi-VN')} dòng lỗi</strong> sẽ bị bỏ qua, chỉ{' '}
              {readyCount.toLocaleString('vi-VN')} dòng hợp lệ được tạo tài khoản. Muốn nhập đủ thì tải dòng lỗi (CSV), sửa
              file rồi chọn lại.
            </div>
          )}
        </div>
      )}

      {/* Thanh xác nhận dính đáy màn hình */}
      {preview && !result && (
        <div className="sticky bottom-0 z-30 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
            <span className="text-sm text-gray-600">
              Sẵn sàng tạo: <strong className="text-gray-900">{readyCount.toLocaleString('vi-VN')} tài khoản</strong>
            </span>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 min-h-[44px]"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={isSubmitting || readyCount === 0}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Icons.RotateCcw size={16} className="animate-spin" />
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <Icons.CheckSquare size={16} />
                  <span>Xác nhận tạo {readyCount.toLocaleString('vi-VN')} tài khoản</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
