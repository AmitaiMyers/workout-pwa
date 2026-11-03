import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DurationInput } from '../components/NumberInput';
import { Loading, PageHeader } from '../components/PageHeader';
import { assert, newId } from '../domain/assert';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Exercise, type MuscleGroup, type TrackingType } from '../domain/types';
import { getActiveSession, listCustomExercises, listWorkouts, saveCustomExercise } from '../storage/db';

const TRACKING_OPTIONS: { value: TrackingType; label: string }[] = [
  { value: 'weight_reps', label: 'Weight × reps' },
  { value: 'reps', label: 'Reps only (bodyweight)' },
  { value: 'time', label: 'Time (e.g. holds)' },
  { value: 'distance_time', label: 'Distance & time (cardio)' },
];

const DEFAULT_REST_SEC = 90;

interface Draft {
  name: string;
  muscles: MuscleGroup[];
  equipment: Equipment;
  tracking: TrackingType;
  restSec: number | null;
  cuesText: string;
}

const EMPTY_DRAFT: Draft = { name: '', muscles: [], equipment: 'Barbell', tracking: 'weight_reps', restSec: DEFAULT_REST_SEC, cuesText: '' };

function toDraft(exercise: Exercise): Draft {
  return {
    name: exercise.name,
    muscles: exercise.muscles,
    equipment: exercise.equipment,
    tracking: exercise.tracking,
    restSec: exercise.defaultRestSec,
    cuesText: exercise.cues.join('\n'),
  };
}

/** Create a new custom exercise, or edit one at /exercises/:id/edit. */
export function CustomExercisePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | undefined>(id === undefined ? EMPTY_DRAFT : undefined);
  // Changing how an exercise is measured would invalidate sets already logged for it.
  const [trackingLocked, setTrackingLocked] = useState(false);

  useEffect(() => {
    if (id === undefined) return;
    void Promise.all([listCustomExercises(), listWorkouts(), getActiveSession()]).then(([custom, workouts, active]) => {
      const existing = custom.find((exercise) => exercise.id === id);
      assert(existing !== undefined, `Custom exercise "${id}" not found`);
      setDraft(toDraft(existing));
      const logged = [...workouts, ...(active === undefined ? [] : [active.workout])];
      setTrackingLocked(logged.some((workout) => workout.exercises.some((entry) => entry.exerciseId === id)));
    });
  }, [id]);

  if (draft === undefined) {
    return <Loading />;
  }

  const valid = draft.name.trim() !== '' && draft.muscles.length > 0 && draft.restSec !== null && draft.restSec > 0;
  const toggleMuscle = (muscle: MuscleGroup) =>
    setDraft({ ...draft, muscles: draft.muscles.includes(muscle) ? draft.muscles.filter((item) => item !== muscle) : [...draft.muscles, muscle] });

  const save = async () => {
    assert(draft.restSec !== null, 'Rest time is required');
    const exercise: Exercise = {
      id: id ?? `custom-${newId()}`,
      name: draft.name.trim(),
      muscles: draft.muscles,
      equipment: draft.equipment,
      tracking: draft.tracking,
      cues: draft.cuesText.split('\n').map((line) => line.trim()).filter((line) => line !== ''),
      defaultRestSec: draft.restSec,
      animationId: null,
      isCustom: true,
    };
    await saveCustomExercise(exercise);
    navigate(-1);
  };

  return (
    <div className="page">
      <PageHeader title={id === undefined ? 'New exercise' : 'Edit exercise'} back />
      <label className="field">
        <span>Name</span>
        <input className="text-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Cable Fly" />
      </label>
      <div className="field">
        <span>Muscles (first tapped = primary)</span>
        <div className="chip-row">
          {MUSCLE_GROUPS.map((muscle) => (
            <button type="button" key={muscle} className={`chip ${draft.muscles.includes(muscle) ? 'chip-active' : ''}`} onClick={() => toggleMuscle(muscle)}>
              {muscle}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Equipment</span>
        <select className="text-input" value={draft.equipment} onChange={(event) => setDraft({ ...draft, equipment: event.target.value as Equipment })}>
          {EQUIPMENT.map((equipment) => (
            <option key={equipment} value={equipment}>
              {equipment}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Tracking</span>
        <select
          className="text-input"
          value={draft.tracking}
          disabled={trackingLocked}
          onChange={(event) => setDraft({ ...draft, tracking: event.target.value as TrackingType })}
        >
          {TRACKING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {trackingLocked && <span className="muted small">Locked because this exercise already has logged sets.</span>}
      </label>
      <div className="field">
        <span>Default rest</span>
        <DurationInput valueSec={draft.restSec} onChange={(restSec) => setDraft({ ...draft, restSec })} label="Default rest" />
      </div>
      <label className="field">
        <span>Form cues (one per line, optional)</span>
        <textarea className="text-input" rows={3} value={draft.cuesText} onChange={(event) => setDraft({ ...draft, cuesText: event.target.value })} />
      </label>
      <button type="button" className="button button-primary button-block" disabled={!valid} onClick={() => void save()}>
        Save exercise
      </button>
    </div>
  );
}
