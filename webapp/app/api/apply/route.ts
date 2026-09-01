import { NextResponse } from "next/server";

import { ApiError, exchangeWarmLeadPasswordSession } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

// Warm-lead deep link: trades the signed token plus HubSpot temporary password
// for a session scoped to that deal, then persists it as the httpOnly cookie.
export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token) {
    return NextResponse.json({ message: "This link is missing its token." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json(
      { message: "Enter the temporary password from your application invitation." },
      { status: 400 },
    );
  }

  try {
    const session = await exchangeWarmLeadPasswordSession(token, password);
    if (!session?.token) {
      return NextResponse.json(
        { message: "This link is invalid or has expired." },
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
        : "We couldn't open your application. Please try again.";
    return NextResponse.json({ message }, { status });
  }
}
