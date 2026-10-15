import { useId } from "react";
import type { JSX } from "react";
import type { CharacterProps, CompanionPose } from "./types";

/**
 * Neon lynx — companion for the "Neon Arcade" world.
 * Duolingo-like house style: bold dark outlines, flat fills, chunky shapes.
 * viewBox 0 0 100 120, faces slightly right.
 */

const INK = "#1A1530";
const OUTLINE = 3;
const DETAIL = 2.5;
const LINE = 2;

const C = {
  body: "#8A86B8",
  bodyDark: "#6B679A",
  light: "#C9C5EA",
  neon: "#FFE76B",
  tongue: "#F2A2BE",
  white: "#FFFFFF",
} as const;

/** Flat four-point star accent. */
function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  const d = `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;
  return <path d={d} fill={C.neon} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />;
}

/** Stubby outlined leg ending in a round paw with two toe notches. */
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

export function Lynx({
  pose,
  width = 120,
  breathing,
  reducedMotion,
  className,
  style,
}: CharacterProps & { pose: CompanionPose }): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const breatheClass = `lynx-breathe-${uid}`;
  const breatheKeyframes = `lynx-kf-${uid}`;
  const animate = Boolean(breathing) && !reducedMotion;
  const height = width * 1.2;

  const eyesClosed = pose === "nod" || pose === "celebrating";
  const leftArmUp = pose === "celebrating";
  const rightArmUp = pose === "waving" || pose === "celebrating";

  let headTransform: string | undefined;
  if (pose === "nod") headTransform = "translate(0 2.5) rotate(6 52 68)";
  else if (pose === "celebrating") headTransform = "translate(0 -1.5) rotate(-3 52 68)";

  // Eyes
  let eyes: JSX.Element;
  if (eyesClosed) {
    eyes = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 39.5 45.5 Q 44 40.5 48.5 45.5" />
        <path d="M 56.5 44.5 Q 61 39.5 65.5 44.5" />
      </g>
    );
  } else {
    eyes = (
      <g>
        <ellipse cx={44} cy={44} rx={4.8} ry={5.8} fill={INK} />
        <ellipse cx={61} cy={43} rx={4.8} ry={5.8} fill={INK} />
        <circle cx={45.7} cy={41.8} r={1.7} fill={C.white} />
        <circle cx={62.7} cy={40.8} r={1.7} fill={C.white} />
      </g>
    );
  }

  // Eyebrows
  let brows: JSX.Element;
  if (pose === "nod") {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 39.5 35.5 Q 44 32 48.5 34.5" />
        <path d="M 56.5 34 Q 61 31 65.5 33.5" />
      </g>
    );
  } else if (pose === "waving") {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 40 37 Q 44 35 48.5 36" />
        <path d="M 56.5 33.5 Q 61 30 65.5 32.5" />
      </g>
    );
  } else if (pose === "celebrating") {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 39.5 34.5 Q 44 31 48.5 33" />
        <path d="M 56.5 32.5 Q 61 29.5 65.5 32" />
      </g>
    );
  } else {
    brows = (
      <g fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round">
        <path d="M 40 37 Q 44 35.5 48.5 36.5" />
        <path d="M 56.5 36 Q 61 34 65.5 35" />
      </g>
    );
  }

  // Mouth
  let mouth: JSX.Element;
  if (pose === "waving") {
    mouth = (
      <g>
        <path d="M 50 57.5 Q 56 66 62 57.5 Z" fill={INK} stroke={INK} strokeWidth={DETAIL} strokeLinejoin="round" />
        <ellipse cx={56} cy={61.8} rx={2.5} ry={1.6} fill={C.tongue} />
      </g>
    );
  } else if (pose === "celebrating") {
    mouth = (
      <g>
        <path d="M 48.5 57.5 Q 56 68 63.5 57.5 Z" fill={INK} stroke={INK} strokeWidth={DETAIL} strokeLinejoin="round" />
        <ellipse cx={56} cy={63} rx={3} ry={1.9} fill={C.tongue} />
      </g>
    );
  } else if (pose === "nod") {
    mouth = <path d="M 50 57.5 Q 56 63 62 57.5" fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round" />;
  } else {
    mouth = (
      <path d="M 49.5 57.5 Q 52.8 61 56 58 Q 59.2 61 62.5 57.5" fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round" />
    );
  }

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
            <Sparkle x={12} y={44} r={5} />
            <Sparkle x={90} y={38} r={4.5} />
            <Sparkle x={10} y={70} r={3.5} />
            <Sparkle x={92} y={66} r={3.5} />
            <Sparkle x={52} y={5} r={4} />
          </g>
        )}

        {/* bob tail (behind body) */}
        <line x1={34} y1={101} x2={21} y2={94} stroke={INK} strokeWidth={14} />
        <line x1={34} y1={101} x2={21} y2={94} stroke={C.body} strokeWidth={8} />
        <circle cx={20.5} cy={93.5} r={5} fill={C.bodyDark} stroke={INK} strokeWidth={OUTLINE} />

        {/* body */}
        <path
          d="M 52 68 C 37 68, 29 82, 29 96 C 28.5 104, 36 107.5, 52 107.5 C 68 107.5, 75.5 104, 75 96 C 74 82, 67 68, 52 68 Z"
          fill={C.body}
          stroke={INK}
          strokeWidth={OUTLINE}
        />
        {/* haunch spots */}
        <g fill={C.bodyDark}>
          <circle cx={36.5} cy={89} r={1.7} />
          <circle cx={40} cy={98} r={1.7} />
          <circle cx={34.5} cy={97.5} r={1.4} />
          <circle cx={69} cy={92} r={1.6} />
        </g>
        {/* belly */}
        <ellipse cx={53} cy={92} rx={12} ry={11} fill={C.light} stroke={INK} strokeWidth={DETAIL} />

        {/* feet (in front of body) */}
        <Foot cx={41} cy={109} />
        <Foot cx={62.5} cy={109.5} />

        {/* resting front legs (shoulders tucked under the collar) */}
        {!leftArmUp && <Arm x1={40} y1={73} x2={30} y2={95} />}
        {!rightArmUp && <Arm x1={64} y1={73} x2={74} y2={95} />}

        {/* neon collar band + tag */}
        <rect x={36} y={64} width={32} height={10} rx={5} fill={C.neon} stroke={INK} strokeWidth={OUTLINE} />
        <circle cx={53} cy={76} r={3.2} fill={C.neon} stroke={INK} strokeWidth={OUTLINE} />

        {/* head */}
        <g transform={headTransform}>
          {/* tuft spikes (behind the ears) */}
          <path d="M 24.5 15 L 23 2 L 34 11 Z" fill={C.neon} stroke={INK} strokeWidth={DETAIL} />
          <path d="M 68.5 11 L 79 1.5 L 78 14 Z" fill={C.neon} stroke={INK} strokeWidth={DETAIL} />

          {/* ears */}
          <path d="M 31 33 L 29 9 L 48 25 Z" fill={C.body} stroke={INK} strokeWidth={OUTLINE} />
          <path d="M 56 24 L 73 8 L 74 32 Z" fill={C.body} stroke={INK} strokeWidth={OUTLINE} />
          <path d="M 35 30 L 33.5 17 L 43.5 26 Z" fill={C.light} stroke={INK} strokeWidth={LINE} />
          <path d="M 59.5 25.5 L 69.5 16 L 70 29.5 Z" fill={C.light} stroke={INK} strokeWidth={LINE} />
          {/* pale-yellow tufted tips */}
          <path d="M 29 9 L 29.9 19.8 L 37.5 16.2 Z" fill={C.neon} stroke={INK} strokeWidth={DETAIL} />
          <path d="M 73 8 L 65.4 15.2 L 73.5 18.8 Z" fill={C.neon} stroke={INK} strokeWidth={DETAIL} />

          {/* cheek ruffs */}
          <path d="M 31 46 L 21 66 L 42 63 Z" fill={C.body} stroke={INK} strokeWidth={OUTLINE} />
          <path d="M 73 44 L 83 64 L 62 61 Z" fill={C.body} stroke={INK} strokeWidth={OUTLINE} />

          {/* head */}
          <ellipse cx={52} cy={45} rx={25} ry={22} fill={C.body} stroke={INK} strokeWidth={OUTLINE} />
          {/* forehead stripes */}
          <g fill="none" stroke={C.bodyDark} strokeWidth={DETAIL}>
            <path d="M 46 27.5 L 46.5 32" />
            <path d="M 52 26 L 52 31" />
            <path d="M 58 27 L 57.5 31.5" />
          </g>
          {/* muzzle */}
          <ellipse cx={55} cy={56} rx={13} ry={9} fill={C.light} stroke={INK} strokeWidth={DETAIL} />
          {/* nose */}
          <path d="M 52.5 50.5 L 59.5 50.5 L 56 55.2 Z" fill={INK} stroke={INK} strokeWidth={DETAIL} strokeLinejoin="round" />
          <circle cx={54.3} cy={50.9} r={0.8} fill={C.white} />
          <path d="M 56 55.5 V 57.5" fill="none" stroke={INK} strokeWidth={LINE} />
          {mouth}
          {/* whiskers */}
          <g fill="none" stroke={INK} strokeWidth={LINE}>
            <path d="M 43 55 L 36.5 54" />
            <path d="M 43 58 L 37 59.5" />
            <path d="M 67 54 L 73 53" />
            <path d="M 67 57 L 72.5 58.5" />
          </g>
          {eyes}
          {brows}
        </g>

        {/* raised front legs */}
        {leftArmUp && <Arm x1={36} y1={80} x2={20} y2={58} />}
        {rightArmUp && <Arm x1={68} y1={80} x2={84} y2={58} />}
      </g>
    </svg>
  );
}
