import { NIGHT_WATCH_TIMING } from "@/lib/forms/nightWatch";
import type { GlowEvent } from "@/lib/types";

/** A missed glow remains a valid observation; success never gates the next glow. */
export function outcomeFor(ev: GlowEvent): GlowEvent["outcome"] {
  if (ev.outcome === "invalid") return "invalid";
  if (ev.kind === "double") return ev.reactionMs != null ? "hit" : "miss";
  return ev.taps.length > 0 ? "falseAlarm" : "correctPass";
}

export function finalizeOutcomes(events: GlowEvent[]): GlowEvent[] {
  return events.map((ev) => ({ ...ev, outcome: outcomeFor(ev) }));
}

/** Use the actual next draw, or a virtual next slot after the final glow. */
export function responseWindowEndsAt(firstDrawnMs: number, intervalMs: number, nextFirstDrawnMs?: number): number {
  return (nextFirstDrawnMs ?? firstDrawnMs + intervalMs) + NIGHT_WATCH_TIMING.hitWindowMaxAfterNextMs;
}

/** A pause during the final response window interrupts that observation, too. */
export function invalidateFinalGlowOnPause(events: GlowEvent[], elapsedMs: number, intervalMs: number, finalized: boolean): void {
  const last = events[events.length - 1];
  if (finalized || last?.firstDrawnMs == null) return;
  if (elapsedMs >= last.firstDrawnMs && elapsedMs < responseWindowEndsAt(last.firstDrawnMs, intervalMs)) {
    last.outcome = "invalid";
  }
}
