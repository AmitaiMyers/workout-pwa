import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AmountSheet } from '../../components/diet/AmountSheet';
import { CaloriesRing } from '../../components/diet/CaloriesRing';
import { MacroBars } from '../../components/diet/MacroBars';
import { QuickAddSheet } from '../../components/diet/QuickAddSheet';
import { Loading, PageHeader } from '../../components/PageHeader';
import { required } from '../../domain/assert';
import { dateKeyOf, parseDateKey, toDateKey, todayKey } from '../../domain/dates';
import { formatDate, formatKcal } from '../../domain/format';
import { estimateWorkoutKcal } from '../../domain/nutrition/burn';
import { MEAL_LABELS, MEAL_SLOTS, type Food, type FoodLogEntry } from '../../domain/nutrition/foodTypes';
import { totalsOf, updateFoodEntry } from '../../domain/nutrition/log';
import { describeAmount } from '../../domain/nutrition/math';
import { deleteFoodLogEntry, listFoodLog, listWorkouts, saveFoodLogEntries } from '../../storage/db';
import { useDbQuery, useExerciseCatalog } from '../../storage/hooks';
import { useFoodCatalog } from '../../storage/foodCatalog';
import { useNutritionSetup } from '../../storage/nutritionHooks';

export function shiftDate(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** The day being viewed comes from ?date=YYYY-MM-DD so links (calendar, home) can open any day. */
export function useDietDate(): [string, (date: string) => void] {
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? todayKey();
  return [date, (next: string) => setParams(next === todayKey() ? {} : { date: next }, { replace: true })];
}

/** Rebuild a food view from a log entry's snapshot, with servings from the food if it still exists. */
function foodForEntry(entry: FoodLogEntry, catalogFood: Food | undefined): Food {
  return {
    id: required(entry.foodId, 'A food entry must reference a food'),
    // Only the attribution line depends on the source; a deleted food is shown as the user's own.
    source: catalogFood === undefined ? 'custom' : catalogFood.source,
    name: entry.name,
    nameHe: null,
    brand: entry.brand,
    barcode: null,
    per100: required(entry.per100, 'A food entry must carry its nutrition snapshot'),
    servings: catalogFood === undefined ? [] : catalogFood.servings,
  };
}

export function DietPage() {
  const [date, setDate] = useDietDate();
  const entries = useDbQuery(() => listFoodLog(date), [date]);
  const workouts = useDbQuery(listWorkouts, []);
  const setup = useNutritionSetup();
  const foods = useFoodCatalog();
  const exercises = useExerciseCatalog();
  const [editing, setEditing] = useState<FoodLogEntry | null>(null);

  if (entries === undefined || workouts === undefined || setup === undefined || foods === undefined || exercises === undefined) {
    return <Loading />;
  }

  const totals = totalsOf(entries);
  const isToday = date === todayKey();
  const burned =
    setup.currentWeightKg === null
      ? []
      : workouts
          .filter((workout) => dateKeyOf(workout.startedAt) === date)
          .map((workout) => estimateWorkoutKcal(workout, setup.currentWeightKg ?? 0, (id) => exercises.get(id).tracking) ?? 0);
  const burnedTotal = burned.reduce((total, kcal) => total + kcal, 0);
  const editingFood = editing === null || editing.per100 === null ? null : foodForEntry(editing, editing.foodId === null ? undefined : foods.find(editing.foodId));

  return (
    <div className="page">
      <PageHeader
        title="Diet"
        actions={
          <Link to="/settings" className="button button-ghost">
            Targets
          </Link>
        }
      />
      <div className="calendar-nav">
        <button type="button" className="icon-button" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
          ‹
        </button>
        <button type="button" className="link-button date-title" onClick={() => setDate(todayKey())} disabled={isToday}>
          {isToday ? 'Today' : formatDate(parseDateKey(date).getTime())}
        </button>
        <button type="button" className="icon-button" aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>
          ›
        </button>
      </div>

      <section className="card diet-summary">
        <CaloriesRing eatenKcal={totals.kcal} targetKcal={setup.targets?.macros.kcal ?? null} size="large" />
        <MacroBars eaten={totals} targets={setup.targets?.macros ?? null} />
      </section>
      {setup.targets === null && (
        <Link to="/settings" className="notice notice-link">
          Set up your profile to get a daily calorie and protein target →
        </Link>
      )}
      {burnedTotal > 0 && <p className="muted small center-text">≈ {formatKcal(burnedTotal)} burned in workouts (estimate, not added to your budget)</p>}

      {MEAL_SLOTS.map((slot) => {
        const mealEntries = entries.filter((entry) => entry.meal === slot);
        return (
          <section key={slot} className="card meal-card">
            <div className="section-header">
              <h2>{MEAL_LABELS[slot]}</h2>
              <span className="muted small">{mealEntries.length > 0 ? formatKcal(totalsOf(mealEntries).kcal) : ''}</span>
            </div>
            {mealEntries.length > 0 && (
              <ul className="plain-list">
                {mealEntries.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" className="log-row" onClick={() => setEditing(entry)}>
                      <span className="food-row-text">
                        <span className="food-row-name">{entry.name}</span>
                        <span className="muted small">{entry.amount === null ? 'Quick add' : describeAmount(entry.amount)}</span>
                      </span>
                      <span className="small">{formatKcal(entry.macros.kcal)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/diet/add?date=${date}&meal=${slot}`} className="button button-ghost button-block">
              + Add to {MEAL_LABELS[slot].toLowerCase()}
            </Link>
          </section>
        );
      })}

      <div className="link-grid">
        <Link to="/diet/weight" className="button button-secondary">
          ⚖ Weight
        </Link>
        <Link to="/diet/trends" className="button button-secondary">
          ▤ Trends
        </Link>
        <Link to="/diet/library" className="button button-secondary">
          ☰ My foods & meals
        </Link>
      </div>

      {editing !== null && editingFood !== null && editing.amount !== null && (
        <AmountSheet
          food={editingFood}
          initialAmount={editing.amount}
          meal={editing.meal}
          confirmLabel="Save"
          isFavorite={null}
          onToggleFavorite={null}
          onConfirm={(amount, meal) => {
            void saveFoodLogEntries([updateFoodEntry(editing, amount, meal ?? editing.meal)]).then(() => setEditing(null));
          }}
          onDelete={() => void deleteFoodLogEntry(editing.id).then(() => setEditing(null))}
          onClose={() => setEditing(null)}
        />
      )}
      {editing !== null && editing.amount === null && (
        <QuickAddSheet
          entry={editing}
          meal={editing.meal}
          onSave={(label, macros, meal) => void saveFoodLogEntries([{ ...editing, name: label.trim(), macros, meal }]).then(() => setEditing(null))}
          onDelete={() => void deleteFoodLogEntry(editing.id).then(() => setEditing(null))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
