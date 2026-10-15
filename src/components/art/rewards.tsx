import { useId } from "react";
import type { CSSProperties, JSX, ReactNode } from "react";
import { palette } from "@/lib/theme";
import { BeaconBody, WindowBody } from "./props";

/**
 * Small reward icons shown on the "All done" screen and in Basecamp.
 * Each is drawn centred in a 64 × 64 box (viewBox -32 -32 64 64); glows are
 * kept inside the box so icons can sit in tight lists.
 */

export type RewardId = "lantern" | "stone" | "lanternString" | "beacon" | "windowLight";

export interface RewardIconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const BOX = "-32 -32 64 64";

function cleanId(raw: string): string {
  return "rw" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

function IconSvg({
  size = 64,
  className,
  style,
  children,
}: RewardIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox={BOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
    >
      {children}
    </svg>
  );
}

/** Contained glow that stays within the icon box. */
function InnerGlow({ id, color, cx = 0, cy = 0, r = 30, strength = 1 }: {
  id: string;
  color: string;
  cx?: number;
  cy?: number;
  r?: number;
  strength?: number;
}) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={color} stopOpacity={0.55} />
          <stop offset="0.5" stopColor={color} stopOpacity={0.18} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-g)`} opacity={strength} />
    </>
  );
}

/* ------------------------------------------------------------------ */

/** "A little lantern" – a handheld storybook lantern with a warm flame. */
export function LanternIcon(props: RewardIconProps): JSX.Element {
  const id = cleanId(useId());
  return (
    <IconSvg {...props}>
      <defs>
        <radialGradient id={`${id}-flame`} cx="50%" cy="60%" r="55%">
          <stop offset="0" stopColor={palette.cream} />
          <stop offset="0.5" stopColor={palette.glow} />
          <stop offset="1" stopColor={palette.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <InnerGlow id={id} color={palette.glow} cy={2} r={31} />
      {/* handle ring */}
      <path
        d="M-7 -22 C-7 -30 7 -30 7 -22"
        fill="none"
        stroke={palette.dullBorder}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {/* top cap */}
      <path d="M-12 -14 C-12 -20 12 -20 12 -14 Z" fill={palette.dullBorder} />
      <rect x={-13} y={-15} width={26} height={4} rx={2} fill={palette.dullBorder} />
      {/* glass body */}
      <rect x={-11} y={-11} width={22} height={28} rx={5} fill={palette.glow} opacity={0.85} />
      <rect x={-11} y={-11} width={22} height={28} rx={5} fill={`url(#${id}-flame)`} />
      {/* frame bars */}
      <rect x={-12.5} y={-12} width={3} height={30} rx={1.5} fill={palette.dullBorder} />
      <rect x={9.5} y={-12} width={3} height={30} rx={1.5} fill={palette.dullBorder} />
      {/* flame */}
      <path
        d="M0 -4 C4 1 4 6 0 9 C-4 6 -4 1 0 -4Z"
        fill={palette.cream}
        opacity={0.95}
      />
      {/* base */}
      <rect x={-14} y={16} width={28} height={6} rx={3} fill={palette.dullBorder} />
      <rect x={-9} y={21} width={18} height={4} rx={2} fill={palette.dullFill} />
    </IconSvg>
  );
}

/** "A stepping-stone for your Basecamp" – a mossy stone with a tiny firefly on it. */
export function SteppingStoneIcon(props: RewardIconProps): JSX.Element {
  const id = cleanId(useId());
  const ink = "#1A1530";
  return (
    <IconSvg {...props}>
      {/* three stones in a diagonal, a glowing dotted trail, and a firefly on the last one */}
      <ellipse cx={-16} cy={18} rx={13} ry={7.5} fill="#4A5C99" stroke={ink} strokeWidth={3} />
      <ellipse cx={3} cy={8} rx={13} ry={7.5} fill="#4A5C99" stroke={ink} strokeWidth={3} />
      <ellipse cx={21} cy={-4} rx={12} ry={7} fill="#4A5C99" stroke={ink} strokeWidth={3} />
      <path
        d="M-16 10 C-14 -4 -4 -8 3 0 C9 -12 17 -18 21 -20"
        fill="none"
        stroke={palette.glow}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="0.5 8"
      />
      <InnerGlow id={id} color={palette.glow} cx={22} cy={-22} r={15} />
      <ellipse cx={17} cy={-25} rx={5} ry={2.6} fill="#B8C4F0" stroke={ink} strokeWidth={2} transform="rotate(-28 17 -25)" />
      <ellipse cx={27} cy={-25} rx={5} ry={2.6} fill="#B8C4F0" stroke={ink} strokeWidth={2} transform="rotate(28 27 -25)" />
      <ellipse cx={22} cy={-19} rx={4} ry={5.5} fill={palette.glow} stroke={ink} strokeWidth={2} />
      <circle cx={22} cy={-26} r={4} fill={palette.cream} stroke={ink} strokeWidth={2} />
      <circle cx={20.8} cy={-26.6} r={0.9} fill={ink} />
      <circle cx={23.4} cy={-26.6} r={0.9} fill={ink} />
    </IconSvg>
  );
}

