import type { SetEntry, TrackingType } from './types';

/** Trim needless decimals: 80 -> "80", 82.5 -> "82.5", 82.25 -> "82.25". */
export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function formatWeight(kg: number): string {
  return `${formatNumber(kg)} kg`;
}

/** Seconds as m:ss, or h:mm:ss when an hour or longer. */
export function formatDuration(totalSec: number): string {
  const rounded = Math.round(totalSec);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

export function formatPace(secPerKm: number): string {
  return `${formatDuration(secPerKm)} /km`;
}

export function formatDistance(km: number): string {
  return `${formatNumber(km)} km`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export function formatDate(epochMs: number): string {
  return dateFormatter.format(epochMs);
}

export function formatShortDate(epochMs: number): string {
  return shortDateFormatter.format(epochMs);
}

export function formatTime(epochMs: number): string {
  return timeFormatter.format(epochMs);
}

export function formatMonth(date: Date): string {
  return monthFormatter.format(date);
}

/** Compact one-line description of a set, e.g. "80 kg × 8", "12 reps", "1:30", "5 km in 25:00". */
export function formatSet(set: SetEntry, tracking: TrackingType): string {
  const show = (value: number | null) => (value === null ? '–' : formatNumber(value));
  switch (tracking) {
    case 'weight_reps':
      return `${show(set.weightKg)} kg × ${show(set.reps)}`;
    case 'reps':
      return `${show(set.reps)} reps`;
    case 'time':
      return set.durationSec === null ? '–' : formatDuration(set.durationSec);
    case 'distance_time':
      return `${show(set.distanceKm)} km in ${set.durationSec === null ? '–' : formatDuration(set.durationSec)}`;
  }
}
