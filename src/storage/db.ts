/**
 * All persistence lives in one IndexedDB database on this device.
 * Every write notifies subscribers so open screens re-read fresh data.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { assert, newId } from '../domain/assert';
import { templateNameError } from '../domain/templates';
import type { FavoriteFood, Food, FoodLogEntry, Profile, Recipe, SavedMeal, WeightEntry } from '../domain/nutrition/foodTypes';
import type { ActiveSession, Exercise, RestOverride, ScheduleEntry, Template, VideoOverride, Workout } from '../domain/types';

const DB_NAME = 'workout-pwa';
/** Bump when adding stores; `upgrade` migrates step by step so existing data is kept. */
const DB_VERSION = 3;
const PROFILE_KEY = 'me';
const ACTIVE_KEY = 'current';

interface WorkoutDb extends DBSchema {
  workouts: { key: string; value: Workout; indexes: { startedAt: number } };
  templates: { key: string; value: Template };
  schedule: { key: string; value: ScheduleEntry; indexes: { date: string } };
  customExercises: { key: string; value: Exercise };
  restOverrides: { key: string; value: RestOverride };
  videoOverrides: { key: string; value: VideoOverride };
  /** Custom foods and Open Food Facts products the user has used (built-in foods live in code). */
  foods: { key: string; value: Food; indexes: { barcode: string } };
  foodLog: { key: string; value: FoodLogEntry; indexes: { date: string } };
  savedMeals: { key: string; value: SavedMeal };
  recipes: { key: string; value: Recipe };
  favorites: { key: string; value: FavoriteFood };
  weights: { key: string; value: WeightEntry };
  profile: { key: string; value: Profile };
  active: { key: string; value: ActiveSession };
}

let dbPromise: Promise<IDBPDatabase<WorkoutDb>> | null = null;

function db(): Promise<IDBPDatabase<WorkoutDb>> {
  if (dbPromise === null) {
    dbPromise = openDB<WorkoutDb>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const workouts = database.createObjectStore('workouts', { keyPath: 'id' });
          workouts.createIndex('startedAt', 'startedAt');
          database.createObjectStore('templates', { keyPath: 'id' });
          const schedule = database.createObjectStore('schedule', { keyPath: 'id' });
          schedule.createIndex('date', 'date');
          database.createObjectStore('customExercises', { keyPath: 'id' });
          database.createObjectStore('restOverrides', { keyPath: 'exerciseId' });
          database.createObjectStore('active');
        }
        if (oldVersion < 2) {
          database.createObjectStore('videoOverrides', { keyPath: 'exerciseId' });
        }
        if (oldVersion < 3) {
          database.createObjectStore('foods', { keyPath: 'id' }).createIndex('barcode', 'barcode');
          database.createObjectStore('foodLog', { keyPath: 'id' }).createIndex('date', 'date');
          database.createObjectStore('savedMeals', { keyPath: 'id' });
          database.createObjectStore('recipes', { keyPath: 'id' });
          database.createObjectStore('favorites', { keyPath: 'foodId' });
          database.createObjectStore('weights', { keyPath: 'date' });
          database.createObjectStore('profile');
        }
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

/** Rejects a duplicate name; the check and the write share one transaction so they cannot race. */
export function saveTemplate(template: Template): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction('templates', 'readwrite');
    const nameError = templateNameError(template.name, await tx.store.getAll(), template.id);
    assert(nameError === null, nameError ?? '');
    await tx.store.put(template);
    await tx.done;
  });
}

/**
 * Add shared templates and the custom exercises they need, all or nothing.
 * Custom exercises already on this phone are kept as they are; every template gets a fresh id.
 */
export function importTemplates(templates: readonly Omit<Template, 'id'>[], customExercises: readonly Exercise[]): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['templates', 'customExercises'], 'readwrite');
    const exerciseStore = tx.objectStore('customExercises');
    for (const exercise of customExercises) {
      if ((await exerciseStore.get(exercise.id)) === undefined) {
        await exerciseStore.put(exercise);
      }
    }
    const templateStore = tx.objectStore('templates');
    const existing = await templateStore.getAll();
    for (const template of templates) {
      const created: Template = { ...template, id: newId() };
      const nameError = templateNameError(created.name, existing, null);
      assert(nameError === null, nameError ?? '');
      await templateStore.put(created);
      existing.push(created);
    }
    await tx.done;
  });
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

