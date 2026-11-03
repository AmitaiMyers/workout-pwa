import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ExerciseAnimation } from '../animation/ExerciseAnimation';
import { ExerciseBrowser } from '../components/ExercisePicker';
import { Modal } from '../components/Modal';
import { Loading, PageHeader } from '../components/PageHeader';
import { assert, newId } from '../domain/assert';
import type { Template, TemplateExercise } from '../domain/types';
import { moveItem } from '../domain/workoutFactory';
import { templateNameError } from '../domain/templates';
import { deleteTemplate, getTemplate, listTemplates, saveTemplate } from '../storage/db';
import { useDbQuery, useExerciseCatalog } from '../storage/hooks';

const DEFAULT_SET_COUNT = 3;
const MAX_SET_COUNT = 20;

/** Create a template at /templates/new or edit one at /templates/:id. */
export function TemplateEditPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const catalog = useExerciseCatalog();
  const templates = useDbQuery(listTemplates, []);
  const [draft, setDraft] = useState<Template | undefined>(isNew ? { id: newId(), name: '', exercises: [] } : undefined);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (isNew || id === undefined) return;
    void getTemplate(id).then((stored) => {
      assert(stored !== undefined, `Template "${id}" not found`);
      setDraft(stored);
    });
  }, [id, isNew]);

  if (draft === undefined || catalog === undefined || templates === undefined) {
    return <Loading />;
  }

  const setItems = (exercises: TemplateExercise[]) => setDraft({ ...draft, exercises });
  const updateItem = (index: number, setCount: number) =>
    setItems(draft.exercises.map((item, i) => (i === index ? { ...item, setCount } : item)));
  const nameError = templateNameError(draft.name, templates, draft.id);
  const valid = nameError === null && draft.exercises.length > 0;

  const save = async () => {
    await saveTemplate({ ...draft, name: draft.name.trim() });
    navigate('/templates', { replace: true });
  };
  const remove = async () => {
    if (window.confirm(`Delete template "${draft.name}"? It is also removed from the calendar.`)) {
      await deleteTemplate(draft.id);
      navigate('/templates', { replace: true });
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={isNew ? 'New template' : 'Edit template'}
        back
        actions={
          <button type="button" className="button button-primary" disabled={!valid} onClick={() => void save()}>
            Save
          </button>
        }
      />
      <input className="title-input" aria-label="Template name" placeholder="Template name, e.g. Push Day" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      {draft.name.trim() !== '' && nameError !== null && <p className="field-error">{nameError}</p>}
      <ul className="plain-list">
        {draft.exercises.map((item, index) => {
          const exercise = catalog.get(item.exerciseId);
          return (
            <li key={`${item.exerciseId}-${index}`} className="card template-item">
              <ExerciseAnimation animationId={exercise.animationId} animate={false} className="thumb" label={exercise.name} framing="fit" />
              <div className="template-item-body">
                <strong>{exercise.name}</strong>
                <div className="stepper">
                  <button type="button" className="icon-button" aria-label="Fewer sets" disabled={item.setCount <= 1} onClick={() => updateItem(index, item.setCount - 1)}>
                    −
                  </button>
                  <span>{item.setCount} sets</span>
                  <button type="button" className="icon-button" aria-label="More sets" disabled={item.setCount >= MAX_SET_COUNT} onClick={() => updateItem(index, item.setCount + 1)}>
                    +
                  </button>
                </div>
              </div>
              <div className="template-item-actions">
                <button type="button" className="icon-button" aria-label="Move up" disabled={index === 0} onClick={() => setItems(moveItem(draft.exercises, index, index - 1))}>
                  ↑
                </button>
                <button type="button" className="icon-button" aria-label="Move down" disabled={index === draft.exercises.length - 1} onClick={() => setItems(moveItem(draft.exercises, index, index + 1))}>
                  ↓
                </button>
                <button type="button" className="icon-button" aria-label={`Remove ${exercise.name}`} onClick={() => setItems(draft.exercises.filter((_, i) => i !== index))}>
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {draft.exercises.length === 0 && <p className="empty">Add the exercises for this routine.</p>}
      <button type="button" className="button button-secondary button-block" onClick={() => setPicking(true)}>
        + Add exercise
      </button>
      {!isNew && (
        <button type="button" className="button button-danger button-block" onClick={() => void remove()}>
          Delete template
        </button>
      )}
      {picking && (
        <Modal title="Add exercise" onClose={() => setPicking(false)}>
          <ExerciseBrowser
            exercises={catalog.all}
            onPick={(exercise) => {
              setItems([...draft.exercises, { exerciseId: exercise.id, setCount: DEFAULT_SET_COUNT }]);
              setPicking(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
