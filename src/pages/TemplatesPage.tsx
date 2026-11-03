import { Link } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { listTemplates } from '../storage/db';
import { useDbQuery, useExerciseCatalog } from '../storage/hooks';
import { useWorkoutStarter } from '../state/useWorkoutStarter';

export function TemplatesPage() {
  const templates = useDbQuery(listTemplates, []);
  const catalog = useExerciseCatalog();
  const starter = useWorkoutStarter();
  if (templates === undefined || catalog === undefined) {
    return <Loading />;
  }
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
      {templates.length === 0 && <p className="empty">No templates yet. Create one, or save a finished workout as a template.</p>}
      <ul className="plain-list">
        {templates.map((template) => (
          <li key={template.id} className="card">
            <div className="section-header">
              <strong>{template.name}</strong>
              <span className="button-row">
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
    </div>
  );
}
