import { useId, type JSX } from "react";
import type { CharacterProps, FoxPose } from "./types";

/**
 * The fox companion, drawn in the house "chunky mascot" style: bold dark
 * outlines, flat fills, a big rounded head, a small body, stubby legs and a
 * thick tail. It sits at the lower left of the night-forest scenes and faces
 * slightly right, toward the centre of the screen.
 *
 * Drawn in a 100 × 120 portrait viewBox; `width` scales it (height = width × 1.2).
 */

const ORANGE = "#F28C38";
const CREAM = "#FFF1D6";
const DARK = "#D9742B";
const OUTLINE = "#1A1530";
const PINK = "#FF9EC4";
const GLOW = "#FFC145";
const HILL = "#1B2B63";
const SHADOW = "#0A1230";

/** Outline weight for silhouette shapes and for inner detail lines. */
const LINE = 3;
const DETAIL = 2.4;

type Ears = "relaxed" | "perked" | "back";
type Eyes = "soft" | "wide" | "happy" | "closed";
type Mouth = "smile" | "o" | "open" | "grin";
type Brows = "relaxed" | "raised" | "excited" | "arched" | "none";

interface Ids {
  body: string;
  tail: string;
}

const outline = {
  stroke: OUTLINE,
  strokeWidth: LINE,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

const detail = {
  fill: "none",
  stroke: OUTLINE,
  strokeWidth: DETAIL,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

/* ------------------------------------------------------------------ */
/* Head parts (head-local coordinates: centre 0,0)                     */
/* ------------------------------------------------------------------ */

/** One ear: a chunky rounded triangle with a darker inner ear. */
function Ear({ d, inner }: { d: string; inner: string }) {
  return (
    <g>
      <path d={d} fill={ORANGE} {...outline} />
      <path d={inner} fill={DARK} />
    </g>
  );
}

function EarsPart({ kind }: { kind: Ears }) {
  if (kind === "perked") {
    return (
      <>
        <Ear
          d="M-27 -6 C-30 -20 -27 -36 -19 -49 C-13 -39 -8 -31 -5 -23 Z"
          inner="M-23 -14 C-24 -23 -22 -31 -19 -40 C-16 -33 -13 -28 -11 -23 Z"
        />
        <Ear
          d="M27 -6 C30 -20 27 -36 18 -49 C12 -39 8 -31 5 -23 Z"
          inner="M23 -14 C24 -23 22 -31 18 -40 C15 -33 13 -28 11 -23 Z"
        />
      </>
    );
  }
  if (kind === "back") {
    return (
      <g transform="rotate(-20 0 -12)">
        <Ear
          d="M-27 -6 C-31 -19 -29 -33 -22 -44 C-15 -37 -9 -30 -6 -23 Z"
          inner="M-24 -13 C-25 -22 -24 -29 -21 -37 C-17 -32 -13 -27 -11 -22 Z"
        />
        <Ear
          d="M27 -6 C30 -19 28 -33 21 -44 C14 -37 9 -30 6 -23 Z"
          inner="M24 -13 C25 -22 24 -29 20 -37 C16 -32 13 -27 11 -22 Z"
        />
      </g>
    );
  }
  return (
    <>
      <Ear
        d="M-27 -6 C-31 -19 -29 -33 -22 -44 C-15 -37 -9 -30 -6 -23 Z"
        inner="M-24 -13 C-25 -22 -24 -29 -21 -37 C-17 -32 -13 -27 -11 -22 Z"
      />
      <Ear
        d="M27 -6 C30 -19 28 -33 21 -44 C14 -37 9 -30 6 -23 Z"
        inner="M24 -13 C25 -22 24 -29 20 -37 C16 -32 13 -27 11 -22 Z"
      />
    </>
  );
}

/**
 * Head silhouette: a big rounded blob with a little tuft on top and a pointy
 * fur cheek on each side. Deliberately not mirrored: the right (near) side
 * is a touch fuller because the fox faces right.
 */
const HEAD_D =
  "M-31 -2 C-29 -15 -18 -24 -6 -25 C-4 -29 1 -30 3 -26 C15 -25 28 -15 30 -2 " +
  "C31 5 32 9 34 13 C30 15 27 17 25 19 C18 26 8 28 0 28 C-10 28 -20 25 -26 19 " +
  "C-29 17 -32 15 -36 12 C-33 8 -32 4 -31 -2 Z";

/** Cream muzzle mask: two soft bumps under the eyes, rounded chin. */
const MUZZLE_D =
  "M-15 6 C-12 -1 -4 -1 2 4 C8 -1 16 -1 19 6 C23 14 16 25 2 25 C-12 25 -19 14 -15 6 Z";

function BrowsPart({ kind }: { kind: Brows }) {
  if (kind === "none") return null;
  const brow = { ...detail, strokeWidth: 3 };
  if (kind === "raised") {
    return (
      <g {...brow}>
        <path d="M-13 -16 Q-9 -19 -5 -17" />
        <path d="M7 -17 Q11.5 -20 16 -17" />
      </g>
    );
  }
  if (kind === "excited") {
    return (
      <g {...brow}>
        <path d="M-12.5 -13 Q-9 -14.5 -5.5 -13.5" />
        <path d="M7 -16 Q11.5 -19.5 16 -16.5" />
      </g>
    );
  }
  if (kind === "arched") {
    return (
      <g {...brow}>
        <path d="M-13 -15 Q-9 -18.5 -5 -16" />
        <path d="M7 -16 Q11.5 -19.5 16 -15.5" />
      </g>
    );
  }
  return (
    <g {...brow}>
      <path d="M-12.5 -12.5 Q-9 -14 -5.5 -13" />
      <path d="M7.5 -13.5 Q11.5 -15.5 15.5 -13.5" />
    </g>
  );
}

function EyesPart({ kind }: { kind: Eyes }) {
  if (kind === "closed") {
    return (
      <g {...detail} strokeWidth={3.2}>
        <path d="M-15 -3 Q-9 -11.5 -3 -3" />
        <path d="M5 -3 Q11.5 -12 18 -3" />
      </g>
    );
  }
  if (kind === "wide") {
    return (
      <g>
        <circle cx={-9} cy={-5} r={6} fill={OUTLINE} />
        <circle cx={11.5} cy={-5} r={6.4} fill={OUTLINE} />
        <circle cx={-7} cy={-7.2} r={2} fill="#fff" />
        <circle cx={13.8} cy={-7.2} r={2.1} fill="#fff" />
        <circle cx={-11} cy={-2.6} r={0.9} fill="#fff" />
        <circle cx={9.6} cy={-2.6} r={0.9} fill="#fff" />
      </g>
    );
  }
  if (kind === "happy") {
    return (
      <g>
        <ellipse cx={-9} cy={-4.5} rx={4.8} ry={5.6} fill={OUTLINE} />
        <ellipse cx={11.5} cy={-4.5} rx={5.2} ry={6} fill={OUTLINE} />
        <circle cx={-7.2} cy={-6.6} r={1.8} fill="#fff" />
        <circle cx={13.6} cy={-6.8} r={2} fill="#fff" />
      </g>
    );
  }
  // soft (idle)
  return (
    <g>
      <ellipse cx={-9} cy={-4} rx={4.6} ry={5.4} fill={OUTLINE} />
      <ellipse cx={11.5} cy={-4} rx={5} ry={5.8} fill={OUTLINE} />
      <circle cx={-7.3} cy={-6} r={1.7} fill="#fff" />
      <circle cx={13.5} cy={-6.2} r={1.9} fill="#fff" />
    </g>
  );
}

function MouthPart({ kind }: { kind: Mouth }) {
  if (kind === "o") {
    return (
      <g>
        <path d="M3.2 10.5 V13" {...detail} />
        <ellipse cx={3.6} cy={16.2} rx={2.8} ry={3.3} fill={OUTLINE} />
      </g>
    );
  }
  if (kind === "open") {
    return (
      <g>
        <path d="M3.2 10.5 V12.5" {...detail} />
        <path d="M-5 12.5 Q3.5 24 12.5 12.5 Z" fill={OUTLINE} {...outline} strokeWidth={2} />
        <ellipse cx={4} cy={17} rx={3} ry={1.7} fill={PINK} />
      </g>
    );
  }
  if (kind === "grin") {
    return (
      <g>
        <path d="M3.2 10.5 V12" {...detail} />
        <path d="M-9 12 Q3 26 15 12 Z" fill={OUTLINE} {...outline} strokeWidth={2} />
        <ellipse cx={3.5} cy={17.4} rx={3.6} ry={1.9} fill={PINK} />
      </g>
    );
  }
  // content smile
  return (
    <g {...detail}>
      <path d="M3.2 10.5 V13.5" />
      <path d="M-6 12.5 Q3 20.5 12.5 12.5" />
    </g>
  );
}

interface HeadProps {
  x: number;
  y: number;
  rotate?: number;
  ears: Ears;
  eyes: Eyes;
  mouth: Mouth;
  brows: Brows;
}

/**
 * The head in local coordinates: centre (0,0), about 66 wide and 53 tall,
 * ears above. Features sit slightly right of centre so the fox reads as
 * facing toward the right.
 */
function Head({ x, y, rotate = 0, ears, eyes, mouth, brows }: HeadProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <EarsPart kind={ears} />
      <path d={HEAD_D} fill={ORANGE} {...outline} />
      <path d={MUZZLE_D} fill={CREAM} />
      {/* cheeks */}
      <ellipse cx={-18} cy={7.5} rx={4.6} ry={3} fill={PINK} />
      <ellipse cx={22} cy={7} rx={4.8} ry={3.1} fill={PINK} />
      <BrowsPart kind={brows} />
      <EyesPart kind={eyes} />
      {/* nose */}
      <path d="M-1.2 5.6 L7.6 5.6 L3.2 10.6 Z" fill={OUTLINE} {...outline} strokeWidth={2.6} />
      <MouthPart kind={mouth} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Body parts (scene coordinates)                                      */
/* ------------------------------------------------------------------ */

/** A stubby limb: an outlined thick rounded line. */
function Limb({ x1, y1, x2, y2, w = 9 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={OUTLINE} strokeWidth={w + LINE * 2} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ORANGE} strokeWidth={w} />
    </g>
  );
}

/** A round paw with two little toe splits. `angle` turns the toes toward the reach direction. */
function Paw({ x, y, r = 5.6, angle = 0 }: { x: number; y: number; r?: number; angle?: number }) {
  return (
    <g transform={`rotate(${angle} ${x} ${y})`}>
      <circle cx={x} cy={y} r={r} fill={ORANGE} {...outline} />
      <path d={`M${x - 2} ${y + r * 0.3} v${r * 0.5} M${x + 2} ${y + r * 0.3} v${r * 0.5}`} {...detail} strokeWidth={2} />
    </g>
  );
}

interface TailProps {
  d: string;
  tip: string;
  ids: Ids;
}

/** Thick tail: orange with a cream tip clipped to the tail, outline on top. */
function Tail({ d, tip, ids }: TailProps) {
  return (
    <g>
      <clipPath id={ids.tail}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={ORANGE} />
      <g clipPath={`url(#${ids.tail})`}>
        <path d={tip} fill={CREAM} />
      </g>
      <path d={d} fill="none" {...outline} />
    </g>
  );
}

interface BodyProps {
  d: string;
  ids: Ids;
  /** cream chest / belly patch in scene coordinates */
  belly: string;
  /** optional flat darker shadow shape, clipped to the body (e.g. under the chin) */
  shade?: JSX.Element;
}

function Body({ d, ids, belly, shade }: BodyProps) {
  return (
    <g>
      <clipPath id={ids.body}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={ORANGE} />
      <g clipPath={`url(#${ids.body})`}>
        {shade ?? null}
        <path d={belly} fill={CREAM} />
      </g>
      <path d={d} fill="none" {...outline} />
    </g>
  );
}

function GroundShadow({ cx, cy, rx, ry, opacity = 0.45 }: { cx: number; cy: number; rx: number; ry: number; opacity?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={SHADOW} opacity={opacity} />;
}

/* ------------------------------------------------------------------ */
/* Poses                                                               */
/* ------------------------------------------------------------------ */

const SIT_BODY = "M35 74 C27 82 26 98 31 105 C34 109 70 109 73 105 C78 98 76 82 69 74 Z";
const SIT_BELLY = "M41 80 C41 73 63 73 63 80 C65 92 60 101 52 104 C44 101 39 92 41 80 Z";
const SIT_SHADE = <path d="M20 60 C30 80 74 80 84 60 L84 50 L20 50 Z" fill={DARK} transform="translate(0 2)" />;

const SIT_TAIL =
  "M34 93 C16 93 8 106 18 113 C32 118 62 117 76 111 C84 107 86 99 80 95 C74 92 69 99 62 102 C52 107 42 106 37 100 Z";
const SIT_TAIL_TIP = "M63 90 C70 96 64 104 69 112 L96 118 L96 86 Z";

/** Sitting fox: shared by `idle` and `earsPerked`. */
function Sitting({ ids, head }: { ids: Ids; head: JSX.Element }) {
  return (
    <>
      {/* hind foot peeking out on the far side */}
      <ellipse cx={31} cy={104} rx={8} ry={4.6} fill={ORANGE} {...outline} />
      <Body d={SIT_BODY} ids={ids} belly={SIT_BELLY} shade={SIT_SHADE} />
      <Limb x1={41} y1={92} x2={41} y2={102} />
      <Limb x1={61} y1={92} x2={61} y2={102} />
      <Paw x={41} y={104} />
      <Paw x={61} y={104} />
      <Tail d={SIT_TAIL} tip={SIT_TAIL_TIP} ids={ids} />
      {head}
    </>
  );
}

function IdlePose({ ids }: { ids: Ids }) {
  return (
    <>
      <GroundShadow cx={50} cy={113} rx={36} ry={4} />
      <g data-part="fox">
        <Sitting
          ids={ids}
          head={<Head x={52} y={48} rotate={-4} ears="relaxed" eyes="soft" mouth="smile" brows="relaxed" />}
        />
      </g>
    </>
  );
}

function EarsPerkedPose({ ids }: { ids: Ids }) {
  return (
    <>
      <GroundShadow cx={50} cy={113} rx={36} ry={4} />
      <g data-part="fox">
        <Sitting
          ids={ids}
          head={<Head x={52} y={48} rotate={0} ears="perked" eyes="wide" mouth="o" brows="raised" />}
        />
      </g>
    </>
  );
}

const CATCH_BODY = "M37 74 C29 82 27 98 32 105 C35 109 70 109 73 105 C78 98 75 82 68 74 Z";
const CATCH_BELLY = "M42 80 C42 73 64 73 64 80 C66 92 61 101 53 104 C45 101 40 92 42 80 Z";
const CATCH_TAIL =
  "M40 94 C26 98 12 92 10 78 C8 66 16 56 25 58 C31 60 31 66 27 69 C21 73 21 82 27 88 C32 92 38 90 42 88 Z";
const CATCH_TAIL_TIP = "M0 72 C10 70 20 72 34 66 L34 44 L0 44 Z";

function CatchingPose({ ids }: { ids: Ids }) {
  return (
    <>
      <GroundShadow cx={52} cy={113} rx={34} ry={4} />
      <g data-part="fox">
        <Tail d={CATCH_TAIL} tip={CATCH_TAIL_TIP} ids={ids} />
        <g transform="rotate(-6 52 106)">
          <ellipse cx={33} cy={104} rx={8} ry={4.6} fill={ORANGE} {...outline} />
          <Body d={CATCH_BODY} ids={ids} belly={CATCH_BELLY} shade={SIT_SHADE} />
          <Limb x1={43} y1={92} x2={43} y2={102} />
          <Paw x={43} y={104} />
        </g>
        {/* flat catch glow where the paw meets the spark */}
        <circle cx={91} cy={56} r={11} fill={GLOW} opacity={0.8} />
        <Head x={55} y={47} rotate={7} ears="perked" eyes="happy" mouth="open" brows="excited" />
        {/* reaching arm */}
        <Limb x1={66} y1={84} x2={88} y2={60} w={9.5} />
        <Paw x={90} y={57} r={6} angle={-140} />
      </g>
    </>
  );
}

const CELEB_BODY = "M37 68 C29 76 27 90 32 97 C35 101 70 101 73 97 C78 90 75 76 68 68 Z";
const CELEB_BELLY = "M42 74 C42 67 64 67 64 74 C66 86 61 95 53 98 C45 95 40 86 42 74 Z";
const CELEB_TAIL =
  "M44 90 C30 92 14 84 10 70 C5 56 6 42 15 36 C21 32 29 37 26 43 C19 50 19 60 24 68 C29 76 38 82 46 84 Z";
const CELEB_TAIL_TIP = "M0 56 C10 52 18 54 30 48 L30 24 L0 24 Z";

function CelebratingPose({ ids }: { ids: Ids }) {
  return (
    <>
      {/* little hill bump */}
      <path d="M-4 122 C4 100 28 94 50 94 C72 94 96 100 104 122 Z" fill={HILL} />
      <GroundShadow cx={50} cy={98} rx={28} ry={3.4} opacity={0.4} />
      <g data-part="fox">
        <Tail d={CELEB_TAIL} tip={CELEB_TAIL_TIP} ids={ids} />
        {/* hind feet planted on the hill */}
        <ellipse cx={37} cy={97} rx={8} ry={4.6} fill={ORANGE} {...outline} />
        <ellipse cx={67} cy={97} rx={8} ry={4.6} fill={ORANGE} {...outline} />
        {/* arms up */}
        <Limb x1={38} y1={80} x2={20} y2={60} />
        <Limb x1={66} y1={80} x2={84} y2={60} />
        <Paw x={18} y={57} angle={150} />
        <Paw x={86} y={57} angle={-150} />
        <Body d={CELEB_BODY} ids={ids} belly={CELEB_BELLY} shade={<path d="M20 56 C30 74 74 74 84 56 L84 40 L20 40 Z" fill={DARK} />} />
        <Head x={52} y={43} rotate={-6} ears="relaxed" eyes="closed" mouth="grin" brows="none" />
      </g>
    </>
  );
}

const HOP_BODY = "M38 74 C30 80 29 94 34 101 C37 105 67 105 70 101 C75 94 74 80 66 74 Z";
const HOP_BELLY = "M43 80 C43 73 63 73 63 80 C65 90 60 98 52 101 C44 98 41 90 43 80 Z";
const HOP_TAIL =
  "M42 92 C30 96 16 88 10 74 C6 62 12 52 20 52 C26 52 28 58 24 62 C18 66 18 76 23 82 C28 88 36 88 42 86 Z";
const HOP_TAIL_TIP = "M0 70 C10 66 18 68 28 62 L28 40 L0 40 Z";

function HopPose({ ids }: { ids: Ids }) {
  return (
    <>
      <GroundShadow cx={52} cy={114} rx={22} ry={3} opacity={0.35} />
      <g data-part="fox" transform="translate(0 -10) rotate(-12 50 90)">
        <Tail d={HOP_TAIL} tip={HOP_TAIL_TIP} ids={ids} />
        {/* tucked hind leg, trailing behind */}
        <Limb x1={38} y1={92} x2={34} y2={101} w={8} />
        <Paw x={33} y={103} r={5} angle={20} />
        <Body d={HOP_BODY} ids={ids} belly={HOP_BELLY} shade={SIT_SHADE} />
        {/* front paws tucked up under the chest */}
        <Limb x1={50} y1={92} x2={52} y2={99} w={8} />
        <Limb x1={63} y1={90} x2={67} y2={95} w={8} />
        <Paw x={52} y={101} r={5} angle={-20} />
        <Paw x={69} y={97} r={5} angle={-45} />
        <Head x={55} y={48} rotate={6} ears="back" eyes="happy" mouth="open" brows="excited" />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Fox({
  pose,
  width = 120,
  breathing,
  reducedMotion,
  className,
  style,
}: CharacterProps & { pose: FoxPose }): JSX.Element {
  const uid = `fox-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ids: Ids = { body: `${uid}-body`, tail: `${uid}-tail` };
  const animate = Boolean(breathing) && !reducedMotion;
  const breatheClass = `${uid}-breathe`;

  let scene: JSX.Element;
  switch (pose) {
    case "earsPerked":
      scene = <EarsPerkedPose ids={ids} />;
      break;
    case "catching":
      scene = <CatchingPose ids={ids} />;
      break;
    case "celebrating":
      scene = <CelebratingPose ids={ids} />;
      break;
    case "hop":
      scene = <HopPose ids={ids} />;
      break;
    case "idle":
    default:
      scene = <IdlePose ids={ids} />;
      break;
  }

  return (
    <svg
      viewBox="0 0 100 120"
      width={width}
      height={width * 1.2}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
    >
      {animate ? (
        <style>
          {`@keyframes ${uid}-b { from { transform: scale(1); } to { transform: scale(1.015); } }
.${breatheClass} { animation: ${uid}-b 3s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 50% 100%; }`}
        </style>
      ) : null}
      <g className={animate ? breatheClass : undefined}>{scene}</g>
    </svg>
  );
}

export default Fox;
