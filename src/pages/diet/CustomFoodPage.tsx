import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { NumberInput } from '../../components/NumberInput';
import { Loading, PageHeader } from '../../components/PageHeader';
import { assert, newId, required } from '../../domain/assert';
import { formatKcal } from '../../domain/format';
import type { Food, Macros, Serving } from '../../domain/nutrition/foodTypes';
import { per100FromServing, scaleMacros } from '../../domain/nutrition/math';
import { deleteFood, listStoredFoods, saveFood } from '../../storage/db';

type Basis = 'per100' | 'perServing';

interface Draft {
  name: string;
  brand: string;
  barcode: string;
  basis: Basis;
  servingLabel: string;
  servingGrams: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

function draftFromFood(food: Food): Draft {
  const serving = food.servings[0];
  // Show the label values per serving when the food has one; that's how packages are read.
  const values = serving === undefined ? food.per100 : scaleMacros(food.per100, serving.grams);
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    name: food.name,
    brand: food.brand ?? '',
    barcode: food.barcode ?? '',
    basis: serving === undefined ? 'per100' : 'perServing',
    servingLabel: serving?.label ?? '',
    servingGrams: serving?.grams ?? null,
    kcal: round(values.kcal),
    protein: round(values.protein),
    carbs: round(values.carbs),
    fat: round(values.fat),
  };
}

function toFood(draft: Draft, id: string): Food {
  assert(draft.kcal !== null && draft.protein !== null && draft.carbs !== null && draft.fat !== null, 'All nutrition values are required');
  const entered: Macros = { kcal: draft.kcal, protein: draft.protein, carbs: draft.carbs, fat: draft.fat };
  const hasServing = draft.servingLabel.trim() !== '' && draft.servingGrams !== null && draft.servingGrams > 0;
  const servings: Serving[] = hasServing ? [{ label: draft.servingLabel.trim(), grams: required(draft.servingGrams, 'Serving grams required') }] : [];
  const per100 = draft.basis === 'per100' ? entered : per100FromServing(entered, required(draft.servingGrams, 'Serving grams required'));
  return {
    id,
    source: 'custom',
    name: draft.name.trim(),
    nameHe: null,
    brand: draft.brand.trim() === '' ? null : draft.brand.trim(),
    barcode: draft.barcode === '' ? null : draft.barcode,
    per100,
    servings,
  };
}

/** /diet/foods/new (optionally prefilled from a scanned barcode) and /diet/foods/:id/edit. */
export function CustomFoodPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | undefined>(
    id === undefined
      ? {
          name: params.get('name') ?? '',
          brand: params.get('brand') ?? '',
          barcode: params.get('barcode') ?? '',
          basis: 'perServing',
          servingLabel: '1 serving',
          servingGrams: null,
          kcal: null,
          protein: null,
          carbs: null,
          fat: null,
        }
      : undefined,
  );

  useEffect(() => {
    if (id === undefined) return;
    void listStoredFoods().then((foods) => {
      const food = foods.find((item) => item.id === id && item.source === 'custom');
      assert(food !== undefined, `Custom food "${id}" not found`);
      setDraft(draftFromFood(food));
    });
  }, [id]);

  if (draft === undefined) {
    return <Loading />;
  }

  const perServing = draft.basis === 'perServing';
  const valid =
    draft.name.trim() !== '' &&
    draft.kcal !== null &&
    draft.protein !== null &&
    draft.carbs !== null &&
    draft.fat !== null &&
    (!perServing || (draft.servingLabel.trim() !== '' && draft.servingGrams !== null && draft.servingGrams > 0));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });

  const save = async () => {
    const food = toFood(draft, id ?? `custom:${newId()}`);
    await saveFood(food);
    const returnDate = params.get('returnDate');
    const returnMeal = params.get('returnMeal');
    if (returnDate !== null && returnMeal !== null) {
      // Back to "Add food" with the new food ready to log.
      navigate(`/diet/add?${new URLSearchParams({ date: returnDate, meal: returnMeal, pick: food.id }).toString()}`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const remove = async () => {
    if (id !== undefined && window.confirm(`Delete "${draft.name}"? Days you already logged keep their numbers.`)) {
      await deleteFood(id);
      navigate(-1);
    }
  };

  return (
    <div className="page">
      <PageHeader title={id === undefined ? 'New food' : 'Edit food'} back />
      {params.get('barcode') !== null && id === undefined && (
        <p className="notice">This product isn't in the online database yet. Copy the nutrition label once and it's found instantly next time you scan it, even offline.</p>
      )}
      <label className="field">
        <span>Name</span>
        <input className="text-input" value={draft.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Protein yogurt" autoFocus={draft.name === ''} />
      </label>
      <label className="field">
        <span>Brand (optional)</span>
        <input className="text-input" value={draft.brand} onChange={(event) => set('brand', event.target.value)} />
      </label>
      <label className="field">
        <span>Barcode (optional)</span>
        <input className="text-input" inputMode="numeric" value={draft.barcode} onChange={(event) => set('barcode', event.target.value.replace(/\D/g, ''))} />
      </label>

      <div className="segmented" role="tablist" aria-label="Label values are">
        <button type="button" role="tab" aria-selected={perServing} className={perServing ? 'segmented-active' : ''} onClick={() => set('basis', 'perServing')}>
          Per serving
        </button>
        <button type="button" role="tab" aria-selected={!perServing} className={!perServing ? 'segmented-active' : ''} onClick={() => set('basis', 'per100')}>
          Per 100 g
        </button>
      </div>
      <div className="macro-inputs">
        <label className="field">
          <span>Serving name{perServing ? '' : ' (optional)'}</span>
          <input className="text-input" value={draft.servingLabel} onChange={(event) => set('servingLabel', event.target.value)} placeholder="e.g. 1 cup" />
        </label>
        <label className="field">
          <span>Serving grams</span>
          <NumberInput value={draft.servingGrams} onChange={(value) => set('servingGrams', value)} allowDecimals label="Serving grams" />
        </label>
      </div>

      <p className="muted small">{perServing ? 'Values for one serving, as printed on the label:' : 'Values per 100 g:'}</p>
      <div className="macro-inputs macro-inputs-4">
        <label className="field">
          <span>kcal</span>
          <NumberInput value={draft.kcal} onChange={(value) => set('kcal', value)} allowDecimals label="Calories" />
        </label>
        <label className="field">
          <span>Protein g</span>
          <NumberInput value={draft.protein} onChange={(value) => set('protein', value)} allowDecimals label="Protein grams" />
        </label>
        <label className="field">
          <span>Carbs g</span>
          <NumberInput value={draft.carbs} onChange={(value) => set('carbs', value)} allowDecimals label="Carbs grams" />
        </label>
        <label className="field">
          <span>Fat g</span>
          <NumberInput value={draft.fat} onChange={(value) => set('fat', value)} allowDecimals label="Fat grams" />
        </label>
      </div>
      {valid && perServing && draft.servingGrams !== null && draft.kcal !== null && (
        <p className="muted small">= {formatKcal(per100FromServing({ kcal: draft.kcal, protein: 0, carbs: 0, fat: 0 }, draft.servingGrams).kcal)} per 100 g</p>
      )}
      <button type="button" className="button button-primary button-block" disabled={!valid} onClick={() => void save()}>
        Save food
      </button>
      {id !== undefined && (
        <button type="button" className="button button-danger button-block" onClick={() => void remove()}>
          Delete food
        </button>
      )}
    </div>
  );
}
