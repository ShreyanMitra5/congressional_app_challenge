"use client";

/**
 * Basecamp — the home place. A winding path of three stops through the
 * night forest: the fox waits at the first, each stop is a big round button,
 * and the next one to play wears a "Play" sticker. Nothing here is a score.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { RewardIcon } from "@/components/art/rewards";
import { Scene } from "@/components/art/scenes";
import { Skin } from "@/components/art/skins";
import type { SkinId } from "@/components/art/types";
import { At, Stage } from "@/components/Stage";
import { amberEdge, Card, Chip, Icon, IconButton, ink, inkSoft, mint, mintEdge, navyEdge, tan, tanEdge, TextButton } from "@/components/ui";
import { listRewards } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { palette } from "@/lib/theme";
import { GAME_TITLES, type GameId, type Reward } from "@/lib/types";

const STOPS: { id: GameId; href: string; x: number; y: number }[] = [
  { id: "fireflyWatch", href: "/firefly-watch", x: 118, y: 266 },
  { id: "fireflyTrail", href: "/firefly-trail", x: 262, y: 382 },
  { id: "nightWatch", href: "/night-watch", x: 128, y: 498 },
];

const LINES: Record<GameId, string> = {
  fireflyWatch: "Catch the glow",
  fireflyTrail: "Follow the trail",
  nightWatch: "Keep watch",
};

/** The firefly trail: a firefly leaving a glowing dotted path across stepping stones. */
function TrailStopIcon({ size = 64, skin }: { size?: number; skin: SkinId }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false" style={{ display: "block", overflow: "visible", position: "absolute", inset: 0 }}>
        <ellipse cx="14" cy="52" rx="13" ry="7.5" fill="#4A5C99" stroke="#1A1530" strokeWidth="3" />
        <ellipse cx="34" cy="42" rx="13" ry="7.5" fill="#4A5C99" stroke="#1A1530" strokeWidth="3" />
        <ellipse cx="52" cy="30" rx="12" ry="7" fill="#4A5C99" stroke="#1A1530" strokeWidth="3" />
        <path d="M14 44 C16 30 26 26 34 34 C40 22 48 16 52 14" fill="none" stroke="#FFC145" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.5 8" />
      </svg>
      <div style={{ position: "absolute", left: size * 0.56, top: -size * 0.22 }}>
        <Skin id={skin} size={size * 0.56} glow />
      </div>
    </div>
  );
}

