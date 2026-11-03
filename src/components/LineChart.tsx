import { formatShortDate } from '../domain/format';

export interface ChartPoint {
  x: number;
  y: number;
}

interface Props {
  points: readonly ChartPoint[];
  formatY: (value: number) => string;
  label: string;
}

const WIDTH = 320;
const HEIGHT = 160;
const PAD = { top: 16, right: 12, bottom: 24, left: 12 };

/** Minimal SVG line chart over time. Needs at least two points to draw a line. */
export function LineChart({ points, formatY, label }: Props) {
  if (points.length < 2) {
    return <p className="muted">Log this exercise in at least two workouts to see a trend.</p>;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const toX = (x: number) => PAD.left + ((x - minX) / spanX) * (WIDTH - PAD.left - PAD.right);
  const toY = (y: number) => HEIGHT - PAD.bottom - ((y - minY) / spanY) * (HEIGHT - PAD.top - PAD.bottom);
  const path = points.map((point) => `${toX(point.x)},${toY(point.y)}`).join(' ');

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={toY(maxY)} y2={toY(maxY)} className="chart-grid" />
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={toY(minY)} y2={toY(minY)} className="chart-grid" />
        <text x={WIDTH - PAD.right} y={toY(maxY) - 4} textAnchor="end" className="chart-label">
          {formatY(maxY)}
        </text>
        <text x={WIDTH - PAD.right} y={toY(minY) - 4} textAnchor="end" className="chart-label">
          {formatY(minY)}
        </text>
        <polyline points={path} className="chart-line" />
        {points.map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={toX(point.x)} cy={toY(point.y)} r={3} className="chart-dot" />
        ))}
        <text x={PAD.left} y={HEIGHT - 6} className="chart-label">
          {formatShortDate(minX)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="chart-label">
          {formatShortDate(maxX)}
        </text>
      </svg>
    </figure>
  );
}
