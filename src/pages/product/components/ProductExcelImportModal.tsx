import React, { useState, useRef } from 'react';
import { Icons } from '../../../components/common/Icons';
import type { Product } from '../../../types/product';
import type {
  ImportAnalysisSummary,
  ImportRowAction
} from '../../../types/productImport';
import {
  downloadProductExcelTemplate,
  parseProductExcelFile,
  executeProductImport
} from '../../../services/productExcelService';

interface ProductExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  onImportSuccess: (message: string) => void;
}

export const ProductExcelImportModal: React.FC<ProductExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  onImportSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<ImportAnalysisSummary | null>(null);
  const [filterAction, setFilterAction] = useState<ImportRowAction | 'ALL'>('ALL');
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [skipErrors, setSkipErrors] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Xử lý tải tệp mẫu từ máy chủ
  const handleDownloadTemplate = async () => {
    const res = await downloadProductExcelTemplate();
    if (!res.success && res.message) {
      alert(res.message);
    }
  };

  // Xử lý khi chọn file
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    try {
      const result = await parseProductExcelFile(file, existingProducts);
      setAnalysis(result);
    } catch (err: unknown) {
      console.error('Lỗi khi đọc file Excel:', err);
      alert(err instanceof Error ? err.message : 'Không thể đọc file Excel! Vui lòng kiểm tra định dạng tệp (.xlsx, .xls).');
      setAnalysis(null);
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleResetFile = () => {
    setAnalysis(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Lọc các dòng hiển thị trong bảng Preview
  const displayRows = analysis
    ? analysis.rows.filter((r) => {
        if (filterAction === 'ALL') return true;
        return r.action === filterAction;
      })
    : [];

  // Xác nhận nhập dữ liệu qua Backend API
  const handleConfirmImport = async () => {
    if (!selectedFile || !analysis) return;

    setIsSubmitting(true);
    try {
      const result = await executeProductImport(selectedFile);

      if (result.success) {
        onImportSuccess(result.message);
        onClose();
      } else {
        alert(result.message);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi nhập dữ liệu vào hệ thống!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative my-6 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#F85606] dark:bg-orange-950/60 dark:text-orange-400">
              <Icons.ClipboardList size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Nhập danh mục sản phẩm từ Excel
                </h3>
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                  S2-08 / SCRUM-44
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhập hàng loạt đến 5.000 mã hàng. Xem trước và tự động cập nhật sản phẩm nếu SKU đã tồn tại.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <span className="text-xl font-bold leading-none">&times;</span>
          </button>
        </div>

        {/* Body Modal */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* 1. Khu vực Tải template & Upload File */}
          {!analysis ? (
            <div className="space-y-4">
              {/* Nút tải tệp mẫu chuẩn */}
              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Icons.BookOpenCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-950 dark:text-white">
                      Tệp mẫu chuẩn hóa danh mục sản phẩm
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300">
                      Tải tệp mẫu Excel có sẵn các cột bắt buộc: Mã SKU, Tên sản phẩm, Nhóm hàng, ĐVT, Quy cách và Giá vốn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-bold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
                >
                  <Icons.Receipt size={15} className="hidden" />
                  <span>↓ Tải tệp mẫu (.xlsx)</span>
                </button>
              </div>

              {/* Vùng Kéo thả hoặc chọn file */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  dragActive
                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                    : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100/60 dark:border-slate-700 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="excel-file-upload"
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-[#F85606] shadow-xs mb-3">
                  <Icons.Boxes size={28} />
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Kéo thả file Excel vào đây hoặc bấm để chọn tệp
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Hỗ trợ định dạng: Microsoft Excel (.xlsx, .xls) hoặc CSV (.csv). Dung lượng tối đa 20MB.
                </p>

                <label
                  htmlFor="excel-file-upload"
                  className="mt-4 cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all dark:bg-white dark:text-slate-900"
                >
                  Chọn file từ máy tính
                </label>

                {isParsing && (
                  <div className="mt-4 flex items-center space-x-2 text-xs font-semibold text-orange-600 animate-pulse">
                    <Icons.RotateCcw size={16} className="animate-spin" />
                    <span>Đang phân tích cấu trúc file và kiểm tra từng dòng...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 2. Khu vực Preview & Phân loại dữ liệu sau khi parse */
            <div className="space-y-4">
              {/* Thẻ tóm tắt thông tin file & KPI */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                    <Icons.CheckSquare size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                      {analysis.fileName}
                    </h5>
                    <span className="text-[11px] text-slate-500">
                      Dung lượng: {(analysis.fileSize / 1024).toFixed(1)} KB • Tổng số dòng: {analysis.totalRows}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Tải lại tệp mẫu
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40"
                  >
                    Chọn file khác
                  </button>
                </div>
              </div>

              {/* 4 Thẻ chỉ số phân loại */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Tổng dòng */}
                <button
                  type="button"
                  onClick={() => setFilterAction('ALL')}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    filterAction === 'ALL'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500 dark:bg-indigo-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-slate-500">Tổng dữ liệu</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {analysis.totalRows}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold">Tất cả</span>
                  </div>
                </button>

                {/* Tạo mới */}
                <button
                  type="button"
                  onClick={() => setFilterAction('CREATE')}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    filterAction === 'CREATE'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500 dark:bg-emerald-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    + Tạo mới (SKU mới)
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-emerald-600">
                      {analysis.createCount}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Chưa có mã</span>
                  </div>
                </button>

                {/* Cập nhật */}
                <button
                  type="button"
                  onClick={() => setFilterAction('UPDATE')}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    filterAction === 'UPDATE'
                      ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-500 dark:bg-amber-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    ✎ Cập nhật (Đã có SKU)
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-amber-600">
                      {analysis.updateCount}
                    </span>
                    <span className="text-[10px] text-amber-600 font-semibold">Ghi đè thông tin</span>
                  </div>
                </button>

                {/* Dòng Lỗi */}
                <button
                  type="button"
                  onClick={() => setFilterAction('ERROR')}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    filterAction === 'ERROR'
                      ? 'border-red-600 bg-red-50/50 shadow-xs ring-1 ring-red-500 dark:bg-red-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                    ✕ Dòng lỗi
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-red-600">
                      {analysis.errorCount}
                    </span>
                    <span className="text-[10px] text-red-500 font-semibold">Cần xử lý</span>
                  </div>
                </button>
              </div>

              {/* Hướng dẫn tiêu chí S2-08 */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
                <div className="flex items-start space-x-2">
                  <Icons.CheckSquare size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <p>
                    <strong className="font-semibold">Quy tắc nghiệp vụ S2-08: </strong>
                    Hệ thống tự động đối soát SKU. Những SKU đã có trên danh mục sẽ được gán nhãn{' '}
                    <span className="rounded bg-amber-100 px-1 py-0.5 font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      CẬP NHẬT
                    </span>{' '}
                    và ghi đè thông tin thay vì báo lỗi trùng lặp. Các dòng thiếu trường bắt buộc sẽ được báo lỗi chi tiết theo từng dòng.
                  </p>
                </div>
              </div>

              {/* Bảng xem trước dữ liệu (Preview Table) */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  <span>
                    Bản xem trước dữ liệu ({displayRows.length} / {analysis.totalRows} dòng)
                  </span>
                  <div className="flex gap-1.5 text-[11px] font-normal">
                    <span className="text-slate-500">Đang lọc:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {filterAction === 'ALL'
                        ? 'Tất cả'
                        : filterAction === 'CREATE'
                        ? 'Chỉ Tạo mới'
                        : filterAction === 'UPDATE'
                        ? 'Chỉ Cập nhật'
                        : 'Chỉ Dòng lỗi'}
                    </strong>
                  </div>
                </div>

                <div className="max-h-72 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12">Dòng</th>
                        <th className="px-3 py-2.5 text-center w-28">Phân loại</th>
                        <th className="px-3 py-2.5">Mã SKU</th>
                        <th className="px-4 py-2.5">Tên sản phẩm</th>
                        <th className="px-3 py-2.5">Nhóm hàng</th>
                        <th className="px-3 py-2.5">ĐVT / Quy cách</th>
                        <th className="px-3 py-2.5 text-right">Giá vốn</th>
                        <th className="px-4 py-2.5">Chi tiết / Báo lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {displayRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Không có dòng nào phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        displayRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors ${
                              row.action === 'ERROR'
                                ? 'bg-red-50/50 hover:bg-red-50/80 dark:bg-red-950/20'
                                : row.action === 'UPDATE'
                                ? 'bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-950/10'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            {/* Số dòng */}
                            <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                              {row.rowNumber}
                            </td>

                            {/* Phân loại (Action) */}
                            <td className="px-3 py-2.5 text-center">
                              {row.action === 'CREATE' ? (
                                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                                  + TẠO MỚI
                                </span>
                              ) : row.action === 'UPDATE' ? (
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                  ✎ CẬP NHẬT
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-950/60 dark:text-red-200">
                                  ✕ LỖI
                                </span>
                              )}
                            </td>

                            {/* Mã SKU */}
                            <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                              {row.sku}
                            </td>

                            {/* Tên sản phẩm */}
                            <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                              {row.name}
                            </td>

                            {/* Nhóm hàng */}
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                              {row.category}
                            </td>

                            {/* ĐVT & Quy cách */}
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                              <div>{row.baseUnit}</div>
                              {row.packagingSpec && (
                                <div className="text-[10px] text-slate-400">{row.packagingSpec}</div>
                              )}
                            </td>

                            {/* Giá vốn */}
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {row.costPrice.toLocaleString('vi-VN')} đ
                            </td>

                            {/* Chi tiết lỗi hoặc thay đổi */}
                            <td className="px-4 py-2.5">
                              {row.action === 'ERROR' ? (
                                <div className="space-y-0.5 text-[11px] font-semibold text-red-600">
                                  {row.errors.map((err, i) => (
                                    <div key={i} className="flex items-center space-x-1">
                                      <span>•</span>
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : row.action === 'UPDATE' ? (
                                <div className="text-[11px] text-amber-700 dark:text-amber-300">
                                  {row.changedFields && row.changedFields.length > 0 ? (
                                    <span>Thay đổi: {row.changedFields.join(', ')}</span>
                                  ) : (
                                    <span className="text-slate-400">Không có thay đổi</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-emerald-600">Hợp lệ để tạo mới</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tùy chọn nhập */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>
                    <strong>Cập nhật sản phẩm:</strong> Tự động ghi đè thông tin mới nếu SKU đã tồn tại trên hệ thống ({analysis.updateCount} sản phẩm).
                  </span>
                </label>

                {analysis.errorCount > 0 && (
                  <label className="flex items-center space-x-2 cursor-pointer text-red-600 dark:text-red-400">
                    <input
                      type="checkbox"
                      checked={skipErrors}
                      onChange={(e) => setSkipErrors(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>
                      <strong>Bỏ qua dòng lỗi:</strong> Bỏ qua {analysis.errorCount} dòng dữ liệu lỗi và vẫn tiếp tục nhập {analysis.createCount + analysis.updateCount} dòng hợp lệ.
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Đóng
          </button>

          {analysis && (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500">
                Sẵn sàng nhập:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {skipErrors
                    ? analysis.createCount + analysis.updateCount
                    : analysis.validCount}{' '}
                  sản phẩm
                </strong>
              </span>

              <button
                type="button"
                disabled={
                  isSubmitting ||
                  (!skipErrors && analysis.errorCount > 0) ||
                  (analysis.createCount + analysis.updateCount === 0)
                }
                onClick={handleConfirmImport}
                className="flex items-center space-x-2 rounded-xl bg-[#F85606] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#d04602] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Icons.RotateCcw size={15} className="animate-spin" />
                    <span>Đang lưu vào hệ thống...</span>
                  </>
                ) : (
                  <>
                    <Icons.CheckSquare size={15} />
                    <span>
                      Xác nhận nhập{' '}
                      {skipErrors
                        ? analysis.createCount + analysis.updateCount
                        : analysis.validCount}{' '}
                      sản phẩm
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
