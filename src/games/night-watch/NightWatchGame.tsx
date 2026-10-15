"use client";

/**
 * Night Watch — the sustained-attention game (Mackworth-clock style).
 *
 * Nine soft lights; one at a time gives a glow. Most glow once, now and then
 * one glows twice, and the child taps the big button only for a double. The
 * glow list, the pace and every position are fixed for the whole watch; only
 * the world skin and the seeded form change between sessions.
 *
 * Nothing in the play area moves except the measured glow itself, nothing
 * sounds when a light glows, and the game never reacts differently to a hit
 * than to a false alarm. Practice hints are the single exception.
 */
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { Otter } from "@/components/art/Otter";
import { Lynx } from "@/components/art/Lynx";
import { Light } from "@/components/art/props";
import { Scene } from "@/components/art/scenes";
import { RewardIcon } from "@/components/art/rewards";
import type { CompanionPose, FoxPose } from "@/components/art/types";
import { At, Stage } from "@/components/Stage";
import {
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
  ink,
  inkSoft,
  tan,
} from "@/components/ui";
import { playChime, speak, startMusic, stopMusic, stopSpeaking, unlockAudio } from "@/lib/audio";
import { STONE_POSITIONS } from "@/lib/forms/fireflyTrail";
import {
  NIGHT_WATCH_TIMING,
  PRACTICE_GLOWS,
  expandForm,
  pickNightWatchForm,
} from "@/lib/forms/nightWatch";
import { mulberry32, uuid } from "@/lib/rng";
import { classifyNightWatchTap } from "@/lib/scoring";
import { NIGHT_WATCH_REWARD, Timers, finishSession, nextPaint, useInterruption } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { palette, worldGlow, type WorldId } from "@/lib/theme";
import type { GlowEvent, GlowKind, NightWatchSession } from "@/lib/types";

type Phase =
  | "ready"
  | "practice"
  | "getReady"
  | "watch"
  | "endPause"
  | "offerCooldown"
  | "cooldown"
  | "done"
  | "stoppedEarly";

type PauseKind = null | "user" | "interrupted";

type RunMode = "practice" | "watch" | "cooldown";

interface Glow {
  light: number;
  kind: GlowKind;
}

interface Run {
  mode: RunMode;
  list: Glow[];
  /** logged glows for practice / watch (never for cooldown) */
  events: GlowEvent[];
  /** index of the next glow to start */
  next: number;
  /** glow `anchorIndex` is due at `anchorTime` (clockNow()); glow k at anchorTime + (k - anchorIndex) * interval */
  anchorTime: number;
  anchorIndex: number;
  /** glows still to be marked invalid after a resume */
  invalidLeft: number;
  finalized: boolean;
}

/** Monotonic clock. Only ever read from pointer handlers and timers, never during render. */
function clockNow(): number {
  return performance.now();
}

const T = NIGHT_WATCH_TIMING;
const PLAY_AREA = { x: 20, y: 190, w: 350, h: 420 } as const;
const LIGHT_SIZE = 64;
const COMPANION = { x: 20, y: 620, w: 100 } as const;
const SIGNAL = { x: 195, y: 734 } as const;
const PRACTICE_COUNT = PRACTICE_GLOWS.length;

interface WorldCopy {
  title: string;
  plural: string;
  button: string;
  headline: string;
  scene: "forest" | "space" | "neon";
}

const WORLD_COPY: Record<WorldId, WorldCopy> = {
  forest: { title: "Night Watch", plural: "lanterns", button: "Signal", headline: "Watch the lanterns.", scene: "forest" },
  space: { title: "Star Watch", plural: "beacons", button: "Ping", headline: "Watch the beacons.", scene: "space" },
  neon: { title: "Skyline Watch", plural: "windows", button: "Signal", headline: "Watch the windows.", scene: "neon" },
};

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/** The outcome a single glow log entry earns. Invalid glows stay invalid. */
export function outcomeFor(ev: GlowEvent): GlowEvent["outcome"] {
  if (ev.outcome === "invalid") return "invalid";
  if (ev.kind === "double") return ev.reactionMs != null ? "hit" : "miss";
  return ev.taps.length > 0 ? "falseAlarm" : "correctPass";
}

