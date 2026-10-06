import { ChevronLeft, ChevronRight } from './Icons';
import { PAGE_SIZE_OPTIONS } from '../../hooks/useUrlParams';

interface PaginationProps {
  /** Trang hiện tại, đếm từ 0 (giống API). */
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
  /** Có truyền thì hiện ô chọn số dòng/trang. */
  onSizeChange?: (size: number) => void;
  /** Đơn vị đếm, vd: "tài khoản", "đại lý". */
  itemLabel?: string;
  disabled?: boolean;
}

/** Danh sách nút số trang, vd: [1, '…', 4, 5, 6, '…', 20]. Các số đếm từ 1. */
export function buildPageItems(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | '…'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('…');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push('…');
  items.push(total);
  return items;
}

/** Thanh phân trang dùng chung: ‹ 1 2 … 5 › + "Hiển thị 1–20 / 135" + chọn số dòng/trang. */
export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  onSizeChange,
  itemLabel = 'bản ghi',
  disabled = false
}: PaginationProps) {
  const pages = Math.max(1, totalPages);
  const current = Math.min(page, pages - 1) + 1;
  const from = totalElements === 0 ? 0 : (current - 1) * size + 1;
  const to = Math.min(current * size, totalElements);

  const go = (target: number) => {
    if (disabled || target < 1 || target > pages || target === current) return;
    onPageChange(target - 1);
  };

  const baseBtn =
    'min-w-[34px] h-[34px] px-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white text-sm text-gray-600">
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="whitespace-nowrap">
          Hiển thị <strong className="text-gray-900">{from}</strong>–<strong className="text-gray-900">{to}</strong> /{' '}
          <strong className="text-gray-900">{totalElements.toLocaleString('vi-VN')}</strong> {itemLabel}
        </span>
        {onSizeChange && (
          <label className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Số dòng/trang</span>
            <select
              value={size}
              disabled={disabled}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="h-[32px] rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#F85606]"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav className="flex items-center gap-1 flex-wrap justify-center" aria-label="Phân trang">
        <button
          type="button"
          className={`${baseBtn} border-gray-200 bg-white text-gray-600 hover:bg-orange-50 flex items-center justify-center`}
          onClick={() => go(current - 1)}
          disabled={disabled || current <= 1}
          title="Trang trước"
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>
        {buildPageItems(current, pages).map((item, idx) =>
          item === '…' ? (
            <span key={`dots-${idx}`} className="px-1 text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              disabled={disabled}
              aria-current={item === current ? 'page' : undefined}
              className={
                item === current
                  ? `${baseBtn} border-[#F85606] bg-[#F85606] text-white`
                  : `${baseBtn} border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-200`
              }
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          className={`${baseBtn} border-gray-200 bg-white text-gray-600 hover:bg-orange-50 flex items-center justify-center`}
          onClick={() => go(current + 1)}
          disabled={disabled || current >= pages}
          title="Trang sau"
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
