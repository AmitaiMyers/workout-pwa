import { useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { ExerciseAnimation } from '../animation/ExerciseAnimation';
import { formatDuration, formatSet } from '../domain/format';
import { missingFields, previousSets } from '../domain/stats';
import type { Exercise, SetEntry, TrackingType, Workout, WorkoutExercise } from '../domain/types';
import { moveItem, newWorkoutExercise, nextSet } from '../domain/workoutFactory';
import { saveRestOverride } from '../storage/db';
import type { ExerciseCatalog } from '../storage/hooks';
import { ExerciseBrowser } from './ExercisePicker';
import { Modal } from './Modal';
import { DurationInput, NumberInput } from './NumberInput';

export type EditorMode = 'active' | 'edit';

type WorkoutChange = (change: (workout: Workout) => Workout) => void;

interface Props {
  workout: Workout;
  onChange: WorkoutChange;
  mode: EditorMode;
  catalog: ExerciseCatalog;
  /** Finished workouts, used for the "previous" column and prefilled values. */
  history: readonly Workout[];
  /** Active mode only: a set was ticked done. */
  onSetCompleted?: (exercise: Exercise) => void;
}

function updateEntry(workout: Workout, entryId: string, change: (entry: WorkoutExercise) => WorkoutExercise): Workout {
  return { ...workout, exercises: workout.exercises.map((entry) => (entry.id === entryId ? change(entry) : entry)) };
}

function updateSet(entry: WorkoutExercise, setId: string, change: (set: SetEntry) => SetEntry): WorkoutExercise {
  return { ...entry, sets: entry.sets.map((set) => (set.id === setId ? change(set) : set)) };
}

export function WorkoutEditor({ workout, onChange, mode, catalog, history, onSetCompleted }: Props) {
  const [picking, setPicking] = useState(false);
  const previousFor = (exerciseId: string) => previousSets(history, exerciseId, workout.startedAt);

  const addExercise = (exercise: Exercise) => {
    const entry = newWorkoutExercise(exercise.id, 1, previousFor(exercise.id));
    const prepared = mode === 'edit' ? { ...entry, sets: entry.sets.map((set) => ({ ...set, done: true })) } : entry;
    onChange((current) => ({ ...current, exercises: [...current.exercises, prepared] }));
    setPicking(false);
  };

  return (
    <div className="workout-editor">
      {workout.exercises.map((entry, index) => (
        <ExerciseCard
          key={entry.id}
          entry={entry}
          exercise={catalog.get(entry.exerciseId)}
          restSec={catalog.restSecFor(entry.exerciseId)}
          previous={previousFor(entry.exerciseId)}
          mode={mode}
          isFirst={index === 0}
          isLast={index === workout.exercises.length - 1}
          onChange={(change) => onChange((current) => updateEntry(current, entry.id, change))}
          onMove={(delta) => onChange((current) => ({ ...current, exercises: moveItem(current.exercises, index, index + delta) }))}
          onRemove={() => onChange((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== entry.id) }))}
          onSetCompleted={onSetCompleted}
        />
      ))}
      {workout.exercises.length === 0 && <p className="empty">No exercises yet. Add your first movement.</p>}
      <button type="button" className="button button-secondary button-block" onClick={() => setPicking(true)}>
        + Add exercise
      </button>
      {picking && (
        <Modal title="Add exercise" onClose={() => setPicking(false)}>
          {/* Leaving this page is safe mid-workout (it is saved continuously) but would drop unsaved edits. */}
          {mode === 'active' && (
            <Link to="/exercises/new" className="button button-ghost button-block">
              + Create custom exercise
            </Link>
          )}
          <ExerciseBrowser exercises={catalog.all} onPick={addExercise} />
        </Modal>
      )}
    </div>
  );
}

interface CardProps {
  entry: WorkoutExercise;
  exercise: Exercise;
  restSec: number;
  previous: SetEntry[];
  mode: EditorMode;
  isFirst: boolean;
  isLast: boolean;
  onChange: (change: (entry: WorkoutExercise) => WorkoutExercise) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onSetCompleted?: (exercise: Exercise) => void;
}

