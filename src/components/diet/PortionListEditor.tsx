import { useState } from 'react';
import { formatKcal } from '../../domain/format';
import type { Food, FoodPortion } from '../../domain/nutrition/foodTypes';
import { portionFromFood } from '../../domain/nutrition/log';
import { describeAmount, portionMacros } from '../../domain/nutrition/math';
import type { FoodCatalog } from '../../storage/foodCatalog';
import { Modal } from '../Modal';
import { AmountSheet } from './AmountSheet';
import { FoodSearchPanel } from './FoodSearchPanel';

interface Props {
  items: readonly FoodPortion[];
  onChange: (items: FoodPortion[]) => void;
  catalog: FoodCatalog;
  recentIds: readonly string[];
  addLabel: string;
  /** Recipes can't contain themselves. */
  excludeFoodId: string | null;
}

type Editing = { kind: 'none' } | { kind: 'searching' } | { kind: 'adding'; food: Food } | { kind: 'changing'; index: number };

/** Rebuild a food from a stored portion (servings come from the live catalog when available). */
function foodOfPortion(portion: FoodPortion, catalog: FoodCatalog): Food {
  const live = catalog.find(portion.foodId);
  return live ?? { id: portion.foodId, source: 'custom', name: portion.name, nameHe: null, brand: portion.brand, barcode: null, per100: portion.per100, servings: [] };
}

/** Ingredient list for saved meals and recipes: add from search, change amounts, remove. */
export function PortionListEditor({ items, onChange, catalog, recentIds, addLabel, excludeFoodId }: Props) {
  const [editing, setEditing] = useState<Editing>({ kind: 'none' });
  const searchable: FoodCatalog = excludeFoodId === null ? catalog : { ...catalog, all: catalog.all.filter((food) => food.id !== excludeFoodId) };
  const changingItem = editing.kind === 'changing' ? items[editing.index] : undefined;

  return (
    <>
      <ul className="plain-list">
        {items.map((item, index) => (
          <li key={`${item.foodId}-${index}`} className="list-row">
            <button type="button" className="log-row" onClick={() => setEditing({ kind: 'changing', index })}>
              <span className="food-row-text">
                <span className="food-row-name">{item.name}</span>
                <span className="muted small">{describeAmount(item.amount)}</span>
              </span>
              <span className="small">{formatKcal(portionMacros(item).kcal)}</span>
            </button>
            <button type="button" className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="button button-secondary button-block" onClick={() => setEditing({ kind: 'searching' })}>
        {addLabel}
      </button>

      {editing.kind === 'searching' && (
        <Modal title="Add food" onClose={() => setEditing({ kind: 'none' })}>
          <FoodSearchPanel
            catalog={searchable}
            recentIds={recentIds}
            savedMeals={null}
            onPickFood={(food) => setEditing({ kind: 'adding', food })}
            onPickMeal={null}
            onBarcodeUnknown={(barcode) =>
              window.alert(`Product ${barcode} isn't known yet. Add it first with Add food → New food (it's saved on your phone), then add it here.`)
            }
          />
        </Modal>
      )}
      {editing.kind === 'adding' && (
        <AmountSheet
          food={editing.food}
          initialAmount={null}
          meal={null}
          confirmLabel="Add"
          isFavorite={null}
          onToggleFavorite={null}
          onConfirm={(amount) => {
            onChange([...items, portionFromFood(editing.food, amount)]);
            setEditing({ kind: 'none' });
          }}
          onDelete={null}
          onClose={() => setEditing({ kind: 'none' })}
        />
      )}
      {editing.kind === 'changing' && changingItem !== undefined && (
        <AmountSheet
          food={foodOfPortion(changingItem, catalog)}
          initialAmount={changingItem.amount}
          meal={null}
          confirmLabel="Save"
          isFavorite={null}
          onToggleFavorite={null}
          onConfirm={(amount) => {
            onChange(items.map((item, index) => (index === editing.index ? { ...item, amount } : item)));
            setEditing({ kind: 'none' });
          }}
          onDelete={() => {
            onChange(items.filter((_, index) => index !== editing.index));
            setEditing({ kind: 'none' });
          }}
          onClose={() => setEditing({ kind: 'none' })}
        />
      )}
    </>
  );
}
