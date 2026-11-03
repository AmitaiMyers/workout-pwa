import { assert } from './assert';
import { startOfWeek } from './dates';
import { formatDistance, formatDuration, formatNumber, formatPace, formatWeight } from './format';
import type { SetEntry, TrackingType, Workout } from './types';

/** Estimated one-rep max (Epley formula). */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  assert(reps >= 1, 'e1RM needs at least one rep');
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** The fields a set must have filled in before it can be marked done. */
export function missingFields(set: SetEntry, tracking: TrackingType): string[] {
  const missing: string[] = [];
  const isPositive = (value: number | null) => value !== null && value > 0;
  if (tracking === 'weight_reps') {
    if (set.weightKg === null || set.weightKg < 0) missing.push('weight');
    if (!isPositive(set.reps)) missing.push('reps');
  }
  if (tracking === 'reps' && !isPositive(set.reps)) missing.push('reps');
  if (tracking === 'time' && !isPositive(set.durationSec)) missing.push('time');
  if (tracking === 'distance_time') {
    if (!isPositive(set.distanceKm)) missing.push('distance');
    if (!isPositive(set.durationSec)) missing.push('time');
  }
  return missing;
}

/** Sets that count toward stats and records: completed and not warm-ups. */
export function workingSets(sets: readonly SetEntry[]): SetEntry[] {
  return sets.filter((set) => set.done && !set.isWarmup);
}

function requireNumber(value: number | null, field: string): number {
  assert(value !== null, `Completed set is missing ${field}`);
  return value;
}

export type MetricKey = 'e1rm' | 'topWeight' | 'volume' | 'maxReps' | 'totalReps' | 'maxDuration' | 'totalDuration' | 'distance' | 'pace';

export interface Metric {
  key: MetricKey;
  label: string;
  /** Per-set value; sessions aggregate these with `aggregate`. */
  ofSet: (set: SetEntry) => number;
  aggregate: 'max' | 'min' | 'sum';
  higherIsBetter: boolean;
  /** Whether a new best counts as a personal record. */
  isRecord: boolean;
  format: (value: number) => string;
}

const METRICS: Record<TrackingType, Metric[]> = {
  weight_reps: [
    { key: 'e1rm', label: 'Est. 1RM', ofSet: (s) => estimateOneRepMax(requireNumber(s.weightKg, 'weight'), requireNumber(s.reps, 'reps')), aggregate: 'max', higherIsBetter: true, isRecord: true, format: formatWeight },
    { key: 'topWeight', label: 'Heaviest weight', ofSet: (s) => requireNumber(s.weightKg, 'weight'), aggregate: 'max', higherIsBetter: true, isRecord: true, format: formatWeight },
    { key: 'volume', label: 'Volume', ofSet: (s) => requireNumber(s.weightKg, 'weight') * requireNumber(s.reps, 'reps'), aggregate: 'sum', higherIsBetter: true, isRecord: false, format: formatWeight },
  ],
  reps: [
    { key: 'maxReps', label: 'Most reps', ofSet: (s) => requireNumber(s.reps, 'reps'), aggregate: 'max', higherIsBetter: true, isRecord: true, format: (v) => `${formatNumber(v)} reps` },
    { key: 'totalReps', label: 'Total reps', ofSet: (s) => requireNumber(s.reps, 'reps'), aggregate: 'sum', higherIsBetter: true, isRecord: false, format: (v) => `${formatNumber(v)} reps` },
  ],
  time: [
    { key: 'maxDuration', label: 'Longest', ofSet: (s) => requireNumber(s.durationSec, 'time'), aggregate: 'max', higherIsBetter: true, isRecord: true, format: formatDuration },
    { key: 'totalDuration', label: 'Total time', ofSet: (s) => requireNumber(s.durationSec, 'time'), aggregate: 'sum', higherIsBetter: true, isRecord: false, format: formatDuration },
  ],
  distance_time: [
    { key: 'distance', label: 'Longest distance', ofSet: (s) => requireNumber(s.distanceKm, 'distance'), aggregate: 'max', higherIsBetter: true, isRecord: true, format: formatDistance },
    { key: 'pace', label: 'Best pace', ofSet: (s) => requireNumber(s.durationSec, 'time') / requireNumber(s.distanceKm, 'distance'), aggregate: 'min', higherIsBetter: false, isRecord: true, format: formatPace },
  ],
};

export function metricsFor(tracking: TrackingType): Metric[] {
  return METRICS[tracking];
}

export function recordMetricsFor(tracking: TrackingType): Metric[] {
  return METRICS[tracking].filter((metric) => metric.isRecord);
}

/** Aggregate a metric over the working sets; null when there are none. */
export function metricValue(metric: Metric, sets: readonly SetEntry[]): number | null {
  const values = workingSets(sets).map(metric.ofSet);
  if (values.length === 0) {
    return null;
  }
  if (metric.aggregate === 'sum') {
    return values.reduce((total, value) => total + value, 0);
  }
  return metric.aggregate === 'max' ? Math.max(...values) : Math.min(...values);
}

function isBetter(metric: Metric, candidate: number, best: number): boolean {
  return metric.higherIsBetter ? candidate > best : candidate < best;
}

