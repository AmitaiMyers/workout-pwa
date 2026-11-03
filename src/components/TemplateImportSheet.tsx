import { useState } from 'react';
import { templateNameError } from '../domain/templates';
import { uniqueTemplateName, type ParsedTemplateFile } from '../domain/templateShare';
import type { Template } from '../domain/types';
import { importTemplates } from '../storage/db';
import type { ExerciseCatalog } from '../storage/hooks';
import { Modal } from './Modal';

interface Props {
  parsed: ParsedTemplateFile;
  existing: readonly Template[];
  catalog: ExerciseCatalog;
  onDone: (importedCount: number) => void;
  onClose: () => void;
}

/** Suggest a free name for each incoming template (also unique among the incoming ones). */
function suggestedNames(parsed: ParsedTemplateFile, existing: readonly Template[]): string[] {
  const taken = existing.map((template) => template.name);
  return parsed.templates.map((template) => {
    const name = uniqueTemplateName(template.name, taken);
    taken.push(name);
    return name;
  });
}

/** Preview of a shared template file: what will be added, with editable names. */
export function TemplateImportSheet({ parsed, existing, catalog, onDone, onClose }: Props) {
  const [names, setNames] = useState(() => suggestedNames(parsed, existing));
  const included = new Map(parsed.customExercises.map((exercise) => [exercise.id, exercise]));
  const exerciseName = (id: string) => included.get(id)?.name ?? catalog.get(id).name;
  const newCustom = parsed.customExercises.filter((exercise) => !catalog.all.some((local) => local.id === exercise.id));

  // Each name must be free among saved templates and the other incoming ones.
  const errors = names.map((name, index) => {
    const others: Template[] = [...existing, ...names.map((other, i) => ({ id: `incoming-${i}`, name: other, exercises: [] }))];
    return templateNameError(name, others, `incoming-${index}`);
  });
  const valid = errors.every((error) => error === null);

  const confirm = () => {
    const templates = parsed.templates.map((template, index) => ({ name: (names[index] ?? template.name).trim(), exercises: template.exercises }));
    void importTemplates(templates, parsed.customExercises).then(() => onDone(templates.length));
  };

  return (
    <Modal title={parsed.templates.length === 1 ? 'Import template' : `Import ${parsed.templates.length} templates`} onClose={onClose}>
      {parsed.templates.map((template, index) => (
        <section key={index} className="card">
          <label className="field">
            <span>Name</span>
            <input
              className="text-input"
              aria-label={`Name for template ${index + 1}`}
              value={names[index] ?? ''}
              onChange={(event) => setNames(names.map((name, i) => (i === index ? event.target.value : name)))}
            />
          </label>
          {errors[index] !== null && <p className="field-error">{errors[index]}</p>}
          {templateNameError(template.name, existing, null) !== null && <p className="muted small">You already have “{template.name}”, so this one gets a new name. Change it if you like.</p>}
          <p className="muted small">{template.exercises.map((item) => `${exerciseName(item.exerciseId)} ×${item.setCount}`).join(' · ')}</p>
        </section>
      ))}
      {newCustom.length > 0 && (
        <p className="notice">
          Also adds {newCustom.length === 1 ? 'a custom exercise' : `${newCustom.length} custom exercises`}: {newCustom.map((exercise) => exercise.name).join(', ')}.
        </p>
      )}
      <button type="button" className="button button-primary button-block" disabled={!valid} onClick={confirm}>
        {parsed.templates.length === 1 ? 'Add template' : `Add ${parsed.templates.length} templates`}
      </button>
    </Modal>
  );
}
