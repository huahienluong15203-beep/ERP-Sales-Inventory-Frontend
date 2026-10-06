import { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from './Icons';
import { matchesKeyword } from '../../hooks/useServerSearch';
import {
  loadAdministrativeUnits,
  composeAddress,
  parseAddress,
  shortUnitName
} from '../../services/addressApi';
import type { AdminProvince } from '../../services/addressApi';

interface AddressPickerProps {
  /** Địa chỉ đầy đủ đang lưu (1 chuỗi), vd: "Số 12 Trần Phú, Phường Ba Đình, Thành phố Hà Nội" */
  value: string;
  /** complete = đã chọn đủ Tỉnh/Thành, Xã/Phường và nhập số nhà/đường */
  onChange: (address: string, complete: boolean) => void;
  /** Cỡ chữ nhỏ (dùng trong hộp thoại hẹp) */
  compact?: boolean;
  streetPlaceholder?: string;
}

/** Số gợi ý xã/phường hiện tối đa trong danh sách thả xuống */
const MAX_SUGGESTIONS = 60;

/**
 * S3-04: Ô nhập địa chỉ có gợi ý theo đơn vị hành chính mới (2 cấp):
 * chọn Tỉnh/Thành -> gõ tìm Xã/Phường (gợi ý, không cần gõ dấu) -> nhập số nhà, tên đường.
 * Kết quả vẫn lưu thành 1 chuỗi địa chỉ nên Backend không phải đổi.
 */
export function AddressPicker({ value, onChange, compact = false, streetPlaceholder }: AddressPickerProps) {
  const [provinces, setProvinces] = useState<AdminProvince[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [street, setStreet] = useState('');
  const [wardQuery, setWardQuery] = useState('');
  const [wardOpen, setWardOpen] = useState(false);
  const [legacyAddress, setLegacyAddress] = useState(false);

  // Chuỗi địa chỉ do chính ô này phát ra gần nhất -> phân biệt với giá trị mới từ form cha (mở form sửa)
  const lastEmitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let alive = true;
    loadAdministrativeUnits()
      .then((data) => {
        if (alive) setProvinces(data);
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách địa giới hành chính');
      });
    return () => {
      alive = false;
    };
  }, []);

  // Đồng bộ khi form cha đổi giá trị (mở form sửa / thêm mới)
  useEffect(() => {
    if (value === lastEmitted.current) return;
    if (!provinces.length) {
      setStreet(value);
      return;
    }
    const parsed = parseAddress(value || '', provinces);
    setProvinceCode(parsed.provinceCode);
    setWardCode(parsed.wardCode);
    setStreet(parsed.street);
    setWardQuery('');
    setLegacyAddress(Boolean(value.trim()) && !parsed.matched);
    lastEmitted.current = value;
    // Báo cho form cha biết địa chỉ đang có đã đủ Tỉnh/Xã/Số nhà chưa (giữ nguyên chuỗi)
    onChangeRef.current(value, parsed.matched && Boolean(parsed.street.trim()));
  }, [value, provinces]);

  const province = useMemo(() => provinces.find((p) => p.code === provinceCode), [provinces, provinceCode]);
  const ward = useMemo(() => province?.wards.find((w) => w.code === wardCode), [province, wardCode]);

  const emit = (nextProvinceCode: string, nextWardCode: string, nextStreet: string) => {
    const p = provinces.find((x) => x.code === nextProvinceCode);
    const w = p?.wards.find((x) => x.code === nextWardCode);
    const address = composeAddress(nextStreet, w?.name, p?.name);
    lastEmitted.current = address;
    onChange(address, Boolean(p && w && nextStreet.trim()));
  };

  const wardSuggestions = useMemo(() => {
    if (!province) return [];
    return province.wards.filter((w) => matchesKeyword(wardQuery, w.name)).slice(0, MAX_SUGGESTIONS);
  }, [province, wardQuery]);

  const text = compact ? 'text-xs' : 'text-sm';
  const field = `w-full px-3 py-2 ${text} rounded-xl border border-gray-200 bg-white focus:border-[#F85606] focus:ring-1 focus:ring-[#F85606] outline-none min-h-[40px] disabled:bg-gray-50 disabled:text-gray-400`;

  const selectWard = (code: string) => {
    setWardCode(code);
    setWardQuery('');
    setWardOpen(false);
    emit(provinceCode, code, street);
  };

  return (
    <div className="space-y-2">
      {loadError && (
        <p className="text-[11px] text-red-600">
          {loadError}. Bạn vẫn có thể nhập địa chỉ đầy đủ vào ô bên dưới.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* 1. Tỉnh / Thành phố */}
        <select
          value={provinceCode}
          disabled={!provinces.length}
          onChange={(e) => {
            const code = e.target.value;
            setProvinceCode(code);
            setWardCode('');
            setWardQuery('');
            emit(code, '', street);
          }}
          className={field}
          aria-label="Tỉnh / Thành phố"
        >
          <option value="">{provinces.length ? '— Chọn Tỉnh / Thành phố —' : 'Đang tải danh sách...'}</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>

        {/* 2. Xã / Phường: gõ để lọc gợi ý */}
        <div className="relative">
          <input
            type="text"
            value={wardOpen ? wardQuery : ward?.name || ''}
            disabled={!province}
            onFocus={() => setWardOpen(true)}
            onBlur={() => setTimeout(() => setWardOpen(false), 150)}
            onChange={(e) => {
              setWardQuery(e.target.value);
              setWardOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && wardOpen && wardSuggestions[0]) {
                e.preventDefault();
                selectWard(wardSuggestions[0].code);
              }
              if (e.key === 'Escape') setWardOpen(false);
            }}
            placeholder={province ? `Gõ tìm Xã / Phường (${province.wards.length})` : 'Chọn Tỉnh / Thành trước'}
            className={field}
            aria-label="Xã / Phường"
            autoComplete="off"
          />
          {wardOpen && province && (
            <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              {wardSuggestions.length === 0 ? (
                <li className={`px-3 py-2 ${text} text-gray-400`}>Không tìm thấy xã/phường phù hợp</li>
              ) : (
                wardSuggestions.map((w) => (
                  <li key={w.code}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectWard(w.code)}
                      className={`block w-full px-3 py-2 text-left ${text} hover:bg-orange-50 ${
                        w.code === wardCode ? 'font-semibold text-[#F85606]' : 'text-gray-700'
                      }`}
                    >
                      {w.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {/* 3. Số nhà, tên đường */}
      <input
        type="text"
        value={street}
        onChange={(e) => {
          setStreet(e.target.value);
          emit(provinceCode, wardCode, e.target.value);
        }}
        placeholder={streetPlaceholder || 'Số nhà, ngõ/hẻm, tên đường, thôn/ấp...'}
        className={field}
        aria-label="Số nhà, tên đường"
      />

      {legacyAddress && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
          <Icons.AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            Địa chỉ cũ chưa theo đơn vị hành chính mới (đã bỏ cấp Quận/Huyện). Hãy chọn Tỉnh/Thành, Xã/Phường và sửa lại ô
            số nhà, đường.
          </span>
        </p>
      )}

      {(province || ward) && (
        <p className={`text-[11px] text-gray-500`}>
          Địa chỉ đầy đủ:{' '}
          <strong className="text-gray-800">
            {composeAddress(street, ward?.name, province?.name) || '—'}
          </strong>
          {province && !ward && (
            <span className="ml-1 text-amber-600">(chưa chọn Xã/Phường thuộc {shortUnitName(province.name)})</span>
          )}
        </p>
      )}
    </div>
  );
}
