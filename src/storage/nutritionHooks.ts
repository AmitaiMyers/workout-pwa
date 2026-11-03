import { useMemo } from 'react';
import type { Profile, WeightEntry } from '../domain/nutrition/foodTypes';
import { dailyTargets, type DailyTargets } from '../domain/nutrition/targets';
import { getProfile, listWeights } from './db';
import { useDbQuery } from './hooks';

export function latestWeight(weights: readonly WeightEntry[]): WeightEntry | null {
  return weights.reduce<WeightEntry | null>((latest, entry) => (latest === null || entry.date > latest.date ? entry : latest), null);
}

export interface NutritionSetup {
  profile: Profile | null;
  weights: WeightEntry[];
  currentWeightKg: number | null;
  /** null until both a profile and a body weight exist. */
  targets: DailyTargets | null;
}

/** useDbQuery uses undefined for "still loading", so a missing profile is reported as null. */
async function loadProfileOrNull(): Promise<Profile | null> {
  return (await getProfile()) ?? null;
}

export function useNutritionSetup(): NutritionSetup | undefined {
  const profile = useDbQuery(loadProfileOrNull, []);
  const weights = useDbQuery(listWeights, []);
  return useMemo(() => {
    if (profile === undefined || weights === undefined) {
      return undefined;
    }
    const latest = latestWeight(weights);
    return {
      profile,
      weights: [...weights].sort((a, b) => a.date.localeCompare(b.date)),
      currentWeightKg: latest === null ? null : latest.weightKg,
      targets: profile === null || latest === null ? null : dailyTargets(profile, latest.weightKg, new Date()),
    };
  }, [profile, weights]);
}
