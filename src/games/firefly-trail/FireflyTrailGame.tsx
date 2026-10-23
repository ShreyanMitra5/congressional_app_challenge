"use client";

/**
 * Firefly Trail — the working-memory game (Corsi block-tapping).
 *
 * A firefly hops from stone to stone; the child then taps the same stones in
 * the same order. The game never says whether a trail was followed exactly:
 * every tap gets the same soft acknowledgement, and the only feedback is the
 * chime after the last tap and the fox's little hop between trails. Stone
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
import {
  BeadStrip,
  Card,
  Chip,
  IconButton,
  LockNote,
  OutlineButton,
  Overlay,
  PrimaryButton,
  RewardCard,
  SpeechBubble,
  TextButton,
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

type Phase =
  | "ready"
  | "showing"
  | "turn"
  | "afterTrail"
  | "offerCooldown"
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
/** no tap for this long during the child's turn: the fox reminds them what to do */
const IDLE_NUDGE_MS = 8000;
/** still nothing after this: the game pauses and asks whether to keep going */
const IDLE_CHECK_IN_MS = 22000;
/** one bead per scored trail, centred under the top bar */
const STRIP = beadStripLayout(SCORED_TRAILS, 14, 5);
const STRIP_LEFT = (390 - STRIP.width) / 2;
const DONE_BUTTON = { x: 150, y: 726, w: 200 } as const;

const READY_VOICE =
  "Watch the fireflies hop from stone to stone. Then tap the same stones in the same order, and tap Done when you're finished. We'll practice twice first. Those don't count!";