function ExerciseCard({ entry, exercise, restSec, previous, mode, isFirst, isLast, onChange, onMove, onRemove, onSetCompleted }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [detailsSetId, setDetailsSetId] = useState<string | null>(null);
  const detailsSet = entry.sets.find((set) => set.id === detailsSetId);

  const addSet = () =>
    onChange((current) => {
      const created = nextSet(current.sets, previous);
      return { ...current, sets: [...current.sets, mode === 'edit' ? { ...created, done: true } : created] };
    });

  let workingNumber = 0;

  return (
    <section className="card exercise-card">
      <header className="exercise-card-header">
        <Link to={`/exercises/${exercise.id}`} className="exercise-card-thumb" aria-label={`How to do ${exercise.name}`}>
          <ExerciseAnimation animationId={exercise.animationId} animate={mode === 'active'} className="thumb" label={exercise.name} />
        </Link>
        <div className="exercise-card-title">
          <Link to={`/exercises/${exercise.id}`} className="exercise-card-name">
            {exercise.name}
          </Link>
          {mode === 'active' && (
            <button type="button" className="link-button small" onClick={() => setEditingRest(true)}>
              Rest {formatDuration(restSec)}
            </button>
          )}
        </div>
        <button type="button" className="icon-button" aria-label="Exercise options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          ⋯
        </button>
      </header>
      {menuOpen && (
        <div className="card-menu">
          <button type="button" className="button button-ghost" disabled={isFirst} onClick={() => onMove(-1)}>
            ↑ Move up
          </button>
          <button type="button" className="button button-ghost" disabled={isLast} onClick={() => onMove(1)}>
            ↓ Move down
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => {
              if (window.confirm(`Remove ${exercise.name} from this workout?`)) onRemove();
            }}
          >
            Remove
          </button>
        </div>
      )}
      <div className={`set-table set-table-${exercise.tracking} set-table-${mode}`}>
        <SetHeader tracking={exercise.tracking} mode={mode} />
        {entry.sets.map((set, index) => {
          if (!set.isWarmup) workingNumber += 1;
          return (
            <SetRow
              key={set.id}
              set={set}
              label={set.isWarmup ? 'W' : String(workingNumber)}
              previous={previous[index]}
              tracking={exercise.tracking}
              mode={mode}
              onChange={(change) => onChange((current) => updateSet(current, set.id, change))}
              onOpenDetails={() => setDetailsSetId(set.id)}
              onCompleted={() => onSetCompleted?.(exercise)}
            />
          );
        })}
      </div>
      <button type="button" className="button button-ghost button-block" onClick={addSet}>
        + Add set
      </button>
      {detailsSet !== undefined && (
        <SetDetails
          set={detailsSet}
          onChange={(change) => onChange((current) => updateSet(current, detailsSet.id, change))}
          onDelete={() => {
            setDetailsSetId(null);
            onChange((current) => ({ ...current, sets: current.sets.filter((set) => set.id !== detailsSet.id) }));
          }}
          onClose={() => setDetailsSetId(null)}
        />
      )}
      {editingRest && <RestEditor exercise={exercise} restSec={restSec} onClose={() => setEditingRest(false)} />}
    </section>
  );
}

const COLUMN_LABELS: Record<TrackingType, string[]> = {
  weight_reps: ['kg', 'Reps'],
  reps: ['Reps'],
  time: ['Time'],
  distance_time: ['km', 'Time'],
};

function SetHeader({ tracking, mode }: { tracking: TrackingType; mode: EditorMode }) {
  return (
    <div className="set-row set-header">
      <span>Set</span>
      <span>Previous</span>
      {COLUMN_LABELS[tracking].map((label) => (
        <span key={label}>{label}</span>
      ))}
      {mode === 'active' && <span aria-label="Done">✓</span>}
    </div>
  );
}

interface SetRowProps {
  set: SetEntry;
  label: string;
  previous: SetEntry | undefined;
  tracking: TrackingType;
  mode: EditorMode;
  onChange: (change: (set: SetEntry) => SetEntry) => void;
  onOpenDetails: () => void;
  onCompleted: () => void;
}

