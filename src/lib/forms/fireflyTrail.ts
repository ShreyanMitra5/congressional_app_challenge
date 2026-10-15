/**
 * Firefly Trail: nine fixed stone positions and three matched anchor forms.
 *
 * Positions are stone centres on the 390 x 844 reference. The play area is
 * 350 x 420 starting at (20, 190). Stones are 64 dp with a 72 dp tap target,
 * laid out irregularly (as in a Corsi board) with at least 90 dp between any
 * two centres so nothing overlaps and no row or column reads as a pattern.
 * These numbers are for the code only; the stones never show numbers or paths.
 */
import { mulberry32 } from "@/lib/rng";

export const STONE_POSITIONS: { x: number; y: number }[] = [
  { x: 86, y: 250 },
  { x: 214, y: 232 },
  { x: 322, y: 282 },
  { x: 136, y: 352 },
  { x: 262, y: 376 },
  { x: 62, y: 448 },
  { x: 190, y: 468 },
  { x: 318, y: 486 },
  { x: 128, y: 562 },
];

export const PLAY_AREA = { x: 20, y: 190, w: 350, h: 420 } as const;

export interface TrailForm {
  id: string;
  seed: number;
  /** 2 practice trails (2 and 3 stones) */
  practice: number[][];
  /** 4 anchor trails: lengths 3, 3, 4, 4 */
  anchors: number[][];
}

export const TRAIL_FORMS: TrailForm[] = [
  {
    id: "A",
    seed: 4101,
    practice: [
      [1, 6],
      [3, 7, 0],
    ],
    anchors: [
      [2, 5, 4],
      [8, 1, 6],
      [0, 7, 3, 2],
      [5, 2, 8, 4],
    ],
  },
  {
    id: "B",
    seed: 4202,
    practice: [
      [4, 0],
      [7, 2, 5],
    ],
    anchors: [
      [6, 1, 8],
      [3, 4, 0],
      [5, 8, 2, 1],
      [7, 0, 6, 3],
    ],
  },
  {
    id: "C",
    seed: 4303,
    practice: [
      [8, 3],
      [0, 5, 2],
    ],
    anchors: [
      [7, 4, 1],
      [2, 6, 5],
      [1, 8, 0, 6],
      [3, 7, 2, 4],
    ],
  },
];

export function pickTrailForm(sessionNumber: number): TrailForm {
  return TRAIL_FORMS[(Math.max(1, sessionNumber) - 1) % TRAIL_FORMS.length];
}

/**
 * Seeded generator for adaptive trails. No stone repeats within a trail and
 * no two consecutive stones are neighbours (centre distance < 150), so a
 * trail is never a straight short hop that is easy to guess.
 */
export function makeTrailGenerator(seed: number) {
  const rand = mulberry32(seed);
  return function nextTrail(length: number): number[] {
    for (let attempt = 0; attempt < 200; attempt++) {
      const seq: number[] = [];
      const used = new Set<number>();
      let ok = true;
      for (let i = 0; i < length; i++) {
        const cands: number[] = [];
        for (let s = 0; s < STONE_POSITIONS.length; s++) {
          if (used.has(s)) continue;
          if (seq.length) {
            const a = STONE_POSITIONS[seq[seq.length - 1]];
            const b = STONE_POSITIONS[s];
            if (Math.hypot(a.x - b.x, a.y - b.y) < 150) continue;
          }
          cands.push(s);
        }
        if (!cands.length) {
          ok = false;
          break;
        }
        const pick = cands[Math.floor(rand() * cands.length)];
        seq.push(pick);
        used.add(pick);
      }
      if (ok) return seq;
    }
    // Fallback: simple non-repeating sequence.
    return Array.from({ length }, (_, i) => i % STONE_POSITIONS.length);
  };
}

export const TRAIL_TIMING = {
  stoneOnMs: 700,
  stoneOffMs: 350,
  glideMs: 300,
  fadeInMs: 150,
  tappedGlowMs: 450,
  betweenTrailsMs: 900,
  adaptiveTrails: 8,
  minLength: 2,
  maxLength: 9,
  adaptiveStart: 4,
  cooldownLength: 3,
} as const;
