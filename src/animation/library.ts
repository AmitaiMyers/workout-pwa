/**
 * Original stick-figure animations for the built-in exercises.
 * Coordinates live in a 100x100 view box; see kinematics.ts for the angle convention.
 */
import { assert } from '../domain/assert';
import type { Bend, LimbJoints, LimbSpec, Pose, Vec, View } from './kinematics';

export const FLOOR_Y = 91.5;
const ANKLE_Y = 89;
/** Pelvis height for a figure standing straight with feet on the floor. */
const STAND_Y = ANKLE_Y - 36 + 0.4;

export type JointRef = `${keyof LimbJoints}${'N' | 'F'}` | 'pelvis' | 'chest' | 'head';

export type Prop =
  | { kind: 'barbell'; at: JointRef }
  | { kind: 'dumbbell'; at: JointRef }
  | { kind: 'kettlebell'; at: JointRef }
  | { kind: 'roller'; at: JointRef }
  | { kind: 'sled'; at: JointRef; angle: number }
  | { kind: 'cable'; at: JointRef; anchor: Vec }
  | { kind: 'line'; from: Vec; to: Vec; width: number }
  | { kind: 'circle'; center: Vec; radius: number };

export interface AnimationSpec {
  view: View;
  durationMs: number;
  frames: Pose[];
  props: Prop[];
}

// ---------- pose authoring helpers ----------

const ang = (upper: number, lower: number): LimbSpec => ({ kind: 'angles', upper, lower });
const reach = (x: number, y: number, bend: Bend): LimbSpec => ({ kind: 'reach', target: [x, y], bend });

interface PoseInput {
  pelvis: Vec;
  torso: number;
  /** Defaults to the torso angle (head in line with the spine). */
  neck?: number;
  arm: LimbSpec;
  /** Defaults to `arm` in side view and to its mirror image in front view. */
  armFar?: LimbSpec;
  leg: LimbSpec;
  foot: number;
  legFar?: LimbSpec;
  footFar?: number;
}

function mirrorLimb(limb: LimbSpec, axisX: number): LimbSpec {
  if (limb.kind === 'angles') {
    return { kind: 'angles', upper: -limb.upper, lower: -limb.lower };
  }
  return {
    kind: 'reach',
    target: [2 * axisX - limb.target[0], limb.target[1]],
    bend: limb.bend === 'cw' ? 'ccw' : 'cw',
  };
}

function side(input: PoseInput): Pose {
  return {
    pelvis: input.pelvis,
    torso: input.torso,
    neck: input.neck ?? input.torso,
    armNear: { limb: input.arm },
    armFar: { limb: input.armFar ?? input.arm },
    legNear: { limb: input.leg, foot: input.foot },
    legFar: { limb: input.legFar ?? input.leg, foot: input.footFar ?? input.foot },
  };
}

function front(input: PoseInput): Pose {
  const axisX = input.pelvis[0];
  return {
    pelvis: input.pelvis,
    torso: input.torso,
    neck: input.neck ?? input.torso,
    armNear: { limb: input.arm },
    armFar: { limb: input.armFar ?? mirrorLimb(input.arm, axisX) },
    legNear: { limb: input.leg, foot: input.foot },
    legFar: { limb: input.legFar ?? mirrorLimb(input.leg, axisX), foot: input.footFar ?? -input.foot },
  };
}

/** Feet planted at a fixed spot, knees bending forward. */
const plantedLeg = (x: number): LimbSpec => reach(x, ANKLE_Y, 'ccw');

const bench = (x1: number, x2: number, topY: number): Prop[] => [
  { kind: 'line', from: [x1, topY], to: [x2, topY], width: 3.5 },
  { kind: 'line', from: [x1 + 3, topY], to: [x1 + 3, FLOOR_Y], width: 1.5 },
  { kind: 'line', from: [x2 - 3, topY], to: [x2 - 3, FLOOR_Y], width: 1.5 },
];

const seat = (x1: number, x2: number, topY: number): Prop[] => [
  { kind: 'line', from: [x1, topY], to: [x2, topY], width: 3.5 },
  { kind: 'line', from: [(x1 + x2) / 2, topY], to: [(x1 + x2) / 2, FLOOR_Y], width: 2 },
];

const pullUpBar = (y: number): Prop[] => [
  { kind: 'line', from: [36, y], to: [68, y], width: 2.5 },
  { kind: 'line', from: [66, y], to: [66, FLOOR_Y], width: 1.5 },
];

