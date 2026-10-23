"use client";

/**
 * The UI kit: chunky, pressable, sticker-like pieces that sit on the night
 * scene. Every tappable thing has a solid fill, a thick edge underneath and
 * presses down when touched. Nothing here glows unless it is the glow.
 */
import type { CSSProperties, ReactNode } from "react";
import { palette } from "@/lib/theme";

export const ink = "#1A1530";
export const inkSoft = "#5B5478";
export const tan = "#E3D2A8";
export const tanEdge = "#C9B382";
export const amberEdge = "#C9780E";
export const mint = "#8FF0C9";
export const mintEdge = "#3EB68A";
export const pink = "#FF9EC4";
export const pinkEdge = "#D65C8F";
export const navyCard = "#26366F";
export const navyEdge = "#0A1230";

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

function pressable(edge: string, depth: number): CSSProperties {
  return {
    boxShadow: `0 ${depth}px 0 ${edge}`,
    transform: "translateY(0)",
    transition: "transform 80ms ease, box-shadow 80ms ease",
  };
}

export function PrimaryButton({
  children,
  onClick,
  width = 280,
  glowColor = palette.glow,
  edgeColor = amberEdge,
  style,
  ariaLabel,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  width?: number | string;
  glowColor?: string;
  edgeColor?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className="t-button btn-3d"
      style={{
        width,
        height: 64,
        borderRadius: 22,
        background: glowColor,
        color: ink,
        border: "none",
        opacity: disabled ? 0.5 : 1,
        ...pressable(edgeColor, 7),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  width = 280,
  style,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  width?: number | string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="t-button btn-3d"
      style={{
        width,
        height: 60,
        borderRadius: 22,
        background: palette.cream,
        color: ink,
        border: `3px solid ${tan}`,
        ...pressable(tanEdge, 6),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function TextButton({
  children,
  onClick,
  style,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="t-body-cream"
      style={{
        minHeight: 44,
        padding: "0 16px",
        background: "transparent",
        border: "none",
        fontFamily: "var(--font-title)",
        fontWeight: 600,
        textDecoration: "underline",
        textDecorationThickness: 3,
        textDecorationColor: palette.glow,
        textUnderlineOffset: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Icon buttons (48 dp, cream stickers)                                */
/* ------------------------------------------------------------------ */

type IconName = "back" | "close" | "pause" | "soundOn" | "soundOff" | "settings" | "lock" | "check" | "play" | "star";

function Icon({ name, size = 24, color = ink }: { name: IconName; size?: number; color?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "back":
      return (
        <svg {...common}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common} fill={color} stroke="none">
          <rect x="5" y="4.5" width="5" height="15" rx="2" />
          <rect x="14" y="4.5" width="5" height="15" rx="2" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
        </svg>
      );
    case "soundOn":
      return (
        <svg {...common}>
          <path d="M4 10v4h3.5L12 18V6L7.5 10H4z" fill={color} stroke="none" />
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        </svg>
      );
    case "soundOff":
      return (
        <svg {...common}>
          <path d="M4 10v4h3.5L12 18V6L7.5 10H4z" fill={color} stroke="none" />
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common} strokeWidth={2.4}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="10.3" y="1.6" width="3.4" height="5.2" rx="1.4" fill={color} stroke="none" transform={`rotate(${a} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="6.2" fill={color} stroke="none" />
          <circle cx="12" cy="12" r="2.4" fill={palette.cream} stroke="none" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" rx="3" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} strokeWidth={3.5}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M12 2.8l2.7 5.7 6.2.8-4.5 4.3 1.1 6.2L12 16.9l-5.5 2.9 1.1-6.2L3.1 9.3l6.2-.8z" />
        </svg>
      );
  }
}

export { Icon };

export function IconButton({
  icon,
  label,
  onClick,
  style,
  size = 48,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  style?: CSSProperties;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="btn-3d"
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        background: palette.cream,
        border: `3px solid ${tan}`,
        display: "grid",
        placeItems: "center",
        ...pressable(tanEdge, 5),
        ...style,
      }}
    >
      <Icon name={icon} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Bead strip: one bead per event, lit the moment the child earns it   */
/* ------------------------------------------------------------------ */

export type BeadState = "empty" | "lit" | "dim";

/** Layout numbers for the strip so a game can aim an animation at bead `i`. */
export function beadStripLayout(total: number, bead: number, gap: number, rows = 1) {
  const pad = 5;
  const border = 3;
  const perRow = Math.ceil(total / rows);
  const width = (pad + border) * 2 + perRow * bead + (perRow - 1) * gap;
  const height = (pad + border) * 2 + rows * bead + (rows - 1) * gap;
  return {
    width,
    height,
    perRow,
    /** x of bead i's centre, measured from the strip's left edge */
    beadCenterX: (i: number) => pad + border + (i % perRow) * (bead + gap) + bead / 2,
    /** y of bead i's centre, measured from the strip's top edge */
    beadCenterY: (i: number) => pad + border + Math.floor(i / perRow) * (bead + gap) + bead / 2,
  };
}

/**
 * A row of small round beads, one per scored event. A "lit" bead is the
 * child's light for that event; a "dim" bead means the event went by without
 * a catch, so the row still moves forward and always ends full.
 */
export function BeadStrip({
  beads,
  total,
  color = palette.glow,
  bead = 8,
  gap = 3,
  rows = 1,
  label = "Progress",
}: {
  beads: BeadState[];
  total: number;
  color?: string;
  bead?: number;
  gap?: number;
  /** wrap the beads into this many rows (30 beads fit a phone far better as 2 x 15) */
  rows?: number;
  label?: string;
}) {
  const lit = beads.filter((b) => b === "lit").length;
  const perRow = Math.ceil(total / rows);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={beads.length}
      aria-label={label}
      data-lit={lit}
      data-done={beads.length}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${perRow}, ${bead}px)`,
        gap,
        padding: 5,
        borderRadius: rows > 1 ? 14 : 999,
        background: navyEdge,
        border: `3px solid ${palette.dullBorder}`,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const state: BeadState = beads[i] ?? "empty";
        return (
          <span
            key={i}
            data-bead={state}
            className={state === "lit" ? "bead-pop" : undefined}
            style={{
              width: bead,
              height: bead,
              borderRadius: 999,
              background: state === "lit" ? color : state === "dim" ? palette.soft : navyCard,
              opacity: state === "dim" ? 0.55 : 1,
              boxShadow: state === "lit" ? `0 0 ${bead}px ${color}` : "none",
              flex: "none",
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sticker badge, card, progress bar, bubble                            */
/* ------------------------------------------------------------------ */

/** A tilted sticker badge. Used for "Game 1 of 3" and small labels. */
export function Chip({
  children,
  style,
  tone = "mint",
  tilt = -3,
}: {
  children: ReactNode;
  style?: CSSProperties;
  tone?: "mint" | "pink" | "glow" | "cream";
  tilt?: number;
}) {
  const fills = { mint: [mint, mintEdge], pink: [pink, pinkEdge], glow: [palette.glow, amberEdge], cream: [palette.cream, tanEdge] };
  const [bg, edge] = fills[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "7px 16px",
        borderRadius: 14,
        background: bg,
        color: ink,
        fontFamily: "var(--font-title)",
        fontWeight: 600,
        fontSize: "calc(16px * var(--text-scale))",
        lineHeight: 1,
        boxShadow: `0 4px 0 ${edge}`,
        transform: `rotate(${tilt}deg)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** A cream panel with a thick edge. The base for cards, tiles and modals. */
export function Card({
  children,
  style,
  padding = "16px 18px",
  tone = "cream",
}: {
  children: ReactNode;
  style?: CSSProperties;
  padding?: string | number;
  tone?: "cream" | "navy";
}) {
  const creamy = tone === "cream";
  return (
    <div
      style={{
        background: creamy ? palette.cream : navyCard,
        color: creamy ? ink : palette.cream,
        border: `3px solid ${creamy ? tan : palette.dullBorder}`,
        borderRadius: 24,
        boxShadow: `0 6px 0 ${creamy ? tanEdge : navyEdge}`,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Ten chunky progress segments with a shine. Shows how far along, never how well. */
export function Pips({
  filled,
  total = 10,
  color = palette.glow,
  partial = 0,
}: {
  filled: number;
  total?: number;
  color?: string;
  /** 0..1 fill of the pip after the last filled one, so long runs visibly creep forward */
  partial?: number;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={filled}
      aria-label="Progress"
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: navyEdge,
        border: `3px solid ${palette.dullBorder}`,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled;
        const creeping = !on && i === filled && partial > 0;
        return (
          <span
            key={i}
            style={{
              width: 16,
              height: 14,
              borderRadius: 6,
              background: on ? color : navyCard,
              position: "relative",
              overflow: "hidden",
              transition: "background 200ms ease",
            }}
          >
            {creeping && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${Math.round(Math.min(1, partial) * 100)}%`,
                  background: color,
                  opacity: 0.85,
                  transition: "width 300ms linear",
                }}
              />
            )}
            <span
              style={{
                position: "absolute",
                left: 3,
                right: 3,
                top: 2,
                height: 4,
                borderRadius: 3,
                background: on ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.08)",
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

export function SpeechBubble({
  children,
  width = 230,
  style,
  tailSide = "left",
  tone = "cream",
}: {
  children: ReactNode;
  width?: number;
  style?: CSSProperties;
  tailSide?: "left" | "bottom";
  tone?: "cream" | "navy";
}) {
  const creamy = tone === "cream";
  const bg = creamy ? palette.cream : navyCard;
  const border = creamy ? tan : palette.dullBorder;
  const color = creamy ? ink : palette.cream;
  return (
    <div
      className="bubble-in"
      style={{
        position: "relative",
        width,
        padding: "14px 18px",
        borderRadius: 20,
        background: bg,
        color,
        border: `3px solid ${border}`,
        boxShadow: `0 5px 0 ${creamy ? tanEdge : navyEdge}`,
        fontFamily: "var(--font-body)",
        fontWeight: 800,
        fontSize: "calc(18px * var(--text-scale))",
        lineHeight: 1.3,
        ...style,
      }}
    >
      {children}
      {tailSide === "left" ? (
        <svg aria-hidden width="22" height="26" viewBox="0 0 22 26" style={{ position: "absolute", left: -19, bottom: 16 }}>
          <path d="M21 2 L3 14 L21 24 Z" fill={bg} stroke={border} strokeWidth="3" strokeLinejoin="round" />
          <path d="M21 5 L21 21" stroke={bg} strokeWidth="6" />
        </svg>
      ) : (
        <svg aria-hidden width="28" height="22" viewBox="0 0 28 22" style={{ position: "absolute", left: 26, bottom: -19 }}>
          <path d="M2 1 L14 19 L26 1 Z" fill={bg} stroke={border} strokeWidth="3" strokeLinejoin="round" />
          <path d="M5 1 L23 1" stroke={bg} strokeWidth="6" />
        </svg>
      )}
    </div>
  );
}

export function RewardCard({ icon, label, name }: { icon: ReactNode; label: string; name: string }) {
  return (
    <div style={{ position: "relative", width: 340, paddingTop: 14 }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 14 }} padding="18px 18px 16px">
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            background: `${palette.glow}55`,
            border: `3px solid ${palette.glow}`,
            display: "grid",
            placeItems: "center",
            flex: "none",
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-title)",
              fontWeight: 600,
              fontSize: "calc(24px * var(--text-scale))",
              lineHeight: 1.1,
              color: ink,
            }}
          >
            {name}
          </div>
          <div className="t-note" style={{ color: inkSoft, marginTop: 4 }}>Added to your Basecamp.</div>
        </div>
      </Card>
      <div style={{ position: "absolute", top: 0, left: 16 }}>
        <Chip tone="pink" tilt={-4}>{label}</Chip>
      </div>
    </div>
  );
}

export function LockNote({ text = "Saved only on this device" }: { text?: string }) {
  return (
    <div className="t-note" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", color: "var(--soft)" }}>
      <Icon name="lock" size={16} color="currentColor" />
      <span>{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Big circular action button (Catch / Signal), 156 dp                  */
/* ------------------------------------------------------------------ */

export function BigCircleButton({
  label,
  glowing,
  glowColor = palette.glow,
  onPointerDown,
  pressed,
  size = 156,
}: {
  label: string;
  glowing: boolean;
  glowColor?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  pressed?: boolean;
  size?: number;
}) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {glowing && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: -26,
            borderRadius: 999,
            background: `radial-gradient(circle, ${glowColor}66 0%, ${glowColor}22 48%, transparent 70%)`,
          }}
        />
      )}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onContextMenu={(e) => e.preventDefault()}
        className="t-button"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: glowing ? glowColor : navyCard,
          color: glowing ? ink : palette.cream,
          border: `4px solid ${glowing ? glowColor : palette.dullBorder}`,
          fontSize: "calc(32px * var(--text-scale))",
          boxShadow: pressed ? "none" : `0 9px 0 ${glowing ? amberEdge : navyEdge}`,
          transform: pressed ? "translateY(9px)" : "translateY(0)",
          transition: "transform 70ms ease, box-shadow 70ms ease, background 0ms",
          touchAction: "none",
        }}
      >
        {label}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overlay                                                             */
/* ------------------------------------------------------------------ */

export function Overlay({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fade-in"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(10, 18, 48, 0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <Card
        style={{ width: 326, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}
        padding="28px 22px 24px"
      >
        {title && (
          <div className="t-title" style={{ color: ink, fontSize: "calc(30px * var(--text-scale))", textShadow: "none" }}>
            {title}
          </div>
        )}
        {children}
      </Card>
    </div>
  );
}
