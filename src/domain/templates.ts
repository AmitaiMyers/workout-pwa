import type { Template } from './types';

/** Names are compared ignoring case and surrounding whitespace: "Push Day" equals " push day ". */
function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/**
 * Why `name` cannot be used for the template with id `ownId`, or null when it is fine.
 * `ownId` is excluded so a template may keep its current name when edited.
 */
export function templateNameError(name: string, templates: readonly Template[], ownId: string | null): string | null {
  const normalized = normalizeName(name);
  if (normalized === '') {
    return 'Give the template a name.';
  }
  const duplicate = templates.some((template) => template.id !== ownId && normalizeName(template.name) === normalized);
  return duplicate ? `A template named "${name.trim()}" already exists.` : null;
}
