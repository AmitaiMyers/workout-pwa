import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { assert, required } from '../domain/assert';
import type { ActiveSession, Workout } from '../domain/types';
import { finishWorkout } from '../domain/workoutFactory';
import { clearActiveSession, completeActiveSession, getActiveSession, saveActiveSession } from '../storage/db';
import { playRestDoneAlert, unlockAudio } from './alerts';

/** Don't beep for a rest that ended long ago (e.g. the app was closed during the rest). */
const STALE_ALERT_MS = 5000;

interface ActiveWorkoutApi {
  /** undefined while loading from storage, null when no workout is in progress. */
  session: ActiveSession | null | undefined;
  start: (workout: Workout, scheduleId: string | null) => void;
  updateWorkout: (change: (workout: Workout) => Workout) => void;
  startRest: (seconds: number) => void;
  adjustRest: (deltaSec: number) => void;
  skipRest: () => void;
  /** Saves the workout to history and returns the stored version. */
  finish: () => Promise<Workout>;
  discard: () => Promise<void>;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutApi | null>(null);

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveSession | null | undefined>(undefined);
  // Mirrors `session` synchronously so back-to-back updates compose instead of overwriting each other.
  const sessionRef = useRef<ActiveSession | null | undefined>(undefined);

  useEffect(() => {
    void getActiveSession().then((stored) => {
      sessionRef.current = stored ?? null;
      setSession(stored ?? null);
    });
  }, []);

  const commit = useCallback((next: ActiveSession) => {
    sessionRef.current = next;
    setSession(next);
    void saveActiveSession(next);
  }, []);

  const updateSession = useCallback(
    (change: (current: ActiveSession) => ActiveSession) => {
      commit(change(required(sessionRef.current, 'No workout in progress')));
    },
    [commit],
  );

  const clearLocal = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
  }, []);

  // Fire the rest-done alert when the timer runs out.
  const restEndsAt = session?.rest?.endsAt ?? null;
  useEffect(() => {
    if (restEndsAt === null) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      // The workout may have been finished or the timer changed since this was scheduled.
      if (sessionRef.current?.rest?.endsAt !== restEndsAt) {
        return;
      }
      if (Date.now() - restEndsAt < STALE_ALERT_MS) {
        playRestDoneAlert();
      }
      updateSession((current) => ({ ...current, rest: null }));
    }, Math.max(0, restEndsAt - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [restEndsAt, updateSession]);

  const api = useMemo<ActiveWorkoutApi>(
    () => ({
      session,
      start: (workout, scheduleId) => {
        assert(sessionRef.current === null, 'A workout is already in progress');
        commit({ workout, rest: null, scheduleId });
      },
      updateWorkout: (change) => updateSession((current) => ({ ...current, workout: change(current.workout) })),
      startRest: (seconds) => {
        assert(seconds > 0, 'Rest must be positive');
        unlockAudio();
        updateSession((current) => ({ ...current, rest: { endsAt: Date.now() + seconds * 1000, totalSec: seconds } }));
      },
      adjustRest: (deltaSec) =>
        updateSession((current) => {
          const rest = required(current.rest, 'No rest timer running');
          const endsAt = Math.max(Date.now() + 1000, rest.endsAt + deltaSec * 1000);
          return { ...current, rest: { endsAt, totalSec: Math.max(1, rest.totalSec + deltaSec) } };
        }),
      skipRest: () => updateSession((current) => ({ ...current, rest: null })),
      finish: async () => {
        const current = required(sessionRef.current, 'No workout in progress');
        const finished = finishWorkout(current.workout, Date.now());
        await completeActiveSession(finished, current.scheduleId);
        clearLocal();
        return finished;
      },
      discard: async () => {
        await clearActiveSession();
        clearLocal();
      },
    }),
    [session, commit, updateSession, clearLocal],
  );

  return <ActiveWorkoutContext.Provider value={api}>{children}</ActiveWorkoutContext.Provider>;
}

export function useActiveWorkout(): ActiveWorkoutApi {
  return required(useContext(ActiveWorkoutContext), 'useActiveWorkout must be used inside ActiveWorkoutProvider');
}
