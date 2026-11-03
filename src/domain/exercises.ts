import type { Equipment, Exercise, MuscleGroup, TrackingType } from './types';

const REST = { compound: 120, isolation: 90, short: 60 } as const;

interface BuiltInInput {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  equipment: Equipment;
  tracking: TrackingType;
  rest: number;
  cues: string[];
  /** Defaults to the exercise id; set when several exercises share one animation. */
  animationId?: string;
}

function builtIn(input: BuiltInInput): Exercise {
  return {
    id: input.id,
    name: input.name,
    muscles: input.muscles,
    equipment: input.equipment,
    tracking: input.tracking,
    cues: input.cues,
    defaultRestSec: input.rest,
    animationId: input.animationId ?? input.id,
    isCustom: false,
  };
}

export const BUILT_IN_EXERCISES: readonly Exercise[] = [
  // Chest
  builtIn({ id: 'bench-press', name: 'Bench Press (Barbell)', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Shoulder blades squeezed and down', 'Lower the bar to mid-chest', 'Drive feet into the floor and press up'] }),
  builtIn({ id: 'dumbbell-bench-press', name: 'Bench Press (Dumbbell)', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Dumbbells over the shoulders at the top', 'Elbows about 45° from the torso', 'Control the descent to chest level'] }),
  builtIn({ id: 'incline-bench-press', name: 'Incline Bench Press (Barbell)', muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Bench at 30–45°', 'Touch the bar to the upper chest', 'Keep wrists stacked over elbows'] }),
  builtIn({ id: 'push-up', name: 'Push-Up', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Bodyweight', tracking: 'reps', rest: REST.short, cues: ['Body in one straight line', 'Hands just outside shoulder width', 'Chest close to the floor each rep'] }),
  builtIn({ id: 'dip', name: 'Dip', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Bodyweight', tracking: 'reps', rest: REST.isolation, cues: ['Start with arms locked out', 'Lower until upper arms are parallel to the floor', 'Elbows track back, not out'] }),
  // Back
  builtIn({ id: 'deadlift', name: 'Deadlift (Barbell)', muscles: ['Back', 'Hamstrings', 'Glutes'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Bar over mid-foot', 'Brace and keep a neutral spine', 'Push the floor away, then lock hips and knees together'] }),
  builtIn({ id: 'barbell-row', name: 'Bent-Over Row (Barbell)', muscles: ['Back', 'Biceps'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Hinge until the torso is near horizontal', 'Pull the bar to the lower ribs', 'Keep the torso still'] }),
  builtIn({ id: 'dumbbell-row', name: 'One-Arm Row (Dumbbell)', muscles: ['Back', 'Biceps'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Support hand on the bench, flat back', 'Pull the elbow toward the hip', 'Pause at the top'] }),
  builtIn({ id: 'pull-up', name: 'Pull-Up', muscles: ['Back', 'Biceps'], equipment: 'Bodyweight', tracking: 'reps', rest: REST.compound, cues: ['Overhand grip, slightly wider than shoulders', 'Start from a dead hang', 'Chin over the bar'] }),
  builtIn({ id: 'chin-up', name: 'Chin-Up', muscles: ['Back', 'Biceps'], equipment: 'Bodyweight', tracking: 'reps', rest: REST.compound, cues: ['Underhand grip, shoulder width', 'Pull the chest toward the bar', 'Lower all the way down'], animationId: 'pull-up' }),
  builtIn({ id: 'lat-pulldown', name: 'Lat Pulldown (Cable)', muscles: ['Back', 'Biceps'], equipment: 'Cable', tracking: 'weight_reps', rest: REST.isolation, cues: ['Thighs locked under the pad', 'Pull the bar to the upper chest', 'Lead with the elbows'] }),
  builtIn({ id: 'seated-cable-row', name: 'Seated Row (Cable)', muscles: ['Back', 'Biceps'], equipment: 'Cable', tracking: 'weight_reps', rest: REST.isolation, cues: ['Sit tall, slight knee bend', 'Pull the handle to the stomach', 'Squeeze the shoulder blades together'] }),
  // Legs
  builtIn({ id: 'back-squat', name: 'Back Squat (Barbell)', muscles: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Bar on the upper back, brace the core', 'Sit down between the hips, knees track over toes', 'Reach at least parallel, drive up'] }),
  builtIn({ id: 'front-squat', name: 'Front Squat (Barbell)', muscles: ['Quads', 'Glutes', 'Core'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Bar on the front of the shoulders, elbows high', 'Stay upright', 'Full depth, then drive up'] }),
  builtIn({ id: 'goblet-squat', name: 'Goblet Squat (Dumbbell)', muscles: ['Quads', 'Glutes'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Hold the dumbbell at the chest', 'Elbows inside the knees at the bottom', 'Chest up throughout'] }),
  builtIn({ id: 'romanian-deadlift', name: 'Romanian Deadlift (Barbell)', muscles: ['Hamstrings', 'Glutes', 'Back'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Soft knees, push the hips back', 'Bar slides down the thighs', 'Stop when the hamstrings are stretched'] }),
  builtIn({ id: 'lunge', name: 'Lunge (Dumbbell)', muscles: ['Quads', 'Glutes'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Long stride, torso upright', 'Back knee drops toward the floor', 'Push through the front heel'] }),
  builtIn({ id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat (Dumbbell)', muscles: ['Quads', 'Glutes'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Rear foot laces-down on the bench', 'Drop straight down', 'Front knee tracks over the toes'] }),
  builtIn({ id: 'leg-press', name: 'Leg Press (Machine)', muscles: ['Quads', 'Glutes'], equipment: 'Machine', tracking: 'weight_reps', rest: REST.compound, cues: ['Feet shoulder width on the platform', 'Lower until knees reach about 90°', 'Do not lock the knees hard at the top'] }),
  builtIn({ id: 'leg-extension', name: 'Leg Extension (Machine)', muscles: ['Quads'], equipment: 'Machine', tracking: 'weight_reps', rest: REST.isolation, cues: ['Pad just above the ankles', 'Extend fully and squeeze', 'Lower slowly'] }),
  builtIn({ id: 'leg-curl', name: 'Lying Leg Curl (Machine)', muscles: ['Hamstrings'], equipment: 'Machine', tracking: 'weight_reps', rest: REST.isolation, cues: ['Hips pressed into the pad', 'Curl the heels toward the glutes', 'Control the way down'] }),
  builtIn({ id: 'hip-thrust', name: 'Hip Thrust (Barbell)', muscles: ['Glutes', 'Hamstrings'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Upper back on the bench edge', 'Chin tucked, drive through the heels', 'Hips to full extension, pause'] }),
  builtIn({ id: 'calf-raise', name: 'Standing Calf Raise (Dumbbell)', muscles: ['Calves'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.short, cues: ['Rise onto the balls of the feet', 'Pause at the top', 'Lower all the way down'] }),
  // Shoulders
  builtIn({ id: 'overhead-press', name: 'Overhead Press (Barbell)', muscles: ['Shoulders', 'Triceps'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.compound, cues: ['Squeeze the glutes, brace', 'Move the head back, press straight up', 'Lock out with the bar over the mid-foot'] }),
  builtIn({ id: 'dumbbell-shoulder-press', name: 'Seated Shoulder Press (Dumbbell)', muscles: ['Shoulders', 'Triceps'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Back against the pad', 'Start with dumbbells at shoulder height', 'Press up without clanking at the top'] }),
  builtIn({ id: 'lateral-raise', name: 'Lateral Raise (Dumbbell)', muscles: ['Shoulders'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.short, cues: ['Slight bend in the elbows', 'Raise out to the sides to shoulder height', 'Lead with the elbows'] }),
  builtIn({ id: 'front-raise', name: 'Front Raise (Dumbbell)', muscles: ['Shoulders'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.short, cues: ['Arms nearly straight', 'Raise to shoulder height', 'No swinging'] }),
  // Arms
  builtIn({ id: 'barbell-curl', name: 'Biceps Curl (Barbell)', muscles: ['Biceps'], equipment: 'Barbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Elbows pinned to the sides', 'Curl to the shoulders', 'Lower under control'] }),
  builtIn({ id: 'dumbbell-curl', name: 'Biceps Curl (Dumbbell)', muscles: ['Biceps'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Alternate arms', 'Turn the palm up as you curl', 'Keep the upper arm still'] }),
  builtIn({ id: 'hammer-curl', name: 'Hammer Curl (Dumbbell)', muscles: ['Biceps'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Neutral grip, thumbs up', 'Elbows at the sides', 'Squeeze at the top'] }),
  builtIn({ id: 'triceps-pushdown', name: 'Triceps Pushdown (Cable)', muscles: ['Triceps'], equipment: 'Cable', tracking: 'weight_reps', rest: REST.isolation, cues: ['Elbows tucked to the sides', 'Push down to full lockout', 'Only the forearms move'] }),
  builtIn({ id: 'overhead-triceps-extension', name: 'Overhead Triceps Extension (Dumbbell)', muscles: ['Triceps'], equipment: 'Dumbbell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Elbows point to the ceiling', 'Lower the dumbbell behind the head', 'Extend fully'] }),
  // Core
  builtIn({ id: 'plank', name: 'Plank', muscles: ['Core'], equipment: 'Bodyweight', tracking: 'time', rest: REST.short, cues: ['Elbows under the shoulders', 'Squeeze glutes and brace', 'Do not let the hips sag'] }),
  builtIn({ id: 'crunch', name: 'Crunch', muscles: ['Core'], equipment: 'Bodyweight', tracking: 'reps', rest: REST.short, cues: ['Knees bent, feet flat', 'Curl the shoulders off the floor', 'Exhale at the top'] }),
  builtIn({ id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscles: ['Core'], equipment: 'Bodyweight', tracking: 'reps', rest: REST.short, cues: ['Dead hang, no swinging', 'Raise straight legs to hip height', 'Lower slowly'] }),
  // Full body / cardio
  builtIn({ id: 'kettlebell-swing', name: 'Kettlebell Swing', muscles: ['Glutes', 'Hamstrings', 'Core'], equipment: 'Kettlebell', tracking: 'weight_reps', rest: REST.isolation, cues: ['Hinge, do not squat', 'Snap the hips forward', 'Arms just guide the bell to chest height'] }),
  builtIn({ id: 'running', name: 'Running (Treadmill)', muscles: ['Cardio'], equipment: 'Machine', tracking: 'distance_time', rest: REST.short, cues: ['Tall posture', 'Land under the hips', 'Relaxed shoulders'] }),
  builtIn({ id: 'rowing', name: 'Rowing (Machine)', muscles: ['Cardio', 'Back'], equipment: 'Machine', tracking: 'distance_time', rest: REST.short, cues: ['Legs, then body, then arms', 'Reverse on the way back', 'Drive with the legs'] }),
  builtIn({ id: 'stationary-bike', name: 'Cycling (Stationary Bike)', muscles: ['Cardio', 'Quads'], equipment: 'Machine', tracking: 'distance_time', rest: REST.short, cues: ['Saddle at hip height', 'Slight knee bend at the bottom', 'Steady cadence'] }),
];
