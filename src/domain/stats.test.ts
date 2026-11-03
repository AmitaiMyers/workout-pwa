import { describe, expect, it } from 'vitest';
import { estimateOneRepMax, metricsFor, metricValue, missingFields, newRecordsIn, personalRecords, previousSets, summarizeWorkout } from './stats';
import type { SetEntry, TrackingType, Workout } from './types';
import { emptySet } from './workoutFactory';

const DAY = 24 * 60 * 60 * 1000;

function set(fields: Partial<SetEntry>): SetEntry {
  return { ...emptySet(), done: true, ...fields };
}

function workout(id: string, day: number, exerciseId: string, sets: SetEntry[]): Workout {
  return { id, name: id, startedAt: day * DAY, finishedAt: day * DAY + 3600_000, exercises: [{ id: `${id}-e`, exerciseId, sets }], note: '' };
}

const trackingOf = (): TrackingType => 'weight_reps';

describe('estimateOneRepMax', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });
  it('uses the Epley formula for multiple reps', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
  });
});

describe('missingFields', () => {
  it('requires weight and reps for weight_reps', () => {
    expect(missingFields(set({}), 'weight_reps')).toEqual(['weight', 'reps']);
  });
  it('accepts zero weight (e.g. empty bar machine) but not zero reps', () => {
    expect(missingFields(set({ weightKg: 0, reps: 5 }), 'weight_reps')).toEqual([]);
    expect(missingFields(set({ weightKg: 20, reps: 0 }), 'weight_reps')).toEqual(['reps']);
  });
  it('requires distance and time for cardio', () => {
    expect(missingFields(set({ distanceKm: 5 }), 'distance_time')).toEqual(['time']);
  });
});

describe('metricValue', () => {
  it('ignores warm-up and unfinished sets', () => {
    const [e1rm] = metricsFor('weight_reps');
    const sets = [set({ weightKg: 200, reps: 1, isWarmup: true }), set({ weightKg: 150, reps: 1, done: false }), set({ weightKg: 100, reps: 1 })];
    expect(metricValue(e1rm!, sets)).toBe(100);
  });
  it('returns null without working sets', () => {
    const [e1rm] = metricsFor('weight_reps');
    expect(metricValue(e1rm!, [set({ weightKg: 60, reps: 5, isWarmup: true })])).toBeNull();
  });
  it('treats lower pace as better and aggregates with min', () => {
    const pace = metricsFor('distance_time').find((metric) => metric.key === 'pace')!;
    expect(metricValue(pace, [set({ distanceKm: 5, durationSec: 1500 }), set({ distanceKm: 2, durationSec: 540 })])).toBe(270);
  });
});

describe('previousSets', () => {
  it('returns the done sets of the latest earlier session', () => {
    const history = [
      workout('a', 1, 'squat', [set({ weightKg: 80, reps: 5 })]),
      workout('b', 3, 'squat', [set({ weightKg: 90, reps: 5 }), set({ weightKg: 95, reps: 3 })]),
      workout('c', 5, 'squat', [set({ weightKg: 100, reps: 5 })]),
    ];
    expect(previousSets(history, 'squat', 4 * DAY).map((s) => s.weightKg)).toEqual([90, 95]);
  });
  it('is empty for a never-logged exercise', () => {
    expect(previousSets([], 'squat', Date.now())).toEqual([]);
  });
});

describe('records', () => {
  const history = [workout('a', 1, 'bench', [set({ weightKg: 80, reps: 5 })]), workout('b', 2, 'bench', [set({ weightKg: 85, reps: 2 })])];

  it('finds the best value per record metric', () => {
    const records = personalRecords(history, 'bench', 'weight_reps');
    expect(records.find((r) => r.metric.key === 'topWeight')?.value).toBe(85);
    expect(records.find((r) => r.metric.key === 'e1rm')?.workoutId).toBe('a');
  });

  it('reports a new record only when an earlier best is beaten', () => {
    const latest = workout('c', 3, 'bench', [set({ weightKg: 90, reps: 1 })]);
    const found = newRecordsIn(latest, [...history, latest], trackingOf);
    expect(found.map((r) => r.metric.key)).toEqual(['topWeight']);
    expect(found[0]!.previousBest).toBe(85);
  });

  it('does not count a first-ever session as a record', () => {
    const first = workout('x', 1, 'row', [set({ weightKg: 50, reps: 10 })]);
    expect(newRecordsIn(first, [first], trackingOf)).toEqual([]);
  });
});

describe('summarizeWorkout', () => {
  it('sums volume of working sets only', () => {
    const w = workout('a', 1, 'bench', [set({ weightKg: 60, reps: 10, isWarmup: true }), set({ weightKg: 80, reps: 5 }), set({ weightKg: 80, reps: 5 })]);
    expect(summarizeWorkout(w, trackingOf)).toEqual({ durationSec: 3600, workingSetCount: 2, volumeKg: 800 });
  });
});
