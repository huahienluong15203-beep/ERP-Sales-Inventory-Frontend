import { useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';

/**
 * Ô nhập số tự thêm dấu chấm ngăn cách hàng nghìn khi gõ: 1000 -> 1.000, 1000000 -> 1.000.000.
 * Dùng thay cho <input type="number">: onChange vẫn đọc e.target.value nhưng nhận về SỐ THÔ không dấu chấm
 * (vd "1000000", số lẻ dùng dấu chấm "12.5") nên các hàm xử lý cũ (Number(...), parseInt(...)) chạy không cần sửa.
 * Số lẻ (decimal / step="any"): gõ dấu phẩy "," hoặc dấu chấm "." đều được, hiển thị dạng 12,5.
 */
export interface NumberInputProps {
  value: string | number | null | undefined;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Cho phép nhập số lẻ. Mặc định chỉ số nguyên (trừ khi step="any"). */
  decimal?: boolean;
  /** Giữ lại cho dễ thay <input type="number">; step="any" nghĩa là cho nhập số lẻ. */
  step?: number | string;
  /** Giữ lại cho dễ thay <input type="number"> (trình duyệt không tự kiểm với ô chữ). */
  min?: number | string;
  max?: number | string;
  /** Bỏ qua: ô này luôn chỉ nhận chữ số. */
  pattern?: string;
  inputMode?: 'numeric' | 'decimal';
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  name?: string;
  id?: string;
  title?: string;
}

/** "1234567.5" -> "1.234.567,5" */
export function formatNumberText(raw: string): string {
  if (!raw) return '';
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const dot = body.indexOf('.');
  const intPart = dot >= 0 ? body.slice(0, dot) : body;
  const decPart = dot >= 0 ? body.slice(dot + 1) : null;
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negative ? '-' : '') + grouped + (decPart !== null ? ',' + decPart : '');
}

/** Giá trị truyền vào (số hoặc chuỗi thô) -> chuỗi thô "1234.5". */
function toRaw(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    // Tránh dạng 1e+21 với số rất lớn
    return Math.abs(value) >= 1e21 ? value.toLocaleString('en-US', { useGrouping: false }) : String(value);
  }
  return value;
}

/** Chữ người dùng vừa gõ (đã có dấu chấm ngăn cách) -> chuỗi thô. */
function parseTyped(text: string, allowDecimal: boolean): string {
  return stripLeadingZeros(parseDigits(text, allowDecimal));
}

/** "000" -> "0", "05" -> "5", "0.5" giữ nguyên. */
function stripLeadingZeros(raw: string): string {
  return raw.replace(/^0+(?=\d)/, '');
}

function parseDigits(text: string, allowDecimal: boolean): string {
  if (!allowDecimal) return text.replace(/\D/g, '');
  // Dấu phẩy là dấu thập phân; dấu chấm là ngăn cách hàng nghìn
  const cleaned = text.replace(/[^\d,]/g, '');
  const comma = cleaned.indexOf(',');
  if (comma < 0) return cleaned;
  return cleaned.slice(0, comma) + '.' + cleaned.slice(comma + 1).replace(/,/g, '');
}

/** Hai chuỗi số thô có cùng giá trị không ("12." = "12", "" = "0"). */
function sameNumber(a: string, b: string): boolean {
  const na = Number(a === '' || a === '.' ? '0' : a);
  const nb = Number(b === '' ? '0' : b);
  return Number.isFinite(na) && na === nb;
}

/** Số ký tự "có nghĩa" (chữ số, dấu phẩy thập phân) đứng trước vị trí con trỏ. */
function countSignificant(text: string, caret: number): number {
  let n = 0;
  for (let i = 0; i < caret && i < text.length; i++) {
    if (/[\d,]/.test(text[i])) n++;
  }
  return n;
}

/** Vị trí con trỏ trong chuỗi mới sao cho đứng sau đúng `count` ký tự có nghĩa. */
function caretForCount(text: string, count: number): number {
  if (count <= 0) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[\d,]/.test(text[i])) {
      n++;
      if (n === count) return i + 1;
    }
  }
  return text.length;
}

export function NumberInput({
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  decimal,
  step,
  className,
  placeholder,
  disabled,
  readOnly,
  required,
  autoFocus,
  name,
  id,
  title,
  inputMode,
}: NumberInputProps) {
  const allowDecimal = decimal ?? step === 'any';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  // Chữ đang gõ dở (vd "12." hoặc "1.50"): nơi dùng lưu dạng số sẽ làm mất dấu thập phân / số 0 cuối,
  // nên giữ lại chữ đang gõ chừng nào nó vẫn cùng giá trị số với value; rời ô thì hiển thị lại theo value.
  const [draft, setDraft] = useState<string | null>(null);
  const valueRaw = toRaw(value);
  const shownRaw = draft !== null && sameNumber(draft, valueRaw) ? draft : valueRaw;
  const display = formatNumberText(shownRaw);

  // Sau khi định dạng lại (thêm/bớt dấu chấm) đặt con trỏ về đúng chỗ đang gõ
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && pendingCaret.current !== null && document.activeElement === el) {
      const pos = caretForCount(el.value, pendingCaret.current);
      el.setSelectionRange(pos, pos);
    }
    pendingCaret.current = null;
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let text = e.target.value;
    let caret = e.target.selectionStart ?? text.length;
    // Số lẻ: người dùng gõ "." (bàn phím điện thoại) -> hiểu là dấu thập phân
    const native = e.nativeEvent as InputEvent | undefined;
    if (allowDecimal && native?.data === '.' && caret > 0 && text[caret - 1] === '.' && !text.includes(',')) {
      text = text.slice(0, caret - 1) + ',' + text.slice(caret);
    }
    // Xoá đúng dấu chấm ngăn cách bằng Backspace -> xoá luôn chữ số đứng trước nó
    if (native?.inputType === 'deleteContentBackward' && parseTyped(text, allowDecimal) === shownRaw) {
      const before = text.slice(0, caret);
      const lastDigit = before.search(/\d(?=\D*$)/);
      if (lastDigit >= 0) {
        text = text.slice(0, lastDigit) + text.slice(lastDigit + 1);
        caret = lastDigit;
      }
    }
    const raw = parseTyped(text, allowDecimal);
    pendingCaret.current = countSignificant(text, caret);
    setDraft(raw);
    if (!onChange) return;
    const target = { value: raw, name: name ?? '' };
    onChange({
      ...e,
      target: target as unknown as HTMLInputElement,
      currentTarget: target as unknown as HTMLInputElement,
    } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? 'decimal' : 'numeric')}
      autoComplete="off"
      value={display}
      onChange={handleChange}
      onBlur={(e) => {
        setDraft(null);
        onBlur?.(e);
      }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      autoFocus={autoFocus}
      name={name}
      id={id}
      title={title}
    />
  );
}

export default NumberInput;
