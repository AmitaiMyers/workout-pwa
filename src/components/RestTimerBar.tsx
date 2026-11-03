import { useEffect, useState } from 'react';
import { formatDuration } from '../domain/format';
import type { RestTimer } from '../domain/types';

interface Props {
  rest: RestTimer;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function RestTimerBar({ rest, onAdjust, onSkip }: Props) {
  const now = useNow(250);
  const remainingSec = Math.max(0, (rest.endsAt - now) / 1000);
  const progress = Math.min(1, remainingSec / rest.totalSec);
  return (
    <div className="rest-bar" role="timer" aria-live="off">
      <div className="rest-progress" style={{ transform: `scaleX(${progress})` }} />
      <button type="button" className="rest-button" onClick={() => onAdjust(-15)}>
        −15
      </button>
      <div className="rest-time">
        <span className="muted small">Rest</span>
        <strong>{formatDuration(Math.ceil(remainingSec))}</strong>
      </div>
      <button type="button" className="rest-button" onClick={() => onAdjust(15)}>
        +15
      </button>
      <button type="button" className="rest-button rest-skip" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
