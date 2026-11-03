import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { required } from '../domain/assert';
import { formatDate, formatDuration, formatNumber, formatSet, formatTime, formatWeight } from '../domain/format';
import { newRecordsIn, summarizeWorkout } from '../domain/stats';
import type { Workout } from '../domain/types';
import { templateFromWorkout } from '../domain/workoutFactory';
import { deleteWorkout, listWorkouts, saveTemplate } from '../storage/db';
import { useDbQuery, useExerciseCatalog } from '../storage/hooks';

function SaveAsTemplate({ workout }: { workout: Workout }) {
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (saved) {
    return <p className="muted small">Saved as a template.</p>;
  }
  if (name === null) {
    return (
      <button type="button" className="button button-secondary" onClick={() => setName(workout.name)}>
        Save as template
      </button>
    );
  }
  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        void saveTemplate(templateFromWorkout(workout, name.trim())).then(() => setSaved(true));
      }}
    >
      <input className="text-input" aria-label="Template name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      <button type="submit" className="button button-primary" disabled={name.trim() === ''}>
        Save
      </button>
    </form>
  );
}

export function WorkoutDetailPage() {
  const { id } = useParams();
  const workoutId = required(id, 'Route is missing the workout id');
  const [searchParams] = useSearchParams();
  const justFinished = searchParams.get('finished') === '1';
  const navigate = useNavigate();
  const workouts = useDbQuery(listWorkouts, []);
  const catalog = useExerciseCatalog();

  if (workouts === undefined || catalog === undefined) {
    return <Loading />;
  }
  const workout = workouts.find((item) => item.id === workoutId);
  if (workout === undefined) {
    return (
      <div className="page">
        <PageHeader title="Workout" back />
        <p className="empty">This workout no longer exists.</p>
      </div>
    );
  }

  const trackingOf = (exerciseId: string) => catalog.get(exerciseId).tracking;
  const summary = summarizeWorkout(workout, trackingOf);
  const records = newRecordsIn(workout, workouts, trackingOf);

  const remove = async () => {
    if (window.confirm(`Delete "${workout.name}" permanently?`)) {
      await deleteWorkout(workout.id);
      navigate('/history', { replace: true });
    }
  };

  return (
    <div className="page">
      <PageHeader title={workout.name} back={!justFinished} />
      {justFinished && (
        <section className="card highlight-card">
          <h2>Workout complete 💪</h2>
          <p className="muted small">Saved to your history.</p>
        </section>
      )}
      <p className="muted">
        {formatDate(workout.startedAt)} · {formatTime(workout.startedAt)}
      </p>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">{formatDuration(summary.durationSec)}</span>
          <span className="stat-label">Duration</span>
        </div>
        <div className="stat">
          <span className="stat-value">{summary.workingSetCount}</span>
          <span className="stat-label">Sets</span>
        </div>
        <div className="stat">
          <span className="stat-value">{formatWeight(summary.volumeKg)}</span>
          <span className="stat-label">Volume</span>
        </div>
      </div>

      {records.length > 0 && (
        <section className="card pr-card">
          <h2>🏆 New personal records</h2>
          <ul className="plain-list">
            {records.map((record) => (
              <li key={`${record.exerciseId}-${record.metric.key}`} className="list-row">
                <span>
                  {catalog.get(record.exerciseId).name}
                  <span className="muted small"> · {record.metric.label}</span>
                </span>
                <span>
                  <strong>{record.metric.format(record.value)}</strong>
                  <span className="muted small"> (was {record.metric.format(record.previousBest)})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {workout.exercises.map((entry) => {
        const exercise = catalog.get(entry.exerciseId);
        let workingNumber = 0;
        return (
          <section key={entry.id} className="card">
            <Link to={`/exercises/${exercise.id}`} className="exercise-card-name">
              {exercise.name}
            </Link>
            <ol className="set-list">
              {entry.sets.map((set) => {
                if (!set.isWarmup) workingNumber += 1;
                return (
                  <li key={set.id} className={set.isWarmup ? 'set-warmup' : ''}>
                    <span className="set-badge">{set.isWarmup ? 'W' : workingNumber}</span>
                    <span>{formatSet(set, exercise.tracking)}</span>
                    {set.rpe !== null && <span className="muted small">RPE {formatNumber(set.rpe)}</span>}
                    {set.note !== '' && <span className="muted small set-note">“{set.note}”</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {workout.note !== '' && (
        <section className="card">
          <h2>Note</h2>
          <p>{workout.note}</p>
        </section>
      )}

      <div className="button-row wrap">
        <Link to={`/history/${workout.id}/edit`} className="button button-secondary">
          Edit
        </Link>
        <SaveAsTemplate workout={workout} />
        <button type="button" className="button button-danger" onClick={() => void remove()}>
          Delete
        </button>
      </div>
      {justFinished && (
        <Link to="/" className="button button-primary button-block">
          Done
        </Link>
      )}
    </div>
  );
}
