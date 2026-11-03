interface Bar {
  label: string;
  value: number;
}

interface Props {
  bars: readonly Bar[];
  /** Optional dashed goal line. */
  target: number | null;
  formatValue: (value: number) => string;
  label: string;
}

const WIDTH = 320;
const HEIGHT = 170;
const PAD = { top: 18, right: 6, bottom: 22, left: 6 };

/** Simple daily bars with an optional target line; bars above the target are highlighted. */
export function BarChart({ bars, target, formatValue, label }: Props) {
  const max = Math.max(1, target ?? 0, ...bars.map((bar) => bar.value)) * 1.08;
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerWidth / Math.max(1, bars.length);
  const barWidth = Math.max(2, slot * 0.68);
  const toY = (value: number) => PAD.top + innerHeight - (value / max) * innerHeight;
  // Label every bar for a week, about weekly for longer ranges.
  const labelEvery = bars.length <= 8 ? 1 : 7;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
        {bars.map((bar, index) => {
          const x = PAD.left + index * slot + (slot - barWidth) / 2;
          const over = target !== null && bar.value > target;
          return (
            <g key={`${bar.label}-${index}`}>
              {bar.value > 0 && <rect x={x} y={toY(bar.value)} width={barWidth} height={PAD.top + innerHeight - toY(bar.value)} rx={2} className={over ? 'bar bar-over' : 'bar'} />}
              {index % labelEvery === bars.length % labelEvery || index === bars.length - 1 ? (
                <text x={x + barWidth / 2} y={HEIGHT - 6} textAnchor="middle" className="chart-label">
                  {bar.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {target !== null && (
          <>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={toY(target)} y2={toY(target)} className="chart-target" />
            <text x={WIDTH - PAD.right} y={toY(target) - 4} textAnchor="end" className="chart-label">
              target {formatValue(target)}
            </text>
          </>
        )}
      </svg>
    </figure>
  );
}
