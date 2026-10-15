import type { GameId, NightWatchScore, Score, TrailScore, WatchScore } from "@/lib/types";

export interface TrendPoint {
  at: string;
  value: number;
}

export interface TrendSeries {
  key: string;
  label: string;
  unit: string;
  /** true when a lower value is the better direction (reaction time) */
  lowerIsBetter: boolean;
  points: TrendPoint[];
  usual: number | null;
  /** typical session-to-session change: median absolute difference between consecutive points */
  typicalChange: number | null;
}

function series(
  key: string,
  label: string,
  unit: string,
  lowerIsBetter: boolean,
  points: TrendPoint[],
): TrendSeries {
  const vals = points.map((p) => p.value);
  const sorted = [...vals].sort((a, b) => a - b);
  const usual = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
  const diffs: number[] = [];
  for (let i = 1; i < vals.length; i++) diffs.push(Math.abs(vals[i] - vals[i - 1]));
  const ds = diffs.sort((a, b) => a - b);
  const typicalChange = ds.length ? ds[Math.floor((ds.length - 1) / 2)] : null;
  return { key, label, unit, lowerIsBetter, points, usual, typicalChange };
}

export function trendsFor(game: GameId, scores: Score[]): TrendSeries[] {
  if (game === "fireflyWatch") {
    const s = scores.filter((x): x is WatchScore => x.game === "fireflyWatch");
    return [
      series(
        "medianRt",
        "Median reaction time",
        "ms",
        true,
        s.filter((x) => x.medianRtMs != null).map((x) => ({ at: x.at, value: Math.round(x.medianRtMs as number) })),
      ),
      series("lapses", "Lapses (no tap in 2.5 s)", "", true, s.map((x) => ({ at: x.at, value: x.lapses }))),
      series("falseStarts", "False starts", "", true, s.map((x) => ({ at: x.at, value: x.falseStarts }))),
    ];
  }
  if (game === "fireflyTrail") {
    const s = scores.filter((x): x is TrailScore => x.game === "fireflyTrail");
    return [
      series("anchor", "Anchor trails perfect (of 4)", "", false, s.map((x) => ({ at: x.at, value: x.anchorPerfect }))),
      series(
        "anchorStones",
        "Anchor stones in place (of 14)",
        "",
        false,
        s.map((x) => ({ at: x.at, value: x.anchorStonesCorrect })),
      ),
      series("span", "Span (longest perfect trail)", "", false, s.map((x) => ({ at: x.at, value: x.span }))),
    ];
  }
  const s = scores.filter((x): x is NightWatchScore => x.game === "nightWatch");
  return [
    series(
      "hitRate",
      "Doubles noticed (of 9)",
      "",
      false,
      s.map((x) => ({ at: x.at, value: x.hits })),
    ),
    series("falseAlarms", "False alarms", "", true, s.map((x) => ({ at: x.at, value: x.falseAlarms }))),
    series(
      "steadiness",
      "Reaction-time steadiness (IQR)",
      "ms",
      true,
      s.filter((x) => x.rtSteadinessMs != null).map((x) => ({ at: x.at, value: Math.round(x.rtSteadinessMs as number) })),
    ),
  ];
}
