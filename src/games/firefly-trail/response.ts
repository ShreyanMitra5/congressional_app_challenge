import type { TrailEvent, TrailTap } from "@/lib/types";

/** Keep exactly the response submitted, including partial or empty recall. */
export function buildTrailResponse(
  trail: Pick<TrailEvent, "index" | "kind" | "sequence" | "replayed">,
  taps: readonly TrailTap[],
  showStartMs: number,
  showEndMs: number,
): TrailEvent {
  const correctPositions = trail.sequence.reduce(
    (count, stone, index) => count + Number(taps[index]?.stone === stone),
    0,
  );
  return {
    index: trail.index,
    kind: trail.kind,
    sequence: [...trail.sequence],
    taps: taps.map((tap) => ({ ...tap })),
    showStartMs,
    showEndMs,
    perfect: taps.length === trail.sequence.length && correctPositions === trail.sequence.length,
    correctPositions,
    ...(trail.replayed ? { replayed: true } : {}),
  };
}

/** Completing the measured list ends the visit, regardless of recall accuracy. */
export function isLastScoredTrail(
  trail: Pick<TrailEvent, "index" | "kind">,
  scoredTrailCount: number,
): boolean {
  return (trail.kind === "anchor" || trail.kind === "adaptive") && trail.index + 1 === scoredTrailCount;
}
