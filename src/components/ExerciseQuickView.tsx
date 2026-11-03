import { Link } from 'react-router';
import type { Exercise } from '../domain/types';
import type { ExerciseCatalog } from '../storage/hooks';
import { ExerciseMedia } from './ExerciseMedia';
import { Modal } from './Modal';

interface Props {
  exercise: Exercise;
  catalog: ExerciseCatalog;
  /** Offer a link to the full exercise page (off when leaving would drop unsaved edits). */
  showDetailsLink: boolean;
  onClose: () => void;
}

/** In-place demo during a workout: video/animation plus form cues, without leaving the screen. */
export function ExerciseQuickView({ exercise, catalog, showDetailsLink, onClose }: Props) {
  return (
    <Modal title={exercise.name} onClose={onClose}>
      <ExerciseMedia exercise={exercise} video={catalog.videoFor(exercise.id)} />
      {exercise.cues.length > 0 && (
        <ol className="cue-list">
          {exercise.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ol>
      )}
      {showDetailsLink && (
        <Link to={`/exercises/${exercise.id}`} className="button button-ghost button-block">
          Records, history & video settings
        </Link>
      )}
    </Modal>
  );
}
