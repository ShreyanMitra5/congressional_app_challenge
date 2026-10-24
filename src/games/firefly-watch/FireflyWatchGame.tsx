"use client";

/**
 * Firefly Watch — the processing-speed game (PVT-style).
 *
 * One stimulus, unpredictable timing, tap as fast as you can. The child feels
 * like they are helping a fox catch fireflies. Seeded waits and a balanced
 * sequence of safe positions vary the next glow; each firefly stays still
 * once it appears, and Catch stays in the same place.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { Scene } from "@/components/art/scenes";
import { Skin } from "@/components/art/skins";
import { RewardIcon } from "@/components/art/rewards";
import { At, Stage } from "@/components/Stage";
import { GameReady } from "@/components/GameReady";
import {
  BeadStrip,
  BigCircleButton,
  Card,
  IconButton,
  LockNote,
  OutlineButton,
  Overlay,
  Pips,
  PrimaryButton,
  RewardCard,
  SpeechBubble,
  beadStripLayout,
  ink,
  inkSoft,
  type BeadState,
} from "@/components/ui";
import { playChime, speak, startMusic, stopMusic, stopSpeaking, unlockAudio } from "@/lib/audio";
import {
  WATCH_MAX_WAIT_MS,
  WATCH_MIN_WAIT_MS,
  WATCH_PRACTICE_WAITS_MS,
  WATCH_PROTOCOL_VERSION,
  WATCH_TIMING,
  WATCH_POSITIONS,
  pickWatchForm,
  positionsForSeed,
  waitsForSeed,
} from "@/lib/forms/fireflyWatch";
import { mulberry32, uuid } from "@/lib/rng";
import { REWARD_FOR_GAME, Timers, finishSession, nextPaint, useInterruption } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { palette } from "@/lib/theme";
import type { FireflyWatchSession, WatchEvent } from "@/lib/types";
import { resolveWatchAttempt, watchResumeIndex, type WatchAttempt } from "@/lib/watchProgress";

type Phase =
  | "ready"
  | "calibrate"
  | "waiting"
  | "glow"
  | "caught"
  | "oops"
  | "timeout"
  | "offerBonus"
  | "bonus"
  | "done"
  | "stoppedEarly"
  | "excluded";

type PauseKind = null | "user" | "interrupted" | "checkIn";

const CATCH = { x: 195, y: 734 };

/** The progress strip: one bead per scored firefly, centred under the top bar. */
const STRIP = beadStripLayout(WATCH_TIMING.scoredEvents, 9, 3, 2);
const STRIP_LEFT = (390 - STRIP.width) / 2;
const STRIP_TOP = 58;
/** fox mouth-level, where the "floated away" and nudge bubbles sit (clear of the Catch button) */
const BUBBLE = { x: 136, y: 534, w: 240 };
const READY_VOICE =
  "Look around for the glow, then tap Catch. Each firefly appears in a new spot. We’ll practice twice first. After practice, every firefly fills a light up top. A catch makes it bright. A firefly that floats away leaves a soft light. You don’t need to catch them all.";

