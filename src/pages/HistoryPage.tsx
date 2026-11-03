import { Link } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { formatDate, formatDuration, formatMonth, formatWeight } from '../domain/format';
import { summarizeWorkout } from '../domain/stats';
import type { Workout } from '../domain/types';
import { listWorkouts } from '../storage/db';
import { useDbQuery, useExerciseCatalog } from '../storage/hooks';

function groupByMonth(workouts: readonly Workout[]): { label: string; workouts: Workout[] }[] {
  const groups: { label: string; workouts: Workout[] }[] = [];
  for (const workout of workouts) {
    const label = formatMonth(new Date(workout.startedAt));
    const last = groups[groups.length - 1];
    if (last !== undefined && last.label === label) {
      last.workouts.push(workout);
    } else {
      groups.push({ label, workouts: [workout] });
    }
  }
  return groups;
}

export function HistoryPage() {
  const workouts = useDbQuery(listWorkouts, []);
  const catalog = useExerciseCatalog();
  if (workouts === undefined || catalog === undefined) {
    return <Loading />;
  }
  const trackingOf = (id: string) => catalog.get(id).tracking;

  return (
    <div className="page">
      <PageHeader title="History" />
      {workouts.length === 0 && <p className="empty">No workouts yet. Finish a workout and it appears here.</p>}
      {groupByMonth(workouts).map((group) => (
        <section key={group.label}>
          <h2 className="group-title">{group.label}</h2>
          <ul className="plain-list">
            {group.workouts.map((workout) => {
              const summary = summarizeWorkout(workout, trackingOf);
              return (
                <li key={workout.id}>
                  <Link to={`/history/${workout.id}`} className="card history-card">
                    <div className="section-header">
                      <strong>{workout.name}</strong>
                      <span className="muted small">{formatDate(workout.startedAt)}</span>
                    </div>
                    <p className="muted small">
                      {formatDuration(summary.durationSec)} · {summary.workingSetCount} sets
                      {summary.volumeKg > 0 ? ` · ${formatWeight(summary.volumeKg)}` : ''}
                    </p>
                    <p className="small">{workout.exercises.map((entry) => catalog.get(entry.exerciseId).name).join(' · ')}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
