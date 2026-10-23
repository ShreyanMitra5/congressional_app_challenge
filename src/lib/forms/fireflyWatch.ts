/**
 * Firefly Watch wait lists. Three matched forms: every form uses the same 30
 * wait values (1.0 to 3.6 s, evenly covering the range so medians match
 * exactly) in a different, seeded order. The same seed always gives the same
 * waits.
 *
 * The range was 1.0 to 5.0 s in the first build; it was shortened after
 * clinician feedback that children with attention difficulties were checking
 * out between fireflies. The pace is fixed for the whole session (it never
 * speeds up as the child progresses) so reaction times stay comparable.
 */
import { mulberry32 } from "@/lib/rng";

export const WATCH_MIN_WAIT_MS = 1000;
export const WATCH_MAX_WAIT_MS = 3600;

export const WATCH_BASE_WAITS_MS: number[] = Array.from({ length: 30 }, (_, i) =>
  Math.round(WATCH_MIN_WAIT_MS + (i * (WATCH_MAX_WAIT_MS - WATCH_MIN_WAIT_MS)) / 29),
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
export const WATCH_PRACTICE_WAITS_MS = [1600, 2400];

export const WATCH_TIMING = {
  scoredEvents: 30,
  practiceEvents: 2,
  timeoutMs: 2500,
  maxFalseStarts: 10,
  catchGlowMs: 380,
  oopsBubbleMs: 950,
  timeoutDriftMs: 800,
  /** extra time the "floated away" bubble stays after the drift */
  timeoutHoldMs: 450,
  betweenEventsMs: 220,
  calibrationTaps: 10,
  calibrationEveryDays: 21,
  /** after this many fireflies in a row float away, the fox gives a gentle nudge */
  nudgeAfterTimeouts: 2,
  /** after this many in a row, the game pauses and asks if the child wants to keep going */
  checkInAfterTimeouts: 4,
  /** how long the flying spark takes to reach its bead on the strip */
  sparkFlyMs: 520,
} as const;