// ---------- shared movements ----------

function squatFrames(top: Omit<PoseInput, 'leg' | 'foot'>, bottom: Omit<PoseInput, 'leg' | 'foot'>, footX: number): Pose[] {
  return [side({ ...top, leg: plantedLeg(footX), foot: 90 }), side({ ...bottom, leg: plantedLeg(footX), foot: 90 })];
}

const benchPressFrames: Pose[] = [
  side({ pelvis: [62, 62], torso: 270, neck: 270, arm: reach(39, 37.5, 'cw'), leg: reach(78, ANKLE_Y, 'ccw'), foot: 90 }),
  side({ pelvis: [62, 62], torso: 270, neck: 270, arm: reach(41, 58, 'cw'), leg: reach(78, ANKLE_Y, 'ccw'), foot: 90 }),
];
const benchPressProps: Prop[] = bench(24, 70, 65.5);

const inclinePressFrames: Pose[] = [
  side({ pelvis: [60, 68], torso: 300, neck: 305, arm: reach(42, 31, 'cw'), leg: reach(78, ANKLE_Y, 'ccw'), foot: 90 }),
  side({ pelvis: [60, 68], torso: 300, neck: 305, arm: reach(43, 54, 'cw'), leg: reach(78, ANKLE_Y, 'ccw'), foot: 90 }),
];
const inclineBenchProps: Prop[] = [
  { kind: 'line', from: [59, 72], to: [34, 57.5], width: 3.5 },
  { kind: 'line', from: [59, 72], to: [70, 72], width: 3.5 },
  { kind: 'line', from: [62, 72], to: [62, FLOOR_Y], width: 2 },
  { kind: 'line', from: [40, 61], to: [40, FLOOR_Y], width: 1.5 },
];

const pullUpFrames: Pose[] = [
  side({ pelvis: [47, 56], torso: 355, arm: reach(52, 7, 'cw'), leg: ang(170, 210), foot: 110 }),
  side({ pelvis: [47, 39], torso: 350, arm: reach(52, 7, 'cw'), leg: ang(170, 210), foot: 110 }),
];

const curlFrames: Pose[] = [
  side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(178, 175), leg: plantedLeg(50), foot: 90 }),
  side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(176, 25), leg: plantedLeg(50), foot: 90 }),
];

const overheadPressFrames = (bottom: Vec, top: Vec): Pose[] => [
  side({ pelvis: [50, STAND_Y], torso: 0, neck: 345, arm: reach(bottom[0], bottom[1], 'cw'), leg: plantedLeg(50), foot: 90 }),
  side({ pelvis: [50, STAND_Y], torso: 0, neck: 5, arm: reach(top[0], top[1], 'cw'), leg: plantedLeg(50), foot: 90 }),
];

function bikeFrames(): Pose[] {
  const crank: Vec = [56, 79];
  const crankRadius = 7;
  const steps = 8;
  const frames: Pose[] = [];
  for (let i = 0; i < steps; i += 1) {
    const nearAngle = (360 / steps) * i;
    const nearPedal = [crank[0] + crankRadius * Math.sin((nearAngle * Math.PI) / 180), crank[1] - crankRadius * Math.cos((nearAngle * Math.PI) / 180)] as const;
    const farPedal = [2 * crank[0] - nearPedal[0], 2 * crank[1] - nearPedal[1]] as const;
    frames.push(
      side({
        pelvis: [42, 52],
        torso: 35,
        arm: reach(68, 41, 'cw'),
        leg: reach(nearPedal[0], nearPedal[1], 'ccw'),
        foot: 100,
        legFar: reach(farPedal[0], farPedal[1], 'ccw'),
      }),
    );
  }
  return frames;
}

function runningFrames(): Pose[] {
  const contact = { near: ang(150, 172), far: ang(212, 258) };
  const passing = { near: ang(182, 205), far: ang(122, 200) };
  return [
    side({ pelvis: [50, 54], torso: 8, arm: ang(205, 115), armFar: ang(150, 70), leg: contact.near, foot: 95, legFar: contact.far, footFar: 150 }),
    side({ pelvis: [50, 52], torso: 8, arm: ang(180, 95), leg: passing.near, foot: 100, legFar: passing.far, footFar: 110 }),
    side({ pelvis: [50, 54], torso: 8, arm: ang(150, 70), armFar: ang(205, 115), leg: contact.far, foot: 150, legFar: contact.near, footFar: 95 }),
    side({ pelvis: [50, 52], torso: 8, arm: ang(180, 95), leg: passing.far, foot: 110, legFar: passing.near, footFar: 100 }),
  ];
}

