"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Skin } from "@/components/art/skins";
import { Scene } from "@/components/art/scenes";
import { SKIN_IDS, SKIN_NAMES, type SkinId } from "@/components/art/types";
import { At, Stage } from "@/components/Stage";
import { amberEdge, Icon, IconButton, ink, mint, mintEdge, PrimaryButton, tan, tanEdge } from "@/components/ui";
import { unlockAudio } from "@/lib/audio";
import { useSettings } from "@/lib/settings";
import { palette } from "@/lib/theme";

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
  if (!ready) return <Stage>{null}</Stage>;

  const tileW = 160;
  const tileH = 140;
  const gap = 14;
  const gridX = (390 - (tileW * 2 + gap)) / 2;
  const gridY = 216;

  return (
    <Stage>
      <Scene variant="forest" twinkle reducedMotion={settings.reducedMotion} />
      <At x={20} y={56}>
        <IconButton icon="back" label="Back" onClick={() => (settings.firstLaunchDone ? router.back() : router.push("/basecamp"))} />
      </At>
      <At x={322} y={56}>
        <IconButton
          icon={settings.sound ? "soundOn" : "soundOff"}
          label={settings.sound ? "Sound on" : "Sound off"}
          onClick={() => update({ sound: !settings.sound })}
        />
      </At>
      <At x={0} y={104} w={390} style={{ textAlign: "center", padding: "0 40px" }} className="pop-in">
        <div className="t-title" style={{ fontSize: "calc(30px * var(--text-scale))", lineHeight: 1 }}>Choose what you&apos;ll catch</div>
        <div className="t-body" style={{ marginTop: 6, fontSize: "calc(16px * var(--text-scale))" }}>Pick your favorite. Change it any time.</div>
      </At>

      {SKIN_IDS.map((id, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const isSel = chosen === id;
        return (
          <At key={id} x={gridX + col * (tileW + gap)} y={gridY + row * (tileH + gap)} w={tileW} h={tileH}>
            <button
              type="button"
              aria-pressed={isSel}
              aria-label={SKIN_NAMES[id]}
              onClick={() => setSelected(id)}
              className="btn-3d"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 24,
                background: palette.cream,
                border: `4px solid ${isSel ? palette.glow : tan}`,
                boxShadow: `0 7px 0 ${isSel ? amberEdge : tanEdge}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                position: "relative",
                transition: "border-color 120ms ease, box-shadow 80ms ease, transform 80ms ease",
              }}
            >
              <Skin id={id} size={84} glow />
              <span
                style={{
                  fontFamily: "var(--font-title)",
                  fontWeight: 700,
                  fontSize: "calc(19px * var(--text-scale))",
                  color: ink,
                }}
              >
                {SKIN_NAMES[id]}
              </span>
              {isSel && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -12,
                    right: -10,
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: mint,
                    border: `3px solid ${palette.night}`,
                    boxShadow: `0 3px 0 ${mintEdge}`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon name="check" size={20} color={ink} />
                </span>
              )}
            </button>
          </At>
        );
      })}

      <At x={55} y={700} w={280} className="pop-in-3">
        <PrimaryButton
          onClick={() => {
            unlockAudio();
            update({ skin: chosen, firstLaunchDone: true });
            router.push(next);
          }}
        >
          Let&apos;s go
        </PrimaryButton>
      </At>
      <At x={0} y={796} w={390} style={{ textAlign: "center", padding: "0 30px" }}>
        <span className="t-note">Every one glows the same, so your trends stay fair.</span>
      </At>
    </Stage>
  );
}
