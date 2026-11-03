import { useState } from 'react';
import type { Exercise } from '../domain/types';
import { BUILT_IN_VIDEOS, parseYouTubeLink, watchUrl } from '../domain/videos';
import { deleteVideoOverride, saveVideoOverride } from '../storage/db';
import type { ExerciseCatalog } from '../storage/hooks';

interface Props {
  exercise: Exercise;
  catalog: ExerciseCatalog;
}

/** Change, remove or reset the YouTube video shown for an exercise. */
export function VideoLinkEditor({ exercise, catalog }: Props) {
  const [editing, setEditing] = useState(false);
  const [link, setLink] = useState('');
  const current = catalog.videoFor(exercise.id);
  const hasDefault = BUILT_IN_VIDEOS[exercise.id] !== undefined;
  const parsed = parseYouTubeLink(link);
  const showLinkError = link.trim() !== '' && parsed === null;

  const save = () => {
    if (parsed !== null) {
      void saveVideoOverride({ exerciseId: exercise.id, video: parsed }).then(() => {
        setEditing(false);
        setLink('');
      });
    }
  };

  return (
    <section className="card">
      <h2>Video</h2>
      {current === null ? (
        <p className="muted small">No video. Paste a YouTube link to show one.</p>
      ) : (
        <a href={watchUrl(current)} target="_blank" rel="noreferrer" className="small video-link">
          {watchUrl(current)}
        </a>
      )}
      {editing ? (
        <form
          className="save-template-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="inline-form">
            <input
              className="text-input"
              type="url"
              inputMode="url"
              aria-label="YouTube link"
              placeholder="https://www.youtube.com/watch?v=…"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              autoFocus
            />
            <button type="submit" className="button button-primary" disabled={parsed === null}>
              Save
            </button>
          </div>
          {showLinkError && <p className="field-error">That doesn't look like a YouTube video link.</p>}
          <button type="button" className="link-button small" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="button-row wrap">
          <button type="button" className="button button-secondary" onClick={() => setEditing(true)}>
            {current === null ? 'Add video' : 'Change video'}
          </button>
          {current !== null && (
            <button type="button" className="button button-ghost" onClick={() => void saveVideoOverride({ exerciseId: exercise.id, video: null })}>
              Remove
            </button>
          )}
          {hasDefault && catalog.hasVideoOverride(exercise.id) && (
            <button type="button" className="button button-ghost" onClick={() => void deleteVideoOverride(exercise.id)}>
              Reset to default
            </button>
          )}
        </div>
      )}
    </section>
  );
}
