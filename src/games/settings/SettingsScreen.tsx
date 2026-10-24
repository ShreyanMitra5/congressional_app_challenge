"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skin } from "@/components/art/skins";
import { SKIN_NAMES } from "@/components/art/types";
import { Stage } from "@/components/Stage";
import { amberEdge, Card, Chip, IconButton, ink, inkSoft, LockNote, OutlineButton, tan, tanEdge } from "@/components/ui";
import { speak, stopSpeaking, unlockAudio } from "@/lib/audio";
import { deleteAllData } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { palette } from "@/lib/theme";
import type { TextSize, ThemeId, WorldId } from "@/lib/types";
import { Scene } from "@/components/art/scenes";
import styles from "./SettingsScreen.module.css";

const WORLD_NAMES: Record<WorldId, string> = {
  forest: "Forest Friends",
  space: "Space Voyagers",
  neon: "Neon Arcade",
};

function Row({ label, hint, children, stacked = false }: { label: string; hint?: string; children: React.ReactNode; stacked?: boolean }) {
  return (
    <Card padding="18px" style={{ minWidth: 0 }}>
      <div className={`${styles.row} ${stacked ? styles.stacked : ""}`}>
        <div className={styles.rowCopy}>
          <div className="t-body-cream" style={{ color: ink, lineHeight: 1.3 }}>{label}</div>
          {hint && <div className={`t-note ${styles.hint}`}>{hint}</div>}
        </div>
        <div className={styles.rowControl}>{children}</div>
      </div>
    </Card>
  );
}

/** A chunky 3D switch: a cream track that fills with glow when on. */
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="btn-3d"
      style={{
        width: 76,
        height: 44,
        borderRadius: 999,
        background: on ? palette.glow : palette.cream,
        border: `3px solid ${on ? palette.glow : tan}`,
        boxShadow: `0 4px 0 ${on ? amberEdge : tanEdge}`,
        position: "relative",
        padding: 0,
        transition: "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 80ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: on ? 10 : 40,
          display: "flex",
          alignItems: "center",
          fontFamily: "var(--font-title)",
          fontWeight: 700,
          fontSize: 13,
          color: on ? ink : inkSoft,
        }}
      >
        {on ? "On" : "Off"}
      </span>
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 3,
          left: on ? 38 : 3,
          width: 32,
          height: 32,
          borderRadius: 999,
          background: on ? ink : tan,
          transition: "left 160ms ease, background 160ms ease",
        }}
      />
    </button>
  );
}

