/**
 * All persistence lives in one IndexedDB database on this device.
 * Every write notifies subscribers so open screens re-read fresh data.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ActiveSession, Exercise, RestOverride, ScheduleEntry, Template, Workout } from '../domain/types';

const DB_NAME = 'workout-pwa';
const DB_VERSION = 1;
const ACTIVE_KEY = 'current';

interface WorkoutDb extends DBSchema {
  workouts: { key: string; value: Workout; indexes: { startedAt: number } };
  templates: { key: string; value: Template };
  schedule: { key: string; value: ScheduleEntry; indexes: { date: string } };
  customExercises: { key: string; value: Exercise };
  restOverrides: { key: string; value: RestOverride };
  active: { key: string; value: ActiveSession };
}

let dbPromise: Promise<IDBPDatabase<WorkoutDb>> | null = null;

function db(): Promise<IDBPDatabase<WorkoutDb>> {
  if (dbPromise === null) {
    dbPromise = openDB<WorkoutDb>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const workouts = database.createObjectStore('workouts', { keyPath: 'id' });
        workouts.createIndex('startedAt', 'startedAt');
        database.createObjectStore('templates', { keyPath: 'id' });
        const schedule = database.createObjectStore('schedule', { keyPath: 'id' });
        schedule.createIndex('date', 'date');
        database.createObjectStore('customExercises', { keyPath: 'id' });
        database.createObjectStore('restOverrides', { keyPath: 'exerciseId' });
        database.createObjectStore('active');
      },
    });
  }
  return dbPromise;
}

// ---------- change notifications ----------

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyChange(): void {
  listeners.forEach((listener) => listener());
}

async function write(action: (database: IDBPDatabase<WorkoutDb>) => Promise<unknown>): Promise<void> {
  await action(await db());
  notifyChange();
}

// ---------- workouts ----------

/** Finished workouts, newest first. */
export async function listWorkouts(): Promise<Workout[]> {
  const all = await (await db()).getAllFromIndex('workouts', 'startedAt');
  return all.reverse();
}

export async function getWorkout(id: string): Promise<Workout | undefined> {
  return (await db()).get('workouts', id);
}

export function saveWorkout(workout: Workout): Promise<void> {
  return write((database) => database.put('workouts', workout));
}

/** Deleting a workout also un-links any calendar entry it fulfilled. */
export function deleteWorkout(id: string): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['workouts', 'schedule'], 'readwrite');
    await tx.objectStore('workouts').delete(id);
    const entries = await tx.objectStore('schedule').getAll();
    for (const entry of entries.filter((item) => item.workoutId === id)) {
      await tx.objectStore('schedule').put({ ...entry, workoutId: null });
    }
    await tx.done;
  });
}

// ---------- active session ----------

export async function getActiveSession(): Promise<ActiveSession | undefined> {
  return (await db()).get('active', ACTIVE_KEY);
}

/**
 * Saved on every keystroke during a workout. Only the active-workout context reads it,
 * so this write deliberately skips the change notification to avoid re-running every query.
 */
export async function saveActiveSession(session: ActiveSession): Promise<void> {
  await (await db()).put('active', session, ACTIVE_KEY);
}

export async function clearActiveSession(): Promise<void> {
  await (await db()).delete('active', ACTIVE_KEY);
}

/** Store the finished workout, mark its calendar entry done and clear the session — atomically. */
export function completeActiveSession(finished: Workout, scheduleId: string | null): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['workouts', 'schedule', 'active'], 'readwrite');
    await tx.objectStore('workouts').put(finished);
    if (scheduleId !== null) {
      const entry = await tx.objectStore('schedule').get(scheduleId);
      // The calendar entry may have been removed while the workout was running; that is fine.
      if (entry !== undefined) {
        await tx.objectStore('schedule').put({ ...entry, workoutId: finished.id });
      }
    }
    await tx.objectStore('active').delete(ACTIVE_KEY);
    await tx.done;
  });
}

// ---------- templates ----------

export async function listTemplates(): Promise<Template[]> {
  const all = await (await db()).getAll('templates');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  return (await db()).get('templates', id);
}

export function saveTemplate(template: Template): Promise<void> {
  return write((database) => database.put('templates', template));
}

/** Deleting a template also removes its calendar entries, which would otherwise point nowhere. */
export function deleteTemplate(id: string): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['templates', 'schedule'], 'readwrite');
    await tx.objectStore('templates').delete(id);
    const entries = await tx.objectStore('schedule').getAll();
    for (const entry of entries.filter((item) => item.templateId === id)) {
      await tx.objectStore('schedule').delete(entry.id);
    }
    await tx.done;
  });
}

// ---------- schedule ----------

export async function listSchedule(): Promise<ScheduleEntry[]> {
  return (await db()).getAll('schedule');
}

export function saveScheduleEntry(entry: ScheduleEntry): Promise<void> {
  return write((database) => database.put('schedule', entry));
}

export function deleteScheduleEntry(id: string): Promise<void> {
  return write((database) => database.delete('schedule', id));
}

// ---------- exercises ----------

export async function listCustomExercises(): Promise<Exercise[]> {
  return (await db()).getAll('customExercises');
}

export function saveCustomExercise(exercise: Exercise): Promise<void> {
  return write((database) => database.put('customExercises', exercise));
}

export function deleteCustomExercise(id: string): Promise<void> {
  return write((database) => database.delete('customExercises', id));
}

export async function listRestOverrides(): Promise<RestOverride[]> {
  return (await db()).getAll('restOverrides');
}

export function saveRestOverride(override: RestOverride): Promise<void> {
  return write((database) => database.put('restOverrides', override));
}
