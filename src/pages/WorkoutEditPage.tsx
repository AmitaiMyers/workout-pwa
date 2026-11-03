import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { WorkoutEditor } from '../components/WorkoutEditor';
import { required } from '../domain/assert';
import { missingFields } from '../domain/stats';
import type { Workout } from '../domain/types';
import { getWorkout, listWorkouts, saveWorkout } from '../storage/db';
import { useDbQuery, useExerciseCatalog, type ExerciseCatalog } from '../storage/hooks';

/** Human-readable reasons the edited workout cannot be saved yet. */
function validationProblems(workout: Workout, catalog: ExerciseCatalog): string[] {
  const problems: string[] = [];
  if (workout.name.trim() === '') problems.push('Give the workout a name.');
  if (workout.exercises.length === 0) problems.push('Add at least one exercise.');
  for (const entry of workout.exercises) {
    const exercise = catalog.get(entry.exerciseId);
    if (entry.sets.length === 0) problems.push(`${exercise.name}: add a set or remove the exercise.`);
    entry.sets.forEach((set, index) => {
      const missing = missingFields(set, exercise.tracking);
      if (missing.length > 0) problems.push(`${exercise.name}, set ${index + 1}: enter ${missing.join(' and ')}.`);
    });
  }
  return problems;
}

export function WorkoutEditPage() {
  const { id } = useParams();
  const workoutId = required(id, 'Route is missing the workout id');
  const navigate = useNavigate();
  const catalog = useExerciseCatalog();
  const history = useDbQuery(listWorkouts, []);
  const [draft, setDraft] = useState<Workout | null | undefined>(undefined);

  useEffect(() => {
    void getWorkout(workoutId).then((stored) => setDraft(stored ?? null));
  }, [workoutId]);

  if (draft === undefined || catalog === undefined || history === undefined) {
    return <Loading />;
  }
  if (draft === null) {
    return (
      <div className="page">
        <PageHeader title="Edit workout" back />
        <p className="empty">This workout no longer exists.</p>
      </div>
    );
  }

  const problems = validationProblems(draft, catalog);
  const update = (change: (workout: Workout) => Workout) => setDraft((current) => change(required(current, 'Draft missing')));

  return (
    <div className="page">
      <PageHeader
        title="Edit workout"
        back
        actions={
          <button
            type="button"
            className="button button-primary"
            disabled={problems.length > 0}
            onClick={() => void saveWorkout(draft).then(() => navigate(`/history/${draft.id}`, { replace: true }))}
          >
            Save
          </button>
        }
      />
      <input className="title-input" aria-label="Workout name" value={draft.name} onChange={(event) => update((current) => ({ ...current, name: event.target.value }))} />
      <WorkoutEditor workout={draft} onChange={update} mode="edit" catalog={catalog} history={history} />
      <label className="field">
        <span>Workout note</span>
        <textarea className="text-input" rows={2} value={draft.note} onChange={(event) => update((current) => ({ ...current, note: event.target.value }))} />
      </label>
      {problems.length > 0 && (
        <ul className="problem-list">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
