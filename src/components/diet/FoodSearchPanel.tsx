import { useState, type ReactNode } from 'react';
import { formatKcal } from '../../domain/format';
import { searchFoods } from '../../domain/nutrition/foods';
import type { Food, SavedMeal } from '../../domain/nutrition/foodTypes';
import { portionMacros, scaleMacros, sumMacros } from '../../domain/nutrition/math';
import { describeOffError, lookupBarcode, OFF_ATTRIBUTION, searchOpenFoodFacts, type OffError } from '../../domain/nutrition/openFoodFacts';
import { findStoredFoodByBarcode } from '../../storage/db';
import type { FoodCatalog } from '../../storage/foodCatalog';
import { BarcodeScanner } from './BarcodeScanner';

const LOCAL_RESULT_LIMIT = 40;
const MIN_ONLINE_QUERY = 3;

interface Props {
  catalog: FoodCatalog;
  recentIds: readonly string[];
  /** null hides saved meals (e.g. when choosing a recipe ingredient). */
  savedMeals: readonly SavedMeal[] | null;
  onPickFood: (food: Food) => void;
  onPickMeal: ((meal: SavedMeal) => void) | null;
  /** A scanned barcode isn't known anywhere (or has no nutrition data): let the user add it. */
  onBarcodeUnknown: (barcode: string, name: string | null, brand: string | null) => void;
  /** Extra buttons shown next to "Scan" (quick add, create food…). */
  actions?: ReactNode;
}

const SOURCE_BADGES: Record<Food['source'], string | null> = { builtin: null, off: 'Online', custom: 'Mine', recipe: 'Recipe' };

function servingSummary(food: Food): string {
  const serving = food.servings[0];
  return serving === undefined ? `${formatKcal(food.per100.kcal)} / 100 g` : `${formatKcal(scaleMacros(food.per100, serving.grams).kcal)} / ${serving.label}`;
}

function FoodRow({ food, favorite, onPick }: { food: Food; favorite: boolean; onPick: () => void }) {
  const badge = SOURCE_BADGES[food.source];
  const subtitle = [food.brand, food.nameHe].filter((part): part is string => part !== null).join(' · ');
  return (
    <li>
      <button type="button" className="food-row" onClick={onPick}>
        <span className="food-row-text">
          <span className="food-row-name">
            {favorite && <span aria-label="Favourite">★ </span>}
            {food.name}
            {badge !== null && <span className="source-badge">{badge}</span>}
          </span>
          {subtitle !== '' && <span className="muted small">{subtitle}</span>}
        </span>
        <span className="muted small food-row-kcal">{servingSummary(food)}</span>
      </button>
    </li>
  );
}

type OnlineState = { kind: 'idle' } | { kind: 'loading'; query: string } | { kind: 'done'; query: string; foods: Food[] } | { kind: 'error'; error: OffError };
type ScanState = { kind: 'closed' } | { kind: 'scanning' } | { kind: 'looking-up'; barcode: string } | { kind: 'error'; barcode: string; error: OffError };

