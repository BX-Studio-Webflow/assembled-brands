import { NextResponse } from "next/server";

import { ApiError, exchangeWarmLeadSession } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

// Shared test password. Override with BASIC_AUTH_PASSWORD per-environment.
const GATE_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "ab2026!";

// In-app gate: validates the test password, exchanges the deal ID for a
// warm-lead session, and persists it as the httpOnly session cookie so the
// rest of the app (SSR + proxies) is authenticated.
export async function POST(request: Request) {
  let body: { dealId?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== GATE_PASSWORD) {
    return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
  }

  const rawDealId = typeof body.dealId === "string" ? body.dealId.trim() : String(body.dealId ?? "");
  const dealId = /^\d+$/.test(rawDealId) ? Number.parseInt(rawDealId, 10) : NaN;
  if (!Number.isInteger(dealId) || dealId <= 0) {
    return NextResponse.json({ message: "Enter a valid numeric deal ID." }, { status: 400 });
  }

  try {
    const session = await exchangeWarmLeadSession(dealId);
    if (!session?.token) {
      return NextResponse.json(
        { message: "No application was found for that deal ID." },
        { status: 404 },
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
      status === 404
        ? "No application was found for that deal ID."
        : error instanceof Error
          ? error.message
          : "Could not start the application. Please try again.";
    return NextResponse.json({ message }, { status });
  }
}
