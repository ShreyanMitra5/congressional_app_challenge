/**
 * Self-check for the scoring engine on synthetic event logs.
 * Run: npx tsx scripts/check-scoring.ts
 */
import { classifyNightWatchTap, scoreFireflyTrail, scoreFireflyWatch, scoreNightWatch } from "../src/lib/scoring";
import type { FireflyTrailSession, FireflyWatchSession, NightWatchSession, WatchEvent } from "../src/lib/types";

let failures = 0;
function expect(cond: boolean, msg: string) {
  console.log((cond ? "  ✓ " : "  ✗ ") + msg);
  if (!cond) failures++;
}

// ---- Firefly Watch ----
const events: WatchEvent[] = [];
for (let i = -2; i < 30; i++) {
  const rt = 250 + ((i * 37) % 120); // 250..369
  const timeout = i === 7 || i === 19;
  events.push({
    index: i,
    practice: i < 0,
    plannedWaitMs: 2000,
    waitStartMs: 0,
    stimulusDrawnMs: 2000,
    tapMs: timeout ? null : 2000 + rt,
    reactionMs: timeout ? null : rt,
    outcome: timeout ? "timeout" : "hit",
    falseStartsBefore: i === 3 ? 2 : 0,
  });
}
const watch: FireflyWatchSession = {
  id: "w1", game: "fireflyWatch", startedAt: "", endedAt: "2026-10-14T00:00:00Z", skin: "firefly", formId: "A", seed: 1,
  reducedMotion: false, completed: true, excluded: false, events, pauses: 0, calibrationGapMs: 120,
};
const ws = scoreFireflyWatch(watch, []);
console.log("Firefly Watch");
expect(ws.scoredEvents === 30, "30 scored events");
expect(ws.lapses === 2, "2 lapses counted");
expect(ws.falseStarts === 2, "false starts summed from scored events only");
expect(ws.medianRtMs != null && ws.medianRtMs >= 250 && ws.medianRtMs <= 370, `median RT in range (${ws.medianRtMs})`);
expect(ws.vsUsual === null, "no 'usual' until two earlier sessions exist");
const ws2 = scoreFireflyWatch(watch, [ws, { ...ws, medianRtMs: 400 }]);
expect(ws2.vsUsual != null && Math.abs(ws2.vsUsual - ws.medianRtMs! / ((ws.medianRtMs! + 400) / 2)) < 1e-9, "vsUsual compares to median of prior medians");

// ---- Firefly Trail ----
const trail: FireflyTrailSession = {
  id: "t1", game: "fireflyTrail", startedAt: "", endedAt: "2026-10-14T00:00:00Z", skin: "firefly", formId: "A", reducedMotion: false, completed: true, pauses: 0,
  events: [
    { index: -2, kind: "practice", sequence: [1, 6], taps: [{ stone: 1, tapMs: 1 }, { stone: 6, tapMs: 2 }], showStartMs: 0, showEndMs: 1, perfect: true, correctPositions: 2 },
    { index: 0, kind: "anchor", sequence: [2, 5, 4], taps: [{ stone: 2, tapMs: 10 }, { stone: 5, tapMs: 500 }, { stone: 4, tapMs: 1100 }], showStartMs: 0, showEndMs: 1, perfect: true, correctPositions: 3 },
    { index: 1, kind: "anchor", sequence: [8, 1, 6], taps: [{ stone: 8, tapMs: 10 }, { stone: 6, tapMs: 600 }, { stone: 1, tapMs: 1200 }], showStartMs: 0, showEndMs: 1, perfect: false, correctPositions: 1 },
    { index: 2, kind: "anchor", sequence: [0, 7, 3, 2], taps: [{ stone: 0, tapMs: 10 }, { stone: 7, tapMs: 500 }, { stone: 3, tapMs: 1000 }, { stone: 2, tapMs: 1500 }], showStartMs: 0, showEndMs: 1, perfect: true, correctPositions: 4 },
    { index: 3, kind: "anchor", sequence: [5, 2, 8, 4], taps: [{ stone: 5, tapMs: 10 }, { stone: 2, tapMs: 500 }, { stone: 4, tapMs: 1000 }, { stone: 8, tapMs: 1500 }], showStartMs: 0, showEndMs: 1, perfect: false, correctPositions: 2 },
    { index: 4, kind: "adaptive", sequence: [1, 3, 5, 7, 0], taps: [1, 3, 5, 7, 0].map((s, i) => ({ stone: s, tapMs: i * 500 })), showStartMs: 0, showEndMs: 1, perfect: true, correctPositions: 5 },
    { index: 12, kind: "cooldown", sequence: [1, 3, 5, 7, 0, 2], taps: [1, 3, 5, 7, 0, 2].map((s, i) => ({ stone: s, tapMs: i * 500 })), showStartMs: 0, showEndMs: 1, perfect: true, correctPositions: 6 },
  ],
};
const ts = scoreFireflyTrail(trail, []);
console.log("Firefly Trail");
expect(ts.anchorPerfect === 2, "2 of 4 anchors perfect");
expect(ts.anchorStonesCorrect === 10 && ts.anchorStonesTotal === 14, "10 of 14 anchor stones in place");
expect(ts.span === 5, "span ignores practice and cooldown (5)");
expect(ts.medianTapGapMs === 500, "median tap gap 500 ms");

