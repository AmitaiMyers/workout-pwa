/**
 * Stick-figure kinematics for exercise animations.
 *
 * Angle convention (degrees, screen coordinates with y pointing down):
 *   0 = up, 90 = right (the direction a side-view figure faces), 180 = down, 270 = left.
 * Every segment angle is absolute (not relative to its parent), which keeps poses easy to author.
 *
 * The pelvis is the root of every pose. A limb is either driven by its two segment angles or
 * by a 2-bone IK target ("reach") so hands and feet can stay pinned to a bar, bench or the floor.
 */
import { assert } from '../domain/assert';

export type Vec = readonly [number, number];

export const BONES = {
  torso: 24,
  neck: 8,
  headRadius: 5.5,
  upperArm: 14,
  forearm: 13,
  thigh: 18,
  shin: 18,
  foot: 6,
} as const;

/** Which way the middle joint (elbow/knee) bends, seen as rotating the root→target line on screen. */
export type Bend = 'cw' | 'ccw';

export type LimbSpec =
  | { kind: 'angles'; upper: number; lower: number }
  | { kind: 'reach'; target: Vec; bend: Bend };

export interface ArmSpec {
  limb: LimbSpec;
}

export interface LegSpec {
  limb: LimbSpec;
  foot: number;
}

export interface Pose {
  pelvis: Vec;
  torso: number;
  neck: number;
  armNear: ArmSpec;
  armFar: ArmSpec;
  legNear: LegSpec;
  legFar: LegSpec;
}

export type View = 'side' | 'front';

export interface Skeleton {
  pelvis: Vec;
  chest: Vec;
  head: Vec;
  near: LimbJoints;
  far: LimbJoints;
}

export interface LimbJoints {
  shoulder: Vec;
  elbow: Vec;
  wrist: Vec;
  hip: Vec;
  knee: Vec;
  ankle: Vec;
  toe: Vec;
}

/** Half widths used to spread shoulders and hips apart in the front view. */
const FRONT_SHOULDER_HALF_WIDTH = 7;
const FRONT_HIP_HALF_WIDTH = 4;

export function direction(angleDeg: number): Vec {
  const rad = (angleDeg * Math.PI) / 180;
  return [Math.sin(rad), -Math.cos(rad)];
}

export function add(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1]];
}

