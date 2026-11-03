import { useState } from 'react';
import { LineChart } from '../../components/LineChart';
import { NumberInput } from '../../components/NumberInput';
import { Loading, PageHeader } from '../../components/PageHeader';
import { parseDateKey, todayKey } from '../../domain/dates';
import { formatDate, formatNumber } from '../../domain/format';
import { deleteWeight, saveWeight } from '../../storage/db';
import { useNutritionSetup } from '../../storage/nutritionHooks';

/** Plausible adult body-weight range; anything outside is almost certainly a typo. */
const MIN_KG = 30;
const MAX_KG = 300;

/** Body-weight log with a trend chart. The latest entry drives the calorie target. */
export function WeightPage() {
  const setup = useNutritionSetup();
  const [weight, setWeight] = useState<number | null>(null);
  const [date, setDate] = useState(todayKey());
  if (setup === undefined) {
    return <Loading />;
  }
  const valid = weight !== null && weight >= MIN_KG && weight <= MAX_KG && date !== '' && date <= todayKey();
  const formatKg = (kg: number) => `${formatNumber(kg)} kg`;
  const first = setup.weights[0];
  const last = setup.weights[setup.weights.length - 1];

  return (
    <div className="page">
      <PageHeader title="Body weight" back />
      <section className="card">
        <h2>Log weight</h2>
        <div className="macro-inputs">
          <label className="field">
            <span>Weight (kg)</span>
            <NumberInput value={weight} onChange={setWeight} allowDecimals label="Weight in kg" placeholder={setup.currentWeightKg === null ? 'e.g. 78.5' : formatNumber(setup.currentWeightKg)} />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" className="text-input" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        {weight !== null && !valid && <p className="field-error">Enter a weight between {MIN_KG} and {MAX_KG} kg, on today or an earlier date.</p>}
        <button
          type="button"
          className="button button-primary button-block"
          disabled={!valid}
          onClick={() => weight !== null && void saveWeight({ date, weightKg: weight }).then(() => setWeight(null))}
        >
          Save
        </button>
        <p className="muted small">One entry per day; saving again on the same day replaces it. Your latest weight updates your calorie target.</p>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Trend</h2>
          {first !== undefined && last !== undefined && first !== last && (
            <span className="muted small">
              {last.weightKg - first.weightKg >= 0 ? '+' : ''}
              {formatKg(Math.round((last.weightKg - first.weightKg) * 10) / 10)} since {formatDate(parseDateKey(first.date).getTime())}
            </span>
          )}
        </div>
        <LineChart points={setup.weights.map((entry) => ({ x: parseDateKey(entry.date).getTime(), y: entry.weightKg }))} formatY={formatKg} label="Body weight over time" />
      </section>

      {setup.weights.length > 0 && (
        <section className="card">
          <h2>History</h2>
          <ul className="plain-list">
            {[...setup.weights].reverse().map((entry) => (
              <li key={entry.date} className="list-row">
                <span>{formatDate(parseDateKey(entry.date).getTime())}</span>
                <span className="button-row">
                  <strong>{formatKg(entry.weightKg)}</strong>
                  <button type="button" className="icon-button" aria-label={`Delete ${entry.date}`} onClick={() => void deleteWeight(entry.date)}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
