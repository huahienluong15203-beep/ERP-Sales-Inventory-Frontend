import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Clock,
  Trash2,
  PenTool,
  RefreshCw,
  Eye,
  RotateCcw
} from 'lucide-react';
import {
  uploadDeliveryProof,
  confirmOrderDelivery,
  failOrderDelivery,
  fetchDeliveryProofBlobUrl
} from '../../services/orderDeliveryApi';

interface DeliveryProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderCode: string;
  customerName?: string;
  deliveryAddress?: string;
  receiverPhone?: string;
  isDelivered?: boolean;
  initialMode?: 'CONFIRM' | 'FAIL' | 'VIEW';
  onSuccess: () => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const COMMON_FAILED_REASONS = [
  'Khách vắng nhà / Không liên lạc được qua điện thoại',
  'Khách từ chối nhận do sai quy cách hoặc bao bì lỗi',
  'Khách yêu cầu dời lịch nhận hàng sang ngày khác',
  'Sai địa chỉ giao hàng hoặc đại lý đã chuyển địa điểm',
  'Xe không vào được điểm giao (đường cấm / ngập nước)',
  'Lý do khác (ghi chi tiết bên dưới)'
];

export const DeliveryProofModal: React.FC<DeliveryProofModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderCode,
  customerName,
  deliveryAddress,
  receiverPhone,
  isDelivered = false,
  initialMode = 'CONFIRM',
  onSuccess,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIRM' | 'FAIL' | 'VIEW'>('CONFIRM');

  const getTodayLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form Xác nhận giao (CONFIRM)
  const [receiverName, setReceiverName] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(getTodayLocalDate());
  const [note, setNote] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useSignaturePad, setUseSignaturePad] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  // Form Thất bại (FAIL)
  const [selectedReasonOption, setSelectedReasonOption] = useState<string>(COMMON_FAILED_REASONS[0]);
  const [customReasonDetail, setCustomReasonDetail] = useState<string>('');

  // Xem ảnh biên bản (VIEW)
  const [existingProofUrl, setExistingProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState<boolean>(false);

  // Trạng thái xử lý
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Canvas Ký tên điện tử trên Mobile / Touchscreen
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isDelivered ? 'VIEW' : initialMode);
      setReceiverName(customerName || '');
      setDeliveryDate(getTodayLocalDate());
      setSelectedFile(null);
      setPreviewUrl(null);
      setNote('');
      setUseSignaturePad(false);
      setHasSignature(false);
      setSelectedReasonOption(COMMON_FAILED_REASONS[0]);
      setCustomReasonDetail('');

      if (isDelivered || initialMode === 'VIEW') {
        loadExistingProof();
      }
    }
  }, [isOpen, orderId, isDelivered, initialMode, customerName]);

  const loadExistingProof = async () => {
    setLoadingProof(true);
    try {
      const url = await fetchDeliveryProofBlobUrl(orderId);
      setExistingProofUrl(url);
    } catch {
      setExistingProofUrl(null);
    } finally {
      setLoadingProof(false);
    }
  };

  // Xử lý chọn tệp / chụp ảnh từ camera điện thoại
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Cảnh báo', 'Vui lòng chọn tệp định dạng hình ảnh (JPG, PNG)', 'info');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Cảnh báo', 'Ảnh vượt quá dung lượng tối đa 5MB. Vui lòng chọn ảnh nhẹ hơn.', 'info');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUseSignaturePad(false);
  };

  // Canvas Signature logic (chuột hoặc cảm ứng điện thoại)
  useEffect(() => {
    if (useSignaturePad && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [useSignaturePad]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Submit xác nhận giao thành công (S6-08)
  const handleSubmitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName.trim()) {
      showToast('Cảnh báo', 'Vui lòng nhập họ tên người nhận hàng!', 'info');
      return;
    }

    let fileToUpload: File | Blob | null = selectedFile;

    // Nếu dùng chữ ký canvas
    if (useSignaturePad && hasSignature && canvasRef.current) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob((b) => resolve(b), 'image/png');
      });
      if (blob) {
        fileToUpload = blob;
      }
    }

    if (!fileToUpload) {
      showToast(
        'Yêu cầu chứng từ',
        'Vui lòng tải lên ảnh chụp biên bản có chữ ký hoặc ký nhận điện tử trước khi xác nhận!',
        'info'
      );
      return;
    }

    setSubmitting(true);
    try {
      // Bước 1: Upload ảnh biên bản có chữ ký qua API S6-08
      await uploadDeliveryProof(orderId, fileToUpload, `POD_${orderCode}.png`);

      // Lấy giờ thực tế hiện tại (local time) ghép với ngày đã chọn để tránh lỗi múi giờ
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const realTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const finalDeliveredAt = `${deliveryDate}T${realTimeStr}`;

      // Bước 2: Xác nhận giao hàng
      await confirmOrderDelivery(orderId, {
        receiverName: receiverName.trim(),
        deliveredAt: finalDeliveredAt,
        note: note.trim()
      });

      showToast('Thành công', `Đơn hàng ${orderCode} đã xác nhận giao thành công với biên bản chữ ký!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Lỗi xác nhận', err.message || 'Không thể xác nhận giao hàng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit ghi nhận giao không thành công (S6-08)
  const handleSubmitFail = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      selectedReasonOption === 'Lý do khác (ghi chi tiết bên dưới)'
        ? customReasonDetail.trim()
        : customReasonDetail.trim()
          ? `${selectedReasonOption}: ${customReasonDetail.trim()}`
          : selectedReasonOption;

    if (!finalReason) {
      showToast('Cảnh báo', 'Vui lòng chọn hoặc nhập lý do giao không thành công!', 'info');
      return;
    }

    setSubmitting(true);
    try {
      await failOrderDelivery(orderId, finalReason);
      showToast(
        'Đã ghi nhận',
        `Đơn hàng ${orderCode} đã ghi nhận giao không thành công. Hàng hoá sẽ được tự động nhập lại kho khi xe về.`,
        'info'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Lỗi ghi nhận', err.message || 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-white/20 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate">Biên bản giao hàng</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin đại lý ngắn gọn */}
        <div className="bg-orange-50/50 border-b border-orange-100 p-3 px-4 text-xs text-gray-700 shrink-0">
          <div className="font-semibold text-gray-900 truncate">{customerName}</div>
          <div className="text-gray-500 truncate mt-0.5 text-[11px]">
            📍 {deliveryAddress || 'Giao tại địa chỉ đại lý'} {receiverPhone ? `• 📞 ${receiverPhone}` : ''}
          </div>
        </div>

        {/* Tab Selection */}
        {!isDelivered && (
          <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('CONFIRM')}
              className={`flex-1 py-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'CONFIRM'
                  ? 'border-[#F85606] text-[#F85606] bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Giao Thành Công (POD)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('FAIL')}
              className={`flex-1 py-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'FAIL'
                  ? 'border-red-500 text-red-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Giao Thất Bại</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: XÁC NHẬN GIAO THÀNH CÔNG */}
          {activeTab === 'CONFIRM' && (
            <form onSubmit={handleSubmitConfirm} className="space-y-4 text-xs">
              {/* Tên người nhận */}
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#F85606]" />
                  Họ tên người nhận / ký biên bản: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Ví dụ: Anh Nguyễn Văn Tuấn (Quản lý kho đại lý)..."
                  required
                  className="w-full font-medium border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none"
                />
              </div>

              {/* Thời điểm giao hàng thực tế (chỉ hiển thị ngày, tự động gắn giờ thực tế) */}
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#F85606]" />
                  Thời điểm giao hàng thực tế: <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                  className="w-full font-medium font-mono border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-200 focus:border-[#F85606] outline-none"
                />
              </div>

              {/* Chứng từ / Ảnh chữ ký (Bắt buộc theo AC1) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-[#F85606]" />
                    Ảnh biên bản giao nhận có chữ ký: <span className="text-red-500">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUseSignaturePad(!useSignaturePad)}
                      className="text-[11px] text-[#F85606] hover:underline font-semibold cursor-pointer"
                    >
                      {useSignaturePad ? '← Chọn ảnh có sẵn' : '✍️ Ký trực tiếp trên màn hình'}
                    </button>
                  </div>
                </div>

                {/* Chế độ 1: Chọn ảnh / Chụp ảnh camera điện thoại */}
                {!useSignaturePad ? (
                  <div>
                    {!previewUrl ? (
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-orange-300 rounded-2xl bg-orange-50/20 hover:bg-orange-50/40 transition-colors cursor-pointer text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-orange-100 text-[#F85606] flex items-center justify-center">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Chụp ảnh hoặc Tải ảnh biên bản có chữ ký</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Hỗ trợ JPG, PNG (tối đa 5MB). Trên điện thoại có thể chụp trực tiếp.
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-orange-200 bg-gray-900 group">
                        <img
                          src={previewUrl}
                          alt="Biên bản giao hàng"
                          className="w-full h-48 object-contain bg-black/40"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <label className="p-1.5 bg-white/90 text-gray-700 hover:text-[#F85606] rounded-lg shadow cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl(null);
                            }}
                            className="p-1.5 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-2 bg-white text-[11px] text-gray-600 flex items-center justify-between">
                          <span className="truncate">{selectedFile?.name || 'Ảnh biên bản đã chọn'}</span>
                          <span className="text-emerald-600 font-bold">✓ Sẵn sàng tải lên</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Chế độ 2: Ký tên điện tử trên màn hình Mobile / Desktop */
                  <div className="space-y-2">
                    <div className="relative border-2 border-dashed border-orange-300 rounded-2xl bg-white overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={160}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-40 touch-none cursor-crosshair bg-white"
                      />
                      {!hasSignature && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-xs font-medium">
                          ✍️ Dùng ngón tay hoặc bút cảm ứng ký vào đây
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Khách hàng / Đại lý ký xác nhận trực tiếp</span>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-red-500 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Xóa ký lại
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ghi chú thêm */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Ghi chú giao hàng (tuỳ chọn):</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Đã giao đủ 10 thùng, đại lý kiểm đếm nguyên vẹn..."
                  className="w-full font-medium border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-200 outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu biên bản...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận giao thành công</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: GIAO KHÔNG THÀNH CÔNG */}
          {activeTab === 'FAIL' && (
            <form onSubmit={handleSubmitFail} className="space-y-4 text-xs">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Quy định xử lý hàng giao thất bại:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-700">
                  Toàn bộ hàng hoá chưa giao được của đơn <strong>{orderCode}</strong> sẽ được chở về và hệ thống tự động nhập lại kho khi xe quay về kết thúc chuyến.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1.5">
                  Lý do giao không thành công: <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {COMMON_FAILED_REASONS.map((reason, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border transition cursor-pointer ${
                        selectedReasonOption === reason
                          ? 'border-red-300 bg-red-50/50 text-red-900 font-semibold'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="failedReason"
                        checked={selectedReasonOption === reason}
                        onChange={() => setSelectedReasonOption(reason)}
                        className="mt-0.5 accent-red-600"
                      />
                      <span className="text-xs">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Mô tả chi tiết / Dặn dò nhập lại kho:
                </label>
                <textarea
                  rows={3}
                  value={customReasonDetail}
                  onChange={(e) => setCustomReasonDetail(e.target.value)}
                  placeholder="Ghi rõ chi tiết (ví dụ: Gọi 3 cuộc không ai nghe máy, hẹn giao lại vào thứ 2 tuần sau...)"
                  className="w-full font-medium border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Ghi nhận giao không thành công</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: XEM LẠI BIÊN BẢN CÓ CHỮ KÝ (VIEW POD) */}
          {activeTab === 'VIEW' && (
            <div className="space-y-4 text-xs">
              {loadingProof ? (
                <div className="p-8 text-center text-gray-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#F85606]" />
                  <p className="font-semibold">Đang tải biên bản giao hàng...</p>
                </div>
              ) : existingProofUrl ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <div className="font-bold">Đã xác nhận giao hàng thành công</div>
                        <div className="text-[11px] text-emerald-700">Đại lý đã ký nhận đủ hàng</div>
                      </div>
                    </div>
                    <a
                      href={existingProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem ảnh gốc
                    </a>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 shadow-inner flex items-center justify-center p-2">
                    <img
                      src={existingProofUrl}
                      alt={`Biên bản giao hàng ${orderCode}`}
                      className="max-h-80 w-auto object-contain rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2 text-gray-500">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="font-bold text-gray-700">Chưa có ảnh biên bản giao hàng</p>
                  <p className="text-[11px] text-gray-400">
                    Đơn hàng này chưa được tải lên ảnh chứng từ có chữ ký.
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
