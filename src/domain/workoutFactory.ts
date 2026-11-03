import { assert, newId } from './assert';
import { previousSets } from './stats';
import type { SetEntry, Template, Workout, WorkoutExercise } from './types';

export function emptySet(): SetEntry {
  return { id: newId(), reps: null, weightKg: null, durationSec: null, distanceKm: null, rpe: null, note: '', isWarmup: false, done: false };
}

/** A fresh, not-yet-done set that copies the numbers of `source` (RPE and notes are per-set, so not copied). */
function setCopying(source: SetEntry | undefined): SetEntry {
  if (source === undefined) {
    return emptySet();
  }
  return {
    ...emptySet(),
    reps: source.reps,
    weightKg: source.weightKg,
    durationSec: source.durationSec,
    distanceKm: source.distanceKm,
    isWarmup: source.isWarmup,
  };
}

/**
 * Prefill for the next set of an exercise: the matching set from last session,
 * otherwise the last set already in this session, otherwise the last set from last session.
 */
export function nextSet(current: readonly SetEntry[], previous: readonly SetEntry[]): SetEntry {
  const matching = previous[current.length];
  if (matching !== undefined) {
    return setCopying(matching);
  }
  return setCopying(current[current.length - 1] ?? previous[previous.length - 1]);
}

export function newWorkoutExercise(exerciseId: string, setCount: number, previous: readonly SetEntry[]): WorkoutExercise {
  assert(setCount >= 1, 'An exercise needs at least one set');
  const sets: SetEntry[] = [];
  for (let i = 0; i < setCount; i += 1) {
    sets.push(nextSet(sets, previous));
  }
  return { id: newId(), exerciseId, sets };
}

export function defaultWorkoutName(startedAt: number): string {
  const hour = new Date(startedAt).getHours();
  if (hour < 12) return 'Morning Workout';
  if (hour < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}

export function startEmptyWorkout(now: number): Workout {
  return { id: newId(), name: defaultWorkoutName(now), startedAt: now, finishedAt: null, exercises: [], note: '' };
}

export function startWorkoutFromTemplate(template: Template, history: readonly Workout[], now: number): Workout {
  return {
    ...startEmptyWorkout(now),
    name: template.name,
    exercises: template.exercises.map((item) => newWorkoutExercise(item.exerciseId, item.setCount, previousSets(history, item.exerciseId, now))),
  };
}

export function countIncompleteSets(workout: Workout): number {
  return workout.exercises.reduce((total, entry) => total + entry.sets.filter((set) => !set.done).length, 0);
}

export function countDoneSets(workout: Workout): number {
  return workout.exercises.reduce((total, entry) => total + entry.sets.filter((set) => set.done).length, 0);
}

/** Close the workout: drop sets that were never completed and exercises left without sets. */
export function finishWorkout(workout: Workout, now: number): Workout {
  assert(workout.finishedAt === null, 'Workout is already finished');
  assert(countDoneSets(workout) > 0, 'Cannot finish a workout without any completed sets');
  const exercises = workout.exercises
    .map((entry) => ({ ...entry, sets: entry.sets.filter((set) => set.done) }))
    .filter((entry) => entry.sets.length > 0);
  return { ...workout, exercises, finishedAt: now };
}

export function templateFromWorkout(workout: Workout, name: string): Template {
  return {
    id: newId(),
    name,
    exercises: workout.exercises.map((entry) => ({ exerciseId: entry.exerciseId, setCount: entry.sets.length })),
  };
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  assert(from >= 0 && from < items.length, 'move: source index out of range');
  assert(to >= 0 && to < items.length, 'move: target index out of range');
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  assert(item !== undefined, 'move: item missing');
  copy.splice(to, 0, item);
  return copy;
}
