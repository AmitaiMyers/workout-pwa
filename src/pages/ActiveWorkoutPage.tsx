import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { RestTimerBar } from '../components/RestTimerBar';
import { WorkoutEditor } from '../components/WorkoutEditor';
import { formatDuration } from '../domain/format';
import { countDoneSets, countIncompleteSets } from '../domain/workoutFactory';
import { listWorkouts } from '../storage/db';
import { useDbQuery, useExerciseCatalog } from '../storage/hooks';
import { useActiveWorkout } from '../state/ActiveWorkoutContext';
import { useWakeLock } from '../state/useWakeLock';

function ElapsedTime({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="elapsed-chip" aria-label="Elapsed time">
      ⏱ {formatDuration((now - since) / 1000)}
    </span>
  );
}

export function ActiveWorkoutPage() {
  const active = useActiveWorkout();
  const catalog = useExerciseCatalog();
  const history = useDbQuery(listWorkouts, []);
  const navigate = useNavigate();
  // Keep the phone awake between sets while a workout is open.
  useWakeLock(active.session !== undefined && active.session !== null);

  if (active.session === undefined || catalog === undefined || history === undefined) {
    return <Loading />;
  }
  if (active.session === null) {
    return (
      <div className="page">
        <PageHeader title="Workout" />
        <p className="empty">No workout in progress.</p>
        <Link to="/" className="button button-primary button-block">
          Go to start
        </Link>
      </div>
    );
  }

  const { workout, rest } = active.session;
  const doneSets = countDoneSets(workout);
  const totalSets = doneSets + countIncompleteSets(workout);

  const finish = async () => {
    if (doneSets === 0) {
      window.alert('Tick at least one set as done before finishing, or discard the workout.');
      return;
    }
    const incomplete = countIncompleteSets(workout);
    if (incomplete > 0 && !window.confirm(`${incomplete} set(s) are not ticked done and will be dropped. Finish workout?`)) {
      return;
    }
    const finished = await active.finish();
    navigate(`/history/${finished.id}?finished=1`, { replace: true });
  };

  const discard = async () => {
    if (window.confirm('Discard this workout? Nothing will be saved.')) {
      await active.discard();
      navigate('/', { replace: true });
    }
  };

  return (
    <div className={`page ${rest !== null ? 'page-with-rest' : ''}`}>
      <PageHeader
        backTo="/"
        title={<ElapsedTime since={workout.startedAt} />}
        actions={
          <button type="button" className="button button-primary" onClick={() => void finish()}>
            Finish
          </button>
        }
      />
      <div className="workout-progress" role="progressbar" aria-label="Sets completed" aria-valuemin={0} aria-valuemax={totalSets} aria-valuenow={doneSets}>
        <div className="workout-progress-track">
          <div className="workout-progress-fill" style={{ transform: `scaleX(${totalSets === 0 ? 0 : doneSets / totalSets})` }} />
        </div>
        <span className="muted small">
          {doneSets}/{totalSets} sets
        </span>
      </div>
      <input
        className="title-input title-input-large"
        aria-label="Workout name"
        value={workout.name}
        onChange={(event) => active.updateWorkout((current) => ({ ...current, name: event.target.value }))}
      />
      <WorkoutEditor
        workout={workout}
        onChange={active.updateWorkout}
        mode="active"
        catalog={catalog}
        history={history}
        onSetCompleted={(exercise) => active.startRest(catalog.restSecFor(exercise.id))}
      />
      <label className="field">
        <span>Workout note</span>
        <textarea
          className="text-input"
          rows={2}
          value={workout.note}
          onChange={(event) => active.updateWorkout((current) => ({ ...current, note: event.target.value }))}
        />
      </label>
      <button type="button" className="button button-danger button-block" onClick={() => void discard()}>
        Discard workout
      </button>
      {rest !== null && <RestTimerBar rest={rest} onAdjust={active.adjustRest} onSkip={active.skipRest} />}
    </div>
  );
}
