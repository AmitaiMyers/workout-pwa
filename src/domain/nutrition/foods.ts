import { assert } from '../assert';
import { BUILT_IN_FOOD_DATA } from './foods.data';
import type { Food, FoodLogEntry, Recipe } from './foodTypes';
import { per100OfMix } from './math';

export const BUILT_IN_FOODS: readonly Food[] = BUILT_IN_FOOD_DATA.map((data) => ({
  id: `usda:${data.id}`,
  source: 'builtin',
  name: data.name,
  nameHe: data.nameHe,
  brand: null,
  barcode: null,
  per100: data.per100,
  servings: data.servings,
}));

/** A recipe behaves like a food: per 100 g of the cooked mix, one serving = one portion. */
export function recipeAsFood(recipe: Recipe): Food {
  assert(recipe.portions > 0, 'A recipe needs at least one portion');
  const totalGrams = recipe.ingredients.reduce((total, item) => total + item.amount.grams, 0);
  return {
    id: `recipe:${recipe.id}`,
    source: 'recipe',
    name: recipe.name,
    nameHe: null,
    brand: null,
    barcode: null,
    per100: per100OfMix(recipe.ingredients),
    servings: [{ label: '1 portion', grams: totalGrams / recipe.portions }],
  };
}

function normalize(text: string): string {
  return text.toLocaleLowerCase().normalize('NFKD').replace(/[̀-֑ͯ-ׇ]/g, '');
}

function searchableText(food: Food): string {
  return normalize([food.name, food.nameHe ?? '', food.brand ?? ''].join(' '));
}

/**
 * Local search over every word of the query (English or Hebrew, any order).
 * Names that start with the query rank first, then shorter names.
 */
export function searchFoods(foods: readonly Food[], query: string, limit: number): Food[] {
  const words = normalize(query).split(/\s+/).filter((word) => word !== '');
  if (words.length === 0) {
    return [];
  }
  const first = words[0] ?? '';
  const scored = foods
    .map((food) => ({ food, text: searchableText(food) }))
    .filter(({ text }) => words.every((word) => text.includes(word)))
    .map(({ food }) => {
      const startsWith = normalize(food.name).startsWith(first) || normalize(food.nameHe ?? '').startsWith(first);
      return { food, rank: (startsWith ? 0 : 1000) + food.name.length };
    });
  scored.sort((a, b) => a.rank - b.rank);
  return scored.slice(0, limit).map(({ food }) => food);
}

/** Most recently logged distinct foods, newest first. */
export function recentFoodIds(entries: readonly FoodLogEntry[], limit: number): string[] {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const ids: string[] = [];
  for (const entry of sorted) {
    if (entry.foodId !== null && !ids.includes(entry.foodId)) {
      ids.push(entry.foodId);
    }
    if (ids.length === limit) {
      break;
    }
  }
  return ids;
}
