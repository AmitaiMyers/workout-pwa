/**
 * Rest-timer alert: a short beep pattern plus vibration where supported.
 * Browsers (iOS especially) only allow audio after a user gesture, so `unlockAudio`
 * must be called from a tap handler before the first alert.
 */
let audioContext: AudioContext | null = null;

export function unlockAudio(): void {
  if (audioContext === null) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
}

function beep(context: AudioContext, startAt: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.4, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.3);
}

/** Vibrate where supported. iOS browsers don't expose vibration to web pages, so it is feature-detected. */
function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export function playRestDoneAlert(): void {
  const context = audioContext;
  if (context !== null) {
    [0, 0.35, 0.7].forEach((offset) => beep(context, context.currentTime + offset));
  }
  vibrate([200, 100, 200, 100, 200]);
}

/** A short tap of feedback when a set is ticked done. */
export function buzzSetDone(): void {
  vibrate(40);
}
