/** Energy and macronutrients. Per 100 g on foods; absolute amounts on log entries. */
export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A named portion, e.g. "1 large egg" = 50 g. Liquids use grams ≈ millilitres. */
export interface Serving {
  label: string;
  grams: number;
}

/**
 * builtin: USDA generic foods shipped with the app.
 * off: an Open Food Facts product, cached on the device once used.
 * custom: a food the user entered (optionally with a barcode).
 * recipe: a user recipe, exposed as a food (one serving = one portion).
 */
export type FoodSource = 'builtin' | 'off' | 'custom' | 'recipe';

export interface Food {
  id: string;
  source: FoodSource;
  name: string;
  nameHe: string | null;
  brand: string | null;
  barcode: string | null;
  per100: Macros;
  servings: Serving[];
}

/** Shape of one generated built-in record (see foods.data.ts). */
export interface BuiltInFoodData {
  id: string;
  name: string;
  nameHe: string;
  category: string;
  fdcId: number;
  usda: string;
  per100: Macros;
  servings: Serving[];
}

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

/** How much of a food: always grams, plus the serving it was entered as (if any). */
export interface Amount {
  grams: number;
  servingLabel: string | null;
  servingCount: number | null;
}

/**
 * One thing eaten. Name and nutrition are snapshotted at log time, so the day's
 * totals never change if the food is later edited or deleted.
 */
export interface FoodLogEntry {
  id: string;
  /** Local day, YYYY-MM-DD. */
  date: string;
  meal: MealSlot;
  createdAt: number;
  name: string;
  brand: string | null;
  /** null for a quick-add entry. */
  foodId: string | null;
  /** null for a quick-add entry. */
  amount: Amount | null;
  /** Snapshot used to re-scale the entry when its amount is edited; null for quick add. */
  per100: Macros | null;
  macros: Macros;
}

/** A food plus amount, used inside saved meals and recipes (self-contained snapshot). */
export interface FoodPortion {
  foodId: string;
  name: string;
  brand: string | null;
  per100: Macros;
  amount: Amount;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: FoodPortion[];
}

export interface Recipe {
  id: string;
  name: string;
  portions: number;
  ingredients: FoodPortion[];
}

export interface WeightEntry {
  /** Local day, YYYY-MM-DD; one entry per day. */
  date: string;
  weightKg: number;
}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface TargetOverrides {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface Profile {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: Goal;
  /** Kilograms per week to lose or gain; ignored when maintaining. */
  paceKgPerWeek: number;
  overrides: TargetOverrides;
}

export interface FavoriteFood {
  foodId: string;
}
