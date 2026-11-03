import { describe, expect, it } from 'vitest';
import { templateNameError } from './templates';
import type { Template } from './types';

const existing: Template[] = [
  { id: 'push', name: 'Push Day', exercises: [] },
  { id: 'legs', name: 'Leg Day', exercises: [] },
];

describe('templateNameError', () => {
  it('accepts a new unique name', () => {
    expect(templateNameError('Pull Day', existing, null)).toBeNull();
  });

  it('rejects an empty or blank name', () => {
    expect(templateNameError('   ', existing, null)).toBe('Give the template a name.');
  });

  it('rejects a duplicate ignoring case and surrounding spaces', () => {
    expect(templateNameError('  push day ', existing, null)).toBe('A template named "push day" already exists.');
  });

  it('lets a template keep its own name when edited', () => {
    expect(templateNameError('Push Day', existing, 'push')).toBeNull();
  });

  it("rejects renaming a template to another template's name", () => {
    expect(templateNameError('Leg Day', existing, 'push')).not.toBeNull();
  });
});
