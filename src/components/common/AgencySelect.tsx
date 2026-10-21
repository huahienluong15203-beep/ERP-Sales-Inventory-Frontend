import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchSelect } from './SearchSelect';
import { fetchAgencies } from '../../services/agencyApi';
import type { Agency } from '../../types/agency';

const PAGE_SIZE = 20;

/** Cách hiển thị 1 đại lý trong mọi ô chọn đại lý: [Mã] Tên */
export const formatAgencyOption = (a: Pick<Agency, 'code' | 'name'>): string => `[${a.code}] ${a.name}`;

interface AgencySelectProps {
  /** id đại lý đang chọn; '' (hoặc allValue) = chưa chọn / tất cả */
  value: string | number | null | undefined;
  onChange: (id: string, agency: Agency | null) => void;
  /** Có truyền thì thêm dòng "Tất cả đại lý" ở đầu danh sách */
  allLabel?: string;
  /** Giá trị của dòng "Tất cả" (mặc định '') */
  allValue?: string;
  /** Chữ hiện khi chưa chọn (khi không có dòng "Tất cả") */
  placeholder?: string;
  /** Lọc trạng thái đại lý, vd 'ACTIVE' cho màn lập chứng từ mới */
  status?: string;
  /** Nhãn của đại lý đang chọn khi nó chưa nằm trong trang dữ liệu đã tải (vd: mở từ đường dẫn) */
  selectedLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Ô chọn đại lý dùng chung toàn hệ thống: cùng giao diện, gõ để tìm theo tên / mã / SĐT / MST trên server,
 * cuộn xuống cuối để tải thêm (không giới hạn 100 đại lý đầu như trước).
 */
export function AgencySelect({
  value,
  onChange,
  allLabel,
  allValue = '',
  placeholder = '-- Chọn đại lý --',
  status,
  selectedLabel,
  className = 'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#F85606] focus:outline-none',
  disabled = false
}: AgencySelectProps) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  // Nhớ nhãn các đại lý đã thấy để ô vẫn hiện đúng tên khi kết quả tìm kiếm không còn chứa đại lý đang chọn
  const knownRef = useRef<Map<string, Agency>>(new Map());
  const requestRef = useRef<number>(0);

  const load = useCallback(
    async (targetPage: number, kw: string, append: boolean) => {
      const reqId = ++requestRef.current;
      setLoading(true);
      try {
        const res = await fetchAgencies({ page: targetPage, size: PAGE_SIZE, keyword: kw.trim() || undefined, status });
        if (reqId !== requestRef.current) return; // bỏ kết quả của lần tìm cũ
        const items = res.content || [];
        items.forEach((a) => knownRef.current.set(String(a.id), a));
        setAgencies((prev) => {
          if (!append) return items;
          const ids = new Set(prev.map((a) => String(a.id)));
          return [...prev, ...items.filter((a) => !ids.has(String(a.id)))];
        });
        setPage(targetPage);
        setHasMore(targetPage + 1 < (res.totalPages || 0));
      } catch {
        if (reqId === requestRef.current && !append) setAgencies([]);
        setHasMore(false);
      } finally {
        if (reqId === requestRef.current) setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    load(0, '', false);
  }, [load]);

  const current = value === null || value === undefined ? '' : String(value);
  const known = knownRef.current.get(current);
  const label = known ? formatAgencyOption(known) : selectedLabel;

  return (
    <SearchSelect
      value={current === '' ? allValue : current}
      onChange={(e) => {
        const id = e.target.value;
        onChange(id, id === allValue ? null : knownRef.current.get(id) ?? null);
      }}
      selectedLabel={current !== '' && current !== allValue ? label : undefined}
      searchPlaceholder="Gõ tên, mã đại lý, SĐT, MST..."
      onSearchChange={(val) => {
        setKeyword(val);
        load(0, val, false);
      }}
      onLoadMore={() => {
        if (!loading && hasMore) load(page + 1, keyword, true);
      }}
      hasMore={hasMore}
      isLoading={loading}
      isAsync
      disabled={disabled}
      className={className}
    >
      {allLabel !== undefined ? (
        <option value={allValue}>{allLabel}</option>
      ) : (
        <option value={allValue}>{placeholder}</option>
      )}
      {agencies.map((a) => (
        <option key={a.id} value={String(a.id)}>
          {formatAgencyOption(a)}
        </option>
      ))}
    </SearchSelect>
  );
}

export default AgencySelect;
