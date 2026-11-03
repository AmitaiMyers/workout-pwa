import { assert } from './assert';

/** 0 = Sunday, 1 = Monday. The calendar grid starts its weeks on this day. */
export const WEEK_STARTS_ON = 0;

/** Local calendar day key in the form YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateKeyOf(epochMs: number): string {
  return toDateKey(new Date(epochMs));
}

export function parseDateKey(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  assert(match !== null, `Invalid date key "${key}"`);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** Local midnight at the start of the week containing `date`. */
export function startOfWeek(date: Date, weekStartsOn: number = WEEK_STARTS_ON): Date {
  const daysSinceStart = (date.getDay() - weekStartsOn + 7) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceStart);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export interface CalendarDay {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
}

/** Weeks (rows of 7 days) covering the whole month, padded with days of adjacent months. */
export function monthGrid(year: number, monthIndex: number, weekStartsOn: number = WEEK_STARTS_ON): CalendarDay[][] {
  assert(monthIndex >= 0 && monthIndex <= 11, 'monthIndex must be 0..11');
  const first = new Date(year, monthIndex, 1);
  const leading = (first.getDay() - weekStartsOn + 7) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const weeks: CalendarDay[][] = [];
  for (let cell = 0; cell < totalCells; cell += 1) {
    const date = new Date(year, monthIndex, 1 - leading + cell);
    if (cell % 7 === 0) {
      weeks.push([]);
    }
    const week = weeks[weeks.length - 1];
    assert(week !== undefined, 'Week row missing');
    week.push({ key: toDateKey(date), dayOfMonth: date.getDate(), inMonth: date.getMonth() === monthIndex });
  }
  return weeks;
}

export function weekdayLabels(weekStartsOn: number = WEEK_STARTS_ON): string[] {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + ((weekStartsOn + i) % 7))));
}
