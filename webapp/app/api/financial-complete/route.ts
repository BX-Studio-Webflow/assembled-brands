import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import { completeFinancialApplication } from "@/lib/financeApi";

// Same-origin proxy: marks the application as submitted so progress reads 100%.
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json({ message: "Your session expired." }, { status: 401 });
  }

  try {
    await completeFinancialApplication(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not submit your application.";
    return NextResponse.json({ message }, { status });
  }
}
