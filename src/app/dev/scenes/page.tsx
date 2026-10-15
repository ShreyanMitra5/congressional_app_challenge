import type { CSSProperties } from "react";
import { Scene, type SceneVariant } from "@/components/art/scenes";
import { Beacon, Lantern, Stone, Window } from "@/components/art/props";
import { RewardIcon, REWARD_NAMES, type RewardId } from "@/components/art/rewards";

/** Dev-only gallery: every scene, prop state and reward icon on one page. */

const VARIANTS: SceneVariant[] = ["forest", "trail", "space", "neon"];
const REWARDS: RewardId[] = ["lantern", "stone", "lanternString", "beacon", "windowLight"];

const label: CSSProperties = {
  color: "var(--soft)",
  fontFamily: "system-ui, sans-serif",
  fontSize: 12,
  textAlign: "center",
  marginTop: 8,
};

const heading: CSSProperties = {
  color: "var(--cream)",
  fontFamily: "system-ui, sans-serif",
  fontSize: 16,
  fontWeight: 600,
  margin: "32px 0 12px",
};

const cell: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  width: 132,
  height: 150,
  padding: 8,
};

export default function ScenesPreviewPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--night)",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ ...heading, margin: "0 0 16px", fontSize: 20 }}>Art preview</h1>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {VARIANTS.map((v) => (
          <div key={v}>
            <div
              style={{
                width: 195,
                height: 422,
                overflow: "hidden",
                borderRadius: 10,
                boxShadow: "0 0 0 1px rgba(184,196,240,0.18)",
              }}
            >
              <div
                style={{
                  width: 390,
                  height: 844,
                  transform: "scale(0.5)",
                  transformOrigin: "top left",
                }}
              >
                <Scene variant={v} twinkle />
              </div>
            </div>
            <div style={label}>{v}</div>
          </div>
        ))}
      </div>

      <h2 style={heading}>Stone</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["rest", "lit", "tapped"] as const).map((s) => (
          <div key={s} style={cell}>
            <Stone state={s} />
            <div style={label}>{s}</div>
          </div>
        ))}
      </div>

      <h2 style={heading}>Lights</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={cell}>
          <Lantern state="rest" />
          <div style={label}>lantern · rest</div>
        </div>
        <div style={cell}>
          <Lantern state="glow" />
          <div style={label}>lantern · glow</div>
        </div>
        <div style={cell}>
          <Beacon state="rest" />
          <div style={label}>beacon · rest</div>
        </div>
        <div style={cell}>
          <Beacon state="glow" />
          <div style={label}>beacon · glow</div>
        </div>
        <div style={cell}>
          <Window state="rest" />
          <div style={label}>window · rest</div>
        </div>
        <div style={cell}>
          <Window state="glow" />
          <div style={label}>window · glow</div>
        </div>
      </div>

      <h2 style={heading}>Rewards</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {REWARDS.map((id) => (
          <div key={id} style={cell}>
            <RewardIcon id={id} />
            <div style={label}>{REWARD_NAMES[id]}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
