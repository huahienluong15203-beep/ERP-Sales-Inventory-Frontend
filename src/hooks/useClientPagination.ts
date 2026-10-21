import { useEffect, useMemo, useState } from 'react';

/**
 * Phân trang tại chỗ cho các danh sách API trả về toàn bộ (không phân trang ở server).
 * Dùng kèm component <Pagination> để mọi trang danh sách có cùng một kiểu phân trang.
 * page đếm từ 0 (giống Pagination và API).
 */
export function useClientPagination<T>(items: T[], defaultSize = 20) {
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(defaultSize);

  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));

  // Danh sách bị lọc lại / ít đi -> không đứng ở trang không còn tồn tại
  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const safePage = Math.min(page, totalPages - 1);
    return items.slice(safePage * size, safePage * size + size);
  }, [items, page, size, totalPages]);

  const changeSize = (next: number) => {
    setSize(next);
    setPage(0);
  };

  return { page, setPage, size, setSize: changeSize, totalPages, totalElements, pageItems };
}
