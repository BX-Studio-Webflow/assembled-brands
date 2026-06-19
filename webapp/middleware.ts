import { NextResponse } from "next/server";

// Access is gated in-app on the /start screen (deal ID + password). This
// middleware only enforces caching safety.
export function middleware() {
  const response = NextResponse.next();
  // CRITICAL: every authenticated page is server-rendered with one applicant's
  // data. Mark all responses private + no-store so no shared/CDN cache can ever
  // serve one client's rendered page to another (the prior cross-client leak).
  response.headers.set("Cache-Control", "private, no-store, must-revalidate");
  return response;
}

export const config = {
  // Run on everything except Next's immutable static assets (safe to cache).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
