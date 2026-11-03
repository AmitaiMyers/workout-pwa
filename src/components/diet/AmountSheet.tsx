import { useState } from 'react';
import { formatGrams, formatKcal } from '../../domain/format';
import { MEAL_LABELS, MEAL_SLOTS, type Amount, type Food, type MealSlot } from '../../domain/nutrition/foodTypes';
import { amountInGrams, amountInServings, scaleMacros } from '../../domain/nutrition/math';
import { OFF_ATTRIBUTION } from '../../domain/nutrition/openFoodFacts';
import { Modal } from '../Modal';
import { NumberInput } from '../NumberInput';

interface Props {
  food: Food;
  /** Amount to start from (editing an entry); null starts at the first serving or 100 g. */
  initialAmount: Amount | null;
  /** Meal to log into; null hides the meal picker (e.g. adding to a recipe). */
  meal: MealSlot | null;
  confirmLabel: string;
  isFavorite: boolean | null;
  onToggleFavorite: (() => void) | null;
  onConfirm: (amount: Amount, meal: MealSlot | null) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}

/** null unit = grams; otherwise the index of the chosen serving. */
type Unit = number | null;

function initialUnit(food: Food, amount: Amount | null): Unit {
  if (amount !== null) {
    const index = food.servings.findIndex((serving) => serving.label === amount.servingLabel);
    return amount.servingLabel === null || index === -1 ? null : index;
  }
  return food.servings.length > 0 ? 0 : null;
}

function initialQuantity(unit: Unit, amount: Amount | null): number {
  if (amount === null) {
    return unit === null ? 100 : 1;
  }
  return unit === null ? Math.round(amount.grams * 10) / 10 : (amount.servingCount ?? 1);
}

/** Choose how much of a food (serving or grams), see the nutrition live, then confirm. */
export function AmountSheet({ food, initialAmount, meal, confirmLabel, isFavorite, onToggleFavorite, onConfirm, onDelete, onClose }: Props) {
  const [unit, setUnit] = useState<Unit>(() => initialUnit(food, initialAmount));
  const [quantity, setQuantity] = useState<number | null>(() => initialQuantity(initialUnit(food, initialAmount), initialAmount));
  const [chosenMeal, setChosenMeal] = useState<MealSlot | null>(meal);

  const serving = unit === null ? null : food.servings[unit];
  const amount: Amount | null =
    quantity === null || quantity <= 0 ? null : serving === undefined || serving === null ? amountInGrams(quantity) : amountInServings(serving, quantity);
  const preview = amount === null ? null : scaleMacros(food.per100, amount.grams);

  const switchUnit = (next: Unit) => {
    setUnit(next);
    setQuantity(next === null ? (amount === null ? 100 : Math.round(amount.grams)) : 1);
  };

  return (
    <Modal title={food.name} onClose={onClose}>
      {food.brand !== null && <p className="muted small">{food.brand}</p>}
      <div className="chip-row wrap-chips" role="radiogroup" aria-label="Unit">
        {food.servings.map((option, index) => (
          <button type="button" key={option.label} role="radio" aria-checked={unit === index} className={`chip ${unit === index ? 'chip-active' : ''}`} onClick={() => switchUnit(index)}>
            {option.label}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={unit === null} className={`chip ${unit === null ? 'chip-active' : ''}`} onClick={() => switchUnit(null)}>
          grams
        </button>
      </div>
      <label className="field">
        <span>{unit === null ? 'Grams' : 'How many?'}</span>
        <NumberInput value={quantity} onChange={setQuantity} allowDecimals label={unit === null ? 'Grams' : 'Number of servings'} />
      </label>
      {preview !== null && amount !== null && (
        <div className="amount-preview">
          <strong>{formatKcal(preview.kcal)}</strong>
          <span className="muted small">
            {formatGrams(amount.grams)} · P {formatGrams(preview.protein)} · C {formatGrams(preview.carbs)} · F {formatGrams(preview.fat)}
          </span>
        </div>
      )}
      {meal !== null && (
        <div className="chip-row wrap-chips" role="radiogroup" aria-label="Meal">
          {MEAL_SLOTS.map((slot) => (
            <button type="button" key={slot} role="radio" aria-checked={chosenMeal === slot} className={`chip ${chosenMeal === slot ? 'chip-active' : ''}`} onClick={() => setChosenMeal(slot)}>
              {MEAL_LABELS[slot]}
            </button>
          ))}
        </div>
      )}
      {food.source === 'off' && <p className="muted small">{OFF_ATTRIBUTION}</p>}
      <div className="button-row wrap">
        {onToggleFavorite !== null && (
          <button type="button" className="button button-ghost" onClick={onToggleFavorite} aria-pressed={isFavorite === true}>
            {isFavorite === true ? '★ Favourite' : '☆ Favourite'}
          </button>
        )}
        {onDelete !== null && (
          <button type="button" className="button button-danger" onClick={onDelete}>
            Delete
          </button>
        )}
        <button type="button" className="button button-primary amount-confirm" disabled={amount === null} onClick={() => amount !== null && onConfirm(amount, chosenMeal)}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
