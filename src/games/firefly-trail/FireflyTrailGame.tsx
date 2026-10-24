"use client";

/**
 * Firefly Trail — the working-memory game (Corsi block-tapping).
 *
 * A firefly hops from stone to stone; the child then taps the same stones in
 * the same order. The game never says whether a trail was followed exactly:
 * every tap gets the same soft acknowledgement, and the only feedback is the
 * chime after tapping Done and the fox's little hop between trails. Stone
 * positions, anchor trails and timings are identical from session to session;
 * only the skin and the seeded adaptive trails change.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { Stone, type StoneState } from "@/components/art/props";
import { Scene } from "@/components/art/scenes";
import { Skin } from "@/components/art/skins";
import { RewardIcon } from "@/components/art/rewards";
import type { FoxPose } from "@/components/art/types";
import { At, Stage } from "@/components/Stage";
import { GameReady } from "@/components/GameReady";
import {
  BeadStrip,
  Card,
  IconButton,
  LockNote,
  OutlineButton,
  Overlay,
  PrimaryButton,
  SpeechBubble,
  beadStripLayout,
  ink,
  inkSoft,
} from "@/components/ui";
import { playChime, speak, startMusic, stopMusic, stopSpeaking, unlockAudio } from "@/lib/audio";
import {
  STONE_POSITIONS,
  TRAIL_TIMING,
  makeTrailGenerator,
  pickTrailForm,
  type TrailForm,
} from "@/lib/forms/fireflyTrail";
import { uuid } from "@/lib/rng";
import { REWARD_FOR_GAME, Timers, finishSession, nextPaint, useInterruption } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import type { FireflyTrailSession, TrailEvent, TrailTap } from "@/lib/types";
import { buildTrailResponse, isLastScoredTrail } from "./response";

type Phase =
  | "ready"
  | "showing"
  | "turn"
  | "afterTrail"
  | "done"
  | "stoppedEarly";

type PauseKind = null | "user" | "interrupted" | "checkIn";

type TrailKind = TrailEvent["kind"];

interface TrailSpec {
  index: number;
  kind: TrailKind;
  sequence: number[];
  replayed: boolean;
}

/** Monotonic clock. Only ever read from pointer handlers and timers, never during render. */
function clockNow(): number {
  return performance.now();
}

const PRACTICE_TRAILS = 2;
const ANCHOR_TRAILS = 4;
const SCORED_TRAILS = ANCHOR_TRAILS + TRAIL_TIMING.adaptiveTrails; // 12
const COOLDOWN_INDEX = SCORED_TRAILS; // 12

const STONE_SIZE = 64;
const TAP_SIZE = 72;
const CREATURE_SIZE = 56;
/** the creature sits a little above the stone centre so it reads as perched */
const PERCH_LIFT = 18;
const FOX_CATCH_MS = 300;
const FOX_HOP_MS = 600;
/** practice comments get a little longer than the usual gap so they can be read */
const PRACTICE_COMMENT_MS = 1800;
/** one bead per scored trail, centred under the top bar */
const STRIP = beadStripLayout(SCORED_TRAILS, 14, 5);
const STRIP_LEFT = (390 - STRIP.width) / 2;
const DONE_BUTTON = { x: 150, y: 726, w: 200 } as const;

const READY_VOICE =
  "Watch the fireflies hop from stone to stone. Then tap the stones you remember in the same order, and tap Done when you're finished. It's okay to tap Done even if none come to mind. We'll practice twice first. Those don't count!";

