/**
 * Scoring engine (the local stand-in for Bhim's engine).
 *
 * Every function here is pure: give it the event log and the child's earlier
 * scores and it returns the measures. It runs on-device, offline, in well
 * under a millisecond, so the trend is ready long before the 2-second budget.
 * None of these numbers are ever shown to the child.
 */
import { median, quantile } from "@/lib/rng";
import type {
  FireflyTrailSession,
  FireflyWatchSession,
  NightWatchScore,
  NightWatchSession,
  Reliability,
  Score,
  Session,
  TrailScore,
  WatchScore,
} from "@/lib/types";
import { NIGHT_WATCH_TIMING } from "@/lib/forms/nightWatch";
import { WATCH_LEGACY_PROTOCOL_VERSION } from "@/lib/forms/fireflyWatch";

const EXPERIMENTAL: Reliability = {
  status: "experimental",
  note: "Labelled experimental until test-retest ICC reaches 0.70 in volunteer data. Not used in any composite.",
};

/** The child's own usual: the median of their earlier sessions' values. */
function usual(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (v.length < 2) return null;
  return median(v);
}

export function scoreFireflyWatch(session: FireflyWatchSession, prior: WatchScore[]): WatchScore {
  const attempts = session.events.filter((e) => !e.practice);
  const scored = attempts.filter((e) => e.outcome !== "falseStart");
  const hits = scored.filter((e) => e.outcome === "hit" && e.reactionMs != null);
  // Reaction times under 100 ms are anticipations, not reactions (standard PVT rule).
  const rts = hits.map((e) => e.reactionMs as number).filter((rt) => rt >= 100);
  const med = median(rts);
  const mean = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : null;
  const lapses = scored.filter((e) => e.outcome === "timeout").length;
  // Older logs repeat cumulative retry counts on each early press and again
  // on the resolved turn. Count presses once, with metadata as a fallback for
  // imported logs that contain only the final outcome.
  const earlyByTurn = new Map<number, { presses: number; recorded: number }>();
  for (const event of attempts) {
    const counts = earlyByTurn.get(event.index) ?? { presses: 0, recorded: 0 };
    if (event.outcome === "falseStart") counts.presses += 1;
    counts.recorded = Math.max(counts.recorded, event.falseStartsBefore);
    earlyByTurn.set(event.index, counts);
  }
  const falseStarts = [...earlyByTurn.values()].reduce((n, e) => n + Math.max(e.presses, e.recorded), 0);
  const protocolVersion = session.protocolVersion ?? WATCH_LEGACY_PROTOCOL_VERSION;
  const priorMedians = prior
    .filter((p) => (p.protocolVersion ?? WATCH_LEGACY_PROTOCOL_VERSION) === protocolVersion)
    .map((p) => p.medianRtMs);
  const u = usual(priorMedians);
  return {
    game: "fireflyWatch",
    sessionId: session.id,
    protocolVersion,
    at: session.endedAt,
    medianRtMs: med,
    meanRtMs: mean,
    lapses,
    falseStarts,
    scoredEvents: scored.length,
    validEvents: scored.filter((e) => e.outcome !== "invalid").length,
    vsUsual: med != null && u ? med / u : null,
    reliability: EXPERIMENTAL,
  };
}

export function scoreFireflyTrail(session: FireflyTrailSession, prior: TrailScore[]): TrailScore {
  const anchors = session.events.filter((e) => e.kind === "anchor");
  const anchorPerfect = anchors.filter((e) => e.perfect).length;
  const anchorStonesCorrect = anchors.reduce((n, e) => n + e.correctPositions, 0);
  const anchorStonesTotal = anchors.reduce((n, e) => n + e.sequence.length, 0);
  const scoredTrails = session.events.filter((e) => e.kind === "anchor" || e.kind === "adaptive");
  const span = scoredTrails.filter((e) => e.perfect).reduce((m, e) => Math.max(m, e.sequence.length), 0);
  const gaps: number[] = [];
  for (const e of scoredTrails) {
    for (let i = 1; i < e.taps.length; i++) gaps.push(e.taps[i].tapMs - e.taps[i - 1].tapMs);
  }
  const u = usual(prior.map((p) => p.span));
  return {
    game: "fireflyTrail",
    sessionId: session.id,
    at: session.endedAt,
    anchorPerfect,
    anchorStonesCorrect,
    anchorStonesTotal,
    span,
    medianTapGapMs: median(gaps),
    vsUsualSpan: u ? span / u : null,
    reliability: EXPERIMENTAL,
  };
}

