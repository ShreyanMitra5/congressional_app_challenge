"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { Fox } from "@/components/art/Fox";
import { Lynx } from "@/components/art/Lynx";
import { Otter } from "@/components/art/Otter";
import { Light, Stone } from "@/components/art/props";
import { RewardIcon } from "@/components/art/rewards";
import { Skin } from "@/components/art/skins";
import { BigCircleButton, Icon } from "@/components/ui";
import { STONE_POSITIONS } from "@/lib/forms/fireflyTrail";
import { palette } from "@/lib/theme";
import styles from "./Landing.module.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Device = "ios" | "android" | "desktop";

function detectDevice(): Device {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/* ------------------------------------------------------------------ */
/* The fox-face wordmark                                                */
/* ------------------------------------------------------------------ */

function FoxMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden focusable="false" style={{ display: "block" }}>
      <g stroke="#1A1530" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round">
        <path d="M150 230 C130 180 118 120 128 84 C170 104 214 140 236 172 Z" fill="#F28C38" />
        <path d="M362 230 C382 180 394 120 384 84 C342 104 298 140 276 172 Z" fill="#F28C38" />
        <path d="M256 136 C332 136 404 184 404 262 C404 336 360 396 256 396 C152 396 108 336 108 262 C108 184 180 136 256 136 Z" fill="#F28C38" />
        <path d="M256 258 C300 258 330 292 330 330 C330 372 300 396 256 396 C212 396 182 372 182 330 C182 292 212 258 256 258 Z" fill="#FFF1D6" />
      </g>
      <ellipse cx="206" cy="244" rx="20" ry="24" fill="#1A1530" />
      <ellipse cx="306" cy="244" rx="20" ry="24" fill="#1A1530" />
      <circle cx="212" cy="236" r="7" fill="#fff" />
      <circle cx="312" cy="236" r="7" fill="#fff" />
      <path d="M238 296 L256 318 L274 296 Z" fill="#1A1530" />
      <path d="M256 318 L256 336 M228 346 Q256 368 284 346" stroke="#1A1530" strokeWidth="14" fill="none" strokeLinecap="round" />
      <circle cx="164" cy="296" r="16" fill="#FF9EC4" />
      <circle cx="348" cy="296" r="16" fill="#FF9EC4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Windows into the real games (the 390-wide stage, scaled and cropped) */
/* ------------------------------------------------------------------ */

function At({ x, y, w, h, children, center }: { x: number; y: number; w?: number; h?: number; children: React.ReactNode; center?: boolean }) {
  const left = center && w != null ? x - w / 2 : x;
  const topPx = center && h != null ? y - h / 2 : y;
  return <div style={{ position: "absolute", left, top: topPx, width: w, height: h }}>{children}</div>;
}

function Phone({ top, children }: { top: number; children: React.ReactNode }) {
  const scale = 0.62;
  const w = 390 * scale + 20;
  const h = 500;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 34,
        background: "#1A1530",
        padding: 10,
        boxShadow: "0 24px 48px rgba(26,21,48,0.18)",
        flex: "none",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 26, overflow: "hidden", background: palette.night, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: -top * scale, width: 390, height: 844, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function WatchPhone() {
  return (
    <Phone top={240}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#14204A, #101B45 70%, #0A1230)" }} />
      <At x={253.5} y={363} w={120} h={120} center>
        <Skin id="firefly" size={120} glow />
      </At>
      <At x={20} y={608}>
        <Fox pose="catching" width={110} />
      </At>
      <At x={195} y={734} w={156} h={156} center>
        <BigCircleButton label="Catch" glowing />
      </At>
    </Phone>
  );
}

function TrailPhone() {
  const lit = 4;
  return (
    <Phone top={150}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#14204A, #0A1230)" }} />
      {STONE_POSITIONS.map((p, i) => (
        <At key={i} x={p.x} y={p.y} w={64} h={64} center>
          <Stone size={64} state={i === lit ? "lit" : i === 1 ? "tapped" : "rest"} />
        </At>
      ))}
      <At x={STONE_POSITIONS[lit].x} y={STONE_POSITIONS[lit].y - 18} w={56} h={56} center>
        <Skin id="firefly" size={56} glow />
      </At>
      <At x={20} y={620}>
        <Fox pose="idle" width={110} />
      </At>
    </Phone>
  );
}

function NightPhone() {
  const glow = 7;
  return (
    <Phone top={150}>
      <div style={{ position: "absolute", inset: 0, background: palette.night }} />
      <At x={20} y={190} w={350} h={420}>
        <div style={{ width: 350, height: 420, background: palette.ground, borderRadius: 28 }} />
      </At>
      {STONE_POSITIONS.map((p, i) => (
        <At key={i} x={p.x} y={p.y} w={64} h={64} center>
          <Light world="forest" state={i === glow ? "glow" : "rest"} size={64} />
        </At>
      ))}
      <At x={20} y={620}>
        <Fox pose="idle" width={100} />
      </At>
      <At x={195} y={734} w={156} h={156} center>
        <BigCircleButton label="Signal" glowing />
      </At>
    </Phone>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export function Landing() {
  const [device, setDevice] = useState<Device>("desktop");
  const [nativeApp, setNativeApp] = useState<boolean | null>(null);
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [installPending, setInstallPending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Browser-only state is initialized after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNativeApp(Capacitor.isNativePlatform());
    setDevice(detectDevice());
    setInstalled(isStandalone());
    if (Capacitor.isNativePlatform()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShowHow(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showHow && !dialog.open) dialog.showModal();
    if (!showHow && dialog.open) dialog.close();
  }, [showHow]);

  async function onInstall() {
    if (Capacitor.isNativePlatform()) return;
    if (!deferred) {
      setShowHow(true);
      return;
    }
    setInstallPending(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      setShowHow(true);
    } finally {
      setDeferred(null);
      setInstallPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={`${styles.container} ${styles.header}`}>
        <Link href="/" className={styles.brand} aria-label="BrainCompass home">
          <FoxMark size={38} />
          <span>braincompass<span className={styles.brandDot}>.</span></span>
        </Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          <a href="#games" className={styles.navExplore}>Meet the games</a>
          <Link href="/basecamp" className={styles.navPlay}>Play now <span aria-hidden>↗</span></Link>
        </nav>
      </header>

      <main>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="welcome-heading">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden>✦</span> Welcome to your little Basecamp</p>
            <h1 id="welcome-heading" className={styles.headline}>Small adventures.<br /><span>Bright discoveries.</span></h1>
            <p className={styles.intro}>Three gentle games for curious minds. Explore attention, memory and reaction time with a friendly face by your side.</p>
            <div className={styles.heroActions}>
              <Link href="/basecamp" className={styles.primaryAction}>Let’s play <span aria-hidden>→</span></Link>
              <a href="#games" className={styles.secondaryAction}>Explore the games</a>
            </div>
            <p className={styles.quietNote}>Free to play · No account needed · Your own pace</p>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.heroCircle} />
            <div className={styles.heroFox}><Fox pose="celebrating" width={310} breathing /></div>
            <div className={`${styles.heroFirefly} glow-pulse`}><Skin id="firefly" size={86} glow /></div>
            <div className={styles.heroSpark}><Skin id="spark" size={48} glow /></div>
            <div className={styles.welcomeTag}><span>✦</span> A little moment, just for you</div>
          </div>
        </section>

        <section id="games" className={styles.gamesSection} aria-labelledby="games-heading">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>A few minutes of discovery</p>
                <h2 id="games-heading">Find your next adventure.</h2>
              </div>
              <p>Pick a game, try a practice round, then see where your curiosity takes you.</p>
            </div>
            <div className={styles.gameGrid}>
              <article className={styles.gameCard}>
                <div className={`${styles.gamePreview} ${styles.watchPreview}`} aria-hidden="true" inert><WatchPhone /></div>
                <div className={styles.gameCopy}>
                  <p className={styles.gameType}>Reaction time</p>
                  <h3>Firefly Watch</h3>
                  <p>Wait for the little glow, then catch it with a tap.</p>
                </div>
              </article>
              <article className={styles.gameCard}>
                <div className={`${styles.gamePreview} ${styles.trailPreview}`} aria-hidden="true" inert><TrailPhone /></div>
                <div className={styles.gameCopy}>
                  <p className={styles.gameType}>Memory</p>
                  <h3>Firefly Trail</h3>
                  <p>Watch the stones light up. Follow the trail from memory.</p>
                </div>
              </article>
              <article className={styles.gameCard}>
                <div className={`${styles.gamePreview} ${styles.nightPreview}`} aria-hidden="true" inert><NightPhone /></div>
                <div className={styles.gameCopy}>
                  <p className={styles.gameType}>Attention</p>
                  <h3>Night Watch</h3>
                  <p>Keep an eye on the lanterns and signal when one glows twice.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.details}`} aria-label="Made for you">
          <article className={styles.detailCard}>
            <div className={styles.companions} aria-hidden="true">
              <Fox pose="idle" width={76} /><Otter pose="waving" width={76} /><Lynx pose="idle" width={76} />
            </div>
            <h2>A friendly place to return to.</h2>
            <p>Choose your companion, make Basecamp your own, and collect a keepsake for showing up. Practice first and take a break whenever you need one.</p>
          </article>
          <article className={styles.detailCard}>
            <div className={styles.keepsakes} aria-hidden="true">
              <RewardIcon id="lantern" size={70} /><RewardIcon id="stone" size={64} /><RewardIcon id="lanternString" size={76} />
            </div>
            <h2>Your progress stays close.</h2>
            <p>Sessions are saved on this device. Grown-ups can review history and experimental trends, with no account needed. You can delete your data any time.</p>
          </article>
        </section>

        <section className={`${styles.container} ${styles.startBanner}`} aria-labelledby="start-heading">
          <div>
            <p className={styles.eyebrow}>Your Basecamp is ready</p>
            <h2 id="start-heading">Let a little curiosity lead the way.</h2>
            <p>{nativeApp === false ? "Start right here in your browser." : "Your next adventure is ready."}</p>
          </div>
          <div className={styles.bannerActions}>
            <Link href="/basecamp" className={styles.primaryAction}>Let’s play <span aria-hidden>→</span></Link>
            {nativeApp === false && (!installed ? (
              <button className={styles.installAction} type="button" onClick={onInstall} disabled={installPending}>
                {installPending ? "Opening install…" : "Add to home screen"}
              </button>
            ) : <span className={styles.installedNote}>Added to your home screen</span>)}
          </div>
        </section>
      </main>

      <footer className={`${styles.container} ${styles.footer}`}>
        <div className={styles.footerBrand}><FoxMark size={28} /><span>Made for small moments of discovery.</span></div>
      </footer>

      {nativeApp === false && <dialog
        ref={dialogRef}
        className={styles.installDialog}
        aria-labelledby="install-heading"
        aria-describedby="install-description"
        onClose={() => setShowHow(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setShowHow(false);
        }}
      >
        <div className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <h2 id="install-heading">Keep Basecamp close</h2>
            <button type="button" aria-label="Close install instructions" onClick={() => setShowHow(false)} className={styles.closeButton}>
              <Icon name="close" size={20} />
            </button>
          </div>
          <p id="install-description">Add a shortcut to your home screen for an easier way back. You can also keep playing in your browser.</p>
          <InstallSteps device={device} />
          <button type="button" className={styles.dialogDone} onClick={() => setShowHow(false)}>Got it</button>
        </div>
      </dialog>}
    </div>
  );
}

function InstallSteps({ device }: { device: Device }) {
  const steps: Record<Device, { title: string; lines: string[] }> = {
    ios: {
      title: "In Safari on iPhone or iPad",
      lines: ["Open the Share menu (the square with an arrow).", "Choose “Add to Home Screen”, then tap Add."],
    },
    android: {
      title: "In Chrome on Android",
      lines: ["Open the browser’s three-dot menu.", "Choose “Add to Home screen” or “Install app”, if available, and follow the prompts."],
    },
    desktop: {
      title: "On your computer",
      lines: ["Look for the install option in your browser’s address bar or menu.", "If your browser doesn’t offer it, bookmark this page to come back any time."],
    },
  };
  const instructions = steps[device];
  return (
    <div className={styles.installInstructions}>
      <h3>{instructions.title}</h3>
      <ol className={styles.steps}>
        {instructions.lines.map((line, index) => <li key={index}>{line}</li>)}
      </ol>
    </div>
  );
}
