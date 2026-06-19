import type { NextConfig } from "next";
import path from "node:path";

// Webflow Cloud serves the app from a mount path (e.g. /app). basePath and
// assetPrefix MUST match that mount path so routing and asset loading work.
// Set NEXT_PUBLIC_SERVE_AT_ROOT=1 to serve at root (e.g. on Vercel); otherwise
// NEXT_PUBLIC_BASE_PATH overrides, defaulting to the Webflow Cloud /app mount.
const BASE_PATH =
  process.env.NEXT_PUBLIC_SERVE_AT_ROOT === "1"
    ? ""
    : (process.env.NEXT_PUBLIC_BASE_PATH ?? "/app");

const nextConfig: NextConfig = {
  // Omit basePath/assetPrefix entirely when serving at root.
  ...(BASE_PATH ? { basePath: BASE_PATH, assetPrefix: BASE_PATH } : {}),
  // Cloudflare/edge: skip the default Next image optimizer.
  images: { unoptimized: true },
  // This app lives inside the BX repo (which has its own pnpm lockfile); pin
  // tracing to this folder so the standalone/OpenNext bundle is correct.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