/** A string of three small paper lanterns. */
export function PaperLanternStringIcon(props: RewardIconProps): JSX.Element {
  const id = cleanId(useId());
  const lanterns: { x: number; y: number; color: string }[] = [
    { x: -18, y: 0, color: palette.glow },
    { x: 0, y: 6, color: palette.glowAlt2 },
    { x: 18, y: 0, color: palette.glow },
  ];
  return (
    <IconSvg {...props}>
      <defs>
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={palette.cream} stopOpacity={0.85} />
          <stop offset="1" stopColor={palette.cream} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* string */}
      <path
        d="M-32 -18 C-20 -8 -8 -6 0 -6 C8 -6 20 -8 32 -18"
        fill="none"
        stroke={palette.soft}
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.8}
      />
      {lanterns.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y})`}>
          <InnerGlow id={`${id}-${i}`} color={l.color} cy={2} r={15} strength={0.9} />
          <path d={`M0 ${-14 + (i === 1 ? -4 : 0)} V-9`} stroke={palette.soft} strokeWidth={1.2} strokeLinecap="round" />
          <rect x={-4} y={-10} width={8} height={3} rx={1.5} fill={palette.buttonText} />
          <path
            d="M-7.5 0 C-7.5 -7 -4 -8 0 -8 C4 -8 7.5 -7 7.5 0 C7.5 7 4 10 0 10 C-4 10 -7.5 7 -7.5 0Z"
            fill={l.color}
          />
          <ellipse cx={0} cy={1} rx={5} ry={6} fill={`url(#${id}-core)`} />
          <path d="M-3.5 -7 C-5 -2 -5 4 -3.5 8" fill="none" stroke={palette.buttonText} strokeWidth={0.8} opacity={0.25} />
          <path d="M3.5 -7 C5 -2 5 4 3.5 8" fill="none" stroke={palette.buttonText} strokeWidth={0.8} opacity={0.25} />
          <rect x={-3.5} y={9} width={7} height={2.6} rx={1.3} fill={palette.buttonText} />
          <path d="M0 11.5 V15" stroke={l.color} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
        </g>
      ))}
    </IconSvg>
  );
}

/** A small space beacon, lit. */
export function BeaconIcon(props: RewardIconProps): JSX.Element {
  const id = cleanId(useId());
  return (
    <IconSvg {...props}>
      <InnerGlow id={id} color={palette.spaceGlow} cy={-6} r={30} />
      <g transform="scale(0.9)">
        <BeaconBody id={id} lit={1} />
      </g>
    </IconSvg>
  );
}

/** A glowing city window. */
export function WindowLightIcon(props: RewardIconProps): JSX.Element {
  const id = cleanId(useId());
  return (
    <IconSvg {...props}>
      <InnerGlow id={id} color={palette.neonGlow} r={31} />
      <g transform="scale(0.9)">
        <WindowBody id={id} lit={1} />
      </g>
    </IconSvg>
  );
}

export const REWARD_NAMES: Record<RewardId, string> = {
  lantern: "A little lantern",
  stone: "A stepping-stone for your Basecamp",
  lanternString: "A string of paper lanterns",
  beacon: "A space beacon",
  windowLight: "A glowing window",
};

export function RewardIcon({ id, ...rest }: RewardIconProps & { id: RewardId }): JSX.Element {
  switch (id) {
    case "stone":
      return <SteppingStoneIcon {...rest} />;
    case "lanternString":
      return <PaperLanternStringIcon {...rest} />;
    case "beacon":
      return <BeaconIcon {...rest} />;
    case "windowLight":
      return <WindowLightIcon {...rest} />;
    case "lantern":
    default:
      return <LanternIcon {...rest} />;
  }
}
