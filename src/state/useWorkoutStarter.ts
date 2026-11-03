import { useNavigate } from 'react-router';
import type { Template, Workout } from '../domain/types';
import { startEmptyWorkout, startWorkoutFromTemplate } from '../domain/workoutFactory';
import { listWorkouts } from '../storage/db';
import { useActiveWorkout } from './ActiveWorkoutContext';

/** Start a workout (asking before replacing one in progress) and open the workout screen. */
export function useWorkoutStarter() {
  const active = useActiveWorkout();
  const navigate = useNavigate();

  const begin = async (build: (history: Workout[]) => Workout, scheduleId: string | null) => {
    if (active.session) {
      const replace = window.confirm(`"${active.session.workout.name}" is still in progress. Discard it and start a new workout?`);
      if (!replace) {
        navigate('/workout');
        return;
      }
      await active.discard();
    }
    const history = await listWorkouts();
    active.start(build(history), scheduleId);
    navigate('/workout');
  };

  return {
    startEmpty: () => begin(() => startEmptyWorkout(Date.now()), null),
    startFromTemplate: (template: Template, scheduleId: string | null) =>
      begin((history) => startWorkoutFromTemplate(template, history, Date.now()), scheduleId),
  };
}