/** All sets of one exercise within a workout (an exercise may appear more than once). */
export function setsForExercise(workout: Workout, exerciseId: string): SetEntry[] {
  return workout.exercises.filter((entry) => entry.exerciseId === exerciseId).flatMap((entry) => entry.sets);
}

export interface ExerciseSession {
  workout: Workout;
  sets: SetEntry[];
}

/** Finished workouts containing the exercise, oldest first. */
export function exerciseSessions(workouts: readonly Workout[], exerciseId: string): ExerciseSession[] {
  return workouts
    .filter((workout) => workout.finishedAt !== null)
    .map((workout) => ({ workout, sets: setsForExercise(workout, exerciseId) }))
    .filter((session) => session.sets.length > 0)
    .sort((a, b) => a.workout.startedAt - b.workout.startedAt);
}

/** Completed sets from the most recent finished workout before `beforeMs` that included the exercise. */
export function previousSets(workouts: readonly Workout[], exerciseId: string, beforeMs: number): SetEntry[] {
  const earlier = exerciseSessions(workouts, exerciseId).filter((session) => session.workout.startedAt < beforeMs);
  const latest = earlier[earlier.length - 1];
  return latest === undefined ? [] : latest.sets.filter((set) => set.done);
}

export interface PersonalRecord {
  metric: Metric;
  value: number;
  workoutId: string;
  achievedAt: number;
}

export function personalRecords(workouts: readonly Workout[], exerciseId: string, tracking: TrackingType): PersonalRecord[] {
  const sessions = exerciseSessions(workouts, exerciseId);
  const records: PersonalRecord[] = [];
  for (const metric of recordMetricsFor(tracking)) {
    let best: PersonalRecord | null = null;
    for (const session of sessions) {
      const value = metricValue(metric, session.sets);
      if (value !== null && (best === null || isBetter(metric, value, best.value))) {
        best = { metric, value, workoutId: session.workout.id, achievedAt: session.workout.startedAt };
      }
    }
    if (best !== null) {
      records.push(best);
    }
  }
  return records;
}

export interface NewRecord {
  exerciseId: string;
  metric: Metric;
  value: number;
  previousBest: number;
}

/**
 * Records this workout set compared with every earlier finished workout.
 * A first-ever session of an exercise is not a record: there is nothing to beat yet.
 */
export function newRecordsIn(
  workout: Workout,
  allWorkouts: readonly Workout[],
  trackingOf: (exerciseId: string) => TrackingType,
): NewRecord[] {
  const earlier = allWorkouts.filter((other) => other.id !== workout.id && other.finishedAt !== null && other.startedAt < workout.startedAt);
  const exerciseIds = [...new Set(workout.exercises.map((entry) => entry.exerciseId))];
  const found: NewRecord[] = [];
  for (const exerciseId of exerciseIds) {
    const sets = setsForExercise(workout, exerciseId);
    for (const metric of recordMetricsFor(trackingOf(exerciseId))) {
      const value = metricValue(metric, sets);
      const previous = personalRecords(earlier, exerciseId, trackingOf(exerciseId)).find((record) => record.metric.key === metric.key);
      if (value !== null && previous !== undefined && isBetter(metric, value, previous.value)) {
        found.push({ exerciseId, metric, value, previousBest: previous.value });
      }
    }
  }
  return found;
}

export interface WorkoutSummary {
  durationSec: number;
  workingSetCount: number;
  volumeKg: number;
}

export function summarizeWorkout(workout: Workout, trackingOf: (exerciseId: string) => TrackingType): WorkoutSummary {
  assert(workout.finishedAt !== null, 'Only finished workouts can be summarized');
  let workingSetCount = 0;
  let volumeKg = 0;
  for (const entry of workout.exercises) {
    const sets = workingSets(entry.sets);
    workingSetCount += sets.length;
    if (trackingOf(entry.exerciseId) === 'weight_reps') {
      volumeKg += sets.reduce((total, set) => total + requireNumber(set.weightKg, 'weight') * requireNumber(set.reps, 'reps'), 0);
    }
  }
  return { durationSec: (workout.finishedAt - workout.startedAt) / 1000, workingSetCount, volumeKg };
}

export interface PeriodSummary {
  workoutCount: number;
  workingSetCount: number;
  volumeKg: number;
}

/** Totals for finished workouts started in the current week (see WEEK_STARTS_ON). */
export function summarizeWeek(workouts: readonly Workout[], now: Date, trackingOf: (exerciseId: string) => TrackingType): PeriodSummary {
  const weekStart = startOfWeek(now).getTime();
  const thisWeek = workouts.filter((workout) => workout.finishedAt !== null && workout.startedAt >= weekStart && workout.startedAt <= now.getTime());
  return thisWeek
    .map((workout) => summarizeWorkout(workout, trackingOf))
    .reduce<PeriodSummary>(
      (total, summary) => ({
        workoutCount: total.workoutCount + 1,
        workingSetCount: total.workingSetCount + summary.workingSetCount,
        volumeKg: total.volumeKg + summary.volumeKg,
      }),
      { workoutCount: 0, workingSetCount: 0, volumeKg: 0 },
    );
}
