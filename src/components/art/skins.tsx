import { useId, type JSX, type ReactNode } from "react";
import type { SkinId, SkinProps } from "./types";

/**
 * Stimulus skins: six small night-time mascots drawn in a bold, flat
 * "sticker" style — thick dark outlines, flat colour, chunky friendly shapes.
 *
 * Every sprite is drawn centred in a 120 × 120 viewBox (-60..60 on both axes)
 * so that `size` scales it uniformly. When `glow` is set, a soft radial halo
 * is drawn behind the sprite; the halo may extend up to 2× the box. The halo
 * is the only soft element — bodies use no gradients and no filters.
 *
 * Nothing in here is random or animated: the same props always produce the
 * same markup. Animation is applied by the game code around these components.
 */

const DEFAULT_GLOW = "#FFC145";

const C = {
  ink: "#1A1530",
  cream: "#FFF6E0",
  creamShade: "#EAD7AC",
  glow: "#FFC145",
  glowShade: "#E0A52E",
  peri: "#B8C4F0",
  periShade: "#8E9CD6",
  mint: "#8FF0C9",
  mintShade: "#5BCFA3",
  pink: "#FF9EC4",
  pinkShade: "#E57BA6",
  white: "#FFFFFF",
} as const;

/** Outline weights in viewBox units. */
const OUTLINE = 3;
const DETAIL = 2;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Unique, CSS-safe id factory for this component instance. */
function useSkinIds(prefix: string): (name: string) => string {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (name: string) => `${prefix}-${raw}-${name}`;
}

interface FrameProps extends SkinProps {
  /** id for the halo gradient (must be unique per instance) */
  haloId: string;
  /** where the glow comes from, in viewBox units */
  haloCx?: number;
  haloCy?: number;
  /** halo radius in viewBox units; keep ≤ 120 - |offset| so it stays within 2× the box */
  haloR?: number;
  children: ReactNode;
}

function Frame({
  size = 120,
  glow = false,
  glowColor = DEFAULT_GLOW,
  className,
  style,
  haloId,
  haloCx = 0,
  haloCy = 0,
  haloR = 100,
  children,
}: FrameProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-60 -60 120 120"
      width={size}
      height={size}
      className={className}
      style={{ overflow: "visible", display: "block", ...style }}
      aria-hidden="true"
      focusable="false"
    >
      {glow ? <Halo id={haloId} color={glowColor} cx={haloCx} cy={haloCy} r={haloR} /> : null}
      <g stroke={C.ink} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  );
}

interface HaloProps {
  id: string;
  color: string;
  cx: number;
  cy: number;
  r: number;
}

/** Soft, warm halo: a single radial gradient disc plus a brighter core disc. */
function Halo({ id, color, cx, cy, r }: HaloProps): JSX.Element {
  return (
    <g>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={color} stopOpacity="0.8" />
          <stop offset="0.16" stopColor={color} stopOpacity="0.5" />
          <stop offset="0.38" stopColor={color} stopOpacity="0.22" />
          <stop offset="0.68" stopColor={color} stopOpacity="0.07" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={C.cream} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
      <circle cx={cx} cy={cy} r={r * 0.38} fill={`url(#${id}-core)`} />
    </g>
  );
}

interface FaceProps {
  cx: number;
  cy: number;
  /** half distance between eye centres */
  gap: number;
  /** eye half-width; eyes are tall ovals (ry ≈ 1.25 × rx) */
  eyeR: number;
  /** vertical distance from eye line to mouth; omit mouth with smileW = 0 */
  mouthDrop: number;
  smileW: number;
  smileDepth: number;
  /** cheek offset from centre; omit to skip cheeks */
  cheekX?: number;
  cheekY?: number;
  cheekR?: number;
  cheekColor?: string;
}

