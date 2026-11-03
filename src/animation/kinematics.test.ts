import { describe, expect, it } from 'vitest';
import { BONES, distance, lerpAngle, poseAtPhase, solveSkeleton, solveTwoBone } from './kinematics';
import { ANIMATIONS } from './library';

describe('solveTwoBone', () => {
  it('reaches a reachable target and keeps bone lengths', () => {
    const { mid, end } = solveTwoBone([0, 0], [10, 10], 10, 10, 'cw');
    expect(end[0]).toBeCloseTo(10);
    expect(end[1]).toBeCloseTo(10);
    expect(distance([0, 0], mid)).toBeCloseTo(10);
    expect(distance(mid, end)).toBeCloseTo(10);
  });
  it('bends to opposite sides for cw and ccw', () => {
    const cw = solveTwoBone([0, 0], [0, 15], 10, 10, 'cw').mid;
    const ccw = solveTwoBone([0, 0], [0, 15], 10, 10, 'ccw').mid;
    expect(Math.sign(cw[0])).toBe(-Math.sign(ccw[0]));
  });
  it('stretches straight toward an unreachable target', () => {
    const { end } = solveTwoBone([0, 0], [100, 0], 10, 10, 'cw');
    expect(end[0]).toBeCloseTo(20, 3);
  });
});

describe('lerpAngle', () => {
  it('takes the shortest arc', () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(360);
    expect(lerpAngle(10, 350, 0.5)).toBeCloseTo(0);
  });
});

describe('animation library', () => {
  const phases = [0, 0.13, 0.37, 0.5, 0.81];
  for (const [id, spec] of Object.entries(ANIMATIONS)) {
    it(`${id} keeps limb lengths constant through the loop`, () => {
      for (const phase of phases) {
        const skeleton = solveSkeleton(poseAtPhase(spec.frames, phase), spec.view);
        for (const side of [skeleton.near, skeleton.far]) {
          expect(distance(side.shoulder, side.elbow)).toBeCloseTo(BONES.upperArm, 3);
          expect(distance(side.elbow, side.wrist)).toBeCloseTo(BONES.forearm, 3);
          expect(distance(side.hip, side.knee)).toBeCloseTo(BONES.thigh, 3);
          expect(distance(side.knee, side.ankle)).toBeCloseTo(BONES.shin, 3);
        }
        expect(distance(skeleton.pelvis, skeleton.chest)).toBeCloseTo(BONES.torso, 3);
      }
    });
  }
});
