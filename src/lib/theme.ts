/**
 * Shared palette for the Wayglow three-game set.
 * Values come straight from the design document; do not tune at run time.
 */
export const palette = {
  night: "#14204A",
  hills: "#1B2B63",
  pines: "#101B45",
  ground: "#0A1230",
  stream: "#0A1230",
  ripple: "#1B2B63",
  cream: "#FFF6E0",
  soft: "#B8C4F0",
  glow: "#FFC145",
  glowAlt1: "#8FF0C9",
  glowAlt2: "#FF9EC4",
  buttonText: "#1A1530",
  dullFill: "#26366F",
  dullBorder: "#4A5C99",
  stoneFill: "#2F4287",
  stoneEdge: "#4A5C99",
  foxOrange: "#F28C38",
  foxCream: "#FFF1D6",
  spaceGlow: "#6FE3FF",
  neonGlow: "#FFE76B",
} as const;

/**
 * Daytime theme: the same world under a bright sky. The CSS variables in
 * globals.css (`html[data-theme="day"]`) carry these same values; this object is
 * for code that needs them in JS (the scene art, previews).
 */
export const dayPalette = {
  sky: "#CFE9FF",
  skyBand: "#EAF6FF",
  hills: "#A9D7F5",
  pines: "#7FC49A",
  pinesNear: "#5FAE7F",
  ground: "#BFE6C9",
  stream: "#8CC8F0",
  ripple: "#DDF1FF",
  bank: "#A9D98F",
  sun: "#FFC145",
  ink: "#1A1530",
  soft: "#3B3660",
  dullFill: "#FFFFFFCC",
  dullBorder: "#8FB6D6",
  cityBack: "#B9CBE0",
  cityNear: "#9FB5CE",
  rooftop: "#8FA3BD",
} as const;

export type WorldId = "forest" | "space" | "neon";

export const worldGlow: Record<WorldId, string> = {
  forest: palette.glow,
  space: palette.spaceGlow,
  neon: palette.neonGlow,
};

/** Reference layout size (dp). Every screen is laid out on this grid and scaled. */
export const STAGE_W = 390;
export const STAGE_H = 844;
