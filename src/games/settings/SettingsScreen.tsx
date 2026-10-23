"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skin } from "@/components/art/skins";
import { SKIN_NAMES } from "@/components/art/types";
import { At, Stage } from "@/components/Stage";
import { amberEdge, Card, Chip, IconButton, ink, inkSoft, LockNote, OutlineButton, tan, tanEdge } from "@/components/ui";
import { speak, stopSpeaking, unlockAudio } from "@/lib/audio";
import { deleteAllData } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { palette } from "@/lib/theme";
import type { TextSize, ThemeId, WorldId } from "@/lib/types";
import { Scene } from "@/components/art/scenes";

const WORLD_NAMES: Record<WorldId, string> = {
  forest: "Forest Friends",
  space: "Space Voyagers",
  neon: "Neon Arcade",
};

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card
      padding="12px 16px"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: 72,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="t-body-cream" style={{ color: ink }}>{label}</div>
        {hint && (
          <div className="t-note" style={{ marginTop: 2, color: inkSoft }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{ flex: "none" }}>{children}</div>
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
function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div
      role="radiogroup"
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
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            style={{
              minWidth: 44,
              height: 36,
              padding: "0 12px",
              borderRadius: 999,
              border: "none",
              background: selected ? palette.glow : "transparent",
              boxShadow: selected ? `0 3px 0 ${amberEdge}` : "none",
              transform: selected ? "translateY(-2px)" : "none",
              color: ink,
              fontFamily: "var(--font-title)",
              fontWeight: 700,
              fontSize: "calc(15px * var(--text-scale))",
              lineHeight: 1,
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

  if (!ready) return <Stage>{null}</Stage>;

  return (
    <Stage>
      <Scene variant="forest" twinkle reducedMotion={settings.reducedMotion} style={{ position: "absolute", inset: 0 }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: settings.theme === "day" ? "rgba(255, 255, 255, 0.18)" : "rgba(10, 18, 48, 0.35)" }} />
      <At x={20} y={56}>
        <IconButton icon="back" label="Back to Basecamp" onClick={() => router.push("/basecamp")} />
      </At>
      <At x={0} y={64} w={390} style={{ textAlign: "center", pointerEvents: "none" }}>
        <div className="t-title" style={{ fontSize: "calc(30px * var(--text-scale))" }}>Settings</div>
      </At>

      <div style={{ position: "absolute", top: 124, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Row label="Your catch" hint={SKIN_NAMES[settings.skin]}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Skin id={settings.skin} size={44} glow />
              <OutlineButton
                width={112}
                style={{ height: 44, fontSize: "calc(18px * var(--text-scale))" }}
                ariaLabel="Change skin"
                onClick={() => router.push("/choose-skin?next=/settings")}
              >
                Change
              </OutlineButton>
            </div>
          </Row>
          <Row label="Time of day" hint={settings.theme === "day" ? "Bright daytime walk." : "Calm storybook night."}>
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
          <Row label="Night Watch world" hint={`${WORLD_NAMES[settings.world]}. Changes game 3's scenery and companion.`}>
            <OutlineButton
              width={112}
              style={{ height: 44, fontSize: "calc(18px * var(--text-scale))" }}
              onClick={() => router.push("/choose-world?next=/settings")}
            >
              Change
            </OutlineButton>
          </Row>
          <Row label="Sound" hint="Chime and music only. Never the glow.">
            <Toggle on={settings.sound} onChange={(v) => update({ sound: v })} label="Sound" />
          </Row>
          <Row label="Reduced motion" hint="Simple cuts instead of fades and drifts.">
            <Toggle on={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} label="Reduced motion" />
          </Row>
          <Row label="Text size">
            <Segmented<TextSize>
              label="Text size"
              value={settings.textSize}
              onChange={(v) => update({ textSize: v })}
              options={[
                { id: "normal", label: "A" },
                { id: "large", label: "A+" },
                { id: "xlarge", label: "A++" },
              ]}
            />
          </Row>
          <Row label="High contrast">
            <Toggle on={settings.highContrast} onChange={(v) => update({ highContrast: v })} label="High contrast" />
          </Row>
          <Row label="Read instructions aloud" hint="Plays the recorded instructions on each Ready screen.">
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
          <Row label="Gentle pace" hint="Night Watch only. A slower watch with its own baseline.">
            <Toggle on={settings.gentlePace} onChange={(v) => update({ gentlePace: v })} label="Gentle pace" />
          </Row>
          <Row label="Short watch" hint="Night Watch only. Half the length (45 glows) for a child who can't yet sit a full one.">
            <Toggle on={settings.shortWatch} onChange={(v) => update({ shortWatch: v })} label="Short watch" />
          </Row>

          <div style={{ height: 14 }} />
          <div style={{ padding: "0 6px 6px" }}>
            <Chip tone="pink" tilt={-3}>Your data</Chip>
          </div>
          <Row label="Delete one session" hint="Pick it from the grown-ups page.">
            <OutlineButton width={112} style={{ height: 44, fontSize: "calc(18px * var(--text-scale))" }} onClick={() => router.push("/grown-ups")}>
              Open
            </OutlineButton>
          </Row>
          <Row label="Delete all data" hint={wiped ? "All gone. Fresh start." : "Removes every session and reward on this device."}>
            <OutlineButton
              width={confirmAll ? 124 : 112}
              style={{
                height: 44,
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
                try {
                  await deleteAllData();
                } catch {
                  /* ignore */
                }
                reset();
                setConfirmAll(false);
                setWiped(true);
              }}
            >
              {confirmAll ? "Really?" : "Delete"}
            </OutlineButton>
          </Row>
          <div style={{ marginTop: 14 }}>
            <LockNote text="Saved only on this device. Nothing is sent anywhere." />
          </div>
        </div>
      </div>
    </Stage>
  );
}
