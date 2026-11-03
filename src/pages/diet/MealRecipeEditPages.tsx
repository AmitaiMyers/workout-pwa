import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MacroBars } from '../../components/diet/MacroBars';
import { PortionListEditor } from '../../components/diet/PortionListEditor';
import { NumberInput } from '../../components/NumberInput';
import { Loading, PageHeader } from '../../components/PageHeader';
import { assert, newId } from '../../domain/assert';
import { todayKey } from '../../domain/dates';
import { formatGrams, formatKcal } from '../../domain/format';
import { recentFoodIds } from '../../domain/nutrition/foods';
import type { FoodPortion, Recipe, SavedMeal } from '../../domain/nutrition/foodTypes';
import { portionMacros, scaleMacros, sumMacros } from '../../domain/nutrition/math';
import { deleteRecipe, deleteSavedMeal, listFoodLogRange, listRecipes, listSavedMeals, saveRecipe, saveSavedMeal } from '../../storage/db';
import { useDbQuery } from '../../storage/hooks';
import { useFoodCatalog } from '../../storage/foodCatalog';
import { shiftDate } from './DietPage';

const RECENT_DAYS = 60;
const RECENT_LIMIT = 15;

function useRecentIds(): string[] | undefined {
  const entries = useDbQuery(() => listFoodLogRange(shiftDate(todayKey(), -RECENT_DAYS), todayKey()), []);
  return entries === undefined ? undefined : recentFoodIds(entries, RECENT_LIMIT);
}

/** /diet/meals/new and /diet/meals/:id — a named group of foods logged together with one tap. */
export function SavedMealEditPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const catalog = useFoodCatalog();
  const recentIds = useRecentIds();
  const [draft, setDraft] = useState<SavedMeal | undefined>(isNew ? { id: newId(), name: '', items: [] } : undefined);

  useEffect(() => {
    if (isNew || id === undefined) return;
    void listSavedMeals().then((meals) => {
      const meal = meals.find((item) => item.id === id);
      assert(meal !== undefined, `Saved meal "${id}" not found`);
      setDraft(meal);
    });
  }, [id, isNew]);

  if (draft === undefined || catalog === undefined || recentIds === undefined) {
    return <Loading />;
  }
  const totals = sumMacros(draft.items.map(portionMacros));
  const valid = draft.name.trim() !== '' && draft.items.length > 0;

  return (
    <div className="page">
      <PageHeader
        title={isNew ? 'New saved meal' : 'Edit saved meal'}
        back
        actions={
          <button type="button" className="button button-primary" disabled={!valid} onClick={() => void saveSavedMeal({ ...draft, name: draft.name.trim() }).then(() => navigate(-1))}>
            Save
          </button>
        }
      />
      <input className="title-input" aria-label="Meal name" placeholder="e.g. My usual breakfast" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <PortionListEditor items={draft.items} onChange={(items) => setDraft({ ...draft, items })} catalog={catalog} recentIds={recentIds} addLabel="+ Add food" excludeFoodId={null} />
      <section className="card">
        <div className="section-header">
          <h2>Total</h2>
          <strong>{formatKcal(totals.kcal)}</strong>
        </div>
        <MacroBars eaten={totals} targets={null} />
      </section>
      {!isNew && (
        <button
          type="button"
          className="button button-danger button-block"
          onClick={() => {
            if (window.confirm(`Delete saved meal "${draft.name}"?`)) void deleteSavedMeal(draft.id).then(() => navigate(-1));
          }}
        >
          Delete saved meal
        </button>
      )}
    </div>
  );
}

/** /diet/recipes/new and /diet/recipes/:id — ingredients cooked together and split into portions. */
export function RecipeEditPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const catalog = useFoodCatalog();
  const recentIds = useRecentIds();
  const [draft, setDraft] = useState<Recipe | undefined>(isNew ? { id: newId(), name: '', portions: 4, ingredients: [] } : undefined);

  useEffect(() => {
    if (isNew || id === undefined) return;
    void listRecipes().then((recipes) => {
      const recipe = recipes.find((item) => item.id === id);
      assert(recipe !== undefined, `Recipe "${id}" not found`);
      setDraft(recipe);
    });
  }, [id, isNew]);

  if (draft === undefined || catalog === undefined || recentIds === undefined) {
    return <Loading />;
  }
  const totals = sumMacros(draft.ingredients.map(portionMacros));
  const totalGrams = draft.ingredients.reduce((total, item: FoodPortion) => total + item.amount.grams, 0);
  const portions = draft.portions;
  const perPortion = portions > 0 ? scaleMacros(totals, 100 / portions) : null;
  const valid = draft.name.trim() !== '' && draft.ingredients.length > 0 && Number.isInteger(portions) && portions >= 1;

  return (
    <div className="page">
      <PageHeader
        title={isNew ? 'New recipe' : 'Edit recipe'}
        back
        actions={
          <button type="button" className="button button-primary" disabled={!valid} onClick={() => void saveRecipe({ ...draft, name: draft.name.trim() }).then(() => navigate(-1))}>
            Save
          </button>
        }
      />
      <input className="title-input" aria-label="Recipe name" placeholder="e.g. Chicken & rice meal prep" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <label className="field">
        <span>Makes how many portions?</span>
        <NumberInput value={portions === 0 ? null : portions} onChange={(value) => setDraft({ ...draft, portions: value ?? 0 })} allowDecimals={false} label="Portions" />
      </label>
      <h2 className="group-title">Ingredients</h2>
      <PortionListEditor
        items={draft.ingredients}
        onChange={(ingredients) => setDraft({ ...draft, ingredients })}
        catalog={catalog}
        recentIds={recentIds}
        addLabel="+ Add ingredient"
        excludeFoodId={`recipe:${draft.id}`}
      />
      {perPortion !== null && draft.ingredients.length > 0 && (
        <section className="card">
          <div className="section-header">
            <h2>Per portion</h2>
            <strong>{formatKcal(perPortion.kcal)}</strong>
          </div>
          <MacroBars eaten={perPortion} targets={null} />
          <p className="muted small">
            Whole recipe {formatKcal(totals.kcal)} · {formatGrams(totalGrams)} raw ingredients · one portion ≈ {formatGrams(totalGrams / portions)}
          </p>
        </section>
      )}
      <p className="muted small">After saving, log it from Add food: search its name or find it under Recipes.</p>
      {!isNew && (
        <button
          type="button"
          className="button button-danger button-block"
          onClick={() => {
            if (window.confirm(`Delete recipe "${draft.name}"? Days you already logged keep their numbers.`)) void deleteRecipe(draft.id).then(() => navigate(-1));
          }}
        >
          Delete recipe
        </button>
      )}
    </div>
  );
}
