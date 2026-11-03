import { useEffect } from 'react';

/**
 * Keep the screen on while `enabled` (e.g. during a workout, so the phone doesn't lock between sets).
 * Browsers release the lock whenever the page is hidden, so it is re-acquired on return.
 * Browsers without the Screen Wake Lock API simply keep their normal screen timeout.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      return undefined;
    }
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const acquire = () => {
      const holding = sentinel !== null && !sentinel.released;
      if (holding || document.visibilityState !== 'visible') {
        return;
      }
      void navigator.wakeLock.request('screen').then(
        (lock) => {
          if (disposed) {
            void lock.release();
            return;
          }
          sentinel = lock;
        },
        // The browser may refuse (battery saver, Low Power Mode); the screen then times out normally.
        (refusal: DOMException) => console.info(`Screen wake lock not granted: ${refusal.message}`),
      );
    };

    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      if (sentinel !== null && !sentinel.released) {
        void sentinel.release();
      }
    };
  }, [enabled]);
}
