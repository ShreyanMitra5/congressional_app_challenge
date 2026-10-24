"use client";

/**
 * For grown-ups — the only screen in the app where numbers appear.
 *
 * A press-and-hold gate keeps it away from the child. Behind it: each game's
 * trend series compared with this child's own usual, a reliability note, and
 * the list of saved sessions (with per-session delete). Everything is read
 * from the encrypted local database; nothing leaves the device.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { Stage } from "@/components/Stage";
import { amberEdge, Card, Chip, IconButton, ink, inkSoft, LockNote, OutlineButton, tan, tanEdge, TextButton } from "@/components/ui";
import { deleteSession, listScores, listSessions } from "@/lib/db";
import { trendsFor, type TrendSeries } from "@/lib/scoring/trends";
import { WATCH_FIXED_POSITION_PROTOCOL_VERSION, WATCH_LEGACY_PROTOCOL_VERSION, WATCH_PROTOCOL_VERSION } from "@/lib/forms/fireflyWatch";
import { palette } from "@/lib/theme";
import { GAME_ORDER, GAME_TITLES, type GameId, type Score, type Session } from "@/lib/types";

const HOLD_MS = 3000;

const DEFAULT_RELIABILITY_NOTE =
  "Experimental — labelled until test-retest reliability reaches ICC 0.70; not used in any composite.";

/** Chart colours chosen to read on a cream card. */
const CHART = {
  line: "#C9780E",
  marker: "#FFC145",
  markerRing: "#FFF6E0",
  tick: "#75694F",
  usual: "#5B5478",
};

