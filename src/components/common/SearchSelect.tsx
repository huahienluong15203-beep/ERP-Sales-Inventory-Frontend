import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, RefreshCw } from 'lucide-react';
import { normalizeSearchText } from '../../hooks/useServerSearch';

/**
 * Ô chọn có tìm kiếm, dùng thay cho thẻ <select> trong toàn bộ app.
 * Cách dùng giống hệt <select>: vẫn viết các thẻ <option> bên trong, onChange vẫn đọc e.target.value
 * nên chỉ cần đổi tên thẻ <select> thành <SearchSelect>.
 * Danh sách mở ra nổi trên cùng (portal vào body) nên không bị modal / bảng có overflow che mất.
 */

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
}

export interface SearchSelectProps {
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  title?: string;
  /** Chữ gợi ý trong ô tìm kiếm của danh sách. */
  searchPlaceholder?: string;
  /** Nhãn hiển thị của giá trị đang chọn khi option chưa có trong danh sách tải động */
  selectedLabel?: string;
  /** Hỗ trợ tìm kiếm từ server */
  onSearchChange?: (query: string) => void;
  /** Sự kiện khi cuộn gần cuối danh sách để tải thêm trang tiếp theo */
  onLoadMore?: () => void;
  /** Còn dữ liệu để tải tiếp hay không */
  hasMore?: boolean;
  /** Đang tải thêm dữ liệu hoặc đang tìm kiếm */
  isLoading?: boolean;
  /** Chế độ tìm kiếm qua API server (không lọc lại ở client) */
  isAsync?: boolean;
}

/** Lấy chữ hiển thị của một <option> (children có thể là chuỗi, số, mảng hoặc phần tử lồng nhau). */
function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

/** Gom các thẻ <option> (kể cả nằm trong Fragment / <optgroup> / mảng .map) thành danh sách phẳng. */
function collectOptions(children: ReactNode, out: SelectOption[], group?: string) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as {
      children?: ReactNode;
      value?: string | number;
      disabled?: boolean;
      label?: string;
    };
    if (child.type === Fragment) {
      collectOptions(props.children, out, group);
    } else if (child.type === 'optgroup') {
      collectOptions(props.children, out, props.label);
    } else if (child.type === 'option') {
      const label = nodeText(props.children).replace(/\s+/g, ' ').trim();
      out.push({
        value: props.value !== undefined && props.value !== null ? String(props.value) : label,
        label,
        disabled: !!props.disabled,
        group,
      });
    }
  });
}

