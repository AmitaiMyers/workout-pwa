/** How a movement is measured. Decides which inputs a set shows and which records exist. */
export type TrackingType = 'weight_reps' | 'reps' | 'time' | 'distance_time';

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Kettlebell', 'Cable', 'Machine', 'Bodyweight'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Exercise {
  id: string;
  name: string;
  /** First entry is the primary muscle. */
  muscles: MuscleGroup[];
  equipment: Equipment;
  tracking: TrackingType;
  cues: string[];
  defaultRestSec: number;
  /** Key into the animation library; null for custom exercises. */
  animationId: string | null;
  isCustom: boolean;
}

export interface SetEntry {
  id: string;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceKm: number | null;
  rpe: number | null;
  note: string;
  isWarmup: boolean;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  name: string;
  /** Epoch milliseconds. */
  startedAt: number;
  /** Epoch milliseconds; null while the workout is in progress. */
  finishedAt: number | null;
  exercises: WorkoutExercise[];
  note: string;
}

export interface RestTimer {
  /** Epoch milliseconds when the rest ends. */
  endsAt: number;
  totalSec: number;
}

/** The in-progress workout, persisted so it survives closing the app. */
export interface ActiveSession {
  workout: Workout;
  rest: RestTimer | null;
  /** The calendar entry this workout fulfils, if it was started from one. */
  scheduleId: string | null;
}

export interface TemplateExercise {
  exerciseId: string;
  setCount: number;
}

export interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

export interface ScheduleEntry {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  templateId: string;
  /** Set once a workout started from this entry is finished. */
  workoutId: string | null;
}

export interface RestOverride {
  exerciseId: string;
  restSec: number;
}

/** A YouTube video and where to start playing it. */
export interface VideoRef {
  id: string;
  startSec: number;
}

/** The user's choice of video for an exercise; `video: null` means "no video" (removed on purpose). */
export interface VideoOverride {
  exerciseId: string;
  video: VideoRef | null;
}
