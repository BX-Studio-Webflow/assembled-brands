import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError, createWarmLead, saveWarmLeadReturning } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import type { OnboardingSubmitRequest } from "@/lib/types";

// Same-origin proxy: the browser posts here, and this handler talks to the
// existing backend server-side. That avoids any cross-origin call from the
// browser, so the backend's CORS config does not need to change.
export async function POST(request: Request) {
  let payload: OnboardingSubmitRequest;
  try {
    payload = (await request.json()) as OnboardingSubmitRequest;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { mode, dealId, values } = payload;

  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;
  const cookieStore = await cookies();
  const token = headerToken ?? cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;

  const secure = process.env.NODE_ENV === "production";

  try {
    if (mode === "authenticated") {
      if (!token) {
        return NextResponse.json(
          { message: "Your session expired. Please reopen your invite link." },
          { status: 401 }
        );
      }
      await saveWarmLeadReturning(values, token);

      const response = NextResponse.json({ ok: true });
      // Persist (or refresh) the session as an httpOnly cookie for SSR.
      response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 10,
      });
      return response;
    }

    if (!dealId) {
      return NextResponse.json(
        { message: "This invite link is missing its deal ID." },
        { status: 400 }
      );
    }

    const result = await createWarmLead(values, dealId);
    const response = NextResponse.json({
      ok: true,
      teamId: result.teams?.[0]?.team_id ?? null,
    });
    response.cookies.set(ACCESS_TOKEN_COOKIE, result.token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 10,
    });
    return response;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "There was a problem saving your information.";
    return NextResponse.json({ message }, { status });
  }
}
