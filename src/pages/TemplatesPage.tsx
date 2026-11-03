import { useState } from 'react';
import { Link } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { TemplateImportSheet } from '../components/TemplateImportSheet';
import { todayKey } from '../domain/dates';
import { buildTemplateShareFile, parseTemplateShareFile, type ParsedTemplateFile } from '../domain/templateShare';
import type { Template } from '../domain/types';
import { listTemplates } from '../storage/db';
import { useDbQuery, useExerciseCatalog, type ExerciseCatalog } from '../storage/hooks';
import { deliverFile, importErrorMessage, jsonFile, readJsonFile, slugify } from '../state/files';
import { useWorkoutStarter } from '../state/useWorkoutStarter';

type Message = { kind: 'info' | 'error'; text: string } | null;

function shareTemplates(templates: readonly Template[], catalog: ExerciseCatalog): Promise<void> {
  const file = buildTemplateShareFile(templates, catalog.get, new Date());
  const single = templates.length === 1 ? templates[0] : undefined;
  const fileName = single === undefined ? `workout-templates-${todayKey()}.json` : `template-${slugify(single.name)}.json`;
  return deliverFile(jsonFile(file, fileName), single === undefined ? 'Workout templates' : `Workout template: ${single.name}`);
}

export function TemplatesPage() {
  const templates = useDbQuery(listTemplates, []);
  const catalog = useExerciseCatalog();
  const starter = useWorkoutStarter();
  const [importing, setImporting] = useState<ParsedTemplateFile | null>(null);
  const [message, setMessage] = useState<Message>(null);
  if (templates === undefined || catalog === undefined) {
    return <Loading />;
  }

  const readFile = (file: File) => {
    setMessage(null);
    // A user-picked file may be anything: parsing and validation failures become a visible message.
    void readJsonFile(file)
      .then((raw) => parseTemplateShareFile(raw, new Set(catalog.all.map((exercise) => exercise.id))))
      .then(setImporting, (reason: unknown) => setMessage({ kind: 'error', text: importErrorMessage(reason, 'This file is not a Workout Log template.') }));
  };

  return (
    <div className="page">
      <PageHeader
        title="Templates"
        actions={
          <Link to="/templates/new" className="button button-secondary">
            + New
          </Link>
        }
      />
      <div className="button-row wrap">
        <label className="button button-ghost">
          ⤓ Import
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file !== undefined) readFile(file);
            }}
          />
        </label>
        {templates.length > 1 && (
          <button type="button" className="button button-ghost" onClick={() => void shareTemplates(templates, catalog)}>
            ⤒ Export all
          </button>
        )}
      </div>
      {message !== null && <p className={message.kind === 'error' ? 'field-error' : 'notice'}>{message.text}</p>}
      {templates.length === 0 && <p className="empty">No templates yet. Create one, import one a friend sent you, or save a finished workout as a template.</p>}
      <ul className="plain-list">
        {templates.map((template) => (
          <li key={template.id} className="card">
            <div className="section-header">
              <strong>{template.name}</strong>
              <span className="button-row">
                <button type="button" className="icon-button" aria-label={`Share ${template.name}`} onClick={() => void shareTemplates([template], catalog)}>
                  ⤒
                </button>
                <Link to={`/templates/${template.id}`} className="button button-ghost">
                  Edit
                </Link>
                <button type="button" className="button button-primary" onClick={() => void starter.startFromTemplate(template, null)}>
                  Start
                </button>
              </span>
            </div>
            <p className="muted small">
              {template.exercises.map((item) => `${catalog.get(item.exerciseId).name} ×${item.setCount}`).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
      {templates.length > 0 && <p className="muted small">⤒ shares a template as a small file (WhatsApp, email, AirDrop). Your friend opens Templates → Import and picks it.</p>}
      {importing !== null && (
        <TemplateImportSheet
          parsed={importing}
          existing={templates}
          catalog={catalog}
          onDone={(count) => {
            setImporting(null);
            setMessage({ kind: 'info', text: count === 1 ? 'Template added.' : `${count} templates added.` });
          }}
          onClose={() => setImporting(null)}
        />
      )}
    </div>
  );
}
