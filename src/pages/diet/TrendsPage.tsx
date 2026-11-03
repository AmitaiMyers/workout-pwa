import { useState } from 'react';
import { BarChart } from '../../components/diet/BarChart';
import { Loading, PageHeader } from '../../components/PageHeader';
import { parseDateKey, todayKey } from '../../domain/dates';
import { formatGrams, formatKcal } from '../../domain/format';
import { totalsByDate } from '../../domain/nutrition/log';
import { listFoodLogRange } from '../../storage/db';
import { useDbQuery } from '../../storage/hooks';
import { useNutritionSetup } from '../../storage/nutritionHooks';
import { shiftDate } from './DietPage';

const RANGES = [7, 28] as const;
type Range = (typeof RANGES)[number];

const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
const dateLabel = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'numeric' });

/** Daily calories and protein for the last week or four weeks, against the current targets. */
export function TrendsPage() {
  const [range, setRange] = useState<Range>(7);
  const today = todayKey();
  const from = shiftDate(today, -(range - 1));
  const entries = useDbQuery(() => listFoodLogRange(from, today), [from, today]);
  const setup = useNutritionSetup();
  if (entries === undefined || setup === undefined) {
    return <Loading />;
  }
  const totals = totalsByDate(entries);
  const days = Array.from({ length: range }, (_, index) => shiftDate(from, index));
  const label = (date: string) => (range === 7 ? dayLabel : dateLabel).format(parseDateKey(date));
  const logged = days.filter((date) => totals.has(date));
  // Averages only count days with food logged, so a forgotten day doesn't look like a fast.
  const average = (key: 'kcal' | 'protein') =>
    logged.length === 0 ? null : logged.reduce((total, date) => total + (totals.get(date)?.[key] ?? 0), 0) / logged.length;
  const avgKcal = average('kcal');
  const avgProtein = average('protein');

  return (
    <div className="page">
      <PageHeader title="Trends" back />
      <div className="segmented" role="tablist" aria-label="Range">
        {RANGES.map((option) => (
          <button type="button" role="tab" key={option} aria-selected={range === option} className={range === option ? 'segmented-active' : ''} onClick={() => setRange(option)}>
            {option === 7 ? 'Last 7 days' : 'Last 4 weeks'}
          </button>
        ))}
      </div>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">{avgKcal === null ? '–' : formatKcal(avgKcal)}</span>
          <span className="stat-label">Avg calories</span>
        </div>
        <div className="stat">
          <span className="stat-value">{avgProtein === null ? '–' : formatGrams(avgProtein)}</span>
          <span className="stat-label">Avg protein</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {logged.length}/{range}
          </span>
          <span className="stat-label">Days logged</span>
        </div>
      </div>
      <section className="card">
        <h2>Calories</h2>
        <BarChart
          bars={days.map((date) => ({ label: label(date), value: totals.get(date)?.kcal ?? 0 }))}
          target={setup.targets?.macros.kcal ?? null}
          formatValue={(value) => formatKcal(value)}
          label="Calories per day"
        />
      </section>
      <section className="card">
        <h2>Protein</h2>
        <BarChart
          bars={days.map((date) => ({ label: label(date), value: totals.get(date)?.protein ?? 0 }))}
          target={setup.targets?.macros.protein ?? null}
          formatValue={formatGrams}
          label="Protein per day"
        />
      </section>
      <p className="muted small">Averages include only days with food logged. Targets are today's targets.</p>
    </div>
  );
}