function SetRow({ set, label, previous, tracking, mode, onChange, onOpenDetails, onCompleted }: SetRowProps) {
  const [missing, setMissing] = useState<string[]>([]);
  const patch = (fields: Partial<SetEntry>) => {
    setMissing([]);
    onChange((current) => ({ ...current, ...fields }));
  };

  const toggleDone = () => {
    if (set.done) {
      patch({ done: false });
      return;
    }
    const problems = missingFields(set, tracking);
    if (problems.length > 0) {
      setMissing(problems);
      return;
    }
    patch({ done: true });
    onCompleted();
  };

  const hasExtras = set.rpe !== null || set.note !== '';
  const inputs = {
    weight: <NumberInput key="w" value={set.weightKg} onChange={(weightKg) => patch({ weightKg })} allowDecimals label="Weight in kg" />,
    reps: <NumberInput key="r" value={set.reps} onChange={(reps) => patch({ reps })} allowDecimals={false} label="Reps" />,
    time: <DurationInput key="t" valueSec={set.durationSec} onChange={(durationSec) => patch({ durationSec })} label="Time" />,
    distance: <NumberInput key="d" value={set.distanceKm} onChange={(distanceKm) => patch({ distanceKm })} allowDecimals label="Distance in km" />,
  };
  const fields: Record<TrackingType, ReactElement[]> = {
    weight_reps: [inputs.weight, inputs.reps],
    reps: [inputs.reps],
    time: [inputs.time],
    distance_time: [inputs.distance, inputs.time],
  };

  return (
    <>
      <div className={`set-row ${set.done && mode === 'active' ? 'set-done' : ''} ${set.isWarmup ? 'set-warmup' : ''} ${missing.length > 0 ? 'set-invalid' : ''}`}>
        <button type="button" className="set-label" onClick={onOpenDetails} aria-label={`Set ${label} options`}>
          {label}
          {hasExtras && <span className="set-extras-dot" aria-hidden="true" />}
        </button>
        <span className="set-previous">{previous === undefined ? '—' : formatSet(previous, tracking)}</span>
        {fields[tracking]}
        {mode === 'active' && (
          <button type="button" className={`done-button ${set.done ? 'done-on' : ''}`} onClick={toggleDone} aria-pressed={set.done} aria-label="Mark set done">
            ✓
          </button>
        )}
      </div>
      {missing.length > 0 && <p className="set-error">Enter {missing.join(' and ')} first.</p>}
    </>
  );
}

interface SetDetailsProps {
  set: SetEntry;
  onChange: (change: (set: SetEntry) => SetEntry) => void;
  onDelete: () => void;
  onClose: () => void;
}

function SetDetails({ set, onChange, onDelete, onClose }: SetDetailsProps) {
  const patch = (fields: Partial<SetEntry>) => onChange((current) => ({ ...current, ...fields }));
  return (
    <Modal title="Set details" onClose={onClose}>
      <label className="toggle-row">
        <input type="checkbox" checked={set.isWarmup} onChange={(event) => patch({ isWarmup: event.target.checked })} />
        Warm-up set <span className="muted small">(excluded from records and volume)</span>
      </label>
      <label className="field">
        <span>RPE (1–10)</span>
        <NumberInput value={set.rpe} onChange={(rpe) => patch({ rpe })} allowDecimals max={10} label="RPE" placeholder="e.g. 8" />
      </label>
      <label className="field">
        <span>Note</span>
        <input type="text" className="text-input" value={set.note} onChange={(event) => patch({ note: event.target.value })} placeholder="How did it feel?" />
      </label>
      <div className="button-row">
        <button type="button" className="button button-danger" onClick={onDelete}>
          Delete set
        </button>
        <button type="button" className="button button-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}

function RestEditor({ exercise, restSec, onClose }: { exercise: Exercise; restSec: number; onClose: () => void }) {
  const [value, setValue] = useState<number | null>(restSec);
  const valid = value !== null && value > 0;
  return (
    <Modal title={`Rest for ${exercise.name}`} onClose={onClose}>
      <p className="muted small">Applies every time you do this exercise.</p>
      <div className="field">
        <DurationInput valueSec={value} onChange={setValue} label="Rest" />
      </div>
      <div className="button-row">
        <button type="button" className="button button-ghost" onClick={() => setValue(exercise.defaultRestSec)}>
          Reset to {formatDuration(exercise.defaultRestSec)}
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={!valid}
          onClick={() => {
            if (value !== null) {
              void saveRestOverride({ exerciseId: exercise.id, restSec: value }).then(onClose);
            }
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
