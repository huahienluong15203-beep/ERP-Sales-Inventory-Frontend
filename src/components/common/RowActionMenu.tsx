import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Nút "⋯" ở cột Thao tác: ngoài bảng chỉ để nút Xem chi tiết / Sửa,
 * các thao tác phụ (In, Sao chép, Xoá, Đổi trạng thái...) gom vào menu này cho gọn.
 * Menu nổi trên cùng (portal vào body) nên không bị bảng có overflow cắt mất.
 */
export interface RowActionItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  /** Tô đỏ cho thao tác nguy hiểm (Xoá, Từ chối...). */
  danger?: boolean;
  disabled?: boolean;
  /** Ẩn mục này (vd không có quyền / sai trạng thái). */
  hidden?: boolean;
  title?: string;
}

interface RowActionMenuProps {
  items: RowActionItem[];
  title?: string;
  className?: string;
}

const MENU_WIDTH = 210;

export function RowActionMenu({ items, title = 'Thao tác khác', className }: RowActionMenuProps) {
  const visible = items.filter((i) => !i.hidden);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(8, r.right - MENU_WIDTH), vw - MENU_WIDTH - 8);
    const estimated = visible.length * 36 + 12;
    const openUp = vh - r.bottom < estimated + 8 && r.top > vh - r.bottom;
    setPos(openUp ? { bottom: vh - r.top + 4, left } : { top: r.bottom + 4, left });
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (!open) place();
          setOpen((v) => !v);
        }}
        className={
          className ??
          `p-1.5 rounded-lg border transition-colors cursor-pointer ${
            open
              ? 'bg-orange-50 border-orange-300 text-[#F85606]'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`
        }
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: MENU_WIDTH, zIndex: 100000 }}
            className="erp-search-select-panel rounded-xl border border-gray-200 bg-white shadow-xl py-1.5 text-xs animate-in fade-in-0 zoom-in-95"
          >
            {visible.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                title={item.title}
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-gray-700 hover:bg-orange-50 hover:text-[#F85606]'
                }`}
              >
                {item.icon && <span className="shrink-0 flex items-center">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export default RowActionMenu;
