import { Fox } from "@/components/art/Fox";
import type { FoxPose } from "@/components/art/types";

const POSES: FoxPose[] = ["idle", "earsPerked", "catching", "celebrating", "hop"];

/** Dev preview: every fox pose side by side on the night palette. */
export default function FoxPreviewPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#14204A",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 32,
        padding: 40,
      }}
    >
      {POSES.map((pose) => (
        <figure key={pose} style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Fox pose={pose} width={140} breathing={pose === "idle"} />
          <figcaption style={{ color: "#fff", fontFamily: "system-ui, sans-serif", fontSize: 14 }}>{pose}</figcaption>
        </figure>
      ))}
    </main>
  );
}
