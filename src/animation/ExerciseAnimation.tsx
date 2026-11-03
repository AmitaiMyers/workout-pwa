import { useEffect, useState } from 'react';
import { BONES, poseAtPhase, solveSkeleton, type LimbJoints, type Skeleton, type Vec } from './kinematics';
import { fittedViewBox, resolveJoint } from './geometry';
import { FLOOR_Y, getAnimation, type Prop } from './library';

interface Props {
  animationId: string | null;
  /** Loop the movement. When false a representative mid-movement frame is shown. */
  animate: boolean;
  /** Fixed phase (0..1) for static rendering, e.g. in tests or screenshots. */
  phase?: number;
  className?: string;
  label: string;
  /** 'full' shows the whole scene; 'fit' zooms in on the figure (for small thumbnails). */
  framing: 'full' | 'fit';
}

const STATIC_PHASE = 0.25;
/** Extra headroom above y=0 so overhead lifts are not clipped. */
const FULL_VIEW_BOX = '-4 -8 108 104';

function usePhase(durationMs: number, running: boolean): number {
  const [phase, setPhase] = useState(STATIC_PHASE);
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    let frameId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setPhase(((now - start) / durationMs) % 1);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, running]);
  return phase;
}

function Segment({ from, to, className }: { from: Vec; to: Vec; className: string }) {
  return <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} className={className} />;
}

function Limbs({ joints, className }: { joints: LimbJoints; className: string }) {
  return (
    <g className={className}>
      <Segment from={joints.hip} to={joints.knee} className="fig-limb" />
      <Segment from={joints.knee} to={joints.ankle} className="fig-limb" />
      <Segment from={joints.ankle} to={joints.toe} className="fig-foot" />
      <Segment from={joints.shoulder} to={joints.elbow} className="fig-limb" />
      <Segment from={joints.elbow} to={joints.wrist} className="fig-limb" />
    </g>
  );
}

function isBackgroundProp(prop: Prop): boolean {
  return prop.kind === 'line' || prop.kind === 'circle' || prop.kind === 'cable';
}

function PropShape({ prop, skeleton }: { prop: Prop; skeleton: Skeleton }) {
  switch (prop.kind) {
    case 'line':
      return <line x1={prop.from[0]} y1={prop.from[1]} x2={prop.to[0]} y2={prop.to[1]} className="prop-structure" strokeWidth={prop.width} />;
    case 'circle':
      return <circle cx={prop.center[0]} cy={prop.center[1]} r={prop.radius} className="prop-structure-outline" />;
    case 'cable': {
      const at = resolveJoint(skeleton, prop.at);
      return <line x1={prop.anchor[0]} y1={prop.anchor[1]} x2={at[0]} y2={at[1]} className="prop-cable" />;
    }
    case 'barbell': {
      const [x, y] = resolveJoint(skeleton, prop.at);
      return (
        <g className="prop-load">
          <circle cx={x} cy={y} r={6.5} />
          <circle cx={x} cy={y} r={1.6} className="prop-hole" />
        </g>
      );
    }
    case 'dumbbell': {
      const [x, y] = resolveJoint(skeleton, prop.at);
      return <rect x={x - 4.5} y={y - 2.5} width={9} height={5} rx={1.5} className="prop-load" />;
    }
    case 'kettlebell': {
      const [x, y] = resolveJoint(skeleton, prop.at);
      return (
        <g className="prop-load">
          <circle cx={x} cy={y + 5} r={4.5} />
          <path d={`M ${x - 2.5} ${y + 1.5} Q ${x} ${y - 2.5} ${x + 2.5} ${y + 1.5}`} className="prop-handle" />
        </g>
      );
    }
    case 'roller': {
      const [x, y] = resolveJoint(skeleton, prop.at);
      return <circle cx={x} cy={y} r={2.8} className="prop-load" />;
    }
    case 'sled': {
      const [x, y] = resolveJoint(skeleton, prop.at);
      const halfLength = 9;
      const rad = (prop.angle * Math.PI) / 180;
      const dx = Math.sin(rad) * halfLength;
      const dy = -Math.cos(rad) * halfLength;
      // The plate sits just beyond the sole of the foot, perpendicular to the push direction.
      const ox = Math.cos(rad) * 2;
      const oy = Math.sin(rad) * 2;
      return <line x1={x - dx + ox} y1={y - dy + oy} x2={x + dx + ox} y2={y + dy + oy} className="prop-sled" />;
    }
  }
}

export function ExerciseAnimation({ animationId, animate, phase, className, label, framing }: Props) {
  const spec = animationId === null ? null : getAnimation(animationId);
  const livePhase = usePhase(spec === null ? 1000 : spec.durationMs, animate && spec !== null && phase === undefined);

  if (spec === null) {
    return (
      <svg viewBox={FULL_VIEW_BOX} className={`exercise-figure ${className ?? ''}`} role="img" aria-label={`${label} (no animation)`}>
        <text x="50" y="54" textAnchor="middle" className="fig-placeholder">
          No animation
        </text>
      </svg>
    );
  }

  const skeleton = solveSkeleton(poseAtPhase(spec.frames, phase ?? livePhase), spec.view);
  const background = spec.props.filter(isBackgroundProp);
  const foreground = spec.props.filter((prop) => !isBackgroundProp(prop));
  const neckBase = skeleton.chest;

  return (
    <svg viewBox={framing === 'fit' ? fittedViewBox(spec) : FULL_VIEW_BOX} className={`exercise-figure ${className ?? ''}`} role="img" aria-label={`${label} animation`}>
      <line x1={4} y1={FLOOR_Y + 1.5} x2={96} y2={FLOOR_Y + 1.5} className="fig-floor" />
      {background.map((prop, index) => (
        <PropShape key={`bg-${index}`} prop={prop} skeleton={skeleton} />
      ))}
      <Limbs joints={skeleton.far} className={spec.view === 'side' ? 'fig-far' : 'fig-near'} />
      <g className="fig-near">
        <Segment from={skeleton.pelvis} to={skeleton.chest} className="fig-torso" />
        {spec.view === 'front' && (
          <>
            <Segment from={skeleton.far.shoulder} to={skeleton.near.shoulder} className="fig-limb" />
            <Segment from={skeleton.far.hip} to={skeleton.near.hip} className="fig-limb" />
          </>
        )}
        <Segment from={neckBase} to={skeleton.head} className="fig-limb" />
        <circle cx={skeleton.head[0]} cy={skeleton.head[1]} r={BONES.headRadius} className="fig-head" />
      </g>
      <Limbs joints={skeleton.near} className="fig-near" />
      {foreground.map((prop, index) => (
        <PropShape key={`fg-${index}`} prop={prop} skeleton={skeleton} />
      ))}
    </svg>
  );
}
