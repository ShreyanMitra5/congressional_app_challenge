import { useId } from "react";
import type { JSX } from "react";
import type { CharacterProps, CompanionPose } from "./types";

/**
 * Otter astronaut — companion for the "Space Voyagers" world.
 * Duolingo-like house style: bold dark outlines, flat fills, chunky shapes.
 * viewBox 0 0 100 120, faces slightly right.
 */

const INK = "#1A1530";
const OUTLINE = 3;
const DETAIL = 2.5;
const LINE = 2;

const C = {
  body: "#9A6B4A",
  bodyDark: "#7A5238",
  cream: "#C8A07C",
  helmet: "#FFF6E0",
  helmetDark: "#E6D9BF",
  glow: "#6FE3FF",
  tongue: "#FF9EC4",
  white: "#FFFFFF",
} as const;

const HEAD_CX = 52;
const HEAD_CY = 44;
const HELMET_R = 30;
const VISOR_R = 24.5;

/** Flat four-point star accent. */
function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  const d = `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;
  return <path d={d} fill={C.glow} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />;
}

/** Stubby outlined arm ending in a round paw with two toe notches. */
/** Round to 2 dp so server and browser render identical coordinates. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function Arm({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const W = 9;
  const PAW_R = 6;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const base = Math.atan2(dy, dx);
  const toes = [-0.55, 0.55].map((t) => {
    const a = base + t;
    return {
      x1: r2(x2 + Math.cos(a) * 1.8),
      y1: r2(y2 + Math.sin(a) * 1.8),
      x2: r2(x2 + Math.cos(a) * PAW_R),
      y2: r2(y2 + Math.sin(a) * PAW_R),
    };
  });
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={W + OUTLINE * 2} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.body} strokeWidth={W} strokeLinecap="round" />
      <circle cx={x2} cy={y2} r={PAW_R} fill={C.bodyDark} stroke={INK} strokeWidth={OUTLINE} />
      {toes.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Flat oval foot with two toe lines. */
function Foot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={9} ry={4.6} fill={C.bodyDark} stroke={INK} strokeWidth={OUTLINE} />
      <line x1={cx - 3} y1={cy - 4.2} x2={cx - 2.4} y2={cy - 0.5} stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <line x1={cx + 3} y1={cy - 4.2} x2={cx + 2.4} y2={cy - 0.5} stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
    </g>
  );
}

export function Otter({
  pose,
  width = 120,
  breathing,
  reducedMotion,
  className,
  style,
}: CharacterProps & { pose: CompanionPose }): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const breatheClass = `otter-breathe-${uid}`;
  const breatheKeyframes = `otter-kf-${uid}`;
  const animate = Boolean(breathing) && !reducedMotion;
  const height = width * 1.2;

  const eyesClosed = pose === "nod" || pose === "celebrating";
  const leftArmUp = pose === "celebrating";
  const rightArmUp = pose === "waving" || pose === "celebrating";

  let headTransform: string | undefined;
  if (pose === "nod") headTransform = "translate(0 2.5) rotate(6 52 72)";
  else if (pose === "celebrating") headTransform = "translate(0 -1.5) rotate(-3 52 72)";

  // Eyes
  let eyes: JSX.Element;
  if (eyesClosed) {
    eyes = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 40.5 45 Q 45 40 49.5 45" />
        <path d="M 56.5 44 Q 61 39 65.5 44" />
      </g>
    );
  } else {
    eyes = (
      <g>
        <ellipse cx={45} cy={43.5} rx={4.6} ry={5.6} fill={INK} />
        <ellipse cx={61} cy={42.5} rx={4.6} ry={5.6} fill={INK} />
        <circle cx={46.6} cy={41.4} r={1.7} fill={C.white} />
        <circle cx={62.6} cy={40.4} r={1.7} fill={C.white} />
      </g>
    );
  }

  // Eyebrows
  let brows: JSX.Element;
  if (pose === "nod") {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 40.5 35 Q 45 31.5 49.5 34" />
        <path d="M 56.5 33.5 Q 61 30.5 65.5 33" />
      </g>
    );
  } else if (pose === "waving") {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 41 36.5 Q 45 34.5 49.5 35.5" />
        <path d="M 56.5 33 Q 61 29.5 65.5 32" />
      </g>
    );
  } else if (pose === "celebrating") {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 40.5 34 Q 45 30.5 49.5 32.5" />
        <path d="M 56.5 32 Q 61 29 65.5 31.5" />
      </g>
    );
  } else {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 41 36.5 Q 45 35 49.5 36" />
        <path d="M 56.5 35.5 Q 61 33.5 65.5 34.5" />
      </g>
    );
  }

  // Mouth
  let mouth: JSX.Element;
  if (pose === "waving") {
    mouth = (
      <g>
        <path d="M 49.5 55.5 Q 56 64.5 62.5 55.5 Z" fill={INK} stroke={INK} strokeWidth={DETAIL} strokeLinejoin="round" />
        <ellipse cx={56.3} cy={60} rx={2.6} ry={1.6} fill={C.tongue} />
      </g>
    );
  } else if (pose === "celebrating") {
    mouth = (
      <g>
        <path d="M 48 55.5 Q 56 67 64 55.5 Z" fill={INK} stroke={INK} strokeWidth={DETAIL} strokeLinejoin="round" />
        <ellipse cx={56.5} cy={61.5} rx={3.2} ry={2} fill={C.tongue} />
      </g>
    );
  } else if (pose === "nod") {
    mouth = <path d="M 49.5 55.5 Q 56 61.5 62.5 55.5" fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round" />;
  } else {
    mouth = <path d="M 50 55.5 Q 56 60 62 55.5" fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round" />;
  }

  // Helmet rim shadow (bottom crescent between visor and rim)
  const rimShadow = `M 26.02 59 A ${HELMET_R} ${HELMET_R} 0 0 0 77.98 59 L 73.22 56.25 A ${VISOR_R} ${VISOR_R} 0 0 1 30.78 56.25 Z`;

  return (
    <svg
      viewBox="0 0 100 120"
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
    >
      {animate && (
        <style>{`@keyframes ${breatheKeyframes}{from{transform:scale(1)}to{transform:scale(1.015)}}.${breatheClass}{animation:${breatheKeyframes} 3s ease-in-out infinite alternate;transform-origin:50% 100%;transform-box:view-box;}`}</style>
      )}

      <g className={animate ? breatheClass : undefined} strokeLinejoin="round" strokeLinecap="round">
        {/* celebration sparkles (static) */}
        {pose === "celebrating" && (
          <g>
            <Sparkle x={13} y={40} r={5} />
            <Sparkle x={89} y={33} r={4.5} />
            <Sparkle x={10} y={66} r={3.5} />
            <Sparkle x={92} y={62} r={3.5} />
            <Sparkle x={52} y={6} r={4} />
          </g>
        )}

        {/* tail (behind body, trailing left) */}
        <path
          d="M 36 104 C 24 108, 10 104, 9 95 C 8.5 90, 15 89, 16.5 94 C 18 100, 26 101.5, 38 99 Z"
          fill={C.bodyDark}
          stroke={INK}
          strokeWidth={OUTLINE}
        />

        {/* body */}
        <path
          d="M 52 72 C 36 72, 29 84, 29 96 C 28.5 104, 36 107.5, 52 107.5 C 68 107.5, 75.5 104, 75 96 C 74 84, 68 72, 52 72 Z"
          fill={C.body}
          stroke={INK}
          strokeWidth={OUTLINE}
        />
        {/* belly */}
        <ellipse cx={52} cy={93.5} rx={12.5} ry={10.5} fill={C.cream} stroke={INK} strokeWidth={DETAIL} />

        {/* feet (in front of body) */}
        <Foot cx={41} cy={109} />
        <Foot cx={62.5} cy={109.5} />

        {/* resting arms (shoulders tucked under the collar) */}
        {!leftArmUp && <Arm x1={40} y1={76} x2={30} y2={95} />}
        {!rightArmUp && <Arm x1={64} y1={76} x2={74} y2={95} />}

        {/* suit collar with stripe */}
        <rect x={35} y={69} width={34} height={13} rx={6.5} fill={C.helmet} stroke={INK} strokeWidth={OUTLINE} />
        <rect x={39.5} y={76.2} width={25} height={2.8} rx={1.4} fill={C.glow} />

        {/* head + helmet */}
        <g transform={headTransform}>
          {/* helmet shell */}
          <circle cx={HEAD_CX} cy={HEAD_CY} r={HELMET_R} fill={C.helmet} stroke={INK} strokeWidth={OUTLINE} />
          <path d={rimShadow} fill={C.helmetDark} />
          {/* visor glass tint behind the face */}
          <circle cx={HEAD_CX} cy={HEAD_CY} r={VISOR_R} fill={C.glow} opacity={0.3} />

          {/* ears */}
          <circle cx={33.5} cy={38} r={4.6} fill={C.body} stroke={INK} strokeWidth={OUTLINE} />
          <circle cx={70.5} cy={37} r={4.6} fill={C.body} stroke={INK} strokeWidth={OUTLINE} />
          {/* head */}
          <ellipse cx={52} cy={46} rx={21} ry={18} fill={C.body} stroke={INK} strokeWidth={OUTLINE} />
          {/* muzzle */}
          <ellipse cx={55} cy={54.5} rx={14} ry={9} fill={C.cream} stroke={INK} strokeWidth={DETAIL} />
          {/* nose */}
          <ellipse cx={56} cy={49.5} rx={3.6} ry={2.6} fill={INK} />
          <circle cx={55} cy={48.8} r={0.9} fill={C.white} />
          <path d="M 56 52 V 55.5" fill="none" stroke={INK} strokeWidth={LINE} />
          {mouth}
          {/* whiskers */}
          <g fill="none" stroke={INK} strokeWidth={LINE}>
            <path d="M 44 53.5 L 38 52.5" />
            <path d="M 44 56.5 L 38.5 57.8" />
            <path d="M 67 52.5 L 72 51.5" />
            <path d="M 67 55.5 L 71.5 56.8" />
          </g>
          {eyes}
          {brows}

          {/* visor glass highlight + inner rim */}
          <ellipse cx={39.5} cy={29} rx={7} ry={3.2} transform="rotate(-40 39.5 29)" fill={C.white} opacity={0.85} />
          <circle cx={34.5} cy={38} r={1.8} fill={C.white} opacity={0.85} />
          <circle cx={HEAD_CX} cy={HEAD_CY} r={VISOR_R} fill="none" stroke={INK} strokeWidth={OUTLINE} />

          {/* rim beacon */}
          <circle cx={73.5} cy={22.5} r={3.6} fill={C.glow} stroke={INK} strokeWidth={OUTLINE} />
          <circle cx={72.4} cy={21.4} r={1} fill={C.white} />
        </g>

        {/* raised arms (in front of helmet) */}
        {leftArmUp && <Arm x1={36} y1={80} x2={20} y2={58} />}
        {rightArmUp && <Arm x1={68} y1={80} x2={84} y2={58} />}
      </g>
    </svg>
  );
}
