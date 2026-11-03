import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AmountSheet } from '../../components/diet/AmountSheet';
import { FoodSearchPanel } from '../../components/diet/FoodSearchPanel';
import { QuickAddSheet } from '../../components/diet/QuickAddSheet';
import { Modal } from '../../components/Modal';
import { Loading, PageHeader } from '../../components/PageHeader';
import { todayKey } from '../../domain/dates';
import { formatKcal } from '../../domain/format';
import { recentFoodIds } from '../../domain/nutrition/foods';
import { MEAL_LABELS, MEAL_SLOTS, type Food, type MealSlot, type SavedMeal } from '../../domain/nutrition/foodTypes';
import { createFoodEntry, createQuickEntry, entriesFromSavedMeal, mealForTime } from '../../domain/nutrition/log';
import { describeAmount, portionMacros, sumMacros } from '../../domain/nutrition/math';
import { listFoodLogRange, listSavedMeals, logFoodWithCache, saveFoodLogEntries, setFavorite } from '../../storage/db';
import { useDbQuery } from '../../storage/hooks';
import { useFoodCatalog } from '../../storage/foodCatalog';
import { shiftDate } from './DietPage';

/** How far back "Recent" looks. */
const RECENT_DAYS = 60;
const RECENT_LIMIT = 15;

/** ?meal= picks the meal; without it, the meal that fits the current time of day. */
function parseMeal(value: string | null): MealSlot {
  if (value === null) {
    return mealForTime(new Date());
  }
  const meal = MEAL_SLOTS.find((slot) => slot === value);
  if (meal === undefined) {
    throw new Error(`Unknown meal "${value}"`);
  }
  return meal;
}

export function dietDayUrl(date: string): string {
  return date === todayKey() ? '/diet' : `/diet?date=${date}`;
}

export function AddFoodPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? todayKey();
  const meal = parseMeal(params.get('meal'));
  const pickId = params.get('pick');
  const navigate = useNavigate();
  const catalog = useFoodCatalog();
  const recentEntries = useDbQuery(() => listFoodLogRange(shiftDate(todayKey(), -RECENT_DAYS), todayKey()), []);
  const savedMeals = useDbQuery(listSavedMeals, []);
  const [picked, setPicked] = useState<Food | null>(null);
  const [pickedMeal, setPickedMeal] = useState<SavedMeal | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);

  // Returning from "create food" opens the new food straight away.
  useEffect(() => {
    if (pickId !== null && catalog !== undefined) {
      const food = catalog.find(pickId);
      if (food !== undefined) {
        setPicked(food);
      }
      params.delete('pick');
      setParams(params, { replace: true });
    }
  }, [pickId, catalog, params, setParams]);

  if (catalog === undefined || recentEntries === undefined || savedMeals === undefined) {
    return <Loading />;
  }

  const backToDay = () => navigate(dietDayUrl(date), { replace: true });
  const createFoodUrl = (extra: Record<string, string>) =>
    `/diet/foods/new?${new URLSearchParams({ ...extra, returnDate: date, returnMeal: meal }).toString()}`;

  return (
    <div className="page">
      <PageHeader title={`Add to ${MEAL_LABELS[meal].toLowerCase()}`} back />
      <FoodSearchPanel
        catalog={catalog}
        recentIds={recentFoodIds(recentEntries, RECENT_LIMIT)}
        savedMeals={savedMeals}
        onPickFood={setPicked}
        onPickMeal={setPickedMeal}
        onBarcodeUnknown={(barcode, name, brand) =>
          navigate(createFoodUrl({ barcode, ...(name === null ? {} : { name }), ...(brand === null ? {} : { brand }) }))
        }
        actions={
          <>
            <button type="button" className="button button-secondary" onClick={() => setQuickAdd(true)}>
              ⚡ Quick add
            </button>
            <Link to={createFoodUrl({})} className="button button-secondary">
              + New food
            </Link>
          </>
        }
      />

      {picked !== null && (
        <AmountSheet
          food={picked}
          initialAmount={null}
          meal={meal}
          confirmLabel="Add"
          isFavorite={catalog.isFavorite(picked.id)}
          onToggleFavorite={() => void setFavorite(picked, !catalog.isFavorite(picked.id))}
          onConfirm={(amount, chosenMeal) => {
            const entry = createFoodEntry(picked, amount, date, chosenMeal ?? meal, Date.now());
            // Online products are cached so the entry's food stays available offline (recent, favourites).
            void logFoodWithCache(entry, picked.source === 'off' ? picked : null).then(backToDay);
          }}
          onDelete={null}
          onClose={() => setPicked(null)}
        />
      )}

      {pickedMeal !== null && (
        <Modal title={pickedMeal.name} onClose={() => setPickedMeal(null)}>
          <ul className="plain-list">
            {pickedMeal.items.map((item, index) => (
              <li key={`${item.foodId}-${index}`} className="list-row">
                <span className="food-row-text">
                  <span>{item.name}</span>
                  <span className="muted small">{describeAmount(item.amount)}</span>
                </span>
                <span className="small">{formatKcal(portionMacros(item).kcal)}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">Total {formatKcal(sumMacros(pickedMeal.items.map(portionMacros)).kcal)}. Each food is added separately, so you can adjust any of them afterwards.</p>
          <button
            type="button"
            className="button button-primary button-block"
            onClick={() => void saveFoodLogEntries(entriesFromSavedMeal(pickedMeal, date, meal, Date.now())).then(backToDay)}
          >
            Add {pickedMeal.items.length} foods to {MEAL_LABELS[meal].toLowerCase()}
          </button>
        </Modal>
      )}

      {quickAdd && (
        <QuickAddSheet
          entry={null}
          meal={meal}
          onSave={(label, macros, chosenMeal) => void saveFoodLogEntries([createQuickEntry(label, macros, date, chosenMeal, Date.now())]).then(backToDay)}
          onDelete={null}
          onClose={() => setQuickAdd(false)}
        />
      )}
    </div>
  );
}
