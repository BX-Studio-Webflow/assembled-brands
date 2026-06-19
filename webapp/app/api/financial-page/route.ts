import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import { updateFinancialPage } from "@/lib/financeApi";

// Same-origin proxy: persists wizard page progress on the backend.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json({ message: "Your session expired." }, { status: 401 });
  }

  let page: string;
  try {
    const body = (await request.json()) as { page?: string };
    page = body.page ?? "";
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
  if (!page) {
    return NextResponse.json({ message: "Missing page." }, { status: 400 });
  }

  try {
    await updateFinancialPage(page, token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not save progress.";
    return NextResponse.json({ message }, { status });
  }
}
