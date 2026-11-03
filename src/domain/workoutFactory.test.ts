import { describe, expect, it } from 'vitest';
import type { SetEntry, Workout } from './types';
import { emptySet, finishWorkout, moveItem, newWorkoutExercise, nextSet, startEmptyWorkout } from './workoutFactory';

function set(fields: Partial<SetEntry>): SetEntry {
  return { ...emptySet(), ...fields };
}

describe('nextSet', () => {
  const previous = [set({ weightKg: 60, reps: 10, isWarmup: true, rpe: 6, note: 'easy', done: true }), set({ weightKg: 80, reps: 8, done: true })];

  it('copies numbers from the matching set of last session, not RPE/notes/done', () => {
    const created = nextSet([], previous);
    expect(created).toMatchObject({ weightKg: 60, reps: 10, isWarmup: true, rpe: null, note: '', done: false });
  });

  it('falls back to the last set of the current session past the previous count', () => {
    const current = [set({ weightKg: 60 }), set({ weightKg: 80 }), set({ weightKg: 85, reps: 6 })];
    expect(nextSet(current, previous)).toMatchObject({ weightKg: 85, reps: 6 });
  });

  it('is empty when nothing is known', () => {
    expect(nextSet([], [])).toMatchObject({ weightKg: null, reps: null });
  });
});

describe('newWorkoutExercise', () => {
  it('prefills each set from the previous session', () => {
    const entry = newWorkoutExercise('bench', 3, [set({ weightKg: 70, reps: 8 }), set({ weightKg: 75, reps: 6 })]);
    expect(entry.sets.map((s) => s.weightKg)).toEqual([70, 75, 75]);
  });
  it('rejects zero sets', () => {
    expect(() => newWorkoutExercise('bench', 0, [])).toThrow();
  });
});

describe('finishWorkout', () => {
  const base: Workout = {
    ...startEmptyWorkout(1000),
    exercises: [
      { id: 'a', exerciseId: 'bench', sets: [set({ weightKg: 80, reps: 5, done: true }), set({ weightKg: 80, reps: 5 })] },
      { id: 'b', exerciseId: 'curl', sets: [set({ weightKg: 10, reps: 12 })] },
    ],
  };

  it('drops unfinished sets and exercises left empty', () => {
    const finished = finishWorkout(base, 5000);
    expect(finished.finishedAt).toBe(5000);
    expect(finished.exercises).toHaveLength(1);
    expect(finished.exercises[0]!.sets).toHaveLength(1);
  });

  it('refuses to finish a workout with no completed sets', () => {
    expect(() => finishWorkout(startEmptyWorkout(0), 1)).toThrow();
  });
});

describe('moveItem', () => {
  it('moves an element without mutating the input', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(items).toEqual(['a', 'b', 'c']);
  });
});
