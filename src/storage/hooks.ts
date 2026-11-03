import { useEffect, useMemo, useState } from 'react';
import { required } from '../domain/assert';
import { BUILT_IN_EXERCISES } from '../domain/exercises';
import type { Exercise } from '../domain/types';
import { listCustomExercises, listRestOverrides, subscribeToChanges } from './db';

/**
 * Run an async database query and re-run it whenever the database changes.
 * Returns undefined until the first result arrives.
 */
export function useDbQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      void query().then((value) => {
        if (!cancelled) {
          setResult(() => value);
        }
      });
    };
    run();
    const unsubscribe = subscribeToChanges(run);
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // The caller owns the dependency list, exactly like useEffect.
  }, deps);
  return result;
}

export interface ExerciseCatalog {
  all: Exercise[];
  get: (id: string) => Exercise;
  restSecFor: (exerciseId: string) => number;
}

/** Built-in plus custom exercises, with per-exercise rest overrides applied. */
export function useExerciseCatalog(): ExerciseCatalog | undefined {
  const custom = useDbQuery(listCustomExercises, []);
  const overrides = useDbQuery(listRestOverrides, []);
  return useMemo(() => {
    if (custom === undefined || overrides === undefined) {
      return undefined;
    }
    const all = [...BUILT_IN_EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name));
    const byId = new Map(all.map((exercise) => [exercise.id, exercise]));
    const restById = new Map(overrides.map((override) => [override.exerciseId, override.restSec]));
    const get = (id: string) => required(byId.get(id), `Unknown exercise "${id}"`);
    return {
      all,
      get,
      restSecFor: (exerciseId: string) => restById.get(exerciseId) ?? get(exerciseId).defaultRestSec,
    };
  }, [custom, overrides]);
}