export function FireflyWatchGame() {
  const router = useRouter();
  const { settings, ready: settingsReady, update, bumpSessionCount } = useSettings();
  const [phase, setPhaseState] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  function setPhase(next: Phase) {
    phaseRef.current = next;
    setPhaseState(next);
  }
  const [pause, setPauseState] = useState<PauseKind>(null);
  const pauseRef = useRef<PauseKind>(null);
  function setPause(next: PauseKind) {
    pauseRef.current = next;
    setPauseState(next);
  }
  const [practiceSkip, setPracticeSkip] = useState(false);
  const [eventIndex, setEventIndexState] = useState(-WATCH_TIMING.practiceEvents); // -2, -1 practice
  const idx = useRef(-WATCH_TIMING.practiceEvents);
  const setEventIndex = (n: number) => {
    idx.current = n;
    setEventIndexState(n);
  };
  const [catchPressed, setCatchPressed] = useState(false);
  const [calibTaps, setCalibTaps] = useState<number[]>([]);
  const calibRef = useRef<number[]>([]);
  const [bonusSpot, setBonusSpot] = useState<{ x: number; y: number } | null>(null);
  const [bonusLeft, setBonusLeft] = useState(0);
  const [sprite, setSprite] = useState<(typeof WATCH_POSITIONS)[number]>(WATCH_POSITIONS[0]);
  const [saving, setSaving] = useState(false);
  const finalized = useRef(false);
  const bonusCatchReady = useRef(false);
  /** one entry per scored event that has resolved: lit for a catch, dim for a float-away */
  const [beads, setBeads] = useState<BeadState[]>([]);
  /** a spark in flight from the catch spot to its bead; keyed so each catch restarts the animation */
  const [spark, setSpark] = useState<{ key: number; bead: number } | null>(null);
  /** consecutive fireflies that floated away, practice included */
  const [timeoutStreak, setTimeoutStreak] = useState(0);
  const timeoutStreakRef = useRef(0);

  const timers = useRef(new Timers());
  const session = useRef<FireflyWatchSession | null>(null);
  const t0 = useRef(0);
  const waits = useRef<number[]>([]);
  const positions = useRef<ReturnType<typeof positionsForSeed>>([]);
  const retryRand = useRef(mulberry32(1));
  const current = useRef<WatchAttempt | null>(null);
  const lastEventAt = useRef(0);
  const glowToken = useRef(0);

  const needsCalibration = useMemo(() => {
    if (!settings.calibration) return true;
    const days = (Date.now() - new Date(settings.calibration.at).getTime()) / 86400000;
    return days >= WATCH_TIMING.calibrationEveryDays;
  }, [settings.calibration]);

  const reduced = settings.reducedMotion;
  const isPractice = eventIndex < 0;
  const inPlay = phase === "waiting" || phase === "glow" || phase === "caught" || phase === "oops" || phase === "timeout";

  /* ----------------------------- lifecycle ----------------------------- */

  useEffect(() => {
    if (phase === "ready" || phase === "done") startMusic(settings.sound);
    else stopMusic();
    return () => stopMusic();
  }, [phase, settings.sound]);

  useEffect(() => () => timers.current.clearAll(), []);

  // The "read instructions aloud" switch plays the Ready-screen script automatically.
  useEffect(() => {
    if (phase === "ready" && settingsReady && settings.audioInstructions) speak(READY_VOICE, true);
    if (phase !== "ready") stopSpeaking();
  }, [phase, settingsReady, settings.audioInstructions]);

  const now = () => performance.now() - t0.current;

  function beginSession() {
    finalized.current = false;
    bonusCatchReady.current = false;
    setSaving(false);
    const n = bumpSessionCount("fireflyWatch");
    const form = pickWatchForm(n);
    waits.current = waitsForSeed(form.seed);
    positions.current = positionsForSeed(form.seed);
    retryRand.current = mulberry32(form.seed ^ 0x9e3779b9);
    t0.current = performance.now();
    session.current = {
      id: uuid(),
      game: "fireflyWatch",
      startedAt: new Date().toISOString(),
      endedAt: "",
      skin: settings.skin,
      formId: form.id,
      seed: form.seed,
      protocolVersion: WATCH_PROTOCOL_VERSION,
      reducedMotion: settings.reducedMotion,
      completed: false,
      excluded: false,
      events: [],
      pauses: 0,
      calibrationGapMs: settings.calibration?.medianGapMs ?? null,
    };
    setEventIndex(-WATCH_TIMING.practiceEvents);
    setBeads([]);
    setSpark(null);
    bumpTimeoutStreak(0);
    startEvent(-WATCH_TIMING.practiceEvents, false);
  }

  function bumpTimeoutStreak(n: number) {
    timeoutStreakRef.current = n;
    setTimeoutStreak(n);
  }

  function plannedWaitFor(index: number, retry: boolean): number {
    if (retry) return Math.round(WATCH_MIN_WAIT_MS + retryRand.current() * (WATCH_MAX_WAIT_MS - WATCH_MIN_WAIT_MS));
    if (index < 0) return WATCH_PRACTICE_WAITS_MS[index + WATCH_TIMING.practiceEvents];
    return waits.current[index];
  }

  function startEvent(index: number, retry: boolean, keepFalseStarts = 0) {
    timers.current.clearAll();
    const planned = plannedWaitFor(index, retry);
    setSpark(null);
    setPracticeSkip(false);
    // Index-based placement keeps this firefly in place across retries and pauses.
    setSprite(positions.current[index + WATCH_TIMING.practiceEvents]);
    current.current = { index, planned, waitStart: now(), drawn: null, falseStarts: keepFalseStarts, resolved: false };
    setPhase("waiting");
    const token = ++glowToken.current;
    timers.current.set(() => void showGlow(token), planned);
  }

  async function showGlow(token: number) {
    if (token !== glowToken.current || !current.current) return;
    setPhase("glow");
    const drawn = (await nextPaint()) - t0.current;
    if (token !== glowToken.current || !current.current) return;
    current.current.drawn = drawn;
    timers.current.set(() => handleTimeout(token), WATCH_TIMING.timeoutMs);
  }

  function logEvent(partial: Omit<WatchEvent, "index" | "practice" | "plannedWaitMs" | "waitStartMs" | "falseStartsBefore">) {
    if (!session.current || !current.current) return;
    session.current.events.push({
      index: idx.current,
      practice: idx.current < 0,
      plannedWaitMs: current.current.planned,
      waitStartMs: current.current.waitStart,
      falseStartsBefore: partial.outcome === "falseStart" ? 0 : current.current.falseStarts,
      ...partial,
    });
    lastEventAt.current = performance.now();
  }

  function recordOutcome(outcome: "hit" | "timeout" | "invalid", tapMs: number | null = null): boolean {
    if (!session.current || !current.current) return false;
    const event = resolveWatchAttempt(current.current, outcome, tapMs);
    if (!event) return false;
    session.current.events.push(event);
    lastEventAt.current = performance.now();
    return true;
  }

  /** Record progress immediately; the flying spark is only visual feedback. */
  function settleBead(index: number, state: BeadState) {
    if (index < 0) return;
    setBeads((prev) => {
      const next = prev.slice(0, index);
      while (next.length < index) next.push("dim");
      next.push(state);
      return next;
    });
  }

  function advance() {
    const next = (current.current?.index ?? idx.current) + 1;
    if (next >= WATCH_TIMING.scoredEvents) {
      setPhase("offerBonus");
      return;
    }
    setEventIndex(next);
    timers.current.set(() => startEvent(next, false), WATCH_TIMING.betweenEventsMs);
  }

  function handleTimeout(token: number) {
    if (token !== glowToken.current || pauseRef.current || !recordOutcome("timeout")) return;
    settleBead(idx.current, "dim");
    const streak = timeoutStreakRef.current + 1;
    bumpTimeoutStreak(streak);
    setPhase("timeout");
    if (streak >= WATCH_TIMING.checkInAfterTimeouts && idx.current < WATCH_TIMING.scoredEvents - 1) {
      // Several in a row floated away: stop the clock and ask, instead of letting the child drift.
      if (session.current) {
        session.current.nudges = (session.current.nudges ?? 0) + 1;
        session.current.checkedIn = true;
      }
      timers.current.set(() => doPause("checkIn"), reduced ? 700 : WATCH_TIMING.timeoutDriftMs + 200);
      return;
    }
    if (streak === WATCH_TIMING.nudgeAfterTimeouts && session.current) {
      session.current.nudges = (session.current.nudges ?? 0) + 1;
    }
    const hold = streak >= WATCH_TIMING.nudgeAfterTimeouts ? WATCH_TIMING.timeoutHoldMs + 500 : WATCH_TIMING.timeoutHoldMs;
    timers.current.set(advance, reduced ? 700 + hold : WATCH_TIMING.timeoutDriftMs + hold);
  }

  function onCatch(e: React.PointerEvent<HTMLButtonElement>) {
    if (pauseRef.current) return;
    const tapMs = e.timeStamp - t0.current;
    const currentPhase = phaseRef.current;
    setCatchPressed(true);
    window.setTimeout(() => setCatchPressed(false), 200);
    if (currentPhase === "glow" && current.current && !current.current.resolved) {
      glowToken.current++;
      timers.current.clearAll();
      if (current.current.drawn == null) {
        // A tap before the glow was actually presented is an early press.
        falseStart();
        return;
      }
      if (!recordOutcome("hit", tapMs)) return;
      playChime(settings.sound);
      bumpTimeoutStreak(0);
      setPhase("caught");
      if (idx.current >= 0) {
        const bead = idx.current;
        settleBead(bead, "lit");
        if (!settings.reducedMotion) {
          setSpark({ key: tapMs, bead });
          timers.current.set(() => setSpark(null), WATCH_TIMING.sparkFlyMs);
        }
      }
      const last = idx.current === WATCH_TIMING.scoredEvents - 1 && !settings.reducedMotion;
      timers.current.set(advance, last ? WATCH_TIMING.sparkFlyMs + 450 : WATCH_TIMING.catchGlowMs);
      return;
    }
    if (currentPhase === "waiting") falseStart();
  }

  function falseStart() {
    if (!current.current || current.current.resolved || !session.current || pauseRef.current) return;
    glowToken.current++;
    timers.current.clearAll();
    current.current.falseStarts += 1;
    bumpTimeoutStreak(0);
    logEvent({ stimulusDrawnMs: null, tapMs: now(), reactionMs: null, outcome: "falseStart" });
    setPhase("oops");
    if (idx.current < 0 && current.current.falseStarts >= WATCH_TIMING.maxPracticeFalseStarts) {
      recordOutcome("invalid");
      setPracticeSkip(true);
      timers.current.set(advance, WATCH_TIMING.oopsBubbleMs + 500);
      return;
    }
    const total = session.current.events.filter((event) => !event.practice && event.outcome === "falseStart").length;
    if (total >= WATCH_TIMING.maxFalseStarts) {
      void endExcluded();
      return;
    }
    const keep = current.current.falseStarts;
    const at = idx.current;
    timers.current.set(() => startEvent(at, true, keep), WATCH_TIMING.oopsBubbleMs);
  }

  /* ----------------------------- pausing ------------------------------ */

  function doPause(kind: Exclude<PauseKind, null>) {
    const p = phaseRef.current;
    const playing = p === "waiting" || p === "glow" || p === "caught" || p === "oops" || p === "timeout";
    if (!playing || pauseRef.current) return;
    glowToken.current++;
    timers.current.clearAll();
    setSpark(null);
    if (session.current && kind !== "checkIn") session.current.pauses += 1;
    setPause(kind);
    if (kind === "checkIn") {
      timers.current.set(() => void stopForNow(), WATCH_TIMING.checkInRestMs);
    }
  }

  useInterruption(() => doPause("interrupted"), inPlay && !pause);

  function resume() {
    timers.current.clearAll();
    setPause(null);
    bumpTimeoutStreak(0);
    const next = current.current ? watchResumeIndex(current.current) : idx.current;
    if (next >= WATCH_TIMING.scoredEvents) {
      setPhase("offerBonus");
      return;
    }
    const retry = current.current != null && !current.current.resolved;
    const falseStarts = retry ? current.current?.falseStarts ?? 0 : 0;
    setEventIndex(next);
    startEvent(next, retry, falseStarts);
  }

  /** Claim the one save before yielding, so rapid presses cannot award twice. */
  function claimFinalization(): FireflyWatchSession | null {
    if (!session.current || finalized.current) return null;
    finalized.current = true;
    glowToken.current++;
    timers.current.clearAll();
    bonusCatchReady.current = false;
    setPause(null);
    setSpark(null);
    setBonusSpot(null);
    setSaving(true);
    return session.current;
  }

  async function stopForNow() {
    const visit = claimFinalization();
    if (!visit) return;
    setPhase("stoppedEarly");
    visit.endedAt = new Date().toISOString();
    visit.completed = false;
    try {
      await finishSession(visit, REWARD_FOR_GAME.fireflyWatch, performance.now());
    } catch {
      /* storage unavailable: still let the child leave gracefully */
    } finally {
      setSaving(false);
    }
  }

  async function endExcluded() {
    const visit = claimFinalization();
    if (!visit) return;
    setPhase("excluded");
    visit.endedAt = new Date().toISOString();
    visit.excluded = true;
    visit.exclusionReason = "10 false starts";
    try {
      await finishSession(visit, REWARD_FOR_GAME.fireflyWatch, performance.now());
    } catch {
      /* storage unavailable: still let the child leave gracefully */
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------- finishing ------------------------------ */

  async function completeSession() {
    const visit = claimFinalization();
    if (!visit) return;
    visit.endedAt = new Date().toISOString();
    visit.completed = true;
    try {
      await finishSession(visit, REWARD_FOR_GAME.fireflyWatch, lastEventAt.current);
    } catch {
      /* storage unavailable: still let the child finish gracefully */
    } finally {
      setSaving(false);
      setPhase("done");
    }
  }

  function startBonus() {
    if (finalized.current || phaseRef.current !== "offerBonus") return;
    setPhase("bonus");
    setBonusLeft(5);
    scheduleBonusSpark();
  }

  function scheduleBonusSpark() {
    bonusCatchReady.current = false;
    setBonusSpot(null);
    timers.current.set(() => {
      if (finalized.current || phaseRef.current !== "bonus") return;
      bonusCatchReady.current = true;
      const r = Math.random;
      setBonusSpot({ x: 80 + r() * 230, y: 230 + r() * 300 });
    }, 500 + Math.random() * 900);
  }

  function bonusCatch() {
    if (finalized.current || !bonusCatchReady.current || !bonusSpot) return;
    bonusCatchReady.current = false;
    playChime(settings.sound);
    const left = bonusLeft - 1;
    setBonusLeft(left);
    if (left <= 0) {
      setBonusSpot(null);
      void completeSession();
    } else scheduleBonusSpark();
  }

  /* --------------------------- calibration ---------------------------- */

  function onCalibTap(e: React.PointerEvent<HTMLButtonElement>) {
    if (phaseRef.current !== "calibrate") return;
    const t = e.timeStamp;
    setCatchPressed(true);
    window.setTimeout(() => setCatchPressed(false), 160);
    if (calibRef.current.length >= WATCH_TIMING.calibrationTaps) return;
    const next = [...calibRef.current, t];
    calibRef.current = next;
    setCalibTaps(next);
    if (next.length >= WATCH_TIMING.calibrationTaps) {
      const gaps = next.slice(1).map((v, i) => v - next[i]);
      const s = [...gaps].sort((a, b) => a - b);
      const med = s[Math.floor(s.length / 2)];
      update({ calibration: { medianGapMs: Math.round(med), at: new Date().toISOString() } });
      timers.current.set(() => {
        if (phaseRef.current !== "calibrate") return;
        calibRef.current = [];
        setCalibTaps([]);
        beginSession();
      }, 400);
    }
  }

  /* ------------------------------ render ------------------------------ */

  if (!settingsReady) return <Stage>{null}</Stage>;

  const soundButton = (
    <IconButton
      icon={settings.sound ? "soundOn" : "soundOff"}
      label={settings.sound ? "Sound on" : "Sound off"}
      onClick={() => update({ sound: !settings.sound })}
    />
  );

  const onReadyStart = () => {
    unlockAudio();
    stopSpeaking();
    if (needsCalibration) {
      calibRef.current = [];
      setCalibTaps([]);
      setPhase("calibrate");
    } else beginSession();
  };

  if (phase === "ready") {
    return (
      <Stage scrollable>
        <Scene variant="forest" twinkle reducedMotion={reduced} style={{ position: "absolute", inset: 0 }} />
        <GameReady
          gameNumber={1}
          title="Firefly Watch"
          instructions="Look around for the glow, then tap Catch. Each firefly appears in a new spot."
          illustration={<Skin id={settings.skin} size={120} glow className={reduced ? undefined : "glow-pulse"} />}
          companion={<Fox pose="idle" width={110} breathing reducedMotion={reduced} />}
          encouragement={<>Two practice turns first. Then each firefly fills a light, even if it floats away.</>}
          soundButton={soundButton}
          onBack={() => router.push("/basecamp")}
          onStart={onReadyStart}
          onHearInstructions={() => {
            unlockAudio();
            speak(READY_VOICE, true);
          }}
        />
      </Stage>
    );
  }

  return (
    <Stage>
      <Scene variant="forest" twinkle={phase !== "calibrate"} reducedMotion={reduced} />

      {/* --------------------------- CALIBRATION --------------------------- */}
      {phase === "calibrate" && (
        <>
          <At x={20} y={56}>
            <IconButton icon="back" label="Back" onClick={() => {
              timers.current.clearAll();
              glowToken.current++;
              calibRef.current = [];
              setCalibTaps([]);
              setPhase("ready");
            }} />
          </At>
          <At x={0} y={64} w={390} style={{ display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <Pips filled={calibTaps.length} />
          </At>
          <At x={0} y={120} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title">Warm up your thumb</div>
            <div className="t-body" style={{ marginTop: 10 }}>
              Tap Catch ten times. Each tap fills one warm-up light.
            </div>
          </At>
          <At x={20} y={608}>
            <Fox pose="idle" width={110} breathing reducedMotion={reduced} />
          </At>
          <At x={CATCH.x} y={CATCH.y} w={156} h={156} center>
            <BigCircleButton label="Catch" glowing={false} pressed={catchPressed} onPointerDown={onCalibTap} />
          </At>
        </>
      )}

      {/* ------------------------------- PLAY ------------------------------ */}
      {inPlay && (
        <>
          <At x={20} y={56}>
            <IconButton icon="pause" label="Pause" onClick={() => doPause("user")} />
          </At>
          {isPractice ? (
            <At x={84} y={58} w={222} h={42} style={{ display: "grid", placeItems: "center", textAlign: "center" }}>
              <span className="t-body-cream">Practice {eventIndex + WATCH_TIMING.practiceEvents + 1} of {WATCH_TIMING.practiceEvents}</span>
            </At>
          ) : (
            <>
              <At x={STRIP_LEFT} y={STRIP_TOP} style={{ pointerEvents: "none" }}>
                <BeadStrip beads={beads} total={WATCH_TIMING.scoredEvents} bead={9} gap={3} rows={2} label="Fireflies finished" />
              </At>
              <At x={24} y={103} w={342} style={{ textAlign: "center" }}>
                <span className="t-note">Bright = caught · Soft = floated by</span>
              </At>
            </>
          )}
          <At x={322} y={56}>{soundButton}</At>

          <At x={0} y={138} w={390} style={{ textAlign: "center", padding: "0 24px" }}>
            <div className="t-title" style={phase === "glow" ? { color: palette.glow } : undefined}>
              {phase === "glow" ? "Now! Tap Catch!" : phase === "caught" ? "You caught it!" : phase === "timeout" ? "On to the next one." : practiceSkip ? "Let’s keep going." : "Wait for the glow…"}
            </div>
            <div className="t-body" style={{ marginTop: 8 }}>
              {isPractice ? "Just practice. The lights start after this." : "Every firefly moves you forward."}
            </div>
          </At>

          {/* The caught firefly flying up to its bead on the strip. */}
          {spark && (
            <At key={spark.key} x={sprite.x} y={sprite.y} w={60} h={60} center style={{ pointerEvents: "none", zIndex: 3 }}>
              <div
                className="spark-fly"
                style={
                  {
                    "--fly-dx": `${STRIP_LEFT + STRIP.beadCenterX(spark.bead) - sprite.x}px`,
                    "--fly-dy": `${STRIP_TOP + STRIP.beadCenterY(spark.bead) - sprite.y}px`,
                    "--fly-ms": `${WATCH_TIMING.sparkFlyMs}ms`,
                  } as React.CSSProperties
                }
              >
                <Skin id={settings.skin} size={60} glow />
              </div>
            </At>
          )}

          {/* The stimulus: a single frame at full brightness, no fade-in. */}
          {(phase === "glow" || phase === "timeout") && (
            <At x={sprite.x} y={sprite.y} w={120} h={120} center>
              <div data-testid="watch-firefly" data-x={sprite.x} data-y={sprite.y}>
              <Skin
                id={settings.skin}
                size={120}
                glow
                className={phase === "timeout" && !reduced ? "drift-up-fade" : undefined}
                style={phase === "timeout" && reduced ? { visibility: "hidden" } : undefined}
              />
              </div>
            </At>
          )}

          <At x={20} y={608}>
            <Fox
              pose={phase === "oops" ? "earsPerked" : phase === "caught" ? "catching" : "idle"}
              width={110}
              breathing={phase === "waiting"}
              reducedMotion={reduced}
            />
          </At>
          {phase === "caught" && (
            <At x={128} y={664} w={56} h={56} center>
              <Skin id={settings.skin} size={40} glow />
            </At>
          )}
          {phase === "oops" && (
            <At x={BUBBLE.x} y={BUBBLE.y}>
              <SpeechBubble width={BUBBLE.w} tone="navy">
                {practiceSkip ? "That’s okay. Let’s try the next one." : "Wait until it glows, then tap Catch."}
              </SpeechBubble>
            </At>
          )}
          {phase === "timeout" && !pause && (
            <At x={BUBBLE.x} y={BUBBLE.y}>
              {timeoutStreak >= WATCH_TIMING.nudgeAfterTimeouts ? (
                <SpeechBubble width={BUBBLE.w}>You’re doing fine. Try the next glow, or take a break.</SpeechBubble>
              ) : (
                <SpeechBubble width={BUBBLE.w}>It floated away. Here comes another!</SpeechBubble>
              )}
            </At>
          )}

          <At x={CATCH.x} y={CATCH.y} w={156} h={156} center>
            <BigCircleButton
              label="Catch"
              glowing={phase === "glow"}
              pressed={catchPressed}
              onPointerDown={onCatch}
            />
          </At>
        </>
      )}

      {/* ---------------------------- PAUSE OVERLAYS ---------------------------- */}
      {pause === "user" && (
        <PauseOverlay
          title="Paused. Ready when you are."
          primary="Keep going"
          onPrimary={resume}
          secondary="Stop for now"
          onSecondary={() => void stopForNow()}
        />
      )}
      {pause === "interrupted" && (
        <PauseOverlay
          title="We paused for you."
          primary="Keep going"
          onPrimary={resume}
          secondary="Stop for now"
          onSecondary={() => void stopForNow()}
        />
      )}
      {pause === "checkIn" && (
        <PauseOverlay
          title="Still there?"
          body="A few fireflies floated by. Keep going, or take a rest. If you don’t choose in 30 seconds, we’ll rest for now."
          primary="Keep catching"
          onPrimary={resume}
          secondary="Rest for now"
          onSecondary={() => void stopForNow()}
          testId="check-in"
        />
      )}

      {/* ----------------------------- BONUS OFFER ----------------------------- */}
      {phase === "offerBonus" && (
        <>
          <At x={0} y={150} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title">You made it to the end!</div>
            <div className="t-body" style={{ marginTop: 10 }}>
              Every firefly had its turn. You can finish here, or catch a few bonus fireflies for fun.
            </div>
          </At>
          <At x={195} y={370} w={120} h={120} center>
            <Skin id={settings.skin} size={120} glow />
          </At>
          <At x={20} y={500}>
            <Fox pose="hop" width={110} reducedMotion={reduced} />
          </At>
          <At x={55} y={640} w={280}>
            <PrimaryButton onClick={() => void completeSession()} disabled={saving}>Finish</PrimaryButton>
          </At>
          <At x={55} y={716} w={280}>
            <fieldset disabled={saving} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, opacity: saving ? 0.5 : 1 }}>
              <OutlineButton onClick={startBonus}>Bonus round</OutlineButton>
            </fieldset>
          </At>
        </>
      )}

      {/* -------------------------------- BONUS -------------------------------- */}
      {phase === "bonus" && (
        <>
          <At x={0} y={120} w={390} style={{ textAlign: "center", padding: "0 24px" }}>
            <div className="t-title">Bonus fireflies!</div>
            <div className="t-body" style={{ marginTop: 8 }}>Tap each one wherever it lands.</div>
          </At>
          {bonusSpot && (
            <At x={bonusSpot.x} y={bonusSpot.y} w={140} h={140} center>
              <button
                type="button"
                aria-label="Catch the bonus firefly"
                onPointerDown={bonusCatch}
                style={{ width: 140, height: 140, background: "transparent", border: "none", display: "grid", placeItems: "center" }}
              >
                <Skin id={settings.skin} size={110} glow />
              </button>
            </At>
          )}
          <At x={20} y={584}>
            <Fox pose="hop" width={110} reducedMotion={reduced} />
          </At>
          <At x={55} y={716} w={280}>
            <fieldset disabled={saving} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, opacity: saving ? 0.5 : 1 }}>
              <OutlineButton onClick={() => void completeSession()}>Finish</OutlineButton>
            </fieldset>
          </At>
        </>
      )}

      {/* ------------------------------ ALL DONE ------------------------------ */}
      {phase === "done" && (
        <>
          <At x={20} y={56}>
            <IconButton icon="close" label="Close" onClick={() => router.push("/basecamp")} />
          </At>
          <At x={322} y={56}>{soundButton}</At>
          {[
            { x: 300, y: 210, s: 26 },
            { x: 70, y: 260, s: 20 },
            { x: 330, y: 330, s: 18 },
            { x: 48, y: 400, s: 16 },
          ].map((f, i) => (
            <At key={i} x={f.x} y={f.y} w={f.s} h={f.s} center>
              <Skin id={settings.skin} size={f.s} glow className={reduced ? undefined : "glow-pulse"} style={{ animationDelay: `${i * 0.5}s` }} />
            </At>
          ))}
          <At x={0} y={130} w={390} className="pop-in" style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title-lg">Nice work showing up!</div>
            <div className="t-body" style={{ marginTop: 10 }}>That&apos;s another check-in for your Basecamp.</div>
          </At>
          <At x={25} y={300} className="pop-in-2">
            <RewardCard icon={<RewardIcon id="lantern" size={64} />} label="New for your Basecamp" name="A little lantern" />
          </At>
          <At x={0} y={436} w={390}>
            <LockNote />
          </At>
          <At x={20} y={536}>
            <Fox pose="celebrating" width={130} breathing reducedMotion={reduced} />
          </At>
          <At x={55} y={708} w={280} className="pop-in-3">
            <PrimaryButton onClick={() => router.push("/firefly-trail")}>Next: Firefly Trail</PrimaryButton>
          </At>
          <At x={55} y={778} w={280}>
            <OutlineButton onClick={() => router.push("/basecamp")}>Take a break</OutlineButton>
          </At>
        </>
      )}

      {/* --------------------------- STOPPED / EXCLUDED --------------------------- */}
      {(phase === "stoppedEarly" || phase === "excluded") && (
        <>
          <At x={0} y={200} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title-lg">That&apos;s okay.</div>
            <div className="t-body" style={{ marginTop: 10 }}>
              {phase === "excluded"
                ? "Lots of quick thumbs tonight! The fireflies will be back whenever you are."
                : "Resting is part of it. The fireflies will be back whenever you are."}
            </div>
          </At>
          <At x={20} y={536}>
            <Fox pose="idle" width={130} breathing reducedMotion={reduced} />
          </At>
          <At x={55} y={708} w={280}>
            <PrimaryButton onClick={() => router.push("/basecamp")}>Back to Basecamp</PrimaryButton>
          </At>
        </>
      )}

      {saving && (
        <At x={0} y={788} w={390} style={{ display: "flex", justifyContent: "center" }}>
          <Card padding="8px 16px">
            <span className="t-note" style={{ color: inkSoft }}>Saving on this device…</span>
          </Card>
        </At>
      )}
    </Stage>
  );
}

function PauseOverlay({
  title,
  body,
  primary,
  onPrimary,
  secondary,
  onSecondary,
  testId,
}: {
  title: string;
  body?: string;
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
  testId?: string;
}) {
  return (
    <Overlay title={title}>
      {body && (
        <div className="t-body" style={{ color: ink, marginTop: -6 }} data-testid={testId}>
          {body}
        </div>
      )}
      <PrimaryButton onClick={onPrimary} width={270}>{primary}</PrimaryButton>
      <OutlineButton onClick={onSecondary} width={270}>{secondary}</OutlineButton>
    </Overlay>
  );
}
