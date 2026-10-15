import { useId } from "react";
import type { CSSProperties, JSX, ReactNode } from "react";
import { palette, type WorldId } from "@/lib/theme";

/**
 * Interactive props: stepping stones and the three world "lights".
 * Every prop is drawn centred in a `size × size` box (viewBox -32 -32 64 64)
 * with `overflow: visible`, so a glow halo of radius 56 (112 dp wide at
 * size 64) can spill past the box without changing layout.
 */

const BOX = "-32 -32 64 64";
const HALO_R = 56;

function cleanId(raw: string): string {
  return "pr" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

function svgStyle(style?: CSSProperties): CSSProperties {
  return { display: "block", overflow: "visible", ...style };
}

/** Soft radial halo (shared by every glowing prop). */
function Halo({
  id,
  color,
  strength,
  r = HALO_R,
}: {
  id: string;
  color: string;
  /** 0–1 overall opacity multiplier */
  strength: number;
  r?: number;
}) {
  if (strength <= 0) return null;
  return (
    <>
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={color} stopOpacity={0.6} />
          <stop offset="0.3" stopColor={color} stopOpacity={0.32} />
          <stop offset="0.65" stopColor={color} stopOpacity={0.1} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={0} cy={0} r={r} fill={`url(#${id}-halo)`} opacity={strength} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stone                                                               */
/* ------------------------------------------------------------------ */

export type StoneState = "rest" | "lit" | "tapped";

export interface StoneProps {
  size?: number;
  state: StoneState;
  glowColor?: string;
  className?: string;
  style?: CSSProperties;
}

/** The stone body on its own (no halo) – reused by the reward icon. */
export function StoneBody({ glowColor, lift = 0 }: { glowColor?: string; lift?: number }) {
  return (
    <g>
      {/* darker underside / edge */}
      <ellipse cx={0} cy={3} rx={30} ry={21} fill={palette.stoneEdge} />
      {/* main body */}
      <ellipse cx={0} cy={0} rx={29} ry={20} fill={palette.stoneFill} />
      {/* lighter top */}
      <ellipse cx={-1} cy={-4} rx={24} ry={13} fill="#3A4F99" />
      {/* moss dabs */}
      <ellipse cx={-11} cy={-6} rx={7} ry={4} fill="#2E5F6B" opacity={0.5} />
      <ellipse cx={10} cy={2} rx={5} ry={3} fill="#2E5F6B" opacity={0.42} />
      <ellipse cx={-2} cy={9} rx={4} ry={2.2} fill="#2E5F6B" opacity={0.35} />
      {lift > 0 && glowColor && (
        <ellipse cx={-1} cy={-4} rx={24} ry={13} fill={glowColor} opacity={0.2 * lift} />
      )}
    </g>
  );
}

export function Stone({
  size = 64,
  state,
  glowColor = palette.glow,
  className,
  style,
}: StoneProps): JSX.Element {
  const id = cleanId(useId());
  const strength = state === "lit" ? 1 : state === "tapped" ? 0.6 : 0;
  return (
    <svg
      viewBox={BOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={svgStyle(style)}
    >
      <Halo id={id} color={glowColor} strength={strength} />
      <StoneBody glowColor={glowColor} lift={strength} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Lights                                                              */
/* ------------------------------------------------------------------ */

export type LightState = "rest" | "glow";

export interface LightProps {
  size?: number;
  state: LightState;
  /** 0–1; scales the bloom when state is "glow" (default 1) */
  intensity?: number;
  className?: string;
  style?: CSSProperties;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

interface LightSvgProps extends LightProps {
  children: ReactNode;
}

function LightSvg({ size = 64, className, style, children }: LightSvgProps) {
  return (
    <svg
      viewBox={BOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={svgStyle(style)}
    >
      {children}
    </svg>
  );
}

/** Paper lantern body (no halo). `lit` 0–1 controls brightness. */
export function LanternBody({ id, lit }: { id: string; lit: number }) {
  const bodyOpacity = 0.35 + 0.65 * lit;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-core`} cx="50%" cy="48%" r="50%">
          <stop offset="0" stopColor={palette.cream} stopOpacity={0.95} />
          <stop offset="0.55" stopColor={palette.cream} stopOpacity={0.25} />
          <stop offset="1" stopColor={palette.cream} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* string */}
      <path d="M0 -31 V-21" stroke={palette.soft} strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />
      {/* top cap */}
      <rect x={-7} y={-22} width={14} height={5} rx={2.5} fill={palette.buttonText} opacity={0.9} />
      {/* body */}
      <g opacity={bodyOpacity}>
        <path
          d="M-15 -6 C-15 -18 -8 -20 0 -20 C8 -20 15 -18 15 -6 C15 8 9 16 0 16 C-9 16 -15 8 -15 -6Z"
          fill={palette.glow}
        />
        {/* ribs */}
        <path d="M-7 -17 C-10 -8 -10 6 -7 14" fill="none" stroke="#D98E22" strokeWidth={1.2} opacity={0.4} />
        <path d="M7 -17 C10 -8 10 6 7 14" fill="none" stroke="#D98E22" strokeWidth={1.2} opacity={0.4} />
        <path d="M0 -20 V16" stroke="#D98E22" strokeWidth={1} opacity={0.3} />
      </g>
      {/* inner light */}
      {lit > 0 ? (
        <ellipse cx={0} cy={-2} rx={12} ry={14} fill={`url(#${id}-core)`} opacity={lit} />
      ) : (
        <circle cx={0} cy={-2} r={2.4} fill={palette.cream} opacity={0.55} />
      )}
      {/* bottom cap + tassel */}
      <rect x={-6} y={14} width={12} height={4.5} rx={2.25} fill={palette.buttonText} opacity={0.9} />
      <path d="M0 18.5 V25" stroke={palette.glow} strokeWidth={1.6} strokeLinecap="round" opacity={0.5 + 0.4 * lit} />
      <circle cx={0} cy={26.5} r={2} fill={palette.glow} opacity={0.5 + 0.4 * lit} />
    </g>
  );
}

export function Lantern(props: LightProps): JSX.Element {
  const { state, intensity } = props;
  const id = cleanId(useId());
  const lit = state === "glow" ? clamp01(intensity ?? 1) : 0;
  return (
    <LightSvg {...props}>
      <Halo id={id} color={palette.glow} strength={lit} />
      <LanternBody id={id} lit={lit} />
    </LightSvg>
  );
}

/** Space beacon: a glowing orb on a short stalk (no halo). */
export function BeaconBody({ id, lit }: { id: string; lit: number }) {
  const orbOpacity = 0.35 + 0.65 * lit;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-core`} cx="42%" cy="40%" r="60%">
          <stop offset="0" stopColor={palette.cream} stopOpacity={0.95} />
          <stop offset="0.45" stopColor={palette.spaceGlow} stopOpacity={0.6} />
          <stop offset="1" stopColor={palette.spaceGlow} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* base */}
      <ellipse cx={0} cy={26} rx={14} ry={4.5} fill={palette.dullBorder} />
      <ellipse cx={0} cy={25} rx={12} ry={3.5} fill={palette.dullFill} />
      {/* stalk */}
      <rect x={-3} y={4} width={6} height={22} rx={3} fill={palette.dullFill} />
      <rect x={-3} y={4} width={6} height={22} rx={3} fill="none" stroke={palette.dullBorder} strokeWidth={1} />
      {/* collar */}
      <rect x={-7} y={4} width={14} height={5} rx={2.5} fill={palette.dullBorder} />
      {/* orb */}
      <circle cx={0} cy={-6} r={13} fill={palette.spaceGlow} opacity={orbOpacity} />
      {lit > 0 ? (
        <circle cx={0} cy={-6} r={13} fill={`url(#${id}-core)`} opacity={lit} />
      ) : (
        <circle cx={0} cy={-6} r={2.6} fill={palette.cream} opacity={0.55} />
      )}
      {/* soft highlight */}
      <ellipse cx={-4} cy={-11} rx={3.5} ry={2} fill={palette.cream} opacity={0.3 + 0.4 * lit} />
    </g>
  );
}

export function Beacon(props: LightProps): JSX.Element {
  const { state, intensity } = props;
  const id = cleanId(useId());
  const lit = state === "glow" ? clamp01(intensity ?? 1) : 0;
  return (
    <LightSvg {...props}>
      <Halo id={id} color={palette.spaceGlow} strength={lit} />
      <BeaconBody id={id} lit={lit} />
    </LightSvg>
  );
}

/** City window: a rounded frame with a pane that lights pale yellow (no halo). */
export function WindowBody({ id, lit }: { id: string; lit: number }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-core`} cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor={palette.cream} stopOpacity={0.9} />
          <stop offset="1" stopColor={palette.cream} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* frame */}
      <rect x={-17} y={-22} width={34} height={44} rx={8} fill={palette.dullBorder} />
      {/* pane: dull when resting, warm when lit */}
      <rect x={-13} y={-18} width={26} height={36} rx={5.5} fill={palette.dullFill} />
      <rect x={-13} y={-18} width={26} height={36} rx={5.5} fill={palette.neonGlow} opacity={lit} />
      {lit > 0 ? (
        <rect x={-13} y={-18} width={26} height={36} rx={5.5} fill={`url(#${id}-core)`} opacity={0.8 * lit} />
      ) : (
        <circle cx={0} cy={0} r={2.4} fill={palette.neonGlow} opacity={0.45} />
      )}
      {/* mullions */}
      <rect x={-1.2} y={-18} width={2.4} height={36} fill={palette.dullBorder} />
      <rect x={-13} y={-1.2} width={26} height={2.4} fill={palette.dullBorder} />
      {/* sill */}
      <rect x={-20} y={20} width={40} height={5} rx={2.5} fill={palette.dullBorder} />
    </g>
  );
}

export function Window(props: LightProps): JSX.Element {
  const { state, intensity } = props;
  const id = cleanId(useId());
  const lit = state === "glow" ? clamp01(intensity ?? 1) : 0;
  return (
    <LightSvg {...props}>
      <Halo id={id} color={palette.neonGlow} strength={lit} />
      <WindowBody id={id} lit={lit} />
    </LightSvg>
  );
}

export interface WorldLightProps extends LightProps {
  world: WorldId;
}

/** Picks the right light for the world. */
export function Light({ world, ...rest }: WorldLightProps): JSX.Element {
  switch (world) {
    case "space":
      return <Beacon {...rest} />;
    case "neon":
      return <Window {...rest} />;
    case "forest":
    default:
      return <Lantern {...rest} />;
  }
}

/* ------------------------------------------------------------------ */
/* Moon                                                                */
/* ------------------------------------------------------------------ */

export function Moon({
  size = 64,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  const id = cleanId(useId());
  return (
    <svg
      viewBox={BOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={svgStyle(style)}
    >
      <defs>
        <radialGradient id={`${id}-mh`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={palette.cream} stopOpacity={0.3} />
          <stop offset="0.5" stopColor={palette.cream} stopOpacity={0.1} />
          <stop offset="1" stopColor={palette.cream} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-md`} cx="42%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFFBEF" />
          <stop offset="0.7" stopColor={palette.cream} />
          <stop offset="1" stopColor="#F2E2BE" />
        </radialGradient>
      </defs>
      <circle cx={0} cy={0} r={44} fill={`url(#${id}-mh)`} />
      <circle cx={0} cy={0} r={22} fill={`url(#${id}-md)`} />
      <circle cx={7} cy={-4} r={4.4} fill="#E7D6AE" opacity={0.42} />
      <circle cx={-6} cy={7} r={2.8} fill="#E7D6AE" opacity={0.38} />
      <circle cx={1} cy={11} r={2} fill="#E7D6AE" opacity={0.3} />
    </svg>
  );
}
