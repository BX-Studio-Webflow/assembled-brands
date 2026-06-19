import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import { upsertBusiness } from "@/lib/financeApi";
import type { BusinessUpsertBody } from "@/lib/financeTypes";

// Same-origin proxy: persists business-profile answers (inventory location,
// funding history). The backend requires legal_name + accounting_software, so
// the client merges the existing profile before posting here.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json({ message: "Your session expired." }, { status: 401 });
  }

  let body: BusinessUpsertBody;
  try {
    body = (await request.json()) as BusinessUpsertBody;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  if (!body.legal_name) {
    return NextResponse.json(
      { message: "Your company profile is incomplete. Please revisit Company Profile first." },
      { status: 400 },
    );
  }

  // Backend requires accounting_software; mirror the warm-lead 'other' fallback.
  const payload: BusinessUpsertBody = {
    ...body,
    accounting_software: body.accounting_software || "other",
  };

  try {
    await upsertBusiness(payload, token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not save your answer.";
    return NextResponse.json({ message }, { status });
  }
}
