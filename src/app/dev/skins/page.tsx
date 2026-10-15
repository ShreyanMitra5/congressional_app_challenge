import { Skin } from "@/components/art/skins";
import { SKIN_IDS, SKIN_NAMES } from "@/components/art/types";

/** Dev-only preview of the six stimulus skins. Visit /dev/skins. */
export default function SkinsPreviewPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#14204A",
        color: "#FFF6E0",
        padding: 40,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 56,
      }}
    >
      <section>
        <h2 style={{ margin: "0 0 24px", fontWeight: 500 }}>size 120, glow on</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 48 }}>
          {SKIN_IDS.map((id) => (
            <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <Skin id={id} size={120} glow />
              <span style={{ fontSize: 14, opacity: 0.8 }}>{SKIN_NAMES[id]}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 24px", fontWeight: 500 }}>size 56, glow on</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center" }}>
          {SKIN_IDS.map((id) => (
            <Skin key={id} id={id} size={56} glow />
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 24px", fontWeight: 500 }}>size 120, glow off</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 48 }}>
          {SKIN_IDS.map((id) => (
            <Skin key={id} id={id} size={120} />
          ))}
        </div>
      </section>
    </main>
  );
}
