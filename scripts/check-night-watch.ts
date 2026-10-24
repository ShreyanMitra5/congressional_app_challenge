/** Night Watch response-window and unanswered-visit regressions. Run with tsx. */
import assert from "node:assert/strict";
import { NIGHT_WATCH_FORMS, NIGHT_WATCH_TIMING, expandForm } from "../src/lib/forms/nightWatch";
import { finalizeOutcomes, invalidateFinalGlowOnPause, responseWindowEndsAt } from "../src/lib/nightWatch";
import { classifyNightWatchTap } from "../src/lib/scoring";
import type { GlowEvent } from "../src/lib/types";

const interval = NIGHT_WATCH_TIMING.glowIntervalMs;

function eventsFor(length: number, formIndex = 0): GlowEvent[] {
  return expandForm(NIGHT_WATCH_FORMS[formIndex]).slice(0, length).map((glow, index) => {
    const drawn = index * interval + 32; // A painted frame later than the timer's target.
    return {
      ...glow, index, practice: false, firstDrawnMs: drawn,
      secondDrawnMs: glow.kind === "double" ? drawn + 550 : null,
      taps: [], outcome: "correctPass", reactionMs: null, extraTaps: 0,
    };
  });
}

for (let form = 0; form < NIGHT_WATCH_FORMS.length; form++) {
  for (const length of [45, 90]) {
    const events = eventsFor(length, form);
    const finalized = finalizeOutcomes(events);
    assert.equal(finalized.length, length, "No-response visits retain every presented glow.");
    assert.equal(finalized.filter((event) => event.outcome === "hit").length, 0);
    assert.equal(finalized.filter((event) => event.outcome === "miss").length, length === 45 ? 5 : 9);
    assert.deepEqual(events.map((event) => event.outcome), Array(length).fill("correctPass"), "Finalization does not mutate the active log.");

    const last = finalized[length - 1];
    if (last.kind === "double") {
      const deadline = responseWindowEndsAt(last.firstDrawnMs!, interval);
      assert.deepEqual(classifyNightWatchTap(deadline - 1, finalized, interval), { glowIndex: length - 1, hit: true }, "The final double keeps its full response window, including delayed paint.");
      assert.equal(classifyNightWatchTap(deadline, finalized, interval), null, "The final window has a finite end.");
    }
  }
}

const interrupted = eventsFor(90);
interrupted[11].outcome = "invalid";
assert.equal(finalizeOutcomes(interrupted)[11].outcome, "invalid", "Resting must not turn an interrupted glow into a miss.");

const finalPause = eventsFor(45);
const finalDeadline = responseWindowEndsAt(finalPause.at(-1)!.firstDrawnMs!, interval);
invalidateFinalGlowOnPause(finalPause, finalDeadline - 1, interval, false);
assert.equal(finalizeOutcomes(finalPause).at(-1)!.outcome, "invalid", "A final glow interrupted during its grace window is excluded when resuming finalizes the watch.");

for (const [elapsedMs, finalized] of [[finalDeadline, false], [finalDeadline - 1, true]] as const) {
  const closed = eventsFor(45);
  const last = closed.at(-1)!;
  last.reactionMs = 400;
  last.outcome = "hit";
  invalidateFinalGlowOnPause(closed, elapsedMs, interval, finalized);
  assert.equal(last.outcome, "hit", "Pausing after the response window or finalization preserves the recorded outcome.");
}

const delayedNext: GlowEvent[] = [
  { ...eventsFor(1)[0], kind: "double", firstDrawnMs: 0, secondDrawnMs: 550 },
  { ...eventsFor(1)[0], index: 1, kind: "single", firstDrawnMs: 1600, secondDrawnMs: null },
];
const delayedDeadline = responseWindowEndsAt(0, interval, 1600);
assert.deepEqual(classifyNightWatchTap(delayedDeadline - 1, delayedNext, interval), { glowIndex: 0, hit: true }, "A late next frame moves both the classifier and evaluation deadline together.");
assert.deepEqual(classifyNightWatchTap(delayedDeadline, delayedNext, interval), { glowIndex: 1, hit: false });

console.log("Night Watch checks pass: unanswered forms, interrupted glows, final windows, and delayed frames.");
