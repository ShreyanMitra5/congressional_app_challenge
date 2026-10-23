"use client";

/**
 * Firefly Watch — the processing-speed game (PVT-style).
 *
 * One stimulus, unpredictable timing, tap as fast as you can. The child feels
 * like they are helping a fox catch fireflies. Every rule, position and line
 * of text in scored events is identical from session to session; only the
 * skin and the seeded wait list change.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { Scene } from "@/components/art/scenes";
import { Skin } from "@/components/art/skins";
import { RewardIcon } from "@/components/art/rewards";
import { At, Stage } from "@/components/Stage";
import {
  BeadStrip,
  BigCircleButton,
  Card,
  Chip,
  IconButton,
  LockNote,
  OutlineButton,
  Overlay,
  Pips,
  PrimaryButton,
  RewardCard,
  SpeechBubble,
  TextButton,
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
  WATCH_TIMING,
  pickWatchForm,
  waitsForSeed,
} from "@/lib/forms/fireflyWatch";
import { mulberry32, uuid } from "@/lib/rng";
import { REWARD_FOR_GAME, Timers, finishSession, nextPaint, useInterruption } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { palette } from "@/lib/theme";
import type { FireflyWatchSession, WatchEvent } from "@/lib/types";

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

const SPRITE = { x: 253.5, y: 363 }; // 65% across, 43% down
const CATCH = { x: 195, y: 734 };

/** The progress strip: one bead per scored firefly, centred under the top bar. */
const STRIP = beadStripLayout(WATCH_TIMING.scoredEvents, 9, 3, 2);
const STRIP_LEFT = (390 - STRIP.width) / 2;
const STRIP_TOP = 58;
/** fox mouth-level, where the "floated away" and nudge bubbles sit (clear of the Catch button) */
const BUBBLE = { x: 136, y: 534, w: 240 };
const READY_VOICE =
  "Catch each firefly the moment it glows. Keep your thumb on Catch. We'll practice twice first. Those don't count!";