export function Basecamp() {
  const router = useRouter();
  const { settings, ready, update } = useSettings();
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!settings.firstLaunchDone) {
      router.replace("/choose-skin?next=/firefly-watch");
      return;
    }
    listRewards().then(setRewards).catch(() => setRewards([]));
  }, [ready, settings.firstLaunchDone, router]);

  if (!ready || !settings.firstLaunchDone) return <Stage>{null}</Stage>;

  const reduced = settings.reducedMotion;
  // The next stop to play is the one played least; ties go to the earlier game.
  const counts = settings.sessionCounts;
  const nextIndex = STOPS.reduce((best, s, i) => (counts[s.id] < counts[STOPS[best].id] ? i : best), 0);
  const recent = rewards.slice(-7).reverse();

  return (
    <Stage>
      <Scene variant="forest" twinkle reducedMotion={reduced} />
      <At x={20} y={56}>
        <IconButton icon="settings" label="Settings" onClick={() => router.push("/settings")} />
      </At>
      <At x={322} y={56}>
        <IconButton
          icon={settings.sound ? "soundOn" : "soundOff"}
          label={settings.sound ? "Sound on" : "Sound off"}
          onClick={() => update({ sound: !settings.sound })}
        />
      </At>

      <At x={0} y={108} w={390} style={{ textAlign: "center" }}>
        <div className="t-title-lg">Basecamp</div>
        <div className="t-body" style={{ marginTop: 4 }}>{settings.theme === "day" ? "Three stops on today's walk." : "Three stops on tonight's walk."}</div>
      </At>

      {/* The path: a dotted trail between the three stops. */}
      <svg aria-hidden width={390} height={844} viewBox="0 0 390 844" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <path
          d={`M${STOPS[0].x} ${STOPS[0].y} C ${STOPS[0].x + 10} ${STOPS[0].y + 90}, ${STOPS[1].x - 20} ${STOPS[1].y - 80}, ${STOPS[1].x} ${STOPS[1].y} S ${STOPS[2].x - 20} ${STOPS[2].y - 60}, ${STOPS[2].x} ${STOPS[2].y}`}
          fill="none"
          stroke={navyEdge}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={`M${STOPS[0].x} ${STOPS[0].y} C ${STOPS[0].x + 10} ${STOPS[0].y + 90}, ${STOPS[1].x - 20} ${STOPS[1].y - 80}, ${STOPS[1].x} ${STOPS[1].y} S ${STOPS[2].x - 20} ${STOPS[2].y - 60}, ${STOPS[2].x} ${STOPS[2].y}`}
          fill="none"
          stroke={palette.dullBorder}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="2 16"
        />
      </svg>

      {STOPS.map((s, i) => {
        const isNext = i === nextIndex;
        const played = counts[s.id] > 0;
        const labelLeft = s.x > 195;
        return (
          <div key={s.id}>
            <At x={s.x} y={s.y} w={104} h={104} center>
              <button
                type="button"
                className="btn-3d"
                aria-label={`${GAME_TITLES[s.id]}. ${LINES[s.id]}`}
                onClick={() => router.push(s.href)}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 999,
                  background: isNext ? palette.glow : palette.cream,
                  border: `4px solid ${isNext ? palette.glow : tan}`,
                  boxShadow: `0 9px 0 ${isNext ? amberEdge : tanEdge}`,
                  display: "grid",
                  placeItems: "center",
                  transition: "transform 80ms ease, box-shadow 80ms ease",
                }}
              >
                {s.id === "fireflyWatch" && <Skin id={settings.skin} size={60} glow={isNext} />}
                {s.id === "fireflyTrail" && <TrailStopIcon size={60} skin={settings.skin} />}
                {s.id === "nightWatch" && <RewardIcon id="lanternString" size={64} />}
              </button>
            </At>
            {played && (
              <At x={s.x + 34} y={s.y - 52} w={34} h={34} center>
                <span
                  aria-hidden
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: mint,
                    border: `3px solid ${palette.night}`,
                    boxShadow: `0 3px 0 ${mintEdge}`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon name="check" size={18} color={ink} />
                </span>
              </At>
            )}
            <At x={labelLeft ? s.x - 64 - 150 : s.x + 64} y={s.y - 35} w={150} h={70} style={{ display: "flex", alignItems: "center", justifyContent: labelLeft ? "flex-end" : "flex-start" }}>
              <div style={{ textAlign: labelLeft ? "right" : "left", pointerEvents: "none" }}>
                <div
                  style={{
                    fontFamily: "var(--font-title)",
                    fontWeight: 700,
                    fontSize: "calc(22px * var(--text-scale))",
                    color: "var(--cream)",
                    lineHeight: 1.05,
                    textShadow: settings.theme === "day" ? "0 3px 0 rgba(255,255,255,0.55)" : "0 3px 0 rgba(10,18,48,0.6)",
                  }}
                >
                  {GAME_TITLES[s.id]}
                </div>
                <div className="t-note" style={{ marginTop: 3, fontSize: "calc(15px * var(--text-scale))" }}>{LINES[s.id]}</div>
              </div>
            </At>
            {isNext && (
              <At x={labelLeft ? s.x + 30 : s.x - 30 - 84} y={s.y + 40} w={84} h={36} style={{ display: "flex", justifyContent: labelLeft ? "flex-start" : "flex-end" }}>
                <button
                  type="button"
                  aria-label={`Play ${GAME_TITLES[s.id]}`}
                  onClick={() => router.push(s.href)}
                  className={`btn-3d${reduced ? "" : " soft-pulse"}`}
                  style={{
                    display: "inline-block",
                    padding: "7px 16px",
                    borderRadius: 12,
                    background: mint,
                    color: ink,
                    fontFamily: "var(--font-title)",
                    fontWeight: 700,
                    fontSize: "calc(17px * var(--text-scale))",
                    lineHeight: 1,
                    border: `3px solid ${palette.night}`,
                    boxShadow: `0 4px 0 ${mintEdge}`,
                    transform: "rotate(-6deg)",
                  }}
                >
                  Play
                </button>
              </At>
            )}
          </div>
        );
      })}

      {/* Collection shelf */}
      <At x={25} y={578} w={340}>
        <div style={{ position: "relative", paddingTop: 12 }}>
          <Card padding="22px 14px 12px" style={{ minHeight: 86 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 50, overflow: "hidden" }}>
              {recent.length === 0 ? (
                <span className="t-note" style={{ color: inkSoft, fontSize: "calc(15px * var(--text-scale))" }}>
                  Finish a stop to add your first keepsake.
                </span>
              ) : (
                recent.map((r) => (
                  <span
                    key={r.id}
                    title={r.name}
                    style={{
                      flex: "none",
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: `${palette.glow}33`,
                      border: `2px solid ${tan}`,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <RewardIcon id={r.rewardId} size={38} />
                  </span>
                ))
              )}
              {rewards.length > 7 && (
                <span className="t-note" style={{ color: inkSoft }}>+{rewards.length - 7}</span>
              )}
            </div>
          </Card>
          <div style={{ position: "absolute", top: 0, left: 14 }}>
            <Chip tone="mint" tilt={-3}>Your keepsakes</Chip>
          </div>
        </div>
      </At>

      <At x={16} y={688}>
        <Fox pose="idle" width={104} breathing reducedMotion={reduced} />
      </At>
      <At x={170} y={716} w={200} style={{ textAlign: "right" }}>
        <TextButton onClick={() => router.push("/grown-ups")}>For grown-ups</TextButton>
      </At>
      <At x={150} y={778} w={230} style={{ textAlign: "right" }}>
        <span className="t-note">Everything stays on this device.</span>
      </At>
    </Stage>
  );
}
