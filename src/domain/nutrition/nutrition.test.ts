import { describe, expect, it } from 'vitest';
import { validateBackup } from '../../storage/db';
import { estimateWorkoutKcal } from './burn';
import { BUILT_IN_FOODS, recipeAsFood, recentFoodIds, searchFoods } from './foods';
import type { FoodLogEntry, FoodPortion, Profile } from './foodTypes';
import { createFoodEntry, createQuickEntry, dayStatus, entriesFromSavedMeal, mealForTime, totalsByDate, updateFoodEntry } from './log';
import { amountInGrams, amountInServings, describeAmount, per100FromServing, per100OfMix, scaleMacros } from './math';
import { parseOffProduct } from './openFoodFacts';
import { basalMetabolicRate, dailyTargets } from './targets';

const noOverrides = { kcal: null, protein: null, carbs: null, fat: null };
const profile = (changes: Partial<Profile>): Profile => ({
  sex: 'male',
  birthYear: 1996,
  heightCm: 180,
  activity: 'moderate',
  goal: 'maintain',
  paceKgPerWeek: 0.5,
  overrides: noOverrides,
  ...changes,
});
const today = new Date(2026, 10, 3);

describe('targets', () => {
  it('computes Mifflin-St Jeor BMR', () => {
    expect(basalMetabolicRate('male', 80, 180, 30)).toBe(1780);
    expect(basalMetabolicRate('female', 60, 165, 30)).toBeCloseTo(1320.25);
  });

  it('derives maintenance calories and default macros', () => {
    const targets = dailyTargets(profile({}), 80, today);
    // 1780 × 1.55 = 2759 → 2760; protein 2 g/kg; fat 25%; carbs the rest.
    expect(targets.macros).toEqual({ kcal: 2760, protein: 160, fat: 77, carbs: 357 });
    expect(targets.floorApplied).toBe(false);
  });

  it('applies the weekly pace (7700 kcal per kg)', () => {
    expect(dailyTargets(profile({ goal: 'lose', paceKgPerWeek: 0.5 }), 80, today).macros.kcal).toBe(2210);
    expect(dailyTargets(profile({ goal: 'gain', paceKgPerWeek: 0.25 }), 80, today).macros.kcal).toBe(3030);
  });

  it('never goes below the safety floor', () => {
    const targets = dailyTargets(profile({ sex: 'female', birthYear: 1966, heightCm: 160, activity: 'sedentary', goal: 'lose', paceKgPerWeek: 1 }), 50, today);
    expect(targets.macros.kcal).toBe(1200);
    expect(targets.floorApplied).toBe(true);
  });

  it('uses overrides and fills the rest around them', () => {
    const targets = dailyTargets(profile({ overrides: { kcal: 2000, protein: 180, carbs: null, fat: null } }), 80, today);
    expect(targets.macros).toEqual({ kcal: 2000, protein: 180, fat: 56, carbs: 194 });
  });
});

describe('portion maths', () => {
  const per100 = { kcal: 200, protein: 10, carbs: 20, fat: 5 };
  it('scales per-100 g values', () => {
    expect(scaleMacros(per100, 150)).toEqual({ kcal: 300, protein: 15, carbs: 30, fat: 7.5 });
  });
  it('converts label values per serving to per 100 g', () => {
    const converted = per100FromServing({ kcal: 120, protein: 6, carbs: 12, fat: 3 }, 60);
    for (const key of ['kcal', 'protein', 'carbs', 'fat'] as const) expect(converted[key]).toBeCloseTo(per100[key]);
  });
  it('describes amounts', () => {
    expect(describeAmount(amountInGrams(150))).toBe('150 g');
    expect(describeAmount(amountInServings({ label: '1 large egg', grams: 50 }, 2))).toBe('2 × 1 large egg (100 g)');
    expect(describeAmount(amountInServings({ label: '1 slice', grams: 30 }, 1))).toBe('1 slice (30 g)');
  });
  it('computes a recipe per 100 g and per portion', () => {
    const portion = (grams: number, kcal: number): FoodPortion => ({ foodId: 'x', name: 'x', brand: null, per100: { kcal, protein: 0, carbs: 0, fat: 0 }, amount: amountInGrams(grams) });
    const ingredients = [portion(300, 100), portion(100, 400)]; // 300 + 400 = 700 kcal in 400 g
    expect(per100OfMix(ingredients).kcal).toBe(175);
    const food = recipeAsFood({ id: 'r', name: 'Stew', portions: 4, ingredients });
    expect(food.servings).toEqual([{ label: '1 portion', grams: 100 }]);
    expect(scaleMacros(food.per100, 100).kcal).toBe(175);
  });
});

