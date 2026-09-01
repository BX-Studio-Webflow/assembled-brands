import { NextResponse } from "next/server";

import { ApiError, exchangeLoginSession } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

// Re-login deep link: trades the signed login token (which carries the user +
// their deal context) for a session, then persists it as the httpOnly session
// cookie so the holder lands directly back in their application.
export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ message: "This link is missing its token." }, { status: 400 });
  }

  try {
    const session = await exchangeLoginSession(token);
    if (!session?.token) {
      return NextResponse.json(
        { message: "This sign-in link is invalid or has expired." },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      teamId: session.teams?.[0]?.team_id ?? null,
    });
    response.cookies.set(ACCESS_TOKEN_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 10,
    });
    return response;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "We couldn't sign you in. Please request a new link.";
    return NextResponse.json({ message }, { status });
  }
}