/** Big simple face so every skin reads as one family: navy ovals, white dot, smile. */
function Face({
  cx,
  cy,
  gap,
  eyeR,
  mouthDrop,
  smileW,
  smileDepth,
  cheekX,
  cheekY = 3,
  cheekR,
  cheekColor = C.pink,
}: FaceProps): JSX.Element {
  const my = cy + mouthDrop;
  const half = smileW / 2;
  const ry = eyeR * 1.25;
  const hl = eyeR * 0.42;
  const cr = cheekR ?? eyeR * 1.1;
  return (
    <g>
      {cheekX !== undefined ? (
        <g fill={cheekColor} stroke="none">
          <ellipse cx={cx - cheekX} cy={cy + cheekY} rx={cr * 1.35} ry={cr} />
          <ellipse cx={cx + cheekX} cy={cy + cheekY} rx={cr * 1.35} ry={cr} />
        </g>
      ) : null}
      <g fill={C.ink} stroke="none">
        <ellipse cx={cx - gap} cy={cy} rx={eyeR} ry={ry} />
        <ellipse cx={cx + gap} cy={cy} rx={eyeR} ry={ry} />
      </g>
      <g fill={C.white} stroke="none">
        <circle cx={cx - gap - eyeR * 0.3} cy={cy - ry * 0.38} r={hl} />
        <circle cx={cx + gap - eyeR * 0.3} cy={cy - ry * 0.38} r={hl} />
      </g>
      {smileW > 0 ? (
        <path
          d={`M ${fmt(cx - half)} ${fmt(my)} Q ${fmt(cx)} ${fmt(my + smileDepth)} ${fmt(cx + half)} ${fmt(my)}`}
          fill="none"
          strokeWidth={DETAIL}
        />
      ) : null}
    </g>
  );
}

type Pt = [number, number];
const fmt = (n: number): string => n.toFixed(2).replace(/\.?0+$/, "");

/**
 * A chubby star with rounded points. Computed once at module load so the
 * path string is identical on every render.
 */
function roundedStarPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 5,
  rotationDeg = -90,
  rounding = 0.4,
): string {
  const n = points * 2;
  const verts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((Math.PI * 2) / n) * i + (rotationDeg * Math.PI) / 180;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n];
    const cur = verts[i];
    const next = verts[(i + 1) % n];
    const k = i % 2 === 0 ? rounding : rounding * 0.6;
    const pIn: Pt = [cur[0] + (prev[0] - cur[0]) * k, cur[1] + (prev[1] - cur[1]) * k];
    const pOut: Pt = [cur[0] + (next[0] - cur[0]) * k, cur[1] + (next[1] - cur[1]) * k];
    d += `${i === 0 ? "M" : " L"} ${fmt(pIn[0])} ${fmt(pIn[1])} Q ${fmt(cur[0])} ${fmt(cur[1])} ${fmt(pOut[0])} ${fmt(pOut[1])}`;
  }
  return `${d} Z`;
}

/** Chunky four-point sparkle with concave sides. */
function sparklePath(cx: number, cy: number, r: number): string {
  const p = r * 0.26;
  return (
    `M ${fmt(cx)} ${fmt(cy - r)} Q ${fmt(cx + p)} ${fmt(cy - p)} ${fmt(cx + r)} ${fmt(cy)}` +
    ` Q ${fmt(cx + p)} ${fmt(cy + p)} ${fmt(cx)} ${fmt(cy + r)}` +
    ` Q ${fmt(cx - p)} ${fmt(cy + p)} ${fmt(cx - r)} ${fmt(cy)}` +
    ` Q ${fmt(cx - p)} ${fmt(cy - p)} ${fmt(cx)} ${fmt(cy - r)} Z`
  );
}

/* ------------------------------------------------------------------ */
/* Firefly                                                             */
/* ------------------------------------------------------------------ */

