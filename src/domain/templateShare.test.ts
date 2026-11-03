import { describe, expect, it } from 'vitest';
import { slugify } from '../state/files';
import { BUILT_IN_EXERCISES } from './exercises';
import { buildTemplateShareFile, parseTemplateShareFile, uniqueTemplateName } from './templateShare';
import type { Exercise, Template } from './types';

const custom: Exercise = {
  id: 'custom-1234',
  name: 'Cable Fly',
  muscles: ['Chest'],
  equipment: 'Cable',
  tracking: 'weight_reps',
  cues: ['Squeeze at the middle'],
  defaultRestSec: 90,
  animationId: null,
  isCustom: true,
};
const byId = new Map([...BUILT_IN_EXERCISES, custom].map((exercise) => [exercise.id, exercise]));
const getExercise = (id: string) => {
  const exercise = byId.get(id);
  if (exercise === undefined) throw new Error(`unknown ${id}`);
  return exercise;
};
const builtInIds = new Set(BUILT_IN_EXERCISES.map((exercise) => exercise.id));
const pushDay: Template = { id: 't1', name: 'Push Day', exercises: [{ exerciseId: 'bench-press', setCount: 4 }, { exerciseId: 'custom-1234', setCount: 3 }] };

/** Round-trip through JSON, like a real file. */
const viaFile = (data: unknown): unknown => JSON.parse(JSON.stringify(data));

describe('template share file', () => {
  it('round-trips a template and carries the custom exercises it uses', () => {
    const file = buildTemplateShareFile([pushDay], getExercise, new Date('2026-11-03T10:00:00Z'));
    expect(file.customExercises.map((exercise) => exercise.id)).toEqual(['custom-1234']);
    expect(JSON.stringify(file)).not.toContain('"t1"');
    // The friend has only the built-in exercises.
    const parsed = parseTemplateShareFile(viaFile(file), builtInIds);
    expect(parsed.templates).toEqual([{ name: 'Push Day', exercises: pushDay.exercises }]);
    expect(parsed.customExercises[0]).toEqual(custom);
  });

  it('does not include built-in exercises', () => {
    const legs: Template = { id: 't2', name: 'Legs', exercises: [{ exerciseId: 'back-squat', setCount: 5 }] };
    expect(buildTemplateShareFile([legs], getExercise, new Date()).customExercises).toEqual([]);
  });

  it('rejects files that are not templates', () => {
    expect(() => parseTemplateShareFile({ hello: 'world' }, builtInIds)).toThrow('not a Workout Log template');
    expect(() => parseTemplateShareFile({ app: 'workout-pwa', dbVersion: 3, stores: {} }, builtInIds)).toThrow('full backup');
  });

  it('rejects unknown exercises, bad set counts and newer versions', () => {
    const file = viaFile(buildTemplateShareFile([pushDay], getExercise, new Date())) as Record<string, unknown>;
    const template = (exercises: unknown[]) => ({ ...file, customExercises: [], templates: [{ name: 'X', exercises }] });
    expect(() => parseTemplateShareFile(template([{ exerciseId: 'zercher-squat', setCount: 3 }]), builtInIds)).toThrow("doesn't have");
    expect(() => parseTemplateShareFile(template([{ exerciseId: 'bench-press', setCount: 0 }]), builtInIds)).toThrow('number of sets');
    expect(() => parseTemplateShareFile(template([]), builtInIds)).toThrow('no exercises');
    expect(() => parseTemplateShareFile({ ...file, version: 99 }, builtInIds)).toThrow('newer version');
  });

  it('rejects a damaged custom exercise', () => {
    const file = viaFile(buildTemplateShareFile([pushDay], getExercise, new Date())) as Record<string, unknown>;
    expect(() => parseTemplateShareFile({ ...file, customExercises: [{ ...custom, tracking: 'vibes' }] }, builtInIds)).toThrow('tracking type');
  });
});

describe('uniqueTemplateName', () => {
  it('keeps a free name and numbers a taken one', () => {
    expect(uniqueTemplateName('Pull Day', ['Push Day'])).toBe('Pull Day');
    expect(uniqueTemplateName('push day', ['Push Day', 'push day (2)'])).toBe('push day (3)');
  });
});

describe('slugify', () => {
  it('makes readable file names, including Hebrew', () => {
    expect(slugify('Push Day!')).toBe('push-day');
    expect(slugify('אימון רגליים')).toBe('אימון-רגליים');
    expect(slugify('***')).toBe('template');
  });
});