export async function listVideoOverrides(): Promise<VideoOverride[]> {
  return (await db()).getAll('videoOverrides');
}

export function saveVideoOverride(override: VideoOverride): Promise<void> {
  return write((database) => database.put('videoOverrides', override));
}

/** Go back to the exercise's built-in default video. */
export function deleteVideoOverride(exerciseId: string): Promise<void> {
  return write((database) => database.delete('videoOverrides', exerciseId));
}

// ---------- foods ----------

export async function listStoredFoods(): Promise<Food[]> {
  return (await db()).getAll('foods');
}

/** Custom food or cached Open Food Facts product with this barcode, if the device has one. */
export async function findStoredFoodByBarcode(barcode: string): Promise<Food | undefined> {
  const matches = await (await db()).getAllFromIndex('foods', 'barcode', barcode);
  // A user's own entry wins over a cached online product for the same barcode.
  return matches.find((food) => food.source === 'custom') ?? matches[0];
}

export function saveFood(food: Food): Promise<void> {
  return write((database) => database.put('foods', food));
}

export function deleteFood(id: string): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['foods', 'favorites'], 'readwrite');
    await tx.objectStore('foods').delete(id);
    await tx.objectStore('favorites').delete(id);
    await tx.done;
  });
}

// ---------- food log ----------

export async function listFoodLog(date: string): Promise<FoodLogEntry[]> {
  const entries = await (await db()).getAllFromIndex('foodLog', 'date', date);
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

/** Entries for an inclusive range of local days (YYYY-MM-DD compare correctly as strings). */
export async function listFoodLogRange(fromDate: string, toDate: string): Promise<FoodLogEntry[]> {
  return (await db()).getAllFromIndex('foodLog', 'date', IDBKeyRange.bound(fromDate, toDate));
}

export async function listAllFoodLog(): Promise<FoodLogEntry[]> {
  return (await db()).getAll('foodLog');
}

export function saveFoodLogEntries(entries: readonly FoodLogEntry[]): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction('foodLog', 'readwrite');
    for (const entry of entries) {
      await tx.store.put(entry);
    }
    await tx.done;
  });
}

export function deleteFoodLogEntry(id: string): Promise<void> {
  return write((database) => database.delete('foodLog', id));
}

/** Log an Open Food Facts product: cache the product (for offline reuse) and log it together. */
export function logFoodWithCache(entry: FoodLogEntry, foodToCache: Food | null): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['foodLog', 'foods'], 'readwrite');
    if (foodToCache !== null) {
      await tx.objectStore('foods').put(foodToCache);
    }
    await tx.objectStore('foodLog').put(entry);
    await tx.done;
  });
}

// ---------- saved meals, recipes, favourites ----------

export async function listSavedMeals(): Promise<SavedMeal[]> {
  const meals = await (await db()).getAll('savedMeals');
  return meals.sort((a, b) => a.name.localeCompare(b.name));
}

export function saveSavedMeal(meal: SavedMeal): Promise<void> {
  return write((database) => database.put('savedMeals', meal));
}

export function deleteSavedMeal(id: string): Promise<void> {
  return write((database) => database.delete('savedMeals', id));
}

export async function listRecipes(): Promise<Recipe[]> {
  const recipes = await (await db()).getAll('recipes');
  return recipes.sort((a, b) => a.name.localeCompare(b.name));
}

export function saveRecipe(recipe: Recipe): Promise<void> {
  return write((database) => database.put('recipes', recipe));
}

export function deleteRecipe(id: string): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['recipes', 'favorites'], 'readwrite');
    await tx.objectStore('recipes').delete(id);
    await tx.objectStore('favorites').delete(`recipe:${id}`);
    await tx.done;
  });
}