/** Text buttons sit on cream cards here, so they take ink rather than the kit's cream. */
const onCreamText = { color: inkSoft, textDecorationColor: amberEdge } as const;

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function fmtValue(v: number, unit: string): string {
  const n = Math.round(v).toLocaleString();
  return unit ? `${n} ${unit}` : n;
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** One kind line comparing the latest point with this child's own usual. */
function compareToUsual(s: TrendSeries): string {
  const latest = s.points[s.points.length - 1];
  if (!latest) return "";
  if (s.points.length < 2 || s.usual == null || s.typicalChange == null) {
    return "Their first check-in sets their usual.";
  }
  const diff = latest.value - s.usual;
  if (Math.abs(diff) <= s.typicalChange) return "Within their usual range";
  const higher = diff > 0;
  if (s.key === "steadiness") return higher ? "Less steady than usual" : "Steadier than usual";
  if (s.unit === "ms") return higher ? "Slower than usual" : "Quicker than usual";
  return higher ? "More than usual" : "Fewer than usual";
}

/* ------------------------------------------------------------------ */
/* Gate: press and hold for 3 seconds                                  */
/* ------------------------------------------------------------------ */

function HoldButton({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const doneRef = useRef(false);

  const stop = useCallback(() => {
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);
    if (!doneRef.current) setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (startRef.current != null || doneRef.current) return;
    const t0 = performance.now();
    startRef.current = t0;
    const frame = () => {
      // a release since this press began cancels the loop
      if (startRef.current !== t0) return;
      const p = Math.min(1, (performance.now() - t0) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [onDone]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const holding = progress > 0;

  return (
    <button
      type="button"
      aria-label="Hold for 3 seconds to open"
      className="t-button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          stop();
        }
      }}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "relative",
        width: 280,
        maxWidth: "100%",
        minHeight: 64,
        padding: "14px 20px",
        lineHeight: 1.2,
        borderRadius: 999,
        overflow: "hidden",
        background: palette.cream,
        border: `3px solid ${tan}`,
        color: ink,
        // the whole pill sinks onto its edge while held
        boxShadow: holding ? `0 2px 0 ${tanEdge}` : `0 6px 0 ${tanEdge}`,
        transform: holding ? "translateY(4px)" : "translateY(0)",
        transition: "transform 80ms ease, box-shadow 80ms ease",
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* visible fill progress, glow from the left */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress * 100}%`,
          background: palette.glow,
          borderRadius: progress >= 1 ? 999 : "999px 0 0 999px",
        }}
      />
      <span style={{ position: "relative", display: "grid", placeItems: "center", height: "100%" }}>Hold to open</span>
    </button>
  );
}

function Gate({ onOpen, onBack }: { onOpen: () => void; onBack: () => void }) {
  return (
    <div style={{ padding: "24px 20px 32px" }}>
      <header>
        <IconButton icon="back" label="Back to Basecamp" onClick={onBack} />
      </header>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          textAlign: "center",
          padding: "36px 0 32px",
          maxWidth: 350,
          margin: "0 auto",
        }}
      >
        <div aria-hidden>
          <Fox pose="idle" width={120} />
        </div>
        <h1 className="t-title" style={{ margin: 0, textWrap: "balance" }}>For <span style={{ whiteSpace: "nowrap" }}>grown-ups</span></h1>
        <div className="t-body">Hold the button for 3 seconds to see your child&apos;s trends.</div>
        <div style={{ marginTop: 8, width: "100%" }}>
          <HoldButton onDone={onOpen} />
        </div>
        <div className="t-note" style={{ marginTop: 8 }}>
          This page shows numbers. The child never sees them.
        </div>
      </div>
      <div style={{ textAlign: "center", maxWidth: 350, margin: "0 auto" }}>
        <LockNote text="Saved only on this device. Nothing is sent anywhere." />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small trend chart                                                   */
/* ------------------------------------------------------------------ */

const CHART_W = 306;
const CHART_H = 90;
const PAD = { left: 38, right: 12, top: 8, bottom: 8 };

function TrendChart({ series }: { series: TrendSeries }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { points, usual, typicalChange, unit, label } = series;

  const geom = useMemo(() => {
    const vals = points.map((p) => p.value);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (usual != null) {
      const band = typicalChange ?? 0;
      lo = Math.min(lo, usual - band);
      hi = Math.max(hi, usual + band);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    if (hi - lo < 1) {
      lo -= 1;
      hi += 1;
    }
    const span = hi - lo;
    lo -= span * 0.1;
    hi += span * 0.1;
    if (lo < 0 && Math.min(...vals) >= 0) lo = 0;
    const x0 = PAD.left;
    const x1 = CHART_W - PAD.right;
    const y0 = PAD.top;
    const y1 = CHART_H - PAD.bottom;
    const xOf = (i: number) => (points.length < 2 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (points.length - 1));
    const yOf = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
    const mid = (lo + hi) / 2;
    const ticks = [lo, mid, hi].map((t) => ({ v: t, y: yOf(t) }));
    return { lo, hi, x0, x1, y0, y1, xOf, yOf, ticks };
  }, [points, usual, typicalChange]);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${geom.xOf(i).toFixed(1)},${geom.yOf(p.value).toFixed(1)}`).join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const summary = [
    `${label}: ${points.length} check-in${points.length === 1 ? "" : "s"}`,
    first && last ? `from ${fmtDay(first.at)} to ${fmtDay(last.at)}` : "",
    last ? `latest ${fmtValue(last.value, unit)}` : "",
    usual != null ? `usual ${fmtValue(usual, unit)}` : "",
    typicalChange != null ? `typical change ${fmtValue(typicalChange, unit)}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const pick = (clientX: number) => {
    const el = svgRef.current;
    if (!el || points.length === 0) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * CHART_W;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(geom.xOf(i) - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best);
  };

  const h = hover != null ? points[hover] : null;
  const bandTop = usual != null && typicalChange != null ? geom.yOf(usual + typicalChange) : null;
  const bandBottom = usual != null && typicalChange != null ? geom.yOf(usual - typicalChange) : null;

  return (
    <div>
      <svg
        ref={svgRef}
        role="img"
        aria-label={summary}
        width={CHART_W}
        height={CHART_H}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        style={{ display: "block", width: "100%", height: "auto", touchAction: "pan-y", overflow: "visible" }}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <title>{summary}</title>
        {/* faint ticks */}
        {geom.ticks.map((t, i) => (
          <g key={i}>
            <line x1={geom.x0} x2={geom.x1} y1={t.y} y2={t.y} stroke={CHART.tick} strokeWidth={1} />
            <text
              x={geom.x0 - 6}
              y={t.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill={CHART.tick}
              fontSize={10}
              fontFamily="var(--font-body)"
              fontWeight={700}
            >
              {Math.round(t.v).toLocaleString()}
            </text>
          </g>
        ))}
        {/* usual band and line */}
        {bandTop != null && bandBottom != null && bandBottom - bandTop > 0.5 && (
          <rect x={geom.x0} y={bandTop} width={geom.x1 - geom.x0} height={bandBottom - bandTop} fill={CHART.usual} fillOpacity={0.1} />
        )}
        {usual != null && (
          <line
            x1={geom.x0}
            x2={geom.x1}
            y1={geom.yOf(usual)}
            y2={geom.yOf(usual)}
            stroke={CHART.usual}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        )}
        {/* series */}
        {points.length > 1 && <path d={path} fill="none" stroke={CHART.line} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => {
          const cx = geom.xOf(i);
          const cy = geom.yOf(p.value);
          const active = hover === i;
          return (
            <circle
              key={p.at + i}
              cx={cx}
              cy={cy}
              r={active ? 6 : 5}
              fill={CHART.marker}
              stroke={CHART.markerRing}
              strokeWidth={2}
            />
          );
        })}
        {h && hover != null && (
          <line
            x1={geom.xOf(hover)}
            x2={geom.xOf(hover)}
            y1={geom.y0}
            y2={geom.y1}
            stroke={CHART.usual}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        )}
      </svg>
      <div
        className="t-note"
        style={{ display: "flex", justifyContent: "space-between", paddingLeft: PAD.left, paddingRight: PAD.right, marginTop: 4, color: inkSoft }}
        aria-live="polite"
      >
        {h ? (
          <>
            <span>{fmtDay(h.at)}</span>
            <span style={{ color: ink }}>{fmtValue(h.value, unit)}</span>
          </>
        ) : (
          <>
            <span>{first ? fmtDay(first.at) : ""}</span>
            <span>{last && points.length > 1 ? fmtDay(last.at) : ""}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

const CARD_PAD = "14px 16px";

function SeriesCard({ series }: { series: TrendSeries }) {
  const last = series.points[series.points.length - 1];
  return (
    <section aria-label={series.label}>
      <Card padding={CARD_PAD}>
        <div className="t-body-cream" style={{ color: ink }}>{series.label}</div>
        {last ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span className="t-title" style={{ fontSize: "calc(34px * var(--text-scale))", color: ink, textShadow: "none" }}>
                {Math.round(last.value).toLocaleString()}
              </span>
              {series.unit && <span className="t-note" style={{ color: inkSoft }}>{series.unit}</span>}
              <span className="t-note" style={{ marginLeft: "auto", color: inkSoft }}>
                {series.usual != null && series.points.length > 1 ? `usual ${fmtValue(series.usual, series.unit)}` : ""}
              </span>
            </div>
            <div className="t-body" style={{ marginTop: 2, color: inkSoft }}>{compareToUsual(series)}</div>
            <div style={{ marginTop: 10 }}>
              <TrendChart series={series} />
            </div>
          </>
        ) : (
          <div className="t-note" style={{ marginTop: 6, color: inkSoft }}>
            Nothing to show for this measure yet.
          </div>
        )}
      </Card>
    </section>
  );
}

function ReliabilityCard({ note }: { note: string }) {
  return (
    <section aria-label="Reliability">
      <Card tone="navy" padding={CARD_PAD}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span className="t-body-cream">Reliability</span>
          <Chip tone="pink" tilt={-3}>Experimental</Chip>
        </div>
        <div className="t-note">{note}</div>
      </Card>
    </section>
  );
}

/** A small, untilted sticker for a session's status. */
const smallChip = { padding: "5px 11px", fontSize: "calc(13px * var(--text-scale))", borderRadius: 10 } as const;

function SessionRow({
  session,
  onDelete,
}: {
  session: Session;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const excluded = "excluded" in session && session.excluded;
  return (
    <li style={{ listStyle: "none" }}>
      <Card padding="12px 14px">
        <div className="t-body-cream" style={{ color: ink }}>{fmtDateTime(session.endedAt || session.startedAt)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <Chip tone="cream" tilt={0} style={smallChip}>Form {session.formId}</Chip>
          {session.game === "fireflyWatch" && (
            <Chip tone="cream" tilt={0} style={smallChip}>
              {session.protocolVersion === WATCH_PROTOCOL_VERSION ? "Varied positions" : session.protocolVersion === WATCH_FIXED_POSITION_PROTOCOL_VERSION ? "Fixed position · quicker pace" : "Earlier pace"}
            </Chip>
          )}
          {session.completed ? (
            <Chip tone="mint" tilt={0} style={smallChip}>Completed</Chip>
          ) : (
            <Chip tone="cream" tilt={0} style={smallChip}>Stopped early</Chip>
          )}
          {excluded && <Chip tone="pink" tilt={0} style={smallChip}>Not counted in trends</Chip>}
          {session.game === "nightWatch" && session.shortWatch && (
            <Chip tone="cream" tilt={0} style={smallChip}>Short watch</Chip>
          )}
          {session.game === "nightWatch" && session.gentlePace && (
            <Chip tone="cream" tilt={0} style={smallChip}>Gentle pace</Chip>
          )}
          {(session.nudges ?? 0) > 0 && (
            <Chip tone="cream" tilt={0} style={smallChip}>
              {session.checkedIn ? "Paused to check in" : "Needed a nudge"}
            </Chip>
          )}
        </div>
        {excluded && "exclusionReason" in session && session.exclusionReason && (
          <div className="t-note" style={{ marginTop: 8, color: inkSoft }}>{session.exclusionReason}</div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 6 }}>
          {confirming ? (
            <>
              <TextButton style={onCreamText} onClick={() => setConfirming(false)}>
                Keep it
              </TextButton>
              <TextButton
                ariaLabel="Really delete this session"
                style={{ ...onCreamText, color: ink, opacity: busy ? 0.6 : 1 }}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  try {
                    await onDelete(session.id);
                  } finally {
                    setBusy(false);
                    setConfirming(false);
                  }
                }}
              >
                Really delete?
              </TextButton>
            </>
          ) : (
            <TextButton style={onCreamText} onClick={() => setConfirming(true)}>
              Delete this session
            </TextButton>
          )}
        </div>
      </Card>
    </li>
  );
}

/** A cream card with one line of ink and one of soft ink; the empty states. */
function NoteCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <Card padding={CARD_PAD}>
      <div className="t-body-cream" style={{ color: ink }}>{title}</div>
      <div className="t-note" style={{ marginTop: 6, color: inkSoft }}>{body}</div>
      {children}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Trends panel                                                        */
/* ------------------------------------------------------------------ */

type LoadState = "loading" | "ready" | "unavailable";

function GameTab({
  game,
  scores,
  sessions,
  onDelete,
}: {
  game: GameId;
  scores: Score[];
  sessions: Session[];
  onDelete: (id: string) => Promise<void>;
}) {
  const title = GAME_TITLES[game];
  const gameScores = useMemo(() => scores.filter((s) => s.game === game), [scores, game]);
  const gameSessions = useMemo(
    () => sessions.filter((s) => s.game === game).slice().sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1)),
    [sessions, game],
  );
  const series = useMemo(() => trendsFor(game, gameScores), [game, gameScores]);
  const latestScore = gameScores[gameScores.length - 1];
  const note = latestScore?.reliability?.note || DEFAULT_RELIABILITY_NOTE;

  const hasAnything = gameScores.length > 0 || gameSessions.length > 0;
  const hasDifferentWatchPaces = game === "fireflyWatch" && new Set(
    gameScores.filter((s) => s.game === "fireflyWatch").map((s) => s.protocolVersion ?? WATCH_LEGACY_PROTOCOL_VERSION),
  ).size > 1;

  return (
    <div role="tabpanel" tabIndex={0} id={`panel-${game}`} aria-labelledby={`tab-${game}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!hasAnything ? (
        <section>
          <NoteCard
            title={`No check-ins yet for ${title}.`}
            body="Trends appear here after the first check-in. Nothing is needed from you yet."
          />
        </section>
      ) : (
        <>
          {gameScores.length === 0 && (
            <section>
              <NoteCard title={`No scored check-ins yet for ${title}.`} body="Saved sessions are listed below." />
            </section>
          )}
          {hasDifferentWatchPaces && (
            <NoteCard
              title="Updated firefly play"
              body="Charts compare sessions with the same pace and position rules as the latest visit. Earlier sessions are still listed below, with their reaction times kept separate."
            />
          )}
          {gameScores.length > 0 && series.map((s) => <SeriesCard key={s.key} series={s} />)}
        </>
      )}

      <ReliabilityCard note={note} />

      <div>
        <div className="t-note" style={{ textTransform: "uppercase", letterSpacing: "0.08em", margin: "6px 0 10px", paddingLeft: 6 }}>
          Sessions ({gameSessions.length})
        </div>
        {gameSessions.length === 0 ? (
          <div className="t-note" style={{ paddingLeft: 6 }}>No sessions saved for {title}.</div>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0 }}>
            {gameSessions.map((s) => (
              <SessionRow key={s.id} session={s} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GameTabs({ game, onChange }: { game: GameId; onChange: (game: GameId) => void }) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      role="tablist"
      aria-label="Game"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 4,
        padding: 5,
        borderRadius: 22,
        background: palette.cream,
        border: `3px solid ${tan}`,
        boxShadow: `0 5px 0 ${tanEdge}`,
      }}
    >
      {GAME_ORDER.map((g, index) => {
        const selected = g === game;
        return (
          <button
            key={g}
            ref={(element) => { tabs.current[index] = element; }}
            type="button"
            role="tab"
            id={`tab-${g}`}
            aria-selected={selected}
            aria-controls={`panel-${g}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(g)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight") next = (index + 1) % GAME_ORDER.length;
              else if (event.key === "ArrowLeft") next = (index + GAME_ORDER.length - 1) % GAME_ORDER.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = GAME_ORDER.length - 1;
              else return;
              event.preventDefault();
              onChange(GAME_ORDER[next]);
              tabs.current[next]?.focus();
            }}
            style={{
              minWidth: 0,
              minHeight: 62,
              borderRadius: 16,
              border: "none",
              background: selected ? palette.glow : "transparent",
              boxShadow: selected ? `0 3px 0 ${amberEdge}` : "none",
              color: ink,
              fontFamily: "var(--font-title)",
              fontSize: "calc(15px * var(--text-scale))",
              fontWeight: 700,
              lineHeight: 1.2,
              padding: "10px 6px",
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              transition: "background 120ms ease, box-shadow 120ms ease",
            }}
          >
            {GAME_TITLES[g]}
          </button>
        );
      })}
    </div>
  );
}

function Trends({ onBack }: { onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [game, setGame] = useState<GameId>("fireflyWatch");
  const [state, setState] = useState<LoadState>("loading");
  const [scores, setScores] = useState<Score[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;
    const viewport = heading.closest<HTMLElement>(".app-stage--scrollable");
    if (viewport) viewport.scrollTop = 0;
    heading.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listScores(), listSessions()])
      .then(([sc, se]) => {
        if (cancelled) return;
        setScores(sc);
        setSessions(se);
        setState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setScores([]);
        setSessions([]);
        setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
      } catch {
        /* storage may be unavailable; the refresh below shows what is really there */
      }
      reload();
    },
    [reload],
  );

  return (
    <div style={{ padding: "24px 20px 40px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <IconButton icon="back" label="Back to Basecamp" onClick={onBack} />
        <h1 ref={headingRef} tabIndex={-1} className="t-title" style={{ margin: 0, fontSize: "calc(30px * var(--text-scale))", textWrap: "balance" }}>For <span style={{ whiteSpace: "nowrap" }}>grown-ups</span></h1>
      </header>
      <GameTabs game={game} onChange={setGame} />
      <div
        style={{
          paddingTop: 24,
          userSelect: "text",
          WebkitUserSelect: "text",
        }}
      >
        {state === "loading" && <div className="t-body" style={{ textAlign: "center", marginTop: 24 }}>Opening the trends…</div>}

        {state === "unavailable" && (
          <section style={{ textAlign: "center" }}>
            <NoteCard
              title="Nothing to show right now."
              body="This device's storage isn't available at the moment. Trends will be here once it is."
            >
              <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                <OutlineButton width={200} onClick={reload} style={{ height: 48, fontSize: "calc(20px * var(--text-scale))" }}>
                  Try again
                </OutlineButton>
              </div>
            </NoteCard>
          </section>
        )}

        {state === "ready" && <GameTab game={game} scores={scores} sessions={sessions} onDelete={handleDelete} />}

        <div className="t-note" style={{ textAlign: "center", marginTop: 22 }}>
          Trends update on this device within 2 seconds, offline.
        </div>
        <div style={{ marginTop: 10 }}>
          <LockNote text="Saved only on this device. Nothing is sent anywhere." />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
          <OutlineButton onClick={onBack}>Back to Basecamp</OutlineButton>
        </div>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function GrownUps() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const back = useCallback(() => router.push("/basecamp"), [router]);

  return (
    <Stage scrollable>
      {open ? <Trends onBack={back} /> : <Gate onOpen={() => setOpen(true)} onBack={back} />}
    </Stage>
  );
}