/** Tạo sự kiện giống onChange của <select> thật để các hàm xử lý cũ (e.target.value) chạy không cần sửa. */
function makeChangeEvent(value: string, name?: string): ChangeEvent<HTMLSelectElement> {
  const target = { value, name: name ?? '' };
  return {
    target,
    currentTarget: target,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as ChangeEvent<HTMLSelectElement>;
}

interface PanelPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const PANEL_MIN_WIDTH = 220;
const PANEL_MAX_LIST_HEIGHT = 280;
const VIEWPORT_GAP = 8;

export function SearchSelect({
  value,
  defaultValue,
  onChange,
  children,
  className,
  disabled = false,
  required = false,
  name,
  id,
  title,
  searchPlaceholder = 'Gõ để tìm...',
  selectedLabel,
  onSearchChange,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  isAsync = false,
}: SearchSelectProps) {
  const options = useMemo(() => {
    const list: SelectOption[] = [];
    collectOptions(children, list);
    return list;
  }, [children]);

  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = useState<string>(() =>
    defaultValue !== undefined ? String(defaultValue) : options[0]?.value ?? ''
  );
  const currentValue = isControlled ? (value === null ? '' : String(value)) : innerValue;

  const matchedOption = options.find((o) => o.value === currentValue);
  const selected =
    matchedOption ??
    (selectedLabel !== undefined && currentValue !== ''
      ? { value: currentValue, label: selectedLabel, disabled: false }
      : options[0]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const searchTimerRef = useRef<any>(null);

  const filtered = useMemo(() => {
    let baseList = options;
    if (!query && selectedLabel && currentValue !== '' && !options.some((o) => o.value === currentValue)) {
      baseList = [{ value: currentValue, label: selectedLabel, disabled: false }, ...options];
    }
    if (isAsync) return baseList;
    const kw = normalizeSearchText(query);
    if (!kw) return baseList;
    return baseList.filter((o) => normalizeSearchText(o.label).includes(kw));
  }, [options, query, isAsync, selectedLabel, currentValue]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(rect.width, PANEL_MIN_WIDTH), vw - VIEWPORT_GAP * 2);
    const left = Math.min(Math.max(rect.left, VIEWPORT_GAP), vw - width - VIEWPORT_GAP);
    const spaceBelow = vh - rect.bottom - VIEWPORT_GAP;
    const spaceAbove = rect.top - VIEWPORT_GAP;
    // 52px cho ô tìm kiếm phía trên danh sách
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const room = (openUp ? spaceAbove : spaceBelow) - 52 - 4;
    const maxHeight = Math.max(120, Math.min(PANEL_MAX_LIST_HEIGHT, room));
    setPosition(
      openUp
        ? { left, width, bottom: vh - rect.top + 4, maxHeight }
        : { left, width, top: rect.bottom + 4, maxHeight }
    );
  };

  const openPanel = (initialQuery = '') => {
    if (disabled) return;
    setQuery(initialQuery);
    const idx = options.findIndex((o) => o.value === currentValue);
    setActiveIndex(initialQuery ? 0 : Math.max(0, idx));
    updatePosition();
    setOpen(true);
    if (onSearchChange && initialQuery) {
      onSearchChange(initialQuery);
    }
  };

  const closePanel = (focusTrigger = true) => {
    setOpen(false);
    setQuery('');
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    if (onSearchChange && query !== '') {
      onSearchChange('');
    }
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (opt: SelectOption) => {
    if (opt.disabled) return;
    if (!isControlled) setInnerValue(opt.value);
    if (opt.value !== currentValue) onChange?.(makeChangeEvent(opt.value, name));
    closePanel();
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setActiveIndex(0);
    if (onSearchChange) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        onSearchChange(val);
      }, 300);
    }
  };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore || isLoading) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 40) {
      onLoadMore();
    }
  };

  // Đóng khi bấm ra ngoài; tự đặt lại vị trí khi cuộn trang / đổi kích thước cửa sổ.
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      closePanel(false);
    };
    const handleReposition = (e: Event) => {
      if (e.type === 'scroll' && panelRef.current?.contains(e.target as Node)) return;
      updatePosition();
    };
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Giữ dòng đang chọn (phím mũi tên) luôn nằm trong vùng nhìn thấy.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const moveActive = (step: number) => {
    if (filtered.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < filtered.length; i++) {
      next = (next + step + filtered.length) % filtered.length;
      if (!filtered[next].disabled) break;
    }
    setActiveIndex(next);
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPanel();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Gõ chữ ngay khi ô đang được chọn -> mở danh sách và tìm luôn
      e.preventDefault();
      openPanel(e.key);
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) choose(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    } else if (e.key === 'Tab') {
      closePanel(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        title={title ?? selected?.label}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        className={`erp-search-select ${className ?? ''} inline-flex items-center justify-between gap-1.5 text-left max-w-full min-w-0 cursor-pointer disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${selected && selected.value !== '' ? '' : 'text-gray-500'}`}>
          {selected?.label ?? ''}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Ô <select> ẩn chỉ để form vẫn kiểm "required" và gửi được "name" như trước */}
      {(required || name) && (
        <select
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          required={required}
          value={currentValue}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          className="sr-only"
        >
          <option value={currentValue}>{selected?.label ?? ''}</option>
        </select>
      )}

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              zIndex: 100000,
            }}
            className="erp-search-select-panel rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden text-xs animate-in fade-in-0 zoom-in-95"
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-800 outline-none focus:border-[#F85606] focus:bg-white"
                />
              </div>
            </div>
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              onScroll={handleListScroll}
              style={{ maxHeight: position.maxHeight }}
              className="overflow-y-auto py-1"
            >
              {filtered.length === 0 && !isLoading ? (
                <div className="px-3 py-4 text-center text-gray-400">Không tìm thấy kết quả phù hợp</div>
              ) : (
                <>
                  {filtered.map((opt, idx) => {
                    const isSelected = opt.value === selected?.value;
                    const showGroup = opt.group && (idx === 0 || filtered[idx - 1].group !== opt.group);
                    return (
                      <Fragment key={`${opt.group ?? ''}|${opt.value}|${idx}`}>
                        {showGroup && (
                          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            {opt.group}
                          </div>
                        )}
                        <div
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={opt.disabled}
                          data-index={idx}
                          onMouseEnter={() => !opt.disabled && setActiveIndex(idx)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => choose(opt)}
                          className={`flex items-center gap-2 px-3 py-2 ${
                            opt.disabled
                              ? 'text-gray-300 cursor-not-allowed'
                              : idx === activeIndex
                                ? 'erp-search-select-active bg-orange-50 text-[#F85606] cursor-pointer'
                                : 'text-gray-700 cursor-pointer'
                          }`}
                        >
                          <span className="flex-1 min-w-0 break-words">{opt.label}</span>
                          {isSelected && <Check size={13} className="shrink-0 text-[#F85606]" />}
                        </div>
                      </Fragment>
                    );
                  })}
                  {isLoading && (
                    <div className="px-3 py-2.5 text-center text-gray-400 flex items-center justify-center gap-1.5 text-[11px] bg-orange-50/30">
                      <RefreshCw size={12} className="animate-spin text-[#F85606]" />
                      <span>Đang truy vấn dữ liệu...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default SearchSelect;
