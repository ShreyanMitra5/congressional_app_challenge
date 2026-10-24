/**
 * Firefly Watch wait lists. Three matched forms: every form uses the same 30
 * wait values (1.0 to 3.2 s, evenly covering the range so medians match
 * exactly) in a different, seeded order. The same seed always gives the same
 * waits.
 *
 * This protocol shortens the previous 1.0–3.6 s range slightly. The pace is
 * fixed throughout a session; it never speeds up after successful catches.
 * Session protocol versions keep comparisons within the same timing rules.
 */
import { mulberry32 } from "@/lib/rng";

export const WATCH_MIN_WAIT_MS = 1000;
export const WATCH_MAX_WAIT_MS = 3200;
export const WATCH_LEGACY_PROTOCOL_VERSION = "watch-v1-3.6s";
export const WATCH_FIXED_POSITION_PROTOCOL_VERSION = "watch-v2-3.2s";
export const WATCH_PROTOCOL_VERSION = "watch-v3-varied-positions";

/** Safe sprite centres on the 390 × 844 canvas, below instructions and above the fox/buttons. */
export const WATCH_POSITIONS = [
  { x: 90, y: 370 }, { x: 195, y: 370 }, { x: 300, y: 370 },
  { x: 90, y: 460 }, { x: 195, y: 460 }, { x: 300, y: 460 },
] as const;

/** Practice first, then five balanced passes through the six spots; never repeat a spot consecutively. */
export function positionsForSeed(seed: number): (typeof WATCH_POSITIONS)[number][] {
  const rand = mulberry32(seed ^ 0x70a17e);
  let previous = -1;
  function shuffledPass() {
    const order = WATCH_POSITIONS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order[0] === previous) [order[0], order[1]] = [order[1], order[0]];
    return order;
  }
  const practice = shuffledPass().slice(0, WATCH_TIMING.practiceEvents);
  previous = practice.at(-1)!;
  const order = [...practice];
  while (order.length < WATCH_TIMING.practiceEvents + WATCH_TIMING.scoredEvents) {
    const pass = shuffledPass();
    order.push(...pass);
    previous = pass.at(-1)!;
  }
  return order.slice(0, WATCH_TIMING.practiceEvents + WATCH_TIMING.scoredEvents).map((i) => WATCH_POSITIONS[i]);
}

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
  /** Practice always moves on, even if a child keeps tapping before the glow. */
  maxPracticeFalseStarts: 3,
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
  /** An unanswered check-in ends gently instead of leaving the session open. */
  checkInRestMs: 30_000,
  /** how long the flying spark takes to reach its bead on the strip */
  sparkFlyMs: 520,
} as const;
