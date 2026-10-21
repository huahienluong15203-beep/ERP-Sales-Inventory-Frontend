/**
 * Ghi file Excel (.xlsx) có tô đậm dòng tiêu đề cột.
 *
 * Thư viện `xlsx` bản cộng đồng (0.18) bỏ qua mọi định dạng ô khi ghi file, nên tiêu đề cột không in đậm được
 * và người dùng khó phân biệt tên cột với dữ liệu. Tệp này tự tạo gói .xlsx tối giản (không thêm thư viện):
 * workbook + styles (font đậm, nền xám, viền mảnh) + sheet, nén kiểu "stored" (không nén) chuẩn ZIP.
 */

export type ExcelCell = string | number | boolean | null | undefined;

export interface ExcelSheet {
  name: string;
  rows: ExcelCell[][];
  /** Chỉ số dòng (đếm từ 0) cần in đậm + tô nền: thường là dòng tên cột. Mặc định [0]. */
  headerRows?: number[];
  /** Chỉ số dòng chỉ in đậm (không tô nền), vd: dòng tiêu đề, dòng tổng cộng. */
  boldRows?: number[];
  /** Độ rộng cột theo số ký tự. */
  colWidths?: number[];
}

const STYLE_NORMAL = 0;
const STYLE_HEADER = 1;
const STYLE_BOLD = 2;

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right>' +
  '<top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">' +
  '<alignment vertical="center" wrapText="1"/></xf>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Ký tự điều khiển không hợp lệ trong XML
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Cột thứ i (đếm từ 0) -> A, B, ..., Z, AA, AB... */
export function columnName(index: number): string {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function cellXml(ref: string, value: ExcelCell, style: number): string {
  const s = style !== STYLE_NORMAL ? ` s="${style}"` : '';
  if (value === null || value === undefined || value === '') {
    return style !== STYLE_NORMAL ? `<c r="${ref}"${s}/>` : '';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function sheetXml(sheet: ExcelSheet): string {
  const headerRows = new Set(sheet.headerRows ?? [0]);
  const boldRows = new Set(sheet.boldRows ?? []);
  const cols = (sheet.colWidths || []).length
    ? '<cols>' +
      (sheet.colWidths || [])
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(4, w)}" customWidth="1"/>`)
        .join('') +
      '</cols>'
    : '';
  const rows = sheet.rows
    .map((row, r) => {
      const style = headerRows.has(r) ? STYLE_HEADER : boldRows.has(r) ? STYLE_BOLD : STYLE_NORMAL;
      const cells = row.map((v, c) => cellXml(`${columnName(c)}${r + 1}`, v, style)).join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  // Cố định dòng tên cột khi cuộn (dòng tiêu đề đầu tiên)
  const firstHeader = Math.min(...Array.from(headerRows));
  const pane =
    Number.isFinite(firstHeader) && firstHeader >= 0 && firstHeader < sheet.rows.length
      ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${firstHeader + 1}" topLeftCell="A${firstHeader + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      : '';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    pane +
    cols +
    `<sheetData>${rows}</sheetData>` +
    '</worksheet>'
  );
}

/** Tên sheet Excel: tối đa 31 ký tự, không chứa : \ / ? * [ ] */
function safeSheetName(name: string, index: number): string {
  const cleaned = (name || '').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31);
  return cleaned || `Sheet${index + 1}`;
}

// ---------------- ZIP (stored, không nén) ----------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStored(files: Array<{ name: string; content: string }>): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // tên tệp UTF-8
    lv.setUint16(8, 0, true); // stored
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, data);

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);
    central.push(cd);
    offset += local.length + data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

/** Tạo nội dung tệp .xlsx (dùng được cả trong trình duyệt lẫn Node để kiểm thử). */
export function buildXlsx(sheets: ExcelSheet[]): Uint8Array {
  const list = sheets.length ? sheets : [{ name: 'Sheet1', rows: [] }];
  const names = list.map((s, i) => escapeXml(safeSheetName(s.name, i)));
  const files = [
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        list
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
          )
          .join('') +
        '</Types>'
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets>' +
        names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets></workbook>'
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        list
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
          )
          .join('') +
        `<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>'
    },
    { name: 'xl/styles.xml', content: STYLES_XML },
    ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(s) }))
  ];
  return zipStored(files);
}

/** Danh sách object (mỗi key là 1 cột) -> các dòng, dòng đầu là tên cột. */
export function objectsToRows(data: Array<Record<string, ExcelCell>>, headers?: string[]): ExcelCell[][] {
  const cols = headers && headers.length ? headers : data.length ? Object.keys(data[0]) : [];
  return [cols, ...data.map((item) => cols.map((c) => item[c]))];
}

/** Tải tệp .xlsx về máy người dùng. */
export function downloadXlsx(fileName: string, sheets: ExcelSheet[]): void {
  const bytes = buildXlsx(sheets);
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Xuất nhanh 1 sheet từ danh sách object, dòng tên cột in đậm. */
export function downloadJsonAsXlsx(
  fileName: string,
  sheetName: string,
  data: Array<Record<string, ExcelCell>>,
  colWidths?: number[],
  headers?: string[]
): void {
  downloadXlsx(fileName, [{ name: sheetName, rows: objectsToRows(data, headers), headerRows: [0], colWidths }]);
}
