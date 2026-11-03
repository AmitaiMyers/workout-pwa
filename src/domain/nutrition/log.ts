import { assert, newId } from '../assert';
import type { Amount, Food, FoodLogEntry, FoodPortion, Macros, MealSlot, SavedMeal } from './foodTypes';
import { scaleMacros, sumMacros } from './math';

export function createFoodEntry(food: Food, amount: Amount, date: string, meal: MealSlot, now: number): FoodLogEntry {
  return {
    id: newId(),
    date,
    meal,
    createdAt: now,
    name: food.name,
    brand: food.brand,
    foodId: food.id,
    amount,
    per100: food.per100,
    macros: scaleMacros(food.per100, amount.grams),
  };
}

/** Change how much of a logged food was eaten (and/or which meal), keeping its nutrition snapshot. */
export function updateFoodEntry(entry: FoodLogEntry, amount: Amount, meal: MealSlot): FoodLogEntry {
  assert(entry.per100 !== null, 'Quick-add entries have no amount to change');
  return { ...entry, amount, meal, macros: scaleMacros(entry.per100, amount.grams) };
}

export function createQuickEntry(label: string, macros: Macros, date: string, meal: MealSlot, now: number): FoodLogEntry {
  assert(label.trim() !== '', 'Quick add needs a label');
  assert(macros.kcal >= 0, 'Calories cannot be negative');
  return { id: newId(), date, meal, createdAt: now, name: label.trim(), brand: null, foodId: null, amount: null, per100: null, macros };
}

export function portionToEntry(portion: FoodPortion, date: string, meal: MealSlot, now: number): FoodLogEntry {
  return {
    id: newId(),
    date,
    meal,
    createdAt: now,
    name: portion.name,
    brand: portion.brand,
    foodId: portion.foodId,
    amount: portion.amount,
    per100: portion.per100,
    macros: scaleMacros(portion.per100, portion.amount.grams),
  };
}

/** Log every food of a saved meal as its own entry (each can then be adjusted). */
export function entriesFromSavedMeal(meal: SavedMeal, date: string, slot: MealSlot, now: number): FoodLogEntry[] {
  // Distinct timestamps keep the meal's order stable when sorted by creation time.
  return meal.items.map((item, index) => portionToEntry(item, date, slot, now + index));
}

export function portionFromFood(food: Food, amount: Amount): FoodPortion {
  return { foodId: food.id, name: food.name, brand: food.brand, per100: food.per100, amount };
}

export function totalsOf(entries: readonly FoodLogEntry[]): Macros {
  return sumMacros(entries.map((entry) => entry.macros));
}

/** Daily totals keyed by date, for calendars and charts. */
export function totalsByDate(entries: readonly FoodLogEntry[]): Map<string, Macros> {
  const byDate = new Map<string, FoodLogEntry[]>();
  for (const entry of entries) {
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }
  return new Map([...byDate].map(([date, dayEntries]) => [date, totalsOf(dayEntries)]));
}

export type DayStatus = 'on-target' | 'over' | 'under';

/** Within ±10% of the calorie target counts as on target. */
export const ON_TARGET_TOLERANCE = 0.1;

export function dayStatus(eatenKcal: number, targetKcal: number): DayStatus {
  if (eatenKcal > targetKcal * (1 + ON_TARGET_TOLERANCE)) return 'over';
  if (eatenKcal < targetKcal * (1 - ON_TARGET_TOLERANCE)) return 'under';
  return 'on-target';
}

/** Sensible default meal for "log food now": breakfast until 11:00, lunch until 16:00, dinner until 21:00. */
export function mealForTime(date: Date): MealSlot {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snacks';
}
