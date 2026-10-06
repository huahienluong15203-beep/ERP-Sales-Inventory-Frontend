import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lưu bộ lọc + trang hiện tại lên thanh địa chỉ (URL), vd: /customers?keyword=abc&status=ACTIVE&page=3
 * - F5 hoặc gửi link cho người khác vẫn mở đúng bộ lọc và đúng trang.
 * - Giá trị bằng mặc định thì không ghi lên URL cho gọn.
 * - Dùng history.replaceState nên không làm đầy lịch sử nút Back.
 */
export function useUrlParams<T extends Record<string, string>>(defaults: T) {
  const defaultsRef = useRef(defaults);

  const readFromUrl = useCallback((): T => {
    const search = new URLSearchParams(window.location.search);
    const result = { ...defaultsRef.current };
    (Object.keys(result) as Array<keyof T>).forEach((key) => {
      const value = search.get(String(key));
      if (value !== null) result[key] = value as T[keyof T];
    });
    return result;
  }, []);

  const [params, setParams] = useState<T>(readFromUrl);

  // Nút Back/Forward của trình duyệt -> đọc lại URL
  useEffect(() => {
    const onPop = () => setParams(readFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [readFromUrl]);

  const update = useCallback((patch: Partial<T>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      const search = new URLSearchParams(window.location.search);
      (Object.keys(next) as Array<keyof T>).forEach((key) => {
        const value = next[key];
        if (value === undefined || value === '' || value === defaultsRef.current[key]) {
          search.delete(String(key));
        } else {
          search.set(String(key), value);
        }
      });
      const query = search.toString();
      const url = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  }, []);

  return [params, update] as const;
}

/** Đọc số trang từ URL (URL đếm từ 1, API đếm từ 0). */
export function pageFromUrl(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n - 1 : 0;
}

/** Số trang (đếm từ 0) -> chuỗi ghi lên URL (đếm từ 1). */
export function pageToUrl(page: number): string {
  return String(Math.max(0, page) + 1);
}

/** Đọc số dòng/trang từ URL, chỉ nhận các giá trị cho phép. */
export function sizeFromUrl(value: string | undefined, fallback = 20): number {
  const n = Number(value);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : fallback;
}

/** Số dòng mỗi trang cho phép chọn. Mặc định 20 dòng/trang. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const DEFAULT_PAGE_SIZE = 20;

type PagingParams = { page: string; size: string };

/**
 * useUrlParams + sẵn page/size/setPage/setSize cho trang danh sách.
 * URL: ?page=3&size=50 (page đếm từ 1); trong code page đếm từ 0 như API.
 */
export function useUrlPaging<T extends Record<string, string>>(filterDefaults: T, defaultSize = DEFAULT_PAGE_SIZE) {
  const [params, setParams] = useUrlParams<T & PagingParams>({
    ...filterDefaults,
    page: '1',
    size: String(defaultSize)
  } as T & PagingParams);

  const page = pageFromUrl(params.page);
  const size = sizeFromUrl(params.size, defaultSize);
  const pageRef = useRef(page);
  pageRef.current = page;

  const setPage = useCallback(
    (value: number | ((prev: number) => number)) => {
      const next = typeof value === 'function' ? value(pageRef.current) : value;
      setParams({ page: pageToUrl(next) } as Partial<T & PagingParams>);
    },
    [setParams]
  );

  /** Đổi số dòng/trang thì quay về trang 1. */
  const setSize = useCallback(
    (value: number) => setParams({ size: String(value), page: '1' } as Partial<T & PagingParams>),
    [setParams]
  );

  /** Đổi bộ lọc thì quay về trang 1. */
  const setFilters = useCallback(
    (patch: Partial<T>) => setParams({ ...patch, page: '1' } as Partial<T & PagingParams>),
    [setParams]
  );

  return { params, setParams, page, size, setPage, setSize, setFilters };
}
