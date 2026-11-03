import { formatKcal } from '../../domain/format';

interface Props {
  eatenKcal: number;
  targetKcal: number | null;
  size: 'large' | 'small';
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Calories eaten against the daily target; turns red once over. */
export function CaloriesRing({ eatenKcal, targetKcal, size }: Props) {
  const share = targetKcal === null || targetKcal === 0 ? 0 : eatenKcal / targetKcal;
  const over = share > 1;
  const remaining = targetKcal === null ? null : Math.round(targetKcal - eatenKcal);
  const label =
    remaining === null
      ? `${formatKcal(eatenKcal)} eaten`
      : over
        ? `${formatKcal(-remaining)} over target`
        : `${formatKcal(remaining)} left of ${formatKcal(targetKcal ?? 0)}`;
  return (
    <div className={`kcal-ring kcal-ring-${size}`} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} className="kcal-ring-track" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          className={`kcal-ring-fill ${over ? 'kcal-ring-over' : ''}`}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, share))}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="kcal-ring-center" aria-hidden="true">
        <strong>{Math.round(remaining === null ? eatenKcal : Math.abs(remaining))}</strong>
        <span>{remaining === null ? 'kcal eaten' : over ? 'kcal over' : 'kcal left'}</span>
      </div>
    </div>
  );
}