describe('built-in foods', () => {
  it('has about 400 valid foods with unique ids', () => {
    expect(BUILT_IN_FOODS.length).toBeGreaterThanOrEqual(390);
    expect(new Set(BUILT_IN_FOODS.map((food) => food.id)).size).toBe(BUILT_IN_FOODS.length);
    for (const food of BUILT_IN_FOODS) {
      expect(food.per100.kcal, food.id).toBeGreaterThanOrEqual(0);
      expect(food.nameHe, food.id).not.toBe('');
      for (const serving of food.servings) expect(serving.grams, `${food.id} ${serving.label}`).toBeGreaterThan(0);
    }
  });

  it('matches USDA reference values', () => {
    const egg = BUILT_IN_FOODS.find((food) => food.id === 'usda:egg');
    expect(egg?.per100).toEqual({ kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 });
  });
});

describe('searchFoods', () => {
  it('finds by English words in any order', () => {
    expect(searchFoods(BUILT_IN_FOODS, 'breast chicken', 5).map((food) => food.id)).toContain('usda:chicken-breast');
  });
  it('finds by Hebrew name', () => {
    expect(searchFoods(BUILT_IN_FOODS, 'חזה עוף', 5).map((food) => food.id)).toContain('usda:chicken-breast');
  });
  it('ranks names starting with the query first', () => {
    expect(searchFoods(BUILT_IN_FOODS, 'banana', 3)[0]?.id).toBe('usda:banana');
  });
  it('returns nothing for an empty query', () => {
    expect(searchFoods(BUILT_IN_FOODS, '   ', 5)).toEqual([]);
  });
});

describe('log entries', () => {
  const egg = BUILT_IN_FOODS.find((food) => food.id === 'usda:egg')!;
  it('snapshots nutrition and re-scales when the amount changes', () => {
    const entry = createFoodEntry(egg, amountInServings({ label: '1 large egg', grams: 50 }, 2), '2026-11-03', 'breakfast', 1);
    expect(entry.macros.kcal).toBeCloseTo(143);
    const updated = updateFoodEntry(entry, amountInGrams(150), 'lunch');
    expect([updated.meal, Math.round(updated.macros.kcal)]).toEqual(['lunch', 215]);
  });
  it('rejects a quick add without a label', () => {
    expect(() => createQuickEntry('  ', { kcal: 500, protein: 0, carbs: 0, fat: 0 }, '2026-11-03', 'dinner', 1)).toThrow();
  });
  it('logs a saved meal as separate entries in order', () => {
    const item: FoodPortion = { foodId: egg.id, name: egg.name, brand: null, per100: egg.per100, amount: amountInGrams(100) };
    const entries = entriesFromSavedMeal({ id: 'm', name: 'Breakfast', items: [item, item] }, '2026-11-03', 'breakfast', 10);
    expect(entries.map((entry) => entry.createdAt)).toEqual([10, 11]);
  });
  it('totals by date and lists recent foods newest first', () => {
    const entries: FoodLogEntry[] = [
      createFoodEntry(egg, amountInGrams(100), '2026-11-02', 'breakfast', 1),
      createQuickEntry('Burger', { kcal: 700, protein: 30, carbs: 50, fat: 40 }, '2026-11-02', 'dinner', 2),
      createFoodEntry({ ...egg, id: 'usda:x' }, amountInGrams(100), '2026-11-03', 'lunch', 3),
    ];
    expect(Math.round(totalsByDate(entries).get('2026-11-02')?.kcal ?? 0)).toBe(843);
    expect(recentFoodIds(entries, 5)).toEqual(['usda:x', 'usda:egg']);
  });
  it('classifies a day within ±10% as on target', () => {
    expect([dayStatus(2100, 2000), dayStatus(2300, 2000), dayStatus(1700, 2000)]).toEqual(['on-target', 'over', 'under']);
  });
  it('picks a meal from the time of day', () => {
    expect([8, 13, 19, 23].map((hour) => mealForTime(new Date(2026, 0, 1, hour)))).toEqual(['breakfast', 'lunch', 'dinner', 'snacks']);
  });
});

