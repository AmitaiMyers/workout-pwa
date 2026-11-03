import { BONES, poseAtPhase, solveSkeleton, type LimbJoints, type Skeleton, type Vec } from './kinematics';
import type { AnimationSpec, JointRef, Prop } from './library';

export function resolveJoint(skeleton: Skeleton, ref: JointRef): Vec {
  if (ref === 'pelvis' || ref === 'chest' || ref === 'head') {
    return skeleton[ref];
  }
  const sideKey = ref.endsWith('N') ? 'near' : 'far';
  const joint = ref.slice(0, -1) as keyof LimbJoints;
  return skeleton[sideKey][joint];
}

/** Largest radius drawn around a joint-attached load (the barbell plate). */
const LOAD_RADIUS = 7;
/** Phases sampled to cover the whole range of motion. */
const SAMPLE_COUNT = 24;
const PADDING = 5;

function propPoints(prop: Prop, skeleton: Skeleton): Vec[] {
  switch (prop.kind) {
    case 'line':
      return [prop.from, prop.to];
    case 'circle':
      return [
        [prop.center[0] - prop.radius, prop.center[1] - prop.radius],
        [prop.center[0] + prop.radius, prop.center[1] + prop.radius],
      ];
    case 'cable':
      return [prop.anchor, resolveJoint(skeleton, prop.at)];
    case 'barbell':
    case 'dumbbell':
    case 'kettlebell':
    case 'roller':
    case 'sled': {
      const [x, y] = resolveJoint(skeleton, prop.at);
      return [
        [x - LOAD_RADIUS, y - LOAD_RADIUS],
        [x + LOAD_RADIUS, y + LOAD_RADIUS + (prop.kind === 'kettlebell' ? 3 : 0)],
      ];
    }
  }
}

function skeletonPoints(skeleton: Skeleton): Vec[] {
  const r = BONES.headRadius;
  const [hx, hy] = skeleton.head;
  const limbs = [skeleton.near, skeleton.far].flatMap((side) => Object.values(side));
  return [skeleton.pelvis, skeleton.chest, [hx - r, hy - r], [hx + r, hy + r], ...limbs];
}

const cache = new WeakMap<AnimationSpec, string>();

/**
 * A square view box that tightly frames everything the animation ever draws (figure and props)
 * over its whole loop. Fixed for the loop, so the figure doesn't jitter while animating.
 */
export function fittedViewBox(spec: AnimationSpec): string {
  const cached = cache.get(spec);
  if (cached !== undefined) {
    return cached;
  }
  const points: Vec[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const skeleton = solveSkeleton(poseAtPhase(spec.frames, i / SAMPLE_COUNT), spec.view);
    points.push(...skeletonPoints(skeleton), ...spec.props.flatMap((prop) => propPoints(prop, skeleton)));
  }
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) + 2 * PADDING;
  const centerX = (minX + Math.max(...xs)) / 2;
  const centerY = (minY + Math.max(...ys)) / 2;
  const viewBox = [centerX - size / 2, centerY - size / 2, size, size].map((value) => value.toFixed(2)).join(' ');
  cache.set(spec, viewBox);
  return viewBox;
}
