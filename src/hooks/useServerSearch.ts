import { useCallback, useEffect, useRef, useState } from 'react';

/** Gõ từ bao nhiêu ký tự trở lên mới gọi API tìm trong database. */
export const MIN_SERVER_SEARCH_LENGTH = 2;
/** Đợi người dùng ngừng gõ bao lâu (ms) mới gọi API. */
export const SEARCH_DEBOUNCE_MS = 400;

/** Bỏ dấu tiếng Việt + chữ thường: "Nguyễn Đức" -> "nguyen duc". */
export function normalizeSearchText(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Lọc tại chỗ trên Frontend: true nếu 1 trong các trường chứa từ khoá (không phân biệt dấu, hoa/thường). */
export function matchesKeyword(keyword: string, ...fields: Array<string | null | undefined>): boolean {
  const kw = normalizeSearchText(keyword);
  if (!kw) return true;
  return fields.some((f) => normalizeSearchText(f).includes(kw));
}

/** Từ khoá gửi lên API: rỗng nếu chưa gõ đủ số ký tự tối thiểu. */
function toServerKeyword(value: string): string {
  const trimmed = value.trim();
  return trimmed.length >= MIN_SERVER_SEARCH_LENGTH ? trimmed : '';
}

/**
 * Ô tìm kiếm tiết kiệm API:
 * - Gõ dưới MIN_SERVER_SEARCH_LENGTH ký tự: KHÔNG gọi API (trang tự lọc tại chỗ bằng matchesKeyword).
 * - Gõ đủ số ký tự: đợi ngừng gõ SEARCH_DEBOUNCE_MS rồi mới cập nhật serverKeyword -> trang gọi API 1 lần.
 * - Bấm Enter / nút Lọc: gọi flush() để tìm ngay không cần đợi.
 *
 * @param input       nội dung đang gõ trong ô tìm kiếm
 * @param onCommitted gọi khi serverKeyword thay đổi (vd: quay về trang đầu)
 */
export function useServerSearch(input: string, onCommitted?: () => void) {
  const [serverKeyword, setServerKeyword] = useState('');
  const serverKeywordRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCommittedRef = useRef(onCommitted);

  useEffect(() => {
    onCommittedRef.current = onCommitted;
  }, [onCommitted]);

  const commit = useCallback((next: string) => {
    if (serverKeywordRef.current === next) return;
    serverKeywordRef.current = next;
    setServerKeyword(next);
    onCommittedRef.current?.();
  }, []);

  useEffect(() => {
    const next = toServerKeyword(input);
    timerRef.current = setTimeout(() => commit(next), SEARCH_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input, commit]);

  /** Tìm ngay (Enter / nút Lọc). Trả về true nếu từ khoá gửi API có thay đổi. */
  const flush = useCallback((): boolean => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = toServerKeyword(input);
    const changed = next !== serverKeywordRef.current;
    commit(next);
    return changed;
  }, [input, commit]);

  /** Lọc tại chỗ khi mới gõ dưới MIN_SERVER_SEARCH_LENGTH ký tự. */
  const trimmed = input.trim();
  const localKeyword = trimmed.length > 0 && trimmed.length < MIN_SERVER_SEARCH_LENGTH ? trimmed : '';

  return { serverKeyword, localKeyword, flush };
}
