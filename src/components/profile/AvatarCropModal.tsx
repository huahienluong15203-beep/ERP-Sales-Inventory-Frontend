import { useState, useRef, useEffect, useCallback, type FC, type PointerEvent } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Camera
} from '../common/Icons';
import { uploadAvatarApi } from '../../services/api';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  originalFile: File | null;
  onClose: () => void;
  onSuccess: (result: { avatarUrl: string; avatarThumbnailUrl: string }) => void;
}

const VIEWPORT_SIZE = 280; // Kích thước khung cắt vuông (px)
const CANVAS_OUTPUT_SIZE = 500; // Độ phân giải xuất ảnh đại diện chuẩn vuông 500x500

export const AvatarCropModal: FC<AvatarCropModalProps> = ({
  isOpen,
  imageSrc,
  originalFile,
  onClose,
  onSuccess
}) => {
  const [zoom, setZoom] = useState<number>(1); // Zoom multiplier từ 1.0 đến 3.0
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Khi tải ảnh mới vào modal, đặt lại các trạng thái căn chỉnh
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setErrorMessage(null);

      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Giới hạn vùng di chuyển (clamping) để ảnh luôn phủ kín khung vuông không bị viền trống
  const clampOffset = useCallback(
    (newX: number, newY: number, currentZoom: number) => {
      if (!imageSize) return { x: 0, y: 0 };
      const baseScale = Math.max(
        VIEWPORT_SIZE / imageSize.width,
        VIEWPORT_SIZE / imageSize.height
      );
      const scale = baseScale * currentZoom;
      const renderedWidth = imageSize.width * scale;
      const renderedHeight = imageSize.height * scale;

      const maxPanX = Math.max(0, (renderedWidth - VIEWPORT_SIZE) / 2);
      const maxPanY = Math.max(0, (renderedHeight - VIEWPORT_SIZE) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, newX)),
        y: Math.min(maxPanY, Math.max(-maxPanY, newY))
      };
    },
    [imageSize]
  );

  // Cập nhật live preview thumbnail nhỏ bên cạnh
  useEffect(() => {
    if (!imageSize || !imgRef.current) return;

    const img = imgRef.current;
    const baseScale = Math.max(
      VIEWPORT_SIZE / imageSize.width,
      VIEWPORT_SIZE / imageSize.height
    );
    const scale = baseScale * zoom;
    const renderedWidth = imageSize.width * scale;
    const renderedHeight = imageSize.height * scale;

    const leftOnRendered = (renderedWidth - VIEWPORT_SIZE) / 2 - offset.x;
    const topOnRendered = (renderedHeight - VIEWPORT_SIZE) / 2 - offset.y;

    const sourceX = Math.max(0, leftOnRendered / scale);
    const sourceY = Math.max(0, topOnRendered / scale);
    const sourceSize = VIEWPORT_SIZE / scale;

    const canvas = previewCanvasRef.current || document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 120, 120);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        120,
        120
      );
      setPreviewDataUrl(canvas.toDataURL('image/png'));
    }
  }, [imageSize, zoom, offset]);

  // Xử lý kéo di chuyển (Pan) bằng Pointer Events (chuột hoặc cảm ứng)
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialOffset({ ...offset });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const clamped = clampOffset(initialOffset.x + dx, initialOffset.y + dy, zoom);
    setOffset(clamped);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Bỏ qua lỗi release nếu pointer đã huỷ
      }
    }
  };

  // Xử lý điều chỉnh thanh thu phóng (Zoom slider)
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, newZoom));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom));
  };

  // Đặt lại căn giữa
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Lưu ảnh đại diện: Tự động dùng file gốc nếu không chỉnh sửa, hoặc dùng ảnh đã cắt vuông
  const handleSaveAndUpload = async () => {
    if (!imageSize || !imgRef.current) return;
    setErrorMessage(null);
    setIsUploading(true);

    try {
      const isUntouched = zoom === 1 && offset.x === 0 && offset.y === 0;

      // Trường hợp 1: Người dùng không di chuyển/thu phóng và có file gốc -> Tải thẳng file gốc
      if (isUntouched && originalFile) {
        const res = await uploadAvatarApi(originalFile);
        if (res.success && res.avatarUrl) {
          onSuccess({
            avatarUrl: res.avatarUrl,
            avatarThumbnailUrl: res.avatarThumbnailUrl || res.avatarUrl
          });
          onClose();
          return;
        } else if (res.message) {
          setErrorMessage(res.message);
          return;
        }
      }

      // Trường hợp 2: Người dùng có thu phóng hoặc di chuyển -> Cắt đúng khung vuông 500x500
      const img = imgRef.current;
      const baseScale = Math.max(
        VIEWPORT_SIZE / imageSize.width,
        VIEWPORT_SIZE / imageSize.height
      );
      const scale = baseScale * zoom;
      const renderedWidth = imageSize.width * scale;
      const renderedHeight = imageSize.height * scale;

      const leftOnRendered = (renderedWidth - VIEWPORT_SIZE) / 2 - offset.x;
      const topOnRendered = (renderedHeight - VIEWPORT_SIZE) / 2 - offset.y;

      const sourceX = Math.max(0, leftOnRendered / scale);
      const sourceY = Math.max(0, topOnRendered / scale);
      const sourceSize = VIEWPORT_SIZE / scale;

      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_OUTPUT_SIZE;
      canvas.height = CANVAS_OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Không thể khởi tạo trình xử lý đồ họa Canvas.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        CANVAS_OUTPUT_SIZE,
        CANVAS_OUTPUT_SIZE
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
      });

      if (!blob) {
        throw new Error('Lỗi xuất tệp ảnh đại diện.');
      }

      // Gửi blob đã được cắt vuông chuẩn 500x500 (không kèm toạ độ cắt để tránh xung đột)
      const res = await uploadAvatarApi(blob);

      if (res.success && res.avatarUrl) {
        onSuccess({
          avatarUrl: res.avatarUrl,
          avatarThumbnailUrl: res.avatarThumbnailUrl || res.avatarUrl
        });
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể lưu ảnh đại diện. Vui lòng thử lại!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi xử lý ảnh đại diện.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const baseScale = imageSize
    ? Math.max(VIEWPORT_SIZE / imageSize.width, VIEWPORT_SIZE / imageSize.height)
    : 1;
  const currentScale = baseScale * zoom;
  const imgWidth = imageSize ? imageSize.width * currentScale : VIEWPORT_SIZE;
  const imgHeight = imageSize ? imageSize.height * currentScale : VIEWPORT_SIZE;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[9999]"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="w-full max-w-[540px] bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col relative"
        style={{ animation: 'scaleIn 0.2s ease-out' }}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Camera size={16} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-gray-900">Cắt & Căn Chỉnh Ảnh Đại Diện</h3>
              <p className="text-[11px] text-gray-500">
                Kéo ảnh để căn giữa hoặc phóng to/thu nhỏ nếu cần thiết
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nội dung cắt ảnh */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Vùng tương tác cắt ảnh & Xem trước */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            {/* 1. Khung cắt tương tác 280x280 */}
            <div
              className="relative rounded-2xl overflow-hidden select-none bg-slate-900 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing border border-slate-700"
              style={{
                width: `${VIEWPORT_SIZE}px`,
                height: `${VIEWPORT_SIZE}px`,
                touchAction: 'none'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Ảnh gốc hiển thị tương tác */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Source Crop"
                draggable={false}
                className="absolute pointer-events-none max-w-none transition-none"
                style={{
                  width: `${imgWidth}px`,
                  height: `${imgHeight}px`,
                  left: `calc(50% + ${offset.x}px)`,
                  top: `calc(50% + ${offset.y}px)`,
                  transform: 'translate(-50%, -50%)',
                  userSelect: 'none'
                }}
              />

              {/* Lớp Mask tròn mờ vùng ngoài */}
              <div
                className="absolute inset-0 pointer-events-none border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]"
                style={{
                  borderRadius: '50%'
                }}
              />

              {/* Lưới bố cục 3x3 quy chuẩn chụp ảnh (Rule of Thirds) */}
              <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 border border-white/20">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div />
                </div>
              </div>

              {/* Nhãn hướng dẫn kéo trên mobile/desktop */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 text-[10px] text-white/90 backdrop-blur-xs pointer-events-none">
                Kéo để di chuyển vị trí
              </div>
            </div>

            {/* 2. Cột xem trước thực tế (Live Previews) */}
            <div className="flex sm:flex-col items-center justify-center gap-4 bg-gray-50/80 p-3 rounded-2xl border border-gray-100 min-w-[140px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                Xem Trước
              </span>

              {/* Preview 1: Header / Topbar avatar (40x40 tròn) */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-orange-500/40 shadow-sm bg-white">
                  {previewDataUrl ? (
                    <img src={previewDataUrl} alt="Preview Header" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orange-100" />
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-medium">Thanh điều hướng</span>
              </div>

              {/* Preview 2: Profile Card avatar (64x64 tròn) */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-3 ring-orange-500 shadow-md bg-white">
                  {previewDataUrl ? (
                    <img src={previewDataUrl} alt="Preview Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orange-100" />
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-medium">Hồ sơ cá nhân</span>
              </div>
            </div>
          </div>

          {/* Điều khiển Thu phóng (Zoom Controls) & Căn giữa */}
          <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-600 font-medium px-1">
              <span className="text-[11px] font-bold text-gray-700">Độ thu phóng:</span>
              <span className="text-[11px] font-mono text-orange-600 font-bold">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.2)}
                disabled={zoom <= 1 || isUploading}
                aria-label="Thu nhỏ"
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut size={14} />
              </button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                disabled={isUploading}
                className="flex-1 accent-orange-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
              />

              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.2)}
                disabled={zoom >= 3 || isUploading}
                aria-label="Phóng to"
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn size={14} />
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isUploading || (zoom === 1 && offset.x === 0 && offset.y === 0)}
                title="Căn giữa lại ảnh"
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 transition disabled:opacity-40 cursor-pointer ml-1"
              >
                <RotateCcw size={12} />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 bg-orange-50/60 p-2 rounded-xl border border-orange-100 leading-relaxed">
            Hệ thống sẽ tự động tối ưu hóa ảnh thành kích thước chuẩn 500x500px và tạo thêm phiên bản thu nhỏ 100x100px để hiển thị mượt mà trên toàn hệ thống.
          </div>
        </div>

        {/* Footer Hành Động Gọn Gàng */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSaveAndUpload}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isUploading ? (
              <RefreshCw size={14} className="animate-spin text-white" />
            ) : (
              <Check size={14} />
            )}
            <span>{isUploading ? 'Đang lưu ảnh…' : 'Cập Nhật Ảnh Đại Diện'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
