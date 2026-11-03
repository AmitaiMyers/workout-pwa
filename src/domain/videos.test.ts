import { describe, expect, it } from 'vitest';
import { BUILT_IN_EXERCISES } from './exercises';
import { BUILT_IN_VIDEOS, embedUrl, parseYouTubeLink, watchUrl } from './videos';

describe('parseYouTubeLink', () => {
  it.each([
    ['https://www.youtube.com/watch?v=1ZXobu7JvvE', '1ZXobu7JvvE'],
    ['https://www.youtube.com/watch?v=1ZXobu7JvvE&list=PLdWvFCOAvyr3EWQhtfcEMd3DVM5sJdPL4&index=8', '1ZXobu7JvvE'],
    ['https://m.youtube.com/watch?feature=share&v=-LHetdLNhjI', '-LHetdLNhjI'],
    ['https://youtu.be/1ZXobu7JvvE', '1ZXobu7JvvE'],
    ['https://youtube.com/shorts/oyFfjMTAbEk?si=abc', 'oyFfjMTAbEk'],
    ['https://www.youtube.com/embed/cRWACB-A_EY', 'cRWACB-A_EY'],
    ['https://www.youtube-nocookie.com/embed/cRWACB-A_EY?start=5', 'cRWACB-A_EY'],
    ['  1ZXobu7JvvE  ', '1ZXobu7JvvE'],
  ])('reads the id from %s', (link, id) => {
    expect(parseYouTubeLink(link)?.id).toBe(id);
  });

  it.each([
    ['https://youtu.be/1ZXobu7JvvE?t=90', 90],
    ['https://www.youtube.com/watch?v=1ZXobu7JvvE&t=1m30s', 90],
    ['https://www.youtube.com/watch?v=1ZXobu7JvvE&t=45s', 45],
    ['https://www.youtube.com/embed/1ZXobu7JvvE?start=12', 12],
    ['https://www.youtube.com/watch?v=1ZXobu7JvvE', 0],
  ])('reads the start time from %s', (link, startSec) => {
    expect(parseYouTubeLink(link)?.startSec).toBe(startSec);
  });

  it.each(['', 'hello', 'https://vimeo.com/123456789', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/@CrossFit'])(
    'rejects %s',
    (link) => {
      expect(parseYouTubeLink(link)).toBeNull();
    },
  );
});

describe('video URLs', () => {
  it('builds a muted, looping, inline privacy-enhanced embed', () => {
    const url = new URL(embedUrl({ id: '1ZXobu7JvvE', startSec: 10 }));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/1ZXobu7JvvE');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ autoplay: '1', mute: '1', loop: '1', playlist: '1ZXobu7JvvE', playsinline: '1', start: '10' });
  });

  it('round-trips a watch URL through the parser', () => {
    const video = { id: '1ZXobu7JvvE', startSec: 75 };
    expect(parseYouTubeLink(watchUrl(video))).toEqual(video);
  });
});

describe('BUILT_IN_VIDEOS', () => {
  it('covers every built-in exercise with a valid video id', () => {
    for (const exercise of BUILT_IN_EXERCISES) {
      const video = BUILT_IN_VIDEOS[exercise.id];
      expect(video, exercise.id).toBeDefined();
      expect(video?.id, exercise.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
    }
  });

  it('only refers to exercises that exist', () => {
    const ids = new Set(BUILT_IN_EXERCISES.map((exercise) => exercise.id));
    expect(Object.keys(BUILT_IN_VIDEOS).filter((id) => !ids.has(id))).toEqual([]);
  });
});