export function FireflyTrailGame() {
  const router = useRouter();
  const { settings, ready: settingsReady, update, bumpSessionCount } = useSettings();
  const [phase, setPhase] = useState<Phase>("ready");
  const [pause, setPause] = useState<PauseKind>(null);
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

  const timers = useRef(new Timers());
  const session = useRef<FireflyTrailSession | null>(null);
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

  const now = () => clockNow() - t0.current;

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => timers.current.set(resolve, ms));
  }

  /* ------------------------------ session ------------------------------ */

  function beginSession() {
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
      session.current.nudges = (session.current.nudges ?? 0) + 1;
      setBubble(tapCount.current > 0 ? "All done? Tap Done!" : "Tap the stones you saw, then Done.");
      setFoxPose("earsPerked");
    }, IDLE_NUDGE_MS);
    idleTimers.current.checkIn = timers.current.set(() => {
      if (!turnOpen.current || !session.current) return;
      session.current.nudges = (session.current.nudges ?? 0) + 1;
      session.current.checkedIn = true;
      doPause("checkIn");
    }, IDLE_CHECK_IN_MS);
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
    if (trail.current && trail.current.kind === "practice") setBubble("Your turn! Tap the stones, then Done.");
    armIdle();
  }

  /* ---------------------------- child's turn --------------------------- */

  function onStoneTap(stone: number, e: React.PointerEvent<HTMLButtonElement>) {
    if (!turnOpen.current || !trail.current || pause) return;
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

    if (n >= trail.current.sequence.length) {
      turnOpen.current = false;
      finishTrail();
    }
  }

  /**
   * The Done button: the child says the trail is finished. Whatever they
   * tapped is scored as-is, so a child who remembers three of four stones is
   * never stuck waiting for a fourth tap they do not believe in.
   */
  function onDone() {
    if (!turnOpen.current || !trail.current || pause) return;
    if (tapCount.current === 0) return;
    turnOpen.current = false;
    finishTrail();
  }

  function finishTrail() {
    const spec = trail.current;
    if (!spec || !session.current) return;
    clearIdle();
    if (spec.kind !== "practice") setBubble(null);
    setFoxPose("idle");
    const seq = spec.sequence;
    const t = taps.current;
    let correctPositions = 0;
    for (let i = 0; i < seq.length; i++) if (t[i]?.stone === seq[i]) correctPositions++;
    const perfect = t.length === seq.length && correctPositions === seq.length;

    const ev: TrailEvent = {
      index: spec.index,
      kind: spec.kind,
      sequence: [...seq],
      taps: [...t],
      showStartMs: showStart.current,
      showEndMs: showEnd.current,
      perfect,
      correctPositions,
    };
    if (spec.replayed) ev.replayed = true;
    session.current.events.push(ev);
    lastEventAt.current = clockNow();

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
      next = () => void completeSession();
    } else {
      if (spec.kind === "adaptive") {
        const delta = perfect ? 1 : -1;
        adaptiveLength.current = Math.min(
          TRAIL_TIMING.maxLength,
          Math.max(TRAIL_TIMING.minLength, adaptiveLength.current + delta),
        );
      }
      setScoredDone(spec.index + 1);
      if (spec.index + 1 >= SCORED_TRAILS) {
        next = () => {
          afterTrailNext.current = null;
          setPhase("offerCooldown");
        };
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
    if (!inPlay || pause) return;
    showToken.current++;
    turnOpen.current = false;
    timers.current.clearAll();
    idleTimers.current = { nudge: null, checkIn: null };
    setLitStone(null);
    setTappedStone(null);
    setCreature(null);
    setFoxPose("idle");
    setBubble(null);
    if (session.current && kind !== "checkIn") session.current.pauses += 1;
    setPause(kind);
  }

  useInterruption(() => doPause("interrupted"), inPlay && !pause);

  function resume() {
    setPause(null);
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
    timers.current.clearAll();
    setPause(null);
    if (session.current) {
      session.current.endedAt = new Date().toISOString();
      session.current.completed = false;
      try {
        await finishSession(session.current, REWARD_FOR_GAME.fireflyTrail, clockNow());
      } catch {
        /* storage unavailable: still let the child leave gracefully */
      }
    }
    setPhase("stoppedEarly");
  }

  /* --------------------------- finishing ------------------------------ */

  async function completeSession() {
    if (!session.current) return;
    timers.current.clearAll();
    setSaving(true);
    session.current.endedAt = new Date().toISOString();
    session.current.completed = true;
    try {
      await finishSession(session.current, REWARD_FOR_GAME.fireflyTrail, lastEventAt.current);
    } catch {
      /* ignore */
    }
    setSaving(false);
    setPhase("done");
  }

  function startCooldown() {
    startTrail(specFor(COOLDOWN_INDEX));
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

  const creaturePos = creature ? STONE_POSITIONS[creature.stone] : null;
  const glide = !reduced && creature != null && creature.step > 0;

  return (
    <Stage>
      <Scene variant="trail" twinkle reducedMotion={reduced} />
      {!reduced && (
        <style>{`@keyframes ft-arc{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}`}</style>
      )}

      {/* ------------------------------ READY ------------------------------ */}
      {phase === "ready" && (
        <>
          <At x={20} y={56}>
            <IconButton icon="back" label="Back to Basecamp" onClick={() => router.push("/basecamp")} />
          </At>
          <At x={322} y={56}>{soundButton}</At>
          <At x={0} y={130} w={390} className="pop-in" style={{ textAlign: "center" }}>
            <Chip>Game 2 of 3</Chip>
            <div className="t-title-lg" style={{ marginTop: 14 }}>Firefly Trail</div>
            <div className="t-body" style={{ marginTop: 10, padding: "0 36px" }}>
              Watch the fireflies hop. Then tap the stones in the same order.
            </div>
          </At>
          <At x={195} y={350} w={96} h={96} center>
            <Stone size={96} state="lit" />
          </At>
          <At x={195} y={322} w={80} h={80} center>
            <Skin id={settings.skin} size={80} glow className={reduced ? undefined : "glow-pulse"} />
          </At>
          <At x={20} y={572}>
            <Fox pose="idle" width={110} breathing reducedMotion={reduced} />
          </At>
          <At x={140} y={548} className="pop-in-2">
            <SpeechBubble width={230}>Follow my firefly! Watch first, then tap the same stones.</SpeechBubble>
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
            />
          </At>
          <At x={322} y={56}>{soundButton}</At>

          <At x={0} y={120} w={390} h={60} style={{ textAlign: "center", padding: "0 24px" }}>
            {phase === "turn" ? (
              <>
                <div className="t-title">Your turn!</div>
                <div className="t-body" style={{ marginTop: 8 }}>Tap the stones in order, then Done.</div>
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
                interactive={phase === "turn"}
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
                disabled={tapsThisTurn === 0}
                ariaLabel={tapsThisTurn === 0 ? "Done (tap a stone first)" : "Done"}
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
          body="No rush. Want to watch that trail again, or rest for now? Either is fine."
          primary="Show me again"
          onPrimary={resume}
          secondary="Rest for now"
          onSecondary={() => void stopForNow()}
          testId="check-in"
        />
      )}

      {/* ---------------------------- COOLDOWN OFFER ---------------------------- */}
      {phase === "offerCooldown" && (
        <>
          <At x={0} y={150} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title">That&apos;s all the trails!</div>
            <div className="t-body" style={{ marginTop: 10 }}>
              Want one more, just for fun?
            </div>
          </At>
          <At x={195} y={390} w={96} h={96} center>
            <Stone size={96} state="lit" />
          </At>
          <At x={195} y={362} w={80} h={80} center>
            <Skin id={settings.skin} size={80} glow />
          </At>
          <At x={20} y={500}>
            <Fox pose="hop" width={110} reducedMotion={reduced} />
          </At>
          <At x={55} y={640} w={280}>
            <PrimaryButton onClick={startCooldown}>One more for fun</PrimaryButton>
          </At>
          <At x={55} y={716} w={280}>
            <OutlineButton onClick={() => void completeSession()}>Skip</OutlineButton>
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
            <RewardCard icon={<RewardIcon id="stone" size={64} />} label="New for your Basecamp" name="A stepping-stone" />
          </At>
          <At x={0} y={436} w={390}>
            <LockNote />
          </At>
          <At x={20} y={536}>
            <Fox pose="celebrating" width={130} breathing reducedMotion={reduced} />
          </At>
          <At x={55} y={708} w={280} className="pop-in-3">
            <PrimaryButton onClick={() => router.push("/night-watch")}>Next: Night Watch</PrimaryButton>
          </At>
          <At x={55} y={778} w={280}>
            <OutlineButton onClick={() => router.push("/basecamp")}>Take a break</OutlineButton>
          </At>
        </>
      )}

      {/* ------------------------------ STOPPED ------------------------------ */}
      {phase === "stoppedEarly" && (
        <>
          <At x={0} y={200} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
            <div className="t-title-lg">That&apos;s okay.</div>
            <div className="t-body" style={{ marginTop: 10 }}>Resting is part of it. The stones will be here whenever you are.</div>
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
