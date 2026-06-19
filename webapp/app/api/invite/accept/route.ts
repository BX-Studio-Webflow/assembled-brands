import { NextResponse } from "next/server";

import { ApiError, acceptInviteSession } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

// Teammate magic-link: trades the signed invite token for a session scoped to
// the inviter's active deal, then persists it as the httpOnly session cookie so
// the teammate lands directly in that workspace — no portal, ID, or password.
export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ message: "This invite link is missing its token." }, { status: 400 });
  }

  try {
    const session = await acceptInviteSession(token);
    if (!session?.token) {
      return NextResponse.json(
        { message: "This invite link is invalid or has expired." },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      teamId: session.team_id ?? null,
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
        : "We couldn't open the workspace. Please try again.";
    return NextResponse.json({ message }, { status });
  }
}