export function FireflySkin(props: SkinProps): JSX.Element {
  const id = useSkinIds("firefly");
  return (
    <Frame {...props} haloId={id("halo")} haloCx={0} haloCy={16} haloR={100}>
      {/* wings (behind the body) */}
      <g strokeWidth={OUTLINE}>
        <ellipse cx={-24} cy={-13} rx={21} ry={10} fill={C.peri} transform="rotate(-36 -24 -13)" />
        <ellipse cx={24} cy={-11} rx={21} ry={10} fill={C.peri} transform="rotate(34 24 -11)" />
      </g>
      {/* wing veins */}
      <g fill="none" strokeWidth={DETAIL}>
        <path d="M -10 -3 L -36 -24" />
        <path d="M -14 -1 Q -24 -6 -32 -4" />
        <path d="M 10 -2 L 36 -22" />
        <path d="M 14 0 Q 24 -5 32 -2" />
      </g>

      {/* little legs */}
      <g fill="none" strokeWidth={2.6}>
        <path d="M -12 4 q -7 2 -9 10" />
        <path d="M 12 4 q 7 2 9 10" />
        <path d="M -15 -4 q -7 0 -11 5" />
        <path d="M 15 -4 q 7 0 11 5" />
      </g>

      {/* glowing abdomen: flat yellow with a darker bottom band and stripes */}
      <ellipse cx={0} cy={18} rx={16} ry={21} fill={C.glow} stroke="none" />
      <path d="M -13 30 A 16 21 0 0 0 13 30 Q 0 36 -13 30 Z" fill={C.glowShade} stroke="none" />
      <g fill="none" strokeWidth={DETAIL}>
        <path d="M -14.5 22 Q 0 27 14.5 22" />
        <path d="M -12 31 Q 0 35 12 31" />
      </g>
      <ellipse cx={-6} cy={9} rx={4} ry={6} fill={C.cream} stroke="none" />
      <ellipse cx={0} cy={18} rx={16} ry={21} fill="none" strokeWidth={OUTLINE} />

      {/* thorax */}
      <ellipse cx={0} cy={-5} rx={13.5} ry={10.5} fill={C.peri} strokeWidth={OUTLINE} />
      <path d="M -9 1 Q 0 7 9 1 Q 0 3 -9 1 Z" fill={C.periShade} stroke="none" />

      {/* antennae */}
      <g fill="none" strokeWidth={DETAIL}>
        <path d="M -6 -37 C -9 -45, -15 -49, -22 -45" />
        <path d="M 6 -37 C 9 -46, 16 -50, 23 -44" />
      </g>
      <g fill={C.glow} strokeWidth={DETAIL}>
        <circle cx={-22} cy={-45} r={3.2} />
        <circle cx={23} cy={-44} r={3.2} />
      </g>

      {/* head */}
      <circle cx={0} cy={-24} r={15} fill={C.cream} strokeWidth={OUTLINE} />
      <path d="M -11 -14 A 15 15 0 0 0 11 -14 Q 0 -10 -11 -14 Z" fill={C.creamShade} stroke="none" />

      <Face cx={0} cy={-25} gap={6} eyeR={2.8} mouthDrop={6} smileW={8} smileDepth={3.5} cheekX={10.5} cheekY={3} cheekR={2.4} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Butterfly                                                           */
/* ------------------------------------------------------------------ */

function ButterflyWingHalf(): JSX.Element {
  return (
    <g>
      {/* upper wing */}
      <path d="M 2 -6 C 6 -32, 30 -52, 47 -39 C 58 -26, 42 -3, 5 5 Z" fill={C.peri} strokeWidth={OUTLINE} />
      <path d="M 47 -39 C 58 -26, 42 -3, 5 5 C 40 -6, 52 -22, 47 -39 Z" fill={C.periShade} stroke="none" />
      {/* lower wing */}
      <path d="M 3 4 C 24 0, 46 14, 40 32 C 34 46, 12 44, 3 24 Z" fill={C.pink} strokeWidth={OUTLINE} />
      <path d="M 40 32 C 34 46, 12 44, 3 24 C 12 38, 30 42, 40 32 Z" fill={C.pinkShade} stroke="none" />
      {/* outline pass on top of the shade bands */}
      <path d="M 2 -6 C 6 -32, 30 -52, 47 -39 C 58 -26, 42 -3, 5 5 Z" fill="none" strokeWidth={OUTLINE} />
      <path d="M 3 4 C 24 0, 46 14, 40 32 C 34 46, 12 44, 3 24 Z" fill="none" strokeWidth={OUTLINE} />
      {/* glowing spots */}
      <circle cx={27} cy={-24} r={8.5} fill={C.glow} strokeWidth={DETAIL} />
      <circle cx={22} cy={21} r={5.5} fill={C.glow} strokeWidth={DETAIL} />
      <g fill={C.cream} stroke="none">
        <circle cx={24} cy={-27} r={2.4} />
        <circle cx={20} cy={19} r={1.6} />
        <circle cx={40} cy={-32} r={2.2} />
        <circle cx={33} cy={32} r={1.8} />
      </g>
    </g>
  );
}

export function ButterflySkin(props: SkinProps): JSX.Element {
  const id = useSkinIds("butterfly");
  return (
    <Frame {...props} haloId={id("halo")} haloCx={0} haloCy={-4} haloR={108}>
      <ButterflyWingHalf />
      <g transform="scale(-1 1)">
        <ButterflyWingHalf />
      </g>

      {/* body */}
      <ellipse cx={0} cy={10} rx={7.5} ry={18} fill={C.cream} strokeWidth={OUTLINE} />
      <g fill="none" strokeWidth={DETAIL}>
        <path d="M -6 12 Q 0 15 6 12" />
        <path d="M -5 20 Q 0 23 5 20" />
      </g>

      {/* curling antennae */}
      <g fill="none" strokeWidth={DETAIL}>
        <path d="M -5 -26 C -9 -36, -20 -42, -19 -34" />
        <path d="M 5 -26 C 9 -36, 20 -43, 19 -34" />
      </g>
      <g fill={C.glow} strokeWidth={DETAIL}>
        <circle cx={-19} cy={-34} r={3} />
        <circle cx={19} cy={-34} r={3} />
      </g>

      {/* head */}
      <circle cx={0} cy={-15} r={12.5} fill={C.cream} strokeWidth={OUTLINE} />

      <Face cx={0} cy={-16.5} gap={4.8} eyeR={2.5} mouthDrop={5.5} smileW={7} smileDepth={3} cheekX={8.6} cheekY={2.4} cheekR={2} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Friendly pup                                                        */
/* ------------------------------------------------------------------ */

export function PupSkin(props: SkinProps): JSX.Element {
  const id = useSkinIds("pup");
  return (
    <Frame {...props} haloId={id("halo")} haloCx={0} haloCy={14} haloR={100}>
      {/* floppy ears (behind the head) */}
      <g strokeWidth={OUTLINE}>
        <path d="M -16 -24 C -38 -32, -49 -4, -40 20 C -36 31, -22 29, -20 15 Z" fill={C.periShade} />
        <path d="M 16 -22 C 37 -32, 48 -6, 40 18 C 36 30, 22 28, 20 14 Z" fill={C.periShade} />
      </g>
      <g fill={C.pink} stroke="none">
        <path d="M -30 -6 C -37 -2, -40 10, -35 17 C -31 20, -27 14, -27 6 Z" />
        <path d="M 30 -6 C 37 -2, 40 10, 35 17 C 31 20, 27 14, 27 6 Z" />
      </g>

      {/* head */}
      <circle cx={0} cy={-1} r={30} fill={C.peri} stroke="none" />
      {/* eye patch */}
      <circle cx={14} cy={-9} r={10.5} fill={C.periShade} stroke="none" />
      {/* chin shade */}
      <path d="M -22 19 A 30 30 0 0 0 22 19 Q 0 24 -22 19 Z" fill={C.periShade} stroke="none" />
      <circle cx={0} cy={-1} r={30} fill="none" strokeWidth={OUTLINE} />
      {/* fur tuft */}
      <path d="M -9 -28 Q -6 -42 1 -33 Q 6 -43 12 -30 Q 2 -36 -9 -28 Z" fill={C.peri} strokeWidth={OUTLINE} />
      <path d="M -8 -29 Q -5 -38 1 -33 Q 6 -40 10 -31 Q 1 -35 -8 -29 Z" fill={C.peri} stroke="none" />

      {/* muzzle */}
      <ellipse cx={0} cy={12} rx={16} ry={12} fill={C.cream} strokeWidth={OUTLINE} />
      {/* nose */}
      <ellipse cx={0} cy={7} rx={5.5} ry={4} fill={C.ink} stroke="none" />
      <circle cx={-2} cy={5.8} r={1.3} fill={C.white} stroke="none" />
      {/* mouth */}
      <g fill="none" strokeWidth={DETAIL}>
        <path d="M 0 11 L 0 14.5" />
        <path d="M -6.5 13.5 Q 0 20 6.5 13.5" />
      </g>

      <Face cx={0} cy={-8} gap={12} eyeR={3.4} mouthDrop={0} smileW={0} smileDepth={0} cheekX={22} cheekY={10} cheekR={2.6} />

      {/* collar + glowing tag */}
      <path d="M -24 20 Q 0 37 24 20" fill="none" strokeWidth={11} />
      <path d="M -24 20 Q 0 37 24 20" fill="none" stroke={C.pink} strokeWidth={5.5} />
      <circle cx={0} cy={37} r={7} fill={C.glow} strokeWidth={OUTLINE} />
      <circle cx={-2.2} cy={34.8} r={1.8} fill={C.cream} stroke="none" />
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Comet                                                               */
/* ------------------------------------------------------------------ */

const COMET_HEAD = roundedStarPath(17, -17, 31, 18, 5, -90, 0.45);

export function CometSkin(props: SkinProps): JSX.Element {
  const id = useSkinIds("comet");
  return (
    <Frame {...props} haloId={id("halo")} haloCx={10} haloCy={-10} haloR={100}>
      {/* chunky tail: three flat bands, widest at the back */}
      <path d="M 20 -38 C -8 -38, -40 -6, -56 46 C -30 20, -2 8, 28 0 Z" fill={C.periShade} strokeWidth={OUTLINE} />
      <path d="M 20 -34 C -6 -31, -32 -4, -47 36 C -26 16, -2 6, 26 -1 Z" fill={C.peri} stroke="none" />
      <path d="M 18 -29 C -2 -25, -24 -2, -38 26 C -18 10, 0 2, 22 -2 Z" fill={C.cream} stroke="none" />
      <path d="M 20 -38 C -8 -38, -40 -6, -56 46 C -30 20, -2 8, 28 0 Z" fill="none" strokeWidth={OUTLINE} />

      {/* sparkles around the tail */}
      <g fill={C.cream} strokeWidth={DETAIL}>
        <path d={sparklePath(-36, 2, 6)} />
        <path d={sparklePath(-50, 36, 4.5)} />
      </g>
      <circle cx={-14} cy={34} r={2.4} fill={C.cream} stroke="none" />
      <circle cx={-36} cy={30} r={1.8} fill={C.glow} stroke="none" />

      {/* star head */}
      <path d={COMET_HEAD} fill={C.glow} strokeWidth={OUTLINE} />
      <path d="M 8 -3 Q 17 2 26 -3 Q 17 5 8 -3 Z" fill={C.glowShade} stroke="none" />
      <ellipse cx={8} cy={-34} rx={4.5} ry={2.4} fill={C.cream} stroke="none" transform="rotate(-30 8 -34)" />

      <Face cx={17} cy={-16} gap={7.5} eyeR={3.3} mouthDrop={7} smileW={10} smileDepth={4.5} cheekX={14} cheekY={4} cheekR={2.6} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Glow jelly                                                          */
/* ------------------------------------------------------------------ */

const JELLY_DOME =
  "M -34 4 C -34 -28, -20 -42, 0 -42 C 20 -42, 34 -28, 34 4 " +
  "Q 25.5 12 17 4 Q 8.5 12 0 4 Q -8.5 12 -17 4 Q -25.5 12 -34 4 Z";

const JELLY_TENTACLES: { d: string; color: string }[] = [
  { d: "M -26 6 C -22 16, -34 26, -28 40", color: C.mint },
  { d: "M -13 8 C -8 20, -20 32, -13 46", color: C.pink },
  { d: "M 0 8 C 5 20, -5 32, 1 48", color: C.mint },
  { d: "M 13 8 C 18 20, 6 32, 13 46", color: C.pink },
  { d: "M 26 6 C 30 16, 20 26, 27 40", color: C.mint },
];

export function JellySkin(props: SkinProps): JSX.Element {
  const id = useSkinIds("jelly");
  return (
    <Frame {...props} haloId={id("halo")} haloCx={0} haloCy={-6} haloR={100}>
      {/* tentacles: ink pass, then colour pass, so each ribbon has an outline */}
      <g fill="none" strokeWidth={11}>
        {JELLY_TENTACLES.map((t) => (
          <path key={t.d} d={t.d} />
        ))}
      </g>
      <g fill="none" strokeWidth={5}>
        {JELLY_TENTACLES.map((t) => (
          <path key={t.d} d={t.d} stroke={t.color} />
        ))}
      </g>

      {/* dome */}
      <path d={JELLY_DOME} fill={C.pink} stroke="none" />
      <path d="M -34 4 Q -25.5 12 -17 4 Q -8.5 12 0 4 Q 8.5 12 17 4 Q 25.5 12 34 4 L 34 -3 Q 0 3 -34 -3 Z" fill={C.pinkShade} stroke="none" />
      {/* inner glow window */}
      <ellipse cx={0} cy={-15} rx={21} ry={17} fill={C.glow} strokeWidth={DETAIL} />
      <ellipse cx={-9} cy={-24} rx={5} ry={3} fill={C.cream} stroke="none" transform="rotate(-35 -9 -24)" />
      <path d={JELLY_DOME} fill="none" strokeWidth={OUTLINE} />

      <Face cx={0} cy={-13} gap={8} eyeR={3} mouthDrop={6.5} smileW={10} smileDepth={4} cheekX={14} cheekY={4} cheekR={2.4} cheekColor={C.pinkShade} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Star spark                                                          */
/* ------------------------------------------------------------------ */

const SPARK_STAR = roundedStarPath(0, 0, 42, 23.5, 5, -90, 0.42);

export function SparkSkin(props: SkinProps): JSX.Element {
  const id = useSkinIds("spark");
  return (
    <Frame {...props} haloId={id("halo")} haloCx={0} haloCy={0} haloR={110}>
      {/* chunky sparkles */}
      <g fill={C.cream} strokeWidth={DETAIL}>
        <path d={sparklePath(44, -36, 8)} />
        <path d={sparklePath(-46, 30, 6)} />
      </g>
      <circle cx={42} cy={30} r={2.4} fill={C.cream} stroke="none" />
      <circle cx={-42} cy={-32} r={2} fill={C.cream} stroke="none" />

      {/* star body */}
      <path d={SPARK_STAR} fill={C.glow} stroke="none" />
      {/* flat shade on the two lower points */}
      <path d="M -16 18 Q -6 20 0 26 Q 6 20 16 18 L 25 36 Q 0 30 -25 36 Z" fill={C.glowShade} stroke="none" />
      <path d={SPARK_STAR} fill="none" strokeWidth={OUTLINE} />
      <ellipse cx={-14} cy={-18} rx={7} ry={3.6} fill={C.cream} stroke="none" transform="rotate(-35 -14 -18)" />

      <Face cx={0} cy={1} gap={9} eyeR={3.4} mouthDrop={8} smileW={13} smileDepth={5} cheekX={18} cheekY={5} cheekR={2.8} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

const SKIN_COMPONENTS: Record<SkinId, (props: SkinProps) => JSX.Element> = {
  firefly: FireflySkin,
  butterfly: ButterflySkin,
  pup: PupSkin,
  comet: CometSkin,
  jelly: JellySkin,
  spark: SparkSkin,
};

export function Skin({ id, ...props }: SkinProps & { id: SkinId }): JSX.Element {
  const Component = SKIN_COMPONENTS[id] ?? FireflySkin;
  return <Component {...props} />;
}