// ---- Night Watch ----
const interval = 1500;
const glows: NightWatchSession["events"] = [];
const doubles = new Set([11, 17, 25, 35, 44, 59, 66, 83, 89]);
for (let i = 0; i < 90; i++) {
  const first = i * interval;
  const isD = doubles.has(i);
  glows.push({ index: i, practice: false, light: i % 9, kind: isD ? "double" : "single", firstDrawnMs: first, secondDrawnMs: isD ? first + 550 : null, taps: [], outcome: "correctPass", reactionMs: null, extraTaps: 0 });
}
// taps: hit 7 doubles at +300 ms after the second glow; miss 2; one false alarm on glow 30; one late hit in the next glow's first 300 ms (glow 44)
const tapTimes: number[] = [];
for (const d of [11, 17, 25, 35, 59, 66, 83]) tapTimes.push(d * interval + 550 + 300);
tapTimes.push(44 * interval + interval + 200); // 200 ms into glow 45 → still credited to double 44
tapTimes.push(30 * interval + 400); // false alarm
for (const t of tapTimes) {
  const c = classifyNightWatchTap(t, glows, interval);
  if (!c) continue;
  const g = glows[c.glowIndex];
  g.taps.push(t);
  if (c.hit && g.reactionMs == null) { g.reactionMs = t - (g.secondDrawnMs as number); g.outcome = "hit"; }
  else if (!c.hit) g.outcome = "falseAlarm";
}
for (const g of glows) if (g.kind === "double" && g.outcome !== "hit") g.outcome = "miss";
const nw: NightWatchSession = { id: "n1", game: "nightWatch", startedAt: "", endedAt: "2026-10-14T00:00:00Z", world: "forest", formId: "A", seed: 101, gentlePace: false, reducedMotion: false, completed: true, events: glows, pauses: 0, practiceReplayed: false };
const ns = scoreNightWatch(nw, []);
console.log("Night Watch");
expect(ns.doubles === 9, "9 doubles");
expect(ns.hits === 8, `8 hits incl. one credited in the next glow's first 300 ms (${ns.hits})`);
expect(ns.misses === 1, "1 miss");
expect(ns.falseAlarms === 1, "1 false alarm");
expect(ns.medianRtMs === 300, `median RT 300 (${ns.medianRtMs})`);
expect(ns.quarters.reduce((n, q) => n + q.hits, 0) === 8, "quarter hits add up");
const tooEarly = classifyNightWatchTap(11 * interval + 550 + 50, glows, interval);
expect(tooEarly != null && !tooEarly.hit, "a tap < 100 ms after the second glow is not a hit");
const firstHalf = classifyNightWatchTap(17 * interval + 200, glows, interval);
expect(firstHalf != null && !firstHalf.hit, "a tap during a double's first glow is a false alarm");

console.log(failures ? `\n${failures} failure(s)` : "\nScoring checks pass.");
process.exit(failures ? 1 : 0);
