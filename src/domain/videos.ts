/**
 * YouTube demo videos for exercises. Videos are only ever embedded through YouTube's own
 * player (never downloaded), so they need a connection; the stick-figure animation is the fallback.
 */
import type { VideoRef } from './types';

const VIDEO_ID = '[A-Za-z0-9_-]{11}';
const LINK_PATTERNS: readonly RegExp[] = [
  new RegExp(`(?:youtube\\.com|youtube-nocookie\\.com)/(?:watch\\?(?:[^#]*&)?v=|embed/|shorts/|live/|v/)(${VIDEO_ID})(?![A-Za-z0-9_-])`),
  new RegExp(`youtu\\.be/(${VIDEO_ID})(?![A-Za-z0-9_-])`),
];
const BARE_ID = new RegExp(`^${VIDEO_ID}$`);

/** "90", "90s", "1m30s", "1h2m3s" → seconds; null when the text is not a time. */
function parseTimestamp(text: string): number | null {
  if (/^\d+$/.test(text)) {
    return Number(text);
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
  if (match === null || text === '') {
    return null;
  }
  const [, hours, minutes, seconds] = match;
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}

function startFrom(link: string): number {
  const match = /[?&#](?:t|start)=([0-9hms]+)/.exec(link);
  if (match === null) {
    return 0;
  }
  const seconds = parseTimestamp(match[1] ?? '');
  return seconds ?? 0;
}

/**
 * Read a YouTube link (watch, youtu.be, shorts, embed or live URL, or a bare video id)
 * including an optional start time. Returns null when the text is not a YouTube video.
 */
export function parseYouTubeLink(input: string): VideoRef | null {
  const text = input.trim();
  if (BARE_ID.test(text)) {
    return { id: text, startSec: 0 };
  }
  for (const pattern of LINK_PATTERNS) {
    const match = pattern.exec(text);
    if (match !== null && match[1] !== undefined) {
      return { id: match[1], startSec: startFrom(text) };
    }
  }
  return null;
}

export function watchUrl(video: VideoRef): string {
  const start = video.startSec > 0 ? `&t=${video.startSec}s` : '';
  return `https://www.youtube.com/watch?v=${video.id}${start}`;
}

/**
 * Privacy-enhanced embed that plays like a GIF: muted, inline, looping.
 * YouTube restarts a looped video from 0, so `start` only applies to the first play.
 */
export function embedUrl(video: VideoRef): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: video.id,
    playsinline: '1',
    rel: '0',
    start: String(video.startSec),
  });
  return `https://www.youtube-nocookie.com/embed/${video.id}?${params.toString()}`;
}

const video = (id: string): VideoRef => ({ id, startSec: 0 });

/** Default demo videos for built-in exercises, keyed by exercise id. Users can override any of them. */
export const BUILT_IN_VIDEOS: Readonly<Record<string, VideoRef>> = {
  // CrossFit channel
  'bench-press': video('XSza8hVTlmM'),
  'push-up': video('0pkjOk0EiAk'),
  dip: video('Vt0lO4jpIDo'),
  deadlift: video('1ZXobu7JvvE'),
  'back-squat': video('ultWZbUMPL8'),
  'front-squat': video('m4ytaCJZpl0'),
  lunge: video('7EmwtpAI8cM'),
  'overhead-press': video('xe19t2_6yis'),
  'kettlebell-swing': video('vdezTMulJ-k'),
  // CrossFit affiliates
  'goblet-squat': video('OwAh0sBFpec'),
  'barbell-row': video('rrJuozeA2yk'),
  'hip-thrust': video('0WqJd_3REWc'),
  // Concept2
  rowing: video('QPvYrfyGHi8'),
  // Other coaching channels
  'pull-up': video('HRV5YKKaeVw'),
  'dumbbell-bench-press': video('J-gWN5hYwRU'),
  'incline-bench-press': video('-oUEe4jUjVE'),
  'dumbbell-row': video('fURsHPHgssI'),
  'chin-up': video('4-ip28UD01U'),
  'lat-pulldown': video('RTNmVfnRitA'),
  'seated-cable-row': video('EU7bOadUsNI'),
  'romanian-deadlift': video('GZAKFRNtxLY'),
  'bulgarian-split-squat': video('iwV9rTHKrOg'),
  'leg-press': video('cDGOn-yfKJA'),
  'leg-extension': video('MXvSzXEBOTI'),
  'leg-curl': video('SbSNUXPRkc8'),
  'calf-raise': video('wxwY7GXxL4k'),
  'dumbbell-shoulder-press': video('WKEl69bIGus'),
  'lateral-raise': video('OK1k6NdNo1I'),
  'front-raise': video('2ZS1Ae5n90M'),
  'barbell-curl': video('dDI8ClxRS04'),
  'dumbbell-curl': video('nBzLCE-dcRQ'),
  'hammer-curl': video('3nqezx8BEv0'),
  'triceps-pushdown': video('IBGvZUzoQiQ'),
  'overhead-triceps-extension': video('jgeabBxnSVc'),
  plank: video('3QZlgJ40LfU'),
  crunch: video('GWIEON0VSaY'),
  'hanging-leg-raise': video('-LHetdLNhjI'),
  running: video('kHD1NaSdwzI'),
  'stationary-bike': video('qJb-FOTPT4Q'),
};
