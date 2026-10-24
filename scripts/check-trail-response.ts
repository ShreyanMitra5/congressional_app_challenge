/** Run: npx tsx scripts/check-trail-response.ts */
import assert from "node:assert/strict";
import { buildTrailResponse, isLastScoredTrail } from "../src/games/firefly-trail/response";
import { scoreFireflyTrail } from "../src/lib/scoring";
import type { FireflyTrailSession, TrailEvent, TrailTap } from "../src/lib/types";

const trail = { index: 0, kind: "anchor" as const, sequence: [2, 5, 4, 7] };
const tap = (stone: number, index: number): TrailTap => ({ stone, tapMs: 1000 + index * 400 });
const partial = buildTrailResponse(trail, [2, 5, 4].map(tap), 0, 900);
assert.equal(partial.perfect, false, "partial recall is not a perfect trail");
assert.equal(partial.correctPositions, 3, "three remembered positions remain credited");
assert.deepEqual(partial.taps.map((item) => item.stone), [2, 5, 4], "no forced or fabricated fourth tap");

const empty = buildTrailResponse({ ...trail, index: 1 }, [], 0, 900);
assert.equal(empty.correctPositions, 0, "Done with no recall records zero positions");
assert.equal(empty.perfect, false);
assert.deepEqual(empty.taps, [], "empty recall stays empty");

const completeTaps = [2, 5, 4, 7].map(tap);
const complete = buildTrailResponse({ ...trail, index: 2 }, completeTaps, 0, 900);
assert.equal(complete.perfect, true, "a full matching response can be submitted");
assert.equal(complete.correctPositions, 4);
completeTaps[0].stone = 8;
assert.equal(complete.taps[0].stone, 2, "saved responses are independent of future tap edits");

const mismatched = buildTrailResponse({ ...trail, index: 3 }, [2, 4].map(tap), 0, 900);
assert.equal(mismatched.correctPositions, 1, "partial recall is evaluated by position, not membership");
assert.equal(mismatched.perfect, false);
const replay = buildTrailResponse({ ...trail, kind: "practice", replayed: true }, [2].map(tap), 0, 900);
assert.equal(replay.replayed, true);
assert.equal(replay.kind, "practice", "practice retains its unscored classification");

const session: FireflyTrailSession = {
  id: "partial-recall",
  game: "fireflyTrail",
  startedAt: "2026-10-24T00:00:00Z",
  endedAt: "2026-10-24T00:02:00Z",
  skin: "firefly",
  formId: "A",
  reducedMotion: false,
  completed: true,
  pauses: 0,
  events: [partial, empty, complete, mismatched, replay] satisfies TrailEvent[],
};
const score = scoreFireflyTrail(session, []);
assert.equal(score.anchorStonesCorrect, 8, "partial and empty responses reach scoring without changing prior rules");
assert.equal(score.anchorStonesTotal, 16, "missing taps do not shrink the presented denominator");
assert.equal(score.anchorPerfect, 1);
assert.equal(score.span, 4);
assert.equal(score.medianTapGapMs, 400, "Done presses are not mixed into stone-tap timing");
assert.equal(isLastScoredTrail({ kind: "adaptive", index: 11 }, 12), true, "the last measured response finishes immediately, including empty recall");
assert.equal(isLastScoredTrail({ kind: "adaptive", index: 10 }, 12), false);
assert.equal(isLastScoredTrail({ kind: "practice", index: -1 }, 12), false, "practice cannot finish the scored visit");
assert.equal(isLastScoredTrail({ kind: "cooldown", index: 12 }, 12), false, "optional play cannot finish or award the visit a second time");
console.log("Firefly Trail response checks pass (22 assertions).");
