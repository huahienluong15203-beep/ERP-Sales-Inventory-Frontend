import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Info,
  Check,
  Search
} from '../../components/common/Icons';
import {
  executeUserImportApi,
  previewUserImportApi,
  downloadUserImportTemplateApi,
  type UserImportPreviewResponse,
  type UserImportSummaryResponse,
  type AdminUserItem
} from '../../services/api';

interface UserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summaryMsg: string) => void;
  /** Không còn dùng: Backend tự kiểm trùng trên toàn bộ dữ liệu (giữ để không phải sửa trang cha) */
  existingUsers?: AdminUserItem[];
}

type ImportStep = 'SELECT_FILE' | 'PREVIEW' | 'SUMMARY';
type PreviewFilterTab = 'ALL' | 'VALID' | 'INVALID';

export const UserImportModal: React.FC<UserImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<ImportStep>('SELECT_FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dữ liệu Preview
  const [previewData, setPreviewData] = useState<UserImportPreviewResponse | null>(null);
  const [filterTab, setFilterTab] = useState<PreviewFilterTab>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Dữ liệu Báo cáo tổng kết
  const [summaryData, setSummaryData] = useState<UserImportSummaryResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setStep('SELECT_FILE');
    setSelectedFile(null);
    setPreviewData(null);
    setSummaryData(null);
    setErrorMsg(null);
    setIsProcessing(false);
    setFilterTab('ALL');
    setSearchKeyword('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Chống trình duyệt tự động mở tệp hoặc tải lại trang khi kéo thả tệp vào bất cứ đâu trên màn hình
  useEffect(() => {
    if (!isOpen) return;
    const preventDragDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventDragDrop);
    window.addEventListener('drop', preventDragDrop);
    return () => {
      window.removeEventListener('dragover', preventDragDrop);
      window.removeEventListener('drop', preventDragDrop);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  /* ──────────────────────────────────────────────────────────────────────────
     1. TẢI TỆP MẪU EXCEL TỪ BACKEND (mẫu và danh sách mã do Backend sinh, luôn khớp dữ liệu thật)
     ────────────────────────────────────────────────────────────────────────── */
  const handleDownloadTemplate = async () => {
    setErrorMsg(null);
    const res = await downloadUserImportTemplateApi();
    if (!res.success) {
      setErrorMsg(res.message || 'Không tải được tệp mẫu từ máy chủ. Vui lòng thử lại!');
    }
  };

  /* ──────────────────────────────────────────────────────────────────────────
     2. CHỌN / KÉO THẢ FILE -> GỬI LÊN BACKEND KIỂM TRA TỪNG DÒNG RỒI HIỆN PREVIEW
     (Backend kiểm trùng tài khoản/email/SĐT trên TOÀN BỘ dữ liệu, mã kho, mã địa bàn...)
     ────────────────────────────────────────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processAndPreviewFile(file);
    }
    // Reset value input để có thể chọn lại cùng 1 file nếu cần
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processAndPreviewFile(file);
    }
  };

  const processAndPreviewFile = async (file: File) => {
    setErrorMsg(null);
    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.xlsx') && !fileNameLower.endsWith('.xls')) {
      setErrorMsg('Vui lòng chọn tệp bảng tính định dạng Excel (.xlsx hoặc .xls).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Dung lượng tệp vượt quá giới hạn 10MB.');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    try {
      const res = await previewUserImportApi(file);
      if (!res.success || !res.data) {
        setSelectedFile(null);
        setErrorMsg(res.message || 'Không thể kiểm tra tệp Excel. Vui lòng thử lại!');
        return;
      }
      if (!res.data.rows || res.data.rows.length === 0) {
        setSelectedFile(null);
        setErrorMsg('Tệp Excel không có dòng dữ liệu nào (chỉ có dòng tiêu đề hoặc tệp rỗng).');
        return;
      }
      setPreviewData(res.data);
      setStep('PREVIEW');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ──────────────────────────────────────────────────────────────────────────
     3. THỰC THI NHẬP (Backend bỏ qua dòng lỗi, nhập dòng hợp lệ, trả báo cáo)
     Lỗi -> báo lỗi thật, KHÔNG giả lập "đã nhập thành công".
     ────────────────────────────────────────────────────────────────────────── */
  const handleExecuteImport = async () => {
    if (!selectedFile || !previewData) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await executeUserImportApi(selectedFile);
      if (!res.success || !res.data) {
        setErrorMsg(res.message || 'Không thể nhập dữ liệu. Chưa có tài khoản nào được tạo, vui lòng thử lại!');
        return;
      }
      if (res.data.successCount === 0) {
        // Không tạo được tài khoản nào -> ở lại báo cáo để xem lý do từng dòng
        setSummaryData(res.data);
        setStep('SUMMARY');
        return;
      }
      if (!res.data.failedCount) {
        handleClose();
        onSuccess(`Đã nhập thành công toàn bộ ${res.data.successCount} tài khoản người dùng từ tệp Excel.`);
        return;
      }
      setSummaryData(res.data);
      setStep('SUMMARY');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ──────────────────────────────────────────────────────────────────────────
     4. HOÀN TẤT & ĐÓNG MODAL KÈM THÔNG BÁO THÂN THIỆN
     ────────────────────────────────────────────────────────────────────────── */
  const handleFinishAndClose = () => {
    const successCount = summaryData?.successCount || 0;
    const failedCount = summaryData?.failedCount || 0;
    handleClose();
    // Không tạo được tài khoản nào -> không báo "thành công"
    if (successCount === 0) return;
    onSuccess(`Nhập thành công ${successCount} tài khoản (đã bỏ qua ${failedCount} dòng lỗi).`);
  };

  // Lọc dữ liệu hiển thị trên bảng Preview
  const filteredRows = (previewData?.rows || []).filter((row) => {
    if (filterTab === 'VALID' && !row.valid) return false;
    if (filterTab === 'INVALID' && row.valid) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      return (
        row.username.toLowerCase().includes(kw) ||
        row.fullName.toLowerCase().includes(kw) ||
        row.email.toLowerCase().includes(kw) ||
        (row.phone && row.phone.includes(kw))
      );
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-white to-amber-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Nhập Danh Sách Người Dùng Từ Excel
              </h2>
              <span className="text-[11px] text-gray-500">
                Xem trước bảng dữ liệu, tự động phát hiện lỗi và bỏ qua dòng sai
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            title="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thanh Stepper Tiến trình */}
        <div className="px-6 py-2.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'SELECT_FILE' ? 'bg-orange-600 text-white' : 'bg-emerald-600 text-white'
                }`}
            >
              {step !== 'SELECT_FILE' ? <Check size={10} /> : '1'}
            </span>
            <span className={`font-semibold ${step === 'SELECT_FILE' ? 'text-orange-700' : 'text-gray-600'}`}>
              Chọn tệp & Tải mẫu
            </span>
          </div>

          <ChevronRight size={14} className="text-gray-300" />

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'PREVIEW'
                ? 'bg-orange-600 text-white'
                : step === 'SUMMARY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 text-gray-600'
                }`}
            >
              {step === 'SUMMARY' ? <Check size={10} /> : '2'}
            </span>
            <span className={`font-semibold ${step === 'PREVIEW' ? 'text-orange-700' : 'text-gray-600'}`}>
              Xem trước & Báo lỗi (Preview)
            </span>
          </div>

          <ChevronRight size={14} className="text-gray-300" />

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'SUMMARY' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
            >
              3
            </span>
            <span className={`font-semibold ${step === 'SUMMARY' ? 'text-emerald-700' : 'text-gray-600'}`}>
              Báo cáo tổng kết
            </span>
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 shrink-0">
            <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Nội dung chính cuộn dọc */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ═════════════════════ BƯỚC 1: CHỌN TỆP & TẢI MẪU ═════════════════════ */}
          {step === 'SELECT_FILE' && (
            <div className="flex flex-col gap-4">
              {/* Thẻ hướng dẫn & Tải mẫu */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Info size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-blue-900">
                      Chưa có tệp dữ liệu chuẩn? Tải tệp Excel mẫu
                    </span>
                    <span className="text-[11px] text-blue-700">
                      Tệp mẫu chứa sẵn các cột thông tin, dữ liệu ví dụ và sheet danh mục mã vai trò, mã kho hợp lệ.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs cursor-pointer shrink-0"
                >
                  <Download size={13} />
                  <span>Tải Tệp Mẫu (.xlsx)</span>
                </button>
              </div>

              {/* Vùng Kéo thả / Chọn file (Tự động chuyển sang Preview ngay khi chọn) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-orange-400 bg-gray-50/60 hover:bg-orange-50/20 rounded-2xl p-7 sm:p-9 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  onClick={(e) => e.stopPropagation()}
                  accept=".xlsx, .xls"
                  className="hidden"
                />

                <div className="w-13 h-13 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                  {isProcessing ? (
                    <RefreshCw size={24} className="animate-spin text-orange-600" />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-xs sm:text-sm font-bold text-gray-800">
                    {isProcessing
                      ? 'Đang đọc và phân tích tệp Excel...'
                      : 'Kéo thả tệp Excel vào đây hoặc nhấp để tải lên'}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Hỗ trợ tệp .xlsx hoặc .xls (Hệ thống sẽ tự động kiểm tra và mở ngay bản xem trước)
                  </span>
                </div>
              </div>

              {/* Ghi chú quy tắc kiểm tra nghiệp vụ */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex flex-col gap-1 text-[11px] text-gray-600">
                <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                  Quy tắc kiểm tra tự động trước khi nhập:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                  <li><strong>Kiểm tra trùng lặp</strong>: Tên tài khoản, Email và Số điện thoại không được trùng với dữ liệu đã có hoặc trùng giữa các dòng trong file.</li>
                  <li><strong>Định dạng số điện thoại</strong>: Phải đúng 10 số di động Việt Nam (đầu 03, 05, 07, 08, 09).</li>
                  <li><strong>Quy tắc vai trò kho </strong>: Thủ kho hoặc Quản lý kho bắt buộc phải gắn ít nhất một mã kho hợp lệ.</li>
                  <li><strong>Cơ chế tự động</strong>: Dòng có lỗi sẽ tự động bị bỏ qua, dòng hợp lệ vẫn được nhập an toàn vào hệ thống.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ═════════════════════ BƯỚC 2: XEM TRƯỚC (PREVIEW) ═════════════════════ */}
          {step === 'PREVIEW' && previewData && (
            <div className="flex flex-col gap-3">
              {/* Thẻ thống kê kết quả kiểm tra */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10.5px] font-bold text-gray-500 uppercase">Tổng số dòng đọc được</span>
                    <span className="text-lg font-extrabold text-gray-800">{previewData.totalRows}</span>
                  </div>
                  <FileSpreadsheet size={22} className="text-gray-400" />
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10.5px] font-bold text-emerald-700 uppercase">Hợp lệ (Sẵn sàng nhập)</span>
                    <span className="text-lg font-extrabold text-emerald-800">{previewData.validRowsCount}</span>
                  </div>
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10.5px] font-bold text-red-700 uppercase">Có lỗi (Sẽ bị bỏ qua)</span>
                    <span className="text-lg font-extrabold text-red-800">{previewData.invalidRowsCount}</span>
                  </div>
                  <AlertCircle size={22} className="text-red-500" />
                </div>
              </div>

              {/* Bộ lọc Tab & Tìm kiếm */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterTab('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${filterTab === 'ALL'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    Tất cả ({previewData.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('VALID')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${filterTab === 'VALID'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                  >
                    Hợp lệ ({previewData.validRowsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('INVALID')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${filterTab === 'INVALID'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                  >
                    Có lỗi ({previewData.invalidRowsCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Lọc tên, email, tài khoản..."
                    className="w-full pl-7 pr-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Bảng Xem trước dữ liệu */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 border-b border-gray-200 z-10">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-12">Dòng</th>
                        <th className="py-2 px-2.5 w-24">Trạng thái</th>
                        <th className="py-2 px-2.5">Tài khoản</th>
                        <th className="py-2 px-2.5">Họ và tên</th>
                        <th className="py-2 px-2.5">Email</th>
                        <th className="py-2 px-2.5">Số điện thoại</th>
                        <th className="py-2 px-2.5">Vai trò</th>
                        <th className="py-2 px-2.5">Kho / Vùng</th>
                        <th className="py-2 px-2.5 min-w-[200px]">Chi tiết kiểm tra & Báo lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-gray-400">
                            Không có dòng dữ liệu nào khớp với điều kiện lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`transition hover:bg-gray-50/80 ${!row.valid ? 'bg-red-50/40' : ''
                              }`}
                          >
                            <td className="py-2 px-2.5 text-center font-mono text-gray-500 font-bold">
                              #{row.rowNumber}
                            </td>
                            <td className="py-2 px-2.5">
                              {row.valid ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 size={11} /> Hợp lệ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                  <AlertCircle size={11} /> Có lỗi
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 font-mono font-semibold text-gray-900">
                              {row.username || '—'}
                            </td>
                            <td className="py-2 px-2.5 text-gray-800 font-medium">
                              {row.fullName || '—'}
                            </td>
                            <td className="py-2 px-2.5 text-gray-600 truncate max-w-[130px]" title={row.email}>
                              {row.email || '—'}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-gray-700">
                              {row.phone || '—'}
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="flex flex-wrap gap-1">
                                {row.roles.map((r) => (
                                  <span
                                    key={r}
                                    className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-gray-100 text-gray-700 border border-gray-200"
                                  >
                                    {r.replace('ROLE_', '')}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-gray-600 text-[10.5px]">
                              {row.warehouseCodes.length > 0 && (
                                <div className="text-gray-700 font-medium">Kho: {row.warehouseCodes.join(', ')}</div>
                              )}
                              {row.regionCodes.length > 0 && (
                                <div className="text-gray-500">Vùng: {row.regionCodes.join(', ')}</div>
                              )}
                              {row.warehouseCodes.length === 0 && row.regionCodes.length === 0 && '—'}
                            </td>
                            <td className="py-2 px-2.5">
                              {row.valid ? (
                                <span className="text-emerald-700 font-medium flex items-center gap-1 text-[10.5px]">
                                  <Check size={11} /> Đủ điều kiện tạo tài khoản
                                </span>
                              ) : (
                                <ul className="list-disc list-inside text-red-600 font-semibold text-[10.5px] space-y-0.5">
                                  {row.errors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
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
              </div>

              {/* Thông điệp nhắc nhở cơ chế bỏ qua dòng lỗi */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>
                  Hệ thống sẽ <strong>tự động bỏ qua {previewData.invalidRowsCount} dòng có lỗi</strong> và chỉ tiến hành
                  nhập <strong>{previewData.validRowsCount} dòng hợp lệ</strong> vào cơ sở dữ liệu.
                </span>
              </div>
            </div>
          )}

          {/* ═════════════════════ BƯỚC 3: BÁO CÁO TỔNG KẾT ═════════════════════ */}
          {step === 'SUMMARY' && summaryData && (
            <div className="flex flex-col gap-4">
              {summaryData.successCount > 0 ? (
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-200 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-emerald-950">
                      Nhập Danh Sách Người Dùng Hoàn Tất!
                    </h3>
                    <span className="text-xs text-emerald-800">
                      Đã tạo thành công <strong>{summaryData.successCount}</strong> tài khoản mới và gửi email mật khẩu tạm. Đã bỏ qua <strong>{summaryData.failedCount}</strong> dòng có lỗi.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <AlertCircle size={24} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-red-900">Chưa tạo được tài khoản nào</h3>
                    <span className="text-xs text-red-800">
                      Cả <strong>{summaryData.failedCount}</strong> dòng đều bị bỏ qua. Xem lý do bên dưới, sửa tệp rồi nhập lại.
                    </span>
                  </div>
                </div>
              )}

              {/* Bảng chi tiết các tài khoản đã tạo */}
              {summaryData.createdUsers.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Tài khoản đã tạo thành công ({summaryData.createdUsers.length})
                  </span>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="py-1.5 px-3">Tài khoản</th>
                          <th className="py-1.5 px-3">Họ và tên</th>
                          <th className="py-1.5 px-3">Email nhận mật khẩu tạm</th>
                          <th className="py-1.5 px-3">Số điện thoại</th>
                          <th className="py-1.5 px-3">Vai trò</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {summaryData.createdUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-3 font-mono font-bold text-gray-800">{u.username}</td>
                            <td className="py-1.5 px-3 font-medium text-gray-900">{u.fullName}</td>
                            <td className="py-1.5 px-3 text-gray-600">{u.email}</td>
                            <td className="py-1.5 px-3 font-mono text-gray-600">{u.phone || '—'}</td>
                            <td className="py-1.5 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                {u.roles.join(', ').replace(/ROLE_/g, '')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bảng chi tiết các dòng bị bỏ qua */}
              {summaryData.failedRows.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Các dòng dữ liệu bị bỏ qua ({summaryData.failedRows.length})
                  </span>
                  <div className="border border-red-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-red-50/20">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-red-50 text-red-800 font-bold sticky top-0 border-b border-red-200">
                        <tr>
                          <th className="py-1.5 px-3 w-16">Dòng</th>
                          <th className="py-1.5 px-3">Tài khoản</th>
                          <th className="py-1.5 px-3">Email</th>
                          <th className="py-1.5 px-3">Lý do từ chối</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {summaryData.failedRows.map((f, idx) => (
                          <tr key={idx} className="hover:bg-red-50/40">
                            <td className="py-1.5 px-3 font-mono font-bold text-red-600">#{f.rowNumber}</td>
                            <td className="py-1.5 px-3 font-mono text-gray-700">{f.username || '—'}</td>
                            <td className="py-1.5 px-3 text-gray-600">{f.email || '—'}</td>
                            <td className="py-1.5 px-3 text-red-700 font-medium">
                              {f.reasons.join('; ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          {step === 'SELECT_FILE' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          )}

          {step === 'PREVIEW' && previewData && (
            <>
              <button
                type="button"
                onClick={() => setStep('SELECT_FILE')}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
              >
                Chọn lại tệp khác
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={previewData.validRowsCount === 0 || isProcessing}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>
                  {isProcessing
                    ? 'Đang thực thi nhập…'
                    : `Tiến hành nhập (${previewData.validRowsCount} dòng hợp lệ)`}
                </span>
              </button>
            </>
          )}

          {step === 'SUMMARY' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Hoàn tất & Cập nhật danh sách</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
