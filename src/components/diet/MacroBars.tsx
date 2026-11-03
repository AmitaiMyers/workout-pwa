import { formatGrams } from '../../domain/format';
import type { Macros } from '../../domain/nutrition/foodTypes';

interface Props {
  eaten: Macros;
  targets: Macros | null;
}

const MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
] as const;

export function MacroBars({ eaten, targets }: Props) {
  return (
    <div className="macro-bars">
      {MACROS.map(({ key, label }) => {
        const target = targets === null ? null : targets[key];
        const share = target === null || target === 0 ? 0 : eaten[key] / target;
        return (
          <div key={key} className={`macro-bar macro-${key}`}>
            <div className="macro-bar-head">
              <span>{label}</span>
              <span className="muted small">
                {formatGrams(eaten[key])}
                {target === null ? '' : ` / ${formatGrams(target)}`}
              </span>
            </div>
            <div className="macro-bar-track">
              <div className="macro-bar-fill" style={{ transform: `scaleX(${Math.min(1, share)})` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
