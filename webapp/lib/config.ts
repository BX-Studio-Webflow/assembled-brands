// Mount path under the Webflow domain (must match next.config basePath).
// NEXT_PUBLIC_SERVE_AT_ROOT=1 => served at root (e.g. on Vercel).
export const MOUNT_PATH =
  process.env.NEXT_PUBLIC_SERVE_AT_ROOT === "1"
    ? ""
    : (process.env.NEXT_PUBLIC_BASE_PATH ?? "/app");

// Existing Hono/Cloudflare backend. Only ever read server-side (apiFetch runs
// in route handlers + SSR), so prefer a runtime server var: Webflow Cloud
// injects env vars at runtime only, and NEXT_PUBLIC_* would be inlined at build
// (before those vars exist). Falls back to the dev worker.
export const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://assembled-brands-dev.crystal-e8a.workers.dev";

export const API_VERSION = "/api/v1";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const TEAM_ID_STORAGE_KEY = "x-team-id";

// Prefix a same-origin path with the mount path (for links/assets/route handlers).
export const withBasePath = (path: string) =>
  `${MOUNT_PATH}${path.startsWith("/") ? path : `/${path}`}`;
