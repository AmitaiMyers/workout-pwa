import { assert } from '../assert';
import type { Amount, FoodPortion, Macros, Serving } from './foodTypes';

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function scaleMacros(per100: Macros, grams: number): Macros {
  assert(grams >= 0, 'Amount cannot be negative');
  const factor = grams / 100;
  return {
    kcal: per100.kcal * factor,
    protein: per100.protein * factor,
    carbs: per100.carbs * factor,
    fat: per100.fat * factor,
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  return items.reduce(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fat: total.fat + item.fat,
    }),
    ZERO_MACROS,
  );
}

export function amountInGrams(grams: number): Amount {
  return { grams, servingLabel: null, servingCount: null };
}

export function amountInServings(serving: Serving, count: number): Amount {
  return { grams: serving.grams * count, servingLabel: serving.label, servingCount: count };
}

/** Human description of an amount: "2 × 1 large egg (100 g)" or "150 g". */
export function describeAmount(amount: Amount): string {
  const grams = `${Math.round(amount.grams * 10) / 10} g`;
  if (amount.servingLabel === null || amount.servingCount === null) {
    return grams;
  }
  const count = Math.round(amount.servingCount * 100) / 100;
  return `${count === 1 ? '' : `${count} × `}${amount.servingLabel} (${grams})`;
}

export function portionMacros(portion: FoodPortion): Macros {
  return scaleMacros(portion.per100, portion.amount.grams);
}

/** Nutrition per 100 g of a mix of ingredients (e.g. a recipe). */
export function per100OfMix(portions: readonly FoodPortion[]): Macros {
  const totalGrams = portions.reduce((total, portion) => total + portion.amount.grams, 0);
  assert(totalGrams > 0, 'A mix needs a positive total weight');
  return scaleMacros(sumMacros(portions.map(portionMacros)), (100 * 100) / totalGrams);
}

/** Convert label values "per serving of N grams" to per 100 g. */
export function per100FromServing(perServing: Macros, servingGrams: number): Macros {
  assert(servingGrams > 0, 'Serving weight must be positive');
  return scaleMacros(perServing, (100 * 100) / servingGrams);
}
