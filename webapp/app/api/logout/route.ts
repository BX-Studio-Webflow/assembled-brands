import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

// Clears the session cookie. Mirrors the legacy logoutUser() (which also
// cleared localStorage client-side; the client handles that after this call).
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
