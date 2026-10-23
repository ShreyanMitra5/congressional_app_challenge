/**
 * Verifies the stored session lists match the design rules.
 * Run: npx tsx scripts/check-forms.ts
 */
import { NIGHT_WATCH_FORMS, expandForm } from "../src/lib/forms/nightWatch";
import { WATCH_FORMS, WATCH_MAX_WAIT_MS, WATCH_MIN_WAIT_MS, waitsForSeed } from "../src/lib/forms/fireflyWatch";
import { STONE_POSITIONS, TRAIL_FORMS } from "../src/lib/forms/fireflyTrail";

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.log("  ✗", msg);
  }
}

console.log("Night Watch forms");
const quarters = [
  [0, 22],
  [23, 44],
  [45, 67],
  [68, 89],
];
const quarterCounts: number[][] = [];
const usageProfiles: string[] = [];
for (const f of NIGHT_WATCH_FORMS) {
  const g = expandForm(f);
  check(g.length === 90, `${f.id}: 90 glows`);
  const d = g.map((x, i) => (x.kind === "double" ? i : -1)).filter((i) => i >= 0);
  check(d.length === 9, `${f.id}: 9 doubles`);
  check(d.every((i) => i >= 8), `${f.id}: none in first 8`);
  for (let i = 1; i < d.length; i++) {
    const gap = d[i] - d[i - 1] - 1;
    check(gap >= 4 && gap <= 20, `${f.id}: gap ${gap} between doubles`);
  }
  const gaps = d.slice(1).map((v, i) => v - d[i]);
  check(new Set(gaps).size >= 4, `${f.id}: spacing not even`);
  const qc = quarters.map(([lo, hi]) => d.filter((i) => i >= lo && i <= hi).length);
  qc.forEach((c, q) => check(c >= 2 && c <= 3, `${f.id}: quarter ${q + 1} has ${c} doubles`));
  quarterCounts.push(qc);
  for (let i = 1; i < 90; i++) check(g[i].light !== g[i - 1].light, `${f.id}: light repeats at ${i}`);
  const use = new Array(9).fill(0);
  const dUse = new Array(9).fill(0);
  g.forEach((x) => {
    use[x.light]++;
    if (x.kind === "double") dUse[x.light]++;
  });
  use.forEach((c, l) => check(c >= 8 && c <= 12, `${f.id}: light ${l} used ${c} times`));
  dUse.forEach((c, l) => check(c <= 2, `${f.id}: light ${l} carries ${c} doubles`));
  usageProfiles.push([...use].sort((a, b) => a - b).join(","));
  console.log(`  ${f.id}: doubles at ${d.join(" ")} | per quarter ${qc.join("/")} | light use ${use.join(",")}`);
}
check(quarterCounts.every((q) => q.join() === quarterCounts[0].join()), "forms match on doubles per quarter");

console.log("Firefly Watch forms");
const base = waitsForSeed(WATCH_FORMS[0].seed).slice().sort((a, b) => a - b);
for (const f of WATCH_FORMS) {
  const w = waitsForSeed(f.seed);
  check(w.length === 30, `${f.id}: 30 waits`);
  check(w.every((x) => x >= WATCH_MIN_WAIT_MS && x <= WATCH_MAX_WAIT_MS), `${f.id}: waits within ${WATCH_MIN_WAIT_MS / 1000}-${WATCH_MAX_WAIT_MS / 1000} s`);
  check(w.slice().sort((a, b) => a - b).join() === base.join(), `${f.id}: matches the shared wait set`);
  const total = w.reduce((a, b) => a + b, 0);
  console.log(`  ${f.id}: first waits ${w.slice(0, 5).join(" ")}… total wait ${(total / 1000).toFixed(1)} s`);
}

console.log("Firefly Trail forms");
for (let i = 0; i < STONE_POSITIONS.length; i++)
  for (let j = i + 1; j < STONE_POSITIONS.length; j++) {
    const a = STONE_POSITIONS[i];
    const b = STONE_POSITIONS[j];
    check(Math.hypot(a.x - b.x, a.y - b.y) >= 90, `stones ${i} and ${j} too close`);
  }
STONE_POSITIONS.forEach((p, i) =>
  check(p.x >= 20 + 36 && p.x <= 370 - 36 && p.y >= 190 + 36 && p.y <= 610 - 36, `stone ${i} inside play area`),
);
for (const f of TRAIL_FORMS) {
  check(f.practice.map((s) => s.length).join() === "2,3", `${f.id}: practice lengths 2,3`);
  check(f.anchors.map((s) => s.length).join() === "3,3,4,4", `${f.id}: anchor lengths 3,3,4,4`);
  [...f.practice, ...f.anchors].forEach((s, k) => check(new Set(s).size === s.length, `${f.id}: trail ${k} repeats a stone`));
}

console.log(failures ? `\n${failures} problem(s)` : "\nAll forms pass.");
process.exit(failures ? 1 : 0);