/** A cream pill group; the chosen option is a solid glow pill with an amber edge. */
function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; accessibleLabel?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "flex",
        gap: 4,
        background: palette.cream,
        padding: 4,
        borderRadius: 999,
        border: `3px solid ${tan}`,
        boxShadow: `0 4px 0 ${tanEdge}`,
      }}
    >
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            aria-label={o.accessibleLabel}
            onClick={() => onChange(o.id)}
            style={{
              minWidth: 44,
              minHeight: 44,
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              background: selected ? palette.glow : "transparent",
              boxShadow: selected ? `0 3px 0 ${amberEdge}` : "none",
              transform: selected ? "translateY(-2px)" : "none",
              color: ink,
              fontFamily: "var(--font-title)",
              fontWeight: 700,
              fontSize: "calc(15px * var(--text-scale))",
              lineHeight: 1.2,
              transition: "background 120ms ease, box-shadow 120ms ease, transform 120ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const { settings, ready, update, reset } = useSettings();
  const [confirmAll, setConfirmAll] = useState(false);
  const [wiped, setWiped] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  if (!ready) return <Stage>{null}</Stage>;

  return (
    <Stage scrollable>
      <div className={styles.backdrop} aria-hidden>
        <Scene variant="forest" twinkle reducedMotion={settings.reducedMotion} />
        <div className={styles.shade} />
      </div>
      <main className={styles.content}>
        <header className={styles.header}>
          <IconButton icon="back" label="Back to Basecamp" onClick={() => router.push("/basecamp")} />
          <div>
            <h1 className={`t-title ${styles.title}`}>Settings</h1>
            <p className={`t-note ${styles.intro}`}>Make this little world feel right for you.</p>
          </div>
        </header>
        <section className={styles.section} aria-labelledby="settings-look">
          <h2 id="settings-look" className={styles.sectionTitle}>Your world</h2>
          <Row label="Your catch" hint={SKIN_NAMES[settings.skin]} stacked>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Skin id={settings.skin} size={44} glow />
              <OutlineButton
                width="auto"
                style={{ minWidth: 112, minHeight: 48, height: "auto", padding: "10px 16px", fontSize: "calc(18px * var(--text-scale))", lineHeight: 1.2 }}
                ariaLabel="Change skin"
                onClick={() => router.push("/choose-skin?next=/settings")}
              >
                Change
              </OutlineButton>
            </div>
          </Row>
          <Row label="Time of day" hint={settings.theme === "day" ? "Bright daytime walk." : "Calm storybook night."} stacked>
            <Segmented<ThemeId>
              label="Time of day"
              value={settings.theme}
              onChange={(v) => update({ theme: v })}
              options={[
                { id: "night", label: "Night" },
                { id: "day", label: "Day" },
              ]}
            />
          </Row>
          <Row label="Night Watch world" hint={`${WORLD_NAMES[settings.world]}. Choose your scenery and companion.`} stacked>
            <OutlineButton
              width="auto"
              style={{ minWidth: 112, minHeight: 48, height: "auto", padding: "10px 16px", fontSize: "calc(18px * var(--text-scale))", lineHeight: 1.2 }}
              onClick={() => router.push("/choose-world?next=/settings")}
            >
              Change
            </OutlineButton>
          </Row>
        </section>
        <section className={styles.section} aria-labelledby="settings-comfort">
          <h2 id="settings-comfort" className={styles.sectionTitle}>Sound & comfort</h2>
          <Row label="Sound" hint="Chime and music only. Never the glow.">
            <Toggle on={settings.sound} onChange={(v) => update({ sound: v })} label="Sound" />
          </Row>
          <Row label="Reduced motion" hint="Simple cuts instead of fades and drifts.">
            <Toggle on={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} label="Reduced motion" />
          </Row>
          <Row label="Text size" stacked>
            <Segmented<TextSize>
              label="Text size"
              value={settings.textSize}
              onChange={(v) => update({ textSize: v })}
              options={[
                { id: "normal", label: "A", accessibleLabel: "Normal text" },
                { id: "large", label: "A+", accessibleLabel: "Large text" },
                { id: "xlarge", label: "A++", accessibleLabel: "Extra-large text" },
              ]}
            />
          </Row>
          <Row label="High contrast">
            <Toggle on={settings.highContrast} onChange={(v) => update({ highContrast: v })} label="High contrast" />
          </Row>
          <Row label="Read instructions aloud" hint="Reads the instructions on each Ready screen.">
            <Toggle
              on={settings.audioInstructions}
              onChange={(v) => {
                update({ audioInstructions: v });
                if (v) {
                  unlockAudio();
                  speak("Instructions will be read aloud on each Ready screen.", true);
                } else stopSpeaking();
              }}
              label="Read instructions aloud"
            />
          </Row>
        </section>
        <section className={styles.section} aria-labelledby="settings-watch">
          <h2 id="settings-watch" className={styles.sectionTitle}>Night Watch</h2>
          <Row label="Gentle pace" hint="More time between glows for a calmer watch.">
            <Toggle on={settings.gentlePace} onChange={(v) => update({ gentlePace: v })} label="Gentle pace" />
          </Row>
          <Row label="Short watch" hint="A shorter visit with half as many glows.">
            <Toggle on={settings.shortWatch} onChange={(v) => update({ shortWatch: v })} label="Short watch" />
          </Row>

        </section>
        <section className={styles.section} aria-labelledby="settings-data">
          <h2 id="settings-data" className={styles.sectionTitle}><Chip tone="pink" tilt={-3}>Your data</Chip></h2>
          <Row label="Delete one session" hint="Pick it from the grown-ups page." stacked>
            <OutlineButton width="auto" style={{ minWidth: 112, minHeight: 48, height: "auto", padding: "10px 16px", fontSize: "calc(18px * var(--text-scale))", lineHeight: 1.2 }} onClick={() => router.push("/grown-ups")}>
              Open
            </OutlineButton>
          </Row>
          <Row label="Delete all data" hint={wiped ? "All gone. Fresh start." : "Removes every session and reward on this device."} stacked>
            <OutlineButton
              width="auto"
              style={{
                minWidth: confirmAll ? 124 : 112,
                minHeight: 48,
                height: "auto",
                padding: "10px 16px",
                lineHeight: 1.2,
                fontSize: "calc(18px * var(--text-scale))",
                background: confirmAll ? palette.glow : undefined,
                borderColor: confirmAll ? palette.glow : undefined,
                boxShadow: confirmAll ? `0 6px 0 ${amberEdge}` : undefined,
              }}
              onClick={async () => {
                if (!confirmAll) {
                  setConfirmAll(true);
                  window.setTimeout(() => setConfirmAll(false), 4000);
                  return;
                }
                setDeleteError(false);
                try {
                  await deleteAllData();
                } catch {
                  setDeleteError(true);
                  setConfirmAll(false);
                  return;
                }
                reset();
                setConfirmAll(false);
                setWiped(true);
              }}
            >
              {confirmAll ? "Really?" : "Delete"}
            </OutlineButton>
          </Row>
          {deleteError && <p className="t-note" role="alert">Your data could not be deleted. Please try again.</p>}
        </section>
        <footer className={styles.footer}>
          <LockNote text="Saved only on this device. Nothing is sent anywhere." />
        </footer>
      </main>
    </Stage>
  );
}
