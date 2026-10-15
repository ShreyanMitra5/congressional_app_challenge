import { Otter } from "@/components/art/Otter";
import { Lynx } from "@/components/art/Lynx";
import type { CompanionPose } from "@/components/art/types";

const POSES: CompanionPose[] = ["idle", "nod", "waving", "celebrating"];

export default function CompanionsPreviewPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#14204A",
        color: "#FFFFFF",
        padding: 32,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 24px" }}>Companions preview</h1>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px", opacity: 0.8 }}>Otter (Space Voyagers)</h2>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {POSES.map((pose) => (
            <figure key={pose} style={{ margin: 0, textAlign: "center" }}>
              <Otter pose={pose} width={140} breathing={pose === "idle"} />
              <figcaption style={{ marginTop: 8, fontSize: 14 }}>{pose}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px", opacity: 0.8 }}>Lynx (Neon Arcade)</h2>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {POSES.map((pose) => (
            <figure key={pose} style={{ margin: 0, textAlign: "center" }}>
              <Lynx pose={pose} width={140} breathing={pose === "idle"} />
              <figcaption style={{ marginTop: 8, fontSize: 14 }}>{pose}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
