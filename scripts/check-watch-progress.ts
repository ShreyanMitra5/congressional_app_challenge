/** Run with tsx. Regression checks for interrupted catches and missed turns. */
import assert from "node:assert/strict";
import { WATCH_FORMS, WATCH_POSITIONS, WATCH_TIMING, positionsForSeed } from "../src/lib/forms/fireflyWatch";
import { resolveWatchAttempt, watchResumeIndex, type WatchAttempt } from "../src/lib/watchProgress";

function attempt(index: number, drawn: number | null = 1400): WatchAttempt {
  return { index, planned: 1200, waitStart: 200, drawn, falseStarts: 0, resolved: false };
}

// Pausing immediately after a catch must retain its result, advance once,
// and ignore the timeout or double tap that belonged to the same firefly.
const caught = attempt(7);
caught.falseStarts = 2;
const hit = resolveWatchAttempt(caught, "hit", 1710);
assert.equal(hit?.reactionMs, 310);
assert.equal(hit?.falseStartsBefore, 2);
assert.equal(watchResumeIndex(caught), 8);
assert.equal(resolveWatchAttempt(caught, "hit", 1711), null);
assert.equal(resolveWatchAttempt(caught, "timeout"), null);

// If the response window expires first, a late tap cannot turn that miss
// into a catch or create a second outcome for the turn.
const missed = attempt(12);
assert.equal(resolveWatchAttempt(missed, "timeout")?.outcome, "timeout");
assert.equal(resolveWatchAttempt(missed, "hit", 4000), null);
assert.equal(watchResumeIndex(missed), 13);

// Interrupting before the glow is drawn repeats the same unfinished turn.
const waiting = attempt(4, null);
assert.equal(resolveWatchAttempt(waiting, "hit", 500), null);
assert.equal(watchResumeIndex(waiting), 4);
waiting.drawn = 1400;
assert.equal(resolveWatchAttempt(waiting, "hit", 1700)?.outcome, "hit");
assert.equal(watchResumeIndex(waiting), 5);

// A skipped practice turn also advances, and remains outside scored data.
const practice = attempt(-1, null);
practice.falseStarts = WATCH_TIMING.maxPracticeFalseStarts;
assert.equal(resolveWatchAttempt(practice, "invalid")?.practice, true);
assert.equal(watchResumeIndex(practice), 0);

// Progress has a fixed end even when no fireflies are caught. Resuming after
// each timeout must visit each turn once and reach the completion boundary.
let index = 0;
let turns = 0;
while (index < WATCH_TIMING.scoredEvents) {
  const turn = attempt(index);
  assert.equal(resolveWatchAttempt(turn, "timeout")?.index, index);
  assert.equal(resolveWatchAttempt(turn, "timeout"), null);
  index = watchResumeIndex(turn);
  turns++;
}
assert.equal(turns, WATCH_TIMING.scoredEvents);
assert.equal(index, WATCH_TIMING.scoredEvents);

for (const form of WATCH_FORMS) {
  const positions = positionsForSeed(form.seed);
  assert.deepEqual(positions, positionsForSeed(form.seed), "positions are reproducible for retries and saved sessions");
  assert.equal(positions.length, WATCH_TIMING.practiceEvents + WATCH_TIMING.scoredEvents);
  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    assert.ok(position.x - 60 >= 20 && position.x + 60 <= 370, "sprite stays inside the canvas");
    assert.ok(position.y - 60 >= 310 && position.y + 60 <= 520, "sprite clears instructions, bubbles and Catch");
    if (i > 0) assert.notDeepEqual(position, positions[i - 1], "consecutive fireflies use different spots");
  }
  const scoredPositions = positions.slice(WATCH_TIMING.practiceEvents);
  for (const spot of WATCH_POSITIONS) {
    assert.equal(scoredPositions.filter((position) => position.x === spot.x && position.y === spot.y).length, 5,
      "every form uses each scored location equally often");
  }
}
assert.notDeepEqual(positionsForSeed(WATCH_FORMS[0].seed), positionsForSeed(WATCH_FORMS[1].seed), "forms vary the location order");

console.log("Watch regressions pass: one result per turn, safe resume, bounded completion, and varied safe positions.");
