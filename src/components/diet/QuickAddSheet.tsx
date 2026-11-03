import { useState } from 'react';
import { MEAL_LABELS, MEAL_SLOTS, type FoodLogEntry, type Macros, type MealSlot } from '../../domain/nutrition/foodTypes';
import { Modal } from '../Modal';
import { NumberInput } from '../NumberInput';

interface Props {
  /** Entry being edited, or null to add a new one. */
  entry: FoodLogEntry | null;
  meal: MealSlot;
  onSave: (label: string, macros: Macros, meal: MealSlot) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}

/** Log calories without a food, e.g. "650 kcal at the burger place". Macros are optional. */
export function QuickAddSheet({ entry, meal, onSave, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(entry?.name ?? '');
  const [kcal, setKcal] = useState<number | null>(entry === null ? null : Math.round(entry.macros.kcal));
  const [protein, setProtein] = useState<number | null>(entry === null || entry.macros.protein === 0 ? null : entry.macros.protein);
  const [carbs, setCarbs] = useState<number | null>(entry === null || entry.macros.carbs === 0 ? null : entry.macros.carbs);
  const [fat, setFat] = useState<number | null>(entry === null || entry.macros.fat === 0 ? null : entry.macros.fat);
  const [chosenMeal, setChosenMeal] = useState<MealSlot>(meal);
  const valid = label.trim() !== '' && kcal !== null && kcal > 0;

  return (
    <Modal title={entry === null ? 'Quick add' : 'Edit quick add'} onClose={onClose}>
      <label className="field">
        <span>What was it?</span>
        <input className="text-input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Burger & fries" autoFocus />
      </label>
      <label className="field">
        <span>Calories (kcal)</span>
        <NumberInput value={kcal} onChange={setKcal} allowDecimals={false} label="Calories" placeholder="e.g. 650" />
      </label>
      <div className="macro-inputs">
        <label className="field">
          <span>Protein g</span>
          <NumberInput value={protein} onChange={setProtein} allowDecimals label="Protein grams" placeholder="optional" />
        </label>
        <label className="field">
          <span>Carbs g</span>
          <NumberInput value={carbs} onChange={setCarbs} allowDecimals label="Carbs grams" placeholder="optional" />
        </label>
        <label className="field">
          <span>Fat g</span>
          <NumberInput value={fat} onChange={setFat} allowDecimals label="Fat grams" placeholder="optional" />
        </label>
      </div>
      <div className="chip-row wrap-chips" role="radiogroup" aria-label="Meal">
        {MEAL_SLOTS.map((slot) => (
          <button type="button" key={slot} role="radio" aria-checked={chosenMeal === slot} className={`chip ${chosenMeal === slot ? 'chip-active' : ''}`} onClick={() => setChosenMeal(slot)}>
            {MEAL_LABELS[slot]}
          </button>
        ))}
      </div>
      <div className="button-row wrap">
        {onDelete !== null && (
          <button type="button" className="button button-danger" onClick={onDelete}>
            Delete
          </button>
        )}
        <button
          type="button"
          className="button button-primary amount-confirm"
          disabled={!valid}
          // Blank macro fields mean "not known", recorded as 0 g.
          onClick={() => kcal !== null && onSave(label, { kcal, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 }, chosenMeal)}
        >
          {entry === null ? 'Add' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
