import React, { useEffect } from 'react';

/**
 * Global Modal Scroll Lock Manager
 * - Tự động phát hiện mọi modal, dialog, popup (fixed inset-0 với z-index cao) hiển thị trên màn hình.
 * - Khóa cuộn trang nền (document.documentElement và document.body: overflow: hidden, overscroll-behavior: none).
 * - Bù trừ scrollbarWidth để tránh giật giao diện (layout shift) khi thanh cuộn ẩn/hiện.
 * - Cho phép 100% cuộn tự nhiên mượt mà trên mọi nội dung, danh sách sản phẩm, bảng biểu bên trong modal.
 * - Chặn cuộn nền khi chuột lăn trên lớp nền backdrop mờ hoặc vùng bên ngoài hộp thoại modal.
 */

// Kiểm tra xem một phần tử DOM có phải là modal overlay/backdrop đang hiển thị hay không
function isModalOverlay(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;

  const classList = el.classList;
  const isFixed = classList.contains('fixed') || window.getComputedStyle(el).position === 'fixed';
  if (!isFixed) return false;

  // Kiểm tra bao phủ toàn màn hình (inset-0 hoặc top:0, left:0, right:0, bottom:0)
  const isInset0 = classList.contains('inset-0') || el.className.includes('inset-0');
  const style = window.getComputedStyle(el);
  const coversScreen =
    isInset0 ||
    (style.top === '0px' &&
      style.left === '0px' &&
      (style.right === '0px' || style.width === `${window.innerWidth}px` || style.width === '100%') &&
      (style.bottom === '0px' || style.height === `${window.innerHeight}px` || style.height === '100%'));

  if (!coversScreen) return false;

  // Kiểm tra z-index >= 30 để nhận diện các lớp phủ modal (z-40, z-50, z-[9999], z-[10000]...)
  const z = parseInt(style.zIndex, 10);
  const hasHighZ =
    (!isNaN(z) && z >= 30) ||
    classList.contains('z-50') ||
    classList.contains('z-40') ||
    el.className.includes('z-[');
  if (!hasHighZ) return false;

  // Bỏ qua các phần tử ẩn (display: none, visibility: hidden, opacity: 0)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;

  // Loại trừ thanh thông báo Toast nếu có
  if (
    el.id === 'toast-container' ||
    el.getAttribute('role') === 'alert' ||
    el.className.includes('toast')
  ) {
    return false;
  }

  return true;
}

// Kiểm tra xem hiện có ít nhất một modal overlay đang hiển thị trên màn hình không
function hasVisibleModal(): boolean {
  const overlays = document.querySelectorAll<HTMLElement>(
    '.fixed.inset-0, [class*="fixed"][class*="inset-0"]'
  );
  for (let i = 0; i < overlays.length; i++) {
    if (isModalOverlay(overlays[i])) {
      return true;
    }
  }
  return false;
}

let isLocked = false;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyPaddingRight = '';

export function updateModalLockState() {
  const modalActive = hasVisibleModal();

  if (modalActive && !isLocked) {
    isLocked = true;
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;

    // Bù trừ độ rộng thanh cuộn scrollbar tránh giật trang
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
  } else if (!modalActive && isLocked) {
    isLocked = false;
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document.documentElement.style.overflow = originalHtmlOverflow;
    document.body.style.overflow = originalBodyOverflow;
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.overscrollBehavior = '';
    document.body.style.paddingRight = originalBodyPaddingRight;
  }
}

/**
 * Hook cho phép kích hoạt khóa cuộn trang chủ động (nếu cần)
 */
export function useBodyScrollLock(lock: boolean = true) {
  useEffect(() => {
    if (!lock) return;
    updateModalLockState();
    return () => {
      updateModalLockState();
    };
  }, [lock]);
}

/**
 * Component quản lý khóa cuộn toàn cục được nhúng tại Root của ứng dụng
 */
export const ModalScrollLockManager: React.FC = () => {
  useEffect(() => {
    // 1. Lắng nghe thay đổi DOM (mở / đóng modal bất kỳ trong ứng dụng)
    const observer = new MutationObserver(() => {
      updateModalLockState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });

    // 2. Kiểm tra trạng thái ban đầu
    updateModalLockState();

    // 3. Xử lý sự kiện lăn chuột (wheel):
    // - Cho phép 100% cuộn tự nhiên mọi nội dung bên trong modal dialog (danh sách sản phẩm, bảng...)
    // - Chặn cuộn nền khi trỏ chuột vào vùng backdrop mờ bên ngoài hộp thoại modal
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Tìm overlay backdrop gần nhất chứa target
      const modalBackdrop = target.closest('.fixed.inset-0, [class*="fixed"][class*="inset-0"]');

      if (modalBackdrop && isModalOverlay(modalBackdrop)) {
        // Nếu chuột nằm trực tiếp trên lớp nền backdrop mờ (vùng tối ngoài hộp thoại modal):
        if (target === modalBackdrop) {
          // Chỉ chặn nếu bản thân modal overlay không cần cuộn trang (chiều cao dialog <= viewport)
          if (modalBackdrop.scrollHeight <= modalBackdrop.clientHeight) {
            e.preventDefault();
          }
          return;
        }

        // Con trỏ chuột nằm BÊN TRONG hộp thoại modal (danh sách hàng hoá, form, bảng biểu...):
        // Tuyệt đối KHÔNG gọi e.preventDefault(), để trình duyệt tự do cuộn mượt mà 100%!
        return;
      }

      // Nếu có modal đang mở nhưng chuột nằm ngoài backdrop (phần nền phía sau modal):
      if (hasVisibleModal()) {
        e.preventDefault();
      }
    };

    // 4. Xử lý thao tác vuốt trên thiết bị cảm ứng
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const modalBackdrop = target.closest('.fixed.inset-0, [class*="fixed"][class*="inset-0"]');

      if (modalBackdrop && isModalOverlay(modalBackdrop)) {
        if (target === modalBackdrop) {
          if (modalBackdrop.scrollHeight <= modalBackdrop.clientHeight && e.cancelable) {
            e.preventDefault();
          }
          return;
        }
        return;
      }

      if (hasVisibleModal() && e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('resize', updateModalLockState);

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', updateModalLockState);

      // Hoàn trả trạng thái body/html nếu đang khóa
      if (isLocked) {
        isLocked = false;
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overscrollBehavior = '';
        document.body.style.overscrollBehavior = '';
        document.body.style.paddingRight = originalBodyPaddingRight;
      }
    };
  }, []);

  return null;
};
