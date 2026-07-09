import xlsx from 'xlsx';
import { Row, UploadKind } from './types.js';

export const REQUIRED_COLUMNS: Record<UploadKind, string[]> = {
  BATCH: ['Order Number', 'Customer ID', 'Email', 'Org Name'],
  PROCESSING_REPORT: ['SOURCE_ORDER_NUMBER', 'PROCESS_MESSAGE', 'Error Reason', 'Status'],
  LM_REPORT: ['orderkey', 'Process Status'],
  REORDER: ['Original Order', 'New Order']
};

export function normaliseOrderNumber(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/\.0$/, '');
}

export function readFirstSheet(buffer: Buffer): Row[] {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const first = workbook.SheetNames[0];
  if (!first) return [];
  return xlsx.utils.sheet_to_json<Row>(workbook.Sheets[first], { defval: '' });
}

export function validateRows(type: UploadKind, rows: Row[]) {
  const required = REQUIRED_COLUMNS[type];
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const missingColumns = required.filter(c => !headers.includes(c));
  const keyColumn = type === 'BATCH' ? 'Order Number' : type === 'PROCESSING_REPORT' ? 'SOURCE_ORDER_NUMBER' : type === 'LM_REPORT' ? 'orderkey' : 'Original Order';
  const seen = new Map<string, number>();
  const missingKeys: number[] = [];
  rows.forEach((row, idx) => {
    const key = normaliseOrderNumber(row[keyColumn]);
    if (!key) missingKeys.push(idx + 2);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });
  const duplicateOrders = [...seen.entries()].filter(([k, count]) => k && count > 1).map(([orderNumber, count]) => ({ orderNumber, count }));
  return { rowCount: rows.length, required, headers, missingColumns, missingKeys, duplicateOrders, valid: missingColumns.length === 0 && missingKeys.length === 0 };
}
