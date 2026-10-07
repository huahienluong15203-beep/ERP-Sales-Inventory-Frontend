import React, { useMemo, useRef, useState } from 'react';
import { Icons } from '../../components/common/Icons';
import { Pagination } from '../../components/common/Pagination';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import { canManageCostPrice } from '../../services/productService';
import { matchesKeyword } from '../../hooks/useServerSearch';
import type {
  ImportAnalysisSummary,
  ImportExecutionResult,
  ImportRowAction,
  ProductImportRow
} from '../../types/productImport';
import {
  downloadProductExcelTemplate,
  parseProductExcelFile,
  executeProductImport
} from '../../services/productExcelService';

/** Giới hạn dung lượng file của Backend (spring.servlet.multipart.max-file-size) */
const MAX_FILE_MB = 10;

type FilterAction = ImportRowAction | 'ALL';

const FILTER_LABELS: Record<FilterAction, string> = {
  ALL: 'Tất cả',
  CREATE: 'Chỉ Tạo mới',
  UPDATE: 'Chỉ Cập nhật',
  ERROR: 'Chỉ Dòng lỗi'
};

/** Xuất danh sách dòng lỗi ra file CSV (mở được bằng Excel) để người dùng sửa và nhập lại. */
function downloadErrorRowsCsv(
  rows: Array<{ rowNumber: number; sku: string; name: string; errors: string[] }>,
  fileName: string
) {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Dòng trong file', 'Mã SKU', 'Tên sản phẩm', 'Lỗi'].map(escape).join(','),
    ...rows.map((r) => [String(r.rowNumber), r.sku, r.name, r.errors.join('; ')].map(escape).join(','))
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
 * S2-08: Trang riêng (toàn màn hình) nhập danh mục sản phẩm từ Excel — thay cho hộp thoại nhỏ trước đây.
 * Bước 1: tải mẫu + chọn file -> Bước 2: xem trước có tìm kiếm, lọc, phân trang -> Bước 3: kết quả nhập.
 */
export const ProductImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const canSeeCost = canManageCostPrice(currentRole);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [analysis, setAnalysis] = useState<ImportAnalysisSummary | null>(null);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skipErrors, setSkipErrors] = useState(true);

  // Bộ lọc + phân trang bảng xem trước (dữ liệu đã nằm sẵn trên trình duyệt)
  const [filterAction, setFilterAction] = useState<FilterAction>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setSelectedFile(null);
    setAnalysis(null);
    setResult(null);
    setErrorMessage(null);
    setFilterAction('ALL');
    setKeyword('');
    setPage(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = async () => {
    setErrorMessage(null);
    const res = await downloadProductExcelTemplate();
    if (!res.success && res.message) setErrorMessage(res.message);
  };

  const handleFileChange = async (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMessage('Hệ thống chỉ hỗ trợ tệp định dạng Excel (.xlsx).');
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
      const data = await parseProductExcelFile(file);
      setAnalysis(data);
      setFilterAction(data.errorCount > 0 ? 'ERROR' : 'ALL');
      setKeyword('');
      setPage(0);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Không thể đọc file Excel! Vui lòng kiểm tra định dạng tệp (.xlsx).'
      );
      setAnalysis(null);
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

  // Lọc theo loại dòng + từ khoá (SKU, tên, nhóm hàng, nội dung lỗi)
  const filteredRows: ProductImportRow[] = useMemo(() => {
    if (!analysis) return [];
    return analysis.rows.filter((r) => {
      if (filterAction !== 'ALL' && r.action !== filterAction) return false;
      return matchesKeyword(
        keyword,
        r.sku,
        r.name,
        r.category,
        r.categoryPath,
        r.department,
        r.subCategory,
        r.errors.join(' '),
        String(r.rowNumber)
      );
    });
  }, [analysis, filterAction, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / size));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filteredRows.slice(safePage * size, (safePage + 1) * size);

  const readyCount = analysis ? analysis.createCount + analysis.updateCount : 0;
  const blockedByErrors = Boolean(analysis && !skipErrors && analysis.errorCount > 0);

  const handleConfirmImport = async () => {
    if (!selectedFile || !analysis) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await executeProductImport(selectedFile);
      if (res.success) {
        setResult(res);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi nhập dữ liệu vào hệ thống!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeFilter = (value: FilterAction) => {
    setFilterAction(value);
    setPage(0);
  };

  const kpiCard = (
    value: FilterAction,
    label: string,
    count: number,
    hint: string,
    active: string,
    text: string
  ) => (
    <button
      type="button"
      onClick={() => changeFilter(value)}
      className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
        filterAction === value ? active : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <span className={`text-xs font-semibold ${text}`}>{label}</span>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className={`text-2xl font-bold ${text}`}>{count.toLocaleString('vi-VN')}</span>
        <span className="text-[11px] text-gray-500 whitespace-nowrap">{hint}</span>
      </div>
    </button>
  );

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#F85606] border border-orange-200/60">
            <Icons.ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              Nhập danh mục sản phẩm từ Excel
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Nhập hàng loạt đến 5.000 mã hàng. Xem trước từng dòng, SKU đã có thì cập nhật thay vì tạo mới.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px] shrink-0"
        >
          <Icons.ChevronLeft size={16} />
          <span>Về danh mục sản phẩm</span>
        </button>
      </div>

      {/* Các bước */}
      <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {['Chọn file', 'Xem trước & kiểm tra', 'Kết quả'].map((label, idx) => {
          const step = result ? 2 : analysis ? 1 : 0;
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
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Icons.CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-900">Đã nhập xong file {analysis?.fileName}</h2>
              <p className="mt-0.5 text-sm text-emerald-800">{result.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-xs font-semibold text-gray-500">Đã lưu vào hệ thống</span>
              <p className="mt-1 text-2xl font-bold text-gray-900">{result.totalImported.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-xs font-semibold text-emerald-700">Tạo mới</span>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{result.createdCount.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-xs font-semibold text-amber-700">Cập nhật</span>
              <p className="mt-1 text-2xl font-bold text-amber-600">{result.updatedCount.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-xs font-semibold text-red-600">Bỏ qua (lỗi)</span>
              <p className="mt-1 text-2xl font-bold text-red-600">{result.skippedErrorCount.toLocaleString('vi-VN')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-4 py-2.5 text-sm font-semibold text-white min-h-[44px]"
            >
              <Icons.Package size={16} />
              <span>Xem danh mục sản phẩm</span>
            </button>
            {result.errorRows && result.errorRows.length > 0 && (
              <button
                type="button"
                onClick={() => downloadErrorRowsCsv(result.errorRows || [], 'Dong_loi_nhap_san_pham.csv')}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 min-h-[44px]"
              >
                <Icons.FileSpreadsheet size={16} />
                <span>Tải {result.errorRows.length} dòng lỗi (CSV)</span>
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
      ) : !analysis ? (
        /* ================= BƯỚC 1: CHỌN FILE ================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50/50 p-5 text-sm text-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Icons.BookOpenCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Tệp mẫu chuẩn hoá danh mục sản phẩm</h4>
                <p className="text-gray-600 mt-0.5 text-xs sm:text-sm">
                  Có sẵn các cột: Mã SKU, Tên sản phẩm, Ngành hàng (Cấp 1), Nhóm hàng (Cấp 2), Phân nhóm (Cấp 3), ĐVT, Giá niêm yết, Giá vốn, Mã vạch.
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
              accept=".xlsx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFileChange(e.target.files[0]);
              }}
              className="hidden"
              id="product-import-file"
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-[#F85606] border border-orange-200/60 mb-4">
              <Icons.Boxes size={32} />
            </div>
            <h4 className="text-base font-bold text-gray-900">Kéo thả file Excel vào đây hoặc bấm để chọn tệp</h4>
            <p className="mt-1 text-sm text-gray-500">Định dạng .xlsx, dung lượng tối đa {MAX_FILE_MB} MB.</p>
            <label
              htmlFor="product-import-file"
              className="mt-5 cursor-pointer rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-5 py-2.5 text-sm font-bold text-white"
            >
              Chọn file từ máy tính
            </label>
            {isParsing && (
              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-orange-600">
                <Icons.RotateCcw size={16} className="animate-spin" />
                <span>Đang đọc file và kiểm tra từng dòng... (file 5.000 dòng có thể mất vài giây)</span>
              </div>
            )}
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
                <h5 className="font-bold text-gray-900 text-sm">{analysis.fileName}</h5>
                <span className="text-xs text-gray-500">
                  {(analysis.fileSize / 1024).toFixed(1)} KB • {analysis.totalRows.toLocaleString('vi-VN')} dòng dữ liệu
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

          {/* 4 thẻ phân loại (bấm để lọc) */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpiCard('ALL', 'Tổng dữ liệu', analysis.totalRows, 'Tất cả', 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500', 'text-gray-900')}
            {kpiCard('CREATE', '+ Tạo mới (SKU mới)', analysis.createCount, 'Chưa có mã', 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500', 'text-emerald-700')}
            {kpiCard('UPDATE', '✎ Cập nhật (SKU đã có)', analysis.updateCount, 'Ghi đè thông tin', 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500', 'text-amber-700')}
            {kpiCard('ERROR', '✕ Dòng lỗi', analysis.errorCount, 'Cần sửa', 'border-red-500 bg-red-50/60 ring-1 ring-red-500', 'text-red-600')}
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
                  placeholder="Tìm theo số dòng, mã SKU, tên, nhóm hàng hoặc nội dung lỗi..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 min-h-[40px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(FILTER_LABELS) as FilterAction[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeFilter(key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border whitespace-nowrap ${
                      filterAction === key
                        ? key === 'ERROR'
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-[#F85606] border-[#F85606] text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-orange-50'
                    }`}
                  >
                    {FILTER_LABELS[key]}
                  </button>
                ))}
                {analysis.errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadErrorRowsCsv(
                        analysis.rows.filter((r) => r.action === 'ERROR'),
                        `Dong_loi_${analysis.fileName.replace(/\.xlsx$/i, '')}.csv`
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
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-3 text-center w-16">Dòng</th>
                    <th className="px-3 py-3 text-center w-28">Phân loại</th>
                    <th className="px-3 py-3">Mã SKU</th>
                    <th className="px-4 py-3">Tên sản phẩm</th>
                    <th className="px-3 py-3">Cây phân cấp / Nhóm hàng</th>
                    <th className="px-3 py-3">ĐVT / Quy cách</th>
                    <th className="px-3 py-3 text-right">Giá vốn</th>
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
                      <tr
                        key={row.rowNumber}
                        className={
                          row.action === 'ERROR'
                            ? 'bg-red-50/50'
                            : row.action === 'UPDATE'
                            ? 'bg-amber-50/40'
                            : 'hover:bg-gray-50'
                        }
                      >
                        <td className="px-3 py-2.5 text-center font-mono text-gray-500">{row.rowNumber}</td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {row.action === 'CREATE' ? (
                            <span className="inline-flex rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                              + TẠO MỚI
                            </span>
                          ) : row.action === 'UPDATE' ? (
                            <span className="inline-flex rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              ✎ CẬP NHẬT
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
                              ✕ LỖI
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-gray-900 whitespace-nowrap">{row.sku || '—'}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{row.name || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-700">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
                            <span>{row.categoryPath || row.category}</span>
                            {row.categoryLevel != null && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Cấp {row.categoryLevel}
                              </span>
                            )}
                          </div>
                          {(row.department || row.subCategory) && (
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {row.department && <span>Ngành: {row.department}</span>}
                              {row.subCategory && <span className="ml-2">Phân nhóm: {row.subCategory}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">
                          <div className="font-medium text-gray-800">{row.baseUnit || '—'}</div>
                          {row.packagingSpec && <div className="text-xs text-gray-400">{row.packagingSpec}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                          {canSeeCost ? (
                            `${row.costPrice.toLocaleString('vi-VN')} ₫`
                          ) : (
                            <span className="text-gray-400 tracking-widest" title="Chỉ Quản lý kinh doanh & Admin xem giá vốn">
                              ••••••
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.action === 'ERROR' ? (
                            <ul className="space-y-0.5 text-xs font-semibold text-red-600">
                              {row.errors.map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                            </ul>
                          ) : row.action === 'UPDATE' ? (
                            row.levelChanged ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-xs text-amber-800 font-semibold bg-amber-100/80 border border-amber-300 rounded px-1.5 py-0.5 w-fit">
                                  <Icons.RefreshCw size={12} className="shrink-0" />
                                  Ghi đè & đổi cấp cây
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  Cập nhật cấp cây: {row.categoryPath || row.category}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-700">SKU đã có — sẽ ghi đè thông tin mới</span>
                            )
                          ) : (
                            <span className="text-xs text-emerald-600">Hợp lệ để tạo mới</span>
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

          {/* Tuỳ chọn */}
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
            <p>
              <strong>SKU đã có trên hệ thống hoặc lặp lại trong file</strong> sẽ được cập nhật/ghi đè theo thông tin và cấp cây mới nhất ({analysis.updateCount.toLocaleString('vi-VN')} sản
              phẩm). Ô Giá vốn / Trạng thái để trống thì giữ nguyên giá trị cũ.
            </p>
            {analysis.errorCount > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-red-600">
                <input
                  type="checkbox"
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                  className="accent-red-600"
                />
                <span>
                  <strong>Bỏ qua dòng lỗi:</strong> bỏ qua {analysis.errorCount.toLocaleString('vi-VN')} dòng lỗi và vẫn nhập{' '}
                  {readyCount.toLocaleString('vi-VN')} dòng hợp lệ. Bỏ chọn nếu muốn sửa hết lỗi rồi mới nhập.
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Thanh xác nhận dính đáy màn hình */}
      {analysis && !result && (
        <div className="sticky bottom-0 z-30 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
            <span className="text-sm text-gray-600">
              Sẵn sàng nhập: <strong className="text-gray-900">{readyCount.toLocaleString('vi-VN')} sản phẩm</strong>
              {blockedByErrors && <span className="ml-2 text-red-600">(còn dòng lỗi chưa sửa)</span>}
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
              disabled={isSubmitting || blockedByErrors || readyCount === 0}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F85606] hover:bg-[#E04D05] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Icons.RotateCcw size={16} className="animate-spin" />
                  <span>Đang lưu vào hệ thống...</span>
                </>
              ) : (
                <>
                  <Icons.CheckSquare size={16} />
                  <span>Xác nhận nhập {readyCount.toLocaleString('vi-VN')} sản phẩm</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
