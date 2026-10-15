// Generates three matched 90-glow forms for Night Watch and checks them.
// Run once; the output is pasted into src/lib/forms/nightWatch.ts and never
// regenerated at run time.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const N = 90, LIGHTS = 9, DOUBLES = 9;
const quarters = [[0, 22], [23, 44], [45, 67], [68, 89]];
// Shared double-count per quarter so forms match: 2,3,2,2
const perQuarter = [2, 3, 2, 2];

function genDoubles(rand) {
  for (let attempt = 0; attempt < 100000; attempt++) {
    const idx = [];
    let ok = true;
    for (let q = 0; q < 4; q++) {
      const [lo, hi] = quarters[q];
      const want = perQuarter[q];
      const picks = new Set();
      let guard = 0;
      while (picks.size < want && guard++ < 1000) {
        const v = lo + Math.floor(rand() * (hi - lo + 1));
        if (v < 8) continue;
        picks.add(v);
      }
      if (picks.size < want) { ok = false; break; }
      idx.push(...[...picks].sort((a, b) => a - b));
    }
    if (!ok) continue;
    idx.sort((a, b) => a - b);
    let good = true;
    for (let i = 1; i < idx.length; i++) {
      const gap = idx[i] - idx[i - 1] - 1;
      if (gap < 4 || gap > 20) { good = false; break; }
    }
    if (!good) continue;
    const gaps = idx.slice(1).map((v, i) => v - idx[i]);
    if (new Set(gaps).size < 5) continue; // not evenly spaced
    return idx;
  }
  throw new Error("no double layout");
}

function genLights(rand, doubleIdx) {
  for (let attempt = 0; attempt < 100000; attempt++) {
    const lights = [];
    const counts = new Array(LIGHTS).fill(0);
    const dcounts = new Array(LIGHTS).fill(0);
    const dset = new Set(doubleIdx);
    let ok = true;
    for (let i = 0; i < N; i++) {
      const isD = dset.has(i);
      const cands = [];
      for (let l = 0; l < LIGHTS; l++) {
        if (i > 0 && lights[i - 1] === l) continue;
        if (counts[l] >= 11) continue;
        if (isD && dcounts[l] >= 1) continue; // spread doubles: max 1 per light here (<=2 allowed)
        cands.push(l);
      }
      if (!cands.length) { ok = false; break; }
      const l = cands[Math.floor(rand() * cands.length)];
      lights.push(l); counts[l]++; if (isD) dcounts[l]++;
    }
    if (!ok) continue;
    if (counts.some((c) => c < 9 || c > 11)) continue;
    return lights;
  }
  throw new Error("no light layout");
}

export function validate(form) {
  const errs = [];
  if (form.glows.length !== N) errs.push("length");
  const d = form.glows.map((g, i) => (g.kind === "double" ? i : -1)).filter((i) => i >= 0);
  if (d.length !== DOUBLES) errs.push("double count " + d.length);
  if (d.some((i) => i < 8)) errs.push("double in first 8");
  for (let i = 1; i < d.length; i++) { const gap = d[i] - d[i - 1] - 1; if (gap < 4 || gap > 20) errs.push("gap " + gap); }
  quarters.forEach(([lo, hi], q) => { const c = d.filter((i) => i >= lo && i <= hi).length; if (c !== perQuarter[q]) errs.push(`quarter ${q} has ${c}`); });
  for (let i = 1; i < N; i++) if (form.glows[i].light === form.glows[i - 1].light) errs.push("repeat light at " + i);
  const counts = new Array(LIGHTS).fill(0), dc = new Array(LIGHTS).fill(0);
  form.glows.forEach((g) => { counts[g.light]++; if (g.kind === "double") dc[g.light]++; });
  if (counts.some((c) => c < 8 || c > 12)) errs.push("light usage " + counts.join(","));
  if (dc.some((c) => c > 2)) errs.push("light carries >2 doubles");
  return errs;
}

const seeds = { A: 101, B: 202, C: 303 };
const forms = {};
for (const [id, seed] of Object.entries(seeds)) {
  const rand = mulberry32(seed);
  const d = genDoubles(rand);
  const lights = genLights(rand, d);
  const dset = new Set(d);
  forms[id] = { id, seed, glows: lights.map((light, i) => ({ light, kind: dset.has(i) ? "double" : "single" })) };
  const errs = validate(forms[id]);
  if (errs.length) throw new Error(id + ": " + errs.join("; "));
}
console.log(JSON.stringify(forms));
