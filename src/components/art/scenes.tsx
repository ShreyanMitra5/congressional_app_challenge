"use client";

import { useId, useSyncExternalStore } from "react";
import type { CSSProperties, JSX } from "react";
import { dayPalette, palette, STAGE_H, STAGE_W } from "@/lib/theme";

/**
 * Full-screen storybook backgrounds for the three worlds, by night (default)
 * or by day. Everything is drawn on the fixed 390 × 844 reference canvas and
 * scaled with `xMidYMid slice`, so the art always covers the viewport without
 * stretching. Rendering is fully deterministic (all star positions are hardcoded).
 *
 * Night and day share every path and coordinate; only the colour set differs,
 * plus the moon becoming a sun and the stars fading to almost nothing.
 */
export type SceneVariant = "forest" | "trail" | "space" | "neon";

export interface SceneProps {
  variant: SceneVariant;
  /** gentle star fade (0.6 → 1 → 0.6, 2.5–4 s). Ignored when reducedMotion is true. */
  twinkle?: boolean;
  reducedMotion?: boolean;
  /**
   * Draw the daytime version. When omitted the scene follows the theme the
   * settings store writes to `<html data-theme>` (night on the server).
   */
  daytime?: boolean;
  className?: string;
  style?: CSSProperties;
}

/* ------------------------------------------------------------------ */
/* colour sets                                                         */
/* ------------------------------------------------------------------ */

interface SceneColors {
  daytime: boolean;
  /** flat sky fill (also the base behind every layer) */
  sky: string;
  /** lighter sky near the horizon (day only; undefined draws no band) */
  skyBand?: string;
  /** stars: colour and overall opacity multiplier */
  star: string;
  starOpacity: number;
  /** far hills; on the trail this doubles as the meadow */
  hills: string;
  meadow: string;
  /** thin rim line along the hill tops */
  hillRim: string;
  hillRimOpacity: number;
  /** hazy back row of pines / near row of pines */
  pinesBack: string;
  pines: string;
  /** front ground and its rim line */
  ground: string;
  groundEdge: string;
  /* trail */
  stream: string;
  ripple: string;
  bank: string;
  bankRim: string;
  shimmer: string;
  /* space */
  nebula1: string;
  nebula2: string;
  planetLight: string;
  planetMid: string;
  planetDark: string;
  planetShade: string;
  ring: string;
  spaceGlow: string;
  crater: string;
  /* neon */
  cityBack: string;
  cityNear: string;
  rooftop: string;
  antennaTip: string;
}

const NIGHT_COLORS: SceneColors = {
  daytime: false,
  sky: palette.night,
  star: palette.cream,
  starOpacity: 1,
  hills: palette.hills,
  meadow: palette.hills,
  hillRim: palette.cream,
  hillRimOpacity: 0.06,
  pinesBack: palette.pines,
  pines: palette.pines,
  ground: palette.ground,
  groundEdge: palette.hills,
  stream: palette.stream,
  ripple: palette.ripple,
  bank: palette.pines,
  bankRim: palette.ripple,
  shimmer: palette.cream,
  nebula1: palette.spaceGlow,
  nebula2: palette.glowAlt2,
  planetLight: "#D5DDFA",
  planetMid: palette.soft,
  planetDark: "#7E8FD2",
  planetShade: palette.night,
  ring: palette.soft,
  spaceGlow: palette.spaceGlow,
  crater: palette.pines,
  cityBack: palette.hills,
  cityNear: palette.pines,
  rooftop: palette.ground,
  antennaTip: palette.neonGlow,
};

