import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neurotrace.basecamp",
  appName: "NeuroTrace",
  webDir: "out",
  backgroundColor: "#14204A",
  loggingBehavior: "debug",
  server: { appStartPath: "/basecamp/" },
  ios: {
    // The web layout already handles the notch and home indicator with safe-area CSS.
    contentInset: "never",
    preferredContentMode: "mobile",
  },
};

export default config;