export function FireflyWatchGame() {
  const router = useRouter();
  const { settings, ready: settingsReady, update, bumpSessionCount } = useSettings();
  const [phase, setPhase] = useState<Phase>("ready");
  const [pause, setPause] = useState<PauseKind>(null);
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
  const [saving, setSaving] = useState(false);
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
  const retryRand = useRef(mulberry32(1));
  const current = useRef<{
    planned: number;
    waitStart: number;
    drawn: number | null;
    falseStarts: number;
  } | null>(null);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;
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
    const n = bumpSessionCount("fireflyWatch");
    const form = pickWatchForm(n);
    waits.current = waitsForSeed(form.seed);
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
    current.current = { planned, waitStart: now(), drawn: null, falseStarts: keepFalseStarts };
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
      falseStartsBefore: current.current.falseStarts,
      ...partial,
    });
    lastEventAt.current = performance.now();
  }

  /** Light (or dim) the bead for scored event `index` the moment it resolves. */
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
    const cur = idx.current;
    const next = cur + 1;
    if (next >= WATCH_TIMING.scoredEvents) {
      setPhase("offerBonus");
      return;
    }
    setEventIndex(next);
    timers.current.set(() => startEvent(next, false), WATCH_TIMING.betweenEventsMs);
  }

  function handleTimeout(token: number) {
    if (token !== glowToken.current || !current.current) return;
    logEvent({ stimulusDrawnMs: current.current.drawn, tapMs: null, reactionMs: null, outcome: "timeout" });
    settleBead(idx.current, "dim");
    const streak = timeoutStreakRef.current + 1;
    bumpTimeoutStreak(streak);
    setPhase("timeout");
    if (streak >= WATCH_TIMING.checkInAfterTimeouts) {
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

  const onCatch = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const tapMs = e.timeStamp - t0.current;
      const p = phaseRef.current;
      setCatchPressed(true);
      window.setTimeout(() => setCatchPressed(false), 200);
      if (p === "glow" && current.current) {
        glowToken.current++;
        timers.current.clearAll();
        const drawn = current.current.drawn;
        if (drawn == null) {
          // Tap arrived before the glow frame was presented: treat as a false start.
          falseStart();
          return;
        }
        logEvent({ stimulusDrawnMs: drawn, tapMs, reactionMs: tapMs - drawn, outcome: "hit" });
        playChime(settings.sound);
        bumpTimeoutStreak(0);
        setPhase("caught");
        if (idx.current >= 0) {
          // The light for this catch: a spark flies to the strip and its bead lights on arrival.
          const bead = idx.current;
          const key = tapMs;
          if (settings.reducedMotion) {
            settleBead(bead, "lit");
          } else {
            setSpark({ key, bead });
            timers.current.set(() => {
              settleBead(bead, "lit");
              setSpark((cur) => (cur && cur.key === key ? null : cur));
            }, WATCH_TIMING.sparkFlyMs);
          }
        }
        // The last catch waits for its spark to land so the child sees the strip fill.
        const last = idx.current === WATCH_TIMING.scoredEvents - 1 && !settings.reducedMotion;
        timers.current.set(advance, last ? WATCH_TIMING.sparkFlyMs + 450 : WATCH_TIMING.catchGlowMs);
        return;
      }
      if (p === "waiting") {
        falseStart();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.sound],
  );

  function falseStart() {
    if (!current.current || !session.current) return;
    glowToken.current++;
    timers.current.clearAll();
    current.current.falseStarts += 1;
    bumpTimeoutStreak(0);
    const total = session.current.events.reduce((n, ev) => n + ev.falseStartsBefore, 0) + current.current.falseStarts;
    logEvent({ stimulusDrawnMs: null, tapMs: now(), reactionMs: null, outcome: "falseStart" });
    if (total >= WATCH_TIMING.maxFalseStarts && idx.current >= 0) {
      void endExcluded();
      return;
    }
    setPhase("oops");
    const keep = current.current.falseStarts;
    const at = idx.current;
    timers.current.set(() => startEvent(at, true, keep), WATCH_TIMING.oopsBubbleMs);
  }

  /* ----------------------------- pausing ------------------------------ */

  function doPause(kind: Exclude<PauseKind, null>) {
    const p = phaseRef.current;
    const playing = p === "waiting" || p === "glow" || p === "caught" || p === "oops" || p === "timeout";
    if (!playing || pause) return;
    glowToken.current++;
    timers.current.clearAll();
    if (session.current && kind !== "checkIn") session.current.pauses += 1;
    setPause(kind);
  }

  useInterruption(() => doPause("interrupted"), inPlay && !pause);

  function resume() {
    const wasCheckIn = pause === "checkIn";
    setPause(null);
    bumpTimeoutStreak(0);
    if (wasCheckIn) {
      // The firefly that floated away was already logged; carry on with the next one.
      const next = idx.current + 1;
      if (next >= WATCH_TIMING.scoredEvents) {
        setPhase("offerBonus");
        return;
      }
      setEventIndex(next);
      startEvent(next, false);
      return;
    }
    // The event in flight is dropped and gets a brand-new wait.
    startEvent(idx.current, true, current.current?.falseStarts ?? 0);
  }

  async function stopForNow() {
    timers.current.clearAll();
    setPause(null);
    if (session.current) {
      session.current.endedAt = new Date().toISOString();
      session.current.completed = false;
      try {
        await finishSession(session.current, REWARD_FOR_GAME.fireflyWatch, performance.now());
      } catch {
        /* storage unavailable: still let the child leave gracefully */
      }
    }
    setPhase("stoppedEarly");
  }

  async function endExcluded() {
    timers.current.clearAll();
    if (session.current) {
      session.current.endedAt = new Date().toISOString();
      session.current.excluded = true;
      session.current.exclusionReason = "10 false starts";
      try {
        await finishSession(session.current, REWARD_FOR_GAME.fireflyWatch, performance.now());
      } catch {
        /* ignore */
      }
    }
    setPhase("excluded");
  }

  /* --------------------------- finishing ------------------------------ */

  async function completeSession() {
    if (!session.current) return;
    setSaving(true);
    session.current.endedAt = new Date().toISOString();
    session.current.completed = true;
    try {
      await finishSession(session.current, REWARD_FOR_GAME.fireflyWatch, lastEventAt.current);
    } catch {
      /* ignore */
    }
    setSaving(false);
    setPhase("done");
  }

  function startBonus() {
    setPhase("bonus");
    setBonusLeft(5);
    scheduleBonusSpark();
  }

  function scheduleBonusSpark() {
    setBonusSpot(null);
    timers.current.set(() => {
      const r = Math.random;
      setBonusSpot({ x: 80 + r() * 230, y: 230 + r() * 300 });
    }, 500 + Math.random() * 900);
  }

  function bonusCatch() {
    if (!bonusSpot) return;
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

  return (
    <Stage>
      <Scene variant="forest" twinkle={phase !== "calibrate"} reducedMotion={reduced} />

      {/* ------------------------------ READY ------------------------------ */}
      {phase === "ready" && (
        <>
          <At x={20} y={56}>
            <IconButton icon="back" label="Back to Basecamp" onClick={() => router.push("/basecamp")} />
          </At>
          <At x={322} y={56}>{soundButton}</At>
          <At x={0} y={130} w={390} className="pop-in" style={{ textAlign: "center" }}>
            <Chip>Game 1 of 3</Chip>
            <div className="t-title-lg" style={{ marginTop: 14 }}>Firefly Watch</div>
            <div className="t-body" style={{ marginTop: 10, padding: "0 36px" }}>
              Catch each firefly the moment it glows.
            </div>
          </At>
          <At x={195} y={330} w={120} h={120} center>
            <Skin id={settings.skin} size={120} glow className={reduced ? undefined : "glow-pulse"} />
          </At>
          <At x={20} y={572}>
            <Fox pose="idle" width={110} breathing reducedMotion={reduced} />
          </At>
          <At x={140} y={548} className="pop-in-2">
            <SpeechBubble width={230}>Ready? We&apos;ll practice twice first. Those don&apos;t count!</SpeechBubble>
          </At>
          <At x={55} y={708} w={280} className="pop-in-3">
            <PrimaryButton onClick={onReadyStart}>I&apos;m ready</PrimaryButton>
          </At>
          <At x={0} y={782} w={390} style={{ textAlign: "center" }}>
            <TextButton
              onClick={() => {
                unlockAudio();
                speak(READY_VOICE, true);
              }}
            >
              Hear the instructions
            </TextButton>
          </At>
        </>
      )}

      {/* --------------------------- CALIBRATION --------------------------- */}
      {phase === "calibrate" && (
        <>
          <At x={20} y={56}>
            <IconButton icon="back" label="Back" onClick={() => setPhase("ready")} />
          </At>
          <At x={0} y={64} w={390} style={{ display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <Pips filled={calibTaps.length} />
          </At>
          <At x={0} y={120} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title">Warm up your thumb</div>
            <div className="t-body" style={{ marginTop: 10 }}>
              Tap Catch ten times, quick as you like.
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
          <At x={STRIP_LEFT} y={STRIP_TOP} style={{ pointerEvents: "none" }}>
            <BeadStrip beads={beads} total={WATCH_TIMING.scoredEvents} bead={9} gap={3} rows={2} label="Fireflies caught" />
          </At>
          <At x={322} y={56}>{soundButton}</At>

          <At x={0} y={120} w={390} h={60} style={{ textAlign: "center", padding: "0 24px" }}>
            {isPractice && (phase === "glow" || phase === "caught") ? (
              <>
                <div className="t-title-lg" style={{ color: palette.glow }}>Now!</div>
                <div className="t-body" style={{ marginTop: 6 }}>Catch the firefly!</div>
              </>
            ) : isPractice ? (
              <>
                <div className="t-title">Wait for the glow…</div>
                <div className="t-body" style={{ marginTop: 8 }}>Practice round. Keep your thumb on Catch.</div>
              </>
            ) : (
              <>
                <div className="t-title">Wait for the glow…</div>
                <div className="t-body" style={{ marginTop: 8 }}>Each catch lights a bead up top.</div>
              </>
            )}
          </At>

          {/* The caught firefly flying up to its bead on the strip. */}
          {spark && (
            <At key={spark.key} x={SPRITE.x} y={SPRITE.y} w={60} h={60} center style={{ pointerEvents: "none", zIndex: 3 }}>
              <div
                className="spark-fly"
                style={
                  {
                    "--fly-dx": `${STRIP_LEFT + STRIP.beadCenterX(spark.bead) - SPRITE.x}px`,
                    "--fly-dy": `${STRIP_TOP + STRIP.beadCenterY(spark.bead) - SPRITE.y}px`,
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
            <At x={SPRITE.x} y={SPRITE.y} w={120} h={120} center>
              <Skin
                id={settings.skin}
                size={120}
                glow
                className={phase === "timeout" && !reduced ? "drift-up-fade" : undefined}
                style={phase === "timeout" && reduced ? { visibility: "hidden" } : undefined}
              />
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
              <SpeechBubble width={BUBBLE.w} tone="navy">Oops, wait for the glow!</SpeechBubble>
            </At>
          )}
          {phase === "timeout" && !pause && (
            <At x={BUBBLE.x} y={BUBBLE.y}>
              {timeoutStreak >= WATCH_TIMING.nudgeAfterTimeouts ? (
                <SpeechBubble width={BUBBLE.w}>Still with me? Tap Catch the moment it glows!</SpeechBubble>
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
          primary="Start this one again"
          onPrimary={resume}
          secondary="Stop for now"
          onSecondary={() => void stopForNow()}
        />
      )}
      {pause === "checkIn" && (
        <PauseOverlay
          title="Still there?"
          body="A few fireflies floated by. Want to keep catching, or rest for now? Either is fine."
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
              The strip is full. Want a playful bonus round? It&apos;s just for fun.
            </div>
          </At>
          <At x={195} y={370} w={120} h={120} center>
            <Skin id={settings.skin} size={120} glow />
          </At>
          <At x={20} y={500}>
            <Fox pose="hop" width={110} reducedMotion={reduced} />
          </At>
          <At x={55} y={640} w={280}>
            <PrimaryButton onClick={startBonus}>Bonus round</PrimaryButton>
          </At>
          <At x={55} y={716} w={280}>
            <OutlineButton onClick={() => void completeSession()}>Skip</OutlineButton>
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
            <OutlineButton onClick={() => { timers.current.clearAll(); setBonusSpot(null); void completeSession(); }}>
              Skip
            </OutlineButton>
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