export function scale(v: Vec, factor: number): Vec {
  return [v[0] * factor, v[1] * factor];
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function along(origin: Vec, angleDeg: number, length: number): Vec {
  return add(origin, scale(direction(angleDeg), length));
}

/**
 * Two-bone IK: place the middle joint so that root→mid has length `upper` and mid→end has
 * length `lower`, with the end as close to `target` as the bone lengths allow.
 */
export function solveTwoBone(root: Vec, target: Vec, upper: number, lower: number, bend: Bend): { mid: Vec; end: Vec } {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const rawDistance = Math.hypot(dx, dy);
  assert(rawDistance > 0, 'IK target must differ from the limb root');
  const minReach = Math.abs(upper - lower) + 1e-6;
  const maxReach = upper + lower - 1e-6;
  const reach = Math.min(Math.max(rawDistance, minReach), maxReach);
  const ux = dx / rawDistance;
  const uy = dy / rawDistance;
  const cosRoot = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
  const rootAngle = Math.acos(Math.min(1, Math.max(-1, cosRoot)));
  // With y pointing down, a positive rotation is clockwise on screen.
  const signed = bend === 'cw' ? rootAngle : -rootAngle;
  const cos = Math.cos(signed);
  const sin = Math.sin(signed);
  const mid: Vec = [root[0] + upper * (ux * cos - uy * sin), root[1] + upper * (ux * sin + uy * cos)];
  const end: Vec = [root[0] + ux * reach, root[1] + uy * reach];
  return { mid, end };
}

function solveLimb(root: Vec, spec: LimbSpec, upper: number, lower: number): { mid: Vec; end: Vec } {
  if (spec.kind === 'angles') {
    const mid = along(root, spec.upper, upper);
    return { mid, end: along(mid, spec.lower, lower) };
  }
  return solveTwoBone(root, spec.target, upper, lower, spec.bend);
}

function solveSide(shoulder: Vec, hip: Vec, arm: ArmSpec, leg: LegSpec): LimbJoints {
  const armJoints = solveLimb(shoulder, arm.limb, BONES.upperArm, BONES.forearm);
  const legJoints = solveLimb(hip, leg.limb, BONES.thigh, BONES.shin);
  return {
    shoulder,
    elbow: armJoints.mid,
    wrist: armJoints.end,
    hip,
    knee: legJoints.mid,
    ankle: legJoints.end,
    toe: along(legJoints.end, leg.foot, BONES.foot),
  };
}

export function solveSkeleton(pose: Pose, view: View): Skeleton {
  const chest = along(pose.pelvis, pose.torso, BONES.torso);
  const head = along(chest, pose.neck, BONES.neck);
  const shoulderOffset: Vec = view === 'front' ? [FRONT_SHOULDER_HALF_WIDTH, 0] : [0, 0];
  const hipOffset: Vec = view === 'front' ? [FRONT_HIP_HALF_WIDTH, 0] : [0, 0];
  return {
    pelvis: pose.pelvis,
    chest,
    head,
    near: solveSide(add(chest, shoulderOffset), add(pose.pelvis, hipOffset), pose.armNear, pose.legNear),
    far: solveSide(add(chest, scale(shoulderOffset, -1)), add(pose.pelvis, scale(hipOffset, -1)), pose.armFar, pose.legFar),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate angles along the shortest arc, so 350° → 10° rotates 20° rather than 340°. */
export function lerpAngle(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return a + delta * t;
}

function lerpVec(a: Vec, b: Vec, t: number): Vec {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function lerpLimb(a: LimbSpec, b: LimbSpec, t: number): LimbSpec {
  if (a.kind === 'angles' && b.kind === 'angles') {
    return { kind: 'angles', upper: lerpAngle(a.upper, b.upper, t), lower: lerpAngle(a.lower, b.lower, t) };
  }
  if (a.kind === 'reach' && b.kind === 'reach') {
    assert(a.bend === b.bend, 'Interpolated IK limbs must bend the same way');
    return { kind: 'reach', target: lerpVec(a.target, b.target, t), bend: a.bend };
  }
  throw new Error('Cannot interpolate between an angle-driven limb and an IK limb');
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    pelvis: lerpVec(a.pelvis, b.pelvis, t),
    torso: lerpAngle(a.torso, b.torso, t),
    neck: lerpAngle(a.neck, b.neck, t),
    armNear: { limb: lerpLimb(a.armNear.limb, b.armNear.limb, t) },
    armFar: { limb: lerpLimb(a.armFar.limb, b.armFar.limb, t) },
    legNear: { limb: lerpLimb(a.legNear.limb, b.legNear.limb, t), foot: lerpAngle(a.legNear.foot, b.legNear.foot, t) },
    legFar: { limb: lerpLimb(a.legFar.limb, b.legFar.limb, t), foot: lerpAngle(a.legFar.foot, b.legFar.foot, t) },
  };
}

/** Smooth ease-in-out so each movement accelerates and decelerates like a real rep. */
function ease(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

/**
 * Pose at `phase` (0..1) of a looping cycle through `frames`, returning to the first frame.
 * Each transition between consecutive frames takes an equal share of the cycle.
 */
export function poseAtPhase(frames: readonly Pose[], phase: number): Pose {
  assert(frames.length >= 1, 'An animation needs at least one frame');
  const first = frames[0];
  assert(first !== undefined, 'First frame missing');
  if (frames.length === 1) {
    return first;
  }
  const wrapped = ((phase % 1) + 1) % 1;
  const position = wrapped * frames.length;
  const index = Math.floor(position);
  const from = frames[index];
  const to = frames[(index + 1) % frames.length];
  assert(from !== undefined && to !== undefined, 'Frame index out of range');
  return lerpPose(from, to, ease(position - index));
}