const DAY_COLORS: SceneColors = {
  daytime: true,
  sky: dayPalette.sky,
  skyBand: dayPalette.skyBand,
  star: "#FFFFFF",
  starOpacity: 0.18,
  hills: dayPalette.hills,
  meadow: dayPalette.ground,
  hillRim: "#FFFFFF",
  hillRimOpacity: 0.35,
  pinesBack: dayPalette.pines,
  pines: dayPalette.pinesNear,
  ground: dayPalette.ground,
  groundEdge: "#8FCBA3",
  stream: dayPalette.stream,
  ripple: dayPalette.ripple,
  bank: dayPalette.bank,
  bankRim: "#DDF1FF",
  shimmer: "#FFFFFF",
  nebula1: "#FFFFFF",
  nebula2: "#FFFFFF",
  planetLight: "#FFFFFF",
  planetMid: "#E6F0FF",
  planetDark: "#BBD3F0",
  planetShade: "#8FB6D6",
  ring: "#FFFFFF",
  spaceGlow: "#FFFFFF",
  crater: "#8FB6D6",
  cityBack: dayPalette.cityBack,
  cityNear: dayPalette.cityNear,
  rooftop: dayPalette.rooftop,
  antennaTip: dayPalette.sun,
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const f = (n: number) => Math.round(n * 10) / 10;

/** useId() output contains punctuation that is awkward in url(#…) and CSS; strip it. */
function cleanId(raw: string): string {
  return "sc" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

interface Star {
  x: number;
  y: number;
  r: number;
  sparkle?: boolean;
  tint?: string;
}

/** Durations/delays cycle through these so neighbouring stars never pulse together. */
const TWINKLE_DUR = [3.2, 2.7, 3.8, 2.5, 3.5, 4.0, 2.9, 3.3];
const TWINKLE_DELAY = [0, 1.1, 0.4, 2.3, 1.7, 0.8, 2.9, 1.4, 0.2, 2.0, 3.1, 0.6];

function Stars({
  stars,
  animName,
  colors,
}: {
  stars: Star[];
  /** keyframe name when twinkling, otherwise undefined */
  animName?: string;
  colors: SceneColors;
}) {
  return (
    <g opacity={colors.starOpacity === 1 ? undefined : colors.starOpacity}>
      {stars.map((s, i) => {
        // Tinted stars keep their tint at night; by day every star is the same faint white.
        const color = colors.daytime ? colors.star : (s.tint ?? colors.star);
        const style: CSSProperties | undefined = animName
          ? {
              animation: `${animName} ${TWINKLE_DUR[i % TWINKLE_DUR.length]}s ease-in-out ${
                TWINKLE_DELAY[i % TWINKLE_DELAY.length]
              }s infinite`,
            }
          : undefined;
        const sp = s.r * 3.4;
        return (
          <g key={i} style={style} opacity={animName ? undefined : 0.92}>
            {s.sparkle && (
              <path
                d={`M${f(s.x)} ${f(s.y - sp)} Q${f(s.x)} ${f(s.y)} ${f(s.x + sp)} ${f(s.y)} Q${f(
                  s.x,
                )} ${f(s.y)} ${f(s.x)} ${f(s.y + sp)} Q${f(s.x)} ${f(s.y)} ${f(s.x - sp)} ${f(
                  s.y,
                )} Q${f(s.x)} ${f(s.y)} ${f(s.x)} ${f(s.y - sp)}Z`}
                fill={color}
                opacity={0.55}
              />
            )}
            <circle cx={s.x} cy={s.y} r={s.r} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

/** A soft cream moon with a faint halo and two subtle crater tints. */
function MoonShape({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={palette.cream} stopOpacity={0.28} />
          <stop offset="0.45" stopColor={palette.cream} stopOpacity={0.1} />
          <stop offset="1" stopColor={palette.cream} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-disc`} cx="42%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFFBEF" />
          <stop offset="0.7" stopColor={palette.cream} />
          <stop offset="1" stopColor="#F2E2BE" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 3.2} fill={`url(#${id}-halo)`} />
      <circle cx={cx} cy={cy} r={r * 1.35} fill={palette.cream} opacity={0.12} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-disc)`} />
      {/* crater tints */}
      <circle cx={cx + r * 0.32} cy={cy - r * 0.18} r={r * 0.2} fill="#E7D6AE" opacity={0.42} />
      <circle cx={cx - r * 0.28} cy={cy + r * 0.3} r={r * 0.13} fill="#E7D6AE" opacity={0.38} />
      <circle cx={cx + r * 0.05} cy={cy + r * 0.52} r={r * 0.09} fill="#E7D6AE" opacity={0.3} />
    </g>
  );
}

/** A warm sun with a soft halo, drawn in the moon's spot. Same footprint as MoonShape. */
function SunShape({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={dayPalette.sun} stopOpacity={0.38} />
          <stop offset="0.45" stopColor={dayPalette.sun} stopOpacity={0.14} />
          <stop offset="1" stopColor={dayPalette.sun} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-disc`} cx="42%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="0.65" stopColor={dayPalette.sun} />
          <stop offset="1" stopColor="#F5A623" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 3.2} fill={`url(#${id}-halo)`} />
      <circle cx={cx} cy={cy} r={r * 1.35} fill={dayPalette.sun} opacity={0.18} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-disc)`} />
    </g>
  );
}

/** Moon by night, sun by day – identical position and size. */
function Luminary({
  id,
  cx,
  cy,
  r,
  colors,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  colors: SceneColors;
}) {
  return colors.daytime ? (
    <SunShape id={id} cx={cx} cy={cy} r={r} />
  ) : (
    <MoonShape id={id} cx={cx} cy={cy} r={r} />
  );
}

/** Daytime only: a few still, soft clouds. Positions are fixed and keep the sprite spot clear. */
function Clouds({ clouds, opacity = 0.85 }: { clouds: [number, number, number][]; opacity?: number }) {
  return (
    <g fill="#FFFFFF" opacity={opacity}>
      {clouds.map(([cx, cy, s], i) => (
        <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
          <ellipse cx={0} cy={0} rx={34} ry={11} />
          <circle cx={-12} cy={-6} r={12} />
          <circle cx={6} cy={-9} r={15} />
          <circle cx={22} cy={-3} r={10} />
        </g>
      ))}
    </g>
  );
}

/**
 * Three-tier rounded pine silhouette. Tiers overlap so the apex of each lower
 * tier is tucked inside the one above. Rendered with a same-colour stroke and
 * round joins to soften every point.
 */
function pinePath(cx: number, baseY: number, h: number, w: number): string {
  let d = "";
  for (let k = 0; k < 3; k++) {
    const topY = baseY - h + k * h * 0.24;
    const tierH = h * (0.34 + k * 0.08);
    const botY = topY + tierH;
    const hw = (w / 2) * (0.5 + k * 0.25);
    d += `M${f(cx - hw)} ${f(botY)} Q${f(cx - hw * 0.38)} ${f(topY + tierH * 0.6)} ${f(cx)} ${f(
      topY,
    )} Q${f(cx + hw * 0.38)} ${f(topY + tierH * 0.6)} ${f(cx + hw)} ${f(botY)}Z`;
  }
  const tw = w * 0.09;
  d += `M${f(cx - tw)} ${f(baseY - h * 0.3)} H${f(cx + tw)} V${f(baseY + 4)} H${f(cx - tw)}Z`;
  return d;
}

/** [cx, height, width] – baseY supplied per row */
type PineSpec = [number, number, number];

function PineRow({
  trees,
  baseY,
  color,
  opacity = 1,
}: {
  trees: PineSpec[];
  baseY: number;
  color: string;
  opacity?: number;
}) {
  const d = trees.map(([cx, h, w]) => pinePath(cx, baseY, h, w)).join(" ");
  return (
    <path
      d={d}
      fill={color}
      stroke={color}
      strokeWidth={5}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}

/* ------------------------------------------------------------------ */
/* star fields                                                         */
/* ------------------------------------------------------------------ */

// Forest / trail: keeps the moon (300,110) and the sprite spot (253,363) clear.
const FOREST_STARS: Star[] = [
  { x: 38, y: 62, r: 1.7, sparkle: true },
  { x: 92, y: 128, r: 1.2 },
  { x: 150, y: 48, r: 1.9, sparkle: true },
  { x: 210, y: 96, r: 1.3 },
  { x: 262, y: 182, r: 1.1 },
  { x: 342, y: 232, r: 1.5, sparkle: true },
  { x: 60, y: 232, r: 1.3 },
  { x: 122, y: 302, r: 1.0 },
  { x: 356, y: 40, r: 1.4 },
  { x: 188, y: 252, r: 1.6, sparkle: true },
  { x: 30, y: 402, r: 1.2 },
  { x: 366, y: 332, r: 1.1 },
];

// Trail horizon is high (~y 170), so stars live in the top band only.
const TRAIL_STARS: Star[] = [
  { x: 34, y: 46, r: 1.6, sparkle: true },
  { x: 88, y: 112, r: 1.2 },
  { x: 142, y: 36, r: 1.8, sparkle: true },
  { x: 198, y: 86, r: 1.3 },
  { x: 236, y: 30, r: 1.1 },
  { x: 356, y: 36, r: 1.4 },
  { x: 60, y: 160, r: 1.1 },
  { x: 176, y: 140, r: 1.5, sparkle: true },
  { x: 250, y: 150, r: 1.0 },
  { x: 118, y: 72, r: 1.0 },
];

const SPACE_STARS: Star[] = [
  { x: 28, y: 48, r: 1.6, sparkle: true },
  { x: 72, y: 110, r: 1.1 },
  { x: 120, y: 36, r: 1.3, tint: palette.spaceGlow },
  { x: 164, y: 84, r: 1.8, sparkle: true },
  { x: 214, y: 42, r: 1.0 },
  { x: 236, y: 140, r: 1.2, tint: palette.spaceGlow },
  { x: 356, y: 46, r: 1.5 },
  { x: 374, y: 190, r: 1.1 },
  { x: 50, y: 198, r: 1.4, sparkle: true, tint: palette.spaceGlow },
  { x: 104, y: 250, r: 1.0 },
  { x: 150, y: 206, r: 1.2 },
  { x: 198, y: 280, r: 1.6, sparkle: true },
  { x: 342, y: 262, r: 1.1, tint: palette.spaceGlow },
  { x: 28, y: 318, r: 1.3 },
  { x: 86, y: 372, r: 1.0 },
  { x: 136, y: 332, r: 1.1, tint: palette.spaceGlow },
  { x: 362, y: 350, r: 1.4, sparkle: true },
  { x: 40, y: 452, r: 1.2 },
  { x: 118, y: 478, r: 1.5, sparkle: true, tint: palette.spaceGlow },
  { x: 318, y: 448, r: 1.1 },
  { x: 180, y: 520, r: 1.0 },
  { x: 258, y: 492, r: 1.2 },
  { x: 350, y: 528, r: 1.3, tint: palette.spaceGlow },
  { x: 12, y: 550, r: 1.0 },
];

const NEON_STARS: Star[] = [
  { x: 42, y: 70, r: 1.5, sparkle: true },
  { x: 110, y: 130, r: 1.1 },
  { x: 168, y: 52, r: 1.7, sparkle: true },
  { x: 222, y: 118, r: 1.2 },
  { x: 356, y: 40, r: 1.3 },
  { x: 70, y: 250, r: 1.2 },
  { x: 150, y: 300, r: 1.0 },
  { x: 350, y: 240, r: 1.4, sparkle: true },
];

/* ------------------------------------------------------------------ */
/* daytime clouds: [cx, cy, scale] – away from the sun and sprite spot */
/* ------------------------------------------------------------------ */

const FOREST_CLOUDS: [number, number, number][] = [
  [70, 96, 1.0],
  [190, 150, 0.7],
  [330, 300, 0.8],
];
const TRAIL_CLOUDS: [number, number, number][] = [
  [64, 70, 0.9],
  [196, 116, 0.65],
];
const SPACE_CLOUDS: [number, number, number][] = [
  [60, 120, 1.1],
  [180, 230, 0.75],
  [340, 330, 0.9],
  [90, 430, 0.8],
];
const NEON_CLOUDS: [number, number, number][] = [
  [80, 110, 1.0],
  [200, 180, 0.7],
  [330, 290, 0.8],
];

/* ------------------------------------------------------------------ */
/* pine rows                                                           */
/* ------------------------------------------------------------------ */

const FOREST_PINES: PineSpec[] = [
  [-6, 118, 56],
  [26, 92, 48],
  [58, 140, 60],
  [90, 104, 50],
  [118, 76, 42],
  [150, 128, 56],
  [182, 96, 48],
  [212, 152, 62],
  [246, 110, 52],
  [276, 84, 44],
  [306, 136, 58],
  [338, 102, 50],
  [368, 162, 64],
  [398, 112, 52],
];

// smaller, hazier row sitting on the far hills
const FOREST_BACK_PINES: PineSpec[] = [
  [10, 58, 30],
  [44, 46, 26],
  [72, 66, 32],
  [104, 50, 28],
  [136, 60, 30],
  [170, 44, 24],
  [200, 70, 34],
  [232, 52, 28],
  [262, 62, 30],
  [296, 48, 26],
  [326, 72, 34],
  [358, 56, 30],
  [388, 64, 32],
];

const TRAIL_PINES: PineSpec[] = [
  [-4, 84, 40],
  [22, 64, 34],
  [48, 98, 44],
  [76, 72, 36],
  [100, 54, 30],
  [126, 92, 42],
  [152, 70, 36],
  [178, 106, 46],
  [206, 78, 38],
  [230, 60, 32],
  [256, 96, 44],
  [282, 74, 36],
  [308, 112, 48],
  [336, 82, 40],
  [362, 66, 34],
  [390, 100, 44],
];

const TRAIL_BACK_PINES: PineSpec[] = [
  [14, 40, 22],
  [42, 32, 18],
  [68, 46, 24],
  [96, 36, 20],
  [124, 42, 22],
  [156, 30, 18],
  [186, 48, 24],
  [216, 36, 20],
  [246, 44, 22],
  [278, 34, 18],
  [306, 50, 24],
  [338, 40, 20],
  [370, 46, 22],
];

/* ------------------------------------------------------------------ */
/* variants                                                            */
/* ------------------------------------------------------------------ */

interface LayerProps {
  id: string;
  animName?: string;
  colors: SceneColors;
}

function ForestLayers({ id, animName, colors: c }: LayerProps) {
  return (
    <>
      <Stars stars={FOREST_STARS} animName={animName} colors={c} />
      {c.daytime && <Clouds clouds={FOREST_CLOUDS} />}
      <Luminary id={id} cx={298} cy={34} r={28} colors={c} />
      {/* far hills */}
      <path
        d="M-10 578 C40 542 92 528 152 548 C204 566 232 560 272 538 C320 512 362 522 400 546 L400 844 L-10 844Z"
        fill={c.hills}
      />
      <path
        d="M-10 578 C40 542 92 528 152 548 C204 566 232 560 272 538 C320 512 362 522 400 546"
        fill="none"
        stroke={c.hillRim}
        strokeWidth={1.5}
        opacity={c.hillRimOpacity}
      />
      <PineRow trees={FOREST_BACK_PINES} baseY={566} color={c.pinesBack} opacity={0.5} />
      {/* main pine row */}
      <PineRow trees={FOREST_PINES} baseY={656} color={c.pines} />
      {/* front ground – flat across the lower-left so the fox can sit there */}
      <path
        d="M-10 662 C60 648 110 646 160 652 C220 660 280 642 330 640 C360 639 385 644 400 650 L400 844 L-10 844Z"
        fill={c.ground}
      />
      <path
        d="M-10 662 C60 648 110 646 160 652 C220 660 280 642 330 640 C360 639 385 644 400 650"
        fill="none"
        stroke={c.groundEdge}
        strokeWidth={2}
        opacity={0.45}
      />
    </>
  );
}

function TrailLayers({ id, animName, colors: c }: LayerProps) {
  const bankTop =
    "M-10 630 C30 620 90 618 140 632 C185 645 220 672 240 720 C252 752 258 800 258 844";
  return (
    <>
      <Stars stars={TRAIL_STARS} animName={animName} colors={c} />
      {c.daytime && <Clouds clouds={TRAIL_CLOUDS} />}
      <Luminary id={id} cx={298} cy={34} r={28} colors={c} />
      {/* far hills – the hill colour continues down as the moonlit meadow */}
      <path
        d="M-10 206 C50 180 100 168 160 186 C210 202 250 192 290 172 C330 154 370 164 400 180 L400 844 L-10 844Z"
        fill={c.meadow}
      />
      <path
        d="M-10 206 C50 180 100 168 160 186 C210 202 250 192 290 172 C330 154 370 164 400 180"
        fill="none"
        stroke={c.hillRim}
        strokeWidth={1.5}
        opacity={c.hillRimOpacity}
      />
      <PineRow trees={TRAIL_BACK_PINES} baseY={200} color={c.pinesBack} opacity={0.5} />
      <PineRow trees={TRAIL_PINES} baseY={244} color={c.pines} />
      {/* soft shadow under the tree line so the meadow reads as ground */}
      <defs>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.pines} stopOpacity={0.45} />
          <stop offset="1" stopColor={c.pines} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={-10} y={238} width={410} height={44} fill={`url(#${id}-shade)`} />
      {/* the stream: a wide, gentle band from upper right to lower left */}
      <path
        d="M400 256 C340 266 285 280 240 320 C195 365 190 430 150 480 C110 530 60 565 20 590 C5 600 -5 606 -10 610 L-10 805 C80 790 170 760 225 710 C275 660 290 600 318 545 C340 500 365 476 400 470Z"
        fill={c.stream}
      />
      {/* moon reflection – thin, faint shimmer lines so they never read as stones */}
      <g fill={c.shimmer}>
        <ellipse cx={318} cy={318} rx={26} ry={1.6} opacity={0.07} />
        <ellipse cx={302} cy={338} rx={16} ry={1.3} opacity={0.05} />
        <ellipse cx={288} cy={362} rx={9} ry={1.1} opacity={0.04} />
      </g>
      {/* ripples */}
      <g fill="none" stroke={c.ripple} strokeWidth={2.5} strokeLinecap="round">
        <path d="M372 296 c-8 5 -16 7 -26 5" opacity={0.75} />
        <path d="M340 342 c-9 6 -18 8 -28 6" opacity={0.85} />
        <path d="M300 420 c-8 6 -16 8 -26 6" opacity={0.8} />
        <path d="M352 400 c-7 5 -14 6 -22 5" opacity={0.6} />
        <path d="M258 472 c-9 6 -18 8 -28 6" opacity={0.85} />
        <path d="M214 526 c-8 5 -16 7 -26 5" opacity={0.7} />
        <path d="M160 580 c-8 6 -16 8 -26 6" opacity={0.8} />
        <path d="M110 600 c-7 4 -14 5 -22 4" opacity={0.6} />
        <path d="M284 540 c-7 5 -14 6 -22 5" opacity={0.55} />
      </g>
      {/* near bank on the lower left – the fox sits here */}
      <path d={`${bankTop} L-10 844Z`} fill={c.bank} />
      <path d={bankTop} fill="none" stroke={c.bankRim} strokeWidth={2} opacity={0.7} />
      {/* a few soft grass tufts on the bank rim */}
      <g fill={c.bank}>
        <path d="M60 621 q4 -10 8 -1 q2 -8 6 0 q3 -5 5 1 Z" />
        <path d="M152 634 q4 -10 8 -1 q2 -8 6 0 q3 -5 5 1 Z" />
        <path d="M206 657 q4 -10 8 -1 q2 -8 6 0 q3 -5 5 1 Z" />
      </g>
    </>
  );
}

function SpaceLayers({ id, animName, colors: c }: LayerProps) {
  const horizon = "M-10 612 C90 548 300 548 400 612";
  return (
    <>
      <defs>
        <radialGradient id={`${id}-neb1`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={c.nebula1} stopOpacity={0.09} />
          <stop offset="1" stopColor={c.nebula1} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-neb2`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={c.nebula2} stopOpacity={0.07} />
          <stop offset="1" stopColor={c.nebula2} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-pl`} cx="38%" cy="34%" r="72%">
          <stop offset="0" stopColor={c.planetLight} />
          <stop offset="0.6" stopColor={c.planetMid} />
          <stop offset="1" stopColor={c.planetDark} />
        </radialGradient>
        <radialGradient id={`${id}-plhalo`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={c.spaceGlow} stopOpacity={0.22} />
          <stop offset="0.5" stopColor={c.spaceGlow} stopOpacity={0.07} />
          <stop offset="1" stopColor={c.spaceGlow} stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}-plclip`}>
          <circle cx={300} cy={110} r={30} />
        </clipPath>
        <clipPath id={`${id}-ringfront`}>
          <rect x={230} y={110} width={140} height={60} />
        </clipPath>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
      </defs>
      {/* very faint nebulae */}
      <ellipse cx={90} cy={300} rx={140} ry={110} fill={`url(#${id}-neb1)`} />
      <ellipse cx={330} cy={430} rx={120} ry={90} fill={`url(#${id}-neb2)`} />
      <Stars stars={SPACE_STARS} animName={animName} colors={c} />
      {c.daytime && <Clouds clouds={SPACE_CLOUDS} opacity={0.75} />}
      <g transform="translate(298 34) scale(0.85) translate(-300 -110)">
      {/* distant ringed planet */}
      <circle cx={300} cy={110} r={92} fill={`url(#${id}-plhalo)`} />
      <g transform="rotate(-18 300 110)">
        <ellipse
          cx={300}
          cy={110}
          rx={52}
          ry={11}
          fill="none"
          stroke={c.ring}
          strokeWidth={3}
          opacity={0.45}
        />
      </g>
      <circle cx={300} cy={110} r={30} fill={`url(#${id}-pl)`} />
      <g clipPath={`url(#${id}-plclip)`}>
        <path d="M262 104 C280 112 320 112 340 102 L340 110 C320 120 280 120 262 112Z" fill={c.spaceGlow} opacity={0.22} />
        <path d="M264 124 C285 130 318 130 336 122 L336 128 C318 136 285 136 264 130Z" fill={c.spaceGlow} opacity={0.16} />
        <circle cx={286} cy={124} r={34} fill={c.planetShade} opacity={0.35} />
      </g>
      <g transform="rotate(-18 300 110)" clipPath={`url(#${id}-ringfront)`}>
        <ellipse
          cx={300}
          cy={110}
          rx={52}
          ry={11}
          fill="none"
          stroke={c.ring}
          strokeWidth={3}
          opacity={0.7}
        />
      </g>
      </g>
      {/* planet horizon with a thin atmosphere glow */}
      <path
        d={horizon}
        fill="none"
        stroke={c.spaceGlow}
        strokeWidth={6}
        opacity={0.28}
        filter={`url(#${id}-blur)`}
      />
      <path d={`${horizon} L400 844 L-10 844Z`} fill={c.hills} />
      <path d={horizon} fill="none" stroke={c.spaceGlow} strokeWidth={1.5} opacity={0.35} />
      {/* soft craters */}
      <g fill={c.crater} opacity={0.55}>
        <ellipse cx={120} cy={640} rx={22} ry={8} />
        <ellipse cx={252} cy={622} rx={14} ry={5} />
        <ellipse cx={340} cy={662} rx={18} ry={6} />
        <ellipse cx={40} cy={690} rx={10} ry={4} />
      </g>
      {/* front floor */}
      <path
        d="M-10 684 C80 670 200 668 400 678 L400 844 L-10 844Z"
        fill={c.ground}
      />
      <path
        d="M-10 684 C80 670 200 668 400 678"
        fill="none"
        stroke={c.groundEdge}
        strokeWidth={2}
        opacity={0.5}
      />
    </>
  );
}

function NeonLayers({ id, animName, colors: c }: LayerProps) {
  // back row: [x, w, top]
  const back: [number, number, number][] = [
    [-10, 50, 470],
    [36, 34, 522],
    [66, 46, 440],
    [108, 30, 500],
    [134, 52, 462],
    [182, 40, 532],
    [218, 36, 424],
    [250, 48, 490],
    [294, 30, 542],
    [320, 44, 452],
    [360, 50, 506],
  ];
  // near row
  const near: [number, number, number][] = [
    [-10, 70, 566],
    [56, 44, 604],
    [96, 60, 548],
    [152, 38, 612],
    [186, 56, 578],
    [238, 42, 598],
    [276, 60, 556],
    [332, 40, 624],
    [368, 40, 570],
  ];
  return (
    <>
      <Stars stars={NEON_STARS} animName={animName} colors={c} />
      {c.daytime && <Clouds clouds={NEON_CLOUDS} />}
      <Luminary id={id} cx={298} cy={34} r={28} colors={c} />
      {/* back skyline */}
      <g fill={c.cityBack}>
        {back.map(([x, w, top], i) => (
          <rect key={i} x={x} y={top} width={w} height={720 - top} rx={5} />
        ))}
        {/* domed tower + antennas */}
        <circle cx={89} cy={440} r={23} />
        <rect x={234} y={392} width={3} height={34} rx={1.5} />
        <rect x={340} y={430} width={3} height={24} rx={1.5} />
        <rect x={10} y={452} width={3} height={20} rx={1.5} />
        {/* water tower */}
        <rect x={158} y={436} width={22} height={18} rx={6} />
        <rect x={161} y={452} width={3} height={12} />
        <rect x={176} y={452} width={3} height={12} />
      </g>
      {/* static pale-yellow antenna tips */}
      <circle cx={235.5} cy={390} r={1.8} fill={c.antennaTip} opacity={0.85} />
      <circle cx={341.5} cy={428} r={1.6} fill={c.antennaTip} opacity={0.75} />
      {/* near skyline */}
      <g fill={c.cityNear}>
        {near.map(([x, w, top], i) => (
          <rect key={i} x={x} y={top} width={w} height={740 - top} rx={6} />
        ))}
        <circle cx={306} cy={556} r={18} />
        <rect x={120} y={524} width={14} height={26} rx={4} />
        <rect x={30} y={548} width={3} height={20} rx={1.5} />
      </g>
      {/* rooftop ledge */}
      <rect x={-10} y={680} width={410} height={180} rx={8} fill={c.rooftop} />
      <rect x={-10} y={700} width={410} height={160} fill={c.rooftop} />
      <rect x={-10} y={680} width={410} height={6} rx={3} fill={c.cityNear} opacity={0.6} />
      {/* roof access box and a vent, far right so the ledge stays open on the left */}
      <rect x={318} y={646} width={44} height={44} rx={8} fill={c.rooftop} />
      <rect x={326} y={638} width={20} height={12} rx={6} fill={c.rooftop} />
      <rect x={272} y={664} width={22} height={22} rx={6} fill={c.rooftop} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* theme detection                                                     */
/* ------------------------------------------------------------------ */

/**
 * The settings store mirrors the theme onto `<html data-theme>`. Scenes watch
 * that attribute so every screen flips without threading a prop through.
 * On the server (and during hydration) the answer is always "night".
 */
function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function readDaytime(): boolean {
  return document.documentElement.dataset.theme === "day";
}
function readDaytimeServer(): boolean {
  return false;
}

/** True when the app-wide theme is "day". Safe to render on the server. */
export function useDaytimeTheme(): boolean {
  return useSyncExternalStore(subscribeTheme, readDaytime, readDaytimeServer);
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function Scene({
  variant,
  twinkle = false,
  reducedMotion = false,
  daytime,
  className,
  style,
}: SceneProps): JSX.Element {
  const id = cleanId(useId());
  const themeDaytime = useDaytimeTheme();
  const isDay = daytime ?? themeDaytime;
  const colors = isDay ? DAY_COLORS : NIGHT_COLORS;
  const animate = twinkle && !reducedMotion;
  const animName = animate ? `${id}-tw` : undefined;

  let layers: JSX.Element;
  switch (variant) {
    case "trail":
      layers = <TrailLayers id={id} animName={animName} colors={colors} />;
      break;
    case "space":
      layers = <SpaceLayers id={id} animName={animName} colors={colors} />;
      break;
    case "neon":
      layers = <NeonLayers id={id} animName={animName} colors={colors} />;
      break;
    case "forest":
    default:
      layers = <ForestLayers id={id} animName={animName} colors={colors} />;
  }

  return (
    <svg
      viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: "block", ...style }}
    >
      {animate && (
        <style>{`@keyframes ${animName}{0%,100%{opacity:.6}50%{opacity:1}}@media (prefers-reduced-motion:reduce){[style*="${animName}"]{animation:none}}`}</style>
      )}
      <rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill={colors.sky} />
      {colors.skyBand && (
        <>
          <defs>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors.skyBand} stopOpacity={0} />
              <stop offset="0.35" stopColor={colors.skyBand} stopOpacity={0} />
              <stop offset="1" stopColor={colors.skyBand} stopOpacity={0.9} />
            </linearGradient>
          </defs>
          {/* gentle lighter band towards the horizon */}
          <rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill={`url(#${id}-sky)`} />
        </>
      )}
      {layers}
    </svg>
  );
}

export default Scene;
