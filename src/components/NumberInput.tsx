import { useEffect, useState } from 'react';
import { formatNumber } from '../domain/format';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  allowDecimals: boolean;
  placeholder?: string;
  label: string;
  className?: string;
  /** Values above this are shown as invalid and not reported. */
  max?: number;
}

function parse(text: string, allowDecimals: boolean, max: number = Number.POSITIVE_INFINITY): number | null | 'invalid' {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const pattern = allowDecimals ? /^\d*\.?\d*$/ : /^\d+$/;
  if (!pattern.test(trimmed) || trimmed === '.') return 'invalid';
  const parsed = Number(trimmed);
  return parsed > max ? 'invalid' : parsed;
}

/**
 * Numeric text field that keeps the user's raw text while typing (so "82." stays visible)
 * and reports a parsed number, or null when empty. Invalid text is not reported.
 */
export function NumberInput({ value, onChange, allowDecimals, placeholder, label, className, max }: Props) {
  const [text, setText] = useState(value === null ? '' : formatNumber(value));

  // Follow outside changes (e.g. prefill) without clobbering text that already means the same number.
  useEffect(() => {
    const parsed = parse(text, allowDecimals, max);
    if (parsed !== value) {
      setText(value === null ? '' : formatNumber(value));
    }
    // Only react to the external value, not to local typing.
  }, [value]);

  const invalid = parse(text, allowDecimals, max) === 'invalid';

  return (
    <input
      className={`number-input ${invalid ? 'invalid' : ''} ${className ?? ''}`}
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onFocus={(event) => event.target.select()}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = parse(event.target.value, allowDecimals, max);
        if (parsed !== 'invalid') {
          onChange(parsed);
        }
      }}
    />
  );
}

interface DurationProps {
  valueSec: number | null;
  onChange: (valueSec: number | null) => void;
  label: string;
}

/** Minutes and seconds fields for a duration stored in seconds. */
export function DurationInput({ valueSec, onChange, label }: DurationProps) {
  const minutes = valueSec === null ? null : Math.floor(valueSec / 60);
  const seconds = valueSec === null ? null : valueSec % 60;
  const combine = (m: number | null, s: number | null) => (m === null && s === null ? null : (m ?? 0) * 60 + (s ?? 0));
  return (
    <span className="duration-input">
      <NumberInput value={minutes} onChange={(m) => onChange(combine(m, seconds))} allowDecimals={false} placeholder="min" label={`${label} minutes`} />
      <span className="duration-sep">:</span>
      <NumberInput value={seconds} onChange={(s) => onChange(combine(minutes, s))} allowDecimals={false} max={59} placeholder="sec" label={`${label} seconds`} />
    </span>
  );
}
