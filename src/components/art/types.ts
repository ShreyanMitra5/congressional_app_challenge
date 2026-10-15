import type { CSSProperties } from "react";

/**
 * Contract for every stimulus skin (firefly, butterfly, pup, comet, jelly, spark).
 * - `size` is the sprite box in dp (120 in Firefly Watch, 56 on a stone in Firefly Trail).
 * - `glow` draws the soft halo; the halo may extend to 2× size around the box.
 * - `glowColor` overrides the halo colour (defaults to #FFC145).
 * The sprite must be drawn centred in a square `size × size` box so that
 * positioning code can treat every skin identically.
 */
export interface SkinProps {
  size?: number;
  glow?: boolean;
  glowColor?: string;
  className?: string;
  style?: CSSProperties;
}

export type SkinId = "firefly" | "butterfly" | "pup" | "comet" | "jelly" | "spark";

export const SKIN_IDS: SkinId[] = ["firefly", "butterfly", "pup", "comet", "jelly", "spark"];

export const SKIN_NAMES: Record<SkinId, string> = {
  firefly: "Firefly",
  butterfly: "Butterfly",
  pup: "Friendly pup",
  comet: "Comet",
  jelly: "Glow jelly",
  spark: "Star spark",
};

/** Fox poses shared across the games. */
export type FoxPose = "idle" | "earsPerked" | "catching" | "celebrating" | "hop";

/** Companion poses used by Night Watch (fox / otter / lynx). */
export type CompanionPose = "idle" | "nod" | "waving" | "celebrating";

export interface CharacterProps {
  /** width in dp; height follows the art's aspect ratio */
  width?: number;
  /** true when the Ready / All done screen is showing and gentle breathing is allowed */
  breathing?: boolean;
  /** reduced motion: no breathing, no tail movement */
  reducedMotion?: boolean;
  className?: string;
  style?: CSSProperties;
}
