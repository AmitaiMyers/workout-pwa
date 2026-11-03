import { useEffect, useMemo, useState } from 'react';
import { required } from '../domain/assert';
import { BUILT_IN_EXERCISES } from '../domain/exercises';
import type { Exercise, VideoRef } from '../domain/types';
import { BUILT_IN_VIDEOS } from '../domain/videos';
import { listCustomExercises, listRestOverrides, listVideoOverrides, subscribeToChanges } from './db';

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
  /** The user's chosen video, else the built-in default, else null. */
  videoFor: (exerciseId: string) => VideoRef | null;
  /** Whether the user replaced or removed the default video. */
  hasVideoOverride: (exerciseId: string) => boolean;
}

/** Built-in plus custom exercises, with the user's rest and video overrides applied. */
export function useExerciseCatalog(): ExerciseCatalog | undefined {
  const custom = useDbQuery(listCustomExercises, []);
  const overrides = useDbQuery(listRestOverrides, []);
  const videoOverrides = useDbQuery(listVideoOverrides, []);
  return useMemo(() => {
    if (custom === undefined || overrides === undefined || videoOverrides === undefined) {
      return undefined;
    }
    const all = [...BUILT_IN_EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name));
    const byId = new Map(all.map((exercise) => [exercise.id, exercise]));
    const restById = new Map(overrides.map((override) => [override.exerciseId, override.restSec]));
    const videoById = new Map(videoOverrides.map((override) => [override.exerciseId, override.video]));
    const get = (id: string) => required(byId.get(id), `Unknown exercise "${id}"`);
    return {
      all,
      get,
      restSecFor: (exerciseId: string) => restById.get(exerciseId) ?? get(exerciseId).defaultRestSec,
      videoFor: (exerciseId: string) => {
        // An override holding null means the user removed the video, so it must win over the default.
        if (videoById.has(exerciseId)) {
          return videoById.get(exerciseId) ?? null;
        }
        return BUILT_IN_VIDEOS[exerciseId] ?? null;
      },
      hasVideoOverride: (exerciseId: string) => videoById.has(exerciseId),
    };
  }, [custom, overrides, videoOverrides]);
}
