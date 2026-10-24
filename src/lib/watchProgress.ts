import type { WatchEvent } from "@/lib/types";

export interface WatchAttempt {
  index: number;
  planned: number;
  waitStart: number;
  drawn: number | null;
  falseStarts: number;
  resolved: boolean;
}

/** Resolve once, before animation or React rendering can be interrupted. */
export function resolveWatchAttempt(
  attempt: WatchAttempt,
  outcome: "hit" | "timeout" | "invalid",
  tapMs: number | null = null,
): WatchEvent | null {
  if (attempt.resolved) return null;
  if (outcome === "hit" && (attempt.drawn == null || tapMs == null)) return null;
  attempt.resolved = true;
  return {
    index: attempt.index,
    practice: attempt.index < 0,
    plannedWaitMs: attempt.planned,
    waitStartMs: attempt.waitStart,
    stimulusDrawnMs: attempt.drawn,
    tapMs,
    reactionMs: outcome === "hit" && tapMs != null && attempt.drawn != null ? tapMs - attempt.drawn : null,
    outcome,
    falseStartsBefore: attempt.falseStarts,
  };
}

/** A pause must never replay a firefly whose result is already recorded. */
export function watchResumeIndex(attempt: WatchAttempt): number {
  return attempt.index + (attempt.resolved ? 1 : 0);
}