export function scoreNightWatch(session: NightWatchSession, prior: NightWatchScore[]): NightWatchScore {
  const watch = session.events.filter((e) => !e.practice && e.outcome !== "invalid");
  const doubles = watch.filter((e) => e.kind === "double");
  const hits = doubles.filter((e) => e.outcome === "hit");
  const misses = doubles.filter((e) => e.outcome === "miss");
  const falseAlarms = watch.filter((e) => e.outcome === "falseAlarm");
  const rts = hits.map((e) => e.reactionMs).filter((x): x is number => x != null);
  const q1 = quantile(rts, 0.25);
  const q3 = quantile(rts, 0.75);
  const quarterBounds = [
    [0, 22],
    [23, 44],
    [45, 67],
    [68, 89],
  ];
  const quarters = quarterBounds.map(([lo, hi]) => {
    const inQ = watch.filter((e) => e.index >= lo && e.index <= hi);
    return {
      hits: inQ.filter((e) => e.outcome === "hit").length,
      misses: inQ.filter((e) => e.outcome === "miss").length,
      falseAlarms: inQ.filter((e) => e.outcome === "falseAlarm").length,
    };
  });
  const hitRate = doubles.length ? hits.length / doubles.length : null;
  const u = usual(prior.map((p) => p.hitRate));
  return {
    game: "nightWatch",
    sessionId: session.id,
    at: session.endedAt,
    hits: hits.length,
    misses: misses.length,
    falseAlarms: falseAlarms.length,
    doubles: doubles.length,
    hitRate,
    medianRtMs: median(rts),
    rtSteadinessMs: q1 != null && q3 != null ? q3 - q1 : null,
    quarters,
    vsUsualHitRate: hitRate != null && u ? hitRate / u : null,
    reliability: EXPERIMENTAL,
  };
}

export function scoreSession(session: Session, prior: Score[]): Score {
  switch (session.game) {
    case "fireflyWatch":
      return scoreFireflyWatch(
        session,
        prior.filter((p): p is WatchScore => p.game === "fireflyWatch"),
      );
    case "fireflyTrail":
      return scoreFireflyTrail(
        session,
        prior.filter((p): p is TrailScore => p.game === "fireflyTrail"),
      );
    case "nightWatch":
      return scoreNightWatch(
        session,
        prior.filter((p): p is NightWatchScore => p.game === "nightWatch"),
      );
  }
}

/** Classify a Night Watch tap against the glow log. Exported so the engine and the tests agree. */
export function classifyNightWatchTap(
  tapMs: number,
  glows: { index: number; kind: "single" | "double"; firstDrawnMs: number | null; secondDrawnMs: number | null }[],
  intervalMs: number,
): { glowIndex: number; hit: boolean } | null {
  // Find the glow whose window this tap falls in: from its first draw until the next glow's first draw.
  let target = -1;
  for (let i = 0; i < glows.length; i++) {
    const g = glows[i];
    if (g.firstDrawnMs == null) break;
    const nextDrawn = glows[i + 1]?.firstDrawnMs;
    // The last double still receives the same 300 ms grace as other doubles,
    // even when no next glow is drawn (including at the end of a short watch).
    const grace = i === glows.length - 1 && g.kind === "double" ? NIGHT_WATCH_TIMING.hitWindowMaxAfterNextMs : 0;
    const next = nextDrawn ?? g.firstDrawnMs + intervalMs + grace;
    if (tapMs >= g.firstDrawnMs && tapMs < next) {
      target = i;
      break;
    }
  }
  if (target < 0) return null;
  const g = glows[target];
  // A hit must come at least 100 ms after a double's second glow and less than
  // 300 ms after the next glow starts; a tap that lands in the next glow's
  // first 300 ms is credited to the previous double.
  const prev = glows[target - 1];
  if (
    prev &&
    prev.kind === "double" &&
    prev.secondDrawnMs != null &&
    g.firstDrawnMs != null &&
    tapMs - g.firstDrawnMs < NIGHT_WATCH_TIMING.hitWindowMaxAfterNextMs &&
    tapMs - prev.secondDrawnMs >= NIGHT_WATCH_TIMING.hitWindowMinMs
  ) {
    return { glowIndex: target - 1, hit: true };
  }
  if (g.kind === "double" && g.secondDrawnMs != null && tapMs - g.secondDrawnMs >= NIGHT_WATCH_TIMING.hitWindowMinMs) {
    return { glowIndex: target, hit: true };
  }
  return { glowIndex: target, hit: false };
}
