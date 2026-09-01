import { NextResponse } from "next/server";

import { ApiError, requestLoginLink } from "@/lib/api";

// Password-less re-login: forwards an email to the backend, which (if it maps to
// an account with an active deal) emails a fresh signed sign-in link. Always
// returns 200 on success so the response can't be used to probe accounts.
export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ message: "Enter your email address." }, { status: 400 });
  }

  try {
    const result = await requestLoginLink(email);
    // ok:true => link sent; ok:false => no matching account/application.
    return NextResponse.json({ ok: Boolean(result?.ok) });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "We couldn't send your sign-in link. Please try again.";
    return NextResponse.json({ message }, { status });
  }
}