export function FireflyTrailGame() {
  const router = useRouter();
  const { settings, ready: settingsReady, update, bumpSessionCount } = useSettings();
  const [phase, setPhaseState] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [pause, setPauseState] = useState<PauseKind>(null);
  const pauseRef = useRef<PauseKind>(null);
  const [scoredDone, setScoredDone] = useState(0);
  const [litStone, setLitStone] = useState<number | null>(null);
  const [tappedStone, setTappedStone] = useState<number | null>(null);
  const [creature, setCreature] = useState<{ stone: number; step: number } | null>(null);
  const [showKey, setShowKey] = useState(0);
  const [foxPose, setFoxPose] = useState<FoxPose>("idle");
  const [bubble, setBubble] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** how many stones the child has tapped so far this turn (drives the Done button) */
  const [tapsThisTurn, setTapsThisTurn] = useState(0);
  const [turnLength, setTurnLength] = useState(0);

  const timers = useRef(new Timers());
  const session = useRef<FireflyTrailSession | null>(null);
  const finishing = useRef(false);
  const t0 = useRef(0);
  const form = useRef<TrailForm | null>(null);
  const gen = useRef<((length: number) => number[]) | null>(null);
  const adaptiveLength = useRef<number>(TRAIL_TIMING.adaptiveStart);
  const trail = useRef<TrailSpec | null>(null);
  const taps = useRef<TrailTap[]>([]);
  const showStart = useRef(0);
  const showEnd = useRef(0);
  const showToken = useRef(0);
  const turnOpen = useRef(false);
  const tapCount = useRef(0);
  const afterTrailNext = useRef<(() => void) | null>(null);
  const lastEventAt = useRef(0);
  const spoke = useRef(false);
  const idleTimers = useRef<{ nudge: number | null; checkIn: number | null }>({ nudge: null, checkIn: null });

  const reduced = settings.reducedMotion;
  const inPlay = phase === "showing" || phase === "turn" || phase === "afterTrail";

  /* ----------------------------- lifecycle ----------------------------- */

  useEffect(() => {
    if (phase === "ready" || phase === "done") startMusic(settings.sound);
    else stopMusic();
    return () => stopMusic();
  }, [phase, settings.sound]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      t.clearAll();
      stopSpeaking();
    };
  }, []);

  // Read the instructions aloud when the Ready screen mounts, if the grown-up asked for that.
  useEffect(() => {
    if (phase !== "ready" || !settingsReady || spoke.current) return;
    if (settings.audioInstructions) {
      spoke.current = true;
      speak(READY_VOICE, true);
    }
  }, [phase, settingsReady, settings.audioInstructions]);

  // Timer callbacks may belong to an earlier render; keep their guards current.
  function setPhase(next: Phase) {
    phaseRef.current = next;
    setPhaseState(next);
  }

  function setPause(next: PauseKind) {
    pauseRef.current = next;
    setPauseState(next);
  }

  const now = () => clockNow() - t0.current;

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => timers.current.set(resolve, ms));
  }

  /* ------------------------------ session ------------------------------ */

  function beginSession() {
    if (phaseRef.current !== "ready") return;
    finishing.current = false;
    const n = bumpSessionCount("fireflyTrail");
    const f = pickTrailForm(n);
    form.current = f;
    gen.current = makeTrailGenerator(f.seed);
    adaptiveLength.current = TRAIL_TIMING.adaptiveStart;
    t0.current = clockNow();
    session.current = {
      id: uuid(),
      game: "fireflyTrail",
      startedAt: new Date().toISOString(),
      endedAt: "",
      skin: settings.skin,
      formId: f.id,
      reducedMotion: settings.reducedMotion,
      completed: false,
      events: [],
      pauses: 0,
    };
    setScoredDone(0);
    startTrail(specFor(-PRACTICE_TRAILS));
  }

  /* ------------------------------ idle nudges ------------------------------ */

  function clearIdle() {
    const t = idleTimers.current;
    if (t.nudge != null) timers.current.clear(t.nudge);
    if (t.checkIn != null) timers.current.clear(t.checkIn);
    idleTimers.current = { nudge: null, checkIn: null };
  }

  /** (Re)arm the "still there?" timers; called whenever the child's turn opens or they tap. */
  function armIdle() {
    clearIdle();
    idleTimers.current.nudge = timers.current.set(() => {
      if (!turnOpen.current || !session.current) return;
      if (!session.current.completed) session.current.nudges = (session.current.nudges ?? 0) + 1;
      setBubble(tapCount.current > 0 ? "All done? Tap Done!" : "Done is okay, too.");
      setFoxPose("earsPerked");
    }, TRAIL_TIMING.idleNudgeMs);
    idleTimers.current.checkIn = timers.current.set(() => {
      if (!turnOpen.current || !session.current) return;
      if (!session.current.completed) {
        session.current.nudges = (session.current.nudges ?? 0) + 1;
        session.current.checkedIn = true;
      }
      doPause("checkIn");
    }, TRAIL_TIMING.idleCheckInMs);
  }

  /** Build the spec for trail `index`. Adaptive sequences are drawn once, here. */
  function specFor(index: number): TrailSpec {
    const f = form.current!;
    if (index < 0) {
      return { index, kind: "practice", sequence: f.practice[index + PRACTICE_TRAILS], replayed: false };
    }
    if (index < ANCHOR_TRAILS) {
      return { index, kind: "anchor", sequence: f.anchors[index], replayed: false };
    }
    if (index < SCORED_TRAILS) {
      return { index, kind: "adaptive", sequence: gen.current!(adaptiveLength.current), replayed: false };
    }
    return { index, kind: "cooldown", sequence: gen.current!(TRAIL_TIMING.cooldownLength), replayed: false };
  }

  /* ------------------------------ showing ------------------------------ */

  function startTrail(spec: TrailSpec) {
    timers.current.clearAll();
    trail.current = spec;
    taps.current = [];
    tapCount.current = 0;
    turnOpen.current = false;
    afterTrailNext.current = null;
    setLitStone(null);
    setTappedStone(null);
    setCreature(null);
    setFoxPose("idle");
    setBubble(null);
    setTapsThisTurn(0);
    setTurnLength(spec.sequence.length);
    clearIdle();
    setShowKey((k) => k + 1);
    setPhase("showing");
    const token = ++showToken.current;
    void runShow(spec.sequence, token);
  }

  async function runShow(seq: number[], token: number) {
    for (let i = 0; i < seq.length; i++) {
      if (token !== showToken.current) return;
      setLitStone(seq[i]);
      setCreature({ stone: seq[i], step: i });
      if (i === 0) {
        const drawn = (await nextPaint()) - t0.current;
        if (token !== showToken.current) return;
        showStart.current = drawn;
      }
      await delay(TRAIL_TIMING.stoneOnMs);
      if (token !== showToken.current) return;
      setLitStone(null);
      if (i < seq.length - 1) {
        // The creature glides to the next stone during the dark gap, arriving just before it lights.
        setCreature({ stone: seq[i + 1], step: i + 1 });
        await delay(TRAIL_TIMING.stoneOffMs);
      }
    }
    if (token !== showToken.current) return;
    showEnd.current = now();
    setCreature(null);
    turnOpen.current = true;
    setPhase("turn");
    if (trail.current && trail.current.kind === "practice") setBubble("Tap what you remember.");
    armIdle();
  }

  /* ---------------------------- child's turn --------------------------- */

  function onStoneTap(stone: number, e: React.PointerEvent<HTMLButtonElement>) {
    if (!turnOpen.current || !trail.current || pauseRef.current || tapCount.current >= trail.current.sequence.length) return;
    const tapMs = e.timeStamp - t0.current;
    taps.current.push({ stone, tapMs });
    const n = ++tapCount.current;
    setTapsThisTurn(n);
    if (bubble && trail.current.kind !== "practice") setBubble(null);
    armIdle();

    // The same gentle acknowledgement for every tap, whatever the stone.
    setTappedStone(stone);
    timers.current.set(() => {
      if (tapCount.current === n) setTappedStone(null);
    }, TRAIL_TIMING.tappedGlowMs);
    setFoxPose("catching");
    timers.current.set(() => {
      if (tapCount.current === n && turnOpen.current) setFoxPose("idle");
    }, FOX_CATCH_MS);

    if (n >= trail.current.sequence.length) setBubble("Tap Done when you’re ready.");
  }

  /**
   * The Done button: the child says the trail is finished. Whatever they
   * tapped is scored as-is, so a child who remembers three of four stones is
   * never stuck waiting for a fourth tap they do not believe in.
   */
  function onDone() {
    if (!turnOpen.current || !trail.current || pauseRef.current) return;
    turnOpen.current = false;
    finishTrail();
  }

  function finishTrail() {
    const spec = trail.current;
    if (!spec || !session.current) return;
    clearIdle();
    if (spec.kind !== "practice") setBubble(null);
    setFoxPose("idle");
    const ev = buildTrailResponse(spec, taps.current, showStart.current, showEnd.current);
    const perfect = ev.perfect;
    // Optional play starts after saving, so it never changes the completed visit.
    if (spec.kind !== "cooldown") {
      session.current.events.push(ev);
      lastEventAt.current = clockNow();
    }

    playChime(settings.sound);
    setPhase("afterTrail");
    setFoxPose("hop");
    timers.current.set(() => setFoxPose("idle"), FOX_HOP_MS);

    let gap: number = TRAIL_TIMING.betweenTrailsMs;
    let next: () => void;

    if (spec.kind === "practice") {
      if (perfect) {
        setBubble("Nice following!");
        gap = PRACTICE_COMMENT_MS;
        next = () => startTrail(specFor(spec.index + 1));
      } else if (!spec.replayed) {
        setBubble("Let’s watch that one again.");
        gap = PRACTICE_COMMENT_MS;
        next = () => startTrail({ ...spec, replayed: true });
      } else {
        setBubble(null);
        next = () => startTrail(specFor(spec.index + 1));
      }
    } else if (spec.kind === "cooldown") {
      next = returnToCompleted;
    } else {
      if (spec.kind === "adaptive") {
        const delta = perfect ? 1 : -1;
        adaptiveLength.current = Math.min(
          TRAIL_TIMING.maxLength,
          Math.max(TRAIL_TIMING.minLength, adaptiveLength.current + delta),
        );
      }
      setScoredDone(spec.index + 1);
      if (isLastScoredTrail(spec, SCORED_TRAILS)) {
        afterTrailNext.current = null;
        void completeSession();
        return;
      } else {
        next = () => startTrail(specFor(spec.index + 1));
      }
    }

    afterTrailNext.current = next;
    timers.current.set(() => {
      afterTrailNext.current = null;
      next();
    }, gap);
  }

  /* ----------------------------- pausing ------------------------------ */

  function doPause(kind: Exclude<PauseKind, null>) {
    const currentPhase = phaseRef.current;
    if ((currentPhase !== "showing" && currentPhase !== "turn" && currentPhase !== "afterTrail") || pauseRef.current) return;
    showToken.current++;
    turnOpen.current = false;
    timers.current.clearAll();
    idleTimers.current = { nudge: null, checkIn: null };
    setLitStone(null);
    setTappedStone(null);
    setCreature(null);
    setFoxPose("idle");
    setBubble(null);
    if (session.current && !session.current.completed && kind !== "checkIn") session.current.pauses += 1;
    setPause(kind);
    if (kind === "checkIn") {
      timers.current.set(() => {
        if (pauseRef.current === "checkIn") void stopForNow();
      }, TRAIL_TIMING.checkInRestMs);
    }
  }

  useInterruption(() => doPause("interrupted"), inPlay && !pause);

  function resume() {
    const wasCheckIn = pauseRef.current === "checkIn";
    timers.current.clearAll();
    setPause(null);
    if (wasCheckIn && phaseRef.current === "turn") {
      // A gentle check-in keeps the child's response; it never reveals the trail again.
      turnOpen.current = true;
      setBubble(tapCount.current >= (trail.current?.sequence.length ?? 0) ? "Tap Done when you’re ready." : "Tap what you remember.");
      armIdle();
      return;
    }
    if (phase === "afterTrail" && afterTrailNext.current) {
      // The trail was already finished; just carry on to whatever came next.
      const next = afterTrailNext.current;
      afterTrailNext.current = null;
      next();
      return;
    }
    // The trail in flight is dropped and shown again from the start, same stones.
    if (trail.current) startTrail({ ...trail.current, replayed: true });
  }

  async function stopForNow() {
    if (session.current?.completed) {
      returnToCompleted();
      return;
    }
    if (finishing.current) return;
    finishing.current = true;
    showToken.current++;
    turnOpen.current = false;
    timers.current.clearAll();
    clearIdle();
    setPause(null);
    setPhase("stoppedEarly");
    setSaving(true);
    if (session.current) {
      session.current.endedAt = new Date().toISOString();
      session.current.completed = false;
      try {
        await finishSession(session.current, REWARD_FOR_GAME.fireflyTrail, clockNow());
      } catch {
        /* storage unavailable: still let the child leave gracefully */
      }
    }
    setSaving(false);
  }

  /* --------------------------- finishing ------------------------------ */

  async function completeSession() {
    if (!session.current || finishing.current) return;
    finishing.current = true;
    turnOpen.current = false;
    showToken.current++;
    timers.current.clearAll();
    setSaving(true);
    session.current.endedAt = new Date().toISOString();
    session.current.completed = true;
    setPhase("done");
    try {
      await finishSession(session.current, REWARD_FOR_GAME.fireflyTrail, lastEventAt.current);
    } catch {
      /* ignore */
    }
    setSaving(false);
    setPhase("done");
  }

  function returnToCompleted() {
    showToken.current++;
    turnOpen.current = false;
    timers.current.clearAll();
    clearIdle();
    setPause(null);
    setPhase("done");
  }

  function startCooldown() {
    if (saving || phaseRef.current !== "done" || !session.current?.completed) return;
    startTrail(specFor(COOLDOWN_INDEX));
  }

  function tryAgain() {
    if (saving) return;
    showToken.current++;
    timers.current.clearAll();
    clearIdle();
    stopSpeaking();
    session.current = null;
    trail.current = null;
    taps.current = [];
    tapCount.current = 0;
    turnOpen.current = false;
    afterTrailNext.current = null;
    finishing.current = false;
    spoke.current = false;
    setPause(null);
    setScoredDone(0);
    setTapsThisTurn(0);
    setTurnLength(0);
    setLitStone(null);
    setTappedStone(null);
    setCreature(null);
    setBubble(null);
    setFoxPose("idle");
    setPhase("ready");
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
    beginSession();
  };

  if (phase === "ready") {
    return (
      <Stage key="trail-ready" scrollable>
        <Scene variant="trail" twinkle reducedMotion={reduced} style={{ position: "absolute", inset: 0 }} />
        <GameReady
          gameNumber={2}
          title="Firefly Trail"
          instructions="Watch the fireflies hop. Tap the stones you remember, then Done."
          illustration={
            <div aria-hidden style={{ position: "relative", width: 120, height: 130 }}>
              <div style={{ position: "absolute", left: 12, bottom: 0 }}><Stone size={96} state="lit" /></div>
              <div style={{ position: "absolute", left: 20, top: 0 }}>
                <Skin id={settings.skin} size={80} glow className={reduced ? undefined : "glow-pulse"} />
              </div>
            </div>
          }
          companion={<Fox pose="idle" width={110} breathing reducedMotion={reduced} />}
          encouragement="Tap Done whenever you’re finished, even if no stones come to mind."
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

  if (phase === "done" || phase === "stoppedEarly") {
    const completed = phase === "done";
    return (
      <Stage key="trail-ending" scrollable>
        <Scene variant="trail" twinkle reducedMotion={reduced} style={{ position: "absolute", inset: 0 }} />
        <main style={{ position: "relative", padding: "28px 20px 36px", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <nav aria-label="Game navigation" style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
            <IconButton icon="close" label="Back to Basecamp" onClick={() => router.push("/basecamp")} />
            {soundButton}
          </nav>
          <header style={{ textAlign: "center", width: "100%" }}>
            <h1 className="t-title-lg" style={{ margin: 0, fontSize: "calc(36px * var(--text-scale))", lineHeight: 1.1 }}>
              {completed ? "Nice work showing up!" : "A little rest."}
            </h1>
            <p className="t-body" style={{ margin: "14px 0 0", lineHeight: 1.5 }}>
              {completed ? "That’s another check-in for your Basecamp." : "Resting is part of it. The stones will be here whenever you are."}
            </p>
          </header>
          {completed && (
            <Card style={{ width: "100%", textAlign: "center" }} padding="24px 18px">
              <div aria-hidden style={{ display: "flex", justifyContent: "center" }}><RewardIcon id="stone" size={64} /></div>
              <h2 className="t-title" style={{ margin: "12px 0 8px", color: ink }}>A stepping-stone</h2>
              <div className="t-note" style={{ color: inkSoft }}>New for your Basecamp</div>
            </Card>
          )}
          <div aria-hidden><Fox pose={completed ? "celebrating" : "idle"} width={130} breathing reducedMotion={reduced} /></div>
          <div style={{ display: "grid", gap: 18, width: "100%", maxWidth: 320 }}>
            {completed ? (
              <>
                <PrimaryButton width="100%" onClick={() => router.push("/night-watch")} disabled={saving}>Next: Night Watch</PrimaryButton>
                {!saving && <OutlineButton width="100%" onClick={startCooldown}>One more for fun</OutlineButton>}
                <OutlineButton width="100%" onClick={() => router.push("/basecamp")}>Take a break</OutlineButton>
              </>
            ) : (
              <PrimaryButton width="100%" onClick={() => router.push("/basecamp")}>Back to Basecamp</PrimaryButton>
            )}
            {!saving && <OutlineButton width="100%" onClick={tryAgain}>Try again</OutlineButton>}
          </div>
          {saving ? <p className="t-note" role="status">Saving on this device…</p> : <LockNote />}
        </main>
      </Stage>
    );
  }

  const creaturePos = creature ? STONE_POSITIONS[creature.stone] : null;
  const glide = !reduced && creature != null && creature.step > 0;

  return (
    <Stage key="trail-play">
      <Scene variant="trail" twinkle reducedMotion={reduced} />
      {!reduced && (
        <style>{`@keyframes ft-arc{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}`}</style>
      )}

      {/* ------------------------------- PLAY ------------------------------ */}
      {inPlay && (
        <>
          <At x={20} y={56}>
            <IconButton icon="pause" label="Pause" onClick={() => doPause("user")} />
          </At>
          <At x={STRIP_LEFT} y={64} style={{ pointerEvents: "none" }}>
            <BeadStrip
              beads={Array.from({ length: scoredDone }, () => "lit" as const)}
              total={SCORED_TRAILS}
              bead={14}
              gap={5}
              label="Trails finished"
              valueText={`${scoredDone} of ${SCORED_TRAILS} trails finished; this shows participation, not accuracy`}
            />
          </At>
          <At x={322} y={56}>{soundButton}</At>
          <At x={24} y={99} w={342} style={{ textAlign: "center" }}>
            <span className="t-note" style={{ fontSize: "calc(11px * var(--text-scale))", lineHeight: 1.2 }}>
              A light for each finished trail
            </span>
          </At>

          <At x={0} y={120} w={390} h={60} style={{ textAlign: "center", padding: "0 24px" }}>
            {phase === "turn" ? (
              <>
                <div className="t-title">{tapsThisTurn >= turnLength ? "Ready to move on?" : "Your turn!"}</div>
                <div className="t-body" style={{ marginTop: 8 }}>
                  {tapsThisTurn >= turnLength ? "Tap Done when you’re finished." : "Tap what you remember, then Done."}
                </div>
              </>
            ) : (
              <>
                <div className="t-title">Watch the fireflies…</div>
                <div className="t-body" style={{ marginTop: 8 }}>See where it lands.</div>
              </>
            )}
          </At>

          {/* The nine stones. Each is a 72 dp invisible tap target around a 64 dp stone. */}
          {STONE_POSITIONS.map((pos, i) => (
            <At key={i} x={pos.x} y={pos.y} w={TAP_SIZE} h={TAP_SIZE} center>
              <StoneButton
                index={i}
                state={tappedStone === i ? "tapped" : litStone === i ? "lit" : "rest"}
                interactive={phase === "turn" && !pause && tapsThisTurn < turnLength}
                reducedMotion={reduced}
                onTap={onStoneTap}
              />
            </At>
          ))}

          {/* One creature, gliding from stone to stone while the trail is shown. */}
          {phase === "showing" && creaturePos && creature && (
            <At
              key={showKey}
              x={creaturePos.x}
              y={creaturePos.y - PERCH_LIFT}
              w={CREATURE_SIZE}
              h={CREATURE_SIZE}
              center
              style={{
                pointerEvents: "none",
                transition: reduced
                  ? "none"
                  : `left ${TRAIL_TIMING.glideMs}ms ease-in-out, top ${TRAIL_TIMING.glideMs}ms ease-in-out`,
              }}
            >
              <div
                key={creature.step}
                style={{ animation: glide ? `ft-arc ${TRAIL_TIMING.glideMs}ms ease-in-out` : undefined }}
              >
                <Skin id={settings.skin} size={CREATURE_SIZE} glow />
              </div>
            </At>
          )}

          <At x={20} y={620}>
            <Fox pose={foxPose} width={110} breathing={phase === "turn"} reducedMotion={reduced} />
          </At>
          {bubble && (
            <At x={140} y={596} style={{ zIndex: 4 }}>
              <SpeechBubble key={bubble} width={230}>{bubble}</SpeechBubble>
            </At>
          )}

          {/* Done: lets the child end a trail with fewer taps than the stones shown. */}
          {phase === "turn" && (
            <At x={DONE_BUTTON.x} y={DONE_BUTTON.y} w={DONE_BUTTON.w} className={tapsThisTurn > 0 ? "pop-in" : undefined}>
              <PrimaryButton
                width={DONE_BUTTON.w}
                onClick={onDone}
                disabled={pause != null}
                ariaLabel="Done with this trail"
                style={{ height: 60 }}
              >
                Done
              </PrimaryButton>
            </At>
          )}
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
          body="No rush. Keep going or rest for now. If you leave it here, we’ll rest shortly."
          primary="Keep going"
          onPrimary={resume}
          secondary="Rest for now"
          onSecondary={() => void stopForNow()}
          testId="check-in"
        />
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

/**
 * One stepping stone with its invisible 72 dp tap target. The glow is a second
 * stone layered on top whose opacity fades in over `fadeInMs` (a cut when
 * reduced motion is on). Nothing on the stone ever shows a number or an order.
 */
function StoneButton({
  index,
  state,
  interactive,
  reducedMotion,
  onTap,
}: {
  index: number;
  state: StoneState;
  interactive: boolean;
  reducedMotion: boolean;
  onTap: (stone: number, e: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const active = state !== "rest";
  return (
    <button
      type="button"
      aria-label="Stone"
      onPointerDown={(e) => onTap(index, e)}
      disabled={!interactive}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: TAP_SIZE,
        height: TAP_SIZE,
        padding: 0,
        background: "transparent",
        border: "none",
        display: "grid",
        placeItems: "center",
        touchAction: "none",
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <span style={{ position: "relative", display: "block", width: STONE_SIZE, height: STONE_SIZE }}>
        <Stone size={STONE_SIZE} state="rest" style={{ position: "absolute", inset: 0 }} />
        <Stone
          size={STONE_SIZE}
          state={active ? state : "lit"}
          style={{
            position: "absolute",
            inset: 0,
            opacity: active ? 1 : 0,
            transition: reducedMotion ? "none" : `opacity ${TRAIL_TIMING.fadeInMs}ms ease-out`,
          }}
        />
      </span>
    </button>
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
