export type BatchLifecycleStatus = 'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'UNKNOWN';

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function parseBatchDate(raw: string | Date | undefined | null): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  const str = String(raw).trim();
  if (!str) return null;

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  // Handle standard Date parsing (e.g. Tue Sep 08 2026 00:00:00 GMT+0700 ...)
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatBatchDateDisplay(raw: string | Date | undefined | null): string {
  const d = parseBatchDate(raw);
  if (!d) return '-';

  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

export function formatBatchDateRange(startDate?: string, endDate?: string): string {
  const startStr = formatBatchDateDisplay(startDate);
  const endStr = formatBatchDateDisplay(endDate);
  if (startStr === '-' && endStr === '-') return 'ไม่ระบุช่วงเวลา';
  if (endStr === '-') return `ตั้งแต่ ${startStr}`;
  return `${startStr} ถึง ${endStr}`;
}

export function getBatchLifecycleStatus(startDate?: string, endDate?: string): BatchLifecycleStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = parseBatchDate(startDate);
  const end = parseBatchDate(endDate);

  if (!start && !end) return 'UNKNOWN';

  if (start) {
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    if (now < s) return 'UPCOMING';
  }

  if (end) {
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    if (now > e) return 'EXPIRED';
  }

  return 'ACTIVE';
}

export function isBatchOperationAllowed(startDate?: string, endDate?: string): { allowed: boolean; reason?: string } {
  const status = getBatchLifecycleStatus(startDate, endDate);
  if (status === 'EXPIRED') {
    return {
      allowed: false,
      reason: 'สิ้นสุดระยะเวลาผลัดแล้ว (EXPIRED) ไม่อนุญาตให้เพิ่มเงินเดือนหรือหักเงินอัตโนมัติเกินกำหนด'
    };
  }
  return { allowed: true };
}

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export interface BatchMonthInfo {
  key: string;        // '2026-09'
  label: string;      // 'กันยายน 2569'
  shortLabel: string; // 'ก.ย. 69'
  yearTh: number;     // 2569
  month: number;      // 9
  isCurrent: boolean;
  isPast: boolean;
}

export function formatMonthKeyDisplay(monthKey: string): string {
  if (!monthKey || !/^\d{4}-\d{2}/.test(monthKey)) return monthKey || '-';
  const parts = monthKey.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const monthName = THAI_MONTHS_FULL[m - 1] || '';
  const yearTh = y + 543;
  return `${monthName} ${yearTh}`;
}

export function generateBatchMonths(startDate?: string, endDate?: string): BatchMonthInfo[] {
  const start = parseBatchDate(startDate);
  const end = parseBatchDate(endDate);
  const today = new Date();
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  if (!start && !end) {
    const key = currentKey;
    const m = today.getMonth() + 1;
    const yTh = today.getFullYear() + 543;
    return [{
      key,
      label: `${THAI_MONTHS_FULL[m - 1]} ${yTh}`,
      shortLabel: `${THAI_MONTHS_SHORT[m - 1]} ${String(yTh).slice(2)}`,
      yearTh: yTh,
      month: m,
      isCurrent: true,
      isPast: false
    }];
  }

  const effectiveStart = start || (end ? new Date(end.getFullYear(), end.getMonth() - 2, 1) : today);
  const effectiveEnd = end || (start ? new Date(start.getFullYear(), start.getMonth() + 2, 1) : today);

  const months: BatchMonthInfo[] = [];
  const cur = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
  const last = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), 1);

  while (cur <= last) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const yearTh = y + 543;
    const isCurrent = key === currentKey;
    const isPast = cur < new Date(today.getFullYear(), today.getMonth(), 1);

    months.push({
      key,
      label: `${THAI_MONTHS_FULL[m - 1]} ${yearTh}`,
      shortLabel: `${THAI_MONTHS_SHORT[m - 1]} ${String(yearTh).slice(2)}`,
      yearTh,
      month: m,
      isCurrent,
      isPast
    });

    cur.setMonth(cur.getMonth() + 1);
  }

  return months.length > 0 ? months : [{
    key: currentKey,
    label: formatMonthKeyDisplay(currentKey),
    shortLabel: `${THAI_MONTHS_SHORT[today.getMonth()]} ${String(today.getFullYear() + 543).slice(2)}`,
    yearTh: today.getFullYear() + 543,
    month: today.getMonth() + 1,
    isCurrent: true,
    isPast: false
  }];
}

