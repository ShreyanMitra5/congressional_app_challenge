/**
 * Night Watch glow forms. Three hand-checked, matched lists of 90 glows:
 * 81 single and 9 double each. Generated once by scripts/gen-nightwatch-forms.mjs
 * and verified by scripts/check-forms.ts. NEVER generated at run time.
 *
 * Matching: 2/3/2/2 doubles per quarter in every form, no double in the first
 * eight glows, 4-20 glows between doubles, uneven spacing, no light twice in a
 * row, each light used 9-11 times, no light carries more than two doubles.
 */
import type { GlowKind } from "@/lib/types";

export interface NightWatchForm {
  id: string;
  seed: number;
  /** 90 characters, one light index (0-8) per glow */
  lights: string;
  /** indices (0-89) of the nine double glows */
  doubles: number[];
}

export const NIGHT_WATCH_FORMS: NightWatchForm[] = [
  { id: "A", seed: 101, lights: "241842460716405817613101546581324138287346701308016751406283672642574743523527682350750802", doubles: [11, 17, 25, 35, 44, 59, 66, 83, 89] },
  { id: "B", seed: 202, lights: "818250254718762853217465154276012674056501801704725065023080473271315327476813524308386346", doubles: [15, 21, 32, 38, 44, 51, 56, 68, 73] },
  { id: "C", seed: 303, lights: "813516580514268782754034253802142765026463431367642721248185042302471465701073706876580310", doubles: [14, 20, 28, 35, 40, 53, 62, 82, 87] },
];

export const PRACTICE_GLOWS: { light: number; kind: GlowKind }[] = [
  { light: 4, kind: "single" },
  { light: 1, kind: "single" },
  { light: 7, kind: "single" },
  { light: 3, kind: "single" },
  { light: 6, kind: "single" },
  { light: 2, kind: "double" },
  { light: 8, kind: "single" },
  { light: 0, kind: "single" },
  { light: 5, kind: "double" },
  { light: 3, kind: "single" },
];

export function expandForm(form: NightWatchForm): { light: number; kind: GlowKind }[] {
  const d = new Set(form.doubles);
  return Array.from(form.lights, (ch, i) => ({ light: Number(ch), kind: d.has(i) ? "double" : "single" }));
}

export function pickNightWatchForm(sessionNumber: number): NightWatchForm {
  return NIGHT_WATCH_FORMS[(Math.max(1, sessionNumber) - 1) % NIGHT_WATCH_FORMS.length];
}

/** Timing constants (TUNE). Gentle pace is a separate accessibility mode with its own baseline. */
export const NIGHT_WATCH_TIMING = {
  /** glows in a full watch (the whole form) */
  watchGlows: 90,
  /** glows in a short watch: the first half of the form, for children not yet up to a full one */
  shortWatchGlows: 45,
  glowIntervalMs: 1500,
  gentleIntervalMs: 2100,
  fadeUpMs: 100,
  holdMs: 100,
  fadeDownMs: 200,
  doubleGapMs: 150,
  hitWindowMinMs: 100,
  hitWindowMaxAfterNextMs: 300,
  nodMs: 300,
  getReadyMs: 3000,
  invalidAfterResume: 3,
  endPauseMs: 2000,
  cooldownGlows: 15,
  /** untouched doubles in a row before the companion gives a gentle reminder */
  nudgeAfterMissedDoubles: 2,
  /** untouched doubles in a row before the game pauses to ask about carrying on */
  checkInAfterMissedDoubles: 4,
} as const;
