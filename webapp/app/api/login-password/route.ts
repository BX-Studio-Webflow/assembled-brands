import { NextResponse } from "next/server";

import { ApiError, exchangePasswordLoginSession } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { message: "Enter your email and temporary password." },
      { status: 400 },
    );
  }

  try {
    const session = await exchangePasswordLoginSession(email, password);
    if (!session?.token) {
      return NextResponse.json(
        { message: "Invalid email or temporary password." },
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
      error instanceof Error ? error.message : "We couldn't sign you in. Please try again.";
    return NextResponse.json({ message }, { status });
  }
}
