"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Fox } from "@/components/art/Fox";
import { Lynx } from "@/components/art/Lynx";
import { Otter } from "@/components/art/Otter";
import { Light } from "@/components/art/props";
import { Scene } from "@/components/art/scenes";
import { At, Stage } from "@/components/Stage";
import { Icon, IconButton, ink, inkSoft, mint, mintEdge, PrimaryButton, tan, tanEdge } from "@/components/ui";
import { useSettings } from "@/lib/settings";
import { palette, worldGlow, type WorldId } from "@/lib/theme";

const WORLDS: { id: WorldId; name: string; game: string; line: string }[] = [
  { id: "forest", name: "Forest Friends", game: "Night Watch", line: "Lanterns in the trees with the fox." },
  { id: "space", name: "Space Voyagers", game: "Star Watch", line: "Beacons on a star map with the otter." },
  { id: "neon", name: "Neon Arcade", game: "Skyline Watch", line: "Windows on a skyline with the lynx." },
];

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
  if (!ready) return <Stage>{null}</Stage>;

  return (
    <Stage>
      <Scene variant={chosen} twinkle reducedMotion={settings.reducedMotion} />
      <At x={20} y={56}>
        <IconButton icon="back" label="Back" onClick={() => router.back()} />
      </At>
      <At x={0} y={112} w={390} style={{ textAlign: "center", padding: "0 24px" }} className="pop-in">
        <div className="t-title">Choose your world</div>
        <div className="t-body" style={{ marginTop: 4, fontSize: "calc(16px * var(--text-scale))" }}>Same game, a different night.</div>
      </At>

      {WORLDS.map((w, i) => {
        const isSel = chosen === w.id;
        const glow = worldGlow[w.id];
        const glowEdge = { forest: "#C9780E", space: "#2A8FA8", neon: "#B89A12" }[w.id];
        return (
          <At key={w.id} x={28} y={214 + i * 150} w={334} h={132}>
            <button
              type="button"
              aria-pressed={isSel}
              aria-label={w.name}
              onClick={() => setSelected(w.id)}
              className="btn-3d"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 24,
                background: palette.cream,
                border: `4px solid ${isSel ? glow : tan}`,
                boxShadow: `0 7px 0 ${isSel ? glowEdge : tanEdge}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 14px",
                textAlign: "left",
                position: "relative",
                transition: "border-color 120ms ease, box-shadow 80ms ease, transform 80ms ease",
              }}
            >
              <div style={{ width: 84, height: 100, flex: "none", display: "grid", placeItems: "center" }}>
                {w.id === "forest" && <Fox pose="idle" width={78} />}
                {w.id === "space" && <Otter pose="idle" width={78} />}
                {w.id === "neon" && <Lynx pose="idle" width={78} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "calc(23px * var(--text-scale))", color: ink, lineHeight: 1.05 }}>{w.name}</div>
                <div className="t-note" style={{ marginTop: 3, color: inkSoft, fontSize: "calc(14px * var(--text-scale))" }}>{w.game}: {w.line}</div>
              </div>
              <div style={{ width: 56, height: 56, flex: "none" }}>
                <Light world={w.id} state="glow" size={44} />
              </div>
              {isSel && (
                <span
                  aria-hidden
                  style={{ position: "absolute", top: -12, right: -10, width: 36, height: 36, borderRadius: 999, background: mint, border: `3px solid ${palette.night}`, boxShadow: `0 3px 0 ${mintEdge}`, display: "grid", placeItems: "center" }}
                >
                  <Icon name="check" size={20} color={ink} />
                </span>
              )}
            </button>
          </At>
        );
      })}

      <At x={55} y={712} w={280} className="pop-in-3">
        <PrimaryButton
          glowColor={worldGlow[chosen]}
          edgeColor={{ forest: "#C9780E", space: "#2A8FA8", neon: "#B89A12" }[chosen]}
          onClick={() => {
            update({ world: chosen });
            router.push(next);
          }}
        >
          Let&apos;s go
        </PrimaryButton>
      </At>
      <At x={0} y={796} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
        <span className="t-note">Every world plays the same, so your trends stay fair.</span>
      </At>
    </Stage>
  );
}
