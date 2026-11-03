import { useState } from 'react';
import { ExerciseAnimation } from '../animation/ExerciseAnimation';
import type { Exercise, VideoRef } from '../domain/types';
import { embedUrl, watchUrl } from '../domain/videos';
import { useOnlineStatus } from '../state/useOnlineStatus';

interface Props {
  exercise: Exercise;
  video: VideoRef | null;
}

type View = 'video' | 'animation';

/**
 * The exercise demo: the YouTube video when there is one and we are online,
 * otherwise the offline stick-figure animation. A toggle lets you compare both.
 */
export function ExerciseMedia({ exercise, video }: Props) {
  const online = useOnlineStatus();
  const [view, setView] = useState<View>('video');
  const canPlayVideo = video !== null && online;
  const showVideo = canPlayVideo && view === 'video';

  return (
    <div className="exercise-media">
      {showVideo ? (
        <div className="video-frame">
          <iframe
            src={embedUrl(video)}
            title={`${exercise.name} video`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <ExerciseAnimation animationId={exercise.animationId} animate className="figure-large" label={exercise.name} />
      )}
      {video !== null && !online && <p className="muted small center-text">Offline — showing the animation. The video plays when you're back online.</p>}
      {canPlayVideo && (
        <div className="media-controls">
          <div className="segmented" role="tablist" aria-label="Demo type">
            <button type="button" role="tab" aria-selected={view === 'video'} className={view === 'video' ? 'segmented-active' : ''} onClick={() => setView('video')}>
              Video
            </button>
            <button type="button" role="tab" aria-selected={view === 'animation'} className={view === 'animation' ? 'segmented-active' : ''} onClick={() => setView('animation')}>
              Animation
            </button>
          </div>
          <a href={watchUrl(video)} target="_blank" rel="noreferrer" className="link-button small">
            Open on YouTube ↗
          </a>
        </div>
      )}
    </div>
  );
}
