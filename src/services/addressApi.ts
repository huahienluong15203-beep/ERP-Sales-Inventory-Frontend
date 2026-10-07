/**
 * S3-04: Dữ liệu đơn vị hành chính Việt Nam để gợi ý địa chỉ (2 cấp: Tỉnh/Thành -> Xã/Phường, áp dụng từ 01/07/2025).
 * File public/data/vn-don-vi-hanh-chinh-2025.json (~100KB) chỉ tải 1 lần khi mở form có ô địa chỉ.
 * Nguồn: thanglequoc/vietnamese-provinces-database (MIT License), mã theo Tổng cục Thống kê.
 */
import { normalizeSearchText } from '../hooks/useServerSearch';

export interface AdminWard {
  code: string;
  name: string; // vd: "Phường Ba Đình", "Xã Sóc Sơn"
}

export interface AdminProvince {
  code: string;
  name: string; // vd: "Thành phố Hà Nội", "Tỉnh Nghệ An"
  wards: AdminWard[];
}

interface RawData {
  provinces: Array<{ code: string; name: string; wards: Array<[string, string]> }>;
}

let cache: Promise<AdminProvince[]> | null = null;

/** Bỏ chữ "Tỉnh", "Thành phố", "Phường", "Xã", "Đặc khu" ở đầu để sắp xếp / so khớp. */
export function shortUnitName(name: string): string {
  return name.replace(/^(Thành phố|Tỉnh|Phường|Xã|Đặc khu|Thị trấn)\s+/i, '').trim();
}

export function loadAdministrativeUnits(): Promise<AdminProvince[]> {
  if (!cache) {
    const base = (import.meta.env?.BASE_URL as string | undefined) || '/';
    cache = fetch(`${base}data/vn-don-vi-hanh-chinh-2025.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Không tải được danh sách tỉnh/thành, xã/phường');
        return res.json() as Promise<RawData>;
      })
      .then((data) =>
        data.provinces
          .map((p) => ({
            code: p.code,
            name: p.name,
            wards: p.wards
              .map(([code, name]) => ({ code, name }))
              .sort((a, b) => shortUnitName(a.name).localeCompare(shortUnitName(b.name), 'vi'))
          }))
          .sort((a, b) => shortUnitName(a.name).localeCompare(shortUnitName(b.name), 'vi'))
      )
      .catch((err) => {
        cache = null; // lần sau thử tải lại
        throw err;
      });
  }
  return cache;
}

/** Ghép địa chỉ đầy đủ: "Số 12 Trần Phú, Phường Ba Đình, Thành phố Hà Nội". */
export function composeAddress(street: string, wardName?: string, provinceName?: string): string {
  return [street.trim(), wardName, provinceName].filter((part) => part && part.trim()).join(', ');
}

/**
 * Tách địa chỉ đã lưu (chuỗi) thành số nhà/đường + xã + tỉnh nếu khớp dữ liệu hành chính mới.
 * Không khớp (địa chỉ cũ còn quận/huyện) thì trả về toàn bộ chuỗi ở phần số nhà/đường.
 */
export function parseAddress(
  address: string,
  provinces: AdminProvince[]
): { street: string; provinceCode: string; wardCode: string; matched: boolean } {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    // So khớp cả tên đầy đủ ("Thành phố Hà Nội") lẫn tên ngắn ("Hà Nội")
    const same = (a: string, b: string) =>
      normalizeSearchText(a) === normalizeSearchText(b) ||
      normalizeSearchText(shortUnitName(a)) === normalizeSearchText(shortUnitName(b));
    const provinceText = parts[parts.length - 1];
    const province = provinces.find((p) => same(p.name, provinceText));
    if (province) {
      const wardText = parts[parts.length - 2];
      const ward = province.wards.find((w) => same(w.name, wardText));
      if (ward) {
        return {
          street: parts.slice(0, -2).join(', '),
          provinceCode: province.code,
          wardCode: ward.code,
          matched: true
        };
      }
      return { street: parts.slice(0, -1).join(', '), provinceCode: province.code, wardCode: '', matched: false };
    }
  }
  return { street: address, provinceCode: '', wardCode: '', matched: false };
}
