/**
 * Template sharing: a small JSON file a friend imports into their own app.
 * Custom exercises used by the templates travel inside the file, since the friend won't have them.
 */
import { assert } from './assert';
import { EQUIPMENT, MUSCLE_GROUPS, type Exercise, type Template, type TemplateExercise, type TrackingType } from './types';

const FILE_APP = 'workout-pwa';
const FILE_KIND = 'templates';
const FILE_VERSION = 1;
/** Matches the template editor's limit. */
export const MAX_SETS_PER_EXERCISE = 20;
const TRACKING_TYPES: readonly TrackingType[] = ['weight_reps', 'reps', 'time', 'distance_time'];

export interface SharedTemplate {
  name: string;
  exercises: TemplateExercise[];
}

export interface TemplateShareFile {
  app: typeof FILE_APP;
  kind: typeof FILE_KIND;
  version: number;
  exportedAt: string;
  templates: SharedTemplate[];
  customExercises: Exercise[];
}

export function buildTemplateShareFile(templates: readonly Template[], getExercise: (id: string) => Exercise, now: Date): TemplateShareFile {
  assert(templates.length > 0, 'Nothing to export');
  const exerciseIds = new Set(templates.flatMap((template) => template.exercises.map((item) => item.exerciseId)));
  return {
    app: FILE_APP,
    kind: FILE_KIND,
    version: FILE_VERSION,
    exportedAt: now.toISOString(),
    // Ids are not shared: the importing app gives every template a fresh id.
    templates: templates.map((template) => ({ name: template.name, exercises: template.exercises.map((item) => ({ ...item })) })),
    customExercises: [...exerciseIds].map(getExercise).filter((exercise) => exercise.isCustom),
  };
}

const WRONG_FILE = 'This file is not a Workout Log template.';

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCustomExercise(raw: unknown, index: number): Exercise {
  const where = `Custom exercise ${index + 1} in the file`;
  if (!isRecord(raw)) fail(`${where} is damaged.`);
  const { id, name, muscles, equipment, tracking, cues, defaultRestSec } = raw;
  if (typeof id !== 'string' || !id.startsWith('custom-')) fail(`${where} has an invalid id.`);
  if (typeof name !== 'string' || name.trim() === '') fail(`${where} has no name.`);
  if (!Array.isArray(muscles) || muscles.length === 0 || !muscles.every((muscle) => (MUSCLE_GROUPS as readonly unknown[]).includes(muscle))) fail(`${where} ("${name}") has unknown muscles.`);
  if (!(EQUIPMENT as readonly unknown[]).includes(equipment)) fail(`${where} ("${name}") has unknown equipment.`);
  if (!(TRACKING_TYPES as readonly unknown[]).includes(tracking)) fail(`${where} ("${name}") has an unknown tracking type.`);
  if (!Array.isArray(cues) || !cues.every((cue) => typeof cue === 'string')) fail(`${where} ("${name}") has invalid form cues.`);
  if (typeof defaultRestSec !== 'number' || !Number.isInteger(defaultRestSec) || defaultRestSec <= 0) fail(`${where} ("${name}") has an invalid rest time.`);
  return {
    id,
    name: name.trim(),
    muscles: muscles as Exercise['muscles'],
    equipment: equipment as Exercise['equipment'],
    tracking: tracking as TrackingType,
    cues: cues as string[],
    defaultRestSec,
    animationId: null,
    isCustom: true,
  };
}

function readTemplate(raw: unknown, index: number, knownExercise: (id: string) => boolean): SharedTemplate {
  const where = `Template ${index + 1} in the file`;
  if (!isRecord(raw)) fail(`${where} is damaged.`);
  const { name, exercises } = raw;
  if (typeof name !== 'string' || name.trim() === '') fail(`${where} has no name.`);
  if (!Array.isArray(exercises) || exercises.length === 0) fail(`"${name}" has no exercises.`);
  return {
    name: name.trim(),
    exercises: exercises.map((item, position) => {
      if (!isRecord(item) || typeof item.exerciseId !== 'string') fail(`"${name}", exercise ${position + 1} is damaged.`);
      const { exerciseId, setCount } = item;
      if (!knownExercise(exerciseId)) fail(`"${name}" uses an exercise this version of the app doesn't have (${exerciseId}). Update the app and try again.`);
      if (typeof setCount !== 'number' || !Number.isInteger(setCount) || setCount < 1 || setCount > MAX_SETS_PER_EXERCISE) fail(`"${name}", exercise ${position + 1} has an invalid number of sets.`);
      return { exerciseId, setCount };
    }),
  };
}

export interface ParsedTemplateFile {
  templates: SharedTemplate[];
  customExercises: Exercise[];
}

/**
 * Validate a parsed template file. Every exercise must be built in, already on this phone,
 * or included in the file. Throws an Error whose message can be shown to the user.
 */
export function parseTemplateShareFile(raw: unknown, existingExerciseIds: ReadonlySet<string>): ParsedTemplateFile {
  if (!isRecord(raw) || raw.app !== FILE_APP) fail(WRONG_FILE);
  if (raw.kind !== FILE_KIND) fail(raw.kind === undefined ? 'This is a full backup, not a template. Import backups from Settings.' : WRONG_FILE);
  if (typeof raw.version !== 'number' || raw.version > FILE_VERSION) fail('This template was made by a newer version of the app. Update the app and try again.');
  if (!Array.isArray(raw.templates) || raw.templates.length === 0) fail('This file contains no templates.');
  if (!Array.isArray(raw.customExercises)) fail('This file is damaged (custom exercises).');
  const customExercises = raw.customExercises.map(readCustomExercise);
  const included = new Set(customExercises.map((exercise) => exercise.id));
  const templates = raw.templates.map((template, index) => readTemplate(template, index, (id) => existingExerciseIds.has(id) || included.has(id)));
  return { templates, customExercises };
}

/** "Push Day" → "Push Day (2)" → "Push Day (3)"…: the first name not already taken. */
export function uniqueTemplateName(name: string, takenNames: readonly string[]): string {
  const taken = new Set(takenNames.map((taken) => taken.trim().toLocaleLowerCase()));
  if (!taken.has(name.trim().toLocaleLowerCase())) return name.trim();
  for (let n = 2; ; n += 1) {
    const candidate = `${name.trim()} (${n})`;
    if (!taken.has(candidate.toLocaleLowerCase())) return candidate;
  }
}
