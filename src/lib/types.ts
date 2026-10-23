import type { SkinId } from "@/components/art/types";
import type { WorldId } from "@/lib/theme";

export type { SkinId, WorldId };

export type GameId = "fireflyWatch" | "fireflyTrail" | "nightWatch";

export const GAME_ORDER: GameId[] = ["fireflyWatch", "fireflyTrail", "nightWatch"];

export const GAME_TITLES: Record<GameId, string> = {
  fireflyWatch: "Firefly Watch",
  fireflyTrail: "Firefly Trail",
  nightWatch: "Night Watch",
};

export type TextSize = "normal" | "large" | "xlarge";

/** "night" is the storybook default; "day" is a bright daytime look of the same world. */
export type ThemeId = "night" | "day";

export interface Settings {
  firstLaunchDone: boolean;
  skin: SkinId;
  world: WorldId;
  sound: boolean;
  reducedMotion: boolean;
  textSize: TextSize;
  highContrast: boolean;
  audioInstructions: boolean;
  gentlePace: boolean;
  /** Night Watch only: a 45-glow watch instead of 90, for children who cannot yet sit a full one */
  shortWatch: boolean;
  theme: ThemeId;
  /** last tap-speed calibration, ms between taps, and when it ran */
  calibration: { medianGapMs: number; at: string } | null;
  /** how many sessions of each game have been run; drives form rotation */
  sessionCounts: Record<GameId, number>;
}

export const DEFAULT_SETTINGS: Settings = {
  firstLaunchDone: false,
  skin: "firefly",
  world: "forest",
  sound: true,
  reducedMotion: false,
  textSize: "normal",
  highContrast: false,
  audioInstructions: false,
  gentlePace: false,
  shortWatch: false,
  theme: "night",
  calibration: null,
  sessionCounts: { fireflyWatch: 0, fireflyTrail: 0, nightWatch: 0 },
};

/* ---------------------------------------------------------------- *
 * Event logs. Times are performance.now() milliseconds relative to
 * the session start (t0) unless noted. Touch times come from the
 * pointer event's timeStamp, not from when handler code ran.
 * ---------------------------------------------------------------- */

export type WatchEventOutcome = "hit" | "falseStart" | "timeout" | "invalid";

export interface WatchEvent {
  index: number; // 0-based, practice events are -2 and -1
  practice: boolean;
  plannedWaitMs: number;
  waitStartMs: number;
  /** when the sprite's first frame was actually drawn */
  stimulusDrawnMs: number | null;
  /** pointer event timestamp of the tap, null on timeout */
  tapMs: number | null;
  reactionMs: number | null;
  outcome: WatchEventOutcome;
  /** number of false starts that happened during this event before it resolved */
  falseStartsBefore: number;
}

export interface FireflyWatchSession {
  id: string;
  game: "fireflyWatch";
  startedAt: string; // ISO
  endedAt: string;
  skin: SkinId;
  formId: string;
  seed: number;
  reducedMotion: boolean;
  completed: boolean;
  excluded: boolean;
  exclusionReason?: string;
  events: WatchEvent[];
  pauses: number;
  calibrationGapMs: number | null;
  /** gentle "still there?" nudges and check-ins the game showed (0 when absent) */
  nudges?: number;
  /** true when the game itself paused to ask whether to keep going */
  checkedIn?: boolean;
}

export interface TrailTap {
  stone: number;
  tapMs: number;
}

export interface TrailEvent {
  index: number; // -2, -1 practice; 0..3 anchors; 4.. adaptive
  kind: "practice" | "anchor" | "adaptive" | "cooldown";
  sequence: number[];
  taps: TrailTap[];
  /** when the first stone lit (first frame) and when the last stone finished */
  showStartMs: number;
  showEndMs: number;
  /** true when every stone was tapped in the right place */
  perfect: boolean;
  correctPositions: number;
  replayed?: boolean;
}

export interface FireflyTrailSession {
  id: string;
  game: "fireflyTrail";
  startedAt: string;
  endedAt: string;
  skin: SkinId;
  formId: string;
  reducedMotion: boolean;
  completed: boolean;
  events: TrailEvent[];
  pauses: number;
  nudges?: number;
  checkedIn?: boolean;
}

export type GlowKind = "single" | "double";

export interface GlowEvent {
  index: number; // -10..-1 practice, 0..89 watch
  practice: boolean;
  light: number; // 0..8
  kind: GlowKind;
  firstDrawnMs: number | null;
  secondDrawnMs: number | null;
  taps: number[]; // pointer timestamps of taps falling in this glow's window
  outcome: "hit" | "miss" | "correctPass" | "falseAlarm" | "invalid";
  reactionMs: number | null;
  extraTaps: number;
}

export interface NightWatchSession {
  id: string;
  game: "nightWatch";
  startedAt: string;
  endedAt: string;
  world: WorldId;
  formId: string;
  seed: number;
  gentlePace: boolean;
  /** 45-glow watch (first half of the form) instead of the full 90 */
  shortWatch?: boolean;
  reducedMotion: boolean;
  completed: boolean;
  events: GlowEvent[];
  pauses: number;
  practiceReplayed: boolean;
  nudges?: number;
  checkedIn?: boolean;
}

export type Session = FireflyWatchSession | FireflyTrailSession | NightWatchSession;

/* ---------------------------------------------------------------- *
 * Scoring output ("Bhim's scoring engine"). Never shown to the child.
 * ---------------------------------------------------------------- */

export interface Reliability {
  /** "experimental" until the measure has a test-retest ICC >= 0.70 */
  status: "experimental" | "established";
  note: string;
}

export interface WatchScore {
  game: "fireflyWatch";
  sessionId: string;
  at: string;
  medianRtMs: number | null;
  meanRtMs: number | null;
  lapses: number; // timeouts
  falseStarts: number;
  scoredEvents: number;
  validEvents: number;
  /** ratio of this session's median to the child's usual (median of prior sessions) */
  vsUsual: number | null;
  reliability: Reliability;
}

export interface TrailScore {
  game: "fireflyTrail";
  sessionId: string;
  at: string;
  anchorPerfect: number; // 0..4
  anchorStonesCorrect: number;
  anchorStonesTotal: number;
  span: number;
  medianTapGapMs: number | null;
  vsUsualSpan: number | null;
  reliability: Reliability;
}

export interface NightWatchScore {
  game: "nightWatch";
  sessionId: string;
  at: string;
  hits: number;
  misses: number;
  falseAlarms: number;
  doubles: number;
  hitRate: number | null;
  medianRtMs: number | null;
  rtSteadinessMs: number | null; // IQR of hit RTs
  quarters: { hits: number; misses: number; falseAlarms: number }[];
  vsUsualHitRate: number | null;
  reliability: Reliability;
}

export type Score = WatchScore | TrailScore | NightWatchScore;

export type RewardId = "lantern" | "stone" | "lanternString" | "beacon" | "windowLight";

export interface Reward {
  id: string;
  rewardId: RewardId;
  name: string;
  game: GameId;
  sessionId: string;
  earnedAt: string;
}
