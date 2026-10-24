"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Skin } from "@/components/art/skins";
import { Scene } from "@/components/art/scenes";
import { SKIN_IDS, SKIN_NAMES, type SkinId } from "@/components/art/types";
import { Stage } from "@/components/Stage";
import { amberEdge, Icon, IconButton, ink, PrimaryButton, tan, tanEdge } from "@/components/ui";
import { unlockAudio } from "@/lib/audio";
import { useSettings } from "@/lib/settings";
import { palette } from "@/lib/theme";
import styles from "./ChoiceScreen.module.css";

export function ChooseSkin() {
  return (
    <Suspense fallback={<Stage>{null}</Stage>}>
      <ChooseSkinInner />
    </Suspense>
  );
}

function ChooseSkinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/firefly-watch";
  const { settings, ready, update } = useSettings();
  const [selected, setSelected] = useState<SkinId | null>(null);
  const chosen = selected ?? settings.skin;
  const fromSettings = next === "/settings";
  const backTo = fromSettings ? "/settings" : settings.firstLaunchDone ? "/basecamp" : "/";
  if (!ready) return <Stage>{null}</Stage>;

  return (
    <Stage scrollable>
      <div className={styles.backdrop} aria-hidden>
        <Scene variant="forest" twinkle reducedMotion={settings.reducedMotion} />
      </div>
      <main className={styles.content}>
        <nav className={styles.navigation} aria-label="Page navigation">
          <IconButton
            icon="back"
            label={fromSettings ? "Back to settings" : settings.firstLaunchDone ? "Back to Basecamp" : "Back to welcome"}
            onClick={() => router.push(backTo)}
          />
          <IconButton
            icon={settings.sound ? "soundOn" : "soundOff"}
            label={settings.sound ? "Turn sound off" : "Turn sound on"}
            onClick={() => update({ sound: !settings.sound })}
          />
        </nav>
        <header className={`${styles.heading} pop-in`}>
          <h1 className={`t-title ${styles.title}`}>Choose what you&apos;ll catch</h1>
          <p className={`t-body ${styles.subtitle}`}>Pick your favorite. Change it any time.</p>
        </header>

        <div className={styles.skinGrid} role="group" aria-label="Choose your catch">
          {SKIN_IDS.map((id) => {
            const isSelected = chosen === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                aria-label={SKIN_NAMES[id]}
                onClick={() => setSelected(id)}
                className={`btn-3d ${styles.tile} ${styles.skinTile}`}
                style={{
                  borderColor: isSelected ? palette.glow : tan,
                  boxShadow: `0 7px 0 ${isSelected ? amberEdge : tanEdge}`,
                }}
              >
                <span aria-hidden><Skin id={id} size={84} glow /></span>
                <span className={styles.skinName}>{SKIN_NAMES[id]}</span>
                {isSelected && (
                  <span aria-hidden className={styles.selected}>
                    <Icon name="check" size={18} color={ink} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <footer className={`${styles.footer} pop-in-3`}>
          <PrimaryButton
            width="100%"
            style={{ height: "auto", minHeight: 64, padding: "14px 20px", lineHeight: 1.2 }}
            onClick={() => {
              unlockAudio();
              update({ skin: chosen, firstLaunchDone: true });
              router.push(next);
            }}
          >
            {fromSettings ? "Save choice" : "Let's go"}
          </PrimaryButton>
          <p className={`t-note ${styles.note}`}>Every one glows the same, so your trends stay fair.</p>
        </footer>
      </main>
    </Stage>
  );
}