describe('parseOffProduct', () => {
  it('reads per-100 g nutrition and the serving', () => {
    const result = parseOffProduct({
      code: '7290000000001',
      product_name: 'Hummus Classic',
      brands: 'Brand A, Brand B',
      serving_size: '30 g',
      serving_quantity: 30,
      nutriments: { 'energy-kcal_100g': 260, proteins_100g: 7, carbohydrates_100g: 12, fat_100g: 20 },
    });
    expect(result).toEqual({
      kind: 'food',
      food: {
        id: 'off:7290000000001',
        source: 'off',
        name: 'Hummus Classic',
        nameHe: null,
        brand: 'Brand A',
        barcode: '7290000000001',
        per100: { kcal: 260, protein: 7, carbs: 12, fat: 20 },
        servings: [{ label: '1 serving (30 g)', grams: 30 }],
      },
    });
  });
  it('converts kJ when kcal is missing', () => {
    const result = parseOffProduct({ code: '1', product_name: 'X', nutriments: { energy_100g: 418.4, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } });
    expect(result.kind === 'food' && result.food.per100.kcal).toBeCloseTo(100);
  });
  it('flags products missing nutrition as incomplete', () => {
    expect(parseOffProduct({ code: '2', product_name: 'Mystery snack', nutriments: { 'energy-kcal_100g': 500 } })).toEqual({ kind: 'incomplete', barcode: '2', name: 'Mystery snack', brand: null });
  });
});

describe('estimateWorkoutKcal', () => {
  it('uses 5 MET for strength and the cardio MET for logged cardio time', () => {
    const base = { id: 'w', name: 'w', startedAt: 0, finishedAt: 3_600_000, note: '' };
    const done = { reps: null, weightKg: null, distanceKm: 5, rpe: null, note: '', isWarmup: false, done: true };
    const strengthOnly = { ...base, exercises: [] };
    const withRun = { ...base, exercises: [{ id: 'e', exerciseId: 'running', sets: [{ ...done, id: 's', durationSec: 1800 }] }] };
    const trackingOf = () => 'distance_time' as const;
    expect(estimateWorkoutKcal(strengthOnly, 80, trackingOf)).toBe(400);
    // 400 + (9.8 − 5) × 80 × 0.5 h = 592
    expect(estimateWorkoutKcal(withRun, 80, trackingOf)).toBe(592);
  });
});

describe('validateBackup', () => {
  it('accepts a well-formed backup and rejects other files', () => {
    const backup = { app: 'workout-pwa', dbVersion: 3, exportedAt: '2026-11-03T10:00:00Z', stores: { workouts: [] } };
    expect(validateBackup(backup).dbVersion).toBe(3);
    expect(() => validateBackup({ hello: 'world' })).toThrow('not a Workout Log backup');
    expect(() => validateBackup({ ...backup, dbVersion: 99 })).toThrow('newer version');
    expect(() => validateBackup({ ...backup, stores: { workouts: 'oops' } })).toThrow('damaged');
  });
});
