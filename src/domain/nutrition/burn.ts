import type { TrackingType, Workout } from '../types';

/**
 * Rough energy cost of a workout, for information only (never added to the calorie budget).
 * MET × body weight × hours: resistance training ≈ 5 MET for the whole session, and logged
 * cardio sets replace that with their own MET for their duration.
 */
const STRENGTH_MET = 5;
const CARDIO_MET: Readonly<Record<string, number>> = {
  running: 9.8,
  rowing: 7,
  'stationary-bike': 6.8,
};

export function estimateWorkoutKcal(workout: Workout, weightKg: number, trackingOf: (exerciseId: string) => TrackingType): number | null {
  if (workout.finishedAt === null) {
    return null;
  }
  const hours = (workout.finishedAt - workout.startedAt) / 3_600_000;
  let kcal = STRENGTH_MET * weightKg * hours;
  for (const entry of workout.exercises) {
    const met = CARDIO_MET[entry.exerciseId];
    if (met === undefined || trackingOf(entry.exerciseId) !== 'distance_time') {
      continue;
    }
    for (const set of entry.sets) {
      if (set.done && set.durationSec !== null) {
        kcal += (met - STRENGTH_MET) * weightKg * (set.durationSec / 3600);
      }
    }
  }
  return Math.max(0, Math.round(kcal));
}
