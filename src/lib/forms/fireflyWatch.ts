/**
 * Firefly Watch wait lists. Three matched forms: every form uses the same 30
 * wait values (1.0 to 5.0 s, evenly covering the range so medians match
 * exactly) in a different, seeded order. The same seed always gives the same
 * waits.
 */
import { mulberry32 } from "@/lib/rng";

export const WATCH_BASE_WAITS_MS: number[] = Array.from({ length: 30 }, (_, i) =>
  Math.round(1000 + (i * 4000) / 29),
);

export interface WatchForm {
  id: string;
  seed: number;
}

export const WATCH_FORMS: WatchForm[] = [
  { id: "A", seed: 7041 },
  { id: "B", seed: 9127 },
  { id: "C", seed: 3310 },
];

export function pickWatchForm(sessionNumber: number): WatchForm {
  return WATCH_FORMS[(Math.max(1, sessionNumber) - 1) % WATCH_FORMS.length];
}

/** Deterministic Fisher-Yates shuffle of the base waits for a seed. */
export function waitsForSeed(seed: number): number[] {
  const rand = mulberry32(seed);
  const arr = [...WATCH_BASE_WAITS_MS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Practice waits are fixed so the two unscored events feel the same every time. */
export const WATCH_PRACTICE_WAITS_MS = [1800, 2600];

export const WATCH_TIMING = {
  scoredEvents: 30,
  practiceEvents: 2,
  timeoutMs: 2500,
  maxFalseStarts: 10,
  catchGlowMs: 450,
  oopsBubbleMs: 1200,
  timeoutDriftMs: 800,
  betweenEventsMs: 350,
  calibrationTaps: 10,
  calibrationEveryDays: 21,
} as const;