export async function listFavorites(): Promise<FavoriteFood[]> {
  return (await db()).getAll('favorites');
}

/** Star or un-star a food; a favourite custom/online food is also stored so it stays available offline. */
export function setFavorite(food: Food, favorite: boolean): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction(['favorites', 'foods'], 'readwrite');
    if (favorite) {
      await tx.objectStore('favorites').put({ foodId: food.id });
      if (food.source === 'off') {
        await tx.objectStore('foods').put(food);
      }
    } else {
      await tx.objectStore('favorites').delete(food.id);
    }
    await tx.done;
  });
}

// ---------- body weight & profile ----------

export async function listWeights(): Promise<WeightEntry[]> {
  return (await db()).getAll('weights');
}

export function saveWeight(entry: WeightEntry): Promise<void> {
  return write((database) => database.put('weights', entry));
}

export function deleteWeight(date: string): Promise<void> {
  return write((database) => database.delete('weights', date));
}

export async function getProfile(): Promise<Profile | undefined> {
  return (await db()).get('profile', PROFILE_KEY);
}

export function saveProfile(profile: Profile): Promise<void> {
  return write((database) => database.put('profile', profile, PROFILE_KEY));
}

// ---------- backup ----------

const BACKUP_APP_ID = 'workout-pwa';
const STORE_NAMES = [
  'workouts', 'templates', 'schedule', 'customExercises', 'restOverrides', 'active', 'videoOverrides',
  'foods', 'foodLog', 'savedMeals', 'recipes', 'favorites', 'weights', 'profile',
] as const;
type StoreName = (typeof STORE_NAMES)[number];

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  dbVersion: number;
  exportedAt: string;
  /** Each store as [key, value] pairs, so stores with and without key paths restore the same way. */
  stores: Record<StoreName, [IDBValidKey, unknown][]>;
}

export async function exportBackup(): Promise<BackupFile> {
  const database = await db();
  const tx = database.transaction([...STORE_NAMES], 'readonly');
  const stores = {} as Record<StoreName, [IDBValidKey, unknown][]>;
  for (const name of STORE_NAMES) {
    const store = tx.objectStore(name);
    const [keys, values] = await Promise.all([store.getAllKeys(), store.getAll()]);
    stores[name] = keys.map((key, index) => [key, values[index]]);
  }
  await tx.done;
  return { app: BACKUP_APP_ID, dbVersion: DB_VERSION, exportedAt: new Date().toISOString(), stores };
}

/** Check a parsed file really is a backup this version of the app can restore. */
export function validateBackup(raw: unknown): BackupFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('This file is not a Workout Log backup.');
  }
  const file = raw as Partial<BackupFile>;
  if (file.app !== BACKUP_APP_ID || typeof file.dbVersion !== 'number' || typeof file.stores !== 'object' || file.stores === null) {
    throw new Error('This file is not a Workout Log backup.');
  }
  if (file.dbVersion > DB_VERSION) {
    throw new Error('This backup was made by a newer version of the app. Update the app and try again.');
  }
  for (const name of STORE_NAMES) {
    const rows = (file.stores as Record<string, unknown>)[name];
    // Backups from older versions simply lack the newer stores.
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`Backup section "${name}" is damaged.`);
    }
  }
  return file as BackupFile;
}

/** Replace ALL data on this device with the backup's contents, in one transaction. */
export function restoreBackup(backup: BackupFile): Promise<void> {
  return write(async (database) => {
    const tx = database.transaction([...STORE_NAMES], 'readwrite');
    for (const name of STORE_NAMES) {
      const store = tx.objectStore(name);
      await store.clear();
      const rows = backup.stores[name] ?? [];
      for (const [key, value] of rows) {
        // Stores with a key path take the key from the value itself; the others need it passed in.
        if (store.keyPath === null) {
          await (store as unknown as { put: (value: unknown, key: IDBValidKey) => Promise<IDBValidKey> }).put(value, key);
        } else {
          await (store as unknown as { put: (value: unknown) => Promise<IDBValidKey> }).put(value);
        }
      }
    }
    await tx.done;
  });
}