/** Finalise every glow's outcome once all hit windows have closed. Pure. */
export function finalizeOutcomes(events: GlowEvent[]): GlowEvent[] {
  return events.map((ev) => ({ ...ev, outcome: outcomeFor(ev) }));
}

/** Fifteen relaxed glows for the optional cooldown: seeded, never scored, never logged. */
function cooldownGlows(seed: number): Glow[] {
  const rand = mulberry32((seed ^ 0x51ab7) >>> 0);
  const out: Glow[] = [];
  let prev = -1;
  for (let i = 0; i < T.cooldownGlows; i++) {
    let light = Math.floor(rand() * STONE_POSITIONS.length);
    if (light === prev) light = (light + 1 + Math.floor(rand() * (STONE_POSITIONS.length - 1))) % STONE_POSITIONS.length;
    prev = light;
    out.push({ light, kind: i >= 2 && rand() < 0.2 ? "double" : "single" });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Game                                                                */
/* ------------------------------------------------------------------ */

export function NightWatchGame() {
  const router = useRouter();
  const { settings, ready: settingsReady, update, bumpSessionCount } = useSettings();
  const world = settings.world;
  const copy = WORLD_COPY[world];
  const glow = worldGlow[world];
  const reduced = settings.reducedMotion;
  const intervalMs = settings.gentlePace ? T.gentleIntervalMs : T.glowIntervalMs;

  const [phase, setPhase] = useState<Phase>("ready");
  const [pause, setPause] = useState<PauseKind>(null);
  const [activeLight, setActiveLight] = useState<number | null>(null);
  const [lit, setLit] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nod, setNod] = useState(false);
  const [signalPressed, setSignalPressed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const timers = useRef(new Timers());
  const session = useRef<NightWatchSession | null>(null);
  const practiceLog = useRef<GlowEvent[]>([]);
  const run = useRef<Run | null>(null);
  const t0 = useRef(0);
  const seed = useRef(0);
  const watchList = useRef<Glow[]>([]);
  const runToken = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const pausedIn = useRef<Phase | null>(null);
  const afterReady = useRef<(() => void) | null>(null);
  const lastEventAt = useRef(0);
  const saved = useRef(false);
  const intervalRef = useRef(intervalMs);

  const line = `${copy.headline} Tap ${copy.button} when one glows twice.`;
  const bubble = `Most ${copy.plural} glow once. Tap ${copy.button} only when one glows twice! We'll practice first.`;
  const voice = `${copy.headline} ${bubble}`;

  const inRun = phase === "practice" || phase === "watch" || phase === "cooldown" || phase === "getReady" || phase === "endPause";
  const onWatchScreen = inRun;

  /* ----------------------------- lifecycle ----------------------------- */

  useEffect(() => {
    if (phase === "ready" || phase === "done") startMusic(settings.sound);
    else stopMusic();
    return () => stopMusic();
  }, [phase, settings.sound]);

  useEffect(() => () => timers.current.clearAll(), []);

  useEffect(() => {
    if (!settingsReady || !settings.audioInstructions) return;
    speak(voice, true);
    return () => stopSpeaking();
    // Speak once when the Ready screen appears; later settings changes must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsReady]);

  function goPhase(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function clearLights() {
    setLit(false);
    setActiveLight(null);
  }

  /* ------------------------------ session ------------------------------ */

  function beginSession() {
    const n = bumpSessionCount("nightWatch");
    const form = pickNightWatchForm(n);
    seed.current = form.seed;
    watchList.current = expandForm(form);
    intervalRef.current = settings.gentlePace ? T.gentleIntervalMs : T.glowIntervalMs;
    t0.current = clockNow();
    saved.current = false;
    practiceLog.current = [];
    session.current = {
      id: uuid(),
      game: "nightWatch",
      startedAt: new Date().toISOString(),
      endedAt: "",
      world,
      formId: form.id,
      seed: form.seed,
      gentlePace: settings.gentlePace,
      reducedMotion: settings.reducedMotion,
      completed: false,
      events: [],
      pauses: 0,
      practiceReplayed: false,
    };
    setProgress(0);
    startPractice();
  }

  /** Every glow logged so far: both practice runs (if replayed) then the watch, outcomes finalised. */
  function assembleEvents(): GlowEvent[] {
    const watch = run.current?.mode === "watch" ? run.current.events : [];
    return [...finalizeOutcomes(practiceLog.current), ...finalizeOutcomes(watch)];
  }

  /* ------------------------------ glow runs ----------------------------- */

  function startRun(mode: RunMode, list: Glow[], leadMs: number) {
    timers.current.clearAll();
    const token = ++runToken.current;
    run.current = {
      mode,
      list,
      events: [],
      next: 0,
      anchorTime: clockNow() + leadMs,
      anchorIndex: 0,
      invalidLeft: 0,
      finalized: false,
    };
    goPhase(mode);
    timers.current.set(() => void startGlow(0, token), leadMs);
  }

  function startPractice() {
    setHint(null);
    clearLights();
    startRun("practice", PRACTICE_GLOWS, 800);
  }

  function startWatch() {
    setHint(null);
    clearLights();
    setProgress(0);
    startRun("watch", watchList.current, 400);
  }

  function startCooldown() {
    clearLights();
    startRun("cooldown", cooldownGlows(seed.current), 600);
  }

  function targetFor(r: Run, k: number): number {
    return r.anchorTime + (k - r.anchorIndex) * intervalRef.current;
  }

  function delayTo(absolute: number): number {
    return Math.max(0, absolute - clockNow());
  }

  async function startGlow(k: number, token: number) {
    const r = run.current;
    if (!r || token !== runToken.current) return;
    const g = r.list[k];
    const target = targetFor(r, k);
    r.next = k + 1;

    let ev: GlowEvent | null = null;
    if (r.mode !== "cooldown") {
      ev = {
        index: r.mode === "practice" ? k - PRACTICE_COUNT : k,
        practice: r.mode === "practice",
        light: g.light,
        kind: g.kind,
        firstDrawnMs: null,
        secondDrawnMs: null,
        taps: [],
        outcome: r.invalidLeft > 0 ? "invalid" : g.kind === "double" ? "miss" : "correctPass",
        reactionMs: null,
        extraTaps: 0,
      };
      if (r.invalidLeft > 0) r.invalidLeft -= 1;
      r.events.push(ev);
      if (r.mode === "practice") practiceLog.current.push(ev);
      else setProgress(k + 1);
    }

    // First glow: fade up (100 ms), hold (100 ms), fade down (200 ms).
    flushSync(() => {
      setActiveLight(g.light);
      setLit(true);
    });
    const drawn = (await nextPaint()) - t0.current;
    if (token !== runToken.current) return;
    if (ev) ev.firstDrawnMs = drawn;
    timers.current.set(() => setLit(false), delayTo(target + T.fadeUpMs + T.holdMs));

    if (g.kind === "double") {
      const secondAt = target + T.fadeUpMs + T.holdMs + T.fadeDownMs + T.doubleGapMs;
      timers.current.set(() => {
        void (async () => {
          if (token !== runToken.current) return;
          flushSync(() => setLit(true));
          const d2 = (await nextPaint()) - t0.current;
          if (token !== runToken.current) return;
          if (ev) ev.secondDrawnMs = d2;
        })();
      }, delayTo(secondAt));
      timers.current.set(() => setLit(false), delayTo(secondAt + T.fadeUpMs + T.holdMs));
    }

    // Practice: the previous glow's hit window closes 300 ms after this one starts.
    if (r.mode === "practice" && k > 0) {
      timers.current.set(() => evaluatePractice(k - 1), delayTo(target + T.hitWindowMaxAfterNextMs));
    }

    const slotEnd = target + intervalRef.current;
    if (k + 1 < r.list.length) {
      timers.current.set(() => void startGlow(k + 1, token), delayTo(slotEnd));
    } else {
      timers.current.set(() => endRun(token), delayTo(slotEnd));
    }
  }

  function endRun(token: number) {
    const r = run.current;
    if (!r || token !== runToken.current) return;
    clearLights();
    if (r.mode === "practice") {
      // Let the last glow's window close, read the hint, then decide.
      timers.current.set(() => {
        evaluatePractice(r.list.length - 1);
        timers.current.set(decidePractice, 1000);
      }, T.hitWindowMaxAfterNextMs);
      return;
    }
    if (r.mode === "watch") {
      goPhase("endPause");
      timers.current.set(() => {
        finalizeWatch();
        void saveCompleted();
      }, T.hitWindowMaxAfterNextMs);
      timers.current.set(() => goPhase("offerCooldown"), T.endPauseMs);
      return;
    }
    // cooldown
    goPhase("done");
  }

  function decidePractice() {
    const s = session.current;
    const r = run.current;
    if (!s || !r) return;
    const anyHit = r.events.some((ev) => ev.kind === "double" && ev.reactionMs != null);
    if (!anyHit && !s.practiceReplayed) {
      s.practiceReplayed = true;
      goGetReady(startPractice);
    } else {
      goGetReady(startWatch);
    }
  }

  function evaluatePractice(k: number) {
    const r = run.current;
    if (!r || r.mode !== "practice") return;
    const ev = r.events[k];
    if (!ev) return;
    const outcome = outcomeFor(ev);
    if (outcome === "miss") setHint(`That one glowed twice. Tap ${copy.button}!`);
    else if (outcome === "falseAlarm") setHint(`That one glowed once. Let it pass.`);
    else if (outcome === "hit") setHint("Nice spot!");
    else setHint(null);
  }

  function goGetReady(then: () => void) {
    timers.current.clearAll();
    runToken.current++;
    clearLights();
    afterReady.current = then;
    goPhase("getReady");
    timers.current.set(() => {
      afterReady.current = null;
      then();
    }, T.getReadyMs);
  }

  function finalizeWatch() {
    const r = run.current;
    if (!r || r.mode !== "watch" || r.finalized) return;
    r.finalized = true;
    r.events = finalizeOutcomes(r.events);
    lastEventAt.current = clockNow();
  }

  /* -------------------------------- taps -------------------------------- */

  function onSignal(e: React.PointerEvent<HTMLButtonElement>) {
    const tapMs = e.timeStamp - t0.current;
    setSignalPressed(true);
    window.setTimeout(() => setSignalPressed(false), 200);
    // The same soft chime and the same nod after every tap, hit or not.
    playChime(settings.sound);
    if (!reduced) {
      setNod(true);
      window.setTimeout(() => setNod(false), T.nodMs);
    }

    const r = run.current;
    const p = phaseRef.current;
    if (!r || r.mode === "cooldown" || r.finalized) return;
    if (p !== "practice" && p !== "watch" && p !== "endPause") return;

    const res = classifyNightWatchTap(tapMs, r.events, intervalRef.current);
    if (!res) return;
    const ev = r.events[res.glowIndex];
    if (!ev) return;
    ev.taps.push(tapMs);
    if (res.hit) {
      if (ev.reactionMs != null) {
        ev.extraTaps += 1;
      } else {
        ev.reactionMs = tapMs - (ev.secondDrawnMs as number);
        if (r.mode === "practice") setHint("Nice spot!");
      }
    } else if (r.mode === "practice" && ev.kind === "single") {
      setHint("That one glowed once. Let it pass.");
    }
  }

  /* ------------------------------- pausing ------------------------------ */

  function doPause(kind: Exclude<PauseKind, null>) {
    if (!inRun || pause) return;
    const p = phaseRef.current;
    timers.current.clearAll();
    runToken.current++;
    clearLights();
    pausedIn.current = p;
    const r = run.current;
    if (r && (p === "practice" || p === "watch")) {
      // The glow in flight and the next three after resuming are not scored.
      const inFlight = r.events[r.events.length - 1];
      if (inFlight) inFlight.outcome = "invalid";
      r.invalidLeft = T.invalidAfterResume;
    }
    if (session.current) session.current.pauses += 1;
    setPause(kind);
  }

  useInterruption(() => doPause("interrupted"), inRun && !pause);

  function continueRun() {
    const r = run.current;
    if (!r) return;
    timers.current.clearAll();
    const token = ++runToken.current;
    goPhase(r.mode);
    if (r.next >= r.list.length) {
      endRun(token);
      return;
    }
    r.anchorTime = clockNow() + 200;
    r.anchorIndex = r.next;
    timers.current.set(() => void startGlow(r.next, token), 200);
  }

  function resume() {
    setPause(null);
    const p = pausedIn.current;
    pausedIn.current = null;
    if (p === "getReady") {
      const then = afterReady.current;
      if (then) goGetReady(then);
      else goGetReady(startWatch);
      return;
    }
    if (p === "endPause") {
      finalizeWatch();
      if (!saved.current) void saveCompleted();
      goPhase("offerCooldown");
      return;
    }
    goGetReady(continueRun);
  }

  async function stopForNow() {
    timers.current.clearAll();
    runToken.current++;
    setPause(null);
    clearLights();
    if (saved.current) {
      // The watch itself was already saved; the child was only in the cooldown.
      goPhase("done");
      return;
    }
    if (session.current) {
      session.current.endedAt = new Date().toISOString();
      session.current.completed = false;
      session.current.events = assembleEvents();
      try {
        await finishSession(session.current, NIGHT_WATCH_REWARD[world], clockNow());
      } catch {
        /* storage unavailable: still let the child leave gracefully */
      }
      saved.current = true;
    }
    goPhase("stoppedEarly");
  }

  /* ------------------------------ finishing ----------------------------- */

  async function saveCompleted() {
    if (!session.current || saved.current) return;
    saved.current = true;
    setSaving(true);
    session.current.endedAt = new Date().toISOString();
    session.current.completed = true;
    session.current.events = assembleEvents();
    try {
      await finishSession(session.current, NIGHT_WATCH_REWARD[world], lastEventAt.current || clockNow());
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  function skipCooldown() {
    timers.current.clearAll();
    runToken.current++;
    clearLights();
    goPhase("done");
  }

  /* -------------------------------- render ------------------------------ */

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
    beginSession();
  };

  const companionPose: CompanionPose = nod ? "nod" : "idle";
  const showHint = phase === "practice" && hint != null;

  return (
    <Stage>
      {/* The measured fade must survive the global reduced-motion rule, so it is scoped here with higher specificity. */}
      <style>{`
        .nw-glow { transition-property: opacity; transition-timing-function: linear; will-change: opacity; }
        html .nw-glow[data-fade="up"] { transition-duration: ${T.fadeUpMs}ms !important; }
        html .nw-glow[data-fade="down"] { transition-duration: ${T.fadeDownMs}ms !important; }
      `}</style>

      <Scene variant={copy.scene} twinkle={phase === "ready" || phase === "done"} reducedMotion={reduced} />

      {/* ------------------------------ READY ------------------------------ */}
      {phase === "ready" && (
        <>
          <At x={20} y={56}>
            <IconButton icon="back" label="Back to Basecamp" onClick={() => router.push("/basecamp")} />
          </At>
          <At x={322} y={56}>{soundButton}</At>
          <At x={0} y={130} w={390} className="pop-in" style={{ textAlign: "center" }}>
            <Chip>Game 3 of 3</Chip>
            <div className="t-title-lg" style={{ marginTop: 14 }}>{copy.title}</div>
            <div className="t-body" style={{ marginTop: 10, padding: "0 36px" }}>{line}</div>
          </At>
          <At x={40} y={300}>
            <OnceTwiceCard world={world} glow={glow} button={copy.button} />
          </At>
          <At x={140} y={482} className="pop-in-2">
            <SpeechBubble width={230}>{bubble}</SpeechBubble>
          </At>
          <At x={20} y={572}>
            <Companion world={world} pose="waving" width={110} breathing reducedMotion={reduced} />
          </At>
          <At x={55} y={708} w={280} className="pop-in-3">
            <PrimaryButton onClick={onReadyStart}>I&apos;m ready</PrimaryButton>
          </At>
          <At x={0} y={782} w={390} style={{ textAlign: "center" }}>
            <TextButton
              onClick={() => {
                unlockAudio();
                speak(voice, true);
              }}
            >
              Hear the instructions
            </TextButton>
          </At>
        </>
      )}

      {/* ------------------------------ THE WATCH ------------------------------ */}
      {onWatchScreen && (
        <>
          <At x={20} y={56}>
            <IconButton icon="pause" label="Pause" onClick={() => doPause("user")} />
          </At>
          <At x={0} y={64} w={390} style={{ display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <Pips filled={Math.min(10, Math.floor(progress / 9))} />
          </At>
          <At x={322} y={56}>{soundButton}</At>

          <At x={0} y={120} w={390} h={60} style={{ textAlign: "center", padding: "0 24px", display: "grid", placeItems: "center" }}>
            <div className="t-title" style={{ whiteSpace: "nowrap" }}>
              {phase === "getReady" ? "Get ready…" : copy.headline}
            </div>
          </At>

          {/* Play area: a flat fill, nothing inside but the nine lights. */}
          <At
            x={PLAY_AREA.x}
            y={PLAY_AREA.y}
            w={PLAY_AREA.w}
            h={PLAY_AREA.h}
            style={{ background: palette.ground, borderRadius: 28 }}
          />
          {STONE_POSITIONS.map((pos, i) => {
            const on = activeLight === i && lit;
            return (
              <At key={i} x={pos.x} y={pos.y} w={LIGHT_SIZE} h={LIGHT_SIZE} center>
                <div style={{ position: "relative", width: LIGHT_SIZE, height: LIGHT_SIZE }}>
                  <Light world={world} state="rest" size={LIGHT_SIZE} />
                  <div
                    className="nw-glow"
                    data-fade={on ? "up" : "down"}
                    style={{ position: "absolute", inset: 0, opacity: on ? 1 : 0 }}
                  >
                    <Light world={world} state="glow" intensity={1} size={LIGHT_SIZE} />
                  </div>
                </div>
              </At>
            );
          })}

          <At x={COMPANION.x} y={COMPANION.y}>
            <Companion world={world} pose={companionPose} width={COMPANION.w} reducedMotion={reduced} />
          </At>
          {showHint && (
            <At x={170} y={536} style={{ zIndex: 5 }}>
              <SpeechBubble key={hint} width={200}>{hint}</SpeechBubble>
            </At>
          )}

          {phase === "cooldown" && (
            <At x={282} y={712} w={88} style={{ textAlign: "center" }}>
              <TextButton onClick={skipCooldown}>Skip</TextButton>
            </At>
          )}

          <At x={SIGNAL.x} y={SIGNAL.y} w={156} h={156} center>
            <BigCircleButton
              label={copy.button}
              glowing
              glowColor={glow}
              pressed={signalPressed}
              onPointerDown={onSignal}
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
        <PauseOverlay title="We paused for you." primary="Keep going" onPrimary={resume} />
      )}

      {/* ---------------------------- COOLDOWN OFFER ---------------------------- */}
      {phase === "offerCooldown" && (
        <>
          <At x={0} y={150} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title">A few more for fun?</div>
            <div className="t-body" style={{ marginTop: 10 }}>These ones are just for watching.</div>
          </At>
          <At x={195} y={370} w={LIGHT_SIZE} h={LIGHT_SIZE} center>
            <Light world={world} state="glow" intensity={1} size={LIGHT_SIZE} />
          </At>
          <At x={20} y={500}>
            <Companion world={world} pose="waving" width={110} reducedMotion={reduced} />
          </At>
          <At x={55} y={640} w={280}>
            <PrimaryButton onClick={startCooldown}>Keep watching</PrimaryButton>
          </At>
          <At x={55} y={716} w={280}>
            <OutlineButton onClick={() => goPhase("done")}>Skip</OutlineButton>
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
            { x: 300, y: 210, s: 10 },
            { x: 70, y: 260, s: 8 },
            { x: 330, y: 330, s: 7 },
            { x: 48, y: 400, s: 6 },
            { x: 350, y: 450, s: 8 },
          ].map((f, i) => (
            <At key={i} x={f.x} y={f.y} w={f.s} h={f.s} center>
              <span
                aria-hidden
                className={reduced ? undefined : "glow-pulse"}
                style={{
                  display: "block",
                  width: f.s,
                  height: f.s,
                  borderRadius: 999,
                  background: palette.cream,
                  boxShadow: `0 0 ${f.s * 1.5}px ${palette.cream}99`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            </At>
          ))}
          <At x={0} y={130} w={390} className="pop-in" style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title-lg">Nice work showing up!</div>
            <div className="t-body" style={{ marginTop: 10 }}>That&apos;s another check-in for your Basecamp.</div>
          </At>
          <At x={25} y={300} className="pop-in-2">
            <RewardCard
              icon={<RewardIcon id={NIGHT_WATCH_REWARD[world].id} size={64} />}
              label="New for your Basecamp"
              name={NIGHT_WATCH_REWARD[world].name}
            />
          </At>
          <At x={0} y={436} w={390}>
            <LockNote />
          </At>
          <At x={20} y={536}>
            <Companion world={world} pose="celebrating" width={130} breathing reducedMotion={reduced} />
          </At>
          <At x={55} y={708} w={280} className="pop-in-3">
            <PrimaryButton onClick={() => router.push("/basecamp")}>Back to Basecamp</PrimaryButton>
          </At>
          <At x={55} y={778} w={280}>
            <OutlineButton onClick={() => router.push("/grown-ups")}>See my trends</OutlineButton>
          </At>
        </>
      )}

      {/* ----------------------------- STOPPED EARLY ----------------------------- */}
      {phase === "stoppedEarly" && (
        <>
          <At x={0} y={200} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title-lg">That&apos;s okay.</div>
            <div className="t-body" style={{ marginTop: 10 }}>Come back whenever.</div>
          </At>
          <At x={20} y={536}>
            <Companion world={world} pose="idle" width={130} breathing reducedMotion={reduced} />
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

/* ------------------------------------------------------------------ */
/* Companion: fox / otter astronaut / neon lynx                        */
/* ------------------------------------------------------------------ */

function Companion({
  world,
  pose,
  width,
  breathing,
  reducedMotion,
}: {
  world: WorldId;
  pose: CompanionPose;
  width: number;
  breathing?: boolean;
  reducedMotion?: boolean;
}) {
  if (world === "space") return <Otter pose={pose} width={width} breathing={breathing} reducedMotion={reducedMotion} />;
  if (world === "neon") return <Lynx pose={pose} width={width} breathing={breathing} reducedMotion={reducedMotion} />;
  const foxPose: FoxPose =
    pose === "nod" ? "catching" : pose === "waving" ? "hop" : pose === "celebrating" ? "celebrating" : "idle";
  return <Fox pose={foxPose} width={width} breathing={breathing} reducedMotion={reducedMotion} />;
}

/* ------------------------------------------------------------------ */
/* Ready-screen card: one pulse vs two pulses, pictures only           */
/* ------------------------------------------------------------------ */

function Ring({ r, color, opacity }: { r: number; color: string; opacity: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: r * 2,
        height: r * 2,
        marginLeft: -r,
        marginTop: -r,
        borderRadius: 999,
        border: `3px solid ${color}`,
        opacity,
      }}
    />
  );
}

function OnceTwiceCard({ world, glow, button }: { world: WorldId; glow: string; button: string }) {
  const cell = { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10, flex: 1 };
  const pic = { position: "relative" as const, width: 96, height: 96, display: "grid", placeItems: "center" };
  const label = {
    fontFamily: "var(--font-title)",
    fontWeight: 600,
    fontSize: "calc(18px * var(--text-scale))",
    lineHeight: 1.2,
    color: ink,
    textAlign: "center" as const,
  };
  return (
    <Card style={{ display: "flex", width: 310 }} padding="16px 12px">
      <div style={cell}>
        <div style={pic}>
          <Ring r={42} color={glow} opacity={0.55} />
          <Light world={world} state="glow" intensity={1} size={LIGHT_SIZE} />
        </div>
        <div style={label}>Once</div>
      </div>
      <div style={{ width: 3, background: tan, borderRadius: 2 }} />
      <div style={cell}>
        <div style={pic}>
          <Ring r={36} color={glow} opacity={0.7} />
          <Ring r={46} color={glow} opacity={0.5} />
          <Light world={world} state="glow" intensity={1} size={LIGHT_SIZE} />
        </div>
        <div style={label}>Twice: tap {button}</div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pause overlay (kit Overlay; the secondary button is optional here)  */
/* ------------------------------------------------------------------ */

function PauseOverlay({
  title,
  primary,
  onPrimary,
  secondary,
  onSecondary,
}: {
  title: string;
  primary: string;
  onPrimary: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <Overlay title={title}>
      <PrimaryButton onClick={onPrimary} width={270}>{primary}</PrimaryButton>
      {secondary && onSecondary && (
        <OutlineButton onClick={onSecondary} width={270}>{secondary}</OutlineButton>
      )}
    </Overlay>
  );
}
