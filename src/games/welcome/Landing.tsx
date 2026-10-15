"use client";

/**
 * The welcome page, laid out the way Duolingo's home page is: a thin nav
 * with the wordmark, a big centred hero with the mascot on one side and one
 * headline plus two stacked buttons on the other, then a few alternating
 * picture-and-two-lines rows with plenty of air, and a short footer.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fox } from "@/components/art/Fox";
import { Lynx } from "@/components/art/Lynx";
import { Otter } from "@/components/art/Otter";
import { Light, Stone } from "@/components/art/props";
import { RewardIcon } from "@/components/art/rewards";
import { Skin } from "@/components/art/skins";
import { SKIN_IDS } from "@/components/art/types";
import { BigCircleButton, Icon, ink, inkSoft, OutlineButton, PrimaryButton, tan, tanEdge } from "@/components/ui";
import { STONE_POSITIONS } from "@/lib/forms/fireflyTrail";
import { palette } from "@/lib/theme";

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

const PAPER = "#FFFFFF";
const PAPER_2 = "#FFF8E8";
const RULE = "#EDE6D6";

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
  const router = useRouter();
  const [device, setDevice] = useState<Device>("desktop");
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    // Device and install state only exist in the browser, so they are read once after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDevice(detectDevice());
    setInstalled(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function onDownload() {
    if (installed) {
      router.push("/basecamp");
      return;
    }
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setShowHow(true);
  }

  return (
    <div className="lp" style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", background: PAPER, color: ink }}>
      <style>{`
        .lp { font-family: var(--font-body); }
        .lp-col { width: min(1040px, 100% - 48px); margin: 0 auto; }
        .lp-nav { height: 72px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${RULE}; }
        .lp-hero { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 40px; min-height: calc(100vh - 74px); padding: 40px 0; }
        .lp-hero-art { display: flex; justify-content: center; }
        .lp-hero-copy { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 22px; max-width: 480px; justify-self: center; }
        .lp-h1 { font-family: var(--font-title); font-weight: 700; font-size: clamp(30px, 3.4vw, 40px); line-height: 1.2; color: ${inkSoft}; margin: 0; }
        .lp-stack { display: flex; flex-direction: column; gap: 12px; width: 330px; max-width: 100%; }
        .lp-row { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 48px; padding: 72px 0; }
        .lp-row:nth-of-type(even) .lp-row-art { order: 2; }
        .lp-row-art { display: flex; justify-content: center; }
        .lp-h2 { font-family: var(--font-title); font-weight: 700; font-size: clamp(30px, 3.6vw, 44px); line-height: 1.08; color: ${palette.glow}; color: #E08A00; margin: 0 0 14px; max-width: 14ch; }
        .lp-p { font-size: 19px; line-height: 1.55; font-weight: 700; color: ${inkSoft}; margin: 0; max-width: 42ch; }
        .lp-band { background: ${PAPER_2}; border-top: 2px solid ${RULE}; border-bottom: 2px solid ${RULE}; }
        .lp-cast { display: flex; justify-content: center; align-items: flex-end; gap: 18px; flex-wrap: wrap; padding: 40px 0 8px; }
        .lp-foot { padding: 36px 0 48px; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; }
        .lp-skins { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
        .lp-steps { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 10px; font-size: 16px; font-weight: 800; line-height: 1.45; color: ${inkSoft}; }
        .lp-steps li { display: flex; gap: 12px; }
        .lp-steps b { font-family: var(--font-title); font-weight: 600; flex: none; width: 26px; height: 26px; border-radius: 999px; display: grid; place-items: center; background: ${palette.glow}; color: ${ink}; font-size: 14px; }
        @media (max-width: 820px) {
          .lp-hero { grid-template-columns: 1fr; min-height: 0; padding: 28px 0 36px; gap: 18px; }
          .lp-hero-fox svg { width: 220px !important; height: auto !important; }
          .lp-hero-fly { right: -16px !important; top: 0 !important; }
          .lp-hero-fly svg { width: 64px !important; height: 64px !important; }
          .lp-hero-spark { left: -10px !important; top: 60px !important; }
          .lp-hero-spark svg { width: 40px !important; height: 40px !important; }
          .lp-row, .lp-row:nth-of-type(even) { grid-template-columns: 1fr; gap: 24px; padding: 48px 0; }
          .lp-row:nth-of-type(even) .lp-row-art { order: 0; }
          .lp-h2 { max-width: none; }
        }
      `}</style>

      {/* nav */}
      <div className="lp-col">
        <nav className="lp-nav">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FoxMark size={40} />
            <span style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 26, color: "#E08A00", letterSpacing: "-0.01em" }}>neurotrace</span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/basecamp")}
            style={{ background: "transparent", border: "none", fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 16, color: inkSoft, letterSpacing: "0.04em", textTransform: "uppercase", minHeight: 44, padding: "0 6px" }}
          >
            Open the app
          </button>
        </nav>

        {/* hero */}
        <section className="lp-hero">
          <div className="lp-hero-art">
            <div style={{ position: "relative" }}>
              <div className="lp-hero-fox">
                <Fox pose="celebrating" width={330} breathing />
              </div>
              <div className="glow-pulse lp-hero-fly" style={{ position: "absolute", right: -30, top: 10 }}>
                <Skin id="firefly" size={92} glow />
              </div>
              <div className="lp-hero-spark" style={{ position: "absolute", left: -24, top: 90 }}>
                <Skin id="spark" size={52} glow />
              </div>
            </div>
          </div>
          <div className="lp-hero-copy">
            <h1 className="lp-h1">The free, calm way for kids to check in on attention, memory and reaction time.</h1>
            <div className="lp-stack">
              <PrimaryButton width="100%" onClick={onDownload}>
                {installed ? "Open the app" : "Get started"}
              </PrimaryButton>
              <OutlineButton width="100%" onClick={() => router.push("/basecamp")}>I already have it</OutlineButton>
            </div>
          </div>
        </section>
      </div>

      {/* the cast */}
      <div className="lp-band">
        <div className="lp-col lp-cast">
          <Fox pose="idle" width={84} />
          <Otter pose="waving" width={84} />
          <Lynx pose="idle" width={84} />
          <div className="lp-skins" style={{ marginBottom: 14, marginLeft: 12 }}>
            {SKIN_IDS.map((id) => (
              <Skin key={id} id={id} size={48} glow />
            ))}
          </div>
        </div>
      </div>

      {/* rows */}
      <div className="lp-col">
        <section className="lp-row">
          <div className="lp-row-art">
            <WatchPhone />
          </div>
          <div>
            <h2 className="lp-h2">three games. two minutes each.</h2>
            <p className="lp-p">Catch a firefly the moment it glows. Follow its trail across the stones. Keep watch over the lanterns. That is the whole check-in.</p>
          </div>
        </section>

        <section className="lp-row">
          <div className="lp-row-art">
            <TrailPhone />
          </div>
          <div>
            <h2 className="lp-h2">never a score.</h2>
            <p className="lp-p">No points, ranks or timers. Nothing turns red. The fox cheers for showing up, and a keepsake joins the Basecamp shelf.</p>
          </div>
        </section>

        <section className="lp-row">
          <div className="lp-row-art">
            <NightPhone />
          </div>
          <div>
            <h2 className="lp-h2">backed by real tests.</h2>
            <p className="lp-p">Each game is a classic cognitive task in disguise, so the trends grown-ups see mean something. Compared only with your child&apos;s own usual.</p>
          </div>
        </section>

        <section className="lp-row">
          <div className="lp-row-art">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 150, height: 150, borderRadius: 40, background: palette.glow, display: "grid", placeItems: "center", boxShadow: `0 10px 0 #E08A00` }}>
                <FoxMark size={118} />
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <RewardIcon id="lantern" size={56} />
                <RewardIcon id="stone" size={56} />
                <RewardIcon id="lanternString" size={56} />
              </div>
            </div>
          </div>
          <div>
            <h2 className="lp-h2">stays on the phone.</h2>
            <p className="lp-p">Every session is saved and encrypted on the device it was played on. No account, nothing uploaded, delete any time.</p>
          </div>
        </section>
      </div>

      {/* install */}
      <div className="lp-band">
        <div className="lp-col lp-foot">
          <h2 className="lp-h2" style={{ maxWidth: "none", textAlign: "center", color: ink }}>put it on your phone</h2>
          <div className="lp-stack">
            <PrimaryButton width="100%" onClick={onDownload}>
              {installed ? "Open the app" : "Download the app"}
            </PrimaryButton>
            <OutlineButton width="100%" onClick={() => setShowHow(true)}>How it installs</OutlineButton>
          </div>
          <span style={{ fontWeight: 800, color: inkSoft, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Icon name="lock" size={16} color={inkSoft} /> Free. No account. Nothing leaves the phone.
          </span>
        </div>
      </div>
      <div className="lp-col" style={{ padding: "22px 0 36px", display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
        <FoxMark size={26} />
        <span style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 16, color: inkSoft }}>neurotrace</span>
      </div>

      {showHow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="How to install"
          className="fade-in"
          style={{ position: "fixed", inset: 0, background: "rgba(26,21,48,0.55)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}
          onClick={() => setShowHow(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(440px, 100%)", background: PAPER, border: `3px solid ${tan}`, borderRadius: 24, boxShadow: `0 6px 0 ${tanEdge}`, padding: "24px 22px 20px", color: ink }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h3 style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 24, margin: 0, lineHeight: 1.05 }}>Add NeuroTrace to your phone</h3>
              <button type="button" aria-label="Close" onClick={() => setShowHow(false)} style={{ width: 40, height: 40, borderRadius: 12, border: `3px solid ${tan}`, background: PAPER, display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <InstallSteps device={device} />
            <div style={{ marginTop: 18 }}>
              <OutlineButton width="100%" onClick={() => setShowHow(false)}>Got it</OutlineButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InstallSteps({ device }: { device: Device }) {
  const steps: Record<Device, { title: string; lines: string[] }> = {
    ios: {
      title: "On iPhone or iPad, in Safari",
      lines: ["Tap the Share button, the square with an arrow.", "Tap “Add to Home Screen”, then Add.", "Open NeuroTrace from the home screen."],
    },
    android: {
      title: "On Android, in Chrome",
      lines: ["Tap “Download the app” and confirm.", "If nothing appears, open the browser menu and choose “Install app”."],
    },
    desktop: {
      title: "On this computer",
      lines: ["Tap “Download the app” and confirm, or use the install icon in the address bar.", "On an iPhone, open this page in Safari, tap Share, then “Add to Home Screen”."],
    },
  };
  const s = steps[device];
  return (
    <div>
      <div style={{ fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 18, color: ink, marginTop: 18 }}>{s.title}</div>
      <ol className="lp-steps">
        {s.lines.map((line, i) => (
          <li key={i}>
            <b>{i + 1}</b>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
