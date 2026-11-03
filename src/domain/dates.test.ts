import { describe, expect, it } from 'vitest';
import { monthGrid, parseDateKey, startOfWeek, toDateKey } from './dates';

describe('date keys', () => {
  it('round-trips local dates', () => {
    expect(toDateKey(parseDateKey('2026-02-28'))).toBe('2026-02-28');
  });
  it('rejects malformed keys', () => {
    expect(() => parseDateKey('2026-2-8')).toThrow();
  });
});

describe('monthGrid', () => {
  it('pads November 2026 to whole weeks starting on Sunday', () => {
    // 1 Nov 2026 is a Sunday, 30 days → 5 rows.
    const weeks = monthGrid(2026, 10, 0);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]![0]).toEqual({ key: '2026-11-01', dayOfMonth: 1, inMonth: true });
    expect(weeks[4]![6]).toMatchObject({ key: '2026-12-05', inMonth: false });
  });
  it('supports Monday-start weeks', () => {
    const weeks = monthGrid(2026, 10, 1);
    expect(weeks[0]![0]).toMatchObject({ key: '2026-10-26', inMonth: false });
    expect(weeks[0]![6]).toMatchObject({ key: '2026-11-01', inMonth: true });
  });
});

describe('startOfWeek', () => {
  it('returns the previous Sunday at midnight for a Sunday-start week', () => {
    // Tue 3 Nov 2026 → Sun 1 Nov 2026
    expect(toDateKey(startOfWeek(new Date(2026, 10, 3, 15, 30), 0))).toBe('2026-11-01');
  });
  it('returns the same day when the date is the first day of the week', () => {
    const start = startOfWeek(new Date(2026, 10, 1, 9, 0), 0);
    expect([toDateKey(start), start.getHours()]).toEqual(['2026-11-01', 0]);
  });
  it('supports Monday-start weeks across a month boundary', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 10, 1), 1))).toBe('2026-10-26');
  });
});
