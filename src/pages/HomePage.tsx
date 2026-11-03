import { Link } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { todayKey } from '../domain/dates';
import { formatDate, formatDuration } from '../domain/format';
import { listSchedule, listTemplates, listWorkouts } from '../storage/db';
import { useDbQuery } from '../storage/hooks';
import { useActiveWorkout } from '../state/ActiveWorkoutContext';
import { useWorkoutStarter } from '../state/useWorkoutStarter';

const RECENT_COUNT = 3;

export function HomePage() {
  const active = useActiveWorkout();
  const starter = useWorkoutStarter();
  const templates = useDbQuery(listTemplates, []);
  const schedule = useDbQuery(listSchedule, []);
  const workouts = useDbQuery(listWorkouts, []);

  if (templates === undefined || schedule === undefined || workouts === undefined || active.session === undefined) {
    return <Loading />;
  }

  const templateById = new Map(templates.map((template) => [template.id, template]));
  const today = todayKey();
  const todaysPlan = schedule.filter((entry) => entry.date === today && entry.workoutId === null);

  return (
    <div className="page">
      <PageHeader title="Workout" />

      {active.session !== null && (
        <section className="card highlight-card">
          <p className="muted small">In progress</p>
          <h2>{active.session.workout.name}</h2>
          <p className="muted small">Started {formatDuration((Date.now() - active.session.workout.startedAt) / 1000)} ago</p>
          <Link to="/workout" className="button button-primary button-block">
            Resume workout
          </Link>
        </section>
      )}

      {todaysPlan.length > 0 && (
        <section className="card">
          <h2>Planned for today</h2>
          <ul className="plain-list">
            {todaysPlan.map((entry) => {
              const template = templateById.get(entry.templateId);
              if (template === undefined) {
                throw new Error(`Schedule entry ${entry.id} points to a missing template`);
              }
              return (
                <li key={entry.id} className="list-row">
                  <span>{template.name}</span>
                  <button type="button" className="button button-primary" onClick={() => void starter.startFromTemplate(template, entry.id)}>
                    Start
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <button type="button" className="button button-primary button-block button-large" onClick={() => void starter.startEmpty()}>
        Start empty workout
      </button>

      <section className="card">
        <div className="section-header">
          <h2>Templates</h2>
          <Link to="/templates/new" className="link-button">
            + New
          </Link>
        </div>
        {templates.length === 0 ? (
          <p className="muted">Save a routine like “Push Day” to start it with one tap.</p>
        ) : (
          <ul className="plain-list">
            {templates.map((template) => (
              <li key={template.id} className="list-row">
                <span>
                  {template.name}
                  <span className="muted small"> · {template.exercises.length} exercises</span>
                </span>
                <button type="button" className="button button-secondary" onClick={() => void starter.startFromTemplate(template, null)}>
                  Start
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Recent</h2>
          <Link to="/history" className="link-button">
            All
          </Link>
        </div>
        {workouts.length === 0 ? (
          <p className="muted">Finished workouts show up here.</p>
        ) : (
          <ul className="plain-list">
            {workouts.slice(0, RECENT_COUNT).map((workout) => (
              <li key={workout.id}>
                <Link to={`/history/${workout.id}`} className="list-row list-link">
                  <span>{workout.name}</span>
                  <span className="muted small">{formatDate(workout.startedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
