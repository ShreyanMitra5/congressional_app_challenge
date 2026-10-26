"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { RewardIcon } from "@/components/art/rewards";
import { Scene } from "@/components/art/scenes";
import { Skin } from "@/components/art/skins";
import type { SkinId } from "@/components/art/types";
import { Stage } from "@/components/Stage";
import { Icon, IconButton, ink } from "@/components/ui";
import { listRewards } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { GAME_TITLES, type GameId, type Reward } from "@/lib/types";
import styles from "./Basecamp.module.css";

const STOPS: { id: GameId; href: string; line: string; color: string }[] = [
  { id: "fireflyWatch", href: "/firefly-watch", line: "Catch the glow", color: "#FFF0C2" },
  { id: "fireflyTrail", href: "/firefly-trail", line: "Follow the trail", color: "#DCF5E8" },
  { id: "nightWatch", href: "/night-watch", line: "Keep watch", color: "#EAE4FF" },
];

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
    let active = true;
    listRewards().then((items) => { if (active) setRewards(items); }).catch(() => { if (active) setRewards([]); });
    return () => { active = false; };
  }, [ready, settings.firstLaunchDone, router]);

  if (!ready || !settings.firstLaunchDone) return <Stage scrollable><span className="sr-only" role="status">Opening Basecamp…</span></Stage>;

  const counts = settings.sessionCounts;
  const nextIndex = STOPS.reduce((best, s, i) => (counts[s.id] < counts[STOPS[best].id] ? i : best), 0);
  const recent = rewards.slice(-7).reverse();

  return (
    <Stage scrollable>
      <Scene variant="forest" reducedMotion={settings.reducedMotion} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      <main className={styles.content}>
        <header className={styles.header}>
          <span className={styles.wordmark}>braincompass<span className={styles.wordmarkDot}>✦</span></span>
          <div className={styles.tools}>
            <IconButton icon={settings.sound ? "soundOn" : "soundOff"} label={settings.sound ? "Sound on" : "Sound off"} onClick={() => update({ sound: !settings.sound })} />
            <IconButton icon="settings" label="Settings" onClick={() => router.push("/settings")} />
          </div>
        </header>

        <section className={styles.welcome} aria-labelledby="basecamp-title">
          <div>
            <p className={styles.eyebrow}>{settings.theme === "day" ? "A little daytime adventure" : "A little nighttime adventure"}</p>
            <h1 id="basecamp-title">Basecamp</h1>
            <p className={styles.intro}>Your fox is ready.<br />Where shall we go?</p>
          </div>
          <div className={styles.fox} aria-hidden="true"><Fox pose="idle" width={112} reducedMotion={settings.reducedMotion} /></div>
        </section>

        <section aria-labelledby="games-title">
          <h2 id="games-title" className={styles.sectionTitle}>Pick a little adventure</h2>
          <div className={styles.games}>
            {STOPS.map((stop, index) => (
              <button key={stop.id} className={styles.game} type="button" onClick={() => router.push(stop.href)} aria-label={`${GAME_TITLES[stop.id]}. ${stop.line}`}>
                <span className={styles.gameArt} style={{ background: stop.color }} aria-hidden="true">
                  {stop.id === "fireflyWatch" && <Skin id={settings.skin} size={58} />}
                  {stop.id === "fireflyTrail" && <TrailStopIcon size={52} skin={settings.skin} />}
                  {stop.id === "nightWatch" && <RewardIcon id="lanternString" size={56} />}
                </span>
                <span className={styles.gameCopy}>
                  {index === nextIndex && <span className={styles.suggestion}>A lovely place to start</span>}
                  <span className={styles.gameTitle}>{GAME_TITLES[stop.id]}</span>
                  <span className={styles.gameLine}>{stop.line}</span>
                </span>
                <span className={styles.arrow} aria-hidden="true"><Icon name="play" size={18} color={ink} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.collection} aria-labelledby="keepsakes-title">
          <h2 id="keepsakes-title" className={styles.sectionTitle}>Your keepsakes</h2>
          {recent.length === 0 ? (
            <div className={styles.emptyCollection}>
              <span aria-hidden="true"><RewardIcon id="lantern" size={40} /></span>
              <p>A little something to remember each adventure. Your first one is waiting.</p>
            </div>
          ) : (
            <ul className={styles.rewards} aria-label="Recent keepsakes">
              {recent.map((reward) => <li key={reward.id} title={reward.name}><RewardIcon id={reward.rewardId} size={40} /><span className="sr-only">{reward.name}</span></li>)}
            </ul>
          )}
        </section>

        <footer className={styles.footer}>
          <button type="button" className={styles.grownUps} onClick={() => router.push("/grown-ups")}><Icon name="lock" size={17} color="currentColor" />For grown-ups<Icon name="play" size={12} color="currentColor" /></button>
          <p>Made for little moments. Saved on this device.</p>
        </footer>
      </main>
    </Stage>
  );
}