// ---------- the library ----------

export const ANIMATIONS: Record<string, AnimationSpec> = {
  'back-squat': {
    view: 'side',
    durationMs: 3000,
    frames: squatFrames(
      { pelvis: [49, STAND_Y], torso: 8, arm: ang(210, 20) },
      { pelvis: [36, 72], torso: 45, arm: ang(225, 35) },
      50,
    ),
    props: [{ kind: 'barbell', at: 'wristN' }],
  },
  'front-squat': {
    view: 'side',
    durationMs: 3000,
    frames: squatFrames(
      { pelvis: [50, STAND_Y], torso: 3, arm: ang(80, 280) },
      { pelvis: [39, 73], torso: 22, arm: ang(100, 295) },
      50,
    ),
    props: [{ kind: 'barbell', at: 'wristN' }],
  },
  'goblet-squat': {
    view: 'side',
    durationMs: 3000,
    frames: squatFrames(
      { pelvis: [50, STAND_Y], torso: 4, arm: ang(165, 20) },
      { pelvis: [39, 74], torso: 25, arm: ang(178, 35) },
      50,
    ),
    props: [{ kind: 'dumbbell', at: 'wristN' }],
  },
  'romanian-deadlift': {
    view: 'side',
    durationMs: 3200,
    frames: [
      side({ pelvis: [49, STAND_Y], torso: 0, arm: reach(51, 55, 'cw'), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [37, 57], torso: 70, neck: 60, arm: reach(52, 73, 'cw'), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [{ kind: 'barbell', at: 'wristN' }],
  },
  deadlift: {
    view: 'side',
    durationMs: 3200,
    frames: [
      side({ pelvis: [35, 68], torso: 70, neck: 60, arm: reach(52.5, 84.5, 'cw'), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [49, STAND_Y], torso: 0, arm: reach(51, 56.5, 'cw'), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [{ kind: 'barbell', at: 'wristN' }],
  },
  'barbell-row': {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [38, 58], torso: 70, neck: 60, arm: reach(59, 75, 'ccw'), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [38, 58], torso: 70, neck: 60, arm: reach(55, 58, 'ccw'), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [{ kind: 'barbell', at: 'wristN' }],
  },
  'dumbbell-row': {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [36, 57], torso: 80, neck: 75, arm: reach(58, 79, 'ccw'), armFar: reach(67, 65, 'cw'), leg: plantedLeg(42), legFar: plantedLeg(30), foot: 90 }),
      side({ pelvis: [36, 57], torso: 80, neck: 75, arm: reach(53, 61, 'ccw'), armFar: reach(67, 65, 'cw'), leg: plantedLeg(42), legFar: plantedLeg(30), foot: 90 }),
    ],
    props: [...bench(60, 88, 66.5), { kind: 'dumbbell', at: 'wristN' }],
  },
  'pull-up': {
    view: 'side',
    durationMs: 2800,
    frames: pullUpFrames,
    props: pullUpBar(6),
  },
  'lat-pulldown': {
    view: 'side',
    durationMs: 2600,
    frames: [
      side({ pelvis: [45, 71], torso: 350, arm: reach(46, 22, 'ccw'), leg: ang(92, 180), foot: 90 }),
      side({ pelvis: [45, 71], torso: 345, arm: reach(45, 45, 'ccw'), leg: ang(92, 180), foot: 90 }),
    ],
    props: [
      ...seat(36, 56, 74.5),
      { kind: 'cable', at: 'wristN', anchor: [46, 2] },
      { kind: 'roller', at: 'kneeN' },
    ],
  },
  'seated-cable-row': {
    view: 'side',
    durationMs: 2600,
    frames: [
      side({ pelvis: [35, 77], torso: 12, arm: reach(60, 66, 'cw'), leg: reach(68, 81, 'ccw'), foot: 20 }),
      side({ pelvis: [35, 77], torso: 352, arm: reach(45, 66, 'cw'), leg: reach(68, 81, 'ccw'), foot: 20 }),
    ],
    props: [
      ...seat(26, 44, 80.5),
      { kind: 'line', from: [72, 70], to: [72, FLOOR_Y], width: 3 },
      { kind: 'cable', at: 'wristN', anchor: [92, 66] },
    ],
  },
  'leg-press': {
    view: 'side',
    durationMs: 3000,
    frames: [
      side({ pelvis: [40, 72], torso: 300, neck: 300, arm: ang(160, 120), leg: reach(54, 61, 'ccw'), foot: 30 }),
      side({ pelvis: [40, 72], torso: 300, neck: 300, arm: ang(160, 120), leg: reach(70, 52, 'ccw'), foot: 30 }),
    ],
    props: [
      { kind: 'line', from: [42, 76], to: [17, 61.5], width: 3.5 },
      { kind: 'line', from: [34, FLOOR_Y], to: [38, 74], width: 2 },
      { kind: 'line', from: [58, 72], to: [88, 54], width: 1.5 },
      { kind: 'sled', at: 'ankleN', angle: 30 },
    ],
  },
  'leg-extension': {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [40, 68], torso: 355, arm: ang(175, 150), leg: ang(90, 180), foot: 90 }),
      side({ pelvis: [40, 68], torso: 355, arm: ang(175, 150), leg: ang(90, 96), foot: 10 }),
    ],
    props: [
      ...seat(33, 59, 71.5),
      { kind: 'line', from: [33, 71.5], to: [31, 45], width: 3.5 },
      { kind: 'roller', at: 'ankleN' },
    ],
  },
  'leg-curl': {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [50, 61], torso: 270, neck: 275, arm: ang(185, 240), leg: ang(90, 90), foot: 180 }),
      side({ pelvis: [50, 61], torso: 270, neck: 275, arm: ang(185, 240), leg: ang(90, 15), foot: 95 }),
    ],
    props: [...bench(20, 74, 64.5), { kind: 'roller', at: 'ankleN' }],
  },
  'calf-raise': {
    view: 'side',
    durationMs: 1800,
    frames: [
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(180, 180), leg: ang(180, 180), foot: 90 }),
      side({ pelvis: [50, STAND_Y - 5], torso: 0, arm: ang(180, 180), leg: ang(180, 180), foot: 142 }),
    ],
    props: [{ kind: 'dumbbell', at: 'wristN' }],
  },
  'hip-thrust': {
    view: 'side',
    durationMs: 2600,
    frames: [
      side({ pelvis: [44, 84], torso: 320, neck: 330, arm: reach(45, 79, 'cw'), leg: reach(64, ANKLE_Y, 'ccw'), foot: 90 }),
      side({ pelvis: [52.5, 67.7], torso: 275, neck: 300, arm: reach(53.5, 62.7, 'cw'), leg: reach(64, ANKLE_Y, 'ccw'), foot: 90 }),
    ],
    props: [
      { kind: 'line', from: [12, 70], to: [31, 70], width: 3.5 },
      { kind: 'line', from: [14, 70], to: [14, FLOOR_Y], width: 1.5 },
      { kind: 'line', from: [29, 70], to: [29, FLOOR_Y], width: 1.5 },
      { kind: 'barbell', at: 'wristN' },
    ],
  },
  'bench-press': { view: 'side', durationMs: 2600, frames: benchPressFrames, props: [...benchPressProps, { kind: 'barbell', at: 'wristN' }] },
  'dumbbell-bench-press': { view: 'side', durationMs: 2600, frames: benchPressFrames, props: [...benchPressProps, { kind: 'dumbbell', at: 'wristN' }] },
  'incline-bench-press': { view: 'side', durationMs: 2600, frames: inclinePressFrames, props: [...inclineBenchProps, { kind: 'barbell', at: 'wristN' }] },
  'push-up': {
    view: 'side',
    durationMs: 2200,
    frames: [
      side({ pelvis: [46.8, 73.2], torso: 292.5, neck: 290, arm: reach(25, ANKLE_Y, 'ccw'), leg: reach(80, 87, 'cw'), foot: 150 }),
      side({ pelvis: [44.4, 82], torso: 278, neck: 278, arm: reach(25, ANKLE_Y, 'ccw'), leg: reach(80, 87, 'cw'), foot: 150 }),
    ],
    props: [],
  },
  dip: {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [48, 48], torso: 5, arm: reach(52, 51, 'cw'), leg: ang(165, 230), foot: 160 }),
      side({ pelvis: [46, 60], torso: 15, arm: reach(52, 51, 'cw'), leg: ang(165, 230), foot: 160 }),
    ],
    props: [
      { kind: 'line', from: [38, 52], to: [66, 52], width: 2.5 },
      { kind: 'line', from: [40, 52], to: [40, FLOOR_Y], width: 1.5 },
      { kind: 'line', from: [64, 52], to: [64, FLOOR_Y], width: 1.5 },
    ],
  },
  'overhead-press': {
    view: 'side',
    durationMs: 2600,
    frames: overheadPressFrames([55, 30], [50, 3.5]),
    props: [{ kind: 'barbell', at: 'wristN' }],
  },
  'dumbbell-shoulder-press': {
    view: 'side',
    durationMs: 2600,
    frames: [
      side({ pelvis: [45, 71], torso: 0, neck: 0, arm: reach(51, 45, 'cw'), leg: ang(92, 180), foot: 90 }),
      side({ pelvis: [45, 71], torso: 0, neck: 0, arm: reach(47, 21.5, 'cw'), leg: ang(92, 180), foot: 90 }),
    ],
    props: [
      ...seat(34, 56, 74.5),
      { kind: 'line', from: [36, 74.5], to: [36, 42], width: 3.5 },
      { kind: 'dumbbell', at: 'wristN' },
    ],
  },
  'lateral-raise': {
    view: 'front',
    durationMs: 2400,
    frames: [
      front({ pelvis: [50, STAND_Y], torso: 0, arm: ang(172, 170), leg: ang(178, 180), foot: 100 }),
      front({ pelvis: [50, STAND_Y], torso: 0, arm: ang(95, 98), leg: ang(178, 180), foot: 100 }),
    ],
    props: [
      { kind: 'dumbbell', at: 'wristN' },
      { kind: 'dumbbell', at: 'wristF' },
    ],
  },
  'front-raise': {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(178, 176), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(92, 88), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [{ kind: 'dumbbell', at: 'wristN' }],
  },
  'barbell-curl': { view: 'side', durationMs: 2200, frames: curlFrames, props: [{ kind: 'barbell', at: 'wristN' }] },
  'dumbbell-curl': {
    view: 'side',
    durationMs: 4400,
    frames: [
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(178, 175), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(176, 25), armFar: ang(178, 175), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(178, 175), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(178, 175), armFar: ang(176, 25), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [
      { kind: 'dumbbell', at: 'wristN' },
      { kind: 'dumbbell', at: 'wristF' },
    ],
  },
  'hammer-curl': { view: 'side', durationMs: 2200, frames: curlFrames, props: [{ kind: 'dumbbell', at: 'wristN' }] },
  'triceps-pushdown': {
    view: 'side',
    durationMs: 2200,
    frames: [
      side({ pelvis: [49, STAND_Y], torso: 10, arm: ang(172, 40), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [49, STAND_Y], torso: 10, arm: ang(172, 172), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [{ kind: 'cable', at: 'wristN', anchor: [66, 3] }],
  },
  'overhead-triceps-extension': {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(352, 200), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [50, STAND_Y], torso: 0, arm: ang(352, 358), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [{ kind: 'dumbbell', at: 'wristN' }],
  },
  plank: {
    view: 'side',
    durationMs: 3200,
    frames: [
      side({ pelvis: [49.1, 78.8], torso: 284, neck: 284, arm: ang(180, 90), leg: reach(84, 87.5, 'cw'), foot: 150 }),
      side({ pelvis: [49.1, 77.6], torso: 283, neck: 283, arm: ang(180, 90), leg: reach(84, 87.5, 'cw'), foot: 150 }),
    ],
    props: [],
  },
  crunch: {
    view: 'side',
    durationMs: 2200,
    frames: [
      side({ pelvis: [50, 86], torso: 270, neck: 275, arm: reach(37, 83, 'ccw'), leg: reach(68, ANKLE_Y, 'ccw'), foot: 90 }),
      side({ pelvis: [50, 86], torso: 297, neck: 310, arm: reach(39, 77, 'ccw'), leg: reach(68, ANKLE_Y, 'ccw'), foot: 90 }),
    ],
    props: [],
  },
  'hanging-leg-raise': {
    view: 'side',
    durationMs: 2800,
    frames: [
      side({ pelvis: [48, 56], torso: 358, arm: reach(51, 7, 'ccw'), leg: ang(182, 180), foot: 100 }),
      side({ pelvis: [49, 55], torso: 350, arm: reach(51, 7, 'ccw'), leg: ang(88, 92), foot: 10 }),
    ],
    props: pullUpBar(6),
  },
  'kettlebell-swing': {
    view: 'side',
    durationMs: 2000,
    frames: [
      side({ pelvis: [38, 56], torso: 65, neck: 50, arm: ang(196, 196), leg: plantedLeg(50), foot: 90 }),
      side({ pelvis: [50, STAND_Y], torso: 355, arm: ang(90, 90), leg: plantedLeg(50), foot: 90 }),
    ],
    props: [{ kind: 'kettlebell', at: 'wristN' }],
  },
  lunge: {
    view: 'side',
    durationMs: 2800,
    frames: [
      side({ pelvis: [50, 55.5], torso: 0, arm: ang(180, 180), leg: reach(64, ANKLE_Y, 'ccw'), foot: 90, legFar: reach(35, 86.5, 'ccw'), footFar: 150 }),
      side({ pelvis: [49, 66], torso: 0, arm: ang(180, 180), leg: reach(64, ANKLE_Y, 'ccw'), foot: 90, legFar: reach(35, 86.5, 'ccw'), footFar: 150 }),
    ],
    props: [{ kind: 'dumbbell', at: 'wristN' }],
  },
  'bulgarian-split-squat': {
    view: 'side',
    durationMs: 2800,
    frames: [
      side({ pelvis: [48, 56], torso: 8, arm: ang(182, 180), leg: reach(60, ANKLE_Y, 'ccw'), foot: 90, legFar: reach(28, 71, 'ccw'), footFar: 285 }),
      side({ pelvis: [45, 66], torso: 14, arm: ang(185, 180), leg: reach(60, ANKLE_Y, 'ccw'), foot: 90, legFar: reach(28, 71, 'ccw'), footFar: 285 }),
    ],
    props: [...bench(14, 32, 74.5), { kind: 'dumbbell', at: 'wristN' }],
  },
  running: {
    view: 'side',
    durationMs: 1100,
    frames: runningFrames(),
    props: [
      { kind: 'line', from: [16, FLOOR_Y], to: [84, FLOOR_Y], width: 3 },
      { kind: 'line', from: [80, FLOOR_Y], to: [76, 50], width: 2 },
      { kind: 'line', from: [76, 50], to: [68, 50], width: 2.5 },
    ],
  },
  rowing: {
    view: 'side',
    durationMs: 2400,
    frames: [
      side({ pelvis: [40, 80], torso: 30, arm: reach(74, 69, 'cw'), leg: reach(66, 82.5, 'ccw'), foot: 20 }),
      side({ pelvis: [27, 80], torso: 340, arm: reach(31, 66, 'cw'), leg: reach(66, 82.5, 'ccw'), foot: 20 }),
    ],
    props: [
      { kind: 'line', from: [8, 84], to: [74, 84], width: 2 },
      { kind: 'line', from: [10, 84], to: [10, FLOOR_Y], width: 1.5 },
      { kind: 'line', from: [70, 84], to: [70, FLOOR_Y], width: 1.5 },
      { kind: 'line', from: [70, 76], to: [70, 86], width: 3 },
      { kind: 'circle', center: [86, 76], radius: 8 },
      { kind: 'cable', at: 'wristN', anchor: [86, 72] },
    ],
  },
  'stationary-bike': {
    view: 'side',
    durationMs: 1400,
    frames: bikeFrames(),
    props: [
      { kind: 'line', from: [36, 54.5], to: [47, 54.5], width: 3 },
      { kind: 'line', from: [42, 55], to: [56, 79], width: 2 },
      { kind: 'line', from: [56, 79], to: [70, 42], width: 2 },
      { kind: 'line', from: [70, 42], to: [72, 40], width: 3 },
      { kind: 'line', from: [56, 79], to: [56, FLOOR_Y], width: 2 },
      { kind: 'line', from: [40, FLOOR_Y], to: [76, FLOOR_Y], width: 3 },
      { kind: 'circle', center: [56, 79], radius: 7 },
    ],
  },
};

export function getAnimation(id: string): AnimationSpec {
  const spec = ANIMATIONS[id];
  assert(spec !== undefined, `Unknown animation "${id}"`);
  return spec;
}
