"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Fox } from "@/components/art/Fox";
import { Lynx } from "@/components/art/Lynx";
import { Otter } from "@/components/art/Otter";
import { Light } from "@/components/art/props";
import { Scene } from "@/components/art/scenes";
import { Stage } from "@/components/Stage";
import { Icon, IconButton, ink, PrimaryButton, tan, tanEdge } from "@/components/ui";
import { useSettings } from "@/lib/settings";
import { worldGlow, type WorldId } from "@/lib/theme";
import styles from "./ChoiceScreen.module.css";

const WORLDS: { id: WorldId; name: string; game: string; line: string }[] = [
  { id: "forest", name: "Forest Friends", game: "Night Watch", line: "Lanterns in the trees with the fox." },
  { id: "space", name: "Space Voyagers", game: "Star Watch", line: "Beacons on a star map with the otter." },
  { id: "neon", name: "Neon Arcade", game: "Skyline Watch", line: "Windows on a skyline with the lynx." },
];

const WORLD_EDGES: Record<WorldId, string> = { forest: "#C9780E", space: "#2A8FA8", neon: "#B89A12" };

export function ChooseWorld() {
  return (
    <Suspense fallback={<Stage>{null}</Stage>}>
      <ChooseWorldInner />
    </Suspense>
  );
}

function ChooseWorldInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/night-watch";
  const { settings, ready, update } = useSettings();
  const [selected, setSelected] = useState<WorldId | null>(null);
  const chosen = selected ?? settings.world;
  const fromSettings = next === "/settings";
  const backTo = fromSettings ? "/settings" : settings.firstLaunchDone ? "/basecamp" : "/";
  if (!ready) return <Stage>{null}</Stage>;

  return (
    <Stage scrollable>
      <div className={styles.backdrop} aria-hidden>
        <Scene variant={chosen} twinkle reducedMotion={settings.reducedMotion} />
      </div>
      <main className={styles.content}>
        <nav className={styles.navigation} aria-label="Page navigation">
          <IconButton
            icon="back"
            label={fromSettings ? "Back to settings" : settings.firstLaunchDone ? "Back to Basecamp" : "Back to welcome"}
            onClick={() => router.push(backTo)}
          />
        </nav>
        <header className={`${styles.heading} pop-in`}>
          <h1 className={`t-title ${styles.title}`}>Choose your world</h1>
          <p className={`t-body ${styles.subtitle}`}>Same game, a different night.</p>
        </header>

        <div className={styles.worldList} role="group" aria-label="Choose your world">
          {WORLDS.map((world) => {
            const isSelected = chosen === world.id;
            return (
              <button
                key={world.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={world.name}
                aria-describedby={`world-${world.id}-description`}
                onClick={() => setSelected(world.id)}
                className={`btn-3d ${styles.tile} ${styles.worldTile}`}
                style={{
                  borderColor: isSelected ? worldGlow[world.id] : tan,
                  boxShadow: `0 7px 0 ${isSelected ? WORLD_EDGES[world.id] : tanEdge}`,
                }}
              >
                <span className={styles.worldArt} aria-hidden>
                  {world.id === "forest" && <Fox pose="idle" width={72} />}
                  {world.id === "space" && <Otter pose="idle" width={72} />}
                  {world.id === "neon" && <Lynx pose="idle" width={72} />}
                  <span className={styles.worldLight}><Light world={world.id} state="glow" size={34} /></span>
                </span>
                <span>
                  <span className={styles.worldName}>{world.name}</span>
                  <span id={`world-${world.id}-description`} className={`t-note ${styles.worldDescription}`}>
                    {world.game}: {world.line}
                  </span>
                </span>
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
            glowColor={worldGlow[chosen]}
            edgeColor={WORLD_EDGES[chosen]}
            onClick={() => {
              update({ world: chosen });
              router.push(next);
            }}
          >
            {fromSettings ? "Save choice" : "Let's go"}
          </PrimaryButton>
          <p className={`t-note ${styles.note}`}>Every world plays the same, so your trends stay fair.</p>
        </footer>
      </main>
    </Stage>
  );
}