export function FoodSearchPanel({ catalog, recentIds, savedMeals, onPickFood, onPickMeal, onBarcodeUnknown, actions }: Props) {
  const [query, setQuery] = useState('');
  const [online, setOnline] = useState<OnlineState>({ kind: 'idle' });
  const [scan, setScan] = useState<ScanState>({ kind: 'closed' });

  const trimmed = query.trim();
  const local = trimmed === '' ? [] : searchFoods(catalog.all, trimmed, LOCAL_RESULT_LIMIT);
  const recent = recentIds.flatMap((id) => {
    const food = catalog.find(id);
    return food === undefined ? [] : [food];
  });
  const recipes = catalog.all.filter((food) => food.source === 'recipe');

  const searchOnline = () => {
    setOnline({ kind: 'loading', query: trimmed });
    void searchOpenFoodFacts(trimmed).then((result) =>
      setOnline(result.ok ? { kind: 'done', query: trimmed, foods: result.foods } : { kind: 'error', error: result.error }),
    );
  };

  const handleBarcode = async (barcode: string) => {
    setScan({ kind: 'looking-up', barcode });
    const stored = await findStoredFoodByBarcode(barcode);
    if (stored !== undefined) {
      setScan({ kind: 'closed' });
      onPickFood(stored);
      return;
    }
    const result = await lookupBarcode(barcode);
    if (!result.ok) {
      setScan({ kind: 'error', barcode, error: result.error });
      return;
    }
    setScan({ kind: 'closed' });
    if (result.found === null) {
      onBarcodeUnknown(barcode, null, null);
    } else if (result.found.kind === 'incomplete') {
      onBarcodeUnknown(barcode, result.found.name, result.found.brand);
    } else {
      onPickFood(result.found.food);
    }
  };

  const renderFoods = (foods: readonly Food[]) => (
    <ul className="food-list">
      {foods.map((food) => (
        <FoodRow key={food.id} food={food} favorite={catalog.isFavorite(food.id)} onPick={() => onPickFood(food)} />
      ))}
    </ul>
  );

  return (
    <div className="food-search">
      <div className="search-bar">
        <input
          type="search"
          className="search-input"
          placeholder="Search foods (English or עברית)"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOnline({ kind: 'idle' });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && trimmed.length >= MIN_ONLINE_QUERY) searchOnline();
          }}
          autoFocus
        />
      </div>
      <div className="button-row wrap">
        <button type="button" className="button button-secondary" onClick={() => setScan({ kind: 'scanning' })}>
          ▦ Scan barcode
        </button>
        {actions}
      </div>

      {scan.kind === 'looking-up' && <p className="muted small">Looking up {scan.barcode}…</p>}
      {scan.kind === 'error' && (
        <div className="notice">
          <p>{describeOffError(scan.error)}</p>
          <button type="button" className="link-button" onClick={() => onBarcodeUnknown(scan.barcode, null, null)}>
            Add product {scan.barcode} myself
          </button>
        </div>
      )}

      {trimmed === '' ? (
        <>
          {catalog.favorites.length > 0 && (
            <section>
              <h2 className="group-title">Favourites</h2>
              {renderFoods(catalog.favorites)}
            </section>
          )}
          {savedMeals !== null && onPickMeal !== null && savedMeals.length > 0 && (
            <section>
              <h2 className="group-title">Saved meals</h2>
              <ul className="food-list">
                {savedMeals.map((meal) => (
                  <li key={meal.id}>
                    <button type="button" className="food-row" onClick={() => onPickMeal(meal)}>
                      <span className="food-row-text">
                        <span className="food-row-name">{meal.name}</span>
                        <span className="muted small">{meal.items.map((item) => item.name).join(', ')}</span>
                      </span>
                      <span className="muted small food-row-kcal">{formatKcal(sumMacros(meal.items.map(portionMacros)).kcal)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {recent.length > 0 && (
            <section>
              <h2 className="group-title">Recent</h2>
              {renderFoods(recent)}
            </section>
          )}
          {recipes.length > 0 && (
            <section>
              <h2 className="group-title">Recipes</h2>
              {renderFoods(recipes)}
            </section>
          )}
        </>
      ) : (
        <>
          {local.length > 0 ? renderFoods(local) : <p className="muted small">No matching foods on this phone.</p>}
          <section>
            {online.kind === 'idle' && (
              <button type="button" className="button button-ghost button-block" disabled={trimmed.length < MIN_ONLINE_QUERY} onClick={searchOnline}>
                Search online products for “{trimmed}”
              </button>
            )}
            {online.kind === 'loading' && <p className="muted small">Searching Open Food Facts…</p>}
            {online.kind === 'error' && <p className="notice">{describeOffError(online.error)}</p>}
            {online.kind === 'done' && (
              <>
                <h2 className="group-title">Online products</h2>
                {online.foods.length === 0 ? <p className="muted small">No products found for “{online.query}”.</p> : renderFoods(online.foods)}
                <p className="muted small">{OFF_ATTRIBUTION}</p>
              </>
            )}
          </section>
        </>
      )}

      {scan.kind === 'scanning' && <BarcodeScanner onDetected={(code) => void handleBarcode(code)} onClose={() => setScan({ kind: 'closed' })} />}
    </div>
  );
}
