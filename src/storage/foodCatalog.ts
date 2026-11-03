/** Kept apart from nutritionHooks so screens that only need targets don't load the food database. */
import { useMemo } from 'react';
import { BUILT_IN_FOODS, recipeAsFood } from '../domain/nutrition/foods';
import type { Food } from '../domain/nutrition/foodTypes';
import { listFavorites, listRecipes, listStoredFoods } from './db';
import { useDbQuery } from './hooks';

export interface FoodCatalog {
  all: Food[];
  /** undefined when the food no longer exists (e.g. a deleted custom food). */
  find: (id: string) => Food | undefined;
  isFavorite: (id: string) => boolean;
  favorites: Food[];
}

/** Built-in foods + the user's stored foods (custom and cached online) + recipes as foods. */
export function useFoodCatalog(): FoodCatalog | undefined {
  const stored = useDbQuery(listStoredFoods, []);
  const recipes = useDbQuery(listRecipes, []);
  const favorites = useDbQuery(listFavorites, []);
  return useMemo(() => {
    if (stored === undefined || recipes === undefined || favorites === undefined) {
      return undefined;
    }
    const all = [...BUILT_IN_FOODS, ...stored, ...recipes.filter((recipe) => recipe.ingredients.length > 0).map(recipeAsFood)];
    const byId = new Map(all.map((food) => [food.id, food]));
    const favoriteIds = new Set(favorites.map((favorite) => favorite.foodId));
    return {
      all,
      find: (id: string) => byId.get(id),
      isFavorite: (id: string) => favoriteIds.has(id),
      favorites: [...favoriteIds].flatMap((id) => {
        const food = byId.get(id);
        return food === undefined ? [] : [food];
      }),
    };
  }, [stored, recipes, favorites]);
}
