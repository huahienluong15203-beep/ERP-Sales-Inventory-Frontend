import React, { useState } from 'react';
import type { ExcelImportRow } from '../../../types/product';
import type { RoleName } from '../../../types/user';
import {
  validateExcelImportData,
  commitExcelImport,
  getDemoExcelData,
  canViewCostPrice
} from '../../../services/productService';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Sparkles,
  Info
} from '../../../components/common/Icons';

interface ProductExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (message: string) => void;
  userRoles: RoleName[];
}

export const ProductExcelImportModal: React.FC<ProductExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  userRoles
}) => {
  const allowCost = canViewCostPrice(userRoles);

  const [rows, setRows] = useState<ExcelImportRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'INVALID' | 'UPDATE' | 'VALID'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Thống kê số lượng dòng
  const totalCount = rows.length;
  const invalidCount = rows.filter((r) => r.status === 'INVALID').length;
  const updateCount = rows.filter((r) => r.status === 'UPDATE').length;
  const validCount = rows.filter((r) => r.status === 'VALID').length;

  // Nạp dữ liệu thử nghiệm có sẵn
  const handleLoadDemoData = () => {
    setSelectedFileName('Du_lieu_san_pham_mau_Sprint2.xlsx');
    const demoData = getDemoExcelData();
    setRows(demoData);
  };

  // Tải file mẫu CSV
  const handleDownloadTemplate = () => {
    const header = [
      'STT',
      'Mã SKU (*)',
      'Tên sản phẩm (*)',
      'Nhóm ngành hàng',
      'ĐVT cơ sở (*)',
      'Quy cách đóng gói',
      'Giá vốn (VNĐ)',
      'Giá bán cơ sở (VNĐ) (*)',
      'ĐVT quy đổi',
      'Hệ số quy đổi',
      'Mã Barcode ĐVT'
    ].join(',');

    const sampleRow1 = [
      '1',
      'BEER-SGS-330',
      'Bia Sài Gòn Special Lon 330ml',
      'Bia & Đồ uống có cồn',
      'Lon',
      '24 lon / thùng',
      '11500',
      '15000',
      'Thùng (24 lon)',
      '24',
      '8934567010035'
    ].join(',');

    const sampleRow2 = [
      '2',
      'TEA-C2-360',
      'Trà Xanh C2 Vị Chanh Chai 360ml',
      'Nước giải khát & Trà',
      'Chai',
      '24 chai / thùng',
      '6000',
      '8500',
      'Lốc (6 chai)',
      '6',
      '8934567010088'
    ].join(',');

    const csvContent = '\uFEFF' + [header, sampleRow1, sampleRow2].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Bieu_mau_nhap_SKU_ERP_Sales_Inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Đọc file tải lên (hỗ trợ đọc định dạng text/csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
      if (lines.length <= 1) {
        alert('File không có dữ liệu dòng nào!');
        return;
      }

      // Bỏ qua dòng tiêu đề
      const dataRows = lines.slice(1).map((line) => {
        // Tách theo dấu phẩy hoặc tab
        const cells = line.includes('\t') ? line.split('\t') : line.split(',');
        return {
          sku: cells[1] || cells[0] || '',
          name: cells[2] || cells[1] || '',
          category: cells[3] || '',
          baseUnit: cells[4] || '',
          packagingSpec: cells[5] || '',
          costPrice: cells[6] ? Number(cells[6].replace(/[^0-9.-]/g, '')) : 0,
          basePrice: cells[7] ? Number(cells[7].replace(/[^0-9.-]/g, '')) : 0,
          conversionUnit: cells[8] || '',
          conversionFactor: cells[9] ? Number(cells[9].replace(/[^0-9.-]/g, '')) : 1,
          unitBarcode: cells[10] || ''
        };
      });

      const validated = validateExcelImportData(dataRows);
      setRows(validated);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Sửa trực tiếp ô bị lỗi trên lưới dữ liệu (Inline Edit)
  const handleInlineEdit = (rowId: string, field: keyof ExcelImportRow, value: string | number) => {
    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.id === rowId) {
          const updatedRow = { ...r, [field]: value };
          return updatedRow;
        }
        return r;
      });

      // Sau khi sửa, re-validate lại danh sách
      return validateExcelImportData(
        updated.map((r) => ({
          sku: r.sku,
          name: r.name,
          category: r.category,
          baseUnit: r.baseUnit,
          packagingSpec: r.packagingSpec,
          costPrice: r.costPrice,
          basePrice: r.basePrice,
          conversionUnit: r.conversionUnit,
          conversionFactor: r.conversionFactor,
          unitBarcode: r.unitBarcode
        }))
      );
    });
  };

  // Thực hiện Import
  const handleExecuteImport = async (skipInvalid: boolean) => {
    if (totalCount === 0) {
      alert('Vui lòng tải lên file Excel hoặc nạp dữ liệu trước khi import!');
      return;
    }

    if (!skipInvalid && invalidCount > 0) {
      alert(`Còn ${invalidCount} dòng dữ liệu bị lỗi. Vui lòng sửa lỗi trên lưới hoặc chọn "Chỉ import các dòng hợp lệ"!`);
      return;
    }

    const rowsToProcess = skipInvalid ? rows.filter((r) => r.status !== 'INVALID') : rows;

    if (rowsToProcess.length === 0) {
      alert('Không có dòng dữ liệu hợp lệ nào để import!');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await commitExcelImport(rowsToProcess, userRoles);
      if (res.success) {
        onImportSuccess(res.message);
        onClose();
      } else {
        alert(res.message);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra khi import');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lọc dòng hiển thị theo trạng thái và tìm kiếm
  const displayedRows = rows.filter((r) => {
    if (filterStatus === 'INVALID' && r.status !== 'INVALID') return false;
    if (filterStatus === 'UPDATE' && r.status !== 'UPDATE') return false;
    if (filterStatus === 'VALID' && r.status !== 'VALID') return false;

    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchSku = r.sku.toLowerCase().includes(kw);
      const matchName = r.name.toLowerCase().includes(kw);
      const matchCategory = r.category.toLowerCase().includes(kw);
      return matchSku || matchName || matchCategory;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Nhập danh mục sản phẩm từ Excel & Lưới báo lỗi từng dòng
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium">
                  S2-08 (5.000 SKU)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động kiểm tra tính hợp lệ từng dòng • Nhận diện SKU cập nhật thay vì tạo mới • Cho phép sửa trực tiếp ô lỗi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Upload & Actions Bar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/30 dark:bg-slate-800/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Vùng chọn file hoặc kéo thả */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition">
                <UploadCloud size={16} />
                <span>Chọn tệp Excel / CSV tải lên</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls, text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Nút tải file mẫu */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl transition"
              >
                <Download size={14} />
                Tải tệp mẫu (.CSV)
              </button>

              {/* Nút Nạp dữ liệu mẫu để test ngay lập tức */}
              <button
                type="button"
                onClick={handleLoadDemoData}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 rounded-xl transition shadow-xs"
              >
                <Sparkles size={14} />
                Nạp dữ liệu mẫu (Có dòng Lỗi & Cập nhật để test)
              </button>
            </div>

            {selectedFileName && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <FileSpreadsheet size={14} className="text-emerald-500" />
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{selectedFileName}</span>
              </div>
            )}
          </div>

          {/* Thống kê dòng & Tab lọc */}
          {totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {/* Thẻ thống kê */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterStatus === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Tất cả: <span className="font-mono">{totalCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('VALID')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterStatus === 'VALID'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  Tạo mới hợp lệ: <span className="font-mono">{validCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('UPDATE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterStatus === 'UPDATE'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  <RefreshCw size={13} />
                  Cập nhật SKU cũ: <span className="font-mono">{updateCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('INVALID')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterStatus === 'INVALID'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  <AlertCircle size={13} />
                  Dòng bị lỗi: <span className="font-mono">{invalidCount}</span>
                </button>
              </div>

              {/* Tìm kiếm trong lưới */}
              <div className="relative w-64">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lọc theo SKU, tên sản phẩm..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Lưới dữ liệu (Data Grid) báo lỗi từng dòng */}
        <div className="flex-1 overflow-auto p-4">
          {rows.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <FileSpreadsheet size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Chưa có dữ liệu nào được tải lên
              </p>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                Bạn có thể bấm vào nút <span className="font-semibold text-blue-600">"Nạp dữ liệu mẫu"</span> ở phía trên để trải nghiệm ngay lập tức tính năng lưới báo lỗi từng dòng theo tiêu chuẩn S2-08.
              </p>
              <button
                type="button"
                onClick={handleLoadDemoData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Nạp dữ liệu mẫu để thử nghiệm
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-14">Dòng</th>
                    <th className="py-2.5 px-3 w-28">Trạng thái</th>
                    <th className="py-2.5 px-3 w-36">Mã SKU</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Tên sản phẩm</th>
                    <th className="py-2.5 px-3 w-28">ĐVT cơ sở</th>
                    <th className="py-2.5 px-3 w-28">Quy cách</th>
                    <th className="py-2.5 px-3 w-28">Giá bán cơ sở</th>
                    <th className="py-2.5 px-3 w-32">ĐVT quy đổi</th>
                    <th className="py-2.5 px-3 w-20">Hệ số</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Chi tiết báo lỗi / Cảnh báo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {displayedRows.map((row) => {
                    const isError = row.status === 'INVALID';
                    const isUpdate = row.status === 'UPDATE';

                    return (
                      <tr
                        key={row.id}
                        className={`transition ${
                          isError
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70'
                            : isUpdate
                            ? 'bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Số thứ tự dòng Excel */}
                        <td className="py-2 px-3 text-center font-mono font-medium text-slate-500">
                          {row.rowIndex}
                        </td>

                        {/* Trạng thái dòng */}
                        <td className="py-2 px-3">
                          {isError && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                              <AlertCircle size={12} />
                              Lỗi ({row.errors.length})
                            </span>
                          )}
                          {isUpdate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                              <RefreshCw size={12} />
                              Cập nhật
                            </span>
                          )}
                          {!isError && !isUpdate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                              <CheckCircle2 size={12} />
                              Tạo mới
                            </span>
                          )}
                        </td>

                        {/* Mã SKU (Cho phép inline edit để sửa lỗi) */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.sku}
                            onChange={(e) => handleInlineEdit(row.id, 'sku', e.target.value.toUpperCase())}
                            placeholder="Chưa có SKU"
                            className={`w-full px-2 py-1 text-xs font-mono font-bold uppercase rounded border transition ${
                              !row.sku
                                ? 'bg-rose-100 dark:bg-rose-900/50 border-rose-400 text-rose-800 dark:text-rose-200'
                                : 'bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 text-slate-800 dark:text-slate-200'
                            }`}
                          />
                        </td>

                        {/* Tên sản phẩm */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleInlineEdit(row.id, 'name', e.target.value)}
                            placeholder="Thiếu tên sản phẩm..."
                            className={`w-full px-2 py-1 text-xs rounded border transition ${
                              !row.name
                                ? 'bg-rose-100 dark:bg-rose-900/50 border-rose-400 text-rose-800 dark:text-rose-200'
                                : 'bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 text-slate-800 dark:text-slate-200'
                            }`}
                          />
                        </td>

                        {/* ĐVT cơ sở */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.baseUnit}
                            onChange={(e) => handleInlineEdit(row.id, 'baseUnit', e.target.value)}
                            placeholder="Thiếu ĐVT"
                            className={`w-full px-2 py-1 text-xs font-semibold rounded border transition ${
                              !row.baseUnit
                                ? 'bg-rose-100 dark:bg-rose-900/50 border-rose-400 text-rose-800 dark:text-rose-200'
                                : 'bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 text-blue-600 dark:text-blue-400'
                            }`}
                          />
                        </td>

                        {/* Quy cách */}
                        <td className="py-2 px-3 text-slate-500">
                          {row.packagingSpec || '-'}
                        </td>

                        {/* Giá bán cơ sở */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={row.basePrice}
                            onChange={(e) => handleInlineEdit(row.id, 'basePrice', Number(e.target.value))}
                            className={`w-24 px-2 py-1 text-xs font-mono font-medium rounded border transition ${
                              row.basePrice <= 0
                                ? 'bg-rose-100 dark:bg-rose-900/50 border-rose-400 text-rose-800 dark:text-rose-200'
                                : 'bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500'
                            }`}
                          />
                        </td>

                        {/* ĐVT quy đổi */}
                        <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {row.conversionUnit || <span className="text-slate-400 italic">Không có</span>}
                        </td>

                        {/* Hệ số */}
                        <td className="py-2 px-3">
                          {row.conversionUnit ? (
                            <input
                              type="number"
                              min="1"
                              value={row.conversionFactor}
                              onChange={(e) => handleInlineEdit(row.id, 'conversionFactor', Number(e.target.value))}
                              className={`w-14 px-1.5 py-1 text-xs font-mono font-semibold rounded border transition ${
                                row.conversionFactor <= 0
                                  ? 'bg-rose-100 dark:bg-rose-900/50 border-rose-400 text-rose-800 dark:text-rose-200'
                                  : 'bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500'
                              }`}
                            />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Cột Chi tiết báo lỗi & cảnh báo từng dòng */}
                        <td className="py-2 px-3">
                          <div className="space-y-1">
                            {row.errors.map((err, i) => (
                              <div key={i} className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                <span>{err}</span>
                              </div>
                            ))}
                            {row.warnings.map((warn, i) => (
                              <div key={i} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                <span>{warn}</span>
                              </div>
                            ))}
                            {row.isExistingSku && row.errors.length === 0 && (
                              <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                                <Info size={12} className="shrink-0" />
                                <span>SKU đã có trong hệ thống: Sẽ cập nhật thông tin</span>
                              </div>
                            )}
                            {row.status === 'VALID' && row.warnings.length === 0 && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                Sẵn sàng tạo mới SKU
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Info size={14} className="text-blue-500 shrink-0" />
            <span>
              Bạn có thể nhấp trực tiếp vào các ô SKU, Tên, Giá, Hệ số trên lưới để sửa lỗi trước khi bấm Import.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Hủy bỏ
            </button>

            {/* Nếu có dòng lỗi: Cung cấp tùy chọn Import các dòng hợp lệ */}
            {invalidCount > 0 && validCount + updateCount > 0 && (
              <button
                type="button"
                onClick={() => handleExecuteImport(true)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 rounded-xl transition"
              >
                Bỏ qua {invalidCount} dòng lỗi & Import {validCount + updateCount} dòng hợp lệ
              </button>
            )}

            {/* Nút Import chính thức */}
            <button
              type="button"
              onClick={() => handleExecuteImport(false)}
              disabled={isProcessing || totalCount === 0 || invalidCount > 0}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition flex items-center gap-2 ${
                invalidCount > 0 || totalCount === 0
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Đang xử lý Import...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Xác nhận Import toàn bộ ({totalCount} SKU)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
