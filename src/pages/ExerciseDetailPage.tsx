import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ExerciseAnimation } from '../animation/ExerciseAnimation';
import { LineChart } from '../components/LineChart';
import { Loading, PageHeader } from '../components/PageHeader';
import { required } from '../domain/assert';
import { formatDate, formatDuration, formatSet } from '../domain/format';
import { exerciseSessions, metricsFor, metricValue, personalRecords, type MetricKey } from '../domain/stats';
import type { Exercise, TrackingType } from '../domain/types';
import { deleteCustomExercise, getActiveSession, listTemplates, listWorkouts } from '../storage/db';
import { useDbQuery, useExerciseCatalog } from '../storage/hooks';

const TRACKING_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Weight × reps',
  reps: 'Reps',
  time: 'Time',
  distance_time: 'Distance & time',
};

/** Custom exercises can only be deleted when nothing refers to them, so history never breaks. */
async function isExerciseInUse(exerciseId: string): Promise<boolean> {
  const [workouts, templates, active] = await Promise.all([listWorkouts(), listTemplates(), getActiveSession()]);
  const inWorkouts = workouts.some((workout) => workout.exercises.some((entry) => entry.exerciseId === exerciseId));
  const inTemplates = templates.some((template) => template.exercises.some((item) => item.exerciseId === exerciseId));
  const inActive = active !== undefined && active.workout.exercises.some((entry) => entry.exerciseId === exerciseId);
  return inWorkouts || inTemplates || inActive;
}

function CustomExerciseActions({ exercise }: { exercise: Exercise }) {
  const navigate = useNavigate();
  const remove = async () => {
    if (await isExerciseInUse(exercise.id)) {
      window.alert('This exercise is used in your history, templates or current workout, so it cannot be deleted.');
      return;
    }
    if (window.confirm(`Delete "${exercise.name}"?`)) {
      await deleteCustomExercise(exercise.id);
      navigate('/exercises', { replace: true });
    }
  };
  return (
    <div className="button-row">
      <Link to={`/exercises/${exercise.id}/edit`} className="button button-secondary">
        Edit
      </Link>
      <button type="button" className="button button-danger" onClick={() => void remove()}>
        Delete
      </button>
    </div>
  );
}

export function ExerciseDetailPage() {
  const { id } = useParams();
  const exerciseId = required(id, 'Route is missing the exercise id');
  const catalog = useExerciseCatalog();
  const workouts = useDbQuery(listWorkouts, []);
  const [metricKey, setMetricKey] = useState<MetricKey | null>(null);

  if (catalog === undefined || workouts === undefined) {
    return <Loading />;
  }
  const exercise = catalog.all.find((item) => item.id === exerciseId);
  if (exercise === undefined) {
    return (
      <div className="page">
        <PageHeader title="Exercise" back />
        <p className="empty">This exercise no longer exists.</p>
      </div>
    );
  }

  const sessions = exerciseSessions(workouts, exercise.id);
  const records = personalRecords(workouts, exercise.id, exercise.tracking);
  const metrics = metricsFor(exercise.tracking);
  const metric = metrics.find((item) => item.key === metricKey) ?? required(metrics[0], 'Every tracking type has metrics');
  const points = sessions.flatMap((session) => {
    const value = metricValue(metric, session.sets);
    return value === null ? [] : [{ x: session.workout.startedAt, y: value }];
  });

  return (
    <div className="page">
      <PageHeader title={exercise.name} back />
      <ExerciseAnimation animationId={exercise.animationId} animate className="figure-large" label={exercise.name} />
      <div className="tag-row">
        {exercise.muscles.map((muscle, index) => (
          <span key={muscle} className={`tag ${index === 0 ? 'tag-primary' : ''}`}>
            {muscle}
          </span>
        ))}
        <span className="tag">{exercise.equipment}</span>
        <span className="tag">{TRACKING_LABELS[exercise.tracking]}</span>
        <span className="tag">Rest {formatDuration(catalog.restSecFor(exercise.id))}</span>
      </div>

      {exercise.cues.length > 0 && (
        <section className="card">
          <h2>Form cues</h2>
          <ol className="cue-list">
            {exercise.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="card">
        <h2>Personal records</h2>
        {records.length === 0 ? (
          <p className="muted">No records yet.</p>
        ) : (
          <ul className="plain-list">
            {records.map((record) => (
              <li key={record.metric.key} className="list-row">
                <span>{record.metric.label}</span>
                <span>
                  <strong>{record.metric.format(record.value)}</strong>
                  <span className="muted small"> · {formatDate(record.achievedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Progress</h2>
        <div className="chip-row">
          {metrics.map((item) => (
            <button type="button" key={item.key} className={`chip ${item.key === metric.key ? 'chip-active' : ''}`} onClick={() => setMetricKey(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
        <LineChart points={points} formatY={metric.format} label={`${metric.label} over time`} />
      </section>

      <section className="card">
        <h2>History</h2>
        {sessions.length === 0 && <p className="muted">Not logged yet.</p>}
        <ul className="plain-list">
          {[...sessions].reverse().map((session) => (
            <li key={session.workout.id}>
              <Link to={`/history/${session.workout.id}`} className="list-link session-row">
                <span className="muted small">{formatDate(session.workout.startedAt)}</span>
                <span className="small">
                  {session.sets.map((set) => `${set.isWarmup ? 'W ' : ''}${formatSet(set, exercise.tracking)}`).join(' · ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {exercise.isCustom && <CustomExerciseActions exercise={exercise} />}
    </div>
  );
}
