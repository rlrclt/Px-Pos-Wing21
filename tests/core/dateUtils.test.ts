import { describe, it, expect } from 'vitest';
import { 
  parseBatchDate, 
  formatBatchDateDisplay, 
  formatBatchDateRange,
  getBatchLifecycleStatus,
  isBatchOperationAllowed
} from '../../src/core/dateUtils.ts';

describe('Date & Batch Lifecycle Utilities', () => {
  it('should parse ISO date strings correctly', () => {
    const d = parseBatchDate('2026-09-08');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8); // September (0-indexed)
  });

  it('should parse GAS full date string formats', () => {
    const raw = 'Tue Sep 08 2026 00:00:00 GMT+0700 (Indochina Time)';
    const d = parseBatchDate(raw);
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
  });

  it('should format date range with Thai labels', () => {
    const formatted = formatBatchDateRange('2026-09-08', '2026-10-31');
    expect(formatted).toContain('8 ก.ย. 2569');
    expect(formatted).toContain('31 ต.ค. 2569');
  });

  it('should determine batch lifecycle status accurately', () => {
    const pastStart = '2020-01-01';
    const pastEnd = '2020-03-31';
    expect(getBatchLifecycleStatus(pastStart, pastEnd)).toBe('EXPIRED');

    const futureStart = '2099-01-01';
    const futureEnd = '2099-12-31';
    expect(getBatchLifecycleStatus(futureStart, futureEnd)).toBe('UPCOMING');
  });

  it('should prevent operations on expired batches', () => {
    const check = isBatchOperationAllowed('2020-01-01', '2020-02-01');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('สิ้นสุดระยะเวลาผลัดแล้ว');
  });
});
