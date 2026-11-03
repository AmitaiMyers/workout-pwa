import { describe, expect, it } from 'vitest';
import { formatDuration, formatDurationWords } from './format';

describe('formatDurationWords', () => {
  it.each([
    [40, '40s'],
    [45 * 60, '45m'],
    [3600, '1h 00m'],
    [3900, '1h 05m'],
    [2 * 3600 + 59 * 60 + 40, '3h 00m'],
  ])('%s seconds → %s', (seconds, text) => {
    expect(formatDurationWords(seconds)).toBe(text);
  });
});

describe('formatDuration', () => {
  it('uses m:ss under an hour and h:mm:ss above', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
