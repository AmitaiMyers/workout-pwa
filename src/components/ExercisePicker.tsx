import { useState } from 'react';
import { Link } from 'react-router';
import { ExerciseAnimation } from '../animation/ExerciseAnimation';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Exercise, type MuscleGroup } from '../domain/types';

interface FilterState {
  query: string;
  muscle: MuscleGroup | null;
  equipment: Equipment | null;
}

export function filterExercises(exercises: readonly Exercise[], filter: FilterState): Exercise[] {
  const query = filter.query.trim().toLowerCase();
  return exercises.filter(
    (exercise) =>
      (query === '' || exercise.name.toLowerCase().includes(query)) &&
      (filter.muscle === null || exercise.muscles.includes(filter.muscle)) &&
      (filter.equipment === null || exercise.equipment === filter.equipment),
  );
}

interface FiltersProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
}

function ExerciseFilters({ filter, onChange }: FiltersProps) {
  return (
    <div className="filters">
      <input
        type="search"
        className="search-input"
        placeholder="Search exercises"
        value={filter.query}
        onChange={(event) => onChange({ ...filter, query: event.target.value })}
      />
      <div className="chip-row">
        {MUSCLE_GROUPS.map((muscle) => (
          <button
            type="button"
            key={muscle}
            className={`chip ${filter.muscle === muscle ? 'chip-active' : ''}`}
            onClick={() => onChange({ ...filter, muscle: filter.muscle === muscle ? null : muscle })}
          >
            {muscle}
          </button>
        ))}
      </div>
      <div className="chip-row">
        {EQUIPMENT.map((equipment) => (
          <button
            type="button"
            key={equipment}
            className={`chip ${filter.equipment === equipment ? 'chip-active' : ''}`}
            onClick={() => onChange({ ...filter, equipment: filter.equipment === equipment ? null : equipment })}
          >
            {equipment}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <>
      <ExerciseAnimation animationId={exercise.animationId} animate={false} className="thumb" label={exercise.name} />
      <span className="exercise-row-text">
        <span className="exercise-row-name">{exercise.name}</span>
        <span className="muted small">
          {exercise.muscles.join(', ')}
          {exercise.isCustom ? ' · Custom' : ''}
        </span>
      </span>
    </>
  );
}

interface ListProps {
  exercises: readonly Exercise[];
  /** Called when an exercise is tapped. When absent, rows link to the exercise detail page. */
  onPick?: (exercise: Exercise) => void;
}

/** Searchable, filterable list of exercises — used by the library page and the picker. */
export function ExerciseBrowser({ exercises, onPick }: ListProps) {
  const [filter, setFilter] = useState<FilterState>({ query: '', muscle: null, equipment: null });
  const visible = filterExercises(exercises, filter);
  return (
    <>
      <ExerciseFilters filter={filter} onChange={setFilter} />
      <ul className="exercise-list">
        {visible.map((exercise) => (
          <li key={exercise.id}>
            {onPick === undefined ? (
              <Link to={`/exercises/${exercise.id}`} className="exercise-row">
                <ExerciseRow exercise={exercise} />
              </Link>
            ) : (
              <button type="button" className="exercise-row" onClick={() => onPick(exercise)}>
                <ExerciseRow exercise={exercise} />
              </button>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="empty">No exercises match.</li>}
      </ul>
    </>
  );
}
