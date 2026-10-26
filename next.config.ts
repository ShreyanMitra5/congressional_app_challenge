import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bundle every route and asset into the iOS app; normal web builds keep their server.
  ...(process.env.BRAINCOMPASS_NATIVE === "1" ? { output: "export", trailingSlash: true } as const : {}),
  turbopack: {
    rules: {
      // Component CSS Modules use Next's native scoped-CSS handling.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
