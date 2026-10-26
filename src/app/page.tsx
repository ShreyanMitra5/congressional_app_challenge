import type { Metadata } from "next";
import { Landing } from "@/games/welcome/Landing";

export const metadata: Metadata = {
  title: "BrainCompass: three calm games with a friendly fox",
  description:
    "Firefly Watch, Firefly Trail and Night Watch are two-minute games that check in on reaction time, memory and attention without ever feeling like a test.",
};

export default function Page() {
  return <Landing />;
}
